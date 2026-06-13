import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { getFreeSlots } from "@/lib/slots";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  if (!rateLimit(`slots:${clientIp(req)}`, 60, 60_000)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }
  const { searchParams } = req.nextUrl;
  const dateStr   = searchParams.get("date");   // YYYY-MM-DD (calendar date in host tz)
  const eventSlug = searchParams.get("slug");
  const guestTz   = searchParams.get("tz") || "UTC";

  if (!dateStr || !eventSlug) {
    return NextResponse.json({ error: "Missing date or slug" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { username }, select: { id: true, timezone: true } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const eventType = await prisma.eventType.findFirst({
    where: { userId: user.id, slug: eventSlug },
    select: {
      id: true, duration: true, bufferBefore: true, bufferAfter: true,
      minNotice: true, maxDaysAhead: true, slotInterval: true, capacity: true,
    },
  });
  if (!eventType) return NextResponse.json({ slots: [] });

  const slots = await getFreeSlots({
    userId: user.id,
    hostTz: user.timezone || "UTC",
    dateStr,
    guestTz,
    eventType,
  });

  return NextResponse.json({ slots });
}
