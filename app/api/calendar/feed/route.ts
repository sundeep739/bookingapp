/**
 * GET /api/calendar/feed?token=<calendarToken>
 *
 * Generates a live iCal (.ics) feed of all confirmed/pending bookings for the
 * host who owns the token. This URL can be subscribed to in:
 *   - iOS Calendar  (Settings → Calendar → Accounts → Add Account → Other → Add Subscribed Calendar)
 *   - macOS Calendar (File → New Calendar Subscription)
 *   - Outlook        (Add Calendar → From Internet)
 *   - Google Calendar (Other calendars → From URL)
 *   - Any CalDAV-compatible app
 *
 * The feed auto-refreshes — new bookings appear without any action from the host.
 *
 * Token is stored on the User record (calendarToken field). It is NOT the same
 * as the user's session — it is a read-only secret for the feed only.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateIcs } from "@/lib/ics";

function icsDate(d: Date) {
  return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function fold(line: string): string {
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

function esc(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return new NextResponse("Missing token", { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { calendarToken: token },
    select: { id: true, name: true, email: true, username: true },
  });

  if (!user) {
    return new NextResponse("Invalid token", { status: 404 });
  }

  const bookings = await prisma.booking.findMany({
    where: {
      hostId: user.id,
      status: { in: ["CONFIRMED", "PENDING"] },
      startTime: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // 30 days back
    },
    include: {
      eventType: { select: { title: true, location: true } },
    },
    orderBy: { startTime: "asc" },
  });

  const hostName  = user.name ?? user.username ?? "Host";
  const hostEmail = user.email ?? "noreply@bookeasy.app";
  const appUrl    = process.env.NEXT_PUBLIC_APP_URL ?? "https://bookeasy.app";

  // Build the full iCal document manually (multiple events, one VCALENDAR wrapper)
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BookEasy//BookEasy//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    fold(`X-WR-CALNAME:BookEasy — ${esc(hostName)}`),
    `X-WR-TIMEZONE:UTC`,
    `X-PUBLISHED-TTL:PT15M`,  // clients should refresh every 15 minutes
  ];

  for (const booking of bookings) {
    const summary    = `${booking.eventType.title} — ${booking.inviteeName}`;
    const location   = booking.meetingLink ?? booking.eventType.location ?? "";
    const cancelUrl  = booking.cancelToken ? `${appUrl}/cancel/${booking.cancelToken}` : "";
    const descParts  = [`Guest: ${booking.inviteeName} <${booking.inviteeEmail}>`];
    if (booking.meetingLink) descParts.push(`Join: ${booking.meetingLink}`);
    if (cancelUrl)            descParts.push(`Manage: ${cancelUrl}`);
    if (booking.notes)        descParts.push(`Notes: ${booking.notes}`);

    lines.push(
      "BEGIN:VEVENT",
      fold(`UID:${booking.id}@bookeasy`),
      fold(`SUMMARY:${esc(summary)}`),
      `DTSTART:${icsDate(booking.startTime)}`,
      `DTEND:${icsDate(booking.endTime)}`,
      `DTSTAMP:${icsDate(new Date())}`,
      fold(`ORGANIZER;CN=${esc(hostName)}:mailto:${hostEmail}`),
      fold(`ATTENDEE;CN=${esc(booking.inviteeName)};RSVP=FALSE:mailto:${booking.inviteeEmail}`),
      fold(`DESCRIPTION:${esc(descParts.join("\\n"))}`),
      ...(location ? [fold(`LOCATION:${esc(location)}`)] : []),
      `STATUS:${booking.status === "CONFIRMED" ? "CONFIRMED" : "TENTATIVE"}`,
      "SEQUENCE:0",
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");

  const body = lines.join("\r\n");

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type":        "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="bookeasy-${user.username ?? "bookings"}.ics"`,
      "Cache-Control":       "no-cache, no-store",
    },
  });
}
