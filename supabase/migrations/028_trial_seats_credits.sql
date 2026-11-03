-- ============================================================================
-- 028_trial_seats_credits.sql
-- 5-day free trial, seat-based Basic plan, and prepaid WhatsApp credits.
--
-- Economics live in lib/billing/plans.ts (one place to change a price). This
-- migration only holds state:
--
--   subscriptions.trial_ends_at  set once, by Start free trial. A TRIALING row
--                                WITHOUT it is a checkout still waiting for
--                                payment and grants no access — exactly as
--                                before. Only a real trial unlocks the CRM.
--   subscriptions.seats          paid seats. Every active or invited user
--                                except READ_ONLY takes one.
--   trial_claims                 one free trial per signup phone number, so a
--                                fresh email cannot buy another five days.
--   billing_orders               every one-time Razorpay order (plan month,
--                                extra seats, credits). Fulfilment flips
--                                CREATED -> PAID exactly once, which is what
--                                makes the browser confirmation and the
--                                webhook safe to both arrive.
--   credit_wallets / ledger      prepaid WhatsApp credits. A template send
--                                HOLDS one credit; delivery CHARGES it; failure
--                                or no news within 72h REFUNDS it. So the
--                                customer pays per delivered template, and a
--                                burst of sends can never overdraw the wallet.
--   billing_reminders            one row per reminder sent, so the daily cron
--                                never messages the same owner twice.
--   companies.is_platform        SpaceTrans itself: never billed, never locked,
--                                and the WhatsApp number reminders come from.
-- ============================================================================

-- ── Platform company ───────────────────────────────────────────────────────

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS is_platform BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN companies.is_platform IS
  'The operator''s own workspace (SpaceTrans). Exempt from trial, lock, seats and credits; its WhatsApp connection sends billing reminders.';

UPDATE companies SET is_platform = true
WHERE id = 'bfba42e0-75f2-4461-a25c-604b73d950e4';

-- Only one company may be the platform: two would make "who sends the
-- reminder" ambiguous.
CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_one_platform
  ON companies (is_platform) WHERE is_platform;

-- ── Trial + seats on the subscription ──────────────────────────────────────

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS seats INTEGER NOT NULL DEFAULT 3;

DO $$
BEGIN
  ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_seats_check CHECK (seats >= 1);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS trial_claims (
  phone       TEXT PRIMARY KEY,            -- digits only, country code included
  company_id  UUID REFERENCES companies(id) ON DELETE SET NULL,
  claimed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE trial_claims ENABLE ROW LEVEL SECURITY;   -- service role only

-- ── One-time orders ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS billing_orders (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id           UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  kind                 TEXT NOT NULL CHECK (kind IN ('PLAN', 'SEATS', 'CREDITS')),
  seats                INTEGER,             -- PLAN: seats bought; SEATS: seats added
  credits              INTEGER,             -- CREDITS: credits bought
  amount_inr           INTEGER NOT NULL CHECK (amount_inr > 0),
  razorpay_order_id    TEXT UNIQUE NOT NULL,
  razorpay_payment_id  TEXT UNIQUE,
  status               TEXT NOT NULL DEFAULT 'CREATED' CHECK (status IN ('CREATED', 'PAID')),
  created_by_id        UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at              TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_billing_orders_company
  ON billing_orders (company_id, created_at DESC);
ALTER TABLE billing_orders ENABLE ROW LEVEL SECURITY;  -- service role only

-- Invoices: say what was bought, and make one payment one invoice. The
-- webhook used to insert a fresh invoice every time Razorpay retried.
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS billing_order_id UUID REFERENCES billing_orders(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_payment_unique
  ON invoices (razorpay_payment_id) WHERE razorpay_payment_id IS NOT NULL;

-- Invoice numbers from a sequence. The webhook counted rows and added one,
-- which hands two simultaneous payments the same number. Starts well past the
-- numbers already issued so it cannot collide with them.
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1001;

CREATE OR REPLACE FUNCTION next_invoice_number()
RETURNS TEXT AS $$
  SELECT 'BL-INV-' || to_char(NOW() AT TIME ZONE 'Asia/Kolkata', 'YYYY') || '-'
         || lpad(nextval('invoice_number_seq')::text, 6, '0');
$$ LANGUAGE sql;
REVOKE ALL ON FUNCTION next_invoice_number() FROM PUBLIC, anon, authenticated;

-- ── WhatsApp credits ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS credit_wallets (
  company_id  UUID PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
  balance     INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE credit_wallets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Company members can view their wallet" ON credit_wallets;
CREATE POLICY "Company members can view their wallet"
  ON credit_wallets FOR SELECT USING (company_id = get_user_company_id());

CREATE TABLE IF NOT EXISTS credit_ledger (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id     UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  delta          INTEGER NOT NULL,             -- +N recharge, -1 per template
  kind           TEXT NOT NULL CHECK (kind IN ('RECHARGE', 'TEMPLATE', 'ADJUSTMENT')),
  state          TEXT NOT NULL CHECK (state IN ('CREDITED', 'HELD', 'CHARGED', 'REFUNDED')),
  provider_id    TEXT,                         -- WhatsApp wamid, set once sent
  note           TEXT,
  billing_order_id UUID REFERENCES billing_orders(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  settled_at     TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_company
  ON credit_ledger (company_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_ledger_provider
  ON credit_ledger (provider_id) WHERE provider_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_credit_ledger_held
  ON credit_ledger (created_at) WHERE state = 'HELD';
-- A recharge order can credit the wallet at most once.
CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_ledger_order_once
  ON credit_ledger (billing_order_id) WHERE billing_order_id IS NOT NULL;
ALTER TABLE credit_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Company members can view their credit ledger" ON credit_ledger;
CREATE POLICY "Company members can view their credit ledger"
  ON credit_ledger FOR SELECT USING (company_id = get_user_company_id());

-- Hold one credit for a template about to be sent. NULL = not enough credit.
-- The wallet row is locked, so two simultaneous sends cannot both spend the
-- last credit.
CREATE OR REPLACE FUNCTION credit_hold(p_company_id UUID, p_note TEXT)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  UPDATE credit_wallets
     SET balance = balance - 1, updated_at = NOW()
   WHERE company_id = p_company_id AND balance >= 1;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  INSERT INTO credit_ledger (company_id, delta, kind, state, note)
  VALUES (p_company_id, -1, 'TEMPLATE', 'HELD', p_note)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Settle a held credit. 'CHARGED' keeps it spent; 'REFUNDED' gives it back.
-- Only a HELD row moves, so a repeated webhook cannot refund twice.
CREATE OR REPLACE FUNCTION credit_settle(p_ledger_id UUID, p_outcome TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_company UUID;
BEGIN
  IF p_outcome NOT IN ('CHARGED', 'REFUNDED') THEN
    RAISE EXCEPTION 'credit_settle: bad outcome %', p_outcome;
  END IF;
  UPDATE credit_ledger
     SET state = p_outcome, settled_at = NOW()
   WHERE id = p_ledger_id AND state = 'HELD'
  RETURNING company_id INTO v_company;
  IF v_company IS NULL THEN
    RETURN FALSE;
  END IF;
  IF p_outcome = 'REFUNDED' THEN
    UPDATE credit_wallets SET balance = balance + 1, updated_at = NOW()
     WHERE company_id = v_company;
  END IF;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Add credits (recharge or a manual adjustment). With an order id it is
-- idempotent: the unique index above makes a second attempt a no-op.
CREATE OR REPLACE FUNCTION credit_add(
  p_company_id UUID, p_amount INTEGER, p_kind TEXT, p_order_id UUID, p_note TEXT
) RETURNS INTEGER AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'credit_add: amount must be positive';
  END IF;
  BEGIN
    INSERT INTO credit_ledger (company_id, delta, kind, state, note, billing_order_id, settled_at)
    VALUES (p_company_id, p_amount, p_kind, 'CREDITED', p_note, p_order_id, NOW());
  EXCEPTION WHEN unique_violation THEN
    SELECT balance INTO v_balance FROM credit_wallets WHERE company_id = p_company_id;
    RETURN COALESCE(v_balance, 0);
  END;
  INSERT INTO credit_wallets (company_id, balance) VALUES (p_company_id, p_amount)
  ON CONFLICT (company_id) DO UPDATE
    SET balance = credit_wallets.balance + EXCLUDED.balance, updated_at = NOW()
  RETURNING balance INTO v_balance;
  RETURN v_balance;
END;
$$ LANGUAGE plpgsql;

-- These move money: callable only through the service role.
REVOKE ALL ON FUNCTION credit_hold(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION credit_settle(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION credit_add(UUID, INTEGER, TEXT, UUID, TEXT) FROM PUBLIC, anon, authenticated;

-- ── Reminder bookkeeping ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS billing_reminders (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL,     -- TRIAL_1D | TRIAL_ENDED | RENEW_3D | RENEW_DUE
  cycle_key   TEXT NOT NULL,     -- the trial/period end it is about
  whatsapp    TEXT,              -- SENT | FAILED: <why> | SKIPPED: <why>
  email       TEXT,
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, kind, cycle_key)
);
ALTER TABLE billing_reminders ENABLE ROW LEVEL SECURITY;  -- service role only

-- ── The Basic plan, as now sold ────────────────────────────────────────────
-- Price shown on the plan card. Razorpay plan id cleared because the old one
-- was created at the old price; the new flow uses one-time orders anyway.
UPDATE pricing_plans
   SET price_inr = 1999,
       description = '3 team seats included. ₹899 per extra seat.',
       razorpay_plan_id = NULL,
       features = '[{"text":"3 team seats included","included":true},{"text":"₹899 per extra seat","included":true},{"text":"Facebook, website & portal integrations","included":true},{"text":"Lead routing & pipeline","included":true},{"text":"AI WhatsApp agent","included":true},{"text":"WhatsApp credits: ₹1 per delivered template","included":true}]'::jsonb,
       updated_at = NOW()
 WHERE name = 'Basic';

NOTIFY pgrst, 'reload schema';
