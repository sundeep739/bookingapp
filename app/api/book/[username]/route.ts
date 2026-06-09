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
      suspended: true,
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
          questions: true,
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (user.suspended) {
    return NextResponse.json({ error: "This booking page is not available." }, { status: 403 });
  }

  // Don't expose the suspended flag to the public
  const { suspended: _, ...publicUser } = user;
  return NextResponse.json(publicUser);
}
