"use client";

import { PricingSection } from "@/components/PricingSection";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden flex flex-col justify-between py-12 px-4 md:px-8">
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full blur-[140px] pointer-events-none bg-zinc-950/20 opacity-20" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full blur-[140px] pointer-events-none bg-gray-950/20 opacity-20" />

      {/* Floating Header */}
      <div className="max-w-6xl w-full mx-auto mb-12 flex justify-start z-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-zinc-800 bg-zinc-900/50 text-sm font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all shadow-md"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
      </div>

      {/* Pricing Section Container */}
      <div className="max-w-6xl w-full mx-auto flex-1 flex flex-col justify-center relative z-10">
        <PricingSection isDark={true} onCtaClick={() => window.location.href = "/signup"} />
      </div>

      {/* Sleek Footer */}
      <div className="max-w-6xl w-full mx-auto mt-12 text-center text-xs text-zinc-650 z-10 border-t border-zinc-900 pt-6">
        © {new Date().getFullYear()} BigLead. All rights reserved.
      </div>
    </div>
  );
}
