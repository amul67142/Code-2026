/**
 * Outbound lead delivery — push a lead from BigLead to another system.
 *
 * Two connection types, one code path:
 *   WEBHOOK — POST the standard lead JSON to a URL (Pabbly, Make, Zapier).
 *   API     — caller-defined method, headers and body template.
 *
 * Every attempt is logged with the response body, because an integration that
 * fails silently is one nobody can fix.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptToken, decryptToken } from "@/lib/integrations/crypto";

export type TriggerType = "AUTO" | "MANUAL" | "TEST";

/** How long we wait on someone else's endpoint before giving up. */
const TIMEOUT_MS = 10_000;
/** Responses are for debugging, not archiving. Keep the useful head. */
const MAX_RESPONSE_CHARS = 4000;

export const ALLOWED_METHODS = ["POST", "GET", "PUT", "PATCH"] as const;

export interface CrmConnection {
  id: string;
  company_id: string;
  name: string;
  type: "WEBHOOK" | "API";
  url: string;
  method: string;
  headers_enc: string | null;
  body_template: string | null;
  project_id: string | null;
  auto_send: boolean;
  is_active: boolean;
  total_sent?: number;
  total_failed?: number;
}

// ── Headers: encrypted at rest, because they carry API keys ────────────────

export function encryptHeaders(headers: Record<string, string>): string | null {
  const clean = Object.fromEntries(
    Object.entries(headers).filter(([k, v]) => k.trim() && v !== undefined)
  );
  if (!Object.keys(clean).length) return null;
  return encryptToken(JSON.stringify(clean));
}

export function decryptHeaders(blob: string | null): Record<string, string> {
  if (!blob) return {};
  try {
    const parsed = JSON.parse(decryptToken(blob));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (e) {
    // A key rotation or a corrupt row must not take the whole page down.
    console.error("decryptHeaders failed:", e);
    return {};
  }
}

// ── URL safety ─────────────────────────────────────────────────────────────

/**
 * Reject URLs that point back inside our own infrastructure.
 *
 * Any customer can type a URL here and the SERVER fetches it, so without this
 * a tenant could aim a connection at cloud metadata or an internal service and
 * read the response straight out of the delivery log.
 *
 * This blocks literal private addresses. It cannot stop a hostname that
 * resolves to one — that would need a resolve-then-pin fetch — so treat it as
 * the first line, not the only one.
 */
export function assertSafeUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("That is not a valid URL.");
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("URL must start with http:// or https://");
  }

  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");

  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host === "::1" ||
    host === "0.0.0.0" ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    /^169\.254\./.test(host) || // link-local, incl. cloud metadata
    /^f[cd][0-9a-f]{2}:/.test(host) || // IPv6 unique-local
    /^fe80:/.test(host) // IPv6 link-local
  ) {
    throw new Error("That address is not reachable from the server.");
  }

  return url;
}

// ── Payload ────────────────────────────────────────────────────────────────

/** The lead shape sent to a WEBHOOK connection, and the vars for a template. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildLeadPayload(lead: Record<string, any>): Record<string, any> {
  const meta = Array.isArray(lead.lead_source_meta)
    ? lead.lead_source_meta[0]
    : lead.lead_source_meta;

  return {
    lead_id: lead.id ?? null,
    name: lead.name ?? null,
    phone: lead.phone ?? null,
    email: lead.email ?? null,
    source: lead.source ?? null,
    project: lead.projects?.name ?? null,
    stage: lead.pipeline_stages?.name ?? null,
    assigned_to: lead.assigned_user?.name ?? null,
    status_1: lead.status_1 ?? null,
    status_1_remark: lead.status_1_remark ?? null,
    status_2: lead.status_2 ?? null,
    status_2_remark: lead.status_2_remark ?? null,
    notes: lead.notes ?? null,
    budget_min: lead.budget_min ?? null,
    budget_max: lead.budget_max ?? null,
    bhk_preference: lead.bhk_preference ?? null,
    property_type: lead.property_type ?? null,
    location_preference: lead.location_preference ?? null,
    campaign_name: meta?.campaign_name ?? null,
    ad_name: meta?.ad_name ?? null,
    created_at: lead.created_at ?? null,
  };
}

/** Every placeholder a body template can use, for the hint list in the UI. */
export const TEMPLATE_VARS = [
  "lead_id",
  "name",
  "phone",
  "email",
  "source",
  "project",
  "stage",
  "assigned_to",
  "status_1",
  "status_1_remark",
  "status_2",
  "status_2_remark",
  "notes",
  "budget_min",
  "budget_max",
  "bhk_preference",
  "property_type",
  "location_preference",
  "campaign_name",
  "ad_name",
  "created_at",
];

/**
 * Substitute double-brace placeholders in a body template.
 *
 * Values are escaped for a JSON string context, so a lead whose name contains
 * a quote — or a remark containing a newline — cannot break the body into
 * invalid JSON. Digits are unaffected by the escaping, so an unquoted
 * numeric placeholder still renders as a real JSON number.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function renderTemplate(template: string, vars: Record<string, any>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (whole, key: string) => {
    if (!(key in vars)) return whole; // leave unknown placeholders visible
    const v = vars[key];
    if (v === null || v === undefined) return "";
    return JSON.stringify(String(v)).slice(1, -1);
  });
}

// ── Delivery ───────────────────────────────────────────────────────────────

export interface DeliveryResult {
  ok: boolean;
  status: number | null;
  responseBody: string | null;
  error: string | null;
  durationMs: number;
  requestBody: string | null;
  requestUrl: string;
}

/** Fire one request. Never throws — failures come back as a result. */
export async function deliver(
  connection: CrmConnection,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: Record<string, any>
): Promise<DeliveryResult> {
  const started = Date.now();
  const method = (connection.method || "POST").toUpperCase();
  let requestUrl = connection.url;
  let requestBody: string | null = null;

  try {
    const url = assertSafeUrl(connection.url);
    const headers = decryptHeaders(connection.headers_enc);

    const useTemplate =
      connection.type === "API" && !!connection.body_template?.trim();

    if (method === "GET") {
      // No body on a GET — the lead fields ride as query parameters instead.
      for (const [k, v] of Object.entries(payload)) {
        if (v !== null && v !== undefined) url.searchParams.set(k, String(v));
      }
    } else {
      requestBody = useTemplate
        ? renderTemplate(connection.body_template as string, payload)
        : JSON.stringify(payload);
      if (!Object.keys(headers).some((h) => h.toLowerCase() === "content-type")) {
        headers["Content-Type"] = "application/json";
      }
    }
    requestUrl = url.toString();

    const res = await fetch(requestUrl, {
      method,
      headers,
      body: method === "GET" ? undefined : (requestBody as string),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      // A 302 could land somewhere assertSafeUrl would have rejected.
      redirect: "manual",
    });

    const text = (await res.text().catch(() => "")).slice(0, MAX_RESPONSE_CHARS);

    return {
      ok: res.ok,
      status: res.status,
      responseBody: text || null,
      error: res.ok ? null : `Endpoint returned ${res.status}`,
      durationMs: Date.now() - started,
      requestBody,
      requestUrl,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    const msg =
      e?.name === "TimeoutError" || e?.name === "AbortError"
        ? `No response within ${TIMEOUT_MS / 1000}s`
        : e?.message || "Request failed";
    return {
      ok: false,
      status: null,
      responseBody: null,
      error: msg,
      durationMs: Date.now() - started,
      requestBody,
      requestUrl,
    };
  }
}

// ── Orchestration ──────────────────────────────────────────────────────────

const LEAD_SELECT = `
  *,
  pipeline_stages ( id, name ),
  projects ( id, name ),
  assigned_user:users!leads_assigned_to_id_fkey ( id, name ),
  lead_source_meta ( campaign_name, ad_name )
`;

/**
 * Send one lead through a set of connections and record every attempt.
 * Used by the new-lead hook (AUTO), the leads table (MANUAL) and Test (TEST).
 */
export async function sendLeadToConnections(opts: {
  companyId: string;
  leadId: string;
  connections: CrmConnection[];
  trigger: TriggerType;
}): Promise<{ sent: number; failed: number }> {
  const { companyId, leadId, connections, trigger } = opts;
  if (!connections.length) return { sent: 0, failed: 0 };

  const admin = createAdminClient();
  const { data: lead } = await admin
    .from("leads")
    .select(LEAD_SELECT)
    .eq("id", leadId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (!lead) return { sent: 0, failed: 0 };

  const payload = buildLeadPayload(lead);
  let sent = 0;
  let failed = 0;

  for (const conn of connections) {
    const result = await deliver(conn, payload);
    if (result.ok) sent++;
    else failed++;

    await admin.from("crm_delivery_logs").insert({
      connection_id: conn.id,
      company_id: companyId,
      lead_id: leadId,
      lead_name: lead.name ?? null,
      trigger_type: trigger,
      request_url: result.requestUrl,
      request_method: (conn.method || "POST").toUpperCase(),
      request_body: result.requestBody,
      response_status: result.status,
      response_body: result.responseBody,
      error_message: result.error,
      duration_ms: result.durationMs,
    });

    // Counters are a convenience for the list view; the logs are the record.
    await admin
      .from("crm_connections")
      .update({
        last_delivery_at: new Date().toISOString(),
        last_status: result.status,
        total_sent: (conn.total_sent ?? 0) + (result.ok ? 1 : 0),
        total_failed: (conn.total_failed ?? 0) + (result.ok ? 0 : 1),
      })
      .eq("id", conn.id);
  }

  return { sent, failed };
}

/**
 * Called for every newly ingested lead.
 *
 * Only connections with auto_send on fire here, and only those whose project
 * filter matches. Swallows everything: a dead CRM endpoint must never stop a
 * lead being saved.
 */
export async function autoSendNewLead(
  companyId: string,
  leadId: string,
  projectId: string | null
): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("crm_connections")
      .select("*")
      .eq("company_id", companyId)
      .eq("auto_send", true)
      .eq("is_active", true);

    if (error) {
      // Most likely migration 025 has not been run yet.
      console.warn("autoSendNewLead: lookup failed:", error.message);
      return;
    }

    const matching = (data || []).filter(
      (c) => !c.project_id || c.project_id === projectId
    );
    if (!matching.length) return;

    await sendLeadToConnections({
      companyId,
      leadId,
      connections: matching as CrmConnection[],
      trigger: "AUTO",
    });
  } catch (e) {
    console.error("autoSendNewLead failed:", e);
  }
}
