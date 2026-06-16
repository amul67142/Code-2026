"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

/**
 * Fires a Facebook Pixel PageView on client-side route changes.
 * The initial page load's PageView is already sent by the pixel snippet in
 * the root layout, so we skip the first run to avoid double-counting.
 * Must be rendered inside a <Suspense> boundary (uses useSearchParams).
 */
export function FacebookPixelEvents() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    window.fbq?.("track", "PageView");
  }, [pathname, searchParams]);

  return null;
}
