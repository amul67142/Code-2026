/**
 * Validation for an agent's WhatsApp lead-alert settings.
 *
 * Shared by the invite flow and the edit dialog so there is exactly one rule
 * for what a valid setup is. Deliberately a plain server module rather than a
 * "use server" file: anything exported from one of those becomes a callable
 * endpoint, and this takes a service-role client.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeWhatsAppNumber } from "@/lib/integrations/whatsapp";
import {
  fitAlertMapping,
  isAlertField,
  templateVariableCount,
} from "@/lib/automation/agent-alert-fields";

export interface AgentAlertSettings {
  enabled: boolean;
  phone: string;
  template: string | null;
  templateLanguage: string | null;
  variables: string[];
}

export interface AgentAlertRow {
  phone: string | null;
  wa_notify_enabled: boolean;
  wa_notify_template: string | null;
  wa_notify_template_language: string | null;
  wa_notify_variables: string[];
}

/**
 * Turn what the dialog sent into the columns to store, or say what is wrong.
 *
 * Turning alerts OFF always succeeds and keeps the number and template, so
 * switching back on later is one click rather than a re-setup.
 */
export async function validateAgentAlert(
  admin: SupabaseClient,
  companyId: string,
  settings: AgentAlertSettings
): Promise<{ error: string } | { row: AgentAlertRow }> {
  const raw = (settings.phone || "").trim();
  let phone: string | null = null;
  if (raw) {
    if (raw.replace(/\D/g, "").length < 10) {
      return { error: "Enter the agent's full WhatsApp number, with country code if outside India." };
    }
    phone = normalizeWhatsAppNumber(raw);
    if (phone.length < 11 || phone.length > 15) {
      return { error: "That WhatsApp number does not look right." };
    }
  }

  const templateName = settings.template?.trim() || null;
  const language = settings.templateLanguage?.trim() || "en_US";

  if (!settings.enabled) {
    return {
      row: {
        phone,
        wa_notify_enabled: false,
        wa_notify_template: templateName,
        wa_notify_template_language: templateName ? language : null,
        wa_notify_variables: (settings.variables || []).filter(isAlertField),
      },
    };
  }

  if (!phone) return { error: "Add the agent's WhatsApp number to send them alerts." };
  if (!templateName) return { error: "Choose which template to send." };

  const { data: tpl } = await admin
    .from("whatsapp_templates")
    .select("body_text, purpose")
    .eq("company_id", companyId)
    .eq("name", templateName)
    .eq("language", language)
    .maybeSingle();

  if (!tpl) return { error: "That template no longer exists. Sync templates and pick again." };

  // The mirror of the welcome-picker guard: a lead welcome ("thanks for your
  // interest") sent to an agent tells them nothing, and keeping the groups
  // strict is the whole point of having them.
  if (tpl.purpose !== "AGENT_LEAD_ALERT") {
    return {
      error:
        "That template is not in the Agent lead alert group. Pick one from that group, or move it there on the Templates page.",
    };
  }

  return {
    row: {
      phone,
      wa_notify_enabled: true,
      wa_notify_template: templateName,
      wa_notify_template_language: language,
      // Stored fitted to the template, so what the dialog shows is exactly
      // what will be sent.
      wa_notify_variables: fitAlertMapping(settings.variables, templateVariableCount(tpl.body_text)),
    },
  };
}
