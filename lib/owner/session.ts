/**
 * The owner portal session.
 *
 * The cookie holds an HMAC of a fixed message, keyed with OWNER_SECRET, so it
 * can only be produced by someone who knows the password. Checking that a
 * cookie merely exists is not enough: anyone can set one in their browser.
 * Web Crypto rather than node:crypto, because proxy.ts uses this too.
 */
import { cookies } from "next/headers";

export const OWNER_COOKIE = "owner_session";

export async function ownerSessionToken(): Promise<string | null> {
  const secret = process.env.OWNER_SECRET;
  if (!secret) return null;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", key, enc.encode("biglead-owner-session-v1"));
  return Array.from(new Uint8Array(mac), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function isOwnerToken(value: string | undefined): Promise<boolean> {
  const expected = await ownerSessionToken();
  if (!value || !expected || value.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= value.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

/** For server actions: they can be called directly, so each one must check. */
export async function isOwner(): Promise<boolean> {
  const store = await cookies();
  return isOwnerToken(store.get(OWNER_COOKIE)?.value);
}

export async function assertOwner(): Promise<void> {
  if (!(await isOwner())) throw new Error("Unauthorized");
}
