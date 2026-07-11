/**
 * Sliding-window rate limiter built on `lru-cache`.
 *
 * Protects public/expensive endpoints (webhooks, billing, lead capture) from
 * floods and abuse so a burst of requests can't take the app down. Bounded
 * memory (max 5000 keys) — old buckets evict automatically.
 *
 * Note: on serverless this is per-instance. It reliably stops the realistic
 * failure modes (one bad client hammering an endpoint, retry storms, form
 * spam). For distributed limits across all instances, swap the store for
 * Upstash Redis later (`@upstash/ratelimit`) without changing call sites.
 */
import { LRUCache } from "lru-cache";
import { headers } from "next/headers";

const buckets = new LRUCache<string, number[]>({ max: 5000 });

export interface RateLimitResult {
  ok: boolean;
  /** Requests remaining in the current window (0 when blocked). */
  remaining: number;
  /** Seconds until the window frees up (only meaningful when blocked). */
  retryAfterSec: number;
}

/**
 * Check + consume one request against a sliding window.
 * @param key    identity to limit on (e.g. `checkout:${userId}`, `lead:${ip}`)
 * @param limit  max requests allowed per window
 * @param windowMs window size in ms
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const windowStart = now - windowMs;

  const timestamps = (buckets.get(key) || []).filter((t) => t > windowStart);

  if (timestamps.length >= limit) {
    const oldest = timestamps[0];
    return {
      ok: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)),
    };
  }

  timestamps.push(now);
  buckets.set(key, timestamps);
  return { ok: true, remaining: limit - timestamps.length, retryAfterSec: 0 };
}

/** Best-effort client IP for keying anonymous/public endpoints. */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown"
  );
}
