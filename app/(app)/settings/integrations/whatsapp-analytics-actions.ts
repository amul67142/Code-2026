"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getCachedUserProfile } from "@/lib/auth/cached-user";
import { decryptToken } from "@/lib/integrations/crypto";
import { cached } from "@/lib/server-cache";

export interface WhatsAppAnalytics {
  connected: boolean;
  /** last 30 days */
  sent: number;
  failed: number;
  replies: number;
  replyRatePct: number | null;
  /** Meta's per-number quality: HIGH | MEDIUM | LOW | UNKNOWN */
  quality: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
  messagingLimit: string | null;
}

const EMPTY: WhatsAppAnalytics = {
  connected: false,
  sent: 0,
  failed: 0,
  replies: 0,
  replyRatePct: null,
  quality: "UNKNOWN",
  messagingLimit: null,
};

function mapQuality(q?: string): WhatsAppAnalytics["quality"] {
  const s = (q || "").toUpperCase();
  if (s === "GREEN" || s === "HIGH") return "HIGH";
  if (s === "YELLOW" || s === "MEDIUM") return "MEDIUM";
  if (s === "RED" || s === "LOW") return "LOW";
  return "UNKNOWN";
}

export async function getWhatsAppAnalytics(): Promise<WhatsAppAnalytics> {
  const profile = await getCachedUserProfile();
  if (!profile?.company_id) return EMPTY;

  const admin = createAdminClient();
  const { data: conn } = await admin
    .from("whatsapp_connections")
    .select("phone_number_id, access_token_enc, status")
    .eq("company_id", profile.company_id)
    .maybeSingle();

  if (!conn || conn.status !== "ACTIVE") return EMPTY;

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const base = () =>
    admin
      .from("message_log")
      .select("id", { count: "exact", head: true })
      .eq("company_id", profile.company_id)
      .eq("channel", "WHATSAPP")
      .gte("created_at", since);

  // Counts from our own message log (last 30 days).
  const [sentRes, failedRes, replyRes] = await Promise.all([
    base().eq("direction", "OUTBOUND").eq("status", "SENT"),
    base().eq("direction", "OUTBOUND").eq("status", "FAILED"),
    base().eq("direction", "INBOUND"),
  ]);
  const sent = sentRes.count || 0;
  const failed = failedRes.count || 0;
  const replies = replyRes.count || 0;

  // Meta's official quality rating for the number (cached 5 min — no API spam).
  const V = process.env.FACEBOOK_GRAPH_VERSION || "v21.0";
  let quality: WhatsAppAnalytics["quality"] = "UNKNOWN";
  let messagingLimit: string | null = null;
  try {
    const info = await cached(
      `wa-quality:${conn.phone_number_id}`,
      5 * 60 * 1000,
      async () => {
        const token = decryptToken(conn.access_token_enc);
        // Hard timeout: a slow Graph API must never hang the whole page render.
        const res = await fetch(
          `https://graph.facebook.com/${V}/${conn.phone_number_id}?fields=quality_rating,messaging_limit_tier&access_token=${encodeURIComponent(token)}`,
          { signal: AbortSignal.timeout(5000) }
        );
        const data = await res.json();
        if (data?.error) {
          // Retry with quality only (messaging_limit_tier isn't always available).
          const res2 = await fetch(
            `https://graph.facebook.com/${V}/${conn.phone_number_id}?fields=quality_rating&access_token=${encodeURIComponent(token)}`,
            { signal: AbortSignal.timeout(5000) }
          );
          return res2.json();
        }
        return data;
      }
    );
    quality = mapQuality(info?.quality_rating);
    messagingLimit = info?.messaging_limit_tier || null;
  } catch {
    /* leave UNKNOWN */
  }

  return {
    connected: true,
    sent,
    failed,
    replies,
    replyRatePct: sent > 0 ? Math.round((replies / sent) * 100) : null,
    quality,
    messagingLimit,
  };
}
