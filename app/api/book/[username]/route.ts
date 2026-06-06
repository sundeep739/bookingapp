import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      name: true,
      image: true,
      bio: true,
      timezone: true,
      eventTypes: {
        where: { isActive: true },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          duration: true,
          color: true,
          location: true,
          price: true,
          currency: true,
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(user);
}
