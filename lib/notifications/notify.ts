/**
 * System-generated lead notifications.
 *
 * Delivered live via Supabase Realtime → the assigned agent's notification bell
 * (chime + toast). Uses the admin (service-role) client because notifications
 * are system events and may target a different user than the actor — RLS blocks
 * cross-user inserts from the anon client.
 */
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Notify the agent assigned to a lead that its pipeline stage changed
 * (manual kanban move, stage dropdown, detail edit, or automation).
 */
export async function notifyLeadStageChange(params: {
  leadId: string;
  companyId: string;
  newStageId: string;
  /** Who made the change. Pass to skip notifying the agent about their own action. */
  actorUserId?: string;
  skipSelf?: boolean;
}) {
  try {
    const admin = createAdminClient();

    const { data: lead } = await admin
      .from("leads")
      .select("id, name, assigned_to_id")
      .eq("id", params.leadId)
      .maybeSingle();

    if (!lead?.assigned_to_id) return; // nobody assigned → nobody to notify
    if (params.skipSelf && lead.assigned_to_id === params.actorUserId) return;

    const { data: stage } = await admin
      .from("pipeline_stages")
      .select("name")
      .eq("id", params.newStageId)
      .maybeSingle();

    const leadName = lead.name || "A lead";
    const stageName = stage?.name || "a new stage";

    await admin.from("notifications").insert({
      company_id: params.companyId,
      user_id: lead.assigned_to_id,
      title: `📊 ${leadName} → ${stageName}`,
      message: `Your assigned lead ${leadName} moved to "${stageName}".`,
      type: "LEAD_STAGE_CHANGE",
      metadata: { lead_id: lead.id, stage_id: params.newStageId },
    });
  } catch (e) {
    console.error("notifyLeadStageChange failed (non-fatal):", e);
  }
}

/** Notify an agent that a lead was assigned to them. */
export async function notifyLeadAssigned(params: {
  leadId: string;
  companyId: string;
  assignedToId: string;
  actorUserId?: string;
  leadName?: string | null;
}) {
  try {
    if (!params.assignedToId) return;
    if (params.assignedToId === params.actorUserId) return; // assigned it to yourself
    const admin = createAdminClient();

    let leadName = params.leadName;
    if (leadName === undefined) {
      const { data } = await admin
        .from("leads")
        .select("name")
        .eq("id", params.leadId)
        .maybeSingle();
      leadName = data?.name;
    }
    const nm = leadName || "A lead";

    await admin.from("notifications").insert({
      company_id: params.companyId,
      user_id: params.assignedToId,
      title: `👤 New lead assigned: ${nm}`,
      message: `${nm} has been assigned to you.`,
      type: "LEAD_ASSIGNED",
      metadata: { lead_id: params.leadId },
    });
  } catch (e) {
    console.error("notifyLeadAssigned failed (non-fatal):", e);
  }
}

/** Notify the assigned agent that a lead's qualification changed. */
export async function notifyLeadQualification(params: {
  leadId: string;
  companyId: string;
  isQualified: boolean;
}) {
  try {
    const admin = createAdminClient();
    const { data: lead } = await admin
      .from("leads")
      .select("name, assigned_to_id")
      .eq("id", params.leadId)
      .maybeSingle();
    if (!lead?.assigned_to_id) return;
    const nm = lead.name || "A lead";

    await admin.from("notifications").insert({
      company_id: params.companyId,
      user_id: lead.assigned_to_id,
      title: params.isQualified ? `✅ ${nm} marked qualified` : `${nm} marked not qualified`,
      message: `Your assigned lead ${nm} was marked ${
        params.isQualified ? "qualified" : "not qualified"
      }.`,
      type: "LEAD_QUALIFICATION",
      metadata: { lead_id: params.leadId },
    });
  } catch (e) {
    console.error("notifyLeadQualification failed (non-fatal):", e);
  }
}
