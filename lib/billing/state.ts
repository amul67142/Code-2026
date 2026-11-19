/**
 * The one answer to "what is this company allowed to do right now".
 *
 * Every gate reads this — the dashboard lock, lead ingest, the AI agent, seat
 * limits, the billing page — so they cannot drift apart. Server-only.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { hasActiveAccess, isOnTrial, seatsInGrace, seatsLapsed, trialEnded } from "@/lib/billing/access";
import { INCLUDED_SEATS, coveredSeats, pricingFromCompany, type CompanyPricing } from "@/lib/billing/plans";

export type BillingPhase =
  | "PLATFORM" // SpaceTrans itself: everything, free
  | "TRIAL" // free trial running
  | "ACTIVE" // paid month running (or legacy/promo access)
  | "GRACE" // paid month ended, inside the grace days
  | "TRIAL_ENDED" // trial over, never paid → locked
  | "LOCKED" // paid month and grace both over → locked
  | "NONE"; // never started a trial or paid → locked

/** Plan columns read from companies for pricing. */
export const COMPANY_PLAN_COLUMNS =
  "is_platform, plan_platform_fee_inr, plan_included_seats, plan_seat_price_inr, free_seats, free_seats_code, free_seats_paused";
/** Same without the pause flag (before migration 033). */
const COMPANY_PLAN_COLUMNS_032 =
  "is_platform, plan_platform_fee_inr, plan_included_seats, plan_seat_price_inr, free_seats, free_seats_code";

type CompanyPlanRow = {
  is_platform: boolean | null;
  plan_platform_fee_inr?: number | null;
  plan_included_seats?: number | null;
  plan_seat_price_inr?: number | null;
  free_seats?: number | null;
  free_seats_code?: string | null;
  free_seats_paused?: boolean | null;
};

/**
 * The company's platform flag and plan columns. If the plan columns are not
 * there yet (code deployed before migration 032), falls back to the platform
 * flag alone and Basic prices — so a missing column can never cost SpaceTrans
 * its platform status or lock a paying customer.
 */
export async function loadCompanyPlan(companyId: string): Promise<CompanyPlanRow | null> {
  const admin = createAdminClient();
  for (const cols of [COMPANY_PLAN_COLUMNS, COMPANY_PLAN_COLUMNS_032]) {
    const { data, error } = await admin.from("companies").select(cols).eq("id", companyId).maybeSingle();
    if (!error) return data as CompanyPlanRow | null;
    console.error("loadCompanyPlan: plan columns unavailable:", error.message);
  }
  const { data: fallback } = await admin.from("companies").select("is_platform").eq("id", companyId).maybeSingle();
  return fallback as CompanyPlanRow | null;
}

const SUB_COLUMNS_FULL =
  "status, current_period_start, current_period_end, trial_ends_at, seats, seats_period_start, seats_period_end";
const SUB_COLUMNS_OLD = "status, current_period_start, current_period_end, trial_ends_at, seats";

type SubRow = {
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  trial_ends_at: string | null;
  seats: number | null;
  seats_period_start?: string | null;
  seats_period_end?: string | null;
};

/** The subscription row, with the same fallback for the seat-period columns. */
async function loadSubscription(companyId: string): Promise<SubRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("subscriptions").select(SUB_COLUMNS_FULL).eq("company_id", companyId).maybeSingle();
  if (!error) return data as SubRow | null;
  console.error("loadSubscription: seat-period columns unavailable:", error.message);
  const { data: fallback } = await admin.from("subscriptions").select(SUB_COLUMNS_OLD).eq("company_id", companyId).maybeSingle();
  return fallback as SubRow | null;
}

export interface BillingState {
  phase: BillingPhase;
  /** Can use the CRM at all. */
  access: boolean;
  /** The AI WhatsApp agent runs. Not on the free trial. */
  aiAgent: boolean;
  /** Seats paid for, and seats taken. */
  seats: number;
  seatsUsed: number;
  trialEndsAt: string | null;
  /** The platform fee's paid month. */
  periodStart: string | null;
  periodEnd: string | null;
  /** The seat charges' paid month. NULL = no seat charges being paid. */
  seatsPeriodStart: string | null;
  seatsPeriodEnd: string | null;
  /** A paid platform month is running (or in its grace days). Not a trial. */
  platformPaid: boolean;
  /** Seat month ended and its grace days are over: the reason for a lock. */
  seatsLapsed: boolean;
  seatsInGrace: boolean;
  pricing: CompanyPricing;
  isPlatform: boolean;
}

/** Users who take a seat: anyone active or invited, except READ_ONLY. */
export async function countSeatsUsed(companyId: string): Promise<number> {
  const admin = createAdminClient();
  const { count } = await admin
    .from("users")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .in("status", ["ACTIVE", "INVITED"])
    .neq("role", "READ_ONLY");
  return count || 0;
}

export async function getBillingState(companyId: string): Promise<BillingState> {
  const [company, sub, seatsUsed] = await Promise.all([
    loadCompanyPlan(companyId),
    loadSubscription(companyId),
    countSeatsUsed(companyId),
  ]);

  const pricing = pricingFromCompany(company);
  const covered = coveredSeats(pricing);
  const base = {
    seats: sub?.seats ?? INCLUDED_SEATS,
    seatsUsed,
    trialEndsAt: sub?.trial_ends_at ?? null,
    periodStart: sub?.current_period_start ?? null,
    periodEnd: sub?.current_period_end ?? null,
    seatsPeriodStart: sub?.seats_period_start ?? null,
    seatsPeriodEnd: sub?.seats_period_end ?? null,
    seatsLapsed: seatsLapsed(sub, covered),
    seatsInGrace: seatsInGrace(sub, covered),
    platformPaid: sub?.status === "ACTIVE" && hasActiveAccess(sub),
    pricing,
  };

  if (company?.is_platform) {
    return {
      ...base,
      seatsLapsed: false,
      seatsInGrace: false,
      phase: "PLATFORM",
      access: true,
      aiAgent: true,
      isPlatform: true,
    };
  }

  const platformAccess = hasActiveAccess(sub);
  const access = platformAccess && !base.seatsLapsed;
  let phase: BillingPhase;
  if (isOnTrial(sub)) phase = "TRIAL";
  else if (trialEnded(sub)) phase = "TRIAL_ENDED";
  else if (access) {
    const ended = sub?.current_period_end && new Date(sub.current_period_end).getTime() <= Date.now();
    phase = ended ? "GRACE" : "ACTIVE";
  } else phase = sub ? "LOCKED" : "NONE";

  return {
    ...base,
    phase,
    access,
    // The free trial covers every integration but not the AI agent.
    aiAgent: access && phase !== "TRIAL",
    isPlatform: false,
  };
}

export interface AccessFlags {
  access: boolean;
  aiAgent: boolean;
  isPlatform: boolean;
  /** For the in-app banner: on trial, a paid month that has run out, or unpaid seats. */
  notice: { kind: "TRIAL" | "GRACE" | "SEATS"; endsAt: string; soon: boolean } | null;
}

/**
 * Cheaper check for hot paths (every page load, ingest, AI): two small
 * queries, no seat count. Also carries what the app banner needs, so the
 * layout makes no extra round-trip for it.
 */
export async function getAccessFlags(companyId: string): Promise<AccessFlags> {
  const [company, sub] = await Promise.all([loadCompanyPlan(companyId), loadSubscription(companyId)]);
  if (company?.is_platform) return { access: true, aiAgent: true, isPlatform: true, notice: null };

  const covered = coveredSeats(pricingFromCompany(company));
  const access = hasActiveAccess(sub) && !seatsLapsed(sub, covered);
  const onTrial = isOnTrial(sub);
  let notice: AccessFlags["notice"] = null;
  if (onTrial && sub?.trial_ends_at) {
    const soon = new Date(sub.trial_ends_at).getTime() - Date.now() < 36 * 3600 * 1000;
    notice = { kind: "TRIAL", endsAt: sub.trial_ends_at, soon };
  } else if (
    access &&
    sub?.status === "ACTIVE" &&
    sub.current_period_end &&
    new Date(sub.current_period_end).getTime() <= Date.now()
  ) {
    notice = { kind: "GRACE", endsAt: sub.current_period_end, soon: true };
  } else if (access && sub?.seats_period_end && seatsInGrace(sub, covered)) {
    notice = { kind: "SEATS", endsAt: sub.seats_period_end, soon: true };
  }
  return { access, aiAgent: access && !onTrial, isPlatform: false, notice };
}
