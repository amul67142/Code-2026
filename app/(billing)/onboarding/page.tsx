import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAccessFlags } from "@/lib/billing/state";
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

  // Same rule as the app layout and the lock screen. They must agree, or a
  // trial user bounces between /onboarding and /select-plan forever.
  let hasPaid = false;
  if (userProfile?.company_id) {
    hasPaid = (await getAccessFlags(userProfile.company_id)).access;
  }
  if (!hasPaid) redirect("/select-plan");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const companyName = (userProfile?.companies as any)?.name;
  const isOnboarded = !!userProfile && companyName && companyName !== "Pending Onboarding";
  if (isOnboarded) redirect("/dashboard");

  return <OnboardingClient />;
}
