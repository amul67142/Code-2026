/**
 * Checks if a subscription grants active dashboard access.
 *
 * Rules:
 * - TRIALING with `trial_ends_at` → granted until the trial ends. No grace:
 *             the reminder has already told them the date.
 * - TRIALING without it → a checkout still waiting for payment. No access, as
 *             before; only Start free trial sets `trial_ends_at`.
 * - ACTIVE  → granted only while `current_period_end` hasn't passed
 *             (+3-day grace for Razorpay webhook delays). An ACTIVE row whose
 *             period ended long ago is EXPIRED → dashboard locks until payment
 *             or a promo code. (Legacy rows with no period end stay granted.)
 * - CANCELLED → granted until `current_period_end` passes (no grace).
 * - Anything else → no access.
 *
 * The platform company (SpaceTrans) never reaches this — callers check
 * companies.is_platform first.
 */
const GRACE_MS = 3 * 24 * 60 * 60 * 1000;

export interface AccessSubscription {
  status: string;
  current_period_end?: string | null;
  trial_ends_at?: string | null;
}

export function hasActiveAccess(sub: AccessSubscription | null): boolean {
  if (!sub) return false;

  if (sub.status === "TRIALING") {
    return !!sub.trial_ends_at && new Date(sub.trial_ends_at).getTime() > Date.now();
  }

  if (sub.status === "ACTIVE") {
    if (!sub.current_period_end) return true; // legacy rows without a period end
    return new Date(sub.current_period_end).getTime() + GRACE_MS > Date.now();
  }

  if (sub.status === "CANCELLED" && sub.current_period_end) {
    return new Date(sub.current_period_end) > new Date();
  }

  return false;
}

/** On a free trial that has not ended. */
export function isOnTrial(sub: AccessSubscription | null): boolean {
  return (
    sub?.status === "TRIALING" &&
    !!sub.trial_ends_at &&
    new Date(sub.trial_ends_at).getTime() > Date.now()
  );
}

/** Had a trial, it ran out, and nothing was paid. */
export function trialEnded(sub: AccessSubscription | null): boolean {
  return (
    sub?.status === "TRIALING" &&
    !!sub.trial_ends_at &&
    new Date(sub.trial_ends_at).getTime() <= Date.now()
  );
}

/** True when the subscription exists but its paid period has lapsed. */
export function isExpired(sub: AccessSubscription | null): boolean {
  if (!sub) return false;
  return !hasActiveAccess(sub);
}
