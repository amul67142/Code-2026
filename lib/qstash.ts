/**
 * Upstash QStash — the scheduler, the same way Prasaar uses it.
 *
 * Vercel's Hobby plan runs a cron at most once a day. A QStash schedule calls
 * our endpoints as often as we like (hourly for billing), signing each request
 * so only QStash can trigger them. Without the keys this is all off and the
 * daily Vercel cron still runs — both can be on at once, since every job here
 * is safe to run twice.
 */
import { Receiver } from "@upstash/qstash";

export function qstashEnabled(): boolean {
  return Boolean(process.env.QSTASH_CURRENT_SIGNING_KEY && process.env.QSTASH_NEXT_SIGNING_KEY);
}

/** True when the request really came from our QStash account. */
export async function verifyQStashSignature(signature: string | null, body: string): Promise<boolean> {
  const current = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const next = process.env.QSTASH_NEXT_SIGNING_KEY;
  if (!signature || !current || !next) return false;
  try {
    return await new Receiver({ currentSigningKey: current, nextSigningKey: next }).verify({ signature, body });
  } catch {
    return false;
  }
}
