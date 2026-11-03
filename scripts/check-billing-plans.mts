/**
 * Checks for lib/billing/plans.ts and lib/billing/access.ts — the numbers and
 * rules that decide what a customer is charged and whether they are locked.
 *
 *   npx tsx scripts/check-billing-plans.mts
 */
import {
  addOneMonth,
  creditPrice,
  monthlyPrice,
  proratedSeatPrice,
  BASIC_MONTHLY_INR,
  EXTRA_SEAT_MONTHLY_INR,
  INCLUDED_SEATS,
} from "../lib/billing/plans";
import { hasActiveAccess, isOnTrial, trialEnded } from "../lib/billing/access";

let fail = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) fail++;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${label}` +
      (ok ? "" : `\n      got      ${JSON.stringify(actual)}\n      expected ${JSON.stringify(expected)}`)
  );
}
const iso = (ms: number) => new Date(Date.now() + ms).toISOString();
const DAY = 864e5;

// ── The prices the client agreed ──────────────────────────────────
check("constants: ₹1999, 3 seats, ₹899/extra", [BASIC_MONTHLY_INR, INCLUDED_SEATS, EXTRA_SEAT_MONTHLY_INR], [1999, 3, 899]);
check("3 seats = ₹1999", monthlyPrice(3), 1999);
check("1 seat still ₹1999 (3 included)", monthlyPrice(1), 1999);
check("4 seats = ₹2898", monthlyPrice(4), 2898);
check("10 seats = ₹8292", monthlyPrice(10), 1999 + 7 * 899);
check("500 credits = ₹500", creditPrice(500), 500);

// ── Prorated seats ────────────────────────────────────────────────
const start = new Date("2026-11-01T00:00:00Z");
const end = new Date("2026-12-01T00:00:00Z");
check("1 seat on day 1 ≈ full ₹899", proratedSeatPrice(1, start, end, start), 899);
check("1 seat half way = ₹450 (rounded up)", proratedSeatPrice(1, start, end, new Date("2026-11-16T00:00:00Z")), 450);
check("2 seats half way = ₹899", proratedSeatPrice(2, start, end, new Date("2026-11-16T00:00:00Z")), 899);
check("1 seat on the last day ≈ ₹30", proratedSeatPrice(1, start, end, new Date("2026-11-30T00:00:00Z")), 30);
check("never more than full price", proratedSeatPrice(1, start, end, new Date("2026-10-01T00:00:00Z")), 899);
check("after the month ended: ₹0", proratedSeatPrice(1, start, end, new Date("2026-12-02T00:00:00Z")), 0);
check("tiny remainder still charges at least ₹1",
  proratedSeatPrice(1, start, end, new Date(end.getTime() - 60_000)), 1);
check("zero seats: ₹0", proratedSeatPrice(0, start, end, start), 0);

// ── One calendar month on ─────────────────────────────────────────
const ym = (d: Date) => [d.getFullYear(), d.getMonth() + 1, d.getDate()];
check("15 Nov → 15 Dec", ym(addOneMonth(new Date(2026, 10, 15))), [2026, 12, 15]);
check("31 Jan → 28 Feb (non-leap)", ym(addOneMonth(new Date(2027, 0, 31))), [2027, 2, 28]);
check("31 Jan → 29 Feb (leap)", ym(addOneMonth(new Date(2028, 0, 31))), [2028, 2, 29]);
check("31 Dec → 31 Jan, year rolls", ym(addOneMonth(new Date(2026, 11, 31))), [2027, 1, 31]);
check("keeps the time of day", addOneMonth(new Date(2026, 10, 15, 14, 30)).getHours(), 14);

// ── Access rules ──────────────────────────────────────────────────
check("running trial grants access", hasActiveAccess({ status: "TRIALING", trial_ends_at: iso(2 * DAY) }), true);
check("ended trial locks", hasActiveAccess({ status: "TRIALING", trial_ends_at: iso(-60_000) }), false);
check("TRIALING without a trial date (pending checkout) locks — unchanged",
  hasActiveAccess({ status: "TRIALING", current_period_end: iso(30 * DAY) }), false);
check("a pending checkout's 30-day period is NOT a free month",
  hasActiveAccess({ status: "TRIALING", current_period_end: iso(30 * DAY), trial_ends_at: null }), false);
check("paid month running", hasActiveAccess({ status: "ACTIVE", current_period_end: iso(10 * DAY) }), true);
check("paid month ended 2 days ago: still in grace", hasActiveAccess({ status: "ACTIVE", current_period_end: iso(-2 * DAY) }), true);
check("paid month ended 4 days ago: locked", hasActiveAccess({ status: "ACTIVE", current_period_end: iso(-4 * DAY) }), false);
check("no subscription: locked", hasActiveAccess(null), false);
check("isOnTrial", isOnTrial({ status: "TRIALING", trial_ends_at: iso(DAY) }), true);
check("trialEnded", trialEnded({ status: "TRIALING", trial_ends_at: iso(-DAY) }), true);
check("a paid account is not 'trial ended'", trialEnded({ status: "ACTIVE", trial_ends_at: iso(-DAY) }), false);

console.log(fail === 0 ? "\nAll checks passed." : `\n${fail} FAILED`);
process.exit(fail === 0 ? 0 : 1);
