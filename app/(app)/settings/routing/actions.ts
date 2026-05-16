"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function getRoutingAgents() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("users")
    .select("company_id, role")
    .eq("auth_user_id", user.id)
    .single();

  if (!profile || (profile.role !== "ADMIN" && profile.role !== "SUPER_ADMIN")) {
    return { error: "Only admins can manage routing" };
  }

  const { data: agents, error } = await supabase
    .from("users")
    .select("id, name, email, role, is_receiving_leads, last_assigned_at, status")
    .eq("company_id", profile.company_id)
    .in("role", ["AGENT", "TEAM_LEAD"])
    .order("last_assigned_at", { ascending: true, nullsFirst: true });

  if (error) {
    console.error("Error fetching routing agents:", error);
    return { error: "Failed to load agents" };
  }

  return { data: agents };
}

export async function toggleAgentRouting(userId: string, isReceiving: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("users")
    .select("company_id, role")
    .eq("auth_user_id", user.id)
    .single();

  if (!profile || (profile.role !== "ADMIN" && profile.role !== "SUPER_ADMIN")) {
    return { error: "Insufficient permissions" };
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("users")
    .update({ is_receiving_leads: isReceiving })
    .eq("id", userId)
    .eq("company_id", profile.company_id);

  if (error) {
    console.error("Error updating agent routing status:", error);
    return { error: "Failed to update routing status" };
  }

  revalidatePath("/settings/routing");
  return { success: true };
}
