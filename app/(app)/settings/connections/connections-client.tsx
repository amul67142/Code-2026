"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Loader2,
  Pencil,
  Plus,
  Send,
  Trash2,
  Webhook,
  Code2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  deleteConnection,
  getConnectionSecrets,
  getDeliveryLogs,
  saveConnection,
  testConnection,
  toggleAutoSend,
  type ConnectionInput,
} from "./actions";
import { ALLOWED_METHODS, TEMPLATE_VARS } from "@/lib/crm/outbound";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Connection = any;
type DeliveryLog = any;

interface Project {
  id: string;
  name: string;
}

const SELECT_CLASS =
  "h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

const DEFAULT_BODY = `{
  "name": "{{name}}",
  "phone": "{{phone}}",
  "email": "{{email}}",
  "source": "{{source}}",
  "project": "{{project}}"
}`;

function emptyForm(): ConnectionInput {
  return {
    name: "",
    type: "WEBHOOK",
    url: "",
    method: "POST",
    headers: {},
    bodyTemplate: "",
    projectId: null,
    autoSend: false,
    isActive: true,
  };
}

export default function ConnectionsClient({
  initialConnections,
  projects,
  initialLogs,
}: {
  initialConnections: Connection[];
  projects: Project[];
  initialLogs: DeliveryLog[];
}) {
  const [connections, setConnections] = useState<Connection[]>(initialConnections);
  const [logs, setLogs] = useState<DeliveryLog[]>(initialLogs);
  const [editing, setEditing] = useState<ConnectionInput | null>(null);
  const [logFilter, setLogFilter] = useState<string>("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function refresh() {
    startTransition(async () => {
      const [fresh, freshLogs] = await Promise.all([
        (await import("./actions")).getConnections(),
        getDeliveryLogs(logFilter || undefined, 50),
      ]);
      setConnections(fresh);
      setLogs(freshLogs);
    });
  }

  async function openEdit(c: Connection) {
    // Header values never come down with the list — fetch them only when the
    // form actually needs them.
    const secrets = await getConnectionSecrets(c.id);
    setEditing({
      id: c.id,
      name: c.name,
      type: c.type,
      url: c.url,
      method: c.method || "POST",
      headers: ("headers" in secrets && secrets.headers) || {},
      bodyTemplate: c.body_template || "",
      projectId: c.project_id,
      autoSend: c.auto_send,
      isActive: c.is_active,
    });
  }

  async function handleToggle(c: Connection, next: boolean) {
    setConnections((prev) =>
      prev.map((x) => (x.id === c.id ? { ...x, auto_send: next } : x))
    );
    const res = await toggleAutoSend(c.id, next);
    if (res.error) {
      toast.error(res.error);
      setConnections((prev) =>
        prev.map((x) => (x.id === c.id ? { ...x, auto_send: !next } : x))
      );
      return;
    }
    toast.success(
      next
        ? `${c.name}: new leads will be sent automatically`
        : `${c.name}: automatic sending off — send manually from Leads`
    );
  }

  /**
   * Confirmation is a second click on the row, not window.confirm — embedded
   * browsers return false from that without ever showing a dialog, so the
   * button would simply appear broken.
   */
  async function handleDelete(c: Connection) {
    const res = await deleteConnection(c.id);
    if (res.error) return toast.error(res.error);
    setConnections((prev) => prev.filter((x) => x.id !== c.id));
    setLogs((prev) => prev.filter((l) => l.connection_id !== c.id));
    toast.success("Connection deleted");
  }

  function filterLogs(connectionId: string) {
    const next = logFilter === connectionId ? "" : connectionId;
    setLogFilter(next);
    startTransition(async () => {
      setLogs(await getDeliveryLogs(next || undefined, 50));
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/settings"
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" /> Settings
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Connections</h1>
          <p className="text-muted-foreground">
            Send your leads onward to another system — Pabbly, Make, or any API.
          </p>
        </div>
        <Button onClick={() => setEditing(emptyForm())}>
          <Plus className="mr-2 size-4" /> Add connection
        </Button>
      </div>

      {/* ── Connections ── */}
      {connections.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-card p-10 text-center">
          <Webhook className="mx-auto size-7 text-muted-foreground" />
          <p className="mt-3 font-medium">No connections yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Add a <strong>Webhook</strong> to paste a Pabbly or Make URL, or an{" "}
            <strong>API</strong> connection when the other side needs its own method,
            headers and body.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {connections.map((c) => (
            <ConnectionRow
              key={c.id}
              c={c}
              projects={projects}
              selected={logFilter === c.id}
              onToggle={(v) => handleToggle(c, v)}
              onEdit={() => openEdit(c)}
              confirmingDelete={confirmDelete === c.id}
              onDelete={() => {
                if (confirmDelete === c.id) {
                  setConfirmDelete(null);
                  handleDelete(c);
                } else {
                  setConfirmDelete(c.id);
                }
              }}
              onLogs={() => filterLogs(c.id)}
            />
          ))}
        </div>
      )}

      {/* ── Delivery history ── */}
      <div className="rounded-lg border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
          <div>
            <h2 className="font-semibold">Responses</h2>
            <p className="text-xs text-muted-foreground">
              What we sent and exactly what the endpoint sent back.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {logFilter && (
              <button
                onClick={() => filterLogs(logFilter)}
                className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
              >
                <X className="size-3" /> Clear filter
              </button>
            )}
            <Button size="sm" variant="outline" onClick={refresh} disabled={pending}>
              {pending && <Loader2 className="mr-1.5 size-3 animate-spin" />}
              Refresh
            </Button>
          </div>
        </div>

        {logs.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            Nothing sent yet. Use <strong>Test</strong> on a connection to try it.
          </p>
        ) : (
          <div className="divide-y">
            {logs.map((log) => (
              <LogRow key={log.id} log={log} connections={connections} />
            ))}
          </div>
        )}
      </div>

      {editing && (
        <ConnectionDialog
          value={editing}
          projects={projects}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}

/* ── One connection in the list ─────────────────────────────────────────── */

function ConnectionRow({
  c,
  projects,
  selected,
  onToggle,
  onEdit,
  onDelete,
  onLogs,
  confirmingDelete,
}: {
  c: Connection;
  projects: Project[];
  selected: boolean;
  onToggle: (v: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  onLogs: () => void;
  confirmingDelete: boolean;
}) {
  const project = projects.find((p) => p.id === c.project_id);
  const isApi = c.type === "API";

  return (
    <div
      className={`rounded-lg border bg-card p-4 ${selected ? "ring-2 ring-primary/30" : ""}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                isApi
                  ? "bg-violet-100 text-violet-700"
                  : "bg-sky-100 text-sky-700"
              }`}
            >
              {isApi ? <Code2 className="size-3" /> : <Webhook className="size-3" />}
              {isApi ? "API" : "Webhook"}
            </span>
            <span className="font-semibold">{c.name}</span>
            {!c.is_active && (
              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                Disabled
              </span>
            )}
          </div>

          <p className="mt-1 truncate font-mono text-xs text-muted-foreground" title={c.url}>
            <span className="font-semibold">{c.method || "POST"}</span> {c.url}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>{project ? `Project: ${project.name}` : "All projects"}</span>
            {c.header_preview?.length > 0 && (
              <span>
                {c.header_preview.length} header
                {c.header_preview.length === 1 ? "" : "s"}
              </span>
            )}
            <span>
              {c.total_sent ?? 0} sent
              {(c.total_failed ?? 0) > 0 && (
                <span className="text-red-600"> · {c.total_failed} failed</span>
              )}
            </span>
            {c.last_delivery_at && (
              <span>
                Last{" "}
                <StatusPill status={c.last_status} />{" "}
                {format(new Date(c.last_delivery_at), "d MMM, h:mm a")}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-3">
          {/* The toggle the whole feature turns on. */}
          <label className="flex cursor-pointer items-center gap-2">
            <span className="text-xs font-medium">
              {c.auto_send ? "Automatic" : "Manual only"}
            </span>
            <Switch checked={c.auto_send} onCheckedChange={onToggle} />
          </label>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline" onClick={onLogs}>
              {selected ? "Showing" : "Responses"}
            </Button>
            <Button size="sm" variant="outline" onClick={onEdit}>
              <Pencil className="size-3.5" />
            </Button>
            <Button
              size="sm"
              variant={confirmingDelete ? "default" : "outline"}
              className={
                confirmingDelete
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "border-red-200 text-red-600 hover:bg-red-50"
              }
              onClick={onDelete}
              title={`Delete ${c.name} and its delivery history`}
            >
              <Trash2 className="mr-0 size-3.5" />
              {confirmingDelete && <span className="ml-1.5 text-xs">Confirm?</span>}
            </Button>
          </div>
        </div>
      </div>

      <p className="mt-3 border-t pt-2 text-xs text-muted-foreground">
        {c.auto_send ? (
          <>
            Every new lead{project ? ` in ${project.name}` : ""} is sent here the moment it
            lands.
          </>
        ) : (
          <>
            Nothing is sent automatically. Pick leads in <strong>Leads</strong> and use{" "}
            <strong>Send to CRM</strong>.
          </>
        )}
      </p>
    </div>
  );
}

function StatusPill({ status }: { status: number | null }) {
  if (status === null || status === undefined)
    return <span className="font-medium text-red-600">failed</span>;
  const ok = status >= 200 && status < 300;
  return (
    <span className={`font-medium ${ok ? "text-green-700" : "text-red-600"}`}>{status}</span>
  );
}

/* ── One delivery, expandable ───────────────────────────────────────────── */

function LogRow({ log, connections }: { log: DeliveryLog; connections: Connection[] }) {
  const [open, setOpen] = useState(false);
  const conn = connections.find((c) => c.id === log.connection_id);
  const ok = log.response_status >= 200 && log.response_status < 300;

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/50"
      >
        <span
          className={`inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${
            ok ? "bg-green-600" : "bg-red-500"
          }`}
        >
          {ok ? <Check className="size-3" /> : "!"}
        </span>
        <span className="w-14 shrink-0 font-mono text-xs">
          <StatusPill status={log.response_status} />
        </span>
        <span className="min-w-0 flex-1 truncate text-sm">
          {log.lead_name || "—"}
          <span className="ml-2 text-xs text-muted-foreground">
            → {conn?.name || "deleted connection"}
          </span>
        </span>
        <span className="hidden shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground sm:inline">
          {log.trigger_type}
        </span>
        <span className="hidden shrink-0 text-xs tabular-nums text-muted-foreground md:inline">
          {log.duration_ms}ms
        </span>
        <span className="shrink-0 text-xs text-muted-foreground">
          {format(new Date(log.created_at), "d MMM, h:mm a")}
        </span>
        <ChevronDown
          className={`size-4 shrink-0 text-muted-foreground transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="space-y-3 bg-muted/30 px-4 py-3">
          <Field label="Request">
            <p className="font-mono text-[11px] break-all text-muted-foreground">
              {log.request_method} {log.request_url}
            </p>
            {log.request_body && <Pre>{log.request_body}</Pre>}
          </Field>
          <Field label="Response">
            {log.error_message && (
              <p className="mb-1 text-xs font-medium text-red-600">{log.error_message}</p>
            )}
            {log.response_body ? (
              <Pre>{log.response_body}</Pre>
            ) : (
              <p className="text-xs text-muted-foreground">Empty response body.</p>
            )}
          </Field>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      {children}
    </div>
  );
}

function Pre({ children }: { children: React.ReactNode }) {
  return (
    <pre className="max-h-56 overflow-auto rounded border bg-background p-2 font-mono text-[11px] whitespace-pre-wrap break-all">
      {children}
    </pre>
  );
}

/* ── Add / edit ─────────────────────────────────────────────────────────── */

function ConnectionDialog({
  value,
  projects,
  onClose,
  onSaved,
}: {
  value: ConnectionInput;
  projects: Project[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<ConnectionInput>(value);
  const [headerRows, setHeaderRows] = useState<{ key: string; value: string }[]>(
    Object.entries(value.headers).length
      ? Object.entries(value.headers).map(([key, v]) => ({ key, value: v }))
      : [{ key: "", value: "" }]
  );
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
   
  const [testResult, setTestResult] = useState<any>(null);

  const isApi = form.type === "API";

  function collect(): ConnectionInput {
    return {
      ...form,
      headers: Object.fromEntries(
        headerRows.filter((r) => r.key.trim()).map((r) => [r.key.trim(), r.value])
      ),
    };
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testConnection(collect());
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      setTestResult(res.result);
      if (res.result?.ok) toast.success(`Endpoint replied ${res.result.status}`);
      else toast.error(res.result?.error || "The endpoint rejected it");
    } finally {
      setTesting(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await saveConnection(collect());
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(form.id ? "Connection updated" : "Connection added");
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>{form.id ? "Edit connection" : "Add connection"}</DialogTitle>
          <DialogDescription>
            Where leads from BigLead should be sent.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Type */}
          <div className="grid grid-cols-2 gap-2">
            <TypeCard
              active={!isApi}
              icon={<Webhook className="size-4" />}
              title="Webhook"
              desc="Paste a URL. We POST the lead as JSON."
              onClick={() => setForm({ ...form, type: "WEBHOOK" })}
            />
            <TypeCard
              active={isApi}
              icon={<Code2 className="size-4" />}
              title="API"
              desc="Choose the method, headers and body."
              onClick={() =>
                setForm({
                  ...form,
                  type: "API",
                  bodyTemplate: form.bodyTemplate || DEFAULT_BODY,
                })
              }
            />
          </div>

          <div>
            <Label htmlFor="conn-name">Name</Label>
            <Input
              id="conn-name"
              className="mt-1"
              placeholder={isApi ? "Partner CRM" : "Pabbly — 99acres leads"}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div className={isApi ? "grid grid-cols-[110px_1fr] gap-2" : ""}>
            {isApi && (
              <div>
                <Label htmlFor="conn-method">Method</Label>
                <select
                  id="conn-method"
                  className={`${SELECT_CLASS} mt-1`}
                  value={form.method}
                  onChange={(e) => setForm({ ...form, method: e.target.value })}
                >
                  {ALLOWED_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <Label htmlFor="conn-url">Endpoint URL</Label>
              <Input
                id="conn-url"
                className="mt-1 font-mono text-xs"
                placeholder="https://connect.pabbly.com/workflow/sendwebhookdata/..."
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
              />
            </div>
          </div>

          {isApi && (
            <>
              <div>
                <div className="flex items-center justify-between">
                  <Label>Headers</Label>
                  <button
                    type="button"
                    onClick={() => setHeaderRows([...headerRows, { key: "", value: "" }])}
                    className="text-xs text-primary hover:underline"
                  >
                    + Add header
                  </button>
                </div>
                <div className="mt-1 space-y-1.5">
                  {headerRows.map((row, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <Input
                        className="h-9 flex-1 font-mono text-xs"
                        placeholder="Authorization"
                        value={row.key}
                        onChange={(e) => {
                          const next = [...headerRows];
                          next[i] = { ...row, key: e.target.value };
                          setHeaderRows(next);
                        }}
                      />
                      <Input
                        className="h-9 flex-[1.4] font-mono text-xs"
                        placeholder="Bearer xxxxx"
                        value={row.value}
                        onChange={(e) => {
                          const next = [...headerRows];
                          next[i] = { ...row, value: e.target.value };
                          setHeaderRows(next);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setHeaderRows(
                            headerRows.length === 1
                              ? [{ key: "", value: "" }]
                              : headerRows.filter((_, j) => j !== i)
                          )
                        }
                        className="rounded p-1.5 text-muted-foreground hover:bg-muted"
                        aria-label="Remove header"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Stored encrypted. Content-Type defaults to application/json.
                </p>
              </div>

              {form.method !== "GET" && (
                <div>
                  <Label htmlFor="conn-body">Body</Label>
                  <Textarea
                    id="conn-body"
                    className="mt-1 min-h-[150px] font-mono text-xs"
                    value={form.bodyTemplate}
                    onChange={(e) => setForm({ ...form, bodyTemplate: e.target.value })}
                  />
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {TEMPLATE_VARS.map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() =>
                          setForm({ ...form, bodyTemplate: `${form.bodyTemplate}{{${v}}}` })
                        }
                        className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground hover:bg-muted-foreground/20"
                      >
                        {`{{${v}}}`}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          <div>
            <Label htmlFor="conn-project">Which leads</Label>
            <select
              id="conn-project"
              className={`${SELECT_CLASS} mt-1`}
              value={form.projectId || ""}
              onChange={(e) => setForm({ ...form, projectId: e.target.value || null })}
            >
              <option value="">All projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  Only {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
            <label className="flex cursor-pointer items-start justify-between gap-4">
              <span>
                <span className="text-sm font-medium">Send automatically</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  On: every new lead goes out the moment it lands. Off: you send them
                  yourself from the Leads page.
                </span>
              </span>
              <Switch
                checked={form.autoSend}
                onCheckedChange={(v) => setForm({ ...form, autoSend: v })}
              />
            </label>
            <label className="flex cursor-pointer items-center justify-between gap-4 border-t pt-3">
              <span className="text-sm font-medium">Connection enabled</span>
              <Switch
                checked={form.isActive}
                onCheckedChange={(v) => setForm({ ...form, isActive: v })}
              />
            </label>
          </div>

          {testResult && (
            <div
              className={`rounded-lg border p-3 ${
                testResult.ok ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
              }`}
            >
              <p className="text-sm font-medium">
                {testResult.status ? `HTTP ${testResult.status}` : "No response"} ·{" "}
                {testResult.durationMs}ms
                <span className="ml-2 font-normal text-muted-foreground">
                  {testResult.usedRealLead ? "sent your latest lead" : "sent sample data"}
                </span>
              </p>
              {testResult.error && (
                <p className="mt-1 text-xs text-red-700">{testResult.error}</p>
              )}
              {testResult.responseBody && <Pre>{testResult.responseBody}</Pre>}
            </div>
          )}
        </div>

        <div className="mt-5 flex items-center justify-between gap-2 border-t pt-4">
          <Button variant="outline" onClick={handleTest} disabled={testing || saving}>
            {testing ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Send className="mr-2 size-4" />
            )}
            Test
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || testing}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              {form.id ? "Save changes" : "Add connection"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TypeCard({
  active,
  icon,
  title,
  desc,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border p-3 text-left transition-colors ${
        active ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted/50"
      }`}
    >
      <span className="flex items-center gap-1.5 text-sm font-semibold">
        {icon}
        {title}
      </span>
      <span className="mt-0.5 block text-xs text-muted-foreground">{desc}</span>
    </button>
  );
}
