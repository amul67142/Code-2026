"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwner } from "@/lib/owner/session";

export async function getPromoCodes() {
  if (!(await isOwner())) return { promos: [], plans: [] };
  const admin = createAdminClient();

  const [{ data: promos }, { data: plans }] = await Promise.all([
    admin
      .from("promo_codes")
      .select(
        "id, code, kind, description, plan_id, duration_days, discount_percent, discount_inr, free_seats, max_uses, used_count, is_active, expires_at, created_at, pricing_plans(name)"
      )
      .order("created_at", { ascending: false }),
    admin
      .from("pricing_plans")
      .select("id, name, price_inr")
      .eq("is_custom_price", false)
      .order("price_inr", { ascending: false }),
  ]);

  return { promos: promos || [], plans: plans || [] };
}

export type PromoKind = "ACCESS" | "FIRST_MONTH" | "FREE_SEATS";

/**
 * Three kinds of code:
 *   ACCESS       free access to a plan for N days (investor demos, testing)
 *   FIRST_MONTH  % or ₹ off the first month's platform fee
 *   FREE_SEATS   the first N seats free, for good
 */
export async function createPromoCode(input: {
  kind: PromoKind;
  code?: string;
  description: string;
  planId: string | null;
  durationDays: number;
  discountType?: "PERCENT" | "INR";
  discountValue?: number;
  freeSeats?: number;
  maxUses: number;
  expiresAt?: string | null;
}) {
  if (!(await isOwner())) return { error: "Unauthorized" };

  const kind: PromoKind = ["ACCESS", "FIRST_MONTH", "FREE_SEATS"].includes(input.kind) ? input.kind : "ACCESS";

  // Auto-generate a readable code if none given (e.g. BIGLEAD-7K2M9Q).
  let code = (input.code || "").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
  if (!code) {
    const rand = Array.from({ length: 6 }, () =>
      "ABCDEFGHJKMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 31)]
    ).join("");
    code = `BIGLEAD-${rand}`;
  }
  const uses = Math.min(Math.max(Math.round(input.maxUses) || 1, 1), 1000);

  const row: Record<string, unknown> = {
    code,
    kind,
    description: (input.description || "").trim() || null,
    max_uses: uses,
    expires_at: input.expiresAt || null,
  };

  if (kind === "ACCESS") {
    row.plan_id = input.planId || null;
    row.duration_days = Math.min(Math.max(Math.round(input.durationDays) || 30, 1), 730);
  } else if (kind === "FIRST_MONTH") {
    const v = Math.round(Number(input.discountValue) || 0);
    if (input.discountType === "INR") {
      if (v < 1) return { error: "Enter the rupees off." };
      row.discount_inr = v;
    } else {
      if (v < 1 || v > 100) return { error: "Percent off must be 1 to 100." };
      row.discount_percent = v;
    }
  } else {
    const n = Math.round(Number(input.freeSeats) || 0);
    if (n < 1 || n > 1000) return { error: "Free seats must be 1 to 1000." };
    row.free_seats = n;
  }

  const admin = createAdminClient();
  const { error } = await admin.from("promo_codes").insert(row);

  if (error) {
    if (error.code === "23505") return { error: `Code "${code}" already exists.` };
    console.error("createPromoCode error:", error);
    return { error: "Failed to create promo code" };
  }

  revalidatePath("/owner-admin/promos");
  return { success: true, code };
}

export async function togglePromoCode(id: string, isActive: boolean) {
  if (!(await isOwner())) return { error: "Unauthorized" };
  const admin = createAdminClient();
  const { error } = await admin.from("promo_codes").update({ is_active: isActive }).eq("id", id);
  if (error) return { error: "Failed to update promo code" };
  revalidatePath("/owner-admin/promos");
  return { success: true };
}
