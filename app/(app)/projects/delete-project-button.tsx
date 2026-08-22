"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteProject } from "./actions";

type Props = {
  projectId: string;
  projectName: string;
  /** "icon" for the list row, "full" for the edit page danger zone. */
  variant?: "icon" | "full";
};

/**
 * Permanently deletes a project after an explicit confirmation.
 * Leads are NOT deleted — they are detached from the project and remain
 * in the CRM (FK is ON DELETE SET NULL). Webhooks and AI-agent data tied
 * to the project are removed with it.
 */
export function DeleteProjectButton({ projectId, projectName, variant = "icon" }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    try {
      const res = await deleteProject(projectId);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(`"${projectName}" deleted`);
      setOpen(false);
      router.push("/projects");
      router.refresh();
    } catch {
      toast.error("Could not delete the project");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {variant === "icon" ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Delete ${projectName}`}
          className="text-muted-foreground hover:text-destructive"
          onClick={() => setOpen(true)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ) : (
        <Button type="button" variant="destructive" onClick={() => setOpen(true)}>
          <Trash2 className="mr-2 h-4 w-4" />
          Delete project
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete &ldquo;{projectName}&rdquo;?</DialogTitle>
            <DialogDescription>
              This permanently removes the project. It cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                  <li>Leads in this project are <b>kept</b> — they stay in the CRM, no longer linked to a project.</li>
                  <li>Webhooks, AI-agent knowledge and facts for this project are removed.</li>
                  <li>Facebook form mappings pointing here are unlinked.</li>
                </ul>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={confirm} disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
