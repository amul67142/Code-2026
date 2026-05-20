# RealLeads CRM - Context up to Phase 4

## Project Overview
RealLeads CRM is a multi-tenant B2B SaaS Customer Relationship Management system designed for modern real estate professionals. It is built using Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4, Shadcn/ui, and Supabase (PostgreSQL + Auth).

## Current Status
We have successfully completed **Phase 1 (Foundation)**, **Phase 2 (Database & Migration)**, **Phase 3 (Authentication & Onboarding)**, and **Phase 4 (Marketing & Funnel Integration)**.

---

### Phase 1: Foundation (Completed)
- Bootstrapped Next.js application with Tailwind CSS v4 and Shadcn/ui.
- Setup core project structure and base layouts.
- Designed modern UI skeletons for Marketing Pages (`/login`, `/signup`) and the Application Shell (`Sidebar`, `Header`).

### Phase 2: Database Schema & Migrations (Completed)
- Designed a comprehensive multi-tenant schema with Row Level Security (RLS) on `company_id`.
- Created robust Supabase PostgreSQL migrations encompassing tables for `companies`, `users`, `projects`, `pipeline_stages`, `leads`, `activities`, and more.
- Created `seed.sql` to populate default data.
- Built a Node.js script (`scripts/run-migration.mjs`) leveraging `postgres` to run SQL migrations directly via connection string, resolving permission (`42501`) constraints with the Supabase `auth` schema by strictly using `public` schema implementations.

### Phase 3: Authentication & Multi-Tenant Onboarding (Completed)
- Added environment variables securely, including `RESEND_API_KEY` for email automation (via Supabase custom SMTP) and direct Supabase database credentials.
- Integrated `@supabase/ssr` for server-side auth. Created Server Actions for Login, Signup, and Logout.
- Built client-side React 19 `useTransition` form components for `/login` and `/signup` with loading states and Sonner toasts.
- Implemented the `/onboarding` flow. When new users authenticate, they enter their name and company.
- A custom Supabase Admin (`service_role`) Server Action bypasses RLS to instantiate their `companies` record and their `SUPER_ADMIN` `users` profile.
- Hardened Application Routing Security: Updated `middleware.ts` to inject the current `x-pathname` into the request headers and `app/(app)/layout.tsx` to automatically query the user profile and force redirects to `/onboarding` if the user is incomplete.
- Implemented link-based password reset security checks via custom `/verify` routing, resolving browser hash fragment issues.

### Phase 4: Marketing Page Modernization & Lead Capture Funnel (Completed)
- **Visual & Aesthetic Overhaul:** Applied a premium neutral metallic monochrome styling across the homepage using a harmonious palette (zinc, gray, black, and white) with smooth 500ms transitions (`duration-500`) for dark/light mode toggle.
- **Floating 3D Hero Shield:** Integrated a 3D tilted landing page illustration (`perspective(1200px) rotateX(15deg)`) styled with linear gradient masks to prevent visual noise.
- **Dynamic Brand Logos:** Engineered opacity-based crossfades for light and dark modes to avoid visual shifts on state toggles.
- **Interactive AI Voice & Site Visit Flows:** Developed animated waveform calling waves and hovering indicator assets with custom CSS animations (`call-wave` pulse waves and `float-up-down` hovering controls).
- **Lead Capture System:** Built a high-conversion responsive React dialog modal wired to a Next.js Server Action (`submit-lead.ts`). The form captures leads and dynamically dispatches styled HTML notification profiles directly to `amul67142@gmail.com` using the Resend API with modern success check animations.
- **Ingestion Connectivity Visualization:** Integrated the optimized workflow connectivity GIF (`biglead-ezgif.com-optimize_z1dmf5.gif`) into the "Use Cases" section. This demonstrates how multi-channel inbound leads settle into the CRM platform under a premium, hover-scaling glassmorphic container.
- **Google Analytics Integration:** Embedded global tracking tags (`G-HKP97THEQ3`) using Next.js’s high-performance `<Script>` wrapper with an optimized loading strategy (`afterInteractive`).
- **Dynamic Favicon Assets:** Created high-resolution brand favicon assets (`app/icon.png`) and removed legacy static cached files (`app/favicon.ico`) to ensure instant multi-resolution browser parsing.

---

## Known Architecture Decisions
- Next.js Server Components are favored for data fetching.
- Supabase RLS is strictly enforced; application-level APIs should rely on RLS policies to restrict tenant access rather than manual application-level scoping where possible.
- Any bypassing of RLS (e.g., during signups or onboarding) is handled securely via server actions using `getAdminClient()` with the protected `SUPABASE_SERVICE_ROLE_KEY`.
- Resend integration is lazy-initialized in the backend to ensure zero impact on frontend bundles.
