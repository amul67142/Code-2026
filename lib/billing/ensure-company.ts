/**
 * Make sure a freshly signed-up user has a company and a profile.
 *
 * Signup creates only the auth account; the company is created the first time
 * the user does something billing-related — start a trial, or pay. Shared by
 * both so they cannot create it differently. Lifted unchanged from the
 * checkout route, which created it inline.
 */
import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

export interface BillingProfile {
  id: string;
  role: string;
  company_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
}

export async function ensureCompanyForUser(
  user: User
): Promise<{ profile: BillingProfile } | { error: string }> {
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("users")
    .select("id, role, company_id, name, email, phone")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (existing) return { profile: existing as BillingProfile };

  const { data: company, error: compErr } = await admin
    .from("companies")
    .insert({
      name: "Pending Onboarding",
      subdomain: `pending-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      status: "TRIAL",
      timezone: "Asia/Kolkata",
      currency: "INR",
    })
    .select("id")
    .single();
  if (compErr || !company) {
    console.error("ensureCompanyForUser: company insert failed:", compErr);
    return { error: "Could not set up your workspace. Please try again." };
  }

  const { data: profile, error: usrErr } = await admin
    .from("users")
    .insert({
      auth_user_id: user.id,
      company_id: company.id,
      name: user.email?.split("@")[0] || "User",
      email: user.email,
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      phone: (user.user_metadata?.phone as string | undefined) || null,
    })
    .select("id, role, company_id, name, email, phone")
    .single();
  if (usrErr || !profile) {
    console.error("ensureCompanyForUser: profile insert failed:", usrErr);
    await admin.from("companies").delete().eq("id", company.id);
    return { error: "Could not set up your profile. Please try again." };
  }

  return { profile: profile as BillingProfile };
}
