"use server";

import { revalidatePath } from "next/cache";
import { getCachedUserProfile } from "@/lib/auth/cached-user";
import { rateLimit } from "@/lib/rate-limit";
import { applyPricePromo, setSeatPromoActive } from "@/lib/billing/promo";
import { getBillingState } from "@/lib/billing/state";
import { redeemPromoCode } from "@/app/(billing)/select-plan/actions";

/**
 * Apply a promo code from the billing page. Price codes (first-month discount,
 * free seats) apply here. A free-access code is only for a workspace that is
 * not on a paid plan: on a paying account it would overwrite the paid month.
 */
export async function applyBillingPromo(rawCode: string) {
  const profile = await getCachedUserProfile();
  if (!profile?.company_id) return { error: "Please sign in again." };
  if (profile.role !== "SUPER_ADMIN") return { error: "Only the workspace owner can apply a promo code." };

  const rl = rateLimit(`promo:${profile.company_id}`, 5, 60 * 1000);
  if (!rl.ok) return { error: "Too many attempts — wait a minute and try again." };

  const res = await applyPricePromo(profile.company_id, rawCode);
  if ("access" in res) {
    const state = await getBillingState(profile.company_id);
    if (state.phase === "ACTIVE" || state.phase === "GRACE") {
      return { error: "This code gives free access, and your plan is already paid. Ask us if you need help with it." };
    }
    const r = await redeemPromoCode(rawCode);
    if ("error" in r && r.error) return { error: r.error };
    revalidatePath("/settings/billing");
    return {
      success: true,
      message: "days" in r ? `${r.planName} unlocked for ${r.days} days.` : "message" in r ? r.message : "Code applied.",
    };
  }
  if ("error" in res) return { error: res.error };
  revalidatePath("/settings/billing");
  return { success: true, message: res.message };
}

/** Switch the free-seats promo off (pay full price) or back on. Owner only. */
export async function toggleSeatPromo(active: boolean) {
  const profile = await getCachedUserProfile();
  if (!profile?.company_id) return { error: "Please sign in again." };
  if (profile.role !== "SUPER_ADMIN") return { error: "Only the workspace owner can change the promo." };
  const res = await setSeatPromoActive(profile.company_id, active);
  if ("error" in res) return { error: res.error };
  revalidatePath("/settings/billing");
  return { success: true };
}
