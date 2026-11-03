import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Bot,
  SlidersHorizontal,
  BookOpen,
  Database,
  ListChecks,
  MessageCircle,
  ArrowRight,
  AlertCircle,
  Activity,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAiOverview } from "./actions";

export const metadata = {
  title: "AI Agent | Big Lead CRM",
};

export const dynamic = "force-dynamic";

export default async function AiAgentOverviewPage() {
  const data = await getAiOverview();
  if (!data) redirect("/dashboard");

  const cfg = data.config;
  const statusBadge = !cfg
    ? { label: "Not set up", cls: "bg-gray-100 text-gray-600" }
    : !cfg.enabled
      ? { label: "Off", cls: "bg-gray-100 text-gray-600" }
      : cfg.mode === "LIVE"
        ? { label: "Live", cls: "bg-green-100 text-green-700" }
        : { label: "Shadow mode", cls: "bg-amber-100 text-amber-700" };

  const stats = [
    { label: "Bot replies · 24h", value: data.runsToday },
    { label: "Drafts waiting", value: data.pendingDrafts },
    { label: "Qualified by AI · 30d", value: data.qualified30d },
    { label: "Handed to humans", value: data.escalatedOpen },
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const runs: any[] = data.recentRuns || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const failedSends: any[] = data.failedSends || [];
  const latestRun = runs[0];
  const outcomeBadge = (o: string) =>
    o === "ERROR"
      ? "bg-red-100 text-red-700"
      : o === "SENT"
        ? "bg-green-100 text-green-700"
        : o === "DRAFTED"
          ? "bg-amber-100 text-amber-700"
          : "bg-gray-100 text-gray-600";

  const setupLinks = [
    {
      title: "Setup",
      description: "Persona, tone, languages, mode (shadow / live), model.",
      icon: SlidersHorizontal,
      href: "/ai-agent/setup",
    },
    {
      title: "Knowledge",
      description: "What the bot knows — project write-ups, FAQs, location advantages.",
      icon: BookOpen,
      href: "/ai-agent/knowledge",
    },
    {
      title: "Products & Prices",
      description: "Exact facts the bot may quote: prices, sizes, RERA, possession.",
      icon: Database,
      href: "/ai-agent/facts",
    },
    {
      title: "Qualification",
      description: "The questions it works into conversation, and what counts as qualified.",
      icon: ListChecks,
      href: "/ai-agent/qualification",
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Bot className="size-6" /> AI Agent
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            After your welcome message goes out and the lead replies, the AI agent answers from your
            knowledge, qualifies the lead, and books site visits — handing off to your team in Live
            Chat whenever a human should step in.
          </p>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${statusBadge.cls}`}>
          {statusBadge.label}
        </span>
      </div>

      {!cfg && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              The AI agent isn&apos;t configured yet. Set the persona, add your knowledge, then turn it
              on in shadow mode — it will draft replies in Live Chat for you to approve before it ever
              sends anything itself.
            </p>
            <Link
              href="/ai-agent/setup"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              Start setup <ArrowRight className="size-4" />
            </Link>
          </CardContent>
        </Card>
      )}

      {latestRun?.outcome === "ERROR" && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm font-semibold text-red-800 flex items-center gap-2">
            <AlertCircle className="size-4" /> The last bot reply failed —{" "}
            {formatDistanceToNow(new Date(latestRun.created_at), { addSuffix: true })}
          </p>
          <p className="text-xs text-red-700 mt-1 font-mono break-all">{latestRun.error}</p>
        </div>
      )}

      {failedSends.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm font-semibold text-red-800 flex items-center gap-2">
            <AlertCircle className="size-4" /> WhatsApp delivery failures
          </p>
          <div className="mt-1.5 space-y-1">
            {failedSends.map((f) => (
              <p key={f.id} className="text-xs text-red-700">
                <span className="font-medium">{f.leads?.name || f.to_address}</span> ·{" "}
                {formatDistanceToNow(new Date(f.created_at), { addSuffix: true })} —{" "}
                <span className="font-mono">{f.error_message || "unknown error"}</span>
              </p>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-5">
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {setupLinks.map((item) => (
          <Link key={item.href} href={item.href} className="group">
            <Card className="h-full transition-colors group-hover:border-gray-400">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <item.icon className="size-4" /> {item.title}
                </CardTitle>
                <CardDescription className="text-xs">{item.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      {runs.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="size-4" /> Recent bot activity
            </CardTitle>
            <CardDescription className="text-xs">
              Every reply attempt, newest first. An <span className="text-red-600 font-medium">error</span>{" "}
              row shows the exact reason a message didn&apos;t go out.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="divide-y">
              {runs.map((r) => (
                <div key={r.id} className="py-2 flex items-start gap-3">
                  <span
                    className={`shrink-0 mt-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded ${outcomeBadge(r.outcome)}`}
                  >
                    {r.outcome || "—"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-gray-700">
                      <span className="font-medium">{r.leads?.name || "Unknown lead"}</span>
                      <span className="text-muted-foreground">
                        {" "}· {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })} ·{" "}
                        {r.model} · {r.latency_ms != null ? `${(r.latency_ms / 1000).toFixed(1)}s` : "—"}
                      </span>
                    </p>
                    {r.error && (
                      <p className="text-[11px] text-red-700 font-mono break-all mt-0.5">{r.error}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <MessageCircle className="size-4" /> Where you&apos;ll see it work
          </CardTitle>
          <CardDescription className="text-xs">
            Bot messages appear in <Link href="/inbox" className="text-primary hover:underline">Live Chat</Link>{" "}
            with an <Badge variant="secondary" className="text-[10px] px-1 py-0 align-middle">AI</Badge> tag.
            Open any conversation to take over from the bot or hand it back. In shadow mode its
            suggested reply appears above the composer — send, edit, or discard it.
          </CardDescription>
        </CardHeader>
        {data.runs30d > 0 && (
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">
              Last 30 days: {data.runs30d} runs · {Math.round((data.tokens30d.input + data.tokens30d.output) / 1000)}k
              tokens ({Math.round(data.tokens30d.cacheRead / 1000)}k served from cache)
              {data.tokens30d.errors > 0 ? ` · ${data.tokens30d.errors} errors` : ""}
            </p>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
