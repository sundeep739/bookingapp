import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const TRIGGERS = ["BEFORE", "AFTER"];
const CHANNELS = ["EMAIL", "SMS"];

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;
  const { id } = await params;

  const existing = await prisma.workflow.findFirst({ where: { id, userId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { name, trigger, offsetMinutes, channel, subject, message, eventTypeId, enabled } = body;

  if (trigger !== undefined && !TRIGGERS.includes(trigger)) return NextResponse.json({ error: "Invalid trigger" }, { status: 400 });
  if (channel !== undefined && !CHANNELS.includes(channel)) return NextResponse.json({ error: "Invalid channel" }, { status: 400 });
  if (eventTypeId) {
    const owns = await prisma.eventType.findFirst({ where: { id: eventTypeId, userId }, select: { id: true } });
    if (!owns) return NextResponse.json({ error: "Event type not found" }, { status: 404 });
  }

  const updated = await prisma.workflow.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: String(name).trim() }),
      ...(trigger !== undefined && { trigger }),
      ...(offsetMinutes !== undefined && { offsetMinutes: parseInt(offsetMinutes) }),
      ...(channel !== undefined && { channel }),
      ...(subject !== undefined && { subject: subject?.trim() || null }),
      ...(message !== undefined && { message: String(message).trim() }),
      ...(eventTypeId !== undefined && { eventTypeId: eventTypeId || null }),
      ...(enabled !== undefined && { enabled: !!enabled }),
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;
  const { id } = await params;

  const existing = await prisma.workflow.findFirst({ where: { id, userId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.workflow.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
