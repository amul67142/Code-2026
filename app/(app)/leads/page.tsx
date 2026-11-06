import { getLeads, getAgentsForAssignment } from "./actions";
import { getStages } from "../settings/pipeline/actions";
import { getProjects } from "../projects/actions";
import LeadsClient from "./leads-client";

export const metadata = {
  title: "Leads | Big Lead CRM",
};

/**
 * Leads page — Server Component.
 * Fetches data on the server so the page renders instantly.
 */
export default async function LeadsPage() {
  const [leads, stages, agents, projects] = await Promise.all([
    getLeads(),
    getStages(),
    getAgentsForAssignment(),
    // Only the CSV import needs this, so a failure must not take the page down.
    getProjects().catch(() => []),
  ]);

  return (
    <LeadsClient
      initialLeads={leads}
      initialStages={stages}
      initialAgents={agents}
      projects={projects.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name }))}
    />
  );
}
