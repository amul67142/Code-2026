"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, FileText, Link2, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import {
  saveKnowledgeDoc,
  toggleKnowledgeDoc,
  deleteKnowledgeDoc,
  importKnowledgeFromUrl,
} from "../actions";

interface Doc {
  id: string;
  title: string;
  content: string;
  project_id: string | null;
  is_active: boolean;
  updated_at: string;
}
interface Project {
  id: string;
  name: string;
}

const ALL_PROJECTS = "__all__";
/** Rough token estimate (chars / 4) — enough to show budget usage honestly. */
const estTokens = (s: string) => Math.ceil(s.length / 4);
/** Keep the whole knowledge base comfortably inside the cached prompt. */
const TOKEN_BUDGET = 40_000;

export default function KnowledgeClient({ docs, projects }: { docs: Doc[]; projects: Project[] }) {
  const [editing, setEditing] = useState<Partial<Doc> | null>(null);
  const [isPending, startTransition] = useTransition();
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);

  const runImport = async () => {
    if (!importUrl.trim()) return;
    setImporting(true);
    try {
      const res = await importKnowledgeFromUrl(importUrl, null);
      if (res.error) toast.error(res.error);
      else {
        toast.success(`Imported ${Math.round((res.chars || 0) / 1000)}k characters — review it, then switch it on.`);
        setImportUrl("");
      }
    } finally {
      setImporting(false);
    }
  };

  const totalTokens = useMemo(
    () => docs.filter((d) => d.is_active).reduce((n, d) => n + estTokens(d.content), 0),
    [docs]
  );
  const pct = Math.min(100, Math.round((totalTokens / TOKEN_BUDGET) * 100));

  const projectName = (id: string | null) =>
    id ? projects.find((p) => p.id === id)?.name || "Unknown project" : null;

  const save = () => {
    if (!editing) return;
    startTransition(async () => {
      const res = await saveKnowledgeDoc({
        id: editing.id,
        title: editing.title || "",
        content: editing.content || "",
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
      {/* Token budget meter */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>Knowledge size (active documents)</span>
            <span>
              ~{Math.round(totalTokens / 1000)}k / {TOKEN_BUDGET / 1000}k tokens
            </span>
          </div>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${pct > 90 ? "bg-red-500" : pct > 70 ? "bg-amber-500" : "bg-gray-900"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          {pct > 90 && (
            <p className="text-xs text-red-600 mt-2">
              Getting close to the limit — trim older documents or scope them to a project.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Import from a web page */}
      <Card>
        <CardContent className="pt-5">
          <Label htmlFor="import-url" className="text-sm font-medium">
            Import from a web page
          </Label>
          <p className="text-xs text-muted-foreground mt-1 mb-2">
            Paste a landing page or project page URL. The text is pulled in as a new document,
            switched <span className="font-medium">off</span> until you review it — scraped pages
            carry menus and marketing filler the bot shouldn&apos;t repeat.
          </p>
          <div className="flex gap-2">
            <Input
              id="import-url"
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  runImport();
                }
              }}
              placeholder="https://example.com/project-page"
              disabled={importing}
            />
            <Button variant="outline" onClick={runImport} disabled={importing || !importUrl.trim()}>
              {importing ? (
                <Loader2 className="size-4 mr-1.5 animate-spin" />
              ) : (
                <Link2 className="size-4 mr-1.5" />
              )}
              Import
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => setEditing({ project_id: null })}>
          <Plus className="size-4 mr-1.5" /> Add document
        </Button>
      </div>

      {docs.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            <FileText className="size-6 mx-auto mb-2 opacity-40" />
            No knowledge yet. Start with one document per project: overview, amenities, location,
            developer background, and the answers to the questions leads always ask.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {docs.map((d) => (
            <Card key={d.id} className={d.is_active ? "" : "opacity-60"}>
              <CardContent className="py-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{d.title}</p>
                    {projectName(d.project_id) ? (
                      <Badge variant="secondary" className="text-[10px]">
                        {projectName(d.project_id)}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">
                        All projects
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    ~{estTokens(d.content).toLocaleString()} tokens ·{" "}
                    {d.content.slice(0, 90) || "(empty)"}
                  </p>
                </div>
                <Switch
                  checked={d.is_active}
                  onCheckedChange={(v) =>
                    startTransition(async () => {
                      await toggleKnowledgeDoc(d.id, v);
                    })
                  }
                />
                <Button variant="ghost" size="sm" onClick={() => setEditing(d)}>
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                  onClick={() =>
                    startTransition(async () => {
                      await deleteKnowledgeDoc(d.id);
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

      {/* Edit / create dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit document" : "Add document"}</DialogTitle>
            <DialogDescription>
              Write for the bot the way you&apos;d brief a new salesperson.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="doc-title">Title</Label>
                <Input
                  id="doc-title"
                  value={editing?.title || ""}
                  onChange={(e) => setEditing((d) => ({ ...d, title: e.target.value }))}
                  placeholder="Project overview — Trident Heights"
                />
              </div>
              <div className="space-y-2">
                <Label>Applies to</Label>
                <Select
                  value={editing?.project_id || ALL_PROJECTS}
                  onValueChange={(v) =>
                    setEditing((d) => ({ ...d, project_id: v === ALL_PROJECTS ? null : v }))
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
              <Label htmlFor="doc-content">Content</Label>
              <Textarea
                id="doc-content"
                rows={14}
                value={editing?.content || ""}
                onChange={(e) => setEditing((d) => ({ ...d, content: e.target.value }))}
                placeholder={
                  "Amenities: clubhouse with pool, gym, kids' play area…\nLocation: 8 min to Dwarka Expressway, 2 km from the metro…\nWhy buyers choose this project over nearby options…"
                }
              />
              <p className="text-xs text-muted-foreground text-right">
                ~{estTokens(editing?.content || "").toLocaleString()} tokens
              </p>
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
