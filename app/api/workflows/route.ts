import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const TRIGGERS = ["BEFORE", "AFTER"];
const CHANNELS = ["EMAIL", "SMS"];

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const workflows = await prisma.workflow.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(workflows);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const body = await req.json();
  const { name, trigger, offsetMinutes, channel, subject, message, eventTypeId, enabled } = body;

  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (!message?.trim()) return NextResponse.json({ error: "Message is required" }, { status: 400 });
  if (!TRIGGERS.includes(trigger)) return NextResponse.json({ error: "Invalid trigger" }, { status: 400 });
  if (!CHANNELS.includes(channel)) return NextResponse.json({ error: "Invalid channel" }, { status: 400 });
  const offset = parseInt(offsetMinutes);
  if (!Number.isFinite(offset) || offset < 0) return NextResponse.json({ error: "Invalid timing" }, { status: 400 });

  // If scoped to an event type, ensure the host owns it.
  if (eventTypeId) {
    const owns = await prisma.eventType.findFirst({ where: { id: eventTypeId, userId }, select: { id: true } });
    if (!owns) return NextResponse.json({ error: "Event type not found" }, { status: 404 });
  }

  const workflow = await prisma.workflow.create({
    data: {
      userId,
      name: name.trim(),
      trigger,
      offsetMinutes: offset,
      channel,
      subject: subject?.trim() || null,
      message: message.trim(),
      eventTypeId: eventTypeId || null,
      enabled: enabled !== false,
    },
  });
  return NextResponse.json(workflow);
}
