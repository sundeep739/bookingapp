import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyCancellation } from "@/lib/cancellation";

// Host-side cancellation — also emails the guest and triggers the waitlist
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;
  const { id } = await params;
  const { cancelReason } = await req.json().catch(() => ({}));

  const booking = await prisma.booking.findFirst({
    where: { id, hostId: userId },
    include: {
      eventType: { select: { title: true } },
      host: { select: { id: true, name: true, username: true, email: true } },
    },
  });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (booking.status === "CANCELLED") return NextResponse.json({ error: "Already cancelled" }, { status: 400 });

  const updated = await prisma.booking.update({
    where: { id },
    data: { status: "CANCELLED", ...(cancelReason ? { cancelReason } : {}) },
    include: { eventType: { select: { title: true, color: true } } },
  });

  await notifyCancellation(booking);

  return NextResponse.json(updated);
}
