import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { razorpayClient } from "@/lib/billing/razorpay";
import { rateLimit } from "@/lib/rate-limit";
import { fulfilOrder } from "@/lib/billing/fulfil";

/**
 * Confirm a payment from the signature Razorpay Checkout hands the browser,
 * and deliver what was bought on the spot.
 *
 * This is the primary path. The order.paid webhook is the backup for a
 * browser that closed before getting here; fulfilOrder makes the two safe to
 * both arrive. Before this, activation depended on the webhook alone.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rl = rateLimit(`billing-verify:${user.id}`, 20, 60 * 1000);
    if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const body = await request.json().catch(() => ({}));
    const orderId = String(body?.razorpay_order_id || "");
    const paymentId = String(body?.razorpay_payment_id || "");
    const signature = String(body?.razorpay_signature || "");

    if (!razorpayClient.verifyOrderPayment(orderId, paymentId, signature)) {
      return NextResponse.json({ error: "Payment could not be verified." }, { status: 400 });
    }

    // The order must belong to the person confirming it.
    const admin = createAdminClient();
    const [{ data: profile }, { data: order }] = await Promise.all([
      admin.from("users").select("company_id").eq("auth_user_id", user.id).maybeSingle(),
      admin.from("billing_orders").select("company_id").eq("razorpay_order_id", orderId).maybeSingle(),
    ]);
    if (!order || !profile || order.company_id !== profile.company_id) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    const result = await fulfilOrder(orderId, paymentId);
    if (result.status === "UNKNOWN_ORDER") {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }
    return NextResponse.json({ success: true, kind: result.kind });
  } catch (err) {
    console.error("billing verify error:", err);
    return NextResponse.json({ error: "Could not confirm the payment." }, { status: 500 });
  }
}
