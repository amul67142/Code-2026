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
import { LeadCaptureModal } from "@/components/LeadCaptureModal";

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
                "rounded-full text-xs sm:text-sm font-semibold shadow transition-all",
                isDark 
                  ? "bg-white hover:bg-gray-200 text-black shadow-white/10" 
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
        <section className="relative pt-36 pb-28 overflow-hidden">
          {/* Futuristic background grids & dots */}
          <div className={cn(
            "absolute inset-0 transition-all duration-700 pointer-events-none opacity-50",
            isDark 
              ? "bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_85%,transparent_100%)]" 
              : "bg-[radial-gradient(#00000006_1px,transparent_1px)] bg-[size:20px_20px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_85%,transparent_100%)]"
          )} />

          {/* Glowing linear overlay pipelines representing leads flow */}
          <div className={cn(
            "absolute inset-0 pointer-events-none opacity-20",
            isDark 
              ? "bg-[linear-gradient(to_right,#ffffff02_1px,transparent_1px),linear-gradient(to_bottom,#ffffff02_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_40%,#000_60%,transparent_100%)]"
              : "bg-[linear-gradient(to_right,#00000002_1px,transparent_1px),linear-gradient(to_bottom,#00000002_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_40%,#000_60%,transparent_100%)]"
          )} />

          {/* Colored gradient blobs for deep background magic */}
          <div className={cn(
            "absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full blur-[120px] pointer-events-none transition-all duration-700",
            isDark ? "bg-gray-900/10 opacity-30" : "bg-gray-100 opacity-40"
          )} />
          <div className={cn(
            "absolute top-10 right-0 translate-x-1/2 w-[450px] h-[450px] rounded-full blur-[120px] pointer-events-none transition-all duration-700",
            isDark ? "bg-zinc-900/15 opacity-25" : "bg-zinc-100 opacity-30"
          )} />
          <div className={cn(
            "absolute bottom-0 left-1/3 w-[400px] h-[400px] rounded-full blur-[100px] pointer-events-none transition-all duration-700",
            isDark ? "bg-gray-900/10 opacity-20" : "bg-gray-100 opacity-25"
          )} />

          {/* Futuristic glowing geometric backdrop */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-gradient-to-r from-gray-500/5 via-zinc-500/5 to-gray-300/5 rounded-full blur-3xl pointer-events-none opacity-80" />

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
            {/* badge */}
            <div className="flex justify-center mb-6">
              <span className={cn(
                "inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs sm:text-sm font-semibold shadow-sm transition-all duration-300",
                isDark 
                  ? "bg-black border-gray-900 text-gray-300" 
                  : "bg-gradient-to-r from-gray-50 to-zinc-50 border-gray-200 text-gray-700"
              )}>
                <span className="size-2 rounded-full bg-emerald-500 pulse-dot" />
                BigLead 2.0 — Now Live
              </span>
            </div>

            <h1 className={cn(
              "text-center text-5xl md:text-7xl font-bold tracking-tight leading-tight mb-6 transition-colors duration-300",
              isDark ? "text-white" : "text-gray-900"
            )}>
              Turn Prospects into{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-700 via-gray-500 to-gray-900 dark:from-gray-300 dark:via-zinc-100 dark:to-white">Profits</span>.
            </h1>
            <p className={cn(
              "text-center text-lg md:text-xl max-w-2xl mx-auto mb-10 transition-colors duration-300",
              isDark ? "text-gray-400" : "text-gray-500"
            )}>
              The intelligent CRM built for modern sales teams. Capture, route, and close leads faster with one unified pipeline.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
              <button 
                onClick={() => setLeadModalOpen(true)}
                className={cn(
                  buttonVariants({ size:"lg" }), 
                  "h-12 px-8 rounded-full shadow-lg text-base transition-all duration-300 w-full sm:w-auto justify-center",
                  isDark 
                    ? "bg-white hover:bg-gray-200 text-black shadow-white/5" 
                    : "bg-gray-900 hover:bg-black text-white"
                )}
              >
                Get Demo <ArrowRight className="ml-2 size-4" />
              </button>
              <Link 
                href="#pipeline" 
                className={cn(
                  buttonVariants({ variant:"outline", size:"lg" }), 
                  "h-12 px-8 rounded-full text-base transition-all duration-300 w-full sm:w-auto justify-center",
                  isDark 
                    ? "border-gray-800 bg-black hover:bg-gray-950 text-gray-300 hover:text-white" 
                    : "border-gray-300 hover:bg-gray-50 text-gray-700"
                )}
              >
                See the Pipeline
              </Link>
            </div>
            <p className={cn(
              "text-center text-sm transition-colors duration-300",
              isDark ? "text-gray-500" : "text-gray-400"
            )}>
              Personalized walkthrough · Custom integrations · AI site visit available
            </p>

            {/* ── ANIMATED PIPELINE VISUAL ── */}
            <div id="pipeline" className="mt-20 relative max-w-5xl mx-auto">
              {/* fade bottom */}
              <div className={cn(
                "absolute bottom-0 left-0 right-0 h-24 z-10 pointer-events-none rounded-b-3xl transition-all duration-500",
                isDark 
                  ? "bg-gradient-to-t from-[#0B0F19] to-transparent" 
                  : "bg-gradient-to-t from-white to-transparent"
              )} />

              <div className={cn(
                "rounded-3xl border p-5 md:p-7 overflow-hidden transition-all duration-500 shadow-2xl",
                isDark 
                  ? "border-gray-800 bg-gray-900/40 shadow-black/80" 
                  : "border-gray-200 bg-white shadow-gray-100"
              )}>
                {/* window chrome */}
                <div className="flex items-center gap-2 mb-6">
                  <span className="size-3 rounded-full bg-red-400" />
                  <span className="size-3 rounded-full bg-yellow-400" />
                  <span className="size-3 rounded-full bg-green-400" />
                  <span className={cn(
                    "ml-4 text-xs font-mono transition-colors",
                    isDark ? "text-gray-600" : "text-gray-400"
                  )}>
                    biglead.site / pipeline
                  </span>
                </div>

                {/* Stage columns */}
                <div className="grid grid-cols-4 gap-3 relative">
                  {stages.map((s, i) => (
                    <div 
                      key={s.label} 
                      className={cn(
                        "rounded-2xl border p-3 min-h-[260px] transition-colors duration-300", 
                        isDark 
                          ? "border-gray-800/80 bg-gray-950/40" 
                          : cn(s.border, s.bg)
                      )}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <span className={cn("size-2.5 rounded-full", s.color)} />
                        <span className={cn("text-xs font-bold uppercase tracking-wide", isDark ? "text-gray-400" : s.text)}>
                          {s.label}
                        </span>
                      </div>
                      {/* skeleton cards */}
                      {[0.9, 0.5, 0.25].map((op, j) => (
                        <div 
                          key={j} 
                          className={cn(
                            "rounded-xl border p-2.5 mb-2 shadow-sm transition-colors",
                            isDark 
                              ? "bg-gray-900/60 border-gray-800/50" 
                              : "bg-white border-white/80"
                          )} 
                          style={{opacity: op}}
                        >
                          <div className={cn("h-2 rounded-full mb-1.5", i===0?"bg-blue-200 dark:bg-blue-900/40":i===1?"bg-amber-200 dark:bg-amber-900/40":i===2?"bg-violet-200 dark:bg-violet-900/40":"bg-emerald-200 dark:bg-emerald-900/40")} style={{width:`${75-j*15}%`}} />
                          <div className={cn("h-1.5 rounded-full w-1/2", isDark ? "bg-gray-800" : "bg-gray-200")} />
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
                <div className="mt-5 flex gap-1.5">
                  {stages.map((s) => (
                    <div key={s.label} className={cn("flex-1 h-1.5 rounded-full", s.color)} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section id="features" className={cn(
          "py-24 border-y transition-colors duration-500",
          isDark ? "bg-black border-gray-900" : "bg-white border-gray-100"
        )}>
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <h2 className={cn(
                "text-3xl md:text-4xl font-bold mb-3 transition-colors",
                isDark ? "text-white" : "text-gray-900"
              )}>
                Everything your sales team needs
              </h2>
              <p className={cn(
                "text-lg transition-colors",
                isDark ? "text-gray-500" : "text-gray-400"
              )}>
                From first touch to closed deal — BigLead handles the entire pipeline so your team can focus on selling.
              </p>
            </div>

            {/* Table-grid: 4 cols, 2 rows, separated by thin lines */}
            <div className={cn(
              "divide-y border rounded-2xl overflow-hidden bg-white transition-all duration-500",
              isDark 
                ? "divide-gray-900 border-gray-900 bg-black" 
                : "divide-gray-100 border-gray-100 bg-white"
            )}>
              {[
                [
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
                ],
                [
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
                ],
              ].map((row, rowIdx) => (
                <div 
                  key={rowIdx} 
                  className={cn(
                    "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x transition-colors duration-500",
                    isDark ? "divide-gray-900 sm:divide-gray-900" : "divide-gray-100 sm:divide-gray-100"
                  )}
                >
                  {row.map((item, colIdx) => (
                    <div 
                      key={colIdx} 
                      className={cn(
                        "p-8 flex flex-col gap-4 transition-colors group",
                        isDark ? "hover:bg-gray-900/40" : "hover:bg-gray-50/60"
                      )}
                    >
                      <div className={cn(
                        "transition-colors",
                        isDark ? "text-gray-600 group-hover:text-white" : "text-gray-400 group-hover:text-gray-700"
                      )}>
                        {item.icon}
                      </div>
                      <div className={cn("w-6 h-px transition-colors", isDark ? "bg-gray-800" : "bg-gray-200")} />
                      <div>
                        <h3 className={cn("font-bold text-base mb-2 transition-colors", isDark ? "text-white" : "text-gray-900")}>{item.title}</h3>
                        <p className={cn("text-sm leading-relaxed transition-colors", isDark ? "text-gray-400" : "text-gray-400")}>{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── USE CASES ── */}
        <section id="use-cases" className={cn("py-24 transition-colors duration-500", isDark ? "bg-black" : "bg-white")}>
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="flex flex-col lg:flex-row items-center gap-16">
              <div className="w-full lg:w-1/2 space-y-6">
                <div className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-colors",
                  isDark 
                    ? "bg-gray-900 border border-gray-800 text-gray-400" 
                    : "bg-gray-100 border border-gray-200 text-gray-700"
                )}>
                  Use Cases
                </div>
                <h2 className={cn("text-3xl md:text-4xl font-bold transition-colors", isDark ? "text-white" : "text-gray-900")}>
                  Built for industries that <em className="not-italic text-zinc-700 dark:text-zinc-300 font-extrabold">move fast</em>
                </h2>
                <p className={cn("text-lg transition-colors", isDark ? "text-gray-400" : "text-gray-500")}>
                  Customize fields, stages, and automation rules for your specific niche.
                </p>
                <div className="space-y-3 pt-2">
                  {[
                    { icon: Building2, title: "Real Estate",  desc: "Track site visits, inventory preferences & broker networks.", s: stages[0] },
                    { icon: Briefcase, title: "B2B Agencies", desc: "Manage client onboarding, discovery & contract negotiations.", s: stages[2] },
                    { icon: Car,       title: "Automotive",   desc: "Handle test drive bookings, financing stages & handovers.",  s: stages[3] },
                  ].map((uc, i) => (
                    <div 
                      key={i} 
                      className={cn(
                        "flex gap-4 p-5 rounded-2xl border transition-all duration-300 hover:shadow-md", 
                        isDark 
                          ? "border-gray-800 bg-gray-900/40 hover:bg-gray-900/60" 
                          : cn(uc.s.border, uc.s.bg)
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
                    </div>
                  ))}
                </div>
              </div>

              {/* Ingestion Flow Connectivity Visual */}
              <div className="w-full lg:w-1/2 flex justify-center items-center">
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
              </div>
            </div>
          </div>
        </section>

        {/* ── AI VOICE & SITE VISIT FLOW ── */}
        <section id="ai-voice" className={cn("py-24 transition-colors", isDark ? "bg-black" : "bg-white")}>
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-sm font-semibold mb-4 border border-blue-200 dark:border-blue-900/30">
                <Bot className="size-4" /> AI Voice Calling
              </div>
              <h2 className={cn("text-3xl md:text-5xl font-bold mb-4 transition-colors", isDark ? "text-white" : "text-gray-900")}>
                Convert leads on autopilot with <em className="not-italic text-zinc-500">human-like AI</em>
              </h2>
              <p className={cn("text-lg transition-colors", isDark ? "text-gray-400" : "text-gray-500")}>
                Our AI Voice Agent calls leads instantly, qualifies them, and books site visits directly into your calendar. Watch the flow below.
              </p>
            </div>

            <div className={cn(
              "relative p-8 md:p-16 rounded-3xl border overflow-hidden",
              isDark ? "bg-gray-900/20 border-gray-800 shadow-xl" : "bg-gray-50 border-gray-200 shadow-lg"
            )}>
              {/* Desktop Connecting Line */}
              <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-gray-200 dark:bg-gray-800 -translate-y-1/2" />
              
              {/* Animated dot on the line */}
              <div className="hidden md:block absolute top-1/2 left-0 size-3 bg-blue-500 rounded-full -translate-y-1/2 shadow-[0_0_12px_rgba(59,130,246,0.8)]" style={{ animation: "slideRight 4s infinite cubic-bezier(0.4,0,0.2,1)" }} />

              <div className="relative flex flex-col md:flex-row items-center justify-between gap-12 md:gap-4 z-10">
                
                {/* Step 1: Lead Capture */}
                <div className={cn(
                  "flex flex-col items-center text-center p-6 rounded-2xl w-full md:w-1/3 transition-all relative z-10",
                  isDark ? "bg-black border border-gray-800 shadow-xl" : "bg-white border shadow-lg"
                )}>
                  <div className="size-16 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 flex items-center justify-center mb-4 border border-emerald-200 dark:border-emerald-800">
                    <Users className="size-8" />
                  </div>
                  <h3 className={cn("text-xl font-bold mb-2 transition-colors", isDark ? "text-white" : "text-gray-900")}>1. Lead Captured</h3>
                  <p className={cn("text-sm transition-colors", isDark ? "text-gray-400" : "text-gray-500")}>
                    Lead enters via Facebook, Google Ads, or your website.
                  </p>
                </div>

                {/* Step 2: AI Voice Agent */}
                <div className={cn(
                  "flex flex-col items-center text-center p-6 rounded-2xl w-full md:w-1/3 transition-all relative border-2 border-blue-500/50 md:scale-110 z-20",
                  isDark ? "bg-gray-900 shadow-2xl shadow-blue-900/20" : "bg-blue-50 shadow-2xl shadow-blue-200/50"
                )} style={{ animation: "float-up-down 4s ease-in-out infinite" }}>
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-md whitespace-nowrap">
                    Instant Call
                  </div>
                  <div className="size-16 rounded-full bg-blue-600 text-white flex items-center justify-center mb-4" style={{ animation: "call-wave 2s infinite" }}>
                    <Mic className="size-8" />
                  </div>
                  <h3 className={cn("text-xl font-bold mb-2 transition-colors", isDark ? "text-white" : "text-gray-900")}>2. AI Voice Agent</h3>
                  <p className={cn("text-sm transition-colors", isDark ? "text-gray-400" : "text-gray-500")}>
                    "Hi, this is Alex! I noticed you were interested in our new project. Would you like to schedule a site visit?"
                  </p>
                </div>

                {/* Step 3: Site Visit Booked */}
                <div className={cn(
                  "flex flex-col items-center text-center p-6 rounded-2xl w-full md:w-1/3 transition-all relative z-10",
                  isDark ? "bg-black border border-gray-800 shadow-xl" : "bg-white border shadow-lg"
                )}>
                  <div className="size-16 rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 flex items-center justify-center mb-4 border border-amber-200 dark:border-amber-800">
                    <MapPin className="size-8" />
                  </div>
                  <h3 className={cn("text-xl font-bold mb-2 transition-colors", isDark ? "text-white" : "text-gray-900")}>3. Site Visit Booked</h3>
                  <p className={cn("text-sm transition-colors", isDark ? "text-gray-400" : "text-gray-500")}>
                    Meeting added to calendar and sales rep notified instantly.
                  </p>
                </div>

              </div>
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
            <div className="text-center max-w-2xl mx-auto mb-16">
              <div className={cn(
                "inline-flex items-center gap-1.5 mb-4 px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider transition-colors",
                isDark ? "bg-gray-900/80 border-gray-800 text-gray-400" : "bg-white/10 border border-white/20 text-gray-300"
              )}>
                Pricing
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-3">Simple, transparent pricing</h2>
              <p className="text-gray-400 text-lg">Start for free, upgrade when you're ready. No hidden fees.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto items-center">
              {[
                { 
                  name: "Basic", price: "$9", period: "/mo", desc: "For individuals getting started.", 
                  features: [
                    { text: "3 team members", included: true },
                    { text: "Website leads only", included: true },
                    { text: "CSV import", included: true },
                    { text: "Unlimited leads", included: true },
                    { text: "No pipeline", included: false },
                    { text: "No ad webhooks", included: false },
                    { text: "24hr support", included: true }
                  ], 
                  accent: isDark ? "border-gray-800" : "border-gray-700",
                  cta: "Get Demo"
                },
                { 
                  name: "Pro", price: "$19", period: "/mo", desc: "For growing teams needing automation.", popular: true, 
                  features: [
                    { text: "Unlimited team members", included: true },
                    { text: "All webhooks (Zapier, Google Ads, etc.)", included: true },
                    { text: "CSV import", included: true },
                    { text: "Unlimited leads", included: true },
                    { text: "Full pipeline", included: true },
                    { text: "No AI calling", included: false },
                    { text: "12hr support", included: true }
                  ], 
                  accent: "border-white dark:border-zinc-500 shadow-zinc-900/40",
                  cta: "Get Demo"
                },
                { 
                  name: "Enterprise", price: "Custom", desc: "For large, complex organisations.", 
                  features: [
                    { text: "Unlimited everything", included: true },
                    { text: "AI site visit available", included: true },
                    { text: "Dedicated support", included: true },
                    { text: "Custom integrations", included: true }
                  ], 
                  accent: isDark ? "border-gray-800" : "border-gray-700",
                  cta: "Contact Sales"
                },
              ].map((tier, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "rounded-3xl p-8 flex flex-col relative border transition-all duration-300", 
                    tier.popular 
                      ? "bg-gradient-to-b from-zinc-900 to-black border-white dark:border-zinc-700 shadow-2xl py-12 md:scale-105 z-10" 
                      : isDark 
                        ? "bg-gray-900/40 hover:bg-gray-900/60 border-gray-850 hover:border-gray-700" 
                        : "bg-gray-905 hover:border-gray-600 border-gray-700",
                    tier.accent
                  )}
                >
                  {tier.popular && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white text-black text-[10px] font-bold px-4 py-1.5 rounded-full uppercase tracking-wider shadow border border-gray-200">
                      Most Popular
                    </div>
                  )}
                  <h3 className="text-xl font-bold mb-1">{tier.name}</h3>
                  <p className="text-sm text-gray-400 mb-5 h-9">{tier.desc}</p>
                  <div className="flex items-baseline mb-7">
                    <span className="text-4xl font-bold">{tier.price}</span>
                    {tier.period && <span className="text-gray-400 ml-1 text-sm">{tier.period}</span>}
                  </div>
                  <ul className="space-y-3 mb-8 flex-1">
                    {tier.features.map((f, j) => (
                      <li key={j} className={cn("flex items-start gap-2.5 text-sm", !f.included && "opacity-60")}>
                        {f.included 
                          ? <CheckCircle2 className="size-4 shrink-0 text-emerald-400 mt-0.5" /> 
                          : <X className="size-4 shrink-0 text-gray-500 mt-0.5" />}
                        <span className={cn(tier.popular ? "text-gray-100" : "text-gray-300", !f.included && "text-gray-500 line-through decoration-gray-600")}>
                          {f.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <button 
                    onClick={() => setLeadModalOpen(true)}
                    className={cn(
                      buttonVariants({ size:"lg" }), 
                      "w-full rounded-full text-sm font-semibold transition-all", 
                      tier.popular 
                        ? "bg-white hover:bg-gray-100 text-black font-extrabold shadow-md shadow-white/5" 
                        : isDark
                          ? "bg-gray-800 hover:bg-gray-750 text-white border border-gray-700/60"
                          : "bg-gray-800 hover:bg-gray-750 text-white border border-gray-750"
                    )}
                  >
                    {tier.cta}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── BOTTOM CTA ── */}
        <section className={cn(
          "py-24 border-t transition-colors duration-500",
          isDark ? "bg-black border-gray-900" : "bg-white border-gray-100"
        )}>
          <div className="container mx-auto px-4 max-w-3xl text-center">
            <div className="flex justify-center gap-2 mb-6">
              {stages.map(s => <span key={s.label} className={cn("size-3 rounded-full", s.color)} />)}
            </div>
            <h2 className={cn("text-4xl font-bold mb-4 transition-colors", isDark ? "text-white" : "text-gray-900")}>
              Ready to transform your pipeline?
            </h2>
            <p className={cn("text-lg mb-10 transition-colors", isDark ? "text-gray-400" : "text-gray-500")}>
              Join thousands of high-performing teams using BigLead to close deals faster.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button 
                onClick={() => setLeadModalOpen(true)}
                className={cn(
                  buttonVariants({ size:"lg" }), 
                  "h-14 px-10 text-lg rounded-full shadow-xl transition-all duration-300",
                  isDark 
                    ? "bg-white hover:bg-gray-200 text-black shadow-white/5" 
                    : "bg-gray-900 hover:bg-black text-white"
                )}
              >
                Get Demo
              </button>
              <Link 
                href="#pricing" 
                className={cn(
                  buttonVariants({ variant:"outline", size:"lg" }), 
                  "h-14 px-10 text-lg rounded-full transition-all duration-300",
                  isDark 
                    ? "border-gray-800 bg-black hover:bg-gray-950 text-gray-300 hover:text-white" 
                    : "border-gray-300 hover:bg-gray-50 text-gray-700"
                )}
              >
                View Pricing
              </Link>
            </div>
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
              {/* pipeline colour dots */}
              <div className="flex gap-2 mt-5">
                {stages.map(s => <span key={s.label} title={s.label} className={cn("size-3 rounded-full cursor-default", s.color)} />)}
              </div>
            </div>
            {[
              { title:"Product",   links:["Features","Pricing","Integrations","Changelog"] },
              { title:"Resources", links:["Documentation","Blog","Help Center","Contact"] },
              { title:"Legal",     links:["Privacy Policy","Terms","Security","Cookies"] },
            ].map(col => (
              <div key={col.title}>
                <h4 className={cn("font-bold mb-4 text-sm transition-colors", isDark ? "text-gray-300" : "text-gray-900")}>{col.title}</h4>
                <ul className="space-y-2.5">
                  {col.links.map(l => (
                    <li key={l}>
                      <a href="#" className={cn("text-sm transition-colors", isDark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900")}>
                        {l}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className={cn("pt-6 border-t flex items-center justify-between flex-wrap gap-4 transition-colors", isDark ? "border-gray-900" : "border-gray-100")}>
            <p className={cn("text-xs transition-colors", isDark ? "text-gray-500" : "text-gray-400")}>
              © {new Date().getFullYear()} BigLead Inc. All rights reserved.
            </p>
            <div className="flex gap-3">
              {stages.map(s => (
                <span 
                  key={s.label} 
                  className={cn(
                    "text-[9px] font-bold px-2.5 py-1 rounded-full border transition-colors", 
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
