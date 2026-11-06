"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { MAX_LEAD_SHARE, MIN_LEAD_SHARE, validLeadShare } from "@/lib/team/lead-share";

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
    .select("id, name, email, role, is_receiving_leads, last_assigned_at, status, lead_weight")
    .eq("company_id", profile.company_id)
    .is("deleted_at", null)
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

  await restartLeadCycle(adminClient, profile.company_id);
  revalidatePath("/settings/routing");
  return { success: true };
}

/** The team changed, so credit earned under the old split no longer applies. */
async function restartLeadCycle(adminClient: ReturnType<typeof createAdminClient>, companyId: string) {
  const { error } = await adminClient.from("users").update({ lead_credit: 0 }).eq("company_id", companyId);
  if (error) console.error("restartLeadCycle failed:", error);
}

export async function setAgentLeadShare(userId: string, share: number) {
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
  if (!validLeadShare(share)) {
    return { error: `Lead share must be a whole number from ${MIN_LEAD_SHARE} to ${MAX_LEAD_SHARE}.` };
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("users")
    .update({ lead_weight: share })
    .eq("id", userId)
    .eq("company_id", profile.company_id);

  if (error) {
    console.error("Error updating lead share:", error);
    return { error: "Failed to update lead share" };
  }

  await restartLeadCycle(adminClient, profile.company_id);
  revalidatePath("/settings/routing");
  return { success: true };
}
