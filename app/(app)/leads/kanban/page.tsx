import { getLeadsGrouped } from "../actions";
import KanbanClient from "./kanban-client";

export const metadata = {
  title: "Kanban Board | Big Lead CRM",
};

/**
 * Kanban page — Server Component.
 * Fetches data on the server so the page renders instantly.
 */
export default async function KanbanPage() {
  const data = await getLeadsGrouped();

  return <KanbanClient initialStages={data.stages as any[]} initialLeads={data.leads} />;
}
