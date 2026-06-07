import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendRescheduleEmail } from "@/lib/email";
import { getFreshGoogleAccessToken } from "@/lib/google-token";
import { updateGoogleCalendarEvent } from "@/lib/google-calendar";

// Guest self-service reschedule, authenticated by the booking's cancelToken.
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { start } = await req.json();
  if (!start) return NextResponse.json({ error: "Start time required" }, { status: 400 });

  const booking = await prisma.booking.findUnique({
    where: { cancelToken: token },
    include: {
      eventType: { select: { title: true, duration: true } },
      host: { select: { id: true, name: true, username: true } },
    },
  });
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  if (booking.status === "CANCELLED") return NextResponse.json({ error: "This booking was cancelled" }, { status: 400 });

  const startTime = new Date(start);
  if (isNaN(startTime.getTime())) return NextResponse.json({ error: "Invalid start time" }, { status: 400 });
  if (startTime.getTime() < Date.now()) return NextResponse.json({ error: "That time is in the past" }, { status: 409 });
  const endTime = new Date(startTime.getTime() + booking.eventType.duration * 60 * 1000);
  const oldStart = booking.startTime;

  // Double-booking guard (exclude this booking itself)
  let updated;
  try {
    updated = await prisma.$transaction(async (tx) => {
      const clash = await tx.booking.findFirst({
        where: {
          hostId: booking.hostId,
          id: { not: booking.id },
          status: { in: ["CONFIRMED", "PENDING"] },
          startTime: { lt: endTime },
          endTime: { gt: startTime },
        },
        select: { id: true },
      });
      if (clash) throw new Error("SLOT_TAKEN");
      return tx.booking.update({
        where: { id: booking.id },
        data: { startTime, endTime, status: "CONFIRMED" },
      });
    }, { isolationLevel: "Serializable" });
  } catch (e: any) {
    if (e?.message === "SLOT_TAKEN" || e?.code === "P2034") {
      return NextResponse.json({ error: "That time was just taken. Please pick another." }, { status: 409 });
    }
    throw e;
  }

  if (booking.googleEventId) {
    const tkn = await getFreshGoogleAccessToken(booking.host.id);
    if (tkn) updateGoogleCalendarEvent(tkn, booking.googleEventId, { startTime, endTime }).catch(() => {});
  }

  sendRescheduleEmail({
    inviteeName: booking.inviteeName,
    inviteeEmail: booking.inviteeEmail,
    hostName: booking.host.name ?? booking.host.username ?? "Host",
    eventTitle: booking.eventType.title,
    oldStart,
    newStart: startTime,
    timezone: booking.timezone,
    cancelToken: token,
  }).catch(() => {});

  return NextResponse.json({ success: true, startTime: updated.startTime });
}
