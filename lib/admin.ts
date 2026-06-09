/**
 * lib/admin.ts — shared admin auth guard
 *
 * Protection is email-based: set ADMIN_EMAIL in env vars.
 * No DB migration needed. Add multiple emails as comma-separated list.
 * e.g. ADMIN_EMAIL="sundeepshaw@gmail.com,other@domain.com"
 */

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function requireAdmin(): Promise<
  { ok: true; userId: string; email: string } | { ok: false; response: Response }
> {
  const session = await auth();
  if (!session?.user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const userEmail = (session.user as any).email as string | undefined;
  const adminEmails = (process.env.ADMIN_EMAIL ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (!userEmail || !adminEmails.includes(userEmail.toLowerCase())) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { ok: true, userId: (session.user as any).id, email: userEmail };
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const adminEmails = (process.env.ADMIN_EMAIL ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return adminEmails.includes(email.toLowerCase());
}
