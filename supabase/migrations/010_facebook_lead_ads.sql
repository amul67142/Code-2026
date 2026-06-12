-- ============================================================================
-- Migration 010: Native Facebook Lead Ads Capture
-- ============================================================================

-- Status enum for Facebook connections
CREATE TYPE fb_connection_status AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED', 'ERROR');

-- 1. One row per connected Facebook Page, per company.
CREATE TABLE facebook_connections (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id            UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  page_id               TEXT NOT NULL,
  page_name             TEXT,
  -- AES-256-GCM encrypted long-lived Page Access Token (never store plaintext)
  page_access_token_enc TEXT NOT NULL,
  fb_user_id            TEXT,                 -- the FB user who connected
  connected_by_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  status                fb_connection_status NOT NULL DEFAULT 'ACTIVE',
  token_expires_at      TIMESTAMPTZ,          -- null = long-lived/non-expiring page token
  last_error            TEXT,
  subscribed_at         TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, page_id),
  UNIQUE (page_id)      -- a Page maps to exactly one tenant (prevents cross-tenant hijack)
);
CREATE INDEX idx_fb_conn_company ON facebook_connections(company_id);
CREATE INDEX idx_fb_conn_page ON facebook_connections(page_id);
CREATE TRIGGER trg_fb_conn_updated_at BEFORE UPDATE ON facebook_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Maps each Facebook Instant Form to a destination project + routing rules.
CREATE TABLE facebook_lead_forms (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id        UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  connection_id     UUID NOT NULL REFERENCES facebook_connections(id) ON DELETE CASCADE,
  form_id           TEXT NOT NULL,
  form_name         TEXT,
  project_id        UUID REFERENCES projects(id) ON DELETE SET NULL,
  assignment_rule   assignment_rule_type NOT NULL DEFAULT 'ROUND_ROBIN',
  assigned_agent_id UUID REFERENCES users(id) ON DELETE SET NULL,
  entry_stage_id    UUID REFERENCES pipeline_stages(id) ON DELETE SET NULL,
  duplicate_rule    duplicate_rule NOT NULL DEFAULT 'SKIP',
  auto_tags         TEXT[] DEFAULT '{}',
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  total_received    INTEGER DEFAULT 0,
  last_received_at  TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, form_id)
);
CREATE INDEX idx_fb_forms_company ON facebook_lead_forms(company_id);
CREATE INDEX idx_fb_forms_form ON facebook_lead_forms(form_id);
CREATE TRIGGER trg_fb_forms_updated_at BEFORE UPDATE ON facebook_lead_forms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. Raw webhook event log for debugging/replay (idempotency lives on
--    lead_source_meta.platform_lead_id which is already UNIQUE).
CREATE TABLE facebook_webhook_events (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  leadgen_id    TEXT UNIQUE,           -- dedupe at the event layer too
  page_id       TEXT,
  form_id       TEXT,
  status        webhook_log_status NOT NULL DEFAULT 'QUEUED',
  lead_id       UUID REFERENCES leads(id) ON DELETE SET NULL,
  error_message TEXT,
  raw_payload   JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_fb_events_leadgen ON facebook_webhook_events(leadgen_id);

-- 4. RLS — company isolation (service role bypasses for the webhook receiver)
ALTER TABLE facebook_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE facebook_lead_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE facebook_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members manage fb connections" ON facebook_connections
  FOR ALL USING (company_id = get_user_company_id());
CREATE POLICY "Company members manage fb forms" ON facebook_lead_forms
  FOR ALL USING (company_id = get_user_company_id());
-- events table: no tenant policy → only service role reads/writes it
