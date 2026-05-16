"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TaskDialog } from "@/components/tasks/task-dialog";
import {
  Phone,
  Mail,
  MessageSquare,
  Calendar,
  CheckCircle2,
  Clock,
  MoreVertical,
  ExternalLink,
  User,
  Plus,
} from "lucide-react";
import { format, isPast, isToday, isTomorrow } from "date-fns";
import { updateTaskStatus } from "./actions";
import { toast } from "sonner";
import Link from "next/link";

interface Task {
  id: string;
  lead_id: string;
  type: string;
  due_at: string;
  notes: string | null;
  status: string;
  lead: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
  } | null;
  assigned_to: {
    id: string;
    name: string;
  } | null;
}

interface TasksClientProps {
  initialTasks: Task[];
  leads: { id: string; name: string }[];
}

export function TasksClient({ initialTasks, leads }: TasksClientProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [loading, setLoading] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  const pendingTasks = tasks.filter(
    (t) => t.status === "PENDING" && !isPast(new Date(t.due_at))
  );
  const overdueTasks = tasks.filter(
    (t) => t.status === "PENDING" && isPast(new Date(t.due_at))
  );
  const completedTasks = tasks.filter((t) => t.status === "COMPLETED");

  async function handleComplete(taskId: string) {
    setLoading(taskId);
    try {
      const result = await updateTaskStatus(taskId, "COMPLETED");
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Task completed");
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId ? { ...t, status: "COMPLETED" } : t
          )
        );
      }
    } catch (error) {
      toast.error("Failed to complete task");
    } finally {
      setLoading(null);
    }
  }

  const TaskCard = ({ task }: { task: Task }) => {
    const isOverdue = task.status === "PENDING" && isPast(new Date(task.due_at));
    const dueTime = new Date(task.due_at);
    
    let dueText = format(dueTime, "MMM d, h:mm a");
    if (isToday(dueTime)) dueText = `Today, ${format(dueTime, "h:mm a")}`;
    if (isTomorrow(dueTime)) dueText = `Tomorrow, ${format(dueTime, "h:mm a")}`;

    const Icon = {
      CALL: Phone,
      EMAIL: Mail,
      WHATSAPP: MessageSquare,
      SITE_VISIT: Calendar,
      OTHER: MoreVertical,
    }[task.type] || MoreVertical;

    return (
      <Card key={task.id} className={isOverdue ? "border-red-200 bg-red-50/30" : ""}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${isOverdue ? "bg-red-100 text-red-600" : "bg-primary/10 text-primary"}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Link 
                    href={`/leads/${task.lead?.id}`}
                    className="font-semibold text-sm hover:underline flex items-center gap-1"
                  >
                    {task.lead?.name || "Unknown Lead"}
                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                  </Link>
                  {isOverdue && (
                    <Badge variant="destructive" className="text-[10px] h-4 px-1.5 uppercase font-bold">
                      Overdue
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {dueText}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {task.assigned_to?.name || "Unassigned"}
                  </span>
                </div>
                {task.notes && (
                  <p className="mt-2 text-sm text-gray-600 line-clamp-2 italic">
                    "{task.notes}"
                  </p>
                )}
              </div>
            </div>
            
            {task.status === "PENDING" && (
              <Button
                size="sm"
                variant={isOverdue ? "destructive" : "outline"}
                className="h-8"
                onClick={() => handleComplete(task.id)}
                disabled={loading === task.id}
              >
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                Done
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground">
            Manage your daily follow-ups and activities.
          </p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Task
        </Button>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="pending" className="relative">
            Pending
            {pendingTasks.length > 0 && (
              <Badge variant="secondary" className="ml-2 px-1.5 py-0 h-4 min-w-4 text-[10px]">
                {pendingTasks.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="overdue">
            Overdue
            {overdueTasks.length > 0 && (
              <Badge variant="destructive" className="ml-2 px-1.5 py-0 h-4 min-w-4 text-[10px]">
                {overdueTasks.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6 space-y-4">
          {pendingTasks.length === 0 ? (
            <EmptyState message="No pending tasks. You're all caught up!" />
          ) : (
            pendingTasks.map((t) => <TaskCard key={t.id} task={t} />)
          )}
        </TabsContent>

        <TabsContent value="overdue" className="mt-6 space-y-4">
          {overdueTasks.length === 0 ? (
            <EmptyState message="Great! No overdue tasks." />
          ) : (
            overdueTasks.map((t) => <TaskCard key={t.id} task={t} />)
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-6 space-y-4">
          {completedTasks.length === 0 ? (
            <EmptyState message="No completed tasks yet." />
          ) : (
            completedTasks.map((t) => <TaskCard key={t.id} task={t} />)
          )}
        </TabsContent>
      </Tabs>

      <TaskDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        leads={leads}
      />
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl bg-muted/20">
      <CheckCircle2 className="h-10 w-10 text-muted-foreground mb-4 opacity-20" />
      <p className="text-muted-foreground font-medium">{message}</p>
    </div>
  );
}
