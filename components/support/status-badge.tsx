import { TICKET_STATUSES, type TicketStatus } from "@/lib/support/constants";
import { cn } from "@/lib/utils";

const LIGHT: Record<TicketStatus, string> = {
  OPEN: "bg-blue-50 text-blue-700 border-blue-200",
  IN_PROGRESS: "bg-amber-50 text-amber-700 border-amber-200",
  RESOLVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CLOSED: "bg-gray-100 text-gray-600 border-gray-200",
};

const DARK: Record<TicketStatus, string> = {
  OPEN: "bg-blue-500/10 text-blue-300 border-blue-500/30",
  IN_PROGRESS: "bg-amber-500/10 text-amber-300 border-amber-500/30",
  RESOLVED: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
  CLOSED: "bg-zinc-800 text-zinc-400 border-zinc-700",
};

export function TicketStatusBadge({ status, dark = false }: { status: TicketStatus; dark?: boolean }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap", (dark ? DARK : LIGHT)[status])}>
      {TICKET_STATUSES[status]}
    </span>
  );
}
