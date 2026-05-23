import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { LoginForm } from "./login-form";
import { 
  Building, 
  ShieldCheck, 
  KeyRound, 
  ArrowRight,
  Sparkles
} from "lucide-react";

export const metadata = {
  title: "Log In — BigLead CRM",
  description: "Sign in to your BigLead CRM account",
};

export default function LoginPage() {
  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-white overflow-hidden p-4 sm:p-6">
      {/* Spectacular modern dot-grid backdrop */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-80 pointer-events-none" />
      
      {/* Soft glowing ambient circles */}
      <div className="absolute top-[-15%] left-[-10%] w-[550px] h-[550px] rounded-full bg-indigo-100/35 blur-[110px] pointer-events-none animate-pulse" style={{ animationDuration: '9s' }} />
      <div className="absolute bottom-[-15%] right-[-10%] w-[600px] h-[600px] rounded-full bg-sky-100/45 blur-[120px] pointer-events-none animate-pulse" style={{ animationDuration: '12s' }} />

      {/* Main card wrapper */}
      <div className="w-full max-w-[420px] z-10 space-y-6">
        {/* Branding header */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-1.5 justify-center">
            <span className="text-3xl font-black tracking-tight text-zinc-900">
              BigLead<span className="text-zinc-500">CRM</span>
            </span>
          </Link>
          <p className="text-xs text-zinc-500 font-medium">India&apos;s leading automated CRM for real estate sales</p>
        </div>

        {/* Card containing login form */}
        <Card className="border border-zinc-150 shadow-xl/10 bg-white/80 backdrop-blur-md rounded-2xl p-6 sm:p-8 space-y-6 hover:shadow-xl/15 transition-all duration-300">
          <div className="space-y-1.5 text-center sm:text-left">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-zinc-900">
              Welcome Back
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 leading-relaxed">
              Sign in to manage lead pipelines, site visits, and workspace tasks.
            </p>
          </div>

          <LoginForm />

          <div className="border-t border-zinc-100 pt-5 text-center">
            <p className="text-xs text-zinc-500">
              Don&apos;t have an account?{" "}
              <Link
                href="/signup"
                className="text-zinc-900 font-bold hover:text-indigo-600 transition-colors"
              >
                Sign up
              </Link>
            </p>
          </div>
        </Card>

        {/* Dynamic trust signals footer */}
        <div className="flex items-center justify-between text-[11px] text-zinc-400 px-2">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="size-3.5 text-emerald-500" />
            <span>SSL Secured mandating</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Building className="size-3.5 text-zinc-400" />
            <span>BigLead CRM &copy; 2026</span>
          </div>
        </div>
      </div>
    </div>
  );
}
