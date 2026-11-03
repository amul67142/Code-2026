import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCachedUserProfile } from "@/lib/auth/cached-user";
import { getBillingState } from "@/lib/billing/state";
import { getCreditBalance } from "@/lib/billing/credits";
import { reconcilePendingOrders } from "@/lib/billing/fulfil";
import { BillingPanel } from "./billing-panel";

export const metadata = {
  title: "Billing | Big Lead CRM",
};

// Live billing state behind auth cookies — never prerender.
export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const profile = await getCachedUserProfile();
  if (!profile?.company_id) redirect("/login");

  // A payment whose confirmation never reached us is applied before we render,
  // so "refresh this page" after a dropped connection shows it delivered.
  await reconcilePendingOrders(profile.company_id).catch(() => 0);

  const admin = createAdminClient();
  const [state, credits, { data: ledger }, { data: invoices }] = await Promise.all([
    getBillingState(profile.company_id),
    getCreditBalance(profile.company_id),
    admin
      .from("credit_ledger")
      .select("id, delta, kind, state, note, created_at")
      .eq("company_id", profile.company_id)
      .order("created_at", { ascending: false })
      .limit(25),
    admin
      .from("invoices")
      .select("id, invoice_number, amount_inr, paid_at, description, created_at")
      .eq("company_id", profile.company_id)
      .order("created_at", { ascending: false })
      .limit(24),
  ]);

  return (
    <BillingPanel
      state={state}
      credits={credits}
      ledger={ledger || []}
      invoices={invoices || []}
      isOwner={profile.role === "SUPER_ADMIN"}
    />
  );
}
