-- ============================================================================
-- 032_custom_plans_split_billing.sql
-- Custom plans per company, platform fee and seats paid separately, and two
-- new promo code kinds.
--
--   companies.plan_*            A custom price for one company. NULL = Basic
--                               (₹1,999, 3 seats included, ₹899 per extra seat,
--                               from lib/billing/plans.ts).
--   companies.free_seats        Seats a FREE_SEATS promo makes free, for good.
--                               Seats up to max(included, free) cost nothing.
--   companies.first_month_promo_id
--                               A FIRST_MONTH code waiting for the company's
--                               first platform payment. Cleared when used.
--   subscriptions.seats_period_* The seat charges' own paid month. The
--                               platform month stays current_period_*.
--                               NULL = no seat charges are being paid (every
--                               seat is covered by the plan or a promo).
--   billing_orders.kind         PLATFORM (platform fee only) and SEAT_MONTH
--                               (seats only) join PLAN (both), SEATS (seats
--                               added mid-month) and CREDITS.
--   billing_orders amount 0     A 100%-off first month is still an order, so it
--                               is recorded and invoiced like any other.
--   promo_codes.kind            ACCESS (existing: free access for N days),
--                               FIRST_MONTH (% or ₹ off the first platform
--                               month), FREE_SEATS (first N seats free).
-- ============================================================================

-- ── Custom plan per company ────────────────────────────────────────────────

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS plan_platform_fee_inr INTEGER,
  ADD COLUMN IF NOT EXISTS plan_included_seats INTEGER,
  ADD COLUMN IF NOT EXISTS plan_seat_price_inr INTEGER,
  ADD COLUMN IF NOT EXISTS free_seats INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS free_seats_code TEXT,
  ADD COLUMN IF NOT EXISTS first_month_promo_id UUID REFERENCES promo_codes(id) ON DELETE SET NULL;

DO $$
BEGIN
  ALTER TABLE companies ADD CONSTRAINT companies_plan_platform_fee_check
    CHECK (plan_platform_fee_inr IS NULL OR plan_platform_fee_inr > 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  ALTER TABLE companies ADD CONSTRAINT companies_plan_included_seats_check
    CHECK (plan_included_seats IS NULL OR plan_included_seats >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  ALTER TABLE companies ADD CONSTRAINT companies_plan_seat_price_check
    CHECK (plan_seat_price_inr IS NULL OR plan_seat_price_inr > 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  ALTER TABLE companies ADD CONSTRAINT companies_free_seats_check CHECK (free_seats >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON COLUMN companies.plan_platform_fee_inr IS 'Custom monthly platform fee (GST-inclusive). NULL = Basic price.';
COMMENT ON COLUMN companies.plan_included_seats IS 'Seats the platform fee includes on a custom plan. NULL = Basic (3).';
COMMENT ON COLUMN companies.plan_seat_price_inr IS 'Custom monthly price per seat beyond the covered ones. NULL = Basic (899).';
COMMENT ON COLUMN companies.free_seats IS 'Seats a FREE_SEATS promo covers, for good. Seats up to max(included, free_seats) are free.';

-- ── Seats paid separately from the platform fee ────────────────────────────

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS seats_period_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS seats_period_end TIMESTAMPTZ;

-- Until now one payment bought both, so a running paid month with extra seats
-- has its seats paid to the same date.
UPDATE subscriptions
   SET seats_period_start = current_period_start,
       seats_period_end = current_period_end
 WHERE status = 'ACTIVE'
   AND seats > 3
   AND current_period_end IS NOT NULL
   AND seats_period_end IS NULL;

-- ── Orders ─────────────────────────────────────────────────────────────────

ALTER TABLE billing_orders DROP CONSTRAINT IF EXISTS billing_orders_kind_check;
ALTER TABLE billing_orders ADD CONSTRAINT billing_orders_kind_check
  CHECK (kind IN ('PLAN', 'PLATFORM', 'SEAT_MONTH', 'SEATS', 'CREDITS'));

ALTER TABLE billing_orders DROP CONSTRAINT IF EXISTS billing_orders_amount_inr_check;
ALTER TABLE billing_orders ADD CONSTRAINT billing_orders_amount_inr_check CHECK (amount_inr >= 0);

ALTER TABLE billing_orders
  ADD COLUMN IF NOT EXISTS platform_inr INTEGER,
  ADD COLUMN IF NOT EXISTS seats_inr INTEGER,
  ADD COLUMN IF NOT EXISTS discount_inr INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS promo_id UUID REFERENCES promo_codes(id) ON DELETE SET NULL;

-- ── Promo code kinds ───────────────────────────────────────────────────────

ALTER TABLE promo_codes
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'ACCESS',
  ADD COLUMN IF NOT EXISTS discount_percent INTEGER,
  ADD COLUMN IF NOT EXISTS discount_inr INTEGER,
  ADD COLUMN IF NOT EXISTS free_seats INTEGER;

DO $$
BEGIN
  ALTER TABLE promo_codes ADD CONSTRAINT promo_codes_kind_check
    CHECK (kind IN ('ACCESS', 'FIRST_MONTH', 'FREE_SEATS'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  ALTER TABLE promo_codes ADD CONSTRAINT promo_codes_discount_check CHECK (
    kind <> 'FIRST_MONTH'
    OR ((discount_percent BETWEEN 1 AND 100) AND discount_inr IS NULL)
    OR (discount_percent IS NULL AND discount_inr > 0)
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  ALTER TABLE promo_codes ADD CONSTRAINT promo_codes_free_seats_check
    CHECK (kind <> 'FREE_SEATS' OR free_seats BETWEEN 1 AND 1000);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- A FREE_SEATS code never runs out, so its redemption has no end date.
ALTER TABLE promo_redemptions ALTER COLUMN valid_until DROP NOT NULL;

NOTIFY pgrst, 'reload schema';
