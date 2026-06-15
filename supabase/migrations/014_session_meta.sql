-- ============================================================================
-- Migration 014: Accurate session location
-- Supabase records the SERVER's IP for SSR logins (data-center location), so we
-- capture the real browser IP at login into session_meta and prefer it when
-- listing sessions. Updates get_my_sessions() to use the real IP.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.session_meta (
  session_id  UUID PRIMARY KEY,
  user_id     UUID,
  ip          TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Written/read only by the service role + the SECURITY DEFINER function below.
ALTER TABLE public.session_meta ENABLE ROW LEVEL SECURITY;

-- Prefer the real captured IP; fall back to the GoTrue-recorded IP.
CREATE OR REPLACE FUNCTION public.get_my_sessions()
RETURNS TABLE (
  id          uuid,
  user_agent  text,
  ip          text,
  created_at  timestamptz,
  updated_at  timestamptz,
  not_after   timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.id,
    s.user_agent,
    COALESCE(m.ip, host(s.ip)) AS ip,
    s.created_at,
    s.updated_at,
    s.not_after
  FROM auth.sessions s
  LEFT JOIN public.session_meta m ON m.session_id = s.id
  WHERE s.user_id = auth.uid()
  ORDER BY s.updated_at DESC NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_sessions() TO authenticated;
