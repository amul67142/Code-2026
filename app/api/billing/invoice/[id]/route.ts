import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/billing/invoice/[id]
 * Generates a printable HTML invoice page that the browser can Print → Save as PDF.
 * Authenticated: user must belong to the company that owns the invoice.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: invoiceId } = await params;
    const supabase = await createClient();

    // 1. Authenticate user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // 2. Fetch user profile for company_id
    const { data: userProfile } = await supabase
      .from("users")
      .select("company_id")
      .eq("auth_user_id", user.id)
      .single();

    if (!userProfile) {
      return new NextResponse("User profile not found", { status: 404 });
    }

    // 3. Fetch invoice with company and subscription plan details
    const { data: invoice, error } = await supabase
      .from("invoices")
      .select(`
        id,
        invoice_number,
        amount_inr,
        status,
        paid_at,
        billing_period_start,
        billing_period_end,
        company_id,
        subscription_id
      `)
      .eq("id", invoiceId)
      .single();

    if (error || !invoice) {
      return new NextResponse("Invoice not found", { status: 404 });
    }

    // 4. Authorization check — invoice must belong to user's company
    if (invoice.company_id !== userProfile.company_id) {
      return new NextResponse("Access denied", { status: 403 });
    }

    // 5. Fetch company details
    const { data: company } = await supabase
      .from("companies")
      .select("name, billing_email")
      .eq("id", invoice.company_id)
      .single();

    // 6. Fetch plan name via subscription
    let planName = "Subscription Plan";
    if (invoice.subscription_id) {
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("pricing_plans:plan_id (name)")
        .eq("id", invoice.subscription_id)
        .single();
      if (sub?.pricing_plans) {
        planName = (sub.pricing_plans as any).name + " Plan";
      }
    }

    // 7. Format values
    const formattedAmount = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(invoice.amount_inr);

    const paidDate = invoice.paid_at
      ? new Date(invoice.paid_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
      : "—";

    const periodStart = invoice.billing_period_start
      ? new Date(invoice.billing_period_start).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
      : "—";

    const periodEnd = invoice.billing_period_end
      ? new Date(invoice.billing_period_end).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
      : "—";

    const companyName = company?.name || "Customer";
    const billingEmail = company?.billing_email || "—";

    // 8. Generate printable HTML invoice
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoice.invoice_number} — BigLead CRM</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f4f4f5;
      color: #18181b;
      -webkit-font-smoothing: antialiased;
      padding: 40px 20px;
    }
    .invoice {
      max-width: 700px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e4e4e7;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
    }
    .header {
      background: #09090b;
      padding: 32px 40px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .logo {
      font-size: 22px;
      font-weight: 800;
      color: #fff;
      letter-spacing: -0.04em;
    }
    .logo span { color: #71717a; }
    .header-badge {
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.15);
      color: #a1a1aa;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      padding: 6px 14px;
      border-radius: 20px;
    }
    .body { padding: 40px; }
    .title-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 32px;
    }
    h1 {
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.03em;
    }
    .invoice-num {
      font-family: 'SF Mono', 'Fira Code', monospace;
      font-size: 13px;
      font-weight: 700;
      color: #71717a;
      background: #f4f4f5;
      padding: 6px 12px;
      border-radius: 6px;
      border: 1px solid #e4e4e7;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 32px;
    }
    .meta-card {
      background: #fafafa;
      border: 1px solid #e4e4e7;
      border-radius: 10px;
      padding: 16px 20px;
    }
    .meta-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #a1a1aa;
      margin-bottom: 4px;
    }
    .meta-value {
      font-size: 14px;
      font-weight: 600;
      color: #18181b;
    }
    .line-items {
      border: 1px solid #e4e4e7;
      border-radius: 10px;
      overflow: hidden;
      margin-bottom: 32px;
    }
    .line-header {
      display: grid;
      grid-template-columns: 3fr 1fr 1fr;
      background: #f4f4f5;
      padding: 12px 20px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #71717a;
    }
    .line-row {
      display: grid;
      grid-template-columns: 3fr 1fr 1fr;
      padding: 16px 20px;
      border-top: 1px solid #f4f4f5;
      font-size: 14px;
    }
    .line-row .desc { font-weight: 600; }
    .line-row .qty { color: #71717a; text-align: center; }
    .line-row .amt { font-weight: 700; text-align: right; }
    .total-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
      background: #09090b;
      border-radius: 10px;
      margin-bottom: 32px;
    }
    .total-label {
      font-size: 14px;
      font-weight: 600;
      color: #a1a1aa;
    }
    .total-value {
      font-size: 28px;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: -0.03em;
    }
    .footer {
      border-top: 1px solid #e4e4e7;
      padding: 24px 40px;
      text-align: center;
      font-size: 12px;
      color: #a1a1aa;
    }
    .footer a { color: #71717a; text-decoration: underline; }
    .print-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #09090b;
      color: #fff;
      font-size: 14px;
      font-weight: 600;
      padding: 12px 28px;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      margin: 0 auto 32px;
    }
    .print-btn:hover { background: #27272a; }
    .print-center { text-align: center; }
    .status-badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      padding: 4px 10px;
      border-radius: 20px;
      background: #ecfdf5;
      color: #059669;
      border: 1px solid #a7f3d0;
    }
    @media print {
      body { background: #fff; padding: 0; }
      .invoice { box-shadow: none; border: none; }
      .print-btn { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="print-center">
    <button class="print-btn" onclick="window.print()">
      <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>
      Download / Print Invoice
    </button>
  </div>

  <div class="invoice">
    <div class="header">
      <img src="https://res.cloudinary.com/dy2zpgv6q/image/upload/v1779118448/Gemini_Generated_Image_2kpsnp2kpsnp2kps_1_-Photoroom_ddqkxb.png" alt="BigLead" style="height:44px;width:auto;object-fit:contain;" />
      <div class="header-badge">Tax Invoice</div>
    </div>

    <div class="body">
      <div class="title-row">
        <div>
          <h1>Invoice</h1>
          <p style="font-size: 13px; color: #71717a; margin-top: 4px;">Thank you for your business.</p>
        </div>
        <div class="invoice-num">${invoice.invoice_number}</div>
      </div>

      <div class="meta-grid">
        <div class="meta-card">
          <div class="meta-label">Bill To</div>
          <div class="meta-value">${companyName}</div>
          <div style="font-size: 12px; color: #71717a; margin-top: 2px;">${billingEmail}</div>
        </div>
        <div class="meta-card">
          <div class="meta-label">Payment Date</div>
          <div class="meta-value">${paidDate}</div>
          <div style="font-size: 12px; color: #71717a; margin-top: 2px;">Status: <span class="status-badge">${invoice.status}</span></div>
        </div>
        <div class="meta-card">
          <div class="meta-label">Billing Period</div>
          <div class="meta-value">${periodStart} — ${periodEnd}</div>
        </div>
        <div class="meta-card">
          <div class="meta-label">Payment Gateway</div>
          <div class="meta-value">Razorpay</div>
        </div>
      </div>

      <div class="line-items">
        <div class="line-header">
          <div>Description</div>
          <div style="text-align: center;">Qty</div>
          <div style="text-align: right;">Amount</div>
        </div>
        <div class="line-row">
          <div class="desc">${planName} — Monthly Subscription</div>
          <div class="qty">1</div>
          <div class="amt">${formattedAmount}</div>
        </div>
      </div>

      <div class="total-row">
        <div class="total-label">Total Amount Paid</div>
        <div class="total-value">${formattedAmount}</div>
      </div>
    </div>

    <div class="footer">
      &copy; 2026 BigLead CRM. All rights reserved.<br>
      Questions? Contact us at <a href="mailto:info@bigleads.site">info@bigleads.site</a>
    </div>
  </div>
</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (err: any) {
    console.error("❌ Invoice Download Error:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
