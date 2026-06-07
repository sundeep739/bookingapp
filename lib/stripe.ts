import Stripe from "stripe";

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

export const isStripeConfigured = () => !!process.env.STRIPE_SECRET_KEY;

// Map our plan keys to Stripe Price IDs (set these in env once you create the
// products/prices in the Stripe dashboard).
export const PLAN_PRICE: Record<string, string | undefined> = {
  pro: process.env.STRIPE_PRICE_PRO,
  team: process.env.STRIPE_PRICE_TEAM,
  business: process.env.STRIPE_PRICE_BUSINESS,
};

// Reverse lookup: given a Stripe price id, return our plan key.
export function planFromPriceId(priceId: string | null | undefined): string {
  if (!priceId) return "free";
  if (priceId === process.env.STRIPE_PRICE_PRO) return "pro";
  if (priceId === process.env.STRIPE_PRICE_TEAM) return "team";
  if (priceId === process.env.STRIPE_PRICE_BUSINESS) return "business";
  return "free";
}

export const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  pro: "Pro",
  team: "Team",
  business: "Business",
};
