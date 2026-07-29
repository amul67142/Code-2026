import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCachedUserProfile } from "@/lib/auth/cached-user";
import { decryptToken } from "@/lib/integrations/crypto";

/**
 * On-demand WhatsApp media download.
 * Media lives at Meta; we proxy it straight to the user's browser as a
 * download — nothing is stored in our storage (by design).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ mediaId: string }> }
) {
  const { mediaId } = await params;
  const profile = await getCachedUserProfile();
  if (!profile?.company_id) return new NextResponse("Unauthorized", { status: 401 });

  const admin = createAdminClient();

  // The media must belong to a message in this company…
  const { data: msg } = await admin
    .from("message_log")
    .select("lead_id, media_type")
    .eq("company_id", profile.company_id)
    .eq("media_id", mediaId)
    .maybeSingle();
  if (!msg) return new NextResponse("Not found", { status: 404 });

  // …and the user must have access to that conversation (admin or assigned).
  const admins = ["ADMIN", "SUPER_ADMIN"];
  if (!admins.includes(profile.role)) {
    const { data: conv } = await admin
      .from("wa_conversations")
      .select("assigned_agent_id")
      .eq("company_id", profile.company_id)
      .eq("lead_id", msg.lead_id)
      .maybeSingle();
    if (conv?.assigned_agent_id !== profile.id) {
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  const { data: conn } = await admin
    .from("whatsapp_connections")
    .select("access_token_enc, status")
    .eq("company_id", profile.company_id)
    .maybeSingle();
  if (!conn || conn.status !== "ACTIVE") {
    return new NextResponse("WhatsApp not connected", { status: 400 });
  }

  const token = decryptToken(conn.access_token_enc);
  const V = process.env.FACEBOOK_GRAPH_VERSION || "v21.0";

  // 1. Resolve the short-lived media URL.
  const metaRes = await fetch(`https://graph.facebook.com/${V}/${mediaId}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(10000),
  });
  const meta = await metaRes.json();
  if (!metaRes.ok || !meta.url) {
    return new NextResponse("Media unavailable (it may have expired at Meta)", { status: 410 });
  }

  // 2. Fetch the binary and stream it to the browser as a download.
  const fileRes = await fetch(meta.url, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(30000),
  });
  if (!fileRes.ok || !fileRes.body) {
    return new NextResponse("Download failed", { status: 502 });
  }

  const mime = meta.mime_type || "application/octet-stream";
  const ext = mime.split("/")[1]?.split(";")[0] || "bin";
  return new NextResponse(fileRes.body, {
    status: 200,
    headers: {
      "Content-Type": mime,
      "Content-Disposition": `attachment; filename="whatsapp-${msg.media_type || "media"}-${mediaId.slice(0, 8)}.${ext}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
