"use client";

import { useState } from "react";
import { completeOnboarding, type OnboardingData } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Loader2,
  User,
  Building2,
  Globe,
  Zap,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Phone,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { label: "You", icon: User },
  { label: "Company", icon: Building2 },
  { label: "Preferences", icon: Globe },
  { label: "Pipeline", icon: Zap },
  { label: "Ready!", icon: CheckCircle2 },
];

const INDUSTRIES = [
  "Real Estate",
  "Construction",
  "Interior Design",
  "Architecture",
  "Property Management",
  "Insurance",
  "Financial Services",
  "Automotive",
  "Education",
  "Healthcare",
  "Other",
];

const TEAM_SIZES = ["Just me", "2-5", "6-15", "16-50", "50+"];

const LEAD_SOURCES = [
  "Website Forms",
  "Facebook Ads",
  "Google Ads",
  "Referrals",
  "MagicBricks",
  "99acres",
  "Housing.com",
  "Walk-ins",
  "Cold Calls",
  "WhatsApp",
];

const DEFAULT_STAGES = [
  "New Lead",
  "Contacted",
  "Qualified",
  "Site Visit Scheduled",
  "Site Visit Done",
  "Negotiation",
  "Won",
  "Lost",
];

const TIMEZONES = [
  { value: "Asia/Kolkata", label: "🇮🇳 India (IST)" },
  { value: "America/New_York", label: "🇺🇸 Eastern (EST)" },
  { value: "America/Chicago", label: "🇺🇸 Central (CST)" },
  { value: "America/Los_Angeles", label: "🇺🇸 Pacific (PST)" },
  { value: "Europe/London", label: "🇬🇧 London (GMT)" },
  { value: "Asia/Dubai", label: "🇦🇪 Dubai (GST)" },
  { value: "Asia/Singapore", label: "🇸🇬 Singapore (SGT)" },
  { value: "Australia/Sydney", label: "🇦🇺 Sydney (AEST)" },
];

const CURRENCIES = [
  { value: "INR", label: "₹ INR" },
  { value: "USD", label: "$ USD" },
  { value: "EUR", label: "€ EUR" },
  { value: "GBP", label: "£ GBP" },
  { value: "AED", label: "د.إ AED" },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [isPending, setIsPending] = useState(false);
  const [form, setForm] = useState<OnboardingData>({
    firstName: "",
    lastName: "",
    companyName: "",
    industry: "",
    teamSize: "",
    phone: "",
    timezone: "Asia/Kolkata",
    currency: "INR",
    leadSources: [],
    pipelineStages: [...DEFAULT_STAGES],
  });

  const update = (key: keyof OnboardingData, val: any) =>
    setForm((f) => ({ ...f, [key]: val }));

  const toggleSource = (src: string) => {
    setForm((f) => ({
      ...f,
      leadSources: f.leadSources.includes(src)
        ? f.leadSources.filter((s) => s !== src)
        : [...f.leadSources, src],
    }));
  };

  const toggleStage = (stage: string) => {
    setForm((f) => ({
      ...f,
      pipelineStages: f.pipelineStages.includes(stage)
        ? f.pipelineStages.filter((s) => s !== stage)
        : [...f.pipelineStages, stage],
    }));
  };

  const canNext = () => {
    if (step === 0) return form.firstName.trim().length >= 2;
    if (step === 1) return form.companyName.trim().length >= 2 && form.industry;
    return true;
  };

  const handleFinish = async () => {
    setIsPending(true);
    const result = await completeOnboarding(form);
    if (result?.error) {
      toast.error(result.error);
      setIsPending(false);
    } else if (result?.success) {
      toast.success(result.success);
    }
  };

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="flex items-center justify-center min-h-screen px-4 bg-gradient-to-br from-gray-50 via-white to-blue-50 absolute inset-0 z-50">
      <div className="w-full max-w-[520px] space-y-6">
        {/* Progress bar */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            {STEPS.map((s, i) => (
              <div
                key={s.label}
                className={cn(
                  "flex items-center gap-1.5 text-xs font-medium transition-colors",
                  i <= step ? "text-gray-900" : "text-gray-300"
                )}
              >
                <div
                  className={cn(
                    "flex items-center justify-center size-7 rounded-full text-xs font-bold transition-all",
                    i < step
                      ? "bg-green-500 text-white"
                      : i === step
                      ? "bg-gray-900 text-white scale-110"
                      : "bg-gray-200 text-gray-400"
                  )}
                >
                  {i < step ? (
                    <CheckCircle2 className="size-4" />
                  ) : (
                    <s.icon className="size-3.5" />
                  )}
                </div>
                <span className="hidden sm:inline">{s.label}</span>
              </div>
            ))}
          </div>
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gray-900 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Card */}
        <Card className="border-gray-200 shadow-lg">
          <CardContent className="pt-6 pb-6">
            {/* Step 0: Personal Info */}
            {step === 0 && (
              <div className="space-y-5">
                <div className="text-center space-y-1">
                  <h2 className="text-xl font-bold text-gray-900">Welcome to RealLeads! 🎉</h2>
                  <p className="text-sm text-gray-500">Tell us about yourself</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={form.firstName}
                      onChange={(e) => update("firstName", e.target.value)}
                      placeholder="Amul"
                      className="h-10"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={form.lastName}
                      onChange={(e) => update("lastName", e.target.value)}
                      placeholder="Sharma"
                      className="h-10"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="phone" className="flex items-center gap-1.5">
                    <Phone className="size-3.5" /> Phone Number
                  </Label>
                  <Input
                    id="phone"
                    value={form.phone}
                    onChange={(e) => update("phone", e.target.value)}
                    placeholder="+91 98765 43210"
                    className="h-10"
                  />
                </div>
              </div>
            )}

            {/* Step 1: Company Info */}
            {step === 1 && (
              <div className="space-y-5">
                <div className="text-center space-y-1">
                  <h2 className="text-xl font-bold text-gray-900">Your Company</h2>
                  <p className="text-sm text-gray-500">Set up your workspace</p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="companyName">Company Name *</Label>
                  <Input
                    id="companyName"
                    value={form.companyName}
                    onChange={(e) => update("companyName", e.target.value)}
                    placeholder="e.g. RealVibe Realty"
                    className="h-10"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Industry *</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {INDUSTRIES.map((ind) => (
                      <button
                        key={ind}
                        type="button"
                        onClick={() => update("industry", ind)}
                        className={cn(
                          "px-3 py-2 rounded-lg border text-sm text-left transition-all",
                          form.industry === ind
                            ? "border-gray-900 bg-gray-900 text-white"
                            : "border-gray-200 hover:border-gray-400 text-gray-700"
                        )}
                      >
                        {ind}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Team Size</Label>
                  <div className="flex gap-2 flex-wrap">
                    {TEAM_SIZES.map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => update("teamSize", size)}
                        className={cn(
                          "px-4 py-2 rounded-lg border text-sm transition-all",
                          form.teamSize === size
                            ? "border-gray-900 bg-gray-900 text-white"
                            : "border-gray-200 hover:border-gray-400 text-gray-700"
                        )}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Preferences */}
            {step === 2 && (
              <div className="space-y-5">
                <div className="text-center space-y-1">
                  <h2 className="text-xl font-bold text-gray-900">Preferences</h2>
                  <p className="text-sm text-gray-500">Customize your workspace</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="timezone" className="flex items-center gap-1.5">
                      <Globe className="size-3.5" /> Timezone
                    </Label>
                    <select
                      id="timezone"
                      value={form.timezone}
                      onChange={(e) => update("timezone", e.target.value)}
                      className="h-10 rounded-md border border-gray-200 bg-white px-3 text-sm"
                    >
                      {TIMEZONES.map((tz) => (
                        <option key={tz.value} value={tz.value}>{tz.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="currency">Currency</Label>
                    <select
                      id="currency"
                      value={form.currency}
                      onChange={(e) => update("currency", e.target.value)}
                      className="h-10 rounded-md border border-gray-200 bg-white px-3 text-sm"
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Where do your leads come from?</Label>
                  <p className="text-xs text-gray-400">Select all that apply</p>
                  <div className="grid grid-cols-2 gap-2">
                    {LEAD_SOURCES.map((src) => (
                      <button
                        key={src}
                        type="button"
                        onClick={() => toggleSource(src)}
                        className={cn(
                          "px-3 py-2 rounded-lg border text-sm text-left transition-all",
                          form.leadSources.includes(src)
                            ? "border-blue-500 bg-blue-50 text-blue-700"
                            : "border-gray-200 hover:border-gray-400 text-gray-700"
                        )}
                      >
                        {form.leadSources.includes(src) ? "✓ " : ""}{src}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Pipeline */}
            {step === 3 && (
              <div className="space-y-5">
                <div className="text-center space-y-1">
                  <h2 className="text-xl font-bold text-gray-900">Sales Pipeline</h2>
                  <p className="text-sm text-gray-500">
                    Select the stages leads will flow through. You can customize later.
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  {DEFAULT_STAGES.map((stage, i) => (
                    <button
                      key={stage}
                      type="button"
                      onClick={() => toggleStage(stage)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-2.5 rounded-lg border text-sm transition-all",
                        form.pipelineStages.includes(stage)
                          ? "border-green-500 bg-green-50 text-green-800"
                          : "border-gray-200 text-gray-400 line-through"
                      )}
                    >
                      <span className={cn(
                        "flex items-center justify-center size-6 rounded-full text-xs font-bold",
                        form.pipelineStages.includes(stage)
                          ? "bg-green-500 text-white"
                          : "bg-gray-200 text-gray-400"
                      )}>
                        {i + 1}
                      </span>
                      {stage}
                      {form.pipelineStages.includes(stage) && (
                        <CheckCircle2 className="size-4 ml-auto text-green-600" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 4: Review & Launch */}
            {step === 4 && (
              <div className="space-y-5">
                <div className="text-center space-y-2">
                  <div className="flex justify-center">
                    <Sparkles className="size-10 text-yellow-500" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">You&apos;re All Set!</h2>
                  <p className="text-sm text-gray-500">
                    Here&apos;s a summary of your workspace
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-500">Name</span>
                    <span className="text-sm font-medium text-gray-900">
                      {form.firstName} {form.lastName}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-500">Company</span>
                    <span className="text-sm font-medium text-gray-900">{form.companyName}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-500">Industry</span>
                    <span className="text-sm font-medium text-gray-900">{form.industry}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-500">Team Size</span>
                    <span className="text-sm font-medium text-gray-900">{form.teamSize || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-500">Pipeline Stages</span>
                    <span className="text-sm font-medium text-gray-900">
                      {form.pipelineStages.length} stages
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-500">Lead Sources</span>
                    <span className="text-sm font-medium text-gray-900">
                      {form.leadSources.length > 0 ? form.leadSources.length + " selected" : "—"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center gap-3 mt-6">
              {step > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 h-10"
                  onClick={() => setStep(step - 1)}
                  disabled={isPending}
                >
                  <ArrowLeft className="size-4 mr-1.5" />
                  Back
                </Button>
              )}
              {step < STEPS.length - 1 ? (
                <Button
                  type="button"
                  className="flex-1 h-10"
                  onClick={() => setStep(step + 1)}
                  disabled={!canNext()}
                >
                  Next
                  <ArrowRight className="size-4 ml-1.5" />
                </Button>
              ) : (
                <Button
                  type="button"
                  className="flex-1 h-10 bg-green-600 hover:bg-green-700"
                  onClick={handleFinish}
                  disabled={isPending}
                >
                  {isPending ? (
                    <>
                      <Loader2 className="size-4 mr-1.5 animate-spin" />
                      Creating Workspace...
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-4 mr-1.5" />
                      Launch Workspace
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Skip link */}
        {step > 1 && step < 4 && (
          <p className="text-center">
            <button
              type="button"
              className="text-xs text-gray-400 hover:text-gray-600 underline"
              onClick={() => setStep(4)}
            >
              Skip to finish
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
