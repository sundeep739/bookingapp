import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyCancellation } from "@/lib/cancellation";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const booking = await prisma.booking.findUnique({
    where: { cancelToken: token },
    include: {
      eventType: { select: { title: true, slug: true, duration: true } },
      host: { select: { name: true, username: true } },
    },
  });
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  return NextResponse.json({
    id: booking.id,
    inviteeName: booking.inviteeName,
    eventTitle: booking.eventType.title,
    eventSlug: booking.eventType.slug,
    duration: booking.eventType.duration,
    startTime: booking.startTime,
    status: booking.status,
    hostName: booking.host.name,
    hostUsername: booking.host.username,
  });
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  if (!rateLimit(`cancel:${clientIp(_req)}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }
  const { token } = await params;
  const booking = await prisma.booking.findUnique({
    where: { cancelToken: token },
    include: {
      eventType: { select: { title: true } },
      host: { select: { id: true, name: true, username: true, email: true } },
    },
  });
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  if (booking.status === "CANCELLED") return NextResponse.json({ error: "Already cancelled" }, { status: 400 });
  if (booking.status === "COMPLETED") return NextResponse.json({ error: "Completed bookings cannot be cancelled" }, { status: 400 });

  await prisma.booking.update({
    where: { cancelToken: token },
    data: { status: "CANCELLED" },
  });

  await notifyCancellation(booking);

  return NextResponse.json({ success: true });
}
