"use client";

import { useState } from "react";
import Script from "next/script";
import Link from "next/link";
import { format, formatDistanceToNowStrict } from "date-fns";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Download,
  Loader2,
  MessageCircle,
  Minus,
  Plus,
  Receipt,
  Ticket,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { purchaseOrder, type PurchaseRequest } from "@/lib/billing/checkout-client";
import type { BillingState } from "@/lib/billing/state";
import {
  CREDIT_PACKS,
  MAX_CREDIT_RECHARGE,
  MAX_SEATS,
  MIN_CREDIT_RECHARGE,
  billableSeats,
  coveredSeats,
  creditPrice,
  inr,
  planMonthly,
  proratedSeatPrice,
  seatsMonthly,
} from "@/lib/billing/plans";
import { applyBillingPromo, toggleSeatPromo } from "./actions";

interface InvoiceRow {
  id: string;
  invoice_number: string;
  amount_inr: number;
  paid_at: string | null;
  description: string | null;
  created_at: string;
}

const day = (iso: string | null) => (iso ? format(new Date(iso), "d MMM yyyy") : "—");
const future = (iso: string | null) => !!iso && new Date(iso).getTime() > Date.now();

function Stepper({
  value,
  min,
  max,
  onChange,
  disabled,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        aria-label="Decrease"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={disabled || value <= min}
        className="flex size-8 items-center justify-center rounded-lg border hover:bg-muted disabled:opacity-40"
      >
        <Minus className="size-3.5" />
      </button>
      <span className="w-8 text-center font-semibold tabular-nums">{value}</span>
      <button
        aria-label="Increase"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={disabled || value >= max}
        className="flex size-8 items-center justify-center rounded-lg border hover:bg-muted disabled:opacity-40"
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}

/** Small coloured status pill. */
function Pill({ tone, children }: { tone: "green" | "amber" | "red" | "zinc"; children: React.ReactNode }) {
  const tones = {
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
    zinc: "bg-zinc-100 text-zinc-700",
  };
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

export function BillingPanel({
  state,
  credits,
  invoices,
  isOwner,
  firstMonth,
}: {
  state: BillingState;
  credits: number;
  invoices: InvoiceRow[];
  isOwner: boolean;
  firstMonth: { code: string; label: string; discount: number } | null;
}) {
  const p = state.pricing;
  const covered = coveredSeats(p);
  const platform = state.isPlatform;
  const onTrial = state.phase === "TRIAL";
  const platformPaid = state.platformPaid;
  const seatMonthRunning = future(state.seatsPeriodEnd);

  const [busy, setBusy] = useState<string | null>(null);
  // Pay-both (trial / not yet paid): seats chosen here.
  const [planSeats, setPlanSeats] = useState(Math.max(covered, state.seatsUsed, state.seats));
  // Seat month on a paid plan.
  const [monthSeats, setMonthSeats] = useState(Math.max(state.seatsUsed, state.seats, 1));
  const [addSeats, setAddSeats] = useState(1);
  const [creditAmount, setCreditAmount] = useState(CREDIT_PACKS[0]);
  const [promo, setPromo] = useState("");

  const discount = firstMonth?.discount ?? 0;
  const platformDue = p.platformFee - discount;
  const billable = billableSeats(p, state.seats);
  const monthly = planMonthly(p, state.seats);
  const overLimit = !platform && state.seatsUsed > state.seats;
  const creditValid = creditAmount >= MIN_CREDIT_RECHARGE && creditAmount <= MAX_CREDIT_RECHARGE;

  const newlyBillable = billableSeats(p, state.seats + addSeats) - billable;
  const addPrice =
    seatMonthRunning && newlyBillable > 0
      ? proratedSeatPrice(
          newlyBillable,
          state.seatsPeriodStart
            ? new Date(state.seatsPeriodStart)
            : new Date(new Date(state.seatsPeriodEnd!).getTime() - 30 * 864e5),
          new Date(state.seatsPeriodEnd!),
          new Date(),
          p.seatPrice
        )
      : 0;

  async function buy(key: string, purchase: PurchaseRequest, success: string) {
    setBusy(key);
    try {
      const out = await purchaseOrder(purchase);
      if (!out.done) return toast.info("Payment window closed.");
      toast.success(out.free || success);
      // Hard reload: balances and dates are rendered on the server.
      setTimeout(() => window.location.reload(), 700);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Payment failed.", { duration: 12000 });
    } finally {
      setBusy(null);
    }
  }

  async function applyPromo() {
    if (!promo.trim()) return;
    setBusy("promo");
    try {
      const res = await applyBillingPromo(promo);
      if ("error" in res && res.error) return toast.error(res.error);
      toast.success(("message" in res && res.message) || "Code applied.");
      setTimeout(() => window.location.reload(), 700);
    } finally {
      setBusy(null);
    }
  }

  // ── Plan headline ──
  const planName = platform ? "SpaceTrans workspace" : onTrial ? "Free trial" : p.custom ? "Custom plan" : "Basic plan";
  const status: { tone: "green" | "amber" | "red" | "zinc"; text: string } = platform
    ? { tone: "zinc", text: "Never billed" }
    : onTrial
      ? { tone: "green", text: `Ends ${formatDistanceToNowStrict(new Date(state.trialEndsAt!), { addSuffix: true })}` }
      : state.phase === "ACTIVE" && !state.seatsInGrace && !overLimit
        ? { tone: "green", text: "Active" }
        : state.phase === "ACTIVE" || state.phase === "GRACE"
          ? { tone: "amber", text: "Payment due" }
          : { tone: "red", text: "Locked" };

  const coveredText =
    p.freeSeats > p.includedSeats
      ? `${covered} free${p.freeSeatsCode ? ` (promo ${p.freeSeatsCode})` : ""}`
      : `${p.includedSeats} included`;

  // The seat promo line: what it saves. Remove switches it off for real (the
  // pay buttons then charge every seat); Apply again switches it back on.
  const hasSeatPromo = p.promoSeats > p.includedSeats;
  const promoOn = hasSeatPromo && !p.seatPromoPaused;
  const noPromo = { ...p, freeSeats: 0 };
  const withPromo = { ...p, freeSeats: p.promoSeats };
  const seatSaving = seatsMonthly(noPromo, state.seats) - seatsMonthly(withPromo, state.seats);

  async function switchSeatPromo(active: boolean) {
    setBusy("seatpromo");
    try {
      const res = await toggleSeatPromo(active);
      if ("error" in res && res.error) return toast.error(res.error);
      toast.success(active ? "Seat promo applied again." : "Seat promo removed — full seat price from your next payment.");
      setTimeout(() => window.location.reload(), 600);
    } finally {
      setBusy(null);
    }
  }

  const platformStatus = onTrial
    ? `Trial until ${day(state.trialEndsAt)}`
    : state.phase === "ACTIVE"
      ? `Paid until ${day(state.periodEnd)}`
      : state.phase === "GRACE"
        ? `Expired ${day(state.periodEnd)}`
        : "Not paid";
  const seatStatus =
    billable === 0
      ? "No charge"
      : seatMonthRunning
        ? `Paid until ${day(state.seatsPeriodEnd)}`
        : state.seatsPeriodEnd
          ? `Expired ${day(state.seatsPeriodEnd)}`
          : onTrial
            ? "Included in trial"
            : "Not paid";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      <div>
        <Link
          href="/settings"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Settings
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
        <p className="text-muted-foreground">Your plan, what you pay each month, and your invoices.</p>
      </div>

      {!isOwner && !platform && (
        <p className="rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          Only the workspace owner can make payments. You can see the details below.
        </p>
      )}

      {/* ── Your plan ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardDescription>Your plan</CardDescription>
              <CardTitle className="text-xl">{planName}</CardTitle>
            </div>
            <Pill tone={status.tone}>{status.text}</Pill>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {platform ? (
            <p className="text-sm text-muted-foreground">This is the platform workspace. It is never billed or locked.</p>
          ) : (
            <>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black tabular-nums">{inr(monthly)}</span>
                <span className="text-sm text-muted-foreground">
                  per month{onTrial ? " after the trial" : ""}
                  {p.seatPromoPaused ? " without your seat promo" : ""}
                </span>
                {promoOn && seatSaving > 0 && (
                  <span className="ml-1 text-sm text-muted-foreground line-through tabular-nums">{inr(monthly + seatSaving)}</span>
                )}
              </div>

              <div className="divide-y rounded-xl border text-sm">
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="font-medium">Platform fee</p>
                    <p className="text-xs text-muted-foreground">{platformStatus}</p>
                  </div>
                  <span className="shrink-0 font-semibold tabular-nums">{inr(p.platformFee)}</span>
                </div>
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="font-medium">Team seats</p>
                    <p className="text-xs text-muted-foreground">
                      {state.seats} seat{state.seats === 1 ? "" : "s"} · {coveredText}
                      {billable > 0 && ` · ${billable} × ${inr(p.seatPrice)}`} · {seatStatus}
                    </p>
                  </div>
                  <span className="shrink-0 text-right tabular-nums">
                    {promoOn && seatSaving > 0 && (
                      <span className="mr-1.5 text-xs text-muted-foreground line-through">
                        {inr(seatsMonthly(noPromo, state.seats))}
                      </span>
                    )}
                    <span className="font-semibold">{inr(seatsMonthly(p, state.seats))}</span>
                  </span>
                </div>
                {hasSeatPromo &&
                  (promoOn ? (
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 bg-emerald-50/60 px-4 py-3 text-emerald-800">
                      <div className="min-w-0">
                        <p className="font-medium">
                          Seat promo applied{p.freeSeatsCode ? ` (${p.freeSeatsCode})` : ""}: first {p.promoSeats} seats free
                        </p>
                        <p className="text-xs">
                          {seatSaving > 0
                            ? `You save ${inr(seatSaving)} a month on your ${state.seats} seats.`
                            : `Covers up to ${p.promoSeats} seats. Seats after that are ${inr(p.seatPrice)} each.`}
                        </p>
                      </div>
                      <button
                        onClick={() => switchSeatPromo(false)}
                        disabled={!!busy || !isOwner}
                        className="shrink-0 rounded-md border border-emerald-300 bg-white px-2.5 py-1 text-xs font-medium hover:bg-emerald-50 disabled:opacity-50"
                      >
                        {busy === "seatpromo" ? <Loader2 className="size-3.5 animate-spin" /> : "Remove"}
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 bg-muted/40 px-4 py-3">
                      <div className="min-w-0">
                        <p className="font-medium">
                          Seat promo removed{p.freeSeatsCode ? ` (${p.freeSeatsCode})` : ""} — you pay the full seat price
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {seatSaving > 0
                            ? `Apply it again to save ${inr(seatSaving)} a month: your first ${p.promoSeats} seats free.`
                            : `Apply it again to make your first ${p.promoSeats} seats free.`}
                        </p>
                      </div>
                      <button
                        onClick={() => switchSeatPromo(true)}
                        disabled={!!busy || !isOwner}
                        className="shrink-0 rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {busy === "seatpromo" ? <Loader2 className="size-3.5 animate-spin" /> : "Apply again"}
                      </button>
                    </div>
                  ))}
                {firstMonth && (
                  <div className="flex items-center justify-between gap-3 bg-emerald-50/60 px-4 py-3 text-emerald-800">
                    <p className="min-w-0">
                      First month: {firstMonth.label} the platform fee{" "}
                      <span className="font-mono text-xs">({firstMonth.code})</span>
                    </p>
                    <span className="shrink-0 font-semibold tabular-nums">−{inr(firstMonth.discount)}</span>
                  </div>
                )}
              </div>

              {state.seatsLapsed && (
                <p className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  Seat charges are unpaid. Pay for your seats below to unlock the dashboard.
                </p>
              )}
              {overLimit && (
                <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  {state.seatsUsed} people use a seat, but {state.seats} are paid for. Pay for {state.seatsUsed} seats
                  below so you can keep adding agents.
                </p>
              )}

              {/* Not on a paid plan yet: pay both in one go. */}
              {!platformPaid && (
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-muted/30 p-4">
                  <div>
                    <p className="text-sm font-semibold">{onTrial ? "Start your plan" : "Pay to unlock"}</p>
                    <p className="text-xs text-muted-foreground">
                      Platform fee {discount > 0 ? `${inr(platformDue)} (after promo)` : inr(p.platformFee)} +{" "}
                      {billableSeats(p, planSeats)} charged seat{billableSeats(p, planSeats) === 1 ? "" : "s"} ×{" "}
                      {inr(p.seatPrice)}, for one month.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Stepper
                      value={planSeats}
                      min={Math.max(covered, state.seatsUsed)}
                      max={MAX_SEATS}
                      onChange={setPlanSeats}
                      disabled={!!busy || !isOwner}
                    />
                    <Button
                      onClick={() => buy("plan", { kind: "PLAN", seats: planSeats }, "Plan paid — thank you.")}
                      disabled={!!busy || !isOwner}
                    >
                      {busy === "plan" ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        `Pay ${inr(platformDue + seatsMonthly(p, planSeats))}`
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Pay separately: platform fee and seats ── */}
      {!platform && platformPaid && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="size-4" /> Platform fee
              </CardTitle>
              <CardDescription>{platformStatus}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-baseline gap-1.5">
                {discount > 0 && (
                  <span className="text-sm text-muted-foreground line-through">{inr(p.platformFee)}</span>
                )}
                <span className="text-2xl font-bold tabular-nums">{inr(platformDue)}</span>
                <span className="text-sm text-muted-foreground">/ month</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {future(state.periodEnd)
                  ? `Paying now adds a month after ${day(state.periodEnd)} — no days lost.`
                  : "Your next month starts the day you pay."}
              </p>
              <Button
                className="w-full"
                onClick={() => buy("platform", { kind: "PLATFORM" }, "Platform fee paid — thank you.")}
                disabled={!!busy || !isOwner}
              >
                {busy === "platform" ? <Loader2 className="size-4 animate-spin" /> : `Pay ${inr(platformDue)}`}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="size-4" /> Team seats
              </CardTitle>
              <CardDescription>{seatStatus}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span>
                    <strong>{state.seatsUsed}</strong> of {state.seats} seats used
                  </span>
                  <span className="text-xs text-muted-foreground">{coveredText}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full ${state.seatsUsed >= state.seats ? "bg-amber-500" : "bg-emerald-500"}`}
                    style={{ width: `${Math.min(100, (state.seatsUsed / Math.max(1, state.seats)) * 100)}%` }}
                  />
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Everyone who can log in takes a seat, including invites not yet accepted. Read-only users are free.
                </p>
              </div>

              <div className="space-y-2 rounded-xl border p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">{seatMonthRunning ? "Next month's seats" : "Seats for a month"}</p>
                  <Stepper
                    value={monthSeats}
                    min={Math.max(1, state.seatsUsed)}
                    max={MAX_SEATS}
                    onChange={setMonthSeats}
                    disabled={!!busy || !isOwner}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {billableSeats(p, monthSeats) === 0
                    ? `All ${monthSeats} are covered by your plan — no charge.`
                    : `${billableSeats(p, monthSeats)} charged × ${inr(p.seatPrice)}${
                        seatMonthRunning ? `, added after ${day(state.seatsPeriodEnd)}` : ""
                      }.`}
                </p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() =>
                    buy("seatmonth", { kind: "SEAT_MONTH", seats: monthSeats }, "Seats paid — thank you.")
                  }
                  disabled={!!busy || !isOwner || (seatsMonthly(p, monthSeats) === 0 && monthSeats === state.seats)}
                >
                  {busy === "seatmonth" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : seatsMonthly(p, monthSeats) === 0 ? (
                    `Set ${monthSeats} seats`
                  ) : (
                    `Pay ${inr(seatsMonthly(p, monthSeats))}`
                  )}
                </Button>
              </div>

              {seatMonthRunning && (
                <div className="space-y-2 rounded-xl border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">Add seats now</p>
                    <Stepper
                      value={addSeats}
                      min={1}
                      max={Math.max(1, MAX_SEATS - state.seats)}
                      onChange={setAddSeats}
                      disabled={!!busy || !isOwner}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Charged only for the rest of this seat month (until {day(state.seatsPeriodEnd)}).
                  </p>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() =>
                      buy("seats", { kind: "SEATS", add: addSeats }, `${addSeats} seat${addSeats === 1 ? "" : "s"} added.`)
                    }
                    disabled={!!busy || !isOwner}
                  >
                    {busy === "seats" ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : addPrice > 0 ? (
                      `Pay ${inr(addPrice)}`
                    ) : (
                      `Add ${addSeats} free`
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Promo code ── */}
      {!platform && isOwner && (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-3 pt-6">
            <Ticket className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium">Have a promo code?</span>
            <div className="flex flex-1 gap-2">
              <input
                value={promo}
                onChange={(e) => setPromo(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && applyPromo()}
                placeholder="Enter code"
                aria-label="Promo code"
                className="h-9 min-w-0 flex-1 rounded-lg border bg-transparent px-3 font-mono text-sm uppercase"
                disabled={!!busy}
              />
              <Button variant="outline" onClick={applyPromo} disabled={!!busy || !promo.trim()}>
                {busy === "promo" ? <Loader2 className="size-4 animate-spin" /> : "Apply"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── WhatsApp credits ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageCircle className="size-4" /> WhatsApp credits
          </CardTitle>
          <CardDescription>
            1 credit (₹1) per delivered template message — welcomes, agent alerts, bulk sends. Live Chat replies
            and the AI agent&apos;s replies are free. A failed message is refunded.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {platform ? (
            <p className="text-sm text-muted-foreground">Not charged on the platform workspace.</p>
          ) : (
            <>
              <div className="flex items-baseline gap-2">
                <span className={`text-4xl font-black tabular-nums ${credits === 0 ? "text-red-600" : ""}`}>
                  {credits.toLocaleString("en-IN")}
                </span>
                <span className="text-sm text-muted-foreground">credits left</span>
              </div>
              {credits === 0 && (
                <p className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  WhatsApp messages are paused. Recharge at least {MIN_CREDIT_RECHARGE} credits to start sending.
                </p>
              )}

              <div className="rounded-xl border p-4">
                <p className="mb-2 text-sm font-semibold">Recharge</p>
                <div className="flex flex-wrap gap-2">
                  {CREDIT_PACKS.map((n) => (
                    <button
                      key={n}
                      onClick={() => setCreditAmount(n)}
                      className={`rounded-lg border px-3 py-1.5 text-sm ${
                        creditAmount === n ? "border-primary bg-primary/5 font-semibold" : "hover:bg-muted"
                      }`}
                    >
                      {n.toLocaleString("en-IN")}
                    </button>
                  ))}
                  <input
                    type="number"
                    inputMode="numeric"
                    min={MIN_CREDIT_RECHARGE}
                    max={MAX_CREDIT_RECHARGE}
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(Math.floor(Number(e.target.value) || 0))}
                    aria-label="Credits to buy"
                    className="h-9 w-28 rounded-lg border bg-transparent px-2 text-sm"
                  />
                </div>
                {!creditValid && (
                  <p className="mt-2 text-xs text-red-600">
                    Between {MIN_CREDIT_RECHARGE.toLocaleString("en-IN")} and{" "}
                    {MAX_CREDIT_RECHARGE.toLocaleString("en-IN")} credits.
                  </p>
                )}
                <Button
                  className="mt-3"
                  onClick={() =>
                    buy("credits", { kind: "CREDITS", credits: creditAmount }, `${creditAmount} credits added.`)
                  }
                  disabled={!!busy || !isOwner || !creditValid}
                >
                  {busy === "credits" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    `Pay ${inr(creditPrice(creditValid ? creditAmount : MIN_CREDIT_RECHARGE))}`
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Invoices ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Receipt className="size-4" /> Invoices
          </CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments yet.</p>
          ) : (
            <div className="divide-y rounded-lg border text-sm">
              {invoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{inv.description || "Subscription"}</p>
                    <p className="text-xs text-muted-foreground">
                      {inv.invoice_number} · {format(new Date(inv.paid_at || inv.created_at), "d MMM yyyy")}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="font-semibold tabular-nums">{inr(inv.amount_inr)}</span>
                    <a
                      href={`/api/billing/invoice/${inv.id}`}
                      target="_blank"
                      rel="noopener"
                      className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label={`Download invoice ${inv.invoice_number}`}
                    >
                      <Download className="size-4" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
