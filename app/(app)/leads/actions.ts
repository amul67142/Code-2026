"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { sendFacebookCAPIEvent } from "@/lib/integrations/facebook-capi";

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

// ── Get leads with optional filters ─────────────────────────────
export async function getLeads(filters?: {
  stage_id?: string;
  source?: string;
  search?: string;
  status?: string;
}) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) throw new Error("Unauthorized");

  let query = supabase
    .from("leads")
    .select(
      `
      *,
      pipeline_stages ( id, name, color ),
      projects ( id, name ),
      assigned_user:users!leads_assigned_to_id_fkey ( id, name )
    `
    )
    .eq("company_id", profile.company_id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (filters?.stage_id) {
    query = query.eq("stage_id", filters.stage_id);
  }
  if (filters?.source) {
    query = query.eq("source", filters.source);
  }
  if (filters?.status) {
    query = query.eq("status", filters.status);
  }
  if (filters?.search) {
    query = query.or(
      `name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%,email.ilike.%${filters.search}%`
    );
  }

  const { data, error } = await query.limit(100);
  if (error) {
    console.error("getLeads error:", error);
    throw new Error("Failed to fetch leads");
  }

  return data;
}

// ── Get leads grouped by pipeline stage (for Kanban) ────────────
export async function getLeadsGrouped() {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) throw new Error("Unauthorized");

  // Fetch stages
  const { data: stages } = await supabase
    .from("pipeline_stages")
    .select("*")
    .eq("company_id", profile.company_id)
    .order("stage_order", { ascending: true });

  // Fetch leads
  const { data: leads } = await supabase
    .from("leads")
    .select(
      `
      *,
      pipeline_stages ( id, name, color ),
      projects ( id, name ),
      assigned_user:users!leads_assigned_to_id_fkey ( id, name )
    `
    )
    .eq("company_id", profile.company_id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  return { stages: stages || [], leads: leads || [] };
}

// ── Get agents for assignment ─────────────────────────────────────
export async function getAgentsForAssignment() {
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

// ── Create a new lead ───────────────────────────────────────────
export async function createLead(formData: FormData) {
  const name = formData.get("name") as string;
  const phone = formData.get("phone") as string;
  const email = formData.get("email") as string;
  const source = formData.get("source") as string;
  const projectId = formData.get("project_id") as string;
  const stageId = formData.get("stage_id") as string;
  const assignedToId = formData.get("assigned_to_id") as string;
  const budgetMin = formData.get("budget_min") as string;
  const budgetMax = formData.get("budget_max") as string;
  const notes = formData.get("notes") as string;
  const bhk = formData.get("bhk_preference") as string;
  const locationPref = formData.get("location_preference") as string;

  if (!name) return { error: "Lead name is required" };
  if (!phone && !email) return { error: "Phone or email is required" };

  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return { error: "Unauthorized" };

  // If no stage is selected, find the first pipeline stage
  let resolvedStageId = stageId;
  if (!resolvedStageId) {
    const { data: firstStage } = await supabase
      .from("pipeline_stages")
      .select("id")
      .eq("company_id", profile.company_id)
      .order("stage_order", { ascending: true })
      .limit(1)
      .single();

    resolvedStageId = firstStage?.id;
  }

  const { error: insertError } = await supabase.from("leads").insert({
    company_id: profile.company_id,
    name,
    phone: phone || null,
    email: email || null,
    source: source || "MANUAL",
    project_id: projectId || null,
    stage_id: resolvedStageId || null,
    assigned_to_id: (assignedToId && assignedToId !== "unassigned") ? assignedToId : null,
    budget_min: budgetMin ? parseFloat(budgetMin) : null,
    budget_max: budgetMax ? parseFloat(budgetMax) : null,
    notes: notes || null,
    bhk_preference: bhk || null,
    location_preference: locationPref || null,
    status: "ACTIVE",
    score: 0,
  });

  if (insertError) {
    console.error("createLead error:", insertError);
    return { error: "Failed to create lead" };
  }

  revalidatePath("/leads");
  revalidatePath("/leads/kanban");
  return { success: true };
}

// ── Update lead stage (drag-and-drop on Kanban) ─────────────────
export async function updateLeadStage(leadId: string, stageId: string) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("leads")
    .update({ stage_id: stageId, updated_at: new Date().toISOString() })
    .eq("id", leadId)
    .eq("company_id", profile.company_id);

  if (error) {
    console.error("updateLeadStage error:", error);
    return { error: "Failed to update stage" };
  }

  // Check if destination stage is won, and fire Purchase CAPI signal if enabled
  try {
    const { data: stage } = await supabase
      .from("pipeline_stages")
      .select("is_won, name")
      .eq("id", stageId)
      .single();

    if (stage?.is_won) {
      const { data: lead } = await supabase
        .from("leads")
        .select(`
          id,
          name,
          email,
          phone,
          budget_max,
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

      if (lead) {
        const project: any = lead.projects;
        if (
          project &&
          project.facebook_integration_active &&
          project.facebook_pixel_id &&
          project.facebook_conversions_token
        ) {
          sendFacebookCAPIEvent({
            pixelId: project.facebook_pixel_id,
            token: project.facebook_conversions_token,
            eventName: "Purchase",
            email: lead.email,
            phone: lead.phone,
            customData: {
              currency: "INR",
              value: lead.budget_max || 0,
              content_name: project.name,
              lead_id: lead.id,
            },
            testEventCode: project.facebook_test_event_code,
          }).then((res) => {
            if (!res.success) {
              console.warn(`Meta CAPI Purchase signal failed: ${res.error}`);
            } else {
              console.log(`Meta CAPI Purchase signal sent for lead ${lead.id}`);
            }
          }).catch((err) => {
            console.error("Meta CAPI Purchase async call failed:", err);
          });
        }
      }
    }
  } catch (err) {
    console.error("Error processing CAPI stage change event:", err);
  }

  revalidatePath("/leads");
  revalidatePath("/leads/kanban");
  return { success: true };
}

// ── Update lead assignment ────────────────────────────────────────
export async function updateLeadAssignment(leadId: string, assignedToId: string | null) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("leads")
    .update({ assigned_to_id: assignedToId, updated_at: new Date().toISOString() })
    .eq("id", leadId)
    .eq("company_id", profile.company_id);

  if (error) {
    console.error("updateLeadAssignment error:", error);
    return { error: "Failed to assign lead" };
  }

  // ── Create notifications & activity log ──────────────────────
  if (assignedToId) {
    // Fetch lead name and agent name for notification text
    const [{ data: lead }, { data: agent }] = await Promise.all([
      supabase.from("leads").select("name").eq("id", leadId).single(),
      supabase.from("users").select("name").eq("id", assignedToId).single(),
    ]);

    const leadName = lead?.name || "A lead";
    const agentName = agent?.name || "an agent";

    // Notify ONLY the assigned agent
    const { error: notifError } = await supabase.from("notifications").insert({
      company_id: profile.company_id,
      user_id: assignedToId,
      title: "Lead Assigned",
      message: `You have been assigned a new lead: ${leadName}`,
      type: "ASSIGNMENT",
      metadata: { lead_id: leadId, assigned_to_id: assignedToId },
    });
    if (notifError) console.error("Failed to insert notification:", notifError);

    // Log activity on the lead
    const { error: actError } = await supabase.from("activities").insert({
      lead_id: leadId,
      user_id: profile.id,
      type: "ASSIGNMENT",
      description: `Lead assigned to ${agentName}`,
      metadata: { assigned_to_id: assignedToId, assigned_by: profile.id },
    });
    if (actError) console.error("Failed to insert activity:", actError);
  }

  revalidatePath("/leads");
  revalidatePath("/leads/kanban");
  return { success: true };
}

// ── Bulk Import Leads ──────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function bulkImportLeads(leads: any[]) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return { error: "Unauthorized" };

  if (!leads || leads.length === 0) return { error: "No leads to import" };

  try {
    const CHUNK_SIZE = 500;
    for (let i = 0; i < leads.length; i += CHUNK_SIZE) {
      const chunk = leads.slice(i, i + CHUNK_SIZE).map((l) => ({
        ...l,
        company_id: profile.company_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase.from("leads").insert(chunk);
      if (error) {
        console.error("Bulk import chunk error:", error);
        return { error: `Failed to import at row ${i + 1}. ${error.message}` };
      }
    }

    revalidatePath("/leads");
    revalidatePath("/leads/kanban");
    return { success: true };
  } catch (err) {
    console.error("Bulk import error:", err);
    return { error: "An unexpected error occurred during import." };
  }
}
