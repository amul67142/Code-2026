import { getMyAssignedLeads } from "./actions";
import { MyLeadsClient } from "./my-leads-client";

export const metadata = {
  title: "My Leads | RealLeads CRM",
};

export default async function MyLeadsPage() {
  const leads = await getMyAssignedLeads();

  return <MyLeadsClient initialLeads={leads} />;
}
