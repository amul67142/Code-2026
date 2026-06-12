/**
 * Lead acknowledgment email — sent automatically to a lead (the prospect)
 * the moment they enter the CRM. Logs every send to `message_log` so the
 * lead detail page and Reports can show delivery status.
 *
 * Runs server-side with the service-role admin client.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/sender";
import { getLeadAcknowledgmentEmailHtml } from "@/lib/email/templates";

export interface LeadEmailInput {
  companyId: string;
  leadId: string;
  leadName: string | null;
  leadEmail: string | null;
  projectId?: string | null;
  isAuto?: boolean; // true = automated on lead creation, false = manual resend
}

export interface LeadEmailResult {
  status: "SENT" | "FAILED" | "SKIPPED_NO_EMAIL";
  providerId?: string;
  error?: string;
}

export async function sendLeadAcknowledgmentEmail(
  input: LeadEmailInput
): Promise<LeadEmailResult> {
  const admin = createAdminClient();

  if (!input.leadEmail) {
    return { status: "SKIPPED_NO_EMAIL" };
  }

  // Resolve company + project names for personalization.
  const [{ data: company }, projectRes] = await Promise.all([
    admin.from("companies").select("name").eq("id", input.companyId).maybeSingle(),
    input.projectId
      ? admin.from("projects").select("name").eq("id", input.projectId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const companyName = company?.name || "Our Team";
  const projectName = (projectRes?.data as { name?: string } | null)?.name || undefined;
  const leadName = input.leadName || "there";

  const subject = projectName
    ? `Thanks for your interest in ${projectName}!`
    : `Thanks for reaching out, ${leadName}!`;
  const html = getLeadAcknowledgmentEmailHtml(leadName, companyName, projectName);

  const res = await sendEmail({ to: input.leadEmail, subject, html });
  const ok = res.success === true;

  // Log to message_log (drives the per-lead status + Reports analytics).
  await admin.from("message_log").insert({
    company_id: input.companyId,
    lead_id: input.leadId,
    channel: "EMAIL",
    direction: "OUTBOUND",
    to_address: input.leadEmail,
    subject,
    status: ok ? "SENT" : "FAILED",
    provider_id: ok ? (res as { id?: string }).id || null : null,
    error_message: ok ? null : (res as { error?: string }).error || "Unknown send error",
    is_auto: input.isAuto !== false,
  });

  // Timeline activity on the lead.
  await admin.from("activities").insert({
    lead_id: input.leadId,
    user_id: null,
    type: "EMAIL",
    description: ok
      ? `${input.isAuto !== false ? "Auto-email" : "Email"} sent to ${input.leadEmail}`
      : `Email to ${input.leadEmail} failed`,
    metadata: { channel: "EMAIL", auto: input.isAuto !== false },
  });

  return ok
    ? { status: "SENT", providerId: (res as { id?: string }).id }
    : { status: "FAILED", error: (res as { error?: string }).error };
}
