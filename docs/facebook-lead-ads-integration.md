# Native Facebook Lead Ads Integration — Implementation & Working Plan

> **Goal:** Let BigLead CRM pull leads **directly from Facebook/Instagram Lead Ads in real time, with no Zapier / Make / LeadsBridge in the middle.**
>
> **Audience:** This document has two parts:
> - **Part A — Developer Plan** (the build): everything an engineer needs to implement it.
> - **Part B — End-User Guide** (the usage): step-by-step for the agency admin who uses the CRM.

---

## 0. TL;DR

| Question | Answer |
|---|---|
| Can the CRM do this today? | No. Today the inbound webhook needs the full lead JSON pushed to it (Zapier's job). |
| Why can't Meta just POST to the existing webhook? | Meta never sends lead fields. It sends only a `leadgen_id`; you must call the Graph API to fetch the data. |
| Is the schema ready? | Mostly yes — `lead_source_meta` (platform_lead_id, form_id, campaign fields) and `webhooks.form_id` were built for this. Env vars (`FACEBOOK_APP_ID/SECRET/VERIFY_TOKEN`) already reserved. |
| What's the hard part? | A one-time **Meta App Review** for the `leads_retrieval` permission + Business Verification. The code itself is ~3–5 days. |
| Net new code | 1 DB migration, 1 webhook route (GET+POST), 1 OAuth connect flow, 1 token/crypto util, 1 settings UI tab, refactor of the shared lead-ingest pipeline. |

---

## 1. How Facebook Lead Ads delivery actually works

This is the core mechanism the whole build depends on. Read this once.

```
                         (real-time, per submission)
  User submits                                   Meta sends ONLY:
  Instant Form  ─────►  Facebook  ─────────────►  { leadgen_id, form_id,
  on FB/IG                                          page_id, ad_id, created_time }
                                                          │
                                                          ▼
                                          POST  https://<your-app>/api/webhooks/facebook
                                                          │
                                   Your server reads leadgen_id, then calls back:
                                                          │
                                                          ▼
                          GET https://graph.facebook.com/v21.0/{leadgen_id}
                              ?access_token={PAGE_ACCESS_TOKEN}
                                                          │
                                                          ▼
                              Meta returns the ACTUAL field data:
                              { field_data: [ {name:"full_name", values:["..."]},
                                              {name:"phone_number", values:["..."]},
                                              {name:"email", values:["..."]} ] }
                                                          │
                                                          ▼
                              Run existing pipeline: normalize → score →
                              dedupe → create lead → round-robin assign → log
```

Two facts that drive the design:

1. **The lead payload is NOT in the webhook.** The webhook is just a notification with an ID. You always make a second Graph API call to fetch the real data. That call needs a **Page Access Token** for the Page that owns the form.
2. **There is ONE callback URL per Meta App**, not per company. All companies' Pages send `leadgen` events to the *same* endpoint. You route them to the correct tenant by looking up `page_id` → company.

---

## 2. Current state vs target state

### Current (Zapier-dependent)
- `app/api/webhooks/inbound/[companyId]/[projectId]/[token]/route.ts` — `POST` only, expects full `{name, phone, email}` JSON, auth via `Bearer <secret>`.
- "Facebook Lead Ads" in Settings → Integrations is just a **label** on a generic webhook.
- No Meta handshake, no signature verification, no Graph fetch, no token storage.

### Target (native, no Zapier)
- New endpoint `app/api/webhooks/facebook/route.ts` — `GET` (verification handshake) + `POST` (signed leadgen receiver).
- New "Connect Facebook" OAuth flow that stores a **long-lived Page Access Token** per company.
- New **form → project** mapping UI.
- Shared lead-ingest pipeline reused by both the generic webhook and the new Facebook receiver.
- `lead_source_meta.platform_lead_id = leadgen_id` gives free idempotency/dedup.

---

## 3. Architecture overview

```
Settings → Integrations → "Facebook" tab
   │  (1) Connect with Facebook (OAuth)
   ▼
/api/integrations/facebook/oauth/callback
   │  exchange code → long-lived user token → page tokens
   │  store encrypted token in facebook_connections
   │  subscribe page to app (subscribed_apps?subscribed_fields=leadgen)
   ▼
facebook_lead_forms  ◄── user maps each FB form → CRM project + routing rules
   ▲
   │  (2) real-time leads
/api/webhooks/facebook   (GET handshake + POST receiver)
   │  verify X-Hub-Signature-256
   │  page_id → facebook_connections (tenant + page token)
   │  GET graph /{leadgen_id} → field_data
   │  form_id → facebook_lead_forms (destination project + routing)
   ▼
lib/leads/ingest.ts  (shared pipeline)
   normalize → score → dedupe(platform_lead_id) → insert lead
   → insert lead_source_meta → round-robin/specific assign → notify → log
   → (optional) CAPI "Lead" event back to Meta
```

---

## 3.5 Credential & multi-tenancy model (READ THIS FIRST)

> **The #1 point of confusion.** "Facebook credentials" means two different things living at two different levels. Only one of them varies per client.

| Credential | Owner | Fixed or per-client? | Stored where | Client ever sees it? |
|---|---|---|---|---|
| **Meta App** — App ID, App Secret, Verify Token | The platform (you) | **FIXED — ONE for the entire CRM** | Server env vars | No |
| **Page Access Token** (inbound lead capture) | Each client's own FB Page | **VARIES — one per client** | `facebook_connections`, encrypted, scoped to `company_id` | No (handled via OAuth) |
| **Pixel ID + Conversions Token** (outbound CAPI) | Each client | **VARIES — per project** | `projects` table (already built, migration 009) | Entered in project settings |

**You create exactly ONE Meta App for the whole platform.** You do *not* create an app per client. Every client connects *their own* Facebook Page through that single app via the "Connect Facebook" OAuth button; the CRM stores *their* Page token against *their* `company_id`. This is identical to how Zapier, HubSpot, GoHighLevel and LeadsBridge operate — one app, unlimited customer Pages.

```
Platform (you):   ONE Meta App  ── App ID / Secret / Verify Token (fixed, env vars)
                        │
   Client A → Connect FB → store Page A token   (company_id = A)
   Client B → Connect FB → store Page B token   (company_id = B)
   Client C → Connect FB → store Page C token   (company_id = C)
                        │
   ONE webhook URL  →  route each lead by page_id → correct tenant
```

- **Per-client isolation** is enforced by `facebook_connections.company_id` + the `UNIQUE(page_id)` constraint (a Page cannot belong to two tenants).
- **Nothing is hardcoded per client.** The only fixed values (App ID/Secret/Verify token) are platform-level and invisible to clients.
- **"Bring your own app" model** (each client registers their own Meta app) is technically possible but a poor experience — every client would need their own Meta App Review. Avoid unless a specific enterprise client demands hard isolation; if so, it only means moving App ID/Secret from env into `facebook_connections` per row.

---

# PART A — DEVELOPER PLAN

## 4. Prerequisites on the Meta side (one-time, platform-level)

These are done **once** by you (the platform owner), not per customer.

1. **Create a Meta App** at <https://developers.facebook.com/apps> → type **Business**.
2. Add the **Webhooks** and **Facebook Login for Business** products to the app.
3. Note the **App ID** and **App Secret** → these become `FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET`.
4. **Business Verification**: complete it under Meta Business Settings (required before `leads_retrieval` advanced access is granted).
5. **App Review → request Advanced Access** for these permissions:
   - `leads_retrieval` — fetch lead field data (the critical one)
   - `pages_show_list` — list the user's Pages during connect
   - `pages_read_engagement` — read Page data
   - `pages_manage_metadata` — subscribe the Page to the app's webhook
   - `business_management` (often needed for Business-owned Pages)
6. **Configure the Webhook** in the App Dashboard → Webhooks → **Page** object:
   - Callback URL: `https://<your-domain>/api/webhooks/facebook`
   - Verify Token: a random secret = `FACEBOOK_VERIFY_TOKEN`
   - Subscribe to the **`leadgen`** field.

> Until App Review is approved, you can still **fully develop and test** using the **Lead Ads Testing Tool** and your own Page while the app is in *Development* mode and you're an app admin/tester. Review is only required to onboard *other people's* Pages in production.

## 5. Environment variables

Already reserved in `.env.example` — fill them in:

```bash
# Facebook
FACEBOOK_APP_ID=             # from Meta App dashboard
FACEBOOK_APP_SECRET=         # from Meta App dashboard (keep secret, server-only)
FACEBOOK_VERIFY_TOKEN=       # random string you invent; must match the App webhook config
NEXT_PUBLIC_FACEBOOK_APP_ID= # same as FACEBOOK_APP_ID, exposed for the JS login button

# New — token encryption at rest (generate: openssl rand -hex 32)
FACEBOOK_TOKEN_ENC_KEY=      # 32-byte hex key for AES-256-GCM
FACEBOOK_GRAPH_VERSION=v21.0 # pin the Graph API version
```

## 6. Database changes — Migration `010_facebook_lead_ads.sql`

Create `supabase/migrations/010_facebook_lead_ads.sql`. Run it with the existing pattern (`node scripts/run-migration.mjs` style).

```sql
-- ============================================================================
-- Migration 010: Native Facebook Lead Ads Capture
-- ============================================================================

CREATE TYPE fb_connection_status AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED', 'ERROR');

-- 1. One row per connected Facebook Page, per company.
CREATE TABLE facebook_connections (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id            UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  page_id               TEXT NOT NULL,
  page_name             TEXT,
  -- AES-256-GCM encrypted long-lived Page Access Token (never store plaintext)
  page_access_token_enc TEXT NOT NULL,
  fb_user_id            TEXT,                 -- the admin who connected
  connected_by_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  status                fb_connection_status NOT NULL DEFAULT 'ACTIVE',
  token_expires_at      TIMESTAMPTZ,          -- null = long-lived/non-expiring page token
  last_error            TEXT,
  subscribed_at         TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, page_id),
  UNIQUE (page_id)      -- a Page maps to exactly one tenant (prevents cross-tenant hijack)
);
CREATE INDEX idx_fb_conn_company ON facebook_connections(company_id);
CREATE INDEX idx_fb_conn_page ON facebook_connections(page_id);
CREATE TRIGGER trg_fb_conn_updated_at BEFORE UPDATE ON facebook_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Maps each Facebook Instant Form to a destination project + routing rules.
CREATE TABLE facebook_lead_forms (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id        UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  connection_id     UUID NOT NULL REFERENCES facebook_connections(id) ON DELETE CASCADE,
  form_id           TEXT NOT NULL,
  form_name         TEXT,
  project_id        UUID REFERENCES projects(id) ON DELETE SET NULL,
  assignment_rule   assignment_rule_type NOT NULL DEFAULT 'ROUND_ROBIN',
  assigned_agent_id UUID REFERENCES users(id) ON DELETE SET NULL,
  entry_stage_id    UUID REFERENCES pipeline_stages(id) ON DELETE SET NULL,
  duplicate_rule    duplicate_rule NOT NULL DEFAULT 'SKIP',
  auto_tags         TEXT[] DEFAULT '{}',
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  total_received    INTEGER DEFAULT 0,
  last_received_at  TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, form_id)
);
CREATE INDEX idx_fb_forms_company ON facebook_lead_forms(company_id);
CREATE INDEX idx_fb_forms_form ON facebook_lead_forms(form_id);
CREATE TRIGGER trg_fb_forms_updated_at BEFORE UPDATE ON facebook_lead_forms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. Raw webhook event log for debugging/replay (idempotency lives on
--    lead_source_meta.platform_lead_id which is already UNIQUE).
CREATE TABLE facebook_webhook_events (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  leadgen_id    TEXT UNIQUE,           -- dedupe at the event layer too
  page_id       TEXT,
  form_id       TEXT,
  status        webhook_log_status NOT NULL DEFAULT 'QUEUED',
  lead_id       UUID REFERENCES leads(id) ON DELETE SET NULL,
  error_message TEXT,
  raw_payload   JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_fb_events_leadgen ON facebook_webhook_events(leadgen_id);

-- 4. RLS — company isolation (service role bypasses for the webhook receiver)
ALTER TABLE facebook_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE facebook_lead_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE facebook_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members manage fb connections" ON facebook_connections
  FOR ALL USING (company_id = get_user_company_id());
CREATE POLICY "Company members manage fb forms" ON facebook_lead_forms
  FOR ALL USING (company_id = get_user_company_id());
-- events table: no tenant policy → only service role reads/writes it
```

> **Why `page_access_token_enc`, not plaintext:** a leaked DB dump must not hand an attacker live Page tokens. Encrypt with AES-256-GCM using `FACEBOOK_TOKEN_ENC_KEY`.

## 7. Backend implementation

### 7.1 Token crypto util — `lib/integrations/crypto.ts`

```ts
import crypto from "crypto";

const KEY = Buffer.from(process.env.FACEBOOK_TOKEN_ENC_KEY!, "hex"); // 32 bytes

export function encryptToken(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // store as iv.tag.ciphertext (all hex)
  return [iv.toString("hex"), tag.toString("hex"), enc.toString("hex")].join(".");
}

export function decryptToken(blob: string): string {
  const [ivHex, tagHex, dataHex] = blob.split(".");
  const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]).toString("utf8");
}
```

### 7.2 Graph API client — `lib/integrations/facebook-graph.ts`

```ts
const V = process.env.FACEBOOK_GRAPH_VERSION || "v21.0";
const BASE = `https://graph.facebook.com/${V}`;

/** Exchange a short-lived user token for a long-lived one (~60 days). */
export async function exchangeLongLivedToken(shortToken: string) {
  const url = `${BASE}/oauth/access_token?grant_type=fb_exchange_token`
    + `&client_id=${process.env.FACEBOOK_APP_ID}`
    + `&client_secret=${process.env.FACEBOOK_APP_SECRET}`
    + `&fb_exchange_token=${shortToken}`;
  const res = await fetch(url);
  return res.json(); // { access_token, expires_in }
}

/** List the Pages the user manages, each with its own Page Access Token. */
export async function getUserPages(userToken: string) {
  const res = await fetch(`${BASE}/me/accounts?fields=id,name,access_token&access_token=${userToken}`);
  return res.json(); // { data: [{ id, name, access_token }] }
}

/** Subscribe a Page to this app's webhook for the leadgen field. */
export async function subscribePage(pageId: string, pageToken: string) {
  const res = await fetch(`${BASE}/${pageId}/subscribed_apps`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscribed_fields: ["leadgen"], access_token: pageToken }),
  });
  return res.json(); // { success: true }
}

/** List Instant Forms on a Page. */
export async function getLeadForms(pageId: string, pageToken: string) {
  const res = await fetch(`${BASE}/${pageId}/leadgen_forms?fields=id,name,status&access_token=${pageToken}`);
  return res.json(); // { data: [{ id, name, status }] }
}

/** Fetch the actual lead field data for a leadgen_id. */
export async function getLeadData(leadgenId: string, pageToken: string) {
  const fields = "id,created_time,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,form_id,field_data";
  const res = await fetch(`${BASE}/${leadgenId}?fields=${fields}&access_token=${pageToken}`);
  return res.json();
}
```

### 7.3 Refactor the shared ingest pipeline — `lib/leads/ingest.ts`

Pull the normalize → score → dedupe → insert → assign → log logic **out of** the existing
`app/api/webhooks/inbound/.../route.ts` into a reusable function so both receivers share it.

```ts
import { createClient } from "@supabase/supabase-js";

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export interface IngestInput {
  companyId: string;
  projectId: string | null;
  source: "FACEBOOK_ADS" | "GOOGLE_ADS" | "WEBSITE_FORM" | "OTHER";
  normalized: { name: string | null; phone: string | null; email: string | null };
  routing: {
    assignmentRule: "ROUND_ROBIN" | "SPECIFIC_AGENT" | "RULE_ENGINE";
    assignedAgentId?: string | null;
    entryStageId?: string | null;
    duplicateRule: "SKIP" | "CREATE" | "CREATE_AND_FLAG";
    autoTags?: string[];
  };
  sourceMeta?: {
    platformLeadId?: string;   // = leadgen_id  → idempotency
    formId?: string;
    campaignName?: string;
    adName?: string;
    rawPayload?: unknown;
  };
  score?: number;
}

export async function ingestLead(input: IngestInput): Promise<{ leadId?: string; skipped?: boolean; error?: string }> {
  // 1. dedupe by platform_lead_id (preferred) then phone/email
  // 2. resolve entry stage (input.routing.entryStageId || lowest stage_order)
  // 3. insert into leads
  // 4. insert into lead_source_meta (platform_lead_id, form_id, campaign_name, ad_name, raw_payload)
  // 5. assignment: RPC assign_lead_round_robin OR set assigned_to_id
  // 6. notifications + activities (reuse existing logic)
  // 7. return { leadId }
  // ...moved verbatim from the existing inbound route, parameterised...
  return { leadId: "..." };
}
```

> **Acceptance:** after the refactor, the existing generic webhook route must still pass its current behaviour (it now just builds an `IngestInput` and calls `ingestLead`).

### 7.4 The webhook endpoint — `app/api/webhooks/facebook/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { decryptToken } from "@/lib/integrations/crypto";
import { getLeadData } from "@/lib/integrations/facebook-graph";
import { ingestLead } from "@/lib/leads/ingest";

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// ── GET: Meta verification handshake ──────────────────────────────
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  if (p.get("hub.mode") === "subscribe" && p.get("hub.verify_token") === process.env.FACEBOOK_VERIFY_TOKEN) {
    return new NextResponse(p.get("hub.challenge") || "", { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

// ── POST: leadgen notifications ───────────────────────────────────
export async function POST(req: NextRequest) {
  const raw = await req.text();

  // 1. Verify X-Hub-Signature-256 (HMAC-SHA256 of raw body with app secret)
  const sig = req.headers.get("x-hub-signature-256") || "";
  const expected = "sha256=" + crypto.createHmac("sha256", process.env.FACEBOOK_APP_SECRET!).update(raw).digest("hex");
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return new NextResponse("Invalid signature", { status: 401 });
  }

  // 2. ACK immediately — Meta retries if you're slow. Process inline only if fast;
  //    otherwise enqueue. (For MVP, process inline but keep it lean.)
  const body = JSON.parse(raw);
  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field !== "leadgen") continue;
      const v = change.value; // { leadgen_id, page_id, form_id, created_time, ad_id }
      await handleLeadgen(v).catch((e) => console.error("FB leadgen error", e));
    }
  }
  return NextResponse.json({ received: true }); // always 200 on a valid signature
}

async function handleLeadgen(v: any) {
  // idempotency: skip if we've already processed this leadgen_id
  const { data: existing } = await admin
    .from("facebook_webhook_events").select("id").eq("leadgen_id", v.leadgen_id).maybeSingle();
  if (existing) return;
  await admin.from("facebook_webhook_events").insert({
    leadgen_id: v.leadgen_id, page_id: v.page_id, form_id: v.form_id, raw_payload: v, status: "QUEUED",
  });

  // resolve tenant + page token from page_id
  const { data: conn } = await admin
    .from("facebook_connections").select("*").eq("page_id", v.page_id).eq("status", "ACTIVE").maybeSingle();
  if (!conn) return fail(v.leadgen_id, "No active connection for page " + v.page_id);

  // resolve destination form mapping
  const { data: form } = await admin
    .from("facebook_lead_forms").select("*").eq("company_id", conn.company_id).eq("form_id", v.form_id).maybeSingle();
  if (!form || !form.is_active) return fail(v.leadgen_id, "Form not mapped/inactive: " + v.form_id);

  // fetch real data
  const pageToken = decryptToken(conn.page_access_token_enc);
  const lead = await getLeadData(v.leadgen_id, pageToken);
  if (lead.error) return fail(v.leadgen_id, "Graph error: " + lead.error.message);

  // map field_data [{name, values}] → name/phone/email
  const map: Record<string, string> = {};
  for (const f of lead.field_data || []) map[f.name] = (f.values || [])[0];
  const normalized = {
    name: map.full_name || [map.first_name, map.last_name].filter(Boolean).join(" ") || null,
    phone: map.phone_number || null,
    email: map.email || null,
  };

  const result = await ingestLead({
    companyId: conn.company_id,
    projectId: form.project_id,
    source: "FACEBOOK_ADS",
    normalized,
    routing: {
      assignmentRule: form.assignment_rule,
      assignedAgentId: form.assigned_agent_id,
      entryStageId: form.entry_stage_id,
      duplicateRule: form.duplicate_rule,
      autoTags: form.auto_tags,
    },
    sourceMeta: {
      platformLeadId: v.leadgen_id,
      formId: v.form_id,
      campaignName: lead.campaign_name,
      adName: lead.ad_name,
      rawPayload: lead,
    },
  });

  await admin.from("facebook_webhook_events")
    .update({ status: result.leadId ? "SUCCESS" : "FAILED", lead_id: result.leadId, error_message: result.error })
    .eq("leadgen_id", v.leadgen_id);
  if (result.leadId) {
    await admin.from("facebook_lead_forms")
      .update({ last_received_at: new Date().toISOString(), total_received: (form.total_received || 0) + 1 })
      .eq("id", form.id);
  }
}

async function fail(leadgenId: string, msg: string) {
  console.error("FB leadgen failed:", msg);
  await admin.from("facebook_webhook_events").update({ status: "FAILED", error_message: msg }).eq("leadgen_id", leadgenId);
}
```

> ⚠️ **Add to `middleware.ts` matcher exclusions** — the matcher already excludes `api/`, so `/api/webhooks/facebook` is not gated by auth. Good. Just confirm no auth redirect interferes.

### 7.5 OAuth connect flow

**Frontend button** (Settings → Integrations → Facebook tab) uses Facebook JS SDK *or* a plain OAuth redirect:

```
https://www.facebook.com/v21.0/dialog/oauth
  ?client_id=FACEBOOK_APP_ID
  &redirect_uri=https://<domain>/api/integrations/facebook/oauth/callback
  &scope=pages_show_list,pages_read_engagement,pages_manage_metadata,leads_retrieval,business_management
  &state=<csrf-token-bound-to-company>
```

**Callback route** `app/api/integrations/facebook/oauth/callback/route.ts`:
1. Validate `state` (CSRF + which company).
2. Exchange `code` → short-lived user token (`GET /oauth/access_token`).
3. `exchangeLongLivedToken()` → long-lived user token.
4. `getUserPages()` → list pages (each has its own Page token).
5. Render a "pick your Page(s)" screen (or auto-store if one).
6. For each chosen page: `encryptToken(pageToken)` → upsert `facebook_connections`; call `subscribePage()`; set `subscribed_at`.
7. `getLeadForms()` → present forms for the user to map to projects.

### 7.6 Form-mapping server actions — `app/(app)/settings/integrations/facebook-actions.ts`

```ts
"use server";
// listConnections(companyId)
// listFormsForConnection(connectionId)            → calls getLeadForms via stored token
// upsertFormMapping({ formId, projectId, assignmentRule, ... })
// toggleFormActive(formId, isActive)
// disconnectPage(connectionId)                    → unsubscribe + soft delete
// reconnect/refresh token
```

## 8. Frontend implementation

Add a **"Facebook" tab** (or section) to `app/(app)/settings/integrations/integrations-client.tsx`:

- **Not connected:** a "Connect Facebook Page" button → starts OAuth.
- **Connected:** show Page name + status badge; a table of **Instant Forms** with a per-row **destination Project** dropdown, **assignment rule**, **entry stage**, and an **Active** toggle.
- A **"Send test lead"** helper linking to Meta's Lead Ads Testing Tool.
- A **recent events** panel reading `facebook_webhook_events` (success/failed) for transparency.

Gate the whole tab behind `minRole: "ADMIN"` (consistent with the existing Integrations page).

## 9. Phase-by-phase developer working plan

| Phase | Work | Output | Est. |
|---|---|---|---|
| **0. Meta setup** | Create app, business verification, request `leads_retrieval`, configure webhook + verify token | App ID/Secret/Verify token in env | 0.5d + review wait |
| **1. DB** | Write & run migration `010_facebook_lead_ads.sql` | 3 tables + RLS | 0.5d |
| **2. Refactor** | Extract `lib/leads/ingest.ts`; make generic webhook use it; verify no regression | Shared pipeline | 1d |
| **3. Receiver** | `lib/integrations/crypto.ts`, `facebook-graph.ts`, `api/webhooks/facebook/route.ts` (GET+POST+signature+Graph fetch+ingest) | Real-time capture working | 1d |
| **4. OAuth** | Connect flow + callback + token storage + page subscription | "Connect Facebook" works | 1d |
| **5. UI** | Facebook tab: connect, form→project mapping, events panel | Self-serve config | 1d |
| **6. CAPI (opt)** | Fire `Lead` CAPI event on inbound FB lead (reuse `facebook-capi.ts`) | Closed-loop attribution | 0.5d |
| **7. Hardening** | Token-refresh cron, error states, retries, audit logging, rate limits | Production-ready | 1d |
| **8. Test + launch** | Meta Lead Ads Testing Tool, security review, go-live | Shipped | 0.5d |

**Total: ~6–7 dev days** + Meta App Review lead time (days to ~2 weeks, runs in parallel from Phase 0).

## 10. Testing plan

1. **Local handshake test:** `GET /api/webhooks/facebook?hub.mode=subscribe&hub.verify_token=<token>&hub.challenge=ping` → returns `ping`.
2. **Signature test:** POST a body with a correct/incorrect `x-hub-signature-256`; expect 200 / 401.
3. **Meta Lead Ads Testing Tool** (<https://developers.facebook.com/tools/lead-ads-testing>): pick your Page + form → "Create Lead" → confirm a row appears in `facebook_webhook_events` (SUCCESS) and a new lead in the CRM.
4. **Idempotency:** replay the same `leadgen_id` → second time is skipped, no duplicate lead.
5. **Routing:** confirm round-robin / specific-agent assignment + the agent notification fires.
6. **Multi-tenant:** two companies, two Pages → leads land in the correct tenant only.
7. **Token failure:** revoke the token in Facebook → connection flips to `EXPIRED`, surfaced in UI.

## 11. Security checklist

- [ ] `X-Hub-Signature-256` verified with `timingSafeEqual` on **every** POST.
- [ ] Page tokens stored **encrypted** (AES-256-GCM); `FACEBOOK_TOKEN_ENC_KEY` only in server env.
- [ ] `UNIQUE(page_id)` prevents one Page being claimed by two tenants.
- [ ] Webhook route never trusts `page_id`/`form_id` for tenancy beyond the DB lookup.
- [ ] OAuth `state` is CSRF-bound to the initiating company + expires.
- [ ] App Secret / tokens never logged or returned to the client.
- [ ] Graph calls pin a fixed API version (`FACEBOOK_GRAPH_VERSION`).
- [ ] Rate-limit the public webhook route; always 200 on valid-signature to stop Meta retry storms.

## 12. Maintenance — token refresh

Page Access Tokens derived from a long-lived user token are typically non-expiring **as long as the user remains a Page admin and the token isn't revoked**, but plan for failure:
- Add a daily cron (`CRON_SECRET`-guarded route, Phase 13 background-jobs work) that calls `GET /me/permissions` / a cheap Page read per connection; on failure mark `status='EXPIRED'` and notify the company admin to reconnect.
- Surface an **"Reconnect Facebook"** banner in the UI when `status != 'ACTIVE'`.

---

# PART B — END-USER GUIDE (Agency Admin using BigLead CRM)

> This is what you put in your help docs / show the customer. No Zapier account needed.

### What you need first
- You are an **Admin** of the BigLead CRM company account.
- You are an **Admin of the Facebook Page** that runs the Lead Ads.
- You have at least one **Project** created in the CRM (leads need a destination).

### Step 1 — Connect your Facebook Page
1. Go to **Settings → Integrations → Facebook**.
2. Click **Connect Facebook Page**.
3. Log in to Facebook and **grant the requested permissions** (leads access, manage Page).
4. Choose the **Page** whose lead forms you want to import. Click **Connect**.
   - You'll see the Page appear with a green **Active** badge.

### Step 2 — Map your lead forms to projects
1. After connecting, you'll see a list of that Page's **Instant Forms**.
2. For each form you want to capture:
   - Pick the **destination Project** (where leads go).
   - Choose **assignment**: *Round-robin* (auto-distribute to agents) or *Specific agent*.
   - (Optional) set the **entry pipeline stage** and **duplicate handling**.
   - Toggle the form **Active**.
3. Click **Save**. That's it — new leads now flow in automatically and in real time.

### Step 3 — Test it
1. Open Meta's **Lead Ads Testing Tool**: <https://developers.facebook.com/tools/lead-ads-testing>
2. Select your **Page** and **form**, then **Create Lead** with sample data.
3. Within seconds, check **Leads** in the CRM — your test lead should appear, assigned to an agent, with source **Facebook Ads**.
4. Delete the test lead when done.

### What happens automatically on every real lead
- Lead is created in the chosen Project with **source = Facebook Ads**.
- It's **scored** and **assigned** to an agent per your rule.
- The agent gets an **in-app notification**.
- Campaign/ad/form info is saved on the lead for reporting.
- Duplicates (same person submitting twice) are skipped per your setting.

### Troubleshooting
| Symptom | Fix |
|---|---|
| "Page status: Expired/Reconnect" banner | Click **Reconnect Facebook** — your Page login expired or permissions were revoked. |
| Test lead didn't arrive | Confirm the **form is mapped and Active**; confirm you're an **admin of the Page**; re-run the test. |
| Leads go to the wrong project | Edit the **form → project** mapping in Settings → Integrations → Facebook. |
| Some fields are empty | Your Instant Form must collect those fields (e.g., email/phone). The CRM only gets what the form captures. |
| Duplicate leads appearing | Set **Duplicate handling = Skip** on the form mapping. |

### Important notes for the customer
- This uses Facebook's **official Lead Ads API** — no third-party tool, no per-lead Zapier cost.
- Leads arrive **in real time** (seconds), not on a polling delay.
- If you remove the app's access from Facebook, lead flow stops until you reconnect.

---

## Appendix — Files touched/created

```
NEW  supabase/migrations/010_facebook_lead_ads.sql
NEW  lib/integrations/crypto.ts
NEW  lib/integrations/facebook-graph.ts
NEW  lib/leads/ingest.ts                          (refactor target)
NEW  app/api/webhooks/facebook/route.ts
NEW  app/api/integrations/facebook/oauth/callback/route.ts
NEW  app/(app)/settings/integrations/facebook-actions.ts
EDIT app/(app)/settings/integrations/integrations-client.tsx   (add Facebook tab)
EDIT app/(app)/settings/integrations/page.tsx                  (load connections/forms)
EDIT app/api/webhooks/inbound/[companyId]/[projectId]/[token]/route.ts  (use shared ingestLead)
EDIT .env  (FACEBOOK_* + FACEBOOK_TOKEN_ENC_KEY + FACEBOOK_GRAPH_VERSION + NEXT_PUBLIC_FACEBOOK_APP_ID)
```
```
```

---

## Troubleshooting: Lead Access Manager (LAM) — the #1 silent blocker

**Symptom (verified live on 12 July 2026):** everything is wired correctly (page connected,
`subscribed_apps` shows the app with `leadgen`, token valid, webhook active) but test leads
show **Failure — "CRM access has been revoked from Lead Access Manager"** in the Lead Ads
Testing Tool's Track Status, while other CRMs (e.g. leadSync) show Success.

**Cause:** if a Facebook Page has customized **Leads Access Manager**, every CRM app must be
*manually granted access* by a page admin before Meta will deliver lead data to it.
Being subscribed to the page is NOT enough.

**Fix (one-time, per page):**
1. Facebook Page → **Settings → Leads Access** (or Meta Business Suite → Leads Access)
2. **CRMs** tab → **Assign CRMs** → add **BigLead CRM**
3. Delete old test lead in the Testing Tool → Create lead → Track Status should show Success.

**Client onboarding implication:** any client whose page uses LAM will silently receive
nothing until they do this. The Settings → Integrations UI shows an amber hint card about it.

**Related quirks (also verified):**
- The Lead Ads Testing Tool hides a page from its dropdown while that page is subscribed to
  this (Live) app. Cosmetic only — delivery still works. Disconnecting makes it reappear.
- The generic "Send to server" button always posts dummy `leadgen_id 444444444444`, which the
  webhook's idempotency layer correctly skips. Use **Create lead** instead.
- A lead whose form has no mapping in BigLead is recorded in `facebook_webhook_events` as
  FAILED ("Form not mapped") — map the form in Settings → Integrations first.
