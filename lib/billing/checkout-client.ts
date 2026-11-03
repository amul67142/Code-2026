"use client";

/**
 * Pay for one order in the browser: create it, open Razorpay Checkout, and
 * confirm the signed result with our server. Used by the lock screen and the
 * billing page, so both pay exactly the same way.
 *
 * Resolves true once the purchase is delivered, false if the customer closed
 * the window. Throws with a readable message on any failure. The page must
 * load https://checkout.razorpay.com/v1/checkout.js.
 */
export type PurchaseRequest =
  | { kind: "PLAN"; seats: number }
  | { kind: "SEATS"; add: number }
  | { kind: "CREDITS"; credits: number };

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export async function payForOrder(purchase: PurchaseRequest): Promise<boolean> {
  const res = await fetch("/api/billing/order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(purchase),
  });
  const order = await res.json().catch(() => ({}));
  if (!res.ok || order.error) throw new Error(order.error || "Could not start the payment.");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Razorpay = (window as any).Razorpay;
  if (!Razorpay) throw new Error("Payment window did not load. Refresh the page and try again.");

  return new Promise<boolean>((resolve, reject) => {
    const rzp = new Razorpay({
      key: order.razorpayKeyId,
      order_id: order.orderId,
      amount: order.amount * 100,
      currency: "INR",
      name: "BigLead CRM",
      description: order.label,
      prefill: order.prefill,
      theme: { color: "#09090b" },
      modal: { ondismiss: () => resolve(false) },
      handler: async (response: RazorpayResponse) => {
        try {
          const v = await fetch("/api/billing/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(response),
          });
          const out = await v.json().catch(() => ({}));
          if (!v.ok || out.error) {
            // The money has moved; say so plainly rather than "failed".
            reject(
              new Error(
                `${out.error || "We could not confirm the payment"} — if you were charged it will still be applied: refresh this page in a minute. Payment ID: ${response.razorpay_payment_id}`
              )
            );
            return;
          }
          resolve(true);
        } catch {
          reject(
            new Error(
              `Connection lost while confirming. If you were charged it will still be applied: refresh this page in a minute. Payment ID: ${response.razorpay_payment_id}`
            )
          );
        }
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rzp.on("payment.failed", (r: any) => reject(new Error(r?.error?.description || "Payment failed.")));
    rzp.open();
  });
}
