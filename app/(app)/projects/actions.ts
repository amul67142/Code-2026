"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getProjects() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error("Unauthorized");
  }

  // Get user profile to find company_id
  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("company_id")
    .eq("auth_user_id", user.id)
    .single();

  if (profileError || !profile) {
    throw new Error("Profile not found");
  }

  const { data: projects, error } = await supabase
    .from("projects")
    .select("*")
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("Failed to fetch projects");
  }

  return projects;
}

export async function getProject(projectId: string) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error("Unauthorized");
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("company_id")
    .eq("auth_user_id", user.id)
    .single();

  if (profileError || !profile) {
    throw new Error("Profile not found");
  }

  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("company_id", profile.company_id)
    .single();

  if (error || !project) {
    throw new Error("Project not found");
  }

  return project;
}

export async function createProject(formData: FormData) {
  const name = formData.get("name") as string;
  const type = formData.get("type") as string;
  const location = formData.get("location") as string;
  const priceMin = formData.get("price_min") as string;
  const priceMax = formData.get("price_max") as string;
  const description = formData.get("description") as string;
  
  // Facebook Integrations
  const facebookPixelId = formData.get("facebook_pixel_id") as string;
  const facebookConversionsToken = formData.get("facebook_conversions_token") as string;
  const facebookTestEventCode = formData.get("facebook_test_event_code") as string;
  const facebookIntegrationActive = formData.get("facebook_integration_active") === "true";
  // Instant lead messaging (mig 024). Absent field = on, matching the default.
  const autoMessageLeads = formData.get("auto_message_leads") !== "false";

  if (!name || !type) {
    return { error: "Name and Type are required" };
  }

  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: "Unauthorized" };
  }

  // Get user profile to find company_id
  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("company_id")
    .eq("auth_user_id", user.id)
    .single();

  if (profileError || !profile) {
    return { error: "Profile not found" };
  }

  const { error: insertError } = await supabase
    .from("projects")
    .insert({
      company_id: profile.company_id,
      name,
      type,
      location: location || null,
      price_min: priceMin ? parseFloat(priceMin) : null,
      price_max: priceMax ? parseFloat(priceMax) : null,
      description: description || null,
      status: "ACTIVE",
      facebook_pixel_id: facebookPixelId || null,
      facebook_conversions_token: facebookConversionsToken || null,
      facebook_test_event_code: facebookTestEventCode || null,
      facebook_integration_active: facebookIntegrationActive,
      auto_message_leads: autoMessageLeads,
    });

  if (insertError) {
    console.error("Insert Error:", insertError);
    return { error: "Failed to create project" };
  }

  revalidatePath("/projects");
  return { success: true };
}

export async function updateProject(projectId: string, formData: FormData) {
  const name = formData.get("name") as string;
  const type = formData.get("type") as string;
  const location = formData.get("location") as string;
  const priceMin = formData.get("price_min") as string;
  const priceMax = formData.get("price_max") as string;
  const description = formData.get("description") as string;
  const status = formData.get("status") as string;

  // Facebook Integrations
  const facebookPixelId = formData.get("facebook_pixel_id") as string;
  const facebookConversionsToken = formData.get("facebook_conversions_token") as string;
  const facebookTestEventCode = formData.get("facebook_test_event_code") as string;
  const facebookIntegrationActive = formData.get("facebook_integration_active") === "true";
  const autoMessageLeads = formData.get("auto_message_leads") !== "false";

  if (!name || !type) {
    return { error: "Name and Type are required" };
  }

  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: "Unauthorized" };
  }

  // Get user profile to find company_id
  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("company_id")
    .eq("auth_user_id", user.id)
    .single();

  if (profileError || !profile) {
    return { error: "Profile not found" };
  }

  const { error: updateError } = await supabase
    .from("projects")
    .update({
      name,
      type,
      location: location || null,
      price_min: priceMin ? parseFloat(priceMin) : null,
      price_max: priceMax ? parseFloat(priceMax) : null,
      description: description || null,
      status: (status as any) || "ACTIVE",
      facebook_pixel_id: facebookPixelId || null,
      facebook_conversions_token: facebookConversionsToken || null,
      facebook_test_event_code: facebookTestEventCode || null,
      facebook_integration_active: facebookIntegrationActive,
      auto_message_leads: autoMessageLeads,
    })
    .eq("id", projectId)
    .eq("company_id", profile.company_id);

  if (updateError) {
    console.error("Update Error:", updateError);
    return { error: "Failed to update project" };
  }

  revalidatePath("/projects");
  return { success: true };
}

/**
 * Permanently deletes a project. Admins only.
 * Leads are NOT deleted: leads.project_id is ON DELETE SET NULL, so they
 * stay in the CRM unlinked. Webhooks and AI-agent rows cascade; Facebook
 * form mappings unlink. Nothing else references projects.
 */
export async function deleteProject(projectId: string) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: "Unauthorized" };
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("company_id, role")
    .eq("auth_user_id", user.id)
    .single();

  if (profileError || !profile) {
    return { error: "Profile not found" };
  }
  if (profile.role !== "ADMIN" && profile.role !== "SUPER_ADMIN") {
    return { error: "Only admins can delete projects" };
  }

  const { error: deleteError, count } = await supabase
    .from("projects")
    .delete({ count: "exact" })
    .eq("id", projectId)
    .eq("company_id", profile.company_id);

  if (deleteError) {
    console.error("Delete Project Error:", deleteError);
    return { error: "Failed to delete project" };
  }
  if (!count) {
    return { error: "Project not found" };
  }

  revalidatePath("/projects");
  revalidatePath("/leads");
  return { success: true };
}

import { sendFacebookCAPIEvent } from "@/lib/integrations/facebook-capi";

export async function testFacebookConnection(data: {
  pixelId: string;
  token: string;
  testEventCode: string;
}) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: "Unauthorized" };
  }

  const { success, error } = await sendFacebookCAPIEvent({
    pixelId: data.pixelId,
    token: data.token,
    eventName: "Lead",
    email: "test.lead@bigleads.site",
    phone: "9999999999",
    customData: {
      content_name: "Test Connection Lead",
      test_trigger: "CRM Connection Test Button",
    },
    testEventCode: data.testEventCode,
  });

  return { success, error };
}
