"use client";

import { useEffect, useState, useTransition } from "react";
import { getLeads } from "./actions";
import { getStages } from "../settings/pipeline/actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
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
  Loader2,
  LayoutGrid,
  Phone,
  Mail,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

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
  OTHER: "bg-gray-100 text-gray-500",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Lead = any;

interface Stage {
  id: string;
  name: string;
  color: string;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [leadsData, stagesData] = await Promise.all([
        getLeads(),
        getStages(),
      ]);
      setLeads(leadsData);
      setStages(stagesData as Stage[]);
    } catch {
      console.error("Failed to load data");
    } finally {
      setIsLoading(false);
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

  // Trigger filter when selections change
  useEffect(() => {
    if (!isLoading) applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageFilter, sourceFilter]);

  function handleSearchKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") applyFilters();
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
          <p className="text-muted-foreground">
            Manage and track all your leads.
          </p>
        </div>
        <div className="flex items-center gap-2">
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

        <Select value={stageFilter} onValueChange={(v) => setStageFilter(v ?? "all")}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Stages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            {stages.map((s) => (
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

        <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v ?? "all")}>
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

      {/* Table */}
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Assigned</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No leads found.{" "}
                  <Link href="/leads/new" className="text-primary underline">
                    Create your first lead
                  </Link>
                </TableCell>
              </TableRow>
            ) : (
              leads.map((lead: Lead) => (
                <TableRow key={lead.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">{lead.name}</TableCell>
                  <TableCell>
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
                  <TableCell>
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        SOURCE_COLORS[lead.source] || SOURCE_COLORS.OTHER
                      }`}
                    >
                      {lead.source?.replace(/_/g, " ")}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">
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
                  <TableCell className="text-sm">
                    {lead.assigned_user?.name || (
                      <span className="text-muted-foreground">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
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
