import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Root middleware — runs on every matched request.
 *
 * 1. Refreshes the Supabase auth session so server components/layouts always
 *    see a fresh, valid session (required by the Supabase SSR pattern —
 *    without this, fresh tabs / token expiry leave the server with a stale or
 *    unreadable session, which broke /select-plan after signup).
 * 2. Injects an `x-pathname` request header so server layouts can run
 *    path-based redirect logic (used by app/(app)/layout.tsx).
 */
export async function middleware(request: NextRequest) {
  const { supabaseResponse } = await updateSession(request);
  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, robots, sitemap
     * - common static asset extensions
     */
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp4|woff|woff2|ttf)$).*)",
  ],
};
