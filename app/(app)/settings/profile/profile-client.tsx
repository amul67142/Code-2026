"use client";

import { useState } from "react";
import { useUser, ROLE_LABELS, hasMinRole } from "@/lib/user-context";
import { updateMyName } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { updateLeadStatus } from "../../leads/[id]/actions";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import {
  Building2,
  Shield,
  Mail,
  User,
  Check,
  X,
  Loader2,
  LayoutDashboard,
  Users,
  KanbanSquare,
  CheckSquare,
  BarChart3,
  Settings,
  CreditCard,
  Plug,
  GitBranch,
  Route,
} from "lucide-react";

const ACCESS_LIST = [
  { label: "View Dashboard", icon: LayoutDashboard, minRole: "READ_ONLY" },
  { label: "Manage Leads", icon: Users, minRole: "AGENT" },
  { label: "Use Pipeline Board", icon: KanbanSquare, minRole: "AGENT" },
  { label: "Create & Manage Tasks", icon: CheckSquare, minRole: "AGENT" },
  { label: "Manage Projects", icon: Building2, minRole: "TEAM_LEAD" },
  { label: "View Reports", icon: BarChart3, minRole: "TEAM_LEAD" },
  { label: "Configure Pipeline", icon: GitBranch, minRole: "ADMIN" },
  { label: "Manage Team & Invites", icon: Users, minRole: "ADMIN" },
  { label: "Configure Routing Rules", icon: Route, minRole: "ADMIN" },
  { label: "Manage Integrations", icon: Plug, minRole: "ADMIN" },
  { label: "Company Settings", icon: Settings, minRole: "ADMIN" },
  { label: "Manage Billing", icon: CreditCard, minRole: "SUPER_ADMIN" },
];

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ProfileClient({ initialLeads = [] }: { initialLeads?: any[] }) {
  const user = useUser();
  const [name, setName] = useState(user.name);
  const [isPending, setIsPending] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // My Leads state
  const [leads, setLeads] = useState(initialLeads);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [status1, setStatus1] = useState("");
  const [status1Remark, setStatus1Remark] = useState("");
  const [status2, setStatus2] = useState("");
  const [status2Remark, setStatus2Remark] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);

  const handleSaveName = async () => {
    if (name.trim() === user.name) {
      setIsEditing(false);
      return;
    }
    setIsPending(true);
    const res = await updateMyName(name);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Name updated!");
      setIsEditing(false);
    }
    setIsPending(false);
  };

  const handleOpenStatusModal = (lead: any) => {
    setSelectedLead(lead);
    setStatus1(lead.status_1 || "");
    setStatus1Remark(lead.status_1_remark || "");
    setStatus2(lead.status_2 || "");
    setStatus2Remark(lead.status_2_remark || "");
  };

  const handleSaveStatus = async () => {
    if (!selectedLead) return;
    setSavingStatus(true);
    try {
      const result = await updateLeadStatus(selectedLead.id, {
        status_1: status1 || undefined,
        status_1_remark: status1Remark || undefined,
        status_2: status2 || undefined,
        status_2_remark: status2Remark || undefined,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Lead status updated!");
        // Optimistic update
        setLeads((prev) =>
          prev.map((l) =>
            l.id === selectedLead.id
              ? {
                  ...l,
                  status_1: status1,
                  status_1_remark: status1Remark,
                  status_2: status2,
                  status_2_remark: status2Remark,
                }
              : l
          )
        );
        setSelectedLead(null);
      }
    } catch {
      toast.error("Failed to update status");
    } finally {
      setSavingStatus(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Profile Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">My Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Avatar + basic info */}
          <div className="flex items-start gap-4">
            <div className="flex items-center justify-center size-16 rounded-full bg-gray-100 text-gray-700 text-xl font-bold shrink-0">
              {user.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)}
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-8 w-[220px] text-sm"
                      disabled={isPending}
                    />
                    <Button size="sm" variant="ghost" onClick={handleSaveName} disabled={isPending}>
                      {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5 text-green-600" />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setIsEditing(false); setName(user.name); }}>
                      <X className="size-3.5 text-red-500" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <h2 className="text-lg font-semibold text-gray-900">{user.name}</h2>
                    <Button size="sm" variant="ghost" className="text-xs text-gray-500" onClick={() => setIsEditing(true)}>
                      Edit
                    </Button>
                  </>
                )}
              </div>
              <p className="text-sm text-gray-500 flex items-center gap-1.5">
                <Mail className="size-3.5" /> {user.email}
              </p>
            </div>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 border border-blue-100">
              <Building2 className="size-5 text-blue-600" />
              <div>
                <p className="text-[11px] text-blue-500 uppercase font-medium">Workspace</p>
                <p className="text-sm font-semibold text-blue-800">{user.companyName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-100">
              <Shield className="size-5 text-green-600" />
              <div>
                <p className="text-[11px] text-green-500 uppercase font-medium">Designation</p>
                <p className="text-sm font-semibold text-green-800">{ROLE_LABELS[user.role] || user.role}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Access Level Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Access Level</CardTitle>
          <p className="text-sm text-gray-500">
            Based on your role as <strong>{ROLE_LABELS[user.role]}</strong>, here&apos;s what you can access:
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ACCESS_LIST.map((item) => {
              const allowed = hasMinRole(user.role, item.minRole);
              return (
                <div
                  key={item.label}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm ${
                    allowed
                      ? "bg-green-50 text-green-800"
                      : "bg-gray-50 text-gray-400 line-through"
                  }`}
                >
                  {allowed ? (
                    <Check className="size-4 text-green-600 shrink-0" />
                  ) : (
                    <X className="size-4 text-gray-300 shrink-0" />
                  )}
                  <item.icon className="size-3.5 shrink-0" />
                  <span>{item.label}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* My Assigned Leads */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">My Assigned Leads</CardTitle>
          <p className="text-sm text-gray-500">
            Leads specifically assigned to you for follow-up and status tracking.
          </p>
        </CardHeader>
        <CardContent>
          {leads.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-6 border rounded-md bg-muted/20">
              You have no assigned leads.
            </div>
          ) : (
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lead</TableHead>
                    <TableHead>Status 1</TableHead>
                    <TableHead>Status 2</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/leads/${lead.id}`}
                          className="text-primary hover:underline"
                        >
                          {lead.name}
                        </Link>
                        <div className="text-xs text-muted-foreground font-normal mt-0.5">
                          {lead.phone} • {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{lead.status_1 || "—"}</div>
                        {lead.status_1_remark && (
                          <div className="text-xs text-muted-foreground truncate max-w-[150px]" title={lead.status_1_remark}>
                            {lead.status_1_remark}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{lead.status_2 || "—"}</div>
                        {lead.status_2_remark && (
                          <div className="text-xs text-muted-foreground truncate max-w-[150px]" title={lead.status_2_remark}>
                            {lead.status_2_remark}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Dialog open={selectedLead?.id === lead.id} onOpenChange={(open) => !open && setSelectedLead(null)}>
                          <DialogTrigger render={<Button variant="outline" size="sm" onClick={() => handleOpenStatusModal(lead)} />}>
                            Update
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Update Status for {lead.name}</DialogTitle>
                              <DialogDescription>
                                Set the current pipeline statuses and internal remarks for this lead.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <Label>Status 1</Label>
                                <select
                                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                  value={status1}
                                  onChange={(e) => setStatus1(e.target.value)}
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
                                  className="min-h-[60px] text-sm"
                                />
                              </div>

                              <div className="space-y-2">
                                <Label>Status 2</Label>
                                <select
                                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                  value={status2}
                                  onChange={(e) => setStatus2(e.target.value)}
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
                                  className="min-h-[60px] text-sm"
                                />
                              </div>
                            </div>
                            <div className="flex justify-end">
                              <Button onClick={handleSaveStatus} disabled={savingStatus}>
                                {savingStatus && (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                Save Status
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
