import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/** Routes that require authentication */
const PROTECTED_ROUTES = [
  "/dashboard",
  "/leads",
  "/tasks",
  "/projects",
  "/reports",
  "/settings",
  "/onboarding",
];

/** Routes that authenticated users should be redirected away from */
const AUTH_ROUTES = ["/login", "/signup"];

/**
 * Middleware — runs on every matched request.
 * 1. Refreshes Supabase session
 * 2. Redirects unauthenticated users to /login on protected routes
 * 3. Redirects authenticated users away from /login and /signup
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Set pathname in request headers so server components can read it
  request.headers.set("x-pathname", pathname);

  // Refresh Supabase session
  const { user, supabaseResponse } = await updateSession(request);

  // Check if route is protected
  const isProtected = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  // Check if route is an auth route (login/signup)
  const isAuthRoute = AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  // Redirect unauthenticated users to login
  if (isProtected && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from auth pages
  if (isAuthRoute && user) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    return NextResponse.redirect(dashboardUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     * - API routes (handled separately)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api/).*)",
  ],
};
