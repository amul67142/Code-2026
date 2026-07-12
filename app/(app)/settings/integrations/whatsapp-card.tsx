"use client";

import { useState, useTransition } from "react";
import {
  connectWhatsApp,
  disconnectWhatsApp,
  sendTestWhatsApp,
  updateReplyAutomation,
} from "./whatsapp-actions";
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
import { MessageCircle, CheckCircle2, AlertCircle, Loader2, Send, Unplug } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { WhatsAppEmbeddedSignup } from "./whatsapp-embedded-signup";
import { WhatsAppAnalyticsPanel } from "./whatsapp-analytics";
import type { WhatsAppAnalytics } from "./whatsapp-analytics-actions";

const WA_ICON =
  "https://res.cloudinary.com/dtlwrm7qk/image/upload/v1783841274/Pngtree_whatsapp_icon_vector_8704827_jjfwwq.png";

interface TemplatesData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  templates: any[];
  cooldownRemainingSec: number;
  hasWaba: boolean;
}

interface WhatsAppConnection {
  id: string;
  phone_number_id: string;
  display_phone: string | null;
  default_template: string | null;
  status: string;
  last_error: string | null;
  created_at: string;
  qualify_keywords?: string | null;
  qualify_stage_id?: string | null;
}

interface Stage {
  id: string;
  name: string;
}

export function WhatsAppCard({
  initial,
  stages = [],
  templatesData,
  analytics,
}: {
  initial: WhatsAppConnection | null;
  stages?: Stage[];
  templatesData?: TemplatesData;
  analytics?: WhatsAppAnalytics;
}) {
  const [conn, setConn] = useState<WhatsAppConnection | null>(initial);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // connect form
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [displayPhone, setDisplayPhone] = useState("");
  const [template, setTemplate] = useState("hello_world");

  // test
  const [testPhone, setTestPhone] = useState("");

  // reply automation
  const [keywords, setKeywords] = useState(initial?.qualify_keywords || "");
  const [qualifyStageId, setQualifyStageId] = useState(initial?.qualify_stage_id || "");

  function handleSaveAutomation() {
    startTransition(async () => {
      const res = await updateReplyAutomation({
        keywords,
        stageId: qualifyStageId || null,
      });
      if (res.error) toastErr(res.error);
      else toastOk("Reply automation saved");
    });
  }

  function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await connectWhatsApp({
        phoneNumberId,
        accessToken,
        displayPhone,
        defaultTemplate: template,
      });
      if (res.error) {
        toastErr(res.error);
      } else {
        toastOk("WhatsApp connected");
        setConn({
          id: "local",
          phone_number_id: phoneNumberId,
          display_phone: displayPhone || null,
          default_template: template,
          status: "ACTIVE",
          last_error: null,
          created_at: new Date().toISOString(),
        });
        setOpen(false);
        setAccessToken("");
      }
    });
  }

  function handleTest() {
    if (!testPhone.trim()) return toastErr("Enter a phone number to test");
    startTransition(async () => {
      const res = await sendTestWhatsApp(testPhone);
      if (res.error) toastErr(res.error);
      else toastOk("Test WhatsApp sent — check the phone!");
    });
  }

  function handleDisconnect() {
    if (!confirm("Disconnect WhatsApp? New leads will stop getting WhatsApp messages.")) return;
    startTransition(async () => {
      const res = await disconnectWhatsApp();
      if (res.error) toastErr(res.error);
      else {
        toastOk("WhatsApp disconnected");
        setConn(null);
      }
    });
  }

  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={WA_ICON} alt="WhatsApp" className="size-10 shrink-0" />
          <div>
            <h3 className="font-semibold">WhatsApp Auto-Reply</h3>
            <p className="text-xs text-muted-foreground">
              Send an instant WhatsApp to every new lead from your own number.
            </p>
          </div>
        </div>
        {conn && conn.status === "ACTIVE" ? (
          <Button variant="ghost" size="icon" title="Disconnect" onClick={handleDisconnect} disabled={isPending}>
            <Unplug className="size-4 text-red-500" />
          </Button>
        ) : (
          <div className="flex flex-col items-end gap-1">
            <WhatsAppEmbeddedSignup onConnected={() => window.location.reload()} />
            <button
              onClick={() => setOpen(true)}
              className="text-[11px] text-muted-foreground hover:underline"
            >
              or enter details manually
            </button>
          </div>
        )}
      </div>

      {conn && conn.status === "ACTIVE" && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2 rounded-md border px-4 py-3 bg-muted/30">
            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 gap-1">
              <CheckCircle2 className="size-3" /> Connected
            </Badge>
            <span className="text-sm">
              {conn.display_phone || `Number ID ${conn.phone_number_id}`}
            </span>
            <span className="text-xs text-muted-foreground ml-auto">
              Template: {conn.default_template}
            </span>
          </div>
          {conn.last_error && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <AlertCircle className="size-3" /> {conn.last_error}
            </p>
          )}
          {/* Send test */}
          <div className="flex items-center gap-2">
            <Input
              placeholder="Test phone (e.g. 9198XXXXXXXX)"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              className="h-9 max-w-[260px]"
            />
            <Button variant="outline" size="sm" onClick={handleTest} disabled={isPending}>
              {isPending ? <Loader2 className="mr-2 size-3.5 animate-spin" /> : <Send className="mr-2 size-3.5" />}
              Send test
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            With Meta&apos;s free test number, add your phone as a recipient in the App dashboard first, then test with the <code>hello_world</code> template.
          </p>

          {/* ── Reply automation: keyword → qualified stage ── */}
          <div className="rounded-md border p-4 space-y-3 bg-muted/20">
            <div>
              <h4 className="text-sm font-semibold">Reply automation</h4>
              <p className="text-xs text-muted-foreground">
                When a lead replies on WhatsApp, we log it and notify the agent. If the reply
                contains one of your keywords, the lead is auto-moved to the qualified stage.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="wa-keywords">Qualify keywords (comma-separated)</Label>
              <Input
                id="wa-keywords"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="yes, interested, call me, price, book"
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wa-stage">Move qualified leads to</Label>
              <select
                id="wa-stage"
                value={qualifyStageId}
                onChange={(e) => setQualifyStageId(e.target.value)}
                className="h-9 w-full max-w-[280px] rounded-md border bg-background px-3 text-sm"
              >
                <option value="">— No auto-move (just log &amp; notify) —</option>
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <Button variant="outline" size="sm" onClick={handleSaveAutomation} disabled={isPending}>
              {isPending ? <Loader2 className="mr-2 size-3.5 animate-spin" /> : null}
              Save reply automation
            </Button>
            <p className="text-[11px] text-muted-foreground">
              Requires the WhatsApp webhook to be configured in Meta (Callback URL{" "}
              <code>/api/webhooks/whatsapp</code>). Leave the stage empty to only log replies.
            </p>
          </div>

          {/* ── Analytics + Facebook quality rating ── */}
          {analytics && <WhatsAppAnalyticsPanel data={analytics} />}

          {/* ── Message templates (full management on its own page) ── */}
          <div className="rounded-md border p-4 flex items-center justify-between gap-3 bg-muted/20">
            <div className="min-w-0">
              <h4 className="text-sm font-semibold">Message templates</h4>
              <p className="text-xs text-muted-foreground">
                Create templates, track Meta approval, and pick your welcome message
                {templatesData ? ` — ${templatesData.templates.length} template${templatesData.templates.length === 1 ? "" : "s"}.` : "."}
              </p>
            </div>
            <Link
              href="/settings/whatsapp-templates"
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-accent shrink-0"
            >
              Manage templates
            </Link>
          </div>
        </div>
      )}

      {(!conn || conn.status !== "ACTIVE") && (
        <div className="mt-4 text-center py-6 text-muted-foreground text-sm border rounded-md border-dashed">
          <p>WhatsApp not connected.</p>
          <p className="text-xs mt-1">Connect your WhatsApp Business number to auto-message leads.</p>
        </div>
      )}

      {/* Connect dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect WhatsApp</DialogTitle>
            <DialogDescription>
              From Meta → your App → WhatsApp → API Setup, copy the Phone Number ID and a token.
              For testing, use the free test number.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleConnect} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pnid">Phone Number ID</Label>
              <Input id="pnid" value={phoneNumberId} onChange={(e) => setPhoneNumberId(e.target.value)} placeholder="e.g. 1029384756..." required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="token">Access Token</Label>
              <Input id="token" type="password" value={accessToken} onChange={(e) => setAccessToken(e.target.value)} placeholder="EAAG..." required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="disp">Display Number (optional)</Label>
              <Input id="disp" value={displayPhone} onChange={(e) => setDisplayPhone(e.target.value)} placeholder="+91 98XXXXXXXX" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tpl">Welcome Template Name</Label>
              <Input id="tpl" value={template} onChange={(e) => setTemplate(e.target.value)} placeholder="hello_world" />
              <p className="text-[11px] text-muted-foreground">
                Use <code>hello_world</code> to test. Later, create an approved template with 3 variables (name, project, company).
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                Connect
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function toastOk(m: string) { toast.success(m); }
function toastErr(m: string) { toast.error(m); }
