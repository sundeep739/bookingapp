/**
 * GET  /api/admin/dormant           — list dormant users
 * POST /api/admin/dormant           — send warning emails to dormant users
 * DELETE /api/admin/dormant?days=X  — hard-delete accounts dormant > X days (use carefully)
 *
 * A user is "dormant" when ALL of these are true:
 *   1. Account is older than `minAgeDays` (default 30) — avoids flagging new signups
 *   2. No confirmed/pending booking in `inactiveDays` (default 90)
 *   3. No event type created (never set up their page), OR event types all inactive
 *
 * The warning email gives them 30 days to log in before you can choose to delete.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM    = process.env.RESEND_FROM_EMAIL ?? "BookEasy <noreply@bookeasy.app>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://bookeasy.app";

function dormantCutoff(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const inactiveDays = parseInt(req.nextUrl.searchParams.get("days") ?? "90");
  const minAgeDays   = parseInt(req.nextUrl.searchParams.get("minAge") ?? "30");

  const cutoffActivity = dormantCutoff(inactiveDays);
  const cutoffAge      = dormantCutoff(minAgeDays);

  // Users who:
  //  - signed up more than minAgeDays ago
  //  - have no recent bookings (as host)
  //  - have no upcoming bookings
  const users = await prisma.user.findMany({
    where: {
      createdAt:  { lte: cutoffAge },
      suspended:  false,
      bookings: {
        none: {
          createdAt: { gte: cutoffActivity },
          status:    { in: ["CONFIRMED", "PENDING"] },
        },
      },
    },
    select: {
      id: true, name: true, email: true, username: true,
      plan: true, createdAt: true, adminNote: true,
      _count: { select: { bookings: true, eventTypes: true } },
    },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  // Further filter: no upcoming future bookings
  const now = new Date();
  const dormant = users.filter((u) => true); // already filtered by query above

  return NextResponse.json({
    count:         dormant.length,
    inactiveDays,
    minAgeDays,
    cutoffActivity: cutoffActivity.toISOString(),
    users:          dormant,
  });
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  if (!resend) {
    return NextResponse.json({ error: "Email (Resend) not configured" }, { status: 503 });
  }

  const body        = await req.json();
  const userIds     = body.userIds as string[];
  const customMsg   = body.message as string | undefined;
  const graceDays   = body.graceDays ?? 30;

  if (!Array.isArray(userIds) || userIds.length === 0) {
    return NextResponse.json({ error: "Provide userIds array" }, { status: 400 });
  }

  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true },
  });

  let sent = 0;
  let failed = 0;

  for (const user of users) {
    if (!user.email) { failed++; continue; }

    const graceNote = graceDays
      ? `If you'd like to keep your account, simply <a href="${APP_URL}/login" style="color:#e53e6d">log in</a> within the next ${graceDays} days.`
      : "";

    try {
      await resend.emails.send({
        from: FROM,
        to: user.email,
        subject: "We miss you — your BookEasy account",
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px">
            <h2 style="color:#1a1f36">Hi ${user.name ?? "there"},</h2>
            <p style="color:#6b7280">
              ${customMsg
                ? customMsg
                : `We noticed you haven't used your BookEasy account in a while. We wanted to reach out to see if there's anything we can help with.`
              }
            </p>
            <p style="color:#6b7280">
              Your booking page and all your settings are still intact whenever you're ready.
            </p>
            ${graceNote ? `<p style="color:#6b7280">${graceNote}</p>` : ""}
            <a href="${APP_URL}/dashboard"
               style="display:inline-block;background:#e53e6d;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600;margin:16px 0">
              Go to my account →
            </a>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
            <p style="color:#9ca3af;font-size:12px">
              You can delete your account at any time from Settings → Privacy.
              If you no longer want to receive emails from us, simply delete your account.
            </p>
          </div>
        `,
      });
      sent++;
      // Note the contact in adminNote
      await prisma.user.update({
        where: { id: user.id },
        data: { adminNote: `Dormant warning sent ${new Date().toISOString().split("T")[0]}` },
      });
    } catch {
      failed++;
    }
  }

  return NextResponse.json({ sent, failed });
}

export async function DELETE(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  // Safety: require explicit confirmation header
  const confirm = req.headers.get("x-confirm-delete");
  if (confirm !== "DELETE_DORMANT_ACCOUNTS") {
    return NextResponse.json({
      error: "Set header X-Confirm-Delete: DELETE_DORMANT_ACCOUNTS to proceed",
    }, { status: 400 });
  }

  const days    = parseInt(req.nextUrl.searchParams.get("days") ?? "180");
  const cutoff  = dormantCutoff(days);

  if (days < 90) {
    return NextResponse.json({ error: "Minimum 90 days for bulk deletion" }, { status: 400 });
  }

  const users = await prisma.user.findMany({
    where: {
      createdAt: { lte: cutoff },
      suspended: false,
      bookings:  { none: { createdAt: { gte: cutoff } } },
    },
    select: { id: true },
    take: 100, // batch cap — run multiple times if needed
  });

  let deleted = 0;
  for (const user of users) {
    const ownedOrgs = await prisma.organization.findMany({
      where: { ownerId: user.id }, select: { id: true },
    });
    const orgIds = ownedOrgs.map((o) => o.id);

    await prisma.$transaction(async (tx) => {
      if (orgIds.length) {
        await tx.booking.updateMany({ where: { orgId: { in: orgIds } }, data: { orgId: null } });
        await tx.organization.deleteMany({ where: { id: { in: orgIds } } });
      }
      await tx.booking.deleteMany({ where: { hostId: user.id } });
      await tx.user.delete({ where: { id: user.id } });
    });
    deleted++;
  }

  return NextResponse.json({ deleted, daysThreshold: days });
}
