"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export interface OnboardingData {
  firstName: string;
  lastName: string;
  companyName: string;
  industry: string;
  teamSize: string;
  phone: string;
  timezone: string;
  currency: string;
  leadSources: string[];
  pipelineStages: string[];
}

export async function completeOnboarding(data: OnboardingData) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Authentication required" };
  }

  if (!data.firstName || !data.companyName) {
    return { error: "Name and company are required" };
  }

  const adminClient = createAdminClient();

  try {
    // 1. Check if user already exists in public.users to prevent double-onboarding
    const { data: existingUser } = await adminClient
      .from("users")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();

    if (existingUser) {
      // Already fully onboarded, just redirect
      revalidatePath("/", "layout");
    } else {

    // 2. Insert Company
    const baseSubdomain = data.companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const subdomain = `${baseSubdomain}-${Math.floor(Math.random() * 10000)}`;

    const { data: company, error: companyError } = await adminClient
      .from("companies")
      .insert({
        name: data.companyName,
        subdomain,
        status: "ACTIVE",
        timezone: data.timezone || "Asia/Kolkata",
        currency: data.currency || "INR",
        settings: {
          industry: data.industry,
          team_size: data.teamSize,
          lead_sources: data.leadSources,
        },
      })
      .select("id")
      .single();

    if (companyError || !company) {
      console.error("Company Error:", companyError);
      return { error: "Failed to create workspace" };
    }

    // 3. Insert User as SUPER_ADMIN
    const { error: userError } = await adminClient
      .from("users")
      .insert({
        auth_user_id: user.id,
        company_id: company.id,
        name: `${data.firstName} ${data.lastName}`.trim(),
        email: user.email,
        role: "SUPER_ADMIN",
        status: "ACTIVE",
        phone: data.phone || null,
      });

    if (userError) {
      console.error("User Error:", userError);
      // Rollback: delete the company we just created to avoid orphaned data
      await adminClient.from("companies").delete().eq("id", company.id);
      return { error: "Failed to create user profile. Please try again." };
    }

    // 4. Create default pipeline stages if user selected them
    const stages = data.pipelineStages.length > 0
      ? data.pipelineStages
      : ["New Lead", "Contacted", "Qualified", "Site Visit", "Negotiation", "Won", "Lost"];

    for (let i = 0; i < stages.length; i++) {
      await adminClient.from("pipeline_stages").insert({
        company_id: company.id,
        name: stages[i],
        position: i,
        color: ["#6366f1", "#3b82f6", "#f59e0b", "#10b981", "#8b5cf6", "#22c55e", "#ef4444"][i % 7],
      });
    }

      revalidatePath("/", "layout");
    } // end else

  } catch (err: any) {
    console.error("Onboarding Error:", err);
    return { error: "An unexpected error occurred" };
  }

  redirect("/dashboard");
}
