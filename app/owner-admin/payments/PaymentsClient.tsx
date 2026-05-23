"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { 
  TrendingUp, 
  Users, 
  Receipt, 
  Coins, 
  Clock, 
  CheckCircle2, 
  XCircle,
  CalendarCheck
} from "lucide-react";

const COLORS = ["#10b981", "#3b82f6", "#a855f7", "#f59e0b"];

interface PaymentsClientProps {
  metrics: {
    totalRevenue: number;
    activeMrr: number;
    totalTransactions: number;
    recentInvoices: Array<{
      id: string;
      invoice_number: string;
      amount_inr: number;
      status: string;
      paid_at: string | null;
      companies: {
        name: string;
      } | null;
    }>;
    planDistribution: Array<{
      name: string;
      value: number;
    }>;
    monthlyRevenue: Array<{
      month: string;
      revenue: number;
    }>;
  };
}

export function PaymentsClient({ metrics }: PaymentsClientProps) {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="space-y-6 text-zinc-150">
      {/* 4 Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            title: "Total Revenue",
            value: formatCurrency(metrics.totalRevenue),
            desc: "Cumulative paid platform invoices",
            icon: Coins,
            color: "text-emerald-500 bg-emerald-500/10"
          },
          {
            title: "Active MRR",
            value: formatCurrency(metrics.activeMrr),
            desc: "Monthly recurring subscription volume",
            icon: TrendingUp,
            color: "text-indigo-500 bg-indigo-500/10"
          },
          {
            title: "Total ARR",
            value: formatCurrency(metrics.activeMrr * 12),
            desc: "Annualized subscription revenue run-rate",
            icon: CalendarCheck,
            color: "text-purple-500 bg-purple-500/10"
          },
          {
            title: "Total Transactions",
            value: metrics.totalTransactions,
            desc: "Payment records and logs generated",
            icon: Receipt,
            color: "text-amber-500 bg-amber-500/10"
          }
        ].map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <Card key={idx} className="bg-zinc-900 border-zinc-800 text-white shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-xl shrink-0 ${stat.color}`}>
                  <Icon className="size-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black">{stat.value}</div>
                <p className="text-[10px] text-zinc-500 mt-1">{stat.desc}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recharts Area Chart Row */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Monthly Revenue Trend Line */}
        <Card className="md:col-span-2 bg-zinc-900 border-zinc-800 text-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold">Monthly Revenue Collections</CardTitle>
            <CardDescription className="text-xs text-zinc-500">
              Platform billing volumes aggregated over time in ₹ INR.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.monthlyRevenue} margin={{ left: -10, right: 10, top: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="month" 
                  stroke="#52525b" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <YAxis 
                  stroke="#52525b" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(v) => `₹${v}`} 
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", color: "#f4f4f5" }}
                  formatter={(value: any) => [formatCurrency(value), "Revenue"]}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#8b5cf6" 
                  strokeWidth={2} 
                  fillOpacity={1} 
                  fill="url(#colorRevenue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Plan Distribution of Active Subscriptions */}
        <Card className="bg-zinc-900 border-zinc-800 text-white shadow-sm flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-base font-bold">Plan Distribution</CardTitle>
            <CardDescription className="text-xs text-zinc-500">
              Active subscriptions by tier count.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center pb-6">
            {metrics.planDistribution.length === 0 ? (
              <div className="text-center py-10 space-y-2">
                <Users className="size-8 text-zinc-700 mx-auto" />
                <p className="text-xs text-zinc-500">No active plans subscribed.</p>
              </div>
            ) : (
              <>
                <div className="h-40 w-full relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={metrics.planDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {metrics.planDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full space-y-1.5 mt-2 max-w-[180px]">
                  {metrics.planDistribution.map((plan, idx) => (
                    <div key={plan.name} className="flex justify-between items-center text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span className="size-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                        <span className="font-semibold text-zinc-300">{plan.name}</span>
                      </div>
                      <span className="font-black text-white">{plan.value} subs</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent transactions log */}
      <Card className="bg-zinc-900 border-zinc-800 text-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-bold">Recent Receipts & Transactions</CardTitle>
          <CardDescription className="text-xs text-zinc-500">
            Realtime payments log collected globally from clients.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {metrics.recentInvoices.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-2">
              <Receipt className="size-8 text-zinc-800 mx-auto" />
              <p className="text-xs text-zinc-500">No payment transaction records generated yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-zinc-950 border-b border-zinc-800 text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="p-4">Billing Date</th>
                    <th className="p-4">Invoice #</th>
                    <th className="p-4">Client/Company</th>
                    <th className="p-4">Amount Collected</th>
                    <th className="p-4">Gateway Status</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.recentInvoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-zinc-800/60 hover:bg-zinc-850/40">
                      <td className="p-4 text-zinc-400">
                        {inv.paid_at 
                          ? new Date(inv.paid_at).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            })
                          : "—"}
                      </td>
                      <td className="p-4 font-mono font-bold text-white">{inv.invoice_number}</td>
                      <td className="p-4 text-zinc-300 font-medium">
                        {inv.companies?.name || "Anonymous Workspace"}
                      </td>
                      <td className="p-4 font-bold text-white">{formatCurrency(inv.amount_inr)}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide ${
                          inv.status === "PAID"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        }`}>
                          {inv.status === "PAID" ? (
                            <CheckCircle2 className="size-3 text-emerald-400" />
                          ) : (
                            <XCircle className="size-3 text-amber-400" />
                          )}
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
