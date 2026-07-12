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

// ── Message Templates (create + list on a WABA) ──────────────────

export interface TemplateButton {
  type: "QUICK_REPLY" | "URL" | "PHONE_NUMBER";
  text: string;
  url?: string;
  phone_number?: string;
}

export interface MetaTemplateInput {
  name: string;
  language: string;
  category: "UTILITY" | "MARKETING";
  bodyText: string;
  /** Example values for the {{1}}, {{2}} … variables, in order. */
  examples: string[];
  /** Optional interactive buttons (quick replies / URL / phone). */
  buttons?: TemplateButton[];
}

/** Submit a new message template to Meta for review. */
export async function createMetaTemplate(
  wabaId: string,
  token: string,
  tpl: MetaTemplateInput
) {
  const body: Record<string, unknown> = {
    type: "BODY",
    text: tpl.bodyText,
  };
  if (tpl.examples.length > 0) {
    body.example = { body_text: [tpl.examples] };
  }

  const components: Record<string, unknown>[] = [body];

  if (tpl.buttons && tpl.buttons.length > 0) {
    components.push({
      type: "BUTTONS",
      buttons: tpl.buttons.map((b) =>
        b.type === "QUICK_REPLY"
          ? { type: "QUICK_REPLY", text: b.text }
          : b.type === "URL"
            ? { type: "URL", text: b.text, url: b.url }
            : { type: "PHONE_NUMBER", text: b.text, phone_number: b.phone_number }
      ),
    });
  }

  const res = await fetch(`${BASE}/${wabaId}/message_templates`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      name: tpl.name,
      language: tpl.language,
      category: tpl.category,
      components,
    }),
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(
      data?.error?.error_user_msg || data?.error?.message || `Template create failed (${res.status})`
    );
  }
  return data as { id: string; status?: string; category?: string };
}

interface MetaTemplateComponent {
  type: string;
  text?: string;
}
export interface MetaTemplateListItem {
  id: string;
  name: string;
  status: string;
  category: string;
  language: string;
  components?: MetaTemplateComponent[];
}

/** List all message templates on a WABA (with their current review status). */
export async function listMetaTemplates(
  wabaId: string,
  token: string
): Promise<MetaTemplateListItem[]> {
  const res = await fetch(
    `${BASE}/${wabaId}/message_templates?fields=id,name,status,category,language,components&limit=200&access_token=${encodeURIComponent(token)}`
  );
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data?.error?.message || `Template list failed (${res.status})`);
  }
  return (data.data || []) as MetaTemplateListItem[];
}

/** Pull the BODY text out of a Meta template's components (for local storage). */
export function templateBodyFromComponents(components?: MetaTemplateComponent[]): string {
  const body = (components || []).find((c) => c.type?.toUpperCase() === "BODY");
  return body?.text || "";
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
