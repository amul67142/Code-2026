/**
 * Supabase browser client — used in Client Components.
 * Uses NEXT_PUBLIC_* keys (anon key only, safe for browser).
 */
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
