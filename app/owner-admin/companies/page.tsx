import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2 } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasActiveAccess, isFreeAccount } from "@/lib/billing/access";
import { INCLUDED_SEATS } from "@/lib/billing/plans";
import { CompaniesTable, type FreeAccount } from "./CompaniesTable";

export const metadata = {
  title: "Companies | BigLead Owner",
};

export default async function OwnerCompaniesPage() {
  const supabase = createAdminClient();
  
  const { data: companies, error } = await supabase
    .from("companies")
    .select("*, users(count)")
    .order("created_at", { ascending: false });

  const [{ data: subs }, { data: seatHolders }] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("company_id, status, trial_ends_at, current_period_end, seats, amount_inr, razorpay_sub_id"),
    supabase
      .from("users")
      .select("company_id")
      .is("deleted_at", null)
      .in("status", ["ACTIVE", "INVITED"])
      .neq("role", "READ_ONLY"),
  ]);

  const seatsUsed = new Map<string, number>();
  for (const u of seatHolders || []) seatsUsed.set(u.company_id, (seatsUsed.get(u.company_id) || 0) + 1);

  const platformIds = new Set((companies || []).filter((c) => c.is_platform).map((c) => c.id));
  const freeAccounts: Record<string, FreeAccount> = {};
  for (const sub of subs || []) {
    if (platformIds.has(sub.company_id) || !isFreeAccount(sub)) continue;
    const trial = sub.status === "TRIALING";
    freeAccounts[sub.company_id] = {
      kind: trial ? "Trial" : "Demo",
      endsAt: (trial ? sub.trial_ends_at : sub.current_period_end)!,
      locked: !hasActiveAccess(sub),
      seats: sub.seats ?? INCLUDED_SEATS,
      seatsUsed: seatsUsed.get(sub.company_id) || 0,
    };
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Registered Companies</h1>
        <p className="text-zinc-400 mt-2">
          Directory of all companies registered on the BigLead platform.
        </p>
      </div>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-400" />
            Company Directory
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CompaniesTable companies={companies || []} freeAccounts={freeAccounts} />
        </CardContent>
      </Card>
    </div>
  );
}
