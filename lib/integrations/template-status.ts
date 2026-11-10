/**
 * Keep a template's saved review status in step with Meta.
 *
 * The saved status used to change only when an admin clicked "Sync templates".
 * A template Meta had already approved therefore still read PENDING here, and
 * every agent alert using it was skipped without a word. Two fixes:
 *  - refreshTemplateStatus: before skipping a not-approved template, ask Meta.
 *  - applyTemplateStatusEvent: Meta's own status notice, from the webhook.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptToken } from "@/lib/integrations/crypto";
import { getMetaTemplateStatus } from "@/lib/integrations/whatsapp";

/** A burst of leads should cost one lookup, not one per lead. */
const RECHECK_AFTER_MS = 60_000;

/**
 * Meta's statuses as they arrive in the webhook's `event`. REINSTATED means
 * approved again; anything not listed is ignored rather than stored.
 */
const EVENT_TO_STATUS: Record<string, string> = {
  APPROVED: "APPROVED",
  REINSTATED: "APPROVED",
  REJECTED: "REJECTED",
  PENDING: "PENDING",
  IN_APPEAL: "IN_APPEAL",
  PAUSED: "PAUSED",
  DISABLED: "DISABLED",
  FLAGGED: "FLAGGED",
  PENDING_DELETION: "PENDING_DELETION",
};

export function statusFromEvent(event: unknown): string | null {
  return typeof event === "string" ? EVENT_TO_STATUS[event.toUpperCase()] || null : null;
}

/**
 * The template's status as Meta has it now, saved locally if it changed.
 * Falls back to the saved status when Meta cannot be reached; never throws.
 */
export async function refreshTemplateStatus(input: {
  companyId: string;
  wabaId: string | null;
  tokenEnc: string;
  name: string;
  language: string;
  saved: { status: string; updated_at: string | null };
}): Promise<string> {
  const { saved } = input;
  if (saved.status === "APPROVED" || !input.wabaId) return saved.status;
  if (saved.updated_at && Date.now() - new Date(saved.updated_at).getTime() < RECHECK_AFTER_MS) {
    return saved.status;
  }

  const save = (fields: { status?: string }) =>
    createAdminClient()
      .from("whatsapp_templates")
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq("company_id", input.companyId)
      .eq("name", input.name)
      .eq("language", input.language);

  try {
    const live = await getMetaTemplateStatus(
      input.wabaId,
      decryptToken(input.tokenEnc),
      input.name,
      input.language
    );
    if (!live || live === saved.status) {
      // Stamp the check so the next lead in this minute does not repeat it.
      await save({});
      return saved.status;
    }
    await save({ status: live });
    return live;
  } catch (err) {
    console.error("refreshTemplateStatus:", err instanceof Error ? err.message : err);
    return saved.status;
  }
}

/**
 * Apply a `message_template_status_update` notice. The webhook has already
 * checked Meta's signature; the entry id is the WhatsApp Business Account.
 */
export async function applyTemplateStatusEvent(
  wabaId: string,
  value: {
    event?: string;
    message_template_name?: string;
    message_template_language?: string;
    reason?: string | null;
  }
) {
  const status = statusFromEvent(value.event);
  const name = value.message_template_name;
  const language = value.message_template_language;
  if (!status || !name || !language || !wabaId) return;

  const admin = createAdminClient();
  const { data: conns } = await admin
    .from("whatsapp_connections")
    .select("company_id")
    .eq("waba_id", wabaId);
  for (const c of conns || []) {
    await admin
      .from("whatsapp_templates")
      .update({
        status,
        rejection_reason:
          status === "REJECTED" && value.reason && value.reason !== "NONE" ? value.reason : null,
        updated_at: new Date().toISOString(),
      })
      .eq("company_id", c.company_id)
      .eq("name", name)
      .eq("language", language);
  }
}
