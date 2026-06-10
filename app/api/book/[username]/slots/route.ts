import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getFreshGoogleAccessToken } from "@/lib/google-token";
import { getCalendarBusyTimes } from "@/lib/google-calendar";
import { fromZonedTime } from "date-fns-tz";
import { rateLimit, clientIp } from "@/lib/rate-limit";

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

// Build an absolute UTC instant for a wall-clock time on a given date in `tz`
function instantFor(dateStr: string, minutes: number, tz: string): Date {
  const h = String(Math.floor(minutes / 60)).padStart(2, "0");
  const m = String(minutes % 60).padStart(2, "0");
  return fromZonedTime(`${dateStr}T${h}:${m}:00`, tz);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  if (!rateLimit(`slots:${clientIp(req)}`, 60, 60_000)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }
  const { searchParams } = req.nextUrl;
  const dateStr    = searchParams.get("date");   // YYYY-MM-DD (calendar date in host tz)
  const eventSlug  = searchParams.get("slug");
  const duration   = parseInt(searchParams.get("duration") ?? "30");
  const guestTz    = searchParams.get("tz") || "UTC";

  if (!dateStr || !eventSlug) {
    return NextResponse.json({ error: "Missing date or slug" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { username }, select: { id: true, timezone: true } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  const hostTz = user.timezone || "UTC";

  const eventType = await prisma.eventType.findFirst({
    where: { userId: user.id, slug: eventSlug },
    select: { bufferBefore: true, bufferAfter: true, minNotice: true, maxDaysAhead: true },
  });

  const bufferBefore = eventType?.bufferBefore ?? 0;
  const bufferAfter  = eventType?.bufferAfter  ?? 0;
  const minNotice    = eventType?.minNotice    ?? 0;  // minutes
  const maxDaysAhead = eventType?.maxDaysAhead ?? 60;

  const now = new Date();
  const [year, month, day] = dateStr.split("-").map(Number);

  // Max-days-ahead guard (compare the start of the requested day in host tz)
  const dayStartInstant = instantFor(dateStr, 0, hostTz);
  const maxInstant = new Date(now.getTime() + maxDaysAhead * 24 * 60 * 60 * 1000);
  if (dayStartInstant > maxInstant) return NextResponse.json({ slots: [] });

  // Day of week as seen in the host's timezone
  const dayOfWeek = new Date(
    new Date(dayStartInstant).toLocaleString("en-US", { timeZone: hostTz })
  ).getDay();

  // Date override check
  // Use Date.UTC so the range is consistent regardless of server timezone.
  // DateOverride.date is stored as UTC midnight of the calendar date.
  const override = await prisma.dateOverride.findFirst({
    where: {
      userId: user.id,
      date: {
        gte: new Date(Date.UTC(year, month - 1, day)),
        lt:  new Date(Date.UTC(year, month - 1, day + 1)),
      },
    },
  });
  if (override?.isBlocked) return NextResponse.json({ slots: [] });

  // Availability window (wall-clock minutes in host tz)
  let startMin: number;
  let endMin: number;
  if (override?.startTime && override?.endTime) {
    startMin = toMinutes(override.startTime);
    endMin   = toMinutes(override.endTime);
  } else {
    const avail = await prisma.availability.findFirst({
      where: { userId: user.id, dayOfWeek, isActive: true },
    });
    if (!avail) return NextResponse.json({ slots: [] });
    startMin = toMinutes(avail.startTime);
    endMin   = toMinutes(avail.endTime);
  }

  // Existing bookings as absolute instants (with buffers)
  const windowStart = instantFor(dateStr, Math.max(0, startMin - 120), hostTz);
  const windowEnd   = instantFor(dateStr, endMin + 120, hostTz);
  const bookings = await prisma.booking.findMany({
    where: {
      hostId: user.id,
      status: { in: ["CONFIRMED", "PENDING"] },
      startTime: { gte: windowStart, lte: windowEnd },
    },
    select: { startTime: true, endTime: true },
  });

  const blocked: { start: number; end: number }[] = bookings.map((b) => ({
    start: b.startTime.getTime() - bufferBefore * 60000,
    end:   b.endTime.getTime()   + bufferAfter  * 60000,
  }));

  // Google Calendar busy times (absolute instants)
  try {
    const token = await getFreshGoogleAccessToken(user.id);
    if (token) {
      const busy = await getCalendarBusyTimes(token, windowStart, windowEnd);
      for (const b of busy) {
        if (!b.start || !b.end) continue;
        blocked.push({
          start: new Date(b.start).getTime() - bufferBefore * 60000,
          end:   new Date(b.end).getTime()   + bufferAfter  * 60000,
        });
      }
    }
  } catch (e) {
    console.error("Free/busy lookup failed:", e);
  }

  const earliest = now.getTime() + minNotice * 60000;

  const labelFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: guestTz, hour: "numeric", minute: "2-digit", hour12: true,
  });

  const slots: { start: string; label: string }[] = [];
  for (let t = startMin; t + duration <= endMin; t += 30) {
    const startInstant = instantFor(dateStr, t, hostTz);
    const endInstant = new Date(startInstant.getTime() + duration * 60000);
    const sMs = startInstant.getTime();
    const eMs = endInstant.getTime();
    if (sMs < earliest) continue;
    const overlaps = blocked.some((b) => sMs < b.end && eMs > b.start);
    if (!overlaps) slots.push({ start: startInstant.toISOString(), label: labelFmt.format(startInstant) });
  }

  return NextResponse.json({ slots });
}
