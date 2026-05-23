import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/server";
import { cashfree } from "@/lib/billing/cashfree";
import { sendInvoiceEmail } from "@/lib/email/invoice-email";

export async function POST(request: Request) {
  try {
    const headersList = await headers();
    const signature = headersList.get("x-webhook-signature") || "";
    const timestamp = headersList.get("x-webhook-timestamp") || "";

    // 1. Read raw body as text for precise signature check
    const rawBody = await request.text();
    if (!rawBody) {
      return NextResponse.json({ error: "Empty request body" }, { status: 400 });
    }

    console.log("📥 Cashfree Webhook received. Verification headers:", { signature, timestamp });

    // 2. Validate webhook signature using HMAC SHA256 base64
    const isSignatureValid = cashfree.verifyWebhookSignature(signature, rawBody, timestamp);
    if (!isSignatureValid) {
      console.warn("⚠️ Cashfree Webhook Signature Mismatch. Blocked unverified payload.");
      return NextResponse.json({ error: "Invalid signature verification" }, { status: 401 });
    }

    console.log("✅ Webhook Signature Verified. Processing event details...");

    const payload = JSON.parse(rawBody);
    const { type, data } = payload;
    if (!type || !data) {
      return NextResponse.json({ error: "Invalid payload format" }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // 3. Handle Events
    switch (type) {
      case "SUBSCRIPTION_STATUS_CHANGED": {
        const subDetails = data.subscription_details;
        const subscriptionId = subDetails?.subscription_id;
        const newStatus = subDetails?.subscription_status; // ACTIVE, CANCELLED, ON_HOLD, EXPIRED, etc.

        if (!subscriptionId || !newStatus) {
          console.warn("⚠️ Missing fields in SUBSCRIPTION_STATUS_CHANGED event");
          break;
        }

        console.log(`🔄 Processing subscription status change: ${subscriptionId} -> ${newStatus}`);

        // Get local subscription to find company association
        const { data: localSub } = await adminClient
          .from("subscriptions")
          .select("id, company_id")
          .eq("cashfree_sub_id", subscriptionId)
          .maybeSingle();

        if (!localSub) {
          console.warn(`⚠️ Subscription ID ${subscriptionId} not found in database.`);
          break;
        }

        // Map Cashfree status values to local subscription_status enum values:
        // ('ACTIVE', 'PAST_DUE', 'CANCELLED', 'TRIALING')
        let mappedSubStatus: "ACTIVE" | "PAST_DUE" | "CANCELLED" | "TRIALING" = "ACTIVE";
        let companyStatus: "TRIAL" | "ACTIVE" | "PAUSED" | "CANCELLED" = "ACTIVE";

        if (newStatus === "ACTIVE") {
          mappedSubStatus = "ACTIVE";
          companyStatus = "ACTIVE";
        } else if (newStatus === "CANCELLED" || newStatus === "EXPIRED" || newStatus === "CUSTOMER_CANCELLED") {
          mappedSubStatus = "CANCELLED";
          companyStatus = "CANCELLED";
        } else if (newStatus === "ON_HOLD" || newStatus === "PAST_DUE" || newStatus === "BANK_APPROVAL_PENDING") {
          mappedSubStatus = "PAST_DUE";
          companyStatus = "PAUSED";
        }

        // Update local subscription table
        const { error: subUpdateError } = await adminClient
          .from("subscriptions")
          .update({
            status: mappedSubStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("id", localSub.id);

        if (subUpdateError) {
          console.error("❌ Failed to update local subscription status:", subUpdateError);
        }

        // Update local company status
        const { error: companyUpdateError } = await adminClient
          .from("companies")
          .update({
            status: companyStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("id", localSub.company_id);

        if (companyUpdateError) {
          console.error("❌ Failed to update company status:", companyUpdateError);
        }

        console.log(`✅ Updated subscription ${subscriptionId} (${mappedSubStatus}) and company status (${companyStatus}) successfully.`);
        break;
      }

      case "SUBSCRIPTION_PAYMENT_SUCCESS": {
        const subDetails = data.subscription_details;
        const paymentDetails = data.payment_details || data.payment;
        const subscriptionId = subDetails?.subscription_id || data.subscription_id;
        const cfPaymentId = paymentDetails?.cf_payment_id || paymentDetails?.payment_id || data.cf_payment_id || `pay_${crypto.randomUUID().replace(/-/g, "")}`;
        
        // Dynamic amount parser
        const amount = paymentDetails?.amount || subDetails?.plan_max_amount || data.amount || 0;

        if (!subscriptionId) {
          console.warn("⚠️ Missing subscriptionId in SUBSCRIPTION_PAYMENT_SUCCESS event");
          break;
        }

        console.log(`💰 Processing Payment Success event for subscription: ${subscriptionId}, PaymentID: ${cfPaymentId}`);

        // Fetch subscription row & company row
        const { data: localSub } = await adminClient
          .from("subscriptions")
          .select(`
            id, 
            company_id, 
            plan_id,
            pricing_plans:plan_id (name)
          `)
          .eq("cashfree_sub_id", subscriptionId)
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
            cashfree_payment_id: cfPaymentId,
            invoice_number: invoiceNumber,
            amount_inr: amount,
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
        const customerEmail = company.billing_email || data.customer_details?.customer_email;

        if (customerEmail) {
          console.log(`✉️ Sending invoice email receipt to ${customerEmail}...`);
          const emailResponse = await sendInvoiceEmail({
            to: customerEmail,
            companyName: company.name,
            planName: planName,
            amount: amount,
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

        // 5. Update company period end timestamps to active standard duration
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

      case "SUBSCRIPTION_PAYMENT_FAILED": {
        const subDetails = data.subscription_details;
        const subscriptionId = subDetails?.subscription_id || data.subscription_id;

        if (!subscriptionId) break;

        console.log(`❌ Subscription payment failed for subscription ID: ${subscriptionId}`);

        // Update local subscription row status to PAST_DUE, paused company billing access
        const { data: localSub } = await adminClient
          .from("subscriptions")
          .select("id, company_id")
          .eq("cashfree_sub_id", subscriptionId)
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
        console.log(`ℹ️ Webhook event type "${type}" skipped.`);
    }

    // Cashfree expects standard HTTP 200 within 50ms to acknowledge receipt successfully
    return NextResponse.json({ status: "OK" });

  } catch (err: any) {
    console.error("❌ Cashfree Webhook Processing Error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
