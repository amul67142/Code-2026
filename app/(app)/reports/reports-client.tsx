"use client";

import { useState, useTransition } from "react";
import { getDashboardMetrics, getEmailAnalytics } from "./actions";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Mail, Send, CheckCircle2, Eye, MessageSquare, AlertCircle } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MetricsData = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EmailData = any;

interface ReportsClientProps {
  initialData: MetricsData;
  initialEmail: EmailData;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e'];

export default function ReportsClient({ initialData, initialEmail }: ReportsClientProps) {
  const [data, setData] = useState<MetricsData>(initialData);
  const [emailData, setEmailData] = useState<EmailData>(initialEmail);
  const [daysFilter, setDaysFilter] = useState("30");
  const [isPending, startTransition] = useTransition();

  function handleFilterChange(val: string | null) {
    if (!val) return;
    setDaysFilter(val);
    startTransition(async () => {
      try {
        const n = parseInt(val, 10);
        const [newData, newEmail] = await Promise.all([
          getDashboardMetrics(n),
          getEmailAnalytics(n),
        ]);
        setData(newData);
        setEmailData(newEmail);
      } catch (err) {
        console.error(err);
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports & Analytics</h1>
          <p className="text-muted-foreground">
            Visualize your lead volume, pipeline health, and agent performance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          <Select value={daysFilter} onValueChange={handleFilterChange} disabled={isPending}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="90">Last 90 Days</SelectItem>
              <SelectItem value="365">Last 1 Year</SelectItem>
              <SelectItem value="0">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalLeads}</div>
            <p className="text-xs text-muted-foreground">
              {daysFilter === "0" ? "All time" : `In the last ${daysFilter} days`}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="sources">Sources</TabsTrigger>
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Lead Creation Trend</CardTitle>
              <CardDescription>Number of new leads created over time.</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              {data.trendMetrics.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground">No data available</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.trendMetrics}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" name="Leads" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pipeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pipeline Distribution</CardTitle>
              <CardDescription>Leads currently sitting in each stage.</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              {data.pipelineMetrics.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground">No data available</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.pipelineMetrics} layout="vertical" margin={{ left: 50 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis dataKey="name" type="category" width={120} />
                    <Tooltip />
                    <Bar dataKey="count" name="Leads" radius={[0, 4, 4, 0]}>
                      {data.pipelineMetrics.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sources" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Lead Sources</CardTitle>
              <CardDescription>Where your leads are coming from.</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              {data.sourceMetrics.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground">No data available</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.sourceMetrics}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                      outerRadius={130}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {data.sourceMetrics.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Agent Workload</CardTitle>
              <CardDescription>Number of leads assigned to each agent.</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              {data.agentMetrics.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground">No data available</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.agentMetrics}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" name="Assigned Leads" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email" className="space-y-4">
          {/* KPI cards */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
            {[
              { label: "Sent", value: emailData?.sent ?? 0, sub: `${emailData?.failed ?? 0} failed`, icon: Send, color: "text-blue-600" },
              { label: "Delivered", value: emailData?.delivered ?? 0, sub: `${emailData?.deliveryRate ?? 0}% of sent`, icon: CheckCircle2, color: "text-emerald-600" },
              { label: "Opened", value: emailData?.opened ?? 0, sub: `${emailData?.openRate ?? 0}% open rate`, icon: Eye, color: "text-emerald-600" },
              { label: "Replied", value: emailData?.replied ?? 0, sub: `${emailData?.replyRate ?? 0}% reply rate`, icon: MessageSquare, color: "text-violet-600" },
              { label: "Failed", value: emailData?.failed ?? 0, sub: "delivery issues", icon: AlertCircle, color: "text-red-600" },
            ].map((kpi) => (
              <Card key={kpi.label}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{kpi.label}</CardTitle>
                  <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{kpi.value}</div>
                  <p className="text-xs text-muted-foreground">{kpi.sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-4 w-4" /> Emails Sent Over Time
              </CardTitle>
              <CardDescription>
                Automated welcome emails sent to leads.{" "}
                <span className="text-xs">
                  (Open & reply tracking require the Resend webhook — see docs.)
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[360px]">
              {!emailData?.trend || emailData.trend.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No emails sent yet in this period.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={emailData.trend}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" name="Emails" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
