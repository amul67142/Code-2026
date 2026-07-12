"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Plus, RefreshCw, CheckCircle2, Clock, XCircle, Info } from "lucide-react";
import { toast } from "sonner";
import {
  createWhatsAppTemplate,
  syncWhatsAppTemplates,
  setWelcomeTemplate,
  getWhatsAppTemplates,
} from "./whatsapp-templates-actions";

const WA_ICON =
  "https://res.cloudinary.com/dtlwrm7qk/image/upload/v1783841274/Pngtree_whatsapp_icon_vector_8704827_jjfwwq.png";

interface Template {
  id: string;
  name: string;
  language: string;
  category: string;
  body_text: string;
  status: string;
  rejection_reason: string | null;
  created_at: string;
}

interface Props {
  initialTemplates: Template[];
  initialCooldown: number;
  hasWaba: boolean;
  currentDefault?: string | null;
}

function statusBadge(status: string) {
  const s = (status || "").toUpperCase();
  if (s === "APPROVED")
    return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 gap-1"><CheckCircle2 className="size-3" /> Approved</Badge>;
  if (s === "REJECTED")
    return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 gap-1"><XCircle className="size-3" /> Rejected</Badge>;
  if (s === "PENDING")
    return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 gap-1"><Clock className="size-3" /> In review</Badge>;
  return <Badge variant="secondary">{s || "Unknown"}</Badge>;
}

export function WhatsAppTemplates({ initialTemplates, initialCooldown, hasWaba, currentDefault }: Props) {
  const [templates, setTemplates] = useState<Template[]>(initialTemplates);
  const [cooldown, setCooldown] = useState(initialCooldown);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // create form
  const [name, setName] = useState("");
  const [category, setCategory] = useState<"UTILITY" | "MARKETING">("UTILITY");
  const [language] = useState("en_US");
  const [body, setBody] = useState(
    "Hi {{1}}, thanks for your interest in {{2}}! 👋 This is the team at {{3}}. We'll reach out shortly — feel free to reply here anytime."
  );
  const [samples, setSamples] = useState<string[]>(["Rahul", "Prestige Lakeside", "BigLead Realty"]);

  // count DISTINCT {{n}} variables in the body (so {{1}} used twice = 1 sample)
  const varCount = useMemo(() => {
    const matches = body.match(/\{\{\s*(\d+)\s*\}\}/g) || [];
    return new Set(matches.map((m) => m.replace(/\D/g, ""))).size;
  }, [body]);

  // live preview: fill {{n}} with the sample values (or a placeholder)
  const previewText = useMemo(
    () =>
      body.replace(/\{\{\s*(\d+)\s*\}\}/g, (_, n: string) => {
        const v = samples[parseInt(n, 10) - 1]?.trim();
        return v || `[${n}]`;
      }),
    [body, samples]
  );

  // keep the sample inputs in sync with the variable count
  useEffect(() => {
    setSamples((prev) => {
      const next = [...prev];
      next.length = varCount;
      for (let i = 0; i < varCount; i++) if (next[i] === undefined) next[i] = "";
      return next;
    });
  }, [varCount]);

  // tick the cooldown down
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  async function refresh() {
    const data = await getWhatsAppTemplates();
    setTemplates(data.templates as Template[]);
    setCooldown(data.cooldownRemainingSec);
  }

  function handleCreate() {
    startTransition(async () => {
      const res = await createWhatsAppTemplate({ name, category, language, bodyText: body, sampleValues: samples });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Template submitted to Meta for review 🎉");
      setOpen(false);
      setName("");
      await refresh();
    });
  }

  function handleSync() {
    startTransition(async () => {
      const res = await syncWhatsAppTemplates();
      if (res.error) {
        if (res.cooldownRemainingSec) setCooldown(res.cooldownRemainingSec);
        toast.error(res.error);
        return;
      }
      toast.success("Synced with Meta");
      if (res.cooldownRemainingSec) setCooldown(res.cooldownRemainingSec);
      await refresh();
    });
  }

  function handleUse(t: Template) {
    startTransition(async () => {
      const res = await setWelcomeTemplate(t.name, t.language);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(`"${t.name}" is now your welcome message`);
    });
  }

  return (
    <div className="rounded-md border p-4 space-y-4 bg-muted/20">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold">Message templates</h4>
          <p className="text-xs text-muted-foreground">
            Create templates, track Meta approval, and use approved ones as your welcome message.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={handleSync} disabled={isPending || cooldown > 0}>
            <RefreshCw className={`mr-1.5 size-3.5 ${isPending ? "animate-spin" : ""}`} />
            {cooldown > 0 ? `Sync (${cooldown}s)` : "Sync status"}
          </Button>
          <Button size="sm" onClick={() => setOpen(true)} disabled={!hasWaba}>
            <Plus className="mr-1.5 size-3.5" /> New template
          </Button>
        </div>
      </div>

      {!hasWaba && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2.5">
          Templates need a WhatsApp account linked. Reconnect via <strong>Connect WhatsApp</strong> to enable them.
        </p>
      )}

      {/* Template list */}
      <div className="space-y-2">
        {templates.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            No templates yet. Create one to send branded welcome messages.
          </p>
        ) : (
          templates.map((t) => (
            <div key={t.id} className="rounded-lg border bg-background p-3 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-xs font-semibold truncate">{t.name}</span>
                  <span className="text-[10px] text-muted-foreground uppercase">{t.category}</span>
                  {currentDefault === t.name && (
                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-[10px]">In use</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {statusBadge(t.status)}
                  {t.status?.toUpperCase() === "APPROVED" && currentDefault !== t.name && (
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => handleUse(t)} disabled={isPending}>
                      Use
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{t.body_text}</p>
              {t.status?.toUpperCase() === "REJECTED" && t.rejection_reason && (
                <p className="text-[11px] text-red-600">Reason: {t.rejection_reason}</p>
              )}
            </div>
          ))
        )}
      </div>

      {/* Create dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New WhatsApp template</DialogTitle>
            <DialogDescription>Meta reviews every template (usually minutes to a few hours).</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col lg:grid lg:grid-cols-[1fr_260px] gap-5">
            {/* Left: form */}
            <div className="space-y-4 min-w-0 order-2 lg:order-1">
          {/* Meta guidance + example */}
          <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900 leading-relaxed space-y-1.5">
            <p className="flex items-center gap-1.5 font-semibold"><Info className="size-3.5" /> How Meta templates work</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Use <code className="bg-white/60 px-1 rounded">{"{{1}}"}</code>, <code className="bg-white/60 px-1 rounded">{"{{2}}"}</code>… for variables, then give a sample value for each.</li>
              <li><strong>Utility</strong> = a response to something the customer did (cheaper, faster approval). <strong>Marketing</strong> = promotions.</li>
              <li>Don&apos;t be salesy or make false claims — those get rejected.</li>
              <li>Example body: <em>&quot;Hi {"{{1}}"}, thanks for your interest in {"{{2}}"}! We&apos;ll reach out shortly.&quot;</em></li>
            </ul>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="tpl-name">Template name</Label>
              <Input id="tpl-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="lead_welcome" className="h-9" />
              <p className="text-[11px] text-muted-foreground">Lowercase letters, numbers, underscores only.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="tpl-cat">Category</Label>
                <select id="tpl-cat" value={category} onChange={(e) => setCategory(e.target.value as "UTILITY" | "MARKETING")} className="h-9 w-full rounded-md border bg-background px-3 text-sm">
                  <option value="UTILITY">Utility</option>
                  <option value="MARKETING">Marketing</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Language</Label>
                <Input value="English (en_US)" disabled className="h-9" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tpl-body">Message body</Label>
              <textarea
                id="tpl-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <p className="text-[11px] text-muted-foreground">{varCount} variable{varCount === 1 ? "" : "s"} detected.</p>
            </div>

            {varCount > 0 && (
              <div className="space-y-1.5">
                <Label>Sample values (for Meta&apos;s review)</Label>
                <div className="grid grid-cols-1 gap-2">
                  {Array.from({ length: varCount }).map((_, i) => (
                    <Input
                      key={i}
                      value={samples[i] || ""}
                      onChange={(e) => setSamples((prev) => { const n = [...prev]; n[i] = e.target.value; return n; })}
                      placeholder={`Example for {{${i + 1}}}`}
                      className="h-9"
                    />
                  ))}
                </div>
              </div>
            )}
            </div>
            </div>
            {/* end left form column */}

            {/* Right: live WhatsApp preview */}
            <div className="order-1 lg:order-2 lg:sticky lg:top-0 self-start w-full">
              <Label className="text-xs">Preview</Label>
              <div className="mt-2 rounded-xl border overflow-hidden shadow-sm">
                <div className="flex items-center gap-2 px-3 py-2 bg-[#075E54] text-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={WA_ICON} alt="" className="size-6 rounded-full bg-white p-0.5" />
                  <span className="text-xs font-semibold">Your Business</span>
                </div>
                <div
                  className="p-3 min-h-[200px]"
                  style={{ backgroundColor: "#E5DDD5" }}
                >
                  <div className="relative max-w-[92%] bg-white rounded-lg rounded-tl-none px-2.5 py-2 shadow-sm">
                    <p className="text-[13px] text-gray-800 whitespace-pre-wrap leading-snug break-words">
                      {previewText || "Your message will appear here…"}
                    </p>
                    <span className="block text-right text-[10px] text-gray-400 mt-1">12:30 PM</span>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5">
                Variables are filled with your sample values — this is how the lead sees it.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Submit for review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
