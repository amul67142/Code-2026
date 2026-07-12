"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { getWhatsAppMessageLog } from "../integrations/whatsapp-bulk-actions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = any;

type Filter = "ALL" | "SENT" | "FAILED" | "INBOUND";

function statusBadge(r: Row) {
  if (r.direction === "INBOUND")
    return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Reply</Badge>;
  if (r.status === "SENT")
    return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Sent</Badge>;
  if (r.status === "FAILED")
    return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Failed</Badge>;
  return <Badge variant="secondary">{r.status}</Badge>;
}

export function WhatsAppLogsClient({ initialRows }: { initialRows: Row[] }) {
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [isPending, startTransition] = useTransition();

  function applyFilter(f: Filter) {
    setFilter(f);
    startTransition(async () => {
      const res = await getWhatsAppMessageLog(f === "ALL" ? undefined : f);
      setRows(res.rows);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        {(["ALL", "SENT", "FAILED", "INBOUND"] as Filter[]).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "default" : "outline"}
            onClick={() => applyFilter(f)}
            disabled={isPending}
          >
            {f === "ALL" ? "All" : f === "SENT" ? "Sent" : f === "FAILED" ? "Failed" : "Replies"}
          </Button>
        ))}
        <Button size="sm" variant="ghost" onClick={() => applyFilter(filter)} disabled={isPending} className="ml-auto">
          {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
        </Button>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2.5 font-medium">Status</th>
              <th className="px-3 py-2.5 font-medium">Number</th>
              <th className="px-3 py-2.5 font-medium hidden sm:table-cell">Lead</th>
              <th className="px-3 py-2.5 font-medium hidden md:table-cell">Template / Message</th>
              <th className="px-3 py-2.5 font-medium">When</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-10 text-center text-muted-foreground">
                  No messages{filter !== "ALL" ? " for this filter" : " yet"}.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="hover:bg-muted/30">
                  <td className="px-3 py-2.5">
                    <div className="flex flex-col gap-1">
                      {statusBadge(r)}
                      {r.is_auto === false && r.direction === "OUTBOUND" && (
                        <span className="text-[10px] text-muted-foreground">manual</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs">{r.to_address || "—"}</td>
                  <td className="px-3 py-2.5 hidden sm:table-cell">
                    {r.leads?.id ? (
                      <Link href={`/leads/${r.leads.id}`} prefetch={false} className="text-primary hover:underline">
                        {r.leads.name || "Lead"}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 hidden md:table-cell max-w-[280px]">
                    <p className="truncate text-xs">{r.subject || "—"}</p>
                    {r.status === "FAILED" && r.error_message && (
                      <p className="truncate text-[11px] text-red-600" title={r.error_message}>
                        {r.error_message}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">Showing the latest 200 messages.</p>
    </div>
  );
}
