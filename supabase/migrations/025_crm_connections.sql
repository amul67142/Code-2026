-- ============================================================================
-- 025_crm_connections.sql
-- Outbound connections — push leads from BigLead to another system.
--
-- The existing `webhooks` table is INBOUND (other systems send leads to us).
-- This is the opposite direction, and deliberately a separate table.
--
-- Two kinds:
--   WEBHOOK — just a URL. We POST the standard lead JSON. (Pabbly, Make, Zapier)
--   API     — full control: method, headers, and a body template with
--             {{placeholders}} for whatever shape the far end expects.
--
-- `auto_send` decides when it fires: ON = every new lead, the moment it lands.
-- OFF = nothing happens until someone picks leads and sends them by hand.
-- Default is OFF so creating a connection can never start leaking leads
-- before it has been tested.
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE crm_connection_type AS ENUM ('WEBHOOK', 'API');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS crm_connections (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id       UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  type             crm_connection_type NOT NULL DEFAULT 'WEBHOOK',

  url              TEXT NOT NULL,
  method           TEXT NOT NULL DEFAULT 'POST',
  -- Encrypted (AES-256-GCM) because headers routinely carry an API key.
  -- NULL means no custom headers.
  headers_enc      TEXT,
  -- NULL/empty means "send the standard lead JSON" — the WEBHOOK case.
  body_template    TEXT,

  -- NULL = every project. Set it to keep one source (99acres, say) flowing to
  -- one destination without dragging every other lead along with it.
  project_id       UUID REFERENCES projects(id) ON DELETE CASCADE,

  auto_send        BOOLEAN NOT NULL DEFAULT false,
  is_active        BOOLEAN NOT NULL DEFAULT true,

  last_delivery_at TIMESTAMPTZ,
  last_status      INTEGER,
  total_sent       INTEGER NOT NULL DEFAULT 0,
  total_failed     INTEGER NOT NULL DEFAULT 0,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_connections_company ON crm_connections(company_id);
-- The auto-send lookup on every new lead: company + enabled only.
CREATE INDEX IF NOT EXISTS idx_crm_connections_auto
  ON crm_connections(company_id) WHERE auto_send AND is_active;

DROP TRIGGER IF EXISTS trg_crm_connections_updated_at ON crm_connections;
CREATE TRIGGER trg_crm_connections_updated_at
  BEFORE UPDATE ON crm_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── Delivery log — what we sent and what came back ──────────────────────────
-- Without the response body a failing integration is unfixable: "it didn't
-- work" tells you nothing, `401 {"error":"invalid api key"}` tells you
-- everything.
CREATE TABLE IF NOT EXISTS crm_delivery_logs (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connection_id    UUID NOT NULL REFERENCES crm_connections(id) ON DELETE CASCADE,
  company_id       UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  lead_id          UUID REFERENCES leads(id) ON DELETE SET NULL,
  lead_name        TEXT,

  -- AUTO (fired by a new lead), MANUAL (sent from the leads table), TEST
  trigger_type     TEXT NOT NULL DEFAULT 'AUTO',

  request_url      TEXT,
  request_method   TEXT,
  request_body     TEXT,
  response_status  INTEGER,
  response_body    TEXT,
  error_message    TEXT,
  duration_ms      INTEGER,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_logs_connection
  ON crm_delivery_logs(connection_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_logs_company
  ON crm_delivery_logs(company_id, created_at DESC);

-- ── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE crm_connections   ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_delivery_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members manage crm connections" ON crm_connections;
CREATE POLICY "members manage crm connections" ON crm_connections
  FOR ALL USING (company_id = get_user_company_id());

DROP POLICY IF EXISTS "members view crm logs" ON crm_delivery_logs;
CREATE POLICY "members view crm logs" ON crm_delivery_logs
  FOR SELECT USING (company_id = get_user_company_id());

COMMENT ON TABLE crm_connections IS
  'Outbound destinations for leads (Pabbly webhook or a custom API). auto_send=false means manual-only.';
COMMENT ON COLUMN crm_connections.headers_enc IS
  'AES-256-GCM encrypted JSON object of request headers. Carries API keys — never store plaintext.';
