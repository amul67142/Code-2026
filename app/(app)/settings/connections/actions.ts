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
