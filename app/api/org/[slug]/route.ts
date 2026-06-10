import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  // Verify the requester is a member of this org before returning its data
  const membership = await prisma.orgMember.findFirst({
    where: { org: { slug }, userId, isActive: true },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const org = await prisma.organization.findUnique({
    where: { slug },
    include: {
      members: {
        where: { isActive: true },
        include: {
          user: { select: { id: true, name: true, email: true, image: true, username: true, bio: true } },
          department: true,
        },
        orderBy: { joinedAt: "asc" },
      },
      departments: { orderBy: { name: "asc" } },
      _count: { select: { bookings: true } },
    },
  });

  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(org);
}

export async function PUT(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const member = await prisma.orgMember.findFirst({
    where: { org: { slug }, userId, role: { in: ["OWNER", "ADMIN"] } },
  });
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const data = await req.json();
  const org = await prisma.organization.update({
    where: { slug },
    data: {
      name: data.name,
      description: data.description,
      type: data.type,
      timezone: data.timezone,
      website: data.website,
      phone: data.phone,
      address: data.address,
      ...(data.logo !== undefined && { logo: data.logo }),
    },
  });

  return NextResponse.json(org);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const org = await prisma.organization.findUnique({ where: { slug } });
  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (org.ownerId !== userId) return NextResponse.json({ error: "Only owner can delete" }, { status: 403 });

  await prisma.organization.delete({ where: { slug } });
  return NextResponse.json({ success: true });
}
