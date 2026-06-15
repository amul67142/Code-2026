"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export interface ActiveSession {
  id: string;
  device: string;
  location: string;
  ip: string;
  lastActive: string;
  createdAt: string;
  isCurrent: boolean;
}

// ── Parse a user-agent into a friendly "Browser on OS" label ───
function parseDevice(ua: string | null): string {
  if (!ua) return "Unknown device";
  let os = "Unknown OS";
  if (/windows/i.test(ua)) os = "Windows";
  else if (/android/i.test(ua)) os = "Android";
  else if (/iphone|ipad|ipod/i.test(ua)) os = "iPhone/iPad";
  else if (/mac os|macintosh/i.test(ua)) os = "macOS";
  else if (/linux/i.test(ua)) os = "Linux";

  let browser = "Browser";
  if (/edg/i.test(ua)) browser = "Edge";
  else if (/chrome|crios/i.test(ua)) browser = "Chrome";
  else if (/firefox|fxios/i.test(ua)) browser = "Firefox";
  else if (/safari/i.test(ua)) browser = "Safari";

  return `${browser} on ${os}`;
}

// ── Best-effort geo lookup of an IP (free, no key) ─────────────
async function geoLookup(ip: string | null): Promise<string> {
  if (!ip || ip === "127.0.0.1" || ip.startsWith("::")) return "Local / unknown";
  try {
    const res = await fetch(`https://ipapi.co/${ip}/json/`, {
      signal: AbortSignal.timeout(3000),
      headers: { "User-Agent": "BigLeadCRM/1.0" },
    });
    if (!res.ok) return "Unknown location";
    const j = await res.json();
    const parts = [j.city, j.region, j.country_name].filter(Boolean);
    return parts.length ? parts.join(", ") : "Unknown location";
  } catch {
    return "Unknown location";
  }
}

// ── List the user's active sessions (device + location) ────────
export async function getActiveSessions(): Promise<ActiveSession[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // Identify the current session from the JWT's session_id claim
  let currentSessionId: string | null = null;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.access_token) {
    try {
      const payload = JSON.parse(
        Buffer.from(session.access_token.split(".")[1], "base64").toString("utf8")
      );
      currentSessionId = payload.session_id || null;
    } catch {
      /* ignore */
    }
  }

  const { data, error } = await supabase.rpc("get_my_sessions");
  if (error || !data) {
    console.error("getActiveSessions error:", error);
    return [];
  }

  // Enrich with device + location (geo in parallel, best-effort)
  const rows = data as Array<{
    id: string;
    user_agent: string | null;
    ip: string | null;
    created_at: string;
    updated_at: string;
  }>;

  return Promise.all(
    rows.map(async (s) => ({
      id: s.id,
      device: parseDevice(s.user_agent),
      location: await geoLookup(s.ip),
      ip: s.ip || "—",
      lastActive: s.updated_at || s.created_at,
      createdAt: s.created_at,
      isCurrent: s.id === currentSessionId,
    }))
  );
}

// ── Log out every OTHER device (keep this one) ─────────────────
export async function logoutOtherDevices() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut({ scope: "others" });
  if (error) return { error: "Failed to log out other devices" };
  revalidatePath("/settings/security");
  return { success: true };
}

// ── Log out EVERYWHERE (including this device) ──────────────────
export async function logoutAllDevices() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "global" });
  revalidatePath("/", "layout");
  redirect("/login");
}
