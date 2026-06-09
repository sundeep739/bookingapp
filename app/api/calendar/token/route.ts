/**
 * GET  /api/calendar/token  — return the host's current feed URL
 * POST /api/calendar/token  — regenerate the token (rotate if compromised)
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

function generateToken() {
  return randomBytes(32).toString("hex");
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  let user = await prisma.user.findUnique({
    where: { id: userId },
    select: { calendarToken: true, username: true },
  });

  // Auto-create token on first request
  if (!user?.calendarToken) {
    user = await prisma.user.update({
      where: { id: userId },
      data: { calendarToken: generateToken() },
      select: { calendarToken: true, username: true },
    });
  }

  const appUrl  = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const feedUrl = `${appUrl}/api/calendar/feed?token=${user!.calendarToken}`;
  const webcal  = feedUrl.replace(/^https?:\/\//, "webcal://");

  return NextResponse.json({ feedUrl, webcal });
}

export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const newToken = generateToken();
  await prisma.user.update({
    where: { id: userId },
    data: { calendarToken: newToken },
  });

  const appUrl  = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const feedUrl = `${appUrl}/api/calendar/feed?token=${newToken}`;
  const webcal  = feedUrl.replace(/^https?:\/\//, "webcal://");

  return NextResponse.json({ feedUrl, webcal });
}
