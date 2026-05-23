@AGENTS.md
 Remaining Phases to Build:
Phase 8: CSV Import & Export
Remaining: You have the CSV_IMPORT source in your database, but the actual UI to upload a CSV, map columns, validate data, and run bulk imports/exports has not been built yet.
Phase 12: Tasks Enhancement
Remaining: Auto-marking overdue tasks and deep logging for task-specific activities.
Phase 13: Background Jobs (Cron)
Remaining: Implementing a background worker (like Inngest or simple Vercel Cron) to handle daily digests, task reminders, trial expiries, and weekly reports.
Phase 14: Reports & Analytics
Remaining: Building a dedicated /reports dashboard with Recharts to visualize Agent performance, Pipeline conversion, and Campaign sources. done
Phase 15: Billing (Razorpay)
Remaining: Connecting Razorpay APIs to handle subscriptions, webhooks, cancellations, and invoices on the Billing settings page.
Phase 16: Emails
Remaining: Integrating SendGrid and configuring the 10 automated email templates (Welcome, Invite, New Lead, Reminders).
Phase 21: Testing & Hardening
Remaining: Writing unit tests, webhook tests, and performing a strict security audit on Supabase RLS policies.
🚧 Partially Completed:
Phase 11: Assignment Logic
Done: Basic Round-Robin logic is built (the /settings/routing toggle page) and specific agent assignment works.
Remaining: Advanced "Rule Engine Builder UI" (e.g., if lead budget > 1Cr, assign to senior agent) and strict "Capacity Limits" enforcement.
Phase 17: Real-Time & Notifications
Done: In-app notification bell and assignment alerts.
Remaining: FCM (Firebase Cloud Messaging) Push Notifications for mobile devices and live Supabase Realtime subscriptions (currently it uses 30-second polling).
✅ Fully Completed:
Phase 18: Frontend Polish: Dashboard KPIs, fully functional Kanban board, and mobile-responsive layout/sidebars are done done
Phase 19: Onboarding Wizard: The multi-step company onboarding with pipeline generation is complete done

---

## Cashfree Payments — Integration Skills

You are helping a developer integrate Cashfree Payments.

### How to use these skills

1. **Always** read `.claude/skills/cashfree-skills/getting-started/SKILL.md` first if the user is new to Cashfree
2. Match the user's goal to a skill below and read that file
3. After any integration code is written, **ALWAYS** read `.claude/skills/cashfree-skills/validation-and-testing/SKILL.md`
4. After a substantial Cashfree-skill-assisted task is completed, read `.claude/skills/cashfree-skills/progress-and-skill-feedback/SKILL.md` last to capture flow, skills used, completed/pending steps, and honest skill-improvement feedback

### Skill Map

| User wants to... | Read this skill |
|---|---|
| Understand what Cashfree offers, get API keys, setup | `.claude/skills/cashfree-skills/getting-started/SKILL.md` |
| Know which payment modes are enabled/supported | `.claude/skills/cashfree-skills/eligible-payment-modes/SKILL.md` |
| Integrate Payment Gateway (overview) | `.claude/skills/cashfree-skills/pg/SKILL.md` |
| Integrate PG via backend SDK (Node.js, Python, Java, Go) | `.claude/skills/cashfree-skills/pg/backend-sdks/SKILL.md` |
| Integrate PG via direct REST/S2S API calls | `.claude/skills/cashfree-skills/pg/apis/SKILL.md` |
| Integrate PG into mobile apps (Android, iOS, RN, Flutter) | `.claude/skills/cashfree-skills/pg/mobile-sdks/SKILL.md` |
| Set up webhooks and handle payment events | `.claude/skills/cashfree-skills/pg/webhooks/SKILL.md` |
| Go live — switch from sandbox to production | `.claude/skills/cashfree-skills/pg/go-live/SKILL.md` |
| Issue, track, or handle refunds (partial, instant, multi) | `.claude/skills/cashfree-skills/pg/refunds/SKILL.md` |
| Respond to a dispute / chargeback / retrieval request | `.claude/skills/cashfree-skills/pg/disputes/SKILL.md` |
| Create, share, or handle payment links (hosted URLs) | `.claude/skills/cashfree-skills/pg/payment-links/SKILL.md` |
| Save cards (RBI tokenization / card-on-file / OneClick) | `.claude/skills/cashfree-skills/pg/token-vault/SKILL.md` |
| Integrate Cashfree.js v3 into a web frontend (Drop-in / Elements) | `.claude/skills/cashfree-skills/pg/web-sdk/SKILL.md` |
| Build a marketplace with Easy Split / vendor settlements | `.claude/skills/cashfree-skills/pg/easy-split/SKILL.md` |
| Run bank/BIN offers, instant discounts, no-cost EMI | `.claude/skills/cashfree-skills/pg/offers/SKILL.md` |
| Integrate Secure ID (KYC / bank verification) | `.claude/skills/cashfree-skills/secure-id/SKILL.md` |
| Set up Subscriptions / recurring billing | `.claude/skills/cashfree-skills/subscriptions/SKILL.md` |
| Process cross-border / international payments | `.claude/skills/cashfree-skills/cross-border/SKILL.md` |
| Send payouts / disbursements | `.claude/skills/cashfree-skills/payouts/SKILL.md` |
| Understand settlements, reconcile against bank, match UTRs | `.claude/skills/cashfree-skills/settlements-and-reconciliation/SKILL.md` |
| Accept inbound via virtual bank accounts / static VPAs / QR | `.claude/skills/cashfree-skills/auto-collect/SKILL.md` |
| Migrate an existing Razorpay integration to Cashfree | `.claude/skills/cashfree-skills/migrate-from-razorpay/SKILL.md` |
| Migrate an existing Juspay integration to Cashfree | `.claude/skills/cashfree-skills/migrate-from-juspay/SKILL.md` |
| Record end-of-task progress and internal skill-improvement feedback | `.claude/skills/cashfree-skills/progress-and-skill-feedback/SKILL.md` |
| Validate or test the integration | `.claude/skills/cashfree-skills/validation-and-testing/SKILL.md` |
| Debug a broken integration, fix errors, troubleshoot | `.claude/skills/cashfree-skills/common-mistakes/SKILL.md` |

### Shared Conventions

- Sandbox base URL: `https://sandbox.cashfree.com`
- Production base URL: `https://api.cashfree.com`
- Always use env vars for `CASHFREE_APP_ID` and `CASHFREE_SECRET_KEY`
- Latest PG API version: `2025-01-01`
