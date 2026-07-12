"use client";

import { useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
  Check, 
  Sparkles, 
  Loader2, 
  CreditCard, 
  ArrowRight, 
  X, 
  LogOut,
  ShieldCheck,
  Zap,
  Building
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

interface PlanFeature {
  text: string;
  included: boolean;
}

interface PricingPlan {
  id: string;
  name: string;
  description: string;
  price_inr: number;
  period: string;
  is_popular: boolean;
  is_custom_price: boolean;
  cta_text: string;
  features: PlanFeature[];
}

interface SelectPlanClientProps {
  initialPlans: PricingPlan[];
  userEmail: string;
}

export function SelectPlanClient({ initialPlans, userEmail }: SelectPlanClientProps) {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      window.location.href = "/login";
    } catch (err) {
      window.location.href = "/login";
    }
  };

  const startActivationPolling = () => {
    setIsVerifying(true);
    let count = 0;
    const interval = setInterval(async () => {
      count++;
      try {
        const res = await fetch("/api/billing/status");
        const statusData = await res.json();
        
        if (statusData && !statusData.error) {
          if (statusData.subscription?.status === "ACTIVE" || statusData.company?.status === "ACTIVE") {
            clearInterval(interval);
            toast.success("🎉 Payment verified successfully!");
            // Redirect directly to onboarding since subscription is active
            router.push("/onboarding");
            router.refresh();
            return;
          }
        }
      } catch (err) {
        console.error("Polling error:", err);
      }

      if (count >= 10) {
        clearInterval(interval);
        setIsVerifying(false);
        toast.error("Verification is taking longer than expected. Please refresh or contact support.");
      }
    }, 2500);
  };

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

      const win = window as any;
      if (!win.Razorpay) {
        throw new Error("Razorpay SDK not loaded. Please try again.");
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
            toast.info("Payment window closed.");
            setConfirmLoading(false);
          },
        },
        handler: () => {
          setSelectedPlan(null);
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

  return (
    <div className="max-w-6xl mx-auto w-full space-y-10">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-zinc-200 pb-5">
        <div className="flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://res.cloudinary.com/dy2zpgv6q/image/upload/v1779118448/Gemini_Generated_Image_2kpsnp2kpsnp2kps_1_-Photoroom_ddqkxb.png"
            alt="BigLead"
            className="h-10 w-auto object-contain"
          />
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-zinc-500 hidden sm:inline">Signed in as: <strong className="text-zinc-700">{userEmail}</strong></span>
          <button 
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-xs font-semibold text-zinc-600 transition-colors"
          >
            <LogOut className="size-3.5" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Title */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 leading-tight">
          Unlock Your Real Estate Sales Engine 🚀
        </h1>
        <p className="text-base text-zinc-500">
          Your account is registered successfully! Choose a CRM plan to activate your workspace and start capturing high-converting leads.
        </p>
      </div>

      {/* Verification Overlay */}
      {isVerifying && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white p-8 rounded-2xl border border-zinc-200 shadow-2xl max-w-md mx-4 text-center space-y-4 animate-in zoom-in-95 duration-200">
            <Loader2 className="size-10 animate-spin text-zinc-900 mx-auto" />
            <h3 className="text-lg font-bold text-zinc-900">Verifying Your Subscription</h3>
            <p className="text-xs text-zinc-500">
              We are confirming your payment setup with Razorpay. This will take just a few seconds. Do not refresh this page.
            </p>
          </div>
        </div>
      )}

      {/* Plans grid */}
      <div className="grid gap-8 md:grid-cols-3 pt-4">
        {initialPlans.map((plan) => {
          return (
            <div 
              key={plan.id}
              className={`relative flex flex-col justify-between p-8 bg-white border rounded-2xl shadow-sm transition-all duration-300 hover:shadow-md ${
                plan.is_popular 
                  ? "border-zinc-900 ring-1 ring-zinc-900" 
                  : "border-zinc-200"
              }`}
            >
              {plan.is_popular && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full">
                  Recommended
                </span>
              )}
              
              <div>
                <h3 className="text-xl font-bold text-zinc-900">{plan.name}</h3>
                <p className="text-xs text-zinc-500 mt-1 min-h-[32px]">{plan.description}</p>
                
                <div className="my-6 flex items-baseline gap-1">
                  <span className="text-4xl font-black text-zinc-900">
                    {plan.is_custom_price ? "Custom" : `₹${plan.price_inr}`}
                  </span>
                  {!plan.is_custom_price && (
                    <span className="text-xs text-zinc-400 font-medium">/month</span>
                  )}
                </div>

                <ul className="space-y-3 my-6 text-xs text-zinc-600 border-t border-zinc-100 pt-6">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex gap-2.5 items-center">
                      <Check className={`size-4 shrink-0 ${
                        feature.included ? "text-emerald-500" : "text-zinc-300"
                      }`} />
                      <span className={feature.included ? "text-zinc-700" : "line-through text-zinc-400"}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6 pt-6 border-t border-zinc-150">
                {plan.is_custom_price ? (
                  <a 
                    href="mailto:sales@biglead.site?subject=Enterprise Plan Inquiry"
                    className="inline-flex items-center justify-center w-full h-10 px-4 rounded-xl border border-zinc-300 bg-white text-xs font-bold hover:bg-zinc-50 text-zinc-900 transition-all text-center"
                  >
                    Contact Sales
                  </a>
                ) : (
                  <Button 
                    className={`w-full h-10 rounded-xl font-bold text-xs transition-all ${
                      plan.is_popular 
                        ? "bg-zinc-900 hover:bg-zinc-800 text-white" 
                        : "bg-white hover:bg-zinc-50 text-zinc-900 border border-zinc-300 shadow-sm"
                    }`}
                    onClick={() => setSelectedPlan(plan)}
                  >
                    <Sparkles className="size-3.5 mr-1.5" />
                    Choose {plan.name}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ═══ Plan Confirmation Modal ═══ */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg mx-4 bg-white rounded-2xl border border-zinc-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-zinc-50 border-b border-zinc-100">
              <h3 className="text-base font-bold text-zinc-900">Confirm Your Workspace Plan</h3>
              <button onClick={() => { setSelectedPlan(null); setConfirmLoading(false); }} className="p-1.5 rounded-lg hover:bg-zinc-200/60 transition-colors">
                <X className="size-4 text-zinc-500" />
              </button>
            </div>

            {/* Plan Details */}
            <div className="px-6 py-5 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Plan Selected</p>
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
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-3">Workspace Core Features</p>
                <ul className="space-y-2">
                  {selectedPlan.features.slice(0, 5).map((f, i) => (
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
                  <><Loader2 className="size-4 animate-spin mr-2" /> Processing Checkout...</>
                ) : (
                  <><CreditCard className="size-4 mr-2" /> Activate Workspace <ArrowRight className="size-4 ml-1" /></>
                )}
              </Button>

              <p className="text-[10px] text-zinc-400 text-center">
                🔒 Secured by Razorpay. Backed by 256-bit SSL encryption.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Trust factors footer */}
      <div className="border-t border-zinc-200 pt-8 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
        <div className="flex flex-col items-center space-y-2">
          <div className="p-2 rounded-full bg-zinc-100 text-zinc-900">
            <Zap className="size-5" />
          </div>
          <h4 className="text-xs font-bold text-zinc-800">Instant Activation</h4>
          <p className="text-[10px] text-zinc-400">Workspace is launched immediately after payment approval.</p>
        </div>
        <div className="flex flex-col items-center space-y-2">
          <div className="p-2 rounded-full bg-zinc-100 text-zinc-900">
            <ShieldCheck className="size-5" />
          </div>
          <h4 className="text-xs font-bold text-zinc-800">Secure Processing</h4>
          <p className="text-[10px] text-zinc-400">All dynamic transactions are verified securely via Razorpay.</p>
        </div>
        <div className="flex flex-col items-center space-y-2">
          <div className="p-2 rounded-full bg-zinc-100 text-zinc-900">
            <Building className="size-5" />
          </div>
          <h4 className="text-xs font-bold text-zinc-800">Built for Real Estate</h4>
          <p className="text-[10px] text-zinc-400">Designed to automate lead pipelines, sites visits, and deals.</p>
        </div>
      </div>

      <div className="text-center text-xs text-zinc-400">
        &copy; 2026 BigLead CRM. All rights reserved. Capture, engage, and close real estate leads.
      </div>
    </div>
  );
}
