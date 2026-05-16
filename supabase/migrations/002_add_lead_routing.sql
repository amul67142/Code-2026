-- ============================================================================
-- Migration 002: Lead Routing Round Robin Implementation
-- ============================================================================

-- 1. Add is_receiving_leads to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_receiving_leads BOOLEAN NOT NULL DEFAULT TRUE;

-- 2. RPC function to assign a lead round robin
CREATE OR REPLACE FUNCTION assign_lead_round_robin(p_company_id UUID, p_lead_id UUID)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Find the user who hasn't received a lead in the longest time
  -- AND is actively receiving leads
  SELECT id INTO v_user_id
  FROM users
  WHERE company_id = p_company_id
    AND status = 'ACTIVE'
    AND is_receiving_leads = TRUE
    AND (role = 'AGENT' OR role = 'TEAM_LEAD')
  ORDER BY last_assigned_at ASC NULLS FIRST
  LIMIT 1
  FOR UPDATE; -- lock row to prevent concurrent assignment to same user

  IF v_user_id IS NOT NULL THEN
    -- Update lead with assigned user
    UPDATE leads SET assigned_to_id = v_user_id WHERE id = p_lead_id;
    -- Update user with current timestamp
    UPDATE users SET last_assigned_at = NOW() WHERE id = v_user_id;
  END IF;

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
