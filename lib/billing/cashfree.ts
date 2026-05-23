import crypto from "crypto";

const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID;
const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY;
const CASHFREE_ENV = process.env.CASHFREE_ENV || "sandbox";
const CASHFREE_WEBHOOK_SECRET = process.env.CASHFREE_WEBHOOK_SECRET;

const BASE_URL = CASHFREE_ENV === "production" 
  ? "https://api.cashfree.com/pg" 
  : "https://sandbox.cashfree.com/pg";

interface CashfreeRequestOptions {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  body?: any;
}

/**
 * Base helper for making secure REST API calls to Cashfree Payments.
 */
async function cashfreeRequest<T = any>({ method, path, body }: CashfreeRequestOptions): Promise<T> {
  if (!CASHFREE_APP_ID || !CASHFREE_SECRET_KEY) {
    throw new Error("Missing Cashfree App ID or Secret Key environment variables.");
  }

  const url = `${BASE_URL}${path}`;

  const headers: Record<string, string> = {
    "accept": "application/json",
    "content-type": "application/json",
    "x-api-version": "2025-01-01",
    "x-client-id": CASHFREE_APP_ID,
    "x-client-secret": CASHFREE_SECRET_KEY,
  };

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const responseData = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error("Cashfree API Error Response:", responseData);
    throw new Error(
      responseData.message || 
      `Cashfree API request failed with status ${response.status} at ${path}`
    );
  }

  return responseData as T;
}

export interface SubscriptionCustomerDetails {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
}

export interface SubscriptionPlanDetails {
  plan_id?: string; // If utilizing pre-created Cashfree plan
  plan_name?: string; // Inline plan fields
  plan_type?: "PERIODIC" | "ON_DEMAND";
  plan_currency?: string;
  plan_max_amount?: number;
  plan_recurring_amount?: number;
  plan_intervals?: number;
  plan_interval_type?: "WEEK" | "MONTH" | "YEAR" | "week" | "month" | "year";
}

export interface CreateSubscriptionParams {
  subscription_id: string;
  customer_details: SubscriptionCustomerDetails;
  plan_details: SubscriptionPlanDetails;
  return_url: string;
  expiry_time?: string; // ISO 8601 string
}

export const cashfree = {
  /**
   * Create a Subscription with either inline plan details (via planInfo) or a specific plan_id (via plan_details).
   * Returns details including the customer's authorization/checkout link.
   */
  async createSubscription(params: CreateSubscriptionParams) {
    const payload: any = {
      subscription_id: params.subscription_id,
      customer_details: {
        customer_name: params.customer_details.customer_name,
        customer_email: params.customer_details.customer_email,
        customer_phone: params.customer_details.customer_phone,
      },
      authorization_details: {
        authorization_amount: 1, // Standard authorization charge (typically refunded)
        authorization_amount_refund: true,
      },
      subscription_meta: {
        return_url: params.return_url,
        notification_channel: ["EMAIL", "SMS"],
      },
    };

    // If a pre-registered plan ID is provided, use plan_details
    if (params.plan_details.plan_id) {
      payload.plan_details = {
        plan_id: params.plan_details.plan_id,
      };
    } else {
      // Otherwise, build the camelCase planInfo schema for inline subscriptions
      payload.planInfo = {
        type: params.plan_details.plan_type || "PERIODIC",
        planName: params.plan_details.plan_name || "Subscription Plan",
        recurringAmount: params.plan_details.plan_recurring_amount,
        maxAmount: params.plan_details.plan_max_amount || (params.plan_details.plan_recurring_amount ? params.plan_details.plan_recurring_amount * 12 : 5000), // Default limit to 12 cycles or 5000 if not set
        intervals: params.plan_details.plan_intervals || 1,
        intervalType: (params.plan_details.plan_interval_type || "month").toLowerCase(),
      };
    }

    console.log("📤 Cashfree Subscriptions request payload:", JSON.stringify(payload, null, 2));

    return cashfreeRequest({
      method: "POST",
      path: "/subscriptions",
      body: payload,
    });
  },

  /**
   * Creates a subscription plan on Cashfree.
   */
  async createPlan(params: {
    plan_id: string;
    plan_name: string;
    plan_type: "PERIODIC" | "ON_DEMAND";
    plan_currency: string;
    plan_max_amount: number;
    plan_recurring_amount?: number;
    plan_intervals?: number;
    plan_interval_type?: "WEEK" | "MONTH" | "YEAR" | "week" | "month" | "year";
  }) {
    const payload = {
      plan_id: params.plan_id,
      plan_name: params.plan_name,
      plan_type: params.plan_type,
      plan_currency: params.plan_currency,
      plan_max_amount: params.plan_max_amount,
      plan_recurring_amount: params.plan_recurring_amount,
      plan_intervals: params.plan_intervals || 1,
      plan_interval_type: (params.plan_interval_type || "MONTH").toUpperCase(),
    };

    console.log("📤 Cashfree Create Plan request payload:", JSON.stringify(payload, null, 2));

    return cashfreeRequest({
      method: "POST",
      path: "/plans",
      body: payload,
    });
  },

  /**
   * Retrieves a subscription plan from Cashfree by plan_id.
   * Returns plan details if found, or throws error.
   */
  async getPlan(planId: string) {
    return cashfreeRequest({
      method: "GET",
      path: `/plans/${planId}`,
    });
  },

  /**
   * Retrieves subscription details by ID.
   */
  async getSubscription(subscriptionId: string) {
    return cashfreeRequest({
      method: "GET",
      path: `/subscriptions/${subscriptionId}`,
    });
  },

  /**
   * Cancels a subscription immediately.
   */
  async cancelSubscription(subscriptionId: string) {
    return cashfreeRequest({
      method: "POST",
      path: `/subscriptions/${subscriptionId}/manage`,
      body: {
        action: "CANCEL",
      },
    });
  },

  /**
   * Manually verifies incoming webhook HMAC signature.
   */
  verifyWebhookSignature(
    signature: string,
    rawBody: string,
    timestamp: string
  ): boolean {
    const secret = CASHFREE_WEBHOOK_SECRET || CASHFREE_SECRET_KEY;
    if (!secret) {
      throw new Error("Missing CASHFREE_WEBHOOK_SECRET or CASHFREE_SECRET_KEY for webhook validation.");
    }

    const signedPayload = timestamp + rawBody;
    const computedSignature = crypto
      .createHmac("sha256", secret)
      .update(signedPayload)
      .digest("base64");

    return computedSignature === signature;
  },
};
