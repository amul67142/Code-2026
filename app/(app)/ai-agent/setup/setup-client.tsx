"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { saveAiConfig, type AiConfigInput } from "../actions";
import { PROVIDERS, defaultModelFor } from "@/lib/ai/providers";

interface Stage {
  id: string;
  name: string;
  color: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Config = any;

const NONE_STAGE = "__none__";

export default function SetupClient({ config, stages }: { config: Config; stages: Stage[] }) {
  const [form, setForm] = useState<AiConfigInput>({
    enabled: config?.enabled ?? false,
    mode: config?.mode === "LIVE" ? "LIVE" : "SHADOW",
    provider: config?.provider || "ANTHROPIC",
    model: config?.model || "claude-opus-5",
    persona_name: config?.persona_name || "Priya",
    persona_role: config?.persona_role || "sales consultant",
    tone: config?.tone || "FRIENDLY",
    languages: config?.languages || "English, Hindi, Hinglish",
    custom_instructions: config?.custom_instructions || "",
    max_turns: config?.max_turns ?? 30,
    qualified_stage_id: config?.qualified_stage_id || null,
  });
  const [isPending, startTransition] = useTransition();

  const set = <K extends keyof AiConfigInput>(key: K, value: AiConfigInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const activeProvider = PROVIDERS.find((p) => p.id === form.provider) || PROVIDERS[0];

  const save = () => {
    startTransition(async () => {
      const res = await saveAiConfig(form);
      if (res.error) toast.error(res.error);
      else toast.success("AI agent settings saved");
    });
  };

  return (
    <div className="space-y-4">
      {/* Master switch + mode */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
          <div>
            <CardTitle className="text-base">Status</CardTitle>
            <CardDescription>
              {form.enabled
                ? form.mode === "LIVE"
                  ? "The bot replies to leads on its own."
                  : "Shadow mode — the bot only drafts replies in Live Chat for your approval."
                : "The bot is off. Replies are logged and humans answer as usual."}
            </CardDescription>
          </div>
          <Switch checked={form.enabled} onCheckedChange={(v) => set("enabled", v)} />
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Mode</Label>
              <Select value={form.mode} onValueChange={(v) => set("mode", v as "SHADOW" | "LIVE")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SHADOW">Shadow — drafts only, human sends</SelectItem>
                  <SelectItem value="LIVE">Live — bot sends on its own</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Run shadow for the first days. Flip to live once the drafts read right.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Model</Label>
              <Select value={form.model} onValueChange={(v) => set("model", v || form.model)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {activeProvider.models.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI provider */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">AI provider</CardTitle>
          <CardDescription>
            Which AI answers your leads. Switch freely — nothing else changes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2">
            {PROVIDERS.map((p) => {
              const active = form.provider === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    set("provider", p.id);
                    set("model", defaultModelFor(p.id));
                  }}
                  className={`text-left rounded-md border px-3 py-2.5 transition-colors ${
                    active ? "border-gray-900 bg-gray-50" : "hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{p.label}</span>
                    {active && (
                      <span className="text-[10px] font-semibold uppercase text-gray-500">selected</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{p.hint}</p>
                  {p.envKey && (
                    <p className="text-[11px] text-muted-foreground mt-1 font-mono">{p.envKey}</p>
                  )}
                </button>
              );
            })}
          </div>
          {form.provider !== "ANTHROPIC" && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              {form.provider === "MOCK"
                ? "Test mode sends canned replies and ignores what the lead wrote. Use it to check the plumbing, never to judge conversation quality."
                : "Gemini's free tier is rate-limited and has no prompt caching, so long chats with a big knowledge base get slow and can hit limits. Fine for testing — switch to Claude before real leads."}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Persona */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Persona</CardTitle>
          <CardDescription>How the bot introduces itself and sounds.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="persona_name">Name</Label>
              <Input
                id="persona_name"
                value={form.persona_name}
                onChange={(e) => set("persona_name", e.target.value)}
                placeholder="Priya"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="persona_role">Role</Label>
              <Input
                id="persona_role"
                value={form.persona_role}
                onChange={(e) => set("persona_role", e.target.value)}
                placeholder="sales consultant"
              />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tone</Label>
              <Select value={form.tone} onValueChange={(v) => set("tone", v as AiConfigInput["tone"]) }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FRIENDLY">Friendly</SelectItem>
                  <SelectItem value="PROFESSIONAL">Professional</SelectItem>
                  <SelectItem value="CASUAL">Casual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="languages">Languages</Label>
              <Input
                id="languages"
                value={form.languages}
                onChange={(e) => set("languages", e.target.value)}
                placeholder="English, Hindi, Hinglish"
              />
              <p className="text-xs text-muted-foreground">It mirrors whatever the lead writes in.</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="custom">Extra instructions (optional)</Label>
            <Textarea
              id="custom"
              value={form.custom_instructions}
              onChange={(e) => set("custom_instructions", e.target.value)}
              rows={4}
              placeholder={
                "Anything specific to your business, e.g.\n- Always mention the festive offer runs till month end\n- Never discuss the Phase 2 towers"
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Behaviour */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Behaviour</CardTitle>
          <CardDescription>Where qualified leads go, and how long the bot persists.</CardDescription>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Qualified leads move to</Label>
            <Select
              value={form.qualified_stage_id || NONE_STAGE}
              onValueChange={(v) => set("qualified_stage_id", v === NONE_STAGE ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Don't move the stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_STAGE}>Don&apos;t move the stage</SelectItem>
                {stages.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <span className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full inline-block"
                        style={{ backgroundColor: s.color || "#9ca3af" }}
                      />
                      {s.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="max_turns">Max bot replies per conversation</Label>
            <Input
              id="max_turns"
              type="number"
              min={5}
              max={100}
              value={form.max_turns}
              onChange={(e) => set("max_turns", Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              After this many replies without an outcome, it hands the chat to your team.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={isPending}>
          {isPending ? "Saving…" : "Save settings"}
        </Button>
      </div>
    </div>
  );
}
