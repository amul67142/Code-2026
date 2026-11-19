/**
 * Promo codes that change what a company pays (server-only).
 *
 *   FIRST_MONTH  % or ₹ off the company's first platform payment. Applying it
 *                parks it on the company; the first PLAN or PLATFORM order
 *                uses it and clears it.
 *   FREE_SEATS   the first N seats are free, for good. Applied at once.
 *   ACCESS       free access for N days (investor demos). Handled by
 *                redeemPromoCode on the plan page; not here.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { discountLabel, firstMonthDiscount } from "@/lib/billing/plans";

export interface PromoRow {
  id: string;
  code: string;
  kind: "ACCESS" | "FIRST_MONTH" | "FREE_SEATS";
  description: string | null;
  discount_percent: number | null;
  discount_inr: number | null;
  free_seats: number | null;
  max_uses: number;
  used_count: number;
  is_active: boolean;
  expires_at: string | null;
}

const PROMO_COLUMNS =
  "id, code, kind, description, discount_percent, discount_inr, free_seats, max_uses, used_count, is_active, expires_at";

/** Look a code up and check it can still be used. */
export async function findUsablePromo(rawCode: string): Promise<{ promo: PromoRow } | { error: string }> {
  const code = (rawCode || "").trim().toUpperCase();
  if (!code) return { error: "Enter a promo code." };
  const admin = createAdminClient();
  const { data: promo } = await admin.from("promo_codes").select(PROMO_COLUMNS).eq("code", code).maybeSingle();
  if (!promo || !promo.is_active) return { error: "Invalid promo code." };
  if (promo.expires_at && new Date(promo.expires_at) < new Date()) return { error: "This promo code has expired." };
  if ((promo.used_count || 0) >= promo.max_uses) return { error: "This promo code has reached its usage limit." };
  return { promo: promo as PromoRow };
}

/** True once the company has paid (or been given) a platform month. */
export async function hasPaidPlatformBefore(companyId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { count } = await admin
    .from("billing_orders")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .in("kind", ["PLAN", "PLATFORM"])
    .eq("status", "PAID");
  return (count || 0) > 0;
}

export interface FirstMonthOffer {
  promoId: string;
  code: string;
  label: string;
  /** Rupees off the platform fee given. */
  discountFor: (fee: number) => number;
}

/** The FIRST_MONTH code parked on this company, if it can still be used. */
export async function getFirstMonthOffer(companyId: string): Promise<FirstMonthOffer | null> {
  const admin = createAdminClient();
  const { data: company, error } = await admin
    .from("companies")
    .select("first_month_promo_id")
    .eq("id", companyId)
    .maybeSingle();
  if (error || !company?.first_month_promo_id) return null;
  const { data: promo } = await admin
    .from("promo_codes")
    .select("id, code, kind, discount_percent, discount_inr, is_active")
    .eq("id", company.first_month_promo_id)
    .maybeSingle();
  if (!promo || promo.kind !== "FIRST_MONTH" || !promo.is_active) return null;
  if (await hasPaidPlatformBefore(companyId)) return null;
  return {
    promoId: promo.id,
    code: promo.code,
    label: discountLabel(promo),
    discountFor: (fee: number) => firstMonthDiscount(fee, promo),
  };
}

/**
 * Apply a FIRST_MONTH or FREE_SEATS code to a company. ACCESS codes come back
 * as { access: true } for the caller to send to redeemPromoCode.
 */
export async function applyPricePromo(
  companyId: string,
  rawCode: string
): Promise<{ success: true; message: string } | { access: true } | { error: string }> {
  const found = await findUsablePromo(rawCode);
  if ("error" in found) return found;
  const { promo } = found;
  if (promo.kind === "ACCESS") return { access: true };

  const admin = createAdminClient();
  const { data: already } = await admin
    .from("promo_redemptions")
    .select("id")
    .eq("promo_id", promo.id)
    .eq("company_id", companyId)
    .maybeSingle();
  if (already) return { error: "Your account has already used this promo code." };

  if (promo.kind === "FIRST_MONTH") {
    if (await hasPaidPlatformBefore(companyId)) {
      return { error: "This code is for the first month only, and your first month is already paid." };
    }
    const { error } = await admin.from("companies").update({ first_month_promo_id: promo.id }).eq("id", companyId);
    if (error) return { error: "Could not apply the code. Please try again." };
    // The use is counted when the discounted month is paid, not now: a code
    // applied and never paid for should not burn a use.
    return { success: true, message: `${discountLabel(promo)} your first month's platform fee — applied at payment.` };
  }

  // FREE_SEATS: in force from now on.
  const seats = promo.free_seats || 0;
  const { error } = await admin
    .from("companies")
    .update({ free_seats: seats, free_seats_code: promo.code })
    .eq("id", companyId);
  if (error) return { error: "Could not apply the code. Please try again." };
  await recordRedemption(promo.id, companyId, null);

  // Seats now covered need no seat month: stop charging if nothing is left to pay.
  const { data: sub } = await admin
    .from("subscriptions")
    .select("id, seats")
    .eq("company_id", companyId)
    .maybeSingle();
  if (sub && (sub.seats ?? 0) <= seats) {
    await admin
      .from("subscriptions")
      .update({ seats_period_start: null, seats_period_end: null, updated_at: new Date().toISOString() })
      .eq("id", sub.id);
  }
  return { success: true, message: `Your first ${seats} seats are now free.` };
}

/** Count one use of a code by a company. Safe to call twice: the pair is unique. */
export async function recordRedemption(promoId: string, companyId: string, validUntil: string | null) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("promo_redemptions")
    .insert({ promo_id: promoId, company_id: companyId, valid_until: validUntil });
  if (error) return; // already recorded
  const { data: p } = await admin.from("promo_codes").select("used_count").eq("id", promoId).maybeSingle();
  await admin
    .from("promo_codes")
    .update({ used_count: (p?.used_count || 0) + 1 })
    .eq("id", promoId);
}
