-- ============================================================================
-- Migration 003: Lead Status Fields for Agent Updates
-- ============================================================================

ALTER TABLE leads ADD COLUMN IF NOT EXISTS status_1 TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS status_1_remark TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS status_2 TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS status_2_remark TEXT;
