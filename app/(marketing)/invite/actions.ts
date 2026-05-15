"use server";

import { createClient } from "@/lib/supabase/server";

export async function acceptInviteAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // Find user profile and update status to ACTIVE
  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("status")
    .eq("auth_user_id", user.id)
    .single();

  if (profileError || !profile) {
    return { error: "User profile not found. Please contact your administrator." };
  }

  if (profile.status === "INVITED") {
    const { error: updateError } = await supabase
      .from("users")
      .update({ status: "ACTIVE" })
      .eq("auth_user_id", user.id);

    if (updateError) {
      console.error("Failed to update status to ACTIVE:", updateError);
      return { error: "Failed to activate account." };
    }
  }

  return { success: true };
}
