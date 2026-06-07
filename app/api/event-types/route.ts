import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const eventTypes = await prisma.eventType.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { bookings: true } } },
  });

  return NextResponse.json(eventTypes);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const body = await req.json();
  const { title, description, duration, color, location, price, currency, bufferBefore, bufferAfter, minNotice, maxDaysAhead, questions } = body;

  if (!title || !duration) return NextResponse.json({ error: "Title and duration required" }, { status: 400 });

  // Auto-generate slug from title
  let slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  // Ensure unique slug for this user
  const existing = await prisma.eventType.findFirst({ where: { userId, slug } });
  if (existing) slug = `${slug}-${Date.now()}`;

  const eventType = await prisma.eventType.create({
    data: {
      userId, title, slug,
      description: description ?? null,
      duration: parseInt(duration),
      color: color ?? "#3b82f6",
      location: location ?? null,
      price: parseFloat(price ?? 0),
      currency: currency ?? "USD",
      bufferBefore: parseInt(bufferBefore ?? 0),
      bufferAfter: parseInt(bufferAfter ?? 0),
      minNotice: parseInt(minNotice ?? 60),
      maxDaysAhead: parseInt(maxDaysAhead ?? 60),
      questions: Array.isArray(questions) && questions.length ? questions : undefined,
    },
  });

  return NextResponse.json(eventType);
}
