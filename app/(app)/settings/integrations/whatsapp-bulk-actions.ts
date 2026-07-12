"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCachedUserProfile } from "@/lib/auth/cached-user";
import { decryptToken } from "@/lib/integrations/crypto";
import {
  sendWhatsAppTemplate,
  normalizeWhatsAppNumber,
  uploadMetaTemplateMedia,
} from "@/lib/integrations/whatsapp";

function isAdmin(role?: string) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

// ── Limits for manual bulk WhatsApp (anti-spam / WABA protection) ─
const MAX_PER_BATCH = 30; // per selection
const MAX_PER_DAY = 60;   // per company per day (manual sends)

// ── Full message log (which number sent / failed / replied) ─────
export async function getWhatsAppMessageLog(filter?: "SENT" | "FAILED" | "INBOUND") {
  const profile = await getCachedUserProfile();
  if (!profile?.company_id) return { rows: [] };

  const admin = createAdminClient();
  let q = admin
    .from("message_log")
    .select("id, direction, to_address, subject, status, error_message, is_auto, created_at, leads(id, name)")
    .eq("company_id", profile.company_id)
    .eq("channel", "WHATSAPP")
    .order("created_at", { ascending: false })
    .limit(200);

  if (filter === "SENT") q = q.eq("direction", "OUTBOUND").eq("status", "SENT");
  if (filter === "FAILED") q = q.eq("direction", "OUTBOUND").eq("status", "FAILED");
  if (filter === "INBOUND") q = q.eq("direction", "INBOUND");

  const { data } = await q;
  return { rows: data || [] };
}

// ── Bulk delete leads (soft delete) ─────────────────────────────
export async function bulkDeleteLeads(leadIds: string[]) {
  const profile = await getCachedUserProfile();
  if (!profile?.company_id) return { error: "Unauthorized" };
  if (!isAdmin(profile.role)) return { error: "Admin access required" };
  if (!leadIds?.length) return { error: "No leads selected" };
  if (leadIds.length > 500) return { error: "Maximum 500 leads at a time" };

  const admin = createAdminClient();
  const { error, count } = await admin
    .from("leads")
    .update({ deleted_at: new Date().toISOString() }, { count: "exact" })
    .in("id", leadIds)
    .eq("company_id", profile.company_id)
    .is("deleted_at", null);

  if (error) {
    console.error("bulkDeleteLeads error:", error);
    return { error: "Failed to delete leads" };
  }

  revalidatePath("/leads");
  revalidatePath("/leads/kanban");
  return { success: true, deleted: count || 0 };
}

// ── Manual bulk WhatsApp send (rate-limited) ────────────────────
export async function sendBulkWhatsApp(leadIds: string[]) {
  const profile = await getCachedUserProfile();
  if (!profile?.company_id) return { error: "Unauthorized" };
  if (!isAdmin(profile.role)) return { error: "Admin access required" };
  if (!leadIds?.length) return { error: "No leads selected" };
  if (leadIds.length > MAX_PER_BATCH) {
    return { error: `You can send to at most ${MAX_PER_BATCH} leads per batch.` };
  }

  const admin = createAdminClient();

  // Daily quota: manual outbound WhatsApp sends today.
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const { count: usedToday } = await admin
    .from("message_log")
    .select("id", { count: "exact", head: true })
    .eq("company_id", profile.company_id)
    .eq("channel", "WHATSAPP")
    .eq("direction", "OUTBOUND")
    .eq("is_auto", false)
    .gte("created_at", dayStart.toISOString());

  const remaining = MAX_PER_DAY - (usedToday || 0);
  if (remaining <= 0) {
    return { error: `Daily limit reached (${MAX_PER_DAY} manual messages/day). Try again tomorrow.` };
  }
  if (leadIds.length > remaining) {
    return { error: `Only ${remaining} manual message${remaining === 1 ? "" : "s"} left today (limit ${MAX_PER_DAY}/day). Select fewer leads.` };
  }

  // Connection + template.
  const { data: conn } = await admin
    .from("whatsapp_connections")
    .select("phone_number_id, access_token_enc, default_template, template_language, status")
    .eq("company_id", profile.company_id)
    .maybeSingle();
  if (!conn || conn.status !== "ACTIVE") return { error: "Connect WhatsApp first." };

  const templateName = conn.default_template || "hello_world";
  const language = conn.template_language || "en_US";
  const token = decryptToken(conn.access_token_enc);

  // Template extras (image header / variable presence).
  const { data: tplRow } = await admin
    .from("whatsapp_templates")
    .select("header_image_url, body_text")
    .eq("company_id", profile.company_id)
    .eq("name", templateName)
    .maybeSingle();

  // Company + leads (with project names for variables).
  const [{ data: company }, { data: leads }] = await Promise.all([
    admin.from("companies").select("name").eq("id", profile.company_id).maybeSingle(),
    admin
      .from("leads")
      .select("id, name, phone, projects(name)")
      .in("id", leadIds)
      .eq("company_id", profile.company_id)
      .is("deleted_at", null),
  ]);
  const companyName = company?.name || "Our Team";

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const lead of leads || []) {
    if (!lead.phone) {
      skipped++;
      continue;
    }
    const to = normalizeWhatsAppNumber(lead.phone);
    // {{1}} = lead name, {{2}} = project name (falls back to company name).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const projectName = (lead.projects as any)?.name || companyName;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const components: any[] = [];
    if (templateName !== "hello_world") {
      if (tplRow?.header_image_url) {
        components.push({
          type: "header",
          parameters: [{ type: "image", image: { link: tplRow.header_image_url } }],
        });
      }
      // Match the template's exact variable count (Meta rejects mismatches, #132000).
      const varMatches = (tplRow?.body_text || "").match(/\{\{\s*(\d+)\s*\}\}/g) || [];
      const varCount = tplRow
        ? new Set(varMatches.map((m: string) => m.replace(/\D/g, ""))).size
        : 3;
      if (varCount > 0) {
        const values = [(lead.name || "").trim() || "there", projectName];
        while (values.length < varCount) values.push(companyName);
        components.push({
          type: "body",
          parameters: values.slice(0, varCount).map((text) => ({ type: "text", text })),
        });
      }
    }

    try {
      const res = await sendWhatsAppTemplate(conn.phone_number_id, token, to, templateName, language, components);
      sent++;
      await admin.from("message_log").insert({
        company_id: profile.company_id,
        lead_id: lead.id,
        channel: "WHATSAPP",
        direction: "OUTBOUND",
        to_address: to,
        subject: templateName,
        status: "SENT",
        provider_id: res.messages?.[0]?.id || null,
        is_auto: false,
      });
    } catch (err) {
      failed++;
      await admin.from("message_log").insert({
        company_id: profile.company_id,
        lead_id: lead.id,
        channel: "WHATSAPP",
        direction: "OUTBOUND",
        to_address: to,
        subject: templateName,
        status: "FAILED",
        error_message: err instanceof Error ? err.message : "send failed",
        is_auto: false,
      });
    }
  }

  revalidatePath("/leads");
  return {
    success: true,
    sent,
    failed,
    skipped,
    remainingToday: Math.max(0, remaining - sent - failed),
  };
}

// ── Get today's remaining manual-send quota (for the UI) ────────
export async function getBulkSendQuota() {
  const profile = await getCachedUserProfile();
  if (!profile?.company_id) return { maxPerBatch: MAX_PER_BATCH, remainingToday: 0 };

  const admin = createAdminClient();
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const { count } = await admin
    .from("message_log")
    .select("id", { count: "exact", head: true })
    .eq("company_id", profile.company_id)
    .eq("channel", "WHATSAPP")
    .eq("direction", "OUTBOUND")
    .eq("is_auto", false)
    .gte("created_at", dayStart.toISOString());

  return { maxPerBatch: MAX_PER_BATCH, remainingToday: Math.max(0, MAX_PER_DAY - (count || 0)) };
}

// ── Upload a template header image (storage URL + Meta handle) ──
export async function uploadTemplateHeaderImage(formData: FormData) {
  const profile = await getCachedUserProfile();
  if (!profile?.company_id) return { error: "Unauthorized" };
  if (!isAdmin(profile.role)) return { error: "Admin access required" };

  const file = formData.get("file") as File | null;
  if (!file) return { error: "No image selected" };
  if (!/^image\/(jpeg|png)$/.test(file.type)) return { error: "Use a JPG or PNG image." };
  if (file.size > 4 * 1024 * 1024) return { error: "Image must be under 4MB." };

  const admin = createAdminClient();
  const { data: conn } = await admin
    .from("whatsapp_connections")
    .select("access_token_enc, status")
    .eq("company_id", profile.company_id)
    .maybeSingle();
  if (!conn || conn.status !== "ACTIVE") return { error: "Connect WhatsApp first." };

  const APP_ID = process.env.FACEBOOK_APP_ID;
  if (!APP_ID) return { error: "Server not configured." };

  const buffer = await file.arrayBuffer();

  // 1. Store in Supabase Storage (public) — used as the image link at SEND time.
  const bucket = "whatsapp-media";
  try {
    await admin.storage.createBucket(bucket, { public: true });
  } catch {
    /* bucket exists */
  }
  const ext = file.type === "image/png" ? "png" : "jpg";
  const path = `${profile.company_id}/tpl-${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await admin.storage.from(bucket).upload(path, buffer, {
    contentType: file.type,
    upsert: false,
  });
  if (upErr) {
    console.error("storage upload error:", upErr);
    return { error: "Couldn't store the image. Try again." };
  }
  const { data: pub } = admin.storage.from(bucket).getPublicUrl(path);
  const publicUrl = pub.publicUrl;

  // 2. Upload to Meta for the template-creation handle.
  let handle: string;
  try {
    handle = await uploadMetaTemplateMedia(APP_ID, decryptToken(conn.access_token_enc), {
      buffer,
      type: file.type,
      size: file.size,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Meta media upload failed." };
  }

  return { success: true, url: publicUrl, handle };
}
