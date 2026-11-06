"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { notifyLeadQualification } from "@/lib/notifications/notify";
import { STATUS_FIELDS, STATUS_SLOTS, remarkKey, statusKey, type StatusField } from "../status-options";

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
  data: Partial<Record<StatusField, string>>
) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return { error: "Unauthorized" };

  // Check permission: only assigned agent or SUPER_ADMIN
  const { data: lead } = await supabase
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .eq("company_id", profile.company_id)
    .single();

  if (!lead) return { error: "Lead not found" };

  const isAssigned = lead.assigned_to_id === profile.id;
  const isSuperAdmin = profile.role === "SUPER_ADMIN";

  if (!isAssigned && !isSuperAdmin) {
    return { error: "Only the assigned agent or Super Admin can update status" };
  }

  // Only status fields, whatever the caller sent. `undefined` means "not
  // touched"; an empty string means the rep deliberately cleared it.
  const update: Record<string, string | null> = {};
  for (const field of STATUS_FIELDS) {
    const value = data[field];
    if (value !== undefined) update[field] = value.trim() || null;
  }

  // History: one line per slot that really changed, not every field on the form.
  const changes: string[] = [];
  for (const slot of STATUS_SLOTS) {
    const status = statusKey(slot);
    const remark = remarkKey(slot);
    const nextStatus = status in update ? update[status] : lead[status];
    const nextRemark = remark in update ? update[remark] : lead[remark];
    if ((nextStatus || "") === (lead[status] || "") && (nextRemark || "") === (lead[remark] || "")) continue;
    changes.push(`Status ${slot}: ${nextStatus || "cleared"}${nextRemark ? ` (${nextRemark})` : ""}`);
  }
  if (changes.length === 0) return { success: true };

  const { error } = await supabase
    .from("leads")
    .update({
      ...update,
      updated_at: new Date().toISOString(),
    })
    .eq("id", leadId)
    .eq("company_id", profile.company_id);

  if (error) {
    console.error("updateLeadStatus error:", error);
    return { error: "Failed to update status" };
  }

  await supabase.from("activities").insert({
    lead_id: leadId,
    user_id: profile.id,
    type: "NOTE",
    description: `Updated status — ${changes.join(", ")}`,
    metadata: update,
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

// ── Get the latest email status for a lead ─────────────────────
export async function getLeadEmailStatus(leadId: string) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return null;

  const { data } = await supabase
    .from("message_log")
    .select("id, status, to_address, subject, error_message, is_auto, created_at, opened_at, replied_at")
    .eq("lead_id", leadId)
    .eq("company_id", profile.company_id)
    .eq("channel", "EMAIL")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data;
}

// ── Manually (re)send the acknowledgment email to a lead ───────
export async function resendLeadEmail(leadId: string) {
  const profile = await getUserProfile();
  if (!profile) return { error: "Unauthorized" };

  const supabase = await createClient();
  const { data: lead } = await supabase
    .from("leads")
    .select("id, name, email, email_is_synthetic, project_id, company_id")
    .eq("id", leadId)
    .eq("company_id", profile.company_id)
    .single();

  if (!lead) return { error: "Lead not found" };
  if (!lead.email) return { error: "This lead has no email address" };
  if (lead.email_is_synthetic) {
    return {
      error:
        "This address was generated because the portal never sent a real one. Reach this lead on WhatsApp or by phone.",
    };
  }

  const { sendLeadAcknowledgmentEmail } = await import("@/lib/automation/lead-email");
  const res = await sendLeadAcknowledgmentEmail({
    companyId: lead.company_id,
    leadId: lead.id,
    leadName: lead.name,
    leadEmail: lead.email,
    projectId: lead.project_id,
    isAuto: false,
  });

  if (res.status === "FAILED") {
    return { error: res.error || "Failed to send email" };
  }
  if (res.status === "SKIPPED_SYNTHETIC_EMAIL") {
    return { error: "That address was generated by BigLead — there is no inbox behind it." };
  }

  revalidatePath(`/leads/${leadId}`);
  return { success: true, status: res.status };
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
import { resolveLeadEmail } from "@/lib/leads/portal-email";

/**
 * Edit a lead's name and email.
 *
 * Phone is deliberately NOT editable, and this action will not accept it even
 * if one is passed. The number is the lead's identity everywhere else: inbound
 * WhatsApp replies are matched to a lead on the last ten digits, duplicate
 * detection keys on it, and the portal that sent us the lead quotes it back.
 * Editing it here would silently orphan a live WhatsApp conversation.
 * A genuinely wrong number means a new lead, not a rewritten one.
 */
export async function updateLeadContact(
  leadId: string,
  data: { name: string; email: string }
) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return { error: "Unauthorized" };

  const name = data.name?.trim() ?? "";
  const email = data.email?.trim().toLowerCase() ?? "";

  if (!name) return { error: "Name cannot be empty" };
  if (name.length > 120) return { error: "Name is too long" };
  // Deliberately permissive: enough to catch a typo, not to adjudicate RFC 5322.
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return { error: "That email address does not look right" };
  }

  const { data: lead } = await supabase
    .from("leads")
    .select("name, email, email_is_synthetic, phone, assigned_to_id")
    .eq("id", leadId)
    .eq("company_id", profile.company_id)
    .single();

  if (!lead) return { error: "Lead not found" };

  // The assigned agent owns their lead; admins manage the whole company. An
  // admin who can bulk-delete leads can certainly correct a misspelt name.
  const isAssigned = lead.assigned_to_id === profile.id;
  const isAdmin = profile.role === "ADMIN" || profile.role === "SUPER_ADMIN";
  if (!isAssigned && !isAdmin) {
    return { error: "Only the assigned agent or an admin can edit these details" };
  }

  if (name === lead.name && email === (lead.email || "")) {
    return { success: true, unchanged: true };
  }

  // A rep typing the lead's real address over a generated one must clear the
  // flag, or we would keep refusing to mail a perfectly good inbox. And if
  // they paste a portal relay, it gets swapped exactly as it would on ingest.
  const resolved = resolveLeadEmail({ name, phone: lead.phone, email });

  const { error } = await supabase
    .from("leads")
    .update({
      name,
      email: resolved.email,
      email_is_synthetic: resolved.synthetic,
      email_original: resolved.original,
      updated_at: new Date().toISOString(),
    })
    .eq("id", leadId)
    .eq("company_id", profile.company_id);

  if (error) {
    console.error("updateLeadContact error:", error);
    return { error: "Failed to save" };
  }

  // Record the old values — a corrected name is useful, a quietly overwritten
  // one is how you lose track of who a lead actually was.
  const changes: string[] = [];
  if (name !== lead.name) changes.push(`name "${lead.name}" to "${name}"`);
  if ((resolved.email || "") !== (lead.email || "")) {
    changes.push(`email "${lead.email || "none"}" to "${resolved.email || "none"}"`);
  }
  if (resolved.synthetic) {
    changes.push(`(${resolved.original} is a portal relay, so a placeholder was stored)`);
  }

  await supabase.from("activities").insert({
    lead_id: leadId,
    user_id: profile.id,
    type: "NOTE",
    description: `Updated ${changes.join(" and ")}`,
    metadata: {
      before: { name: lead.name, email: lead.email },
      after: { name, email: resolved.email, email_is_synthetic: resolved.synthetic },
    },
  });

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
  return {
    success: true,
    name,
    email: resolved.email,
    emailIsSynthetic: resolved.synthetic,
  };
}

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
      email_is_synthetic,
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

  // Real-time notify the assigned agent about the qualification change.
  await notifyLeadQualification({
    leadId,
    companyId: profile.company_id,
    isQualified,
  });

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
      emailIsPlaceholder: lead.email_is_synthetic === true,
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
