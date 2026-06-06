import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const now = new Date();

  // Last 6 months data
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { year: d.getFullYear(), month: d.getMonth(), label: d.toLocaleString("en-US", { month: "short" }) };
  });

  const trendData = await Promise.all(
    months.map(async ({ year, month, label }) => {
      const start = new Date(year, month, 1);
      const end   = new Date(year, month + 1, 0, 23, 59, 59);
      const [bookings, revenueRows] = await Promise.all([
        prisma.booking.count({ where: { hostId: userId, createdAt: { gte: start, lte: end } } }),
        prisma.booking.findMany({
          where: { hostId: userId, status: { in: ["CONFIRMED", "COMPLETED"] }, createdAt: { gte: start, lte: end } },
          include: { eventType: { select: { price: true } } },
        }),
      ]);
      const revenue = revenueRows.reduce((s, b) => s + (b.eventType?.price ?? 0), 0);
      return { month: label, bookings, revenue };
    })
  );

  // Event type breakdown
  const eventTypes = await prisma.eventType.findMany({
    where: { userId },
    include: { _count: { select: { bookings: true } } },
  });
  const totalBookings = eventTypes.reduce((s, e) => s + e._count.bookings, 0);
  const eventTypeBreakdown = eventTypes.map((e) => ({
    name: e.title,
    value: totalBookings > 0 ? Math.round((e._count.bookings / totalBookings) * 100) : 0,
    count: e._count.bookings,
    color: e.color,
  })).filter((e) => e.count > 0);

  // KPIs
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const [total, cancelled, noShow, revenueAll] = await Promise.all([
    prisma.booking.count({ where: { hostId: userId, createdAt: { gte: sixMonthsAgo } } }),
    prisma.booking.count({ where: { hostId: userId, status: "CANCELLED", createdAt: { gte: sixMonthsAgo } } }),
    prisma.booking.count({ where: { hostId: userId, status: "NO_SHOW",   createdAt: { gte: sixMonthsAgo } } }),
    prisma.booking.findMany({
      where: { hostId: userId, status: { in: ["CONFIRMED","COMPLETED"] }, createdAt: { gte: sixMonthsAgo } },
      include: { eventType: { select: { price: true } } },
    }),
  ]);
  const revenue = revenueAll.reduce((s, b) => s + (b.eventType?.price ?? 0), 0);
  const cancellationRate = total > 0 ? ((cancelled / total) * 100).toFixed(1) : "0.0";
  const noShowRate       = total > 0 ? ((noShow / total)    * 100).toFixed(1) : "0.0";

  // Popular hours (bookings by hour Mon–Fri)
  const allBookings = await prisma.booking.findMany({
    where: { hostId: userId, createdAt: { gte: sixMonthsAgo } },
    select: { startTime: true },
  });
  const hourMap: Record<number, Record<string, number>> = {};
  const dayLabels: Record<number, string> = { 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri" };
  allBookings.forEach((b) => {
    const h = b.startTime.getHours();
    const dow = b.startTime.getDay();
    if (dow < 1 || dow > 5) return;
    if (!hourMap[h]) hourMap[h] = { Mon:0, Tue:0, Wed:0, Thu:0, Fri:0 };
    hourMap[h][dayLabels[dow]] = (hourMap[h][dayLabels[dow]] ?? 0) + 1;
  });
  const popularTimes = Object.entries(hourMap)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([h, days]) => {
      const hr = Number(h);
      const label = hr === 0 ? "12 AM" : hr < 12 ? `${hr} AM` : hr === 12 ? "12 PM" : `${hr - 12} PM`;
      return { time: label, ...days };
    });

  return NextResponse.json({ trendData, eventTypeBreakdown, kpis: { total, revenue, cancellationRate, noShowRate }, popularTimes });
}
