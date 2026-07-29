import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { processInboundWhatsApp } from "@/lib/leads/whatsapp-inbound";
import { rateLimit } from "@/lib/rate-limit";

/**
 * WhatsApp Cloud API webhook.
 *
 * GET  → Meta verification handshake (when you click "Verify and Save").
 * POST → inbound messages (lead replies) + delivery statuses. Signature-verified
 *        with the app secret, then routed into the lead pipeline.
 *
 * Verify token: WHATSAPP_VERIFY_TOKEN, falling back to FACEBOOK_VERIFY_TOKEN so
 * you can reuse the same token you already use for the Facebook webhook.
 */
const VERIFY_TOKEN =
  process.env.WHATSAPP_VERIFY_TOKEN || process.env.FACEBOOK_VERIFY_TOKEN;

// ── GET: verification handshake ───────────────────────────────────
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const mode = p.get("hub.mode");
  const token = p.get("hub.verify_token");
  const challenge = p.get("hub.challenge");

  if (mode === "subscribe" && token && VERIFY_TOKEN && token === VERIFY_TOKEN) {
    return new NextResponse(challenge ?? "", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

// ── POST: inbound messages & statuses ─────────────────────────────
export async function POST(req: NextRequest) {
  // Flood shield before any crypto/DB work.
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = rateLimit(`wa-webhook:${ip}`, 300, 60 * 1000);
  if (!rl.ok) {
    return new NextResponse("Too many requests", {
      status: 429,
      headers: { "Retry-After": String(rl.retryAfterSec) },
    });
  }

  const raw = await req.text();

  // Verify the payload came from Meta (HMAC-SHA256 over the raw body).
  const signature = req.headers.get("x-hub-signature-256") || "";
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  if (!appSecret) {
    console.error("WA webhook: FACEBOOK_APP_SECRET not configured");
    return new NextResponse("Server misconfigured", { status: 500 });
  }
  const expected =
    "sha256=" + crypto.createHmac("sha256", appSecret).update(raw).digest("hex");
  if (!signaturesMatch(signature, expected)) {
    console.error("WA webhook: invalid signature");
    return new NextResponse("Invalid signature", { status: 401 });
  }

  let body: WaBody;
  try {
    body = JSON.parse(raw);
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field !== "messages") continue;
      const value = change.value || {};
      const phoneNumberId = value.metadata?.phone_number_id;
      if (!phoneNumberId) continue;

      for (const m of value.messages || []) {
        // Text replies + quick-reply button taps (both count for qualification),
        // plus media messages (logged with a Meta media reference — downloaded
        // on demand, never stored by us).
        let text: string | undefined;
        let mediaId: string | undefined;
        let mediaType: string | undefined;

        if (m.type === "text") {
          text = m.text?.body;
        } else if (m.type === "button") {
          text = m.button?.text || m.button?.payload;
        } else if (m.type === "image" || m.type === "video" || m.type === "audio" || m.type === "document") {
          const media = m[m.type] as { id?: string; caption?: string; filename?: string } | undefined;
          mediaId = media?.id;
          mediaType = m.type;
          text =
            media?.caption ||
            (m.type === "image" ? "📷 Photo" : m.type === "video" ? "🎥 Video" : m.type === "audio" ? "🎙️ Audio" : `📄 ${media?.filename || "Document"}`);
        }

        if (!text) continue;
        await processInboundWhatsApp({
          phoneNumberId,
          from: m.from,
          text,
          waMessageId: m.id,
          mediaId,
          mediaType,
        }).catch((e) => console.error("WA inbound handler error:", e));
      }

      // Delivery/read/failed statuses → tick marks on outbound messages.
      for (const s of value.statuses || []) {
        if (!s.id || !s.status) continue;
        try {
          const admin = (await import("@/lib/supabase/admin")).createAdminClient();
          if (s.status === "delivered") {
            await admin
              .from("message_log")
              .update({ status: "DELIVERED", delivered_at: new Date().toISOString() })
              .eq("provider_id", s.id)
              .eq("channel", "WHATSAPP")
              .in("status", ["SENT"]);
          } else if (s.status === "read") {
            await admin
              .from("message_log")
              .update({ status: "OPENED", read_at: new Date().toISOString() })
              .eq("provider_id", s.id)
              .eq("channel", "WHATSAPP")
              .in("status", ["SENT", "DELIVERED"]);
          } else if (s.status === "failed") {
            const errMsg = s.errors?.[0]?.title || s.errors?.[0]?.message || "delivery failed";
            await admin
              .from("message_log")
              .update({ status: "FAILED", error_message: errMsg })
              .eq("provider_id", s.id)
              .eq("channel", "WHATSAPP");
          }
        } catch (e) {
          console.error("WA status handler error:", e);
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}

// ── Helpers / types ───────────────────────────────────────────────
function signaturesMatch(received: string, expected: string): boolean {
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

interface WaMessage {
  from: string;
  id: string;
  type: string;
  text?: { body: string };
  button?: { text?: string; payload?: string };
  image?: { id?: string; caption?: string };
  video?: { id?: string; caption?: string };
  audio?: { id?: string };
  document?: { id?: string; caption?: string; filename?: string };
  [key: string]: unknown;
}
interface WaStatus {
  id?: string;
  status?: string;
  errors?: Array<{ title?: string; message?: string }>;
}
interface WaChange {
  field: string;
  value?: {
    metadata?: { phone_number_id?: string };
    messages?: WaMessage[];
    statuses?: WaStatus[];
  };
}
interface WaEntry {
  id: string;
  changes?: WaChange[];
}
interface WaBody {
  object?: string;
  entry?: WaEntry[];
}
