/**
 * Every number that decides what a customer pays. Change prices here and
 * nowhere else. All prices are GST-inclusive: ₹1999 is the amount charged.
 *
 * Client-safe (no server imports), so pricing pages and the billing screen can
 * show the same figures the server charges.
 */

/** Length of the free trial. */
export const TRIAL_DAYS = 5;

/**
 * WhatsApp credits granted once, when the trial starts, so a trial can send
 * WhatsApp without a recharge. They never expire: unused ones carry over into
 * the paid plan like any other credit.
 */
export const TRIAL_FREE_CREDITS = 100;

/** Basic plan: monthly price, and the seats it includes. */
export const BASIC_MONTHLY_INR = 1999;
export const INCLUDED_SEATS = 3;

/** Each seat beyond the included ones, per month. */
export const EXTRA_SEAT_MONTHLY_INR = 899;

/** Most seats one order can set — a guard against a typo, not a business cap. */
export const MAX_SEATS = 200;

/** WhatsApp credits: price of one, and the smallest recharge accepted. */
export const CREDIT_PRICE_INR = 1;
export const MIN_CREDIT_RECHARGE = 500;
export const MAX_CREDIT_RECHARGE = 100_000;

/** Quick-pick recharge sizes shown on the billing page. */
export const CREDIT_PACKS = [500, 1000, 2500, 5000];

/** Days after a paid month ends before the dashboard locks. Matches access.ts. */
export const RENEWAL_GRACE_DAYS = 3;

/** A held credit with no delivery report after this long is given back. */
export const CREDIT_HOLD_TTL_HOURS = 72;

/** What one month of Basic costs for `seats` seats. */
export function monthlyPrice(seats: number): number {
  const extra = Math.max(0, seats - INCLUDED_SEATS);
  return BASIC_MONTHLY_INR + extra * EXTRA_SEAT_MONTHLY_INR;
}

// ── Per-company pricing ────────────────────────────────────────────────────
// Basic is the default. A company the owner puts on a custom plan has its own
// platform fee, included seats and seat price; a FREE_SEATS promo makes the
// first N seats free for good. The platform fee and the seats are paid
// separately, each for its own month.

export interface CompanyPricing {
  /** True when the owner set a custom price for this company. */
  custom: boolean;
  platformFee: number;
  /** Seats the platform fee includes. */
  includedSeats: number;
  /** Monthly price of each seat beyond the covered ones. */
  seatPrice: number;
  /** Seats a promo makes free, for good. 0 = none. */
  freeSeats: number;
  freeSeatsCode: string | null;
}

export const BASIC_PRICING: CompanyPricing = {
  custom: false,
  platformFee: BASIC_MONTHLY_INR,
  includedSeats: INCLUDED_SEATS,
  seatPrice: EXTRA_SEAT_MONTHLY_INR,
  freeSeats: 0,
  freeSeatsCode: null,
};

/** The company row's plan columns → its pricing. NULL columns mean Basic. */
export function pricingFromCompany(c: {
  plan_platform_fee_inr?: number | null;
  plan_included_seats?: number | null;
  plan_seat_price_inr?: number | null;
  free_seats?: number | null;
  free_seats_code?: string | null;
} | null | undefined): CompanyPricing {
  const custom =
    c?.plan_platform_fee_inr != null || c?.plan_included_seats != null || c?.plan_seat_price_inr != null;
  return {
    custom,
    platformFee: c?.plan_platform_fee_inr ?? BASIC_MONTHLY_INR,
    includedSeats: c?.plan_included_seats ?? INCLUDED_SEATS,
    seatPrice: c?.plan_seat_price_inr ?? EXTRA_SEAT_MONTHLY_INR,
    freeSeats: Math.max(0, c?.free_seats ?? 0),
    freeSeatsCode: c?.free_seats_code ?? null,
  };
}

/** Seats that cost nothing: the included ones, or the promo's, whichever is more. */
export function coveredSeats(p: CompanyPricing): number {
  return Math.max(p.includedSeats, p.freeSeats);
}

/** Seats out of `seats` that are charged. */
export function billableSeats(p: CompanyPricing, seats: number): number {
  return Math.max(0, seats - coveredSeats(p));
}

/** One month of seat charges for `seats` seats. */
export function seatsMonthly(p: CompanyPricing, seats: number): number {
  return billableSeats(p, seats) * p.seatPrice;
}

/** Platform fee plus seats: the full monthly bill. */
export function planMonthly(p: CompanyPricing, seats: number): number {
  return p.platformFee + seatsMonthly(p, seats);
}

/** A FIRST_MONTH promo's discount off a platform fee, never more than the fee. */
export function firstMonthDiscount(
  fee: number,
  promo: { discount_percent?: number | null; discount_inr?: number | null } | null | undefined
): number {
  if (!promo) return 0;
  const off = promo.discount_percent
    ? Math.round((fee * promo.discount_percent) / 100)
    : promo.discount_inr ?? 0;
  return Math.max(0, Math.min(fee, off));
}

/** "50% off" / "₹500 off" — how a FIRST_MONTH promo is described. */
export function discountLabel(promo: { discount_percent?: number | null; discount_inr?: number | null }): string {
  return promo.discount_percent ? `${promo.discount_percent}% off` : `${inr(promo.discount_inr ?? 0)} off`;
}

/**
 * What adding `count` seats costs right now: the per-seat price for the part
 * of the current paid month that is left, rounded up to the rupee. Fair both
 * ways — a seat added on day 29 costs about ₹30, not ₹899 — and the renewal
 * that follows charges the full new total.
 */
export function proratedSeatPrice(
  count: number,
  periodStart: Date,
  periodEnd: Date,
  now = new Date(),
  seatPrice = EXTRA_SEAT_MONTHLY_INR
): number {
  const total = periodEnd.getTime() - periodStart.getTime();
  const left = periodEnd.getTime() - now.getTime();
  if (count <= 0 || total <= 0 || left <= 0) return 0;
  const share = Math.min(1, left / total);
  return Math.max(1, Math.ceil(count * seatPrice * share));
}

/** One calendar month on from `from`, clamped so 31 Jan -> 28/29 Feb. */
export function addOneMonth(from: Date): Date {
  const d = new Date(from);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + 1);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return d;
}

export function creditPrice(credits: number): number {
  return credits * CREDIT_PRICE_INR;
}

export const inr = (n: number) =>
  `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n)}`;
