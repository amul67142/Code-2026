"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { 
  ArrowRight, 
  CheckCircle2, 
  Zap, 
  BarChart3, 
  Users, 
  Network, 
  MessageSquare, 
  ShieldCheck, 
  Smartphone, 
  Building2, 
  Briefcase, 
  Car,
  Sun,
  Moon,
  X,
  Mic,
  Bot,
  MapPin
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { LeadCaptureModal } from "@/components/LeadCaptureModal";
import { PricingSection } from "@/components/PricingSection";
import { Reveal } from "@/components/Reveal";
import { SectionGradient } from "@/components/SectionGradient";

const LOGO_LIGHT = "https://res.cloudinary.com/dy2zpgv6q/image/upload/v1779118448/Gemini_Generated_Image_2kpsnp2kpsnp2kps_1_-Photoroom_ddqkxb.png";
const LOGO_DARK = "https://res.cloudinary.com/dy2zpgv6q/image/upload/v1779125703/Gemini_Generated_Image_c60xw7c60xw7c60x-Photoroom_laj5vl.png";

// Pipeline stage colors — used as accent throughout
const stages = [
  { label: "New Lead",     color: "bg-blue-500",   text: "text-gray-900 dark:text-gray-300",   border: "border-blue-200 dark:border-blue-900/60",   bg: "bg-blue-50/60 dark:bg-blue-950/20",   glow: "shadow-blue-200 dark:shadow-blue-900/30" },
  { label: "Contacted",   color: "bg-amber-400",  text: "text-gray-900 dark:text-gray-300",  border: "border-amber-200 dark:border-amber-900/60",  bg: "bg-amber-50/60 dark:bg-amber-950/20",  glow: "shadow-amber-200 dark:shadow-amber-900/30" },
  { label: "Negotiation", color: "bg-cyan-500", text: "text-gray-900 dark:text-gray-300", border: "border-cyan-200 dark:border-cyan-900/60", bg: "bg-cyan-50/60 dark:bg-cyan-950/20", glow: "shadow-cyan-200 dark:shadow-cyan-900/30" },
  { label: "Closed Won",  color: "bg-emerald-500",text: "text-gray-900 dark:text-gray-300",border: "border-emerald-200 dark:border-emerald-900/60",bg: "bg-emerald-50/60 dark:bg-emerald-950/20",glow: "shadow-emerald-200 dark:shadow-emerald-900/30" },
];

export default function HomePage() {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [leadModalOpen, setLeadModalOpen] = useState(false);


  // Sync state with HTML class
  useEffect(() => {
    setMounted(true);
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme === "dark") {
      setIsDark(true);
      document.documentElement.classList.add("dark");
    } else {
      setIsDark(false);
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  return (
    <div className={cn(
      "min-h-screen scroll-smooth transition-colors duration-500",
      isDark ? "bg-black text-gray-100" : "bg-white text-gray-900"
    )}>
      <style dangerouslySetInnerHTML={{__html:`
        @keyframes slideRight {
          0%   { transform:translateX(-20px); opacity:0; }
          12%  { opacity:1; }
          82%  { transform:translateX(560px); opacity:1; }
          100% { transform:translateX(640px); opacity:0; }
        }
        .lead-anim   { animation: slideRight 9s infinite cubic-bezier(0.4,0,0.2,1); }
        .lead-anim-2 { animation: slideRight 9s 3s infinite cubic-bezier(0.4,0,0.2,1); }
        .lead-anim-3 { animation: slideRight 9s 6s infinite cubic-bezier(0.4,0,0.2,1); }
        @keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:.3} }
        .pulse-dot { animation: pulse-dot 2s infinite; }
        @keyframes float-up-down {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes call-wave {
          0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.6); }
          70% { box-shadow: 0 0 0 15px rgba(59, 130, 246, 0); }
          100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
        }
        @media (max-width: 639px) {
          .lead-anim, .lead-anim-2, .lead-anim-3 { display: none !important; }
        }
        /* Gemini-style flowing aurora — slow drifting gradient waves */
        @keyframes aurora-1 {
          0%   { transform: translate(-12%, -8%) scale(1); }
          33%  { transform: translate(14%, 10%) scale(1.18); }
          66%  { transform: translate(-6%, 18%) scale(0.94); }
          100% { transform: translate(-12%, -8%) scale(1); }
        }
        @keyframes aurora-2 {
          0%   { transform: translate(10%, 6%) scale(1.1); }
          33%  { transform: translate(-16%, 14%) scale(0.9); }
          66%  { transform: translate(12%, -12%) scale(1.16); }
          100% { transform: translate(10%, 6%) scale(1.1); }
        }
        @keyframes aurora-3 {
          0%   { transform: translate(6%, 14%) scale(1); }
          50%  { transform: translate(-12%, -6%) scale(1.24); }
          100% { transform: translate(6%, 14%) scale(1); }
        }
        .aurora-blob { position: absolute; border-radius: 9999px; filter: blur(70px); will-change: transform; }
        .aurora-1 { animation: aurora-1 22s ease-in-out infinite; }
        .aurora-2 { animation: aurora-2 27s ease-in-out infinite; }
        .aurora-3 { animation: aurora-3 19s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .aurora-1, .aurora-2, .aurora-3 { animation: none !important; }
        }
      `}} />

      {/* ── BUBBLE NAV ── */}
      <div className="fixed top-5 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
        <header className={cn(
          "w-full max-w-4xl backdrop-blur-xl border rounded-full px-3 sm:px-6 h-16 flex items-center justify-between pointer-events-auto",
          isDark 
            ? "bg-black/90 border-gray-900 shadow-none text-gray-300" 
            : "bg-white/80 border-gray-200/60 shadow-[0_8px_30px_rgba(0,0,0,0.03)] text-gray-500"
        )}>
          {/* Logo container with dark-mode optimized hover */}
          <div className="flex items-center gap-2 relative w-32 h-12">
            <img 
              src={LOGO_LIGHT} 
              alt="BigLead" 
              className={cn("absolute inset-0 h-12 w-auto object-contain transition-opacity duration-500", isDark ? "opacity-0" : "opacity-100")} 
            />
            <img 
              src={LOGO_DARK} 
              alt="BigLead" 
              className={cn("absolute inset-0 h-12 w-auto object-contain transition-opacity duration-500", isDark ? "opacity-100" : "opacity-0")} 
            />
          </div>

          <nav className={cn(
            "hidden md:flex items-center gap-8 text-sm font-medium transition-colors",
            isDark ? "text-gray-400" : "text-gray-500"
          )}>
            <a href="#pipeline" className={cn("transition-colors", isDark ? "hover:text-white" : "hover:text-gray-900")}>Pipeline</a>
            <a href="#features" className={cn("transition-colors", isDark ? "hover:text-white" : "hover:text-gray-900")}>Features</a>
            <a href="#pricing"  className={cn("transition-colors", isDark ? "hover:text-white" : "hover:text-gray-900")}>Pricing</a>
          </nav>

          <div className="flex items-center gap-2">
            {/* Theme Toggle Button */}
            {mounted && (
              <button 
                onClick={toggleTheme}
                className={cn(
                  "relative p-2 rounded-full border transition-all duration-500 mr-1 sm:mr-2 overflow-hidden flex items-center justify-center w-8 h-8",
                  isDark 
                    ? "border-gray-800 bg-gray-900 text-amber-400 hover:bg-gray-800" 
                    : "border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100"
                )}
                aria-label="Toggle theme"
              >
                <Sun className={cn("absolute inset-0 m-auto size-4 transition-all duration-500", isDark ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-50")} />
                <Moon className={cn("absolute inset-0 m-auto size-4 transition-all duration-500", isDark ? "opacity-0 rotate-90 scale-50" : "opacity-100 rotate-0 scale-100")} />
              </button>
            )}

            <Link 
              href="/login"  
              className={cn(
                buttonVariants({ variant:"ghost", size:"sm" }), 
                "rounded-full text-xs sm:text-sm",
                isDark ? "text-gray-300 hover:text-white hover:bg-gray-900" : "text-gray-600"
              )}
            >
              Sign In
            </Link>
            <Link 
              href="/signup" 
              className={cn(
                buttonVariants({ size:"sm" }), 
                "rounded-full text-xs sm:text-sm font-semibold shadow-sm transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 border border-transparent",
                isDark 
                  ? "bg-white hover:bg-gray-100 text-black" 
                  : "bg-gray-900 hover:bg-black text-white"
              )}
            >
              Sign Up Free
            </Link>
          </div>
        </header>
      </div>

      <main>
        {/* ── HERO ── */}
        <section className="relative pt-28 sm:pt-36 pb-16 sm:pb-28 overflow-hidden">
          {/* Soft monochrome gradient wash */}
          <SectionGradient isDark={isDark} position="top" />

          {/* Subtle 3D Dashboard Background Image */}
          <div className="absolute inset-x-0 top-16 md:top-24 flex justify-center pointer-events-none opacity-[0.12] dark:opacity-[0.25] transition-opacity duration-500 z-0 select-none overflow-hidden h-[600px]">
            <div className="w-[1000px] md:w-[1200px] max-w-none flex-shrink-0" style={{ transform: "perspective(1200px) rotateX(15deg) scale(1.1)", transformOrigin: "top center" }}>
              <img 
                src="https://res.cloudinary.com/dy2zpgv6q/image/upload/v1779127011/Gemini_Generated_Image_sqd3hgsqd3hgsqd3_rw3ivz.png" 
                alt="Dashboard Background" 
                className="w-full h-auto rounded-3xl [mask-image:linear-gradient(to_bottom,black_0%,transparent_60%)] filter grayscale"
              />
            </div>
          </div>

          <div className="container mx-auto px-4 max-w-6xl relative z-10">


            <Reveal>
              <h1 className={cn(
                "text-center text-3xl sm:text-5xl md:text-7xl font-bold tracking-tight leading-tight mb-4 sm:mb-6 transition-colors duration-300",
                isDark ? "text-white" : "text-gray-900"
              )}>
                Turn Prospects into{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-700 via-gray-500 to-gray-900 dark:from-gray-300 dark:via-zinc-100 dark:to-white">Profits</span>.
              </h1>
            </Reveal>
            <Reveal delay={120}>
              <p className={cn(
                "text-center text-sm sm:text-lg md:text-xl max-w-2xl mx-auto mb-8 sm:mb-10 px-2 transition-colors duration-300",
                isDark ? "text-gray-400" : "text-gray-500"
              )}>
                The intelligent CRM built for modern sales teams. Capture, route, and close leads faster with one unified pipeline.
              </p>
            </Reveal>
            <Reveal delay={240}>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
                <button
                  onClick={() => setLeadModalOpen(true)}
                  className={cn(
                    buttonVariants({ size:"lg" }),
                    "h-12 px-8 rounded-full text-base w-full sm:w-auto justify-center transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 border border-transparent shadow-sm",
                    isDark
                      ? "bg-white hover:bg-gray-100 text-black"
                      : "bg-gray-900 hover:bg-black text-white"
                  )}
                >
                  Get Demo <ArrowRight className="ml-2 size-4" />
                </button>
                <Link
                  href="#pipeline"
                  className={cn(
                    buttonVariants({ variant:"outline", size:"lg" }),
                    "h-12 px-8 rounded-full text-base w-full sm:w-auto justify-center transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 shadow-sm",
                    isDark
                      ? "border-gray-800 bg-black hover:bg-zinc-900/60 text-gray-300 hover:text-white"
                      : "border-gray-250 hover:bg-gray-50 text-gray-700"
                  )}
                >
                  See the Pipeline
                </Link>
              </div>
            </Reveal>
            <Reveal delay={340}>
              <p className={cn(
                "text-center text-xs sm:text-sm transition-colors duration-300",
                isDark ? "text-gray-500" : "text-gray-400"
              )}>
                Personalized walkthrough · Custom integrations · Smart site-visit scheduling
              </p>
            </Reveal>

            {/* ── ANIMATED PIPELINE VISUAL ── */}
            <Reveal delay={200} y={28} id="pipeline" className="mt-12 sm:mt-20 relative max-w-5xl mx-auto">
              {/* fade bottom */}
              <div className={cn(
                "absolute bottom-0 left-0 right-0 h-24 z-10 pointer-events-none rounded-b-3xl transition-all duration-500",
                isDark 
                  ? "bg-gradient-to-t from-[#0B0F19] to-transparent" 
                  : "bg-gradient-to-t from-white to-transparent"
              )} />

              <div className={cn(
                "rounded-2xl sm:rounded-3xl border p-3 sm:p-5 md:p-7 overflow-hidden transition-all duration-500 shadow-2xl",
                isDark 
                  ? "border-gray-800 bg-gray-900/40 shadow-black/80" 
                  : "border-gray-200 bg-white shadow-gray-100"
              )}>
                {/* window chrome */}
                <div className="flex items-center gap-1.5 sm:gap-2 mb-3 sm:mb-6">
                  <span className="size-2 sm:size-3 rounded-full bg-red-400" />
                  <span className="size-2 sm:size-3 rounded-full bg-yellow-400" />
                  <span className="size-2 sm:size-3 rounded-full bg-green-400" />
                  <span className={cn(
                    "ml-2 sm:ml-4 text-[10px] sm:text-xs font-mono transition-colors",
                    isDark ? "text-gray-600" : "text-gray-400"
                  )}>
                    biglead.site / pipeline
                  </span>
                </div>

                {/* Stage columns */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 relative">
                  {stages.map((s, i) => (
                    <div 
                      key={s.label} 
                      className={cn(
                        "rounded-xl sm:rounded-2xl border p-2 sm:p-3 min-h-[140px] sm:min-h-[260px] transition-colors duration-300", 
                        isDark 
                          ? "border-gray-800/80 bg-gray-950/40" 
                          : cn(s.border, s.bg)
                      )}
                    >
                      <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                        <span className={cn("size-2 sm:size-2.5 rounded-full", s.color)} />
                        <span className={cn("text-[9px] sm:text-xs font-bold uppercase tracking-wide leading-tight", isDark ? "text-gray-400" : s.text)}>
                          {s.label}
                        </span>
                      </div>
                      {/* skeleton cards */}
                      {[0.9, 0.5, 0.25].map((op, j) => (
                        <div 
                          key={j} 
                          className={cn(
                            "rounded-lg sm:rounded-xl border p-1.5 sm:p-2.5 mb-1.5 sm:mb-2 shadow-sm transition-colors",
                            isDark 
                              ? "bg-gray-900/60 border-gray-800/50" 
                              : "bg-white border-white/80"
                          )} 
                          style={{opacity: op}}
                        >
                          <div className={cn("h-1.5 sm:h-2 rounded-full mb-1 sm:mb-1.5", i===0?"bg-blue-200 dark:bg-blue-900/40":i===1?"bg-amber-200 dark:bg-amber-900/40":i===2?"bg-violet-200 dark:bg-violet-900/40":"bg-emerald-200 dark:bg-emerald-900/40")} style={{width:`${75-j*15}%`}} />
                          <div className={cn("h-1 sm:h-1.5 rounded-full w-1/2", isDark ? "bg-gray-800" : "bg-gray-200")} />
                        </div>
                      ))}
                    </div>
                  ))}

                  {/* Animated lead cards */}
                  <div className="absolute top-12 left-0 pointer-events-none hidden md:block w-full">
                    {/* Card 1 — monochrome */}
                    <div className="absolute left-0 top-0 w-48 lead-anim">
                      <div className={cn(
                        "rounded-2xl border p-3.5 shadow-xl transition-all duration-300",
                        isDark 
                          ? "bg-gray-900 border-gray-800 shadow-black/40 text-white" 
                          : "bg-white border-gray-200 shadow-gray-100 text-gray-900"
                      )}>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="size-7 rounded-full bg-gray-700 text-white flex items-center justify-center text-[10px] font-bold">RS</div>
                          <div>
                            <div className={cn("text-xs font-bold transition-colors", isDark ? "text-white" : "text-gray-900")}>Rahul Sharma</div>
                            <div className={cn("text-[10px] transition-colors", isDark ? "text-gray-500" : "text-gray-400")}>₹2.5 Cr Budget</div>
                          </div>
                        </div>
                        <span className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase transition-colors",
                          isDark 
                            ? "bg-gray-950 border-gray-800 text-gray-400" 
                            : "bg-gray-100 border-gray-200 text-gray-600"
                        )}>
                          <Zap className="size-2.5" /> High Intent
                        </span>
                      </div>
                    </div>

                    {/* Card 2 — amber */}
                    <div className="absolute left-0 top-24 w-48 lead-anim-2">
                      <div className={cn(
                        "rounded-2xl border p-3.5 shadow-xl transition-all duration-300",
                        isDark 
                          ? "bg-gray-900 border-amber-900/60 shadow-amber-950/20 text-white" 
                          : "bg-white border-amber-200 shadow-amber-100 text-gray-900"
                      )}>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="size-7 rounded-full bg-amber-400 text-white flex items-center justify-center text-[10px] font-bold">AK</div>
                          <div>
                            <div className={cn("text-xs font-bold transition-colors", isDark ? "text-white" : "text-gray-900")}>Anjali Kumar</div>
                            <div className={cn("text-[10px] transition-colors", isDark ? "text-gray-500" : "text-gray-400")}>3BHK · Gurgaon</div>
                          </div>
                        </div>
                        <span className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase transition-colors",
                          isDark 
                            ? "bg-amber-950/40 border-amber-900/50 text-amber-400" 
                            : "bg-amber-50 border-amber-200 text-amber-700"
                        )}>
                          Warm Lead
                        </span>
                      </div>
                    </div>

                    {/* Card 3 — emerald */}
                    <div className="absolute left-0 top-48 w-48 lead-anim-3">
                      <div className={cn(
                        "rounded-2xl border p-3.5 shadow-xl transition-all duration-300",
                        isDark 
                          ? "bg-gray-900 border-emerald-900/60 shadow-emerald-950/20 text-white" 
                          : "bg-white border-emerald-200 shadow-emerald-100 text-gray-900"
                      )}>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="size-7 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold">MD</div>
                          <div>
                            <div className={cn("text-xs font-bold transition-colors", isDark ? "text-white" : "text-gray-900")}>Mohit Desai</div>
                            <div className={cn("text-[10px] transition-colors", isDark ? "text-gray-500" : "text-gray-400")}>Deal · ₹85L</div>
                          </div>
                        </div>
                        <span className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase transition-colors",
                          isDark 
                            ? "bg-emerald-950/40 border-emerald-900/50 text-emerald-400" 
                            : "bg-emerald-50 border-emerald-200 text-emerald-700"
                        )}>
                          ✓ Closed
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stage progress bar */}
                <div className="mt-3 sm:mt-5 flex gap-1 sm:gap-1.5">
                  {stages.map((s) => (
                    <div key={s.label} className={cn("flex-1 h-1 sm:h-1.5 rounded-full", s.color)} />
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── PRODUCT SHOWCASE VIDEO ── */}
        <section className={cn("relative overflow-hidden py-16 sm:py-24 transition-colors duration-500", isDark ? "bg-black" : "bg-white")}>
          <SectionGradient isDark={isDark} position="top" />
          <div className="container relative z-10 mx-auto px-4 max-w-5xl">
            <Reveal>
              <div className="text-center max-w-2xl mx-auto mb-10">
                <h2 className={cn("text-2xl sm:text-3xl md:text-4xl font-bold mb-3 transition-colors", isDark ? "text-white" : "text-gray-900")}>
                  See BigLead in action
                </h2>
                <p className={cn("text-sm sm:text-lg transition-colors", isDark ? "text-gray-400" : "text-gray-500")}>
                  From ad click to closed deal — capture every lead, auto-follow-up on WhatsApp &amp; email, and convert faster.
                </p>
              </div>
            </Reveal>
            <Reveal delay={150} y={28}>
              <div className={cn("rounded-2xl sm:rounded-3xl overflow-hidden border shadow-2xl", isDark ? "border-gray-800" : "border-gray-200")}>
                <video
                  src="https://res.cloudinary.com/dtlwrm7qk/video/upload/q_auto/f_auto/v1781515751/vidssave_2_ldqqxz.mp4"
                  autoPlay loop muted playsInline controls
                  className="w-full h-auto"
                />
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section id="features" className={cn(
          "relative overflow-hidden py-24 border-y transition-colors duration-500",
          isDark ? "bg-black border-gray-900" : "bg-white border-gray-100"
        )}>
          <SectionGradient isDark={isDark} position="center" />
          <div className="container relative z-10 mx-auto px-4 max-w-5xl">
            <Reveal>
              <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-14">
                <h2 className={cn(
                  "text-2xl sm:text-3xl md:text-4xl font-bold mb-3 transition-colors",
                  isDark ? "text-white" : "text-gray-900"
                )}>
                  Everything your sales team needs
                </h2>
                <p className={cn(
                  "text-sm sm:text-lg transition-colors px-2",
                  isDark ? "text-gray-500" : "text-gray-400"
                )}>
                  From first touch to closed deal — BigLead handles the entire pipeline so your team can focus on selling.
                </p>
              </div>
            </Reveal>

            {/* Table-grid: 4 cols, 2 rows, separated by thin lines */}
            <Reveal delay={150} y={28}>
            <div className={cn(
              "grid grid-cols-2 lg:grid-cols-4 gap-px border rounded-2xl overflow-hidden transition-colors duration-500",
              isDark
                ? "border-gray-900 bg-gray-900"
                : "border-gray-100 bg-gray-100"
            )}>
              {[
                  {
                    icon: (
                      <svg className={cn("size-5 transition-colors", isDark ? "text-gray-400" : "text-gray-700")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
                    ),
                    title: "Instant Lead Capture",
                    desc: <>Pulls leads from <span className={cn("font-semibold transition-colors", isDark ? "text-white" : "text-gray-900")}>every source</span> — forms, Meta Ads, Google, and APIs — the moment they hit.</>,
                  },
                  {
                    icon: (
                      <svg className={cn("size-5 transition-colors", isDark ? "text-gray-400" : "text-gray-700")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" /></svg>
                    ),
                    title: "Smart Auto-Routing",
                    desc: <>New leads are <span className={cn("font-semibold transition-colors", isDark ? "text-white" : "text-gray-900")}>assigned instantly</span> to the right agent based on location, source, or workload.</>,
                  },
                  {
                    icon: (
                      <svg className={cn("size-5 transition-colors", isDark ? "text-gray-400" : "text-gray-700")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>
                    ),
                    title: "Visual Kanban Pipeline",
                    desc: <>Drag and drop leads across stages. See your <span className={cn("font-semibold transition-colors", isDark ? "text-white" : "text-gray-900")}>entire funnel</span> at a glance, zero guesswork.</>,
                  },
                  {
                    icon: (
                      <svg className={cn("size-5 transition-colors", isDark ? "text-gray-400" : "text-gray-700")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    ),
                    title: "Follow-up on Autopilot",
                    desc: <>Emails, WhatsApp and tasks fire <span className={cn("font-semibold transition-colors", isDark ? "text-white" : "text-gray-900")}>automatically</span> when a lead moves — no manual nudging needed.</>,
                  },
                  {
                    icon: (
                      <svg className={cn("size-5 transition-colors", isDark ? "text-gray-400" : "text-gray-700")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                    ),
                    title: "Role-Based Access",
                    desc: <>Agents see <span className={cn("font-semibold transition-colors", isDark ? "text-white" : "text-gray-900")}>only their leads</span>. Managers get the full picture. Privacy baked in by default.</>,
                  },
                  {
                    icon: (
                      <svg className={cn("size-5 transition-colors", isDark ? "text-gray-400" : "text-gray-700")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>
                    ),
                    title: "Real-Time Analytics",
                    desc: <>Track conversion rates, <span className={cn("font-semibold transition-colors", isDark ? "text-white" : "text-gray-900")}>pipeline value</span>, and agent performance with live dashboards.</>,
                  },
                  {
                    icon: (
                      <svg className={cn("size-5 transition-colors", isDark ? "text-gray-400" : "text-gray-700")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" /></svg>
                    ),
                    title: "Mobile-First Design",
                    desc: <>Your team can <span className={cn("font-semibold transition-colors", isDark ? "text-white" : "text-gray-900")}>update pipelines</span>, add notes, and call leads straight from their phones.</>,
                  },
                  {
                    icon: (
                      <svg className={cn("size-5 transition-colors", isDark ? "text-gray-400" : "text-gray-700")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" /></svg>
                    ),
                    title: "API & CRM Integrations",
                    desc: <>Connect to your existing tools in <span className={cn("font-semibold transition-colors", isDark ? "text-white" : "text-gray-900")}>minutes</span>. Zapier, webhooks, and native integrations included.</>,
                  },
              ].map((item, i) => (
                    <motion.div
                      key={i}
                      initial="rest"
                      animate="rest"
                      whileHover="hover"
                      className={cn(
                        "p-5 sm:p-8 flex flex-col gap-3 sm:gap-4 transition-colors group",
                        isDark ? "bg-black hover:bg-gray-900/60" : "bg-white hover:bg-gray-50"
                      )}
                    >
                      <motion.div
                        variants={{ rest: { scale: 1, y: 0 }, hover: { scale: 1.12, y: -2 } }}
                        transition={{ type: "spring", stiffness: 300, damping: 18 }}
                        className={cn(
                          "origin-left transition-colors",
                          isDark ? "text-gray-600 group-hover:text-white" : "text-gray-400 group-hover:text-gray-700"
                        )}
                      >
                        {item.icon}
                      </motion.div>
                      <motion.div
                        variants={{ rest: { width: 24 }, hover: { width: 44 } }}
                        transition={{ type: "spring", stiffness: 300, damping: 22 }}
                        className={cn("h-px transition-colors", isDark ? "bg-gray-800" : "bg-gray-200")}
                      />
                      <div>
                        <h3 className={cn("font-bold text-sm sm:text-base mb-1.5 sm:mb-2 transition-colors", isDark ? "text-white" : "text-gray-900")}>{item.title}</h3>
                        <p className={cn("text-xs sm:text-sm leading-relaxed transition-colors", isDark ? "text-gray-400" : "text-gray-400")}>{item.desc}</p>
                      </div>
                    </motion.div>
              ))}
            </div>
            </Reveal>
          </div>
        </section>

        {/* ── USE CASES ── */}
        <section id="use-cases" className={cn("relative overflow-hidden pt-24 pb-12 transition-colors duration-500", isDark ? "bg-black" : "bg-white")}>
          <SectionGradient isDark={isDark} position="bottom" />
          <div className="container relative z-10 mx-auto px-4 max-w-6xl">
            <div className="flex flex-col lg:flex-row items-center gap-16">
              <div className="w-full lg:w-1/2 space-y-6">
                <Reveal>
                  <div className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-colors",
                    isDark
                      ? "bg-gray-900 border border-gray-800 text-gray-400"
                      : "bg-gray-100 border border-gray-200 text-gray-700"
                  )}>
                    Use Cases
                  </div>
                </Reveal>
                <Reveal delay={100}>
                  <h2 className={cn("text-2xl sm:text-3xl md:text-4xl font-bold transition-colors", isDark ? "text-white" : "text-gray-900")}>
                    Built for industries that <em className="not-italic text-zinc-700 dark:text-zinc-300 font-extrabold">move fast</em>
                  </h2>
                </Reveal>
                <Reveal delay={180}>
                  <p className={cn("text-sm sm:text-lg transition-colors", isDark ? "text-gray-400" : "text-gray-500")}>
                    Customize fields, stages, and automation rules for your specific niche.
                  </p>
                </Reveal>
                <div className="space-y-3 pt-2">
                  {[
                    { icon: Building2, title: "Real Estate",  desc: "Track site visits, inventory preferences & broker networks.", s: stages[0] },
                    { icon: Briefcase, title: "B2B Agencies", desc: "Manage client onboarding, discovery & contract negotiations.", s: stages[2] },
                    { icon: Car,       title: "Automotive",   desc: "Handle test drive bookings, financing stages & handovers.",  s: stages[3] },
                  ].map((uc, i) => (
                    <Reveal key={i} delay={260 + i * 100}>
                      <motion.div
                        whileHover={{ y: -4 }}
                        transition={{ type: "spring", stiffness: 300, damping: 22 }}
                        className={cn(
                          "flex gap-4 p-5 rounded-2xl border transition-[box-shadow,border-color,background-color] duration-300 hover:shadow-lg",
                          isDark
                            ? "border-gray-800 bg-gray-900/40 hover:bg-gray-900/60 hover:border-gray-700"
                            : cn(uc.s.border, uc.s.bg, "hover:border-gray-300")
                        )}
                      >
                        <div className={cn(
                          "size-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm border transition-colors",
                          isDark ? "bg-black border-gray-800" : cn(uc.s.bg, uc.s.border)
                        )}>
                          <uc.icon className={cn("size-5 transition-colors", isDark ? uc.s.text : uc.s.text)} />
                        </div>
                        <div>
                          <h4 className={cn("font-bold transition-colors", isDark ? "text-white" : "text-gray-900")}>{uc.title}</h4>
                          <p className={cn("text-sm transition-colors", isDark ? "text-gray-400" : "text-gray-500")}>{uc.desc}</p>
                        </div>
                      </motion.div>
                    </Reveal>
                  ))}
                </div>
              </div>

              {/* Ingestion Flow Connectivity Visual */}
              <Reveal delay={150} y={28} className="w-full lg:w-1/2 flex justify-center items-center">
                <div className={cn(
                  "rounded-3xl border p-2 overflow-hidden transition-all duration-300 shadow-2xl relative group w-full max-w-lg",
                  isDark ? "border-gray-800 bg-gray-900/20 shadow-black/40" : "border-gray-200 bg-gray-50/50 shadow-gray-100"
                )}>
                  {/* The Flow connectivity GIF/Image */}
                  <img
                    src="https://res.cloudinary.com/dy2zpgv6q/image/upload/v1779176794/biglead-ezgif.com-optimize_z1dmf5.gif"
                    alt="Multi-channel Ingestion Flow Connectivity"
                    className="w-full h-auto rounded-2xl object-cover transition-transform duration-500 group-hover:scale-102"
                  />
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ── AI CALLING (Coming Soon) — cinematic launch trailer, monochrome ── */}
        <section id="ai-voice" className={cn(
          "relative pt-12 pb-24 sm:pt-16 sm:pb-28 overflow-hidden transition-colors duration-500",
          isDark ? "bg-black" : "bg-white"
        )}>
          {/* Drifting monochrome waves — always moving, on-brand greyscale */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className={cn(
              "aurora-blob aurora-1 size-[60%] left-[2%] top-[-18%] transition-colors duration-500",
              isDark ? "bg-gray-700/30" : "bg-gray-300/45"
            )} />
            <div className={cn(
              "aurora-blob aurora-2 size-[55%] right-[0%] top-[8%] transition-colors duration-500",
              isDark ? "bg-zinc-800/40" : "bg-zinc-300/40"
            )} />
            <div className={cn(
              "aurora-blob aurora-3 size-[50%] left-[28%] bottom-[-22%] transition-colors duration-500",
              isDark ? "bg-gray-600/25" : "bg-slate-300/35"
            )} />
            {/* vignette so the waves fade into the section edges (cinematic) */}
            <div className={cn(
              "absolute inset-0 transition-colors duration-500",
              isDark
                ? "bg-[radial-gradient(ellipse_75%_65%_at_50%_45%,transparent_25%,rgba(0,0,0,0.85)_100%)]"
                : "bg-[radial-gradient(ellipse_75%_65%_at_50%_45%,transparent_25%,rgba(255,255,255,0.85)_100%)]"
            )} />
          </div>

          <div className="container relative z-10 mx-auto px-4 max-w-5xl w-full">
            {/* Header — cinematic line-by-line rise */}
            <div className="text-center max-w-4xl mx-auto mb-14">
              <h2 className={cn(
                "text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.15] mb-6 transition-colors",
                isDark ? "text-white" : "text-gray-900"
              )}>
                <Reveal y={44} duration={900}>
                  <span className="block pb-1">AI Calling</span>
                </Reveal>
                <Reveal y={44} duration={900} delay={160}>
                  <span className={cn(
                    "block pb-2 bg-clip-text text-transparent",
                    isDark
                      ? "bg-gradient-to-r from-gray-300 via-zinc-100 to-white"
                      : "bg-gradient-to-r from-gray-700 via-gray-500 to-gray-900"
                  )}>
                    launching soon
                  </span>
                </Reveal>
              </h2>

              <Reveal delay={420}>
                <p className={cn(
                  "text-base sm:text-xl leading-relaxed max-w-2xl mx-auto transition-colors",
                  isDark ? "text-gray-400" : "text-gray-600"
                )}>
                  A human-like AI voice that calls every new lead in seconds — qualifies them in Hindi &amp; English and books site visits straight into your calendar, 24/7.
                </p>
              </Reveal>
            </div>

            {/* Video — simple, with controls so you can turn the voice on */}
            <Reveal delay={150} y={28} className="relative max-w-3xl mx-auto">
              <div className={cn(
                "relative rounded-2xl sm:rounded-3xl overflow-hidden border shadow-xl transition-colors",
                isDark ? "border-gray-800 shadow-black/30" : "border-gray-200 shadow-gray-200/60"
              )}>
                <video
                  src="https://res.cloudinary.com/dtlwrm7qk/video/upload/q_auto/f_auto/v1781515746/Untitled_-_13_June_2026_at_02.20.14_1_fmafrh.mp4"
                  autoPlay loop muted playsInline controls
                  className="block w-full h-auto"
                />
              </div>
            </Reveal>

            {/* Feature row — compact horizontal on mobile, stacked on desktop */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8 max-w-4xl mx-auto mt-12 sm:mt-16">
              {[
                { icon: Zap, title: "Instant callback", desc: "Calls the moment a lead arrives — before they go cold." },
                { icon: MessageSquare, title: "Qualifies & books", desc: "Asks the right questions and books site visits automatically." },
                { icon: Smartphone, title: "24/7, Hindi & English", desc: "Never miss a lead, day or night, in your customer's language." },
              ].map((f, i) => (
                <Reveal key={f.title} delay={i * 120}>
                <div className="flex sm:block items-start gap-3.5 text-left">
                  <div className={cn(
                    "size-11 rounded-xl flex items-center justify-center shrink-0 mb-0 sm:mb-3 border transition-colors",
                    isDark ? "bg-white/5 border-white/10 text-gray-300" : "bg-gray-50 border-gray-200 text-gray-700"
                  )}>
                    <f.icon className="size-5" />
                  </div>
                  <div>
                    <h3 className={cn("text-base font-semibold mb-1 transition-colors", isDark ? "text-white" : "text-gray-900")}>{f.title}</h3>
                    <p className={cn("text-sm leading-relaxed transition-colors", isDark ? "text-gray-400" : "text-gray-600")}>{f.desc}</p>
                  </div>
                </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── PRICING ── */}
        <section id="pricing" className={cn(
          "py-24 text-white relative overflow-hidden transition-colors duration-500",
          isDark ? "bg-black" : "bg-gray-950"
        )}>
          {/* Radial gradient backing for pricing */}
          <div className={cn(
            "absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full blur-[140px] pointer-events-none transition-all duration-700",
            isDark ? "bg-zinc-950/20 opacity-20" : "bg-gray-900/30 opacity-100"
          )} />
          <div className={cn(
            "absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full blur-[140px] pointer-events-none transition-all duration-700",
            isDark ? "bg-gray-950/20 opacity-20" : "bg-zinc-900/30 opacity-100"
          )} />

          <div className="container mx-auto px-4 max-w-6xl relative z-10">
            <Reveal y={28}>
              <PricingSection isDark={isDark} onCtaClick={() => setLeadModalOpen(true)} />
            </Reveal>
          </div>
        </section>

        {/* ── BOTTOM CTA ── */}
        <section className={cn(
          "relative overflow-hidden py-24 border-t transition-colors duration-500",
          isDark ? "bg-black border-gray-900" : "bg-white border-gray-100"
        )}>
          <SectionGradient isDark={isDark} position="center" />
          <div className="container relative z-10 mx-auto px-4 max-w-3xl text-center">
            <Reveal>
              <h2 className={cn("text-2xl sm:text-4xl font-bold mb-4 transition-colors", isDark ? "text-white" : "text-gray-900")}>
                Ready to transform your pipeline?
              </h2>
            </Reveal>
            <Reveal delay={180}>
              <p className={cn("text-sm sm:text-lg mb-8 sm:mb-10 transition-colors", isDark ? "text-gray-400" : "text-gray-500")}>
                Join thousands of high-performing teams using BigLead to close deals faster.
              </p>
            </Reveal>
            <Reveal delay={260}>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <button
                  onClick={() => setLeadModalOpen(true)}
                  className={cn(
                    buttonVariants({ size:"lg" }),
                    "h-14 px-10 text-lg rounded-full transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 shadow-sm border border-transparent",
                    isDark
                      ? "bg-white hover:bg-gray-100 text-black"
                      : "bg-gray-900 hover:bg-black text-white"
                  )}
                >
                  Get Demo
                </button>
                <Link
                  href="#pricing"
                  className={cn(
                    buttonVariants({ variant:"outline", size:"lg" }),
                    "h-14 px-10 text-lg rounded-full transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 shadow-sm",
                    isDark
                      ? "border-gray-800 bg-black hover:bg-zinc-900/60 text-gray-300 hover:text-white"
                      : "border-gray-250 hover:bg-gray-50 text-gray-700"
                  )}
                >
                  View Pricing
                </Link>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      {/* ── FOOTER ── */}
      <footer className={cn(
        "border-t py-14 transition-colors duration-500",
        isDark ? "bg-black border-gray-900" : "bg-white border-gray-200"
      )}>
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
            <div className="col-span-2">
              <div className="relative w-32 h-12 mb-4">
                <img 
                  src={LOGO_LIGHT} 
                  alt="BigLead" 
                  className={cn("absolute inset-0 h-12 w-auto object-contain transition-opacity duration-500", isDark ? "opacity-0" : "opacity-100")} 
                />
                <img 
                  src={LOGO_DARK} 
                  alt="BigLead" 
                  className={cn("absolute inset-0 h-12 w-auto object-contain transition-opacity duration-500", isDark ? "opacity-100" : "opacity-0")} 
                />
              </div>
              <p className={cn("text-sm max-w-xs leading-relaxed transition-colors", isDark ? "text-gray-400" : "text-gray-500")}>
                The modern CRM for teams who value speed, simplicity, and measurable results.
              </p>
            </div>
            {[
              { 
                title: "Product",   
                links: [
                  { name: "Features", href: "#features" },
                  { name: "Pricing", href: "#pricing" },
                  { name: "Integrations", href: "/integrations" },
                  { name: "Changelog", href: "/changelog" }
                ] 
              },
              {
                title: "Resources",
                links: [
                  { name: "Documentation", href: "/docs" },
                  { name: "Facebook Setup Guide", href: "/guides/facebook-lead-ads" },
                  { name: "Blog", href: "/blog" },
                  { name: "Help Center", href: "/help" },
                  { name: "Contact", href: "/contact" }
                ]
              },
              { 
                title: "Legal",     
                links: [
                  { name: "Privacy Policy", href: "/privacy" },
                  { name: "Terms", href: "/terms" },
                  { name: "Security", href: "/security" },
                  { name: "Cookies", href: "/cookies" }
                ] 
              },
            ].map(col => (
              <div key={col.title}>
                <h4 className={cn("font-bold mb-4 text-sm transition-colors", isDark ? "text-gray-300" : "text-gray-900")}>{col.title}</h4>
                <ul className="space-y-2.5">
                  {col.links.map(l => (
                    <li key={l.name}>
                      <Link href={l.href} className={cn("text-sm transition-colors", isDark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900")}>
                        {l.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className={cn("pt-6 border-t flex flex-col md:flex-row items-center justify-between gap-6 transition-colors", isDark ? "border-gray-900" : "border-gray-100")}>
            <div className={cn("text-xs text-center md:text-left transition-colors flex flex-col gap-1.5", isDark ? "text-gray-500" : "text-gray-400")}>
              <p className="font-semibold text-gray-400 dark:text-gray-500">© {new Date().getFullYear()} BigLead. All rights reserved.</p>
              <p className="opacity-80">
                Operating Address: Sector 47, Gurgaon, Haryana — 122001, India
              </p>
              <p className="opacity-80">
                Email: info@biglead.site | Phone: +91 79828 94432
              </p>
              <div className="flex items-center justify-center md:justify-start gap-3 pt-1.5">
                <a href="https://www.facebook.com/profile.php?id=61590838885029" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="hover:opacity-70 transition-opacity">
                  <svg className="size-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </a>
                <a href="https://www.instagram.com/bigleadsite/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="hover:opacity-70 transition-opacity">
                  <svg className="size-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                </a>
              </div>
            </div>
            <div className="flex flex-wrap justify-center md:justify-end gap-2 sm:gap-3">
              {stages.map(s => (
                <span 
                  key={s.label} 
                  className={cn(
                    "text-[8px] sm:text-[9px] font-bold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border transition-colors", 
                    isDark 
                      ? "border-gray-800 bg-black text-gray-400" 
                      : cn(s.bg, s.text, s.border)
                  )}
                >
                  {s.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </footer>

      <LeadCaptureModal open={leadModalOpen} onOpenChange={setLeadModalOpen} />
    </div>
  );
}
