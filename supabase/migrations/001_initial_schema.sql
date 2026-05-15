-- ============================================================================
-- RealLeads CRM — Full Database Schema Migration
-- Phase 2: All tables, enums, indexes, triggers, RLS policies
-- ============================================================================

-- ── Extensions ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Enum Types ──────────────────────────────────────────────────────────────

CREATE TYPE plan_type AS ENUM ('STARTER', 'GROWTH', 'PROFESSIONAL', 'ENTERPRISE');
CREATE TYPE company_status AS ENUM ('TRIAL', 'ACTIVE', 'PAUSED', 'CANCELLED');
CREATE TYPE user_role AS ENUM ('SUPER_ADMIN', 'ADMIN', 'TEAM_LEAD', 'AGENT', 'READ_ONLY');
CREATE TYPE user_status AS ENUM ('ACTIVE', 'INVITED', 'INACTIVE');
CREATE TYPE project_type AS ENUM ('APARTMENT', 'VILLA', 'PLOT', 'COMMERCIAL', 'OTHER');
CREATE TYPE project_status AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE lead_source AS ENUM (
  'MANUAL', 'GOOGLE_ADS', 'FACEBOOK_ADS', 'WEBSITE_FORM',
  'PORTAL_99ACRES', 'PORTAL_MAGICBRICKS', 'PORTAL_HOUSING',
  'WALK_IN', 'REFERRAL', 'CSV_IMPORT', 'OTHER'
);
CREATE TYPE lead_timeline AS ENUM ('IMMEDIATE', 'THREE_MONTHS', 'SIX_MONTHS', 'TWELVE_PLUS');
CREATE TYPE lead_status AS ENUM ('ACTIVE', 'CLOSED_WON', 'CLOSED_LOST');
CREATE TYPE activity_type AS ENUM (
  'NOTE', 'CALL', 'EMAIL', 'WHATSAPP', 'STAGE_CHANGE',
  'ASSIGNMENT', 'TASK_CREATED', 'TASK_COMPLETED',
  'DOCUMENT_UPLOADED', 'SYSTEM'
);
CREATE TYPE task_type AS ENUM ('CALL', 'EMAIL', 'WHATSAPP', 'SITE_VISIT', 'OTHER');
CREATE TYPE task_status AS ENUM ('PENDING', 'COMPLETED', 'OVERDUE', 'CANCELLED');
CREATE TYPE assignment_rule_type AS ENUM ('ROUND_ROBIN', 'SPECIFIC_AGENT', 'RULE_ENGINE');
CREATE TYPE duplicate_rule AS ENUM ('SKIP', 'CREATE', 'CREATE_AND_FLAG');
CREATE TYPE failure_notify AS ENUM ('ADMIN', 'TEAM_LEAD', 'BOTH', 'NONE');
CREATE TYPE webhook_status AS ENUM ('ACTIVE', 'PAUSED');
CREATE TYPE webhook_log_status AS ENUM ('SUCCESS', 'FAILED', 'DUPLICATE', 'REJECTED', 'QUEUED');
CREATE TYPE subscription_status AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELLED', 'TRIALING');

-- ── Helper Function: updated_at trigger ─────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- TABLES
-- ============================================================================

-- ── 1. companies ────────────────────────────────────────────────────────────

CREATE TABLE companies (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  subdomain   TEXT UNIQUE NOT NULL,
  logo_url    TEXT,
  plan        plan_type NOT NULL DEFAULT 'STARTER',
  status      company_status NOT NULL DEFAULT 'TRIAL',
  trial_ends_at   TIMESTAMPTZ,
  billing_email   TEXT,
  razorpay_customer_id     TEXT,
  razorpay_subscription_id TEXT,
  settings    JSONB DEFAULT '{}',
  timezone    TEXT DEFAULT 'Asia/Kolkata',
  currency    TEXT DEFAULT 'INR',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);

CREATE TRIGGER trg_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── 2. users (profile table linked to Supabase Auth) ────────────────────────

CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id    UUID UNIQUE,
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  email           TEXT NOT NULL,
  role            user_role NOT NULL DEFAULT 'AGENT',
  status          user_status NOT NULL DEFAULT 'INVITED',
  invite_token    TEXT,
  invite_expires_at TIMESTAMPTZ,
  last_login_at   TIMESTAMPTZ,
  fcm_token       TEXT,
  last_assigned_at TIMESTAMPTZ,
  capacity_limit  INTEGER DEFAULT 50,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  UNIQUE(company_id, email)
);

CREATE INDEX idx_users_company ON users(company_id);
CREATE INDEX idx_users_auth ON users(auth_user_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(company_id, status);

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── 3. projects ─────────────────────────────────────────────────────────────

CREATE TABLE projects (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  type        project_type NOT NULL DEFAULT 'APARTMENT',
  location    TEXT,
  price_min   NUMERIC(14, 2),
  price_max   NUMERIC(14, 2),
  description TEXT,
  status      project_status NOT NULL DEFAULT 'ACTIVE',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_projects_company ON projects(company_id);
CREATE INDEX idx_projects_status ON projects(company_id, status);

CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── 4. pipeline_stages ──────────────────────────────────────────────────────

CREATE TABLE pipeline_stages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  stage_order INTEGER NOT NULL DEFAULT 0,
  color       TEXT DEFAULT '#6B7280',
  is_terminal BOOLEAN NOT NULL DEFAULT FALSE,
  is_won      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stages_company ON pipeline_stages(company_id);
CREATE INDEX idx_stages_order ON pipeline_stages(company_id, stage_order);

CREATE TRIGGER trg_pipeline_stages_updated_at
  BEFORE UPDATE ON pipeline_stages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── 5. leads ────────────────────────────────────────────────────────────────

CREATE TABLE leads (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id          UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id          UUID REFERENCES projects(id) ON DELETE SET NULL,
  assigned_to_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  name                TEXT NOT NULL,
  phone               TEXT,
  alternate_phone     TEXT,
  email               TEXT,
  source              lead_source NOT NULL DEFAULT 'MANUAL',
  stage_id            UUID REFERENCES pipeline_stages(id) ON DELETE SET NULL,
  score               INTEGER DEFAULT 50,
  property_type       TEXT,
  bhk_preference      TEXT,
  location_preference TEXT,
  budget_min          NUMERIC(14, 2),
  budget_max          NUMERIC(14, 2),
  timeline            lead_timeline,
  notes               TEXT,
  tags                TEXT[] DEFAULT '{}',
  status              lead_status NOT NULL DEFAULT 'ACTIVE',
  lost_reason         TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ
);

CREATE INDEX idx_leads_company ON leads(company_id);
CREATE INDEX idx_leads_assigned ON leads(company_id, assigned_to_id);
CREATE INDEX idx_leads_project ON leads(company_id, project_id);
CREATE INDEX idx_leads_stage ON leads(company_id, stage_id);
CREATE INDEX idx_leads_source ON leads(company_id, source);
CREATE INDEX idx_leads_status ON leads(company_id, status);
CREATE INDEX idx_leads_created ON leads(company_id, created_at DESC);
CREATE INDEX idx_leads_phone ON leads(company_id, phone);
CREATE INDEX idx_leads_email ON leads(company_id, email);

CREATE TRIGGER trg_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── 6. lead_source_meta ─────────────────────────────────────────────────────

CREATE TABLE lead_source_meta (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id           UUID NOT NULL UNIQUE REFERENCES leads(id) ON DELETE CASCADE,
  platform          TEXT,
  campaign_name     TEXT,
  campaign_id       TEXT,
  adset_name        TEXT,
  ad_name           TEXT,
  platform_lead_id  TEXT UNIQUE,
  ad_group_id       TEXT,
  creative_id       TEXT,
  form_id           TEXT,
  raw_payload       JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lead_source_lead ON lead_source_meta(lead_id);
CREATE INDEX idx_lead_source_platform_id ON lead_source_meta(platform_lead_id);
CREATE INDEX idx_lead_source_form ON lead_source_meta(form_id);

-- ── 7. activities ───────────────────────────────────────────────────────────

CREATE TABLE activities (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id     UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  type        activity_type NOT NULL,
  description TEXT,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activities_lead ON activities(lead_id);
CREATE INDEX idx_activities_created ON activities(lead_id, created_at DESC);

-- ── 8. tasks ────────────────────────────────────────────────────────────────

CREATE TABLE tasks (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id         UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  assigned_to_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_by_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type            task_type NOT NULL DEFAULT 'CALL',
  due_at          TIMESTAMPTZ NOT NULL,
  completed_at    TIMESTAMPTZ,
  reminder_sent_at TIMESTAMPTZ,
  notes           TEXT,
  status          task_status NOT NULL DEFAULT 'PENDING',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasks_company ON tasks(company_id);
CREATE INDEX idx_tasks_assigned ON tasks(company_id, assigned_to_id);
CREATE INDEX idx_tasks_status ON tasks(company_id, status);
CREATE INDEX idx_tasks_due ON tasks(company_id, due_at);
CREATE INDEX idx_tasks_lead ON tasks(lead_id);

CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── 9. webhooks ─────────────────────────────────────────────────────────────

CREATE TABLE webhooks (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id        UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_id        UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  token             TEXT UNIQUE NOT NULL,
  secret_key_hash   TEXT,
  secret_key_display TEXT,
  source_label      TEXT,
  assignment_rule   assignment_rule_type NOT NULL DEFAULT 'ROUND_ROBIN',
  assigned_agent_id UUID REFERENCES users(id) ON DELETE SET NULL,
  duplicate_rule    duplicate_rule NOT NULL DEFAULT 'SKIP',
  entry_stage_id    UUID REFERENCES pipeline_stages(id) ON DELETE SET NULL,
  auto_tags         TEXT[] DEFAULT '{}',
  failure_notify    failure_notify NOT NULL DEFAULT 'ADMIN',
  status            webhook_status NOT NULL DEFAULT 'ACTIVE',
  field_mapping     JSONB DEFAULT '{}',
  form_id           TEXT,
  last_received_at  TIMESTAMPTZ,
  total_received    INTEGER DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhooks_company ON webhooks(company_id);
CREATE INDEX idx_webhooks_project ON webhooks(project_id);
CREATE INDEX idx_webhooks_token ON webhooks(token);
CREATE INDEX idx_webhooks_form ON webhooks(form_id);

CREATE TRIGGER trg_webhooks_updated_at
  BEFORE UPDATE ON webhooks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── 10. webhook_logs ────────────────────────────────────────────────────────

CREATE TABLE webhook_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  webhook_id      UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  received_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source          TEXT,
  payload_json    JSONB,
  status          webhook_log_status NOT NULL DEFAULT 'QUEUED',
  lead_created_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  error_message   TEXT,
  processing_ms   INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhook_logs_webhook ON webhook_logs(webhook_id);
CREATE INDEX idx_webhook_logs_status ON webhook_logs(webhook_id, status);
CREATE INDEX idx_webhook_logs_received ON webhook_logs(webhook_id, received_at DESC);

-- ── 11. assignment_rules ────────────────────────────────────────────────────

CREATE TABLE assignment_rules (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  rule_order  INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  conditions  JSONB NOT NULL DEFAULT '[]',
  action      JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rules_company ON assignment_rules(company_id);
CREATE INDEX idx_rules_order ON assignment_rules(company_id, rule_order);

CREATE TRIGGER trg_assignment_rules_updated_at
  BEFORE UPDATE ON assignment_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── 12. documents ───────────────────────────────────────────────────────────

CREATE TABLE documents (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id         UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  uploaded_by_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_name       TEXT NOT NULL,
  file_type       TEXT NOT NULL,
  file_size       INTEGER NOT NULL,
  storage_path    TEXT NOT NULL,
  public_url      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_documents_lead ON documents(lead_id);

-- ── 13. subscriptions ───────────────────────────────────────────────────────

CREATE TABLE subscriptions (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id            UUID UNIQUE NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  plan                  plan_type NOT NULL DEFAULT 'STARTER',
  status                subscription_status NOT NULL DEFAULT 'TRIALING',
  razorpay_sub_id       TEXT,
  current_period_start  TIMESTAMPTZ,
  current_period_end    TIMESTAMPTZ,
  cancel_at_period_end  BOOLEAN DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_company ON subscriptions(company_id);

CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── 14. notifications ───────────────────────────────────────────────────────

CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  message     TEXT,
  type        TEXT,
  metadata    JSONB DEFAULT '{}',
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_company ON notifications(company_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, read_at) WHERE read_at IS NULL;

CREATE TRIGGER trg_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── 15. audit_logs ──────────────────────────────────────────────────────────

CREATE TABLE audit_logs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  action        TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id   UUID,
  metadata      JSONB DEFAULT '{}',
  ip            TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_company ON audit_logs(company_id);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_created ON audit_logs(company_id, created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_source_meta ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ── RLS Policies ────────────────────────────────────────────────────────────
-- Users can only access rows belonging to their company.
-- The company_id is determined by looking up the user's profile from auth.uid().

-- Helper: get company_id for the current authenticated user
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM users WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- companies: users can read their own company
CREATE POLICY "Users can view own company"
  ON companies FOR SELECT
  USING (id = get_user_company_id());

CREATE POLICY "Admins can update own company"
  ON companies FOR UPDATE
  USING (id = get_user_company_id());

-- users: company isolation
CREATE POLICY "Users can view company members"
  ON users FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can insert into own company"
  ON users FOR INSERT
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update in own company"
  ON users FOR UPDATE
  USING (company_id = get_user_company_id());

-- projects: company isolation
CREATE POLICY "Company members can view projects"
  ON projects FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Company members can manage projects"
  ON projects FOR ALL
  USING (company_id = get_user_company_id());

-- pipeline_stages: company isolation
CREATE POLICY "Company members can view stages"
  ON pipeline_stages FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Company members can manage stages"
  ON pipeline_stages FOR ALL
  USING (company_id = get_user_company_id());

-- leads: company isolation
CREATE POLICY "Company members can view leads"
  ON leads FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Company members can manage leads"
  ON leads FOR ALL
  USING (company_id = get_user_company_id());

-- lead_source_meta: via lead company
CREATE POLICY "Access lead source meta via lead"
  ON lead_source_meta FOR ALL
  USING (
    lead_id IN (SELECT id FROM leads WHERE company_id = get_user_company_id())
  );

-- activities: via lead company
CREATE POLICY "Access activities via lead"
  ON activities FOR ALL
  USING (
    lead_id IN (SELECT id FROM leads WHERE company_id = get_user_company_id())
  );

-- tasks: company isolation
CREATE POLICY "Company members can view tasks"
  ON tasks FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Company members can manage tasks"
  ON tasks FOR ALL
  USING (company_id = get_user_company_id());

-- webhooks: company isolation
CREATE POLICY "Company members can view webhooks"
  ON webhooks FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Company members can manage webhooks"
  ON webhooks FOR ALL
  USING (company_id = get_user_company_id());

-- webhook_logs: via webhook company
CREATE POLICY "Access webhook logs via webhook"
  ON webhook_logs FOR ALL
  USING (
    webhook_id IN (SELECT id FROM webhooks WHERE company_id = get_user_company_id())
  );

-- assignment_rules: company isolation
CREATE POLICY "Company members can view rules"
  ON assignment_rules FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Company members can manage rules"
  ON assignment_rules FOR ALL
  USING (company_id = get_user_company_id());

-- documents: via lead company
CREATE POLICY "Access documents via lead"
  ON documents FOR ALL
  USING (
    lead_id IN (SELECT id FROM leads WHERE company_id = get_user_company_id())
  );

-- subscriptions: company isolation
CREATE POLICY "Company members can view subscription"
  ON subscriptions FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Company members can manage subscription"
  ON subscriptions FOR ALL
  USING (company_id = get_user_company_id());

-- notifications: user-specific
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- audit_logs: company isolation (read-only via RLS, inserts done by service role)
CREATE POLICY "Company members can view audit logs"
  ON audit_logs FOR SELECT
  USING (company_id = get_user_company_id());

-- ============================================================================
-- SERVICE ROLE BYPASS (for webhook receivers, background jobs, etc.)
-- The service role key bypasses RLS by default in Supabase.
-- No additional policies needed for service role operations.
-- ============================================================================
