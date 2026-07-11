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
  Sparkles,
  Target,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { getDashboardData } from "./actions";
import { format } from "date-fns";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Dashboard | Big Lead CRM",
};

export default async function DashboardPage() {
  let data;
  try {
    data = await getDashboardData();
  } catch (err) {
    redirect("/select-plan");
  }

  const stats = [
    {
      title: "Total Leads",
      value: data.totalLeads.toString(),
      icon: Users,
      href: "/leads",
      color: "text-blue-600 bg-blue-50",
      sub: `+${data.newLeadsThisWeek} this week`,
    },
    {
      title: "Leads Won",
      value: data.leadsWon.toString(),
      icon: Trophy,
      href: "/leads",
      color: "text-green-600 bg-green-50",
      sub: `${data.conversionRate}% conversion`,
    },
    {
      title: "Tasks Due Today",
      value: data.tasksDueToday.toString(),
      icon: CalendarCheck,
      href: "/tasks",
      color: "text-violet-600 bg-violet-50",
      sub: "Pending follow-ups",
    },
    {
      title: "Overdue Tasks",
      value: data.overdueTasks.toString(),
      icon: AlertTriangle,
      href: "/tasks",
      color: data.overdueTasks > 0 ? "text-red-600 bg-red-50" : "text-emerald-600 bg-emerald-50",
      sub: data.overdueTasks > 0 ? "Needs attention!" : "All clear ✓",
    },
  ];

  const secondaryStats = [
    {
      title: "Active Projects",
      value: data.totalProjects.toString(),
      icon: Building2,
      href: "/projects",
    },
    {
      title: "Team Members",
      value: data.totalUsers.toString(),
      icon: UserCheck,
      href: "/settings/team",
    },
    {
      title: "Conversion Rate",
      value: `${data.conversionRate}%`,
      icon: Target,
      href: "/reports",
    },
    {
      title: "New This Week",
      value: data.newLeadsThisWeek.toString(),
      icon: TrendingUp,
      href: "/leads",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back, {data.userName.split(" ")[0]} 👋
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s what&apos;s happening with your leads today.
        </p>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.title} href={stat.href}>
              <Card className="border-gray-200 shadow-none hover:shadow-md hover:border-gray-300 transition-all cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <div className={`rounded-md p-2 ${stat.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">{stat.sub}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Secondary Stats Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {secondaryStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.title} href={stat.href}>
              <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-white hover:bg-muted/50 transition-colors">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-lg font-bold leading-none">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{stat.title}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Pipeline Overview + Recent Leads */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Pipeline Distribution */}
        <Card className="lg:col-span-2 border-gray-200 shadow-none">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">
              Pipeline Distribution
            </CardTitle>
            <Link
              href="/leads/kanban"
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              View Board <ArrowRight className="h-3 w-3" />
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
              <div className="space-y-3">
                {data.pipelineData.map((stage) => {
                  const maxCount = Math.max(
                    ...data.pipelineData.map((s) => s.count),
                    1
                  );
                  const percentage = (stage.count / maxCount) * 100;

                  return (
                    <div key={stage.name} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: stage.color }}
                          />
                          <span className="font-medium">{stage.name}</span>
                        </div>
                        <span className="font-semibold">{stage.count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: stage.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Leads */}
        <Card className="border-gray-200 shadow-none">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">
              Recent Leads
            </CardTitle>
            <Link
              href="/leads"
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              View All <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
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
              <div className="space-y-3">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {data.recentLeads.map((lead: any) => (
                  <Link
                    key={lead.id}
                    href={`/leads/${lead.id}`}
                    prefetch={false}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                      {lead.name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {lead.name}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {lead.phone && (
                          <span className="flex items-center gap-0.5">
                            <Phone className="h-3 w-3" />
                            {lead.phone}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {lead.pipeline_stages && (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5"
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

      {/* Quick Actions */}
      <Card className="border-gray-200 shadow-none">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/leads/new"
              className={buttonVariants({ variant: "outline" })}
            >
              + Add Lead
            </Link>
            <Link
              href="/tasks"
              className={buttonVariants({ variant: "outline" })}
            >
              📋 My Tasks
            </Link>
            <Link
              href="/leads/kanban"
              className={buttonVariants({ variant: "outline" })}
            >
              🔄 Pipeline Board
            </Link>
            <Link
              href="/reports"
              className={buttonVariants({ variant: "outline" })}
            >
              📊 Reports
            </Link>
            <Link
              href="/settings/team"
              className={buttonVariants({ variant: "outline" })}
            >
              👥 Manage Team
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
