"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { acceptInviteAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export function InviteClient() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    // The invite link redirects here with #access_token=... in the URL hash.
    // Supabase JS client automatically detects the hash fragment and exchanges
    // it for a session. We listen for the auth state change to know when it's ready.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setHasSession(true);
        setSessionChecked(true);
      }
    });

    // Also check if there's already an existing session (e.g. page refresh)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setHasSession(true);
      }
      // Give the hash fragment listener a moment before declaring "no session"
      setTimeout(() => setSessionChecked(true), 1500);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setIsPending(true);

    // 1. Update password in Auth
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      toast.error(updateError.message);
      setIsPending(false);
      return;
    }

    // 2. Update status in database
    const res = await acceptInviteAction();
    
    if (res.error) {
      toast.error(res.error);
      setIsPending(false);
    } else {
      toast.success("Account setup complete!");
      router.push("/dashboard");
    }
  };

  if (!sessionChecked) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-sm text-gray-500">Verifying invite link...</p>
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div className="text-center p-6 space-y-4">
        <h2 className="text-xl font-semibold text-red-600">Invalid or Expired Link</h2>
        <p className="text-sm text-gray-500">
          We could not verify your invitation. The link may have expired or you may have already accepted it.
        </p>
        <Button onClick={() => router.push("/login")} variant="outline" className="w-full mt-4">
          Go to Login
        </Button>
      </div>
    );
  }

  return (
    <div className="text-left space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Welcome to RealLeads</h1>
        <p className="text-sm text-gray-500 mt-1">
          Please set a password to activate your account.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isPending}
            placeholder="••••••••"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={isPending}
            placeholder="••••••••"
          />
        </div>
        <Button className="w-full mt-2" type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Activate Account"}
        </Button>
      </form>
    </div>
  );
}
