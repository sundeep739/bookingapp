import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const now = new Date();
  const startOfMonth  = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfPrevMonth   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixMonthsAgo  = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [
    totalUsers,
    newUsersThisMonth,
    newUsersPrevMonth,
    activeUsers30d,
    totalOrgs,
    totalBookings,
    bookingsThisMonth,
    bookingsPrevMonth,
    confirmedBookings,
    cancelledBookings,
    paidBookings,
    planCounts,
    revenueRows,
    revenueRowsPrev,
    monthlyBookings,
    recentUsers,
    recentBookings,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.user.count({ where: { createdAt: { gte: startOfPrevMonth, lte: endOfPrevMonth } } }),
    // "active" = created a booking or signed in within 30 days
    prisma.user.count({
      where: {
        OR: [
          { createdAt: { gte: thirtyDaysAgo } },
          { bookings: { some: { createdAt: { gte: thirtyDaysAgo } } } },
        ],
      },
    }),
    prisma.organization.count(),
    prisma.booking.count(),
    prisma.booking.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.booking.count({ where: { createdAt: { gte: startOfPrevMonth, lte: endOfPrevMonth } } }),
    prisma.booking.count({ where: { status: "CONFIRMED" } }),
    prisma.booking.count({ where: { status: "CANCELLED" } }),
    prisma.booking.count({ where: { paymentStatus: "PAID" } }),
    // Plan distribution
    prisma.user.groupBy({ by: ["plan"], _count: { plan: true } }),
    // Platform revenue (sum of amountPaid on paid bookings this month)
    prisma.booking.findMany({
      where: { paymentStatus: "PAID", createdAt: { gte: startOfMonth } },
      select: { amountPaid: true },
    }),
    prisma.booking.findMany({
      where: { paymentStatus: "PAID", createdAt: { gte: startOfPrevMonth, lte: endOfPrevMonth } },
      select: { amountPaid: true },
    }),
    // Monthly booking trend (last 6 months)
    prisma.$queryRaw<{ month: string; count: bigint }[]>`
      SELECT TO_CHAR(DATE_TRUNC('month', "createdAt"), 'Mon') as month,
             COUNT(*) as count
      FROM "Booking"
      WHERE "createdAt" >= ${sixMonthsAgo}
      GROUP BY DATE_TRUNC('month', "createdAt")
      ORDER BY DATE_TRUNC('month', "createdAt") ASC
    `,
    // Most recent 8 users
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true, name: true, email: true, image: true,
        plan: true, createdAt: true, username: true,
        _count: { select: { bookings: true } },
      },
    }),
    // Most recent 8 bookings across platform
    prisma.booking.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true, inviteeName: true, inviteeEmail: true,
        status: true, paymentStatus: true, amountPaid: true,
        startTime: true, createdAt: true,
        host: { select: { name: true, email: true, username: true } },
        eventType: { select: { title: true } },
      },
    }),
  ]);

  const revenueThisMonth = revenueRows.reduce((s, b) => s + (b.amountPaid ?? 0), 0);
  const revenuePrevMonth = revenueRowsPrev.reduce((s, b) => s + (b.amountPaid ?? 0), 0);

  const planDistribution = Object.fromEntries(
    planCounts.map((p) => [p.plan ?? "free", p._count.plan])
  );

  const userGrowth = newUsersPrevMonth > 0
    ? (((newUsersThisMonth - newUsersPrevMonth) / newUsersPrevMonth) * 100).toFixed(1)
    : null;
  const bookingGrowth = bookingsPrevMonth > 0
    ? (((bookingsThisMonth - bookingsPrevMonth) / bookingsPrevMonth) * 100).toFixed(1)
    : null;
  const revenueGrowth = revenuePrevMonth > 0
    ? (((revenueThisMonth - revenuePrevMonth) / revenuePrevMonth) * 100).toFixed(1)
    : null;

  return NextResponse.json({
    users: {
      total: totalUsers,
      newThisMonth: newUsersThisMonth,
      active30d: activeUsers30d,
      growth: userGrowth,
    },
    orgs: { total: totalOrgs },
    bookings: {
      total: totalBookings,
      thisMonth: bookingsThisMonth,
      confirmed: confirmedBookings,
      cancelled: cancelledBookings,
      paid: paidBookings,
      growth: bookingGrowth,
      cancellationRate: totalBookings > 0
        ? ((cancelledBookings / totalBookings) * 100).toFixed(1)
        : "0.0",
    },
    revenue: {
      thisMonth: revenueThisMonth,
      prevMonth: revenuePrevMonth,
      growth: revenueGrowth,
    },
    planDistribution,
    monthlyTrend: monthlyBookings.map((r) => ({
      month: r.month,
      bookings: Number(r.count),
    })),
    recentUsers,
    recentBookings,
  });
}
