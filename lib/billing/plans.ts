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

/**
 * What adding `count` seats costs right now: the per-seat price for the part
 * of the current paid month that is left, rounded up to the rupee. Fair both
 * ways — a seat added on day 29 costs about ₹30, not ₹899 — and the renewal
 * that follows charges the full new total.
 */
export function proratedSeatPrice(count: number, periodStart: Date, periodEnd: Date, now = new Date()): number {
  const total = periodEnd.getTime() - periodStart.getTime();
  const left = periodEnd.getTime() - now.getTime();
  if (count <= 0 || total <= 0 || left <= 0) return 0;
  const share = Math.min(1, left / total);
  return Math.max(1, Math.ceil(count * EXTRA_SEAT_MONTHLY_INR * share));
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
