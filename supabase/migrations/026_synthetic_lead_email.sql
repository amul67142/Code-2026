-- ============================================================================
-- 026_synthetic_lead_email.sql
-- Marks leads whose email address BigLead generated rather than received.
--
-- Property portals (99acres, MagicBricks, Housing) never pass the buyer's
-- real email. They send a masked relay — 9541547393@99acres.com, the lead's
-- own number at the portal's domain — which cannot be replied to and is dead
-- weight in the CRM. On ingest we replace it with a readable placeholder
-- built from the lead's name and number (lib/leads/portal-email.ts).
--
-- The placeholder lands on gmail.com so the receiving CRM accepts it, which
-- means it cannot be told apart from a real address by inspection. This
-- column is therefore the ONLY marker, and the gate that stops the
-- acknowledgment email, the manual resend and Meta's Conversions API from
-- ever using a made-up address.
-- email_original keeps the relay we replaced, since it is the only email
-- channel the portal offers if anyone ever needs it.
--
-- Existing rows default to false: every address already stored came in as-is
-- and keeps being treated as real.
-- ============================================================================

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS email_is_synthetic BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_original TEXT;

COMMENT ON COLUMN leads.email_is_synthetic IS
  'True when BigLead generated this email because the source sent a portal relay address. Never send mail to it and never hash it for ad-platform matching.';

COMMENT ON COLUMN leads.email_original IS
  'The portal relay address that email replaced, e.g. 9541547393@99acres.com. NULL when the email is the lead''s own.';

-- Partial index: the only query that cares is "which leads have a fake email",
-- and on a real table that is a small minority of rows.
CREATE INDEX IF NOT EXISTS idx_leads_email_synthetic
  ON leads (company_id)
  WHERE email_is_synthetic;

NOTIFY pgrst, 'reload schema';
