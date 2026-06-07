import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const googleAccount = await prisma.account.findFirst({
    where: { userId, provider: "google" },
    select: { id: true, scope: true },
  });

  const googleConnected = !!googleAccount;
  const calendarScope = googleAccount?.scope?.includes("calendar") ?? false;

  return NextResponse.json({
    googleCalendar: googleConnected && calendarScope,
    googleMeet: googleConnected && calendarScope,
    smsConfigured: !!process.env.TWILIO_ACCOUNT_SID,
    stripeConfigured: !!process.env.STRIPE_SECRET_KEY,
  });
}
