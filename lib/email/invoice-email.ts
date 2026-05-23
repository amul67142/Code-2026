import { sendEmail } from "./sender";

interface SendInvoiceEmailParams {
  to: string;
  companyName: string;
  planName: string;
  amount: number;
  invoiceNumber: string;
  paidAt: string;
}

/**
 * Generates the premium, responsive Zinc-styled metallic monochrome HTML email for receipts.
 */
export function generateInvoiceHtml({
  companyName,
  planName,
  amount,
  invoiceNumber,
  paidAt,
}: Omit<SendInvoiceEmailParams, "to">): string {
  const formattedAmount = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your BigLead CRM Invoice</title>
        <style>
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: #fafafa;
            color: #18181b;
            margin: 0;
            padding: 0;
            -webkit-font-smoothing: antialiased;
          }
          .wrapper {
            width: 100%;
            background-color: #fafafa;
            padding: 40px 0;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border: 1px solid #e4e4e7;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
          }
          .header {
            background-color: #09090b;
            padding: 32px;
            text-align: center;
          }
          .logo {
            font-size: 24px;
            font-weight: 800;
            color: #ffffff;
            letter-spacing: -0.05em;
            text-decoration: none;
          }
          .content {
            padding: 40px;
          }
          h1 {
            font-size: 20px;
            font-weight: 700;
            margin-top: 0;
            margin-bottom: 8px;
            letter-spacing: -0.03em;
          }
          p {
            font-size: 14px;
            line-height: 1.6;
            color: #52525b;
            margin-top: 0;
            margin-bottom: 24px;
          }
          .receipt-box {
            background-color: #f4f4f5;
            border: 1px solid #e4e4e7;
            border-radius: 8px;
            padding: 24px;
            margin-bottom: 32px;
          }
          .receipt-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 12px;
            font-size: 14px;
          }
          .receipt-row:last-child {
            margin-bottom: 0;
            padding-top: 12px;
            border-top: 1px dashed #d4d4d8;
            font-weight: 700;
            color: #09090b;
          }
          .receipt-label {
            color: #71717a;
          }
          .receipt-value {
            color: #18181b;
            text-align: right;
          }
          .button-container {
            text-align: center;
            margin-bottom: 32px;
          }
          .button {
            display: inline-block;
            background-color: #09090b;
            color: #ffffff !important;
            font-size: 14px;
            font-weight: 600;
            padding: 12px 24px;
            border-radius: 6px;
            text-decoration: none;
            transition: background-color 0.2s ease;
          }
          .footer {
            background-color: #f4f4f5;
            padding: 24px;
            text-align: center;
            border-top: 1px solid #e4e4e7;
            font-size: 12px;
            color: #a1a1aa;
          }
          .footer a {
            color: #71717a;
            text-decoration: underline;
          }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container">
            <div class="header">
              <span class="logo">BigLead<span style="color: #71717a;">CRM</span></span>
            </div>
            <div class="content">
              <h1>Thank you for your purchase!</h1>
              <p>Hi ${companyName}, your payment has been processed successfully. Your active subscription has been updated. Below are your transaction and invoice details.</p>
              
              <div class="receipt-box">
                <div class="receipt-row">
                  <span class="receipt-label">Invoice Number</span>
                  <span class="receipt-value" style="font-family: monospace;">${invoiceNumber}</span>
                </div>
                <div class="receipt-row">
                  <span class="receipt-label">Plan Subscribed</span>
                  <span class="receipt-value" style="font-weight: 600;">${planName} Plan</span>
                </div>
                <div class="receipt-row">
                  <span class="receipt-label">Payment Date</span>
                  <span class="receipt-value">${paidAt}</span>
                </div>
                <div class="receipt-row">
                  <span class="receipt-label">Amount Paid</span>
                  <span class="receipt-value" style="font-size: 16px;">${formattedAmount}</span>
                </div>
              </div>

              <div class="button-container">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings/billing" class="button">Manage Billing Dashboard</a>
              </div>

              <p style="margin-bottom: 0; font-size: 13px; text-align: center; color: #a1a1aa;">If you have any questions or did not authorize this charge, please contact <a href="mailto:support@biglead.site" style="color: #71717a; text-decoration: underline;">support@biglead.site</a>.</p>
            </div>
            <div class="footer">
              &copy; 2026 BigLead CRM. All rights reserved.<br>
              Automating real estate lead capture and conversions.
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Helper function to send the billing invoice email via Resend
 */
export async function sendInvoiceEmail(params: SendInvoiceEmailParams) {
  const html = generateInvoiceHtml({
    companyName: params.companyName,
    planName: params.planName,
    amount: params.amount,
    invoiceNumber: params.invoiceNumber,
    paidAt: params.paidAt,
  });

  return sendEmail({
    to: params.to,
    subject: `Invoice ${params.invoiceNumber} for ${params.planName} Plan — BigLead CRM`,
    html,
  });
}
