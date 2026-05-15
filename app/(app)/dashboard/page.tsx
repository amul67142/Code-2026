import { CheckSquare, Users, TrendingUp, Clock, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Dashboard page — placeholder with skeleton KPI cards.
 * Full implementation in Phase 18.
 */
export default function DashboardPage() {
  const stats = [
    {
      title: "Total Leads",
      value: "0",
      change: "+0%",
      trend: "up" as const,
      icon: Users,
    },
    {
      title: "Active Tasks",
      value: "0",
      change: "+0%",
      trend: "up" as const,
      icon: CheckSquare,
    },
    {
      title: "Conversion Rate",
      value: "0%",
      change: "+0%",
      trend: "up" as const,
      icon: TrendingUp,
    },
    {
      title: "Avg. Response Time",
      value: "—",
      change: "0%",
      trend: "neutral" as const,
      icon: Clock,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Welcome to RealLeads CRM
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="border-gray-200 shadow-none">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                {stat.title}
              </CardTitle>
              <stat.icon className="size-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-gray-900">
                {stat.value}
              </div>
              <div className="flex items-center gap-1 mt-1">
                {stat.trend === "up" ? (
                  <ArrowUpRight className="size-3 text-green-600" />
                ) : stat.trend === "neutral" ? null : (
                  <ArrowDownRight className="size-3 text-red-600" />
                )}
                <span
                  className={`text-xs ${
                    stat.trend === "up"
                      ? "text-green-600"
                      : stat.trend === "neutral"
                        ? "text-gray-400"
                        : "text-red-600"
                  }`}
                >
                  {stat.change} from last month
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Placeholder content areas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 border-gray-200 shadow-none">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-700">
              Pipeline Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[240px] flex items-center justify-center text-sm text-gray-400">
              Pipeline chart will render here after database setup
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-200 shadow-none">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-700">
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[240px] flex items-center justify-center text-sm text-gray-400">
              Activity feed will render here
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
