import {
  Users,
  Building2,
  Trophy,
  UserCheck,
  Phone,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  CalendarCheck,
  Target,
  Plus,
  KanbanSquare,
  BarChart3,
  MessageCircle,
  ClipboardList,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { getDashboardData } from "./actions";
import { format } from "date-fns";
import { redirect } from "next/navigation";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Dashboard | Big Lead CRM",
};

export default async function DashboardPage() {
  let data;
  try {
    data = await getDashboardData();
  } catch {
    redirect("/select-plan");
  }

  const totalPipeline = data.pipelineData.reduce(
    (sum: number, s: { count: number }) => sum + s.count,
    0
  );

  const kpis = [
    {
      title: "Total Leads",
      value: data.totalLeads,
      icon: Users,
      href: "/leads",
      iconCls: "text-blue-600 bg-blue-50 border-blue-100",
      sub: `+${data.newLeadsThisWeek} this week`,
      subCls: data.newLeadsThisWeek > 0 ? "text-emerald-600" : "text-muted-foreground",
    },
    {
      title: "Leads Won",
      value: data.leadsWon,
      icon: Trophy,
      href: "/leads",
      iconCls: "text-emerald-600 bg-emerald-50 border-emerald-100",
      sub: `${data.conversionRate}% conversion`,
      subCls: "text-muted-foreground",
    },
    {
      title: "Tasks Due Today",
      value: data.tasksDueToday,
      icon: CalendarCheck,
      href: "/tasks",
      iconCls: "text-violet-600 bg-violet-50 border-violet-100",
      sub: data.tasksDueToday > 0 ? "Pending follow-ups" : "Nothing due",
      subCls: "text-muted-foreground",
    },
    {
      title: "Overdue Tasks",
      value: data.overdueTasks,
      icon: AlertTriangle,
      href: "/tasks",
      iconCls:
        data.overdueTasks > 0
          ? "text-red-600 bg-red-50 border-red-100"
          : "text-emerald-600 bg-emerald-50 border-emerald-100",
      sub: data.overdueTasks > 0 ? "Needs attention" : "All clear ✓",
      subCls: data.overdueTasks > 0 ? "text-red-600 font-medium" : "text-emerald-600",
    },
  ];

  const secondaryStats = [
    { title: "Active Projects", value: data.totalProjects, icon: Building2, href: "/projects" },
    { title: "Team Members", value: data.totalUsers, icon: UserCheck, href: "/settings/team" },
    { title: "Conversion Rate", value: `${data.conversionRate}%`, icon: Target, href: "/reports" },
    { title: "New This Week", value: data.newLeadsThisWeek, icon: TrendingUp, href: "/leads" },
  ];

  const quickActions = [
    { title: "My Tasks", href: "/tasks", icon: ClipboardList },
    { title: "Live Chat", href: "/inbox", icon: MessageCircle },
    { title: "Pipeline Board", href: "/leads/kanban", icon: KanbanSquare },
    { title: "Reports", href: "/reports", icon: BarChart3 },
  ];

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* ── Header: greeting + primary actions ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {format(new Date(), "EEEE, d MMMM yyyy")}
          </p>
          <h1 className="text-2xl font-bold tracking-tight mt-1">
            Welcome back, {data.userName.split(" ")[0]} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Here&apos;s what&apos;s happening with your leads today.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {quickActions.map((a) => (
            <Link
              key={a.title}
              href={a.href}
              title={a.title}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "h-9 px-3 hidden md:inline-flex"
              )}
            >
              <a.icon className="size-4 mr-1.5 text-muted-foreground" />
              {a.title}
            </Link>
          ))}
          <Link href="/leads/new" className={cn(buttonVariants({ size: "sm" }), "h-9 px-4")}>
            <Plus className="size-4 mr-1.5" /> Add Lead
          </Link>
        </div>
      </div>

      {/* ── Primary KPIs ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <Link key={k.title} href={k.href} prefetch={false}>
            <Card className="border-gray-200 shadow-none hover:shadow-md hover:border-gray-300 hover:-translate-y-0.5 transition-all cursor-pointer h-full">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-muted-foreground">{k.title}</span>
                  <div className={cn("rounded-lg p-2 border", k.iconCls)}>
                    <k.icon className="size-4" />
                  </div>
                </div>
                <div className="mt-3 text-3xl font-bold tracking-tight tabular-nums">{k.value}</div>
                <p className={cn("text-xs mt-1.5", k.subCls)}>{k.sub}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* ── Secondary stats: one unified strip ── */}
      <div className="rounded-xl border border-gray-200 bg-white grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-gray-100 overflow-hidden">
        {secondaryStats.map((s) => (
          <Link
            key={s.title}
            href={s.href}
            prefetch={false}
            className="flex items-center gap-3 px-5 py-4 hover:bg-muted/40 transition-colors"
          >
            <div className="rounded-md bg-gray-50 border border-gray-100 p-2">
              <s.icon className="size-4 text-gray-500" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold leading-none tabular-nums">{s.value}</p>
              <p className="text-[11px] text-muted-foreground mt-1 truncate">{s.title}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* ── Pipeline + Recent leads ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Pipeline Distribution */}
        <Card className="lg:col-span-2 border-gray-200 shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-base font-semibold">Pipeline Distribution</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {totalPipeline} lead{totalPipeline === 1 ? "" : "s"} across {data.pipelineData.length} stages
              </p>
            </div>
            <Link
              href="/leads/kanban"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 text-xs")}
            >
              View Board <ArrowRight className="size-3 ml-1" />
            </Link>
          </CardHeader>
          <CardContent>
            {data.pipelineData.length === 0 ? (
              <div className="h-[200px] flex flex-col items-center justify-center text-sm text-muted-foreground">
                <p>No pipeline stages configured yet.</p>
                <Link
                  href="/settings/pipeline"
                  className={buttonVariants({ variant: "outline", size: "sm" }) + " mt-2"}
                >
                  Setup Pipeline
                </Link>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Composition bar — the whole funnel at a glance */}
                {totalPipeline > 0 && (
                  <div className="flex h-3 w-full rounded-full overflow-hidden bg-muted">
                    {data.pipelineData
                      .filter((s: { count: number }) => s.count > 0)
                      .map((s: { name: string; count: number; color: string }) => (
                        <div
                          key={s.name}
                          title={`${s.name}: ${s.count}`}
                          style={{
                            width: `${(s.count / totalPipeline) * 100}%`,
                            backgroundColor: s.color,
                          }}
                          className="transition-all duration-500 first:rounded-l-full last:rounded-r-full"
                        />
                      ))}
                  </div>
                )}

                {/* Stage rows */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                  {data.pipelineData.map(
                    (stage: { name: string; count: number; color: string }) => {
                      const pct =
                        totalPipeline > 0 ? Math.round((stage.count / totalPipeline) * 100) : 0;
                      return (
                        <div key={stage.name} className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="size-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: stage.color }}
                          />
                          <span className="text-sm truncate flex-1">{stage.name}</span>
                          <span className="text-xs text-muted-foreground tabular-nums w-9 text-right">
                            {pct}%
                          </span>
                          <span className="text-sm font-semibold tabular-nums w-6 text-right">
                            {stage.count}
                          </span>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Leads */}
        <Card className="border-gray-200 shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-base font-semibold">Recent Leads</CardTitle>
            <Link
              href="/leads"
              className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
            >
              View All <ArrowRight className="size-3" />
            </Link>
          </CardHeader>
          <CardContent className="px-3">
            {data.recentLeads.length === 0 ? (
              <div className="h-[200px] flex flex-col items-center justify-center text-sm text-muted-foreground">
                <p>No leads yet.</p>
                <Link
                  href="/leads/new"
                  className={buttonVariants({ variant: "outline", size: "sm" }) + " mt-2"}
                >
                  Add First Lead
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {data.recentLeads.map((lead: any) => (
                  <Link
                    key={lead.id}
                    href={`/leads/${lead.id}`}
                    prefetch={false}
                    className="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div
                      className="size-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ backgroundColor: lead.pipeline_stages?.color || "#94a3b8" }}
                    >
                      {lead.name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{lead.name}</p>
                      {lead.phone && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                          <Phone className="size-3 shrink-0" />
                          {lead.phone}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {lead.pipeline_stages && (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 max-w-[110px] truncate"
                          style={{
                            borderColor: lead.pipeline_stages.color,
                            color: lead.pipeline_stages.color,
                          }}
                        >
                          {lead.pipeline_stages.name}
                        </Badge>
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(lead.created_at), "MMM d")}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Mobile quick actions (header buttons are hidden on small screens) */}
      <div className="grid grid-cols-2 gap-2 md:hidden">
        {quickActions.map((a) => (
          <Link
            key={a.title}
            href={a.href}
            className={cn(buttonVariants({ variant: "outline" }), "justify-start h-11")}
          >
            <a.icon className="size-4 mr-2 text-muted-foreground" />
            {a.title}
          </Link>
        ))}
      </div>
    </div>
  );
}
