-- ============================================================================
-- Big Lead CRM — Seed Data
-- Demo company, admin user, agents, default pipeline stages, sample project
-- ============================================================================

-- ── Demo Company ────────────────────────────────────────────────────────────

INSERT INTO companies (id, name, subdomain, plan, status, trial_ends_at, billing_email, timezone, currency)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Demo Realty',
  'demo-realty',
  'GROWTH',
  'TRIAL',
  NOW() + INTERVAL '30 days',
  'admin@demorealty.com',
  'Asia/Kolkata',
  'INR'
);

-- ── Demo Admin User ─────────────────────────────────────────────────────────
-- Note: auth_user_id will be set after Supabase Auth signup

INSERT INTO users (id, company_id, name, email, role, status, capacity_limit)
VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'Admin User',
  'admin@demorealty.com',
  'SUPER_ADMIN',
  'ACTIVE',
  100
);

-- ── Demo Agents ─────────────────────────────────────────────────────────────

INSERT INTO users (id, company_id, name, email, role, status, capacity_limit)
VALUES
(
  'b0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'Rahul Sharma',
  'rahul@demorealty.com',
  'AGENT',
  'ACTIVE',
  30
),
(
  'b0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000001',
  'Priya Patel',
  'priya@demorealty.com',
  'AGENT',
  'ACTIVE',
  30
),
(
  'b0000000-0000-0000-0000-000000000004',
  'a0000000-0000-0000-0000-000000000001',
  'Vikram Singh',
  'vikram@demorealty.com',
  'TEAM_LEAD',
  'ACTIVE',
  50
);

-- ── Default Pipeline Stages ─────────────────────────────────────────────────

INSERT INTO pipeline_stages (id, company_id, name, stage_order, color, is_terminal, is_won)
VALUES
(
  'c0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'New Lead',
  1,
  '#3B82F6',
  FALSE,
  FALSE
),
(
  'c0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'Contacted',
  2,
  '#8B5CF6',
  FALSE,
  FALSE
),
(
  'c0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000001',
  'Site Visit Scheduled',
  3,
  '#F59E0B',
  FALSE,
  FALSE
),
(
  'c0000000-0000-0000-0000-000000000004',
  'a0000000-0000-0000-0000-000000000001',
  'Site Visit Done',
  4,
  '#10B981',
  FALSE,
  FALSE
),
(
  'c0000000-0000-0000-0000-000000000005',
  'a0000000-0000-0000-0000-000000000001',
  'Negotiation',
  5,
  '#EC4899',
  FALSE,
  FALSE
),
(
  'c0000000-0000-0000-0000-000000000006',
  'a0000000-0000-0000-0000-000000000001',
  'Won',
  6,
  '#22C55E',
  TRUE,
  TRUE
),
(
  'c0000000-0000-0000-0000-000000000007',
  'a0000000-0000-0000-0000-000000000001',
  'Lost',
  7,
  '#EF4444',
  TRUE,
  FALSE
);

-- ── Sample Project ──────────────────────────────────────────────────────────

INSERT INTO projects (id, company_id, name, type, location, price_min, price_max, description, status)
VALUES (
  'd0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'Skyline Heights',
  'APARTMENT',
  'Whitefield, Bangalore',
  4500000,
  12000000,
  'Premium 2BHK & 3BHK apartments in Whitefield with world-class amenities.',
  'ACTIVE'
);

-- ── Sample Subscription ─────────────────────────────────────────────────────

INSERT INTO subscriptions (company_id, plan, status, current_period_start, current_period_end)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'GROWTH',
  'TRIALING',
  NOW(),
  NOW() + INTERVAL '30 days'
);
