import crypto from "crypto";

/**
 * Generates a SHA-256 hash of a string, formatted as lowercase and trimmed,
 * as required by Meta's Conversions API documentation.
 */
export function sha256Hash(value: string): string {
  return crypto
    .createHash("sha256")
    .update(value.trim().toLowerCase())
    .digest("hex");
}

interface CAPIEventParams {
  pixelId: string;
  token: string;
  eventName: "Lead" | "Contact" | "Purchase";
  email?: string | null;
  phone?: string | null;
  customData?: Record<string, any>;
  testEventCode?: string | null;
}

/**
 * Sends a server-side event to the Meta Conversions API (CAPI).
 */
export async function sendFacebookCAPIEvent({
  pixelId,
  token,
  eventName,
  email,
  phone,
  customData = {},
  testEventCode,
}: CAPIEventParams) {
  if (!pixelId || !token) {
    return { success: false, error: "Meta Pixel ID and Conversions Token are required." };
  }

  // Hash user data to protect privacy (strictly required by Meta)
  const userData: Record<string, string> = {};
  if (email) {
    userData.em = sha256Hash(email);
  }
  if (phone) {
    // Strip non-digit characters for phone normalization
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone) {
      userData.ph = sha256Hash(cleanPhone);
    }
  }

  const eventPayload: any = {
    event_name: eventName,
    event_time: Math.floor(Date.now() / 1000),
    action_source: "crm",
    user_data: userData,
    custom_data: {
      ...customData,
    },
  };

  const payload = {
    data: [eventPayload],
    ...(testEventCode ? { test_event_code: testEventCode } : {}),
  };

  try {
    const url = `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${token}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await res.json();
    if (!res.ok || result.error) {
      console.error("Meta API error response:", result.error);
      return {
        success: false,
        error: result.error?.message || "Failed to send event to Meta Conversions API.",
      };
    }

    return { success: true, data: result };
  } catch (error: any) {
    console.error("Meta CAPI request failed:", error);
    return { success: false, error: error.message || "Network error occurred." };
  }
}
