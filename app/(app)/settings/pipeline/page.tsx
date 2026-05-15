"use client";

import { useEffect, useState, useTransition } from "react";
import { getStages, createStage, deleteStage, updateStageOrder } from "./actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  Trash2,
  GripVertical,
  Trophy,
  Flag,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

// Pipeline stage type
interface Stage {
  id: string;
  name: string;
  color: string;
  stage_order: number;
  is_terminal: boolean;
  is_won: boolean;
  company_id: string;
  created_at: string;
  updated_at: string;
}

const PRESET_COLORS = [
  "#3b82f6", // blue
  "#22c55e", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
  "#6366f1", // indigo
  "#14b8a6", // teal
];

export default function PipelineSettingsPage() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newStageName, setNewStageName] = useState("");
  const [newStageColor, setNewStageColor] = useState("#3b82f6");
  const [newStageTerminal, setNewStageTerminal] = useState(false);
  const [newStageWon, setNewStageWon] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Load stages on mount
  useEffect(() => {
    loadStages();
  }, []);

  async function loadStages() {
    try {
      const data = await getStages();
      setStages(data as Stage[]);
    } catch {
      toast.error("Failed to load pipeline stages");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateStage() {
    if (!newStageName.trim()) {
      toast.error("Stage name is required");
      return;
    }

    const formData = new FormData();
    formData.set("name", newStageName.trim());
    formData.set("color", newStageColor);
    if (newStageTerminal) formData.set("is_terminal", "on");
    if (newStageWon) formData.set("is_won", "on");

    startTransition(async () => {
      const result = await createStage(formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Stage created successfully");
        setDialogOpen(false);
        setNewStageName("");
        setNewStageColor("#3b82f6");
        setNewStageTerminal(false);
        setNewStageWon(false);
        await loadStages();
      }
    });
  }

  async function handleDeleteStage(id: string, name: string) {
    if (!confirm(`Are you sure you want to delete the "${name}" stage?`)) return;

    startTransition(async () => {
      const result = await deleteStage(id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Stage deleted");
        await loadStages();
      }
    });
  }

  // Simple drag-and-drop handlers using HTML5 Drag API
  function handleDragStart(index: number) {
    setDraggedIndex(index);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newStages = [...stages];
    const draggedItem = newStages[draggedIndex];
    newStages.splice(draggedIndex, 1);
    newStages.splice(index, 0, draggedItem);
    setDraggedIndex(index);
    setStages(newStages);
  }

  function handleDragEnd() {
    if (draggedIndex === null) return;
    setDraggedIndex(null);

    // Save the new order
    const orderedIds = stages.map((s) => s.id);
    startTransition(async () => {
      const result = await updateStageOrder(orderedIds);
      if (result.error) {
        toast.error(result.error);
        await loadStages(); // reload on failure
      } else {
        toast.success("Stage order updated");
      }
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link href="/settings" className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Pipeline Stages</h1>
          <p className="text-muted-foreground">
            Define the stages leads move through in your sales pipeline.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Stage
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Pipeline Stage</DialogTitle>
              <DialogDescription>
                Create a new stage for your sales pipeline.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="stage-name">Stage Name</Label>
                <Input
                  id="stage-name"
                  placeholder="e.g. Site Visit Scheduled"
                  value={newStageName}
                  onChange={(e) => setNewStageName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      className="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110"
                      style={{
                        backgroundColor: color,
                        borderColor: newStageColor === color ? "#000" : "transparent",
                      }}
                      onClick={() => setNewStageColor(color)}
                      type="button"
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Terminal Stage</Label>
                  <p className="text-xs text-muted-foreground">
                    Leads cannot move past this stage (e.g. Lost, Closed).
                  </p>
                </div>
                <Switch
                  checked={newStageTerminal}
                  onCheckedChange={setNewStageTerminal}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Won Stage</Label>
                  <p className="text-xs text-muted-foreground">
                    Marks leads as successfully converted.
                  </p>
                </div>
                <Switch
                  checked={newStageWon}
                  onCheckedChange={setNewStageWon}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateStage} disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Stage
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stages list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Current Stages</CardTitle>
          <CardDescription>
            Drag stages to reorder them. Leads flow from top to bottom.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">No pipeline stages configured yet.</p>
              <p className="text-xs mt-1">Click &quot;Add Stage&quot; to create your first stage.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {stages.map((stage, index) => (
                <div
                  key={stage.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-3 rounded-lg border p-3 bg-background cursor-grab active:cursor-grabbing transition-all ${
                    draggedIndex === index ? "opacity-50 border-primary" : "hover:bg-muted/50"
                  }`}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />

                  {/* Color indicator */}
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: stage.color }}
                  />

                  {/* Stage name */}
                  <span className="font-medium flex-1">{stage.name}</span>

                  {/* Badges */}
                  <div className="flex items-center gap-2">
                    {stage.is_won && (
                      <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-xs">
                        <Trophy className="mr-1 h-3 w-3" />
                        Won
                      </Badge>
                    )}
                    {stage.is_terminal && !stage.is_won && (
                      <Badge variant="secondary" className="text-xs">
                        <Flag className="mr-1 h-3 w-3" />
                        Terminal
                      </Badge>
                    )}
                  </div>

                  {/* Order badge */}
                  <span className="text-xs text-muted-foreground w-6 text-center">
                    #{index + 1}
                  </span>

                  {/* Delete button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-red-600"
                    onClick={() => handleDeleteStage(stage.id, stage.name)}
                    disabled={isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info card */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="pt-6">
          <p className="text-sm text-blue-800">
            <strong>Tip:</strong> A typical real estate pipeline includes stages like:{" "}
            <em>New Lead → Contacted → Site Visit → Negotiation → Won / Lost</em>.
            Mark your final positive outcome as &quot;Won&quot; and negative outcomes as &quot;Terminal&quot;.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
