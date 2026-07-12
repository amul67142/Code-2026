"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { encryptToken, decryptToken } from "@/lib/integrations/crypto";
import {
  sendWhatsAppTemplate,
  normalizeWhatsAppNumber,
  subscribeWhatsAppWaba,
} from "@/lib/integrations/whatsapp";

async function getUserProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("users")
    .select("id, company_id, role")
    .eq("auth_user_id", user.id)
    .single();
  return profile;
}

function isAdmin(role?: string) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

// ── Connect (or update) a WhatsApp number ───────────────────────
// MVP: manual entry of phone_number_id + token (works with Meta's free test
// number). Embedded Signup (per-client onboarding) can replace this later.
export async function connectWhatsApp(input: {
  phoneNumberId: string;
  accessToken: string;
  displayPhone?: string;
  wabaId?: string;
  defaultTemplate?: string;
  templateLanguage?: string;
}) {
  const profile = await getUserProfile();
  if (!profile?.company_id) return { error: "Unauthorized" };
  if (!isAdmin(profile.role)) return { error: "Admin access required" };
  if (!input.phoneNumberId?.trim() || !input.accessToken?.trim()) {
    return { error: "Phone number ID and access token are required" };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("whatsapp_connections").upsert(
    {
      company_id: profile.company_id,
      phone_number_id: input.phoneNumberId.trim(),
      waba_id: input.wabaId?.trim() || null,
      display_phone: input.displayPhone?.trim() || null,
      access_token_enc: encryptToken(input.accessToken.trim()),
      default_template: input.defaultTemplate?.trim() || "hello_world",
      template_language: input.templateLanguage?.trim() || "en_US",
      status: "ACTIVE",
      connected_by_id: profile.id,
      last_error: null,
    },
    { onConflict: "company_id" }
  );

  if (error) {
    if (error.code === "23505" && error.message?.includes("phone_number_id")) {
      return { error: "This WhatsApp number is already connected to another account." };
    }
    console.error("connectWhatsApp error:", error);
    return { error: "Failed to save WhatsApp connection" };
  }

  // Auto-subscribe the WABA to this app so inbound replies are delivered.
  // Without this, two-way silently fails (subscribing the webhook field at the
  // app level is NOT enough — the WABA itself must be subscribed).
  if (input.wabaId?.trim()) {
    try {
      await subscribeWhatsAppWaba(input.wabaId.trim(), input.accessToken.trim());
    } catch (subErr) {
      console.error("WABA subscribe failed (non-fatal):", subErr);
      await admin
        .from("whatsapp_connections")
        .update({
          last_error: `Connected, but couldn't subscribe for inbound replies: ${
            subErr instanceof Error ? subErr.message : String(subErr)
          }. Add the WABA ID and reconnect, or subscribe the app to the WABA in Meta.`,
        })
        .eq("company_id", profile.company_id);
    }
  }

  revalidatePath("/settings/integrations");
  return { success: true };
}

// ── Get the company's WhatsApp connection (no token) ────────────
export async function getWhatsAppConnection() {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile?.company_id) return null;

  const { data } = await supabase
    .from("whatsapp_connections")
    .select("id, phone_number_id, display_phone, default_template, status, last_error, created_at, qualify_keywords, qualify_stage_id")
    .eq("company_id", profile.company_id)
    .maybeSingle();

  return data;
}

// ── Pipeline stages (for the "qualified stage" picker) ──────────
export async function getPipelineStagesForWhatsApp() {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile?.company_id) return [];

  const { data } = await supabase
    .from("pipeline_stages")
    .select("id, name")
    .eq("company_id", profile.company_id)
    .order("stage_order", { ascending: true });

  return data || [];
}

// ── Save reply-automation config (keywords + qualified stage) ───
export async function updateReplyAutomation(input: {
  keywords: string;
  stageId: string | null;
}) {
  const profile = await getUserProfile();
  if (!profile?.company_id) return { error: "Unauthorized" };
  if (!isAdmin(profile.role)) return { error: "Admin access required" };

  const admin = createAdminClient();
  const { error } = await admin
    .from("whatsapp_connections")
    .update({
      qualify_keywords: input.keywords?.trim() || null,
      qualify_stage_id: input.stageId || null,
    })
    .eq("company_id", profile.company_id);

  if (error) {
    console.error("updateReplyAutomation error:", error);
    return { error: "Failed to save reply automation" };
  }

  revalidatePath("/settings/integrations");
  return { success: true };
}

// ── Disconnect WhatsApp (revoke + wipe token) ───────────────────
export async function disconnectWhatsApp() {
  const profile = await getUserProfile();
  if (!profile?.company_id) return { error: "Unauthorized" };
  if (!isAdmin(profile.role)) return { error: "Admin access required" };

  const admin = createAdminClient();
  // Hard delete so a reconnect starts clean.
  const { error } = await admin
    .from("whatsapp_connections")
    .delete()
    .eq("company_id", profile.company_id);

  if (error) return { error: "Failed to disconnect WhatsApp" };
  revalidatePath("/settings/integrations");
  return { success: true };
}

// ── Send a test WhatsApp (to verify the connection works) ───────
export async function sendTestWhatsApp(toPhone: string) {
  const profile = await getUserProfile();
  if (!profile?.company_id) return { error: "Unauthorized" };
  if (!isAdmin(profile.role)) return { error: "Admin access required" };
  if (!toPhone?.trim()) return { error: "Enter a phone number to test" };

  const admin = createAdminClient();
  const { data: conn } = await admin
    .from("whatsapp_connections")
    .select("phone_number_id, access_token_enc, default_template, template_language, status")
    .eq("company_id", profile.company_id)
    .maybeSingle();

  if (!conn || conn.status !== "ACTIVE") return { error: "Connect WhatsApp first" };

  try {
    await sendWhatsAppTemplate(
      conn.phone_number_id,
      decryptToken(conn.access_token_enc),
      normalizeWhatsAppNumber(toPhone),
      conn.default_template || "hello_world",
      conn.template_language || "en_US",
      [] // hello_world has no variables
    );
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Test message failed" };
  }
}
