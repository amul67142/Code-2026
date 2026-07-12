"use client";

import { useState, useTransition, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createWebhook, deleteWebhook, regenerateToken } from "./actions";
import { startFacebookOAuth, disconnectFacebookPage } from "./facebook-actions";
import { FacebookFormsManager } from "./facebook-forms-manager";
import { WhatsAppCard } from "./whatsapp-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plug,
  Plus,
  Trash2,
  RefreshCw,
  Copy,
  CheckCircle2,
  AlertCircle,
  Eye,
  Unplug,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Webhook = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Project = any;

interface FacebookConnection {
  id: string;
  page_id: string;
  page_name: string | null;
  status: string;
  subscribed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface Agent {
  id: string;
  name: string;
}

interface IntegrationsClientProps {
  initialWebhooks: Webhook[];
  projects: Project[];
  facebookConnections: FacebookConnection[];
  agents: Agent[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  whatsappConnection?: any;
  whatsappStages?: { id: string; name: string }[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  whatsappTemplates?: any;
}

export default function IntegrationsClient({
  initialWebhooks,
  projects,
  facebookConnections: initialFbConnections,
  agents,
  whatsappConnection,
  whatsappStages = [],
  whatsappTemplates,
}: IntegrationsClientProps) {
  const [webhooks, setWebhooks] = useState<Webhook[]>(initialWebhooks);
  const [fbConnections, setFbConnections] = useState<FacebookConnection[]>(initialFbConnections);
  const [isPending, startTransition] = useTransition();
  const [isFbConnecting, setIsFbConnecting] = useState(false);

  const searchParams = useSearchParams();
  const router = useRouter();

  // Handle Facebook OAuth redirect result
  useEffect(() => {
    const fb = searchParams.get("fb");
    if (fb === "connected") {
      const pages = searchParams.get("pages") || "1";
      const warnings = searchParams.get("warnings");
      toast.success(`Successfully connected ${pages} Facebook Page${Number(pages) > 1 ? "s" : ""}!`);
      if (warnings) {
        toast.warning(decodeURIComponent(warnings));
      }
      // Clean up URL params
      router.replace("/settings/integrations", { scroll: false });
    } else if (fb === "error") {
      const msg = searchParams.get("msg") || "Failed to connect Facebook";
      toast.error(decodeURIComponent(msg));
      router.replace("/settings/integrations", { scroll: false });
    }
  }, [searchParams, router]);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState("");
  const [sourceLabel, setSourceLabel] = useState("GENERIC");
  const [customSource, setCustomSource] = useState("");

  // State to hold the newly generated secret so the user can copy it
  const [newSecret, setNewSecret] = useState<{ id: string; secret: string } | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProject) return toast.error("Please select a project");

    const finalSourceLabel = sourceLabel === "GENERIC" && customSource.trim()
      ? customSource.trim()
      : sourceLabel;

    startTransition(async () => {
      const res = await createWebhook({
        project_id: selectedProject,
        source_label: finalSourceLabel,
        assignment_rule: "ROUND_ROBIN",
        duplicate_rule: "SKIP",
      });

      if (res.error || !res.data || !res.rawSecret) {
        toast.error(res.error || "An unknown error occurred");
      } else {
        toast.success("Webhook created successfully");
        setWebhooks([res.data, ...webhooks]);
        setNewSecret({ id: res.data.id, secret: res.rawSecret });
        setIsCreateOpen(false);
        setSelectedProject("");
        setSourceLabel("GENERIC");
        setCustomSource("");
      }
    });
  }

  function handleRegenerate(id: string) {
    if (!confirm("Are you sure? This will invalidate the existing URL immediately.")) return;
    
    startTransition(async () => {
      const res = await regenerateToken(id);
      if (res.error || !res.data || !res.rawSecret) {
        toast.error(res.error || "An unknown error occurred");
      } else {
        toast.success("Token regenerated");
        setWebhooks(webhooks.map((w) => (w.id === id ? { ...w, ...res.data } : w)));
        setNewSecret({ id: res.data.id, secret: res.rawSecret });
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this webhook? Incoming leads will fail immediately.")) return;

    startTransition(async () => {
      const res = await deleteWebhook(id);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Webhook deleted");
        setWebhooks(webhooks.filter((w) => w.id !== id));
      }
    });
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  }

  async function handleFacebookConnect() {
    setIsFbConnecting(true);
    try {
      const result = await startFacebookOAuth();
      if (result.error) {
        toast.error(result.error);
        setIsFbConnecting(false);
      } else if (result.url) {
        // Redirect to Facebook OAuth dialog
        window.location.href = result.url;
      }
    } catch {
      toast.error("Failed to start Facebook connection");
      setIsFbConnecting(false);
    }
  }

  function handleFacebookDisconnect(connectionId: string, pageName: string | null) {
    if (!confirm(`Disconnect "${pageName || "this page"}" from Facebook Lead Ads? New leads from this page will stop flowing in.`)) return;

    startTransition(async () => {
      const res = await disconnectFacebookPage(connectionId);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(`Disconnected "${pageName || "page"}" from Facebook`);
        setFbConnections(fbConnections.filter((c) => c.id !== connectionId));
      }
    });
  }

  function getWebhookUrl(companyId: string, projectId: string, token: string) {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/api/webhooks/inbound/${companyId}/${projectId}/${token}`;
    }
    return `/api/webhooks/inbound/${companyId}/${projectId}/${token}`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Integrations</h1>
        <p className="text-muted-foreground">
          Connect your lead sources — Facebook Lead Ads, Google Ads, Zapier, and more.
        </p>
      </div>

      {/* ── Facebook Lead Ads Section ── */}
      <div className="rounded-lg border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 p-2.5 rounded-lg">
              <svg className="size-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </div>
            <div>
              <h3 className="font-semibold">Facebook Lead Ads</h3>
              <p className="text-xs text-muted-foreground">
                Connect your Facebook Page to receive Lead Ad submissions directly — no Zapier needed.
              </p>
            </div>
          </div>
          <Button
            onClick={handleFacebookConnect}
            disabled={isFbConnecting || isPending}
            variant={fbConnections.filter(c => c.status === "ACTIVE").length > 0 ? "outline" : "default"}
            className={fbConnections.filter(c => c.status === "ACTIVE").length === 0 ? "bg-[#1877F2] hover:bg-[#166FE5] text-white" : ""}
          >
            {isFbConnecting ? (
              <><Loader2 className="mr-2 size-4 animate-spin" /> Connecting...</>
            ) : (
              <>
                <svg className="mr-2 size-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                {fbConnections.filter(c => c.status === "ACTIVE").length > 0 ? "Connect Another Page" : "Connect Facebook Page"}
              </>
            )}
          </Button>
        </div>

        {/* Connected Pages */}
        {fbConnections.length > 0 && (
          <div className="space-y-2">
            {fbConnections.map((conn) => (
              <div
                key={conn.id}
                className="rounded-md border px-4 py-3 bg-muted/30"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 p-1.5 rounded">
                      <svg className="size-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{conn.page_name || `Page ${conn.page_id}`}</p>
                      <p className="text-xs text-muted-foreground">
                        Connected {format(new Date(conn.created_at), "MMM d, yyyy")}
                        {conn.subscribed_at && " · Webhook subscribed"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={conn.status === "ACTIVE" ? "default" : "secondary"}
                      className={conn.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 hover:bg-emerald-100" : ""}
                    >
                      {conn.status === "ACTIVE" && <CheckCircle2 className="mr-1 size-3" />}
                      {conn.status === "EXPIRED" && <AlertCircle className="mr-1 size-3" />}
                      {conn.status}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Disconnect Page"
                      onClick={() => handleFacebookDisconnect(conn.id, conn.page_name)}
                      disabled={isPending}
                    >
                      <Unplug className="size-4 text-red-500" />
                    </Button>
                  </div>
                </div>

                {conn.status === "ACTIVE" && (
                  <FacebookFormsManager
                    connectionId={conn.id}
                    projects={projects}
                    agents={agents}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {fbConnections.length === 0 && (
          <div className="text-center py-6 text-muted-foreground text-sm border rounded-md border-dashed">
            <p>No Facebook Pages connected yet.</p>
            <p className="text-xs mt-1">Click &quot;Connect Facebook Page&quot; above to get started.</p>
          </div>
        )}
      </div>

      {/* ── WhatsApp Auto-Reply Section ── */}
      <WhatsAppCard initial={whatsappConnection || null} stages={whatsappStages} templatesData={whatsappTemplates} />

      {/* ── Webhooks Section ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Generic Webhooks</h2>
          <p className="text-sm text-muted-foreground">
            Inbound webhooks for Zapier, Google Ads, or custom integrations.
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} disabled={isPending} size="sm">
          <Plus className="mr-2 size-4" />
          Add Webhook
        </Button>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Source</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Webhook URL</TableHead>
              <TableHead>Secret Key</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {webhooks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Plug className="size-8 text-muted-foreground/50" />
                    <p>No webhooks configured yet.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              webhooks.map((w) => {
                const url = getWebhookUrl(w.company_id, w.project_id, w.token);
                return (
                  <TableRow key={w.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {w.source_label === "FACEBOOK" ? (
                          <div className="bg-blue-100 text-blue-700 p-1.5 rounded">
                            <svg className="size-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                          </div>
                        ) : w.source_label === "GOOGLE" ? (
                          <div className="bg-red-100 text-red-700 p-1.5 rounded">
                            <svg className="size-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/></svg>
                          </div>
                        ) : (
                          <div className="bg-gray-100 text-gray-700 p-1.5 rounded">
                            <Plug className="size-4" />
                          </div>
                        )}
                        {w.source_label}
                      </div>
                    </TableCell>
                    <TableCell>{w.projects?.name || "Unknown Project"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Input value={url} readOnly className="h-8 max-w-[200px] text-xs font-mono" />
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyToClipboard(url)}>
                          <Copy className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      {newSecret?.id === w.id ? (
                        <div className="flex flex-col gap-1">
                          <Badge variant="destructive" className="w-fit animate-pulse">Copy this now!</Badge>
                          <div className="flex items-center gap-2">
                            <Input value={newSecret?.secret || ""} readOnly className="h-8 max-w-[200px] text-xs font-mono border-red-500" />
                            <Button variant="outline" size="icon" className="h-8 w-8 border-red-500 text-red-500 hover:bg-red-50" onClick={() => copyToClipboard(newSecret?.secret || "")}>
                              <Copy className="size-4" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground">{w.secret_key_display}</span>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-zinc-900" title="Copy Secret Key" onClick={() => copyToClipboard(w.secret_key_hash)}>
                            <Copy className="size-3.5" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={w.status === "ACTIVE" ? "default" : "secondary"}>
                        {w.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" title="Regenerate Token" onClick={() => handleRegenerate(w.id)} disabled={isPending}>
                          <RefreshCw className="size-4 text-blue-600" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Delete Webhook" onClick={() => handleDelete(w.id)} disabled={isPending}>
                          <Trash2 className="size-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Webhook</DialogTitle>
            <DialogDescription>
              Generate a secure endpoint to receive leads from Zapier, Make, or custom scripts.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>Source Type</Label>
              <Select value={sourceLabel} onValueChange={(val) => setSourceLabel(val || "GENERIC")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GENERIC">Generic / Zapier</SelectItem>
                  <SelectItem value="FACEBOOK">Facebook Lead Ads</SelectItem>
                  <SelectItem value="GOOGLE">Google Ads</SelectItem>
                  <SelectItem value="WEBSITE">Website Form</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {sourceLabel === "GENERIC" && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                <Label htmlFor="customSource">Custom Source Name (Optional)</Label>
                <Input
                  id="customSource"
                  placeholder="e.g., Zapier, Facebook NCR Campaign, Landing Page"
                  value={customSource}
                  onChange={(e) => setCustomSource(e.target.value)}
                />
                <p className="text-[10px] text-muted-foreground">
                  Give this generic webhook a specific name to track where these leads originate.
                </p>
              </div>
            )}
            
            <div className="space-y-2">
              <Label>Destination Project</Label>
              <Select value={selectedProject} onValueChange={(val) => setSelectedProject(val || "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a project..." />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                  {projects.length === 0 && (
                    <SelectItem value="none" disabled>No projects available</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || !selectedProject}>
                {isPending ? "Generating..." : "Generate Webhook URL"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
