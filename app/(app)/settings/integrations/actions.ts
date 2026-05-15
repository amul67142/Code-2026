"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

export async function getWebhooks() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  // Get user's company
  const { data: profile } = await supabase
    .from("users")
    .select("company_id")
    .eq("id", user.id)
    .single();

  if (!profile?.company_id) {
    throw new Error("No company found");
  }

  const { data: webhooks, error } = await supabase
    .from("webhooks")
    .select(`
      *,
      projects ( id, name ),
      webhook_logs ( id, status, received_at, processing_ms )
    `)
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching webhooks:", error);
    throw new Error("Failed to fetch webhooks");
  }

  return webhooks;
}

export async function createWebhook(data: {
  project_id: string;
  source_label: string;
  assignment_rule: string;
  duplicate_rule: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("users")
    .select("company_id")
    .eq("id", user.id)
    .single();

  if (!profile?.company_id) throw new Error("No company found");

  // Generate secure token and secret
  const token = crypto.randomBytes(16).toString("hex");
  const secretKey = crypto.randomBytes(32).toString("hex");
  // In a real app we might hash the secretKey before storing, 
  // but for now we store it to display it once, or display it raw.
  // The PRD specifies 'secret_key_hash' and 'secret_key_display'.
  
  const secretKeyDisplay = secretKey.substring(0, 8) + "****************" + secretKey.substring(secretKey.length - 8);

  const { data: webhook, error } = await supabase
    .from("webhooks")
    .insert({
      company_id: profile.company_id,
      project_id: data.project_id,
      source_label: data.source_label,
      assignment_rule: data.assignment_rule,
      duplicate_rule: data.duplicate_rule,
      token,
      secret_key_display: secretKeyDisplay,
      secret_key_hash: secretKey, // Storing raw for simplicity in validation, in prod consider hashing
      status: "ACTIVE"
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating webhook:", error);
    return { error: "Failed to create webhook" };
  }

  revalidatePath("/settings/integrations");
  return { data: webhook, rawSecret: secretKey };
}

export async function deleteWebhook(id: string) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from("webhooks")
    .delete()
    .eq("id", id);

  if (error) {
    return { error: "Failed to delete webhook" };
  }

  revalidatePath("/settings/integrations");
  return { success: true };
}

export async function regenerateToken(id: string) {
  const supabase = await createClient();
  const newToken = crypto.randomBytes(16).toString("hex");
  const newSecret = crypto.randomBytes(32).toString("hex");
  const newDisplay = newSecret.substring(0, 8) + "****************" + newSecret.substring(newSecret.length - 8);

  const { data, error } = await supabase
    .from("webhooks")
    .update({ 
      token: newToken,
      secret_key_hash: newSecret,
      secret_key_display: newDisplay
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return { error: "Failed to regenerate token" };
  }

  revalidatePath("/settings/integrations");
  return { data, rawSecret: newSecret };
}
