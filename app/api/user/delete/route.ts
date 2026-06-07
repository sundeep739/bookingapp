import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Permanently delete the user's account and associated data (GDPR right to erasure).
export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const ownedOrgs = await prisma.organization.findMany({ where: { ownerId: userId }, select: { id: true } });
  const orgIds = ownedOrgs.map((o) => o.id);

  await prisma.$transaction(async (tx) => {
    // Detach bookings from orgs we're about to delete (orgId has no cascade)
    if (orgIds.length) {
      await tx.booking.updateMany({ where: { orgId: { in: orgIds } }, data: { orgId: null } });
      // Deleting the org cascades its members, departments, and invites
      await tx.organization.deleteMany({ where: { id: { in: orgIds } } });
    }
    // Remove the user's bookings (they reference the user's event types)
    await tx.booking.deleteMany({ where: { hostId: userId } });
    // Finally delete the user — cascades accounts, sessions, event types,
    // availability, date overrides, org memberships, and waitlist entries
    await tx.user.delete({ where: { id: userId } });
  });

  return NextResponse.json({ success: true });
}
