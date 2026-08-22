import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ingestLead, type IngestSource } from "@/lib/leads/ingest";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Generic inbound lead webhook.
 *
 *   POST /api/webhooks/inbound/{companyId}/{projectId}/{token}
 *   Authorization: Bearer <secret key>
 *   Content-Type: application/json  (or form-encoded — see below)
 *
 * Accepts any JSON shape and maps common field names (WordPress/CF7/Elementor/
 * Gravity Forms/Zapier all name things differently). Runs the SHARED lead
 * pipeline so a website lead behaves exactly like a Facebook lead: dedupe →
 * assign → notify → welcome email + WhatsApp → AI agent.
 */

export const maxDuration = 60; // welcome sends run inline

// ── Field mapping ────────────────────────────────────────────────
// Case/format-insensitive lookup: "Full Name", "full_name", "your-name" all match.
function pick(body: Record<string, unknown>, names: string[]): string | null {
  const norm = (s: string) => s.toLowerCase().replace(/[\s_\-.]/g, "");
  const index = new Map<string, unknown>();
  for (const [k, v] of Object.entries(body)) index.set(norm(k), v);
  for (const n of names) {
    const v = index.get(norm(n));
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
  }
  return null;
}

function toNumber(raw: string | null): number | null {
  if (!raw) return null;
  // "₹1.2 Cr" / "50 lakh" / "5000000" / "50,00,000"
  const cleaned = raw.replace(/[,₹\s]/g, "").toLowerCase();
  const n = parseFloat(cleaned);
  if (isNaN(n)) return null;
  if (/cr|crore/.test(cleaned)) return Math.round(n * 10_000_000);
  if (/l|lakh|lac/.test(cleaned)) return Math.round(n * 100_000);
  return Math.round(n);
}

function normalizeLeadPayload(body: Record<string, unknown>) {
  const first = pick(body, ["firstName", "first_name", "fname"]);
  const last = pick(body, ["lastName", "last_name", "lname"]);
  const name =
    pick(body, ["name", "full_name", "fullName", "lead_name", "contact_name", "your-name", "yourName"]) ||
    (first && last ? `${first} ${last}` : first) ||
    null;

  return {
    name,
    phone: pick(body, [
      "phone", "phone_number", "phoneNumber", "mobile", "mobile_number",
      "contact", "contact_number", "tel", "telephone", "your-phone", "whatsapp",
    ]),
    email: pick(body, ["email", "email_address", "emailAddress", "your-email", "mail"]),
  };
}

function calculateScore(body: Record<string, unknown>, hasEmail: boolean, budgetMax: number | null) {
  let score = 50;
  const timeline = (pick(body, ["timeline", "when", "purchase_timeline"]) || "").toUpperCase();
  if (timeline.includes("IMMEDIATE") || timeline.includes("URGENT")) score += 20;
  if (budgetMax && budgetMax > 8_000_000) score += 15;
  if (hasEmail) score += 10;
  if (pick(body, ["alternate_phone", "alt_phone"])) score += 5;
  return Math.min(Math.max(score, 0), 100);
}

/** webhooks.source_label → the lead_source enum ingestLead expects. */
function resolveSource(label: string | null): IngestSource {
  const l = (label || "").toUpperCase();
  if (l.includes("FACEBOOK")) return "FACEBOOK_ADS";
  if (l.includes("GOOGLE")) return "GOOGLE_ADS";
  if (l.includes("WEBSITE") || l.includes("FORM") || l.includes("WORDPRESS")) return "WEBSITE_FORM";
  return "OTHER";
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string; projectId: string; token: string }> }
) {
  const { companyId, projectId, token } = await params;
  const startTime = Date.now();
  let webhookId: string | null = null;
  let rawBody: Record<string, unknown> = {};

  const admin = createAdminClient();

  try {
    // Flood shield per IP.
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rl = rateLimit(`inbound-webhook:${ip}`, 120, 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
      );
    }

    // 1. Parse body — JSON, or form-encoded (many WordPress plugins post forms).
    const contentType = request.headers.get("content-type") || "";
    try {
      if (contentType.includes("application/json")) {
        rawBody = await request.json();
      } else if (
        contentType.includes("application/x-www-form-urlencoded") ||
        contentType.includes("multipart/form-data")
      ) {
        rawBody = Object.fromEntries(await request.formData());
      } else {
        // Unknown type — try JSON, fall back to form data.
        const text = await request.text();
        try {
          rawBody = JSON.parse(text);
        } catch {
          rawBody = Object.fromEntries(new URLSearchParams(text));
        }
      }
    } catch {
      return NextResponse.json({ error: "Could not parse request body" }, { status: 400 });
    }
    if (!rawBody || typeof rawBody !== "object") {
      return NextResponse.json({ error: "Body must be an object" }, { status: 400 });
    }

    // 2. Secret key — Authorization: Bearer, or ?key= for plugins that can't
    //    set headers (still secret, but prefer the header where possible).
    const authHeader = request.headers.get("authorization") || "";
    const secretKey = authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7).trim()
      : request.nextUrl.searchParams.get("key")?.trim() || "";
    if (!secretKey) {
      return NextResponse.json(
        { error: "Missing secret key. Send header: Authorization: Bearer <secret>" },
        { status: 401 }
      );
    }

    // 3. Look up the webhook config.
    const { data: webhook } = await admin
      .from("webhooks")
      .select("*")
      .eq("company_id", companyId)
      .eq("project_id", projectId)
      .eq("token", token)
      .eq("secret_key_hash", secretKey)
      .maybeSingle();

    if (!webhook) {
      return NextResponse.json({ error: "Unauthorized or invalid webhook" }, { status: 401 });
    }
    webhookId = webhook.id;

    if (webhook.status !== "ACTIVE") {
      await logWebhook(webhookId!, rawBody, "FAILED", null, "Webhook is inactive", startTime);
      return NextResponse.json({ error: "Webhook is inactive" }, { status: 403 });
    }

    // 4. Normalize.
    const normalized = normalizeLeadPayload(rawBody);
    if (!normalized.name && !normalized.phone && !normalized.email) {
      const msg =
        "No contact fields found. Send at least one of: name, phone, email (aliases accepted).";
      await logWebhook(webhookId!, rawBody, "FAILED", null, msg, startTime);
      return NextResponse.json({ error: msg, received_fields: Object.keys(rawBody) }, { status: 422 });
    }

    const budgetMin = toNumber(pick(rawBody, ["budget_min", "budgetMin", "min_budget"]));
    const budgetMax = toNumber(
      pick(rawBody, ["budget_max", "budgetMax", "max_budget", "budget"])
    );

    // 5. Shared pipeline — dedupe, assign, notify, welcome email + WhatsApp,
    //    which is what hands the lead to the AI agent.
    const result = await ingestLead({
      companyId,
      projectId,
      source: resolveSource(webhook.source_label),
      normalized,
      routing: {
        assignmentRule: webhook.assignment_rule,
        assignedAgentId: webhook.assigned_agent_id,
        entryStageId: webhook.entry_stage_id,
        duplicateRule: webhook.duplicate_rule,
        autoTags: webhook.auto_tags,
      },
      extra: {
        bhkPreference: pick(rawBody, ["bhk", "bhk_preference", "configuration", "unit_type"]),
        propertyType: pick(rawBody, ["property_type", "propertyType"]),
        locationPreference: pick(rawBody, ["location", "location_preference", "city", "area"]),
        budgetMin,
        budgetMax,
        notes: pick(rawBody, ["message", "notes", "comments", "requirement", "your-message"]),
      },
      sourceMeta: {
        platform: webhook.source_label || "webhook",
        formId: pick(rawBody, ["form_id", "formId", "form_name"]) || undefined,
        campaignName: pick(rawBody, ["campaign", "campaign_name", "utm_campaign"]) || undefined,
        rawPayload: rawBody,
      },
      score: calculateScore(rawBody, !!normalized.email, budgetMax),
    });

    if (result.error) {
      await logWebhook(webhookId!, rawBody, "FAILED", null, result.error, startTime);
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    if (result.skipped) {
      await logWebhook(webhookId!, rawBody, "FAILED", result.leadId ?? null, result.reason ?? "Skipped", startTime);
      return NextResponse.json({ success: true, skipped: true, message: result.reason }, { status: 200 });
    }

    // 6. Stats + log.
    await admin
      .from("webhooks")
      .update({ last_received_at: new Date().toISOString() })
      .eq("id", webhookId);
    await admin.rpc("increment_webhook_total", { webhook_id: webhookId }).then(
      () => {},
      (e) => console.warn("increment_webhook_total failed:", e?.message)
    );
    await logWebhook(webhookId!, rawBody, "SUCCESS", result.leadId ?? null, null, startTime);

    return NextResponse.json({
      success: true,
      lead_id: result.leadId,
      message: "Lead created successfully",
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("Inbound webhook error:", error);
    if (webhookId) {
      await logWebhook(webhookId, rawBody, "FAILED", null, `Unhandled exception: ${msg}`, startTime);
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** Simple reachability check — lets you confirm the URL in a browser. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    message:
      "BigLead inbound lead webhook. POST JSON with an Authorization: Bearer <secret> header.",
    expected_fields: ["name", "phone", "email", "(optional) budget, bhk, location, message"],
  });
}

async function logWebhook(
  webhookId: string,
  payload: unknown,
  status: "SUCCESS" | "FAILED" | "QUEUED",
  leadId: string | null,
  errorMessage: string | null,
  startTime: number
) {
  try {
    const admin = createAdminClient();
    await admin.from("webhook_logs").insert({
      webhook_id: webhookId,
      payload_json: payload,
      status,
      lead_created_id: leadId,
      error_message: errorMessage,
      processing_ms: Date.now() - startTime,
    });
  } catch (e) {
    console.error("webhook_logs insert failed:", e);
  }
}
