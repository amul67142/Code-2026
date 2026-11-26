"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { ArrowLeft, Loader2 } from "lucide-react";
import { AttachmentList } from "@/components/support/attachment-list";
import { AttachmentPicker } from "@/components/support/attachment-picker";
import { TicketStatusBadge } from "@/components/support/status-badge";
import {
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  type MessageView,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
  type UploadedFile,
} from "@/lib/support/constants";
import { cn } from "@/lib/utils";
import { getOwnerUploadLink, ownerReply, ownerSetStatus } from "../actions";

export function OwnerTicketClient({
  ticket,
  messages,
}: {
  ticket: {
    id: string;
    ref: string;
    subject: string;
    category: TicketCategory;
    priority: TicketPriority;
    status: TicketStatus;
    createdAt: string;
    companyId: string;
    companyName: string;
    clientName: string | null;
    clientEmail: string | null;
    clientRole: string | null;
    context: Record<string, string | number>;
  };
  messages: MessageView[];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [nextStatus, setNextStatus] = useState<TicketStatus | "">("");
  const [resetKey, setResetKey] = useState(0);
  const onFiles = useCallback((f: UploadedFile[]) => setFiles(f), []);
  const onBusy = useCallback((b: boolean) => setUploading(b), []);
  const getLink = useCallback((n: string, m: string, s: number) => getOwnerUploadLink(ticket.id, n, m, s), [ticket.id]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (uploading) return toast.error("Wait for the files to finish uploading.");
    setSending(true);
    const res = await ownerReply(ticket.id, body, files, nextStatus || undefined);
    setSending(false);
    if ("error" in res && res.error) return toast.error(res.error);
    setBody("");
    setNextStatus("");
    setResetKey((k) => k + 1);
    toast.success(ticket.clientEmail ? `Reply sent — ${ticket.clientName || "the client"} gets an email.` : "Reply saved.");
    router.refresh();
  }

  async function changeStatus(status: TicketStatus) {
    const res = await ownerSetStatus(ticket.id, status);
    if ("error" in res && res.error) return toast.error(res.error);
    toast.success(`Marked ${TICKET_STATUSES[status].toLowerCase()}.`);
    router.refresh();
  }

  const ctx = Object.entries(ticket.context || {});

  return (
    <div className="max-w-4xl space-y-6">
      <Link href="/owner-admin/tickets" className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white">
        <ArrowLeft className="size-4" /> All tickets
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-zinc-500">{ticket.ref}</span>
            <TicketStatusBadge status={ticket.status} dark />
            {ticket.priority !== "NORMAL" && (
              <span className={cn("rounded-full border px-2 py-0.5 text-xs font-semibold", ticket.priority === "URGENT" ? "border-red-500/30 bg-red-500/15 text-red-300" : "border-orange-500/30 bg-orange-500/15 text-orange-300")}>
                {TICKET_PRIORITIES[ticket.priority]}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-white">{ticket.subject}</h1>
          <p className="text-sm text-zinc-400">
            {TICKET_CATEGORIES[ticket.category]} · {ticket.companyName}
            {ticket.clientName ? ` · ${ticket.clientName}` : ""}
            {ticket.clientEmail ? ` (${ticket.clientEmail})` : ""}
            {ticket.clientRole ? ` · ${ticket.clientRole}` : ""} · {format(new Date(ticket.createdAt), "d MMM yyyy, h:mm a")}
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-zinc-400">
          Status
          <select
            value={ticket.status}
            onChange={(e) => changeStatus(e.target.value as TicketStatus)}
            className="h-9 rounded-md border border-zinc-700 bg-zinc-900 px-2 text-sm text-zinc-100"
          >
            {Object.entries(TICKET_STATUSES).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="space-y-4">
        {messages.map((m) => {
          const support = m.authorType === "SUPPORT";
          return (
            <div key={m.id} className={cn("rounded-xl border p-4", support ? "border-indigo-500/30 bg-indigo-500/5" : "border-zinc-800 bg-zinc-900")}>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-semibold text-zinc-100">{m.authorName}</span>
                <span className="text-xs text-zinc-500">{format(new Date(m.createdAt), "d MMM, h:mm a")}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-200">{m.body}</p>
              <AttachmentList files={m.attachments} dark />
            </div>
          );
        })}
      </div>

      <form ref={formRef} onSubmit={send} className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          maxLength={10000}
          placeholder={`Reply to ${ticket.clientName || "the client"}…`}
          className="w-full rounded-md border border-zinc-700 bg-zinc-950 p-3 text-sm text-zinc-100 outline-none focus:border-indigo-500"
        />
        <AttachmentPicker key={resetKey} onChange={onFiles} onBusyChange={onBusy} pasteTarget={formRef} getLink={getLink} dark />
        <div className="flex flex-wrap items-center justify-end gap-3">
          <label className="flex items-center gap-2 text-sm text-zinc-400">
            and set status
            <select
              value={nextStatus}
              onChange={(e) => setNextStatus(e.target.value as TicketStatus | "")}
              className="h-9 rounded-md border border-zinc-700 bg-zinc-950 px-2 text-sm text-zinc-100"
            >
              <option value="">{ticket.status === "OPEN" ? "In progress (default)" : "Keep as is"}</option>
              {Object.entries(TICKET_STATUSES).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={sending || uploading || (!body.trim() && !files.length)}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {(sending || uploading) && <Loader2 className="size-4 animate-spin" />}
            {uploading ? "Uploading…" : "Send reply"}
          </button>
        </div>
      </form>

      {ctx.length > 0 && (
        <details className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-400">
          <summary className="cursor-pointer text-zinc-300">Client&apos;s browser details</summary>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
            {ctx.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-zinc-500">{k}</dt>
                <dd className="break-all">{String(v)}</dd>
              </div>
            ))}
          </dl>
        </details>
      )}
    </div>
  );
}
