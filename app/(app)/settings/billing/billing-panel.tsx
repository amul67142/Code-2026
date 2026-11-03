"use client";

import { useState } from "react";
import Script from "next/script";
import Link from "next/link";
import { format, formatDistanceToNowStrict } from "date-fns";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  Download,
  Loader2,
  MessageCircle,
  Minus,
  Plus,
  Receipt,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { payForOrder, type PurchaseRequest } from "@/lib/billing/checkout-client";
import type { BillingState } from "@/lib/billing/state";
import {
  CREDIT_PACKS,
  EXTRA_SEAT_MONTHLY_INR,
  INCLUDED_SEATS,
  MAX_CREDIT_RECHARGE,
  MAX_SEATS,
  MIN_CREDIT_RECHARGE,
  creditPrice,
  inr,
  monthlyPrice,
  proratedSeatPrice,
} from "@/lib/billing/plans";

interface LedgerRow {
  id: string;
  delta: number;
  kind: string;
  state: string;
  note: string | null;
  created_at: string;
}
interface InvoiceRow {
  id: string;
  invoice_number: string;
  amount_inr: number;
  paid_at: string | null;
  description: string | null;
  created_at: string;
}

const PHASE_LABEL: Record<string, { text: string; tone: string }> = {
  PLATFORM: { text: "SpaceTrans workspace", tone: "bg-zinc-100 text-zinc-700" },
  TRIAL: { text: "Free trial", tone: "bg-emerald-50 text-emerald-700" },
  ACTIVE: { text: "Basic plan", tone: "bg-emerald-50 text-emerald-700" },
  GRACE: { text: "Expired — renew now", tone: "bg-red-50 text-red-700" },
};

const fmt = (iso: string | null) => (iso ? format(new Date(iso), "d MMM yyyy, h:mm a") : "—");

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

export function BillingPanel({
  state,
  credits,
  ledger,
  invoices,
  isOwner,
}: {
  state: BillingState;
  credits: number;
  ledger: LedgerRow[];
  invoices: InvoiceRow[];
  isOwner: boolean;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const minPlanSeats = Math.max(INCLUDED_SEATS, state.seatsUsed, state.phase === "ACTIVE" || state.phase === "GRACE" ? state.seats : 0);
  const [planSeats, setPlanSeats] = useState(minPlanSeats);
  const [addSeats, setAddSeats] = useState(1);
  const [creditAmount, setCreditAmount] = useState(CREDIT_PACKS[0]);

  const platform = state.isPlatform;
  const paid = state.phase === "ACTIVE";
  const seatAddPrice =
    paid && state.periodEnd
      ? proratedSeatPrice(
          addSeats,
          // Legacy rows may lack a start; a month before the end is the same
          // assumption the server makes.
          state.periodStart ? new Date(state.periodStart) : new Date(new Date(state.periodEnd).getTime() - 30 * 864e5),
          new Date(state.periodEnd)
        )
      : 0;
  const creditValid = creditAmount >= MIN_CREDIT_RECHARGE && creditAmount <= MAX_CREDIT_RECHARGE;

  async function buy(key: string, purchase: PurchaseRequest, success: string) {
    setBusy(key);
    try {
      const done = await payForOrder(purchase);
      if (!done) return toast.info("Payment window closed.");
      toast.success(success);
      // Hard reload: balances and dates are rendered on the server.
      setTimeout(() => window.location.reload(), 700);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Payment failed.", { duration: 12000 });
    } finally {
      setBusy(null);
    }
  }

  const label = PHASE_LABEL[state.phase] || PHASE_LABEL.GRACE;

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
        <p className="text-muted-foreground">Your plan, team seats and WhatsApp credits. Prices include GST.</p>
      </div>

      {!isOwner && !platform && (
        <p className="rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          Only the workspace owner can make payments. You can see the details below.
        </p>
      )}

      {/* ── Plan ── */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-lg">Plan</CardTitle>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${label.tone}`}>{label.text}</span>
          </div>
          <CardDescription>
            {platform && "This is the platform workspace. It is never billed or locked."}
            {state.phase === "TRIAL" &&
              state.trialEndsAt &&
              `Your free trial ends ${formatDistanceToNowStrict(new Date(state.trialEndsAt), { addSuffix: true })} — ${fmt(state.trialEndsAt)}. The AI agent is not included in the trial.`}
            {state.phase === "ACTIVE" && `Paid until ${fmt(state.periodEnd)}.`}
            {state.phase === "GRACE" &&
              `Your plan ended on ${fmt(state.periodEnd)}. Renew now — the dashboard locks a few days after it ends.`}
          </CardDescription>
        </CardHeader>
        {!platform && (
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4">
              <div>
                <p className="text-sm font-semibold">
                  {paid ? "Renew for another month" : state.phase === "TRIAL" ? "Buy the plan now" : "Renew your plan"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {inr(monthlyPrice(INCLUDED_SEATS))} for {INCLUDED_SEATS} seats, {inr(EXTRA_SEAT_MONTHLY_INR)} per extra
                  seat.{paid ? " Added to the end of your current month — no days lost." : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Stepper value={planSeats} min={minPlanSeats} max={MAX_SEATS} onChange={setPlanSeats} disabled={!!busy || !isOwner} />
                <Button
                  onClick={() => buy("plan", { kind: "PLAN", seats: planSeats }, "Plan paid — thank you.")}
                  disabled={!!busy || !isOwner}
                >
                  {busy === "plan" ? <Loader2 className="size-4 animate-spin" /> : `Pay ${inr(monthlyPrice(planSeats))}`}
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* ── Seats ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="size-4" /> Team seats
          </CardTitle>
          <CardDescription>
            Everyone who can log in takes a seat, including invites not yet accepted. Read-only users are free.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="mb-1.5 flex justify-between text-sm">
              <span>
                <strong>{state.seatsUsed}</strong> of {platform ? "unlimited" : state.seats} seats used
              </span>
              {!platform && state.seatsUsed >= state.seats && (
                <span className="text-xs font-medium text-amber-600">Full — add a seat to invite more</span>
              )}
            </div>
            {!platform && (
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full ${state.seatsUsed >= state.seats ? "bg-amber-500" : "bg-emerald-500"}`}
                  style={{ width: `${Math.min(100, (state.seatsUsed / Math.max(1, state.seats)) * 100)}%` }}
                />
              </div>
            )}
          </div>

          {paid && (
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4">
              <div>
                <p className="text-sm font-semibold">Add seats now</p>
                <p className="text-xs text-muted-foreground">
                  Charged for the rest of this month only. From your next renewal each seat is{" "}
                  {inr(EXTRA_SEAT_MONTHLY_INR)}/month.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Stepper value={addSeats} min={1} max={MAX_SEATS - state.seats} onChange={setAddSeats} disabled={!!busy || !isOwner} />
                <Button
                  variant="outline"
                  onClick={() =>
                    buy("seats", { kind: "SEATS", add: addSeats }, `${addSeats} seat${addSeats === 1 ? "" : "s"} added.`)
                  }
                  disabled={!!busy || !isOwner || seatAddPrice < 1}
                >
                  {busy === "seats" ? <Loader2 className="size-4 animate-spin" /> : `Pay ${inr(seatAddPrice)}`}
                </Button>
              </div>
            </div>
          )}
          {state.phase === "TRIAL" && (
            <p className="text-xs text-muted-foreground">
              The trial includes {state.seats} seats. Need more? Choose the seat count when you buy the plan above.
            </p>
          )}
        </CardContent>
      </Card>

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
                <span className="text-sm text-muted-foreground">credits</span>
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
                    Between {MIN_CREDIT_RECHARGE.toLocaleString("en-IN")} and {MAX_CREDIT_RECHARGE.toLocaleString("en-IN")} credits.
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

              {ledger.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-semibold">Recent activity</p>
                  <div className="divide-y rounded-lg border text-sm">
                    {ledger.map((row) => (
                      <div key={row.id} className="flex items-center justify-between gap-3 px-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate">{row.note || row.kind}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(row.created_at), "d MMM, h:mm a")}
                            {row.state === "HELD" && " · waiting for delivery"}
                            {row.state === "REFUNDED" && " · not delivered, refunded"}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 font-mono tabular-nums ${
                            row.state === "REFUNDED"
                              ? "text-muted-foreground line-through"
                              : row.delta > 0
                                ? "text-emerald-600"
                                : ""
                          }`}
                        >
                          {row.delta > 0 ? `+${row.delta}` : row.delta}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
