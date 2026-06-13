import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendSmsReminder, sendSms } from "@/lib/sms";
import { sendWorkflowEmail } from "@/lib/email";
import { limitsFor } from "@/lib/plan";

// Fill {{name}} {{event}} {{time}} {{host}} placeholders in a workflow template.
function renderTemplate(
  tpl: string,
  b: { inviteeName: string; timezone: string; startTime: Date; eventType: { title: string }; host: { name: string | null } }
): string {
  const time = b.startTime.toLocaleString("en-US", {
    timeZone: b.timezone, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
  return tpl
    .replace(/\{\{\s*name\s*\}\}/g, b.inviteeName)
    .replace(/\{\{\s*event\s*\}\}/g, b.eventType.title)
    .replace(/\{\{\s*time\s*\}\}/g, time)
    .replace(/\{\{\s*host\s*\}\}/g, b.host.name ?? "your host");
}

// Vercel Cron Job — runs every 30 minutes (configured in vercel.json)
// Sends SMS reminders 24h and 1h before each booking

export async function GET(req: Request) {
  // Protect with a secret so only Vercel cron can call it
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // ── 24-hour reminders ───────────────────────────────────���────────────────
  const in24hStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
  const in24hEnd   = new Date(now.getTime() + 25 * 60 * 60 * 1000);

  const due24h = await prisma.booking.findMany({
    where: {
      status: { in: ["CONFIRMED", "PENDING"] },
      inviteePhone: { not: null },
      sms24hSentAt: null,
      startTime: { gte: in24hStart, lte: in24hEnd },
    },
    include: {
      host: { select: { name: true, plan: true } },
      eventType: { select: { title: true } },
    },
  });

  // ── 1-hour reminders ─────────────────────────────────────────────────────
  const in1hStart = new Date(now.getTime() + 30 * 60 * 1000);
  const in1hEnd   = new Date(now.getTime() + 90 * 60 * 1000);

  const due1h = await prisma.booking.findMany({
    where: {
      status: { in: ["CONFIRMED", "PENDING"] },
      inviteePhone: { not: null },
      sms1hSentAt: null,
      startTime: { gte: in1hStart, lte: in1hEnd },
    },
    include: {
      host: { select: { name: true, plan: true } },
      eventType: { select: { title: true } },
    },
  });

  let sent24h = 0;
  let sent1h = 0;
  const errors: string[] = [];
  const success24hIds: string[] = [];
  const success1hIds: string[] = [];

  // Send 24h reminders
  for (const booking of due24h) {
    if (!limitsFor(booking.host.plan).sms) continue;
    try {
      await sendSmsReminder({
        to: booking.inviteePhone!,
        hostName: booking.host.name ?? "your host",
        eventTitle: booking.eventType.title,
        startTime: booking.startTime,
        timezone: booking.timezone,
        cancelToken: booking.cancelToken,
        hoursUntil: 24,
      });
      success24hIds.push(booking.id);
      sent24h++;
    } catch (err: any) {
      errors.push(`24h booking ${booking.id}: ${err.message}`);
    }
  }

  // Send 1h reminders
  for (const booking of due1h) {
    if (!limitsFor(booking.host.plan).sms) continue;
    try {
      await sendSmsReminder({
        to: booking.inviteePhone!,
        hostName: booking.host.name ?? "your host",
        eventTitle: booking.eventType.title,
        startTime: booking.startTime,
        timezone: booking.timezone,
        cancelToken: booking.cancelToken,
        hoursUntil: 1,
      });
      success1hIds.push(booking.id);
      sent1h++;
    } catch (err: any) {
      errors.push(`1h booking ${booking.id}: ${err.message}`);
    }
  }

  // Batch update sent flags — one query instead of one per booking
  await Promise.all([
    success24hIds.length && prisma.booking.updateMany({
      where: { id: { in: success24hIds } },
      data: { sms24hSentAt: now },
    }),
    success1hIds.length && prisma.booking.updateMany({
      where: { id: { in: success1hIds } },
      data: { sms1hSentAt: now },
    }),
  ]);

  // ── Custom reminder workflows ─────────────────────────────────────────────
  // Catch-up model: send when the target time has passed and we haven't sent
  // this workflow for this booking yet — robust regardless of cron cadence.
  let workflowSent = 0;
  const workflows = await prisma.workflow.findMany({ where: { enabled: true } });
  for (const wf of workflows) {
    const offsetMs = wf.offsetMinutes * 60_000;

    const where: any = {
      hostId: wf.userId,
      status: { in: ["CONFIRMED", "PENDING"] },
      ...(wf.eventTypeId ? { eventTypeId: wf.eventTypeId } : {}),
    };
    if (wf.trigger === "BEFORE") {
      // Fire once the booking is within `offset` of now, but hasn't started, and
      // its target time is after the workflow was created (no retroactive blast).
      where.startTime = {
        gt: now,
        lte: new Date(now.getTime() + offsetMs),
        gte: new Date(wf.createdAt.getTime() + offsetMs),
      };
    } else {
      // AFTER: fire once `offset` has elapsed since the start; cap how far back
      // we look so enabling a workflow doesn't blast long-past bookings.
      const maxAgeMs = 2 * 24 * 60 * 60_000;
      const lowerByAge = new Date(now.getTime() - offsetMs - maxAgeMs);
      const lowerByCreate = new Date(wf.createdAt.getTime() - offsetMs);
      where.startTime = {
        lte: new Date(now.getTime() - offsetMs),
        gte: lowerByAge > lowerByCreate ? lowerByAge : lowerByCreate,
      };
    }

    const candidates = await prisma.booking.findMany({
      where,
      include: { host: { select: { name: true, plan: true } }, eventType: { select: { title: true } } },
      take: 500,
    });
    if (candidates.length === 0) continue;

    const already = await prisma.workflowSent.findMany({
      where: { workflowId: wf.id, bookingId: { in: candidates.map((c) => c.id) } },
      select: { bookingId: true },
    });
    const sentSet = new Set(already.map((s) => s.bookingId));
    const isSms = wf.channel === "SMS";

    for (const b of candidates) {
      if (sentSet.has(b.id)) continue;
      const text = renderTemplate(wf.message, b);
      let ok = false;
      if (isSms) {
        if (!b.inviteePhone || !limitsFor(b.host.plan).sms) continue;
        ok = await sendSms(b.inviteePhone, text);
      } else {
        ok = await sendWorkflowEmail({
          to: b.inviteeEmail,
          subject: renderTemplate(wf.subject || "Reminder about your booking", b),
          body: text,
        });
      }
      if (ok) {
        await prisma.workflowSent.create({ data: { workflowId: wf.id, bookingId: b.id } }).catch(() => {/* unique race */});
        workflowSent++;
      }
    }
  }

  return NextResponse.json({
    ok: true,
    sent24h,
    sent1h,
    workflowSent,
    errors: errors.length ? errors : undefined,
    checkedAt: now.toISOString(),
  });
}
