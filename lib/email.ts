import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.RESEND_FROM_EMAIL ?? "BookEasy <noreply@bookeasy.app>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function formatDateTime(date: Date, timezone: string) {
  return date.toLocaleString("en-US", {
    timeZone: timezone,
    weekday: "long", year: "numeric", month: "long", day: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

export async function sendBookingConfirmationToGuest({
  inviteeName, inviteeEmail, hostName, eventTitle, startTime, endTime,
  timezone, cancelToken,
}: {
  inviteeName: string; inviteeEmail: string; hostName: string;
  eventTitle: string; startTime: Date; endTime: Date;
  timezone: string; cancelToken: string;
}) {
  if (!resend) return; // silently skip if not configured

  const cancelUrl = `${APP_URL}/cancel/${cancelToken}`;
  const dateStr = formatDateTime(startTime, timezone);

  await resend.emails.send({
    from: FROM,
    to: inviteeEmail,
    subject: `✅ Booking Confirmed: ${eventTitle} with ${hostName}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
        <h2 style="color:#1a1f36;margin-bottom:4px">Your booking is confirmed!</h2>
        <p style="color:#6b7280;margin-top:0">Hi ${inviteeName}, here are your meeting details:</p>
        <div style="background:#f4f6fb;border-radius:12px;padding:20px;margin:20px 0">
          <p style="margin:0 0 8px;color:#374151"><strong>📅 Event:</strong> ${eventTitle}</p>
          <p style="margin:0 0 8px;color:#374151"><strong>🕐 When:</strong> ${dateStr}</p>
          <p style="margin:0;color:#374151"><strong>👤 Host:</strong> ${hostName}</p>
        </div>
        <p style="color:#6b7280;font-size:14px">Need to cancel? <a href="${cancelUrl}" style="color:#e53e6d">Click here to cancel your booking</a>.</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
        <p style="color:#9ca3af;font-size:12px">Powered by BookEasy</p>
      </div>
    `,
  });
}

export async function sendBookingNotificationToHost({
  hostEmail, hostName, inviteeName, inviteeEmail, eventTitle,
  startTime, endTime, timezone, notes,
}: {
  hostEmail: string; hostName: string; inviteeName: string; inviteeEmail: string;
  eventTitle: string; startTime: Date; endTime: Date; timezone: string; notes?: string | null;
}) {
  if (!resend) return;

  const dateStr = formatDateTime(startTime, timezone);

  await resend.emails.send({
    from: FROM,
    to: hostEmail,
    subject: `📆 New Booking: ${inviteeName} — ${eventTitle}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
        <h2 style="color:#1a1f36;margin-bottom:4px">New booking received!</h2>
        <p style="color:#6b7280;margin-top:0">Hi ${hostName}, someone just booked a meeting with you.</p>
        <div style="background:#f4f6fb;border-radius:12px;padding:20px;margin:20px 0">
          <p style="margin:0 0 8px;color:#374151"><strong>👤 Name:</strong> ${inviteeName}</p>
          <p style="margin:0 0 8px;color:#374151"><strong>✉️ Email:</strong> ${inviteeEmail}</p>
          <p style="margin:0 0 8px;color:#374151"><strong>📅 Event:</strong> ${eventTitle}</p>
          <p style="margin:0 0 ${notes ? "8px" : "0"};color:#374151"><strong>🕐 When:</strong> ${dateStr}</p>
          ${notes ? `<p style="margin:0;color:#374151"><strong>📝 Notes:</strong> ${notes}</p>` : ""}
        </div>
        <a href="${APP_URL}/dashboard/bookings" style="display:inline-block;background:#e53e6d;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600">View in Dashboard →</a>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
        <p style="color:#9ca3af;font-size:12px">Powered by BookEasy</p>
      </div>
    `,
  });
}

export async function sendRescheduleEmail({
  inviteeName, inviteeEmail, hostName, eventTitle, oldStart, newStart, timezone, cancelToken,
}: {
  inviteeName: string; inviteeEmail: string; hostName: string; eventTitle: string;
  oldStart: Date; newStart: Date; timezone: string; cancelToken?: string | null;
}) {
  if (!resend) return;
  const oldStr = formatDateTime(oldStart, timezone);
  const newStr = formatDateTime(newStart, timezone);
  const cancelUrl = cancelToken ? `${APP_URL}/cancel/${cancelToken}` : null;
  await resend.emails.send({
    from: FROM,
    to: inviteeEmail,
    subject: `🔄 Rescheduled: ${eventTitle} with ${hostName}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
        <h2 style="color:#1a1f36;margin-bottom:4px">Your booking has been rescheduled</h2>
        <p style="color:#6b7280;margin-top:0">Hi ${inviteeName}, the time for your meeting has changed.</p>
        <div style="background:#f4f6fb;border-radius:12px;padding:20px;margin:20px 0">
          <p style="margin:0 0 8px;color:#374151"><strong>📅 Event:</strong> ${eventTitle}</p>
          <p style="margin:0 0 8px;color:#9ca3af;text-decoration:line-through"><strong>Was:</strong> ${oldStr}</p>
          <p style="margin:0;color:#111827"><strong>🕐 Now:</strong> ${newStr}</p>
        </div>
        ${cancelUrl ? `<p style="color:#6b7280;font-size:14px">Can't make the new time? <a href="${cancelUrl}" style="color:#e53e6d">Cancel here</a>.</p>` : ""}
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
        <p style="color:#9ca3af;font-size:12px">Powered by BookEasy</p>
      </div>
    `,
  });
}

export async function sendCancellationEmail({
  inviteeName, inviteeEmail, hostName, eventTitle, startTime, timezone,
}: {
  inviteeName: string; inviteeEmail: string; hostName: string;
  eventTitle: string; startTime: Date; timezone: string;
}) {
  if (!resend) return;
  const dateStr = formatDateTime(startTime, timezone);
  await resend.emails.send({
    from: FROM,
    to: inviteeEmail,
    subject: `❌ Booking Cancelled: ${eventTitle}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
        <h2 style="color:#1a1f36">Booking Cancelled</h2>
        <p style="color:#6b7280">Hi ${inviteeName}, your booking has been cancelled.</p>
        <div style="background:#f4f6fb;border-radius:12px;padding:20px;margin:20px 0">
          <p style="margin:0 0 8px;color:#374151"><strong>📅 Event:</strong> ${eventTitle}</p>
          <p style="margin:0;color:#374151"><strong>🕐 Was scheduled for:</strong> ${dateStr}</p>
        </div>
        <p style="color:#6b7280;font-size:14px">Want to rebook? Visit <a href="${APP_URL}/${hostName}" style="color:#e53e6d">your booking page</a>.</p>
      </div>
    `,
  });
}
