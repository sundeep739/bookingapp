/**
 * lib/ics.ts — Generate iCalendar (.ics) files
 *
 * .ics is the universal calendar standard. Attach one to any booking email and
 * it works in: Apple Calendar (iOS + macOS), Outlook, Google Calendar (Gmail),
 * Thunderbird, Yahoo Mail, and every other calendar app on earth.
 *
 * No dependencies — pure string generation per RFC 5545.
 */

function icsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function fold(line: string): string {
  // RFC 5545 §3.1: lines MUST be ≤75 octets; fold with CRLF + single space
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;
  const result: string[] = [];
  let offset = 0;
  let first = true;
  while (offset < bytes.length) {
    const chunk = first ? 75 : 74;
    result.push((first ? "" : " ") + bytes.subarray(offset, offset + chunk).toString("utf8"));
    offset += chunk;
    first = false;
  }
  return result.join("\r\n");
}

function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export interface IcsEventParams {
  uid: string;           // unique ID — use bookingId
  summary: string;       // event title
  description?: string;
  location?: string;
  startTime: Date;
  endTime: Date;
  organizerName: string;
  organizerEmail: string;
  attendeeEmail: string;
  attendeeName: string;
  meetLink?: string | null;
  cancelToken?: string;
  method?: "REQUEST" | "CANCEL";  // REQUEST = invite, CANCEL = cancellation
  sequence?: number;              // Increment for updates (reschedule = 1), 0 for new bookings
}

export function generateIcs(params: IcsEventParams): string {
  const {
    uid, summary, description, location, startTime, endTime,
    organizerName, organizerEmail, attendeeEmail, attendeeName,
    meetLink, cancelToken, method = "REQUEST", sequence = 0,
  } = params;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://bookeasy.app";

  const descParts: string[] = [];
  if (description) descParts.push(description);
  if (meetLink)    descParts.push(`Join meeting: ${meetLink}`);
  if (cancelToken) descParts.push(`Manage booking: ${appUrl}/cancel/${cancelToken}`);
  const fullDesc = descParts.join("\\n\\n");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BookEasy//BookEasy//EN",
    `METHOD:${method}`,
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    fold(`UID:${uid}@bookeasy`),
    fold(`SUMMARY:${esc(summary)}`),
    `DTSTART:${icsDate(startTime)}`,
    `DTEND:${icsDate(endTime)}`,
    `DTSTAMP:${icsDate(new Date())}`,
    fold(`ORGANIZER;CN=${esc(organizerName)}:mailto:${organizerEmail}`),
    fold(`ATTENDEE;CN=${esc(attendeeName)};RSVP=TRUE:mailto:${attendeeEmail}`),
    ...(fullDesc ? [fold(`DESCRIPTION:${fullDesc}`)] : []),
    ...(location  ? [fold(`LOCATION:${esc(location)}`)]  : []),
    ...(meetLink  ? [fold(`URL:${meetLink}`)]             : []),
    `STATUS:${method === "CANCEL" ? "CANCELLED" : "CONFIRMED"}`,
    `SEQUENCE:${sequence}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return lines.join("\r\n");
}

/** Convenience: returns the ICS as a base64 string for use as a Resend attachment. */
export function icsAttachment(params: IcsEventParams): {
  filename: string;
  content: string; // base64
  contentType: string;
} {
  const content = generateIcs(params);
  return {
    filename: "booking.ics",
    content: Buffer.from(content, "utf8").toString("base64"),
    contentType: "text/calendar; charset=utf-8; method=" + (params.method ?? "REQUEST"),
  };
}
