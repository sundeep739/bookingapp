import { Resend } from "resend";
import { icsAttachment } from "@/lib/ics";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.RESEND_FROM_EMAIL ?? "BookEasy <noreply@bookeasy.app>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/** Escape user-supplied strings before embedding in HTML email bodies. */
function h(s: string | null | undefined): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

function formatDateTime(date: Date, timezone: string) {
  return date.toLocaleString("en-US", {
    timeZone: timezone,
    weekday: "long", year: "numeric", month: "long", day: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

export async function sendBookingConfirmationToGuest({
  bookingId, inviteeName, inviteeEmail, hostName, hostEmail, eventTitle,
  startTime, endTime, timezone, cancelToken, meetingLink, location,
}: {
  bookingId?: string;
  inviteeName: string; inviteeEmail: string;
  hostName: string; hostEmail?: string | null;
  eventTitle: string; startTime: Date; endTime: Date;
  timezone: string; cancelToken: string;
  meetingLink?: string | null; location?: string | null;
}) {
  if (!resend) return;

  const cancelUrl = `${APP_URL}/cancel/${cancelToken}`;
  const dateStr   = formatDateTime(startTime, timezone);

  // .ics attachment — works with iOS, Outlook, Google Calendar, Apple Mail, etc.
  const ics = bookingId ? icsAttachment({
    uid:            bookingId,
    summary:        `${eventTitle} with ${hostName}`,
    startTime, endTime,
    organizerName:  hostName,
    organizerEmail: hostEmail ?? FROM.replace(/.*<(.+)>/, "$1"),
    attendeeEmail:  inviteeEmail,
    attendeeName:   inviteeName,
    meetLink:       meetingLink,
    cancelToken,
    location:       location ?? undefined,
    method:         "REQUEST",
  }) : null;

  await resend.emails.send({
    from: FROM,
    to: inviteeEmail,
    subject: `✅ Booking Confirmed: ${eventTitle} with ${hostName}`,
    attachments: ics ? [ics] : [],
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
        <h2 style="color:#1a1f36;margin-bottom:4px">Your booking is confirmed!</h2>
        <p style="color:#6b7280;margin-top:0">Hi ${h(inviteeName)}, here are your meeting details:</p>
        <div style="background:#f4f6fb;border-radius:12px;padding:20px;margin:20px 0">
          <p style="margin:0 0 8px;color:#374151"><strong>📅 Event:</strong> ${h(eventTitle)}</p>
          <p style="margin:0 0 8px;color:#374151"><strong>🕐 When:</strong> ${h(dateStr)}</p>
          <p style="margin:0 ${meetingLink ? "0 8px" : ""};color:#374151"><strong>👤 Host:</strong> ${h(hostName)}</p>
          ${meetingLink ? `<p style="margin:0;color:#374151"><strong>🎥 Join:</strong> <a href="${h(meetingLink)}" style="color:#e53e6d">${h(meetingLink)}</a></p>` : ""}
        </div>
        <p style="color:#6b7280;font-size:14px">
          📎 A <strong>calendar invite</strong> is attached — open it to add this meeting to Apple Calendar,
          Outlook, Google Calendar, or any calendar app.
        </p>
        <p style="color:#6b7280;font-size:14px">
          Need to reschedule or cancel? <a href="${cancelUrl}" style="color:#e53e6d">Manage your booking here</a>.
        </p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
        <p style="color:#9ca3af;font-size:12px">Powered by BookEasy</p>
      </div>
    `,
  });
}

export async function sendBookingNotificationToHost({
  bookingId, hostEmail, hostName, inviteeName, inviteeEmail, eventTitle,
  startTime, endTime, timezone, notes, location,
}: {
  bookingId?: string;
  hostEmail: string; hostName: string;
  inviteeName: string; inviteeEmail: string;
  eventTitle: string; startTime: Date; endTime: Date;
  timezone: string; notes?: string | null; location?: string | null;
}) {
  if (!resend) return;

  const dateStr = formatDateTime(startTime, timezone);

  // Host also gets .ics so they can add to any calendar (not just Google)
  const ics = bookingId ? icsAttachment({
    uid:            bookingId,
    summary:        `${eventTitle} with ${inviteeName}`,
    startTime, endTime,
    organizerName:  hostName,
    organizerEmail: hostEmail,
    attendeeEmail:  inviteeEmail,
    attendeeName:   inviteeName,
    location:       location ?? undefined,
    method:         "REQUEST",
  }) : null;

  await resend.emails.send({
    from: FROM,
    to: hostEmail,
    subject: `📆 New Booking: ${inviteeName} — ${eventTitle}`,
    attachments: ics ? [ics] : [],
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
        <h2 style="color:#1a1f36;margin-bottom:4px">New booking received!</h2>
        <p style="color:#6b7280;margin-top:0">Hi ${h(hostName)}, someone just booked a meeting with you.</p>
        <div style="background:#f4f6fb;border-radius:12px;padding:20px;margin:20px 0">
          <p style="margin:0 0 8px;color:#374151"><strong>👤 Name:</strong> ${h(inviteeName)}</p>
          <p style="margin:0 0 8px;color:#374151"><strong>✉️ Email:</strong> ${h(inviteeEmail)}</p>
          <p style="margin:0 0 8px;color:#374151"><strong>📅 Event:</strong> ${h(eventTitle)}</p>
          <p style="margin:0 0 ${notes ? "8px" : "0"};color:#374151"><strong>🕐 When:</strong> ${h(dateStr)}</p>
          ${notes ? `<p style="margin:0;color:#374151"><strong>📝 Notes:</strong> ${h(notes)}</p>` : ""}
        </div>
        <a href="${APP_URL}/dashboard/bookings" style="display:inline-block;background:#e53e6d;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600">View in Dashboard →</a>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
        <p style="color:#9ca3af;font-size:12px">Powered by BookEasy</p>
      </div>
    `,
  });
}

export async function sendRescheduleEmail({
  bookingId, inviteeName, inviteeEmail, hostName, hostEmail, eventTitle,
  oldStart, newStart, newEnd, timezone, cancelToken, location, meetingLink,
}: {
  bookingId?: string;
  inviteeName: string; inviteeEmail: string;
  hostName: string; hostEmail?: string | null;
  eventTitle: string; oldStart: Date;
  newStart: Date; newEnd?: Date;
  timezone: string; cancelToken?: string | null;
  location?: string | null; meetingLink?: string | null;
}) {
  if (!resend) return;
  const oldStr   = formatDateTime(oldStart, timezone);
  const newStr   = formatDateTime(newStart, timezone);
  const cancelUrl = cancelToken ? `${APP_URL}/cancel/${cancelToken}` : null;
  const end       = newEnd ?? new Date(newStart.getTime() + 60 * 60 * 1000);

  const ics = bookingId ? icsAttachment({
    uid:            bookingId,
    summary:        `${eventTitle} with ${hostName}`,
    startTime:      newStart,
    endTime:        end,
    organizerName:  hostName,
    organizerEmail: hostEmail ?? FROM.replace(/.*<(.+)>/, "$1"),
    attendeeEmail:  inviteeEmail,
    attendeeName:   inviteeName,
    meetLink:       meetingLink,
    cancelToken:    cancelToken ?? undefined,
    location:       location ?? undefined,
    method:         "REQUEST",
    sequence:       1, // Increment so calendar clients replace the original event
  }) : null;

  await resend.emails.send({
    from: FROM,
    to: inviteeEmail,
    subject: `🔄 Rescheduled: ${eventTitle} with ${hostName}`,
    attachments: ics ? [ics] : [],
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
        <h2 style="color:#1a1f36;margin-bottom:4px">Your booking has been rescheduled</h2>
        <p style="color:#6b7280;margin-top:0">Hi ${h(inviteeName)}, the time for your meeting has changed.</p>
        <div style="background:#f4f6fb;border-radius:12px;padding:20px;margin:20px 0">
          <p style="margin:0 0 8px;color:#374151"><strong>📅 Event:</strong> ${h(eventTitle)}</p>
          <p style="margin:0 0 8px;color:#9ca3af;text-decoration:line-through"><strong>Was:</strong> ${h(oldStr)}</p>
          <p style="margin:0;color:#111827"><strong>🕐 Now:</strong> ${h(newStr)}</p>
        </div>
        <p style="color:#6b7280;font-size:13px">📎 Updated calendar invite attached — open it to update your calendar.</p>
        ${cancelUrl ? `<p style="color:#6b7280;font-size:14px">Can't make the new time? <a href="${cancelUrl}" style="color:#e53e6d">Cancel here</a>.</p>` : ""}
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
        <p style="color:#9ca3af;font-size:12px">Powered by BookEasy</p>
      </div>
    `,
  });
}

export async function sendCancellationEmail({
  bookingId, inviteeName, inviteeEmail, hostName, hostEmail,
  eventTitle, startTime, endTime, timezone, hostUsername,
}: {
  bookingId?: string;
  inviteeName: string; inviteeEmail: string;
  hostName: string; hostEmail?: string | null;
  eventTitle: string; startTime: Date; endTime?: Date;
  timezone: string; hostUsername?: string | null;
}) {
  if (!resend) return;
  const dateStr = formatDateTime(startTime, timezone);
  const rebookUrl = hostUsername ? `${APP_URL}/${hostUsername}` : APP_URL;
  const end = endTime ?? new Date(startTime.getTime() + 60 * 60 * 1000);

  // Send a CANCEL method ICS so calendar apps auto-remove the event
  const ics = bookingId ? icsAttachment({
    uid:            bookingId,
    summary:        `${eventTitle} with ${hostName}`,
    startTime, endTime: end,
    organizerName:  hostName,
    organizerEmail: hostEmail ?? FROM.replace(/.*<(.+)>/, "$1"),
    attendeeEmail:  inviteeEmail,
    attendeeName:   inviteeName,
    method:         "CANCEL",
  }) : null;

  await resend.emails.send({
    from: FROM,
    to: inviteeEmail,
    subject: `❌ Booking Cancelled: ${eventTitle}`,
    attachments: ics ? [ics] : [],
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
        <h2 style="color:#1a1f36">Booking Cancelled</h2>
        <p style="color:#6b7280">Hi ${h(inviteeName)}, your booking has been cancelled.</p>
        <div style="background:#f4f6fb;border-radius:12px;padding:20px;margin:20px 0">
          <p style="margin:0 0 8px;color:#374151"><strong>📅 Event:</strong> ${h(eventTitle)}</p>
          <p style="margin:0;color:#374151"><strong>🕐 Was scheduled for:</strong> ${h(dateStr)}</p>
        </div>
        <p style="color:#6b7280;font-size:13px">📎 A cancellation notice is attached — open it to remove this event from your calendar.</p>
        <p style="color:#6b7280;font-size:14px">Want to rebook? <a href="${rebookUrl}" style="color:#e53e6d">Visit the booking page</a>.</p>
      </div>
    `,
  });
}
