-- ============================================================================
-- 022_promo_codes.sql
-- Promo codes (owner-generated) + real expiry enforcement support.
--
-- A promo code grants a company full access to a chosen plan for N days at
-- zero cost (investor/testing access). Redemptions are tracked so a company
-- can't redeem the same code twice and usage is capped per code.
-- ============================================================================

CREATE TABLE IF NOT EXISTS promo_codes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code          TEXT NOT NULL UNIQUE,               -- stored UPPERCASE
  description   TEXT,                               -- "Investor demo — Sharma family office"
  plan_id       UUID REFERENCES pricing_plans(id) ON DELETE SET NULL,
  duration_days INTEGER NOT NULL DEFAULT 30,
  max_uses      INTEGER NOT NULL DEFAULT 1,
  used_count    INTEGER NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at    TIMESTAMPTZ,                        -- code validity (NULL = never)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS promo_redemptions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  promo_id     UUID NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
  company_id   UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  redeemed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until  TIMESTAMPTZ NOT NULL,
  UNIQUE (promo_id, company_id)
);

CREATE INDEX IF NOT EXISTS idx_promo_redemptions_company ON promo_redemptions(company_id);

-- Which promo (if any) activated a subscription.
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS promo_code TEXT;

-- Owner-only data: RLS on, no user policies — all access via service role.
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_redemptions ENABLE ROW LEVEL SECURITY;
