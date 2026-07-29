"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

/** Owner-portal guard — actions only run with the owner session cookie. */
async function requireOwner() {
  const store = await cookies();
  return !!store.get("owner_session")?.value;
}

export async function getPromoCodes() {
  if (!(await requireOwner())) return { promos: [], plans: [] };
  const admin = createAdminClient();

  const [{ data: promos }, { data: plans }] = await Promise.all([
    admin
      .from("promo_codes")
      .select("id, code, description, plan_id, duration_days, max_uses, used_count, is_active, expires_at, created_at, pricing_plans(name)")
      .order("created_at", { ascending: false }),
    admin
      .from("pricing_plans")
      .select("id, name, price_inr")
      .eq("is_custom_price", false)
      .order("price_inr", { ascending: false }),
  ]);

  return { promos: promos || [], plans: plans || [] };
}

export async function createPromoCode(input: {
  code?: string;
  description: string;
  planId: string | null;
  durationDays: number;
  maxUses: number;
  expiresAt?: string | null;
}) {
  if (!(await requireOwner())) return { error: "Unauthorized" };

  // Auto-generate a readable code if none given (e.g. BIGLEAD-7K2M9Q).
  let code = (input.code || "").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
  if (!code) {
    const rand = Array.from({ length: 6 }, () =>
      "ABCDEFGHJKMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 31)]
    ).join("");
    code = `BIGLEAD-${rand}`;
  }
  const days = Math.min(Math.max(Math.round(input.durationDays) || 30, 1), 730);
  const uses = Math.min(Math.max(Math.round(input.maxUses) || 1, 1), 1000);

  const admin = createAdminClient();
  const { error } = await admin.from("promo_codes").insert({
    code,
    description: (input.description || "").trim() || null,
    plan_id: input.planId || null,
    duration_days: days,
    max_uses: uses,
    expires_at: input.expiresAt || null,
  });

  if (error) {
    if (error.code === "23505") return { error: `Code "${code}" already exists.` };
    console.error("createPromoCode error:", error);
    return { error: "Failed to create promo code" };
  }

  revalidatePath("/owner-admin/promos");
  return { success: true, code };
}

export async function togglePromoCode(id: string, isActive: boolean) {
  if (!(await requireOwner())) return { error: "Unauthorized" };
  const admin = createAdminClient();
  const { error } = await admin.from("promo_codes").update({ is_active: isActive }).eq("id", id);
  if (error) return { error: "Failed to update promo code" };
  revalidatePath("/owner-admin/promos");
  return { success: true };
}
