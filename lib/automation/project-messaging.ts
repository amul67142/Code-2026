/**
 * Per-project gate for automatic lead messaging (migration 024).
 *
 * Called by the email and WhatsApp welcome senders before any AUTO send.
 * Returns true when messaging is allowed:
 *   - no project on the lead            → true (company default behaviour)
 *   - project.auto_message_leads = true → true
 *   - project.auto_message_leads = false→ false (project opted out)
 *   - column missing (mig 024 not run)  → true (fail open, never silently
 *                                          stop welcomes because of a
 *                                          pending migration)
 */
import { createAdminClient } from "@/lib/supabase/admin";

export async function projectAllowsAutoMessaging(
  projectId: string | null | undefined
): Promise<boolean> {
  if (!projectId) return true;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("projects")
    .select("auto_message_leads")
    .eq("id", projectId)
    .maybeSingle();

  if (error) {
    // Most likely the column does not exist yet — fail open.
    console.warn("projectAllowsAutoMessaging: lookup failed (fail-open):", error.message);
    return true;
  }

  const flag = (data as { auto_message_leads?: boolean | null } | null)?.auto_message_leads;
  return flag !== false;
}
