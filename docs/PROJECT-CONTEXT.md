# BigLead CRM — Project Context / Handoff

> Paste-ready context to resume work in a fresh chat. Last updated: June 2026.

## WHO / WHAT
- **Project:** BigLead CRM — multi-tenant B2B SaaS lead-management CRM. India-first, **horizontal** (any lead-gen business, not just real estate). Domain: **biglead.site**. Tagline "Accelerate Lead Conversion."
- **Location:** `C:\my folder\realleads`
- **User:** Amul Sharma. **Employee** at Realvibe Digital Media (ads agency) — NOT owner. BigLead is his **own** venture → never use Realvibe's business/assets for BigLead (he did temporarily use Realvibe's FB page only for lead testing).
- Not a deep developer — explain plainly, click-by-click. Cursor/IDE-agent quota exhausted → assistant writes/fixes all code directly.

## STACK
Next.js 16 (App Router) / React 19 / TypeScript / Tailwind v4 / shadcn (on `@base-ui/react`) / Supabase (Postgres+Auth+RLS+Storage, project `hqzyikjgxrswcsjelkra`) / Razorpay / Resend / Meta CAPI / WhatsApp Cloud API / Vercel. Font Inter. GoHighLevel-style clean white/minimal UI.
3 surfaces: `app/(marketing)`, `app/(app)` tenant CRM, `app/owner-admin` (owner.* subdomain). Server Actions = main mutation pattern. RLS isolates by `company_id`. Roles: SUPER_ADMIN>ADMIN>TEAM_LEAD>AGENT>READ_ONLY.

## BUILT THIS SESSION (all typecheck clean)
1. **Native Facebook Lead Ads (no Zapier):** migration 010 (facebook_connections, facebook_lead_forms, facebook_webhook_events); `lib/integrations/crypto.ts` (AES-256-GCM), `facebook-graph.ts`; `lib/leads/ingest.ts` (shared pipeline: dedupe→assign→notify→automate); `app/api/webhooks/facebook/route.ts` (GET handshake + POST receiver, signature verify, idempotency, Graph fetch); OAuth callback + `facebook-actions.ts` + `facebook-forms-manager.tsx` (form→project mapping UI).
2. **Email automation:** migration 011 (message_log); `lib/automation/lead-email.ts` (project-specific welcome via Resend, logs to message_log); hooked into ingestLead + createLead; per-lead status card + Resend button; Reports → Email tab.
3. **WhatsApp automation (Meta Cloud API):** migration 012 (whatsapp_connections); `lib/integrations/whatsapp.ts` + `lib/automation/lead-whatsapp.ts`; hooked into ingestLead + createLead; `whatsapp-actions.ts` + `whatsapp-card.tsx` (Settings→Integrations connect/test).
4. **Fixes:** disconnect now HARD-deletes (FB + WhatsApp) for clean reconnect; `getURL()` for production-safe OAuth redirect; bigload→biglead typo fixed; `.env.production` sets NEXT_PUBLIC_APP_URL.
5. **Docs:** ARCHITECTURE.md, facebook-lead-ads-integration.md, facebook-lead-ads-build-journal.md, messaging-automation-engine.md, this file.

## META/FACEBOOK STATUS
- App ID **36236187112692266** | Business ID **1007407678411160** | WABA ID **1716116439389570**
- Business Verification ✅ | Tech Provider/Access Verification ✅ APPROVED | App is **LIVE** | **App Review (advanced perms) ⏳ IN REVIEW**
- Perms: leads_retrieval, pages_show_list, pages_read_engagement, pages_manage_metadata, pages_manage_ads, business_management, whatsapp_business_management, whatsapp_business_messaging
- API test calls: whatsapp_business_messaging ✅, whatsapp_business_management ✅ (~24h to register), pages_* ✅, **leads_retrieval ⏳ needs one real test lead**.

## GOTCHAS
- **www vs non-www:** OAuth redirect_uri sent `www.biglead.site` → register BOTH in Meta Valid OAuth Redirect URIs; pick ONE canonical domain; set NEXT_PUBLIC_APP_URL in Vercel to match.
- **Lead Ads Testing Tool blank** when a page is connected to the LIVE-but-unapproved app → switch app to **Development mode** to test (admin gets full access), or wait for review.
- Generic "Send to server" test button always sends fake leadgen_id `444444444444` (already processed → idempotency skips) → use real Testing Tool "Create lead."
- `FACEBOOK_TOKEN_ENC_KEY` must be identical across envs. `FACEBOOK_VERIFY_TOKEN=biglead_verify_2026`. Prod webhook: `https://biglead.site/api/webhooks/facebook`, subscribe `leadgen`.

## DECISIONS
Messaging first, AI calling deferred. WhatsApp = Meta Cloud API direct (embedded signup planned). SMS = platform-level India DLT (client name in template vars, like Paramantra CRM), pass cost to clients — deferred. One platform Meta app + per-client encrypted tokens. Email free via Resend (verify biglead.site domain for real sends). User needs own Udyam/sole-prop for Razorpay + Meta (Tech Provider now approved under biglead.site).

## PENDING / NEXT
- Wait for App Review. Activate leads_retrieval via one real test lead (Dev mode if tool blank).
- Create a TEST ACCOUNT with subscriptions.status=ACTIVE (bypass paywall) for the Meta reviewer.
- Deploy to biglead.site (Vercel): set env (NEXT_PUBLIC_APP_URL, FACEBOOK_TOKEN_ENC_KEY, all), run migrations 011+012, update Meta OAuth redirect + webhook to biglead.site.
- TO BUILD: WhatsApp embedded signup, per-lead WhatsApp status card + Reports WhatsApp tab, Resend webhook (open tracking), custom WhatsApp welcome template, SMS, AI calling, sequenced follow-ups, CSV import.
