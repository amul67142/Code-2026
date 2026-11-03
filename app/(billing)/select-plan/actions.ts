"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getCachedUserProfile } from "@/lib/auth/cached-user";
import { rateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { ensureCompanyForUser } from "@/lib/billing/ensure-company";
import { hasActiveAccess } from "@/lib/billing/access";
import { INCLUDED_SEATS, TRIAL_DAYS, TRIAL_FREE_CREDITS } from "@/lib/billing/plans";

/**
 * Redeem a promo code → activates the granted plan at zero cost for the code's
 * duration. Used for investor demos and internal testing (no payment, no
 * Razorpay). When the promo period ends, hasActiveAccess() locks the dashboard
 * again until payment or another promo.
 */
export async function redeemPromoCode(rawCode: string) {
  // A brand-new signup has no company until its first billing action, and a
  // promo code can be that action — so create it here rather than refusing.
  let profile: { company_id: string } | null = await getCachedUserProfile();
  if (!profile?.company_id) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Please sign in again." };
    const ensured = await ensureCompanyForUser(user);
    if ("error" in ensured) return { error: ensured.error };
    profile = ensured.profile;
  }

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

/**
 * Start the 5-day free trial: every integration, no AI agent.
 *
 * One trial per workspace, and one per signup phone number — otherwise a new
 * email address buys another five days. When it ends the dashboard locks,
 * leads keep arriving behind the lock, and the daily cron sends the payment
 * reminder from the SpaceTrans WhatsApp number.
 */
export async function startFreeTrial() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in again." };

  const rl = rateLimit(`trial:${user.id}`, 5, 60 * 1000);
  if (!rl.ok) return { error: "Too many attempts — wait a minute and try again." };

  const ensured = await ensureCompanyForUser(user);
  if ("error" in ensured) return { error: ensured.error };
  const profile = ensured.profile;
  if (profile.role !== "SUPER_ADMIN") return { error: "Only the workspace owner can start the trial." };

  const admin = createAdminClient();
  const { data: sub } = await admin
    .from("subscriptions")
    .select("id, status, trial_ends_at, current_period_end")
    .eq("company_id", profile.company_id)
    .maybeSingle();
  if (sub?.trial_ends_at) return { error: "This workspace has already used its free trial." };
  if (hasActiveAccess(sub)) return { error: "This workspace already has an active plan." };

  // The signup phone is required at signup, so it is the reliable key.
  const phone = String(user.user_metadata?.phone || profile.phone || "").replace(/\D/g, "");
  if (phone.length < 10) {
    return { error: "A phone number is needed for the free trial. Contact support to add one." };
  }
  const { error: claimErr } = await admin
    .from("trial_claims")
    .insert({ phone, company_id: profile.company_id });
  if (claimErr) {
    if (claimErr.code === "23505") {
      return { error: "A free trial has already been used with this phone number. Choose a plan to continue." };
    }
    console.error("startFreeTrial: claim failed:", claimErr);
    return { error: "Could not start the trial. Please try again." };
  }

  const now = new Date();
  const endsAt = new Date(now.getTime() + TRIAL_DAYS * 24 * 3600 * 1000);
  const { data: basic } = await admin.from("pricing_plans").select("id").eq("name", "Basic").maybeSingle();

  const { error: subErr } = await admin.from("subscriptions").upsert(
    {
      company_id: profile.company_id,
      status: "TRIALING",
      trial_ends_at: endsAt.toISOString(),
      current_period_start: now.toISOString(),
      current_period_end: endsAt.toISOString(),
      seats: INCLUDED_SEATS,
      plan_id: basic?.id ?? null,
      amount_inr: 0,
    },
    { onConflict: "company_id" }
  );
  if (subErr) {
    console.error("startFreeTrial: subscription failed:", subErr);
    // Give the phone back so a retry is possible.
    await admin.from("trial_claims").delete().eq("phone", phone).eq("company_id", profile.company_id);
    return { error: "Could not start the trial. Please try again." };
  }
  await admin
    .from("companies")
    .update({ status: "TRIAL", trial_ends_at: endsAt.toISOString() })
    .eq("id", profile.company_id);

  // The free credits. Once per trial, and a trial happens once per workspace
  // and once per phone, so this cannot be claimed twice. A failure here must
  // not undo a trial that has started — it is logged and can be granted by hand.
  const { error: grantErr } = await admin.rpc("credit_add", {
    p_company_id: profile.company_id,
    p_amount: TRIAL_FREE_CREDITS,
    p_kind: "ADJUSTMENT",
    p_order_id: null,
    p_note: `Free trial: ${TRIAL_FREE_CREDITS} WhatsApp credits`,
  });
  if (grantErr) console.error(`startFreeTrial: free credits not granted to ${profile.company_id}:`, grantErr);

  return { success: true, trialEndsAt: endsAt.toISOString() };
}
