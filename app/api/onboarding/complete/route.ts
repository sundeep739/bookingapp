import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

type Service = {
  title: string;
  duration: number;
  price?: number;
  color?: string;
  description?: string | null;
};
type DayAvail = {
  dayOfWeek: number;
  isActive: boolean;
  startTime: string;
  endTime: string;
};

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// Escape user-supplied strings before embedding in invite email HTML.
function h(s: string | null | undefined): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const body = await req.json();
  const {
    useCase,
    username,
    name,
    timezone,
    bio,
    org,
    departments,
    services,
    availability,
    invites,
  }: {
    useCase: string;
    username: string;
    name?: string;
    timezone: string;
    bio?: string;
    org?: { name: string; slug: string; type: string; description?: string };
    departments?: { name: string; color?: string }[];
    services?: Service[];
    availability?: DayAvail[];
    invites?: { email: string; role?: string }[];
  } = body;

  // ── Validate ────────────────────────────────────────────────────────────
  if (!username || !/^[a-z0-9_-]+$/.test(username)) {
    return NextResponse.json({ error: "Invalid username" }, { status: 400 });
  }

  const usernameTaken = await prisma.user.findFirst({
    where: { username, NOT: { id: userId } },
    select: { id: true },
  });
  if (usernameTaken) return NextResponse.json({ error: "That booking link is already taken" }, { status: 409 });

  let orgSlug: string | null = null;
  if (org?.slug) {
    const orgTaken = await prisma.organization.findUnique({ where: { slug: org.slug }, select: { id: true } });
    if (orgTaken) return NextResponse.json({ error: "That organization URL is already taken" }, { status: 409 });
  }

  // ── 1. Update user profile ───────────────────────────────────────────────
  await prisma.user.update({
    where: { id: userId },
    data: {
      username,
      timezone: timezone || "UTC",
      ...(name && name.trim() ? { name: name.trim() } : {}),
      ...(bio !== undefined ? { bio } : {}),
    },
  });

  // ── 2. Availability ──────────────────────────────────────────────────────
  if (Array.isArray(availability)) {
    await prisma.availability.deleteMany({ where: { userId } });
    const active = availability.filter((d) => d.isActive);
    if (active.length > 0) {
      await prisma.availability.createMany({
        data: active.map((d) => ({
          userId,
          dayOfWeek: d.dayOfWeek,
          startTime: d.startTime,
          endTime: d.endTime,
          isActive: true,
        })),
      });
    }
  }

  // ── 3. Services / Event types ────────────────────────────────────────────
  if (Array.isArray(services) && services.length > 0) {
    const usedSlugs = new Set<string>();
    for (const svc of services) {
      if (!svc.title || !svc.duration) continue;
      let slug = slugify(svc.title);
      if (!slug) slug = "service";
      while (usedSlugs.has(slug)) slug = `${slug}-${Math.floor(Math.random() * 1000)}`;
      usedSlugs.add(slug);

      await prisma.eventType.create({
        data: {
          userId,
          title: svc.title,
          slug,
          description: svc.description ?? null,
          duration: Number(svc.duration),
          price: Number(svc.price ?? 0),
          color: svc.color ?? "#3b82f6",
          currency: "USD",
        },
      }).catch(() => {/* skip dup slug collisions */});
    }
  }

  // ── 4. Organization (clinic / barbershop / team) ─────────────────────────
  if (org?.name && org?.slug) {
    const created = await prisma.organization.create({
      data: {
        name: org.name,
        slug: org.slug,
        type: org.type || "general",
        description: org.description ?? null,
        timezone: timezone || "UTC",
        ownerId: userId,
        members: { create: { userId, role: "OWNER" } },
      },
    });
    orgSlug = created.slug;

    // Departments
    if (Array.isArray(departments) && departments.length > 0) {
      await prisma.department.createMany({
        data: departments
          .filter((d) => d.name?.trim())
          .map((d) => ({ orgId: created.id, name: d.name.trim(), color: d.color || "#3B82F6" })),
      });
    }

    // Invites
    if (Array.isArray(invites) && invites.length > 0) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
      for (const inv of invites) {
        const email = inv.email?.trim().toLowerCase();
        if (!email) continue;
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const invite = await prisma.orgInvite.upsert({
          where: { orgId_email: { orgId: created.id, email } },
          update: { role: (inv.role as any) || "MEMBER", token: crypto.randomUUID(), expiresAt, accepted: false },
          create: { orgId: created.id, email, role: (inv.role as any) || "MEMBER", expiresAt },
        }).catch(() => null);

        if (invite && resend) {
          resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL!,
            to: email,
            subject: `You're invited to join ${created.name} on BookEasy`,
            html: `
              <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px">
                <h2 style="color:#1E1B4B">You've been invited! 🎉</h2>
                <p><strong>${h(session.user?.name)}</strong> invited you to join <strong>${h(created.name)}</strong> on BookEasy.</p>
                <a href="${appUrl}/invite/${invite.token}" style="display:inline-block;background:#4F46E5;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">Accept Invitation</a>
                <p style="color:#666;font-size:14px">This invite expires in 7 days.</p>
              </div>
            `,
          }).catch(console.error);
        }
      }
    }
  }

  return NextResponse.json({ success: true, username, orgSlug });
}
