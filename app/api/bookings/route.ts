import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status");
  const limit = parseInt(searchParams.get("limit") ?? "50");

  const bookings = await prisma.booking.findMany({
    where: {
      hostId: userId,
      ...(status && status !== "All" ? { status: status as any } : {}),
    },
    include: { eventType: { select: { title: true, color: true, duration: true } } },
    orderBy: { startTime: "desc" },
    take: limit,
  });

  return NextResponse.json(bookings);
}
