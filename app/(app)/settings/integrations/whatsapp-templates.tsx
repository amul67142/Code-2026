"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, RefreshCw, CheckCircle2, Clock, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
  syncWhatsAppTemplates,
  setWelcomeTemplate,
  setTemplatePurpose,
  getWhatsAppTemplates,
  type TemplatePurpose,
} from "./whatsapp-templates-actions";

interface Template {
  id: string;
  name: string;
  language: string;
  category: string;
  body_text: string;
  status: string;
  rejection_reason: string | null;
  purpose?: string | null;
  created_at: string;
}

interface Props {
  initialTemplates: Template[];
  initialCooldown: number;
  hasWaba: boolean;
  currentDefault?: string | null;
}

/**
 * The groups, in display order. Who a template is FOR is the first thing to
 * know about it: a welcome goes to customers, an alert goes to our own staff,
 * and mixing them up either leaks a lead's number to a customer or tells an
 * agent "thanks for your interest".
 */
const GROUPS: { purpose: TemplatePurpose; title: string; hint: string; empty: string }[] = [
  {
    purpose: "LEAD_WELCOME",
    title: "Lead welcome",
    hint: "Sent to your customers when they enquire.",
    empty: "No welcome templates yet.",
  },
  {
    purpose: "AGENT_LEAD_ALERT",
    title: "Agent lead alerts",
    hint: "Sent to your own team when a lead is assigned to them. Never sent to customers.",
    empty: "No agent alert templates yet.",
  },
  {
    purpose: "OTHER",
    title: "Other",
    hint: "Not used automatically.",
    empty: "",
  },
];

function purposeOf(t: Template): TemplatePurpose {
  return t.purpose === "AGENT_LEAD_ALERT" || t.purpose === "OTHER" ? t.purpose : "LEAD_WELCOME";
}

function statusBadge(status: string) {
  const s = (status || "").toUpperCase();
  if (s === "APPROVED")
    return (
      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 gap-1">
        <CheckCircle2 className="size-3" /> Approved
      </Badge>
    );
  if (s === "REJECTED")
    return (
      <Badge className="bg-red-100 text-red-700 hover:bg-red-100 gap-1">
        <XCircle className="size-3" /> Rejected
      </Badge>
    );
  if (s === "PENDING")
    return (
      <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 gap-1">
        <Clock className="size-3" /> In review
      </Badge>
    );
  return <Badge variant="secondary">{s || "Unknown"}</Badge>;
}

export function WhatsAppTemplates({ initialTemplates, initialCooldown, hasWaba, currentDefault }: Props) {
  const [templates, setTemplates] = useState<Template[]>(initialTemplates);
  const [cooldown, setCooldown] = useState(initialCooldown);
  const [inUse, setInUse] = useState<string | null | undefined>(currentDefault);
  const [isPending, startTransition] = useTransition();

  // tick the sync cooldown down
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
      setInUse(t.name);
      toast.success(`"${t.name}" is now your welcome message`);
    });
  }

  function handleMove(t: Template, purpose: TemplatePurpose) {
    if (purpose === purposeOf(t)) return;
    startTransition(async () => {
      const res = await setTemplatePurpose(t.id, purpose);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      setTemplates((prev) => prev.map((x) => (x.id === t.id ? { ...x, purpose } : x)));
      toast.success(`Moved "${t.name}" to ${GROUPS.find((g) => g.purpose === purpose)?.title}`);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {templates.length} template{templates.length === 1 ? "" : "s"}
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={handleSync} disabled={isPending || cooldown > 0}>
            {isPending ? (
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="mr-1.5 size-3.5" />
            )}
            {cooldown > 0 ? `Sync (${cooldown}s)` : "Sync status"}
          </Button>
          {hasWaba ? (
            <Link
              href="/settings/whatsapp-templates/new"
              className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium hover:bg-primary/90"
            >
              <Plus className="size-3.5" /> New template
            </Link>
          ) : (
            <Button size="sm" disabled>
              <Plus className="mr-1.5 size-3.5" /> New template
            </Button>
          )}
        </div>
      </div>

      {!hasWaba && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-3">
          Templates need a WhatsApp account linked. Reconnect via <strong>Connect WhatsApp</strong> in
          Integrations to enable them.
        </p>
      )}

      {templates.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          <p>No templates yet.</p>
          <p className="text-xs mt-1">Create one to send branded welcome messages to your leads.</p>
        </div>
      ) : (
        GROUPS.map((g) => {
          const items = templates.filter((t) => purposeOf(t) === g.purpose);
          // "Other" only appears when something is in it.
          if (g.purpose === "OTHER" && items.length === 0) return null;
          return (
            <section key={g.purpose} className="space-y-2">
              <div className="flex items-end justify-between gap-2 border-b pb-1.5">
                <div>
                  <h2 className="text-sm font-semibold">
                    {g.title} <span className="font-normal text-muted-foreground">· {items.length}</span>
                  </h2>
                  <p className="text-xs text-muted-foreground">{g.hint}</p>
                </div>
                {hasWaba && g.purpose !== "OTHER" && (
                  <Link
                    href={`/settings/whatsapp-templates/new?purpose=${g.purpose}`}
                    className="shrink-0 text-xs text-primary hover:underline"
                  >
                    + New {g.purpose === "AGENT_LEAD_ALERT" ? "agent alert" : "welcome"}
                  </Link>
                )}
              </div>

              {items.length === 0 ? (
                <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                  {g.empty}
                </p>
              ) : (
                <div className="space-y-3">
                  {items.map((t) => (
                    <div key={t.id} className="rounded-lg border bg-background p-4 space-y-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono text-sm font-semibold truncate">{t.name}</span>
                          <span className="text-[10px] text-muted-foreground uppercase border rounded px-1.5 py-0.5">
                            {t.category}
                          </span>
                          {inUse === t.name && (
                            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-[10px]">In use</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {statusBadge(t.status)}
                          {g.purpose === "LEAD_WELCOME" &&
                            t.status?.toUpperCase() === "APPROVED" &&
                            inUse !== t.name && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => handleUse(t)}
                                disabled={isPending}
                              >
                                Use as welcome
                              </Button>
                            )}
                          <select
                            aria-label={`Group for ${t.name}`}
                            className="h-7 rounded-md border border-input bg-transparent px-1.5 text-xs dark:bg-input/30"
                            value={purposeOf(t)}
                            disabled={isPending}
                            onChange={(e) => handleMove(t, e.target.value as TemplatePurpose)}
                          >
                            {GROUPS.map((x) => (
                              <option key={x.purpose} value={x.purpose}>
                                {x.title}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{t.body_text}</p>
                      {t.status?.toUpperCase() === "REJECTED" && t.rejection_reason && (
                        <p className="text-xs text-red-600">Reason: {t.rejection_reason}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })
      )}
    </div>
  );
}
