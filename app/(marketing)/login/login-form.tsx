"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { login } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";
import Link from "next/link";

export function LoginForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await login(formData);
      if (result?.error) {
        toast.error(result.error);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Email Field */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email" className="text-sm text-gray-700">
          Email
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

      {/* Password Field with Show/Hide toggle */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password" className="text-sm text-gray-700">
            Password
          </Label>
          <Link
            href="/forgot-password"
            className="text-xs text-zinc-500 hover:text-indigo-600 transition-colors"
          >
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
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

      {/* Submit Button */}
      <Button className="w-full h-9 mt-1 bg-zinc-900 hover:bg-zinc-800 text-white font-bold" type="submit" disabled={isPending}>
        {isPending ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : "Sign In"}
      </Button>
    </form>
  );
}
