"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCachedUserProfile } from "@/lib/auth/cached-user";
import { decryptToken } from "@/lib/integrations/crypto";
import { sendWhatsAppText, normalizeWhatsAppNumber } from "@/lib/integrations/whatsapp";
import { sendLeadWhatsApp } from "@/lib/automation/lead-whatsapp";

const WINDOW_MS = 24 * 60 * 60 * 1000;

function isAdmin(role?: string) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

/** Can this user see/act on this conversation? Admins: all. Agents: assigned only. */
async function canAccessConversation(
  profile: { id: string; company_id: string; role: string },
  leadId: string
) {
  const admin = createAdminClient();
  const { data: conv } = await admin
    .from("wa_conversations")
    .select("id, assigned_agent_id, last_inbound_at, phone, human_takeover, bot_enabled, opted_out")
    .eq("company_id", profile.company_id)
    .eq("lead_id", leadId)
    .maybeSingle();
  if (!conv) return { ok: false as const };
  if (isAdmin(profile.role) || conv.assigned_agent_id === profile.id) {
    return { ok: true as const, conv };
  }
  return { ok: false as const };
}

// ── Conversation list (role-filtered) ───────────────────────────
export async function getConversations() {
  const profile = await getCachedUserProfile();
  if (!profile?.company_id) return { conversations: [], isAdmin: false };

  const admin = createAdminClient();
  let q = admin
    .from("wa_conversations")
    .select("id, lead_id, phone, assigned_agent_id, last_inbound_at, last_message_at, last_message_preview, unread_count, leads(id, name), assigned_agent:users!wa_conversations_assigned_agent_id_fkey(id, name)")
    .eq("company_id", profile.company_id)
    .order("last_message_at", { ascending: false })
    .limit(100);

  if (!isAdmin(profile.role)) {
    q = q.eq("assigned_agent_id", profile.id);
  }

  const { data } = await q;
  return { conversations: data || [], isAdmin: isAdmin(profile.role) };
}

// ── Messages for one conversation ───────────────────────────────
export async function getChatMessages(leadId: string) {
  const profile = await getCachedUserProfile();
  if (!profile?.company_id) return { error: "Unauthorized" };
  const access = await canAccessConversation(profile, leadId);
  if (!access.ok) return { error: "Conversation not found" };

  const admin = createAdminClient();
  const [{ data }, { data: pendingDraft }] = await Promise.all([
    admin
      .from("message_log")
      .select("id, direction, body, subject, status, media_id, media_type, is_auto, source, created_at, delivered_at, read_at, error_message")
      .eq("company_id", profile.company_id)
      .eq("lead_id", leadId)
      .eq("channel", "WHATSAPP")
      .order("created_at", { ascending: true })
      .limit(500),
    admin
      .from("ai_drafts")
      .select("id, draft_text, created_at")
      .eq("company_id", profile.company_id)
      .eq("lead_id", leadId)
      .eq("status", "PENDING")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  // Opening the thread clears unread.
  await admin
    .from("wa_conversations")
    .update({ unread_count: 0, updated_at: new Date().toISOString() })
    .eq("company_id", profile.company_id)
    .eq("lead_id", leadId);

  const windowOpen =
    !!access.conv.last_inbound_at &&
    Date.now() - new Date(access.conv.last_inbound_at).getTime() < WINDOW_MS;
  const windowExpiresAt = access.conv.last_inbound_at
    ? new Date(new Date(access.conv.last_inbound_at).getTime() + WINDOW_MS).toISOString()
    : null;

  return {
    messages: data || [],
    windowOpen,
    windowExpiresAt,
    botState: {
      humanTakeover: !!access.conv.human_takeover,
      botEnabled: access.conv.bot_enabled !== false,
      optedOut: !!access.conv.opted_out,
    },
    pendingDraft: pendingDraft || null,
  };
}

// ── AI agent: take over / hand back a conversation ──────────────
export async function toggleBotTakeover(leadId: string, takeOver: boolean) {
  const profile = await getCachedUserProfile();
  if (!profile?.company_id) return { error: "Unauthorized" };
  const access = await canAccessConversation(profile, leadId);
  if (!access.ok) return { error: "Conversation not found" };

  const admin = createAdminClient();
  const { error } = await admin
    .from("wa_conversations")
    .update({
      human_takeover: takeOver,
      taken_by_id: takeOver ? profile.id : null,
      taken_at: takeOver ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", access.conv.id);
  if (error) return { error: "Failed to update" };
  return { success: true };
}

// ── AI agent: shadow-mode drafts ────────────────────────────────
export async function approveDraft(draftId: string, leadId: string, text: string) {
  const profile = await getCachedUserProfile();
  if (!profile?.company_id) return { error: "Unauthorized" };

  // Send exactly like a human message (window check included).
  const res = await sendChatMessage(leadId, text);
  if (res.error) return res;

  const admin = createAdminClient();
  await admin
    .from("ai_drafts")
    .update({ status: "SENT", sent_by_id: profile.id, updated_at: new Date().toISOString() })
    .eq("id", draftId)
    .eq("company_id", profile.company_id);
  return res;
}

export async function discardDraft(draftId: string) {
  const profile = await getCachedUserProfile();
  if (!profile?.company_id) return { error: "Unauthorized" };
  const admin = createAdminClient();
  await admin
    .from("ai_drafts")
    .update({ status: "DISCARDED", updated_at: new Date().toISOString() })
    .eq("id", draftId)
    .eq("company_id", profile.company_id);
  return { success: true };
}

// ── Send a free-text reply (inside the 24h window) ──────────────
export async function sendChatMessage(leadId: string, text: string) {
  const profile = await getCachedUserProfile();
  if (!profile?.company_id) return { error: "Unauthorized" };
  const body = (text || "").trim();
  if (!body) return { error: "Message is empty" };
  if (body.length > 4000) return { error: "Message too long (max 4000 characters)" };

  const access = await canAccessConversation(profile, leadId);
  if (!access.ok) return { error: "Conversation not found" };

  // Meta rule: free text only within 24h of the lead's last message.
  const windowOpen =
    !!access.conv.last_inbound_at &&
    Date.now() - new Date(access.conv.last_inbound_at).getTime() < WINDOW_MS;
  if (!windowOpen) {
    return { windowClosed: true, error: "The 24-hour reply window has closed — send your template to re-open the conversation." };
  }

  const admin = createAdminClient();
  const [{ data: conn }, { data: lead }] = await Promise.all([
    admin
      .from("whatsapp_connections")
      .select("phone_number_id, access_token_enc, status")
      .eq("company_id", profile.company_id)
      .maybeSingle(),
    admin.from("leads").select("phone").eq("id", leadId).maybeSingle(),
  ]);
  if (!conn || conn.status !== "ACTIVE") return { error: "WhatsApp is not connected" };
  if (!lead?.phone) return { error: "This lead has no phone number" };

  const to = normalizeWhatsAppNumber(lead.phone);
  try {
    const res = await sendWhatsAppText(
      conn.phone_number_id,
      decryptToken(conn.access_token_enc),
      to,
      body
    );
    const nowIso = new Date().toISOString();
    const { data: inserted } = await admin
      .from("message_log")
      .insert({
        company_id: profile.company_id,
        lead_id: leadId,
        channel: "WHATSAPP",
        direction: "OUTBOUND",
        to_address: to,
        subject: body.slice(0, 300),
        body,
        status: "SENT",
        provider_id: res.messages?.[0]?.id || null,
        is_auto: false,
      })
      .select("id, created_at")
      .single();

    await admin
      .from("wa_conversations")
      .update({
        last_message_at: nowIso,
        last_message_preview: body.slice(0, 120),
        updated_at: nowIso,
      })
      .eq("id", access.conv.id);

    return { success: true, id: inserted?.id, createdAt: inserted?.created_at };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Send failed" };
  }
}

// ── Re-open a closed window with the approved welcome template ──
export async function sendChatTemplate(leadId: string) {
  const profile = await getCachedUserProfile();
  if (!profile?.company_id) return { error: "Unauthorized" };
  const access = await canAccessConversation(profile, leadId);
  if (!access.ok) return { error: "Conversation not found" };

  const admin = createAdminClient();
  const { data: lead } = await admin
    .from("leads")
    .select("name, phone, project_id")
    .eq("id", leadId)
    .maybeSingle();
  if (!lead?.phone) return { error: "This lead has no phone number" };

  const res = await sendLeadWhatsApp({
    companyId: profile.company_id,
    leadId,
    leadName: lead.name,
    leadPhone: lead.phone,
    projectId: lead.project_id,
    isAuto: false,
  });
  if (res.status !== "SENT") return { error: res.error || "Template send failed" };

  const nowIso = new Date().toISOString();
  await admin
    .from("wa_conversations")
    .update({ last_message_at: nowIso, last_message_preview: "📋 Template sent", updated_at: nowIso })
    .eq("id", access.conv.id);

  return { success: true };
}

// ── Assign / unassign a conversation to an agent (admin only) ───
export async function assignConversation(leadId: string, agentId: string | null) {
  const profile = await getCachedUserProfile();
  if (!profile?.company_id) return { error: "Unauthorized" };
  if (!isAdmin(profile.role)) return { error: "Admin access required" };

  const admin = createAdminClient();
  const { error } = await admin
    .from("wa_conversations")
    .update({ assigned_agent_id: agentId, updated_at: new Date().toISOString() })
    .eq("company_id", profile.company_id)
    .eq("lead_id", leadId);
  if (error) return { error: "Failed to assign conversation" };

  if (agentId && agentId !== profile.id) {
    const { data: lead } = await admin.from("leads").select("name").eq("id", leadId).maybeSingle();
    await admin.from("notifications").insert({
      company_id: profile.company_id,
      user_id: agentId,
      title: `💬 Chat assigned: ${lead?.name || "a lead"}`,
      message: "A WhatsApp conversation was assigned to you in Live Chat.",
      type: "CHAT_ASSIGNED",
      metadata: { lead_id: leadId },
    });
  }

  revalidatePath("/inbox");
  return { success: true };
}
