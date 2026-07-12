"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCachedUserProfile } from "@/lib/auth/cached-user";
import { decryptToken } from "@/lib/integrations/crypto";
import {
  createMetaTemplate,
  listMetaTemplates,
  templateBodyFromComponents,
} from "@/lib/integrations/whatsapp";

function isAdmin(role?: string) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

/** Compute the sync cooldown: first re-sync after 60s, then 300s (anti-spam). */
function cooldownFor(count: number): number {
  if (count < 1) return 0;
  if (count < 2) return 60;
  return 300;
}

function remainingCooldown(lastSyncAt: string | null, count: number): number {
  const cd = cooldownFor(count);
  if (!lastSyncAt || cd === 0) return 0;
  const elapsed = (Date.now() - new Date(lastSyncAt).getTime()) / 1000;
  return Math.max(0, Math.ceil(cd - elapsed));
}

// ── List this company's templates + sync state ──────────────────
export async function getWhatsAppTemplates() {
  const profile = await getCachedUserProfile();
  if (!profile?.company_id) return { templates: [], cooldownRemainingSec: 0, hasWaba: false };

  const admin = createAdminClient();
  const [{ data: templates }, { data: conn }] = await Promise.all([
    admin
      .from("whatsapp_templates")
      .select("id, name, language, category, body_text, status, rejection_reason, created_at")
      .eq("company_id", profile.company_id)
      .order("created_at", { ascending: false }),
    admin
      .from("whatsapp_connections")
      .select("waba_id, templates_last_sync_at, templates_sync_count")
      .eq("company_id", profile.company_id)
      .maybeSingle(),
  ]);

  return {
    templates: templates || [],
    cooldownRemainingSec: remainingCooldown(
      conn?.templates_last_sync_at ?? null,
      conn?.templates_sync_count ?? 0
    ),
    hasWaba: !!conn?.waba_id,
  };
}

// ── Create a template (submit to Meta for review) ───────────────
export async function createWhatsAppTemplate(input: {
  name: string;
  category: "UTILITY" | "MARKETING";
  language: string;
  bodyText: string;
  sampleValues: string[];
}) {
  const profile = await getCachedUserProfile();
  if (!profile?.company_id) return { error: "Unauthorized" };
  if (!isAdmin(profile.role)) return { error: "Admin access required" };

  const name = (input.name || "").trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "");
  const bodyText = (input.bodyText || "").trim();
  if (!name) return { error: "Template name is required (lowercase letters, numbers, underscores)." };
  if (!bodyText) return { error: "Message body is required." };

  // Distinct variable count must match the number of sample values provided.
  const varMatches = bodyText.match(/\{\{\s*(\d+)\s*\}\}/g) || [];
  const varCount = new Set(varMatches.map((m) => m.replace(/\D/g, ""))).size;
  const examples = (input.sampleValues || []).map((s) => (s || "").trim()).slice(0, varCount);
  if (varCount > 0 && (examples.length < varCount || examples.some((e) => !e))) {
    return { error: `Please provide a sample value for each variable ({{1}}…{{${varCount}}}).` };
  }

  const admin = createAdminClient();
  const { data: conn } = await admin
    .from("whatsapp_connections")
    .select("waba_id, access_token_enc, status")
    .eq("company_id", profile.company_id)
    .maybeSingle();

  if (!conn || conn.status !== "ACTIVE") return { error: "Connect WhatsApp first." };
  if (!conn.waba_id) {
    return { error: "This WhatsApp connection has no linked account. Reconnect via Connect WhatsApp to manage templates." };
  }

  // Submit to Meta.
  let metaId: string | undefined;
  let metaStatus = "PENDING";
  try {
    const res = await createMetaTemplate(conn.waba_id, decryptToken(conn.access_token_enc), {
      name,
      language: input.language || "en_US",
      category: input.category || "UTILITY",
      bodyText,
      examples,
    });
    metaId = res.id;
    metaStatus = (res.status || "PENDING").toUpperCase();
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to submit template to Meta." };
  }

  // Store locally.
  const { error } = await admin.from("whatsapp_templates").upsert(
    {
      company_id: profile.company_id,
      name,
      language: input.language || "en_US",
      category: input.category || "UTILITY",
      body_text: bodyText,
      sample_values: examples,
      status: metaStatus,
      meta_template_id: metaId || null,
      created_by_id: profile.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "company_id,name,language" }
  );
  if (error) {
    console.error("createWhatsAppTemplate store error:", error);
    return { error: "Submitted to Meta, but couldn't save locally. Sync to refresh." };
  }

  revalidatePath("/settings/integrations");
  return { success: true, status: metaStatus };
}

// ── Sync statuses from Meta (rate-limited) ──────────────────────
export async function syncWhatsAppTemplates() {
  const profile = await getCachedUserProfile();
  if (!profile?.company_id) return { error: "Unauthorized" };
  if (!isAdmin(profile.role)) return { error: "Admin access required" };

  const admin = createAdminClient();
  const { data: conn } = await admin
    .from("whatsapp_connections")
    .select("waba_id, access_token_enc, status, templates_last_sync_at, templates_sync_count")
    .eq("company_id", profile.company_id)
    .maybeSingle();

  if (!conn || conn.status !== "ACTIVE") return { error: "Connect WhatsApp first." };
  if (!conn.waba_id) return { error: "No WhatsApp account linked — reconnect to manage templates." };

  // Anti-spam cooldown.
  const remaining = remainingCooldown(conn.templates_last_sync_at, conn.templates_sync_count || 0);
  if (remaining > 0) {
    return { error: `Please wait ${remaining}s before syncing again.`, cooldownRemainingSec: remaining };
  }

  // Pull latest statuses from Meta.
  let metaTemplates;
  try {
    metaTemplates = await listMetaTemplates(conn.waba_id, decryptToken(conn.access_token_enc));
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to fetch templates from Meta." };
  }

  // Update local rows to match Meta (upsert every template we see).
  for (const t of metaTemplates) {
    await admin.from("whatsapp_templates").upsert(
      {
        company_id: profile.company_id,
        name: t.name,
        language: t.language,
        category: t.category || "UTILITY",
        body_text: templateBodyFromComponents(t.components) || "(managed in Meta)",
        status: (t.status || "PENDING").toUpperCase(),
        meta_template_id: t.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "company_id,name,language", ignoreDuplicates: false }
    );
  }

  const newCount = (conn.templates_sync_count || 0) + 1;
  await admin
    .from("whatsapp_connections")
    .update({ templates_last_sync_at: new Date().toISOString(), templates_sync_count: newCount })
    .eq("company_id", profile.company_id);

  revalidatePath("/settings/integrations");
  return { success: true, cooldownRemainingSec: cooldownFor(newCount) };
}

// ── Set an approved template as the auto-welcome message ─────────
export async function setWelcomeTemplate(name: string, language: string) {
  const profile = await getCachedUserProfile();
  if (!profile?.company_id) return { error: "Unauthorized" };
  if (!isAdmin(profile.role)) return { error: "Admin access required" };

  const admin = createAdminClient();
  // Only allow using an APPROVED template.
  const { data: tpl } = await admin
    .from("whatsapp_templates")
    .select("status")
    .eq("company_id", profile.company_id)
    .eq("name", name)
    .eq("language", language)
    .maybeSingle();
  if (!tpl) return { error: "Template not found." };
  if (tpl.status !== "APPROVED") return { error: "Only approved templates can be used." };

  const { error } = await admin
    .from("whatsapp_connections")
    .update({ default_template: name, template_language: language })
    .eq("company_id", profile.company_id);
  if (error) return { error: "Failed to set welcome template." };

  revalidatePath("/settings/integrations");
  return { success: true };
}
