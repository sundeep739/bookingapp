import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request, { params }: { params: Promise<{ slug: string; memberId: string }> }) {
  const { slug, memberId } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const requester = await prisma.orgMember.findFirst({
    where: { org: { slug }, userId, role: { in: ["OWNER", "ADMIN"] } },
  });
  if (!requester) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { role, title, deptId, isActive } = await req.json();

  // IDOR guard: verify the target member belongs to the same org as the requester
  const target = await prisma.orgMember.findFirst({
    where: { id: memberId, orgId: requester.orgId },
  });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (target.role === "OWNER") return NextResponse.json({ error: "Cannot modify owner" }, { status: 400 });

  const updated = await prisma.orgMember.update({
    where: { id: memberId },
    data: {
      ...(role !== undefined && { role }),
      ...(title !== undefined && { title }),
      ...(deptId !== undefined && { deptId }),
      ...(isActive !== undefined && { isActive }),
    },
    include: {
      user: { select: { id: true, name: true, email: true, image: true, username: true } },
      department: true,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ slug: string; memberId: string }> }) {
  const { slug, memberId } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const requester = await prisma.orgMember.findFirst({
    where: { org: { slug }, userId, role: { in: ["OWNER", "ADMIN"] } },
  });
  if (!requester) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // IDOR guard: verify the target belongs to the same org
  const target = await prisma.orgMember.findFirst({
    where: { id: memberId, orgId: requester.orgId },
  });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (target.role === "OWNER") return NextResponse.json({ error: "Cannot remove owner" }, { status: 400 });

  await prisma.orgMember.delete({ where: { id: memberId } });
  return NextResponse.json({ success: true });
}
