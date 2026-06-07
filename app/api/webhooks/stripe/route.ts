import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe, planFromPriceId } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  if (!stripe) return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook secret missing" }, { status: 503 });

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook error: ${err.message}` }, { status: 400 });
  }

  const setPlanFromSubscription = async (sub: any) => {
    const customerId = sub.customer as string;
    const priceId = sub.items?.data?.[0]?.price?.id;
    const plan = planFromPriceId(priceId);
    const active = ["active", "trialing", "past_due"].includes(sub.status);
    const renewsAt = sub.current_period_end ? new Date(sub.current_period_end * 1000) : null;

    await prisma.user.updateMany({
      where: { stripeCustomerId: customerId },
      data: {
        plan: active ? plan : "free",
        planStatus: sub.status,
        stripeSubscriptionId: sub.id,
        planRenewsAt: renewsAt,
      },
    });
  };

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const cs = event.data.object as any;
        if (cs.subscription) {
          const sub = await stripe.subscriptions.retrieve(cs.subscription as string);
          await setPlanFromSubscription(sub);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await setPlanFromSubscription(event.data.object);
        break;
      case "customer.subscription.deleted": {
        const sub = event.data.object as any;
        await prisma.user.updateMany({
          where: { stripeCustomerId: sub.customer as string },
          data: { plan: "free", planStatus: "canceled", stripeSubscriptionId: null, planRenewsAt: null },
        });
        break;
      }
    }
  } catch (err) {
    console.error("Stripe webhook handler error:", err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
