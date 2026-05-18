"use server";

import { createClient } from "@/lib/supabase/server";
import { sendPasswordResetEmail } from "@/lib/email";

import { getURL } from "@/lib/utils";

export async function requestPasswordReset(formData: FormData) {
  const email = formData.get("email") as string;
  if (!email) return { error: "Email is required" };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const { createClient: createAdminClient } = await import("@supabase/supabase-js");
  const adminClient = createAdminClient(supabaseUrl, supabaseKey);

  // Check if the user exists in our `users` table using admin client to bypass RLS
  const { data: user, error: userError } = await adminClient
    .from("users")
    .select("name")
    .eq("email", email)
    .single();

  if (userError || !user) {
    // Return success anyway to prevent email enumeration
    return { success: "If an account exists, a reset link has been sent." };
  }


  // Generate a native Supabase recovery link
  // We use our custom /auth/confirm endpoint with the hashed_token so we can verify the OTP server-side
  const { data, error } = await adminClient.auth.admin.generateLink({
    type: "recovery",
    email: email,
  });

  if (error) {
    console.error("Failed to generate link:", error);
    return { error: "Failed to generate reset link. Please try again." };
  }

  // Construct a direct link to our server-side verification endpoint
  const hashedToken = data.properties.hashed_token;
  const actionLink = `${getURL()}/auth/confirm?token_hash=${hashedToken}&type=recovery&next=/reset-password`;

  // Send the email with our custom template containing the secure link
  const name = user.name || email.split("@")[0];
  await sendPasswordResetEmail(email, name, actionLink);

  return { success: "Reset link sent successfully." };
}
