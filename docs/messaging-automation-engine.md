# Messaging Automation Engine — Implementation Plan

> **Goal:** When a lead arrives, automatically fire a **multi-channel follow-up sequence** — **Email + WhatsApp + SMS** — so no lead is ever missed, and agents are nudged until they act. ("Speed-to-lead" + "never-miss follow-up.")
>
> **Scope:** Messaging only (Email, WhatsApp, SMS). **AI calling deferred** to a later phase.
> **WhatsApp provider:** **Meta WhatsApp Cloud API (direct)** — same "each client connects their own" model as the Facebook Lead Ads integration.
>
> **Companion docs:** `facebook-lead-ads-integration.md`, `facebook-lead-ads-build-journal.md`.

---

## 1. The Concept

```
Lead created (FB / webhook / manual)  ──► lib/leads/ingest.ts  ──► TRIGGER
        │
        ▼
  Automation Engine: run the matching workflow's steps
        │
   ┌────┼────────────────────────────┐
   ▼    ▼                             ▼
 t+0   t+1h (if no response)        t+1d ...
 Email WhatsApp                     SMS
   │
   ▼
 message_log (every send tracked)
```

- **Trigger** = an event (the big one: *lead created*).
- **Workflow** = a trigger + ordered **steps**. Each step = `delay + action`.
- **Action** = send Email / WhatsApp / SMS / create task / assign.
- **Multi-tenant**: each client connects their own channels (encrypted creds), like Facebook.

---

## 2. Architecture — 4 building blocks

| Block | What it does | Reuses |
|---|---|---|
| **Triggers** | Events that start a workflow: `LEAD_CREATED`, `STAGE_CHANGED`, `NO_RESPONSE` (time-based), `TASK_OVERDUE` | `ingestLead` hook |
| **Engine** | Runs a workflow's steps in order, honoring per-step delays | new |
| **Channels** | The senders: Email (Resend), WhatsApp (Cloud API), SMS (DLT gateway) | `lib/email`, `lib/integrations/crypto.ts` |
| **Credentials** | Per-client channel connections, encrypted | `crypto.ts` pattern from Facebook |

---

## 3. Data Model — Migration `011_messaging_automation.sql`

```sql
-- ============================================================================
-- Migration 011: Messaging Automation Engine
-- ============================================================================

CREATE TYPE automation_trigger AS ENUM ('LEAD_CREATED', 'STAGE_CHANGED', 'NO_RESPONSE', 'TASK_OVERDUE');
CREATE TYPE automation_action  AS ENUM ('SEND_EMAIL', 'SEND_WHATSAPP', 'SEND_SMS', 'CREATE_TASK', 'NOTIFY_AGENT');
CREATE TYPE message_channel    AS ENUM ('EMAIL', 'WHATSAPP', 'SMS');
CREATE TYPE message_status     AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED');
CREATE TYPE run_status         AS ENUM ('RUNNING', 'COMPLETED', 'STOPPED', 'FAILED');
CREATE TYPE channel_status     AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED', 'ERROR');

-- 1. Workflows (per company)
CREATE TABLE automation_workflows (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  trigger     automation_trigger NOT NULL DEFAULT 'LEAD_CREATED',
  trigger_config JSONB DEFAULT '{}',     -- e.g. { stage_id, source, no_response_minutes }
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_aw_company ON automation_workflows(company_id);
CREATE INDEX idx_aw_trigger ON automation_workflows(company_id, trigger, is_active);
CREATE TRIGGER trg_aw_updated_at BEFORE UPDATE ON automation_workflows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Ordered steps in a workflow
CREATE TABLE automation_steps (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id   UUID NOT NULL REFERENCES automation_workflows(id) ON DELETE CASCADE,
  step_order    INTEGER NOT NULL DEFAULT 0,
  delay_minutes INTEGER NOT NULL DEFAULT 0,   -- 0 = instant
  action        automation_action NOT NULL,
  action_config JSONB NOT NULL DEFAULT '{}',  -- { template_id | subject/body | message, task_type ... }
  -- skip the step if the lead already responded / was contacted
  skip_if_responded BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_as_workflow ON automation_steps(workflow_id, step_order);

-- 3. One run per lead per workflow (tracks position + when the next step is due)
CREATE TABLE automation_runs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  workflow_id   UUID NOT NULL REFERENCES automation_workflows(id) ON DELETE CASCADE,
  lead_id       UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  current_step  INTEGER NOT NULL DEFAULT 0,
  status        run_status NOT NULL DEFAULT 'RUNNING',
  next_run_at   TIMESTAMPTZ,                 -- the scheduler polls this
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workflow_id, lead_id)
);
CREATE INDEX idx_ar_due ON automation_runs(status, next_run_at);
CREATE TRIGGER trg_ar_updated_at BEFORE UPDATE ON automation_runs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. Every message sent (audit + delivery tracking)
CREATE TABLE message_log (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  lead_id       UUID REFERENCES leads(id) ON DELETE SET NULL,
  channel       message_channel NOT NULL,
  to_address    TEXT,                        -- email / phone
  template      TEXT,
  body          TEXT,
  status        message_status NOT NULL DEFAULT 'QUEUED',
  provider_id   TEXT,                         -- Resend id / WhatsApp message id / SMS id
  error_message TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_ml_company ON message_log(company_id, created_at DESC);
CREATE INDEX idx_ml_lead ON message_log(lead_id);

-- 5. Per-client channel connections (encrypted creds)
CREATE TABLE channel_connections (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  channel         message_channel NOT NULL,
  provider        TEXT,                        -- 'resend' | 'whatsapp_cloud' | 'msg91'
  -- WhatsApp Cloud: waba_id, phone_number_id; token encrypted
  external_id     TEXT,                        -- phone_number_id (WA) / sender id (SMS)
  waba_id         TEXT,
  credentials_enc TEXT,                        -- encrypted access token / api key
  from_value      TEXT,                        -- from email / WA display number / SMS sender id
  status          channel_status NOT NULL DEFAULT 'ACTIVE',
  config          JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, channel)
);
CREATE INDEX idx_cc_company ON channel_connections(company_id);
CREATE TRIGGER trg_cc_updated_at BEFORE UPDATE ON channel_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS — company isolation
ALTER TABLE automation_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_steps     ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_runs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_log          ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_connections  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members manage workflows" ON automation_workflows FOR ALL USING (company_id = get_user_company_id());
CREATE POLICY "members manage steps" ON automation_steps FOR ALL
  USING (workflow_id IN (SELECT id FROM automation_workflows WHERE company_id = get_user_company_id()));
CREATE POLICY "members view runs" ON automation_runs FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "members view messages" ON message_log FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "members manage channels" ON channel_connections FOR ALL USING (company_id = get_user_company_id());
-- runs/message inserts happen via service role (engine), bypassing RLS
```

---

## 4. The Engine — instant vs. delayed execution

### Instant steps (delay = 0)
Fire **inline from `ingestLead`** the moment a lead is created. WhatsApp + email go out in seconds.

### Delayed steps ("wait 1 hour then message")
Need a **scheduler**. Recommended: **Inngest** (durable functions, native `step.sleep`, retries). Fallback: a `next_run_at` column + a **Vercel Cron** route (you already have `CRON_SECRET`) polling due runs every minute.

```ts
// lib/automation/engine.ts  (called from ingestLead after a lead is created)
export async function startWorkflowsForLead(companyId: string, leadId: string) {
  // 1. find active workflows for this company with trigger LEAD_CREATED (+ matching trigger_config)
  // 2. for each: create automation_runs row, run step 0 if delay_minutes === 0,
  //    else set next_run_at = now + delay
}

export async function runDueSteps() {  // called by cron OR inngest
  // 1. select automation_runs where status=RUNNING and next_run_at <= now
  // 2. for each: load the current step, check skip_if_responded, dispatch the action,
  //    advance current_step, set next_run_at for the next step (or COMPLETED)
}

async function dispatchAction(run, step, lead) {
  switch (step.action) {
    case "SEND_EMAIL":    return sendEmail(...)      // lib/email (Resend)
    case "SEND_WHATSAPP": return sendWhatsApp(...)   // Cloud API
    case "SEND_SMS":      return sendSMS(...)        // DLT gateway
    case "CREATE_TASK":   return createTask(...)     // tasks table
    case "NOTIFY_AGENT":  return notify(...)         // notifications
  }
}
```

**Hook into the existing pipeline** — one line at the end of `lib/leads/ingest.ts`:
```ts
// after a lead is successfully created + assigned:
await startWorkflowsForLead(companyId, lead.id);
```

---

## 5. Channels

### 5.1 Email — Resend (already wired) 🟢 build first
- Reuse `lib/email`. Send via the company's `channel_connections` row (verified domain) or a shared default.
- `action_config`: `{ subject, body }` with `{{name}}`, `{{project}}` merge tags.
- Track the Resend message id in `message_log`. (Optional: a Resend webhook for delivered/opened.)

### 5.2 WhatsApp — Meta WhatsApp Cloud API (direct) 🟡 start setup in parallel

**Same multi-tenant pattern as Facebook:** ONE platform Meta App; each client connects their **own** WhatsApp Business Account (WABA) via **Embedded Signup**; you store their token encrypted.

**Platform setup (one-time, you):**
1. Add the **WhatsApp** product to your existing Meta App.
2. Configure **Embedded Signup** (a Facebook Login flow that onboards a client's WABA).
3. Permissions for App Review: `whatsapp_business_management`, `whatsapp_business_messaging`.
4. Set the WhatsApp **webhook** (messages field) → for delivery status + inbound replies.

**Per-client onboarding (Embedded Signup):**
1. Client clicks "Connect WhatsApp" → Embedded Signup → selects/creates their WABA + phone number.
2. Callback returns a code → exchange for the client's access token; read `waba_id` + `phone_number_id`.
3. **Register** the phone number; **subscribe** your app to the WABA's webhooks.
4. Store in `channel_connections` (channel=WHATSAPP, encrypted token, `phone_number_id`, `waba_id`).

**Sending a message:**
```ts
// lib/integrations/whatsapp.ts
const V = process.env.FACEBOOK_GRAPH_VERSION || "v21.0";
export async function sendWhatsAppTemplate(phoneNumberId, token, to, template, components) {
  const res = await fetch(`https://graph.facebook.com/${V}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,                                   // E.164 phone
      type: "template",
      template: { name: template, language: { code: "en" }, components },
    }),
  });
  return res.json(); // { messages: [{ id }] }
}
```

**Critical WhatsApp rules:**
- **Business-initiated messages require an approved TEMPLATE** (created in WhatsApp Manager; categories MARKETING/UTILITY). Free-text only allowed inside the **24-hour** window after the user messages you.
- **Opt-in required** — the lead must have consented (FB lead forms count as opt-in for utility/follow-up in many cases; confirm per use case).
- Store the message id from the response in `message_log`; update status via the webhook (sent → delivered → read).

### 5.3 SMS — India DLT gateway 🟡 later
- Provider: **MSG91 / Twilio**. India requires **DLT (TRAI) registration**: register your **sender ID** + **message templates** before sending.
- `channel_connections` holds the gateway API key (encrypted) + sender id.
- Lower priority than WhatsApp for India (WhatsApp has far higher engagement).

---

## 6. Multi-tenant credential model (recap)
Identical philosophy to Facebook:
- **Email:** platform Resend; client verifies their sending domain (or uses a shared default).
- **WhatsApp:** each client connects their **own** WABA via Embedded Signup → encrypted token per tenant.
- **SMS:** each client's gateway key / DLT sender id (or a shared platform sender to start).
- All secrets encrypted with `lib/integrations/crypto.ts` (AES-256-GCM).

---

## 7. The default "never-miss" workflow (seeded for new companies)

```
Trigger: LEAD_CREATED
  Step 0  (t+0)      NOTIFY_AGENT + CREATE_TASK "Call within 5 minutes"
  Step 1  (t+0)      SEND_WHATSAPP  template "new_lead_welcome"   (skip if no phone)
  Step 2  (t+0)      SEND_EMAIL     "Thanks for your interest"   (skip if no email)
  Step 3  (t+60min)  SEND_WHATSAPP  template "quick_followup"    (skip_if_responded)
  Step 4  (t+1day)   SEND_EMAIL     "Still interested?"          (skip_if_responded)
  Step 5  (t+3day)   SEND_SMS       "Last reminder"              (skip_if_responded)
```
`skip_if_responded` = if the lead replied or an agent logged contact, the remaining nudges stop automatically.

---

## 8. Build Phases

| Phase | Work | External wait? | Est. |
|---|---|---|---|
| **1. Engine + Email MVP** | Migration 011; `lib/automation/engine.ts`; hook into `ingestLead`; instant email via Resend; basic Settings UI to toggle + edit template | **None** | 2–3d |
| **2. Scheduler** | Inngest (or cron route) to run delayed steps; `skip_if_responded` logic | None | 1–2d |
| **3. WhatsApp** | Add WhatsApp product + Embedded Signup; `whatsapp.ts`; connect UI; template sending; status webhook | **Meta App Review** (parallel) | 3–4d |
| **4. Workflow builder UI** | Visual step editor (add steps, delays, pick channel + template) | None | 2–3d |
| **5. SMS** | DLT registration; gateway integration; SMS action | **DLT registration** (parallel) | 1–2d |
| **6. Inbound + 2-way** | Receive WhatsApp replies → log as activity → stop nudges → notify agent | None | 2d |

**Total: ~2 weeks of dev** + Meta WhatsApp review + DLT (both run in parallel).

---

## 9. Compliance checklist
- [ ] WhatsApp: templates approved; opt-in captured; respect 24-hour session rule.
- [ ] SMS: DLT sender id + templates registered (India).
- [ ] Email: unsubscribe link; sending domain authenticated (SPF/DKIM via Resend).
- [ ] All channel tokens encrypted at rest.
- [ ] Per-message audit in `message_log`; honor lead opt-out across all channels.

---

## 10. End-User Guide (the client/agency admin)

1. **Settings → Automations → Channels:** connect Email (verify domain), **Connect WhatsApp** (Embedded Signup), SMS (enter gateway).
2. **Settings → Automations → Workflows:** the default "New Lead Follow-up" is pre-built. Edit messages, delays, or toggle steps.
3. **Done** — every new lead now gets instant WhatsApp + email, the agent gets a "call now" task, and follow-ups fire automatically until the lead responds.
4. **Track:** Settings → Automations → Message Log shows every message + delivery status.

---

## 11. Recommended first step
**Phase 1 — Engine + Email MVP.** It needs **zero external setup** (Resend is wired), proves the entire trigger→step→action→log flow, and delivers instant value. WhatsApp (Phase 3) starts its Meta review in parallel.

*Last updated: June 10, 2026 — plan drafted; WhatsApp via Meta Cloud API; build not yet started.*
