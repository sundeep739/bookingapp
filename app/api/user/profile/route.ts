import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: (session.user as any).id },
    select: { id: true, name: true, email: true, username: true, bio: true, timezone: true, image: true },
  });

  return NextResponse.json(user);
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, username, bio, timezone } = await req.json();
  const userId = (session.user as any).id;

  // Check username uniqueness (excluding current user)
  if (username) {
    const existing = await prisma.user.findFirst({
      where: { username, NOT: { id: userId } },
    });
    if (existing) return NextResponse.json({ error: "Username already taken" }, { status: 409 });
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { name, username, bio, timezone },
    select: { id: true, name: true, email: true, username: true, bio: true, timezone: true, image: true },
  });

  return NextResponse.json(user);
}
