"use client";

import { useState, useTransition } from "react";
import { listFacebookForms, saveFacebookFormMapping } from "./facebook-actions";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, Check, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface Project {
  id: string;
  name: string;
}
interface Agent {
  id: string;
  name: string;
}
interface FormRow {
  form_id: string;
  form_name: string;
  status: string;
  mapping: {
    project_id: string | null;
    assignment_rule: string;
    assigned_agent_id: string | null;
    is_active: boolean;
  } | null;
}
interface Draft {
  projectId: string;
  rule: string;
  agentId: string;
  active: boolean;
}

/**
 * Lists a connected Facebook Page's Instant Forms (via Graph API) and lets an
 * admin map each one to a destination project + assignment rule. Independent of
 * Meta's Lead Ads Testing Tool — forms are fetched server-side with the Page token.
 */
export function FacebookFormsManager({
  connectionId,
  projects,
  agents,
}: {
  connectionId: string;
  projects: Project[];
  agents: Agent[];
}) {
  const [open, setOpen] = useState(false);
  const [forms, setForms] = useState<FormRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [draft, setDraft] = useState<Record<string, Draft>>({});

  async function loadForms() {
    setLoading(true);
    const res = await listFacebookForms(connectionId);
    setLoading(false);
    if (res.error || !res.forms) {
      toast.error(res.error || "Failed to load forms");
      return;
    }
    const list = res.forms as FormRow[];
    setForms(list);
    const seeded: Record<string, Draft> = {};
    for (const f of list) {
      seeded[f.form_id] = {
        projectId: f.mapping?.project_id || "",
        rule: f.mapping?.assignment_rule || "ROUND_ROBIN",
        agentId: f.mapping?.assigned_agent_id || "",
        active: f.mapping?.is_active ?? true,
      };
    }
    setDraft(seeded);
    setOpen(true);
  }

  function handleToggle() {
    if (forms === null) {
      loadForms();
    } else {
      setOpen((o) => !o);
    }
  }

  function update(formId: string, patch: Partial<Draft>) {
    setDraft((prev) => ({ ...prev, [formId]: { ...prev[formId], ...patch } }));
  }

  function save(f: FormRow) {
    const d = draft[f.form_id];
    if (!d?.projectId) {
      toast.error("Select a destination project first");
      return;
    }
    if (d.rule === "SPECIFIC_AGENT" && !d.agentId) {
      toast.error("Select an agent for specific-agent assignment");
      return;
    }
    startTransition(async () => {
      const res = await saveFacebookFormMapping({
        connectionId,
        formId: f.form_id,
        formName: f.form_name,
        projectId: d.projectId,
        assignmentRule: d.rule as "ROUND_ROBIN" | "SPECIFIC_AGENT",
        assignedAgentId: d.agentId || null,
        isActive: d.active,
      });
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(`Saved mapping for "${f.form_name}"`);
        // Mark as mapped locally
        setForms(
          (prev) =>
            prev?.map((row) =>
              row.form_id === f.form_id
                ? {
                    ...row,
                    mapping: {
                      project_id: d.projectId,
                      assignment_rule: d.rule,
                      assigned_agent_id: d.agentId || null,
                      is_active: d.active,
                    },
                  }
                : row
            ) || null
        );
      }
    });
  }

  return (
    <div className="mt-3 border-t pt-3">
      <Button variant="ghost" size="sm" onClick={handleToggle} disabled={loading}>
        {loading ? (
          <Loader2 className="mr-2 size-4 animate-spin" />
        ) : (
          <FileText className="mr-2 size-4" />
        )}
        {open ? "Hide lead forms" : "Manage lead forms"}
      </Button>

      {open && forms && (
        <div className="mt-3 space-y-3">
          {forms.length === 0 && (
            <p className="text-xs text-muted-foreground py-2">
              No Instant Forms found on this Page. Create one in Meta, then reload.
            </p>
          )}

          {forms.map((f) => {
            const d = draft[f.form_id] || {
              projectId: "",
              rule: "ROUND_ROBIN",
              agentId: "",
              active: true,
            };
            return (
              <div key={f.form_id} className="rounded-md border p-3 space-y-3 bg-background">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{f.form_name}</span>
                    {f.mapping && (
                      <Badge variant="secondary" className="text-[10px]">
                        <Check className="mr-1 size-3" />
                        Mapped
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Active</span>
                    <Switch
                      checked={d.active}
                      onCheckedChange={(v) => update(f.form_id, { active: v })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Destination project</label>
                    <Select
                      items={Object.fromEntries(projects.map((p) => [p.id, p.name]))}
                      value={d.projectId}
                      onValueChange={(v) => update(f.form_id, { projectId: v ?? "" })}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Select project..." />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                        {projects.length === 0 && (
                          <SelectItem value="none" disabled>
                            No projects — create one first
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Assignment</label>
                    <Select
                      items={{ ROUND_ROBIN: "Round-robin", SPECIFIC_AGENT: "Specific agent" }}
                      value={d.rule}
                      onValueChange={(v) => update(f.form_id, { rule: v ?? "ROUND_ROBIN" })}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ROUND_ROBIN">Round-robin</SelectItem>
                        <SelectItem value="SPECIFIC_AGENT">Specific agent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {d.rule === "SPECIFIC_AGENT" && (
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Agent</label>
                      <Select
                        items={Object.fromEntries(agents.map((a) => [a.id, a.name]))}
                        value={d.agentId}
                        onValueChange={(v) => update(f.form_id, { agentId: v ?? "" })}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Select agent..." />
                        </SelectTrigger>
                        <SelectContent>
                          {agents.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button size="sm" onClick={() => save(f)} disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                    Save mapping
                  </Button>
                </div>
              </div>
            );
          })}

          <Button variant="ghost" size="sm" onClick={loadForms} disabled={loading}>
            <RefreshCw className="mr-2 size-3.5" />
            Reload forms
          </Button>
        </div>
      )}
    </div>
  );
}
