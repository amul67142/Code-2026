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
  getWhatsAppTemplates,
} from "./whatsapp-templates-actions";

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

      {/* Template list */}
      <div className="space-y-3">
        {templates.length === 0 ? (
          <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
            <p>No templates yet.</p>
            <p className="text-xs mt-1">Create one to send branded welcome messages to your leads.</p>
          </div>
        ) : (
          templates.map((t) => (
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
                  {t.status?.toUpperCase() === "APPROVED" && inUse !== t.name && (
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleUse(t)} disabled={isPending}>
                      Use as welcome
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">{t.body_text}</p>
              {t.status?.toUpperCase() === "REJECTED" && t.rejection_reason && (
                <p className="text-xs text-red-600">Reason: {t.rejection_reason}</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
