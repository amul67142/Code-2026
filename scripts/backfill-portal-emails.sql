-- ============================================================================
-- backfill-portal-emails.sql   —   run ONCE, by hand, after migration 026
--
-- Migration 026 and lib/leads/portal-email.ts only affect leads arriving from
-- now on. Leads already in the table still carry the portal relay address
-- (9541547393@99acres.com). This rewrites those to the same placeholder the
-- ingest pipeline would have produced, and keeps the relay in email_original.
--
-- The placeholders land on gmail.com, so they are indistinguishable from real
-- addresses by sight. email_is_synthetic is what marks them: BigLead reads it
-- before sending, hashing or exporting an address. Nothing outside BigLead
-- can tell, which is the accepted trade here.
--
-- Safe to re-run: rows already converted are skipped (email_is_synthetic).
-- Read the SELECT at the bottom first if you want to see the damage before
-- committing — wrap the whole thing in BEGIN; ... ROLLBACK; to rehearse.
-- ============================================================================

-- Preview: what is about to change, and how many.
SELECT count(*) AS rows_to_rewrite
FROM leads
WHERE email IS NOT NULL
  AND email_is_synthetic = false
  AND split_part(lower(email), '@', 2) IN (
    '99acres.com', 'magicbricks.com', 'housing.com', 'proptiger.com',
    'squareyards.com', 'commonfloor.com', 'nobroker.in', 'makaan.com'
  );

UPDATE leads AS l
SET email_original     = l.email,
    email_is_synthetic = true,
    email =
      -- Name, letters only, capped at 24 — portals stuff the number into the
      -- name field, and we append our own digits next.
      coalesce(
        nullif(left(regexp_replace(lower(coalesce(l.name, '')), '[^a-z]', '', 'g'), 24), ''),
        'lead'
      )
      -- Last four digits of the number, the way a person identifies it. No
      -- phone on the row (rare) falls back to a stable hash of the relay.
      || coalesce(
           nullif(right(regexp_replace(coalesce(l.phone, ''), '[^0-9]', '', 'g'), 4), ''),
           substr(md5(l.email), 1, 4)
         )
      || '@gmail.com',
    updated_at = now()
WHERE l.email IS NOT NULL
  AND l.email_is_synthetic = false
  AND split_part(lower(l.email), '@', 2) IN (
    '99acres.com', 'magicbricks.com', 'housing.com', 'proptiger.com',
    'squareyards.com', 'commonfloor.com', 'nobroker.in', 'makaan.com'
  );

-- Verify: every rewritten row, newest first.
SELECT name, phone, email, email_original, updated_at
FROM leads
WHERE email_is_synthetic
ORDER BY updated_at DESC
LIMIT 50;
