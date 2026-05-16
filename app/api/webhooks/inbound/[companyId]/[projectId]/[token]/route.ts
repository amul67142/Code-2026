import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize admin client to bypass RLS since webhooks are unauthenticated server-side routes
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function normalizeLeadPayload(body: any) {
  return {
    name: body.name 
       || body.full_name 
       || body.fullName
       || body.lead_name 
       || body.contact_name
       || (body.firstName && body.lastName ? `${body.firstName} ${body.lastName}` : null)
       || body.firstName
       || null,

    phone: body.phone 
        || body.phone_number 
        || body.phoneNumber
        || body.mobile 
        || body.mobile_number
        || body.contact
        || body.contact_number
        || null,

    email: body.email 
        || body.email_address 
        || body.emailAddress
        || null,

    source_raw: body
  };
}

// Calculate score per PRD
function calculateScore(payload: any) {
  let score = 50; // base
  
  const timeline = payload.timeline?.toUpperCase();
  if (timeline === "IMMEDIATE") score += 20;
  
  const budget = parseFloat(payload.budget);
  if (!isNaN(budget) && budget > 8000000) score += 15; // > 80L
  
  if (payload.email) score += 10;
  if (payload.alternate_phone) score += 5;
  
  return Math.min(Math.max(score, 0), 100);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string; projectId: string; token: string }> }
) {
  const { companyId, projectId, token } = await params;
  const startTime = Date.now();
  let webhookId: string | null = null;
  let rawBody: any = {};

  try {
    // 1. Parse JSON body
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    // 2. Validate Authorization header (Secret Key)
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing or invalid Authorization header" }, { status: 401 });
    }
    const secretKey = authHeader.replace("Bearer ", "");

    // 3. Fetch Webhook configuration
    const { data: webhook, error: webhookError } = await supabase
      .from("webhooks")
      .select("*")
      .eq("company_id", companyId)
      .eq("project_id", projectId)
      .eq("token", token)
      .eq("secret_key_hash", secretKey) // In production, we'd hash the provided key and compare
      .single();

    if (webhookError || !webhook) {
      console.error("Webhook auth failed:", webhookError?.message);
      return NextResponse.json({ error: "Unauthorized or invalid webhook" }, { status: 401 });
    }

    webhookId = webhook.id;

    if (webhook.status !== "ACTIVE") {
      await logWebhook(webhookId!, rawBody, "FAILED", null, "Webhook is inactive", startTime);
      return NextResponse.json({ error: "Webhook is inactive" }, { status: 403 });
    }

    // 4. Normalize Payload
    const normalized = normalizeLeadPayload(rawBody);

    // 5. Fail if no contact info
    if (!normalized.name && !normalized.phone && !normalized.email) {
      const errorMsg = "No contact fields found in payload";
      await logWebhook(webhookId!, rawBody, "FAILED", null, errorMsg, startTime);
      return NextResponse.json({ error: errorMsg }, { status: 422 });
    }

    // 6. Calculate Score
    const score = calculateScore({ ...rawBody, ...normalized });

    // 7. Duplicate Check (Simple email/phone check)
    if (webhook.duplicate_rule === "SKIP") {
      const orConditions = [];
      if (normalized.email) orConditions.push(`email.eq."${normalized.email}"`);
      if (normalized.phone) orConditions.push(`phone.eq."${normalized.phone}"`);
      
      if (orConditions.length > 0) {
        const { data: existingLeads } = await supabase
          .from("leads")
          .select("id")
          .eq("company_id", companyId)
          .eq("project_id", projectId)
          .or(orConditions.join(","));

        if (existingLeads && existingLeads.length > 0) {
          const errorMsg = "Duplicate lead skipped based on rules";
          await logWebhook(webhookId!, rawBody, "FAILED", null, errorMsg, startTime);
          return NextResponse.json({ message: errorMsg }, { status: 409 });
        }
      }
    }

    // 8. Create Lead
    // If webhook has an entry_stage_id, use it. Otherwise, look for the lowest stage_order stage.
    let stageId = webhook.entry_stage_id;
    if (!stageId) {
      const { data: stages } = await supabase
        .from("pipeline_stages")
        .select("id")
        .eq("company_id", companyId)
        .order("stage_order", { ascending: true })
        .limit(1);
      if (stages && stages.length > 0) {
        stageId = stages[0].id;
      }
    }

    // Default to 'OTHER' source if not explicitly mapped
    const source = webhook.source_label || "OTHER";

    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .insert({
        company_id: companyId,
        project_id: projectId,
        name: normalized.name || "Unknown",
        email: normalized.email,
        phone: normalized.phone,
        source: source,
        stage_id: stageId,
        score: score,
        notes: "Created via webhook integration.",
      })
      .select("id")
      .single();

    if (leadError) {
      console.error("Failed to create lead:", leadError);
      await logWebhook(webhookId!, rawBody, "FAILED", null, `Database insert failed: ${leadError.message}`, startTime);
      return NextResponse.json({ error: "Failed to create lead" }, { status: 500 });
    }

    // --- NEW: Lead Routing & Assignment ---
    let assignedUserId: string | null = null;
    if (webhook.assignment_rule === "ROUND_ROBIN") {
      const { data: assignData, error: assignError } = await supabase.rpc(
        "assign_lead_round_robin", 
        { p_company_id: companyId, p_lead_id: lead.id }
      );
      
      if (assignError) {
        console.error("Round Robin assignment failed:", assignError);
      } else {
        assignedUserId = assignData;
      }
    } else if (webhook.assignment_rule === "SPECIFIC_AGENT" && webhook.assigned_agent_id) {
      // Assign to specific agent directly
      const { error: assignError } = await supabase
        .from("leads")
        .update({ assigned_to_id: webhook.assigned_agent_id })
        .eq("id", lead.id);
        
      if (!assignError) {
        assignedUserId = webhook.assigned_agent_id;
      }
    }

    // 9. Update Webhook Stats and Log Success
    await supabase
      .from("webhooks")
      .update({ 
        last_received_at: new Date().toISOString(),
      })
      .eq("id", webhookId);

    const { error: rpcError } = await supabase.rpc('increment_webhook_total', { webhook_id: webhookId });
    if (rpcError) {
      console.warn("RPC increment failed, possibly undefined", rpcError);
    }

    await logWebhook(webhookId!, rawBody, "SUCCESS", lead.id, null, startTime);

    return NextResponse.json({ 
      success: true, 
      lead_id: lead.id,
      assigned_to_id: assignedUserId,
      message: "Lead created and routed successfully" 
    });

  } catch (error: any) {
    console.error("Webhook processing error:", error);
    if (webhookId) {
      await logWebhook(webhookId, rawBody, "FAILED", null, `Unhandled exception: ${error.message}`, startTime);
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function logWebhook(
  webhookId: string, 
  payload: any, 
  status: "SUCCESS" | "FAILED" | "QUEUED", 
  leadId: string | null, 
  errorMessage: string | null,
  startTime: number
) {
  const processingMs = Date.now() - startTime;
  await supabase.from("webhook_logs").insert({
    webhook_id: webhookId,
    payload_json: payload,
    status: status,
    lead_created_id: leadId,
    error_message: errorMessage,
    processing_ms: processingMs
  });
}
