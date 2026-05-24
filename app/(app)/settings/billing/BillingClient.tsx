"use client";

import { useEffect, useState, useTransition, useCallback } from "react";
import Script from "next/script";
import { cancelSubscriptionAction } from "./actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
  CreditCard, 
  Check, 
  Sparkles, 
  Calendar, 
  ShieldCheck,
  XCircle,
  Clock,
  Loader2,
  Receipt,
  Download,
  X,
  ArrowRight
} from "lucide-react";

interface PlanFeature {
  text: string;
  included: boolean;
}

interface PricingPlan {
  id: string;
  name: string;
  description: string;
  price_inr: number;
  priceINR: string;
  priceUSD: string;
  period: string;
  is_popular: boolean;
  is_custom_price: boolean;
  cta_text: string;
  features: PlanFeature[];
}

interface BillingStatus {
  company: {
    id: string;
    name: string;
    legacyPlan: string;
    status: "TRIAL" | "ACTIVE" | "PAUSED" | "CANCELLED";
    billingEmail: string | null;
  };
  subscription: {
    id: string;
    status: "ACTIVE" | "PAST_DUE" | "CANCELLED" | "TRIALING";
    razorpay_sub_id: string;
    current_period_start: string | null;
    current_period_end: string | null;
    cancelled_at?: string | null;
    amount_inr: number;
    plan_id: string;
    pricing_plans: {
      id: string;
      name: string;
      description: string;
      price_inr: number;
    } | null;
  } | null;
  trial: {
    endsAt: string | null;
    isActive: boolean;
    daysRemaining: number;
  };
  invoices: Array<{
    id: string;
    invoice_number: string;
    amount_inr: number;
    status: string;
    paid_at: string;
    billing_period_start: string;
    billing_period_end: string;
  }>;
}

export function BillingClient() {
  const [loading, setLoading] = useState(true);
  const [checkoutLoadingId, setCheckoutLoadingId] = useState<string | null>(null);
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [isPending, startTransition] = useTransition();
  const [activationState, setActivationState] = useState<"idle" | "verifying" | "success" | "pending">("idle");
  const [polledCount, setPolledCount] = useState(0);
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);
  const [checkoutData, setCheckoutData] = useState<{
    subscriptionId: string;
    razorpayKeyId: string;
    customer: { name: string; email: string; phone: string };
  } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const handleCloseActivation = () => {
    setActivationState("idle");
    const url = new URL(window.location.href);
    url.search = "";
    window.history.replaceState({}, document.title, url.pathname);
  };

  const startActivationPolling = useCallback(() => {
    setActivationState("verifying");
    let count = 0;
    const interval = setInterval(async () => {
      count++;
      setPolledCount(count);
      try {
        const res = await fetch("/api/billing/status");
        const statusData = await res.json();
        if (statusData && !statusData.error) {
          setStatus(statusData);
          if (statusData.subscription?.status === "ACTIVE" || statusData.company?.status === "ACTIVE") {
            clearInterval(interval);
            setActivationState("success");
            toast.success("🎉 Plan activated successfully! Now you can access all features!");
            return;
          }
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
      if (count >= 6) {
        clearInterval(interval);
        setActivationState("pending");
      }
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const fetchBillingData = async () => {
    try {
      const [statusRes, plansRes] = await Promise.all([
        fetch("/api/billing/status"),
        fetch("/api/pricing")
      ]);

      const statusData = await statusRes.json();
      const plansData = await plansRes.json();

      if (statusData.error) throw new Error(statusData.error);
      if (plansData.error) throw new Error(plansData.error);

      setStatus(statusData);
      setPlans(plansData);
    } catch (err: any) {
      console.error("Failed to load billing context:", err);
      toast.error(err.message || "Failed to load billing metrics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingData();

    // Check if returning from a Razorpay redirect
    const params = new URLSearchParams(window.location.search);
    const hasRazorpay = params.get("razorpay_subscription_id") || params.get("razorpay_payment_id");
    const hasSession = params.get("session_id");

    if (hasRazorpay || hasSession) {
      startActivationPolling();
    }
  }, [startActivationPolling]);

  // Step 1: User clicks upgrade → opens confirmation modal
  const handleCheckout = (plan: PricingPlan) => {
    setSelectedPlan(plan);
    setCheckoutData(null);
    setConfirmLoading(false);
  };

  // Step 2: User confirms → create subscription on backend + open Razorpay popup
  const handleProceedToPay = async () => {
    if (!selectedPlan) return;
    setConfirmLoading(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: selectedPlan.id })
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to initiate payment session.");
      }

      // Open Razorpay inline checkout popup
      const win = window as any;
      if (!win.Razorpay) {
        throw new Error("Razorpay SDK not loaded. Please refresh and try again.");
      }

      const options = {
        key: data.razorpayKeyId,
        subscription_id: data.subscriptionId,
        name: "BigLead CRM",
        description: `${selectedPlan.name} Plan — Monthly Subscription`,
        prefill: {
          name: data.customer.name,
          email: data.customer.email,
          contact: data.customer.phone,
        },
        theme: {
          color: "#09090b",
          backdrop_color: "rgba(0,0,0,0.6)",
        },
        modal: {
          ondismiss: () => {
            toast.info("Payment window closed. You can retry anytime.");
            setConfirmLoading(false);
          },
        },
        handler: () => {
          // Payment succeeded — close modal and start polling
          setSelectedPlan(null);
          setCheckoutData(null);
          setConfirmLoading(false);
          startActivationPolling();
        },
      };

      const rzp = new win.Razorpay(options);
      rzp.on("payment.failed", (response: any) => {
        console.error("Payment failed:", response.error);
        toast.error(response.error?.description || "Payment failed. Please try again.");
        setConfirmLoading(false);
      });
      rzp.open();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "An unexpected error occurred.");
      setConfirmLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!status?.subscription?.razorpay_sub_id) return;
    
    const periodEnd = status.subscription.current_period_end 
      ? new Date(status.subscription.current_period_end).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
      : "the end of the current billing cycle";

    if (!confirm(`Are you sure you want to cancel your subscription?\n\nYou will retain full dashboard access until ${periodEnd}. After that, your workspace will be locked.`)) {
      return;
    }

    startTransition(async () => {
      const res = await cancelSubscriptionAction(status.subscription!.razorpay_sub_id);
      if (res.success) {
        toast.success(`Subscription cancelled. You have full access until ${periodEnd}.`);
        fetchBillingData();
      } else {
        toast.error(res.error || "Failed to process cancellation.");
      }
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="size-8 text-zinc-900 animate-spin" />
        <p className="text-sm text-zinc-500 font-medium">Retrieving billing status & pricing details...</p>
      </div>
    );
  }

  const activeSub = status?.subscription;
  const isTrialActive = status?.trial.isActive;
  const daysRemaining = status?.trial.daysRemaining || 0;

  return (
    <div className="space-y-8 max-w-6xl relative">
      {/* Dynamic Billing activation overlay */}
      {activationState !== "idle" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all duration-300 animate-in fade-in">
          <div className="w-full max-w-md p-6 mx-4 rounded-2xl bg-white border border-zinc-200 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Sparkles background styling */}
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Sparkles className="size-32 text-indigo-600 animate-pulse" />
            </div>

            {activationState === "verifying" && (
              <div className="flex flex-col items-center text-center space-y-4 py-4">
                <div className="relative">
                  <div className="size-16 rounded-full bg-indigo-50 flex items-center justify-center border border-indigo-100">
                    <Loader2 className="size-8 text-indigo-600 animate-spin" />
                  </div>
                  <div className="absolute -top-1 -right-1 bg-amber-500 text-white rounded-full p-1 border border-white">
                    <Sparkles className="size-3" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-zinc-900">Activating Premium Workspace</h3>
                  <p className="text-sm text-zinc-500 max-w-xs">
                    We are verifying your mandate and setting up your workspace credentials. This will only take a moment...
                  </p>
                </div>
                <div className="w-full bg-zinc-100 h-1.5 rounded-full overflow-hidden mt-2">
                  <div 
                    className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, (polledCount / 6) * 100)}%` }} 
                  />
                </div>
                <p className="text-[10px] text-zinc-400 font-medium">Securing payment connection (Attempt {polledCount}/6)</p>
              </div>
            )}

            {activationState === "success" && (
              <div className="flex flex-col items-center text-center space-y-4 py-4">
                <div className="size-16 rounded-full bg-emerald-50 flex items-center justify-center border border-emerald-100 relative animate-bounce">
                  <Check className="size-8 text-emerald-600" />
                  {/* Small floating sparkles */}
                  <span className="absolute -top-1 -right-1 text-emerald-500 animate-ping">✨</span>
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-extrabold text-zinc-900 tracking-tight">🎉 Subscription Activated!</h3>
                  <p className="text-sm text-zinc-600 font-medium max-w-xs">
                    Your mandate is complete. You now have full premium access to all lead intelligence, auto-dialers, pipelines, and integrations.
                  </p>
                  <p className="text-xs text-indigo-600 font-semibold bg-indigo-50/70 py-1 px-3 rounded-full inline-block mt-2 animate-pulse">
                    🚀 Now u can access these things!
                  </p>
                </div>
                <Button 
                  onClick={handleCloseActivation} 
                  className="w-full mt-4 bg-zinc-900 text-white hover:bg-zinc-800 rounded-xl py-4 font-bold shadow-md hover:shadow-lg transition-all"
                >
                  Awesome, Let's Go!
                </Button>
              </div>
            )}

            {activationState === "pending" && (
              <div className="flex flex-col items-center text-center space-y-4 py-4">
                <div className="size-16 rounded-full bg-amber-50 flex items-center justify-center border border-amber-100">
                  <Clock className="size-8 text-amber-600 animate-pulse" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-zinc-900">Mandate Setup Registered</h3>
                  <p className="text-sm text-zinc-500 max-w-xs">
                    We received your setup details. Your bank or Razorpay is processing the mandate. Your features will activate automatically in a few minutes!
                  </p>
                  <p className="text-xs text-indigo-600 font-semibold bg-indigo-50/70 py-1 px-3 rounded-full inline-block mt-2">
                    🌟 You'll get access as soon as it clears!
                  </p>
                </div>
                <Button 
                  onClick={handleCloseActivation} 
                  className="w-full mt-4 bg-zinc-900 text-white hover:bg-zinc-800 rounded-xl py-4 font-bold shadow-sm transition-all"
                >
                  Got it, thank you!
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Page Title Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing & Subscriptions</h1>
        <p className="text-sm text-zinc-500">
          Manage your subscription plans, view invoice transactions, and configure payment options.
        </p>
      </div>

      {/* Trial Alert Notice Banner */}
      {isTrialActive && (
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-2xl bg-amber-50/50 border border-amber-200/60 shadow-sm">
          <div className="flex gap-3 items-start">
            <Clock className="size-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-amber-900">Your Free Trial is Active</h3>
              <p className="text-xs text-amber-700/90 mt-0.5">
                You are on the trial period. You have <strong>{daysRemaining} days remaining</strong>. Upgrade to an active paid plan to secure continuous API integration.
              </p>
            </div>
          </div>
          <div className="w-full md:w-auto flex items-center gap-2">
            <div className="flex-1 md:w-28 bg-amber-200/50 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-amber-600 h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, (daysRemaining / 30) * 100)}%` }} 
              />
            </div>
            <span className="text-xs font-bold text-amber-800 shrink-0">{daysRemaining}d left</span>
          </div>
        </div>
      )}

      {/* Subscription Summary Details Row */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Active plan column */}
        <Card className="md:col-span-2 shadow-sm border-zinc-200">
          <CardHeader>
            <CardTitle className="text-lg">Subscription Overview</CardTitle>
            <CardDescription>Details of your currently active workspace plan.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center p-4 rounded-xl bg-zinc-50 border border-zinc-150">
              <div>
                <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Current Plan</span>
                <h3 className="text-xl font-bold text-zinc-900 mt-1">
                  {activeSub?.pricing_plans?.name || (isTrialActive ? "Free Trial" : "No Active Plan")}
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {isTrialActive 
                    ? "Evaluating features on our complimentary tier"
                    : activeSub?.status === "ACTIVE" 
                    ? "Premium access fully enabled"
                    : "No billing authorization found"}
                </p>
              </div>
              <div className="sm:text-right shrink-0">
                <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Plan Cost</span>
                <p className="text-xl font-black text-zinc-900 mt-1">
                  {activeSub?.amount_inr ? `₹${activeSub.amount_inr}/mo` : isTrialActive ? "₹0 (Trial)" : "—"}
                </p>
              </div>
            </div>

            {activeSub && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm pt-1">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-50/50 border border-zinc-100">
                  <Calendar className="size-4.5 text-zinc-500 shrink-0" />
                  <div>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase">Billing Period</p>
                    <p className="text-xs font-semibold text-zinc-800 mt-0.5">
                      {activeSub.current_period_start 
                        ? new Date(activeSub.current_period_start).toLocaleDateString()
                        : "—"}
                      {" to "}
                      {activeSub.current_period_end
                        ? new Date(activeSub.current_period_end).toLocaleDateString()
                        : "—"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-50/50 border border-zinc-100">
                  <ShieldCheck className="size-4.5 text-zinc-500 shrink-0" />
                  <div>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase">Subscription Status</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`size-2 rounded-full ${
                        activeSub.status === "ACTIVE" ? "bg-emerald-500" : "bg-amber-500"
                      }`} />
                      <span className="text-xs font-bold text-zinc-800 uppercase tracking-wide">
                        {activeSub.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cancellation and settings card */}
        <Card className="shadow-sm border-zinc-200">
          <CardHeader>
            <CardTitle className="text-lg">Subscription Actions</CardTitle>
            <CardDescription>Configure or cancel billing details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-xs text-zinc-500 space-y-2">
              <p>For custom Enterprise terms, manual bank wire receipts, or custom contract quotes, contact support.</p>
              <p className="font-semibold text-zinc-700">Billing Admin Email:</p>
              <p className="font-mono text-zinc-600 truncate bg-zinc-50 p-2 rounded border">{status?.company.billingEmail || "Not configured"}</p>
            </div>

            {/* Grace period banner for cancelled subscriptions */}
            {activeSub && activeSub.status === "CANCELLED" && activeSub.current_period_end && new Date(activeSub.current_period_end) > new Date() && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="size-5 text-amber-600 shrink-0" />
                  <p className="text-sm font-semibold text-amber-800">Subscription Cancelled — Grace Period Active</p>
                </div>
                <p className="text-xs text-amber-700 leading-relaxed">
                  Your subscription has been cancelled, but you still have <span className="font-bold">full dashboard access</span> until{" "}
                  <span className="font-bold">
                    {new Date(activeSub.current_period_end).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                  </span>. After this date, your workspace will be locked and you'll need to resubscribe.
                </p>
                <p className="text-xs text-amber-600 mt-1">
                  Changed your mind? You can resubscribe anytime from the plans section above.
                </p>
              </div>
            )}

            {/* Show cancel button only for ACTIVE subscriptions */}
            {activeSub && activeSub.status === "ACTIVE" ? (
              <Button 
                variant="outline" 
                className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 font-semibold"
                onClick={handleCancelSubscription}
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" />
                    Cancelling...
                  </>
                ) : (
                  <>
                    <XCircle className="size-4 mr-2" />
                    Cancel Subscription
                  </>
                )}
              </Button>
            ) : activeSub && activeSub.status === "CANCELLED" ? (
              <div className="text-center p-3 rounded-lg bg-zinc-50 border border-dashed border-zinc-200">
                <span className="text-xs text-zinc-500">Subscription already cancelled. Access expires at the end of the billing period.</span>
              </div>
            ) : (
              <div className="text-center p-3 rounded-lg bg-zinc-50 border border-dashed border-zinc-200">
                <span className="text-xs text-zinc-400">No active card or auto-debit configurations.</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Razorpay Checkout.js Script */}
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      {/* ═══ Plan Confirmation Modal ═══ */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg mx-4 bg-white rounded-2xl border border-zinc-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-zinc-50 border-b border-zinc-100">
              <h3 className="text-base font-bold text-zinc-900">Confirm Your Upgrade</h3>
              <button onClick={() => { setSelectedPlan(null); setConfirmLoading(false); }} className="p-1.5 rounded-lg hover:bg-zinc-200/60 transition-colors">
                <X className="size-4 text-zinc-500" />
              </button>
            </div>

            {/* Plan Details */}
            <div className="px-6 py-5 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Selected Plan</p>
                  <h4 className="text-xl font-extrabold text-zinc-900 mt-1">{selectedPlan.name}</h4>
                  <p className="text-xs text-zinc-500 mt-0.5">{selectedPlan.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black text-zinc-900">₹{selectedPlan.price_inr}</p>
                  <p className="text-xs text-zinc-500 font-medium">/month</p>
                </div>
              </div>

              {/* Features checklist */}
              <div className="bg-zinc-50 rounded-xl border border-zinc-100 p-4">
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-3">What's Included</p>
                <ul className="space-y-2">
                  {selectedPlan.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2.5 text-xs">
                      <Check className={`size-3.5 shrink-0 ${f.included ? "text-emerald-500" : "text-zinc-300"}`} />
                      <span className={f.included ? "text-zinc-700" : "text-zinc-400 line-through"}>{f.text}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Total */}
              <div className="flex items-center justify-between px-4 py-3 bg-zinc-900 rounded-xl">
                <span className="text-sm font-semibold text-zinc-400">Total Due Today</span>
                <span className="text-xl font-black text-white">₹{selectedPlan.price_inr}</span>
              </div>

              {/* CTA */}
              <Button
                onClick={handleProceedToPay}
                disabled={confirmLoading}
                className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-5 rounded-xl shadow-md hover:shadow-lg transition-all text-sm"
              >
                {confirmLoading ? (
                  <><Loader2 className="size-4 animate-spin mr-2" /> Processing...</>
                ) : (
                  <><CreditCard className="size-4 mr-2" /> Proceed to Pay <ArrowRight className="size-4 ml-1" /></>
                )}
              </Button>

              <p className="text-[10px] text-zinc-400 text-center">
                🔒 Secured by Razorpay. Your card details are never stored on our servers.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Pricing Comparison Plan Grid */}
      <div>
        <div className="mb-6">
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 flex items-center gap-2">
            <Sparkles className="size-5 text-indigo-600" />
            Available Pricing Plans
          </h2>
          <p className="text-sm text-zinc-500">
            Upgrade or change your current plan. Review features before checkout.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => {
            const isCurrent = activeSub?.plan_id === plan.id;
            const isLoading = checkoutLoadingId === plan.id;

            return (
              <div 
                key={plan.id}
                className={`relative flex flex-col justify-between p-6 bg-white border rounded-2xl shadow-sm ${
                  plan.is_popular 
                    ? "border-zinc-900 ring-1 ring-zinc-900" 
                    : "border-zinc-200"
                }`}
              >
                {plan.is_popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-[10px] font-bold tracking-wider uppercase px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                )}
                
                <div>
                  <h3 className="text-lg font-bold text-zinc-900">{plan.name}</h3>
                  <p className="text-xs text-zinc-500 mt-1 min-h-[32px]">{plan.description}</p>
                  
                  <div className="my-5 flex items-baseline gap-1">
                    <span className="text-3xl font-black text-zinc-900">
                      {plan.is_custom_price ? "Custom" : `₹${plan.price_inr}`}
                    </span>
                    {!plan.is_custom_price && (
                      <span className="text-xs text-zinc-500 font-medium">/month</span>
                    )}
                  </div>

                  <ul className="space-y-2.5 my-6 text-xs text-zinc-600 border-t border-zinc-100 pt-5">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex gap-2 items-center">
                        <Check className={`size-4 shrink-0 ${
                          feature.included ? "text-emerald-500" : "text-zinc-300"
                        }`} />
                        <span className={feature.included ? "" : "line-through text-zinc-400"}>
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-4 pt-4 border-t border-zinc-100">
                  {plan.is_custom_price ? (
                    <a 
                      href="mailto:sales@biglead.site?subject=Enterprise Plan Inquiry"
                      className="inline-flex items-center justify-center w-full h-8 px-2.5 rounded-lg border border-zinc-300 bg-white text-sm font-semibold hover:bg-zinc-50 text-zinc-900 transition-all text-center"
                    >
                      Contact Sales
                    </a>
                  ) : (
                    <Button 
                      className={`w-full font-semibold ${
                        isCurrent 
                          ? "bg-zinc-100 hover:bg-zinc-150 text-zinc-600 cursor-default" 
                          : plan.is_popular 
                          ? "bg-zinc-900 hover:bg-zinc-850 text-white" 
                          : "bg-white hover:bg-zinc-50 text-zinc-900 border border-zinc-300 shadow-sm"
                      }`}
                      disabled={isCurrent || isLoading}
                      onClick={() => handleCheckout(plan)}
                    >
                      {isCurrent ? (
                        "Current Plan"
                      ) : (
                        <><Sparkles className="size-3.5 mr-1.5" /> Upgrade to {plan.name}</>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Invoice Receipts Table Log */}
      <div>
        <div className="mb-4">
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 flex items-center gap-2">
            <Receipt className="size-5 text-indigo-600" />
            Billing & Invoices History
          </h2>
          <p className="text-sm text-zinc-500">
            Past payments and dynamic printable receipt logs.
          </p>
        </div>

        <Card className="shadow-sm border-zinc-200">
          <CardContent className="p-0">
            {status?.invoices.length === 0 ? (
              <div className="text-center py-12 px-4 space-y-2">
                <Receipt className="size-10 text-zinc-300 mx-auto" />
                <p className="text-sm font-semibold text-zinc-900">No Invoices Available</p>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                  Once your subscription is successfully charged, invoices will populate here for direct view and printing.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-250 text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="p-4">Paid Date</th>
                      <th className="p-4">Invoice #</th>
                      <th className="p-4">Billing Window</th>
                      <th className="p-4">Amount</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-center">Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {status?.invoices.map((inv) => (
                      <tr key={inv.id} className="border-b border-zinc-150 hover:bg-zinc-50/50">
                        <td className="p-4 text-zinc-700">
                           {new Date(inv.paid_at).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric"
                          })}
                        </td>
                        <td className="p-4 font-mono font-bold text-zinc-900">
                          {inv.invoice_number}
                        </td>
                        <td className="p-4 text-zinc-500">
                          {new Date(inv.billing_period_start).toLocaleDateString()} to {new Date(inv.billing_period_end).toLocaleDateString()}
                        </td>
                        <td className="p-4 font-black text-zinc-900">
                          ₹{inv.amount_inr}
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                            inv.status === "PAID" 
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                              : "bg-amber-50 text-amber-700 border border-amber-100"
                          }`}>
                            <span className={`size-1.5 rounded-full ${
                              inv.status === "PAID" ? "bg-emerald-500" : "bg-amber-500"
                            }`} />
                            {inv.status}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <a
                            href={`/api/billing/invoice/${inv.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-[10px] font-bold transition-colors"
                          >
                            <Download className="size-3" />
                            Download
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
