"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getTeamMembers() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("users")
    .select("company_id, role")
    .eq("auth_user_id", user.id)
    .single();

  if (!profile?.company_id) throw new Error("No company found");

  const { data: team, error } = await supabase
    .from("users")
    .select("*")
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching team:", error);
    throw new Error("Failed to fetch team members");
  }

  return { team, currentRole: profile.role };
}

export async function inviteTeamMember(email: string, role: string) {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("users")
    .select("company_id, role")
    .eq("auth_user_id", user.id)
    .single();

  if (!profile?.company_id) return { error: "No company found" };

  // Only Admins and Super Admins can invite
  if (profile.role !== "ADMIN" && profile.role !== "SUPER_ADMIN") {
    return { error: "Insufficient permissions to invite users" };
  }

  // 1. Send invite via Supabase Auth Admin API
  const { data: authUser, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { role } // Optional user_metadata
  });

  if (inviteError) {
    console.error("Invite Error:", inviteError);
    return { error: inviteError.message || "Failed to send invitation email." };
  }

  // 2. Create profile in `users` table so they appear in the team list immediately
  const { error: profileError } = await adminClient
    .from("users")
    .insert({
      auth_user_id: authUser.user.id,
      company_id: profile.company_id,
      email: email,
      name: email.split("@")[0], // Default name
      role: role,
      status: "INVITED"
    });

  if (profileError) {
    // If it fails because of duplicate email, return that
    console.error("Profile creation error:", profileError);
    return { error: "User profile could not be created or already exists." };
  }

  revalidatePath("/settings/team");
  return { success: true };
}

export async function updateUserRole(userId: string, newRole: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("users")
    .select("company_id, role")
    .eq("auth_user_id", user.id)
    .single();

  if (profile?.role !== "ADMIN" && profile?.role !== "SUPER_ADMIN") {
    return { error: "Insufficient permissions" };
  }

  const { error } = await supabase
    .from("users")
    .update({ role: newRole })
    .eq("id", userId)
    .eq("company_id", profile.company_id);

  if (error) {
    return { error: "Failed to update role" };
  }

  revalidatePath("/settings/team");
  return { success: true };
}

export async function removeUser(userId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("users")
    .select("company_id, role")
    .eq("auth_user_id", user.id)
    .single();

  if (profile?.role !== "ADMIN" && profile?.role !== "SUPER_ADMIN") {
    return { error: "Insufficient permissions" };
  }

  // We should only soft-delete or remove from company. Let's soft delete.
  const { error } = await supabase
    .from("users")
    .update({ status: "INACTIVE", deleted_at: new Date().toISOString() })
    .eq("id", userId)
    .eq("company_id", profile.company_id);

  if (error) {
    return { error: "Failed to remove user" };
  }

  revalidatePath("/settings/team");
  return { success: true };
}
