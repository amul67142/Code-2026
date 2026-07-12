/**
 * Inbound WhatsApp reply processor.
 *
 * Called by the WhatsApp webhook for each incoming text message. It:
 *   1. Resolves which company owns the receiving number (phone_number_id).
 *   2. Matches the sender to a lead (by last-10-digits of the phone).
 *   3. Logs the reply to message_log + the lead's activity timeline.
 *   4. If the reply text contains a configured qualify keyword, moves the lead
 *      to the company's qualified stage.
 *   5. Notifies the assigned agent either way.
 *
 * Runs under the admin (service-role) client — webhooks have no user session.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeWhatsAppNumber } from "@/lib/integrations/whatsapp";

export interface InboundWhatsApp {
  phoneNumberId: string;
  from: string; // sender WhatsApp id (digits, country code, no +)
  text: string;
  waMessageId: string;
}

export type InboundResult =
  | { ok: true; leadId: string; qualified: boolean }
  | { skipped: "no_connection" | "no_lead" };

export async function processInboundWhatsApp(msg: InboundWhatsApp): Promise<InboundResult> {
  const admin = createAdminClient();

  // 1. Which company owns this WhatsApp number?
  const { data: conn } = await admin
    .from("whatsapp_connections")
    .select("company_id, qualify_keywords, qualify_stage_id, status")
    .eq("phone_number_id", msg.phoneNumberId)
    .maybeSingle();

  if (!conn || conn.status !== "ACTIVE") return { skipped: "no_connection" };

  // 2. Match the sender to a lead. Phone formats vary (+91…, 91…, bare 10-digit),
  //    so match on the last 10 digits — robust across storage formats.
  const last10 = normalizeWhatsAppNumber(msg.from).slice(-10);
  const { data: leads } = await admin
    .from("leads")
    .select("id, assigned_to_id, stage_id, name")
    .eq("company_id", conn.company_id)
    .is("deleted_at", null)
    .ilike("phone", `%${last10}`)
    .order("created_at", { ascending: false })
    .limit(1);
  const lead = leads?.[0];

  // 3. Always log the inbound message (keep a record even with no lead match).
  await admin.from("message_log").insert({
    company_id: conn.company_id,
    lead_id: lead?.id ?? null,
    channel: "WHATSAPP",
    direction: "INBOUND",
    to_address: last10, // the other party (sender) for an inbound row
    subject: msg.text.slice(0, 300),
    status: "REPLIED",
    provider_id: msg.waMessageId,
    is_auto: false,
    replied_at: new Date().toISOString(),
  });

  if (!lead) return { skipped: "no_lead" };

  // 4. Timeline activity for the reply.
  await admin.from("activities").insert({
    lead_id: lead.id,
    user_id: null,
    type: "WHATSAPP",
    description: `Lead replied on WhatsApp: "${msg.text.slice(0, 120)}"`,
    metadata: { channel: "WHATSAPP", direction: "INBOUND", wa_message_id: msg.waMessageId },
  });

  // 5. Keyword-based qualification → move to the qualified stage.
  let qualified = false;
  const keywords = String(conn.qualify_keywords || "")
    .split(",")
    .map((k: string) => k.trim().toLowerCase())
    .filter(Boolean);

  if (
    keywords.length > 0 &&
    conn.qualify_stage_id &&
    conn.qualify_stage_id !== lead.stage_id
  ) {
    const lowerText = msg.text.toLowerCase();
    if (keywords.some((k: string) => lowerText.includes(k))) {
      const { error: upErr } = await admin
        .from("leads")
        .update({ stage_id: conn.qualify_stage_id })
        .eq("id", lead.id);
      if (!upErr) {
        qualified = true;
        await admin.from("activities").insert({
          lead_id: lead.id,
          user_id: null,
          type: "STAGE_CHANGE",
          description: "Auto-qualified from a WhatsApp reply — moved to the qualified stage.",
          metadata: { via: "whatsapp_keyword", wa_message_id: msg.waMessageId },
        });
      }
    }
  }

  // 6. Notify the assigned agent (qualified or just replied).
  if (lead.assigned_to_id) {
    const leadName = lead.name || "A lead";
    await admin.from("notifications").insert({
      company_id: conn.company_id,
      user_id: lead.assigned_to_id,
      title: qualified
        ? `🔥 ${leadName} qualified on WhatsApp`
        : `💬 ${leadName} replied on WhatsApp`,
      message: qualified
        ? `Your assigned lead ${leadName} was auto-qualified from their WhatsApp reply: "${msg.text.slice(0, 120)}"`
        : `Your assigned lead ${leadName} replied: "${msg.text.slice(0, 130)}"`,
      type: "WHATSAPP_REPLY",
      metadata: { lead_id: lead.id, qualified },
    });
  }

  return { ok: true, leadId: lead.id, qualified };
}
