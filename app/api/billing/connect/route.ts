import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

// GET — return the host's payout/connect status
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({
    where: { id: (session.user as any).id },
    select: { stripeConnectId: true, stripeChargesEnabled: true },
  });
  return NextResponse.json({
    connected: !!user?.stripeConnectId,
    chargesEnabled: !!user?.stripeChargesEnabled,
    configured: !!stripe,
  });
}

// POST — create (or resume) Stripe Connect Express onboarding, return the link
export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!stripe) return NextResponse.json({ error: "Payments are not configured yet" }, { status: 503 });

  const userId = (session.user as any).id;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  let connectId = user.stripeConnectId;
  if (!connectId) {
    const account = await stripe.accounts.create({
      type: "express",
      email: user.email ?? undefined,
      metadata: { userId },
      capabilities: { transfers: { requested: true }, card_payments: { requested: true } },
    });
    connectId = account.id;
    await prisma.user.update({ where: { id: userId }, data: { stripeConnectId: connectId } });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const link = await stripe.accountLinks.create({
    account: connectId,
    refresh_url: `${appUrl}/dashboard/settings?payouts=refresh`,
    return_url: `${appUrl}/dashboard/settings?payouts=done`,
    type: "account_onboarding",
  });

  return NextResponse.json({ url: link.url });
}
