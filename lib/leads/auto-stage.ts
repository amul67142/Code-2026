/**
 * Move a lead forward through the pipeline when an agent records a status.
 *
 * A *status* is what happened on a touch ("Contacted", "Follow Up"); a *stage*
 * is where the lead sits in the funnel. Agents fill statuses and never touch
 * the stage, so every lead sat in "New" and the pipeline said nobody was
 * working anything. This keeps the stage honest.
 *
 * Rules:
 *   - Only the latest status (the highest filled slot) counts.
 *   - Forward only: a lead never moves back to an earlier stage.
 *   - Never closes a lead. Booking Done / Not Interested / Lost move nothing,
 *     and a won, terminal or "closed / lost / booking" stage is never a
 *     target — closing stays a deliberate step (a won stage also fires Meta's
 *     Purchase event).
 *   - A lead already in a won or terminal stage is left alone.
 *   - Stages are matched by name per company; when a company has no stage of
 *     that name, the lead goes to the first working stage after the start.
 */

export interface StageRow {
  id: string;
  name: string;
  stage_order: number;
  is_won?: boolean | null;
  is_terminal?: boolean | null;
}

type Target = "CONTACTED" | "SITE_VISIT_SCHEDULED" | "SITE_VISIT_DONE" | "NEGOTIATION";

/** Which stage a status asks for. Statuses not listed move nothing. */
const STATUS_TARGET: Record<string, Target> = {
  contacted: "CONTACTED",
  "follow up": "CONTACTED",
  interested: "CONTACTED",
  "site visit scheduled": "SITE_VISIT_SCHEDULED",
  "site visit done": "SITE_VISIT_DONE",
  negotiation: "NEGOTIATION",
};

/** How each target is recognised in a company's own stage names. */
const STAGE_MATCH: Record<Target, RegExp> = {
  CONTACTED: /^\s*contacted\s*$/i,
  // "Site Visit Scheduled", "Site vist sc", "Booked a Visit / Appt."
  SITE_VISIT_SCHEDULED: /site\s*vis?i?t\s*(sch|sc\b)|booked\s+a\s+visit|\bappt\b/i,
  SITE_VISIT_DONE: /site\s*vis?i?t\s*(done|completed)/i,
  NEGOTIATION: /negotiat/i,
};

/** Stage names that mean the lead is closed, whatever the flags say. */
// "booking" (a sale) but not "Booked a Visit"; "won" as a word, not "down".
const CLOSING_NAME = /lost|\bwon\b|clos|booking|disqualif|junk|dead|reject/i;

function isClosing(s: StageRow): boolean {
  return !!s.is_won || !!s.is_terminal || CLOSING_NAME.test(s.name);
}

/** The latest status a lead has: the highest numbered slot with a value. */
export function latestStatus(statuses: Record<string, string | null | undefined>): string | null {
  for (let slot = 6; slot >= 1; slot--) {
    const v = (statuses[`status_${slot}`] || "").trim();
    if (v) return v;
  }
  return null;
}

/**
 * The stage this lead should move to, or null to leave it where it is.
 * `stages` are the company's pipeline stages in any order.
 */
export function autoStageFor(
  status: string | null | undefined,
  currentStageId: string | null | undefined,
  stages: StageRow[]
): StageRow | null {
  const target = STATUS_TARGET[(status || "").trim().toLowerCase()];
  if (!target || stages.length === 0) return null;

  const ordered = [...stages].sort((a, b) => a.stage_order - b.stage_order);
  const current = ordered.find((s) => s.id === currentStageId) || null;
  if (current && isClosing(current)) return null;

  const working = ordered.filter((s) => !isClosing(s));
  const named = working.find((s) => STAGE_MATCH[target].test(s.name));
  // No stage of that name: the first working stage after the starting one.
  const fallback = working.find((s) => s.stage_order > ordered[0].stage_order) || null;
  const dest = named || fallback;
  if (!dest) return null;

  // Forward only. A lead with no stage counts as being at the start.
  const currentOrder = current ? current.stage_order : ordered[0].stage_order;
  if (dest.stage_order <= currentOrder) return null;
  return dest;
}
