import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

  const [totalBookings, thisWeek, pending, todayBookings, revenueData] = await Promise.all([
    prisma.booking.count({ where: { hostId: userId } }),
    prisma.booking.count({ where: { hostId: userId, createdAt: { gte: startOfWeek } } }),
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
  ]);

  const revenue = revenueData.reduce((sum, b) => sum + (b.eventType?.price ?? 0), 0);

  return NextResponse.json({
    totalBookings,
    thisWeek,
    pending,
    revenue,
    todayBookings,
  });
}
