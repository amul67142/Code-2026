"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ── Helper: get current user's profile ──────────────────────────
async function getUserProfile() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("id, company_id, role")
    .eq("auth_user_id", user.id)
    .single();

  return profile;
}

// ── Get lead detail with all relations ─────────────────────────
export async function getLeadDetail(leadId: string) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) throw new Error("Unauthorized");

  const { data: lead, error } = await supabase
    .from("leads")
    .select(
      `
      *,
      pipeline_stages ( id, name, color ),
      projects ( id, name ),
      assigned_user:users!leads_assigned_to_id_fkey ( id, name )
    `
    )
    .eq("id", leadId)
    .eq("company_id", profile.company_id)
    .single();

  if (error || !lead) {
    console.error("getLeadDetail error:", error);
    return null;
  }

  return { lead, currentUser: profile };
}

// ── Get lead activities (timeline) ─────────────────────────────
export async function getLeadActivities(leadId: string) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return [];

  const { data: activities } = await supabase
    .from("activities")
    .select(
      `
      *,
      actor:users!activities_user_id_fkey ( id, name )
    `
    )
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });

  return activities || [];
}

// ── Update lead status (permission-gated) ──────────────────────
export async function updateLeadStatus(
  leadId: string,
  data: {
    status_1?: string;
    status_1_remark?: string;
    status_2?: string;
    status_2_remark?: string;
  }
) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return { error: "Unauthorized" };

  // Check permission: only assigned agent or SUPER_ADMIN
  const { data: lead } = await supabase
    .from("leads")
    .select("assigned_to_id")
    .eq("id", leadId)
    .eq("company_id", profile.company_id)
    .single();

  if (!lead) return { error: "Lead not found" };

  const isAssigned = lead.assigned_to_id === profile.id;
  const isSuperAdmin = profile.role === "SUPER_ADMIN";

  if (!isAssigned && !isSuperAdmin) {
    return { error: "Only the assigned agent or Super Admin can update status" };
  }

  const { error } = await supabase
    .from("leads")
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", leadId)
    .eq("company_id", profile.company_id);

  if (error) {
    console.error("updateLeadStatus error:", error);
    return { error: "Failed to update status" };
  }

  // Log activity
  const changes: string[] = [];
  if (data.status_1) changes.push(`Status 1: ${data.status_1}`);
  if (data.status_2) changes.push(`Status 2: ${data.status_2}`);

  await supabase.from("activities").insert({
    lead_id: leadId,
    user_id: profile.id,
    type: "NOTE",
    description: `Updated status — ${changes.join(", ")}`,
    metadata: data,
  });

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
  revalidatePath("/settings/profile");
  return { success: true };
}

// ── Add activity to a lead ─────────────────────────────────────
export async function addLeadActivity(
  leadId: string,
  type: string,
  description: string
) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return { error: "Unauthorized" };

  // Check permission: only assigned agent or SUPER_ADMIN
  const { data: lead } = await supabase
    .from("leads")
    .select("assigned_to_id")
    .eq("id", leadId)
    .eq("company_id", profile.company_id)
    .single();

  if (!lead) return { error: "Lead not found" };

  const isAssigned = lead.assigned_to_id === profile.id;
  const isSuperAdmin = profile.role === "SUPER_ADMIN";

  if (!isAssigned && !isSuperAdmin) {
    return { error: "Only the assigned agent or Super Admin can log activities" };
  }

  const { error } = await supabase.from("activities").insert({
    lead_id: leadId,
    user_id: profile.id,
    type: type,
    description: description,
  });

  if (error) {
    console.error("addLeadActivity error:", error);
    return { error: "Failed to add activity" };
  }

  revalidatePath(`/leads/${leadId}`);
  return { success: true };
}

// ── Get agents for reassignment ────────────────────────────────
export async function getAgentsForReassignment() {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return [];

  const { data: agents } = await supabase
    .from("users")
    .select("id, name")
    .eq("company_id", profile.company_id)
    .in("role", ["AGENT", "TEAM_LEAD"])
    .order("name", { ascending: true });

  return agents || [];
}

import { sendFacebookCAPIEvent } from "@/lib/integrations/facebook-capi";

export async function updateLeadQualification(leadId: string, isQualified: boolean) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return { error: "Unauthorized" };

  // Fetch lead details and associated project details
  const { data: lead, error: fetchError } = await supabase
    .from("leads")
    .select(`
      id,
      name,
      email,
      phone,
      project_id,
      projects (
        id,
        name,
        facebook_pixel_id,
        facebook_conversions_token,
        facebook_test_event_code,
        facebook_integration_active
      )
    `)
    .eq("id", leadId)
    .eq("company_id", profile.company_id)
    .single();

  if (fetchError || !lead) {
    return { error: "Lead not found" };
  }

  // Update lead qualification status
  const { error: updateError } = await supabase
    .from("leads")
    .update({ is_qualified: isQualified, updated_at: new Date().toISOString() })
    .eq("id", leadId)
    .eq("company_id", profile.company_id);

  if (updateError) {
    console.error("updateLeadQualification error:", updateError);
    return { error: "Failed to update qualification status" };
  }

  // Log qualification action in Activity History
  const statusStr = isQualified ? "Qualified" : "Not Qualified";
  await supabase.from("activities").insert({
    lead_id: leadId,
    user_id: profile.id,
    type: "SYSTEM",
    description: `Lead marked as ${statusStr}`,
  });

  // Call Conversions API asynchronously in the background (fail-safe)
  const project: any = lead.projects;
  if (
    project &&
    project.facebook_integration_active &&
    project.facebook_pixel_id &&
    project.facebook_conversions_token
  ) {
    // Fire event asynchronously (non-blocking)
    sendFacebookCAPIEvent({
      pixelId: project.facebook_pixel_id,
      token: project.facebook_conversions_token,
      eventName: isQualified ? "Lead" : "Contact",
      email: lead.email,
      phone: lead.phone,
      customData: {
        content_name: project.name,
        lead_id: lead.id,
        status: statusStr,
      },
      testEventCode: project.facebook_test_event_code,
    }).then((res) => {
      if (!res.success) {
        console.warn(`Meta CAPI qualification signal failed: ${res.error}`);
      } else {
        console.log(`Meta CAPI qualification signal sent: ${isQualified ? 'Lead' : 'Contact'}`);
      }
    }).catch((err) => {
      console.error("Meta CAPI async call failed:", err);
    });
  }

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
  return { success: true };
}
