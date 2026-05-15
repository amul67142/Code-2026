"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getProjects() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error("Unauthorized");
  }

  // Get user profile to find company_id
  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("company_id")
    .eq("auth_user_id", user.id)
    .single();

  if (profileError || !profile) {
    throw new Error("Profile not found");
  }

  const { data: projects, error } = await supabase
    .from("projects")
    .select("*")
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("Failed to fetch projects");
  }

  return projects;
}

export async function createProject(formData: FormData) {
  const name = formData.get("name") as string;
  const type = formData.get("type") as string;
  const location = formData.get("location") as string;
  const priceMin = formData.get("price_min") as string;
  const priceMax = formData.get("price_max") as string;
  const description = formData.get("description") as string;

  if (!name || !type) {
    return { error: "Name and Type are required" };
  }

  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: "Unauthorized" };
  }

  // Get user profile to find company_id
  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("company_id")
    .eq("auth_user_id", user.id)
    .single();

  if (profileError || !profile) {
    return { error: "Profile not found" };
  }

  const { error: insertError } = await supabase
    .from("projects")
    .insert({
      company_id: profile.company_id,
      name,
      type,
      location: location || null,
      price_min: priceMin ? parseFloat(priceMin) : null,
      price_max: priceMax ? parseFloat(priceMax) : null,
      description: description || null,
      status: "ACTIVE",
    });

  if (insertError) {
    console.error("Insert Error:", insertError);
    return { error: "Failed to create project" };
  }

  revalidatePath("/projects");
  return { success: true };
}
