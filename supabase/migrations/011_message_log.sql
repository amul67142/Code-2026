-- ============================================================================
-- Migration 011: Message Log (lead messaging automation — email first)
-- Tracks every message sent to a lead (email now; WhatsApp/SMS later).
-- ============================================================================

CREATE TYPE message_channel AS ENUM ('EMAIL', 'WHATSAPP', 'SMS');
CREATE TYPE message_status  AS ENUM ('SENT', 'DELIVERED', 'OPENED', 'REPLIED', 'FAILED', 'BOUNCED');

CREATE TABLE message_log (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  lead_id       UUID REFERENCES leads(id) ON DELETE SET NULL,
  channel       message_channel NOT NULL DEFAULT 'EMAIL',
  direction     TEXT NOT NULL DEFAULT 'OUTBOUND',   -- OUTBOUND | INBOUND
  to_address    TEXT,
  subject       TEXT,
  status        message_status NOT NULL DEFAULT 'SENT',
  provider_id   TEXT,                                -- Resend message id (for webhook matching)
  error_message TEXT,
  opened_at     TIMESTAMPTZ,
  replied_at    TIMESTAMPTZ,
  is_auto       BOOLEAN NOT NULL DEFAULT TRUE,        -- auto-sent vs manual resend
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ml_company   ON message_log(company_id, created_at DESC);
CREATE INDEX idx_ml_lead      ON message_log(lead_id, created_at DESC);
CREATE INDEX idx_ml_provider  ON message_log(provider_id);
CREATE INDEX idx_ml_channel   ON message_log(company_id, channel, status);

-- RLS: company members can read their own message log.
-- Inserts/updates happen via the service role (automation engine + provider webhooks).
ALTER TABLE message_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view message log"
  ON message_log FOR SELECT
  USING (company_id = get_user_company_id());
