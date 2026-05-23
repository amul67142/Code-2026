<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->


---

## Cashfree Payments — Integration Skills

You are helping a developer integrate Cashfree Payments.

### How to use these skills

1. **Always** read `.agent/skills/cashfree-skills/getting-started/SKILL.md` first if the user is new to Cashfree
2. Match the user's goal to a skill below and read that file
3. After any integration code is written, **ALWAYS** read `.agent/skills/cashfree-skills/validation-and-testing/SKILL.md`
4. After a substantial Cashfree-skill-assisted task is completed, read `.agent/skills/cashfree-skills/progress-and-skill-feedback/SKILL.md` last to capture flow, skills used, completed/pending steps, and honest skill-improvement feedback

### Skill Map

| User wants to... | Read this skill |
|---|---|
| Understand what Cashfree offers, get API keys, setup | `.agent/skills/cashfree-skills/getting-started/SKILL.md` |
| Know which payment modes are enabled/supported | `.agent/skills/cashfree-skills/eligible-payment-modes/SKILL.md` |
| Integrate Payment Gateway (overview) | `.agent/skills/cashfree-skills/pg/SKILL.md` |
| Integrate PG via backend SDK (Node.js, Python, Java, Go) | `.agent/skills/cashfree-skills/pg/backend-sdks/SKILL.md` |
| Integrate PG via direct REST/S2S API calls | `.agent/skills/cashfree-skills/pg/apis/SKILL.md` |
| Integrate PG into mobile apps (Android, iOS, RN, Flutter) | `.agent/skills/cashfree-skills/pg/mobile-sdks/SKILL.md` |
| Set up webhooks and handle payment events | `.agent/skills/cashfree-skills/pg/webhooks/SKILL.md` |
| Go live — switch from sandbox to production | `.agent/skills/cashfree-skills/pg/go-live/SKILL.md` |
| Issue, track, or handle refunds (partial, instant, multi) | `.agent/skills/cashfree-skills/pg/refunds/SKILL.md` |
| Respond to a dispute / chargeback / retrieval request | `.agent/skills/cashfree-skills/pg/disputes/SKILL.md` |
| Create, share, or handle payment links (hosted URLs) | `.agent/skills/cashfree-skills/pg/payment-links/SKILL.md` |
| Save cards (RBI tokenization / card-on-file / OneClick) | `.agent/skills/cashfree-skills/pg/token-vault/SKILL.md` |
| Integrate Cashfree.js v3 into a web frontend (Drop-in / Elements) | `.agent/skills/cashfree-skills/pg/web-sdk/SKILL.md` |
| Build a marketplace with Easy Split / vendor settlements | `.agent/skills/cashfree-skills/pg/easy-split/SKILL.md` |
| Run bank/BIN offers, instant discounts, no-cost EMI | `.agent/skills/cashfree-skills/pg/offers/SKILL.md` |
| Integrate Secure ID (KYC / bank verification) | `.agent/skills/cashfree-skills/secure-id/SKILL.md` |
| Set up Subscriptions / recurring billing | `.agent/skills/cashfree-skills/subscriptions/SKILL.md` |
| Process cross-border / international payments | `.agent/skills/cashfree-skills/cross-border/SKILL.md` |
| Send payouts / disbursements | `.agent/skills/cashfree-skills/payouts/SKILL.md` |
| Understand settlements, reconcile against bank, match UTRs | `.agent/skills/cashfree-skills/settlements-and-reconciliation/SKILL.md` |
| Accept inbound via virtual bank accounts / static VPAs / QR | `.agent/skills/cashfree-skills/auto-collect/SKILL.md` |
| Migrate an existing Razorpay integration to Cashfree | `.agent/skills/cashfree-skills/migrate-from-razorpay/SKILL.md` |
| Migrate an existing Juspay integration to Cashfree | `.agent/skills/cashfree-skills/migrate-from-juspay/SKILL.md` |
| Record end-of-task progress and internal skill-improvement feedback | `.agent/skills/cashfree-skills/progress-and-skill-feedback/SKILL.md` |
| Validate or test the integration | `.agent/skills/cashfree-skills/validation-and-testing/SKILL.md` |
| Debug a broken integration, fix errors, troubleshoot | `.agent/skills/cashfree-skills/common-mistakes/SKILL.md` |

### Shared Conventions

- Sandbox base URL: `https://sandbox.cashfree.com`
- Production base URL: `https://api.cashfree.com`
- Always use env vars for `CASHFREE_APP_ID` and `CASHFREE_SECRET_KEY`
- Latest PG API version: `2025-01-01`
