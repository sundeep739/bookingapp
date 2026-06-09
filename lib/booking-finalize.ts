import { prisma } from "@/lib/prisma";
import { createGoogleCalendarEvent } from "@/lib/google-calendar";
import { getFreshGoogleAccessToken } from "@/lib/google-token";
import { sendBookingConfirmationToGuest, sendBookingNotificationToHost } from "@/lib/email";

/**
 * Runs the side-effects of a confirmed booking: creates the Google Calendar
 * event (with a Meet link) and sends the guest + host emails (with .ics attachments).
 * Safe-ish to call once per booking; calendar creation is guarded by googleEventId.
 */
export async function finalizeBooking(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      host: true,
      eventType: { select: { title: true, location: true } },
    },
  });
  if (!booking) return;

  let meetLink: string | null = booking.meetingLink ?? null;

  // Google Calendar (only if not already created)
  if (!booking.googleEventId) {
    const token = await getFreshGoogleAccessToken(booking.hostId);
    if (token) {
      try {
        const result = await createGoogleCalendarEvent(token, {
          summary: `${booking.eventType.title} with ${booking.inviteeName}`,
          description: booking.notes ?? undefined,
          startTime: booking.startTime,
          endTime: booking.endTime,
          attendeeEmail: booking.inviteeEmail,
          location: booking.eventType.location,
          withMeet: !booking.eventType.location || /meet|google/i.test(booking.eventType.location),
        });
        meetLink = result.meetLink ?? meetLink;
        await prisma.booking.update({
          where: { id: booking.id },
          data: { googleEventId: result.eventId, ...(meetLink ? { meetingLink: meetLink } : {}) },
        });
      } catch (e) {
        console.error("Calendar creation failed in finalize:", e);
      }
    }
  }

  const tz = booking.timezone || "UTC";

  // Guest confirmation email — includes .ics for iOS/Outlook/Apple Calendar
  sendBookingConfirmationToGuest({
    bookingId:    booking.id,
    inviteeName:  booking.inviteeName,
    inviteeEmail: booking.inviteeEmail,
    hostName:     booking.host.name ?? booking.host.username ?? "Host",
    hostEmail:    booking.host.email,
    eventTitle:   booking.eventType.title,
    startTime:    booking.startTime,
    endTime:      booking.endTime,
    timezone:     tz,
    cancelToken:  booking.cancelToken ?? "",
    meetingLink:  meetLink,
    location:     booking.eventType.location,
  }).catch(() => {});

  // Host notification email — also includes .ics
  sendBookingNotificationToHost({
    bookingId:    booking.id,
    hostEmail:    booking.host.email!,
    hostName:     booking.host.name ?? booking.host.username ?? "Host",
    inviteeName:  booking.inviteeName,
    inviteeEmail: booking.inviteeEmail,
    eventTitle:   booking.eventType.title,
    startTime:    booking.startTime,
    endTime:      booking.endTime,
    timezone:     tz,
    notes:        booking.notes,
    location:     booking.eventType.location,
  }).catch(() => {});
}
