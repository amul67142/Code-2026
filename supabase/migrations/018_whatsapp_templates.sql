-- ============================================================================
-- 018_whatsapp_templates.sql
-- Client-managed WhatsApp message templates.
--
-- Clients create templates in the CRM → we submit them to Meta → Meta reviews
-- them → we sync the approval status back. Approved templates can then be used
-- as the auto-welcome message.
--
-- Also adds a sync throttle to whatsapp_connections so the "Sync status" button
-- can't be spammed against Meta's API (first re-sync after 1 min, then 5 min).
-- ============================================================================

CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id        UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,                    -- lowercase_with_underscores
  language          TEXT NOT NULL DEFAULT 'en_US',
  category          TEXT NOT NULL DEFAULT 'UTILITY',  -- UTILITY | MARKETING
  body_text         TEXT NOT NULL,                    -- with {{1}}, {{2}} ... placeholders
  sample_values     JSONB DEFAULT '[]'::jsonb,        -- example values for the variables
  status            TEXT NOT NULL DEFAULT 'PENDING',  -- PENDING | APPROVED | REJECTED | PAUSED | DISABLED
  meta_template_id  TEXT,                             -- Meta's template id
  rejection_reason  TEXT,
  created_by_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, name, language)
);

CREATE INDEX IF NOT EXISTS idx_wa_templates_company ON whatsapp_templates(company_id, created_at DESC);

ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;

-- Company members can read their own templates. Writes go via the service role.
CREATE POLICY "Company members can view whatsapp templates"
  ON whatsapp_templates FOR SELECT
  USING (company_id = get_user_company_id());

-- Sync throttle columns on the connection.
ALTER TABLE whatsapp_connections
  ADD COLUMN IF NOT EXISTS templates_last_sync_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS templates_sync_count INTEGER NOT NULL DEFAULT 0;
