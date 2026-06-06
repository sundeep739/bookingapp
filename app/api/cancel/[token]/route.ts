import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendCancellationEmail } from "@/lib/email";
import { Resend } from "resend";
import { sendWaitlistNotification } from "@/lib/sms";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const booking = await prisma.booking.findUnique({
    where: { cancelToken: token },
    include: {
      eventType: { select: { title: true } },
      host: { select: { name: true, username: true } },
    },
  });
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  return NextResponse.json({
    id: booking.id,
    inviteeName: booking.inviteeName,
    eventTitle: booking.eventType.title,
    startTime: booking.startTime,
    status: booking.status,
    hostName: booking.host.name,
    hostUsername: booking.host.username,
  });
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const booking = await prisma.booking.findUnique({
    where: { cancelToken: token },
    include: {
      eventType: { select: { title: true, slug: true } },
      host: { select: { id: true, name: true, username: true, email: true } },
    },
  });
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  if (booking.status === "CANCELLED") return NextResponse.json({ error: "Already cancelled" }, { status: 400 });

  await prisma.booking.update({
    where: { cancelToken: token },
    data: { status: "CANCELLED" },
  });

  // Send cancellation email to guest
  sendCancellationEmail({
    inviteeName: booking.inviteeName,
    inviteeEmail: booking.inviteeEmail,
    hostName: booking.host.name ?? booking.host.username ?? "Host",
    eventTitle: booking.eventType.title,
    startTime: booking.startTime,
    timezone: booking.timezone,
  }).catch(() => {});

  // ── Notify waitlist — first person in line ──────────────────────────────
  const nextInLine = await prisma.waitlistEntry.findFirst({
    where: { eventTypeId: booking.eventTypeId, notified: false },
    orderBy: { createdAt: "asc" },
  });

  if (nextInLine) {
    const bookingUrl = `${process.env.NEXT_PUBLIC_APP_URL}/${booking.host.username}`;

    // Mark as notified
    await prisma.waitlistEntry.update({
      where: { id: nextInLine.id },
      data: { notified: true, notifiedAt: new Date() },
    });

    // Email notification
    resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: nextInLine.email,
      subject: `A slot just opened — ${booking.eventType.title} with ${booking.host.name}`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
          <h2 style="color:#1a1f36">Great news — a slot opened up! 🎉</h2>
          <p style="color:#6b7280">Hi ${nextInLine.name}, a slot for <strong>${booking.eventType.title}</strong> with <strong>${booking.host.name}</strong> has just become available.</p>
          <p style="color:#6b7280">Book your spot before it's gone:</p>
          <a href="${bookingUrl}" style="display:inline-block;background:#e53e6d;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">Book Now →</a>
          <p style="color:#9ca3af;font-size:12px">This notification was sent because you joined the waitlist. If you no longer need it, simply ignore this email.</p>
        </div>
      `,
    }).catch(console.error);

    // SMS notification if phone provided
    if (nextInLine.phone) {
      sendWaitlistNotification({
        to: nextInLine.phone,
        name: nextInLine.name,
        eventTitle: booking.eventType.title,
        hostName: booking.host.name ?? "your host",
        bookingUrl,
      }).catch(() => {});
    }
  }

  return NextResponse.json({ success: true });
}
