import { getLeadDetail, getLeadActivities, getAgentsForReassignment, getLeadEmailStatus } from "./actions";
import { getLeadTasks } from "@/app/(app)/tasks/actions";
import { LeadDetailClient } from "./lead-detail-client";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const result = await getLeadDetail(id);
  return {
    title: result?.lead?.name
      ? `${result.lead.name} | Big Lead CRM`
      : "Lead Detail | Big Lead CRM",
  };
}

export default async function LeadDetailPage({ params }: Props) {
  const { id } = await params;
  const [result, activities, agents, tasks, emailStatus] = await Promise.all([
    getLeadDetail(id),
    getLeadActivities(id),
    getAgentsForReassignment(),
    getLeadTasks(id),
    getLeadEmailStatus(id),
  ]);

  if (!result) notFound();

  return (
    <LeadDetailClient
      lead={result.lead}
      currentUser={result.currentUser}
      activities={activities}
      agents={agents}
      tasks={tasks}
      emailStatus={emailStatus}
    />
  );
}
