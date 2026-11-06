"use client";

import { useState, useTransition } from "react";
import { setAgentLeadShare, toggleAgentRouting } from "./actions";
import {
  DEFAULT_LEAD_SHARE,
  MAX_LEAD_SHARE,
  MIN_LEAD_SHARE,
  leadSharePercent,
  validLeadShare,
} from "@/lib/team/lead-share";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Users } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Agent = any;

interface RoutingClientProps {
  initialAgents: Agent[];
}

export default function RoutingClient({ initialAgents }: RoutingClientProps) {
  const [agents, setAgents] = useState<Agent[]>(initialAgents);
  const [isPending, startTransition] = useTransition();
  // What is typed in each share box, kept apart from the saved value so a
  // half-typed number never moves the percentages.
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const shareOf = (a: Agent): number => a.lead_weight ?? DEFAULT_LEAD_SHARE;
  const inRotation = agents.filter((a) => a.status === "ACTIVE" && a.is_receiving_leads);
  const totalShare = inRotation.reduce((sum, a) => sum + shareOf(a), 0);

  function handleShareSave(agent: Agent) {
    const draft = drafts[agent.id];
    const clearDraft = () =>
      setDrafts((d) => {
        const next = { ...d };
        delete next[agent.id];
        return next;
      });
    if (draft === undefined) return;

    const share = Number(draft);
    if (share === shareOf(agent)) return clearDraft();
    if (!validLeadShare(share)) {
      toast.error(`Lead share must be a whole number from ${MIN_LEAD_SHARE} to ${MAX_LEAD_SHARE}.`);
      return clearDraft();
    }

    startTransition(async () => {
      const res = await setAgentLeadShare(agent.id, share);
      if (res.error) {
        toast.error(res.error);
      } else {
        setAgents((list) => list.map((a) => (a.id === agent.id ? { ...a, lead_weight: share } : a)));
        toast.success(`${agent.name}'s lead share updated`);
      }
      clearDraft();
    });
  }

  function handleToggle(userId: string, isReceiving: boolean) {
    // Optimistic UI update
    setAgents(
      agents.map((a) =>
        a.id === userId ? { ...a, is_receiving_leads: isReceiving } : a
      )
    );

    startTransition(async () => {
      const res = await toggleAgentRouting(userId, isReceiving);
      if (res.error) {
        toast.error(res.error);
        // Revert optimistic update on error
        setAgents(
          agents.map((a) =>
            a.id === userId ? { ...a, is_receiving_leads: !isReceiving } : a
          )
        );
      } else {
        toast.success(
          isReceiving
            ? "Agent will now receive leads"
            : "Agent excluded from routing"
        );
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Lead Routing</h1>
          <p className="text-muted-foreground">
            Choose who receives leads, and who gets more of them.
          </p>
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agent Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Assigned</TableHead>
              <TableHead className="w-28">Lead Share</TableHead>
              <TableHead className="w-20 text-right">Gets</TableHead>
              <TableHead className="text-right">Receiving Leads</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agents.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-32 text-center text-muted-foreground"
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Users className="size-8 text-muted-foreground/50" />
                    <p>No agents available for routing.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              agents.map((agent) => {
                const isActive = agent.status === "ACTIVE";
                return (
                  <TableRow key={agent.id}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{agent.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {agent.email}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{agent.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={isActive ? "default" : "secondary"}
                        className={!isActive ? "opacity-50" : ""}
                      >
                        {agent.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {agent.last_assigned_at
                        ? formatDistanceToNow(new Date(agent.last_assigned_at), {
                            addSuffix: true,
                          })
                        : "Never"}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={MIN_LEAD_SHARE}
                        max={MAX_LEAD_SHARE}
                        aria-label={`Lead share for ${agent.name}`}
                        className="h-8 w-20"
                        value={drafts[agent.id] ?? String(shareOf(agent))}
                        onChange={(e) => setDrafts((d) => ({ ...d, [agent.id]: e.target.value }))}
                        onBlur={() => handleShareSave(agent)}
                        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                      />
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {isActive && agent.is_receiving_leads
                        ? `${leadSharePercent(shareOf(agent), totalShare)}%`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end">
                        <Switch
                          checked={agent.is_receiving_leads}
                          disabled={isPending || !isActive}
                          onCheckedChange={(checked) =>
                            handleToggle(agent.id, checked)
                          }
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      <div className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-md border">
        <strong>How lead share works:</strong> A higher number means more leads.
        {inRotation.length > 0 && (
          <>
            {" "}Right now, out of every {totalShare} lead{totalShare === 1 ? "" : "s"}:{" "}
            {inRotation.map((a) => `${a.name} gets ${shareOf(a)}`).join(", ")}. Then the cycle repeats, with no daily limit.
          </>
        )}{" "}
        This applies to leads from integrations set to Round-Robin.
      </div>
    </div>
  );
}
