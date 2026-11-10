/**
 * WhatsApp alert to the AGENT when a lead is assigned to them.
 *
 * Sent from the company's own WhatsApp number to the agent's number, carrying
 * the lead's name and phone so they can tap and dial. This is the message that
 * makes a lead get called in two minutes rather than tomorrow — the in-app
 * bell only rings while someone has the CRM open.
 *
 * Deliberately NOT gated by projectAllowsAutoMessaging. That switch exists to
 * stop us messaging LEADS from a given project (the 99acres rule); it has no
 * bearing on telling our own staff they have work. Conflating the two would
 * silently mute alerts for exactly the projects that need them most.
 *
 * Every send is a billable WhatsApp conversation, so it fires once per
 * assignment and only for agents who opted in and supplied a number.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptToken } from "@/lib/integrations/crypto";
import { sendWhatsAppTemplate, normalizeWhatsAppNumber } from "@/lib/integrations/whatsapp";
import { sendTemplateWithCredit } from "@/lib/billing/credits";
import { refreshTemplateStatus } from "@/lib/integrations/template-status";
import {
  fitAlertMapping,
  templateVariableCount,
  type AlertField,
} from "@/lib/automation/agent-alert-fields";

export type AgentAlertStatus =
  | "SENT"
  | "FAILED"
  | "SKIPPED_NOT_ENABLED"
  | "SKIPPED_NO_AGENT_PHONE"
  | "SKIPPED_NO_TEMPLATE"
  | "SKIPPED_TEMPLATE_NOT_APPROVED"
  | "SKIPPED_NO_CONNECTION"
  | "SKIPPED_SAME_AS_LEAD";

export interface AgentAlertResult {
  status: AgentAlertStatus;
  providerId?: string;
  error?: string;
}

const INR = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

function money(min: number | null, max: number | null): string {
  if (min && max) return `₹${INR.format(min)} – ₹${INR.format(max)}`;
  if (max) return `up to ₹${INR.format(max)}`;
  if (min) return `₹${INR.format(min)}+`;
  return "Not shared";
}

/**
 * Resolve each configured field to the text that goes in its {{n}}.
 *
 * Never returns an empty string: Meta rejects the whole message (#132000) on a
 * blank body parameter, and an alert that fails because a lead left their
 * email blank is worse than one that says "Not shared".
 */
function resolveFields(
  fields: AlertField[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lead: Record<string, any>,
  agentName: string,
  companyName: string
): string[] {
  const projectName = lead.projects?.name || null;
  const stageName = lead.pipeline_stages?.name || null;

  const value = (f: AlertField): string => {
    switch (f) {
      case "lead_name":
        return lead.name || "Unknown";
      case "lead_phone":
        // +E.164 is what WhatsApp reliably turns into a tap-to-call link.
        return lead.phone ? `+${normalizeWhatsAppNumber(lead.phone)}` : "No number";
      case "lead_email":
        return lead.email || "No email";
      case "project":
        return projectName || companyName;
      case "source":
        return (lead.source || "OTHER").replace(/_/g, " ");
      case "stage":
        return stageName || "New";
      case "location":
        return lead.location_preference || "Not shared";
      case "bhk":
        return lead.bhk_preference || "Not shared";
      case "budget":
        return money(lead.budget_min, lead.budget_max);
      case "notes":
        return lead.notes || "No note";
      case "agent_name":
        return agentName || "there";
      case "company":
        return companyName;
    }
  };

  // Meta also rejects newlines and runs of spaces inside a parameter.
  return fields.map(
    (f) => value(f).replace(/\s+/g, " ").trim().slice(0, 1024) || "Not shared"
  );
}

/**
 * Alert one agent that a lead is theirs.
 *
 * Returns a status rather than throwing: an assignment must never fail because
 * a notification could not be delivered.
 */
export async function sendAgentLeadAlert(input: {
  companyId: string;
  leadId: string;
  agentUserId: string;
}): Promise<AgentAlertResult> {
  const admin = createAdminClient();

  const { data: agent } = await admin
    .from("users")
    .select(
      "id, name, phone, wa_notify_enabled, wa_notify_template, wa_notify_template_language, wa_notify_variables"
    )
    .eq("id", input.agentUserId)
    .eq("company_id", input.companyId)
    .maybeSingle();

  // Alerts switched off is a choice, not a fault, so it is not noted on the lead.
  if (!agent?.wa_notify_enabled) return { status: "SKIPPED_NOT_ENABLED" };

  // Every other skip is noted on the lead's timeline with its reason, so
  // "the agent got nothing" can be answered from the lead itself.
  const skip = async (status: AgentAlertStatus, reason: string): Promise<AgentAlertResult> => {
    await admin.from("activities").insert({
      lead_id: input.leadId,
      user_id: null,
      type: "WHATSAPP",
      description: `WhatsApp alert to ${agent.name} not sent: ${reason}`,
      metadata: { channel: "WHATSAPP", recipient: "AGENT", agent_id: agent.id, skipped: status },
    });
    return { status };
  };

  if (!agent.phone) return skip("SKIPPED_NO_AGENT_PHONE", "no WhatsApp number is saved for them");
  if (!agent.wa_notify_template) return skip("SKIPPED_NO_TEMPLATE", "no alert template is chosen for them");

  const { data: conn } = await admin
    .from("whatsapp_connections")
    .select("phone_number_id, waba_id, access_token_enc, status")
    .eq("company_id", input.companyId)
    .eq("status", "ACTIVE")
    .maybeSingle();

  if (!conn) return skip("SKIPPED_NO_CONNECTION", "WhatsApp is not connected");

  const templateName = agent.wa_notify_template;
  const language = agent.wa_notify_template_language || "en_US";

  const [{ data: lead }, { data: company }, { data: tpl }] = await Promise.all([
    admin
      .from("leads")
      .select(
        "id, name, phone, email, source, notes, budget_min, budget_max, bhk_preference, location_preference, projects ( name ), pipeline_stages ( name )"
      )
      .eq("id", input.leadId)
      .eq("company_id", input.companyId)
      .maybeSingle(),
    admin.from("companies").select("name").eq("id", input.companyId).maybeSingle(),
    admin
      .from("whatsapp_templates")
      .select("body_text, header_image_url, purpose, status, updated_at")
      .eq("company_id", input.companyId)
      .eq("name", templateName)
      .eq("language", language)
      .maybeSingle(),
  ]);

  if (!lead) return { status: "FAILED", error: "Lead not found" };

  // Meta refuses an unapproved template, so sending would only produce a
  // failed attempt on every assignment. But the saved status can be stale
  // (Meta approved it, nobody clicked Sync), so ask Meta before skipping.
  if (tpl && tpl.status !== "APPROVED") {
    const live = await refreshTemplateStatus({
      companyId: input.companyId,
      wabaId: conn.waba_id,
      tokenEnc: conn.access_token_enc,
      name: templateName,
      language,
      saved: tpl,
    });
    if (live !== "APPROVED") {
      return skip(
        "SKIPPED_TEMPLATE_NOT_APPROVED",
        `Meta has not approved the template "${templateName}" (${live.toLowerCase()})`
      );
    }
  }

  const to = normalizeWhatsAppNumber(agent.phone);

  // A mistyped agent number that happens to be the lead's own would send the
  // internal alert to the customer. Cheap to rule out, embarrassing to miss.
  if (lead.phone && to === normalizeWhatsAppNumber(lead.phone)) {
    console.warn(
      `sendAgentLeadAlert: agent ${agent.id} phone matches lead ${lead.id} — not sending`
    );
    return skip("SKIPPED_SAME_AS_LEAD", "their number is the same as the lead's");
  }

  const companyName = company?.name || "Our Team";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const components: any[] = [];
  if (tpl?.header_image_url) {
    components.push({
      type: "header",
      parameters: [{ type: "image", image: { link: tpl.header_image_url } }],
    });
  }

  // Send EXACTLY as many body variables as the template declares — Meta fails
  // the message outright on a mismatch — so the saved mapping is fitted to it.
  // Template not synced locally: trust the saved mapping's length.
  const saved = Array.isArray(agent.wa_notify_variables) ? agent.wa_notify_variables : [];
  const varCount = tpl ? templateVariableCount(tpl.body_text) : saved.length;

  if (varCount > 0) {
    const fields: AlertField[] = fitAlertMapping(saved, varCount);
    const values = resolveFields(fields, lead, agent.name, companyName);
    components.push({
      type: "body",
      parameters: values.map((text) => ({ type: "text", text })),
    });
  }

  const logBase = {
    company_id: input.companyId,
    lead_id: input.leadId,
    channel: "WHATSAPP" as const,
    direction: "OUTBOUND",
    recipient_type: "AGENT",
    to_address: to,
    subject: templateName,
    is_auto: true,
  };

  try {
    const res = await sendTemplateWithCredit(input.companyId, `Agent alert: ${templateName}`, () =>
      sendWhatsAppTemplate(
        conn.phone_number_id,
        decryptToken(conn.access_token_enc),
        to,
        templateName,
        language,
        components
      )
    );
    const providerId = res.messages?.[0]?.id;

    await admin.from("message_log").insert({
      ...logBase,
      status: "SENT",
      provider_id: providerId || null,
    });
    await admin.from("activities").insert({
      lead_id: input.leadId,
      user_id: null,
      type: "WHATSAPP",
      description: `Alerted ${agent.name} on WhatsApp`,
      metadata: {
        channel: "WHATSAPP",
        recipient: "AGENT",
        agent_id: agent.id,
        template: templateName,
      },
    });

    return { status: "SENT", providerId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "WhatsApp send failed";
    await admin.from("message_log").insert({
      ...logBase,
      status: "FAILED",
      error_message: msg,
    });
    await admin.from("activities").insert({
      lead_id: input.leadId,
      user_id: null,
      type: "WHATSAPP",
      description: `WhatsApp alert to ${agent.name} failed: ${msg}`.slice(0, 500),
      metadata: { channel: "WHATSAPP", recipient: "AGENT", agent_id: agent.id, error: msg },
    });
    return { status: "FAILED", error: msg };
  }
}
