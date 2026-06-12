/**
 * Facebook Graph API client for BigLead CRM.
 * All functions use the pinned Graph API version from env.
 * NEVER log tokens or the app secret.
 */

import { getURL } from "@/lib/utils";

const V = process.env.FACEBOOK_GRAPH_VERSION || "v21.0";
const BASE = `https://graph.facebook.com/${V}`;

// ── Shared redirect_uri constant ─────────────────────────────────
// Used in BOTH the OAuth dialog (start) and the token exchange (callback).
// Must be byte-for-byte identical in both places — Facebook rejects mismatches.
// getURL() resolves NEXT_PUBLIC_APP_URL → Vercel production URL → localhost (dev).
export function getFacebookRedirectUri(): string {
  return `${getURL()}/api/integrations/facebook/oauth/callback`;
}

// ── Token Exchange ───────────────────────────────────────────────

/**
 * Exchange an OAuth authorization code for a short-lived user token.
 */
export async function exchangeCodeForToken(
  code: string,
  redirectUri: string
): Promise<{ access_token: string; token_type: string; expires_in?: number } & Record<string, unknown>> {
  const url = new URL(`${BASE}/oauth/access_token`);
  url.searchParams.set("client_id", process.env.FACEBOOK_APP_ID!);
  url.searchParams.set("client_secret", process.env.FACEBOOK_APP_SECRET!);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("code", code);

  const res = await fetch(url.toString());
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Facebook code exchange failed: ${err?.error?.message || res.statusText}`);
  }
  return res.json();
}

/**
 * Exchange a short-lived user token for a long-lived one (~60 days).
 */
export async function exchangeLongLivedToken(
  shortToken: string
): Promise<{ access_token: string; expires_in?: number }> {
  const url = new URL(`${BASE}/oauth/access_token`);
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", process.env.FACEBOOK_APP_ID!);
  url.searchParams.set("client_secret", process.env.FACEBOOK_APP_SECRET!);
  url.searchParams.set("fb_exchange_token", shortToken);

  const res = await fetch(url.toString());
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Long-lived token exchange failed: ${err?.error?.message || res.statusText}`);
  }
  return res.json();
}

// ── Page Management ──────────────────────────────────────────────

/**
 * List the Pages the user manages, each with its own Page Access Token.
 * Note: Only returns Pages where the user is a direct admin.
 * Business-Manager-owned Pages may not appear here.
 */
export async function getUserPages(
  userToken: string
): Promise<{ data: Array<{ id: string; name: string; access_token: string }> }> {
  const res = await fetch(
    `${BASE}/me/accounts?fields=id,name,access_token&access_token=${userToken}`
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Failed to fetch user pages: ${err?.error?.message || res.statusText}`);
  }
  return res.json();
}

/**
 * Subscribe a Page to this app's webhook for the leadgen field.
 */
export async function subscribePage(
  pageId: string,
  pageToken: string
): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE}/${pageId}/subscribed_apps`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subscribed_fields: ["leadgen"],
      access_token: pageToken,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Failed to subscribe page: ${err?.error?.message || res.statusText}`);
  }
  return res.json();
}

/**
 * Unsubscribe a Page from this app's webhook (stops all leadgen events).
 * Called on disconnect so Facebook stops sending leads for this Page.
 */
export async function unsubscribePage(
  pageId: string,
  pageToken: string
): Promise<{ success: boolean }> {
  const res = await fetch(
    `${BASE}/${pageId}/subscribed_apps?access_token=${pageToken}`,
    { method: "DELETE" }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Failed to unsubscribe page: ${err?.error?.message || res.statusText}`);
  }
  return res.json();
}

// ── Lead Forms ───────────────────────────────────────────────────

/**
 * List Instant Forms on a Page.
 */
export async function getLeadForms(
  pageId: string,
  pageToken: string
): Promise<{ data: Array<{ id: string; name: string; status: string }> }> {
  const res = await fetch(
    `${BASE}/${pageId}/leadgen_forms?fields=id,name,status&access_token=${pageToken}`
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Failed to fetch lead forms: ${err?.error?.message || res.statusText}`);
  }
  return res.json();
}

/**
 * Fetch the actual lead field data for a leadgen_id.
 * Used by the webhook receiver (not this task, but included for completeness).
 */
export async function getLeadData(
  leadgenId: string,
  pageToken: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  const fields =
    "id,created_time,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,form_id,field_data";
  const res = await fetch(
    `${BASE}/${leadgenId}?fields=${fields}&access_token=${pageToken}`
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Failed to fetch lead data: ${err?.error?.message || res.statusText}`);
  }
  return res.json();
}
