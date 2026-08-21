# Trident Parktown — KB loading guide

Source: `C:\Users\DELL\Downloads\trident-parktown-chatbot-knowledge-base.md` (v2.1, 21 Aug 2026),
split into the AI Agent's three layers. **Adapted for WhatsApp**: the bot already knows the lead's
name and phone from the ad form, so every "may I take your name and number?" from the source became
"shall I arrange a callback?".

## Load order

1. **Projects → New**: create project **"Trident Parktown"** (so knowledge, facts and the welcome
   template can be scoped to it). Tag Trident leads with this project.
2. **AI Agent → Setup**: paste `instructions.md` into **Extra instructions**. Persona suggestion:
   name "Priya", role "sales consultant for Trident Parktown", tone Friendly,
   languages "English, Hindi, Hinglish".
3. **AI Agent → Products & Prices → Import CSV**: upload `facts.csv` (~35 rows). These are the ONLY
   numbers the bot may quote.
4. **AI Agent → Knowledge → Add document** ×3, each scoped to the Trident Parktown project:
   - `knowledge-1-project-and-location.md`
   - `knowledge-2-vistas-parks-clubhouse.md`
   - `knowledge-3-developer-legal-trust.md`
5. Enable the agent in **SHADOW mode** and replay a test message.

## What was deliberately NOT loaded

- **Section 13 intent tags** — our agent is LLM-driven, not an intent router; the blocked topics are
  enforced through the instructions + missing-facts escalation instead.
- **Section 12 conflict register** — the *resolutions* are loaded (official figures in facts.csv,
  "figures online vary" behaviour in instructions); the conflicting third-party claims themselves are
  kept OUT of the bot's context so it can never accidentally repeat one.
- **Source precedence rules (0.2)** — a compilation-time concern, already applied.

## Still open (from source Section 10 — chase the client)

| # | Item | Bot behaviour meanwhile |
|---|---|---|
| 2 | What ₹2.25 Cr includes/excludes | escalates |
| 3 | Site sales office address + project phone | gives corporate contact only |
| 4 | Confirmed plot size range | escalates |
| 5 | Payment plan schedules | names the two plans, escalates figures |
| 6 | Booking amount + process | escalates |
| 10 | Site visit timings/process | books the request as a task; team confirms |

When the client confirms any of these, add it as a **fact row** — no prompt changes needed.
