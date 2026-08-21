-- ============================================================================
-- 023_ai_agent.sql
-- AI Agent (WhatsApp chatbot): after the welcome template goes out and the
-- lead replies, an AI sales agent answers from the company's own knowledge,
-- qualifies against a configurable rubric, books site visits as tasks, and
-- escalates to a human in Live Chat.
--
-- Also fixes a latent webhook bug that only bites once a bot exists: Meta
-- RETRIES webhooks, and without inbound de-duplication a retry would make the
-- bot reply twice to the same message.
-- ============================================================================

-- ── 0. Inbound de-duplication (CRITICAL — must land with the bot) ──────────
-- One inbound row per WhatsApp message id. The webhook handler upserts on
-- this and short-circuits the agent when the row already exists.
CREATE UNIQUE INDEX IF NOT EXISTS uq_message_log_inbound_provider
  ON message_log (provider_id)
  WHERE direction = 'INBOUND' AND provider_id IS NOT NULL;

-- Mark who authored an outbound message: NULL = human/system (existing rows),
-- 'BOT' = the AI agent. Drives the "AI" chip in Live Chat.
ALTER TABLE message_log
  ADD COLUMN IF NOT EXISTS source TEXT;

-- ── 0b. Per-project welcome template ───────────────────────────────────────
-- The automatic welcome can differ per project; falls back to the
-- connection-level default_template when unset.
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS welcome_template TEXT,
  ADD COLUMN IF NOT EXISTS welcome_template_language TEXT;

-- ── 1. Agent config (one per company) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_agent_configs (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id          UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  enabled             BOOLEAN NOT NULL DEFAULT FALSE,
  -- SHADOW: the bot only writes drafts into Live Chat for a human to send.
  -- LIVE:   the bot replies on its own.
  mode                TEXT NOT NULL DEFAULT 'SHADOW' CHECK (mode IN ('SHADOW', 'LIVE')),
  -- Which LLM answers. MOCK = canned replies, no key and no cost (pipeline
  -- testing). GEMINI = Google's free tier (rate-limited, testing only).
  provider            TEXT NOT NULL DEFAULT 'ANTHROPIC' CHECK (provider IN ('ANTHROPIC', 'GEMINI', 'MOCK')),
  model               TEXT NOT NULL DEFAULT 'claude-opus-5',
  persona_name        TEXT NOT NULL DEFAULT 'Priya',
  persona_role        TEXT NOT NULL DEFAULT 'sales consultant',
  tone                TEXT NOT NULL DEFAULT 'FRIENDLY' CHECK (tone IN ('FRIENDLY', 'PROFESSIONAL', 'CASUAL')),
  languages           TEXT NOT NULL DEFAULT 'English, Hindi, Hinglish',
  custom_instructions TEXT,
  max_turns           INTEGER NOT NULL DEFAULT 30,
  qualified_stage_id  UUID REFERENCES pipeline_stages(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id)
);
CREATE TRIGGER trg_ai_cfg_updated_at BEFORE UPDATE ON ai_agent_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── 2. Knowledge documents (the prose the bot knows) ───────────────────────
-- Sent to the model as a cached prompt prefix — NOT retrieval. project_id
-- scopes a doc to one project; NULL = applies to every conversation.
CREATE TABLE IF NOT EXISTS ai_knowledge_docs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id  UUID REFERENCES projects(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  content     TEXT NOT NULL DEFAULT '',
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_docs_company ON ai_knowledge_docs(company_id, is_active);
CREATE TRIGGER trg_ai_docs_updated_at BEFORE UPDATE ON ai_knowledge_docs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── 3. Exact facts (prices, availability, RERA…) ───────────────────────────
-- The anti-hallucination layer: the bot may only quote numbers that appear
-- here VERBATIM. Anything not listed → "let me confirm" + escalate.
CREATE TABLE IF NOT EXISTS ai_facts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id  UUID REFERENCES projects(id) ON DELETE CASCADE,
  category    TEXT NOT NULL DEFAULT 'General',   -- Pricing / Availability / Legal / Location…
  label       TEXT NOT NULL,                     -- "3BHK price", "RERA number"
  value       TEXT NOT NULL,                     -- "₹2.45 Cr onwards", "RC/REP/HARERA/…"
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_facts_company ON ai_facts(company_id);
CREATE TRIGGER trg_ai_facts_updated_at BEFORE UPDATE ON ai_facts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── 4. Qualification rubric (what the bot asks, conversationally) ──────────
CREATE TABLE IF NOT EXISTS ai_qualification_fields (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  field_key     TEXT NOT NULL,                   -- "budget", "timeline", "configuration"
  label         TEXT NOT NULL,                   -- "Budget range"
  question_hint TEXT,                            -- how to ask it naturally
  input_type    TEXT NOT NULL DEFAULT 'TEXT' CHECK (input_type IN ('TEXT', 'CHOICE', 'NUMBER', 'YESNO')),
  options       JSONB NOT NULL DEFAULT '[]',     -- for CHOICE
  required      BOOLEAN NOT NULL DEFAULT TRUE,
  position      INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, field_key)
);
CREATE INDEX IF NOT EXISTS idx_ai_qf_company ON ai_qualification_fields(company_id, position);

-- ── 5. Per-lead structured memory ──────────────────────────────────────────
-- What the bot has LEARNED about a lead (budget, config, objections…). This
-- is what stops it re-asking questions, and it survives long gaps between
-- messages. Seeded from the lead's ad-form answers where available.
CREATE TABLE IF NOT EXISTS ai_lead_profiles (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  lead_id       UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  data          JSONB NOT NULL DEFAULT '{}',     -- { budget: "...", timeline: "..." }
  summary       TEXT,                            -- bot-maintained one-liner
  verdict       TEXT NOT NULL DEFAULT 'PENDING' CHECK (verdict IN ('PENDING', 'QUALIFIED', 'NOT_QUALIFIED')),
  qualified_at  TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (lead_id)
);
CREATE INDEX IF NOT EXISTS idx_ai_profiles_company ON ai_lead_profiles(company_id);
CREATE TRIGGER trg_ai_profiles_updated_at BEFORE UPDATE ON ai_lead_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── 6. Shadow-mode drafts ──────────────────────────────────────────────────
-- In SHADOW mode the bot writes its reply here instead of sending. Live Chat
-- shows the draft above the composer: Send / Edit / Discard.
CREATE TABLE IF NOT EXISTS ai_drafts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  lead_id     UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  draft_text  TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'DISCARDED')),
  sent_by_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_drafts_pending ON ai_drafts(company_id, lead_id, status);
CREATE TRIGGER trg_ai_drafts_updated_at BEFORE UPDATE ON ai_drafts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── 7. Run log (cost + debugging, per turn) ────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_runs (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id         UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  lead_id            UUID REFERENCES leads(id) ON DELETE SET NULL,
  model              TEXT,
  input_tokens       INTEGER NOT NULL DEFAULT 0,
  output_tokens      INTEGER NOT NULL DEFAULT 0,
  cache_read_tokens  INTEGER NOT NULL DEFAULT 0,
  cache_write_tokens INTEGER NOT NULL DEFAULT 0,
  latency_ms         INTEGER,
  tool_calls         JSONB NOT NULL DEFAULT '[]',
  outcome            TEXT,                        -- 'SENT' | 'DRAFTED' | 'SKIPPED' | 'ERROR'
  error              TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_runs_company ON ai_runs(company_id, created_at DESC);

-- ── 8. Conversation-level bot state ────────────────────────────────────────
ALTER TABLE wa_conversations
  ADD COLUMN IF NOT EXISTS bot_enabled    BOOLEAN NOT NULL DEFAULT TRUE,   -- per-thread kill switch
  ADD COLUMN IF NOT EXISTS human_takeover BOOLEAN NOT NULL DEFAULT FALSE,  -- human holds it, bot silent
  ADD COLUMN IF NOT EXISTS taken_by_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS taken_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS bot_turns      INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_bot_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS opted_out      BOOLEAN NOT NULL DEFAULT FALSE;  -- STOP — permanent

-- ── RLS (webhook/engine writes use the service role and bypass these) ──────
ALTER TABLE ai_agent_configs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_knowledge_docs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_facts                ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_qualification_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_lead_profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_drafts               ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_runs                 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members manage ai config"    ON ai_agent_configs        FOR ALL    USING (company_id = get_user_company_id());
CREATE POLICY "members manage ai docs"      ON ai_knowledge_docs       FOR ALL    USING (company_id = get_user_company_id());
CREATE POLICY "members manage ai facts"     ON ai_facts                FOR ALL    USING (company_id = get_user_company_id());
CREATE POLICY "members manage ai rubric"    ON ai_qualification_fields FOR ALL    USING (company_id = get_user_company_id());
CREATE POLICY "members view ai profiles"    ON ai_lead_profiles        FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "members manage ai drafts"    ON ai_drafts               FOR ALL    USING (company_id = get_user_company_id());
CREATE POLICY "members view ai runs"        ON ai_runs                 FOR SELECT USING (company_id = get_user_company_id());

-- Live draft bar in the inbox.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
     WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='ai_drafts') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE ai_drafts;
  END IF;
END $$;
