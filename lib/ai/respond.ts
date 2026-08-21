/**
 * AI Agent — orchestrator.
 *
 * Called (via next/server `after()`) for each inbound WhatsApp message, once
 * the existing pipeline has logged it. Applies every gate, runs the agent,
 * then either SENDS the reply (LIVE mode) or writes a DRAFT into Live Chat
 * (SHADOW mode). All failures are swallowed and logged — the bot must never
 * break the webhook.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptToken } from "@/lib/integrations/crypto";
import {
  sendWhatsAppText,
  sendWhatsAppTyping,
  normalizeWhatsAppNumber,
} from "@/lib/integrations/whatsapp";
import { getAgentConfig, loadAgentContext } from "./context";
import { runAgentTurn } from "./agent";
import { splitMessages, typingDelayMs, sleep } from "./humanize";

export interface AiRespondInput {
  companyId: string;
  leadId: string;
  /** The inbound message that triggered this run (webhook provider id). */
  waMessageId: string;
  text: string;
  /** True when the inbound was a media message (photo/doc) — bot stays out. */
  isMedia: boolean;
}

/** Obvious opt-out phrasings caught in code (the model catches the rest). */
const OPT_OUT_RE =
  /\b(stop|unsubscribe|opt ?out|don'?t (message|msg|text)|band karo|mat (bhejo|karo)|remove me)\b/i;

export async function maybeAiRespond(input: AiRespondInput): Promise<void> {
  try {
    const admin = createAdminClient();

    // Gate 0 — feature enabled for this company at all?
    const config = await getAgentConfig(input.companyId);
    if (!config?.enabled) return;

    // Gate 1 — conversation-level state.
    const { data: conv } = await admin
      .from("wa_conversations")
      .select("id, bot_enabled, human_takeover, opted_out, bot_turns")
      .eq("company_id", input.companyId)
      .eq("lead_id", input.leadId)
      .maybeSingle();
    if (!conv) return;
    if (conv.opted_out || conv.human_takeover || conv.bot_enabled === false) return;

    // Gate 2 — media: leave photos/documents to a human.
    if (input.isMedia) return;

    // Gate 3 — hard opt-out phrasing, handled without burning a model call.
    if (OPT_OUT_RE.test(input.text)) {
      await admin
        .from("wa_conversations")
        .update({ opted_out: true, updated_at: new Date().toISOString() })
        .eq("id", conv.id);
      await admin.from("activities").insert({
        lead_id: input.leadId,
        user_id: null,
        type: "WHATSAPP",
        description: "Lead opted out of WhatsApp messages.",
        metadata: { via: "ai_agent_optout" },
      });
      if (config.mode === "LIVE") {
        await sendBotMessages(input.companyId, input.leadId, conv.id, [
          "Understood — you won't receive any more messages from us. Thank you for your time.",
        ]);
      }
      return;
    }

    // Gate 4 — turn cap: escalate once instead of looping forever.
    if ((conv.bot_turns || 0) >= (config.max_turns || 30)) {
      await admin
        .from("wa_conversations")
        .update({ human_takeover: true, taken_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", conv.id);
      return;
    }

    // Pre-flight race check — if the lead already sent a NEWER message
    // (rapid-fire texting), skip before paying for a model turn the post-run
    // check would discard anyway. The newer message's own run answers with
    // the fuller context.
    if (await newerInboundExists(input)) return;

    // Human rhythm: blue-tick their message and show "typing…" while the
    // model thinks (WhatsApp clears it when our reply lands). LIVE only —
    // in shadow mode no bot reply is coming, so typing would be a lie.
    if (config.mode === "LIVE") {
      showTyping(input).catch(() => {});
    }

    // Load everything and run the turn.
    const ctx = await loadAgentContext(input.companyId, input.leadId, config);
    if (!ctx) return;
    const turnStarted = Date.now();
    const turn = await runAgentTurn(ctx);
    const turnElapsed = Date.now() - turnStarted;
    if (!turn.reply || turn.error) return;

    // Post-run race check — the lead may have sent ANOTHER message while the
    // model was thinking; the newer webhook's run answers with fuller context.
    if (await newerInboundExists(input)) return;

    const parts = splitMessages(turn.reply);

    if (config.mode === "SHADOW") {
      // Replace any pending draft with the fresh one, surface it in Live Chat.
      await admin
        .from("ai_drafts")
        .update({ status: "DISCARDED", updated_at: new Date().toISOString() })
        .eq("company_id", input.companyId)
        .eq("lead_id", input.leadId)
        .eq("status", "PENDING");
      await admin.from("ai_drafts").insert({
        company_id: input.companyId,
        lead_id: input.leadId,
        draft_text: parts.join("\n\n"),
        status: "PENDING",
      });
      return;
    }

    // LIVE — type like a human, then send. If the model itself was already
    // slow, the wait is baked in — don't add more on top.
    if (turnElapsed < 5000) await sleep(typingDelayMs(parts[0]));
    await sendBotMessages(input.companyId, input.leadId, conv.id, parts);
  } catch (e) {
    console.error("maybeAiRespond failed (non-fatal):", e);
  }
}

/** Fire-and-forget typing indicator on the triggering inbound message. */
async function showTyping(input: AiRespondInput): Promise<void> {
  const admin = createAdminClient();
  const { data: conn } = await admin
    .from("whatsapp_connections")
    .select("phone_number_id, access_token_enc, status")
    .eq("company_id", input.companyId)
    .maybeSingle();
  if (!conn || conn.status !== "ACTIVE") return;
  await sendWhatsAppTyping(
    conn.phone_number_id,
    decryptToken(conn.access_token_enc),
    input.waMessageId
  );
}

/** True when a newer inbound than the triggering message has been logged. */
async function newerInboundExists(input: AiRespondInput): Promise<boolean> {
  const admin = createAdminClient();
  const { data: latest } = await admin
    .from("message_log")
    .select("provider_id, direction")
    .eq("company_id", input.companyId)
    .eq("lead_id", input.leadId)
    .eq("channel", "WHATSAPP")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (
    !!latest &&
    latest.direction === "INBOUND" &&
    latest.provider_id !== input.waMessageId
  );
}

/** Send message parts from the company's number and log them as BOT sends. */
async function sendBotMessages(
  companyId: string,
  leadId: string,
  convId: string,
  parts: string[]
): Promise<void> {
  const admin = createAdminClient();

  const [{ data: conn }, { data: lead }] = await Promise.all([
    admin
      .from("whatsapp_connections")
      .select("phone_number_id, access_token_enc, status")
      .eq("company_id", companyId)
      .maybeSingle(),
    admin.from("leads").select("phone").eq("id", leadId).maybeSingle(),
  ]);
  if (!conn || conn.status !== "ACTIVE" || !lead?.phone) return;

  const to = normalizeWhatsAppNumber(lead.phone);
  const token = decryptToken(conn.access_token_enc);

  for (let i = 0; i < parts.length; i++) {
    if (i > 0) await sleep(typingDelayMs(parts[i]));
    try {
      const res = await sendWhatsAppText(conn.phone_number_id, token, to, parts[i]);
      const nowIso = new Date().toISOString();
      await admin.from("message_log").insert({
        company_id: companyId,
        lead_id: leadId,
        channel: "WHATSAPP",
        direction: "OUTBOUND",
        to_address: to,
        subject: parts[i].slice(0, 300),
        body: parts[i],
        status: "SENT",
        provider_id: res.messages?.[0]?.id || null,
        is_auto: true,
        source: "BOT",
      });
      await admin
        .from("wa_conversations")
        .update({
          last_message_at: nowIso,
          last_message_preview: parts[i].slice(0, 120),
          last_bot_at: nowIso,
          bot_turns: (await currentTurns(convId)) + 1,
          updated_at: nowIso,
        })
        .eq("id", convId);
    } catch (e) {
      console.error("Bot send failed:", e);
      return; // don't attempt part 2 if part 1 failed
    }
  }
}

async function currentTurns(convId: string): Promise<number> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("wa_conversations")
    .select("bot_turns")
    .eq("id", convId)
    .maybeSingle();
  return data?.bot_turns || 0;
}
