"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Info, Send } from "lucide-react";
import { toast } from "sonner";
import { createWhatsAppTemplate } from "../../integrations/whatsapp-templates-actions";

const WA_ICON =
  "https://res.cloudinary.com/dtlwrm7qk/image/upload/v1783841274/Pngtree_whatsapp_icon_vector_8704827_jjfwwq.png";

export function TemplateCreateClient({ companyName }: { companyName?: string | null }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [category, setCategory] = useState<"UTILITY" | "MARKETING">("UTILITY");
  const [language] = useState("en_US");
  const [body, setBody] = useState(
    "Hi {{1}}, thanks for your interest in {{2}}! 👋 This is the team at {{3}}. We'll reach out shortly — feel free to reply here anytime."
  );
  const [samples, setSamples] = useState<string[]>(["Rahul", "Prestige Lakeside", "BigLead Realty"]);

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
        {/* Meta guidance */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 leading-relaxed space-y-2">
          <p className="flex items-center gap-1.5 font-semibold">
            <Info className="size-4" /> How Meta templates work
          </p>
          <ul className="list-disc pl-5 space-y-1 text-[13px]">
            <li>
              Use <code className="bg-white/60 px-1 rounded">{"{{1}}"}</code>,{" "}
              <code className="bg-white/60 px-1 rounded">{"{{2}}"}</code>… as variables, then give a
              sample value for each so Meta can review it.
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

        <div className="space-y-2">
          <Label htmlFor="tpl-name">Template name</Label>
          <Input
            id="tpl-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="lead_welcome"
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
                <Input
                  key={i}
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
              ))}
            </div>
          </div>
        )}

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
            <div className="relative max-w-[95%] bg-white rounded-lg rounded-tl-none px-3 py-2.5 shadow-sm">
              <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed break-words">
                {previewText || "Your message will appear here…"}
              </p>
              <span className="block text-right text-[10px] text-gray-400 mt-1">12:30 PM</span>
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Variables are filled with your sample values — this is exactly how the lead sees it.
        </p>
      </div>
    </div>
  );
}
