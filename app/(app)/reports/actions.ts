"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getMyProfile } from "@/app/(app)/settings/profile/actions";
import { format, subDays, isAfter } from "date-fns";

export async function getDashboardMetrics(days: number = 30) {
  const supabase = await createClient();
  const profileRes = await getMyProfile();
  if (!profileRes || !profileRes.profile) return redirect("/login");
  const profile = profileRes.profile;

  // Calculate the cutoff date
  const cutoffDate = subDays(new Date(), days);

  // Fetch leads
  // Since we might have more than 1000 leads, we should technically paginate,
  // but for the sake of simplicity in this phase, we fetch up to 10000.
  const { data: leads, error: leadsError } = await supabase
    .from("leads")
    .select(`
      id,
      source,
      created_at,
      stage:pipeline_stages(id, name, color),
      assigned_user:users!leads_assigned_to_id_fkey(id, name)
    `)
    .eq("company_id", profile.company_id)
    .limit(10000);

  if (leadsError) {
    console.error("Error fetching leads for reports:", leadsError);
    throw new Error("Failed to fetch report data");
  }

  // Filter leads within the date range (if needed, though usually you query it. 
  // We'll query all and filter in memory so we can also show "All Time" easily)
  const filteredLeads = leads?.filter(lead => 
    days === 0 ? true : isAfter(new Date(lead.created_at), cutoffDate)
  ) || [];

  // 1. Trend Metrics (Leads created per day)
  const trendsMap: Record<string, number> = {};
  filteredLeads.forEach(lead => {
    const dateStr = format(new Date(lead.created_at), "MMM dd");
    trendsMap[dateStr] = (trendsMap[dateStr] || 0) + 1;
  });
  // Sort by date could be tricky with just "MMM dd", but let's trust the insertion order or sort the original array.
  const sortedLeadsForTrend = [...filteredLeads].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const orderedTrendsMap: Record<string, number> = {};
  sortedLeadsForTrend.forEach(lead => {
    const dateStr = format(new Date(lead.created_at), "MMM dd");
    orderedTrendsMap[dateStr] = (orderedTrendsMap[dateStr] || 0) + 1;
  });
  const trendMetrics = Object.entries(orderedTrendsMap).map(([date, count]) => ({
    date,
    count
  }));

  // 2. Pipeline Metrics (Leads by Stage)
  const pipelineMap: Record<string, { count: number; color: string }> = {};
  filteredLeads.forEach(lead => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stage = lead.stage as any;
    if (stage) {
      const name = stage.name;
      if (!pipelineMap[name]) {
        pipelineMap[name] = { count: 0, color: stage.color || "#3b82f6" };
      }
      pipelineMap[name].count += 1;
    } else {
      if (!pipelineMap["Unassigned Stage"]) pipelineMap["Unassigned Stage"] = { count: 0, color: "#cbd5e1" };
      pipelineMap["Unassigned Stage"].count += 1;
    }
  });
  const pipelineMetrics = Object.entries(pipelineMap).map(([name, data]) => ({
    name,
    count: data.count,
    fill: data.color
  })).sort((a, b) => b.count - a.count);

  // 3. Source Metrics
  const sourceMap: Record<string, number> = {};
  filteredLeads.forEach(lead => {
    const source = (lead.source || "UNKNOWN").replace(/_/g, " ");
    sourceMap[source] = (sourceMap[source] || 0) + 1;
  });
  const sourceMetrics = Object.entries(sourceMap).map(([name, value]) => ({
    name,
    value
  })).sort((a, b) => b.value - a.value);

  // 4. Agent Metrics
  const agentMap: Record<string, number> = {};
  filteredLeads.forEach(lead => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const agent = lead.assigned_user as any;
    const name = agent ? agent.name : "Unassigned";
    agentMap[name] = (agentMap[name] || 0) + 1;
  });
  const agentMetrics = Object.entries(agentMap).map(([name, count]) => ({
    name,
    count
  })).sort((a, b) => b.count - a.count);

  return {
    totalLeads: filteredLeads.length,
    trendMetrics,
    pipelineMetrics,
    sourceMetrics,
    agentMetrics
  };
}

// ── Email Analytics (message_log, channel = EMAIL) ──────────────
export async function getEmailAnalytics(days: number = 30) {
  const supabase = await createClient();
  const profileRes = await getMyProfile();
  if (!profileRes || !profileRes.profile) return redirect("/login");
  const profile = profileRes.profile;

  const cutoffDate = subDays(new Date(), days);

  const { data: messages, error } = await supabase
    .from("message_log")
    .select("status, is_auto, created_at")
    .eq("company_id", profile.company_id)
    .eq("channel", "EMAIL")
    .limit(10000);

  if (error) {
    console.error("getEmailAnalytics error:", error);
    // Table may not exist yet (migration not run) — return zeros gracefully
    return emptyEmailAnalytics();
  }

  const filtered = (messages || []).filter((m) =>
    days === 0 ? true : isAfter(new Date(m.created_at), cutoffDate)
  );

  const has = (statuses: string[]) =>
    filtered.filter((m) => statuses.includes(m.status)).length;

  const total = filtered.length;
  const sent = has(["SENT", "DELIVERED", "OPENED", "REPLIED"]); // successfully sent
  const delivered = has(["DELIVERED", "OPENED", "REPLIED"]);
  const opened = has(["OPENED", "REPLIED"]);
  const replied = has(["REPLIED"]);
  const failed = has(["FAILED", "BOUNCED"]);

  const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);

  // Daily trend of emails sent
  const trendMap: Record<string, number> = {};
  [...filtered]
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .forEach((m) => {
      const d = format(new Date(m.created_at), "MMM dd");
      trendMap[d] = (trendMap[d] || 0) + 1;
    });
  const trend = Object.entries(trendMap).map(([date, count]) => ({ date, count }));

  return {
    total,
    sent,
    delivered,
    opened,
    replied,
    failed,
    deliveryRate: pct(delivered, sent),
    openRate: pct(opened, sent),
    replyRate: pct(replied, sent),
    trend,
  };
}

function emptyEmailAnalytics() {
  return {
    total: 0, sent: 0, delivered: 0, opened: 0, replied: 0, failed: 0,
    deliveryRate: 0, openRate: 0, replyRate: 0, trend: [] as { date: string; count: number }[],
  };
}
