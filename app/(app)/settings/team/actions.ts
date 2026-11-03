"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getURL } from "@/lib/utils";
import { sendInviteEmail } from "@/lib/email";
import { validateAgentAlert, type AgentAlertSettings, type AgentAlertRow } from "@/lib/team/agent-alert-settings";

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

export async function inviteTeamMember(
  email: string,
  role: string,
  /** Optional WhatsApp lead alerts, set up in the same dialog. */
  alert?: AgentAlertSettings
) {
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

  // Check the alert setup BEFORE the invite email goes out: a bad number
  // should be fixed in the dialog, not discovered after the person is invited.
  let alertRow: AgentAlertRow | null = null;
  if (alert) {
    const checked = await validateAgentAlert(adminClient, profile.company_id, alert);
    if ("error" in checked) return { error: checked.error };
    alertRow = checked.row;
  }

  const redirectUrl = `${getURL()}/invite`;

  // Make the sign-in link ourselves and send it through Resend, the same way
  // forgot-password does. Two reasons not to let Supabase send it:
  //  - Supabase refuses to invite an address that already has a confirmed
  //    login (email_exists). This used to be logged and swallowed, and the
  //    admin was told "invitation sent" when nothing had gone out.
  //  - Its built-in mailer is rate-limited to a handful of emails an hour and
  //    meant for testing, so invites to a new team would quietly stop arriving.
  //
  // An address with no account (or an invite never accepted) gets an invite
  // link. One that already has a login gets a recovery link instead, which
  // Supabase does allow — and lands them on the same "set your password"
  // page. Trying the invite first and reading the error also replaces a
  // listUsers() lookup that only ever saw the first 50 accounts.
  const linkOptions = { redirectTo: redirectUrl };
  let linkType: "invite" | "recovery" = "invite";
  let { data: link, error: linkError } = await adminClient.auth.admin.generateLink({
    type: "invite",
    email,
    options: { ...linkOptions, data: { role } },
  });
  if (linkError?.code === "email_exists") {
    linkType = "recovery";
    ({ data: link, error: linkError } = await adminClient.auth.admin.generateLink({
      type: "recovery",
      email,
      options: linkOptions,
    }));
  }

  const hashedToken = link?.properties?.hashed_token;
  if (linkError || !link?.user || !hashedToken) {
    console.error("Invite link error:", linkError);
    return { error: linkError?.message || "Could not create an invite link." };
  }
  const authUserId = link.user.id;
  // Through our own verifier, so the session is set server-side, then on to
  // /invite, which asks for a password and activates the profile.
  const acceptUrl = `${getURL()}/auth/confirm?token_hash=${hashedToken}&type=${linkType}&next=/invite`;

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
        ...(alertRow || {}),
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
        ...(alertRow || {}),
      });

    if (profileError) {
      console.error("Profile creation error:", profileError);
      return { error: "User profile could not be created or already exists." };
    }
  }

  // Send only once the profile exists: /invite looks it up, so an email sent
  // first could land the person on "profile not found".
  const [{ data: company }, { data: inviter }] = await Promise.all([
    adminClient.from("companies").select("name").eq("id", profile.company_id).maybeSingle(),
    adminClient.from("users").select("name").eq("auth_user_id", user.id).maybeSingle(),
  ]);
  const sent = await sendInviteEmail(
    email,
    inviter?.name || "Your admin",
    company?.name || "your team",
    acceptUrl
  );
  if (!sent.success) {
    console.error("Invite email failed:", sent.error);
    revalidatePath("/settings/team");
    // The member is saved, so this is not a dead end — Invite again retries.
    return {
      error: `Saved, but the invite email could not be sent (${sent.error || "unknown error"}). Try inviting again.`,
    };
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

