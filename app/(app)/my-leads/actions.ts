"use server";

import { createClient } from "@/lib/supabase/server";

// ── Fetch leads assigned to the current user ──────────────────────
export async function getMyAssignedLeads() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data: profile } = await supabase
    .from("users")
    .select("id, company_id")
    .eq("auth_user_id", user.id)
    .single();

  if (!profile) return [];

  const { data: leads } = await supabase
    .from("leads")
    .select(
      `
      id, name, phone, email, status, source,
      status_1, status_1_remark, status_2, status_2_remark,
      created_at,
      pipeline_stages ( id, name, color )
    `
    )
    .eq("assigned_to_id", profile.id)
    .eq("company_id", profile.company_id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  return leads || [];
}
