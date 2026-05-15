"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getURL } from "@/lib/utils";

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

  const redirectUrl = `${getURL()}/invite`;

  // Check if user already exists in Supabase Auth (e.g. previously removed and re-invited)
  const { data: existingUsers } = await adminClient.auth.admin.listUsers();
  const existingAuthUser = existingUsers?.users?.find(
    (u: any) => u.email?.toLowerCase() === email.toLowerCase()
  );

  let authUserId: string;

  if (existingAuthUser) {
    // User already exists in Auth — just re-send the invite email
    authUserId = existingAuthUser.id;

    // Generate a new invite link by using the admin generateLink method
    const { error: linkError } = await adminClient.auth.admin.generateLink({
      type: "invite",
      email: email,
      options: {
        redirectTo: redirectUrl,
        data: { role },
      },
    });

    if (linkError) {
      console.error("Re-invite link error:", linkError);
      // Fallback: try sending a magic link instead
      const { error: magicError } = await adminClient.auth.admin.inviteUserByEmail(email, {
        data: { role },
        redirectTo: redirectUrl,
      });
      if (magicError) {
        // If it's "already registered", we can still reactivate the profile
        console.error("Magic link fallback error:", magicError);
      }
    }
  } else {
    // Fresh invite — user doesn't exist in Auth at all
    const { data: authUser, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: { role },
      redirectTo: redirectUrl,
    });

    if (inviteError) {
      console.error("Invite Error:", inviteError);
      return { error: inviteError.message || "Failed to send invitation email." };
    }

    authUserId = authUser.user.id;
  }

  // Check if profile already exists in our users table (could be a soft-deleted one)
  const { data: existingProfile } = await adminClient
    .from("users")
    .select("id, status")
    .eq("auth_user_id", authUserId)
    .eq("company_id", profile.company_id)
    .single();

  if (existingProfile) {
    // Reactivate the existing profile
    await adminClient
      .from("users")
      .update({
        status: "INVITED",
        role: role,
        deleted_at: null,
      })
      .eq("id", existingProfile.id);
  } else {
    // Create fresh profile
    const { error: profileError } = await adminClient
      .from("users")
      .insert({
        auth_user_id: authUserId,
        company_id: profile.company_id,
        email: email,
        name: email.split("@")[0],
        role: role,
        status: "INVITED",
      });

    if (profileError) {
      console.error("Profile creation error:", profileError);
      return { error: "User profile could not be created or already exists." };
    }
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
  const adminClient = createAdminClient();
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

  // Get the user being removed to find their auth_user_id
  const { data: targetUser } = await adminClient
    .from("users")
    .select("auth_user_id")
    .eq("id", userId)
    .eq("company_id", profile.company_id)
    .single();

  if (!targetUser) {
    return { error: "User not found" };
  }

  // 1. Delete from our users table (hard delete so re-invite works cleanly)
  const { error: deleteError } = await adminClient
    .from("users")
    .delete()
    .eq("id", userId)
    .eq("company_id", profile.company_id);

  if (deleteError) {
    console.error("Delete profile error:", deleteError);
    return { error: "Failed to remove user profile" };
  }

  // 2. Delete from Supabase Auth so the email is freed up for re-invite
  const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(
    targetUser.auth_user_id
  );

  if (authDeleteError) {
    console.error("Auth delete error:", authDeleteError);
    // Profile is already removed, so this is non-critical
  }

  revalidatePath("/settings/team");
  return { success: true };
}

