/**
 * AI Agent — prompt builder.
 *
 * Two system blocks:
 *   1. The STABLE prefix (persona + rules + knowledge + facts + rubric) with
 *      a cache_control breakpoint — identical for every lead of a company, so
 *      Anthropic serves it from prompt cache at ~10% input cost.
 *   2. The per-lead block (who they are, what we already know) — small and
 *      volatile, placed AFTER the breakpoint so it never invalidates the cache.
 *
 * No RAG on purpose: the whole knowledge base is in context, which lets the
 * agent cross-reference facts the lead didn't ask about, never falsely claim
 * "I don't have that", and stay consistent across a long thread.
 */
import type { AgentContext } from "./context";

const TONE_LINES: Record<string, string> = {
  FRIENDLY:
    "Warm and helpful, like a good salesperson who genuinely wants to help — never pushy, never fake-excited.",
  PROFESSIONAL: "Polite, precise and businesslike. Courteous but not chatty.",
  CASUAL: "Relaxed and conversational, like texting a helpful acquaintance.",
};

/** The stable, cacheable system prefix for a company. */
export function buildStablePrefix(ctx: AgentContext): string {
  const { config } = ctx;
  const parts: string[] = [];

  parts.push(
    `You are ${config.persona_name}, a ${config.persona_role} at ${ctx.companyName}, chatting with a lead on WhatsApp. The lead enquired through an ad, received our welcome message, and has replied — your job is to help them, qualify them naturally, and move them toward a site visit or a call.`
  );

  parts.push(`# How you talk
- ${TONE_LINES[config.tone] || TONE_LINES.FRIENDLY}
- Keep messages SHORT: one to three lines. This is WhatsApp, not email. Never send paragraphs.
- Ask ONE question at a time. Acknowledge their answer briefly before the next question ("3BHK, got it.").
- Languages you speak: ${config.languages}. Mirror the lead's language — if they write in Hindi or Hinglish, reply the same way. Never force English.
- No markdown, no bullet lists, no headings. Plain WhatsApp text. At most one emoji occasionally, only when natural.
- Never re-ask something already answered — check WHAT WE KNOW and the conversation before asking.
- If asked whether you are a bot or AI: say yes honestly, that you're ${ctx.companyName}'s AI assistant, and offer to connect a human. Never pretend to be human when asked directly.
- Stay calm. Good salespeople don't chase. One gentle nudge toward the next step per message at most.`);

  parts.push(`# Hard rules (never break these)
- NEVER state a price, discount, availability, unit size, possession date, legal/RERA detail, or payment plan that is not written VERBATIM in EXACT FACTS below. If the answer isn't there, say you'll confirm the exact figure and use the escalate_to_human tool. A wrong number here causes real harm.
- You have NO authority to negotiate, offer discounts, or promise anything not in the knowledge.
- No advice on loans, legal matters or investments beyond what the knowledge states.
- Never invent details about the company, project, or other customers.
- If the lead asks to stop receiving messages (any phrasing, any language), use the stop_messaging tool immediately and send nothing more.
- If the lead is angry, abusive, or has a complaint you can't resolve, use escalate_to_human.`);

  if (ctx.rubric.length > 0) {
    const fields = ctx.rubric
      .map((f) => {
        const opts =
          f.input_type === "CHOICE" && f.options.length
            ? ` (options: ${f.options.join(" / ")})`
            : "";
        return `- ${f.field_key}: ${f.label}${f.required ? " [required]" : ""}${opts}${f.question_hint ? ` — ask naturally, e.g.: ${f.question_hint}` : ""}`;
      })
      .join("\n");
    parts.push(`# Qualification (weave in naturally — this is a conversation, not a form)
Learn these about the lead, in whatever order the conversation allows:
${fields}

Whenever you learn one of these (or anything else useful — objections, family needs, current home), call save_qualification with what you learned. When every [required] field is known and the lead looks like a genuine fit, call mark_qualified. Then propose the next step: a site visit first, a callback if they hesitate.`);
  }

  parts.push(`# Actions
- save_qualification: record facts as you learn them (also update the running summary).
- mark_qualified: the lead meets the rubric and is genuinely interested.
- book_site_visit: they agreed to visit — capture their preferred day/time; the team confirms the slot. Confirm to the lead that the visit is noted and someone will confirm timing.
- request_callback: they want to talk on the phone — capture when suits them.
- escalate_to_human: you're out of depth, they're upset, they asked for a human, or they need a fact you don't have. Tell the lead a teammate will take over shortly.
- stop_messaging: they asked to stop. Use it immediately; you may send one short goodbye only.`);

  if (ctx.docs.length > 0) {
    const kb = ctx.docs.map((d) => `## ${d.title}\n${d.content.trim()}`).join("\n\n");
    parts.push(`# KNOWLEDGE (everything you know — answer from here)\n${kb}`);
  } else {
    parts.push(
      `# KNOWLEDGE\n(No knowledge documents configured yet — keep answers general, and escalate anything specific.)`
    );
  }

  if (ctx.facts.length > 0) {
    const byCat = new Map<string, string[]>();
    for (const f of ctx.facts) {
      const list = byCat.get(f.category) || [];
      list.push(`- ${f.label}: ${f.value}`);
      byCat.set(f.category, list);
    }
    const factText = [...byCat.entries()]
      .map(([cat, rows]) => `## ${cat}\n${rows.join("\n")}`)
      .join("\n");
    parts.push(`# EXACT FACTS (quote these verbatim — the ONLY numbers you may state)\n${factText}`);
  } else {
    parts.push(
      `# EXACT FACTS\n(None configured — you may not quote ANY price, size, date or legal detail. Escalate those questions.)`
    );
  }

  if (config.custom_instructions?.trim()) {
    parts.push(`# Extra instructions from ${ctx.companyName}\n${config.custom_instructions.trim()}`);
  }

  return parts.join("\n\n");
}

/** The small per-lead system block (after the cache breakpoint). */
export function buildLeadBlock(ctx: AgentContext): string {
  const { lead } = ctx;
  const known: string[] = [];

  if (lead.name) known.push(`Name: ${lead.name}`);
  if (ctx.projectName) known.push(`Enquired about: ${ctx.projectName}`);
  if (lead.source) known.push(`Came from: ${lead.source}`);
  if (lead.bhk_preference) known.push(`Configuration interest (from their ad form): ${lead.bhk_preference}`);
  if (lead.property_type) known.push(`Property type: ${lead.property_type}`);
  if (lead.budget_min || lead.budget_max) {
    const fmt = (n: number) => `₹${(n / 10000000).toFixed(2)} Cr`.replace(".00", "");
    known.push(
      `Budget (from their ad form): ${lead.budget_min ? fmt(Number(lead.budget_min)) : "?"} – ${lead.budget_max ? fmt(Number(lead.budget_max)) : "?"}`
    );
  }
  if (lead.timeline) known.push(`Timeline: ${lead.timeline}`);
  if (lead.location_preference) known.push(`Location preference: ${lead.location_preference}`);

  const learned = Object.entries(ctx.profileData)
    .filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== "")
    .map(([k, v]) => `${k}: ${String(v)}`);

  const lines: string[] = [`# THIS LEAD`];
  lines.push(known.length ? known.join("\n") : "(no details captured yet)");
  if (learned.length) lines.push(`\n# WHAT WE KNOW (learned in conversation — never re-ask)\n${learned.join("\n")}`);
  if (ctx.profileSummary) lines.push(`\nSummary so far: ${ctx.profileSummary}`);
  lines.push(
    `\nUse what you already know: open in context (acknowledge their interest, don't re-ask the form questions), and personalise with their name sparingly.`
  );
  return lines.join("\n");
}

/** Map the stored transcript into Anthropic messages (chronological). */
export function buildHistoryMessages(
  ctx: AgentContext
): { role: "user" | "assistant"; content: string }[] {
  const msgs: { role: "user" | "assistant"; content: string }[] = [];
  for (const t of ctx.transcript) {
    const role = t.direction === "INBOUND" ? "user" : "assistant";
    // Collapse consecutive same-role turns (the API allows them, but merging
    // keeps the shape predictable and slightly smaller).
    const prev = msgs[msgs.length - 1];
    const text = t.body.slice(0, 1500);
    if (prev && prev.role === role) prev.content += `\n${text}`;
    else msgs.push({ role, content: text });
  }
  // The API requires the first message to be from the user. Our threads start
  // with the outbound welcome template — prepend a synthetic marker.
  if (msgs.length === 0 || msgs[0].role !== "user") {
    msgs.unshift({ role: "user", content: "[Lead submitted the ad enquiry form]" });
  }
  return msgs;
}
