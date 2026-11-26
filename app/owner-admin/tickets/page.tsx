import Link from "next/link";
import { formatDistanceToNowStrict } from "date-fns";
import { LifeBuoy } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwner } from "@/lib/owner/session";
import { TicketStatusBadge } from "@/components/support/status-badge";
import { TICKET_CATEGORIES, TICKET_STATUSES, ticketRef, type TicketStatus } from "@/lib/support/constants";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Tickets | BigLead Owner",
};

export const dynamic = "force-dynamic";

const FILTERS: { key: string; label: string; statuses: TicketStatus[] }[] = [
  { key: "active", label: "Needs attention", statuses: ["OPEN", "IN_PROGRESS"] },
  { key: "resolved", label: "Resolved", statuses: ["RESOLVED"] },
  { key: "closed", label: "Closed", statuses: ["CLOSED"] },
  { key: "all", label: "All", statuses: ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] },
];

const PRIORITY_STYLE: Record<string, string> = {
  URGENT: "bg-red-500/15 text-red-300 border-red-500/30",
  HIGH: "bg-orange-500/15 text-orange-300 border-orange-500/30",
};

export default async function OwnerTicketsPage({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  if (!(await isOwner())) return null;
  const { f } = await searchParams;
  const filter = FILTERS.find((x) => x.key === f) || FILTERS[0];

  const admin = createAdminClient();
  const [{ data }, { data: counts }] = await Promise.all([
    admin
      .from("support_tickets")
      .select("id, ticket_number, subject, category, priority, status, last_message_at, last_message_by, companies ( name ), users:created_by ( name )")
      .in("status", filter.statuses)
      .order("last_message_at", { ascending: false })
      .limit(200),
    admin.from("support_tickets").select("status"),
  ]);
  const countOf = (statuses: TicketStatus[]) => (counts || []).filter((c) => statuses.includes(c.status)).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight text-white">
          <LifeBuoy className="size-7" /> Support Tickets
        </h1>
        <p className="mt-2 text-zinc-400">Issues raised by clients from Support in the app. You get an email for every new ticket and reply.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((x) => (
          <Link
            key={x.key}
            href={`/owner-admin/tickets?f=${x.key}`}
            className={cn(
              "rounded-full border px-3 py-1 text-sm",
              x.key === filter.key ? "border-indigo-500/50 bg-indigo-500/10 text-indigo-300" : "border-zinc-800 text-zinc-400 hover:text-zinc-100"
            )}
          >
            {x.label} <span className="ml-1 text-zinc-500">{countOf(x.statuses)}</span>
          </Link>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
        {!data?.length ? (
          <p className="px-6 py-12 text-center text-sm text-zinc-500">No tickets here.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-900 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Ticket</th>
                <th className="px-4 py-3 font-medium">Subject</th>
                <th className="px-4 py-3 font-medium">Company</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Last update</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {data.map((t) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const any = t as any;
                const waiting = t.last_message_by === "CLIENT" && (t.status === "OPEN" || t.status === "IN_PROGRESS");
                return (
                  <tr key={t.id} className="hover:bg-zinc-800/40">
                    <td className="px-4 py-3 font-mono text-xs text-zinc-400">
                      <Link href={`/owner-admin/tickets/${t.id}`} className="hover:text-white">{ticketRef(t.ticket_number)}</Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/owner-admin/tickets/${t.id}`} className="font-medium text-zinc-100 hover:underline">{t.subject}</Link>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                        {TICKET_CATEGORIES[t.category as keyof typeof TICKET_CATEGORIES]}
                        {PRIORITY_STYLE[t.priority] && (
                          <span className={cn("rounded-full border px-1.5 py-px text-[10px] font-semibold", PRIORITY_STYLE[t.priority])}>{t.priority}</span>
                        )}
                        {waiting && <span className="text-indigo-300">● awaiting your reply</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-300">
                      {any.companies?.name || "—"}
                      {any.users?.name && <div className="text-xs text-zinc-500">{any.users.name}</div>}
                    </td>
                    <td className="px-4 py-3"><TicketStatusBadge status={t.status as keyof typeof TICKET_STATUSES} dark /></td>
                    <td className="px-4 py-3 text-xs text-zinc-400">{formatDistanceToNowStrict(new Date(t.last_message_at), { addSuffix: true })}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
