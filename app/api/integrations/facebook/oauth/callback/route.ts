import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { getURL } from "@/lib/utils";
import { encryptToken } from "@/lib/integrations/crypto";
import {
  exchangeCodeForToken,
  exchangeLongLivedToken,
  getUserPages,
  subscribePage,
  getFacebookRedirectUri,
} from "@/lib/integrations/facebook-graph";

/**
 * Facebook OAuth Callback Handler
 *
 * Flow:
 * 1. Validate CSRF state cookie
 * 2. Exchange code → short-lived user token
 * 3. Exchange → long-lived user token
 * 4. List user's Pages (each has its own Page Access Token)
 * 5. Auto-connect ALL pages (structured for future page-picker)
 * 6. Encrypt & store each page token → UPSERT facebook_connections
 * 7. Subscribe each page to leadgen webhook
 * 8. Redirect back to settings/integrations
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");
  const errorReason = searchParams.get("error_reason");

  const appUrl = getURL();
  const settingsUrl = `${appUrl}/settings/integrations`;

  // ── Handle user-denied / errors from Facebook ─────────────────
  if (errorParam) {
    console.error("Facebook OAuth error:", errorParam, errorReason);
    return NextResponse.redirect(
      `${settingsUrl}?fb=error&msg=${encodeURIComponent(errorReason || errorParam)}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${settingsUrl}?fb=error&msg=${encodeURIComponent("Missing code or state parameter")}`
    );
  }

  // ── 1. Validate CSRF state ────────────────────────────────────
  const cookieStore = await cookies();
  const savedState = cookieStore.get("fb_oauth_state")?.value;

  if (!savedState || savedState !== state) {
    console.error("Facebook OAuth CSRF validation failed");
    return NextResponse.redirect(
      `${settingsUrl}?fb=error&msg=${encodeURIComponent("Security validation failed. Please try again.")}`
    );
  }

  // Decode the state payload to get company_id and user_id
  let companyId: string;
  let userId: string;
  try {
    const payload = JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
    companyId = payload.companyId;
    userId = payload.userId;
    if (!companyId || !userId) throw new Error("Missing companyId or userId in state");
  } catch {
    return NextResponse.redirect(
      `${settingsUrl}?fb=error&msg=${encodeURIComponent("Invalid state parameter")}`
    );
  }

  // Clear the state cookie
  cookieStore.delete("fb_oauth_state");

  try {
    // ── 2. Exchange code → short-lived user token ─────────────
    const redirectUri = getFacebookRedirectUri(); // same constant used in startFacebookOAuth
    const tokenResult = await exchangeCodeForToken(code, redirectUri);
    const shortLivedToken = tokenResult.access_token;

    // ── 3. Exchange → long-lived user token ───────────────────
    const longLived = await exchangeLongLivedToken(shortLivedToken);
    const userToken = longLived.access_token;

    // ── 4. List user's Pages ──────────────────────────────────
    const pagesResult = await getUserPages(userToken);
    const pages = pagesResult.data || [];

    if (pages.length === 0) {
      return NextResponse.redirect(
        `${settingsUrl}?fb=error&msg=${encodeURIComponent("No Facebook Pages found. Make sure you are an admin of at least one Page.")}`
      );
    }

    // ── 5. Auto-connect ALL pages ─────────────────────────────
    // Wrapped in a loop so a page-picker can filter `pages` later
    // without refactoring the per-page logic.
    const admin = createAdminClient();
    let connectedCount = 0;
    const errors: string[] = [];

    for (const page of pages) {
      try {
        await connectPage({
          admin,
          companyId,
          userId,
          page,
          userToken,
        });
        connectedCount++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`Failed to connect page ${page.id} (${page.name}):`, msg);

        // Handle unique violation — page already connected to another company
        if (msg.includes("unique") || msg.includes("duplicate")) {
          errors.push(`"${page.name}" is already connected to another account`);
        } else {
          errors.push(`"${page.name}": ${msg}`);
        }
      }
    }

    // ── 8. Redirect back with result ──────────────────────────
    if (connectedCount > 0) {
      const successMsg = `Connected ${connectedCount} page${connectedCount > 1 ? "s" : ""}`;
      const query = errors.length > 0
        ? `fb=connected&pages=${connectedCount}&warnings=${encodeURIComponent(errors.join("; "))}`
        : `fb=connected&pages=${connectedCount}`;
      return NextResponse.redirect(`${settingsUrl}?${query}`);
    } else {
      return NextResponse.redirect(
        `${settingsUrl}?fb=error&msg=${encodeURIComponent(errors.join("; ") || "Failed to connect any pages")}`
      );
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error during Facebook connection";
    console.error("Facebook OAuth callback error:", msg);
    return NextResponse.redirect(
      `${settingsUrl}?fb=error&msg=${encodeURIComponent(msg)}`
    );
  }
}

// ── Per-page connection logic (extracted for future page-picker) ──
async function connectPage({
  admin,
  companyId,
  userId,
  page,
  userToken,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any;
  companyId: string;
  userId: string;
  page: { id: string; name: string; access_token: string };
  userToken: string;
}) {
  // Encrypt the page access token
  const encryptedToken = encryptToken(page.access_token);

  // Get the FB user ID from the long-lived user token
  // We use "me" endpoint with the user token
  const V = process.env.FACEBOOK_GRAPH_VERSION || "v21.0";
  const meRes = await fetch(
    `https://graph.facebook.com/${V}/me?fields=id&access_token=${userToken}`
  );
  const meData = await meRes.json();
  const fbUserId = meData.id || null;

  // UPSERT into facebook_connections
  // If page_id already exists for this company, update the token
  // If page_id exists for ANOTHER company, the UNIQUE(page_id) constraint will throw
  const { error: upsertError } = await admin
    .from("facebook_connections")
    .upsert(
      {
        company_id: companyId,
        page_id: page.id,
        page_name: page.name,
        page_access_token_enc: encryptedToken,
        fb_user_id: fbUserId,
        connected_by_id: userId,
        status: "ACTIVE",
        last_error: null,
      },
      {
        onConflict: "company_id,page_id",
        ignoreDuplicates: false,
      }
    );

  if (upsertError) {
    // Check if it's a unique violation on the global page_id constraint
    if (upsertError.code === "23505" && upsertError.message?.includes("page_id")) {
      throw new Error(
        `This Page is already connected to another account. A Facebook Page can only be linked to one company.`
      );
    }
    throw new Error(upsertError.message || "Failed to store connection");
  }

  // Subscribe the page to leadgen webhook
  try {
    await subscribePage(page.id, page.access_token);

    // Update subscribed_at timestamp
    await admin
      .from("facebook_connections")
      .update({ subscribed_at: new Date().toISOString() })
      .eq("company_id", companyId)
      .eq("page_id", page.id);
  } catch (subErr) {
    // Non-fatal — the token is stored, subscription can be retried
    console.error(`Warning: Failed to subscribe page ${page.id} to webhook:`, subErr);
    await admin
      .from("facebook_connections")
      .update({ last_error: `Subscription failed: ${subErr instanceof Error ? subErr.message : String(subErr)}` })
      .eq("company_id", companyId)
      .eq("page_id", page.id);
  }
}
