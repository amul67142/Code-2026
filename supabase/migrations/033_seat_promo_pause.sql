-- ============================================================================
-- 033_seat_promo_pause.sql
-- A client can switch their free-seats promo off and on from the billing page.
--
--   companies.free_seats_paused  TRUE = the promo is kept on the account but
--                                not applied: every seat beyond the included
--                                ones is charged. FALSE = free_seats applies.
-- ============================================================================

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS free_seats_paused BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN companies.free_seats_paused IS
  'The client switched their free-seats promo off. free_seats is kept so it can be switched back on.';

NOTIFY pgrst, 'reload schema';
