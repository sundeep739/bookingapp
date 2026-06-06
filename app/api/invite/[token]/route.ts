import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET — validate invite token (show invite details before accepting)
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const invite = await prisma.orgInvite.findUnique({
    where: { token },
    include: { org: { select: { name: true, slug: true, type: true, logo: true } } },
  });

  if (!invite) return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  if (invite.accepted) return NextResponse.json({ error: "Invite already used" }, { status: 410 });
  if (invite.expiresAt < new Date()) return NextResponse.json({ error: "Invite expired" }, { status: 410 });

  return NextResponse.json({
    orgName: invite.org.name,
    orgSlug: invite.org.slug,
    orgType: invite.org.type,
    email: invite.email,
    role: invite.role,
  });
}

// POST — accept invite
export async function POST(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Must be logged in" }, { status: 401 });
  const userId = (session.user as any).id;

  const invite = await prisma.orgInvite.findUnique({
    where: { token },
    include: { org: true },
  });

  if (!invite) return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  if (invite.accepted) return NextResponse.json({ error: "Invite already used" }, { status: 410 });
  if (invite.expiresAt < new Date()) return NextResponse.json({ error: "Invite expired" }, { status: 410 });

  // Check email matches
  if (session.user?.email !== invite.email) {
    return NextResponse.json(
      { error: `This invite was sent to ${invite.email}. Please sign in with that account.` },
      { status: 403 }
    );
  }

  // Add to org
  await prisma.$transaction([
    prisma.orgMember.upsert({
      where: { orgId_userId: { orgId: invite.orgId, userId } },
      update: { role: invite.role, isActive: true },
      create: { orgId: invite.orgId, userId, role: invite.role },
    }),
    prisma.orgInvite.update({
      where: { token },
      data: { accepted: true },
    }),
  ]);

  return NextResponse.json({ success: true, orgSlug: invite.org.slug });
}
