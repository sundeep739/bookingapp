import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const members = await prisma.orgMember.findMany({
    where: { org: { slug }, isActive: true },
    include: {
      user: { select: { id: true, name: true, email: true, image: true, username: true, bio: true } },
      department: true,
    },
    orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
  });

  return NextResponse.json(members);
}

// POST — invite a member by email
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

  const { email, role, title, deptId } = await req.json();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  // Check if already a member
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    const existingMember = await prisma.orgMember.findUnique({
      where: { orgId_userId: { orgId: member.org.id, userId: existingUser.id } },
    });
    if (existingMember) return NextResponse.json({ error: "Already a member" }, { status: 409 });
  }

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const invite = await prisma.orgInvite.upsert({
    where: { orgId_email: { orgId: member.org.id, email } },
    update: { role: role || "MEMBER", token: crypto.randomUUID(), expiresAt, accepted: false },
    create: { orgId: member.org.id, email, role: role || "MEMBER", expiresAt },
  });

  // Update title/dept if provided
  if (title || deptId) {
    await prisma.orgInvite.update({ where: { id: invite.id }, data: {} });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const inviteUrl = `${appUrl}/invite/${invite.token}`;

  // Send invite email (fire and forget)
  resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: email,
    subject: `You're invited to join ${member.org.name} on BookEasy`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px">
        <h2 style="color:#1a1f36">You've been invited! 🎉</h2>
        <p><strong>${session.user?.name}</strong> has invited you to join <strong>${member.org.name}</strong> on BookEasy.</p>
        <p>Click the button below to accept your invitation:</p>
        <a href="${inviteUrl}" style="display:inline-block;background:#e53e6d;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">Accept Invitation</a>
        <p style="color:#666;font-size:14px">This invite expires in 7 days. If you don't have a BookEasy account, you'll be prompted to create one.</p>
      </div>
    `,
  }).catch(console.error);

  return NextResponse.json({ success: true, inviteId: invite.id }, { status: 201 });
}
