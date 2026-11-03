-- ============================================================================
-- 027_agent_whatsapp_alerts.sql
-- WhatsApp alerts to the AGENT when a lead lands on them.
--
-- The in-app bell only rings while the CRM is open in a browser, which is not
-- where a field agent lives. This sends the lead's name and number to the
-- agent's own WhatsApp the moment it is assigned, so they can tap and call.
--
-- Three separate concerns:
--
-- 1. whatsapp_templates.purpose — a template written FOR THE LEAD ("thanks for
--    your interest") must never be picked as an agent alert, and vice versa.
--    Grouping them by purpose is what stops that mix-up in the picker.
--    Existing templates were all written as lead welcomes, so that is their
--    default; retag any that were not.
--
-- 2. users — per-agent opt-in, their own WhatsApp number, which template, and
--    which lead field feeds each {{n}} in it. Defaults to name then number,
--    which is what an agent actually needs to start dialling.
--
-- 3. message_log.recipient_type — an alert to an agent is NOT outreach to the
--    lead. Without this, the lead's WhatsApp thread in Live Chat, the WhatsApp
--    logs page and the 30-day analytics would all count internal alerts as
--    messages sent to the customer.
-- ============================================================================

-- ── 1. Template purpose ────────────────────────────────────────────────────

ALTER TABLE whatsapp_templates
  ADD COLUMN IF NOT EXISTS purpose TEXT NOT NULL DEFAULT 'LEAD_WELCOME';

DO $$
BEGIN
  ALTER TABLE whatsapp_templates
    ADD CONSTRAINT whatsapp_templates_purpose_check
    CHECK (purpose IN ('LEAD_WELCOME', 'AGENT_LEAD_ALERT', 'OTHER'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON COLUMN whatsapp_templates.purpose IS
  'Who the template is written for: LEAD_WELCOME (sent to the prospect), AGENT_LEAD_ALERT (sent to our own agent when a lead is assigned), OTHER.';

CREATE INDEX IF NOT EXISTS idx_wa_templates_purpose
  ON whatsapp_templates (company_id, purpose, status);

-- ── 2. Per-agent alert settings ────────────────────────────────────────────

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS wa_notify_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS wa_notify_template TEXT,
  ADD COLUMN IF NOT EXISTS wa_notify_template_language TEXT,
  ADD COLUMN IF NOT EXISTS wa_notify_variables JSONB NOT NULL
    DEFAULT '["lead_name","lead_phone"]'::jsonb;

COMMENT ON COLUMN users.phone IS
  'The agent''s own WhatsApp number, for lead alerts. Not the lead''s number.';
COMMENT ON COLUMN users.wa_notify_enabled IS
  'If true, WhatsApp this agent the lead name and number when a lead is assigned to them.';
COMMENT ON COLUMN users.wa_notify_variables IS
  'Ordered lead-field keys feeding the template body variables: the first fills {{1}}, the second {{2}}, and so on. Keys are defined in lib/automation/agent-lead-alert.ts.';

-- Only agents who opted in and gave a number can be alerted.
CREATE INDEX IF NOT EXISTS idx_users_wa_notify
  ON users (company_id)
  WHERE wa_notify_enabled;

-- ── 3. Keep internal alerts out of lead-facing message history ─────────────

ALTER TABLE message_log
  ADD COLUMN IF NOT EXISTS recipient_type TEXT NOT NULL DEFAULT 'LEAD';

DO $$
BEGIN
  ALTER TABLE message_log
    ADD CONSTRAINT message_log_recipient_type_check
    CHECK (recipient_type IN ('LEAD', 'AGENT'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON COLUMN message_log.recipient_type IS
  'LEAD = sent to the prospect. AGENT = an internal alert to one of our own users about that lead; excluded from lead conversation views and outreach analytics.';

CREATE INDEX IF NOT EXISTS idx_ml_recipient
  ON message_log (company_id, recipient_type, channel, created_at DESC);

NOTIFY pgrst, 'reload schema';
