-- ============================================================================
-- 030_lead_status_slots.sql
-- Six status slots per lead instead of two.
--
-- Slots open two at a time: fill and save 1 and 2, and 3 and 4 appear; fill
-- those, and 5 and 6 appear. Anything after that goes in the activity log.
-- Plain nullable columns, like status_1 and status_2 (migration 003).
-- ============================================================================

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS status_3 TEXT,
  ADD COLUMN IF NOT EXISTS status_3_remark TEXT,
  ADD COLUMN IF NOT EXISTS status_4 TEXT,
  ADD COLUMN IF NOT EXISTS status_4_remark TEXT,
  ADD COLUMN IF NOT EXISTS status_5 TEXT,
  ADD COLUMN IF NOT EXISTS status_5_remark TEXT,
  ADD COLUMN IF NOT EXISTS status_6 TEXT,
  ADD COLUMN IF NOT EXISTS status_6_remark TEXT;

NOTIFY pgrst, 'reload schema';
