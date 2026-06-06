import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/org — list orgs the user belongs to
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const memberships = await prisma.orgMember.findMany({
    where: { userId, isActive: true },
    include: {
      org: {
        include: {
          _count: { select: { members: true, bookings: true } },
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  });

  return NextResponse.json(memberships.map((m) => ({
    ...m.org,
    role: m.role,
    memberCount: m.org._count.members,
    bookingCount: m.org._count.bookings,
  })));
}

// POST /api/org — create a new org
export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const { name, slug, type, description, timezone } = await req.json();

  if (!name || !slug) return NextResponse.json({ error: "Name and slug required" }, { status: 400 });

  const slugClean = slug.toLowerCase().replace(/[^a-z0-9-]/g, "-");

  const existing = await prisma.organization.findUnique({ where: { slug: slugClean } });
  if (existing) return NextResponse.json({ error: "This URL is already taken" }, { status: 409 });

  const org = await prisma.organization.create({
    data: {
      name,
      slug: slugClean,
      type: type || "general",
      description,
      timezone: timezone || "UTC",
      ownerId: userId,
      members: {
        create: { userId, role: "OWNER" },
      },
    },
  });

  return NextResponse.json(org, { status: 201 });
}
