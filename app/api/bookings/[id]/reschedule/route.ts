import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendRescheduleEmail } from "@/lib/email";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;
  const { id } = await params;
  const { date, time, timezone } = await req.json();

  if (!date || !time) return NextResponse.json({ error: "Date and time required" }, { status: 400 });

  const booking = await prisma.booking.findFirst({
    where: { id, hostId: userId },
    include: {
      eventType: { select: { title: true, duration: true } },
      host: { select: { name: true, username: true } },
    },
  });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Parse "YYYY-MM-DD" + "h:MM AM/PM"
  const [year, month, day] = date.split("-").map(Number);
  const [timePart, ampm] = time.split(" ");
  const [rawH, rawM] = timePart.split(":").map(Number);
  let hours = rawH;
  if (ampm === "PM" && rawH !== 12) hours += 12;
  if (ampm === "AM" && rawH === 12) hours = 0;

  const oldStart = booking.startTime;
  const startTime = new Date(year, month - 1, day, hours, rawM, 0);
  const endTime = new Date(startTime.getTime() + booking.eventType.duration * 60 * 1000);

  const updated = await prisma.booking.update({
    where: { id },
    data: { startTime, endTime, status: "CONFIRMED" },
    include: { eventType: { select: { title: true, color: true, duration: true } } },
  });

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
