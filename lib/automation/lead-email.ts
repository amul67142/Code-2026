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
import { projectAllowsAutoMessaging } from "@/lib/automation/project-messaging";

export interface LeadEmailInput {
  companyId: string;
  leadId: string;
  leadName: string | null;
  leadEmail: string | null;
  projectId?: string | null;
  isAuto?: boolean; // true = automated on lead creation, false = manual resend
}

export interface LeadEmailResult {
  status:
    | "SENT"
    | "FAILED"
    | "SKIPPED_NO_EMAIL"
    | "SKIPPED_PROJECT_OPTED_OUT"
    | "SKIPPED_SYNTHETIC_EMAIL";
  providerId?: string;
  error?: string;
}

/**
 * Does the lead row say BigLead generated this address?
 *
 * The stored flag is the ONLY way to know. Synthesized addresses sit on
 * gmail.com, so they are indistinguishable from a real lead's own address —
 * see the note in lib/leads/portal-email.ts.
 *
 * Fails CLOSED, unlike projectAllowsAutoMessaging: if we cannot read the flag
 * we decline to send. Mailing a stranger is worse than a lead missing their
 * acknowledgment, and a lookup only fails while migration 026 is pending — in
 * which case no row is flagged and no address was swapped anyway.
 */
async function emailIsSynthetic(
  admin: ReturnType<typeof createAdminClient>,
  leadId: string
): Promise<boolean> {
  const { data, error } = await admin
    .from("leads")
    .select("email_is_synthetic")
    .eq("id", leadId)
    .maybeSingle();

  if (error) {
    if (/email_is_synthetic/.test(error.message || "")) return false; // column not there yet
    console.error("emailIsSynthetic: lookup failed (not sending):", error.message);
    return true;
  }
  return (data as { email_is_synthetic?: boolean | null } | null)?.email_is_synthetic === true;
}

export async function sendLeadAcknowledgmentEmail(
  input: LeadEmailInput
): Promise<LeadEmailResult> {
  const admin = createAdminClient();

  if (!input.leadEmail) {
    return { status: "SKIPPED_NO_EMAIL" };
  }

  // Never mail an address we invented (see lib/leads/portal-email.ts). This
  // blocks the manual resend too, not just automatic sends — the address does
  // not belong to the lead, so there is no one on the other end, and on a
  // real-looking domain there may be an unrelated person.
  if (await emailIsSynthetic(admin, input.leadId)) {
    return { status: "SKIPPED_SYNTHETIC_EMAIL" };
  }

  // Per-project switch (mig 024): automatic sends only when the project allows.
  if (input.isAuto !== false && !(await projectAllowsAutoMessaging(input.projectId))) {
    return { status: "SKIPPED_PROJECT_OPTED_OUT" };
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
