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

