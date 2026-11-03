/**
 * Lead fields that can fill a variable in an agent alert template.
 *
 * Kept free of server imports so the Team settings dialog can use it in the
 * browser. The sender lives in agent-lead-alert.ts.
 *
 * The keys are stored in users.wa_notify_variables, so renaming one is a
 * breaking change — add a new key instead.
 */
export const ALERT_FIELDS = {
  lead_name: "Lead name",
  lead_phone: "Lead number",
  lead_email: "Lead email",
  project: "Project",
  source: "Source",
  stage: "Stage",
  location: "Location preference",
  bhk: "BHK preference",
  budget: "Budget",
  notes: "Enquiry note",
  agent_name: "Agent name",
  company: "Company name",
} as const;

export type AlertField = keyof typeof ALERT_FIELDS;

export function isAlertField(value: unknown): value is AlertField {
  return typeof value === "string" && value in ALERT_FIELDS;
}

/**
 * The order variables are filled in when nobody has chosen otherwise. Name
 * and number come first because they are what an agent needs to start
 * dialling; project next because one agent often covers several.
 */
const DEFAULT_ORDER: AlertField[] = [
  "lead_name",
  "lead_phone",
  "project",
  "source",
  "location",
  "budget",
  "stage",
  "bhk",
  "lead_email",
  "notes",
  "agent_name",
  "company",
];

/** The default mapping for a template with `count` variables. */
export function defaultAlertMapping(count: number): AlertField[] {
  return DEFAULT_ORDER.slice(0, Math.max(0, count));
}

/**
 * Fit a saved mapping to a template's variable count: trim the extras, and
 * fill any gap with the next default field not already used.
 */
export function fitAlertMapping(saved: unknown, count: number): AlertField[] {
  const fields = (Array.isArray(saved) ? saved.filter(isAlertField) : []).slice(0, count);
  for (const f of DEFAULT_ORDER) {
    if (fields.length >= count) break;
    if (!fields.includes(f)) fields.push(f);
  }
  return fields;
}

/** Distinct {{n}} placeholders in a template body. */
export function templateVariableCount(body: string | null | undefined): number {
  const matches = (body || "").match(/\{\{\s*\d+\s*\}\}/g) || [];
  return new Set(matches.map((m) => m.replace(/\D/g, ""))).size;
}

/** The standard agent alert, offered when a company has none yet. */
export const STANDARD_ALERT_TEMPLATE = {
  name: "agent_new_lead_alert",
  language: "en_US",
  category: "UTILITY" as const,
  body:
    "New lead assigned to you.\n\n" +
    "Name: {{1}}\n" +
    "Phone: {{2}}\n" +
    "Project: {{3}}\n\n" +
    "Please call them as soon as possible.",
  samples: ["Raju Patel", "+919876543210", "Trident Hills"],
  mapping: ["lead_name", "lead_phone", "project"] as AlertField[],
};
