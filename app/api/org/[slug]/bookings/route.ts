import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const member = await prisma.orgMember.findFirst({
    where: { org: { slug }, userId, isActive: true },
    include: { org: true },
  });
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const staffId = searchParams.get("staffId");

  // Get all member user IDs for this org
  const allMembers = await prisma.orgMember.findMany({
    where: { orgId: member.org.id, isActive: true },
    select: { userId: true },
  });
  const memberIds = allMembers.map((m) => m.userId);

  // Admins/owners see all bookings, members see only their own
  const hostFilter = member.role === "MEMBER"
    ? [userId]
    : staffId ? [staffId] : memberIds;

  const bookings = await prisma.booking.findMany({
    where: {
      hostId: { in: hostFilter },
      ...(status && { status: status as any }),
    },
    include: {
      eventType: { select: { title: true, duration: true, color: true } },
      host: { select: { id: true, name: true, image: true, username: true } },
    },
    orderBy: { startTime: "desc" },
    take: 100,
  });

  return NextResponse.json(bookings);
}
