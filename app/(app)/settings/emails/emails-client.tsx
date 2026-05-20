"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eye, Mail } from "lucide-react";

// Import all our HTML generator functions
import {
  getWelcomeEmailHtml,
  getInviteEmailHtml,
  getNewLeadEmailHtml,
  getTaskReminderEmailHtml,
  getTaskOverdueEmailHtml,
  getDailyDigestEmailHtml,
  getStageChangeEmailHtml,
  getPasswordResetEmailHtml,
  getTrialExpiryEmailHtml,
  getWeeklyReportEmailHtml,
} from "@/lib/email";

type TemplateInfo = {
  id: string;
  name: string;
  description: string;
  category: "User" | "Leads" | "Tasks" | "System";
  generateHtml: () => string;
};

// Mock data for previews
const mockData = {
  userName: "Alex Morgan",
  companyName: "Acme Corp",
  agentName: "Sarah Connor",
  leadName: "John Doe",
  leadPhone: "+1 (555) 123-4567",
  source: "Google Ads",
  taskType: "Follow-up Call",
  dueAt: "Today at 2:00 PM",
  overdueCount: 3,
  oldStage: "New",
  newStage: "Contacted",
  url: "https://biglead.site/dummy-link",
  dailyStats: { newLeads: 5, tasksDue: 12, overdueCount: 2 },
  weeklyStats: { totalLeads: 45, newLeads: 14, leadsWon: 3, leadsLost: 1, tasksCompleted: 28 },
  daysLeft: 3,
};

const templates: TemplateInfo[] = [
  {
    id: "welcome",
    name: "Welcome Email",
    description: "Sent to users when they first sign up.",
    category: "User",
    generateHtml: () => getWelcomeEmailHtml(mockData.userName),
  },
  {
    id: "invite",
    name: "Team Invite",
    description: "Sent when an admin invites a new team member.",
    category: "User",
    generateHtml: () => getInviteEmailHtml(mockData.userName, mockData.companyName, mockData.url),
  },
  {
    id: "password-reset",
    name: "Password Reset",
    description: "Sent when a user requests a password reset link.",
    category: "User",
    generateHtml: () => getPasswordResetEmailHtml(mockData.userName, mockData.url),
  },
  {
    id: "new-lead",
    name: "New Lead Assigned",
    description: "Alerts an agent when a new lead is assigned to them.",
    category: "Leads",
    generateHtml: () => getNewLeadEmailHtml(mockData.agentName, mockData.leadName, mockData.leadPhone, mockData.source, mockData.url),
  },
  {
    id: "stage-change",
    name: "Stage Change",
    description: "Notifies when a lead moves to a different pipeline stage.",
    category: "Leads",
    generateHtml: () => getStageChangeEmailHtml(mockData.agentName, mockData.leadName, mockData.oldStage, mockData.newStage, mockData.url),
  },
  {
    id: "task-reminder",
    name: "Task Reminder",
    description: "Reminds an agent about an upcoming task.",
    category: "Tasks",
    generateHtml: () => getTaskReminderEmailHtml(mockData.agentName, mockData.taskType, mockData.leadName, mockData.dueAt, mockData.url),
  },
  {
    id: "task-overdue",
    name: "Task Overdue",
    description: "Alerts an agent when they have overdue tasks.",
    category: "Tasks",
    generateHtml: () => getTaskOverdueEmailHtml(mockData.agentName, mockData.overdueCount),
  },
  {
    id: "daily-digest",
    name: "Daily Digest",
    description: "Morning summary of new leads and tasks for the day.",
    category: "System",
    generateHtml: () => getDailyDigestEmailHtml(mockData.userName, mockData.dailyStats),
  },
  {
    id: "weekly-report",
    name: "Weekly Report",
    description: "Weekly roundup of performance metrics.",
    category: "System",
    generateHtml: () => getWeeklyReportEmailHtml(mockData.userName, mockData.weeklyStats),
  },
  {
    id: "trial-expiry",
    name: "Trial Expiry",
    description: "Warning sent before the free trial expires.",
    category: "System",
    generateHtml: () => getTrialExpiryEmailHtml(mockData.userName, mockData.daysLeft),
  },
];

const categoryColors: Record<string, string> = {
  User: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  Leads: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
  Tasks: "bg-orange-100 text-orange-700 hover:bg-orange-100",
  System: "bg-purple-100 text-purple-700 hover:bg-purple-100",
};

export default function EmailsClient() {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateInfo | null>(null);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((tpl) => (
          <Card key={tpl.id} className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="rounded-md bg-primary/10 p-2 text-primary">
                  <Mail className="size-5" />
                </div>
                <Badge variant="secondary" className={categoryColors[tpl.category]}>
                  {tpl.category}
                </Badge>
              </div>
              <CardTitle className="mt-4 text-base">{tpl.name}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between gap-4">
              <CardDescription>{tpl.description}</CardDescription>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setSelectedTemplate(tpl)}
              >
                <Eye className="mr-2 size-4" />
                Preview Template
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!selectedTemplate} onOpenChange={(open) => !open && setSelectedTemplate(null)}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4 bg-muted/30 border-b">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={selectedTemplate ? categoryColors[selectedTemplate.category] : ""}>
                {selectedTemplate?.category}
              </Badge>
              <DialogTitle>{selectedTemplate?.name}</DialogTitle>
            </div>
            <DialogDescription>
              {selectedTemplate?.description}
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted p-4 md:p-8">
            {selectedTemplate && (
              <div className="bg-white rounded-lg shadow-sm border overflow-hidden h-[500px]">
                <iframe
                  srcDoc={selectedTemplate.generateHtml()}
                  title={selectedTemplate.name}
                  className="w-full h-full border-0"
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
