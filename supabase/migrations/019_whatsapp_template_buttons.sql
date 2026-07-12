-- ============================================================================
-- 019_whatsapp_template_buttons.sql
-- Interactive actions (buttons) on WhatsApp templates:
--   [{ "type": "QUICK_REPLY", "text": "..." },
--    { "type": "URL", "text": "...", "url": "https://..." },
--    { "type": "PHONE_NUMBER", "text": "...", "phone_number": "+91..." }]
-- Meta limits: 25-char button titles, ≤10 quick replies, ≤2 URL, ≤1 phone.
-- ============================================================================

ALTER TABLE whatsapp_templates
  ADD COLUMN IF NOT EXISTS buttons JSONB NOT NULL DEFAULT '[]'::jsonb;
