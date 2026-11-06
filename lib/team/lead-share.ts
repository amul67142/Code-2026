/**
 * An agent's lead share: how many leads they get out of each cycle, relative
 * to the rest of the team. A ratio, not a daily limit. Client-safe.
 */
export const MIN_LEAD_SHARE = 1;
export const MAX_LEAD_SHARE = 100;
export const DEFAULT_LEAD_SHARE = 1;

export function validLeadShare(share: number): boolean {
  return Number.isInteger(share) && share >= MIN_LEAD_SHARE && share <= MAX_LEAD_SHARE;
}

/** Roles that receive routed leads. */
export function receivesLeads(role: string): boolean {
  return role === "AGENT" || role === "TEAM_LEAD";
}

/** This share as a whole percentage of the team total. */
export function leadSharePercent(share: number, total: number): number {
  return total > 0 ? Math.round((share / total) * 100) : 0;
}
