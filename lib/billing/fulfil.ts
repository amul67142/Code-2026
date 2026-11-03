/**
 * Turn a paid Razorpay order into what was bought: a month of the plan, extra
 * seats, or WhatsApp credits. Then invoice it and email the receipt.
 *
 * Called by BOTH the browser confirmation (/api/billing/verify) and the
 * order.paid webhook. Whichever arrives first does the work; the other finds
 * the order already PAID and stops. The flip happens in one conditional
 * UPDATE, so even two at the same instant cannot both fulfil.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { sendInvoiceEmail } from "@/lib/email/invoice-email";
import { addOneMonth } from "@/lib/billing/plans";
import { razorpayClient } from "@/lib/billing/razorpay";

export type FulfilResult =
  | { status: "FULFILLED"; kind: string }
  | { status: "ALREADY_DONE"; kind: string }
  | { status: "UNKNOWN_ORDER" };

export async function fulfilOrder(razorpayOrderId: string, razorpayPaymentId: string): Promise<FulfilResult> {
  const admin = createAdminClient();
  const now = new Date();

  const { data: order } = await admin
    .from("billing_orders")
    .update({ status: "PAID", razorpay_payment_id: razorpayPaymentId, paid_at: now.toISOString() })
    .eq("razorpay_order_id", razorpayOrderId)
    .eq("status", "CREATED")
    .select("*")
    .maybeSingle();

  if (!order) {
    const { data: existing } = await admin
      .from("billing_orders")
      .select("kind")
      .eq("razorpay_order_id", razorpayOrderId)
      .maybeSingle();
    return existing ? { status: "ALREADY_DONE", kind: existing.kind } : { status: "UNKNOWN_ORDER" };
  }

  const { data: sub } = await admin
    .from("subscriptions")
    .select("id, status, seats, current_period_end, trial_ends_at")
    .eq("company_id", order.company_id)
    .maybeSingle();

  let description = "";
  let periodStart: Date | null = null;
  let periodEnd: Date | null = null;

  if (order.kind === "PLAN") {
    // Paying early never loses days: a running paid month is extended from
    // its end. A trial is not a paid month, so paying during one starts now —
    // the remaining trial days are not carried over.
    const running =
      sub?.status === "ACTIVE" && sub.current_period_end && new Date(sub.current_period_end) > now;
    periodStart = running ? new Date(sub!.current_period_end!) : now;
    periodEnd = addOneMonth(periodStart);

    const { data: basic } = await admin
      .from("pricing_plans")
      .select("id")
      .eq("name", "Basic")
      .maybeSingle();

    await admin.from("subscriptions").upsert(
      {
        company_id: order.company_id,
        status: "ACTIVE",
        seats: order.seats,
        current_period_start: running ? undefined : periodStart.toISOString(),
        current_period_end: periodEnd.toISOString(),
        amount_inr: order.amount_inr,
        plan_id: basic?.id ?? null,
        updated_at: now.toISOString(),
      },
      { onConflict: "company_id" }
    );
    await admin.from("companies").update({ status: "ACTIVE" }).eq("id", order.company_id);
    description = `Basic plan — ${order.seats} seats, 1 month`;
  } else if (order.kind === "SEATS") {
    await admin
      .from("subscriptions")
      .update({ seats: (sub?.seats ?? 0) + order.seats, updated_at: now.toISOString() })
      .eq("company_id", order.company_id);
    description = `${order.seats} extra seat${order.seats === 1 ? "" : "s"} (rest of this month)`;
  } else if (order.kind === "CREDITS") {
    const { error } = await admin.rpc("credit_add", {
      p_company_id: order.company_id,
      p_amount: order.credits,
      p_kind: "RECHARGE",
      p_order_id: order.id,
      p_note: `Recharge ${order.credits} credits`,
    });
    if (error) {
      // The payment is recorded as PAID, so this is now a support case, not a
      // retry: make it loud.
      console.error(`fulfilOrder: PAID order ${order.id} but credits not added:`, error);
    }
    description = `WhatsApp credits (${order.credits})`;
  }

  // ── Invoice + receipt ────────────────────────────────────────────────────
  const { data: number } = await admin.rpc("next_invoice_number");
  const invoiceNumber = (number as string | null) || `BL-INV-${order.id.slice(0, 8)}`;
  const { error: invErr } = await admin.from("invoices").insert({
    company_id: order.company_id,
    subscription_id: sub?.id ?? null,
    billing_order_id: order.id,
    razorpay_payment_id: razorpayPaymentId,
    invoice_number: invoiceNumber,
    amount_inr: order.amount_inr,
    status: "PAID",
    paid_at: now.toISOString(),
    billing_period_start: periodStart?.toISOString() ?? null,
    billing_period_end: periodEnd?.toISOString() ?? null,
    description,
  });
  if (invErr) console.error("fulfilOrder: invoice insert failed:", invErr);

  const [{ data: company }, { data: owner }] = await Promise.all([
    admin.from("companies").select("name, billing_email").eq("id", order.company_id).maybeSingle(),
    admin
      .from("users")
      .select("email")
      .eq("company_id", order.company_id)
      .eq("role", "SUPER_ADMIN")
      .limit(1)
      .maybeSingle(),
  ]);
  const to = company?.billing_email || owner?.email;
  if (to && !invErr) {
    await sendInvoiceEmail({
      to,
      companyName: company?.name || "your company",
      planName: description,
      amount: order.amount_inr,
      invoiceNumber,
      paidAt: now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
    }).catch((e) => console.error("fulfilOrder: receipt email failed:", e));
  }

  return { status: "FULFILLED", kind: order.kind };
}

/**
 * Ask Razorpay about orders we never got a confirmation for, and deliver any
 * that were paid.
 *
 * The browser confirmation and the order.paid webhook should cover every
 * payment — but a customer can close the tab mid-confirmation, and webhooks
 * have not reliably reached production. This closes that gap without relying
 * on either: it runs when the lock screen or billing page loads (one company),
 * and from the daily cron (everyone). Only recent orders are checked.
 */
export async function reconcilePendingOrders(companyId?: string): Promise<number> {
  const admin = createAdminClient();
  const since = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
  let q = admin
    .from("billing_orders")
    .select("razorpay_order_id")
    .eq("status", "CREATED")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(50);
  if (companyId) q = q.eq("company_id", companyId);
  const { data: pending } = await q;

  let fulfilled = 0;
  for (const row of pending || []) {
    try {
      const payments = await razorpayClient.fetchOrderPayments(row.razorpay_order_id);
      const paid = payments.find((p) => p.status === "captured");
      if (paid) {
        const r = await fulfilOrder(row.razorpay_order_id, paid.id);
        if (r.status === "FULFILLED") fulfilled++;
      }
    } catch (e) {
      console.error(`reconcilePendingOrders: ${row.razorpay_order_id}:`, e);
    }
  }
  return fulfilled;
}
