import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// POST /api/waitlist — join waitlist for an event type
export async function POST(req: Request) {
  if (!rateLimit(`waitlist:${clientIp(req)}`, 5, 60_000)) {
    return NextResponse.json({ error: "Too many requests. Please try again shortly." }, { status: 429 });
  }
  const { eventTypeId, hostUsername, name, email, phone, timezone } = await req.json();

  if (!eventTypeId || !name || !email) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Find host
  const host = await prisma.user.findUnique({
    where: { username: hostUsername },
    select: { id: true, name: true, email: true },
  });
  if (!host) return NextResponse.json({ error: "Host not found" }, { status: 404 });

  // Upsert — don't allow duplicate entries
  const entry = await prisma.waitlistEntry.upsert({
    where: { eventTypeId_email: { eventTypeId, email } },
    update: { name, phone, timezone },
    create: {
      eventTypeId,
      hostId: host.id,
      name,
      email,
      phone,
      timezone: timezone || "UTC",
    },
  });

  // Confirm email to the person who joined
  resend?.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: email,
    subject: `You're on the waitlist!`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
        <h2 style="color:#1a1f36">You're on the waitlist! 🎉</h2>
        <p style="color:#6b7280">Hi ${name}, we've added you to the waitlist for <strong>${host.name}</strong>.</p>
        <p style="color:#6b7280">We'll email you as soon as a slot opens up. You don't need to do anything else.</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
        <p style="color:#9ca3af;font-size:12px">Powered by BookEasy</p>
      </div>
    `,
  }).catch(console.error);

  return NextResponse.json({ success: true, id: entry.id }, { status: 201 });
}

// GET /api/waitlist?hostId=xxx&eventTypeId=xxx — admin: see waitlist count
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const eventTypeId = searchParams.get("eventTypeId");
  if (!eventTypeId) return NextResponse.json({ error: "eventTypeId required" }, { status: 400 });

  const count = await prisma.waitlistEntry.count({
    where: { eventTypeId, notified: false },
  });

  return NextResponse.json({ count });
}
