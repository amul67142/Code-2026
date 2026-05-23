-- Add Razorpay columns to companies table safely
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS razorpay_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_subscription_id TEXT;

-- Add Razorpay columns to existing subscriptions table
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS razorpay_sub_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS razorpay_plan_id TEXT;

-- Add Razorpay columns to invoices table
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_signature TEXT;
