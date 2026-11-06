-- ============================================================================
-- 029_weighted_lead_routing.sql
-- Some agents should get more leads than others.
--
-- users.lead_weight is each agent's share. With shares of 5, 3 and 3, every 11
-- leads split exactly 5, 3, 3, then the cycle carries on. A share is a ratio,
-- not a daily limit: nobody ever stops receiving leads because of it.
--
-- Smooth weighted round robin. Each lead, every agent earns their share into
-- users.lead_credit; the agent with the most credit gets the lead and pays back
-- the total of all shares. That spreads an agent's leads through the cycle
-- instead of handing them over in one block, so a quiet day with four leads
-- still reaches everyone. When shares tie, the higher share goes first, then
-- whoever has waited longest.
--
-- Every agent starts at 1, which is plain round robin: nothing changes for a
-- company until it sets shares.
-- ============================================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS lead_weight INT NOT NULL DEFAULT 1 CHECK (lead_weight BETWEEN 1 AND 100),
  ADD COLUMN IF NOT EXISTS lead_credit INT NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION assign_lead_round_robin(p_company_id UUID, p_lead_id UUID)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_total INT;
BEGIN
  -- One assignment per company at a time: two leads landing together must not
  -- both read the same credits.
  PERFORM pg_advisory_xact_lock(hashtextextended('assign_lead:' || p_company_id::text, 0));

  SELECT SUM(lead_weight) INTO v_total
  FROM users
  WHERE company_id = p_company_id
    AND status = 'ACTIVE'
    AND deleted_at IS NULL
    AND is_receiving_leads = TRUE
    AND (role = 'AGENT' OR role = 'TEAM_LEAD');

  IF v_total IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE users SET lead_credit = lead_credit + lead_weight
  WHERE company_id = p_company_id
    AND status = 'ACTIVE'
    AND deleted_at IS NULL
    AND is_receiving_leads = TRUE
    AND (role = 'AGENT' OR role = 'TEAM_LEAD');

  SELECT id INTO v_user_id
  FROM users
  WHERE company_id = p_company_id
    AND status = 'ACTIVE'
    AND deleted_at IS NULL
    AND is_receiving_leads = TRUE
    AND (role = 'AGENT' OR role = 'TEAM_LEAD')
  ORDER BY lead_credit DESC, lead_weight DESC, last_assigned_at ASC NULLS FIRST, id
  LIMIT 1;

  UPDATE leads SET assigned_to_id = v_user_id WHERE id = p_lead_id;
  UPDATE users SET lead_credit = lead_credit - v_total, last_assigned_at = NOW() WHERE id = v_user_id;

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Only the server assigns leads. As SECURITY DEFINER this must not be callable
-- with the public anon key.
REVOKE EXECUTE ON FUNCTION assign_lead_round_robin(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION assign_lead_round_robin(UUID, UUID) TO service_role;

NOTIFY pgrst, 'reload schema';
