import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getFreeSlots, type Slot } from "@/lib/slots";
import { finalizeBooking } from "@/lib/booking-finalize";
import { stripe } from "@/lib/stripe";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { randomUUID } from "crypto";

const norm = (t: string) => t.trim().toLowerCase();

type Candidate = {
  userId: string;
  hostTz: string;
  name: string | null;
  username: string | null;
  stripeChargesEnabled: boolean;
  stripeConnectId: string | null;
  availDays: number[];
  eventType: {
    id: string; slug: string; title: string; duration: number; price: number; currency: string;
    bufferBefore: number; bufferAfter: number; minNotice: number; maxDaysAhead: number;
    slotInterval: number; capacity: number;
  };
};

// Load the org and the members who offer a service matching `service` (by title).
async function loadCandidates(slug: string, service: string) {
  const org = await prisma.organization.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      members: {
        where: { isActive: true },
        select: {
          user: {
            select: {
              id: true, name: true, username: true, timezone: true,
              suspended: true, stripeChargesEnabled: true, stripeConnectId: true,
              availability: { where: { isActive: true }, select: { dayOfWeek: true } },
              eventTypes: {
                where: { isActive: true },
                select: {
                  id: true, slug: true, title: true, duration: true, price: true, currency: true,
                  bufferBefore: true, bufferAfter: true, minNotice: true, maxDaysAhead: true,
                  slotInterval: true, capacity: true,
                },
              },
            },
          },
        },
      },
    },
  });
  if (!org) return null;

  const candidates: Candidate[] = [];
  for (const m of org.members) {
    const u = m.user;
    if (u.suspended) continue;
    const et = u.eventTypes.find((e) => norm(e.title) === service);
    if (!et) continue;
    candidates.push({
      userId: u.id,
      hostTz: u.timezone || "UTC",
      name: u.name,
      username: u.username,
      stripeChargesEnabled: u.stripeChargesEnabled,
      stripeConnectId: u.stripeConnectId,
      availDays: [...new Set(u.availability.map((a) => a.dayOfWeek))],
      eventType: et,
    });
  }
  return { org, candidates };
}

// ── GET: union availability across staff for a service ──────────────────────
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!rateLimit(`rr:${clientIp(req)}`, 60, 60_000)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }
  const { searchParams } = new URL(req.url);
  const service = searchParams.get("service");
  const dateStr = searchParams.get("date");
  const guestTz = searchParams.get("tz") || "UTC";
  if (!service) return NextResponse.json({ error: "Missing service" }, { status: 400 });

  const loaded = await loadCandidates(slug, norm(service));
  if (!loaded) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { candidates } = loaded;

  const availableDays = [...new Set(candidates.flatMap((c) => c.availDays))].sort();

  if (!dateStr) {
    return NextResponse.json({ availableDays, staffCount: candidates.length, slots: [] });
  }

  // Union free slots across all candidates; a time is offered if any staff is free.
  const byStart = new Map<string, Slot>();
  await Promise.all(
    candidates.map(async (c) => {
      const slots = await getFreeSlots({
        userId: c.userId,
        hostTz: c.hostTz,
        dateStr,
        guestTz,
        eventType: c.eventType,
      });
      for (const s of slots) {
        if (!byStart.has(s.start)) byStart.set(s.start, { start: s.start, label: s.label });
      }
    })
  );

  const slots = [...byStart.values()].sort((a, b) => a.start.localeCompare(b.start));
  return NextResponse.json({ availableDays, staffCount: candidates.length, slots });
}

// ── POST: assign a free staff member (least-loaded) and book ────────────────
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!rateLimit(`book:${clientIp(req)}`, 8, 60_000)) {
    return NextResponse.json({ error: "Too many attempts. Please wait a minute and try again." }, { status: 429 });
  }

  const body = await req.json();
  const { service, start, name, email, phone, notes, timezone, answers } = body;
  if (!service || !start || !name || !email) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const loaded = await loadCandidates(slug, norm(service));
  if (!loaded) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { org, candidates } = loaded;
  if (candidates.length === 0) return NextResponse.json({ error: "No staff offer this service" }, { status: 404 });

  const startTime = new Date(start);
  if (isNaN(startTime.getTime())) return NextResponse.json({ error: "Invalid start time" }, { status: 400 });
  if (startTime.getTime() < Date.now()) return NextResponse.json({ error: "That time is in the past." }, { status: 409 });

  // Load-balance: prefer the staff member with the fewest bookings that day.
  const dayStart = new Date(startTime); dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const loads = await Promise.all(
    candidates.map((c) =>
      prisma.booking.count({
        where: { hostId: c.userId, startTime: { gte: dayStart, lt: dayEnd }, status: { in: ["CONFIRMED", "PENDING"] } },
      })
    )
  );
  const ordered = candidates
    .map((c, i) => ({ c, load: loads[i] }))
    .sort((a, b) => a.load - b.load)
    .map((x) => x.c);

  // Try each candidate in order until one is free at this slot (atomic guard).
  for (const c of ordered) {
    const endTime = new Date(startTime.getTime() + c.eventType.duration * 60 * 1000);
    const cancelToken = randomUUID();
    const requiresPayment = c.eventType.price > 0 && c.stripeChargesEnabled && c.stripeConnectId && stripe;

    let booking;
    try {
      booking = await prisma.$transaction(async (tx) => {
        const clash = await tx.booking.findFirst({
          where: {
            hostId: c.userId,
            status: { in: ["CONFIRMED", "PENDING"] },
            startTime: { lt: endTime },
            endTime: { gt: startTime },
          },
          select: { id: true },
        });
        if (clash) throw new Error("SLOT_TAKEN");
        return tx.booking.create({
          data: {
            eventTypeId: c.eventType.id,
            hostId: c.userId,
            orgId: org.id,
            inviteeName: name,
            inviteeEmail: email,
            inviteePhone: phone ?? null,
            startTime,
            endTime,
            timezone: timezone ?? "UTC",
            notes: notes ?? null,
            answers: answers && Object.keys(answers).length ? answers : undefined,
            status: requiresPayment ? "PENDING" : "CONFIRMED",
            paymentStatus: requiresPayment ? "PENDING" : "NONE",
            cancelToken,
          },
        });
      }, { isolationLevel: "Serializable" });
    } catch (e: any) {
      if (e?.message === "SLOT_TAKEN" || e?.code === "P2034") continue; // try next staff
      throw e;
    }

    // Paid booking → Stripe Checkout (destination charge to the assigned host)
    if (requiresPayment) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
      const amount = Math.round(c.eventType.price * 100);
      const checkout = await stripe!.checkout.sessions.create({
        mode: "payment",
        customer_email: email,
        line_items: [{
          quantity: 1,
          price_data: {
            currency: (c.eventType.currency || "usd").toLowerCase(),
            unit_amount: amount,
            product_data: { name: `${c.eventType.title} with ${c.name ?? "staff"}` },
          },
        }],
        payment_intent_data: { transfer_data: { destination: c.stripeConnectId! } },
        success_url: `${appUrl}/booking/success?id=${booking.id}`,
        cancel_url: `${appUrl}/org/${slug}?cancelled=1`,
        metadata: { bookingId: booking.id, type: "booking_payment" },
      });
      await prisma.booking.update({ where: { id: booking.id }, data: { stripePaymentId: checkout.id } });
      return NextResponse.json({ requiresPayment: true, url: checkout.url, staffName: c.name });
    }

    await finalizeBooking(booking.id);
    return NextResponse.json({ success: true, bookingId: booking.id, cancelToken, staffName: c.name });
  }

  // Every candidate was just taken for this slot.
  return NextResponse.json({ error: "Sorry, that time was just booked. Please pick another slot." }, { status: 409 });
}
