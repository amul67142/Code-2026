"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
// Request-deduped auth: shares one auth round-trip with layout + sibling actions.
import { getCachedUserProfile } from "@/lib/auth/cached-user";

export async function getStages() {
  const supabase = await createClient();

  const profile = await getCachedUserProfile();
  if (!profile) {
    throw new Error("Unauthorized");
  }

  const { data: stages, error } = await supabase
    .from("pipeline_stages")
    .select("*")
    .eq("company_id", profile.company_id)
    .order("stage_order", { ascending: true });

  if (error) {
    throw new Error("Failed to fetch stages");
  }

  return stages;
}

export async function createStage(formData: FormData) {
  const name = formData.get("name") as string;
  const color = formData.get("color") as string || "#e2e8f0";
  const isTerminal = formData.get("is_terminal") === "on";
  const isWon = formData.get("is_won") === "on";

  if (!name) {
    return { error: "Name is required" };
  }

  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: "Unauthorized" };
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("company_id")
    .eq("auth_user_id", user.id)
    .single();

  if (profileError || !profile) {
    return { error: "Profile not found" };
  }

  // Get the current max order
  const { data: currentStages } = await supabase
    .from("pipeline_stages")
    .select("stage_order")
    .eq("company_id", profile.company_id)
    .order("stage_order", { ascending: false })
    .limit(1);

  const nextOrder = currentStages && currentStages.length > 0 ? currentStages[0].stage_order + 1 : 0;

  const { error: insertError } = await supabase
    .from("pipeline_stages")
    .insert({
      company_id: profile.company_id,
      name,
      color,
      is_terminal: isTerminal,
      is_won: isWon,
      stage_order: nextOrder,
    });

  if (insertError) {
    console.error("Insert Error:", insertError);
    return { error: "Failed to create stage" };
  }

  revalidatePath("/settings/pipeline");
  return { success: true };
}

export async function deleteStage(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return { error: "Unauthorized" };

  // First check if any leads are using this stage
  const { count, error: countError } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .eq("stage_id", id);
    
  if (countError) return { error: "Failed to verify leads" };
  
  if (count && count > 0) {
    return { error: `Cannot delete stage: ${count} leads are currently in this stage.` };
  }

  const { error } = await supabase
    .from("pipeline_stages")
    .delete()
    .eq("id", id);

  if (error) {
    return { error: "Failed to delete stage" };
  }

  revalidatePath("/settings/pipeline");
  return { success: true };
}

export async function updateStageOrder(orderedIds: string[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // Update order for all items
  // Since Supabase doesn't have a bulk update RPC by default without writing one, 
  // we can just loop them for now as stages are usually < 20 items.
  
  for (let i = 0; i < orderedIds.length; i++) {
    await supabase
      .from("pipeline_stages")
      .update({ stage_order: i })
      .eq("id", orderedIds[i]);
  }

  revalidatePath("/settings/pipeline");
  return { success: true };
}
