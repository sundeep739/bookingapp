/**
 * stripe-validate.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Pre-launch checklist: verifies all Stripe env vars are present, that keys
 * match their expected environment (test vs live), that prices exist in Stripe,
 * and that the webhook endpoint is registered correctly.
 *
 * Run this before every production deployment.
 *
 * Usage:
 *   npx tsx scripts/stripe-validate.ts
 *   npx tsx scripts/stripe-validate.ts --live   # allow live keys
 * ─────────────────────────────────────────────────────────────────────────────
 */

import Stripe from "stripe";

const allowLive = process.argv.includes("--live");

// ─── helpers ─────────────────────────────────────────────────────────────────

type Status = "ok" | "warn" | "error";
const results: { status: Status; label: string; detail?: string }[] = [];

function ok(label: string, detail?: string)   { results.push({ status: "ok",    label, detail }); }
function warn(label: string, detail?: string)  { results.push({ status: "warn",  label, detail }); }
function error(label: string, detail?: string) { results.push({ status: "error", label, detail }); }

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🔍  BookEasy — Stripe pre-launch validation\n");

  // ── Env vars present ──────────────────────────────────────────────────────
  const requiredVars = [
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "STRIPE_PRICE_PRO",
    "STRIPE_PRICE_TEAM",
    "STRIPE_PRICE_BUSINESS",
    "NEXT_PUBLIC_APP_URL",
  ];

  for (const v of requiredVars) {
    if (process.env[v]) ok(`${v} is set`);
    else                 error(`${v} is missing`);
  }

  // ── Key environment (test vs live) ────────────────────────────────────────
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";
  const isTestKey = key.startsWith("sk_test_");
  const isLiveKey = key.startsWith("sk_live_");

  if (isTestKey && allowLive) {
    warn("STRIPE_SECRET_KEY is a TEST key — swap for sk_live_ before going live");
  } else if (isTestKey) {
    ok("STRIPE_SECRET_KEY is a test key (sk_test_…) — correct for sandbox");
  } else if (isLiveKey && allowLive) {
    ok("STRIPE_SECRET_KEY is a LIVE key (sk_live_…)");
  } else if (isLiveKey && !allowLive) {
    error("STRIPE_SECRET_KEY is a LIVE key but --live flag not passed — are you sure?");
  } else if (key) {
    error(`STRIPE_SECRET_KEY has unexpected format: ${key.substring(0, 12)}…`);
  }

  if (webhookSecret && !webhookSecret.startsWith("whsec_")) {
    error(`STRIPE_WEBHOOK_SECRET should start with 'whsec_', got: ${webhookSecret.substring(0, 8)}…`);
  } else if (webhookSecret) {
    ok("STRIPE_WEBHOOK_SECRET format is correct (whsec_…)");
  }

  if (!key) {
    printSummary();
    return;
  }

  const stripe = new Stripe(key);

  // ── API connectivity ──────────────────────────────────────────────────────
  try {
    await stripe.balance.retrieve();
    ok("Stripe API reachable");
  } catch (e: any) {
    error("Stripe API unreachable", e.message);
    printSummary();
    return;
  }

  // ── Price IDs ─────────────────────────────────────────────────────────────
  const planPrices: [string, string | undefined][] = [
    ["STRIPE_PRICE_PRO",      process.env.STRIPE_PRICE_PRO],
    ["STRIPE_PRICE_TEAM",     process.env.STRIPE_PRICE_TEAM],
    ["STRIPE_PRICE_BUSINESS", process.env.STRIPE_PRICE_BUSINESS],
  ];

  for (const [envKey, priceId] of planPrices) {
    if (!priceId) continue; // already reported as missing above
    try {
      const price = await stripe.prices.retrieve(priceId);
      if (!price.active) {
        error(`${envKey}: price ${priceId} is INACTIVE`);
      } else if (price.type !== "recurring") {
        error(`${envKey}: price ${priceId} is type=${price.type}, expected recurring`);
      } else if (price.recurring?.interval !== "month") {
        warn(`${envKey}: price ${priceId} has interval=${price.recurring?.interval} (expected month)`);
      } else {
        ok(`${envKey}: $${price.unit_amount! / 100}/month, active`);
      }
    } catch (e: any) {
      error(`${envKey}: could not retrieve price ${priceId}`, e.message);
    }
  }

  // ── Webhook endpoint ──────────────────────────────────────────────────────
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const expectedWebhookUrl = `${appUrl}/api/webhooks/stripe`;

  try {
    const webhooks = await stripe.webhookEndpoints.list();
    const match = webhooks.data.find((w) => w.url === expectedWebhookUrl);

    if (match) {
      ok(`Webhook endpoint registered: ${expectedWebhookUrl}`);
      const requiredEvents = [
        "checkout.session.completed",
        "customer.subscription.created",
        "customer.subscription.updated",
        "customer.subscription.deleted",
        "account.updated",
      ];
      const registered = match.enabled_events;
      for (const ev of requiredEvents) {
        if (registered.includes(ev) || registered.includes("*")) {
          ok(`  Event '${ev}' registered`);
        } else {
          error(`  Event '${ev}' is NOT registered on the webhook`);
        }
      }
      if (match.status !== "enabled") {
        warn(`Webhook status is '${match.status}' (expected enabled)`);
      }
    } else {
      warn(
        `No webhook endpoint found for ${expectedWebhookUrl}`,
        "Run scripts/stripe-setup.ts to register it, or register manually in the Stripe dashboard"
      );
    }
  } catch (e: any) {
    warn("Could not list webhook endpoints", e.message);
  }

  // ── App URL ───────────────────────────────────────────────────────────────
  if (appUrl.includes("localhost")) {
    warn("NEXT_PUBLIC_APP_URL points to localhost — webhooks won't work remotely");
  } else if (appUrl.startsWith("https://")) {
    ok(`NEXT_PUBLIC_APP_URL is HTTPS: ${appUrl}`);
  } else if (appUrl) {
    warn(`NEXT_PUBLIC_APP_URL is not HTTPS: ${appUrl}`);
  }

  printSummary();
}

function printSummary() {
  console.log("\n─────────────────────────────────────────────────────────────────");
  for (const r of results) {
    const icon = r.status === "ok" ? "✅" : r.status === "warn" ? "⚠️ " : "❌";
    console.log(`${icon}  ${r.label}${r.detail ? `\n      → ${r.detail}` : ""}`);
  }

  const errors = results.filter((r) => r.status === "error").length;
  const warns  = results.filter((r) => r.status === "warn").length;
  const oks    = results.filter((r) => r.status === "ok").length;

  console.log("\n─────────────────────────────────────────────────────────────────");
  if (errors) {
    console.log(`❌  ${errors} error(s) must be fixed before going live.\n`);
    process.exit(1);
  } else if (warns) {
    console.log(`⚠️   ${oks} OK, ${warns} warning(s). Review before going live.\n`);
  } else {
    console.log(`✅  All ${oks} checks passed — Stripe is ready.\n`);
  }
}

main().catch((e) => {
  console.error("\n💥  Unexpected error:", e.message);
  process.exit(1);
});
