import { getTasks } from "./actions";
import { TasksClient } from "./tasks-client";

export default async function TasksPage() {
  const initialTasks = await getTasks();
  
  return <TasksClient initialTasks={initialTasks} />;
}
