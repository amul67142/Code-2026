# AI Agent (WhatsApp Chatbot) — Implementation Plan

> **Status: BUILT (2026-08-21), not yet deployed.** Migration 023 must be run in the
> Supabase SQL editor, and `ANTHROPIC_API_KEY` added to `.env.local`, before anything works.
> Built: migration 023 · `lib/ai/` (context, prompt, tools, agent, humanize, respond) · hook in
> `lib/leads/whatsapp-inbound.ts` (+ inbound dedupe) · per-project welcome in
> `lib/automation/lead-whatsapp.ts` · `/ai-agent` pages (overview, setup, knowledge, facts,
> qualification) · sidebar sections (desktop + mobile) · Live Chat integration (AI tag,
> take-over/hand-back, shadow-mode draft bar) · `scripts/replay-whatsapp-webhook.mjs` test harness.
> **Three providers, switchable from AI Agent → Setup** (`lib/ai/providers/`):
> `ANTHROPIC` (best quality, paid, prompt-cached) · `GEMINI` (**free tier**, key from
> aistudio.google.com/apikey, rate-limited → testing only) · `MOCK` (canned replies, no key, no cost
> — tests the whole pipeline).
> **No consumer subscription includes API access** — not Claude Max, not ChatGPT Plus, not Gemini
> Advanced. Those are per-seat licences for a human; an app calling the API is billed separately.
> Google is the exception only because AI Studio hands out a free API tier to any Google account.
> Companion docs: `messaging-automation-engine.md`, `facebook-lead-ads-integration.md`, `PROJECT-CONTEXT.md`.

---

## 1. What this adds

BigLead already answers leads *mechanically* — welcome template, keyword qualification, human live chat.
This adds the missing layer: **an AI agent that actually talks to the lead** on WhatsApp, answers
questions from the company's own material, qualifies against a configurable rubric, books site visits
as tasks, and escalates to a human cleanly.

Sold as a BigLead feature, this is the difference between "a CRM with WhatsApp" and "a CRM that works
your leads for you". AiSensy and Wati do not do this.

**First real user:** Trident Realty (real estate, Gurugram), whose leads arrive from Meta ads.

### Why it is cheap to build here

The hard parts already exist and are debugged. Reusing them, not rebuilding:

| Already built | File |
|---|---|
| Webhook: HMAC verify, rate limit, text/button/media parsing | `app/api/webhooks/whatsapp/route.ts` |
| Inbound routing: company lookup, lead match, logging, activity | `lib/leads/whatsapp-inbound.ts` |
| Send template / free text, phone normalisation | `lib/integrations/whatsapp.ts` |
| 24-hour window state | `wa_conversations.last_inbound_at` |
| Live chat inbox, ticks, assignment, realtime | `app/(app)/inbox/` |
| Templates + Meta approval sync | `settings/whatsapp-templates` |
| Per-tenant encrypted tokens | `whatsapp_connections` |

**Only the brain is missing.** Estimated new code: one migration, `lib/ai/` (~600 lines), four pages.

---

## 2. Where it plugs in — one function

`lib/leads/whatsapp-inbound.ts`, immediately after the existing conversation upkeep (step 3b) and
keyword qualification (step 5):

```
inbound message
  → existing: resolve company, match lead, log, update wa_conversations, keyword qualify
  → NEW: if (bot enabled && !human_takeover && !opted_out && turns < cap)
           runAgent(conversation) → reply or draft
```

Nothing upstream or downstream changes. If the bot is disabled, behaviour is exactly as today.

### Critical prerequisite — inbound de-duplication

`processInboundWhatsApp` does not currently dedupe on `provider_id`. Meta **retries webhooks**, and
today a retry only writes a duplicate `message_log` row — harmless. **Once a bot exists, a retry means
the lead receives two AI replies.** Migration 023 must add a unique index on
`message_log(provider_id)` where `direction = 'INBOUND'`, and the insert becomes an upsert that
short-circuits the agent on conflict. This is not optional.

---

## 3. How the AI works

**No RAG, no LangChain.** The company's knowledge fits in a cached prompt prefix, which reads as more
human than retrieval — it can cross-reference facts nobody asked about ("you mentioned your office is
in Cyber City" → volunteers the commute), never falsely says "I don't have that", and stays consistent
across a long thread. Anthropic SDK called directly; the agent loop is ours.

### Per inbound message

1. Load config, knowledge, facts, lead profile, recent turns.
2. Build request: **cached prefix** (persona + rules + knowledge) → lead profile → history → new message.
3. Model replies, or calls a tool.
4. Tools execute, results return, model writes the final reply.
5. Humanise: strip markdown, split into 1–2 WhatsApp-sized messages, apply a 3–8 s typing delay.
6. Send via the existing sender; log to `message_log` with `is_auto = true`, `source = 'BOT'`.

### Tools

| Tool | Does |
|---|---|
| `lookup_fact` | Reads `ai_facts` — prices, availability, RERA, possession. **Never paraphrased.** |
| `save_qualification` | Writes answers into `ai_lead_profiles`, scores against the rubric |
| `book_site_visit` | Creates a task for the assigned agent (uses the existing tasks system) |
| `request_callback` | Creates a task + notifies the agent |
| `move_stage` | Moves the lead to the configured qualified stage (reuses `qualify_stage_id`) |
| `escalate_to_human` | Flags the conversation in Live Chat + notifies |

### Two-layer memory

- **Recent transcript** — the last N turns verbatim.
- **`ai_lead_profiles`** — a structured record the agent updates (budget, configuration, timeline,
  purpose, objections). This is what stops it re-asking things, and it survives long gaps: a lead who
  returns after five days is answered in context, not from scratch.

Seeded from the **lead's ad-form answers**, which BigLead already captures — so the bot opens already
knowing what they typed into the Facebook form instead of asking budget again.

### Guardrails (built in from the first commit)

- **Never state a price or availability not returned by `lookup_fact`** — otherwise confirm and escalate.
  A hallucinated ₹ figure on a client's own WhatsApp number is their legal problem.
- **Opt-out** — STOP / "band karo" / unsubscribe → permanent, no further messages, ever.
- **Turn cap** — after N turns with no outcome, force escalation.
- **Quiet hours** — the bot answers 24/7, but bot-initiated follow-ups respect working hours.
- **Human takeover wins** — while a human holds the conversation the bot is silent.
- **Shadow mode** (default on first install) — the bot writes a *draft* into Live Chat instead of
  sending. A human reads it and hits send. Tune the persona against real conversations at zero risk to
  the client's leads or the number's quality rating, then flip to live.

---

## 4. Data model — migration `023_ai_agent.sql`

Follows existing conventions: `company_id` everywhere, RLS with `get_user_company_id()`, service-role
writes from the webhook, `updated_at` triggers.

| Table | Purpose |
|---|---|
| `ai_agent_configs` | One per company. enabled, mode (`SHADOW`/`LIVE`), persona name + role, tone, languages, max_turns, working hours, model, escalation rules |
| `ai_knowledge_docs` | Prose knowledge — title + content, active flag, token estimate. This is the cached prefix. |
| `ai_facts` | Exact values: project, key, value, unit, `updated_at`. The anti-hallucination layer. |
| `ai_qualification_fields` | The configurable rubric — field, label, the question to ask, type, options, required, order |
| `ai_lead_profiles` | Per lead: JSONB answers, score, verdict, qualified_at |
| `ai_drafts` | Shadow-mode suggestions: text, status (`PENDING`/`SENT`/`DISCARDED`) |
| `ai_runs` | Per turn: tokens in/out, cache reads, latency, model, tools called, error. Cost and debugging. |

**Alters:**
- `wa_conversations` — `bot_enabled`, `human_takeover`, `taken_by_id`, `taken_at`, `bot_turns`, `last_bot_at`, `opted_out`
- `message_log` — `source` (`AGENT` / `BOT` / `SYSTEM`), plus the inbound unique index above

Per the project rule: **run the migration in the Supabase SQL editor before/with the deploy**, or
features silently break.

---

## 5. UI — new sidebar section

Design follows the existing system exactly: monochrome white/gray (GoHighLevel-style, `--primary`
`#111827`), **no colourful gradients or glow** — that was rejected before. shadcn/@base-ui primitives
from `components/ui/`, lucide icons, `sonner` toasts, `date-fns`. Settings pages use
`max-w-4xl mx-auto space-y-6`, a back link with `ArrowLeft`, `text-2xl font-bold tracking-tight` for
the h1 and `text-sm text-muted-foreground` beneath.

```
AI Agent            (Bot icon, minRole ADMIN)
  ├── Overview       /ai-agent              status, master switch, today's numbers, recent chats
  ├── Setup          /ai-agent/setup        persona, tone, languages, rules, mode, escalation
  ├── Knowledge      /ai-agent/knowledge    the documents the bot knows, with a live token meter
  ├── Products       /ai-agent/facts        exact prices/availability table the bot may quote
  └── Qualification  /ai-agent/qualification the rubric: what to ask, what counts as qualified
```

**Live Chat stays the single inbox.** Bot messages appear in `/inbox` exactly like agent messages,
with a small "AI" marker, plus per-conversation controls: **Take over** (bot goes silent),
**Hand back**, and in shadow mode a **draft bar** showing the suggested reply with Send / Edit /
Discard.

### One small refactor needed

`components/app-shell/sidebar.tsx` renders children using a single `settingsOpen` state, so a second
parent with children would toggle in lockstep with Settings. Generalise to a per-item open map — a
few lines, no behaviour change for Settings.

---

## 6. Build order

| Phase | Work | Blocked by |
|---|---|---|
| 0 | Migration 023 + inbound dedupe fix | — |
| 1 | `lib/ai/` — config loader, prompt builder, agent loop, tools, humaniser | Anthropic key |
| 2 | Setup + Knowledge + Products + Qualification pages | — |
| 3 | Hook into `whatsapp-inbound.ts`; shadow mode drafts | — |
| 4 | Live Chat integration: AI marker, take over / hand back, draft bar | — |
| 5 | Overview page: conversations, qualified count, escalations, token spend | — |
| 6 | Local end-to-end test on the Meta **test number** | Tunnel |

### Local testing without touching production

**Do not repoint the BigLead app's webhook at a tunnel** — a Meta app has one webhook URL, and BigLead's
live inbound would silently stop.

Safe options, in order of preference:

1. **Test locally against the database only** — replay saved webhook payloads into
   `processInboundWhatsApp` with a script. Exercises the whole agent path with zero Meta involvement.
   This covers ~90% of the work.
2. **Tunnel during a quiet window**, with the webhook repointed deliberately and restored after. Fine
   for a short live test if no real leads are in flight.
3. A second Meta app with its free test number — cleanest isolation, but you said App Review makes a new
   app expensive, so treat this as optional.

---

## 7. Cost

Model spend is small next to the retainer. Per conversation (25k cached knowledge, ~20 turns):
Haiku 4.5 ≈ ₹11 · Sonnet 5 ≈ ₹33 · Opus 5 ≈ ₹55. At 120 conversations/month that is ₹1,300–6,600 —
noise against what this feature is worth per client. Cache reads cost 10% of normal input, which is
what makes a large knowledge base affordable. `ai_runs` tracks it per company so it can later back a
credit system, like the bulk-send constants already anticipate.

---

## 8. What is required from the user

1. **Anthropic API key**
2. **Trident's material** — website copy, brochure, price list, project facts, RERA number, possession
   date, configurations and areas
3. **Trident's ad creatives + the exact Meta lead-form questions** — the form answers seed the bot's
   memory, and the ad sets what the lead expects
4. **Qualification definition** — what makes a Trident lead qualified (budget band, timeline,
   configuration, end-use vs investment)
5. **Decision on `docs/` open items below**

## 9. Open decisions

- [ ] Shadow mode first, or straight to live with a daily cap? (Recommended: shadow.)
- [ ] Model: Haiku 4.5 / Sonnet 5 / Opus 5 — set per company in `ai_agent_configs`, so this is a config
      value, not a fork.
- [ ] Site visits as tasks (recommended, uses what exists) or a real calendar integration.
- [ ] Does this stay Trident-only at first, or ship to all BigLead tenants behind a plan gate?

*Drafted: 2026-08-21.*
