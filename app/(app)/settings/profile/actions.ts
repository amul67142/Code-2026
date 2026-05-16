"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getMyProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("users")
    .select("id, name, email, role, status, company_id, created_at")
    .eq("auth_user_id", user.id)
    .single();

  if (!profile) return { error: "Profile not found" };

  const { data: company } = await supabase
    .from("companies")
    .select("name, logo_url")
    .eq("id", profile.company_id)
    .single();

  return {
    profile: {
      ...profile,
      companyName: company?.name || "Unknown",
      companyLogo: company?.logo_url || null,
    },
  };
}

export async function updateMyName(name: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  if (!name || name.trim().length < 2) {
    return { error: "Name must be at least 2 characters" };
  }

  const { error } = await supabase
    .from("users")
    .update({ name: name.trim() })
    .eq("auth_user_id", user.id);

  if (error) return { error: "Failed to update name" };

  revalidatePath("/settings/profile");
  return { success: true };
}

// ── Fetch leads assigned to the current user ──────────────────────
export async function getMyLeads() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  const { data: profile } = await supabase
    .from("users")
    .select("id, company_id")
    .eq("auth_user_id", user.id)
    .single();

  if (!profile) return [];

  const { data: leads } = await supabase
    .from("leads")
    .select("id, name, phone, email, status_1, status_1_remark, status_2, status_2_remark, created_at")
    .eq("assigned_to_id", profile.id)
    .eq("company_id", profile.company_id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  return leads || [];
}
