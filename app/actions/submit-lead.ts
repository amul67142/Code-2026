"use server";

import { sendEmail } from "@/lib/email/sender";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

/** Escape user input before embedding in HTML (prevents HTML injection in the notification email). */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function submitLead(formData: FormData) {
  // Public endpoint — rate limit per IP so bots can't spam it and burn email quota.
  const ip = await getClientIp();
  const rl = rateLimit(`submit-lead:${ip}`, 3, 10 * 60 * 1000); // 3 per 10 min per IP
  if (!rl.ok) {
    return { success: false, error: "Too many requests. Please try again in a few minutes." };
  }

  const name = ((formData.get("name") as string) || "").trim().slice(0, 100);
  const email = ((formData.get("email") as string) || "").trim().slice(0, 200);
  const company = ((formData.get("company") as string) || "").trim().slice(0, 100);
  const phone = ((formData.get("phone") as string) || "").trim().slice(0, 30);

  if (!name || !email) {
    return { success: false, error: "Name and email are required." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: "Please enter a valid email address." };
  }

  const htmlContent = `
    <h2>New Lead Captured! 🎉</h2>
    <p>A new prospect has submitted their details via the BigLead Marketing Page:</p>
    <table border="1" cellpadding="10" cellspacing="0" style="border-collapse: collapse; width: 100%; max-width: 600px;">
      <tr>
        <td style="background-color: #f3f4f6; font-weight: bold; width: 30%;">Name</td>
        <td>${esc(name)}</td>
      </tr>
      <tr>
        <td style="background-color: #f3f4f6; font-weight: bold;">Email</td>
        <td><a href="mailto:${esc(email)}">${esc(email)}</a></td>
      </tr>
      <tr>
        <td style="background-color: #f3f4f6; font-weight: bold;">Company</td>
        <td>${esc(company) || "Not provided"}</td>
      </tr>
      <tr>
        <td style="background-color: #f3f4f6; font-weight: bold;">Phone</td>
        <td>${esc(phone) || "Not provided"}</td>
      </tr>
      <tr>
        <td style="background-color: #f3f4f6; font-weight: bold;">Source</td>
        <td>Marketing Homepage (Get Demo / Contact Sales)</td>
      </tr>
    </table>
    <br/>
    <p>Please reach out to them as soon as possible.</p>
  `;

  try {
    const result = await sendEmail({
      to: "amul67142@gmail.com",
      subject: `New Lead: ${name} (${company || "No Company"})`,
      html: htmlContent,
    });

    if (!result.success) {
      return { success: false, error: result.error || "Failed to send email notification." };
    }

    return { success: true };
  } catch (error: unknown) {
    console.error("[submitLead] Action error:", error);
    const msg = error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, error: msg };
  }
}
