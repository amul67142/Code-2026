import { getTasks, getMyLeads } from "./actions";
import { TasksClient } from "./tasks-client";

export default async function TasksPage() {
  const [initialTasks, leads] = await Promise.all([
    getTasks(),
    getMyLeads(),
  ]);
  
  return <TasksClient initialTasks={initialTasks} leads={leads} />;
}
