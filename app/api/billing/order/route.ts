import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { razorpayClient } from "@/lib/billing/razorpay";
import { rateLimit } from "@/lib/rate-limit";
import { ensureCompanyForUser } from "@/lib/billing/ensure-company";
import { getBillingState } from "@/lib/billing/state";
import {
  INCLUDED_SEATS,
  MAX_CREDIT_RECHARGE,
  MAX_SEATS,
  MIN_CREDIT_RECHARGE,
  creditPrice,
  monthlyPrice,
  proratedSeatPrice,
} from "@/lib/billing/plans";

/**
 * Create a one-time Razorpay order for:
 *   { kind: "PLAN",    seats }    one month of Basic for that many seats
 *   { kind: "SEATS",   add }      extra seats for the rest of the paid month
 *   { kind: "CREDITS", credits }  WhatsApp credits, at least 500
 *
 * The amount is always computed here from lib/billing/plans.ts — never taken
 * from the browser — so a tampered request cannot set its own price.
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

    const body = await request.json().catch(() => ({}));
    const kind = body?.kind;
    let amount = 0;
    let seats: number | null = null;
    let credits: number | null = null;
    let label = "";

    if (kind === "PLAN") {
      const requested = Math.floor(Number(body.seats) || INCLUDED_SEATS);
      // Never sell fewer seats than are already in use.
      seats = Math.max(INCLUDED_SEATS, state.seatsUsed, requested);
      if (seats > MAX_SEATS) {
        return NextResponse.json({ error: `At most ${MAX_SEATS} seats per order.` }, { status: 400 });
      }
      amount = monthlyPrice(seats);
      label = `Basic plan, ${seats} seats`;
    } else if (kind === "SEATS") {
      const add = Math.floor(Number(body.add) || 0);
      if (add < 1 || state.seats + add > MAX_SEATS) {
        return NextResponse.json({ error: "Choose how many seats to add." }, { status: 400 });
      }
      // Seats are bought on top of a paid month. On a trial or a lapsed plan
      // the right move is the plan itself, with the seat count chosen there.
      if (state.phase !== "ACTIVE" || !state.periodEnd) {
        return NextResponse.json(
          { error: "Extra seats can be added to a paid plan. Choose your seats when you buy the plan." },
          { status: 400 }
        );
      }
      const start = state.periodStart ? new Date(state.periodStart) : new Date();
      amount = proratedSeatPrice(add, start, new Date(state.periodEnd));
      if (amount < 1) {
        return NextResponse.json({ error: "Your month is about to renew — add seats at renewal." }, { status: 400 });
      }
      seats = add;
      label = `${add} extra seat${add === 1 ? "" : "s"}`;
    } else if (kind === "CREDITS") {
      credits = Math.floor(Number(body.credits) || 0);
      if (credits < MIN_CREDIT_RECHARGE || credits > MAX_CREDIT_RECHARGE) {
        return NextResponse.json(
          { error: `Recharge between ${MIN_CREDIT_RECHARGE} and ${MAX_CREDIT_RECHARGE} credits.` },
          { status: 400 }
        );
      }
      amount = creditPrice(credits);
      label = `${credits} WhatsApp credits`;
    } else {
      return NextResponse.json({ error: "Unknown purchase." }, { status: 400 });
    }

    const order = await razorpayClient.createOrder(amount, `${kind}-${Date.now()}`, {
      company_id: profile.company_id,
      kind,
    });

    const admin = createAdminClient();
    const { error: insErr } = await admin.from("billing_orders").insert({
      company_id: profile.company_id,
      kind,
      seats,
      credits,
      amount_inr: amount,
      razorpay_order_id: order.id,
      created_by_id: profile.id,
    });
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
