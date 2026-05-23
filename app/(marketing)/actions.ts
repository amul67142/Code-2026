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
  const phone = formData.get("phone") as string;

  if (!email || !password || !phone) {
    return { error: "Email, password, and phone number are required." };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters long" };
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
