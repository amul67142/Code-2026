"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function getCompanySettings() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("users")
    .select("company_id, role")
    .eq("auth_user_id", user.id)
    .single();

  if (!profile || (profile.role !== "ADMIN" && profile.role !== "SUPER_ADMIN")) {
    return { error: "Only admins can manage company settings" };
  }

  const { data: company } = await supabase
    .from("companies")
    .select("*")
    .eq("id", profile.company_id)
    .single();

  if (!company) return { error: "Company not found" };

  return { company };
}

export async function updateCompanySettings(formData: {
  name: string;
  timezone?: string;
  currency?: string;
  billing_email?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("users")
    .select("company_id, role")
    .eq("auth_user_id", user.id)
    .single();

  if (!profile || (profile.role !== "ADMIN" && profile.role !== "SUPER_ADMIN")) {
    return { error: "Insufficient permissions" };
  }

  if (!formData.name || formData.name.trim().length < 2) {
    return { error: "Company name must be at least 2 characters" };
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("companies")
    .update({
      name: formData.name.trim(),
      ...(formData.timezone && { timezone: formData.timezone }),
      ...(formData.currency && { currency: formData.currency }),
      ...(formData.billing_email && { billing_email: formData.billing_email }),
    })
    .eq("id", profile.company_id);

  if (error) {
    console.error("Update company error:", error);
    return { error: "Failed to update company settings" };
  }

  revalidatePath("/settings/company");
  revalidatePath("/settings");
  return { success: true };
}

export async function uploadCompanyLogo(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("users")
    .select("company_id, role")
    .eq("auth_user_id", user.id)
    .single();

  if (!profile || (profile.role !== "ADMIN" && profile.role !== "SUPER_ADMIN")) {
    return { error: "Insufficient permissions" };
  }

  const file = formData.get("logo") as File;
  if (!file || file.size === 0) return { error: "No file selected" };

  if (file.size > 2 * 1024 * 1024) return { error: "Logo must be under 2MB" };

  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const filePath = `logos/${profile.company_id}.${ext}`;

  const adminClient = createAdminClient();

  // Upload to Supabase Storage
  const { error: uploadError } = await adminClient.storage
    .from("public")
    .upload(filePath, file, { upsert: true, contentType: file.type });

  if (uploadError) {
    console.error("Upload error:", uploadError);
    return { error: "Failed to upload logo" };
  }

  // Get public URL
  const { data: urlData } = adminClient.storage.from("public").getPublicUrl(filePath);

  // Update company record
  await adminClient
    .from("companies")
    .update({ logo_url: urlData.publicUrl })
    .eq("id", profile.company_id);

  revalidatePath("/settings/company");
  return { success: true, url: urlData.publicUrl };
}
