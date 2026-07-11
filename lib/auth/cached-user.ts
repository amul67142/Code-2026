/**
 * Request-scoped cached auth helpers (React `cache()`).
 *
 * `supabase.auth.getUser()` is a network round-trip to Supabase's auth server
 * (~100-300ms). Layouts, pages and their data helpers each used to call it
 * independently — one navigation could pay that cost 4-5 times. Wrapping the
 * lookups in React's `cache()` deduplicates them to ONE call per request.
 *
 * Safe: the cache lives only for the lifetime of a single server request, so
 * there's never cross-user or stale-session leakage.
 */
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/** The authenticated Supabase auth user (or null) — deduped per request. */
export const getCachedAuthUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
});

/** The user's CRM profile (id, company_id, role) — deduped per request. */
export const getCachedUserProfile = cache(async () => {
  const user = await getCachedAuthUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("users")
    .select("id, company_id, role")
    .eq("auth_user_id", user.id)
    .single();

  return profile;
});
