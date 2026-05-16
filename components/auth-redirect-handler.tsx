"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Detects Supabase Auth hash fragments on the root page.
 * If the URL contains #access_token=...&type=invite, redirects to /invite
 * so the invite acceptance flow can handle it properly.
 */
export function AuthRedirectHandler() {
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes("type=invite")) {
      // Redirect to /invite page, preserving the hash fragment
      window.location.href = `/invite${hash}`;
    }
  }, []);

  return null; // This component renders nothing
}
