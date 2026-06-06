import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const todayEnd   = new Date(now); todayEnd.setHours(23, 59, 59, 999);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [totalBookings, thisWeek, pending, todayBookings, monthRevenueData, allBookings] = await Promise.all([
    prisma.booking.count({ where: { hostId: userId, status: { not: "CANCELLED" } } }),
    prisma.booking.count({ where: { hostId: userId, createdAt: { gte: startOfWeek }, status: { not: "CANCELLED" } } }),
    prisma.booking.count({ where: { hostId: userId, status: "PENDING" } }),
    prisma.booking.findMany({
      where: { hostId: userId, startTime: { gte: todayStart, lte: todayEnd }, status: { in: ["CONFIRMED", "PENDING"] } },
      include: { eventType: { select: { title: true, color: true, duration: true } } },
      orderBy: { startTime: "asc" },
    }),
    prisma.booking.findMany({
      where: { hostId: userId, status: { in: ["CONFIRMED", "COMPLETED"] }, createdAt: { gte: startOfMonth } },
      include: { eventType: { select: { price: true } } },
    }),
    prisma.booking.findMany({
      where: { hostId: userId, startTime: { gte: sixMonthsAgo } },
      select: {
        startTime: true, status: true, inviteeName: true,
        eventType: { select: { price: true } },
      },
      orderBy: { startTime: "asc" },
    }),
  ]);

  const revenue = monthRevenueData.reduce((sum, b) => sum + (b.eventType?.price ?? 0), 0);

  // ── Pipeline (group by status) ────────────────────────────────────────────
  const stageMap: Record<string, { count: number; items: string[] }> = {
    PENDING:   { count: 0, items: [] },
    CONFIRMED: { count: 0, items: [] },
    COMPLETED: { count: 0, items: [] },
    CANCELLED: { count: 0, items: [] },
  };
  for (const b of allBookings) {
    const s = stageMap[b.status as keyof typeof stageMap];
    if (s) { s.count++; if (s.items.length < 3) s.items.push(b.inviteeName); }
  }

  // ── Weekly chart (current week, by day, non-cancelled, by startTime) ───────
  const week = DAY_LABELS.map((name) => ({ name, bookings: 0, revenue: 0 }));
  for (const b of allBookings) {
    if (b.status === "CANCELLED") continue;
    const d = new Date(b.startTime);
    if (d >= startOfWeek && d < new Date(startOfWeek.getTime() + 7 * 86400000)) {
      const idx = d.getDay();
      week[idx].bookings++;
      week[idx].revenue += b.eventType?.price ?? 0;
    }
  }

  // ── Monthly chart (last 6 months) ─────────────────────────────────────────
  const month: { name: string; bookings: number; revenue: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    month.push({ name: MONTH_LABELS[d.getMonth()], bookings: 0, revenue: 0 });
  }
  for (const b of allBookings) {
    if (b.status === "CANCELLED") continue;
    const d = new Date(b.startTime);
    const monthsAgo = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
    if (monthsAgo >= 0 && monthsAgo <= 5) {
      const bucket = month[5 - monthsAgo];
      bucket.bookings++;
      bucket.revenue += b.eventType?.price ?? 0;
    }
  }

  return NextResponse.json({
    totalBookings,
    thisWeek,
    pending,
    revenue,
    todayBookings,
    pipeline: stageMap,
    chart: { week, month },
  });
}
