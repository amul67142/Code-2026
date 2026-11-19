import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { razorpayClient } from "@/lib/billing/razorpay";
import { rateLimit } from "@/lib/rate-limit";
import { ensureCompanyForUser } from "@/lib/billing/ensure-company";
import { getBillingState } from "@/lib/billing/state";
import { fulfilOrder } from "@/lib/billing/fulfil";
import { getFirstMonthOffer } from "@/lib/billing/promo";
import {
  MAX_CREDIT_RECHARGE,
  MAX_SEATS,
  MIN_CREDIT_RECHARGE,
  billableSeats,
  coveredSeats,
  creditPrice,
  proratedSeatPrice,
  seatsMonthly,
} from "@/lib/billing/plans";

/**
 * Create a one-time Razorpay order for:
 *   { kind: "PLAN",       seats }   one month of the platform fee AND seats
 *   { kind: "PLATFORM" }            one month of the platform fee only
 *   { kind: "SEAT_MONTH", seats }   one month of seats only
 *   { kind: "SEATS",      add }     seats added for the rest of the seat month
 *   { kind: "CREDITS",    credits } WhatsApp credits, at least 500
 *
 * Prices come from the company's plan (Basic, or the custom price the owner
 * set) and are computed here — never taken from the browser. A first-month
 * promo comes off the platform fee. When nothing is left to pay (a 100%-off
 * first month, or seats a promo covers) there is no Razorpay order: it is
 * applied here and the response says { free: true }.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rl = rateLimit(`billing-order:${user.id}`, 10, 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Too many attempts. Please wait a minute and try again." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
      );
    }

    const ensured = await ensureCompanyForUser(user);
    if ("error" in ensured) return NextResponse.json({ error: ensured.error }, { status: 500 });
    const profile = ensured.profile;
    if (profile.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Only the workspace owner can make payments." }, { status: 403 });
    }

    const state = await getBillingState(profile.company_id);
    if (state.isPlatform) {
      return NextResponse.json({ error: "This workspace is not billed." }, { status: 400 });
    }
    const pricing = state.pricing;
    const covered = coveredSeats(pricing);
    const admin = createAdminClient();
    const bad = (error: string) => NextResponse.json({ error }, { status: 400 });

    const body = await request.json().catch(() => ({}));
    const kind = body?.kind as string;
    let amount = 0;
    let seats: number | null = null;
    let credits: number | null = null;
    let platformInr: number | null = null;
    let seatsInr: number | null = null;
    let discount = 0;
    let promoId: string | null = null;
    let label = "";

    const platformPaid = state.platformPaid;
    const seatMonthRunning = !!state.seatsPeriodEnd && new Date(state.seatsPeriodEnd).getTime() > Date.now();

    if (kind === "PLAN" || kind === "PLATFORM") {
      const offer = await getFirstMonthOffer(profile.company_id);
      if (offer) {
        discount = offer.discountFor(pricing.platformFee);
        promoId = offer.promoId;
      }
      platformInr = pricing.platformFee - discount;
      if (kind === "PLAN") {
        // Never sell fewer seats than are already in use.
        seats = Math.max(covered, state.seatsUsed, Math.floor(Number(body.seats) || 0));
        if (seats > MAX_SEATS) return bad(`At most ${MAX_SEATS} seats per order.`);
        seatsInr = seatsMonthly(pricing, seats);
        label = `Platform fee + ${seats} seats, 1 month`;
      } else {
        label = "Platform fee, 1 month";
      }
      amount = platformInr + (seatsInr ?? 0);
    } else if (kind === "SEAT_MONTH") {
      // Seats are paid on top of a paid platform month. On a trial or a lapsed
      // plan the right move is the plan itself, with seats chosen there.
      if (!platformPaid) return bad("Pay the platform fee first — or pay for both together.");
      seats = Math.max(state.seatsUsed, Math.floor(Number(body.seats) || 0));
      if (seats < 1 || seats > MAX_SEATS) return bad(`Choose between 1 and ${MAX_SEATS} seats.`);
      seatsInr = seatsMonthly(pricing, seats);
      amount = seatsInr;
      label = `${seats} seats, 1 month`;
      if (amount === 0) {
        // Every seat is covered by the plan or a promo: nothing to pay.
        await admin
          .from("subscriptions")
          .update({ seats, seats_period_start: null, seats_period_end: null, updated_at: new Date().toISOString() })
          .eq("company_id", profile.company_id);
        return NextResponse.json({ free: true, message: `You now have ${seats} seats, at no charge.` });
      }
    } else if (kind === "SEATS") {
      const add = Math.floor(Number(body.add) || 0);
      if (add < 1 || state.seats + add > MAX_SEATS) return bad("Choose how many seats to add.");
      if (!platformPaid) return bad("Extra seats can be added to a paid plan. Choose your seats when you buy the plan.");
      const newlyBillable = billableSeats(pricing, state.seats + add) - billableSeats(pricing, state.seats);
      if (newlyBillable === 0) {
        await admin
          .from("subscriptions")
          .update({ seats: state.seats + add, updated_at: new Date().toISOString() })
          .eq("company_id", profile.company_id);
        return NextResponse.json({ free: true, message: `${add} seat${add === 1 ? "" : "s"} added, at no charge.` });
      }
      if (!seatMonthRunning) {
        return bad("Pay for a month of seats to add charged seats.");
      }
      const start = state.seatsPeriodStart
        ? new Date(state.seatsPeriodStart)
        : new Date(new Date(state.seatsPeriodEnd!).getTime() - 30 * 864e5);
      amount = proratedSeatPrice(newlyBillable, start, new Date(state.seatsPeriodEnd!), new Date(), pricing.seatPrice);
      if (amount < 1) return bad("Your seat month is about to renew — add seats when you renew.");
      seats = add;
      seatsInr = amount;
      label = `${add} extra seat${add === 1 ? "" : "s"}`;
    } else if (kind === "CREDITS") {
      credits = Math.floor(Number(body.credits) || 0);
      if (credits < MIN_CREDIT_RECHARGE || credits > MAX_CREDIT_RECHARGE) {
        return bad(`Recharge between ${MIN_CREDIT_RECHARGE} and ${MAX_CREDIT_RECHARGE} credits.`);
      }
      amount = creditPrice(credits);
      label = `${credits} WhatsApp credits`;
    } else {
      return bad("Unknown purchase.");
    }

    const row = {
      company_id: profile.company_id,
      kind,
      seats,
      credits,
      amount_inr: amount,
      platform_inr: platformInr,
      seats_inr: seatsInr,
      discount_inr: discount,
      promo_id: promoId,
      created_by_id: profile.id,
    };

    // A 100%-off first month: recorded and invoiced at ₹0, without Razorpay.
    if (amount === 0) {
      const freeId = `free_${crypto.randomUUID()}`;
      const { error: insErr } = await admin.from("billing_orders").insert({ ...row, razorpay_order_id: freeId });
      if (insErr) {
        console.error("free billing order insert failed:", insErr);
        return NextResponse.json({ error: "Could not apply the promo. Please try again." }, { status: 500 });
      }
      await fulfilOrder(freeId, `free_${crypto.randomUUID()}`);
      return NextResponse.json({ free: true, message: "Your first month is on us." });
    }

    const order = await razorpayClient.createOrder(amount, `${kind}-${Date.now()}`, {
      company_id: profile.company_id,
      kind,
    });

    const { error: insErr } = await admin.from("billing_orders").insert({ ...row, razorpay_order_id: order.id });
    if (insErr) {
      console.error("billing order insert failed:", insErr);
      return NextResponse.json({ error: "Could not start the payment. Please try again." }, { status: 500 });
    }

    const { data: company } = await admin
      .from("companies")
      .select("name, billing_email")
      .eq("id", profile.company_id)
      .maybeSingle();

    return NextResponse.json({
      orderId: order.id,
      amount,
      label,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
      prefill: {
        name: profile.name || company?.name || "",
        email: company?.billing_email || profile.email || "",
        contact: profile.phone || "",
      },
    });
  } catch (err) {
    console.error("billing order error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not start the payment." },
      { status: 500 }
    );
  }
}
