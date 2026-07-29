-- ============================================================================
-- 021_whatsapp_livechat.sql
-- Live Chat (WhatsApp team inbox).
--
-- message_log gains full-text body, media references (media stays at Meta —
-- downloaded on demand, never stored by us), and delivery/read timestamps.
--
-- wa_conversations: one row per (company, lead) chat thread. Drives the inbox
-- list, the 24h customer-service window, unread counts, and ADMIN → AGENT
-- conversation assignment (chats are admin-only unless assigned).
-- ============================================================================

ALTER TABLE message_log
  ADD COLUMN IF NOT EXISTS body TEXT,
  ADD COLUMN IF NOT EXISTS media_id TEXT,
  ADD COLUMN IF NOT EXISTS media_type TEXT,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS wa_conversations (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id           UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  lead_id              UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  phone                TEXT,
  assigned_agent_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  last_inbound_at      TIMESTAMPTZ,           -- drives the 24h reply window
  last_message_at      TIMESTAMPTZ,
  last_message_preview TEXT,
  unread_count         INTEGER NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, lead_id)
);

CREATE INDEX IF NOT EXISTS idx_wa_conv_company ON wa_conversations(company_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_conv_agent   ON wa_conversations(assigned_agent_id);

ALTER TABLE wa_conversations ENABLE ROW LEVEL SECURITY;

-- Admins see all company conversations; agents only ones assigned to them.
DROP POLICY IF EXISTS "Chat visibility" ON wa_conversations;
CREATE POLICY "Chat visibility"
  ON wa_conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
        AND u.company_id = wa_conversations.company_id
        AND (u.role IN ('ADMIN', 'SUPER_ADMIN') OR u.id = wa_conversations.assigned_agent_id)
    )
  );

-- Live updates for the inbox (messages + conversation list).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
     WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='message_log') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE message_log;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
     WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='wa_conversations') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE wa_conversations;
  END IF;
END $$;
