"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Automatically signs the user out after 1 hour of inactivity (no mouse/keyboard
 * activity). The timer resets on any user activity. On timeout, signs out and
 * redirects to /login?reason=timeout.
 *
 * To make this an ABSOLUTE 1-hour session (regardless of activity), remove the
 * activity listeners and set lastActivity once on mount.
 */
const TIMEOUT_MS = 60 * 60 * 1000; // 1 hour
const CHECK_MS = 60 * 1000; // check every minute

export function AutoLogout() {
  const router = useRouter();
  const lastActivity = useRef<number>(Date.now());

  useEffect(() => {
    const markActive = () => {
      lastActivity.current = Date.now();
    };
    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"];
    events.forEach((e) => window.addEventListener(e, markActive, { passive: true }));

    const interval = setInterval(async () => {
      if (Date.now() - lastActivity.current >= TIMEOUT_MS) {
        clearInterval(interval);
        try {
          await createClient().auth.signOut();
        } catch {
          /* ignore */
        }
        router.replace("/login?reason=timeout");
      }
    }, CHECK_MS);

    return () => {
      events.forEach((e) => window.removeEventListener(e, markActive));
      clearInterval(interval);
    };
  }, [router]);

  return null;
}
