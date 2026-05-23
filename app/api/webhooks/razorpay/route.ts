import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/server";
import { razorpayClient } from "@/lib/billing/razorpay";
import { sendInvoiceEmail } from "@/lib/email/invoice-email";

// GET handler — health check verification
export async function GET() {
  return NextResponse.json({ status: "OK", message: "Razorpay webhook endpoint is active" });
}

export async function POST(request: Request) {
  try {
    const headersList = await headers();
    const signature = headersList.get("x-razorpay-signature") || "";

    // 1. Read raw body as text for precise signature check
    const rawBody = await request.text();

    if (!rawBody || rawBody.trim() === "") {
      return NextResponse.json({ error: "Empty request body" }, { status: 400 });
    }

    console.log("📥 Razorpay Webhook received. Signature:", signature);

    // 2. Validate webhook signature using HMAC SHA255
    const isSignatureValid = razorpayClient.verifyWebhookSignature(rawBody, signature);
    if (!isSignatureValid) {
      console.warn("⚠️ Razorpay Webhook Signature Mismatch. Blocked unverified payload.");
      return NextResponse.json({ error: "Invalid signature verification" }, { status: 401 });
    }

    console.log("✅ Webhook Signature Verified. Processing event details...");

    const payload = JSON.parse(rawBody);
    const event = payload.event;
    const data = payload.payload;

    if (!event || !data) {
      return NextResponse.json({ error: "Invalid payload format" }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // 3. Route events by type
    switch (event) {
      case "subscription.activated": {
        const rzpSub = data.subscription.entity;
        const subscriptionId = rzpSub.id;
        const status = rzpSub.status; // activated, active

        console.log(`🔄 Processing subscription activated: ${subscriptionId} (status: ${status})`);

        // Fetch local subscription
        const { data: localSub } = await adminClient
          .from("subscriptions")
          .select("id, company_id")
          .eq("razorpay_sub_id", subscriptionId)
          .maybeSingle();

        if (!localSub) {
          console.warn(`⚠️ Subscription ID ${subscriptionId} not found in database.`);
          break;
        }

        // Update local tables
        await adminClient
          .from("subscriptions")
          .update({
            status: "ACTIVE",
            updated_at: new Date().toISOString(),
          })
          .eq("id", localSub.id);

        await adminClient
          .from("companies")
          .update({
            status: "ACTIVE",
            updated_at: new Date().toISOString(),
          })
          .eq("id", localSub.company_id);

        console.log(`✅ Activated subscription ${subscriptionId} and company state successfully.`);
        break;
      }

      case "subscription.charged": {
        const rzpSub = data.subscription.entity;
        const rzpPayment = data.payment.entity;
        const subscriptionId = rzpSub.id;
        const paymentId = rzpPayment.id;
        
        // Amount is returned in paise, convert to standard rupees
        const amountPaise = rzpPayment.amount || rzpSub.amount || 0;
        const amountInr = amountPaise / 100;

        console.log(`💰 Processing Payment Success (Charged) event for subscription: ${subscriptionId}, PaymentID: ${paymentId}`);

        // Fetch subscription row & company row
        const { data: localSub } = await adminClient
          .from("subscriptions")
          .select(`
            id, 
            company_id, 
            plan_id,
            pricing_plans:plan_id (name)
          `)
          .eq("razorpay_sub_id", subscriptionId)
          .maybeSingle();

        if (!localSub) {
          console.warn(`⚠️ Subscription ID ${subscriptionId} not found in database.`);
          break;
        }

        const { data: company } = await adminClient
          .from("companies")
          .select("name, billing_email")
          .eq("id", localSub.company_id)
          .single();

        if (!company) {
          console.warn(`⚠️ Company associated with subscription not found.`);
          break;
        }

        // 1. Generate auto-incrementing Invoice Number: BL-INV-2026-XXXXXX
        const { count } = await adminClient
          .from("invoices")
          .select("id", { count: "exact", head: true });
        
        const invoiceIndex = (count || 0) + 1;
        const invoiceNumber = `BL-INV-2026-${String(invoiceIndex).padStart(6, "0")}`;

        // 2. Set period window (from current timestamp up to next month)
        const periodStart = new Date();
        const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        // 3. Write record into `invoices` table
        const { error: invoiceError } = await adminClient
          .from("invoices")
          .insert({
            company_id: localSub.company_id,
            subscription_id: localSub.id,
            cashfree_payment_id: paymentId, // Backward compatibility alias
            razorpay_payment_id: paymentId,
            invoice_number: invoiceNumber,
            amount_inr: amountInr,
            status: "PAID",
            paid_at: new Date().toISOString(),
            billing_period_start: periodStart.toISOString(),
            billing_period_end: periodEnd.toISOString(),
          });

        if (invoiceError) {
          console.error("❌ Failed to create database invoice entry:", invoiceError);
          break;
        }

        console.log(`✅ Created Invoice ${invoiceNumber} successfully in DB.`);

        // 4. Send invoice receipt email via Resend API
        const planName = (localSub.pricing_plans as any)?.name || "Subscription Plan";
        const customerEmail = company.billing_email || rzpSub.customer_details?.email;

        if (customerEmail) {
          console.log(`✉️ Sending invoice email receipt to ${customerEmail}...`);
          const emailResponse = await sendInvoiceEmail({
            to: customerEmail,
            companyName: company.name,
            planName: planName,
            amount: amountInr,
            invoiceNumber: invoiceNumber,
            paidAt: new Date().toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            }),
          });
          console.log("✉️ Email send response:", emailResponse);
        } else {
          console.warn("⚠️ No billing_email available to send receipt.");
        }

        // 5. Update company period end timestamps and subscription statuses to active
        await adminClient
          .from("subscriptions")
          .update({
            current_period_start: periodStart.toISOString(),
            current_period_end: periodEnd.toISOString(),
            status: "ACTIVE",
          })
          .eq("id", localSub.id);

        await adminClient
          .from("companies")
          .update({
            status: "ACTIVE",
          })
          .eq("id", localSub.company_id);

        break;
      }

      case "subscription.cancelled": {
        const rzpSub = data.subscription.entity;
        const subscriptionId = rzpSub.id;

        console.log(`❌ Subscription cancelled for ID: ${subscriptionId}`);

        // Update local subscription row status to CANCELLED
        const { data: localSub } = await adminClient
          .from("subscriptions")
          .select("id, company_id")
          .eq("razorpay_sub_id", subscriptionId)
          .maybeSingle();

        if (localSub) {
          await adminClient
            .from("subscriptions")
            .update({ status: "CANCELLED" })
            .eq("id", localSub.id);

          await adminClient
            .from("companies")
            .update({ status: "CANCELLED" })
            .eq("id", localSub.company_id);
        }
        break;
      }

      case "subscription.halted": {
        const rzpSub = data.subscription.entity;
        const subscriptionId = rzpSub.id;

        console.log(`⚠️ Subscription payment failed/halted for ID: ${subscriptionId}`);

        // Update local subscription row status to PAST_DUE and company to PAUSED
        const { data: localSub } = await adminClient
          .from("subscriptions")
          .select("id, company_id")
          .eq("razorpay_sub_id", subscriptionId)
          .maybeSingle();

        if (localSub) {
          await adminClient
            .from("subscriptions")
            .update({ status: "PAST_DUE" })
            .eq("id", localSub.id);

          await adminClient
            .from("companies")
            .update({ status: "PAUSED" })
            .eq("id", localSub.company_id);
        }
        break;
      }

      default:
        console.log(`ℹ️ Razorpay Webhook event type "${event}" skipped.`);
    }

    // Razorpay expects standard HTTP 200 to acknowledge receipt successfully
    return NextResponse.json({ status: "OK" });

  } catch (err: any) {
    console.error("❌ Razorpay Webhook Processing Error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
