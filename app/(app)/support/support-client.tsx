"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatDistanceToNowStrict } from "date-fns";
import { ChevronDown, CircleHelp, Inbox, LifeBuoy, Loader2, Search, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AttachmentPicker } from "@/components/support/attachment-picker";
import { TicketStatusBadge } from "@/components/support/status-badge";
import {
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  ticketRef,
  type TicketCategory,
  type TicketPriority,
  type TicketSummary,
  type UploadedFile,
} from "@/lib/support/constants";
import { cn } from "@/lib/utils";
import { createSupportTicket } from "./actions";
import { FAQ } from "./faq";

const selectClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

export function SupportClient({
  tickets,
  showAuthor,
  initialTab,
}: {
  tickets: TicketSummary[];
  showAuthor: boolean;
  initialTab: "help" | "new" | "tickets";
}) {
  const [tab, setTab] = useState<string>(initialTab);
  const openCount = tickets.filter((t) => t.status === "OPEN" || t.status === "IN_PROGRESS").length;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <LifeBuoy className="size-6" /> Support
          </h1>
          <p className="text-muted-foreground">Answers to common questions, and a direct line to the BigLead team.</p>
        </div>
        <Button onClick={() => setTab("new")}>Raise a ticket</Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
        <TabsList>
          <TabsTrigger value="help">
            <CircleHelp className="size-4" /> Help
          </TabsTrigger>
          <TabsTrigger value="new">
            <Send className="size-4" /> Raise a ticket
          </TabsTrigger>
          <TabsTrigger value="tickets">
            <Inbox className="size-4" /> {showAuthor ? "Tickets" : "My tickets"}
            {openCount > 0 && (
              <span className="ml-1 rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">{openCount}</span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="help" className="mt-4">
          <HelpSection onRaise={() => setTab("new")} />
        </TabsContent>
        <TabsContent value="new" className="mt-4">
          <NewTicketForm onCreated={() => setTab("tickets")} />
        </TabsContent>
        <TabsContent value="tickets" className="mt-4">
          <TicketList tickets={tickets} showAuthor={showAuthor} onRaise={() => setTab("new")} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function HelpSection({ onRaise }: { onRaise: () => void }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FAQ;
    return FAQ.map((g) => ({
      ...g,
      items: g.items.filter((i) => i.q.toLowerCase().includes(q) || i.a.toLowerCase().includes(q)),
    })).filter((g) => g.items.length);
  }, [query]);

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search help — e.g. WhatsApp payment, Facebook leads, invoice" className="pl-9" />
      </div>

      {groups.length === 0 && (
        <p className="text-sm text-muted-foreground">No answers match &ldquo;{query}&rdquo;. Raise a ticket and we&apos;ll help directly.</p>
      )}

      {groups.map((g) => (
        <section key={g.title} className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{g.title}</h2>
          <div className="divide-y rounded-lg border bg-card">
            {g.items.map((item) => {
              const id = `${g.title}:${item.q}`;
              const isOpen = open === id || !!query.trim();
              return (
                <div key={id}>
                  <button
                    type="button"
                    onClick={() => setOpen(open === id ? null : id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium hover:bg-muted/50"
                  >
                    <span className="flex-1">{item.q}</span>
                    <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
                  </button>
                  {isOpen && <p className="px-4 pb-4 text-sm leading-relaxed text-muted-foreground">{item.a}</p>}
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div>
            <p className="font-medium">Still stuck?</p>
            <p className="text-sm text-muted-foreground">Raise a ticket with a screenshot or a screen recording — it reaches our team straight away.</p>
          </div>
          <Button variant="outline" onClick={onRaise}>Raise a ticket</Button>
        </CardContent>
      </Card>
    </div>
  );
}

function NewTicketForm({ onCreated }: { onCreated: () => void }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<TicketCategory>("BUG");
  const [priority, setPriority] = useState<TicketPriority>("NORMAL");
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const onFiles = useCallback((f: UploadedFile[]) => setFiles(f), []);
  const onBusy = useCallback((b: boolean) => setUploading(b), []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (uploading) {
      toast.error("Wait for the files to finish uploading.");
      return;
    }
    setSaving(true);
    const res = await createSupportTicket({
      subject,
      category,
      priority,
      body,
      files,
      context: {
        browser: navigator.userAgent,
        screen: `${window.screen.width}×${window.screen.height}`,
        window: `${window.innerWidth}×${window.innerHeight}`,
        page: document.referrer || window.location.href,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    });
    setSaving(false);
    if ("error" in res && res.error) {
      toast.error(res.error);
      return;
    }
    if ("number" in res) toast.success(`Ticket ${ticketRef(res.number)} raised. We'll reply by email and here.`);
    setSubject("");
    setBody("");
    setPriority("NORMAL");
    setResetKey((k) => k + 1);
    router.refresh();
    onCreated();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Raise a ticket</CardTitle>
        <CardDescription>Tell us what happened. A screenshot or a short screen recording helps us fix it much faster.</CardDescription>
      </CardHeader>
      <CardContent>
        <form ref={formRef} onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="t-subject">Subject</Label>
            <Input id="t-subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. WhatsApp welcome message not going to new leads" maxLength={200} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="t-category">What is it about?</Label>
              <select id="t-category" className={selectClass} value={category} onChange={(e) => setCategory(e.target.value as TicketCategory)}>
                {Object.entries(TICKET_CATEGORIES).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-priority">How urgent?</Label>
              <select id="t-priority" className={selectClass} value={priority} onChange={(e) => setPriority(e.target.value as TicketPriority)}>
                {Object.entries(TICKET_PRIORITIES).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="t-body">Describe the issue</Label>
            <Textarea
              id="t-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              maxLength={10000}
              placeholder={"What were you trying to do, what happened instead, and which lead / project / page was it on?"}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Screenshots &amp; recordings</Label>
            <AttachmentPicker key={resetKey} onChange={onFiles} onBusyChange={onBusy} pasteTarget={formRef} />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={saving || uploading}>
              {(saving || uploading) && <Loader2 className="size-4 animate-spin" />}
              {uploading ? "Uploading files…" : saving ? "Sending…" : "Raise ticket"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function TicketList({ tickets, showAuthor, onRaise }: { tickets: TicketSummary[]; showAuthor: boolean; onRaise: () => void }) {
  if (!tickets.length) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <Inbox className="size-8 text-muted-foreground" />
          <p className="font-medium">No tickets yet</p>
          <p className="text-sm text-muted-foreground">When you raise a ticket, you&apos;ll follow the conversation here.</p>
          <Button variant="outline" onClick={onRaise}>Raise a ticket</Button>
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="divide-y rounded-lg border bg-card">
      {tickets.map((t) => (
        <Link key={t.id} href={`/support/${t.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-muted/50">
          <span className="font-mono text-xs text-muted-foreground">{ticketRef(t.number)}</span>
          <span className="min-w-0 flex-1 truncate font-medium">{t.subject}</span>
          {t.lastMessageBy === "SUPPORT" && (t.status === "OPEN" || t.status === "IN_PROGRESS") && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">New reply</span>
          )}
          <TicketStatusBadge status={t.status} />
          <span className="w-full text-xs text-muted-foreground sm:w-auto">
            {TICKET_CATEGORIES[t.category]}
            {showAuthor && t.createdByName ? ` · ${t.createdByName}` : ""} · updated {formatDistanceToNowStrict(new Date(t.lastMessageAt), { addSuffix: true })}
          </span>
        </Link>
      ))}
    </div>
  );
}
