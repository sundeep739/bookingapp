import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getFreshGoogleAccessToken } from "@/lib/google-token";
import { getCalendarBusyTimes } from "@/lib/google-calendar";

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function formatSlot(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const display = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${display}:${m.toString().padStart(2, "0")} ${ampm}`;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const { searchParams } = req.nextUrl;
  const dateStr    = searchParams.get("date");
  const eventSlug  = searchParams.get("slug");
  const duration   = parseInt(searchParams.get("duration") ?? "30");

  if (!dateStr || !eventSlug) {
    return NextResponse.json({ error: "Missing date or slug" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Get event type for buffer times + min notice + max days ahead
  const eventType = await prisma.eventType.findFirst({
    where: { userId: user.id, slug: eventSlug },
    select: { bufferBefore: true, bufferAfter: true, minNotice: true, maxDaysAhead: true },
  });

  const bufferBefore = eventType?.bufferBefore ?? 0;
  const bufferAfter  = eventType?.bufferAfter  ?? 0;
  const minNotice    = eventType?.minNotice    ?? 0;  // minutes
  const maxDaysAhead = eventType?.maxDaysAhead ?? 60;

  // Enforce min notice & max days ahead
  const now = new Date();
  const [year, month, day] = dateStr.split("-").map(Number);
  const requestedDate = new Date(year, month - 1, day);
  requestedDate.setHours(0, 0, 0, 0);

  const maxDate = new Date(now);
  maxDate.setDate(maxDate.getDate() + maxDaysAhead);
  maxDate.setHours(23, 59, 59, 999);

  if (requestedDate > maxDate) return NextResponse.json({ slots: [] });

  const dayOfWeek = requestedDate.getDay();

  // Date override check
  const override = await prisma.dateOverride.findFirst({
    where: {
      userId: user.id,
      date: { gte: new Date(year, month - 1, day, 0, 0, 0), lt: new Date(year, month - 1, day, 23, 59, 59) },
    },
  });
  if (override?.isBlocked) return NextResponse.json({ slots: [] });

  // Get availability window
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

  // Existing bookings (with buffers) to block
  const dayStart = new Date(year, month - 1, day, 0, 0, 0);
  const dayEnd   = new Date(year, month - 1, day, 23, 59, 59);
  const bookings = await prisma.booking.findMany({
    where: { hostId: user.id, status: { in: ["CONFIRMED", "PENDING"] }, startTime: { gte: dayStart, lte: dayEnd } },
    select: { startTime: true, endTime: true },
  });

  const bookedRanges = bookings.map((b) => ({
    start: b.startTime.getHours() * 60 + b.startTime.getMinutes() - bufferBefore,
    end:   b.endTime.getHours()   * 60 + b.endTime.getMinutes()   + bufferAfter,
  }));

  // Block times the host is busy in their connected Google Calendar (two-way sync)
  try {
    const token = await getFreshGoogleAccessToken(user.id);
    if (token) {
      const busy = await getCalendarBusyTimes(token, dayStart, dayEnd);
      for (const b of busy) {
        if (!b.start || !b.end) continue;
        const bs = new Date(b.start);
        const be = new Date(b.end);
        bookedRanges.push({
          start: bs.getHours() * 60 + bs.getMinutes() - bufferBefore,
          end:   be.getHours() * 60 + be.getMinutes() + bufferAfter,
        });
      }
    }
  } catch (e) {
    console.error("Free/busy lookup failed:", e);
  }

  // Min notice: earliest bookable time = now + minNotice
  const earliestMinutes = requestedDate.toDateString() === now.toDateString()
    ? now.getHours() * 60 + now.getMinutes() + minNotice
    : 0;

  // Generate slots
  const slots: string[] = [];
  for (let t = startMin; t + duration <= endMin; t += 30) {
    if (t < earliestMinutes) continue;
    const slotEnd = t + duration;
    const overlaps = bookedRanges.some((b) => t < b.end && slotEnd > b.start);
    if (!overlaps) slots.push(formatSlot(t));
  }

  return NextResponse.json({ slots });
}
