"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";

const COLORS: Record<string, string> = {
  Paying: "#10b981",
  "Grace period": "#f97316",
  "Free trial": "#f59e0b",
  Locked: "#ef4444",
};

export function StatusDistributionChart({ data }: { data: { name: string; value: number }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);

  if (total === 0) {
    return <div className="flex h-48 items-center justify-center text-sm text-zinc-500">No client companies yet.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="relative h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={58}
              outerRadius={80}
              paddingAngle={data.length > 1 ? 3 : 0}
              stroke="none"
              dataKey="value"
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={COLORS[entry.name] || "#6366f1"} />
              ))}
            </Pie>
            <RechartsTooltip
              contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "8px" }}
              itemStyle={{ color: "#e4e4e7" }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-white">{total}</span>
          <span className="text-xs text-zinc-500">{total === 1 ? "client" : "clients"}</span>
        </div>
      </div>

      <div className="space-y-2">
        {data.map((entry) => (
          <div key={entry.name} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-zinc-300">
              <span className="size-2.5 rounded-full" style={{ backgroundColor: COLORS[entry.name] || "#6366f1" }} />
              {entry.name}
            </span>
            <span className="font-semibold text-white">{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
