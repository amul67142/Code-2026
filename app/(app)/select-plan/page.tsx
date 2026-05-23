import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SelectPlanClient } from "./select-plan-client";

export const metadata = {
  title: "Unlock Your Workspace — BigLead CRM",
  description: "Select a plan to activate your account and start capturing real estate leads.",
};

export default async function SelectPlanPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const adminClient = createAdminClient();

  // 1. Fetch user profile
  const { data: userProfile } = await adminClient
    .from("users")
    .select("id, company_id, companies(name)")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  // 2. Fetch subscription status
  let hasPaid = false;
  if (userProfile?.company_id) {
    const { data: sub } = await adminClient
      .from("subscriptions")
      .select("status")
      .eq("company_id", userProfile.company_id)
      .maybeSingle();
    hasPaid = sub?.status === "ACTIVE";
  }

  // 3. Fetch pricing plans
  const { data: plans } = await adminClient
    .from("pricing_plans")
    .select("*")
    .order("sort_order", { ascending: true });

  const companyName = (userProfile?.companies as any)?.name;
  const isOnboarded = !!userProfile && companyName && companyName !== "Pending Onboarding";

  // If already paid and onboarded, go directly to dashboard
  if (hasPaid && isOnboarded) {
    redirect("/dashboard");
  }

  // If already paid but not onboarded, go to onboarding
  if (hasPaid && !isOnboarded) {
    redirect("/onboarding");
  }

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8">
      <SelectPlanClient initialPlans={plans || []} userEmail={user.email || ""} />
    </div>
  );
}
