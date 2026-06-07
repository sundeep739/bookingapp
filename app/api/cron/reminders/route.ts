import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendSmsReminder } from "@/lib/sms";
import { limitsFor } from "@/lib/plan";

// Vercel Cron Job — runs every 30 minutes (configured in vercel.json)
// Sends SMS reminders 24h and 1h before each booking

export async function GET(req: Request) {
  // Protect with a secret so only Vercel cron can call it
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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

  // Send 24h reminders
  for (const booking of due24h) {
    if (!limitsFor(booking.host.plan).sms) continue; // gated to paid plans
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
      await prisma.booking.update({
        where: { id: booking.id },
        data: { sms24hSentAt: now },
      });
      sent24h++;
    } catch (err: any) {
      errors.push(`24h booking ${booking.id}: ${err.message}`);
    }
  }

  // Send 1h reminders
  for (const booking of due1h) {
    if (!limitsFor(booking.host.plan).sms) continue; // gated to paid plans
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
      await prisma.booking.update({
        where: { id: booking.id },
        data: { sms1hSentAt: now },
      });
      sent1h++;
    } catch (err: any) {
      errors.push(`1h booking ${booking.id}: ${err.message}`);
    }
  }

  return NextResponse.json({
    ok: true,
    sent24h,
    sent1h,
    errors: errors.length ? errors : undefined,
    checkedAt: now.toISOString(),
  });
}
