"use server";

import { createClient } from "@/lib/supabase/server";

async function getUserProfile() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("id, company_id, role, name")
    .eq("auth_user_id", user.id)
    .single();

  return profile;
}

export async function getDashboardData() {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) throw new Error("Unauthorized");

  const companyId = profile.company_id;

  // ── Total Active Leads ──────────────────────
  const { count: totalLeads } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId)
    .is("deleted_at", null);

  // ── Leads Won ───────────────────────────────
  const { count: leadsWon } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("status", "CLOSED_WON")
    .is("deleted_at", null);

  // ── Total Projects ──────────────────────────
  const { count: totalProjects } = await supabase
    .from("projects")
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("status", "ACTIVE");

  // ── Total Team Members ──────────────────────
  const { count: totalUsers } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("status", "ACTIVE");

  // ── Pipeline Stages with lead counts ────────
  const { data: stages } = await supabase
    .from("pipeline_stages")
    .select("id, name, color, stage_order")
    .eq("company_id", companyId)
    .order("stage_order", { ascending: true });

  const pipelineData = [];
  if (stages) {
    for (const stage of stages) {
      const { count } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("stage_id", stage.id)
        .is("deleted_at", null);

      pipelineData.push({
        name: stage.name,
        color: stage.color,
        count: count || 0,
      });
    }
  }

  // ── Recent Leads (last 5) ───────────────────
  const { data: recentLeads } = await supabase
    .from("leads")
    .select(
      `
      id, name, phone, source, created_at,
      pipeline_stages ( name, color ),
      projects ( name )
    `
    )
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(5);

  // ── Overdue Tasks ──────────────────────────
  const { count: overdueTasks } = await supabase
    .from("tasks")
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("status", "PENDING")
    .lt("due_at", new Date().toISOString());

  // ── Tasks Due Today ────────────────────────
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const { count: tasksDueToday } = await supabase
    .from("tasks")
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("status", "PENDING")
    .gte("due_at", todayStart.toISOString())
    .lte("due_at", todayEnd.toISOString());

  // ── New Leads This Week ────────────────────
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const { count: newLeadsThisWeek } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .gte("created_at", weekAgo.toISOString());

  // ── Conversion Rate ────────────────────────
  const conversionRate = (totalLeads || 0) > 0
    ? Math.round(((leadsWon || 0) / (totalLeads || 1)) * 100)
    : 0;

  return {
    userName: profile.name || "User",
    totalLeads: totalLeads || 0,
    leadsWon: leadsWon || 0,
    totalProjects: totalProjects || 0,
    totalUsers: totalUsers || 0,
    pipelineData,
    recentLeads: recentLeads || [],
    overdueTasks: overdueTasks || 0,
    tasksDueToday: tasksDueToday || 0,
    newLeadsThisWeek: newLeadsThisWeek || 0,
    conversionRate,
  };
}
