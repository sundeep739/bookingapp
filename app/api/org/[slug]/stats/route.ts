import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const member = await prisma.orgMember.findFirst({
    where: { org: { slug }, userId, isActive: true },
    include: { org: true },
  });
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const allMembers = await prisma.orgMember.findMany({
    where: { orgId: member.org.id, isActive: true },
    select: { userId: true },
  });
  const memberIds = allMembers.map((m) => m.userId);

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [total, thisWeek, thisMonth, upcoming, byStaff] = await Promise.all([
    prisma.booking.count({ where: { hostId: { in: memberIds }, status: { not: "CANCELLED" } } }),
    prisma.booking.count({ where: { hostId: { in: memberIds }, createdAt: { gte: weekAgo }, status: { not: "CANCELLED" } } }),
    prisma.booking.count({ where: { hostId: { in: memberIds }, createdAt: { gte: monthAgo }, status: { not: "CANCELLED" } } }),
    prisma.booking.count({ where: { hostId: { in: memberIds }, startTime: { gte: now }, status: { not: "CANCELLED" } } }),
    prisma.booking.groupBy({
      by: ["hostId"],
      where: { hostId: { in: memberIds }, status: { not: "CANCELLED" } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    }),
  ]);

  // Enrich byStaff with user names
  const staffUsers = await prisma.user.findMany({
    where: { id: { in: memberIds } },
    select: { id: true, name: true, image: true },
  });
  const staffMap = Object.fromEntries(staffUsers.map((u) => [u.id, u]));

  return NextResponse.json({
    total,
    thisWeek,
    thisMonth,
    upcoming,
    staffCount: memberIds.length,
    byStaff: byStaff.map((s) => ({
      ...staffMap[s.hostId],
      bookings: s._count.id,
    })),
  });
}
