"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getURL } from "@/lib/utils";
import { sendWelcomeEmail } from "@/lib/email";

export async function login(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signup(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters long" };
  }

  const supabase = await createClient();

  // Supabase Auth handles sending the email using the configured SMTP
  // The user should configure Resend SMTP in their Supabase dashboard for auth emails.
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${getURL()}/api/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  // Attempt to send welcome email, don't fail signup if it fails
  const name = email.split("@")[0]; // Fallback name
  await sendWelcomeEmail(email, name);

  // If email confirmation is required, redirect to a check email message
  return { success: "Account created! Please check your email to confirm your account." };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
