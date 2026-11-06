/**
 * The two per-lead status fields and their colours.
 *
 * A *stage* is where the lead sits in the funnel; a *status* is what happened
 * on a touch. Six slots so a rep can record each call outcome without losing
 * the one before it. They open two at a time; anything after the sixth goes in
 * the activity log.
 *
 * Shared by the leads table, the inline editor and the lead detail page —
 * three copies of this list had already started to be a risk.
 */
export const STATUS_OPTIONS = [
  "New",
  "Contacted",
  "Interested",
  "Not Interested",
  "Follow Up",
  "Site Visit Scheduled",
  "Site Visit Done",
  "Negotiation",
  "Booking Done",
  "Lost",
];

export const STATUS_COLORS: Record<string, string> = {
  New: "bg-blue-50 text-blue-700 border-blue-200",
  Contacted: "bg-cyan-50 text-cyan-700 border-cyan-200",
  Interested: "bg-green-50 text-green-700 border-green-200",
  "Not Interested": "bg-red-50 text-red-700 border-red-200",
  "Follow Up": "bg-amber-50 text-amber-700 border-amber-200",
  "Site Visit Scheduled": "bg-purple-50 text-purple-700 border-purple-200",
  "Site Visit Done": "bg-indigo-50 text-indigo-700 border-indigo-200",
  Negotiation: "bg-orange-50 text-orange-700 border-orange-200",
  "Booking Done": "bg-emerald-50 text-emerald-700 border-emerald-200",
  Lost: "bg-gray-50 text-gray-500 border-gray-200",
};

/** Colour classes for a status, falling back to neutral for unknown values. */
export function statusClass(status: string): string {
  return STATUS_COLORS[status] || "bg-gray-50 text-gray-600 border-gray-200";
}

export const STATUS_SLOTS = [1, 2, 3, 4, 5, 6] as const;
export type StatusSlot = (typeof STATUS_SLOTS)[number];
export type StatusField = `status_${StatusSlot}` | `status_${StatusSlot}_remark`;

export const statusKey = (slot: StatusSlot) => `status_${slot}` as const;
export const remarkKey = (slot: StatusSlot) => `status_${slot}_remark` as const;

export const STATUS_FIELDS: StatusField[] = STATUS_SLOTS.flatMap((n) => [statusKey(n), remarkKey(n)]);

export type LeadStatuses = Record<StatusField, string | null>;
export type StatusDraft = Record<StatusField, string>;

/** What the edit form starts from: every field, blank where nothing is saved. */
export function statusDraft(lead: Partial<LeadStatuses>): StatusDraft {
  return Object.fromEntries(STATUS_FIELDS.map((f) => [f, lead[f] || ""])) as StatusDraft;
}

/** The form's values as they will be stored. */
export function savedStatuses(draft: StatusDraft): LeadStatuses {
  return Object.fromEntries(STATUS_FIELDS.map((f) => [f, draft[f].trim() || null])) as LeadStatuses;
}

/**
 * The slots this lead shows, judged on what is SAVED: filling a pair and saving
 * opens the next pair. Anything already saved stays on screen, even if an
 * earlier slot was cleared afterwards.
 */
export function openStatusSlots(lead: Partial<LeadStatuses>): StatusSlot[] {
  let open = 2;
  while (
    open < STATUS_SLOTS.length &&
    lead[statusKey(STATUS_SLOTS[open - 2])] &&
    lead[statusKey(STATUS_SLOTS[open - 1])]
  ) {
    open += 2;
  }
  const used = STATUS_SLOTS.filter((n) => lead[statusKey(n)] || lead[remarkKey(n)]);
  const last = used.length ? used[used.length - 1] : 0;
  return STATUS_SLOTS.slice(0, Math.max(open, last + (last % 2)));
}

export function allStatusesUsed(lead: Partial<LeadStatuses>): boolean {
  return STATUS_SLOTS.every((n) => lead[statusKey(n)]);
}

/** The toast after saving, which also says when a new pair has opened. */
export function statusSavedMessage(before: Partial<LeadStatuses>, after: Partial<LeadStatuses>): string {
  if (allStatusesUsed(after)) return "All 6 statuses used. Add further updates in the activity log.";
  const was = openStatusSlots(before).length;
  const now = openStatusSlots(after).length;
  return now > was ? `Status updated. Status ${now - 1} and ${now} are now open.` : "Status updated";
}
