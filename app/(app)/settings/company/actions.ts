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

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

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

  try {
    const s3Client = new S3Client({
      region: process.env.S3_REGION!,
      endpoint: process.env.S3_ENDPOINT!,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
      },
      // Important for S3 compatible services like Supabase Storage/R2
      forcePathStyle: true,
    });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: filePath,
      Body: buffer,
      ContentType: file.type,
    });

    await s3Client.send(command);

    // Get public URL using Supabase storage format
    // URL pattern: [project-url]/storage/v1/object/public/[bucket]/[key]
    const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${process.env.S3_BUCKET_NAME}/${filePath}`;

    const adminClient = createAdminClient();
    
    // Update company record
    await adminClient
      .from("companies")
      .update({ logo_url: publicUrl })
      .eq("id", profile.company_id);

    revalidatePath("/settings/company");
    return { success: true, url: publicUrl };
  } catch (error) {
    console.error("Upload error:", error);
    return { error: "Failed to upload logo" };
  }
}
