/**
 * Server-side TTL cache built on `lru-cache`.
 *
 * Use for expensive/slow external calls (Graph API, etc.) that are requested
 * repeatedly with the same inputs — e.g. listing a Page's lead forms every
 * time the integrations screen opens. Bounded (max 500 entries) so it can
 * never grow unbounded and crash the process.
 *
 * Note: on serverless (Vercel) this cache is per-instance — it still absorbs
 * the common burst patterns (same user refreshing, polling loops) which is
 * where the pain comes from.
 */
import { LRUCache } from "lru-cache";

const store = new LRUCache<string, { value: unknown; expires: number }>({
  max: 500,
});

/**
 * Wrap an async producer with a TTL cache.
 * @param key      unique cache key (include ids: e.g. `fb-forms:${pageId}`)
 * @param ttlMs    how long to serve the cached value
 * @param producer called only on cache miss
 */
export async function cached<T>(
  key: string,
  ttlMs: number,
  producer: () => Promise<T>
): Promise<T> {
  const hit = store.get(key);
  if (hit && hit.expires > Date.now()) {
    return hit.value as T;
  }
  const value = await producer();
  store.set(key, { value, expires: Date.now() + ttlMs });
  return value;
}

/** Invalidate a cached key (call after a mutation that changes the data). */
export function invalidateCache(key: string): void {
  store.delete(key);
}
