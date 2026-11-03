/**
 * The one answer to "what is this company allowed to do right now".
 *
 * Every gate reads this — the dashboard lock, lead ingest, the AI agent, seat
 * limits, the billing page — so they cannot drift apart. Server-only.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { hasActiveAccess, isOnTrial, trialEnded } from "@/lib/billing/access";
import { INCLUDED_SEATS } from "@/lib/billing/plans";

export type BillingPhase =
  | "PLATFORM" // SpaceTrans itself: everything, free
  | "TRIAL" // free trial running
  | "ACTIVE" // paid month running (or legacy/promo access)
  | "GRACE" // paid month ended, inside the grace days
  | "TRIAL_ENDED" // trial over, never paid → locked
  | "LOCKED" // paid month and grace both over → locked
  | "NONE"; // never started a trial or paid → locked

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
  periodStart: string | null;
  periodEnd: string | null;
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
  const admin = createAdminClient();
  const [{ data: company }, { data: sub }, seatsUsed] = await Promise.all([
    admin.from("companies").select("is_platform").eq("id", companyId).maybeSingle(),
    admin
      .from("subscriptions")
      .select("status, current_period_start, current_period_end, trial_ends_at, seats")
      .eq("company_id", companyId)
      .maybeSingle(),
    countSeatsUsed(companyId),
  ]);

  const base = {
    seats: sub?.seats ?? INCLUDED_SEATS,
    seatsUsed,
    trialEndsAt: sub?.trial_ends_at ?? null,
    periodStart: sub?.current_period_start ?? null,
    periodEnd: sub?.current_period_end ?? null,
  };

  if (company?.is_platform) {
    return { ...base, phase: "PLATFORM", access: true, aiAgent: true, isPlatform: true };
  }

  const access = hasActiveAccess(sub);
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
  /** For the in-app banner: on trial, or a paid month that has run out. */
  notice: { kind: "TRIAL" | "GRACE"; endsAt: string; soon: boolean } | null;
}

/**
 * Cheaper check for hot paths (every page load, ingest, AI): two small
 * queries, no seat count. Also carries what the app banner needs, so the
 * layout makes no extra round-trip for it.
 */
export async function getAccessFlags(companyId: string): Promise<AccessFlags> {
  const admin = createAdminClient();
  const [{ data: company }, { data: sub }] = await Promise.all([
    admin.from("companies").select("is_platform").eq("id", companyId).maybeSingle(),
    admin
      .from("subscriptions")
      .select("status, current_period_end, trial_ends_at")
      .eq("company_id", companyId)
      .maybeSingle(),
  ]);
  if (company?.is_platform) return { access: true, aiAgent: true, isPlatform: true, notice: null };

  const access = hasActiveAccess(sub);
  const onTrial = isOnTrial(sub);
  let notice: AccessFlags["notice"] = null;
  if (onTrial && sub?.trial_ends_at) {
    const soon = new Date(sub.trial_ends_at).getTime() - Date.now() < 36 * 3600 * 1000;
    notice = { kind: "TRIAL", endsAt: sub.trial_ends_at, soon };
  }
  else if (
    access &&
    sub?.status === "ACTIVE" &&
    sub.current_period_end &&
    new Date(sub.current_period_end).getTime() <= Date.now()
  ) {
    notice = { kind: "GRACE", endsAt: sub.current_period_end, soon: true };
  }
  return { access, aiAgent: access && !onTrial, isPlatform: false, notice };
}
