import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptToken } from "@/lib/integrations/crypto";
import { getLeadData } from "@/lib/integrations/facebook-graph";
import { ingestLead } from "@/lib/leads/ingest";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Facebook Lead Ads webhook.
 *
 * GET  → Meta verification handshake (one-time, when you click "Verify and Save").
 * POST → real-time leadgen notifications. Meta sends only a `leadgen_id`; we fetch
 *        the actual field data via the Graph API, then run the shared lead pipeline.
 */

// ── GET: Meta verification handshake ──────────────────────────────
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const mode = p.get("hub.mode");
  const token = p.get("hub.verify_token");
  const challenge = p.get("hub.challenge");

  if (mode === "subscribe" && token && token === process.env.FACEBOOK_VERIFY_TOKEN) {
    // Echo the challenge back verbatim to complete verification
    return new NextResponse(challenge ?? "", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

// ── POST: leadgen notifications ───────────────────────────────────
export async function POST(req: NextRequest) {
  // Flood shield: cap per-IP request rate BEFORE doing any crypto/DB work.
  // Meta's real deliveries stay far below this; it only sheds abuse bursts.
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = rateLimit(`fb-webhook:${ip}`, 300, 60 * 1000);
  if (!rl.ok) {
    return new NextResponse("Too many requests", {
      status: 429,
      headers: { "Retry-After": String(rl.retryAfterSec) },
    });
  }

  const raw = await req.text();

  // 1. Verify the payload really came from Meta (HMAC-SHA256 over the raw body).
  const signature = req.headers.get("x-hub-signature-256") || "";
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  if (!appSecret) {
    console.error("FB webhook: FACEBOOK_APP_SECRET not configured");
    return new NextResponse("Server misconfigured", { status: 500 });
  }
  const expected =
    "sha256=" + crypto.createHmac("sha256", appSecret).update(raw).digest("hex");
  if (!signaturesMatch(signature, expected)) {
    console.error("FB webhook: invalid signature");
    return new NextResponse("Invalid signature", { status: 401 });
  }

  // 2. Parse and process. Always return 200 on a valid signature so Meta
  //    doesn't enter an aggressive retry loop; per-lead errors are logged.
  let body: { object?: string; entry?: FbEntry[] };
  try {
    body = JSON.parse(raw);
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field !== "leadgen") continue;
      // Process sequentially; swallow per-lead errors so one bad lead
      // doesn't abort the whole batch.
      await handleLeadgen(change.value).catch((e) =>
        console.error("FB webhook: leadgen handler error:", e)
      );
    }
  }

  return NextResponse.json({ received: true });
}

// ── Core: process a single leadgen event ──────────────────────────
async function handleLeadgen(v: LeadgenValue) {
  if (!v?.leadgen_id) return;
  const admin = createAdminClient();

  // Idempotency at the event layer — skip if we've seen this leadgen_id.
  const { data: existing } = await admin
    .from("facebook_webhook_events")
    .select("id")
    .eq("leadgen_id", v.leadgen_id)
    .maybeSingle();
  if (existing) return;

  await admin.from("facebook_webhook_events").insert({
    leadgen_id: v.leadgen_id,
    page_id: v.page_id,
    form_id: v.form_id,
    raw_payload: v,
    status: "QUEUED",
  });

  // Resolve the tenant + Page token from page_id.
  const { data: conn } = await admin
    .from("facebook_connections")
    .select("company_id, page_access_token_enc")
    .eq("page_id", v.page_id)
    .eq("status", "ACTIVE")
    .maybeSingle();
  if (!conn) {
    return failEvent(admin, v.leadgen_id, `No active connection for page ${v.page_id}`);
  }

  // Resolve the destination form mapping.
  const { data: form } = await admin
    .from("facebook_lead_forms")
    .select("*")
    .eq("company_id", conn.company_id)
    .eq("form_id", v.form_id)
    .maybeSingle();
  if (!form || !form.is_active) {
    return failEvent(
      admin,
      v.leadgen_id,
      `Form ${v.form_id} is not mapped or inactive — map it in Settings → Integrations`
    );
  }

  // Fetch the actual lead field data from Meta.
  let leadData: FbLeadData;
  try {
    const pageToken = decryptToken(conn.page_access_token_enc);
    leadData = await getLeadData(v.leadgen_id, pageToken);
  } catch (err) {
    return failEvent(
      admin,
      v.leadgen_id,
      `Graph fetch failed: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  // Map Meta's field_data ([{ name, values }]) → name / phone / email.
  const f: Record<string, string> = {};
  for (const fd of leadData.field_data || []) {
    if (fd?.name) f[fd.name] = (fd.values && fd.values[0]) || "";
  }
  const normalized = {
    name:
      f.full_name ||
      [f.first_name, f.last_name].filter(Boolean).join(" ").trim() ||
      null,
    phone: f.phone_number || f.phone || null,
    email: f.email || null,
  };

  // Run the shared pipeline.
  const result = await ingestLead({
    companyId: conn.company_id,
    projectId: form.project_id,
    source: "FACEBOOK_ADS",
    normalized,
    routing: {
      assignmentRule: form.assignment_rule,
      assignedAgentId: form.assigned_agent_id,
      entryStageId: form.entry_stage_id,
      duplicateRule: form.duplicate_rule,
      autoTags: form.auto_tags,
    },
    sourceMeta: {
      platformLeadId: v.leadgen_id,
      platform: "facebook",
      formId: v.form_id,
      campaignName: leadData.campaign_name,
      campaignId: leadData.campaign_id,
      adName: leadData.ad_name,
      rawPayload: leadData,
    },
  });

  // Record the outcome.
  await admin
    .from("facebook_webhook_events")
    .update({
      status: result.leadId ? "SUCCESS" : result.skipped ? "DUPLICATE" : "FAILED",
      lead_id: result.leadId || null,
      error_message: result.error || result.reason || null,
    })
    .eq("leadgen_id", v.leadgen_id);

  if (result.leadId) {
    await admin
      .from("facebook_lead_forms")
      .update({
        last_received_at: new Date().toISOString(),
        total_received: (form.total_received || 0) + 1,
      })
      .eq("id", form.id);
  }
}

// ── Helpers ───────────────────────────────────────────────────────

/** Constant-time signature comparison that won't throw on length mismatch. */
function signaturesMatch(received: string, expected: string): boolean {
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function failEvent(admin: any, leadgenId: string, msg: string) {
  console.error("FB webhook: leadgen failed —", msg);
  await admin
    .from("facebook_webhook_events")
    .update({ status: "FAILED", error_message: msg })
    .eq("leadgen_id", leadgenId);
}

// ── Types ─────────────────────────────────────────────────────────
interface LeadgenValue {
  leadgen_id: string;
  page_id: string;
  form_id: string;
  created_time?: number;
  ad_id?: string;
}
interface FbChange {
  field: string;
  value: LeadgenValue;
}
interface FbEntry {
  id: string;
  time: number;
  changes?: FbChange[];
}
interface FbLeadData {
  id?: string;
  created_time?: string;
  ad_id?: string;
  ad_name?: string;
  campaign_id?: string;
  campaign_name?: string;
  form_id?: string;
  field_data?: Array<{ name: string; values: string[] }>;
}
