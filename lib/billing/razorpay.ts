import Razorpay from "razorpay";
import crypto from "crypto";

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

// Ensure Razorpay SDK handles initialization safely
const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID || "rzp_test_placeholder",
  key_secret: RAZORPAY_KEY_SECRET || "placeholder_secret",
});

export interface CreateSubscriptionParams {
  plan_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  return_url: string;
}

export const razorpayClient = {
  /**
   * Creates a subscription plan on Razorpay dynamically.
   * Razorpay expects amount in paise (1 INR = 100 paise).
   */
  async createPlan(name: string, priceInr: number) {
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      throw new Error("Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET environment variables.");
    }

    console.log(`🚀 Creating Plan on Razorpay: ${name} (${priceInr} INR)`);
    return razorpay.plans.create({
      period: "monthly",
      interval: 1,
      item: {
        name: `${name} Plan`,
        amount: priceInr * 100, // convert to paise
        currency: "INR",
        description: `BigLead CRM ${name} Monthly Subscription`,
      },
    });
  },

  /**
   * Creates a Subscription on Razorpay linked to a Plan.
   * Razorpay automatically generates a hosted "short_url" which we return to redirect the user!
   */
  async createSubscription(params: CreateSubscriptionParams) {
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      throw new Error("Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET environment variables.");
    }

    console.log(`🚀 Creating Subscription on Razorpay for Plan ID: ${params.plan_id}`);
    
    // Create standard subscription mandate
    const subscription = await razorpay.subscriptions.create({
      plan_id: params.plan_id,
      total_count: 60, // 5 years of monthly recurring charges
      quantity: 1,
      customer_notify: 1,
      notify_info: {
        notify_email: params.customer_email,
        notify_phone: params.customer_phone,
      },
      // Note: Custom metadata for easy mapping in webhooks
      notes: {
        customer_name: params.customer_name,
      },
    });

    return subscription;
  },

  /**
   * Cancels a Razorpay subscription at the end of the current billing cycle.
   */
  async cancelSubscription(subscriptionId: string) {
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      throw new Error("Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET environment variables.");
    }

    console.log(`🚫 Cancelling Subscription on Razorpay: ${subscriptionId}`);
    return razorpay.subscriptions.cancel(subscriptionId, false); // false = cancel at end of cycle (recommended)
  },

  /**
   * A one-time order: a month of the plan, extra seats, or WhatsApp credits.
   * Amount in whole rupees, GST-inclusive.
   */
  async createOrder(amountInr: number, receipt: string, notes: Record<string, string>) {
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      throw new Error("Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET environment variables.");
    }
    return razorpay.orders.create({
      amount: Math.round(amountInr * 100),
      currency: "INR",
      receipt: receipt.slice(0, 40),
      notes,
    });
  },

  /** The payments made against one order — used to find ones we never heard about. */
  async fetchOrderPayments(orderId: string) {
    const res = await razorpay.orders.fetchPayments(orderId);
    return res.items || [];
  },

  /**
   * Check the signature Razorpay Checkout hands the browser after a payment.
   * This — not the webhook — is what activates a purchase, so a webhook that
   * never arrives cannot leave a paying customer locked out. Uses the real
   * secret only: the test fallback above must never validate a live payment.
   */
  verifyOrderPayment(orderId: string, paymentId: string, signature: string): boolean {
    if (!RAZORPAY_KEY_SECRET || !orderId || !paymentId || !signature) return false;
    const expected = crypto
      .createHmac("sha256", RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  },

  /**
   * Securely validates incoming webhook payload signatures from Razorpay.
   */
  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    const secret = RAZORPAY_WEBHOOK_SECRET;
    if (!secret) {
      throw new Error("Missing RAZORPAY_WEBHOOK_SECRET env variable for webhook verification.");
    }

    try {
      return Razorpay.validateWebhookSignature(rawBody, signature, secret);
    } catch (err) {
      console.error("❌ Razorpay signature validation error:", err);
      return false;
    }
  },
};
