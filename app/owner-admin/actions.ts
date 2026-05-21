"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function getOwnerDashboardData() {
  const supabase = createAdminClient();

  // Fetch Companies
  const { data: companies, error: companiesError } = await supabase
    .from("companies")
    .select("id, name, status, created_at, plan");
  
  if (companiesError) throw new Error("Failed to fetch companies");

  // Fetch Users
  const { data: users, error: usersError } = await supabase
    .from("users")
    .select("id, created_at, role, status")
    .is("deleted_at", null);
  
  if (usersError) throw new Error("Failed to fetch users");

  // Fetch Subscriptions
  const { data: subscriptions, error: subError } = await supabase
    .from("subscriptions")
    .select("id, status");
  
  if (subError) throw new Error("Failed to fetch subscriptions");

  // Compute Metrics
  const totalCompanies = companies?.length || 0;
  const activeCompanies = companies?.filter(c => c.status === "ACTIVE").length || 0;
  const trialCompanies = companies?.filter(c => c.status === "TRIAL").length || 0;
  
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const newSignups = companies?.filter(c => new Date(c.created_at) > thirtyDaysAgo).length || 0;

  const totalUsers = users?.length || 0;
  const activeSubscriptions = subscriptions?.filter(s => s.status === "ACTIVE").length || 0;

  // Plan Distribution
  const planDistribution = companies?.reduce((acc: Record<string, number>, curr) => {
    const plan = curr.plan || "UNKNOWN";
    acc[plan] = (acc[plan] || 0) + 1;
    return acc;
  }, {});

  return {
    totalCompanies,
    activeCompanies,
    trialCompanies,
    totalUsers,
    newSignups,
    activeSubscriptions,
    planDistribution,
    recentCompanies: companies?.slice(0, 5).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
  };
}


export async function deleteCompany(id: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("companies").delete().eq("id", id);
  if (error) throw new Error("Failed to delete company: " + error.message);
  revalidatePath("/owner-admin/companies");
  revalidatePath("/owner-admin");
}

export async function deleteUser(id: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("users").delete().eq("id", id);
  if (error) throw new Error("Failed to delete user: " + error.message);
  revalidatePath("/owner-admin/users");
  revalidatePath("/owner-admin");
}

// ── Pricing Plans ──

export async function getPricingPlans() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("pricing_plans")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw new Error("Failed to fetch pricing plans: " + error.message);
  return data;
}

export async function upsertPricingPlan(plan: {
  id?: string;
  name: string;
  description: string;
  price_inr: number;
  period: string | null;
  is_popular: boolean;
  is_custom_price: boolean;
  cta_text: string;
  sort_order: number;
  features: { text: string; included: boolean }[];
}) {
  const supabase = createAdminClient();
  const payload = {
    ...plan,
    updated_at: new Date().toISOString(),
  };

  if (plan.id) {
    const { error } = await supabase.from("pricing_plans").update(payload).eq("id", plan.id);
    if (error) throw new Error("Failed to update plan: " + error.message);
  } else {
    const { id, ...rest } = payload;
    const { error } = await supabase.from("pricing_plans").insert(rest);
    if (error) throw new Error("Failed to create plan: " + error.message);
  }
  revalidatePath("/owner-admin/pricing");
  revalidatePath("/");
}

export async function deletePricingPlan(id: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("pricing_plans").delete().eq("id", id);
  if (error) throw new Error("Failed to delete plan: " + error.message);
  revalidatePath("/owner-admin/pricing");
  revalidatePath("/");
}
