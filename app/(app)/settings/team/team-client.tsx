"use client";

import { useState } from "react";
import { inviteTeamMember, updateUserRole, removeUser } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Mail, Shield, User, UserX, Loader2 } from "lucide-react";
import { format } from "date-fns";

const ROLES = [
  { value: "SUPER_ADMIN", label: "Super Admin" },
  { value: "ADMIN", label: "Admin" },
  { value: "TEAM_LEAD", label: "Team Lead" },
  { value: "AGENT", label: "Agent" },
  { value: "READ_ONLY", label: "Read Only" },
];

export default function TeamClient({ initialTeam, currentRole }: { initialTeam: any[], currentRole: string }) {
  const [team, setTeam] = useState(initialTeam);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("AGENT");
  const [dialogOpen, setDialogOpen] = useState(false);
  const isAdmin = currentRole === "ADMIN" || currentRole === "SUPER_ADMIN";

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail) return;

    setIsInviting(true);
    try {
      const res = await inviteTeamMember(inviteEmail, inviteRole);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Invitation sent successfully.");
        setDialogOpen(false);
        setInviteEmail("");
        setInviteRole("AGENT");
        // Opt: Refresh data (will happen on navigation/focus via NextJS cache, but we can optimistically add)
        window.location.reload(); 
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsInviting(false);
    }
  }

  async function handleRoleChange(userId: string, newRole: string) {
    const res = await updateUserRole(userId, newRole);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Role updated successfully.");
      setTeam(team.map(t => t.id === userId ? { ...t, role: newRole } : t));
    }
  }

  async function handleRemove(userId: string) {
    if (!confirm("Are you sure you want to deactivate this user?")) return;
    
    const res = await removeUser(userId);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("User deactivated.");
      setTeam(team.filter(t => t.id !== userId));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Team Members</h2>
          <p className="text-muted-foreground">
            Manage your team, invite agents, and configure access levels.
          </p>
        </div>
        
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger render={<Button />}>
              <Mail className="mr-2 h-4 w-4" />
              Invite Member
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Team Member</DialogTitle>
                <DialogDescription>
                  They will receive an email with a link to set their password and join your workspace.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleInvite} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input 
                    type="email" 
                    placeholder="agent@realleads.com" 
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Access Role</Label>
                  <Select value={inviteRole} onValueChange={(val) => setInviteRole(val || "AGENT")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map(role => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isInviting}>
                    {isInviting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Send Invite
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {team.filter(t => t.status !== "INACTIVE").map((member) => (
              <TableRow key={member.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium">{member.name || "Unknown"}</span>
                      <span className="text-xs text-muted-foreground">{member.email}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={member.status === "ACTIVE" ? "default" : "secondary"}>
                    {member.status || "UNKNOWN"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {isAdmin ? (
                    <Select 
                      value={member.role} 
                      onValueChange={(val) => val && handleRoleChange(member.id, val)}
                    >
                      <SelectTrigger className="h-8 w-[130px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map(role => (
                          <SelectItem key={role.value} value={role.value} className="text-xs">
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="outline" className="font-normal">
                      <Shield className="mr-1 h-3 w-3" />
                      {ROLES.find(r => r.value === member.role)?.label || member.role}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {member.last_login_at ? format(new Date(member.last_login_at), "MMM d, yyyy") : "Never"}
                </TableCell>
                <TableCell className="text-right">
                  {isAdmin && currentRole !== member.role && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => handleRemove(member.id)}
                    >
                      <UserX className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {team.filter(t => t.status !== "INACTIVE").length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No team members found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
