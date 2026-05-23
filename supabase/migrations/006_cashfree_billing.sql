-- Add Cashfree columns to companies table
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS cashfree_customer_id TEXT;

-- Add Cashfree and dynamic plan columns to the existing subscriptions table
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS cashfree_sub_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS cashfree_plan_id TEXT,
  ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES pricing_plans(id),
  ADD COLUMN IF NOT EXISTS amount_inr INTEGER NOT NULL DEFAULT 0;

-- Create invoices table to store every charge/payment record
CREATE TABLE IF NOT EXISTS invoices (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id          UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  subscription_id     UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  cashfree_payment_id TEXT,
  invoice_number      TEXT UNIQUE NOT NULL,
  amount_inr          INTEGER NOT NULL,
  status              TEXT NOT NULL DEFAULT 'PAID',  -- PAID, FAILED, PENDING, REFUNDED
  paid_at             TIMESTAMPTZ,
  billing_period_start TIMESTAMPTZ,
  billing_period_end   TIMESTAMPTZ,
  pdf_url             TEXT,
  created_at          TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on invoices if not already enabled
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Indexing for lookup performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_cashfree ON subscriptions(cashfree_sub_id);
CREATE INDEX IF NOT EXISTS idx_invoices_company ON invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_subscription ON invoices(subscription_id);

-- Safely drop existing policies if they exist before creating
DROP POLICY IF EXISTS "Users read own invoices" ON invoices;

-- Row Level Security policies
-- Companies can only read their own invoices
CREATE POLICY "Users read own invoices" ON invoices
  FOR SELECT USING (company_id IN (
    SELECT company_id FROM users WHERE auth_user_id = auth.uid()
  ));
