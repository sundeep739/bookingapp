import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const availability = await prisma.availability.findMany({
    where: { userId },
    orderBy: { dayOfWeek: "asc" },
  });

  return NextResponse.json(availability);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const { schedule, timezone } = await req.json();
  // schedule: Array of { dayOfWeek: 0-6, isActive: bool, startTime: "HH:MM", endTime: "HH:MM" }

  // Delete existing and re-insert (simplest approach)
  await prisma.availability.deleteMany({ where: { userId } });

  if (schedule && schedule.length > 0) {
    await prisma.availability.createMany({
      data: schedule.map((s: any) => ({
        userId,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        isActive: s.isActive,
      })),
    });
  }

  // Also update user timezone
  if (timezone) {
    await prisma.user.update({ where: { id: userId }, data: { timezone } });
  }

  return NextResponse.json({ success: true });
}
