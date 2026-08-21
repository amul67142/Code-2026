"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ListChecks } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { saveRubricField, deleteRubricField } from "../actions";

interface Field {
  id: string;
  field_key: string;
  label: string;
  question_hint: string | null;
  input_type: "TEXT" | "CHOICE" | "NUMBER" | "YESNO";
  options: string[];
  required: boolean;
  position: number;
}

const STARTERS: Omit<Field, "id">[] = [
  {
    field_key: "budget",
    label: "Budget range",
    question_hint: "What budget are you comfortable with for this?",
    input_type: "TEXT",
    options: [],
    required: true,
    position: 0,
  },
  {
    field_key: "configuration",
    label: "Configuration (2/3/4 BHK)",
    question_hint: "Which configuration are you looking at?",
    input_type: "CHOICE",
    options: ["2 BHK", "3 BHK", "4 BHK"],
    required: true,
    position: 1,
  },
  {
    field_key: "timeline",
    label: "Purchase timeline",
    question_hint: "By when are you planning to finalise?",
    input_type: "TEXT",
    options: [],
    required: true,
    position: 2,
  },
  {
    field_key: "purpose",
    label: "End use or investment",
    question_hint: "Is this for your own use or as an investment?",
    input_type: "CHOICE",
    options: ["Own use", "Investment"],
    required: false,
    position: 3,
  },
];

export default function QualificationClient({ fields }: { fields: Field[] }) {
  const [editing, setEditing] = useState<Partial<Field> | null>(null);
  const [optionsText, setOptionsText] = useState("");
  const [isPending, startTransition] = useTransition();

  const openEditor = (f: Partial<Field>) => {
    setEditing(f);
    setOptionsText((f.options || []).join(", "));
  };

  const save = () => {
    if (!editing) return;
    startTransition(async () => {
      const res = await saveRubricField({
        id: editing.id,
        field_key: editing.field_key || "",
        label: editing.label || "",
        question_hint: editing.question_hint || "",
        input_type: editing.input_type || "TEXT",
        options: optionsText.split(",").map((s) => s.trim()).filter(Boolean),
        required: editing.required ?? true,
        position: editing.position ?? fields.length,
      });
      if (res.error) toast.error(res.error);
      else {
        toast.success("Saved");
        setEditing(null);
      }
    });
  };

  const addStarters = () => {
    startTransition(async () => {
      for (const s of STARTERS) {
        await saveRubricField({ ...s, question_hint: s.question_hint || "" });
      }
      toast.success("Starter fields added — edit them to fit your business");
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        {fields.length === 0 && (
          <Button variant="outline" onClick={addStarters} disabled={isPending}>
            Add the real-estate starters
          </Button>
        )}
        <Button onClick={() => openEditor({ input_type: "TEXT", required: true, position: fields.length })}>
          <Plus className="size-4 mr-1.5" /> Add field
        </Button>
      </div>

      {fields.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            <ListChecks className="size-6 mx-auto mb-2 opacity-40" />
            No qualification fields yet. With none configured, the bot answers questions and books
            visits but never marks anyone qualified.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {fields.map((f) => (
            <Card key={f.id}>
              <CardContent className="py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{f.label}</p>
                    <Badge variant="outline" className="text-[10px]">{f.field_key}</Badge>
                    {f.required && (
                      <Badge variant="secondary" className="text-[10px]">required</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {f.input_type === "CHOICE" && f.options.length
                      ? f.options.join(" / ")
                      : f.question_hint || f.input_type.toLowerCase()}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => openEditor(f)}>
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                  onClick={() =>
                    startTransition(async () => {
                      await deleteRubricField(f.id);
                      toast.success("Deleted");
                    })
                  }
                >
                  <Trash2 className="size-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit field" : "Add field"}</DialogTitle>
            <DialogDescription>
              The bot weaves this into conversation — the hint tells it how to ask naturally.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="qf-key">Key</Label>
                <Input
                  id="qf-key"
                  value={editing?.field_key || ""}
                  onChange={(e) => setEditing((f) => ({ ...f, field_key: e.target.value }))}
                  placeholder="budget"
                  disabled={!!editing?.id}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="qf-label">Label</Label>
                <Input
                  id="qf-label"
                  value={editing?.label || ""}
                  onChange={(e) => setEditing((f) => ({ ...f, label: e.target.value }))}
                  placeholder="Budget range"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="qf-hint">How to ask (optional)</Label>
              <Input
                id="qf-hint"
                value={editing?.question_hint || ""}
                onChange={(e) => setEditing((f) => ({ ...f, question_hint: e.target.value }))}
                placeholder="What budget are you comfortable with?"
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={editing?.input_type || "TEXT"}
                  onValueChange={(v) => setEditing((f) => ({ ...f, input_type: v as Field["input_type"] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TEXT">Free text</SelectItem>
                    <SelectItem value="CHOICE">Choice</SelectItem>
                    <SelectItem value="NUMBER">Number</SelectItem>
                    <SelectItem value="YESNO">Yes / No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between rounded-md border px-3 py-2 mt-6">
                <span className="text-sm">Required to qualify</span>
                <Switch
                  checked={editing?.required ?? true}
                  onCheckedChange={(v) => setEditing((f) => ({ ...f, required: v }))}
                />
              </div>
            </div>
            {editing?.input_type === "CHOICE" && (
              <div className="space-y-2">
                <Label htmlFor="qf-options">Options (comma-separated)</Label>
                <Input
                  id="qf-options"
                  value={optionsText}
                  onChange={(e) => setOptionsText(e.target.value)}
                  placeholder="2 BHK, 3 BHK, 4 BHK"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={isPending}>
              {isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
