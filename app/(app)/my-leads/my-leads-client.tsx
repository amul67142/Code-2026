"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import {
  ClipboardList,
  Phone,
  Mail,
  Loader2,
  Search,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { updateLeadStatus } from "../leads/[id]/actions";
import {
  STATUS_OPTIONS,
  allStatusesUsed,
  openStatusSlots,
  remarkKey,
  savedStatuses,
  statusClass,
  statusDraft,
  statusKey,
  statusSavedMessage,
  type StatusDraft,
} from "../leads/status-options";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function MyLeadsClient({ initialLeads = [] }: { initialLeads?: any[] }) {
  const [leads, setLeads] = useState(initialLeads);
  const [search, setSearch] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [statuses, setStatuses] = useState<StatusDraft>(() => statusDraft({}));
  const [savingStatus, setSavingStatus] = useState(false);

  const filteredLeads = leads.filter((lead) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      lead.name?.toLowerCase().includes(q) ||
      lead.phone?.toLowerCase().includes(q) ||
      lead.email?.toLowerCase().includes(q)
    );
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const openStatusDialog = (lead: any) => {
    setSelectedLead(lead);
    setStatuses(statusDraft(lead));
  };

  const handleSaveStatus = async () => {
    if (!selectedLead) return;
    setSavingStatus(true);
    try {
      const result = await updateLeadStatus(selectedLead.id, statuses);

      if (result.error) {
        toast.error(result.error);
      } else {
        const saved = savedStatuses(statuses);
        toast.success(statusSavedMessage(selectedLead, saved));
        setLeads((prev) => prev.map((l) => (l.id === selectedLead.id ? { ...l, ...saved } : l)));
        setSelectedLead(null);
      }
    } catch {
      toast.error("Failed to update status");
    } finally {
      setSavingStatus(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList className="size-6" />
            My Assigned Leads
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {leads.length} lead{leads.length !== 1 ? "s" : ""} assigned to you
          </p>
        </div>
        <div className="relative w-full sm:w-[280px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search leads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Leads grid */}
      {filteredLeads.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <ClipboardList className="size-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700">
              {leads.length === 0
                ? "No leads assigned yet"
                : "No matching leads"}
            </h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              {leads.length === 0
                ? "Leads will appear here once they are assigned to you by your admin or team lead."
                : "Try a different search term."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredLeads.map((lead) => (
            <Card
              key={lead.id}
              className="hover:shadow-md transition-shadow duration-200"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">
                      <Link
                        href={`/leads/${lead.id}`}
                        prefetch={false}
                        className="text-primary hover:underline"
                      >
                        {lead.name}
                      </Link>
                    </CardTitle>
                    {lead.pipeline_stages && (
                      <Badge
                        variant="outline"
                        className="mt-1 text-[10px]"
                        style={{
                          borderColor: lead.pipeline_stages.color,
                          color: lead.pipeline_stages.color,
                        }}
                      >
                        {lead.pipeline_stages.name}
                      </Badge>
                    )}
                  </div>
                  <Link
                    href={`/leads/${lead.id}`}
                    prefetch={false}
                    className="text-muted-foreground hover:text-primary shrink-0 ml-2"
                  >
                    <ExternalLink className="size-4" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Contact info */}
                <div className="space-y-1 text-sm text-muted-foreground">
                  {lead.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="size-3.5 shrink-0" />
                      <span className="truncate">{lead.phone}</span>
                    </div>
                  )}
                  {lead.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="size-3.5 shrink-0" />
                      <span className="truncate">{lead.email}</span>
                    </div>
                  )}
                </div>

                {/* Statuses */}
                <div className="grid grid-cols-2 gap-2">
                  {openStatusSlots(lead).map((n) => (
                    <div key={n} className="space-y-1">
                      <p className="text-[10px] uppercase font-medium text-muted-foreground">
                        Status {n}
                      </p>
                      {lead[statusKey(n)] ? (
                        <span
                          className={`inline-block text-xs px-2 py-0.5 rounded-full border ${statusClass(lead[statusKey(n)])}`}
                        >
                          {lead[statusKey(n)]}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                      {lead[remarkKey(n)] && (
                        <p
                          className="text-[11px] text-muted-foreground truncate"
                          title={lead[remarkKey(n)]}
                        >
                          {lead[remarkKey(n)]}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-[11px] text-muted-foreground">
                    {formatDistanceToNow(new Date(lead.created_at), {
                      addSuffix: true,
                    })}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => openStatusDialog(lead)}
                  >
                    Update Status
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Status Update Dialog */}
      <Dialog
        open={!!selectedLead}
        onOpenChange={(open) => !open && setSelectedLead(null)}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Update Status — {selectedLead?.name}</DialogTitle>
            <DialogDescription>
              Set the current pipeline statuses and add internal remarks.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 sm:grid-cols-2">
            {selectedLead &&
              openStatusSlots(selectedLead).map((n) => (
                <div key={n} className="space-y-2">
                  <Label>Status {n}</Label>
                  <select
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    value={statuses[statusKey(n)]}
                    onChange={(e) => setStatuses((d) => ({ ...d, [statusKey(n)]: e.target.value }))}
                  >
                    <option value="">Select status...</option>
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <Textarea
                    placeholder={`Remark for Status ${n}...`}
                    value={statuses[remarkKey(n)]}
                    onChange={(e) => setStatuses((d) => ({ ...d, [remarkKey(n)]: e.target.value }))}
                    className="min-h-[60px] text-sm"
                  />
                </div>
              ))}
          </div>
          {selectedLead && allStatusesUsed(selectedLead) && (
            <p className="text-sm text-muted-foreground">
              All 6 statuses are used. Open the lead to add further updates in Log Activity.
            </p>
          )}
          <div className="flex justify-end">
            <Button onClick={handleSaveStatus} disabled={savingStatus}>
              {savingStatus && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Status
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
