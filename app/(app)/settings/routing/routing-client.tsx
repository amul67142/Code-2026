"use client";

import { useState, useTransition } from "react";
import { toggleAgentRouting } from "./actions";
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
            Manage which agents receive leads via Round-Robin distribution.
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
              <TableHead className="text-right">Receiving Leads</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agents.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
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
        <strong>How Round-Robin works:</strong> Incoming leads from webhooks configured to use Round-Robin will be automatically assigned to the active agent who has waited the longest since their last assignment ("Last Assigned").
      </div>
    </div>
  );
}
