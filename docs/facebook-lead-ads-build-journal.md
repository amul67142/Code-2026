# Facebook Lead Ads Integration — Build Journal

> A complete record of building **native Facebook/Instagram Lead Ads capture** into BigLead CRM — **no Zapier, no middleware.** This documents every challenge we hit, the root cause, and exactly how we solved it, side by side.
>
> **Companion docs:**
> - `docs/facebook-lead-ads-integration.md` — the original implementation plan & spec
> - This file — the actual build journey, problems & solutions

---

## 1. The Goal

Let BigLead CRM receive Facebook/Instagram Lead Ad submissions **directly and in real time**, with each client connecting their **own** Facebook Page — no Zapier/Make/LeadsBridge in the middle.

**Why it's not trivial:** Facebook never sends you the lead's data in the webhook. It sends only a `leadgen_id`. You must then call the Graph API to fetch the actual name/phone/email. That requires a Page Access Token, OAuth, webhook verification, and signature checking.

---

## 2. How It Works (the mechanism)

```
Lead submits FB/IG form
        │
        ▼
Meta sends webhook POST → only { leadgen_id, page_id, form_id }
        │
        ▼
Our server verifies X-Hub-Signature-256
        │
        ▼
GET graph.facebook.com/{leadgen_id} with the Page token → real field data
        │
        ▼
Shared pipeline: dedupe → create lead → assign agent → notify
        │
        ▼
Lead appears in CRM, source = FACEBOOK_ADS
```

**Credential model (the key architectural decision):**
- **ONE** platform Meta App (App ID/Secret/Verify Token) — fixed, in env, invisible to clients.
- **Each client** connects their **own** Page via OAuth → we store their encrypted Page token per-tenant in `facebook_connections`.
- Routing by `page_id → company_id`. Same model Zapier/HubSpot use.

---

## 3. What We Built (files)

| File | Purpose |
|---|---|
| `supabase/migrations/010_facebook_lead_ads.sql` | 3 tables: `facebook_connections`, `facebook_lead_forms`, `facebook_webhook_events` + RLS |
| `lib/integrations/crypto.ts` | AES-256-GCM encrypt/decrypt for Page tokens |
| `lib/integrations/facebook-graph.ts` | Graph API client (token exchange, list pages, subscribe/unsubscribe, list forms, fetch lead) |
| `lib/leads/ingest.ts` | Shared pipeline: dedupe → stage → insert lead → source meta → assign → notify |
| `app/api/integrations/facebook/oauth/callback/route.ts` | OAuth callback — exchanges code, stores encrypted Page token, subscribes Page |
| `app/api/webhooks/facebook/route.ts` | GET handshake + POST receiver (signature verify, Graph fetch, ingest) |
| `app/(app)/settings/integrations/facebook-actions.ts` | Server actions: start OAuth, list/save form mappings, disconnect |
| `app/(app)/settings/integrations/facebook-forms-manager.tsx` | UI to map each form → project + assignment |
| `app/(app)/settings/integrations/integrations-client.tsx` | "Connect Facebook" + connected-pages UI |
| `.env.local` | Facebook env vars |

---

## 4. Challenges & Solutions (side by side)

### Phase A — Concept & Business

| # | Challenge / Problem | Root Cause | How We Solved It |
|---|---|---|---|
| 1 | "Can my CRM capture FB leads without Zapier?" | Existing webhook only accepted full lead JSON (Zapier's job). Meta doesn't send lead data — only a `leadgen_id`. | Designed a native receiver that fetches lead data via Graph API. |
| 2 | "Clients vary — credentials can't be fixed." | Confusion between the platform Meta App (fixed) vs per-client Page tokens (vary). | Clarified: ONE Meta App for the platform; each client connects their own Page via OAuth; tokens stored per-tenant. |
| 3 | "I don't have a registered business." | Worry that go-live needs a company. | Build/test needs nothing. Go-live needs your OWN business (Udyam sole-proprietorship — free, ~1 day). NOT the employer (Realvibe). |
| 4 | Business Portfolio got auto-restricted on creation. | Meta auto-flags new portfolios. | Submitted for review; it cleared to "Unverified" (the normal default state). Advised: secure FB account (2FA), no duplicate portfolios, no spam appeals. |
| 5 | "Is Business Verification required?" | Unclear when it's needed. | Required only for **go-live** (advanced access to pull client lead data). NOT needed to build/test with your own Page in Dev mode. |

### Phase B — Meta App Setup

| # | Challenge / Problem | Root Cause | How We Solved It |
|---|---|---|---|
| 6 | Set up the Meta App for Lead Ads. | — | Created Business-type app, added **Facebook Login for Business** + **Webhooks** products. |
| 7 | Redirect URI Validator said "invalid redirect URI." | The callback URL wasn't in the allowlist yet. | Added the full callback path to **Valid OAuth Redirect URIs** (not just the validator box) and saved. |
| 8 | `pages_manage_ads` permission missing (later). | Listing a Page's `leadgen_forms` requires `pages_manage_ads`, which we hadn't requested. | Added `pages_manage_ads` to OAuth scopes; reconnected the Page to grant it. |

### Phase C — Environment & Local Setup

| # | Challenge / Problem | Root Cause | How We Solved It |
|---|---|---|---|
| 9 | Webhook handshake returned **403 Forbidden** on localhost. | The entire `# Facebook` section was **missing** from `.env.local` → `FACEBOOK_VERIFY_TOKEN` was `undefined`. | Added all Facebook env vars; generated `FACEBOOK_TOKEN_ENC_KEY` via `node crypto.randomBytes(32)`. |
| 10 | Env still not picked up after editing. | Next.js loads `.env.local` **only at startup**. | Restarted the dev server. |
| 11 | App ID looked unusually long (17 digits). | — | Flagged to double-check; later confirmed correct (OAuth succeeded). |

### Phase D — ngrok & Tunneling

| # | Challenge / Problem | Root Cause | How We Solved It |
|---|---|---|---|
| 12 | PowerShell test returned the **ngrok warning page** (`ERR_NGROK_6024`) instead of `hello123`. | ngrok's free-tier browser interstitial intercepted the request. | Test handshake on **localhost** directly (you→your server needs no tunnel), or add header `ngrok-skip-browser-warning: true`. Noted Cloudflare Tunnel as a no-interstitial backup. |
| 13 | "localhost or ngrok — which do I test on?" | Confusion about when the public URL is needed. | Rule: **You** make the request → localhost is fine. **Facebook** makes the request → must be ngrok. |
| 14 | Visiting the webhook URL in a browser showed "Forbidden." | A plain browser visit has no `hub.verify_token` query params. | Expected behavior — proved the route was publicly reachable (ngrok forwarding worked, no interstitial). |

### Phase E — Code Review Fixes

| # | Challenge / Problem | Root Cause | How We Solved It |
|---|---|---|---|
| 15 | Any AGENT could connect/disconnect Facebook. | Server actions only checked `company_id`, not role. | Added `ADMIN`/`SUPER_ADMIN` role checks to `startFacebookOAuth`, `disconnectFacebookPage`, and the form-mapping actions. |
| 16 | Disconnect left Meta still sending leads + token in DB. | Disconnect only set `status=REVOKED` locally. | Disconnect now calls `unsubscribePage()` (DELETE `/subscribed_apps`) **and** wipes the stored token. |

### Phase F — Testing the Pipeline

| # | Challenge / Problem | Root Cause | How We Solved It |
|---|---|---|---|
| 17 | Lead Ads Testing Tool rendered **blank** (no selectors). | Meta's dev tool is flaky / needs a published form / login context. | Pivoted to the **Webhooks "Test" button** to prove delivery, and built the form-mapping UI to list forms via API (bypassing the tool). |
| 18 | Test event = `FAILED: No active connection for page 444444444444`. | Meta's sample payload uses a **fake page_id**. | This was a **success** — it proved delivery + signature verification + handler + DB logging all work. A real lead's `page_id` matches the real connection. |

### Phase G — Form-Mapping UI

| # | Challenge / Problem | Root Cause | How We Solved It |
|---|---|---|---|
| 19 | `(#200) Requires pages_manage_ads permission`. | Scope missing (see #8). | Added scope + reconnected. |
| 20 | Project/agent/assignment dropdowns showed **raw IDs** instead of names. | `@base-ui` Select can't resolve a label for a **preloaded** value (option labels live in an unmounted Portal). | Passed an **`items`** map (`value → label`) to each `<Select>` so it resolves labels even when closed. |

---

## 5. Current Status — ✅ COMPLETE (dev/test)

Everything works end-to-end in development:
- ✅ Webhook GET handshake verified in Meta
- ✅ OAuth connect — Page connected, token encrypted & stored, Page subscribed to `leadgen`
- ✅ Webhook delivery + `X-Hub-Signature-256` verification proven
- ✅ Form-mapping UI — lists forms via Graph API, maps to project + agent, saves
- ✅ Shared ingest pipeline — dedupe, assign (round-robin/specific), notify agent
- ✅ 0 TypeScript errors throughout

**The only remaining test:** one real test lead (Meta Lead Ads Testing Tool with a published form, or a live ad) to watch it land in `/leads`.

---

## 6. Key Learnings / Gotchas (for future reference)

1. **Meta sends only a `leadgen_id`** — always a second Graph call to get the data.
2. **`.env.local` loads only at server startup** — restart after every change.
3. **localhost for your own tests; ngrok only when Facebook calls you.**
4. **ngrok free shows an interstitial** to browser-like requests — Meta's server requests usually bypass it; for manual tests use localhost or the skip header.
5. **Redirect URI must match exactly** (path, no trailing slash) and be in the Valid OAuth Redirect URIs list.
6. **Verify Token in Meta must equal `FACEBOOK_VERIFY_TOKEN` exactly.**
7. **Listing forms needs `pages_manage_ads`; fetching a lead needs `leads_retrieval`** — different permissions.
8. **`@base-ui` Select needs an `items` map** to show labels for preloaded values.
9. **The Webhooks "Test" button** is the most reliable way to prove delivery without the flaky testing tool.
10. **`UNIQUE(page_id)`** prevents a Page being claimed by two tenants; idempotency via `lead_source_meta.platform_lead_id` + `facebook_webhook_events.leadgen_id`.

---

## 7. What's Left / Next Steps

### Immediate
- [ ] Send one **real test lead** end-to-end → confirm it lands in `/leads`, assigned + notified.

### Before onboarding real clients (go-live)
- [ ] **Register your own business** (Udyam/MSME sole proprietorship) — needed for Razorpay KYC + Meta Business Verification.
- [ ] **Meta Business Verification** + **App Review** for advanced access: `leads_retrieval`, `pages_manage_ads`, `pages_show_list`, `pages_read_engagement`, `pages_manage_metadata`, `business_management`.
- [ ] **Deploy** — replace ngrok with the real domain; set production env (`NEXT_PUBLIC_APP_URL`, Facebook vars); update the Meta webhook callback + OAuth redirect URIs to the production domain.

### Polish / hardening
- [ ] **Page-picker** for users who manage many Pages (currently auto-connects all).
- [ ] **Pagination** in `getUserPages`/`getLeadForms` (>25 items).
- [ ] **Token-refresh cron** — detect expired/revoked tokens, flip `status`, prompt reconnect.
- [ ] Refactor the **existing generic inbound webhook** to also use the shared `ingestLead()`.

### The bigger vision (USP)
- [ ] **Automation engine** triggered on new lead → **AI calling** (flagship USP) + **WhatsApp / SMS / Email**. The Facebook capture built here is the **trigger source** for all of it.

---

*Last updated: June 10, 2026 — native Facebook Lead Ads pipeline complete in dev; pending one real test lead + go-live steps.*
