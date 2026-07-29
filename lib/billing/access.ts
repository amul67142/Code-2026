/**
 * Checks if a subscription grants active dashboard access.
 *
 * Rules:
 * - ACTIVE  → granted only while `current_period_end` hasn't passed
 *             (+3-day grace for Razorpay webhook delays). An ACTIVE row whose
 *             period ended long ago is EXPIRED → dashboard locks until payment
 *             or a promo code. (Legacy rows with no period end stay granted.)
 * - CANCELLED → granted until `current_period_end` passes (no grace).
 * - Anything else → no access.
 */
const GRACE_MS = 3 * 24 * 60 * 60 * 1000;

export function hasActiveAccess(sub: {
  status: string;
  current_period_end?: string | null;
} | null): boolean {
  if (!sub) return false;

  if (sub.status === "ACTIVE") {
    if (!sub.current_period_end) return true; // legacy rows without a period end
    return new Date(sub.current_period_end).getTime() + GRACE_MS > Date.now();
  }

  if (sub.status === "CANCELLED" && sub.current_period_end) {
    return new Date(sub.current_period_end) > new Date();
  }

  return false;
}

/** True when the subscription exists but its paid period has lapsed. */
export function isExpired(sub: {
  status: string;
  current_period_end?: string | null;
} | null): boolean {
  if (!sub) return false;
  return !hasActiveAccess(sub);
}
