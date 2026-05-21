import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, TrendingUp, CreditCard } from "lucide-react";
import { getOwnerDashboardData } from "./actions";
import { PlanDistributionChart } from "./DashboardCharts";

export const metadata = {
  title: "Owner Dashboard | BigLead",
};

export default async function OwnerDashboardPage() {
  const data = await getOwnerDashboardData();

  const metrics = [
    {
      title: "Total Companies",
      value: data.totalCompanies.toString(),
      icon: Building2,
      color: "text-blue-400 bg-blue-500/10 border border-blue-500/20",
      sub: `${data.activeCompanies} Active, ${data.trialCompanies} Trial`,
    },
    {
      title: "Platform Users",
      value: data.totalUsers.toString(),
      icon: Users,
      color: "text-indigo-400 bg-indigo-500/10 border border-indigo-500/20",
      sub: "Across all companies",
    },
    {
      title: "New Sign-ups (30d)",
      value: data.newSignups.toString(),
      icon: TrendingUp,
      color: "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20",
      sub: "Last 30 days",
    },
    {
      title: "Active Subscriptions",
      value: data.activeSubscriptions.toString(),
      icon: CreditCard,
      color: "text-violet-400 bg-violet-500/10 border border-violet-500/20",
      sub: "Paying customers",
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Platform Overview</h1>
        <p className="text-zinc-400 mt-2">
          Monitor all companies, users, and health metrics across BigLead.
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((m) => (
          <Card key={m.title} className="bg-zinc-900 border-zinc-800 text-zinc-100 hover:border-zinc-700 transition-colors shadow-none">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">{m.title}</CardTitle>
              <div className={`p-2 rounded-xl ${m.color}`}>
                <m.icon className="w-5 h-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-white tracking-tight">{m.value}</div>
              <p className="text-xs text-zinc-500 mt-2 font-medium">{m.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Plan Distribution */}
        <Card className="bg-zinc-900 border-zinc-800 text-zinc-100 lg:col-span-1 shadow-none">
          <CardHeader>
            <CardTitle className="text-lg text-white font-semibold">Plan Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <PlanDistributionChart planData={data.planDistribution} />
          </CardContent>
        </Card>

        {/* Recent Companies */}
        <Card className="bg-zinc-900 border-zinc-800 text-zinc-100 lg:col-span-2 shadow-none">
          <CardHeader>
            <CardTitle className="text-lg text-white font-semibold">Recent Companies</CardTitle>
          </CardHeader>
          <CardContent>
            {(!data.recentCompanies || data.recentCompanies.length === 0) ? (
              <div className="h-32 flex items-center justify-center text-zinc-500">
                No companies registered yet.
              </div>
            ) : (
              <div className="space-y-3">
                {data.recentCompanies.map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/80 hover:border-zinc-700 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/10 flex items-center justify-center text-indigo-400 font-bold uppercase text-lg shadow-inner">
                        {c.name.substring(0, 2)}
                      </div>
                      <div>
                        <p className="text-base font-semibold text-zinc-200">{c.name}</p>
                        <p className="text-sm text-zinc-500 mt-0.5">Joined {new Date(c.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs uppercase font-bold px-3 py-1.5 rounded-full ${
                        c.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        c.status === 'TRIAL' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                        'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
                      }`}>
                        {c.status}
                      </span>
                      <span className="text-xs uppercase font-bold px-3 py-1.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        {c.plan || 'STARTER'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
