"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Info, Send, Plus, X, Link2, Phone, MessageSquare, ExternalLink, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import {
  createWhatsAppTemplate,
  type TemplatePurpose,
} from "../../integrations/whatsapp-templates-actions";
import {
  ALERT_FIELDS,
  STANDARD_ALERT_TEMPLATE,
  defaultAlertMapping,
} from "@/lib/automation/agent-alert-fields";
import { uploadTemplateHeaderImage } from "../../integrations/whatsapp-bulk-actions";

const WA_ICON =
  "https://res.cloudinary.com/dtlwrm7qk/image/upload/v1783841274/Pngtree_whatsapp_icon_vector_8704827_jjfwwq.png";

type ActionMode = "NONE" | "CTA" | "QUICK" | "ALL";

interface UiButton {
  type: "QUICK_REPLY" | "URL" | "PHONE_NUMBER";
  text: string;
  url?: string;
  phone_number?: string;
}

const WELCOME_BODY =
  "Hi {{1}}, thanks for your interest in {{2}}! 👋 We'll reach out shortly — feel free to reply here anytime.";
const WELCOME_SAMPLES = ["Rahul", "Prestige Lakeside"];

export function TemplateCreateClient({
  companyName,
  initialPurpose = "LEAD_WELCOME",
}: {
  companyName?: string | null;
  initialPurpose?: TemplatePurpose;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const startsAsAlert = initialPurpose === "AGENT_LEAD_ALERT";
  // Who the template is for decides everything else: the example, the
  // guidance, and which picker it appears in afterwards.
  const [purpose, setPurpose] = useState<TemplatePurpose>(initialPurpose);
  const [name, setName] = useState(startsAsAlert ? STANDARD_ALERT_TEMPLATE.name : "");
  const [category, setCategory] = useState<"UTILITY" | "MARKETING">("UTILITY");
  const [language] = useState("en_US");
  const [body, setBody] = useState(startsAsAlert ? STANDARD_ALERT_TEMPLATE.body : WELCOME_BODY);
  const [samples, setSamples] = useState<string[]>(
    startsAsAlert ? STANDARD_ALERT_TEMPLATE.samples : WELCOME_SAMPLES
  );
  const isAlert = purpose === "AGENT_LEAD_ALERT";

  // In automated sends, variables are filled as:
  const VAR_MEANINGS = isAlert
    ? defaultAlertMapping(12).map((f) => `${ALERT_FIELDS[f]} by default — changeable per agent`)
    : ["Lead's name (automatic)", "Project name (automatic)"];

  /**
   * Switch purpose, swapping the example body only while it is untouched —
   * never overwrite something the admin has written.
   */
  function changePurpose(next: TemplatePurpose) {
    setPurpose(next);
    if (next === "AGENT_LEAD_ALERT" && body === WELCOME_BODY) {
      setBody(STANDARD_ALERT_TEMPLATE.body);
      setSamples(STANDARD_ALERT_TEMPLATE.samples);
      if (!name) setName(STANDARD_ALERT_TEMPLATE.name);
      // An alert is operational, never promotional.
      setCategory("UTILITY");
    } else if (next !== "AGENT_LEAD_ALERT" && body === STANDARD_ALERT_TEMPLATE.body) {
      setBody(WELCOME_BODY);
      setSamples(WELCOME_SAMPLES);
      if (name === STANDARD_ALERT_TEMPLATE.name) setName("");
    }
  }

  // interactive actions (buttons)
  const [actionMode, setActionMode] = useState<ActionMode>("NONE");
  const [buttons, setButtons] = useState<UiButton[]>([]);

  // image header (marketing templates)
  const [headerImage, setHeaderImage] = useState<{ url: string; handle: string } | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingImage(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await uploadTemplateHeaderImage(fd);
      if (res.error || !res.url || !res.handle) {
        toast.error(res.error || "Image upload failed");
      } else {
        setHeaderImage({ url: res.url, handle: res.handle });
        toast.success("Image attached");
      }
    } finally {
      setUploadingImage(false);
    }
  }

  const quickCount = buttons.filter((b) => b.type === "QUICK_REPLY").length;
  const urlCount = buttons.filter((b) => b.type === "URL").length;
  const phoneCount = buttons.filter((b) => b.type === "PHONE_NUMBER").length;
  const allowQuick = actionMode === "QUICK" || actionMode === "ALL";
  const allowCta = actionMode === "CTA" || actionMode === "ALL";

  function addButton(type: UiButton["type"]) {
    setButtons((prev) => [...prev, { type, text: "" }]);
  }
  function updateButton(i: number, patch: Partial<UiButton>) {
    setButtons((prev) => prev.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  }
  function removeButton(i: number) {
    setButtons((prev) => prev.filter((_, idx) => idx !== i));
  }
  function changeMode(mode: ActionMode) {
    setActionMode(mode);
    // Drop buttons that the new mode doesn't allow.
    setButtons((prev) =>
      prev.filter((b) =>
        mode === "ALL"
          ? true
          : mode === "QUICK"
            ? b.type === "QUICK_REPLY"
            : mode === "CTA"
              ? b.type !== "QUICK_REPLY"
              : false
      )
    );
  }

  const activeButtons = actionMode === "NONE" ? [] : buttons.filter((b) => b.text.trim());

  // distinct {{n}} variables in the body
  const varCount = useMemo(() => {
    const matches = body.match(/\{\{\s*(\d+)\s*\}\}/g) || [];
    return new Set(matches.map((m) => m.replace(/\D/g, ""))).size;
  }, [body]);

  useEffect(() => {
    setSamples((prev) => {
      const next = [...prev];
      next.length = varCount;
      for (let i = 0; i < varCount; i++) if (next[i] === undefined) next[i] = "";
      return next;
    });
  }, [varCount]);

  const previewText = useMemo(
    () =>
      body.replace(/\{\{\s*(\d+)\s*\}\}/g, (_, n: string) => {
        const v = samples[parseInt(n, 10) - 1]?.trim();
        return v || `[${n}]`;
      }),
    [body, samples]
  );

  function handleSubmit() {
    startTransition(async () => {
      const res = await createWhatsAppTemplate({
        name,
        category,
        language,
        bodyText: body,
        sampleValues: samples,
        buttons: actionMode === "NONE" ? [] : buttons.filter((b) => b.text.trim()),
        headerImageUrl: headerImage?.url,
        headerImageHandle: headerImage?.handle,
        purpose,
      });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Template submitted to Meta for review 🎉");
      router.push("/settings/whatsapp-templates");
      router.refresh();
    });
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 items-start">
      {/* ── Left: the form ── */}
      <div className="space-y-6 min-w-0">
        {/* Who is this for */}
        <div className="space-y-2">
          <Label>Who is this template for?</Label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {(
              [
                ["LEAD_WELCOME", "Your customers", "Welcome message when a lead enquires."],
                [
                  "AGENT_LEAD_ALERT",
                  "Your own agents",
                  "Alert with the lead's name and number when one is assigned to them.",
                ],
              ] as [TemplatePurpose, string, string][]
            ).map(([value, title, hint]) => (
              <button
                key={value}
                type="button"
                onClick={() => changePurpose(value)}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  purpose === value
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "hover:bg-muted/50"
                }`}
              >
                <span className="block text-sm font-medium">{title}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>
              </button>
            ))}
          </div>
        </div>

        {isAlert ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 leading-relaxed space-y-2">
            <p className="flex items-center gap-1.5 font-semibold">
              <Info className="size-4" /> Agent lead alerts
            </p>
            <ul className="list-disc pl-5 space-y-1 text-[13px]">
              <li>
                Sent from your WhatsApp number to <strong>your own agent</strong> — never to a
                customer. It appears only in the agent alert picker on the Team page.
              </li>
              <li>
                Variables default to <strong>lead name</strong>, then <strong>lead number</strong>,
                then <strong>project</strong>. Each agent&apos;s mapping can be changed on the Team
                page.
              </li>
              <li>
                The number is sent with its country code, so WhatsApp shows it as a tap-to-call link.
              </li>
              <li>
                Keep it Utility and plain — it is an operational notice, which Meta approves fastest.
              </li>
            </ul>
          </div>
        ) : (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 leading-relaxed space-y-2">
          <p className="flex items-center gap-1.5 font-semibold">
            <Info className="size-4" /> How Meta templates work
          </p>
          <ul className="list-disc pl-5 space-y-1 text-[13px]">
            <li>
              Use two variables: <code className="bg-white/60 px-1 rounded">{"{{1}}"}</code> ={" "}
              <strong>lead&apos;s name</strong> and <code className="bg-white/60 px-1 rounded">{"{{2}}"}</code> ={" "}
              <strong>project name</strong> — BigLead fills them automatically on every send. Write
              everything else (your company name, offers, etc.) as normal text.
            </li>
            <li>
              Fallbacks are automatic: no lead name → &quot;there&quot;; no project on the lead → your
              company name. Messages never fail because of a missing value.
            </li>
            <li>
              <strong>Utility</strong> = a response to something the customer did (cheaper, approves
              faster). <strong>Marketing</strong> = promotional content.
            </li>
            <li>Avoid salesy wording and false claims — the usual rejection reasons.</li>
            <li>
              Example: <em>&quot;Hi {"{{1}}"}, thanks for your interest in {"{{2}}"}! We&apos;ll reach out shortly.&quot;</em>
            </li>
          </ul>
        </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="tpl-name">Template name</Label>
          <Input
            id="tpl-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={isAlert ? "agent_new_lead_alert" : "lead_welcome"}
            className="h-10 max-w-sm"
          />
          <p className="text-xs text-muted-foreground">Lowercase letters, numbers and underscores only.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-sm">
          <div className="space-y-2">
            <Label htmlFor="tpl-cat">Category</Label>
            <select
              id="tpl-cat"
              value={category}
              onChange={(e) => setCategory(e.target.value as "UTILITY" | "MARKETING")}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="UTILITY">Utility</option>
              <option value="MARKETING">Marketing</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Language</Label>
            <Input value="English (en_US)" disabled className="h-10" />
          </div>
        </div>

        {/* Header image (great for Marketing templates) */}
        <div className="space-y-2">
          <Label>Header image (optional)</Label>
          {headerImage ? (
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={headerImage.url} alt="Header" className="h-16 w-24 object-cover rounded-md border" />
              <Button type="button" variant="outline" size="sm" onClick={() => setHeaderImage(null)}>
                <X className="mr-1 size-3.5" /> Remove
              </Button>
            </div>
          ) : (
            <label className="inline-flex items-center gap-2 rounded-md border border-dashed px-4 py-2.5 text-sm text-muted-foreground cursor-pointer hover:bg-muted/40">
              {uploadingImage ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
              {uploadingImage ? "Uploading…" : "Add image (JPG/PNG, max 4MB)"}
              <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleImageUpload} disabled={uploadingImage} />
            </label>
          )}
          <p className="text-xs text-muted-foreground">
            Shows at the top of the message — ideal for Marketing templates (property photos, offers).
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tpl-body">Message body</Label>
          <textarea
            id="tpl-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            className="w-full rounded-md border bg-background px-3 py-2.5 text-sm leading-relaxed resize-y focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <p className="text-xs text-muted-foreground">
            {varCount} variable{varCount === 1 ? "" : "s"} detected.
          </p>
        </div>

        {varCount > 0 && (
          <div className="space-y-2">
            <Label>Sample values (shown to Meta during review)</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
              {Array.from({ length: varCount }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <Input
                    value={samples[i] || ""}
                    onChange={(e) =>
                      setSamples((prev) => {
                        const n = [...prev];
                        n[i] = e.target.value;
                        return n;
                      })
                    }
                    placeholder={`Example for {{${i + 1}}}`}
                    className="h-10"
                  />
                  <p className="text-[11px] text-muted-foreground pl-0.5">
                    {"{{" + (i + 1) + "}}"} → {VAR_MEANINGS[i] || "Extra — uses your company name in automated sends"}
                  </p>
                </div>
              ))}
            </div>
            {varCount > 2 && (
              <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
                Tip: BigLead only fills {"{{1}}"} (lead name) and {"{{2}}"} (project) dynamically.
                Variables {"{{3}}"}+ will all show your company name — write that text directly in
                the message instead.
              </p>
            )}
          </div>
        )}

        {/* ── Interactive Actions (buttons) ── */}
        <div className="space-y-3 rounded-lg border p-4">
          <div>
            <h3 className="text-sm font-semibold">Interactive Actions</h3>
            <p className="text-xs text-muted-foreground">
              In addition to your message, you can send buttons. Max 25 characters per button title.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {(
              [
                ["NONE", "None"],
                ["CTA", "Call to Actions"],
                ["QUICK", "Quick Replies"],
                ["ALL", "All"],
              ] as [ActionMode, string][]
            ).map(([mode, label]) => (
              <label key={mode} className="flex items-center gap-1.5 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="action-mode"
                  checked={actionMode === mode}
                  onChange={() => changeMode(mode)}
                  className="accent-primary"
                />
                {label}
              </label>
            ))}
          </div>

          {actionMode !== "NONE" && (
            <>
              <div className="flex flex-wrap gap-2">
                {allowQuick && (
                  <Button type="button" variant="outline" size="sm" onClick={() => addButton("QUICK_REPLY")} disabled={quickCount >= 10}>
                    <Plus className="mr-1 size-3.5" /> Quick Reply
                    <span className="ml-1.5 text-[10px] bg-muted rounded-full px-1.5">{10 - quickCount}</span>
                  </Button>
                )}
                {allowCta && (
                  <>
                    <Button type="button" variant="outline" size="sm" onClick={() => addButton("URL")} disabled={urlCount >= 2}>
                      <Plus className="mr-1 size-3.5" /> URL
                      <span className="ml-1.5 text-[10px] bg-muted rounded-full px-1.5">{2 - urlCount}</span>
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => addButton("PHONE_NUMBER")} disabled={phoneCount >= 1}>
                      <Plus className="mr-1 size-3.5" /> Phone Number
                      <span className="ml-1.5 text-[10px] bg-muted rounded-full px-1.5">{1 - phoneCount}</span>
                    </Button>
                  </>
                )}
              </div>

              {buttons.length > 0 && (
                <div className="space-y-2">
                  {buttons.map((b, i) => (
                    <div key={i} className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/20 p-2">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground w-24 shrink-0">
                        {b.type === "QUICK_REPLY" ? (
                          <><MessageSquare className="size-3" /> Quick reply</>
                        ) : b.type === "URL" ? (
                          <><Link2 className="size-3" /> URL</>
                        ) : (
                          <><Phone className="size-3" /> Phone</>
                        )}
                      </span>
                      <Input
                        value={b.text}
                        onChange={(e) => updateButton(i, { text: e.target.value.slice(0, 25) })}
                        placeholder="Button title (max 25)"
                        className="h-8 w-44"
                      />
                      {b.type === "URL" && (
                        <Input
                          value={b.url || ""}
                          onChange={(e) => updateButton(i, { url: e.target.value })}
                          placeholder="https://example.com"
                          className="h-8 flex-1 min-w-[180px]"
                        />
                      )}
                      {b.type === "PHONE_NUMBER" && (
                        <Input
                          value={b.phone_number || ""}
                          onChange={(e) => updateButton(i, { phone_number: e.target.value })}
                          placeholder="+919812345678"
                          className="h-8 w-44"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => removeButton(i)}
                        className="ml-auto p-1 rounded hover:bg-muted text-muted-foreground"
                        aria-label="Remove button"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button onClick={handleSubmit} disabled={isPending} className="h-10 px-6">
            {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Send className="mr-2 size-4" />}
            Submit for review
          </Button>
          <Button variant="outline" className="h-10" onClick={() => router.push("/settings/whatsapp-templates")}>
            Cancel
          </Button>
        </div>
      </div>

      {/* ── Right: live WhatsApp preview (sticky) ── */}
      <div className="lg:sticky lg:top-6">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Live preview</Label>
        <div className="mt-2 rounded-2xl border overflow-hidden shadow-md">
          <div className="flex items-center gap-2.5 px-4 py-3 bg-[#075E54] text-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={WA_ICON} alt="" className="size-8 rounded-full bg-white p-0.5" />
            <div className="leading-tight">
              <p className="text-sm font-semibold">{companyName || "Your Business"}</p>
              <p className="text-[10px] text-white/70">WhatsApp Business</p>
            </div>
          </div>
          <div className="p-4 min-h-[280px]" style={{ backgroundColor: "#E5DDD5" }}>
            <div className="relative max-w-[95%] bg-white rounded-lg rounded-tl-none shadow-sm overflow-hidden">
              {headerImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={headerImage.url} alt="" className="w-full h-32 object-cover" />
              )}
              <div className="px-3 py-2.5">
                <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed break-words">
                  {previewText || "Your message will appear here…"}
                </p>
                <span className="block text-right text-[10px] text-gray-400 mt-1">12:30 PM</span>
              </div>
              {/* CTA buttons render inside the bubble, WhatsApp-style */}
              {activeButtons.filter((b) => b.type !== "QUICK_REPLY").map((b, i) => (
                <div key={i} className="border-t border-gray-100 px-3 py-2 text-center text-[13px] font-medium text-[#00A5F4] flex items-center justify-center gap-1.5">
                  {b.type === "URL" ? <ExternalLink className="size-3.5" /> : <Phone className="size-3.5" />}
                  {b.text || (b.type === "URL" ? "Visit link" : "Call")}
                </div>
              ))}
            </div>
            {/* Quick replies render as chips below the bubble */}
            {activeButtons.some((b) => b.type === "QUICK_REPLY") && (
              <div className="flex flex-wrap gap-1.5 mt-2 max-w-[95%]">
                {activeButtons
                  .filter((b) => b.type === "QUICK_REPLY")
                  .map((b, i) => (
                    <span
                      key={i}
                      className="bg-white rounded-full px-3 py-1.5 text-[13px] font-medium text-[#00A5F4] shadow-sm"
                    >
                      {b.text}
                    </span>
                  ))}
              </div>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Variables are filled with your sample values — this is exactly how the lead sees it.
        </p>
      </div>
    </div>
  );
}
