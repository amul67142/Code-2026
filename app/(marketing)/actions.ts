"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { getURL } from "@/lib/utils";
import { sendWelcomeEmail } from "@/lib/email";
import { hasActiveAccess } from "@/lib/billing/access";

export async function login(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  const supabase = await createClient();

  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !authData.user) {
    return { error: error?.message || "Invalid credentials" };
  }

  // ── Single active device: revoke all OTHER sessions on every new login ──
  // The just-created session stays active; any other device is signed out
  // (its refresh token is revoked → it's logged out on its next token refresh).
  try {
    await supabase.auth.signOut({ scope: "others" });
  } catch (e) {
    console.error("single-device enforcement failed:", e);
  }

  // ── Capture the REAL browser IP for accurate session location ──
  // (SSR login otherwise records the server's IP, not the user's.)
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      const payload = JSON.parse(
        Buffer.from(session.access_token.split(".")[1], "base64").toString("utf8")
      );
      const sessionId = payload.session_id as string | undefined;
      const h = await headers();
      const fwd = h.get("x-forwarded-for") || "";
      const realIp = fwd.split(",")[0].trim() || h.get("x-real-ip") || null;
      if (sessionId && realIp) {
        await createAdminClient()
          .from("session_meta")
          .upsert({ session_id: sessionId, user_id: authData.user.id, ip: realIp });
      }
    }
  } catch (e) {
    console.error("session IP capture failed:", e);
  }

  // Check subscription and onboarding status immediately to redirect directly
  const { data: userProfile } = await supabase
    .from("users")
    .select("company_id, companies(name)")
    .eq("auth_user_id", authData.user.id)
    .maybeSingle();

  let hasPaid = false;
  if (userProfile?.company_id) {
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("status, current_period_end")
      .eq("company_id", userProfile.company_id)
      .maybeSingle();
    hasPaid = hasActiveAccess(sub);
  }

  const companyName = (userProfile?.companies as any)?.name;
  const isOnboarded = !!userProfile && companyName && companyName !== "Pending Onboarding";

  revalidatePath("/", "layout");

  if (!hasPaid) {
    redirect("/select-plan");
  } else if (!isOnboarded) {
    redirect("/onboarding");
  } else {
    redirect("/dashboard");
  }
}

export async function signup(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const phone = formData.get("phone") as string;

  if (!email || !password || !phone) {
    return { error: "Email, password, and phone number are required." };
  }

  // 1. Email format verification
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    return { error: "Invalid email format. Please provide a valid email." };
  }

  // 2. Password length & complexity (at least 1 letter, 1 number)
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters long." };
  }
  const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d)/;
  if (!passwordPattern.test(password)) {
    return { error: "Password must contain at least one letter and one number." };
  }

  // 3. Phone validation - must start with '+' and have standard digits
  const cleanPhone = phone.trim().replace(/\s+/g, "");
  if (!cleanPhone.startsWith("+")) {
    return { error: "Phone number must include an international country prefix starting with '+'." };
  }
  
  const phoneDigits = cleanPhone.slice(1);
  if (phoneDigits.replace(/\D/g, "").length < 7 || phoneDigits.replace(/\D/g, "").length > 15) {
    return { error: "Phone number digits must be between 7 and 15 numbers long." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        phone,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  // If email confirmation is disabled, sign in immediately and redirect
  if (data.session) {
    // Attempt to send welcome email, don't fail signup if it fails
    const name = email.split("@")[0];
    await sendWelcomeEmail(email, name);
    revalidatePath("/", "layout");
    redirect("/select-plan");
  }

  // Email confirmation is still enabled (fallback)
  return { success: "Account created! Please check your email to confirm your account." };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
