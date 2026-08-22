/**
 * Shared lead-ingestion pipeline.
 *
 * Used by inbound integrations (Facebook Lead Ads webhook, generic webhook, etc.)
 * to create a lead through one consistent path:
 *   dedupe → resolve stage → insert lead → insert source meta →
 *   assign (round-robin / specific) → notify assigned agent + log activity
 *
 * Runs server-side with the service-role admin client (bypasses RLS).
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { sendLeadAcknowledgmentEmail } from "@/lib/automation/lead-email";
import { sendLeadWhatsApp } from "@/lib/automation/lead-whatsapp";

export type IngestSource =
  | "FACEBOOK_ADS"
  | "GOOGLE_ADS"
  | "WEBSITE_FORM"
  | "MANUAL"
  | "OTHER";

export type AssignmentRule = "ROUND_ROBIN" | "SPECIFIC_AGENT" | "RULE_ENGINE";
export type DuplicateRule = "SKIP" | "CREATE" | "CREATE_AND_FLAG";

export interface IngestInput {
  companyId: string;
  projectId: string | null;
  source: IngestSource;
  normalized: {
    name: string | null;
    phone: string | null;
    email: string | null;
  };
  /**
   * Optional lead-detail fields a richer source (website form, generic
   * webhook) may carry. Stored on the lead row so reps — and the AI agent —
   * start with what the lead already told us.
   */
  extra?: {
    bhkPreference?: string | null;
    propertyType?: string | null;
    locationPreference?: string | null;
    budgetMin?: number | null;
    budgetMax?: number | null;
    notes?: string | null;
  };
  routing: {
    assignmentRule: AssignmentRule;
    assignedAgentId?: string | null;
    entryStageId?: string | null;
    duplicateRule: DuplicateRule;
    autoTags?: string[];
  };
  sourceMeta?: {
    platformLeadId?: string; // e.g. Facebook leadgen_id → idempotency key
    platform?: string;
    formId?: string;
    campaignName?: string;
    campaignId?: string;
    adName?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rawPayload?: any;
  };
  score?: number;
}

export interface IngestResult {
  leadId?: string;
  skipped?: boolean;
  reason?: string;
  error?: string;
}

export async function ingestLead(input: IngestInput): Promise<IngestResult> {
  const admin = createAdminClient();
  const { companyId, projectId, source, normalized, routing, sourceMeta } = input;

  // Must have at least one contact field
  if (!normalized.name && !normalized.phone && !normalized.email) {
    return { error: "No contact fields (name/phone/email) in payload" };
  }

  // ── 1. Idempotency: skip if this platform lead was already ingested ──
  if (sourceMeta?.platformLeadId) {
    const { data: existingMeta } = await admin
      .from("lead_source_meta")
      .select("lead_id")
      .eq("platform_lead_id", sourceMeta.platformLeadId)
      .maybeSingle();
    if (existingMeta) {
      return { skipped: true, reason: "Already ingested (platform_lead_id)", leadId: existingMeta.lead_id };
    }
  }

  // ── 2. Duplicate rule: SKIP if same phone/email already in this project ──
  if (routing.duplicateRule === "SKIP" && (normalized.email || normalized.phone)) {
    const orConditions: string[] = [];
    if (normalized.email) orConditions.push(`email.eq."${normalized.email}"`);
    if (normalized.phone) orConditions.push(`phone.eq."${normalized.phone}"`);

    if (orConditions.length > 0) {
      let dupQuery = admin
        .from("leads")
        .select("id")
        .eq("company_id", companyId)
        .is("deleted_at", null)
        .or(orConditions.join(","));
      if (projectId) dupQuery = dupQuery.eq("project_id", projectId);

      const { data: dups } = await dupQuery.limit(1);
      if (dups && dups.length > 0) {
        return { skipped: true, reason: "Duplicate lead skipped (SKIP rule)" };
      }
    }
  }

  // ── 3. Resolve entry stage ──
  let stageId = routing.entryStageId || null;
  if (!stageId) {
    const { data: firstStage } = await admin
      .from("pipeline_stages")
      .select("id")
      .eq("company_id", companyId)
      .order("stage_order", { ascending: true })
      .limit(1)
      .maybeSingle();
    stageId = firstStage?.id || null;
  }

  // ── 4. Insert the lead ──
  const { data: lead, error: leadError } = await admin
    .from("leads")
    .insert({
      company_id: companyId,
      project_id: projectId,
      name: normalized.name || "Unknown",
      phone: normalized.phone,
      email: normalized.email,
      source,
      stage_id: stageId,
      score: typeof input.score === "number" ? input.score : 50,
      tags: routing.autoTags && routing.autoTags.length ? routing.autoTags : [],
      status: "ACTIVE",
      notes: input.extra?.notes?.trim() || "Created via integration.",
      bhk_preference: input.extra?.bhkPreference || null,
      property_type: input.extra?.propertyType || null,
      location_preference: input.extra?.locationPreference || null,
      budget_min: input.extra?.budgetMin ?? null,
      budget_max: input.extra?.budgetMax ?? null,
    })
    .select("id")
    .single();

  if (leadError || !lead) {
    console.error("ingestLead: failed to insert lead:", leadError);
    return { error: `Database insert failed: ${leadError?.message || "unknown"}` };
  }

  // ── 5. Store source metadata (campaign/ad info + raw payload + idempotency key) ──
  if (sourceMeta) {
    const { error: metaError } = await admin.from("lead_source_meta").insert({
      lead_id: lead.id,
      platform: sourceMeta.platform || null,
      campaign_name: sourceMeta.campaignName || null,
      campaign_id: sourceMeta.campaignId || null,
      ad_name: sourceMeta.adName || null,
      platform_lead_id: sourceMeta.platformLeadId || null,
      form_id: sourceMeta.formId || null,
      raw_payload: sourceMeta.rawPayload ?? null,
    });
    if (metaError) {
      // Non-fatal — the lead exists; metadata is supplementary
      console.error("ingestLead: failed to insert lead_source_meta:", metaError);
    }
  }

  // ── 6. Assignment ──
  let assignedUserId: string | null = null;
  if (routing.assignmentRule === "ROUND_ROBIN") {
    const { data: assignData, error: assignError } = await admin.rpc(
      "assign_lead_round_robin",
      { p_company_id: companyId, p_lead_id: lead.id }
    );
    if (assignError) {
      console.error("ingestLead: round-robin assignment failed:", assignError);
    } else {
      assignedUserId = assignData as string | null;
    }
  } else if (routing.assignmentRule === "SPECIFIC_AGENT" && routing.assignedAgentId) {
    const { error: assignError } = await admin
      .from("leads")
      .update({ assigned_to_id: routing.assignedAgentId })
      .eq("id", lead.id);
    if (!assignError) assignedUserId = routing.assignedAgentId;
  }

  // ── 7. Notify the assigned agent + log activity ──
  if (assignedUserId) {
    const leadName = normalized.name || "A new lead";
    await admin.from("notifications").insert({
      company_id: companyId,
      user_id: assignedUserId,
      title: "New Lead Assigned",
      message: `You have been assigned a new lead: ${leadName}`,
      type: "ASSIGNMENT",
      metadata: { lead_id: lead.id, source },
    });
    await admin.from("activities").insert({
      lead_id: lead.id,
      user_id: null,
      type: "ASSIGNMENT",
      description: `Lead auto-assigned via ${source.replace("_", " ").toLowerCase()} integration`,
      metadata: { assigned_to_id: assignedUserId, source },
    });
  }

  // ── 8. Automation: acknowledge the lead via email + WhatsApp (best-effort) ──
  if (normalized.email) {
    await sendLeadAcknowledgmentEmail({
      companyId,
      leadId: lead.id,
      leadName: normalized.name,
      leadEmail: normalized.email,
      projectId,
      isAuto: true,
    }).catch((e) => console.error("ingestLead: lead email failed:", e));
  }
  if (normalized.phone) {
    await sendLeadWhatsApp({
      companyId,
      leadId: lead.id,
      leadName: normalized.name,
      leadPhone: normalized.phone,
      projectId,
      isAuto: true,
    }).catch((e) => console.error("ingestLead: lead WhatsApp failed:", e));
  }

  return { leadId: lead.id };
}
