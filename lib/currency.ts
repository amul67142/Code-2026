/**
 * Live INR → USD exchange rate fetcher with in-memory caching.
 * Uses the free exchangerate.host / cdn API.
 * Cached for 1 hour to avoid hammering the API on every page load.
 */

let cachedRate: number | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour
const FALLBACK_RATE = 85; // sensible fallback if API fails

/**
 * Returns how many INR = 1 USD (e.g. 85).
 */
export async function getINRtoUSDRate(): Promise<number> {
  const now = Date.now();
  if (cachedRate && now - cacheTimestamp < CACHE_DURATION) {
    return cachedRate;
  }

  try {
    // Free API — no key needed
    const res = await fetch(
      "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json",
      { next: { revalidate: 3600 } } // Next.js data cache for 1hr
    );
    if (!res.ok) throw new Error(`API returned ${res.status}`);
    const data = await res.json();
    const rate = data?.usd?.inr;
    if (typeof rate === "number" && rate > 0) {
      cachedRate = rate;
      cacheTimestamp = now;
      return rate;
    }
    throw new Error("Invalid rate data");
  } catch (err) {
    console.warn("[currency] Failed to fetch live rate, using fallback:", err);
    return cachedRate || FALLBACK_RATE;
  }
}

/**
 * Convert INR amount to USD display string.
 * e.g. 749 INR → "$9" (if rate is ~85)
 */
export async function convertINRtoUSD(inrAmount: number): Promise<string> {
  const rate = await getINRtoUSDRate();
  const usd = Math.round(inrAmount / rate);
  return `$${usd}`;
}

/**
 * Format INR amount with commas.
 * e.g. 1599 → "₹1,599"
 */
export function formatINR(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}
