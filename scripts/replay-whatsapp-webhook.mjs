/**
 * Replay a fake WhatsApp inbound webhook against the local dev server —
 * lets you test the full pipeline (inbound → lead match → AI agent → reply
 * or draft) with ZERO Meta involvement. Never touches the real webhook URL.
 *
 * Usage (dev server must be running):
 *   node scripts/replay-whatsapp-webhook.mjs --from 919876543210 --text "Yes, interested. What is the price?"
 *
 * Options:
 *   --from      sender phone (digits, with country code). MUST match an existing
 *               lead's phone (last 10 digits) or the webhook skips it.
 *   --text      the message text
 *   --phone-id  receiving phone_number_id (default: read from your
 *               whatsapp_connections row — pass explicitly if unsure)
 *   --url       webhook URL (default http://localhost:3000/api/webhooks/whatsapp)
 *
 * Reads FACEBOOK_APP_SECRET from .env.local to sign the payload the same way
 * Meta does, so the route's signature check passes.
 */
import { createHmac, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function readEnvLocal() {
  const env = {};
  try {
    const raw = readFileSync(resolve(root, ".env.local"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    /* fall through to process.env */
  }
  return { ...env, ...process.env };
}

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const env = readEnvLocal();
const APP_SECRET = env.FACEBOOK_APP_SECRET;
if (!APP_SECRET) {
  console.error("FACEBOOK_APP_SECRET not found in .env.local — cannot sign the payload.");
  process.exit(1);
}

const from = arg("from");
const text = arg("text", "Hi, I am interested. Can you share the price?");
const phoneNumberId = arg("phone-id", env.REPLAY_PHONE_NUMBER_ID);
const url = arg("url", "http://localhost:3000/api/webhooks/whatsapp");

if (!from) {
  console.error("Pass --from <sender phone with country code>, e.g. --from 919876543210");
  process.exit(1);
}
if (!phoneNumberId) {
  console.error(
    "Pass --phone-id <your whatsapp_connections.phone_number_id> (or set REPLAY_PHONE_NUMBER_ID in .env.local)"
  );
  process.exit(1);
}

// Meta's exact inbound shape (messages field, one text message).
const body = JSON.stringify({
  object: "whatsapp_business_account",
  entry: [
    {
      id: "0",
      changes: [
        {
          field: "messages",
          value: {
            messaging_product: "whatsapp",
            metadata: { display_phone_number: "0", phone_number_id: phoneNumberId },
            contacts: [{ profile: { name: "Replay Test" }, wa_id: from }],
            messages: [
              {
                from,
                id: `wamid.replay-${randomUUID()}`,
                timestamp: String(Math.floor(Date.now() / 1000)),
                type: "text",
                text: { body: text },
              },
            ],
          },
        },
      ],
    },
  ],
});

const signature = "sha256=" + createHmac("sha256", APP_SECRET).update(body).digest("hex");

const res = await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-Hub-Signature-256": signature },
  body,
});

console.log(`→ POST ${url}`);
console.log(`← ${res.status} ${await res.text()}`);
console.log(
  "\nNow check: Live Chat should show the inbound message; in SHADOW mode an AI draft appears above the composer (LIVE mode would send — but sending needs a real token+number, so watch the server console for the send attempt)."
);
