"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { sendFacebookCAPIEvent } from "@/lib/integrations/facebook-capi";
import { sendLeadAcknowledgmentEmail } from "@/lib/automation/lead-email";
import { resolveLeadEmail } from "@/lib/leads/portal-email";
import { alertAgentAboutLead } from "@/lib/automation/agent-lead-email";
import { sendLeadWhatsApp } from "@/lib/automation/lead-whatsapp";
// Request-deduped auth: layout + all page actions share ONE auth round-trip.
import { getCachedUserProfile as getUserProfile } from "@/lib/auth/cached-user";
import { notifyLeadStageChange, notifyLeadAssigned } from "@/lib/notifications/notify";
import { autoSendNewLead } from "@/lib/crm/outbound";

// ── Get leads with optional filters ─────────────────────────────
const LEADS_PAGE_SIZE = 100;
const EXPORT_BATCH_SIZE = 1000; // the most PostgREST returns in one request

export interface LeadFilters {
  stage_id?: string;
  source?: string;
  search?: string;
  status?: string;
}

function leadsQuery(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
  filters?: LeadFilters
) {
  let query = supabase
    .from("leads")
    .select(
      `
      *,
      pipeline_stages ( id, name, color ),
      projects ( id, name ),
      assigned_user:users!leads_assigned_to_id_fkey ( id, name )
    `,
      { count: "exact" }
    )
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    // A CSV import stamps many leads with the same time. Without a tie-break
    // their order can differ between requests, repeating or losing rows
    // across pages.
    .order("id", { ascending: true });

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
  return query;
}

/** One page of leads, plus how many match the filters in total. */
export async function getLeads(filters?: LeadFilters, page = 1) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) throw new Error("Unauthorized");

  const from = (Math.max(1, Math.floor(page)) - 1) * LEADS_PAGE_SIZE;
  const { data, error, count } = await leadsQuery(supabase, profile.company_id, filters).range(
    from,
    from + LEADS_PAGE_SIZE - 1
  );
  if (error) {
    console.error("getLeads error:", error);
    throw new Error("Failed to fetch leads");
  }

  return { leads: data || [], total: count ?? 0, pageSize: LEADS_PAGE_SIZE };
}

/** Every lead matching the filters, not just the page on screen. */
export async function getLeadsForExport(filters?: LeadFilters) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) throw new Error("Unauthorized");

  const all: NonNullable<Awaited<ReturnType<typeof leadsQuery>>["data"]> = [];
  for (;;) {
    const { data, error } = await leadsQuery(supabase, profile.company_id, filters).range(
      all.length,
      all.length + EXPORT_BATCH_SIZE - 1
    );
    if (error) {
      console.error("getLeadsForExport error:", error);
      throw new Error("Failed to export leads");
    }
    all.push(...(data || []));
    if (!data || data.length < EXPORT_BATCH_SIZE) return all;
  }
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

  const resolvedEmail = resolveLeadEmail({ name, phone, email });

  // An agent only sees leads assigned to them, so a lead they add is theirs.
  const finalAssignee =
    profile.role === "AGENT"
      ? profile.id
      : assignedToId && assignedToId !== "unassigned"
        ? assignedToId
        : null;

  const { data: newLead, error: insertError } = await supabase.from("leads").insert({
    company_id: profile.company_id,
    name,
    phone: phone || null,
    email: resolvedEmail.email,
    email_is_synthetic: resolvedEmail.synthetic,
    email_original: resolvedEmail.original,
    source: source || "MANUAL",
    project_id: projectId || null,
    stage_id: resolvedStageId || null,
    assigned_to_id: finalAssignee,
    budget_min: budgetMin ? parseFloat(budgetMin) : null,
    budget_max: budgetMax ? parseFloat(budgetMax) : null,
    notes: notes || null,
    bhk_preference: bhk || null,
    location_preference: locationPref || null,
    status: "ACTIVE",
    score: 0,
  }).select("id").single();

  if (insertError || !newLead) {
    console.error("createLead error:", insertError);
    return { error: "Failed to create lead" };
  }

  // Real-time notify the assigned agent about the new lead.
  if (finalAssignee) {
    await notifyLeadAssigned({
      leadId: newLead.id,
      companyId: profile.company_id,
      assignedToId: finalAssignee,
      actorUserId: profile.id,
      leadName: name,
    });
    if (finalAssignee !== profile.id) {
      await alertAgentAboutLead({
        companyId: profile.company_id,
        leadId: newLead.id,
        agentUserId: finalAssignee,
      });
    }
  }

  // Automation: acknowledge the lead via email + WhatsApp (best-effort)
  if (resolvedEmail.email && !resolvedEmail.synthetic) {
    await sendLeadAcknowledgmentEmail({
      companyId: profile.company_id,
      leadId: newLead.id,
      leadName: name,
      leadEmail: resolvedEmail.email,
      projectId: projectId || null,
      isAuto: true,
    }).catch((e) => console.error("createLead: lead email failed:", e));
  }
  if (phone) {
    await sendLeadWhatsApp({
      companyId: profile.company_id,
      leadId: newLead.id,
      leadName: name,
      leadPhone: phone,
      projectId: projectId || null,
      isAuto: true,
    }).catch((e) => console.error("createLead: lead WhatsApp failed:", e));
  }

  // Forward to any auto-send CRM connection. A lead typed in by hand is still
  // a lead — without this, auto-send would only ever fire for leads that
  // arrived through a webhook, which is a confusing half-feature.
  // CSV import deliberately does NOT do this: importing thousands of rows
  // would fire thousands of outbound requests, the same reason imports never
  // auto-message.
  await autoSendNewLead(profile.company_id, newLead.id, projectId || null).catch((e) =>
    console.error("createLead: CRM forward failed:", e)
  );

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

  // Real-time notify the assigned agent about the pipeline move.
  await notifyLeadStageChange({
    leadId,
    companyId: profile.company_id,
    newStageId: stageId,
    actorUserId: profile.id,
  });

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
          email_is_synthetic,
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
            emailIsPlaceholder: lead.email_is_synthetic === true,
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
  // An agent only sees their own leads, so giving one away would lose it.
  if (profile.role === "AGENT") return { error: "Ask a team lead or admin to reassign this lead" };

  // Read the current owner first: re-saving the same assignee must not send a
  // second (billable) WhatsApp alert.
  const { data: before } = await supabase
    .from("leads")
    .select("assigned_to_id")
    .eq("id", leadId)
    .eq("company_id", profile.company_id)
    .maybeSingle();

  const { error } = await supabase
    .from("leads")
    .update({ assigned_to_id: assignedToId, updated_at: new Date().toISOString() })
    .eq("id", leadId)
    .eq("company_id", profile.company_id);

  if (error) {
    console.error("updateLeadAssignment error:", error);
    return { error: "Failed to assign lead" };
  }

  // The chat follows the lead, or the old agent would keep the conversation.
  const { error: chatError } = await createAdminClient()
    .from("wa_conversations")
    .update({ assigned_agent_id: assignedToId, updated_at: new Date().toISOString() })
    .eq("company_id", profile.company_id)
    .eq("lead_id", leadId);
  if (chatError) console.error("updateLeadAssignment: chat not moved:", chatError);

  // ── Create notifications & activity log ──────────────────────
  if (assignedToId) {
    // Fetch lead name and agent name for notification text
    const [{ data: lead }, { data: agent }] = await Promise.all([
      supabase.from("leads").select("name").eq("id", leadId).single(),
      supabase.from("users").select("name").eq("id", assignedToId).single(),
    ]);

    const leadName = lead?.name || "A lead";
    const agentName = agent?.name || "an agent";

    // Notify ONLY the assigned agent (admin client — RLS blocks user-client
    // inserts; realtime bell delivers it live with a chime).
    await notifyLeadAssigned({
      leadId,
      companyId: profile.company_id,
      assignedToId,
      actorUserId: profile.id,
      leadName,
    });

    // Taking a lead yourself needs no alert; neither does an unchanged owner.
    if (assignedToId !== profile.id && assignedToId !== before?.assigned_to_id) {
      await alertAgentAboutLead({
        companyId: profile.company_id,
        leadId,
        agentUserId: assignedToId,
      });
    }

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
export async function bulkImportLeads(leads: any[], projectId?: string) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return { error: "Unauthorized" };

  if (profile.role === "AGENT") return { error: "Ask a team lead or admin to import leads" };

  if (!leads || leads.length === 0) return { error: "No leads to import" };

  // The id comes from the browser, so check it is this company's project.
  if (projectId) {
    const { data: project } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("company_id", profile.company_id)
      .maybeSingle();
    if (!project) return { error: "That project was not found. Please choose it again." };
  }

  // POLICY: bulk imports NEVER trigger auto email/WhatsApp. Blasting a CSV of
  // hundreds of numbers looks like spam and can tank the client's WABA quality
  // rating / get their number banned. Manual, rate-limited bulk sending is the
  // only sanctioned path (see sendBulkWhatsApp).
  try {
    const CHUNK_SIZE = 500;
    for (let i = 0; i < leads.length; i += CHUNK_SIZE) {
      const chunk = leads.slice(i, i + CHUNK_SIZE).map((l) => {
        // A portal CSV export carries the same masked relay addresses the
        // webhook does, so the same swap applies here.
        const resolved = resolveLeadEmail(l);
        return {
          ...l,
          project_id: projectId || null,
          email: resolved.email,
          email_is_synthetic: resolved.synthetic,
          email_original: resolved.original,
          company_id: profile.company_id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      });

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
