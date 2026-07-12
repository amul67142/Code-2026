/**
 * WhatsApp Cloud API client.
 * Sends messages via graph.facebook.com using a per-tenant Page/WABA token.
 * NEVER log tokens.
 */

const V = process.env.FACEBOOK_GRAPH_VERSION || "v21.0";
const BASE = `https://graph.facebook.com/${V}`;

/** Normalize an Indian/mobile number to WhatsApp's expected format (digits + country code, no +). */
export function normalizeWhatsAppNumber(raw: string): string {
  let n = (raw || "").replace(/\D/g, ""); // strip non-digits
  if (n.length === 10) n = "91" + n; // assume India if 10 digits
  if (n.startsWith("0") && n.length === 11) n = "91" + n.slice(1);
  return n;
}

interface TemplateComponent {
  type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parameters?: any[];
}

/** Send an approved template message (required for business-initiated messages). */
export async function sendWhatsAppTemplate(
  phoneNumberId: string,
  token: string,
  to: string,
  templateName: string,
  languageCode = "en_US",
  components: TemplateComponent[] = []
) {
  const res = await fetch(`${BASE}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: templateName,
        language: { code: languageCode },
        ...(components.length ? { components } : {}),
      },
    }),
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data?.error?.message || `WhatsApp template send failed (${res.status})`);
  }
  return data as { messages?: { id: string }[] };
}

/**
 * Subscribe this app to a WhatsApp Business Account so it receives inbound
 * messages + statuses. REQUIRED for two-way — subscribing the webhook field at
 * the app level is not enough; each WABA must also be subscribed to the app.
 * (This is the step that was missing and silently dropped all replies.)
 */
export async function subscribeWhatsAppWaba(wabaId: string, token: string) {
  const res = await fetch(`${BASE}/${wabaId}/subscribed_apps`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data?.error?.message || `WABA subscribe failed (${res.status})`);
  }
  return data as { success?: boolean };
}

/** Send a free-text message (only allowed within the 24h customer-service window). */
export async function sendWhatsAppText(
  phoneNumberId: string,
  token: string,
  to: string,
  body: string
) {
  const res = await fetch(`${BASE}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body },
    }),
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data?.error?.message || `WhatsApp text send failed (${res.status})`);
  }
  return data as { messages?: { id: string }[] };
}
