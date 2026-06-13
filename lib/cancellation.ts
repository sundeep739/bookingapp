import { prisma } from "@/lib/prisma";
import { sendCancellationEmail } from "@/lib/email";
import { sendWaitlistNotification } from "@/lib/sms";
import { getFreshGoogleAccessToken } from "@/lib/google-token";
import { deleteGoogleCalendarEvent } from "@/lib/google-calendar";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

type CancelBooking = {
  id?: string;
  eventTypeId: string;
  inviteeName: string;
  inviteeEmail: string;
  startTime: Date;
  endTime?: Date;
  timezone: string;
  googleEventId?: string | null;
  eventType: { title: string };
  host: { id?: string; name: string | null; email?: string | null; username: string | null };
};

/**
 * Sends the guest a cancellation email (with CANCEL .ics to remove the event
 * from their calendar) and notifies the first person on the waitlist.
 * Call AFTER the booking status is set to CANCELLED.
 */
export async function notifyCancellation(booking: CancelBooking) {
  // 0. Remove the event from the host's Google Calendar
  if (booking.googleEventId && booking.host.id) {
    const token = await getFreshGoogleAccessToken(booking.host.id);
    if (token) {
      deleteGoogleCalendarEvent(token, booking.googleEventId).catch((e) =>
        console.error("Calendar delete failed:", e)
      );
    }
  }

  const hostName = booking.host.name ?? booking.host.username ?? "Host";

  // 1. Cancellation email to guest — includes CANCEL .ics (auto-removes from calendar)
  sendCancellationEmail({
    bookingId:    booking.id,
    inviteeName:  booking.inviteeName,
    inviteeEmail: booking.inviteeEmail,
    hostName,
    hostEmail:    booking.host.email,
    eventTitle:   booking.eventType.title,
    startTime:    booking.startTime,
    endTime:      booking.endTime,
    timezone:     booking.timezone,
    hostUsername: booking.host.username,
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
      subject: `A slot just opened — ${booking.eventType.title} with ${hostName}`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
          <h2 style="color:#1E1B4B">Great news — a slot opened up! 🎉</h2>
          <p style="color:#6b7280">Hi ${nextInLine.name}, a slot for <strong>${booking.eventType.title}</strong> with <strong>${hostName}</strong> just became available.</p>
          <a href="${bookingUrl}" style="display:inline-block;background:#4F46E5;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">Book Now →</a>
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
      hostName,
      bookingUrl,
    }).catch(() => {});
  }
}
