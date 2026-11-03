"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCachedUserProfile as getUserProfile } from "@/lib/auth/cached-user";
import { hasMinRole } from "@/lib/permissions";
import { UserRole } from "@/types";
import {
  ALLOWED_METHODS,
  assertSafeUrl,
  buildLeadPayload,
  decryptHeaders,
  deliver,
  encryptHeaders,
  renderTemplate,
  sendLeadToConnections,
  type CrmConnection,
} from "@/lib/crm/outbound";

/** Connections hold API credentials, so configuring them is an admin job. */
async function requireAdmin() {
  const profile = await getUserProfile();
  if (!profile) return { error: "Unauthorized" as const };
  if (!hasMinRole(profile.role as UserRole, UserRole.ADMIN)) {
    return { error: "Only admins can manage connections" as const };
  }
  return { profile };
}

export interface ConnectionInput {
  id?: string;
  name: string;
  type: "WEBHOOK" | "API";
  url: string;
  method: string;
  headers: Record<string, string>;
  bodyTemplate: string;
  projectId: string | null;
  autoSend: boolean;
  isActive: boolean;
}

function validate(input: ConnectionInput): string | null {
  if (!input.name?.trim()) return "Give the connection a name.";
  try {
    assertSafeUrl(input.url);
  } catch (e) {
    return (e as Error).message;
  }
  const method = (input.method || "POST").toUpperCase();
  if (input.type === "API" && !ALLOWED_METHODS.includes(method as never)) {
    return `Method must be one of ${ALLOWED_METHODS.join(", ")}.`;
  }
  // A body that is meant to be JSON but is not parseable would fail on every
  // single lead. Catch it here, once, instead of in the delivery log forever.
  const tpl = input.bodyTemplate?.trim();
  if (input.type === "API" && tpl && method !== "GET") {
    const looksJson = tpl.startsWith("{") || tpl.startsWith("[");
    if (looksJson) {
      const rendered = renderTemplate(tpl, sampleVars());
      try {
        JSON.parse(rendered);
      } catch {
        return "The body does not parse as JSON once the placeholders are filled in.";
      }
    }
  }
  return null;
}

/** Stand-in values used to prove a body template renders to valid JSON. */
function sampleVars(): Record<string, string | number> {
  return {
    lead_id: "00000000-0000-0000-0000-000000000000",
    name: "Sample Lead",
    phone: "9999999999",
    email: "sample@example.com",
    source: "OTHER",
    project: "Sample Project",
    stage: "New",
    assigned_to: "Unassigned",
    status_1: "Contacted",
    status_1_remark: "Sample remark",
    status_2: "",
    status_2_remark: "",
    notes: "Sample notes",
    budget_min: 1000000,
    budget_max: 5000000,
    bhk_preference: "3BHK",
    property_type: "Apartment",
    location_preference: "Sample City",
    campaign_name: "Sample Campaign",
    ad_name: "Sample Ad",
    created_at: new Date().toISOString(),
  };
}

// ── Read ───────────────────────────────────────────────────────────────────

export async function getConnections() {
  const profile = await getUserProfile();
  if (!profile) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crm_connections")
    .select("*")
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: false });

  if (error) {
    // Migration 025 not run yet — show an empty page rather than a crash.
    console.warn("getConnections failed:", error.message);
    return [];
  }

  // Header values are credentials. Send back only the names, plus a masked
  // tail so you can tell one key from another without exposing either.
  return (data || []).map((c) => {
    const headers = decryptHeaders(c.headers_enc);
    return {
      ...c,
      headers_enc: undefined,
      header_preview: Object.entries(headers).map(([k, v]) => ({
        key: k,
        masked: v.length > 4 ? `••••${v.slice(-4)}` : "••••",
      })),
    };
  });
}

/** The real header values, for populating the edit form. Admins only. */
export async function getConnectionSecrets(id: string) {
  const guard = await requireAdmin();
  if ("error" in guard) return { error: guard.error };

  const supabase = await createClient();
  const { data } = await supabase
    .from("crm_connections")
    .select("headers_enc")
    .eq("id", id)
    .eq("company_id", guard.profile.company_id)
    .maybeSingle();

  return { headers: decryptHeaders(data?.headers_enc ?? null) };
}

export async function getDeliveryLogs(connectionId?: string, limit = 50) {
  const profile = await getUserProfile();
  if (!profile) return [];

  const supabase = await createClient();
  let query = supabase
    .from("crm_delivery_logs")
    .select("*")
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (connectionId) query = query.eq("connection_id", connectionId);

  const { data, error } = await query;
  if (error) {
    console.warn("getDeliveryLogs failed:", error.message);
    return [];
  }
  return data || [];
}

// ── Write ──────────────────────────────────────────────────────────────────

export async function saveConnection(input: ConnectionInput) {
  const guard = await requireAdmin();
  if ("error" in guard) return { error: guard.error };

  const problem = validate(input);
  if (problem) return { error: problem };

  const supabase = await createClient();
  const row = {
    company_id: guard.profile.company_id,
    name: input.name.trim(),
    type: input.type,
    url: input.url.trim(),
    // A webhook is a POST by definition; only the API type chooses.
    method: input.type === "WEBHOOK" ? "POST" : input.method.toUpperCase(),
    headers_enc: input.type === "WEBHOOK" ? null : encryptHeaders(input.headers),
    body_template: input.type === "WEBHOOK" ? null : input.bodyTemplate?.trim() || null,
    project_id: input.projectId || null,
    auto_send: input.autoSend,
    is_active: input.isActive,
  };

  if (input.id) {
    const { error } = await supabase
      .from("crm_connections")
      .update(row)
      .eq("id", input.id)
      .eq("company_id", guard.profile.company_id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("crm_connections").insert(row);
    if (error) return { error: error.message };
  }

  revalidatePath("/settings/connections");
  return { success: true };
}

export async function toggleAutoSend(id: string, autoSend: boolean) {
  const guard = await requireAdmin();
  if ("error" in guard) return { error: guard.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from("crm_connections")
    .update({ auto_send: autoSend })
    .eq("id", id)
    .eq("company_id", guard.profile.company_id);

  if (error) return { error: error.message };
  revalidatePath("/settings/connections");
  return { success: true };
}

export async function deleteConnection(id: string) {
  const guard = await requireAdmin();
  if ("error" in guard) return { error: guard.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from("crm_connections")
    .delete()
    .eq("id", id)
    .eq("company_id", guard.profile.company_id);

  if (error) return { error: error.message };
  revalidatePath("/settings/connections");
  return { success: true };
}

// ── Test ───────────────────────────────────────────────────────────────────

/**
 * Fire the connection at the endpoint with sample data and hand back exactly
 * what came out the other side — status, body and all. Nothing is saved to
 * the connection, but the attempt IS logged, so a test and a real delivery
 * sit in the same history.
 */
export async function testConnection(input: ConnectionInput) {
  const guard = await requireAdmin();
  if ("error" in guard) return { error: guard.error };

  const problem = validate(input);
  if (problem) return { error: problem };

  const conn: CrmConnection = {
    id: input.id || "test",
    company_id: guard.profile.company_id,
    name: input.name,
    type: input.type,
    url: input.url.trim(),
    method: input.type === "WEBHOOK" ? "POST" : input.method.toUpperCase(),
    headers_enc: input.type === "WEBHOOK" ? null : encryptHeaders(input.headers),
    body_template: input.type === "WEBHOOK" ? null : input.bodyTemplate?.trim() || null,
    project_id: input.projectId,
    auto_send: input.autoSend,
    is_active: input.isActive,
  };

  // Prefer a real lead so the test proves the actual field mapping; fall back
  // to samples when the company has no leads yet.
  const supabase = await createClient();
  const { data: lead } = await supabase
    .from("leads")
    .select(
      `*, pipeline_stages ( id, name ), projects ( id, name ),
       assigned_user:users!leads_assigned_to_id_fkey ( id, name ),
       lead_source_meta ( campaign_name, ad_name )`
    )
    .eq("company_id", guard.profile.company_id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const payload = lead ? buildLeadPayload(lead) : sampleVars();
  const result = await deliver(conn, payload);

  if (input.id) {
    await supabase.from("crm_delivery_logs").insert({
      connection_id: input.id,
      company_id: guard.profile.company_id,
      lead_id: lead?.id ?? null,
      lead_name: lead?.name ?? "Sample Lead",
      trigger_type: "TEST",
      request_url: result.requestUrl,
      request_method: conn.method,
      request_body: result.requestBody,
      response_status: result.status,
      response_body: result.responseBody,
      error_message: result.error,
      duration_ms: result.durationMs,
    });
    revalidatePath("/settings/connections");
  }

  return {
    result: {
      ok: result.ok,
      status: result.status,
      responseBody: result.responseBody,
      error: result.error,
      durationMs: result.durationMs,
      requestBody: result.requestBody,
      requestUrl: result.requestUrl,
      usedRealLead: !!lead,
    },
  };
}

// ── Manual send, from the leads table ──────────────────────────────────────

/**
 * Push chosen leads to every active connection, regardless of its auto-send
 * switch. This is the "off" half of the toggle: nothing moves until someone
 * decides it should.
 */
export async function sendLeadsToCrm(leadIds: string[]) {
  const profile = await getUserProfile();
  if (!profile) return { error: "Unauthorized" };
  if (!leadIds.length) return { error: "No leads selected" };
  if (leadIds.length > 100) return { error: "Send at most 100 leads at a time" };

  const supabase = await createClient();
  const { data: connections, error } = await supabase
    .from("crm_connections")
    .select("*")
    .eq("company_id", profile.company_id)
    .eq("is_active", true);

  if (error) return { error: "Could not load connections" };
  if (!connections?.length) {
    return { error: "No active connection. Add one in Settings → Connections." };
  }

  let sent = 0;
  let failed = 0;
  for (const leadId of leadIds) {
    const res = await sendLeadToConnections({
      companyId: profile.company_id,
      leadId,
      connections: connections as CrmConnection[],
      trigger: "MANUAL",
    });
    sent += res.sent;
    failed += res.failed;
  }

  revalidatePath("/settings/connections");
  return { sent, failed, connections: connections.length };
}

// ── Catching up: leads that never reached a connection ─────────────────────
//
// A connection added after leads were already in the pipeline, or one that sat
// on "Manual only" for a while, leaves a backlog. These two actions find the
// leads with no successful delivery and send them.
//
// "Successful" means a crm_delivery_logs row for that connection with a 2xx
// response, matching what deliver() counts as ok. A lead that was attempted
// and failed is still undelivered, so it gets retried here.

/** Ceiling on a single scan. Beyond this the count reports as capped. */
const MAX_SCAN = 20_000;
/**
 * Leads per send call. Deliveries run one at a time with a 10s timeout each,
 * so a large batch would hit the serverless execution limit mid-run and lose
 * track of what had been sent. The caller loops until `remaining` is 0.
 */
const SEND_BATCH = 25;

/** Every id from a paged id-only select, up to MAX_SCAN. */
async function collectIds(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  build: (from: number, to: number) => any,
  column: string
): Promise<string[]> {
  const ids: string[] = [];
  const PAGE = 1000;
  for (let from = 0; from < MAX_SCAN; from += PAGE) {
    const { data, error } = await build(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const rows = (data || []) as Record<string, string>[];
    for (const r of rows) if (r[column]) ids.push(r[column]);
    if (rows.length < PAGE) break;
  }
  return ids;
}

async function undeliveredLeadIds(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  companyId: string,
  conn: CrmConnection
): Promise<string[]> {
  // Leads in this connection's scope. A connection with no project takes the
  // whole company; one scoped to a project takes only that project's leads.
  // Oldest first, so a capped scan clears the longest-waiting leads.
  const leadIds = await collectIds((from, to) => {
    let q = supabase
      .from("leads")
      .select("id")
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true })
      .range(from, to);
    if (conn.project_id) q = q.eq("project_id", conn.project_id);
    return q;
  }, "id");

  const delivered = new Set(
    await collectIds(
      (from, to) =>
        supabase
          .from("crm_delivery_logs")
          .select("lead_id")
          .eq("company_id", companyId)
          .eq("connection_id", conn.id)
          .gte("response_status", 200)
          .lt("response_status", 300)
          .range(from, to),
      "lead_id"
    )
  );

  return leadIds.filter((id) => !delivered.has(id));
}

/** Per active connection: how many leads in its scope have never landed. */
export async function getUndeliveredSummary() {
  const guard = await requireAdmin();
  if ("error" in guard) return { error: guard.error };

  const supabase = await createClient();
  const { data: connections, error } = await supabase
    .from("crm_connections")
    .select("*")
    .eq("company_id", guard.profile.company_id)
    .eq("is_active", true);

  // Migration 025 not run yet, most likely — nothing to report.
  if (error) return { connections: [] };

  const summary: {
    connectionId: string;
    name: string;
    count: number;
    capped: boolean;
  }[] = [];

  for (const conn of (connections || []) as CrmConnection[]) {
    try {
      const ids = await undeliveredLeadIds(supabase, guard.profile.company_id, conn);
      summary.push({
        connectionId: conn.id,
        name: conn.name,
        count: ids.length,
        capped: ids.length >= MAX_SCAN,
      });
    } catch (e) {
      console.error(`getUndeliveredSummary: ${conn.name} failed:`, e);
    }
  }
  return { connections: summary };
}

/**
 * Send the next batch of undelivered leads to one connection.
 *
 * Recomputes the backlog every call, so a lead delivered by the previous batch
 * is gone from the next one and nothing is sent twice. Returns `remaining` so
 * the caller can keep going until it reaches 0.
 */
export async function sendUndeliveredLeads(connectionId: string) {
  const guard = await requireAdmin();
  if ("error" in guard) return { error: guard.error };

  const supabase = await createClient();
  const { data: conn, error } = await supabase
    .from("crm_connections")
    .select("*")
    .eq("id", connectionId)
    .eq("company_id", guard.profile.company_id)
    .maybeSingle();

  if (error || !conn) return { error: "Connection not found" };
  if (!conn.is_active) return { error: "That connection is switched off" };

  let pending: string[];
  try {
    pending = await undeliveredLeadIds(
      supabase,
      guard.profile.company_id,
      conn as CrmConnection
    );
  } catch (e) {
    console.error("sendUndeliveredLeads: scan failed:", e);
    return { error: "Could not work out which leads are outstanding" };
  }

  if (!pending.length) return { sent: 0, failed: 0, remaining: 0, done: true };

  const batch = pending.slice(0, SEND_BATCH);
  let sent = 0;
  let failed = 0;
  for (const leadId of batch) {
    const res = await sendLeadToConnections({
      companyId: guard.profile.company_id,
      leadId,
      connections: [conn as CrmConnection],
      trigger: "MANUAL",
    });
    sent += res.sent;
    failed += res.failed;
  }

  // Anything that failed is still outstanding and will come back on the next
  // scan, so report what is left rather than assuming the batch cleared.
  const remaining = Math.max(pending.length - sent, 0);
  revalidatePath("/settings/connections");
  return { sent, failed, remaining, done: remaining === 0 };
}
