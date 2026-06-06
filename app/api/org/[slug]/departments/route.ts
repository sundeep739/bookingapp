import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const departments = await prisma.department.findMany({
    where: { org: { slug } },
    include: { _count: { select: { members: true } } },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(departments);
}

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const member = await prisma.orgMember.findFirst({
    where: { org: { slug }, userId, role: { in: ["OWNER", "ADMIN"] } },
    include: { org: true },
  });
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name, color } = await req.json();
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const dept = await prisma.department.create({
    data: { orgId: member.org.id, name, color: color || "#3B82F6" },
  });

  return NextResponse.json(dept, { status: 201 });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const member = await prisma.orgMember.findFirst({
    where: { org: { slug }, userId, role: { in: ["OWNER", "ADMIN"] } },
  });
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await req.json();
  await prisma.department.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
