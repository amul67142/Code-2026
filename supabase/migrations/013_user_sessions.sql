-- ============================================================================
-- Migration 013: Active session listing (device/location management)
-- Returns the current user's own auth sessions so they can see where they're
-- logged in and revoke devices. auth.sessions isn't exposed via PostgREST, so
-- we use a SECURITY DEFINER function scoped strictly to auth.uid().
-- ============================================================================

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
    host(s.ip) AS ip,
    s.created_at,
    s.updated_at,
    s.not_after
  FROM auth.sessions s
  WHERE s.user_id = auth.uid()
  ORDER BY s.updated_at DESC NULLS LAST;
$$;

-- Only authenticated users can call it, and it only ever returns THEIR rows.
GRANT EXECUTE ON FUNCTION public.get_my_sessions() TO authenticated;
