"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function completeOnboarding(formData: FormData) {
  const firstName = formData.get("first_name") as string;
  const lastName = formData.get("last_name") as string;
  const companyName = formData.get("company_name") as string;

  if (!firstName || !lastName || !companyName) {
    return { error: "All fields are required" };
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Authentication required" };
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
      return { success: "Already onboarded. Redirecting..." };
    }

    // 2. Insert Company
    const { data: company, error: companyError } = await adminClient
      .from("companies")
      .insert({
        name: companyName,
        status: "ACTIVE",
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
        first_name: firstName,
        last_name: lastName,
        email: user.email,
        role: "SUPER_ADMIN",
        status: "ACTIVE",
      });

    if (userError) {
      console.error("User Error:", userError);
      // We should potentially rollback the company creation here in a real transaction,
      // but Supabase Postgres doesn't easily support cross-RPC transactions from JS yet.
      return { error: "Failed to create user profile" };
    }

    revalidatePath("/", "layout");
    
  } catch (err: any) {
    console.error("Onboarding Error:", err);
    return { error: "An unexpected error occurred" };
  }

  redirect("/dashboard");
}
