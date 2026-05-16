"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createTask } from "@/app/(app)/tasks/actions";
import { toast } from "sonner";
import { Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";

const TASK_TYPES = [
  { value: "CALL", label: "📞 Call" },
  { value: "EMAIL", label: "📧 Email" },
  { value: "WHATSAPP", label: "💬 WhatsApp" },
  { value: "SITE_VISIT", label: "🏠 Site Visit" },
  { value: "OTHER", label: "📋 Other" },
];

interface LeadOption {
  id: string;
  name: string;
}

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** If provided, the dialog is pre-linked to this lead (used from Lead Detail page) */
  leadId?: string;
  leadName?: string;
  /** If provided, show a lead picker (used from Tasks dashboard) */
  leads?: LeadOption[];
}

export function TaskDialog({
  open,
  onOpenChange,
  leadId: fixedLeadId,
  leadName: fixedLeadName,
  leads,
}: TaskDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState("CALL");
  const [dueAt, setDueAt] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedLeadId, setSelectedLeadId] = useState("");
  const [leadSearch, setLeadSearch] = useState("");

  const actualLeadId = fixedLeadId || selectedLeadId;
  const showLeadPicker = !fixedLeadId && leads;

  const filteredLeads = leads?.filter((l) =>
    l.name.toLowerCase().includes(leadSearch.toLowerCase())
  ) || [];

  function resetForm() {
    setType("CALL");
    setDueAt("");
    setNotes("");
    setSelectedLeadId("");
    setLeadSearch("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!actualLeadId) {
      toast.error("Please select a lead");
      return;
    }
    if (!dueAt) {
      toast.error("Please select a due date & time");
      return;
    }

    setLoading(true);
    try {
      const result = await createTask({
        lead_id: actualLeadId,
        type,
        due_at: new Date(dueAt).toISOString(),
        notes: notes.trim() || undefined,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Task created successfully");
        resetForm();
        onOpenChange(false);
        router.refresh();
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) resetForm(); onOpenChange(val); }}>
      <DialogContent className="sm:max-w-[460px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Task</DialogTitle>
            <DialogDescription>
              {fixedLeadName
                ? <>Schedule a follow-up for <strong>{fixedLeadName}</strong>.</>
                : "Schedule a follow-up task for a lead."
              }
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Lead Picker (only when opened from Tasks page) */}
            {showLeadPicker && (
              <div className="grid gap-2">
                <Label>Select Lead *</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search leads..."
                    value={leadSearch}
                    onChange={(e) => setLeadSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="max-h-[160px] overflow-y-auto border rounded-md">
                  {filteredLeads.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {leadSearch ? "No leads found" : "No leads available"}
                    </p>
                  ) : (
                    filteredLeads.map((lead) => (
                      <button
                        key={lead.id}
                        type="button"
                        onClick={() => { setSelectedLeadId(lead.id); setLeadSearch(lead.name); }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors border-b last:border-b-0 ${
                          selectedLeadId === lead.id
                            ? "bg-primary/10 text-primary font-medium"
                            : ""
                        }`}
                      >
                        {lead.name}
                      </button>
                    ))
                  )}
                </div>
                {selectedLeadId && (
                  <p className="text-xs text-green-600 font-medium">
                    ✓ Selected: {leads?.find(l => l.id === selectedLeadId)?.name}
                  </p>
                )}
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="type">Task Type</Label>
              <Select value={type} onValueChange={(val) => setType(val || "CALL")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {TASK_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dueAt">Due Date & Time *</Label>
              <Input
                id="dueAt"
                type="datetime-local"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="What needs to be done?"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => { resetForm(); onOpenChange(false); }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !actualLeadId}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
