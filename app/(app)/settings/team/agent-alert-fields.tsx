"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, MessageCircle, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  ALERT_FIELDS,
  STANDARD_ALERT_TEMPLATE,
  fitAlertMapping,
  isAlertField,
  templateVariableCount,
  type AlertField,
} from "@/lib/automation/agent-alert-fields";
import type { AgentAlertSettings } from "@/lib/team/agent-alert-settings";
import { createStandardAlertTemplate, type AlertTemplateOption } from "./alert-actions";

export interface AlertSetup {
  connected: boolean;
  hasWaba: boolean;
  templates: AlertTemplateOption[];
}

export function emptyAlertSettings(): AgentAlertSettings {
  return { enabled: false, phone: "", template: null, templateLanguage: null, variables: [] };
}

/** Read a team member row into the dialog's shape. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function alertSettingsFromMember(m: any): AgentAlertSettings {
  return {
    enabled: m?.wa_notify_enabled === true,
    phone: m?.phone || "",
    template: m?.wa_notify_template || null,
    templateLanguage: m?.wa_notify_template_language || null,
    variables: Array.isArray(m?.wa_notify_variables) ? m.wa_notify_variables : [],
  };
}

const selectClass =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30";

const SAMPLE: Record<AlertField, string> = {
  lead_name: "Raju Patel",
  lead_phone: "+919876543210",
  lead_email: "raju@example.com",
  project: "Trident Hills",
  source: "WEBSITE FORM",
  stage: "New",
  location: "Sector 150",
  bhk: "3 BHK",
  budget: "₹90,00,000 – ₹1,20,00,000",
  notes: "Looking for a corner unit",
  agent_name: "Amit",
  company: "Your company",
};

function StatusTag({ status }: { status: string }) {
  const s = status.toUpperCase();
  const cls =
    s === "APPROVED"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : s === "REJECTED" || s === "DISABLED"
        ? "bg-red-50 text-red-700 border-red-200"
        : "bg-amber-50 text-amber-700 border-amber-200";
  return (
    <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase ${cls}`}>
      {s === "APPROVED" ? "Approved" : s === "PENDING" ? "Awaiting Meta" : s.toLowerCase()}
    </span>
  );
}

/**
 * The WhatsApp alert part of the invite and edit dialogs.
 *
 * The template picker lists ONLY templates in the Agent lead alert group. A
 * lead welcome sent to an agent is useless, and an agent alert sent to a
 * customer is a leak — keeping the list strict is how neither happens.
 */
export function AgentAlertFields({
  value,
  onChange,
  setup,
  onSetupChange,
  disabled,
}: {
  value: AgentAlertSettings;
  onChange: (next: AgentAlertSettings) => void;
  setup: AlertSetup;
  onSetupChange: (next: AlertSetup) => void;
  disabled?: boolean;
}) {
  const [creating, setCreating] = useState(false);

  const alertTemplates = setup.templates.filter((t) => t.purpose === "AGENT_LEAD_ALERT");
  const otherCount = setup.templates.length - alertTemplates.length;
  const key = (name: string | null, lang: string | null) => `${name}::${lang || "en_US"}`;
  const selected = alertTemplates.find(
    (t) => key(t.name, t.language) === key(value.template, value.templateLanguage)
  );
  const mapping = selected ? fitAlertMapping(value.variables, selected.varCount) : [];

  function pickTemplate(k: string) {
    const t = alertTemplates.find((x) => key(x.name, x.language) === k);
    onChange({
      ...value,
      template: t?.name || null,
      templateLanguage: t?.language || null,
      // Keep what was chosen where it still fits; name and number by default.
      variables: t ? fitAlertMapping(value.variables, t.varCount) : value.variables,
    });
  }

  function setVariable(index: number, field: string) {
    if (!isAlertField(field)) return;
    const next = [...mapping];
    next[index] = field;
    onChange({ ...value, variables: next });
  }

  async function createStandard() {
    setCreating(true);
    const res = await createStandardAlertTemplate();
    setCreating(false);
    if ("error" in res && res.error) {
      toast.error(res.error);
      return;
    }
    if (!("template" in res) || !res.template) return;
    const t = res.template;
    const option: AlertTemplateOption = {
      id: `new-${t.name}`,
      name: t.name,
      language: t.language,
      status: t.status,
      purpose: "AGENT_LEAD_ALERT",
      body: STANDARD_ALERT_TEMPLATE.body,
      varCount: templateVariableCount(STANDARD_ALERT_TEMPLATE.body),
    };
    onSetupChange({ ...setup, templates: [option, ...setup.templates] });
    onChange({
      ...value,
      template: t.name,
      templateLanguage: t.language,
      variables: res.mapping || STANDARD_ALERT_TEMPLATE.mapping,
    });
    toast.success("Template sent to Meta for approval. Alerts start once it is approved.");
  }

  // Live preview of the message with sample values in place.
  const preview = selected
    ? selected.body.replace(/\{\{\s*(\d+)\s*\}\}/g, (_, n) => {
        const f = mapping[Number(n) - 1];
        return f ? SAMPLE[f] : `{{${n}}}`;
      })
    : "";

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <label className="flex cursor-pointer items-start justify-between gap-3">
        <span>
          <span className="flex items-center gap-1.5 text-sm font-medium">
            <MessageCircle className="size-4 text-emerald-600" />
            Send WhatsApp lead alerts
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            When a lead is assigned to them, they get its name and number on WhatsApp and
            can tap to call.
          </span>
        </span>
        <Switch
          checked={value.enabled}
          onCheckedChange={(v) => onChange({ ...value, enabled: v })}
          disabled={disabled || !setup.connected}
        />
      </label>

      {!setup.connected && (
        <p className="text-xs text-muted-foreground">
          Connect WhatsApp in{" "}
          <Link href="/settings/integrations" className="underline">
            Integrations
          </Link>{" "}
          to use alerts.
        </p>
      )}

      {setup.connected && value.enabled && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Agent&apos;s WhatsApp number</Label>
            <Input
              inputMode="tel"
              placeholder="98765 43210"
              value={value.phone}
              disabled={disabled}
              onChange={(e) => onChange({ ...value, phone: e.target.value })}
            />
            <p className="text-[11px] text-muted-foreground">
              Their own number, not the company&apos;s. 10 digits is taken as India.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Template · Agent lead alerts</Label>
            {alertTemplates.length === 0 ? (
              <div className="rounded-md border border-dashed p-3 text-xs">
                <p className="font-medium">No agent lead alert template yet.</p>
                <p className="mt-0.5 text-muted-foreground">
                  Create the standard one — name, number and project — and Meta will review it,
                  usually within a few hours.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={createStandard}
                    disabled={creating || disabled || !setup.hasWaba}
                  >
                    {creating ? (
                      <Loader2 className="mr-1.5 size-3 animate-spin" />
                    ) : (
                      <Plus className="mr-1.5 size-3" />
                    )}
                    Create lead alert template
                  </Button>
                  <Link
                    href="/settings/whatsapp-templates/new?purpose=AGENT_LEAD_ALERT"
                    className="inline-flex h-7 items-center rounded-md border px-2.5 text-xs hover:bg-muted"
                  >
                    Write my own
                  </Link>
                </div>
                {!setup.hasWaba && (
                  <p className="mt-2 text-red-600">
                    Reconnect WhatsApp to manage templates.
                  </p>
                )}
              </div>
            ) : (
              <select
                className={selectClass}
                value={selected ? key(selected.name, selected.language) : ""}
                disabled={disabled}
                onChange={(e) => pickTemplate(e.target.value)}
              >
                <option value="">Choose a template…</option>
                {alertTemplates.map((t) => (
                  <option key={t.id} value={key(t.name, t.language)}>
                    {t.name} ({t.language}){t.status !== "APPROVED" ? ` — ${t.status.toLowerCase()}` : ""}
                  </option>
                ))}
              </select>
            )}
            {otherCount > 0 && (
              <p className="text-[11px] text-muted-foreground">
                {otherCount} other template{otherCount === 1 ? " is" : "s are"} written for
                customers and hidden here. Move one into this group on the{" "}
                <Link href="/settings/whatsapp-templates" className="underline">
                  Templates page
                </Link>
                .
              </p>
            )}
          </div>

          {selected && (
            <>
              <div className="flex items-center gap-2 text-xs">
                <StatusTag status={selected.status} />
                {selected.status !== "APPROVED" && (
                  <span className="text-muted-foreground">
                    Alerts start once Meta approves it and templates are synced.
                  </span>
                )}
              </div>

              {mapping.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs">What goes in each variable</Label>
                  <div className="space-y-1.5">
                    {mapping.map((field, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="w-10 shrink-0 font-mono text-xs text-muted-foreground">
                          {`{{${i + 1}}}`}
                        </span>
                        <select
                          className={selectClass}
                          value={field}
                          disabled={disabled}
                          onChange={(e) => setVariable(i, e.target.value)}
                        >
                          {Object.entries(ALERT_FIELDS).map(([k, label]) => (
                            <option key={k} value={k}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs">Preview</Label>
                <p className="whitespace-pre-wrap rounded-md bg-emerald-50 p-2.5 text-xs text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-100">
                  {preview}
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
