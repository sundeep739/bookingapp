import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { finalizeBooking } from "@/lib/booking-finalize";
import { stripe } from "@/lib/stripe";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { randomUUID } from "crypto";

const PLATFORM_FEE_PERCENT = 0; // set >0 to take a platform cut of booking payments

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;

  if (!rateLimit(`book:${clientIp(req)}`, 8, 60_000)) {
    return NextResponse.json({ error: "Too many attempts. Please wait a minute and try again." }, { status: 429 });
  }

  const body = await req.json();
  const { eventSlug, start, name, email, phone, notes, timezone, answers } = body;

  if (!eventSlug || !start || !name || !email) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const host = await prisma.user.findUnique({ where: { username } });
  if (!host) return NextResponse.json({ error: "Host not found" }, { status: 404 });

  const eventType = await prisma.eventType.findFirst({
    where: { userId: host.id, slug: eventSlug, isActive: true },
  });
  if (!eventType) return NextResponse.json({ error: "Event type not found" }, { status: 404 });

  const startTime = new Date(start);
  if (isNaN(startTime.getTime())) return NextResponse.json({ error: "Invalid start time" }, { status: 400 });
  const endTime = new Date(startTime.getTime() + eventType.duration * 60 * 1000);
  const cancelToken = randomUUID();

  if (startTime.getTime() < Date.now()) {
    return NextResponse.json({ error: "That time is in the past." }, { status: 409 });
  }

  const requiresPayment =
    eventType.price > 0 && host.stripeChargesEnabled && host.stripeConnectId && stripe;

  // ── Double-booking guard: re-check the slot is still free, atomically ─────
  let booking;
  try {
    booking = await prisma.$transaction(async (tx) => {
      const clash = await tx.booking.findFirst({
        where: {
          hostId: host.id,
          status: { in: ["CONFIRMED", "PENDING"] },
          startTime: { lt: endTime },
          endTime: { gt: startTime },
        },
        select: { id: true },
      });
      if (clash) throw new Error("SLOT_TAKEN");
      return tx.booking.create({
        data: {
          eventTypeId:  eventType.id,
          hostId:       host.id,
          inviteeName:  name,
          inviteeEmail: email,
          inviteePhone: phone ?? null,
          startTime,
          endTime,
          timezone:     timezone ?? "UTC",
          notes:        notes ?? null,
          answers:      answers && Object.keys(answers).length ? answers : undefined,
          status:       requiresPayment ? "PENDING" : "CONFIRMED",
          paymentStatus: requiresPayment ? "PENDING" : "NONE",
          cancelToken,
        },
      });
    }, { isolationLevel: "Serializable" });
  } catch (e: any) {
    if (e?.message === "SLOT_TAKEN" || e?.code === "P2034") {
      return NextResponse.json({ error: "Sorry, that time was just booked. Please pick another slot." }, { status: 409 });
    }
    throw e;
  }

  // ── Paid booking → Stripe Checkout (destination charge to the host) ───────
  if (requiresPayment) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    const amount = Math.round(eventType.price * 100);
    const fee = PLATFORM_FEE_PERCENT > 0 ? Math.round(amount * (PLATFORM_FEE_PERCENT / 100)) : undefined;

    const checkout = await stripe!.checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: (eventType.currency || "usd").toLowerCase(),
          unit_amount: amount,
          product_data: { name: `${eventType.title} with ${host.name ?? username}` },
        },
      }],
      payment_intent_data: {
        ...(fee ? { application_fee_amount: fee } : {}),
        transfer_data: { destination: host.stripeConnectId! },
      },
      success_url: `${appUrl}/booking/success?id=${booking.id}`,
      cancel_url: `${appUrl}/${username}?cancelled=1`,
      metadata: { bookingId: booking.id, type: "booking_payment" },
    });

    await prisma.booking.update({ where: { id: booking.id }, data: { stripePaymentId: checkout.id } });
    return NextResponse.json({ requiresPayment: true, url: checkout.url });
  }

  // ── Free booking → finalize immediately ──────────────────────────────────
  await finalizeBooking(booking.id);
  return NextResponse.json({ success: true, bookingId: booking.id, cancelToken });
}
