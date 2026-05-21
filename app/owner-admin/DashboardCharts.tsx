"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

export function PlanDistributionChart({ planData }: { planData: Record<string, number> }) {
  const data = Object.entries(planData).map(([name, value]) => ({ name: name.toUpperCase(), value }));
  const COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#14b8a6", "#f59e0b"];

  if (data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-zinc-500">
        No active plans yet.
      </div>
    );
  }

  return (
    <div className="h-[250px] w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <RechartsTooltip 
            contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
            itemStyle={{ color: '#e4e4e7' }}
          />
        </PieChart>
      </ResponsiveContainer>
      
      <div className="flex flex-wrap justify-center gap-4 mt-2">
        {data.map((entry, index) => (
          <div key={entry.name} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
            <span className="text-sm font-medium text-zinc-300">{entry.name}</span>
            <span className="text-sm font-bold text-white ml-1">{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
