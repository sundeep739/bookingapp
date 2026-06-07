import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createGoogleCalendarEvent } from "@/lib/google-calendar";
import { getFreshGoogleAccessToken } from "@/lib/google-token";
import { sendBookingConfirmationToGuest, sendBookingNotificationToHost } from "@/lib/email";
import { randomUUID } from "crypto";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const body = await req.json();
  const { eventSlug, date, time, name, email, phone, notes, timezone, answers } = body;

  if (!eventSlug || !date || !time || !name || !email) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const host = await prisma.user.findUnique({ where: { username } });
  if (!host) return NextResponse.json({ error: "Host not found" }, { status: 404 });

  const eventType = await prisma.eventType.findFirst({
    where: { userId: host.id, slug: eventSlug, isActive: true },
  });
  if (!eventType) return NextResponse.json({ error: "Event type not found" }, { status: 404 });

  const [year, month, day] = date.split("-").map(Number);
  const [timePart, ampm] = time.split(" ");
  const [rawH, rawM] = timePart.split(":").map(Number);
  let hours = rawH;
  if (ampm === "PM" && rawH !== 12) hours += 12;
  if (ampm === "AM" && rawH === 12) hours = 0;

  const startTime = new Date(year, month - 1, day, hours, rawM, 0);
  const endTime   = new Date(startTime.getTime() + eventType.duration * 60 * 1000);
  const cancelToken = randomUUID();

  const booking = await prisma.booking.create({
    data: {
      eventTypeId:  eventType.id,
      hostId:       host.id,
      inviteeName:  name,
      inviteeEmail: email,
      inviteePhone: phone ?? null,
      startTime,
      endTime,
      timezone:     timezone ?? "UTC",
      notes:        notes ?? null,
      answers:      answers && Object.keys(answers).length ? answers : undefined,
      status:       "CONFIRMED",
      cancelToken,
    },
  });

  // ── Google Calendar event + auto Google Meet link ────────────────────────
  let meetLink: string | null = null;
  const accessToken = await getFreshGoogleAccessToken(host.id);
  if (accessToken) {
    try {
      const result = await createGoogleCalendarEvent(accessToken, {
        summary:      `${eventType.title} with ${name}`,
        description:  notes ?? undefined,
        startTime,
        endTime,
        attendeeEmail: email,
        location:      eventType.location,
        withMeet:      !eventType.location || /meet|google/i.test(eventType.location),
      });
      meetLink = result.meetLink;
      if (result.eventId || meetLink) {
        await prisma.booking.update({
          where: { id: booking.id },
          data: { googleEventId: result.eventId, ...(meetLink ? { meetingLink: meetLink } : {}) },
        });
      }
    } catch (e) {
      console.error("Calendar event creation failed:", e);
    }
  }

  const tz = timezone ?? "UTC";
  sendBookingConfirmationToGuest({
    inviteeName: name, inviteeEmail: email,
    hostName: host.name ?? username,
    eventTitle: eventType.title,
    startTime, endTime, timezone: tz, cancelToken,
    meetingLink: meetLink,
  }).catch(() => {});

  sendBookingNotificationToHost({
    hostEmail: host.email!, hostName: host.name ?? username,
    inviteeName: name, inviteeEmail: email,
    eventTitle: eventType.title,
    startTime, endTime, timezone: tz, notes,
  }).catch(() => {});

  return NextResponse.json({ success: true, bookingId: booking.id, cancelToken });
}
