# RealLeads CRM - Context up to Phase 3

## Project Overview
RealLeads CRM is a multi-tenant B2B SaaS Customer Relationship Management system designed for modern real estate professionals. It is built using Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4, Shadcn/ui, and Supabase (PostgreSQL + Auth).

## Current Status
We have successfully completed **Phase 1 (Foundation)**, **Phase 2 (Database & Migration)**, and **Phase 3 (Authentication & Onboarding)**.

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

## Next Steps (Phase 4 and Beyond)
- **Dashboard & CRM Features**: Begin fetching actual metrics from the database.
- **Lead Management**: Implement `/leads` tables, creation forms, Kanban boards, and pipeline stage management.
- **Project Settings**: Implement configuration pages.

## Known Architecture Decisions
- Next.js Server Components are favored for data fetching.
- Supabase RLS is strictly enforced; application-level APIs should rely on RLS policies to restrict tenant access rather than manual application-level scoping where possible.
- Any bypassing of RLS (e.g., during signups or webhook events) happens via `getAdminClient()` (`SUPABASE_SERVICE_ROLE_KEY`).
