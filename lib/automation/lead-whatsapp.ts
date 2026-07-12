/**
 * Lead acknowledgment WhatsApp — sent automatically to a lead when they enter
 * the CRM, FROM the company's own connected WhatsApp number. Logs every send to
 * `message_log` so the lead detail page + Reports can show status.
 *
 * Business-initiated messages must use an approved template. The company's
 * connection stores which template to use (default_template). For the welcome
 * message we pass 3 body variables: {{1}} lead name, {{2}} project, {{3}} company.
 * (For Meta's pre-approved `hello_world` test template, no variables are sent.)
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptToken } from "@/lib/integrations/crypto";
import { sendWhatsAppTemplate, normalizeWhatsAppNumber } from "@/lib/integrations/whatsapp";

export interface LeadWhatsAppInput {
  companyId: string;
  leadId: string;
  leadName: string | null;
  leadPhone: string | null;
  projectId?: string | null;
  isAuto?: boolean;
}

export interface LeadWhatsAppResult {
  status: "SENT" | "FAILED" | "SKIPPED_NO_PHONE" | "SKIPPED_NO_CONNECTION";
  providerId?: string;
  error?: string;
}

export async function sendLeadWhatsApp(
  input: LeadWhatsAppInput
): Promise<LeadWhatsAppResult> {
  const admin = createAdminClient();

  if (!input.leadPhone) return { status: "SKIPPED_NO_PHONE" };

  // The company must have an active WhatsApp connection.
  const { data: conn } = await admin
    .from("whatsapp_connections")
    .select("phone_number_id, access_token_enc, default_template, template_language, status")
    .eq("company_id", input.companyId)
    .eq("status", "ACTIVE")
    .maybeSingle();

  if (!conn) return { status: "SKIPPED_NO_CONNECTION" };

  // Resolve company + project names for template variables.
  const [{ data: company }, projectRes] = await Promise.all([
    admin.from("companies").select("name").eq("id", input.companyId).maybeSingle(),
    input.projectId
      ? admin.from("projects").select("name").eq("id", input.projectId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  // Variable convention: {{1}} = lead name, {{2}} = project name. Fallbacks:
  // no lead name → "there"; no project on the lead → the company name (reads
  // naturally: "…your interest in <Company>").
  const companyName = company?.name || "Our Team";
  const projectName = (projectRes?.data as { name?: string } | null)?.name || companyName;
  const leadName = (input.leadName || "").trim() || "there";

  const to = normalizeWhatsAppNumber(input.leadPhone);
  const templateName = conn.default_template || "hello_world";
  const language = conn.template_language || "en_US";

  // hello_world is the pre-approved Meta test template (no variables).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const components: any[] = [];
  if (templateName !== "hello_world") {
    // If the template has an image header, it must be supplied at send time.
    const { data: tplRow } = await admin
      .from("whatsapp_templates")
      .select("header_image_url, body_text")
      .eq("company_id", input.companyId)
      .eq("name", templateName)
      .maybeSingle();
    if (tplRow?.header_image_url) {
      components.push({
        type: "header",
        parameters: [{ type: "image", image: { link: tplRow.header_image_url } }],
      });
    }
    // Send EXACTLY as many body variables as the template defines — Meta
    // rejects the message with #132000 on any mismatch.
    // Convention: {{1}} = lead name, {{2}} = project name. Any extra {{n}} a
    // client added falls back to the company name so sends never fail.
    const varMatches = (tplRow?.body_text || "").match(/\{\{\s*(\d+)\s*\}\}/g) || [];
    const varCount = tplRow
      ? new Set(varMatches.map((m: string) => m.replace(/\D/g, ""))).size
      : 3; // template unknown locally → legacy default of 3
    if (varCount > 0) {
      const values = [leadName, projectName];
      while (values.length < varCount) values.push(companyName);
      components.push({
        type: "body",
        parameters: values.slice(0, varCount).map((text) => ({ type: "text", text })),
      });
    }
  }

  try {
    const res = await sendWhatsAppTemplate(
      conn.phone_number_id,
      decryptToken(conn.access_token_enc),
      to,
      templateName,
      language,
      components
    );
    const providerId = res.messages?.[0]?.id;

    await admin.from("message_log").insert({
      company_id: input.companyId,
      lead_id: input.leadId,
      channel: "WHATSAPP",
      direction: "OUTBOUND",
      to_address: to,
      subject: templateName,
      status: "SENT",
      provider_id: providerId || null,
      is_auto: input.isAuto !== false,
    });
    await admin.from("activities").insert({
      lead_id: input.leadId,
      user_id: null,
      type: "WHATSAPP",
      description: `${input.isAuto !== false ? "Auto-WhatsApp" : "WhatsApp"} sent to ${to}`,
      metadata: { channel: "WHATSAPP", template: templateName },
    });

    return { status: "SENT", providerId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "WhatsApp send failed";
    await admin.from("message_log").insert({
      company_id: input.companyId,
      lead_id: input.leadId,
      channel: "WHATSAPP",
      direction: "OUTBOUND",
      to_address: to,
      subject: templateName,
      status: "FAILED",
      error_message: msg,
      is_auto: input.isAuto !== false,
    });
    await admin.from("activities").insert({
      lead_id: input.leadId,
      user_id: null,
      type: "WHATSAPP",
      description: `WhatsApp to ${to} failed`,
      metadata: { channel: "WHATSAPP", error: msg },
    });
    return { status: "FAILED", error: msg };
  }
}
