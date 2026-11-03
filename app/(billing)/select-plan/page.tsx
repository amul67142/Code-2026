import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SelectPlanClient } from "./select-plan-client";
import { getBillingState } from "@/lib/billing/state";
import { reconcilePendingOrders } from "@/lib/billing/fulfil";

export const metadata = {
  title: "Unlock Your Workspace — BigLead CRM",
  description: "Start your free trial or choose a plan to activate your account.",
};

// Billing state behind auth cookies — never prerender.
export const dynamic = "force-dynamic";

export default async function SelectPlanPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("users")
    .select("id, company_id, phone, companies(name)")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  let phase: string = "NONE";
  let seatsUsed = 1;
  let waitingLeads = 0;
  let trialUsed = false;

  if (profile?.company_id) {
    // A payment whose confirmation never reached us is applied here, so
    // "refresh this page" after a dropped connection actually works.
    await reconcilePendingOrders(profile.company_id).catch(() => 0);

    const state = await getBillingState(profile.company_id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const companyName = (profile.companies as any)?.name;
    const onboarded = !!companyName && companyName !== "Pending Onboarding";
    if (state.access) redirect(onboarded ? "/dashboard" : "/onboarding");

    phase = state.phase;
    seatsUsed = Math.max(1, state.seatsUsed);
    trialUsed = !!state.trialEndsAt;

    // Leads that arrived while locked: the reason to pay today.
    const lockedSince =
      state.phase === "TRIAL_ENDED" ? state.trialEndsAt : state.phase === "LOCKED" ? state.periodEnd : null;
    if (lockedSince) {
      const { count } = await admin
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("company_id", profile.company_id)
        .is("deleted_at", null)
        .gte("created_at", lockedSince);
      waitingLeads = count || 0;
    }
  }

  // One trial per phone number as well as per workspace.
  const phone = String(user.user_metadata?.phone || profile?.phone || "").replace(/\D/g, "");
  if (!trialUsed && phone.length >= 10) {
    const { data: claim } = await admin.from("trial_claims").select("phone").eq("phone", phone).maybeSingle();
    trialUsed = !!claim;
  }

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8">
      <SelectPlanClient
        userEmail={user.email || ""}
        phase={phase}
        trialAvailable={!trialUsed}
        seatsUsed={seatsUsed}
        waitingLeads={waitingLeads}
      />
    </div>
  );
}
