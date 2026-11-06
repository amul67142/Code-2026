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
