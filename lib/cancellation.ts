import { prisma } from "@/lib/prisma";
import { sendCancellationEmail } from "@/lib/email";
import { sendWaitlistNotification } from "@/lib/sms";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

type CancelBooking = {
  eventTypeId: string;
  inviteeName: string;
  inviteeEmail: string;
  startTime: Date;
  timezone: string;
  eventType: { title: string };
  host: { name: string | null; username: string | null };
};

/**
 * Sends the guest a cancellation email and notifies the first person on the
 * waitlist (email + SMS). Call this AFTER the booking status is set to CANCELLED.
 */
export async function notifyCancellation(booking: CancelBooking) {
  // 1. Cancellation email to the guest
  sendCancellationEmail({
    inviteeName: booking.inviteeName,
    inviteeEmail: booking.inviteeEmail,
    hostName: booking.host.name ?? booking.host.username ?? "Host",
    eventTitle: booking.eventType.title,
    startTime: booking.startTime,
    timezone: booking.timezone,
  }).catch(() => {});

  // 2. Notify first person on the waitlist that a slot opened
  const nextInLine = await prisma.waitlistEntry.findFirst({
    where: { eventTypeId: booking.eventTypeId, notified: false },
    orderBy: { createdAt: "asc" },
  });
  if (!nextInLine) return;

  const bookingUrl = `${process.env.NEXT_PUBLIC_APP_URL}/${booking.host.username}`;

  await prisma.waitlistEntry.update({
    where: { id: nextInLine.id },
    data: { notified: true, notifiedAt: new Date() },
  });

  if (resend) {
    resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: nextInLine.email,
      subject: `A slot just opened — ${booking.eventType.title} with ${booking.host.name}`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
          <h2 style="color:#1a1f36">Great news — a slot opened up! 🎉</h2>
          <p style="color:#6b7280">Hi ${nextInLine.name}, a slot for <strong>${booking.eventType.title}</strong> with <strong>${booking.host.name}</strong> just became available.</p>
          <a href="${bookingUrl}" style="display:inline-block;background:#e53e6d;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">Book Now →</a>
          <p style="color:#9ca3af;font-size:12px">You're receiving this because you joined the waitlist.</p>
        </div>
      `,
    }).catch(console.error);
  }

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
