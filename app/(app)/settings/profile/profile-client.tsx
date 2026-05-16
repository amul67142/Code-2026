"use client";

import { useState } from "react";
import { useUser, ROLE_LABELS, hasMinRole } from "@/lib/user-context";
import { updateMyName } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Building2,
  Shield,
  Mail,
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

export function ProfileClient() {
  const user = useUser();
  const [name, setName] = useState(user.name);
  const [isPending, setIsPending] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

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
    </div>
  );
}
