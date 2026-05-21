"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

interface PricingFeature {
  text: string;
  included: boolean;
}

interface PricingPlan {
  id: string;
  name: string;
  description: string;
  priceINR: string;
  priceUSD: string;
  price_inr: number;
  period: string | null;
  is_popular: boolean;
  is_custom_price: boolean;
  cta_text: string;
  features: PricingFeature[];
}

interface PricingSectionProps {
  isDark: boolean;
  onCtaClick: () => void;
}

export function PricingSection({ isDark, onCtaClick }: PricingSectionProps) {
  const [currency, setCurrency] = useState("usd");
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/pricing")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setPlans(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto items-center">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              "rounded-3xl p-8 h-[400px] animate-pulse border",
              isDark ? "bg-gray-900/40 border-gray-800" : "bg-gray-800/60 border-gray-700"
            )}
          />
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Currency Toggle */}
      <div className="text-center mb-16">
        <div className="inline-flex items-center gap-1.5 mb-4 px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider transition-colors" style={{
          background: isDark ? "rgba(24,24,27,0.8)" : "rgba(255,255,255,0.1)",
          borderColor: isDark ? "rgb(39,39,42)" : "rgba(255,255,255,0.2)",
          color: isDark ? "rgb(161,161,170)" : "rgb(209,213,219)"
        }}>
          Pricing
        </div>
        <h2 className="text-3xl md:text-4xl font-bold mb-3 text-white">Simple, transparent pricing</h2>
        <p className="text-gray-400 text-lg mb-8">Start for free, upgrade when you're ready. No hidden fees.</p>

        <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-gray-900/50 border border-gray-800">
          <span className={cn("text-xs font-semibold tracking-wide transition-colors", currency === "usd" ? "text-white" : "text-gray-400")}>USD ($)</span>
          <button
            onClick={() => setCurrency(currency === "usd" ? "inr" : "usd")}
            className="relative w-11 h-6 rounded-full bg-gray-800 border border-gray-700 transition-colors focus:outline-none cursor-pointer"
            aria-label="Toggle currency"
          >
            <span className={cn(
              "absolute top-0.5 left-0.5 size-4.5 rounded-full bg-white transition-transform duration-300 shadow-md",
              currency === "inr" ? "translate-x-5" : "translate-x-0"
            )} />
          </button>
          <span className={cn("text-xs font-semibold tracking-wide transition-colors", currency === "inr" ? "text-white" : "text-gray-400")}>INR (₹)</span>
        </div>
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto items-center">
        {plans.map((tier) => (
          <div
            key={tier.id}
            className={cn(
              "rounded-3xl p-8 flex flex-col relative border transition-all duration-300",
              tier.is_popular
                ? "bg-gradient-to-b from-zinc-900 to-black border-white dark:border-zinc-700 shadow-2xl py-12 md:scale-105 z-10"
                : isDark
                  ? "bg-gray-900/40 hover:bg-gray-900/60 border-gray-850 hover:border-gray-700"
                  : "bg-gray-905 hover:border-gray-600 border-gray-700",
              tier.is_popular ? "border-white dark:border-zinc-500 shadow-zinc-900/40" : isDark ? "border-gray-800" : "border-gray-700"
            )}
          >
            {tier.is_popular && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white text-black text-[10px] font-bold px-4 py-1.5 rounded-full uppercase tracking-wider shadow border border-gray-200">
                Most Popular
              </div>
            )}
            <h3 className="text-xl font-bold mb-1 text-white">{tier.name}</h3>
            <p className="text-sm text-gray-400 mb-5 h-9">{tier.description}</p>
            <div className="flex items-baseline mb-7">
              <span className="text-4xl font-bold text-white">
                {currency === "usd" ? tier.priceUSD : tier.priceINR}
              </span>
              {tier.period && !tier.is_custom_price && (
                <span className="text-gray-400 ml-1 text-sm">{tier.period}</span>
              )}
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {tier.features.map((f, j) => (
                <li key={j} className={cn("flex items-start gap-2.5 text-sm", !f.included && "opacity-60")}>
                  {f.included
                    ? <CheckCircle2 className="size-4 shrink-0 text-emerald-400 mt-0.5" />
                    : <X className="size-4 shrink-0 text-gray-500 mt-0.5" />}
                  <span className={cn(
                    tier.is_popular ? "text-gray-100" : "text-gray-300",
                    !f.included && "text-gray-500 line-through decoration-gray-600"
                  )}>
                    {f.text}
                  </span>
                </li>
              ))}
            </ul>
            <button
              onClick={onCtaClick}
              className={cn(
                buttonVariants({ size: "lg" }),
                "w-full rounded-full text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 shadow-sm",
                tier.is_popular
                  ? "bg-white hover:bg-gray-100 text-black font-extrabold border border-transparent"
                  : isDark
                    ? "bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-800"
                    : "bg-gray-800 hover:bg-gray-900 text-white border border-gray-850"
              )}
            >
              {tier.cta_text}
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
