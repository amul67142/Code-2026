import { Building2, CreditCard, TrendingUp, IndianRupee } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ClientStatus, OwnerDashboardData } from "./actions";
import { StatusDistributionChart } from "./DashboardCharts";

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

const STATUS_BADGE: Record<ClientStatus, { label: string; cls: string }> = {
  PAYING: { label: "Paying", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  GRACE: { label: "Payment due", cls: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  TRIAL: { label: "Free trial", cls: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  LOCKED: { label: "Locked", cls: "bg-red-500/10 text-red-400 border-red-500/20" },
  PLATFORM: { label: "Your platform account", cls: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" },
};

export function OverviewView({ data }: { data: OwnerDashboardData }) {
  const breakdown = [
    data.payingClients && `${data.payingClients} paying`,
    data.trialClients && `${data.trialClients} on trial`,
    data.lockedClients && `${data.lockedClients} locked`,
  ].filter(Boolean);

  const metrics = [
    {
      title: "Client Companies",
      value: String(data.totalClients),
      icon: Building2,
      color: "text-blue-400 bg-blue-500/10 border border-blue-500/20",
      sub: breakdown.length ? breakdown.join(" · ") : "No clients yet",
    },
    {
      title: "Paying Customers",
      value: String(data.payingClients),
      icon: CreditCard,
      color: "text-violet-400 bg-violet-500/10 border border-violet-500/20",
      sub: data.graceClients ? `${data.graceClients} with a payment due` : data.payingClients ? "All paid up" : "None yet",
    },
    {
      title: "Monthly Revenue",
      value: inr(data.mrr),
      icon: IndianRupee,
      color: "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20",
      sub: "What paying customers pay each month",
    },
    {
      title: "New Sign-ups (30d)",
      value: String(data.newSignups),
      icon: TrendingUp,
      color: "text-sky-400 bg-sky-500/10 border border-sky-500/20",
      sub: `${data.clientUsers} users in client workspaces`,
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Platform Overview</h1>
        <p className="mt-2 text-zinc-400">Your clients, their billing and growth. Your own SpaceTrans account is not counted.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((m) => (
          <Card key={m.title} className="border-zinc-800 bg-zinc-900 text-zinc-100 shadow-none transition-colors hover:border-zinc-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">{m.title}</CardTitle>
              <div className={cn("rounded-xl p-2", m.color)}>
                <m.icon className="size-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight text-white">{m.value}</div>
              <p className="mt-2 text-xs font-medium text-zinc-500">{m.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="border-zinc-800 bg-zinc-900 text-zinc-100 shadow-none">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-white">Clients by status</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusDistributionChart data={data.statusDistribution} />
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900 text-zinc-100 shadow-none lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-white">Recent companies</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentCompanies.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-zinc-500">No companies registered yet.</div>
            ) : (
              <div className="space-y-3">
                {data.recentCompanies.map((c) => {
                  const badge = STATUS_BADGE[c.status];
                  return (
                    <div
                      key={c.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800/80 bg-zinc-950/80 p-4 transition-colors hover:border-zinc-700"
                    >
                      <div className="flex min-w-0 items-center gap-4">
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-indigo-500/10 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-base font-bold uppercase text-indigo-400">
                          {c.name.substring(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-base font-semibold text-zinc-200">{c.name}</p>
                          <p className="mt-0.5 text-sm text-zinc-500">
                            Joined {fmtDate(c.createdAt)}
                            {c.status === "TRIAL" && c.trialEndsAt ? ` · trial ends ${fmtDate(c.trialEndsAt)}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn("rounded-full border px-3 py-1 text-xs font-semibold", badge.cls)}>{badge.label}</span>
                        {!c.isPlatform && (
                          <span className="rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300">
                            {c.planName} · {inr(c.monthly)}/mo
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
