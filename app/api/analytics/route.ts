import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  // Single query for 6-month trend (replaces 12 per-month queries)
  const [monthlyRaw, kpiRaw, popularRaw, eventTypes] = await Promise.all([
    prisma.$queryRaw<{ year: number; month: number; bookings: bigint; revenue: number }[]>`
      SELECT
        EXTRACT(YEAR  FROM "createdAt")::int AS year,
        EXTRACT(MONTH FROM "createdAt")::int AS month,
        COUNT(*)::bigint AS bookings,
        COALESCE(SUM(CASE WHEN status IN ('CONFIRMED','COMPLETED') THEN COALESCE("amountPaid", 0) ELSE 0 END), 0)::float AS revenue
      FROM "Booking"
      WHERE "hostId" = ${userId}
        AND "createdAt" >= ${sixMonthsAgo}
      GROUP BY year, month
    `,

    // KPI aggregates in one pass (replaces 4 separate count/findMany queries)
    prisma.$queryRaw<{ total: bigint; cancelled: bigint; no_show: bigint; revenue: number }[]>`
      SELECT
        COUNT(*)::bigint AS total,
        COUNT(*) FILTER (WHERE status = 'CANCELLED')::bigint AS cancelled,
        COUNT(*) FILTER (WHERE status = 'NO_SHOW')::bigint   AS no_show,
        COALESCE(SUM(CASE WHEN status IN ('CONFIRMED','COMPLETED') THEN COALESCE("amountPaid", 0) ELSE 0 END), 0)::float AS revenue
      FROM "Booking"
      WHERE "hostId" = ${userId}
        AND "createdAt" >= ${sixMonthsAgo}
    `,

    // Popular hours by day-of-week (replaces full-row findMany + JS aggregation)
    prisma.$queryRaw<{ hour: number; dow: number; cnt: bigint }[]>`
      SELECT
        EXTRACT(HOUR FROM "startTime")::int AS hour,
        EXTRACT(DOW  FROM "startTime")::int AS dow,
        COUNT(*)::bigint AS cnt
      FROM "Booking"
      WHERE "hostId" = ${userId}
        AND "createdAt" >= ${sixMonthsAgo}
        AND EXTRACT(DOW FROM "startTime") BETWEEN 1 AND 5
      GROUP BY hour, dow
    `,

    // Event type breakdown — already efficient
    prisma.eventType.findMany({
      where: { userId },
      include: { _count: { select: { bookings: true } } },
    }),
  ]);

  // Build 6-month trend labels
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { year: d.getFullYear(), month: d.getMonth() + 1, label: d.toLocaleString("en-US", { month: "short" }) };
  });
  const monthlyMap = new Map(monthlyRaw.map((r) => [`${r.year}-${r.month}`, r]));
  const trendData = months.map(({ year, month, label }) => {
    const row = monthlyMap.get(`${year}-${month}`);
    return { month: label, bookings: Number(row?.bookings ?? 0), revenue: row?.revenue ?? 0 };
  });

  // Event type breakdown
  const totalBookings = eventTypes.reduce((s, e) => s + e._count.bookings, 0);
  const eventTypeBreakdown = eventTypes
    .map((e) => ({
      name: e.title,
      value: totalBookings > 0 ? Math.round((e._count.bookings / totalBookings) * 100) : 0,
      count: e._count.bookings,
      color: e.color,
    }))
    .filter((e) => e.count > 0);

  // KPIs
  const kpi = kpiRaw[0];
  const total = Number(kpi?.total ?? 0);
  const cancelled = Number(kpi?.cancelled ?? 0);
  const noShow = Number(kpi?.no_show ?? 0);
  const revenue = kpi?.revenue ?? 0;
  const cancellationRate = total > 0 ? ((cancelled / total) * 100).toFixed(1) : "0.0";
  const noShowRate       = total > 0 ? ((noShow   / total) * 100).toFixed(1) : "0.0";

  // Popular times heatmap
  const dayLabels: Record<number, string> = { 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri" };
  const hourMap: Record<number, Record<string, number>> = {};
  for (const row of popularRaw) {
    const h = row.hour;
    if (!hourMap[h]) hourMap[h] = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0 };
    const day = dayLabels[row.dow];
    if (day) hourMap[h][day] = Number(row.cnt);
  }
  const popularTimes = Object.entries(hourMap)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([h, days]) => {
      const hr = Number(h);
      const label = hr === 0 ? "12 AM" : hr < 12 ? `${hr} AM` : hr === 12 ? "12 PM" : `${hr - 12} PM`;
      return { time: label, ...days };
    });

  return NextResponse.json({
    trendData,
    eventTypeBreakdown,
    kpis: { total, revenue, cancellationRate, noShowRate },
    popularTimes,
  });
}
