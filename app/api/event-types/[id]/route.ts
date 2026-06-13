import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const { id } = await params;
  const body = await req.json();
  const { title, description, duration, color, location, price, currency, isActive, bufferBefore, bufferAfter, minNotice, maxDaysAhead, slotInterval, capacity, questions } = body;

  // Verify ownership
  const existing = await prisma.eventType.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.eventType.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(duration !== undefined && { duration: parseInt(duration) }),
      ...(color !== undefined && { color }),
      ...(location !== undefined && { location }),
      ...(price !== undefined && { price: parseFloat(price) }),
      ...(currency !== undefined && { currency }),
      ...(isActive !== undefined && { isActive }),
      ...(bufferBefore !== undefined && { bufferBefore: parseInt(bufferBefore) }),
      ...(bufferAfter !== undefined && { bufferAfter: parseInt(bufferAfter) }),
      ...(minNotice !== undefined && { minNotice: parseInt(minNotice) }),
      ...(maxDaysAhead !== undefined && { maxDaysAhead: parseInt(maxDaysAhead) }),
      ...(slotInterval !== undefined && { slotInterval: parseInt(slotInterval) }),
      ...(capacity !== undefined && { capacity: Math.max(1, parseInt(capacity)) }),
      ...(questions !== undefined && { questions: Array.isArray(questions) && questions.length ? questions : Prisma.JsonNull }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const { id } = await params;

  const existing = await prisma.eventType.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.eventType.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
