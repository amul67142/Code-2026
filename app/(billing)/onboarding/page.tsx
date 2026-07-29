import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasActiveAccess } from "@/lib/billing/access";
import OnboardingClient from "./onboarding-client";

export const metadata = {
  title: "Onboarding | Big Lead CRM",
};

export const dynamic = "force-dynamic";

/**
 * Server guard for onboarding (lives OUTSIDE the (app) layout on purpose —
 * the paywall never depends on pathname headers this way):
 * - not signed in            → /login
 * - no active subscription   → /select-plan
 * - already onboarded        → /dashboard
 */
export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: userProfile } = await admin
    .from("users")
    .select("id, company_id, companies(name)")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  let hasPaid = false;
  if (userProfile?.company_id) {
    const { data: sub } = await admin
      .from("subscriptions")
      .select("status, current_period_end")
      .eq("company_id", userProfile.company_id)
      .maybeSingle();
    hasPaid = hasActiveAccess(sub);
  }
  if (!hasPaid) redirect("/select-plan");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const companyName = (userProfile?.companies as any)?.name;
  const isOnboarded = !!userProfile && companyName && companyName !== "Pending Onboarding";
  if (isOnboarded) redirect("/dashboard");

  return <OnboardingClient />;
}
