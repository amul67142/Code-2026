-- ============================================================================
-- Migration 003: Add phone to users table
-- ============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
