import { getLeads } from "./actions";
import { getStages } from "../settings/pipeline/actions";
import LeadsClient from "./leads-client";

export const metadata = {
  title: "Leads | RealLeads CRM",
};

/**
 * Leads page — Server Component.
 * Fetches data on the server so the page renders instantly.
 */
export default async function LeadsPage() {
  const [leads, stages] = await Promise.all([getLeads(), getStages()]);

  return <LeadsClient initialLeads={leads} initialStages={stages} />;
}
