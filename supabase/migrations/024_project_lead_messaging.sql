-- ============================================================================
-- 024_project_lead_messaging.sql
-- Per-project switch for instant lead messaging.
--
-- When a lead enters a project with auto_message_leads = true, the CRM sends
-- the acknowledgment email and the WhatsApp welcome template immediately (the
-- existing behaviour). When false, NEITHER is sent automatically — manual
-- sends from the lead page still work.
--
-- Defaults to true so every existing project keeps behaving exactly as it
-- does today. Only projects explicitly switched off go quiet.
-- ============================================================================

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS auto_message_leads BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN projects.auto_message_leads IS
  'If true, new leads in this project get an instant acknowledgment email + WhatsApp welcome. If false, no automatic messages are sent to leads.';
