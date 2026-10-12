/**
 * The two per-lead status fields and their colours.
 *
 * A *stage* is where the lead sits in the funnel; a *status* is what happened
 * on the last touch. Two slots so a rep can record a call outcome without
 * losing the one before it.
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
