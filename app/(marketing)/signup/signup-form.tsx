"use client";

import { useState, useTransition } from "react";
import { signup } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";

export function SignupForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  
  // Phone, Password Toggle, and Validation states
  const [countryCode, setCountryCode] = useState("+91");
  const [customCode, setCustomCode] = useState("+");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const getPlaceholder = (code: string) => {
    switch (code) {
      case "+91": return "98765 43210";
      case "+1":
      case "+1-CA": return "555 123 4567";
      case "+44": return "7123 456789";
      case "+61": return "412 345 678";
      case "+971": return "50 123 4567";
      default: return "Phone number";
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationError(null);

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    // 1. Email Format Validation
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      setValidationError("Please enter a valid work email address.");
      return;
    }

    // 2. Password Strength Validation (at least 8 chars, 1 letter, 1 number)
    if (password.length < 8) {
      setValidationError("Password must be at least 8 characters long.");
      return;
    }
    const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d)/;
    if (!passwordPattern.test(password)) {
      setValidationError("Password must contain at least one letter and one number.");
      return;
    }

    // 3. Phone Number Validation
    const digitsOnly = phoneNumber.replace(/\D/g, "");
    if (!digitsOnly) {
      setValidationError("Please enter a valid phone number.");
      return;
    }

    const actualPrefix = countryCode === "custom" ? customCode.trim() : countryCode.replace("-CA", "");
    
    // Check if custom code starts with '+'
    if (countryCode === "custom" && !actualPrefix.startsWith("+")) {
      setValidationError("Custom country prefix must start with '+'.");
      return;
    }
    
    // Validate custom code has digits
    if (countryCode === "custom" && actualPrefix.replace("+", "").length === 0) {
      setValidationError("Please specify a valid custom country prefix.");
      return;
    }

    // Standard country-specific constraints
    if (actualPrefix === "+91" && digitsOnly.length !== 10) {
      setValidationError("Indian phone numbers must be exactly 10 digits.");
      return;
    }
    if (actualPrefix === "+1" && digitsOnly.length !== 10) {
      setValidationError("US & Canadian phone numbers must be exactly 10 digits.");
      return;
    }
    if (digitsOnly.length < 7 || digitsOnly.length > 15) {
      setValidationError("Phone number length must be between 7 and 15 digits.");
      return;
    }

    const fullPhone = `${actualPrefix}${digitsOnly}`;
    formData.set("phone", fullPhone);

    startTransition(async () => {
      const result = await signup(formData);
      if (result?.error) {
        toast.error(result.error);
        setValidationError(result.error);
      } else if (result?.success) {
        toast.success(result.success);
        router.push("/login?message=Check your email to continue");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Email Field */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email" className="text-sm text-gray-700">
          Work Email
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="you@company.com"
          className="h-9"
          required
          disabled={isPending}
        />
      </div>

      {/* Phone Field with Country Code Selection */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="phone-input" className="text-sm text-gray-700">
          Phone Number
        </Label>
        <div className="flex gap-2">
          <select
            value={countryCode}
            onChange={(e) => {
              setCountryCode(e.target.value);
              setValidationError(null);
            }}
            disabled={isPending}
            className="h-9 px-2 rounded-md border border-gray-200 bg-white text-xs font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950 shrink-0 max-w-[125px]"
          >
            <option value="+91">🇮🇳 IN (+91)</option>
            <option value="+1">🇺🇸 US (+1)</option>
            <option value="+1-CA">🇨🇦 CA (+1)</option>
            <option value="+44">🇬🇧 UK (+44)</option>
            <option value="+61">🇦🇺 AU (+61)</option>
            <option value="+971">🇦🇪 AE (+971)</option>
            <option value="+65">🇸🇬 SG (+65)</option>
            <option value="+966">🇸🇦 SA (+966)</option>
            <option value="+49">🇩🇪 DE (+49)</option>
            <option value="+33">🇫🇷 FR (+33)</option>
            <option value="custom">🌐 Other</option>
          </select>
          
          {countryCode === "custom" && (
            <input
              type="text"
              placeholder="+Code"
              value={customCode}
              onChange={(e) => {
                const val = e.target.value;
                // Keep only '+' at start, followed by digits
                const clean = val.startsWith("+") ? "+" + val.slice(1).replace(/\D/g, "") : "+" + val.replace(/\D/g, "");
                setCustomCode(clean);
                setValidationError(null);
              }}
              className="h-9 w-[65px] px-2 rounded-md border border-gray-200 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-zinc-950 shrink-0"
              required
              disabled={isPending}
            />
          )}

          <Input
            id="phone-input"
            type="tel"
            placeholder={getPlaceholder(countryCode)}
            value={phoneNumber}
            onChange={(e) => {
              // Keep only digits, spaces, dashes
              const clean = e.target.value.replace(/[^0-9\s-]/g, '');
              setPhoneNumber(clean);
              setValidationError(null);
            }}
            className="h-9 flex-1"
            required
            disabled={isPending}
          />
        </div>
      </div>

      {/* Password Field with Show/Hide toggle */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password" className="text-sm text-gray-700">
          Password
        </Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="Min 8 chars, 1 letter, 1 number"
            className="h-9 pr-10"
            required
            disabled={isPending}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            disabled={isPending}
            tabIndex={-1}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors focus:outline-none"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="size-4 shrink-0" />
            ) : (
              <Eye className="size-4 shrink-0" />
            )}
          </button>
        </div>
      </div>

      {/* Validation Message Display */}
      {validationError && (
        <div className="text-xs font-semibold text-red-500 bg-red-50/50 border border-red-100 rounded-lg p-2.5 animate-in fade-in slide-in-from-top-1">
          ⚠️ {validationError}
        </div>
      )}

      {/* Action Submit */}
      <Button className="w-full h-9 mt-1 bg-zinc-900 hover:bg-zinc-800 text-white font-bold" type="submit" disabled={isPending}>
        {isPending ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : "Create Account"}
      </Button>
    </form>
  );
}
