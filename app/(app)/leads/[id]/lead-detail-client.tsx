"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateLeadStatus, addLeadActivity } from "./actions";
import { updateLeadAssignment } from "../actions";
import { updateTaskStatus } from "../../tasks/actions";
import { TaskDialog } from "@/components/tasks/task-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowLeft,
  Phone,
  Mail,
  Calendar,
  User,
  MessageSquare,
  PhoneCall,
  Send,
  FileText,
  RefreshCw,
  Loader2,
  UserCheck,
  Clock,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { format, formatDistanceToNow, isPast } from "date-fns";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Lead = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Activity = any;

interface Agent {
  id: string;
  name: string;
}

interface CurrentUser {
  id: string;
  company_id: string;
  role: string;
}

const STATUS_OPTIONS = [
  "New",
  "Contacted",
  "Interested",
  "Not Interested",
  "Follow Up",
  "Site Visit Scheduled",
  "Site Visit Done",
  "Negotiation",
  "Booking Done",
  "Lost",
];

const ACTIVITY_TYPES = [
  { value: "CALL", label: "Call", icon: PhoneCall },
  { value: "NOTE", label: "Note", icon: FileText },
  { value: "EMAIL", label: "Email", icon: Send },
  { value: "WHATSAPP", label: "WhatsApp", icon: MessageSquare },
];

const ACTIVITY_ICONS: Record<string, typeof Phone> = {
  CALL: PhoneCall,
  NOTE: FileText,
  EMAIL: Send,
  WHATSAPP: MessageSquare,
  STAGE_CHANGE: RefreshCw,
  ASSIGNMENT: UserCheck,
  TASK_CREATED: Calendar,
  TASK_COMPLETED: Calendar,
  SYSTEM: Clock,
};

interface LeadDetailClientProps {
  lead: Lead;
  currentUser: CurrentUser;
  activities: Activity[];
  agents: Agent[];
  tasks: any[];
}

export function LeadDetailClient({
  lead,
  currentUser,
  activities: initialActivities,
  agents,
  tasks: initialTasks,
}: LeadDetailClientProps) {
  const router = useRouter();

  // Permission checks
  const isAssigned = lead.assigned_to_id === currentUser.id;
  const isSuperAdmin = currentUser.role === "SUPER_ADMIN";
  const canEdit = isAssigned || isSuperAdmin;

  // Status form
  const [status1, setStatus1] = useState(lead.status_1 || "");
  const [status1Remark, setStatus1Remark] = useState(lead.status_1_remark || "");
  const [status2, setStatus2] = useState(lead.status_2 || "");
  const [status2Remark, setStatus2Remark] = useState(lead.status_2_remark || "");
  const [savingStatus, setSavingStatus] = useState(false);

  // Activity form
  const [activityType, setActivityType] = useState("CALL");
  const [activityDesc, setActivityDesc] = useState("");
  const [savingActivity, setSavingActivity] = useState(false);
  const [activities, setActivities] = useState<Activity[]>(initialActivities);
  
  // Tasks state
  const [tasks, setTasks] = useState<any[]>(initialTasks);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [completingTask, setCompletingTask] = useState<string | null>(null);

  useEffect(() => {
    setActivities(initialActivities);
  }, [initialActivities]);

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  // Reassign
  const [reassigning, setReassigning] = useState(false);

  async function handleSaveStatus() {
    setSavingStatus(true);
    try {
      const result = await updateLeadStatus(lead.id, {
        status_1: status1 || undefined,
        status_1_remark: status1Remark || undefined,
        status_2: status2 || undefined,
        status_2_remark: status2Remark || undefined,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Status updated successfully");
        router.refresh();
      }
    } catch {
      toast.error("Failed to update status");
    } finally {
      setSavingStatus(false);
    }
  }

  async function handleAddActivity() {
    if (!activityDesc.trim()) {
      toast.error("Please enter a description");
      return;
    }
    setSavingActivity(true);
    try {
      const result = await addLeadActivity(lead.id, activityType, activityDesc.trim());
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Activity logged");
        // Optimistic update
        setActivities((prev) => [
          {
            id: crypto.randomUUID(),
            type: activityType,
            description: activityDesc.trim(),
            created_at: new Date().toISOString(),
            actor: { id: currentUser.id, name: "You" },
          },
          ...prev,
        ]);
        setActivityDesc("");
      }
    } catch {
      toast.error("Failed to log activity");
    } finally {
      setSavingActivity(false);
    }
  }

  async function handleReassign(agentId: string) {
    setReassigning(true);
    try {
      const result = await updateLeadAssignment(lead.id, agentId === "unassigned" ? null : agentId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Lead reassigned");
        router.refresh();
      }
    } catch {
      toast.error("Failed to reassign");
    } finally {
      setReassigning(false);
    }
  }

  async function handleCompleteTask(taskId: string) {
    setCompletingTask(taskId);
    try {
      const result = await updateTaskStatus(taskId, "COMPLETED");
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Task completed");
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: "COMPLETED" } : t))
        );
        router.refresh();
      }
    } catch {
      toast.error("Failed to complete task");
    } finally {
      setCompletingTask(null);
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Back + Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/leads"
            className="p-2 rounded-md hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{lead.name}</h1>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              {lead.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" /> {lead.phone}
                </span>
              )}
              {lead.email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" /> {lead.email}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(lead.created_at), "MMM d, yyyy")}
              </span>
            </div>
          </div>
        </div>

        {/* Stage badge */}
        {lead.pipeline_stages && (
          <Badge
            variant="outline"
            style={{
              borderColor: lead.pipeline_stages.color,
              color: lead.pipeline_stages.color,
            }}
          >
            {lead.pipeline_stages.name}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left Column: Lead Info + Status ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Lead Info Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Lead Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Source</span>
                  <p className="font-medium mt-0.5">
                    {lead.source?.replace(/_/g, " ") || "—"}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Project</span>
                  <p className="font-medium mt-0.5">
                    {lead.projects?.name || "—"}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Assigned To</span>
                  <p className="font-medium mt-0.5 flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {lead.assigned_user?.name || "Unassigned"}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Budget</span>
                  <p className="font-medium mt-0.5">
                    {lead.budget_min || lead.budget_max
                      ? `₹${lead.budget_min || "—"} – ₹${lead.budget_max || "—"}`
                      : "—"}
                  </p>
                </div>
                {lead.bhk_preference && (
                  <div>
                    <span className="text-muted-foreground">BHK</span>
                    <p className="font-medium mt-0.5">{lead.bhk_preference}</p>
                  </div>
                )}
                {lead.location_preference && (
                  <div>
                    <span className="text-muted-foreground">Location Pref</span>
                    <p className="font-medium mt-0.5">{lead.location_preference}</p>
                  </div>
                )}
              </div>
              {lead.notes && (
                <div className="mt-4 pt-4 border-t">
                  <span className="text-sm text-muted-foreground">Notes</span>
                  <p className="text-sm mt-1">{lead.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status Update Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Lead Status</CardTitle>
              <CardDescription>
                {canEdit
                  ? "Update status and add remarks"
                  : "Only the assigned agent or Super Admin can update status"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Status 1 */}
                <div className="space-y-2">
                  <Label>Status 1</Label>
                  <select
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    value={status1}
                    onChange={(e) => setStatus1(e.target.value)}
                    disabled={!canEdit}
                  >
                    <option value="">Select status...</option>
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <Textarea
                    placeholder="Remark for Status 1..."
                    value={status1Remark}
                    onChange={(e) => setStatus1Remark(e.target.value)}
                    disabled={!canEdit}
                    className="min-h-[60px] text-sm"
                  />
                </div>

                {/* Status 2 */}
                <div className="space-y-2">
                  <Label>Status 2</Label>
                  <select
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    value={status2}
                    onChange={(e) => setStatus2(e.target.value)}
                    disabled={!canEdit}
                  >
                    <option value="">Select status...</option>
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <Textarea
                    placeholder="Remark for Status 2..."
                    value={status2Remark}
                    onChange={(e) => setStatus2Remark(e.target.value)}
                    disabled={!canEdit}
                    className="min-h-[60px] text-sm"
                  />
                </div>
              </div>

              {canEdit && (
                <div className="flex justify-end">
                  <Button onClick={handleSaveStatus} disabled={savingStatus}>
                    {savingStatus && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Save Status
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Add Activity Card */}
          {canEdit && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Log Activity</CardTitle>
                <CardDescription>
                  Record a call, note, email, or WhatsApp interaction
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  {ACTIVITY_TYPES.map((t) => {
                    const Icon = t.icon;
                    return (
                      <button
                        key={t.value}
                        onClick={() => setActivityType(t.value)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                          activityType === t.value
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        <Icon className="h-3 w-3" />
                        {t.label}
                      </button>
                    );
                  })}
                </div>
                <Textarea
                  placeholder="What happened? Describe the interaction..."
                  value={activityDesc}
                  onChange={(e) => setActivityDesc(e.target.value)}
                  className="min-h-[80px]"
                />
                <div className="flex justify-end">
                  <Button
                    onClick={handleAddActivity}
                    disabled={savingActivity}
                    size="sm"
                  >
                    {savingActivity && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Log Activity
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── Right Column: Reassign + Tasks + Timeline ── */}
        <div className="space-y-6">
          {/* Reassign Card (SUPER_ADMIN only) */}
          {isSuperAdmin && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Reassign Lead</CardTitle>
              </CardHeader>
              <CardContent>
                <select
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={lead.assigned_to_id || "unassigned"}
                  onChange={(e) => handleReassign(e.target.value)}
                  disabled={reassigning}
                >
                  <option value="unassigned">Unassigned</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
                {reassigning && (
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> Reassigning...
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Tasks Card */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base">Tasks</CardTitle>
                <CardDescription>Scheduled follow-ups</CardDescription>
              </div>
              {canEdit && (
                <Button size="sm" variant="outline" onClick={() => setShowTaskDialog(true)}>
                  Add Task
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {tasks.filter(t => t.status === 'PENDING').length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No pending tasks
                </p>
              ) : (
                <div className="space-y-3">
                  {tasks.filter(t => t.status === 'PENDING').map((task) => {
                    const isOverdue = isPast(new Date(task.due_at));
                    return (
                      <div key={task.id} className={`p-3 rounded-lg border text-sm ${isOverdue ? 'border-red-200 bg-red-50/50' : 'bg-muted/30'}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{task.type}</span>
                              {isOverdue && (
                                <Badge variant="destructive" className="text-[10px] h-4 px-1 uppercase">Overdue</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(task.due_at), "MMM d, h:mm a")}
                            </p>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            disabled={completingTask === task.id}
                            onClick={() => handleCompleteTask(task.id)}
                          >
                            {completingTask === task.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        {task.notes && (
                          <p className="text-xs text-muted-foreground mt-2 italic line-clamp-2">
                            "{task.notes}"
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity Timeline */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Activity History</CardTitle>
              <CardDescription>
                {activities.length} {activities.length === 1 ? "entry" : "entries"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No activity yet
                </p>
              ) : (
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />

                  <div className="space-y-4">
                    {activities.map((activity) => {
                      const Icon =
                        ACTIVITY_ICONS[activity.type] || ACTIVITY_ICONS.SYSTEM;
                      return (
                        <div key={activity.id} className="flex gap-3 relative">
                          <div className="relative z-10 flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0 pt-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium">
                                {activity.actor?.name || "System"}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {formatDistanceToNow(
                                  new Date(activity.created_at),
                                  { addSuffix: true }
                                )}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-0.5 break-words">
                              {activity.description}
                            </p>
                            <Badge
                              variant="secondary"
                              className="text-[10px] mt-1"
                            >
                              {activity.type?.replace(/_/g, " ")}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <TaskDialog
          open={showTaskDialog}
          onOpenChange={setShowTaskDialog}
          leadId={lead.id}
          leadName={lead.name}
        />
      </div>
    </div>
  );
}
