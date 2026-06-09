import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

// GET /api/admin/users/[id] — full user profile + all their bookings
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      eventTypes: { select: { id: true, title: true, slug: true, isActive: true, price: true } },
      ownedOrgs: { select: { id: true, name: true, slug: true, _count: { select: { members: true } } } },
      bookings: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true, inviteeName: true, inviteeEmail: true,
          status: true, paymentStatus: true, amountPaid: true,
          startTime: true, createdAt: true,
          eventType: { select: { title: true } },
        },
      },
    },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(user);
}

// PATCH /api/admin/users/[id] — update plan, suspend, add note
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const body = await req.json();
  const allowed = ["plan", "suspended", "suspendedReason", "adminNote", "planStatus"] as const;
  const data: Record<string, any> = {};

  for (const key of allowed) {
    if (key in body) data[key] = body[key];
  }

  if (!Object.keys(data).length) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const user = await prisma.user.update({ where: { id }, data });
  return NextResponse.json({ success: true, user });
}

// DELETE /api/admin/users/[id] — hard delete (same erasure logic as GDPR endpoint)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { id } = await params;

  const ownedOrgs = await prisma.organization.findMany({ where: { ownerId: id }, select: { id: true } });
  const orgIds = ownedOrgs.map((o) => o.id);

  await prisma.$transaction(async (tx) => {
    if (orgIds.length) {
      await tx.booking.updateMany({ where: { orgId: { in: orgIds } }, data: { orgId: null } });
      await tx.organization.deleteMany({ where: { id: { in: orgIds } } });
    }
    await tx.booking.deleteMany({ where: { hostId: id } });
    await tx.user.delete({ where: { id } });
  });

  return NextResponse.json({ success: true });
}
