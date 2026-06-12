-- ============================================================================
-- Migration 012: WhatsApp Cloud API connections (per company / tenant)
-- Each company connects their own WhatsApp Business number. Messages send
-- FROM that number. Reuses fb_connection_status enum (migration 010) and
-- message_log (migration 011, channel = WHATSAPP).
-- ============================================================================

CREATE TABLE whatsapp_connections (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id         UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  phone_number_id    TEXT NOT NULL,                 -- WhatsApp Cloud API phone number id
  waba_id            TEXT,                          -- WhatsApp Business Account id
  display_phone      TEXT,                          -- human-readable number (e.g. +91…)
  access_token_enc   TEXT NOT NULL,                 -- AES-256-GCM encrypted token
  default_template   TEXT DEFAULT 'hello_world',    -- approved template used for the welcome message
  template_language  TEXT DEFAULT 'en_US',
  status             fb_connection_status NOT NULL DEFAULT 'ACTIVE',
  connected_by_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  last_error         TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id),                              -- one WhatsApp number per tenant (for now)
  UNIQUE (phone_number_id)                          -- a number can't belong to two tenants
);

CREATE INDEX idx_wa_conn_company ON whatsapp_connections(company_id);
CREATE INDEX idx_wa_conn_phone   ON whatsapp_connections(phone_number_id);
CREATE TRIGGER trg_wa_conn_updated_at BEFORE UPDATE ON whatsapp_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE whatsapp_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company members manage whatsapp connection"
  ON whatsapp_connections FOR ALL
  USING (company_id = get_user_company_id());
