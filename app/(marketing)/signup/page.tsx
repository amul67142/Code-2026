import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { SignupForm } from "./signup-form";
import { 
  UserPlus, 
  Sparkles, 
  CreditCard, 
  Compass, 
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Building
} from "lucide-react";

export const metadata = {
  title: "Sign Up — BigLead CRM",
  description: "Create your BigLead CRM account to get started.",
};

export default function SignupPage() {
  return (
    <div className="flex min-h-screen bg-white overflow-hidden">
      {/* LEFT COLUMN: Visual & Steps Panel (Hidden on mobile/tablet) */}
      <div className="hidden lg:flex lg:w-[45%] bg-zinc-950 text-white flex-col justify-between p-12 relative overflow-hidden border-r border-zinc-900">
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:3rem_3rem] opacity-20 pointer-events-none" />
        
        {/* Ambient background glows */}
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none" />
        <div className="absolute top-1/2 -right-40 w-96 h-96 rounded-full bg-indigo-600/10 blur-[100px] pointer-events-none" />
        
        {/* Header Logo */}
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="text-2xl font-black tracking-tight text-white">
              BigLead<span className="text-indigo-400">CRM</span>
            </span>
          </Link>
        </div>

        {/* Steps Content */}
        <div className="relative z-10 my-auto py-12 space-y-10">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-300 text-[10px] font-bold tracking-widest uppercase border border-indigo-500/20">
              Workspace Setup
            </span>
            <h2 className="text-3xl font-extrabold tracking-tight leading-tight text-zinc-100">
              4 Steps to Launch Your CRM Engine 🚀
            </h2>
            <p className="text-sm text-zinc-400 max-w-md">
              Complete the registration and subscription to unlock your automated real estate lead dashboard.
            </p>
          </div>

          {/* Timeline Steps */}
          <div className="space-y-6 relative before:absolute before:left-5 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-800">
            {/* Step 1: Active */}
            <div className="relative flex gap-5 items-start group">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/20 z-10 border border-indigo-400/20 transition-all duration-300">
                <UserPlus className="size-4" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-zinc-100 tracking-wide">Step 1: Account Creation</h4>
                  <span className="inline-flex px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[9px] font-bold border border-indigo-500/20">
                    Current
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 max-w-sm">
                  Register with your work email, password, and contact phone number to claim your workspace.
                </p>
              </div>
            </div>

            {/* Step 2: Pending */}
            <div className="relative flex gap-5 items-start group">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-500 font-bold border border-zinc-800 z-10 transition-all duration-300">
                <Sparkles className="size-4" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-zinc-400 tracking-wide transition-colors duration-300 group-hover:text-zinc-300">Step 2: Plan Selection</h4>
                <p className="text-[11px] text-zinc-500 max-w-sm">
                  Choose the high-performance lead volume tier that fits your sales team.
                </p>
              </div>
            </div>

            {/* Step 3: Pending */}
            <div className="relative flex gap-5 items-start group">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-500 font-bold border border-zinc-800 z-10 transition-all duration-300">
                <CreditCard className="size-4" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-zinc-400 tracking-wide transition-colors duration-300 group-hover:text-zinc-300">Step 3: Secure Activation</h4>
                <p className="text-[11px] text-zinc-500 max-w-sm">
                  Setup dynamic recurring monthly subscription securely processed via Razorpay.
                </p>
              </div>
            </div>

            {/* Step 4: Pending */}
            <div className="relative flex gap-5 items-start group">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-500 font-bold border border-zinc-800 z-10 transition-all duration-300">
                <Compass className="size-4" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-zinc-400 tracking-wide transition-colors duration-300 group-hover:text-zinc-300">Step 4: Interactive Onboarding</h4>
                <p className="text-[11px] text-zinc-500 max-w-sm">
                  Configure your domain name, custom pipelines, and connect lead acquisition channels.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer badges */}
        <div className="relative z-10 border-t border-zinc-900 pt-6 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <ShieldCheck className="size-4 text-emerald-400 shrink-0" />
            <span>SSL Secured checkout & real-time webhook sync</span>
          </div>
          <div className="text-[10px] text-zinc-600">
            &copy; 2026 BigLead CRM. Advanced agentic lead scoring & automation.
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Form Panel with Spectacular Backdrops */}
      <div className="w-full lg:w-[55%] flex items-center justify-center p-6 sm:p-12 min-h-screen relative bg-white">
        {/* Spectacular modern dot-grid backdrop */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-80 pointer-events-none" />
        
        {/* Soft glowing ambient circles */}
        <div className="absolute top-[-10%] left-[-5%] w-[450px] h-[450px] rounded-full bg-indigo-100/30 blur-[100px] pointer-events-none animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-sky-100/40 blur-[110px] pointer-events-none animate-pulse" style={{ animationDuration: '10s' }} />

        {/* Signup form container */}
        <div className="w-full max-w-[420px] z-10 space-y-6">
          {/* Logo visible only on mobile/tablet */}
          <div className="lg:hidden text-center space-y-2 mb-6">
            <Link href="/" className="inline-flex items-center gap-1.5 justify-center">
              <span className="text-3xl font-black tracking-tight text-zinc-900">
                BigLead<span className="text-zinc-500">CRM</span>
              </span>
            </Link>
            <p className="text-xs text-zinc-500 font-medium">Capture, engage, and close real estate leads</p>
          </div>

          {/* Form Card */}
          <Card className="border border-zinc-150 shadow-xl/10 bg-white/80 backdrop-blur-md rounded-2xl p-6 sm:p-8 space-y-6 hover:shadow-xl/15 transition-all duration-300">
            <div className="space-y-1.5 text-center sm:text-left">
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-zinc-900">
                Create Your Account
              </h1>
              <p className="text-xs sm:text-sm text-zinc-500 leading-relaxed">
                Step 1 of 4: Access India&apos;s premium automated real estate sales suite.
              </p>
            </div>

            <SignupForm />

            <div className="border-t border-zinc-100 pt-5 text-center">
              <p className="text-xs text-zinc-500">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="text-zinc-900 font-bold hover:text-indigo-600 transition-colors"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </Card>

          {/* Trust points */}
          <div className="grid grid-cols-2 gap-4 text-center sm:text-left pt-2">
            <div className="space-y-1">
              <h5 className="text-[11px] font-bold text-zinc-700">🔒 Premium Privacy</h5>
              <p className="text-[10px] text-zinc-400 leading-relaxed">GDPR-compliant security pipelines.</p>
            </div>
            <div className="space-y-1">
              <h5 className="text-[11px] font-bold text-zinc-700">⚡ Live Synchronization</h5>
              <p className="text-[10px] text-zinc-400 leading-relaxed">Instant dashboard routing post payment.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
