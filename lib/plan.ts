import { isStripeConfigured } from "@/lib/stripe";

export type PlanKey = "free" | "pro" | "team" | "business";

export type PlanLimits = {
  teams: boolean;     // can create/use organizations with staff
  maxStaff: number;   // total members allowed in an org (incl. owner)
  sms: boolean;       // SMS reminders / notifications
};

export const PLAN_LIMITS: Record<PlanKey, PlanLimits> = {
  free:     { teams: false, maxStaff: 1,        sms: false },
  pro:      { teams: false, maxStaff: 1,        sms: true  },
  team:     { teams: true,  maxStaff: 10,       sms: true  },
  business: { teams: true,  maxStaff: Infinity, sms: true  },
};

/**
 * If billing isn't configured (no Stripe env), the instance runs unrestricted
 * (treated as "business"). Enforcement only kicks in once you actually set up
 * Stripe — so a self-hosted / pre-billing deployment stays fully functional.
 */
export function effectivePlan(plan: string | null | undefined): PlanKey {
  if (!isStripeConfigured()) return "business";
  const p = (plan ?? "free") as PlanKey;
  return PLAN_LIMITS[p] ? p : "free";
}

export function limitsFor(plan: string | null | undefined): PlanLimits {
  return PLAN_LIMITS[effectivePlan(plan)];
}
