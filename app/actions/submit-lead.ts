"use server";

import { sendEmail } from "@/lib/email/sender";

export async function submitLead(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const company = formData.get("company") as string;
  const phone = formData.get("phone") as string;

  if (!name || !email) {
    return { success: false, error: "Name and email are required." };
  }

  const htmlContent = `
    <h2>New Lead Captured! 🎉</h2>
    <p>A new prospect has submitted their details via the BigLead Marketing Page:</p>
    <table border="1" cellpadding="10" cellspacing="0" style="border-collapse: collapse; width: 100%; max-width: 600px;">
      <tr>
        <td style="background-color: #f3f4f6; font-weight: bold; width: 30%;">Name</td>
        <td>${name}</td>
      </tr>
      <tr>
        <td style="background-color: #f3f4f6; font-weight: bold;">Email</td>
        <td><a href="mailto:${email}">${email}</a></td>
      </tr>
      <tr>
        <td style="background-color: #f3f4f6; font-weight: bold;">Company</td>
        <td>${company || "Not provided"}</td>
      </tr>
      <tr>
        <td style="background-color: #f3f4f6; font-weight: bold;">Phone</td>
        <td>${phone || "Not provided"}</td>
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
  } catch (error: any) {
    console.error("[submitLead] Action error:", error);
    return { success: false, error: error.message || "An unexpected error occurred." };
  }
}
