"use client";

import { useState } from "react";
import Script from "next/script";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  AlertTriangle,
  Check,
  Gift,
  Loader2,
  LogOut,
  Minus,
  Plus,
  ShieldCheck,
  Ticket,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { redeemPromoCode, startFreeTrial } from "./actions";
import { payForOrder } from "@/lib/billing/checkout-client";
import {
  BASIC_MONTHLY_INR,
  EXTRA_SEAT_MONTHLY_INR,
  INCLUDED_SEATS,
  MAX_SEATS,
  MIN_CREDIT_RECHARGE,
  TRIAL_DAYS,
  TRIAL_FREE_CREDITS,
  inr,
  monthlyPrice,
} from "@/lib/billing/plans";

interface Props {
  userEmail: string;
  /** From getBillingState: NONE | TRIAL_ENDED | LOCKED. */
  phase: string;
  trialAvailable: boolean;
  seatsUsed: number;
  /** Leads that arrived while the workspace was locked. */
  waitingLeads: number;
}

const TRIAL_INCLUDES = [
  "Facebook, website & portal lead integrations",
  "Lead routing, pipeline & reports",
  `${TRIAL_FREE_CREDITS} free WhatsApp credits`,
  `${INCLUDED_SEATS} team seats`,
];

const BASIC_INCLUDES = [
  "Everything in the trial",
  "AI WhatsApp agent",
  `${INCLUDED_SEATS} seats included, ${inr(EXTRA_SEAT_MONTHLY_INR)}/month per extra seat`,
  "WhatsApp credits: ₹1 per delivered template",
];

export function SelectPlanClient({ userEmail, phase, trialAvailable, seatsUsed, waitingLeads }: Props) {
  const minSeats = Math.max(INCLUDED_SEATS, seatsUsed);
  const [seats, setSeats] = useState(minSeats);
  const [paying, setPaying] = useState(false);
  const [startingTrial, setStartingTrial] = useState(false);
  const [promo, setPromo] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);

  const locked = phase === "TRIAL_ENDED" || phase === "LOCKED";
  const price = monthlyPrice(seats);
  const extra = Math.max(0, seats - INCLUDED_SEATS);

  async function handleTrial() {
    setStartingTrial(true);
    try {
      const res = await startFreeTrial();
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(`Your ${TRIAL_DAYS}-day free trial has started.`);
      // Hard navigation: the client router cache still thinks we are locked.
      setTimeout(() => (window.location.href = "/onboarding"), 600);
    } finally {
      setStartingTrial(false);
    }
  }

  async function handlePay() {
    setPaying(true);
    try {
      const done = await payForOrder({ kind: "PLAN", seats });
      if (!done) {
        toast.info("Payment window closed.");
        return;
      }
      toast.success("Payment received — your workspace is active.");
      setTimeout(() => (window.location.href = "/dashboard"), 600);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Payment failed.", { duration: 12000 });
    } finally {
      setPaying(false);
    }
  }

  async function handleRedeemPromo() {
    if (!promo.trim()) return toast.error("Enter a promo code");
    setPromoLoading(true);
    try {
      const res = await redeemPromoCode(promo);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(`${res.planName} unlocked for ${res.days} days`);
      setTimeout(() => (window.location.href = "/dashboard"), 700);
    } finally {
      setPromoLoading(false);
    }
  }

  async function handleLogout() {
    await createClient().auth.signOut();
    window.location.href = "/login";
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-10">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 pb-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://res.cloudinary.com/dy2zpgv6q/image/upload/v1779118448/Gemini_Generated_Image_2kpsnp2kpsnp2kps_1_-Photoroom_ddqkxb.png"
          alt="BigLead"
          className="h-10 w-auto object-contain"
        />
        <div className="flex items-center gap-4">
          <span className="hidden text-xs text-zinc-500 sm:inline">
            Signed in as: <strong className="text-zinc-700">{userEmail}</strong>
          </span>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-600 transition-colors hover:bg-zinc-50"
          >
            <LogOut className="size-3.5" /> Sign Out
          </button>
        </div>
      </div>

      {/* Lock notice */}
      {locked && (
        <div className="mx-auto flex w-full max-w-3xl items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-red-600" />
          <div>
            <p className="text-sm font-bold text-red-700">
              {phase === "TRIAL_ENDED"
                ? "Your free trial has ended — your workspace is locked."
                : "Your plan has expired — your workspace is locked."}
            </p>
            <p className="mt-0.5 text-xs text-red-600">
              {waitingLeads > 0
                ? `${waitingLeads} new lead${waitingLeads === 1 ? " has" : "s have"} arrived since then and ${waitingLeads === 1 ? "is" : "are"} waiting for you. `
                : ""}
              Your data is safe and leads are still being saved. Pay below to unlock everything for your team.
            </p>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-3xl space-y-3 text-center">
        <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-zinc-900 sm:text-4xl">
          {locked ? "Unlock your workspace" : "Start capturing every lead"}
        </h1>
        <p className="text-base text-zinc-500">
          {trialAvailable && !locked
            ? `Try BigLead free for ${TRIAL_DAYS} days — no card needed. Or go straight to the full plan.`
            : "One plan, priced by team size. GST included."}
        </p>
      </div>

      <div className={`grid gap-6 ${trialAvailable && !locked ? "md:grid-cols-2" : "mx-auto max-w-lg"}`}>
        {/* Trial */}
        {trialAvailable && !locked && (
          <div className="flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
            <div>
              <h3 className="flex items-center gap-2 text-xl font-bold text-zinc-900">
                <Gift className="size-5 text-emerald-600" /> Free trial
              </h3>
              <p className="mt-1 text-xs text-zinc-500">{TRIAL_DAYS} days, no payment details.</p>
              <div className="my-6 flex items-baseline gap-1">
                <span className="text-4xl font-black text-zinc-900">₹0</span>
                <span className="text-sm text-zinc-500">for {TRIAL_DAYS} days</span>
              </div>
              <ul className="space-y-2.5 text-sm">
                {TRIAL_INCLUDES.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-zinc-700">
                    <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" /> {f}
                  </li>
                ))}
                <li className="flex items-start gap-2 text-zinc-400">
                  <X className="mt-0.5 size-4 shrink-0" /> AI WhatsApp agent
                </li>
              </ul>
              <p className="mt-4 text-[11px] leading-relaxed text-zinc-400">
                Includes {TRIAL_FREE_CREDITS} WhatsApp credits (1 per delivered template); top up any time from{" "}
                {MIN_CREDIT_RECHARGE} credits. When the trial ends the dashboard locks until you pay; leads keep being
                saved.
              </p>
            </div>
            <Button
              onClick={handleTrial}
              disabled={startingTrial || paying}
              variant="outline"
              className="mt-8 h-11 w-full font-bold"
            >
              {startingTrial ? <Loader2 className="size-4 animate-spin" /> : `Start ${TRIAL_DAYS}-day free trial`}
            </Button>
          </div>
        )}

        {/* Basic */}
        <div className="flex flex-col justify-between rounded-2xl border border-zinc-900 bg-white p-8 shadow-sm ring-1 ring-zinc-900">
          <div>
            <h3 className="text-xl font-bold text-zinc-900">Basic</h3>
            <p className="mt-1 text-xs text-zinc-500">
              {inr(BASIC_MONTHLY_INR)}/month for {INCLUDED_SEATS} seats. GST included.
            </p>

            <div className="my-6">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-zinc-900">{inr(price)}</span>
                <span className="text-sm text-zinc-500">/month</span>
              </div>
              {extra > 0 && (
                <p className="mt-1 text-xs text-zinc-500">
                  {inr(BASIC_MONTHLY_INR)} + {extra} extra seat{extra === 1 ? "" : "s"} × {inr(EXTRA_SEAT_MONTHLY_INR)}
                </p>
              )}
            </div>

            {/* Seats */}
            <div className="mb-6 flex items-center justify-between rounded-xl border border-zinc-200 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-zinc-900">Team seats</p>
                <p className="text-[11px] text-zinc-500">
                  {seatsUsed > INCLUDED_SEATS
                    ? `You have ${seatsUsed} people already`
                    : "Everyone who logs in, except read-only"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  aria-label="One fewer seat"
                  onClick={() => setSeats((s) => Math.max(minSeats, s - 1))}
                  disabled={seats <= minSeats || paying}
                  className="flex size-8 items-center justify-center rounded-lg border border-zinc-200 hover:bg-zinc-50 disabled:opacity-40"
                >
                  <Minus className="size-3.5" />
                </button>
                <span className="w-8 text-center text-base font-bold tabular-nums">{seats}</span>
                <button
                  aria-label="One more seat"
                  onClick={() => setSeats((s) => Math.min(MAX_SEATS, s + 1))}
                  disabled={seats >= MAX_SEATS || paying}
                  className="flex size-8 items-center justify-center rounded-lg border border-zinc-200 hover:bg-zinc-50 disabled:opacity-40"
                >
                  <Plus className="size-3.5" />
                </button>
              </div>
            </div>

            <ul className="space-y-2.5 text-sm">
              {BASIC_INCLUDES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-zinc-700">
                  <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" /> {f}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-8 space-y-2">
            <Button
              onClick={handlePay}
              disabled={paying || startingTrial}
              className="h-11 w-full bg-zinc-900 font-bold text-white hover:bg-zinc-800"
            >
              {paying ? <Loader2 className="size-4 animate-spin" /> : `Pay ${inr(price)} for 1 month`}
            </Button>
            <p className="flex items-center justify-center gap-1 text-[11px] text-zinc-400">
              <ShieldCheck className="size-3" /> Secured by Razorpay · UPI, cards, netbanking
            </p>
            <p className="text-center text-[11px] text-zinc-400">
              Paid monthly. We remind you on WhatsApp and email before each renewal.
            </p>
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-zinc-500">
        Need more than {MAX_SEATS} seats or custom integrations?{" "}
        <Link href="/contact" className="font-semibold text-zinc-900 underline">
          Talk to us
        </Link>
      </p>

      {/* Promo code */}
      <div className="mx-auto w-full max-w-md">
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-4">
          <p className="mb-2.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400">
            <Ticket className="size-3.5" /> Have a promo code?
          </p>
          <div className="flex gap-2">
            <input
              value={promo}
              onChange={(e) => setPromo(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleRedeemPromo()}
              placeholder="e.g. INVESTOR2026"
              className="h-10 flex-1 rounded-lg border border-zinc-200 px-3 font-mono text-sm uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-zinc-900"
              disabled={promoLoading}
            />
            <Button
              onClick={handleRedeemPromo}
              disabled={promoLoading || !promo.trim()}
              className="h-10 bg-zinc-900 px-5 text-xs font-bold text-white hover:bg-zinc-800"
            >
              {promoLoading ? <Loader2 className="size-4 animate-spin" /> : "Apply"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
