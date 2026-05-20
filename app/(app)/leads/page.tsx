import { getLeads, getAgentsForAssignment } from "./actions";
import { getStages } from "../settings/pipeline/actions";
import LeadsClient from "./leads-client";

export const metadata = {
  title: "Leads | Big Lead CRM",
};

/**
 * Leads page — Server Component.
 * Fetches data on the server so the page renders instantly.
 */
export default async function LeadsPage() {
  const [leads, stages, agents] = await Promise.all([getLeads(), getStages(), getAgentsForAssignment()]);

  return <LeadsClient initialLeads={leads} initialStages={stages} initialAgents={agents} />;
}
