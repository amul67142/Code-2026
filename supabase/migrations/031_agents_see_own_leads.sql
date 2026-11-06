-- ============================================================================
-- 031_agents_see_own_leads.sql
-- An AGENT sees only the leads assigned to them.
--
-- Enforced here rather than page by page. The browser holds the public key, so
-- a filter in the app alone would still let an agent read every lead straight
-- from the API; and with the rule here, every page that reads as the logged-in
-- user (Leads, dashboard, reports, export, lead detail) is scoped at once.
--
-- Everyone else is unchanged: Super Admin, Admin, Team Lead and Read Only see
-- the whole company. Server code using the service role bypasses all of this.
--
-- Two things an agent therefore cannot do, which the app handles:
--  - Hand a lead to someone else. Postgres checks an UPDATE's new row against
--    the SELECT policy, so the row would leave their view mid-update.
--  - Add an unassigned lead and read it back. The app assigns those to them.
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_id()
RETURNS UUID AS $$
  SELECT id FROM users WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role::text FROM users WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- ── leads ───────────────────────────────────────────────────────────────────
-- (SELECT fn()) makes Postgres call these once per query, not once per row.
DROP POLICY IF EXISTS "Company members can view leads" ON leads;
DROP POLICY IF EXISTS "Company members can manage leads" ON leads;

CREATE POLICY "Members view leads"
  ON leads FOR SELECT
  USING (
    company_id = get_user_company_id()
    AND ((SELECT get_user_role()) <> 'AGENT' OR assigned_to_id = (SELECT get_user_id()))
  );

CREATE POLICY "Members add leads"
  ON leads FOR INSERT
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Members update leads"
  ON leads FOR UPDATE
  USING (
    company_id = get_user_company_id()
    AND ((SELECT get_user_role()) <> 'AGENT' OR assigned_to_id = (SELECT get_user_id()))
  )
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Members delete leads"
  ON leads FOR DELETE
  USING (
    company_id = get_user_company_id()
    AND ((SELECT get_user_role()) <> 'AGENT' OR assigned_to_id = (SELECT get_user_id()))
  );

-- ── Tables that repeat a lead's details ─────────────────────────────────────
-- activities, documents and lead_source_meta already go through a subquery on
-- leads, which the policies above now scope. These filter on company alone, so
-- they would still show an agent other agents' leads. The subquery on leads is
-- itself subject to the policies above.
DROP POLICY IF EXISTS "Company members can view message log" ON message_log;
CREATE POLICY "Company members can view message log"
  ON message_log FOR SELECT
  USING (
    company_id = get_user_company_id()
    AND ((SELECT get_user_role()) <> 'AGENT' OR lead_id IN (SELECT id FROM leads))
  );

DROP POLICY IF EXISTS "members manage ai drafts" ON ai_drafts;
CREATE POLICY "members manage ai drafts"
  ON ai_drafts FOR ALL
  USING (
    company_id = get_user_company_id()
    AND ((SELECT get_user_role()) <> 'AGENT' OR lead_id IN (SELECT id FROM leads))
  );

DROP POLICY IF EXISTS "members view ai profiles" ON ai_lead_profiles;
CREATE POLICY "members view ai profiles"
  ON ai_lead_profiles FOR SELECT
  USING (
    company_id = get_user_company_id()
    AND ((SELECT get_user_role()) <> 'AGENT' OR lead_id IN (SELECT id FROM leads))
  );

DROP POLICY IF EXISTS "members view ai runs" ON ai_runs;
CREATE POLICY "members view ai runs"
  ON ai_runs FOR SELECT
  USING (
    company_id = get_user_company_id()
    AND ((SELECT get_user_role()) <> 'AGENT' OR lead_id IN (SELECT id FROM leads))
  );

DROP POLICY IF EXISTS "members view crm logs" ON crm_delivery_logs;
CREATE POLICY "members view crm logs"
  ON crm_delivery_logs FOR SELECT
  USING (
    company_id = get_user_company_id()
    AND ((SELECT get_user_role()) <> 'AGENT' OR lead_id IN (SELECT id FROM leads))
  );

NOTIFY pgrst, 'reload schema';
