-- Create pricing_plans table
CREATE TABLE IF NOT EXISTS pricing_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price_inr INTEGER NOT NULL DEFAULT 0,
  period TEXT DEFAULT '/mo',
  is_popular BOOLEAN DEFAULT false,
  is_custom_price BOOLEAN DEFAULT false,
  cta_text TEXT DEFAULT 'Get Demo',
  sort_order INTEGER DEFAULT 0,
  features JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed current pricing data
INSERT INTO pricing_plans (name, description, price_inr, period, is_popular, is_custom_price, cta_text, sort_order, features) VALUES
(
  'Basic',
  'For individuals getting started.',
  749,
  '/mo',
  false,
  false,
  'Get Demo',
  1,
  '[{"text":"3 team members","included":true},{"text":"Website leads only","included":true},{"text":"CSV import","included":true},{"text":"Unlimited leads","included":true},{"text":"No pipeline","included":false},{"text":"No ad webhooks","included":false},{"text":"24hr support","included":true}]'::jsonb
),
(
  'Pro',
  'For growing teams needing automation.',
  1599,
  '/mo',
  true,
  false,
  'Get Demo',
  2,
  '[{"text":"Unlimited team members","included":true},{"text":"All webhooks (Zapier, Google Ads, etc.)","included":true},{"text":"CSV import","included":true},{"text":"Unlimited leads","included":true},{"text":"Full pipeline","included":true},{"text":"No automated callbacks","included":false},{"text":"12hr support","included":true}]'::jsonb
),
(
  'Enterprise',
  'For large, complex organisations.',
  0,
  null,
  false,
  true,
  'Contact Sales',
  3,
  '[{"text":"Unlimited everything","included":true},{"text":"Custom telephony & routing","included":true},{"text":"Dedicated support","included":true},{"text":"Custom integrations","included":true}]'::jsonb
);

-- Enable RLS but allow public read
ALTER TABLE pricing_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read" ON pricing_plans
  FOR SELECT USING (true);
