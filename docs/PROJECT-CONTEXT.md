# BigLead CRM — Project Context / Handoff

> Paste-ready context to resume work in a fresh chat. Last updated: **July 30, 2026**.

## WHO / WHAT
- **Project:** BigLead CRM — multi-tenant B2B SaaS lead-management CRM. India-first, **horizontal** (any lead-gen business). Domain: **biglead.site**. Tagline "Accelerate Lead Conversion."
- **Location:** `C:\my folder\realleads`
- **User:** Amul Sharma. **Employee** at Realvibe Digital Media (ads agency) — NOT owner. BigLead is his **own** venture → never use Realvibe's assets (Realvibe FB page used ONLY for temporary lead testing).
- Not a deep developer — explain plainly, click-by-click. Assistant writes/fixes all code directly.

## STACK
Next.js 16 (App Router, **`proxy.ts` NOT middleware.ts** — Next 16 renamed it; adding middleware.ts breaks the build) / React 19 / TS / Tailwind v4 / shadcn (@base-ui) / Supabase (Postgres+RLS+Auth+Realtime+Storage, project `hqzyikjgxrswcsjelkra`, **Singapore — unchangeable**) / Razorpay / Resend / Meta Graph+WhatsApp Cloud API / Vercel (**Hobby plan = functions locked to Washington D.C.; `vercel.json` pins sin1 but needs Pro to take effect** — biggest latency lever). Libraries added: `lru-cache` (rate limit + TTL cache), `motion` (Framer Motion).

Route groups: `app/(marketing)`, `app/(app)` tenant CRM, **`app/(billing)` = select-plan + onboarding (moved OUT of (app) so the paywall redirect can't loop — the recurring blank-/select-plan bug is structurally dead)**, `app/owner-admin` (owner portal, dark UI).

## KEY IDS / CONFIG
- Meta App **36236187112692266** | Business **1007407678411160**
- **Real WABA `3908425549464700`** ("BigLead", number +91 79828 94432, phone_number_id `1182054614993418`). Old TEST WABA `1716116439389570` — ignore.
- **Embedded Signup Config ID `1549527556820517`** → env `NEXT_PUBLIC_WHATSAPP_CONFIG_ID` (set locally; **must be added in Vercel**).
- `FACEBOOK_VERIFY_TOKEN=biglead_verify_2026` (shared by FB + WhatsApp webhooks). Webhooks: `/api/webhooks/facebook` (leadgen), `/api/webhooks/whatsapp` (messages — text, button taps, media refs, delivery/read statuses).
- Amul's own marketing FB Pixel **1322012359385066** in root layout + `FacebookPixelEvents` route tracking (separate from client CAPI feature).
- Owner portal login: `/owner-admin/login`, password = env `OWNER_SECRET`, cookie `owner_session`. **Proxy now guards /owner-admin on ALL hostnames** (was an open hole on the main domain).

## WHAT'S BUILT & VERIFIED
### Facebook Lead Ads — ✅ LIVE, end-to-end verified (real test lead landed, auto-assigned)
Native capture (no Zapier): OAuth page connect → encrypted page tokens → leadgen webhook (HMAC, idempotent) → shared `ingestLead` pipeline (dedupe→map form→assign→notify→automate). **#1 gotcha: Leads Access Manager (LAM)** — a page with LAM customized silently blocks every CRM until page admin grants access (Page Settings → Leads Access → CRMs → add BigLead). Documented: user guide `/guides/facebook-lead-ads`, amber hint in Settings→Integrations, troubleshooting in `docs/facebook-lead-ads-integration.md`. Testing Tool hides pages subscribed to a Live app (cosmetic); "Send to server" button sends dummy id 444444444444 (skipped as duplicate) — use "Create lead".

### WhatsApp — the flagship (all built this month)
- **Outbound welcome** per-tenant number; template variable convention: **{{1}}=lead name, {{2}}=project name**, extras pad with company name; fallbacks "there"/company name (fixes Meta error **#132000** param mismatch — sender counts the template's distinct vars and matches exactly).
- **Two-way inbound** (mig 016): replies + quick-reply button taps → logged, keyword auto-qualify → moves lead to configured stage + realtime notify. **CRITICAL gotcha: each WABA must be POST-subscribed to the app (`/{waba}/subscribed_apps`)** — app-level webhook field subscription is NOT enough; debugged live (replies silently dropped). `connectWhatsApp` + embedded signup now auto-subscribe.
- **Embedded Signup** (client one-click self-connect): `whatsapp-embedded-signup.tsx` (FB JS SDK, config_id, captures waba_id/phone_number_id from WA_EMBEDDED_SIGNUP postMessage) + `completeWhatsAppEmbeddedSignup` (code→token, auto-subscribe WABA, register number, encrypt+store). Manual entry kept as fallback.
- **Templates** (migs 018/019/020): full pages `/settings/whatsapp-templates` (+ `/new` full-screen create) — live WhatsApp-style preview, Meta approval status sync (**rate-limited: 1 min then 5 min cooldown**), "Use as welcome", interactive buttons (quick replies ≤10 / URL ≤2 / phone 1, 25-char titles), **image headers** (Meta resumable upload for handle + Supabase Storage public URL for send-time), Meta guidance box. Sample fields = distinct vars only.
- **Live Chat** (mig 021) — AiSensy-style inbox at `/inbox` ("Live Chat" in sidebar): conversation list (unread badges), WhatsApp-style thread, ✓/✓✓/blue ✓✓ ticks from status webhooks, **24h window enforcement** (free text inside window; template-only composer outside), **visibility: admins all / agents only conversations assigned to them** (conversation-level assignment + notification), media = **download-on-demand via `/api/whatsapp/media/[id]` proxy — never stored** (user's explicit choice), realtime via Supabase (`realtime.setAuth(token)` REQUIRED — RLS silently drops events otherwise).
- **Analytics**: 30-day sent/failed/replies/reply-rate tiles + **Meta quality rating** (High/Medium/Low spam warning) + sending-limit tier, 5s Graph timeouts, cached 5 min. Full per-number log at `/settings/whatsapp-logs` (filters: sent/failed/replies, error reasons).
- **Bulk ops**: leads list checkboxes → bulk delete (soft, admin, ≤500) + **manual bulk WhatsApp send: ≤30/batch, ≤60/day per company** (constants in `whatsapp-bulk-actions.ts`, designed to be swapped for the future **credit system** — planned revenue model: e.g. 500 credits = 1000 sends/day). **POLICY: CSV imports NEVER auto-message** (protects client WABA quality; documented in `bulkImportLeads`).

### Realtime notifications (mig 017)
Instant chime (Web Audio) + toast + **desktop Notification API** (permission asked on bell open) for: stage changes, assignments, new-lead assigned, qualification, WhatsApp replies/qualify, chat assignment. `lib/notifications/notify.ts` uses **admin client — notifications & activities tables have RLS ON with NO INSERT policy, so user-client inserts silently fail** (known issue: other activity inserts across the app may still silently fail — audit pending).

### Billing: promo codes + expiry enforcement (mig 022) — just built
- **Expiry enforced**: `hasActiveAccess` now requires `current_period_end` in future for ACTIVE (+3-day grace; null = legacy allow). Expired → whole dashboard locks → `/select-plan` shows "Reactivate Your Workspace" + red banner + **promo code box**.
- **Promo codes**: owner portal → **Promos** page (generate custom/auto codes, pick granted plan, duration days, max uses, enable/disable, usage counts). Redeem = subscription ACTIVE at ₹0 for duration, one redemption/company/code, rate-limited 5/min. After redeem: **hard navigation** (`window.location.href`) — router.push raced stale client cache ("nothing happens" bug).
- Known: **Razorpay webhooks likely not reaching prod** (subscriptions last updated May 23) — check Razorpay dashboard webhook URL. "Autopay after promo" = not possible without payment method; promo lapses → lock → pay.
- **Downgrade policy (data retention + feature limits) — DELIBERATELY PARKED, discuss before building.**

### Performance
React `cache()` auth dedup (`lib/auth/cached-user.ts` — layout+actions share ONE auth round-trip; was 4-5×/nav ≈ 2s), `prefetch={false}` on all per-lead links (was ~50 RSC prefetches/page), indexes mig 015 (partial active-leads, pg_trgm search), fail-soft integrations page (`safe()` wrapper — must re-throw `NEXT_*` digests + "Dynamic server usage"), rate limiting (public form 3/10min/IP, billing 40/min, checkout 5/min, webhooks 300/min/IP), `server-cache.ts` TTL cache (FB forms 2 min).

### UI/Marketing
Homepage: light-default **monochrome** theme (NO colorful gradients/glow — user rejected), `Reveal.tsx` scroll animations, `SourcesFlow.tsx` (replaced third-party-logo GIF), cinematic AI section, image logo everywhere (no typed "BigLeadCRM"), footer FB setup guide link, changelog filled (v1.0–v1.3). **Dashboard redesigned**: date header + top-right actions, KPI cards, unified stat strip, pipeline **composition bar** + % rows, stage-colored lead avatars, responsive, no emoji buttons.

## MIGRATIONS (user runs in Supabase SQL Editor — code assumes them!)
015 indexes · 016 WA inbound/qualify · 017 realtime notifications · 018 WA templates · 019 template buttons · 020 header_image_url · 021 live chat · 022 promo codes. **Rule: run migration BEFORE/WITH deploy or features silently break** (e.g. "WhatsApp details gone" = 016 missing; "templates need account linked" = 018 missing).

## TOP GOTCHAS (each cost real debugging)
1. Next 16: `proxy.ts` is the middleware — never create `middleware.ts`.
2. WABA must be individually subscribed to the app for inbound (silent drop otherwise).
3. LAM blocks CRMs until page admin grants access (silent drop).
4. Supabase Realtime + RLS needs `realtime.setAuth(access_token)` on the socket.
5. Template send must match the template's exact distinct-variable count (#132000).
6. 24h customer-service window: free text only within 24h of last inbound; templates otherwise.
7. `.next` stale route types after moving routes → delete `.next`, rebuild.
8. PowerShell reads UTF-8 files as ANSI → mojibake; use `[System.IO.File]::ReadAllText(..., UTF8)`.
9. Server actions body limit raised to 5mb (`next.config.ts`) for image uploads.
10. notifications/activities: RLS on, no INSERT policy → writes must use admin client.

## PENDING / NEXT
- Add `NEXT_PUBLIC_WHATSAPP_CONFIG_ID` in Vercel; run migs 015–022 on prod; deploy; test embedded signup on biglead.site (needs HTTPS + allowlisted domain).
- **Credit system** (revenue model) — swap bulk-send constants for per-company credits; owner grants/sells packs.
- Downgrade policy discussion. Activity-insert RLS audit. Razorpay webhook check. Vercel Pro for sin1. WhatsApp quality-drop alert cron. Live Chat phase 3 (canned replies, search, media send). Get `lead_welcome` approved & set as welcome.
- Meta App Review for advanced perms was approved; app LIVE; permanent token blocked on **email verification** (use temporary token meanwhile).
