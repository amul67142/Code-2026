-- ============================================================================
-- 015_performance_indexes.sql
-- Targeted performance indexes for the hottest query paths.
--
-- The schema was already thoroughly indexed (all company_id filters, FKs,
-- sort columns). This migration only closes 3 real gaps found by tracing the
-- actual queries in app/(app)/leads/actions.ts and the list/kanban/my-leads
-- pages. No redundant indexes are added.
--
-- Data is small today, so plain CREATE INDEX is fine. If these tables ever grow
-- large, prefer CREATE INDEX CONCURRENTLY (run outside a transaction) to avoid
-- write locks during the build.
-- ============================================================================

-- ── Gap 1: the main Leads list + Kanban query ───────────────────────────────
-- Every leads query filters `deleted_at IS NULL` and sorts by created_at DESC,
-- but no existing index includes the deleted_at predicate. A PARTIAL index that
-- only contains non-deleted rows is the ideal match: smaller, and lets Postgres
-- satisfy filter + sort straight from the index.
--   Query: WHERE company_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_leads_active_created
  ON leads (company_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- ── Gap 2: the "My Leads" / agent view ──────────────────────────────────────
-- Agents see only their own active leads, newest first.
--   Query: WHERE company_id = $1 AND assigned_to_id = $2 AND deleted_at IS NULL
--          ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_leads_assigned_active
  ON leads (company_id, assigned_to_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- ── Gap 3: the search box (name / phone / email) ────────────────────────────
-- The search uses ILIKE '%term%' (leading wildcard). B-tree indexes CANNOT
-- serve a leading-wildcard match, so today every search does a full table scan.
-- Trigram (pg_trgm) GIN indexes make substring/ILIKE search fast.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_leads_name_trgm
  ON leads USING gin (name gin_trgm_ops)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_leads_phone_trgm
  ON leads USING gin (phone gin_trgm_ops)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_leads_email_trgm
  ON leads USING gin (email gin_trgm_ops)
  WHERE deleted_at IS NULL;

-- Refresh planner stats so it uses the new indexes immediately.
ANALYZE leads;
