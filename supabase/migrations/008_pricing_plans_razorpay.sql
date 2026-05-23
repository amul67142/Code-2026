-- Add razorpay_plan_id to pricing_plans table safely
ALTER TABLE pricing_plans
  ADD COLUMN IF NOT EXISTS razorpay_plan_id TEXT;
