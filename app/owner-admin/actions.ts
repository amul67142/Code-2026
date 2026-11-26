"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { assertOwner } from "@/lib/owner/session";
import { getBillingState, type BillingPhase } from "@/lib/billing/state";
import { planMonthly } from "@/lib/billing/plans";

/** What a client's billing looks like right now, from the real billing state. */
export type ClientStatus = "TRIAL" | "PAYING" | "GRACE" | "LOCKED" | "PLATFORM";

export interface ClientBilling {
  id: string;
  name: string;
  createdAt: string;
  isPlatform: boolean;
  status: ClientStatus;
  planName: string;
  monthly: number;
  seats: number;
  trialEndsAt: string | null;
}

const STATUS_OF: Record<BillingPhase, ClientStatus> = {
  PLATFORM: "PLATFORM",
  TRIAL: "TRIAL",
  ACTIVE: "PAYING",
  GRACE: "GRACE",
  TRIAL_ENDED: "LOCKED",
  LOCKED: "LOCKED",
  NONE: "LOCKED",
};

/** Every company with its live billing state. The platform account is flagged, never counted as a customer. */
async function loadClientBilling(): Promise<ClientBilling[]> {
  const supabase = createAdminClient();
  const { data: companies, error } = await supabase
    .from("companies")
    .select("id, name, created_at, is_platform")
    .order("created_at", { ascending: false });
  if (error) throw new Error("Failed to fetch companies");

  return Promise.all(
    (companies || []).map(async (c) => {
      const state = await getBillingState(c.id);
      const isPlatform = !!c.is_platform || state.isPlatform;
      const status = isPlatform ? "PLATFORM" : STATUS_OF[state.phase];
      return {
        id: c.id,
        name: c.name,
        createdAt: c.created_at,
        isPlatform,
        status,
        planName: isPlatform ? "Platform account" : state.pricing.custom ? "Custom" : "Basic",
        monthly: isPlatform ? 0 : planMonthly(state.pricing, state.seats),
        seats: state.seats,
        trialEndsAt: state.trialEndsAt,
      };
    })
  );
}

export async function getOwnerDashboardData() {
  await assertOwner();
  const supabase = createAdminClient();

  const [all, { data: users, error: usersError }] = await Promise.all([
    loadClientBilling(),
    supabase.from("users").select("id, company_id").is("deleted_at", null),
  ]);
  if (usersError) throw new Error("Failed to fetch users");

  const clients = all.filter((c) => !c.isPlatform);
  const platformIds = new Set(all.filter((c) => c.isPlatform).map((c) => c.id));
  const count = (s: ClientStatus) => clients.filter((c) => c.status === s).length;

  const thirtyDaysAgo = Date.now() - 30 * 24 * 3600 * 1000;
  const paying = clients.filter((c) => c.status === "PAYING" || c.status === "GRACE");

  return {
    totalClients: clients.length,
    trialClients: count("TRIAL"),
    payingClients: paying.length,
    lockedClients: count("LOCKED"),
    graceClients: count("GRACE"),
    clientUsers: (users || []).filter((u) => !platformIds.has(u.company_id)).length,
    newSignups: clients.filter((c) => new Date(c.createdAt).getTime() > thirtyDaysAgo).length,
    mrr: paying.reduce((sum, c) => sum + c.monthly, 0),
    statusDistribution: [
      { name: "Paying", value: count("PAYING") },
      { name: "Grace period", value: count("GRACE") },
      { name: "Free trial", value: count("TRIAL") },
      { name: "Locked", value: count("LOCKED") },
    ].filter((d) => d.value > 0),
    recentCompanies: all.slice(0, 6),
  };
}

export type OwnerDashboardData = Awaited<ReturnType<typeof getOwnerDashboardData>>;


export async function deleteCompany(id: string) {
  await assertOwner();
  const supabase = createAdminClient();
  const { error } = await supabase.from("companies").delete().eq("id", id);
  if (error) throw new Error("Failed to delete company: " + error.message);
  revalidatePath("/owner-admin/companies");
  revalidatePath("/owner-admin");
}

export async function deleteUser(id: string) {
  await assertOwner();
  const supabase = createAdminClient();
  const { error } = await supabase.from("users").delete().eq("id", id);
  if (error) throw new Error("Failed to delete user: " + error.message);
  revalidatePath("/owner-admin/users");
  revalidatePath("/owner-admin");
}

// ── Pricing Plans ──

export async function getPricingPlans() {
  await assertOwner();
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
  await assertOwner();
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
  await assertOwner();
  const supabase = createAdminClient();
  const { error } = await supabase.from("pricing_plans").delete().eq("id", id);
  if (error) throw new Error("Failed to delete plan: " + error.message);
  revalidatePath("/owner-admin/pricing");
  revalidatePath("/");
}

export async function getOwnerRevenueMetrics() {
  await assertOwner();
  const supabase = createAdminClient();

  // 1. Fetch Invoices with joined company names
  const { data: invoices, error: invoicesError } = await supabase
    .from("invoices")
    .select(`
      id,
      invoice_number,
      amount_inr,
      status,
      paid_at,
      description,
      companies:company_id!inner (
        name,
        is_platform
      )
    `)
    .eq("companies.is_platform", false)
    .order("paid_at", { ascending: false });

  if (invoicesError) {
    console.error("❌ Failed to query invoices:", invoicesError);
    throw new Error("Failed to fetch invoices metrics");
  }

  // 2. Live billing state of every client (the platform account is left out).
  const clients = (await loadClientBilling()).filter((c) => !c.isPlatform);
  const paying = clients.filter((c) => c.status === "PAYING" || c.status === "GRACE");

  // 3. Compute Metrics
  const paidInvoices = invoices?.filter(i => i.status === "PAID") || [];
  const totalRevenue = paidInvoices.reduce((acc, curr) => acc + curr.amount_inr, 0);
  const activeMrr = paying.reduce((acc, c) => acc + c.monthly, 0);
  const totalTransactions = invoices?.length || 0;

  // Paying customers by plan.
  const planCounts: Record<string, number> = {};
  for (const c of paying) planCounts[c.planName] = (planCounts[c.planName] || 0) + 1;
  const planDistributionArray = Object.keys(planCounts).map(name => ({ name, value: planCounts[name] }));

  // 4. Compute monthly revenue logs for drawing Recharts charts
  // Group paid invoices by month (YYYY-MM)
  const monthlyRevenueMap: Record<string, number> = {};
  paidInvoices.forEach(inv => {
    if (!inv.paid_at) return;
    const date = new Date(inv.paid_at);
    const key = date.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
    monthlyRevenueMap[key] = (monthlyRevenueMap[key] || 0) + inv.amount_inr;
  });

  // Convert map to sorted array
  const monthlyRevenueArray = Object.keys(monthlyRevenueMap).map(month => ({
    month,
    revenue: monthlyRevenueMap[month]
  })).reverse(); // Order from oldest to newest

  // Format invoices to guarantee singular company object structure
  const formattedInvoices = (invoices?.slice(0, 20) || []).map((inv: any) => {
    const company = Array.isArray(inv.companies) ? inv.companies[0] : inv.companies;
    return {
      id: inv.id,
      invoice_number: inv.invoice_number,
      amount_inr: inv.amount_inr,
      status: inv.status,
      paid_at: inv.paid_at,
      description: inv.description || null,
      companies: company ? { name: company.name } : null
    };
  });

  return {
    totalRevenue,
    activeMrr,
    totalTransactions,
    recentInvoices: formattedInvoices,
    planDistribution: planDistributionArray,
    monthlyRevenue: monthlyRevenueArray.length > 0 ? monthlyRevenueArray : [{ month: "No Sales", revenue: 0 }]
  };
}
