"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getCachedUserProfile } from "@/lib/auth/cached-user";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Redeem a promo code → activates the granted plan at zero cost for the code's
 * duration. Used for investor demos and internal testing (no payment, no
 * Razorpay). When the promo period ends, hasActiveAccess() locks the dashboard
 * again until payment or another promo.
 */
export async function redeemPromoCode(rawCode: string) {
  const profile = await getCachedUserProfile();
  if (!profile?.company_id) return { error: "Please sign in again." };

  // Brute-force guard: 5 attempts/minute per company.
  const rl = rateLimit(`promo:${profile.company_id}`, 5, 60 * 1000);
  if (!rl.ok) return { error: "Too many attempts — wait a minute and try again." };

  const code = (rawCode || "").trim().toUpperCase();
  if (!code) return { error: "Enter a promo code." };

  const admin = createAdminClient();

  // 1. Validate the code.
  const { data: promo } = await admin
    .from("promo_codes")
    .select("id, code, plan_id, duration_days, max_uses, used_count, is_active, expires_at")
    .eq("code", code)
    .maybeSingle();

  if (!promo || !promo.is_active) return { error: "Invalid promo code." };
  if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
    return { error: "This promo code has expired." };
  }
  if ((promo.used_count || 0) >= promo.max_uses) {
    return { error: "This promo code has reached its usage limit." };
  }

  // 2. One redemption per company per code.
  const { data: already } = await admin
    .from("promo_redemptions")
    .select("id")
    .eq("promo_id", promo.id)
    .eq("company_id", profile.company_id)
    .maybeSingle();
  if (already) return { error: "Your account has already used this promo code." };

  // 3. Resolve the plan the code grants (fallback: highest-priced plan).
  let planId = promo.plan_id as string | null;
  let planName = "Pro";
  if (planId) {
    const { data: plan } = await admin
      .from("pricing_plans")
      .select("id, name")
      .eq("id", planId)
      .maybeSingle();
    planName = plan?.name || planName;
  } else {
    const { data: topPlan } = await admin
      .from("pricing_plans")
      .select("id, name")
      .eq("is_custom_price", false)
      .order("price_inr", { ascending: false })
      .limit(1)
      .maybeSingle();
    planId = topPlan?.id || null;
    planName = topPlan?.name || planName;
  }

  const now = new Date();
  const until = new Date(now.getTime() + promo.duration_days * 24 * 60 * 60 * 1000);

  // 4. Activate the subscription at zero cost.
  const { data: existingSub } = await admin
    .from("subscriptions")
    .select("id")
    .eq("company_id", profile.company_id)
    .maybeSingle();

  const subRow = {
    company_id: profile.company_id,
    status: "ACTIVE",
    plan_id: planId,
    amount_inr: 0,
    current_period_start: now.toISOString(),
    current_period_end: until.toISOString(),
    promo_code: promo.code,
  };
  const subRes = existingSub
    ? await admin.from("subscriptions").update(subRow).eq("id", existingSub.id)
    : await admin.from("subscriptions").insert(subRow);
  if (subRes.error) {
    console.error("redeemPromoCode subscription error:", subRes.error);
    return { error: "Couldn't activate the promo. Try again." };
  }

  // 5. Activate the company + record the redemption + count the use.
  await admin
    .from("companies")
    .update({ status: "ACTIVE" })
    .eq("id", profile.company_id);
  await admin.from("promo_redemptions").insert({
    promo_id: promo.id,
    company_id: profile.company_id,
    valid_until: until.toISOString(),
  });
  await admin
    .from("promo_codes")
    .update({ used_count: (promo.used_count || 0) + 1 })
    .eq("id", promo.id);

  return {
    success: true,
    planName,
    validUntil: until.toISOString(),
    days: promo.duration_days,
  };
}
