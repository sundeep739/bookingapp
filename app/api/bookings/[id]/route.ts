import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const { id } = await params;
  const { status, cancelReason } = await req.json();

  const booking = await prisma.booking.findFirst({ where: { id, hostId: userId } });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.booking.update({
    where: { id },
    data: { status, ...(cancelReason ? { cancelReason } : {}) },
    include: { eventType: { select: { title: true, color: true } } },
  });

  return NextResponse.json(updated);
}
