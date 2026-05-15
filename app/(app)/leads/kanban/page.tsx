"use client";

import { useEffect, useState, useTransition } from "react";
import { getLeadsGrouped, updateLeadStage } from "../actions";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  ArrowLeft,
  Loader2,
  Phone,
  User,
  GripVertical,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Lead = any;

interface Stage {
  id: string;
  name: string;
  color: string;
  stage_order: number;
  is_terminal: boolean;
  is_won: boolean;
}

export default function KanbanPage() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [, startTransition] = useTransition();
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const data = await getLeadsGrouped();
      setStages(data.stages as Stage[]);
      setLeads(data.leads);
    } catch {
      toast.error("Failed to load kanban data");
    } finally {
      setIsLoading(false);
    }
  }

  function handleDragStart(e: React.DragEvent, leadId: string) {
    e.dataTransfer.effectAllowed = "move";
    setDraggedLeadId(leadId);
  }

  function handleDragOver(e: React.DragEvent, stageId: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStageId(stageId);
  }

  function handleDragLeave() {
    setDragOverStageId(null);
  }

  function handleDrop(e: React.DragEvent, targetStageId: string) {
    e.preventDefault();
    setDragOverStageId(null);

    if (!draggedLeadId) return;

    const lead = leads.find((l: Lead) => l.id === draggedLeadId);
    if (!lead || lead.stage_id === targetStageId) {
      setDraggedLeadId(null);
      return;
    }

    // Optimistic update
    setLeads((prev: Lead[]) =>
      prev.map((l: Lead) =>
        l.id === draggedLeadId ? { ...l, stage_id: targetStageId } : l
      )
    );
    setDraggedLeadId(null);

    startTransition(async () => {
      const result = await updateLeadStage(draggedLeadId, targetStageId);
      if (result.error) {
        toast.error(result.error);
        await loadData(); // rollback
      } else {
        toast.success("Lead moved successfully");
      }
    });
  }

  function getLeadsForStage(stageId: string) {
    return leads.filter((l: Lead) => l.stage_id === stageId);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-4">
          <Link
            href="/leads"
            className={buttonVariants({ variant: "ghost", size: "icon" })}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Pipeline Board</h1>
            <p className="text-muted-foreground">
              Drag leads between stages to update their progress.
            </p>
          </div>
        </div>
        <Link
          href="/leads/new"
          className={buttonVariants({ variant: "default" })}
        >
          + Add Lead
        </Link>
      </div>

      {/* Kanban Board */}
      {stages.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-center">
          <div>
            <p className="text-muted-foreground mb-2">
              No pipeline stages configured yet.
            </p>
            <Link
              href="/settings/pipeline"
              className={buttonVariants({ variant: "outline" })}
            >
              Configure Pipeline
            </Link>
          </div>
        </div>
      ) : (
        <ScrollArea className="flex-1 pb-4">
          <div className="flex gap-4 min-w-max pb-4">
            {stages.map((stage) => {
              const stageLeads = getLeadsForStage(stage.id);
              const isOver = dragOverStageId === stage.id;

              return (
                <div
                  key={stage.id}
                  className={`w-[300px] flex-shrink-0 rounded-lg border bg-muted/30 flex flex-col transition-colors ${
                    isOver ? "border-primary bg-primary/5" : ""
                  }`}
                  onDragOver={(e) => handleDragOver(e, stage.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, stage.id)}
                >
                  {/* Column Header */}
                  <div className="p-3 border-b flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: stage.color }}
                      />
                      <span className="font-semibold text-sm">{stage.name}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {stageLeads.length}
                    </Badge>
                  </div>

                  {/* Cards */}
                  <div className="p-2 space-y-2 min-h-[100px] flex-1">
                    {stageLeads.length === 0 && (
                      <div className="text-xs text-muted-foreground text-center py-8">
                        Drop leads here
                      </div>
                    )}
                    {stageLeads.map((lead: Lead) => (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, lead.id)}
                        className={`rounded-lg border bg-card p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-all ${
                          draggedLeadId === lead.id
                            ? "opacity-40 scale-95"
                            : ""
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {lead.name}
                            </p>

                            {lead.phone && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                <Phone className="h-3 w-3" />
                                {lead.phone}
                              </p>
                            )}

                            <div className="flex items-center justify-between mt-2">
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted font-medium">
                                {lead.source?.replace(/_/g, " ")}
                              </span>

                              {lead.assigned_user ? (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {lead.assigned_user.name?.split(" ")[0]}
                                </span>
                              ) : (
                                <span className="text-[10px] text-orange-500">
                                  Unassigned
                                </span>
                              )}
                            </div>

                            {lead.projects?.name && (
                              <p className="text-[10px] text-muted-foreground mt-1.5 truncate">
                                🏢 {lead.projects.name}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}
    </div>
  );
}
