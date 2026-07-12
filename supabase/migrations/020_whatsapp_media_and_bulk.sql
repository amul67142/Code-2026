-- ============================================================================
-- 020_whatsapp_media_and_bulk.sql
-- 1. Image headers on (marketing) WhatsApp templates:
--      header_image_url : public URL used at SEND time (image link component)
-- 2. Public storage bucket for WhatsApp media (created via API if missing —
--    this migration only documents it; bucket creation happens in code).
-- ============================================================================

ALTER TABLE whatsapp_templates
  ADD COLUMN IF NOT EXISTS header_image_url TEXT;
