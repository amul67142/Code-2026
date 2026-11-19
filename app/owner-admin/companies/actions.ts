"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwner } from "@/lib/owner/session";
import { extendedEnd, isFreeAccount } from "@/lib/billing/access";
import { countSeatsUsed } from "@/lib/billing/state";
import { MAX_SEATS } from "@/lib/billing/plans";

const MAX_EXTEND_DAYS = 365;

/**
 * Give a free account (trial or promo demo) more days and/or a different seat
 * limit. Paying customers are left alone: their dates and seats come from what
 * they paid for.
 */
export async function updateFreeAccount(companyId: string, input: { extendDays: number; seats: number }) {
  if (!(await isOwner())) return { error: "Unauthorized" };

  const { extendDays, seats } = input;
  if (!Number.isInteger(extendDays) || extendDays < 0 || extendDays > MAX_EXTEND_DAYS) {
    return { error: `Days must be between 0 and ${MAX_EXTEND_DAYS}.` };
  }
  if (!Number.isInteger(seats) || seats < 1 || seats > MAX_SEATS) {
    return { error: `Seats must be between 1 and ${MAX_SEATS}.` };
  }

  const admin = createAdminClient();
  const [{ data: company }, { data: sub }] = await Promise.all([
    admin.from("companies").select("is_platform").eq("id", companyId).maybeSingle(),
    admin
      .from("subscriptions")
      .select("id, status, trial_ends_at, current_period_end, amount_inr, razorpay_sub_id")
      .eq("company_id", companyId)
      .maybeSingle(),
  ]);
  if (!company || company.is_platform || !sub || !isFreeAccount(sub)) {
    return { error: "Only a free trial or promo demo can be changed here." };
  }

  const used = await countSeatsUsed(companyId);
  if (seats < used) {
    return { error: `${used} seats are in use. Remove an agent or make them Read Only first.` };
  }

  const onTrial = sub.status === "TRIALING";
  const now = new Date();
  const endsAt =
    extendDays > 0
      ? extendedEnd(onTrial ? sub.trial_ends_at : sub.current_period_end, extendDays, now.getTime()).toISOString()
      : null;

  const { error } = await admin
    .from("subscriptions")
    .update({
      seats,
      updated_at: now.toISOString(),
      ...(endsAt ? { current_period_end: endsAt } : {}),
      ...(endsAt && onTrial ? { trial_ends_at: endsAt } : {}),
      // A demo's seats run as long as its access, so they never lock it early.
      ...(endsAt && !onTrial ? { seats_period_end: endsAt } : {}),
    })
    .eq("id", sub.id)
    .eq("status", sub.status); // a payment landing now wins
  if (error) {
    console.error("updateFreeAccount failed:", error);
    return { error: "Could not save. Please try again." };
  }
  if (endsAt && onTrial) {
    await admin.from("companies").update({ status: "TRIAL", trial_ends_at: endsAt }).eq("id", companyId);
  }

  revalidatePath("/owner-admin/companies");
  return { success: true };
}

/**
 * Put a company on Basic (all NULL) or a custom plan: its own platform fee,
 * seats the fee includes, and price per extra seat. Also sets free seats (what
 * a FREE_SEATS promo gives) by hand. Applies from the company's next payment;
 * a month already paid keeps the price it was paid at.
 */
export async function updateCompanyPlan(
  companyId: string,
  input: { custom: boolean; platformFee: number; includedSeats: number; seatPrice: number; freeSeats: number }
) {
  if (!(await isOwner())) return { error: "Unauthorized" };
  const whole = (n: number, min: number, max: number) => Number.isInteger(n) && n >= min && n <= max;

  if (input.custom) {
    if (!whole(input.platformFee, 1, 1_000_000)) return { error: "Platform fee must be a whole number of rupees." };
    if (!whole(input.includedSeats, 0, MAX_SEATS)) return { error: `Included seats must be 0 to ${MAX_SEATS}.` };
    if (!whole(input.seatPrice, 1, 100_000)) return { error: "Seat price must be a whole number of rupees." };
  }
  if (!whole(input.freeSeats, 0, 1000)) return { error: "Free seats must be 0 to 1000." };

  const admin = createAdminClient();
  const { data: company } = await admin
    .from("companies")
    .select("is_platform, free_seats, free_seats_code")
    .eq("id", companyId)
    .maybeSingle();
  if (!company) return { error: "Company not found." };
  if (company.is_platform) return { error: "The platform workspace is never billed." };

  const { error } = await admin
    .from("companies")
    .update({
      plan_platform_fee_inr: input.custom ? input.platformFee : null,
      plan_included_seats: input.custom ? input.includedSeats : null,
      plan_seat_price_inr: input.custom ? input.seatPrice : null,
      free_seats: input.freeSeats,
      // A hand-set number is no longer the promo's.
      free_seats_code: input.freeSeats === company.free_seats ? company.free_seats_code : null,
    })
    .eq("id", companyId);
  if (error) {
    console.error("updateCompanyPlan failed:", error);
    return { error: "Could not save. Please try again." };
  }

  revalidatePath("/owner-admin/companies");
  return { success: true };
}
