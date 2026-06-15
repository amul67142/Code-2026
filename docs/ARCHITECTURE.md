# BigLead CRM — System Architecture

> **BigLead CRM** — a multi-tenant B2B SaaS lead-management platform. Captures leads from every source (Facebook/Instagram Lead Ads, Google Ads, web forms, portals), auto-assigns them to agents, and automates instant multi-channel follow-up (Email, WhatsApp, SMS, and AI calling on the roadmap) so no lead is ever missed.
>
> *Tagline: "Accelerate Lead Conversion." · Domain: biglead.site · Market: India-first, horizontal (any lead-gen business).*

---

## 1. Tech Stack

| Layer | Technology |
|---|---|
| Framework | **Next.js 16** (App Router) + **React 19** + **TypeScript** |
| Styling | **Tailwind CSS v4** + **shadcn/ui** (on `@base-ui/react`) + **lucide-react** icons |
| State / data | **Zustand** (UI state) · **TanStack Query** · React Server Components + Server Actions |
| Database / Auth | **Supabase** — PostgreSQL, Auth (`@supabase/ssr`), Row-Level Security, Storage (S3-compatible) |
| Billing | **Razorpay** (subscriptions + webhooks) |
| Email | **Resend** |
| Messaging | **WhatsApp Cloud API** (Meta) · SMS via India DLT gateway (planned) |
| Ad integrations | **Meta Conversions API (CAPI)** · **Facebook Lead Ads** (native webhook) |
| Charts | **Recharts** · Drag-and-drop: **@dnd-kit** |
| Hosting | **Vercel** (app) · Supabase cloud (DB) |
| Fonts | **Inter** |

---

## 2. High-Level Architecture

```
                          ┌─────────────────────────────────────────────┐
                          │                 BigLead CRM                  │
                          │            (Next.js 16, Vercel)              │
                          └─────────────────────────────────────────────┘
                                            │
        ┌───────────────────────┬───────────┴───────────┬────────────────────────┐
        ▼                       ▼                         ▼                        ▼
 ┌────────────┐        ┌────────────────┐        ┌─────────────────┐     ┌──────────────────┐
 │ (marketing)│        │     (app)       │        │  owner-admin     │     │   /api routes     │
 │ public site│        │  tenant CRM     │        │ platform super-  │     │ webhooks + billing│
 │ login/      │        │ dashboard,      │        │ panel (all       │     │ + integrations    │
 │ signup/     │        │ leads, kanban,  │        │ companies,       │     │                   │
 │ pricing     │        │ tasks, reports, │        │ users, payments) │     │                   │
 │             │        │ settings        │        │  owner.* subdomain│     │                   │
 └────────────┘        └────────────────┘        └─────────────────┘     └──────────────────┘
        │                       │                         │                        │
        └───────────────────────┴────────────┬────────────┴────────────────────────┘
                                              ▼
                                    ┌───────────────────┐
                                    │     Supabase      │
                                    │ Postgres + Auth + │
                                    │   RLS + Storage   │
                                    └───────────────────┘
                                              │
   ┌──────────────┬──────────────┬────────────┼─────────────┬───────────────┬──────────────┐
   ▼              ▼              ▼             ▼             ▼               ▼              ▼
 Meta Graph   WhatsApp     Meta CAPI       Resend        Razorpay      S3 Storage     (SMS DLT
 (Lead Ads)   Cloud API   (conversions)   (email)      (billing)      (documents)     planned)
```

### The three application surfaces (Next.js route groups)
1. **`app/(marketing)/`** — public: landing page, pricing, login, signup, password reset, lead-capture funnel, legal pages.
2. **`app/(app)/`** — the authenticated tenant CRM: dashboard, leads, kanban pipeline, my-leads, tasks, projects, reports, settings.
3. **`app/owner-admin/`** — the **platform owner** super-panel (all tenants, users, payments, pricing, tickets). Served on an `owner.*` subdomain, gated by a separate `owner_session` cookie via `middleware.ts`.

Plus **`app/api/`** — route handlers for webhooks (Facebook leads, WhatsApp, Razorpay, generic inbound), billing, and the Facebook OAuth callback.

---

## 3. Multi-Tenancy & Security

**Every tenant is a `company`.** Isolation is enforced at the database layer:

- **Row-Level Security (RLS)** on every table, keyed on `company_id`.
- The helper `get_user_company_id()` maps the authenticated `auth.uid()` → that user's `company_id`. RLS policies use it so a user can only ever see/touch their own company's rows.
- **Deliberate RLS bypass** (via the service-role admin client) only in three places:
  1. Signup / onboarding (creating the first company + user)
  2. Unauthenticated webhook receivers (Facebook leads, generic inbound, Razorpay, WhatsApp)
  3. The owner-admin platform panel

### Role hierarchy (per company)
```
SUPER_ADMIN  >  ADMIN  >  TEAM_LEAD  >  AGENT  >  READ_ONLY
```
Enforced in the UI (sidebar filtering) and in server actions via `lib/permissions` (`hasMinRole`, `canManage`, etc.). Integrations (Facebook/WhatsApp connect, billing) require **ADMIN+**.

### Auth flow
- Supabase Auth (email/password) via `@supabase/ssr`.
- `middleware.ts` refreshes the session, injects `x-pathname`, and gates protected routes.
- `app/(app)/layout.tsx` enforces the funnel: **unpaid → `/select-plan`**, **paid-but-new → `/onboarding`**, else the app shell.
- Secrets (Page tokens, WhatsApp tokens) are **encrypted at rest** with AES-256-GCM (`lib/integrations/crypto.ts`).

---

## 4. Data Model

```
companies ─┬─< users
           ├─< projects ──< (facebook fields: pixel_id, conversions_token…)
           ├─< pipeline_stages
           ├─< leads ─┬─< activities
           │          ├─── lead_source_meta (1:1, platform_lead_id UNIQUE)
           │          ├─< tasks
           │          ├─< documents
           │          └─< message_log
           ├─< webhooks ──< webhook_logs
           ├─< assignment_rules
           ├─< notifications
           ├─< subscriptions (1:1, Razorpay)
           ├─< audit_logs
           ├─< facebook_connections ──< facebook_lead_forms
           ├─< facebook_webhook_events
           └─< whatsapp_connections
```

### Core tables
| Table | Purpose |
|---|---|
| `companies` | Tenant root: plan, status, billing, timezone, currency |
| `users` | Profiles linked to Supabase Auth; role, status, capacity, round-robin `last_assigned_at` |
| `projects` | What leads are interested in (+ per-project Meta CAPI pixel/token) |
| `pipeline_stages` | Customizable kanban stages (`is_won`, `is_terminal`) |
| `leads` | The core entity: contact, source, stage, score, budget, status |
| `lead_source_meta` | Campaign/ad/form metadata + `platform_lead_id` (idempotency key) |
| `activities` | Per-lead timeline (calls, notes, stage changes, auto-messages) |
| `tasks` | Follow-up tasks (call/email/site-visit), due dates, reminders |
| `webhooks` / `webhook_logs` | Generic inbound lead endpoints + their delivery logs |
| `assignment_rules` | Round-robin / specific-agent / rule-engine config |
| `subscriptions` | Razorpay subscription state + billing period |
| `notifications` | In-app notification bell |
| `audit_logs` | Security/audit trail |

### Integration tables (added during this build)
| Table | Migration | Purpose |
|---|---|---|
| `facebook_connections` | 010 | Per-tenant connected FB Page + encrypted Page token (`UNIQUE(page_id)`) |
| `facebook_lead_forms` | 010 | Maps each FB Instant Form → project + routing |
| `facebook_webhook_events` | 010 | Raw leadgen event log + idempotency (`leadgen_id` UNIQUE) |
| `message_log` | 011 | Every Email/WhatsApp/SMS sent (status, provider id) — drives per-lead status + Reports |
| `whatsapp_connections` | 012 | Per-tenant WhatsApp number + encrypted token (`UNIQUE(company_id)`, `UNIQUE(phone_number_id)`) |

---

## 5. Key Subsystems

### 5.1 Lead Capture
Three ingestion paths, all converging on the **shared pipeline** `lib/leads/ingest.ts`:

1. **Native Facebook Lead Ads** (`app/api/webhooks/facebook/route.ts`)
   - `GET` = Meta verification handshake. `POST` = leadgen events.
   - Verifies `X-Hub-Signature-256` → idempotency check → resolves tenant by `page_id` → fetches lead data via Graph API (`leads_retrieval`) → maps fields → `ingestLead()`.
2. **Generic inbound webhook** (`/api/webhooks/inbound/[companyId]/[projectId]/[token]`) — Bearer-secret auth; accepts full lead JSON (Zapier/Make/custom).
3. **Manual entry** (`createLead` server action) and **CSV import** (planned).

### 5.2 Shared Ingest Pipeline (`lib/leads/ingest.ts`)
```
new lead → dedupe (platform_lead_id, then phone/email)
         → resolve entry stage
         → insert lead
         → store lead_source_meta (campaign/ad/raw payload)
         → assign (round-robin RPC or specific agent)
         → notify assigned agent + log activity
         → trigger automation (email + WhatsApp)
```
Round-robin uses a `SECURITY DEFINER` Postgres RPC `assign_lead_round_robin` with row locking (`FOR UPDATE`).

### 5.3 Messaging Automation Engine
The USP. On every new lead, fire instant multi-channel follow-up:
- **Email** (`lib/automation/lead-email.ts`) — Resend, project-specific welcome, logged to `message_log`. ✅ Built.
- **WhatsApp** (`lib/automation/lead-whatsapp.ts`) — sends an approved template from the tenant's own number via WhatsApp Cloud API, logged. ✅ Built.
- **SMS** — India DLT gateway (platform-level sender). 🔜 Planned.
- **AI voice calling** — telephony + voice AI. 🔜 Roadmap (flagship USP).
- **Sequenced/delayed follow-ups** (`skip_if_responded`) via a scheduler (Inngest or cron). 🔜 Planned (see `docs/messaging-automation-engine.md`).

### 5.4 Pipeline, Tasks & Reports
- **Kanban** (`@dnd-kit`) — drag leads across stages; moving to a `is_won` stage fires a **Meta CAPI Purchase** event.
- **Tasks** — per-lead follow-ups with reminders.
- **Reports** (Recharts) — lead trends, pipeline distribution, sources, agent workload, **email analytics** (sent/delivered/opened/failed).

### 5.5 Billing (Razorpay)
- Subscription create/cancel + signature-verified webhooks (`/api/webhooks/razorpay`).
- `lib/billing/access.ts` gates app access; `(app)/layout.tsx` redirects unpaid users to `/select-plan`.

### 5.6 Owner-Admin Panel
- Platform-wide view: companies, users, payments, pricing editor, tickets, dashboard charts.
- Separate `owner_session` cookie auth; `owner.*` subdomain routing in middleware.

---

## 6. External Integrations

| Integration | Direction | Purpose | Multi-tenant model |
|---|---|---|---|
| **Facebook Lead Ads** | Inbound | Real-time lead capture | ONE platform Meta App; each client connects own Page via OAuth (token encrypted per tenant) |
| **WhatsApp Cloud API** | Outbound | Automated follow-up messages | Same app; each client connects own WABA via Embedded Signup (planned) / manual token |
| **Meta Conversions API** | Outbound | Send Lead/Purchase events for ad optimization | Per-project pixel + token |
| **Resend** | Outbound | Transactional + automated email | Platform sender (verified domain) |
| **Razorpay** | Both | Subscriptions + webhooks | Platform account; per-company subscription |
| **S3 (Supabase Storage)** | Both | Lead document uploads | RLS via lead/company |

**Credential model (consistent across all):** ONE platform-level app/account (fixed env vars), and **each client connects their own** Page/number/pixel — stored **encrypted per `company_id`**. Same pattern everywhere; tenants isolated by `page_id`/`phone_number_id` → `company_id`.

---

## 7. Lead Lifecycle (end-to-end flow)

```
Customer submits a Facebook Lead Ad
        │
        ▼
Meta → POST /api/webhooks/facebook  { leadgen_id, page_id, form_id }
        │  verify signature → dedupe
        ▼
GET graph.facebook.com/{leadgen_id}  → real field data (name/phone/email)
        │
        ▼
ingestLead():  dedupe → create lead → lead_source_meta → round-robin assign
        │
        ├──► notify agent + create activity
        ├──► Email welcome (Resend)        → message_log
        └──► WhatsApp welcome (Cloud API)  → message_log
        │
        ▼
Agent works the lead through the Kanban pipeline
        │
        ▼
Moved to a "Won" stage → Meta CAPI "Purchase" event (ad optimization)
```

---

## 8. Deployment & Environment

- **App:** Vercel, custom domain `biglead.site` (single canonical domain — www vs non-www must be consistent across Vercel domain, `NEXT_PUBLIC_APP_URL`, and Meta's registered URLs).
- **DB/Auth/Storage:** Supabase cloud (shared project for the URL chain).
- **URL resolution:** `lib/utils.ts → getURL()` resolves `NEXT_PUBLIC_APP_URL` → Vercel production URL → localhost, used for OAuth redirect + email links.
- **Webhook URLs (permanent in production):**
  - `https://biglead.site/api/webhooks/facebook` (leadgen)
  - `https://biglead.site/api/webhooks/razorpay` (billing)
  - `https://biglead.site/api/webhooks/whatsapp` (status/inbound — planned)
- **Secrets:** in Vercel env vars; `FACEBOOK_TOKEN_ENC_KEY` must be identical across environments or stored tokens won't decrypt.
- **Migrations:** SQL files in `supabase/migrations/`, run via `scripts/run-migration.mjs`.

---

## 9. Directory Structure (key paths)

```
app/
  (marketing)/        public site, auth pages, lead funnel
  (app)/              authenticated CRM
    dashboard/ leads/ leads/kanban/ my-leads/ tasks/ projects/ reports/
    settings/         company, team, pipeline, routing, integrations, billing, emails, profile
  owner-admin/        platform super-panel
  api/
    webhooks/facebook/          native FB lead receiver (GET handshake + POST)
    webhooks/inbound/...        generic inbound webhook
    webhooks/razorpay/          billing webhook
    integrations/facebook/oauth/callback/   FB OAuth callback
    billing/                    checkout, status, invoice
lib/
  supabase/           server, admin, client, middleware
  integrations/       crypto, facebook-graph, facebook-capi, whatsapp
  automation/         lead-email, lead-whatsapp  (the engine)
  leads/ingest.ts     shared ingestion pipeline
  billing/  email/  permissions/  logging/  utils
supabase/migrations/  001–012 schema migrations
docs/                 architecture, integration plans, build journals
```

---

## 10. Architectural Principles

1. **Server Actions first** — mutations live in `actions.ts` per route; RSC for data fetching.
2. **RLS is the security boundary** — app code relies on it; service-role bypass is explicit and rare.
3. **One shared ingest pipeline** — every lead source converges on `ingestLead()` (dedupe, assign, automate) — no duplicated logic.
4. **One platform app, per-tenant credentials** — the consistent integration pattern (FB, WhatsApp, CAPI).
5. **Encrypted secrets at rest** — all third-party tokens via AES-256-GCM.
6. **Idempotency everywhere inbound** — `platform_lead_id` + `leadgen_id` UNIQUE constraints prevent duplicate leads on retries.
7. **Channel-agnostic automation** — the engine treats Email/WhatsApp/SMS/AI-call as interchangeable action types.

---

## 11. Roadmap (planned, not yet built)
- WhatsApp **Embedded Signup** (self-serve client onboarding) + status/inbound webhook
- **SMS** channel (India DLT)
- **AI voice calling** (flagship USP)
- **Sequenced follow-ups** with delays + a scheduler (Inngest / Vercel Cron)
- **CSV import/export** UI
- **Advanced rule-engine** assignment, capacity limits
- **FCM push** + Supabase Realtime (currently 30s polling)
- Testing & RLS hardening

---

*Last updated: June 2026. Companion docs: `facebook-lead-ads-integration.md`, `facebook-lead-ads-build-journal.md`, `messaging-automation-engine.md`.*
