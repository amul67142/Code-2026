"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import Papa from "papaparse";
import { Plus, Pencil, Trash2, Database, Upload } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { saveFact, deleteFact, importFacts } from "../actions";

interface Fact {
  id: string;
  category: string;
  label: string;
  value: string;
  project_id: string | null;
}
interface Project {
  id: string;
  name: string;
}

const ALL_PROJECTS = "__all__";
const CATEGORIES = ["Pricing", "Availability", "Sizes", "Payment plan", "Charges", "Legal / RERA", "Location", "General"];

/** Accepted CSV header aliases → our columns. */
function pick(row: Record<string, string>, names: string[]): string {
  for (const n of names) {
    const hit = Object.keys(row).find((k) => k.trim().toLowerCase() === n);
    if (hit && row[hit]?.trim()) return row[hit].trim();
  }
  return "";
}

export default function FactsClient({ facts, projects }: { facts: Fact[]; projects: Project[] }) {
  const [editing, setEditing] = useState<Partial<Fact> | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function handleCsv(file: File) {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const rows = result.data
          .map((r) => ({
            category: pick(r, ["category", "type", "group"]),
            label: pick(r, ["label", "key", "question", "field", "name", "attribute"]),
            value: pick(r, ["value", "answer", "detail", "data"]),
          }))
          .filter((r) => r.label && r.value);

        if (rows.length === 0) {
          toast.error("No usable rows. Use two columns headed key,value (category optional).");
          return;
        }
        startTransition(async () => {
          const res = await importFacts(rows, null);
          if (res.error) toast.error(res.error);
          else toast.success(`Imported ${res.imported} facts${res.skipped ? `, skipped ${res.skipped}` : ""}`);
        });
      },
      error: () => toast.error("Couldn't read that CSV"),
    });
  }

  const projectName = (id: string | null) =>
    id ? projects.find((p) => p.id === id)?.name || "Unknown project" : null;

  const grouped = facts.reduce<Record<string, Fact[]>>((acc, f) => {
    (acc[f.category] ||= []).push(f);
    return acc;
  }, {});

  const save = () => {
    if (!editing) return;
    startTransition(async () => {
      const res = await saveFact({
        id: editing.id,
        category: editing.category || "General",
        label: editing.label || "",
        value: editing.value || "",
        project_id: editing.project_id || null,
      });
      if (res.error) toast.error(res.error);
      else {
        toast.success("Saved");
        setEditing(null);
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleCsv(f);
            e.target.value = "";
          }}
        />
        <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={isPending}>
          <Upload className="size-4 mr-1.5" /> Import CSV
        </Button>
        <Button onClick={() => setEditing({ category: "Pricing", project_id: null })}>
          <Plus className="size-4 mr-1.5" /> Add fact
        </Button>
      </div>
      <p className="text-xs text-muted-foreground text-right -mt-2">
        CSV columns: <code className="font-mono">key,value</code> (or{" "}
        <code className="font-mono">label,value</code>), with an optional{" "}
        <code className="font-mono">category</code> column.
      </p>

      {facts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            <Database className="size-6 mx-auto mb-2 opacity-40" />
            Nothing yet — until you add facts, the bot will refuse to quote any price, size or date
            and will escalate those questions to your team.
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped).map(([category, rows]) => (
          <div key={category}>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              {category}
            </h3>
            <div className="space-y-2">
              {rows.map((f) => (
                <Card key={f.id}>
                  <CardContent className="py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{f.label}</p>
                        {projectName(f.project_id) && (
                          <Badge variant="secondary" className="text-[10px]">
                            {projectName(f.project_id)}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{f.value}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setEditing(f)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() =>
                        startTransition(async () => {
                          await deleteFact(f.id);
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
          </div>
        ))
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit fact" : "Add fact"}</DialogTitle>
            <DialogDescription>Exactly as the bot should quote it, currency and all.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={editing?.category || "General"}
                  onValueChange={(v) => setEditing((f) => ({ ...f, category: v || "General" }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Applies to</Label>
                <Select
                  value={editing?.project_id || ALL_PROJECTS}
                  onValueChange={(v) =>
                    setEditing((f) => ({ ...f, project_id: v === ALL_PROJECTS ? null : v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_PROJECTS}>All projects</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fact-label">Label</Label>
              <Input
                id="fact-label"
                value={editing?.label || ""}
                onChange={(e) => setEditing((f) => ({ ...f, label: e.target.value }))}
                placeholder="3BHK starting price"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fact-value">Value (quoted verbatim)</Label>
              <Input
                id="fact-value"
                value={editing?.value || ""}
                onChange={(e) => setEditing((f) => ({ ...f, value: e.target.value }))}
                placeholder="₹2.45 Cr onwards (all-inclusive except registration)"
              />
            </div>
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
