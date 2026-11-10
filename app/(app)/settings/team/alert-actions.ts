"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCachedUserProfile } from "@/lib/auth/cached-user";
import { decryptToken } from "@/lib/integrations/crypto";
import { sendWhatsAppTemplate } from "@/lib/integrations/whatsapp";
import { sendTemplateWithCredit } from "@/lib/billing/credits";
import { refreshTemplateStatus } from "@/lib/integrations/template-status";
import {
  ALERT_FIELDS,
  STANDARD_ALERT_TEMPLATE,
  fitAlertMapping,
  templateVariableCount,
} from "@/lib/automation/agent-alert-fields";
import { validateAgentAlert, type AgentAlertSettings } from "@/lib/team/agent-alert-settings";
import { createWhatsAppTemplate } from "../integrations/whatsapp-templates-actions";

async function requireAdmin() {
  const profile = await getCachedUserProfile();
  if (!profile?.company_id) return { error: "Unauthorized" as const };
  if (profile.role !== "ADMIN" && profile.role !== "SUPER_ADMIN") {
    return { error: "Only admins can change alert settings" as const };
  }
  return { profile };
}

export interface AlertTemplateOption {
  id: string;
  name: string;
  language: string;
  status: string;
  purpose: string;
  body: string;
  varCount: number;
}

/** Everything the alert dialog needs: is WhatsApp connected, and which templates exist. */
export async function getAgentAlertSetup() {
  const guard = await requireAdmin();
  if ("error" in guard) {
    return { connected: false, hasWaba: false, templates: [] as AlertTemplateOption[] };
  }

  const admin = createAdminClient();
  const [{ data: conn }, { data: templates }] = await Promise.all([
    admin
      .from("whatsapp_connections")
      .select("status, waba_id")
      .eq("company_id", guard.profile.company_id)
      .maybeSingle(),
    admin
      .from("whatsapp_templates")
      .select("id, name, language, status, purpose, body_text")
      .eq("company_id", guard.profile.company_id)
      .order("created_at", { ascending: false }),
  ]);

  return {
    connected: conn?.status === "ACTIVE",
    hasWaba: !!conn?.waba_id,
    templates: (templates || []).map((t) => ({
      id: t.id,
      name: t.name,
      language: t.language,
      status: t.status,
      purpose: t.purpose || "LEAD_WELCOME",
      body: t.body_text || "",
      varCount: templateVariableCount(t.body_text),
    })) as AlertTemplateOption[],
  };
}

/** Save one agent's alert settings. */
export async function saveAgentAlert(userId: string, settings: AgentAlertSettings) {
  const guard = await requireAdmin();
  if ("error" in guard) return { error: guard.error };

  const admin = createAdminClient();
  const { data: target } = await admin
    .from("users")
    .select("id")
    .eq("id", userId)
    .eq("company_id", guard.profile.company_id)
    .maybeSingle();
  if (!target) return { error: "Team member not found" };

  const checked = await validateAgentAlert(admin, guard.profile.company_id, settings);
  if ("error" in checked) return { error: checked.error };

  const { error } = await admin
    .from("users")
    .update({ ...checked.row, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .eq("company_id", guard.profile.company_id);
  if (error) {
    console.error("saveAgentAlert error:", error);
    return { error: "Could not save alert settings" };
  }

  revalidatePath("/settings/team");
  return { success: true, row: checked.row };
}

/**
 * Submit the standard "new lead assigned" template to Meta, already in the
 * Agent lead alert group, for a company that has none. It arrives PENDING;
 * alerts using it start on their own once Meta approves and it is synced.
 */
export async function createStandardAlertTemplate() {
  const guard = await requireAdmin();
  if ("error" in guard) return { error: guard.error };

  const t = STANDARD_ALERT_TEMPLATE;
  const res = await createWhatsAppTemplate({
    name: t.name,
    category: t.category,
    language: t.language,
    bodyText: t.body,
    sampleValues: t.samples,
    purpose: "AGENT_LEAD_ALERT",
  });
  if ("error" in res && res.error) return { error: res.error };

  revalidatePath("/settings/team");
  return {
    success: true,
    template: { name: t.name, language: t.language, status: res.status || "PENDING" },
    mapping: t.mapping,
  };
}

/**
 * Send one alert with sample lead details to the agent's number, so the setup
 * is proven before a real lead depends on it. Not logged against any lead —
 * there is no lead, and a fake entry on a real lead's timeline would mislead.
 */
export async function sendTestAgentAlert(userId: string) {
  const guard = await requireAdmin();
  if ("error" in guard) return { error: guard.error };

  const admin = createAdminClient();
  const [{ data: agent }, { data: conn }, { data: company }] = await Promise.all([
    admin
      .from("users")
      .select("name, phone, wa_notify_template, wa_notify_template_language, wa_notify_variables")
      .eq("id", userId)
      .eq("company_id", guard.profile.company_id)
      .maybeSingle(),
    admin
      .from("whatsapp_connections")
      .select("phone_number_id, waba_id, access_token_enc, status")
      .eq("company_id", guard.profile.company_id)
      .eq("status", "ACTIVE")
      .maybeSingle(),
    admin.from("companies").select("name").eq("id", guard.profile.company_id).maybeSingle(),
  ]);

  if (!agent) return { error: "Team member not found" };
  if (!agent.phone) return { error: "Save a WhatsApp number for this agent first." };
  if (!agent.wa_notify_template) return { error: "Save a template for this agent first." };
  if (!conn) return { error: "Connect WhatsApp first." };

  const language = agent.wa_notify_template_language || "en_US";
  const { data: tpl } = await admin
    .from("whatsapp_templates")
    .select("body_text, status, updated_at")
    .eq("company_id", guard.profile.company_id)
    .eq("name", agent.wa_notify_template)
    .eq("language", language)
    .maybeSingle();
  if (tpl && tpl.status !== "APPROVED") {
    // The saved status may predate Meta's approval; ask Meta before refusing.
    const live = await refreshTemplateStatus({
      companyId: guard.profile.company_id,
      wabaId: conn.waba_id,
      tokenEnc: conn.access_token_enc,
      name: agent.wa_notify_template,
      language,
      saved: { status: tpl.status, updated_at: null },
    });
    if (live !== "APPROVED") {
      return { error: `Meta has not approved "${agent.wa_notify_template}" yet (${live.toLowerCase()}).` };
    }
    revalidatePath("/settings/team");
  }

  const sample: Record<string, string> = {
    lead_name: "Raju Patel",
    lead_phone: "+919876543210",
    lead_email: "raju@example.com",
    project: "Sample Project",
    source: "WEBSITE FORM",
    stage: "New",
    location: "Sector 150",
    bhk: "3 BHK",
    budget: "₹90,00,000 – ₹1,20,00,000",
    notes: "Test alert from BigLead",
    agent_name: agent.name || "there",
    company: company?.name || "Our Team",
  };
  const count = templateVariableCount(tpl?.body_text);
  const fields = fitAlertMapping(agent.wa_notify_variables, count);
  const components = count
    ? [
        {
          type: "body",
          parameters: fields.map((f) => ({ type: "text", text: sample[f] || ALERT_FIELDS[f] })),
        },
      ]
    : [];

  try {
    await sendTemplateWithCredit(guard.profile.company_id, "Test agent alert", () =>
      sendWhatsAppTemplate(
        conn.phone_number_id,
        decryptToken(conn.access_token_enc),
        agent.phone,
        agent.wa_notify_template,
        language,
        components
      )
    );
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "WhatsApp send failed" };
  }
}
