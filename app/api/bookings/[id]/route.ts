import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { finalizeBooking } from "@/lib/booking-finalize";
import { notifyCancellation } from "@/lib/cancellation";

// Only these transitions are permitted via this generic endpoint.
// Cancellations and reschedules should use their dedicated routes which
// handle all side effects (emails, calendar, waitlist) properly.
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  PENDING:   ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["COMPLETED", "CANCELLED"],
};

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const { id } = await params;
  const { status, cancelReason } = await req.json();

  if (!status) return NextResponse.json({ error: "status is required" }, { status: 400 });

  const booking = await prisma.booking.findFirst({
    where: { id, hostId: userId },
    include: {
      eventType: { select: { title: true } },
      host: { select: { id: true, name: true, username: true, email: true } },
    },
  });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const allowed = ALLOWED_TRANSITIONS[booking.status] ?? [];
  if (!allowed.includes(status)) {
    return NextResponse.json(
      { error: `Cannot transition from ${booking.status} to ${status}` },
      { status: 400 }
    );
  }

  const updated = await prisma.booking.update({
    where: { id },
    data: { status, ...(cancelReason ? { cancelReason } : {}) },
    include: { eventType: { select: { title: true, color: true } } },
  });

  // Fire side effects for significant transitions
  if (status === "CONFIRMED" && booking.status === "PENDING") {
    finalizeBooking(id).catch(console.error);
  } else if (status === "CANCELLED") {
    notifyCancellation(booking).catch(console.error);
  }

  return NextResponse.json(updated);
}
