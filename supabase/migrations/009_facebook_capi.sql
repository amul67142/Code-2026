-- Add Facebook Conversions API credentials and status configuration to projects table
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS facebook_pixel_id TEXT,
  ADD COLUMN IF NOT EXISTS facebook_conversions_token TEXT,
  ADD COLUMN IF NOT EXISTS facebook_test_event_code TEXT,
  ADD COLUMN IF NOT EXISTS facebook_integration_active BOOLEAN NOT NULL DEFAULT false;

-- Add qualification status column to leads table
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS is_qualified BOOLEAN DEFAULT NULL;
