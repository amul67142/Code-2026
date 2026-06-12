"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import crypto from "crypto";
import { getFacebookRedirectUri, unsubscribePage, getLeadForms } from "@/lib/integrations/facebook-graph";
import { decryptToken } from "@/lib/integrations/crypto";

// ── Helper: get current user's profile ──────────────────────────
async function getUserProfile() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("id, company_id, role")
    .eq("auth_user_id", user.id)
    .single();

  return profile;
}

// ── OAuth Scopes ────────────────────────────────────────────────
const FB_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_metadata",
  "pages_manage_ads", // required to LIST a Page's leadgen_forms
  "leads_retrieval",
  "business_management",
].join(",");

// ── Start Facebook OAuth ────────────────────────────────────────
/**
 * Generates the Facebook OAuth dialog URL and sets a CSRF state cookie.
 * Returns the URL to redirect the user to.
 */
export async function startFacebookOAuth(): Promise<{
  url?: string;
  error?: string;
}> {
  const profile = await getUserProfile();
  if (!profile?.company_id) {
    return { error: "You must be logged in with a company to connect Facebook." };
  }
  if (profile.role !== "ADMIN" && profile.role !== "SUPER_ADMIN") {
    return { error: "Admin access required to connect Facebook." };
  }

  const appId = process.env.FACEBOOK_APP_ID;
  if (!appId) {
    return { error: "Facebook integration is not configured (missing App ID)." };
  }

  const graphVersion = process.env.FACEBOOK_GRAPH_VERSION || "v21.0";

  // Build the shared redirect_uri — same value used in the callback
  const redirectUri = getFacebookRedirectUri();

  // Generate CSRF state: random token + company_id, signed together
  const stateToken = crypto.randomBytes(16).toString("hex");
  const statePayload = JSON.stringify({
    token: stateToken,
    companyId: profile.company_id,
    userId: profile.id,
  });
  // Base64-encode the payload for the state param
  const state = Buffer.from(statePayload).toString("base64url");

  // Store the state token in a httpOnly cookie for CSRF validation
  const cookieStore = await cookies();
  cookieStore.set("fb_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 minutes — should be plenty for the OAuth flow
  });

  // Build the Facebook OAuth dialog URL
  const dialogUrl =
    `https://www.facebook.com/${graphVersion}/dialog/oauth` +
    `?client_id=${appId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent(FB_SCOPES)}` +
    `&state=${encodeURIComponent(state)}`;

  return { url: dialogUrl };
}

// ── List Connected Facebook Pages ───────────────────────────────
export async function getFacebookConnections() {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile?.company_id) return [];

  const { data, error } = await supabase
    .from("facebook_connections")
    .select("id, page_id, page_name, status, subscribed_at, last_error, created_at, updated_at")
    .eq("company_id", profile.company_id)
    .neq("status", "REVOKED") // never show disconnected pages
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching facebook connections:", error);
    return [];
  }

  return data || [];
}

// ── Disconnect a Facebook Page ──────────────────────────────────
export async function disconnectFacebookPage(connectionId: string) {
  const profile = await getUserProfile();
  if (!profile?.company_id) {
    return { error: "Unauthorized" };
  }
  if (profile.role !== "ADMIN" && profile.role !== "SUPER_ADMIN") {
    return { error: "Admin access required to disconnect Facebook." };
  }

  // Use admin client to bypass RLS for the update
  const admin = createAdminClient();

  // Verify the connection belongs to this company
  const { data: conn } = await admin
    .from("facebook_connections")
    .select("id, company_id, page_id, page_access_token_enc")
    .eq("id", connectionId)
    .single();

  if (!conn || conn.company_id !== profile.company_id) {
    return { error: "Connection not found or not authorized" };
  }

  // 1. Unsubscribe the Page from Meta's webhook (best-effort)
  try {
    const pageToken = decryptToken(conn.page_access_token_enc);
    await unsubscribePage(conn.page_id, pageToken);
  } catch (err) {
    // Non-fatal — we still fully remove the connection locally.
    console.error("Warning: Failed to unsubscribe page from Meta:", err);
  }

  // 2. HARD DELETE — remove the form mappings AND the connection entirely so a
  //    reconnect starts completely clean (no stale page, no stale mappings).
  //    (facebook_lead_forms also cascades via FK, but we delete explicitly to be safe.)
  await admin
    .from("facebook_lead_forms")
    .delete()
    .eq("company_id", profile.company_id)
    .eq("connection_id", connectionId);

  const { error } = await admin
    .from("facebook_connections")
    .delete()
    .eq("id", connectionId)
    .eq("company_id", profile.company_id);

  if (error) {
    console.error("Error disconnecting facebook page:", error);
    return { error: "Failed to disconnect page" };
  }

  revalidatePath("/settings/integrations");
  return { success: true };
}

// ── List a connected Page's Instant Forms (merged with existing mappings) ──
export async function listFacebookForms(connectionId: string) {
  const profile = await getUserProfile();
  if (!profile?.company_id) return { error: "Unauthorized" };
  if (profile.role !== "ADMIN" && profile.role !== "SUPER_ADMIN") {
    return { error: "Admin access required" };
  }

  const admin = createAdminClient();
  const { data: conn } = await admin
    .from("facebook_connections")
    .select("id, company_id, page_id, page_access_token_enc")
    .eq("id", connectionId)
    .single();
  if (!conn || conn.company_id !== profile.company_id) {
    return { error: "Connection not found" };
  }

  // Fetch the Page's Instant Forms from Meta using the stored Page token.
  let forms: Array<{ id: string; name: string; status: string }>;
  try {
    const pageToken = decryptToken(conn.page_access_token_enc);
    const result = await getLeadForms(conn.page_id, pageToken);
    forms = result.data || [];
  } catch (err) {
    return {
      error: `Failed to load forms: ${err instanceof Error ? err.message : "Graph API error"}`,
    };
  }

  // Merge with existing mappings so the UI shows current destinations.
  const { data: mappings } = await admin
    .from("facebook_lead_forms")
    .select("form_id, project_id, assignment_rule, assigned_agent_id, is_active")
    .eq("company_id", profile.company_id)
    .eq("connection_id", connectionId);

  const mapByForm = new Map((mappings || []).map((m) => [m.form_id, m]));

  return {
    forms: forms.map((f) => ({
      form_id: f.id,
      form_name: f.name,
      status: f.status,
      mapping: mapByForm.get(f.id) || null,
    })),
  };
}

// ── Save / update a form → project mapping ──────────────────────
export async function saveFacebookFormMapping(input: {
  connectionId: string;
  formId: string;
  formName: string;
  projectId: string;
  assignmentRule: "ROUND_ROBIN" | "SPECIFIC_AGENT";
  assignedAgentId?: string | null;
  isActive: boolean;
}) {
  const profile = await getUserProfile();
  if (!profile?.company_id) return { error: "Unauthorized" };
  if (profile.role !== "ADMIN" && profile.role !== "SUPER_ADMIN") {
    return { error: "Admin access required" };
  }
  if (!input.projectId) return { error: "Please select a destination project" };

  const admin = createAdminClient();

  // Verify the connection belongs to this company.
  const { data: conn } = await admin
    .from("facebook_connections")
    .select("id, company_id")
    .eq("id", input.connectionId)
    .single();
  if (!conn || conn.company_id !== profile.company_id) {
    return { error: "Connection not found" };
  }

  const { error } = await admin.from("facebook_lead_forms").upsert(
    {
      company_id: profile.company_id,
      connection_id: input.connectionId,
      form_id: input.formId,
      form_name: input.formName,
      project_id: input.projectId,
      assignment_rule: input.assignmentRule,
      assigned_agent_id:
        input.assignmentRule === "SPECIFIC_AGENT" ? input.assignedAgentId || null : null,
      duplicate_rule: "SKIP",
      is_active: input.isActive,
    },
    { onConflict: "company_id,form_id" }
  );

  if (error) {
    console.error("saveFacebookFormMapping error:", error);
    return { error: "Failed to save form mapping" };
  }

  revalidatePath("/settings/integrations");
  return { success: true };
}
