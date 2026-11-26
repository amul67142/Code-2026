"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { ArrowLeft, CheckCircle2, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AttachmentList } from "@/components/support/attachment-list";
import { AttachmentPicker } from "@/components/support/attachment-picker";
import { TicketStatusBadge } from "@/components/support/status-badge";
import {
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  type MessageView,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
  type UploadedFile,
} from "@/lib/support/constants";
import { cn } from "@/lib/utils";
import { replyToSupportTicket, setOwnTicketResolved } from "../actions";

export function TicketThread({
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
    createdByName: string | null;
  };
  messages: MessageView[];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [changing, setChanging] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const onFiles = useCallback((f: UploadedFile[]) => setFiles(f), []);
  const onBusy = useCallback((b: boolean) => setUploading(b), []);
  const closed = ticket.status === "CLOSED";

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (uploading) return toast.error("Wait for the files to finish uploading.");
    setSending(true);
    const res = await replyToSupportTicket(ticket.id, body, files);
    setSending(false);
    if ("error" in res && res.error) return toast.error(res.error);
    setBody("");
    setResetKey((k) => k + 1);
    toast.success("Reply sent.");
    router.refresh();
  }

  async function setResolved(resolved: boolean) {
    setChanging(true);
    const res = await setOwnTicketResolved(ticket.id, resolved);
    setChanging(false);
    if ("error" in res && res.error) return toast.error(res.error);
    toast.success(resolved ? "Marked as resolved." : "Ticket reopened.");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      <Link href="/support?tab=tickets" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All tickets
      </Link>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm text-muted-foreground">{ticket.ref}</span>
          <TicketStatusBadge status={ticket.status} />
        </div>
        <h1 className="text-xl font-bold tracking-tight">{ticket.subject}</h1>
        <p className="text-sm text-muted-foreground">
          {TICKET_CATEGORIES[ticket.category]} · {TICKET_PRIORITIES[ticket.priority]} · raised
          {ticket.createdByName ? ` by ${ticket.createdByName}` : ""} on {format(new Date(ticket.createdAt), "d MMM yyyy, h:mm a")}
        </p>
      </div>

      <div className="space-y-4">
        {messages.map((m) => {
          const support = m.authorType === "SUPPORT";
          return (
            <div key={m.id} className={cn("rounded-xl border p-4", support ? "border-primary/20 bg-primary/5" : "bg-card")}>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-semibold">{support ? "BigLead Support" : m.authorName}</span>
                <span className="text-xs text-muted-foreground">{format(new Date(m.createdAt), "d MMM, h:mm a")}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.body}</p>
              <AttachmentList files={m.attachments} />
            </div>
          );
        })}
      </div>

      {closed ? (
        <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
          This ticket is closed. If you still need help, <Link href="/support?tab=new" className="underline">raise a new ticket</Link>.
        </div>
      ) : (
        <form ref={formRef} onSubmit={send} className="space-y-3 rounded-xl border bg-card p-4">
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} maxLength={10000} placeholder="Write a reply…" />
          <AttachmentPicker key={resetKey} onChange={onFiles} onBusyChange={onBusy} pasteTarget={formRef} />
          <div className="flex flex-wrap items-center justify-between gap-2">
            {ticket.status === "RESOLVED" ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => setResolved(false)} disabled={changing}>
                <RotateCcw className="size-4" /> Not solved — reopen
              </Button>
            ) : (
              <Button type="button" variant="ghost" size="sm" onClick={() => setResolved(true)} disabled={changing}>
                <CheckCircle2 className="size-4" /> Mark as resolved
              </Button>
            )}
            <Button type="submit" disabled={sending || uploading || (!body.trim() && !files.length)}>
              {(sending || uploading) && <Loader2 className="size-4 animate-spin" />}
              {uploading ? "Uploading files…" : "Send reply"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
