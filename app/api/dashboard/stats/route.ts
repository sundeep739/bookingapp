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
  const weekEnd = new Date(startOfWeek.getTime() + 7 * 86400_000);

  const [totalBookings, thisWeek, pending, todayBookings, monthRevenue, pipelineRaw, weeklyRaw, monthlyRaw] = await Promise.all([
    prisma.booking.count({ where: { hostId: userId, status: { not: "CANCELLED" } } }),
    prisma.booking.count({ where: { hostId: userId, createdAt: { gte: startOfWeek }, status: { not: "CANCELLED" } } }),
    prisma.booking.count({ where: { hostId: userId, status: "PENDING" } }),

    // Today's bookings — small result set, keep as-is
    prisma.booking.findMany({
      where: { hostId: userId, startTime: { gte: todayStart, lte: todayEnd }, status: { in: ["CONFIRMED", "PENDING"] } },
      include: { eventType: { select: { title: true, color: true, duration: true } } },
      orderBy: { startTime: "asc" },
    }),

    // Month revenue — aggregate instead of fetching all rows
    prisma.$queryRaw<{ revenue: number }[]>`
      SELECT COALESCE(SUM(COALESCE("amountPaid", 0)), 0)::float AS revenue
      FROM "Booking"
      WHERE "hostId" = ${userId}
        AND status IN ('CONFIRMED', 'COMPLETED')
        AND "createdAt" >= ${startOfMonth}
    `,

    // Pipeline: group by status (replaces full allBookings fetch + JS grouping)
    prisma.$queryRaw<{ status: string; cnt: bigint; names: string }[]>`
      SELECT status, COUNT(*)::bigint AS cnt,
             STRING_AGG("inviteeName", ',' ORDER BY "createdAt" DESC) AS names
      FROM "Booking"
      WHERE "hostId" = ${userId}
        AND "startTime" >= ${sixMonthsAgo}
      GROUP BY status
    `,

    // Weekly chart — aggregated by day-of-week
    prisma.$queryRaw<{ dow: number; bookings: bigint; revenue: number }[]>`
      SELECT
        EXTRACT(DOW FROM "startTime")::int AS dow,
        COUNT(*)::bigint AS bookings,
        COALESCE(SUM(COALESCE("amountPaid", 0)), 0)::float AS revenue
      FROM "Booking"
      WHERE "hostId" = ${userId}
        AND "startTime" >= ${startOfWeek}
        AND "startTime" < ${weekEnd}
        AND status != 'CANCELLED'
      GROUP BY dow
    `,

    // Monthly chart — aggregated by month
    prisma.$queryRaw<{ year: number; month: number; bookings: bigint; revenue: number }[]>`
      SELECT
        EXTRACT(YEAR  FROM "startTime")::int AS year,
        EXTRACT(MONTH FROM "startTime")::int AS month,
        COUNT(*)::bigint AS bookings,
        COALESCE(SUM(COALESCE("amountPaid", 0)), 0)::float AS revenue
      FROM "Booking"
      WHERE "hostId" = ${userId}
        AND "startTime" >= ${sixMonthsAgo}
        AND status != 'CANCELLED'
      GROUP BY year, month
    `,
  ]);

  const revenue = monthRevenue[0]?.revenue ?? 0;

  // Pipeline
  const stageMap: Record<string, { count: number; items: string[] }> = {
    PENDING:   { count: 0, items: [] },
    CONFIRMED: { count: 0, items: [] },
    COMPLETED: { count: 0, items: [] },
    CANCELLED: { count: 0, items: [] },
  };
  for (const row of pipelineRaw) {
    const stage = stageMap[row.status];
    if (stage) {
      stage.count = Number(row.cnt);
      stage.items = (row.names ?? "").split(",").filter(Boolean).slice(0, 3);
    }
  }

  // Weekly chart
  const week = DAY_LABELS.map((name) => ({ name, bookings: 0, revenue: 0 }));
  for (const row of weeklyRaw) {
    week[row.dow].bookings = Number(row.bookings);
    week[row.dow].revenue  = row.revenue;
  }

  // Monthly chart (last 6 months)
  const monthlyMap = new Map(monthlyRaw.map((r) => [`${r.year}-${r.month}`, r]));
  const month = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
    const row = monthlyMap.get(key);
    return { name: MONTH_LABELS[d.getMonth()], bookings: Number(row?.bookings ?? 0), revenue: row?.revenue ?? 0 };
  });

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
