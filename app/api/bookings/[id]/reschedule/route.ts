import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendRescheduleEmail } from "@/lib/email";
import { getFreshGoogleAccessToken } from "@/lib/google-token";
import { updateGoogleCalendarEvent } from "@/lib/google-calendar";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;
  const { id } = await params;
  const { start, timezone } = await req.json();

  if (!start) return NextResponse.json({ error: "Start time required" }, { status: 400 });

  const booking = await prisma.booking.findFirst({
    where: { id, hostId: userId },
    include: {
      eventType: { select: { title: true, duration: true } },
      host: { select: { name: true, username: true } },
    },
  });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const oldStart = booking.startTime;
  const startTime = new Date(start);
  if (isNaN(startTime.getTime())) return NextResponse.json({ error: "Invalid start time" }, { status: 400 });
  const endTime = new Date(startTime.getTime() + booking.eventType.duration * 60 * 1000);

  // Double-booking guard — same Serializable pattern as booking creation
  let updated: Awaited<ReturnType<typeof prisma.booking.update>>;
  try {
    updated = await prisma.$transaction(async (tx) => {
      const clash = await tx.booking.findFirst({
        where: {
          hostId: userId,
          id: { not: id }, // exclude the booking being rescheduled
          status: { in: ["CONFIRMED", "PENDING"] },
          startTime: { lt: endTime },
          endTime: { gt: startTime },
        },
      });
      if (clash) throw new Error("SLOT_TAKEN");
      return tx.booking.update({
        where: { id },
        data: { startTime, endTime, status: "CONFIRMED" },
        include: { eventType: { select: { title: true, color: true, duration: true } } },
      });
    }, { isolationLevel: "Serializable" });
  } catch (e: any) {
    if (e.message === "SLOT_TAKEN" || e.code === "P2034") {
      return NextResponse.json({ error: "That slot is no longer available." }, { status: 409 });
    }
    throw e;
  }

  // Move the Google Calendar event to the new time
  if (booking.googleEventId) {
    const token = await getFreshGoogleAccessToken(userId);
    if (token) {
      updateGoogleCalendarEvent(token, booking.googleEventId, { startTime, endTime }).catch((e) =>
        console.error("Calendar reschedule failed:", e)
      );
    }
  }

  sendRescheduleEmail({
    inviteeName: booking.inviteeName,
    inviteeEmail: booking.inviteeEmail,
    hostName: booking.host.name ?? booking.host.username ?? "Host",
    eventTitle: booking.eventType.title,
    oldStart,
    newStart: startTime,
    timezone: booking.timezone || timezone || "UTC",
    cancelToken: booking.cancelToken,
  }).catch(() => {});

  return NextResponse.json(updated);
}
