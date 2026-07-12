-- ============================================================================
-- 016_whatsapp_inbound.sql
-- Two-way WhatsApp: keyword-based auto-qualification config on a connection.
--
--   qualify_keywords : comma-separated words; if a lead's reply contains any of
--                      them, the lead is moved to qualify_stage_id.
--   qualify_stage_id : destination pipeline stage for a qualified reply.
-- Both optional — if unset, replies are still logged + the agent is notified,
-- but no automatic stage move happens.
-- ============================================================================

ALTER TABLE whatsapp_connections
  ADD COLUMN IF NOT EXISTS qualify_keywords TEXT,
  ADD COLUMN IF NOT EXISTS qualify_stage_id UUID
    REFERENCES pipeline_stages(id) ON DELETE SET NULL;
