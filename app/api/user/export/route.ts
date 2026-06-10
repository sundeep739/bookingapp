import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GDPR data export — downloads everything we hold about the user as JSON.
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const [user, eventTypes, availability, bookings, ownedOrgs, memberships] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, username: true, bio: true, timezone: true, plan: true, createdAt: true },
    }),
    prisma.eventType.findMany({ where: { userId } }),
    prisma.availability.findMany({ where: { userId } }),
    prisma.booking.findMany({
      where: { hostId: userId },
      select: {
        id: true, inviteeName: true, inviteeEmail: true, inviteePhone: true,
        startTime: true, endTime: true, timezone: true, status: true,
        paymentStatus: true, amountPaid: true, notes: true, answers: true,
        createdAt: true,
        eventType: { select: { title: true, slug: true } },
        // cancelToken and stripePaymentId intentionally excluded
      },
      orderBy: { startTime: "desc" },
      take: 10000,
    }),
    prisma.organization.findMany({ where: { ownerId: userId } }),
    prisma.orgMember.findMany({ where: { userId }, include: { org: { select: { name: true, slug: true } } } }),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    profile: user,
    eventTypes,
    availability,
    bookings,
    organizationsOwned: ownedOrgs,
    teamMemberships: memberships,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="bookeasy-data-${userId}.json"`,
    },
  });
}
