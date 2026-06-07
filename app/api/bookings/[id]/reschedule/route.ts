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

  const updated = await prisma.booking.update({
    where: { id },
    data: { startTime, endTime, status: "CONFIRMED" },
    include: { eventType: { select: { title: true, color: true, duration: true } } },
  });

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
