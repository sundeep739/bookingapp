import { prisma } from "@/lib/prisma";
import { getFreshGoogleAccessToken } from "@/lib/google-token";
import { getCalendarBusyTimes } from "@/lib/google-calendar";
import { fromZonedTime } from "date-fns-tz";

export type Slot = { start: string; label: string; seatsLeft?: number };

export function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** Absolute UTC instant for a wall-clock time on a given date in `tz`. */
export function instantFor(dateStr: string, minutes: number, tz: string): Date {
  const h = String(Math.floor(minutes / 60)).padStart(2, "0");
  const m = String(minutes % 60).padStart(2, "0");
  return fromZonedTime(`${dateStr}T${h}:${m}:00`, tz);
}

export type EventTypeSlotConfig = {
  id: string;
  duration: number;
  bufferBefore: number;
  bufferAfter: number;
  minNotice: number;
  maxDaysAhead: number;
  slotInterval: number;
  capacity: number;
};

/**
 * Compute available booking slots for one host + event type on a calendar date.
 * Honors the host's weekly availability, date overrides, buffers, min-notice,
 * max-days-ahead, configurable start intervals, and group-event capacity.
 * For 1:1 events it also subtracts existing bookings and Google Calendar busy
 * times; for group events (capacity > 1) a slot stays open until signups fill it.
 */
export async function getFreeSlots(opts: {
  userId: string;
  hostTz: string;
  dateStr: string; // YYYY-MM-DD in host tz
  guestTz: string;
  eventType: EventTypeSlotConfig;
  checkGoogleBusy?: boolean;
}): Promise<Slot[]> {
  const { userId, hostTz, dateStr, guestTz, eventType } = opts;
  const checkGoogleBusy = opts.checkGoogleBusy ?? true;

  const duration = eventType.duration;
  const interval = eventType.slotInterval && eventType.slotInterval > 0 ? eventType.slotInterval : duration;
  const capacity = eventType.capacity ?? 1;
  const bufferBefore = eventType.bufferBefore ?? 0;
  const bufferAfter = eventType.bufferAfter ?? 0;
  const minNotice = eventType.minNotice ?? 0;
  const maxDaysAhead = eventType.maxDaysAhead ?? 60;

  const now = new Date();
  const [year, month, day] = dateStr.split("-").map(Number);

  // Max-days-ahead guard (start of the requested day in host tz)
  const dayStartInstant = instantFor(dateStr, 0, hostTz);
  const maxInstant = new Date(now.getTime() + maxDaysAhead * 24 * 60 * 60 * 1000);
  if (dayStartInstant > maxInstant) return [];

  const dayOfWeek = new Date(
    new Date(dayStartInstant).toLocaleString("en-US", { timeZone: hostTz })
  ).getDay();

  // Date override (stored as UTC midnight of the calendar date)
  const override = await prisma.dateOverride.findFirst({
    where: {
      userId,
      date: {
        gte: new Date(Date.UTC(year, month - 1, day)),
        lt: new Date(Date.UTC(year, month - 1, day + 1)),
      },
    },
  });
  if (override?.isBlocked) return [];

  // Availability window (wall-clock minutes in host tz)
  let startMin: number;
  let endMin: number;
  if (override?.startTime && override?.endTime) {
    startMin = toMinutes(override.startTime);
    endMin = toMinutes(override.endTime);
  } else {
    const avail = await prisma.availability.findFirst({
      where: { userId, dayOfWeek, isActive: true },
    });
    if (!avail) return [];
    startMin = toMinutes(avail.startTime);
    endMin = toMinutes(avail.endTime);
  }

  const windowStart = instantFor(dateStr, Math.max(0, startMin - 120), hostTz);
  const windowEnd = instantFor(dateStr, endMin + 120, hostTz);
  const earliest = now.getTime() + minNotice * 60000;

  const labelFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: guestTz, hour: "numeric", minute: "2-digit", hour12: true,
  });

  const slots: Slot[] = [];

  if (capacity > 1) {
    // Group / class event: open while signups < capacity.
    const signups = await prisma.booking.findMany({
      where: {
        hostId: userId,
        eventTypeId: eventType.id,
        status: { in: ["CONFIRMED", "PENDING"] },
        startTime: { gte: windowStart, lte: windowEnd },
      },
      select: { startTime: true },
    });
    const countByStart = new Map<number, number>();
    for (const b of signups) {
      const k = b.startTime.getTime();
      countByStart.set(k, (countByStart.get(k) ?? 0) + 1);
    }

    for (let t = startMin; t + duration <= endMin; t += interval) {
      const startInstant = instantFor(dateStr, t, hostTz);
      const sMs = startInstant.getTime();
      if (sMs < earliest) continue;
      const taken = countByStart.get(sMs) ?? 0;
      if (taken < capacity) {
        slots.push({ start: startInstant.toISOString(), label: labelFmt.format(startInstant), seatsLeft: capacity - taken });
      }
    }
    return slots;
  }

  // 1:1 event: subtract existing bookings + Google busy times.
  const bookings = await prisma.booking.findMany({
    where: {
      hostId: userId,
      status: { in: ["CONFIRMED", "PENDING"] },
      startTime: { gte: windowStart, lte: windowEnd },
    },
    select: { startTime: true, endTime: true },
  });

  const blocked: { start: number; end: number }[] = bookings.map((b) => ({
    start: b.startTime.getTime() - bufferBefore * 60000,
    end: b.endTime.getTime() + bufferAfter * 60000,
  }));

  if (checkGoogleBusy) {
    try {
      const token = await getFreshGoogleAccessToken(userId);
      if (token) {
        const busy = await getCalendarBusyTimes(token, windowStart, windowEnd);
        for (const b of busy) {
          if (!b.start || !b.end) continue;
          blocked.push({
            start: new Date(b.start).getTime() - bufferBefore * 60000,
            end: new Date(b.end).getTime() + bufferAfter * 60000,
          });
        }
      }
    } catch (e) {
      console.error("Free/busy lookup failed:", e);
    }
  }

  for (let t = startMin; t + duration <= endMin; t += interval) {
    const startInstant = instantFor(dateStr, t, hostTz);
    const endInstant = new Date(startInstant.getTime() + duration * 60000);
    const sMs = startInstant.getTime();
    const eMs = endInstant.getTime();
    if (sMs < earliest) continue;
    const overlaps = blocked.some((b) => sMs < b.end && eMs > b.start);
    if (!overlaps) slots.push({ start: startInstant.toISOString(), label: labelFmt.format(startInstant) });
  }

  return slots;
}
