/**
 * stripe-setup.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * One-shot script that creates all Stripe test products, prices, and a webhook
 * endpoint, then prints the exact env vars you need to paste.
 *
 * Usage (needs ts-node OR tsx):
 *   STRIPE_SECRET_KEY=sk_test_... npx tsx scripts/stripe-setup.ts
 *
 * Safe to re-run — it skips creation when products already exist (identified
 * by metadata.bookeasy_id).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("❌  Set STRIPE_SECRET_KEY=sk_test_... before running this script.");
  process.exit(1);
}
if (!key.startsWith("sk_test_")) {
  console.error("❌  This script only accepts TEST keys (sk_test_...). Never run setup with live keys.");
  process.exit(1);
}

const stripe = new Stripe(key);
const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://sundeep739-bookingapp.vercel.app";

// ─── helpers ─────────────────────────────────────────────────────────────────

async function getOrCreate<T>(
  list: () => Promise<Stripe.ApiList<any>>,
  idField: string,
  create: () => Promise<T>
): Promise<T> {
  const existing = await list();
  if (existing.data.length) return existing.data[0] as T;
  return create();
}

// ─── Plans ───────────────────────────────────────────────────────────────────

const PLANS = [
  {
    id:          "bookeasy_pro",
    name:        "BookEasy Pro",
    description: "Solo professionals — Google Calendar sync, SMS reminders",
    price_usd:   9_00,   // $9/month
    envKey:      "STRIPE_PRICE_PRO",
  },
  {
    id:          "bookeasy_team",
    name:        "BookEasy Team",
    description: "Teams up to 10 staff — clinics, salons, shared inbox",
    price_usd:   29_00,  // $29/month
    envKey:      "STRIPE_PRICE_TEAM",
  },
  {
    id:          "bookeasy_business",
    name:        "BookEasy Business",
    description: "Unlimited staff — enterprise organisations",
    price_usd:   79_00,  // $79/month
    envKey:      "STRIPE_PRICE_BUSINESS",
  },
] as const;

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🔧  BookEasy — Stripe test setup\n");
  console.log(`   Dashboard: https://dashboard.stripe.com/test/dashboard`);
  console.log(`   App URL  : ${appUrl}\n`);

  const envLines: string[] = [];

  // ── Subscription plans ────────────────────────────────────────────────────
  console.log("📦  Creating subscription products & prices …");
  for (const plan of PLANS) {
    // Product
    const products = await stripe.products.search({
      query: `metadata['bookeasy_id']:'${plan.id}'`,
    });
    let product: Stripe.Product;
    if (products.data.length) {
      product = products.data[0];
      console.log(`   ✓  Product already exists: ${product.name} (${product.id})`);
    } else {
      product = await stripe.products.create({
        name: plan.name,
        description: plan.description,
        metadata: { bookeasy_id: plan.id },
      });
      console.log(`   ✅  Created product: ${product.name} (${product.id})`);
    }

    // Price (recurring, monthly)
    const prices = await stripe.prices.list({
      product: product.id,
      active: true,
      recurring: { interval: "month" } as any,
    });
    let price: Stripe.Price;
    if (prices.data.length) {
      price = prices.data[0];
      console.log(`   ✓  Price already exists: $${price.unit_amount! / 100}/mo (${price.id})`);
    } else {
      price = await stripe.prices.create({
        product: product.id,
        currency: "usd",
        unit_amount: plan.price_usd,
        recurring: { interval: "month" },
        metadata: { bookeasy_id: plan.id },
      });
      console.log(`   ✅  Created price: $${plan.price_usd / 100}/mo (${price.id})`);
    }

    envLines.push(`${plan.envKey}="${price.id}"`);
  }

  // ── Webhook endpoint ───────────────────────────────────────────────────────
  console.log("\n🪝  Registering webhook endpoint …");
  const webhookUrl = `${appUrl}/api/webhooks/stripe`;
  const webhooks = await stripe.webhookEndpoints.list();
  const existing = webhooks.data.find((w) => w.url === webhookUrl);

  let webhookSecret: string | undefined;
  if (existing) {
    console.log(`   ✓  Webhook already registered: ${webhookUrl} (${existing.id})`);
    console.log(`   ⚠️  Cannot re-read the webhook secret — retrieve it from the Stripe dashboard.`);
    console.log(`       Dashboard > Developers > Webhooks > ${existing.id} > Signing secret`);
  } else {
    const webhook = await stripe.webhookEndpoints.create({
      url: webhookUrl,
      enabled_events: [
        "checkout.session.completed",
        "customer.subscription.created",
        "customer.subscription.updated",
        "customer.subscription.deleted",
        "account.updated",
      ],
      metadata: { bookeasy: "true" },
    });
    webhookSecret = webhook.secret;
    console.log(`   ✅  Webhook created: ${webhookUrl} (${webhook.id})`);
    if (webhookSecret) {
      envLines.push(`STRIPE_WEBHOOK_SECRET="${webhookSecret}"`);
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log("\n─────────────────────────────────────────────────────────────────");
  console.log("✅  DONE — copy these lines into your .env and Vercel env vars:\n");
  console.log(`STRIPE_SECRET_KEY="${key}"`);
  envLines.forEach((l) => console.log(l));
  if (!webhookSecret) {
    console.log(`STRIPE_WEBHOOK_SECRET="<retrieve from Stripe dashboard — see above>"`);
  }
  console.log("\n─────────────────────────────────────────────────────────────────");
  console.log("\n📋  Stripe test cards:");
  console.log("   Successful payment : 4242 4242 4242 4242 (any future exp, any CVC)");
  console.log("   Requires 3DS auth  : 4000 0025 0000 3155");
  console.log("   Insufficient funds : 4000 0000 0000 9995");
  console.log("   Declined           : 4000 0000 0000 0002");
  console.log("\n📋  To forward webhooks locally:");
  console.log("   stripe listen --forward-to localhost:3000/api/webhooks/stripe");
  console.log("   (paste the 'whsec_...' it prints as STRIPE_WEBHOOK_SECRET in .env.local)\n");
}

main().catch((e) => {
  console.error("❌  Setup failed:", e.message);
  process.exit(1);
});
