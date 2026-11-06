/**
 * Email the agent that a lead is theirs, alongside the WhatsApp alert.
 *
 * Not written to message_log: the lead page reads the latest EMAIL row there as
 * the status of the email sent TO THE LEAD, and this one went to the agent.
 * The lead's timeline records it instead.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { sendNewLeadEmail } from "@/lib/email";
import { getURL } from "@/lib/utils";
import { sendAgentLeadAlert } from "@/lib/automation/agent-lead-alert";

interface AgentLeadInput {
  companyId: string;
  leadId: string;
  agentUserId: string;
}

export async function sendAgentLeadEmail(input: AgentLeadInput) {
  const admin = createAdminClient();
  const [{ data: agent }, { data: lead }] = await Promise.all([
    admin
      .from("users")
      .select("name, email")
      .eq("id", input.agentUserId)
      .eq("company_id", input.companyId)
      .maybeSingle(),
    admin
      .from("leads")
      .select("id, name, phone, source")
      .eq("id", input.leadId)
      .eq("company_id", input.companyId)
      .maybeSingle(),
  ]);
  if (!agent?.email || !lead) return;

  const res = await sendNewLeadEmail(
    agent.email,
    agent.name || "there",
    lead.name || "New lead",
    lead.phone || "",
    (lead.source || "").replace(/_/g, " "),
    `${getURL()}/leads/${lead.id}`,
    lead.id
  );

  await admin.from("activities").insert({
    lead_id: input.leadId,
    user_id: null,
    type: "NOTE",
    description: res.success
      ? `Emailed ${agent.name} about this lead`
      : `Email to ${agent.name} about this lead failed`,
    metadata: { channel: "EMAIL", recipient: "AGENT", agent_id: input.agentUserId },
  });
}

/**
 * Tell an agent about a lead on every channel. Never throws: an assignment must
 * not fail because a notification could not be delivered.
 */
export async function alertAgentAboutLead(input: AgentLeadInput) {
  await Promise.all([
    sendAgentLeadAlert(input).catch((e) => console.error("agent WhatsApp alert failed:", e)),
    sendAgentLeadEmail(input).catch((e) => console.error("agent email failed:", e)),
  ]);
}
