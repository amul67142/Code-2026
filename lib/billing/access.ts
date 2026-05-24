/**
 * Checks if a subscription grants active dashboard access.
 * 
 * Rules:
 * - ACTIVE status → always has access
 * - CANCELLED status → has access UNTIL `current_period_end` date passes
 * - Any other status → no access
 */
export function hasActiveAccess(sub: {
  status: string;
  current_period_end?: string | null;
} | null): boolean {
  if (!sub) return false;

  // Active subscription → always granted
  if (sub.status === "ACTIVE") return true;

  // Cancelled subscription → granted until current billing period expires
  if (sub.status === "CANCELLED" && sub.current_period_end) {
    const periodEnd = new Date(sub.current_period_end);
    return periodEnd > new Date();
  }

  return false;
}
