"use client";

import { useEffect, useState, useTransition } from "react";
import { getLeads, updateLeadAssignment } from "./actions";
import {
  bulkDeleteLeads,
  sendBulkWhatsApp,
  getBulkSendQuota,
} from "../settings/integrations/whatsapp-bulk-actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  LayoutGrid,
  Phone,
  Mail,
  Download,
  Upload,
  Trash2,
  Send,
  Loader2,
  X,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";
import Papa from "papaparse";
import { ImportLeadsDialog } from "./import-leads-dialog";

const SOURCES = [
  "MANUAL",
  "GOOGLE_ADS",
  "FACEBOOK_ADS",
  "WEBSITE_FORM",
  "WALK_IN",
  "REFERRAL",
  "CSV_IMPORT",
  "OTHER",
];

const SOURCE_COLORS: Record<string, string> = {
  MANUAL: "bg-gray-100 text-gray-700",
  GOOGLE_ADS: "bg-blue-100 text-blue-700",
  FACEBOOK_ADS: "bg-indigo-100 text-indigo-700",
  WEBSITE_FORM: "bg-green-100 text-green-700",
  WALK_IN: "bg-amber-100 text-amber-700",
  REFERRAL: "bg-purple-100 text-purple-700",
  CSV_IMPORT: "bg-cyan-100 text-cyan-700",
  OTHER: "bg-gray-100 text-gray-800",
};

const STATUS_COLORS: Record<string, string> = {
  New: "bg-blue-50 text-blue-700 border-blue-200",
  Contacted: "bg-cyan-50 text-cyan-700 border-cyan-200",
  Interested: "bg-green-50 text-green-700 border-green-200",
  "Not Interested": "bg-red-50 text-red-700 border-red-200",
  "Follow Up": "bg-amber-50 text-amber-700 border-amber-200",
  "Site Visit Scheduled": "bg-purple-50 text-purple-700 border-purple-200",
  "Site Visit Done": "bg-indigo-50 text-indigo-700 border-indigo-200",
  Negotiation: "bg-orange-50 text-orange-700 border-orange-200",
  "Booking Done": "bg-emerald-50 text-emerald-700 border-emerald-200",
  Lost: "bg-gray-50 text-gray-500 border-gray-200",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Lead = any;

interface Stage {
  id: string;
  name: string;
  color: string;
}

interface Agent {
  id: string;
  name: string;
}

interface LeadsClientProps {
  initialLeads: Lead[];
  initialStages: Stage[];
  initialAgents: Agent[];
}

export default function LeadsClient({
  initialLeads,
  initialStages,
  initialAgents,
}: LeadsClientProps) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [isImportOpen, setIsImportOpen] = useState(false);

  // ── Bulk selection ──
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [quota, setQuota] = useState<{ maxPerBatch: number; remainingToday: number } | null>(null);

  useEffect(() => {
    if (selected.size > 0 && quota === null) {
      getBulkSendQuota().then(setQuota).catch(() => {});
    }
  }, [selected.size, quota]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) =>
      prev.size === leads.length ? new Set() : new Set(leads.map((l: Lead) => l.id))
    );
  }

  async function handleBulkDelete() {
    if (!selected.size) return;
    if (!confirm(`Delete ${selected.size} lead${selected.size > 1 ? "s" : ""}? They will be removed from the pipeline.`)) return;
    setBulkBusy(true);
    try {
      const res = await bulkDeleteLeads(Array.from(selected));
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(`Deleted ${res.deleted} lead${(res.deleted || 0) > 1 ? "s" : ""}`);
        setLeads((prev) => prev.filter((l: Lead) => !selected.has(l.id)));
        setSelected(new Set());
      }
    } finally {
      setBulkBusy(false);
    }
  }

  async function handleBulkWhatsApp() {
    if (!selected.size) return;
    const max = quota?.maxPerBatch ?? 30;
    if (selected.size > max) {
      toast.error(`You can send to at most ${max} leads per batch.`);
      return;
    }
    if (!confirm(`Send your WhatsApp welcome template to ${selected.size} lead${selected.size > 1 ? "s" : ""}?`)) return;
    setBulkBusy(true);
    try {
      const res = await sendBulkWhatsApp(Array.from(selected));
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(
          `WhatsApp: ${res.sent} sent${res.failed ? `, ${res.failed} failed` : ""}${res.skipped ? `, ${res.skipped} without phone` : ""} · ${res.remainingToday} left today`
        );
        setQuota((q) => (q ? { ...q, remainingToday: res.remainingToday ?? q.remainingToday } : q));
        setSelected(new Set());
      }
    } finally {
      setBulkBusy(false);
    }
  }

  function applyFilters() {
    startTransition(async () => {
      try {
        const filters: Record<string, string> = {};
        if (stageFilter !== "all") filters.stage_id = stageFilter;
        if (sourceFilter !== "all") filters.source = sourceFilter;
        if (search.trim()) filters.search = search.trim();

        const data = await getLeads(filters);
        setLeads(data);
      } catch {
        console.error("Failed to filter leads");
      }
    });
  }

  function handleStageChange(v: string | null) {
    const val = v ?? "all";
    setStageFilter(val);
    // Trigger filter immediately
    startTransition(async () => {
      try {
        const filters: Record<string, string> = {};
        if (val !== "all") filters.stage_id = val;
        if (sourceFilter !== "all") filters.source = sourceFilter;
        if (search.trim()) filters.search = search.trim();
        const data = await getLeads(filters);
        setLeads(data);
      } catch {
        console.error("Failed to filter leads");
      }
    });
  }

  function handleSourceChange(v: string | null) {
    const val = v ?? "all";
    setSourceFilter(val);
    startTransition(async () => {
      try {
        const filters: Record<string, string> = {};
        if (stageFilter !== "all") filters.stage_id = stageFilter;
        if (val !== "all") filters.source = val;
        if (search.trim()) filters.search = search.trim();
        const data = await getLeads(filters);
        setLeads(data);
      } catch {
        console.error("Failed to filter leads");
      }
    });
  }

  function handleSearchKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") applyFilters();
  }

  async function handleAssign(leadId: string, agentId: string) {
    const assignedToId = agentId === "unassigned" ? null : agentId;
    const result = await updateLeadAssignment(leadId, assignedToId);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    // Optimistic update
    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId
          ? {
              ...l,
              assigned_user: assignedToId
                ? initialAgents.find((a) => a.id === assignedToId) || null
                : null,
            }
          : l
      )
    );
    toast.success(assignedToId ? "Lead assigned" : "Lead unassigned");
  }

  function handleExportCSV() {
    if (leads.length === 0) {
      toast.error("No leads to export");
      return;
    }

    const exportData = leads.map(l => ({
      "Lead Name": l.name,
      "Phone": l.phone || "",
      "Email": l.email || "",
      "Stage": l.stage?.name || "",
      "Source": l.source || "",
      "Project": l.project?.name || "",
      "Assigned To": l.assigned_user?.name || "Unassigned",
      "Status 1": l.status_1 || "",
      "Status 1 Remark": l.status_1_remark || "",
      "Status 2": l.status_2 || "",
      "Status 2 Remark": l.status_2_remark || "",
      "Created At": l.created_at ? format(new Date(l.created_at), "PPp") : "",
    }));

    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `leads_export_${format(new Date(), "yyyyMMdd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="space-y-4">
      <ImportLeadsDialog open={isImportOpen} onOpenChange={setIsImportOpen} />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
          <p className="text-muted-foreground">
            Manage and track all your leads.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" onClick={() => setIsImportOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Link
            href="/leads/kanban"
            className={buttonVariants({ variant: "outline" })}
          >
            <LayoutGrid className="mr-2 h-4 w-4" />
            Kanban
          </Link>
          <Link
            href="/leads/new"
            className={buttonVariants({ variant: "default" })}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Lead
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, email..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
          />
        </div>

        <Select value={stageFilter} onValueChange={handleStageChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Stages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            {initialStages.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                <span className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full inline-block"
                    style={{ backgroundColor: s.color }}
                  />
                  {s.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sourceFilter} onValueChange={handleSourceChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Sources" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            {SOURCES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="text-sm text-muted-foreground">
          {isPending ? "Loading..." : `${leads.length} leads`}
        </span>
      </div>

      {/* Bulk actions toolbar */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <Button size="sm" variant="outline" onClick={handleBulkWhatsApp} disabled={bulkBusy}>
            {bulkBusy ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <Send className="mr-1.5 size-3.5" />}
            Send WhatsApp
          </Button>
          <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={handleBulkDelete} disabled={bulkBusy}>
            <Trash2 className="mr-1.5 size-3.5" /> Delete
          </Button>
          <button onClick={() => setSelected(new Set())} className="ml-auto p-1 rounded hover:bg-muted" aria-label="Clear selection">
            <X className="size-4 text-muted-foreground" />
          </button>
          {quota && (
            <span className="w-full text-[11px] text-muted-foreground">
              WhatsApp limits: max {quota.maxPerBatch} per batch · {quota.remainingToday} manual sends left today
            </span>
          )}
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
          <TableRow>
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  checked={leads.length > 0 && selected.size === leads.length}
                  onChange={toggleSelectAll}
                  className="size-4 accent-primary cursor-pointer"
                  aria-label="Select all leads"
                />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="hidden md:table-cell">Contact</TableHead>
              <TableHead className="hidden lg:table-cell">Source</TableHead>
              <TableHead className="hidden lg:table-cell">Project</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead className="hidden xl:table-cell">Statuses</TableHead>
              <TableHead className="hidden sm:table-cell">Assigned</TableHead>
              <TableHead className="hidden md:table-cell">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center">
                  No leads found.{" "}
                  <Link href="/leads/new" className="text-primary underline">
                    Create your first lead
                  </Link>
                </TableCell>
              </TableRow>
            ) : (
              leads.map((lead: Lead) => (
                <TableRow key={lead.id} className={`hover:bg-muted/50 ${selected.has(lead.id) ? "bg-primary/5" : ""}`}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selected.has(lead.id)}
                      onChange={() => toggleSelect(lead.id)}
                      className="size-4 accent-primary cursor-pointer"
                      aria-label={`Select ${lead.name}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link
                      href={`/leads/${lead.id}`}
                      prefetch={false}
                      className="text-primary hover:underline"
                    >
                      {lead.name}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex flex-col gap-0.5 text-xs">
                      {lead.phone && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {lead.phone}
                        </span>
                      )}
                      {lead.email && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {lead.email}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        SOURCE_COLORS[lead.source] || SOURCE_COLORS.OTHER
                      }`}
                    >
                      {lead.source?.replace(/_/g, " ")}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm hidden lg:table-cell">
                    {lead.projects?.name || (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {lead.pipeline_stages ? (
                      <Badge
                        variant="outline"
                        className="text-xs"
                        style={{
                          borderColor: lead.pipeline_stages.color,
                          color: lead.pipeline_stages.color,
                        }}
                      >
                        {lead.pipeline_stages.name}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden xl:table-cell">
                    <div className="flex flex-col gap-1">
                      {lead.status_1 && (
                        <div className="flex flex-col">
                          <span className={`inline-block w-fit text-[10px] px-1.5 py-0.5 rounded border ${STATUS_COLORS[lead.status_1] || "bg-gray-50 text-gray-600 border-gray-200"}`}>
                            1: {lead.status_1}
                          </span>
                          {lead.status_1_remark && <span className="text-[10px] text-muted-foreground truncate max-w-[120px]" title={lead.status_1_remark}>{lead.status_1_remark}</span>}
                        </div>
                      )}
                      {lead.status_2 && (
                        <div className="flex flex-col">
                          <span className={`inline-block w-fit text-[10px] px-1.5 py-0.5 rounded border ${STATUS_COLORS[lead.status_2] || "bg-gray-50 text-gray-600 border-gray-200"}`}>
                            2: {lead.status_2}
                          </span>
                          {lead.status_2_remark && <span className="text-[10px] text-muted-foreground truncate max-w-[120px]" title={lead.status_2_remark}>{lead.status_2_remark}</span>}
                        </div>
                      )}
                      {!lead.status_1 && !lead.status_2 && (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <select
                      className="h-8 w-[150px] text-xs rounded-md border border-input bg-background px-2 py-1 focus:outline-none focus:ring-2 focus:ring-ring"
                      value={lead.assigned_user?.id || "unassigned"}
                      onChange={(e) => handleAssign(lead.id, e.target.value)}
                    >
                      <option value="unassigned">Unassigned</option>
                      {initialAgents.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground hidden md:table-cell">
                    {format(new Date(lead.created_at), "MMM d, yyyy")}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
