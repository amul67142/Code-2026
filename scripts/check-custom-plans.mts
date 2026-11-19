/**
 * Checks per-company pricing (Basic, custom plans, free-seat promos,
 * first-month discounts) and the rule for when unpaid seats lock a workspace.
 *
 *   npx tsx scripts/check-custom-plans.mts
 */
import {
  BASIC_PRICING,
  billableSeats,
  coveredSeats,
  firstMonthDiscount,
  planMonthly,
  pricingFromCompany,
  proratedSeatPrice,
  seatsMonthly,
} from "../lib/billing/plans";
import { seatsInGrace, seatsLapsed } from "../lib/billing/access";

let fail = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${ok ? "" : `\n      got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`}`);
}

// ── Basic stays exactly as before ──
check("no plan columns = Basic", pricingFromCompany({}), BASIC_PRICING);
check("Basic, 3 seats = ₹1,999", planMonthly(BASIC_PRICING, 3), 1999);
check("Basic, 5 seats = 1,999 + 2 × 899", planMonthly(BASIC_PRICING, 5), 1999 + 2 * 899);

// ── MVD-style custom plan: ₹2,599 + ₹599 per seat, 3 included ──
const mvd = pricingFromCompany({ plan_platform_fee_inr: 2599, plan_included_seats: 3, plan_seat_price_inr: 599 });
check("custom flagged", mvd.custom, true);
check("custom, 13 seats = 2,599 + 10 × 599", planMonthly(mvd, 13), 2599 + 10 * 599);
check("custom, seats only = 10 × 599", seatsMonthly(mvd, 13), 5990);
const mvdNoneIncluded = pricingFromCompany({ plan_platform_fee_inr: 2599, plan_included_seats: 0, plan_seat_price_inr: 599 });
check("custom with 0 included charges every seat", seatsMonthly(mvdNoneIncluded, 10), 5990);

// ── Free-seat promo: first 15 free, then the seat price ──
const promo = pricingFromCompany({ free_seats: 15, free_seats_code: "TEAM15" });
check("free seats cover 15", coveredSeats(promo), 15);
check("13 agents with 15 free = ₹0 seats", seatsMonthly(promo, 13), 0);
check("13 agents with 15 free = platform only", planMonthly(promo, 13), 1999);
check("18 agents with 15 free = 3 charged", billableSeats(promo, 18), 3);
check("18 agents with 15 free, Basic seat price", seatsMonthly(promo, 18), 3 * 899);
const mvdPromo = pricingFromCompany({ plan_platform_fee_inr: 2599, plan_included_seats: 3, plan_seat_price_inr: 599, free_seats: 15 });
check("custom + 15 free: 20 seats = 5 × 599", seatsMonthly(mvdPromo, 20), 5 * 599);
check("free seats do not stack on included (max, not sum)", coveredSeats(mvdPromo), 15);

// ── Seat promo switched off by the client ──
const paused = pricingFromCompany({ free_seats: 15, free_seats_code: "TEAM15", free_seats_paused: true });
check("paused promo: no free seats now", paused.freeSeats, 0);
check("paused promo: still remembered", [paused.promoSeats, paused.seatPromoPaused], [15, true]);
check("paused promo: 13 seats charged as Basic", seatsMonthly(paused, 13), 10 * 899);
check("pause flag without a promo is ignored", pricingFromCompany({ free_seats_paused: true }).seatPromoPaused, false);

// ── First-month discount ──
check("50% off 1,999", firstMonthDiscount(1999, { discount_percent: 50 }), 1000);
check("100% off 2,599", firstMonthDiscount(2599, { discount_percent: 100 }), 2599);
check("₹500 off", firstMonthDiscount(1999, { discount_inr: 500 }), 500);
check("₹ off never more than the fee", firstMonthDiscount(1999, { discount_inr: 5000 }), 1999);
check("no promo, no discount", firstMonthDiscount(1999, null), 0);

// ── Pro-rated seats use the company's seat price ──
const start = new Date("2026-11-01T00:00:00Z");
const end = new Date("2026-12-01T00:00:00Z");
const mid = new Date("2026-11-16T00:00:00Z");
check("half a month of 1 seat at ₹599", proratedSeatPrice(1, start, end, mid, 599), 300);
check("half a month of 1 seat at Basic ₹899", proratedSeatPrice(1, start, end, mid), 450);

// ── When unpaid seats lock ──
const now = new Date("2026-11-20T00:00:00Z").getTime();
const day = 24 * 3600 * 1000;
const ended = (daysAgo: number) => new Date(now - daysAgo * day).toISOString();
check("no seat month = never lapsed", seatsLapsed({ seats: 10, seats_period_end: null }, 3, now), false);
check("seats all covered = never lapsed", seatsLapsed({ seats: 3, seats_period_end: ended(30) }, 3, now), false);
check("ended 1 day ago = grace, not locked", [seatsInGrace({ seats: 10, seats_period_end: ended(1) }, 3, now), seatsLapsed({ seats: 10, seats_period_end: ended(1) }, 3, now)], [true, false]);
check("ended 4 days ago = locked", seatsLapsed({ seats: 10, seats_period_end: ended(4) }, 3, now), true);
check("still running = fine", [seatsInGrace({ seats: 10, seats_period_end: ended(-5) }, 3, now), seatsLapsed({ seats: 10, seats_period_end: ended(-5) }, 3, now)], [false, false]);
check("free-seat promo covering everyone = not locked", seatsLapsed({ seats: 13, seats_period_end: ended(10) }, 15, now), false);

console.log(fail ? `\n${fail} FAILED` : "\nall passed");
process.exit(fail ? 1 : 0);
