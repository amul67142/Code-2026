"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { acceptInviteAction, getInviteDetails } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Building2, Shield } from "lucide-react";

export function InviteClient() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [inviteInfo, setInviteInfo] = useState<{
    companyName?: string;
    role?: string;
  }>({});

  const supabase = createClient();

  useEffect(() => {
    // The invite link redirects here with #access_token=... in the URL hash.
    // Supabase JS client automatically detects the hash fragment and exchanges
    // it for a session. We listen for the auth state change to know when it's ready.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        setHasSession(true);
        setSessionChecked(true);
        // Fetch invite details (company name, role)
        const details = await getInviteDetails();
        if (!details.error) {
          setInviteInfo({
            companyName: details.companyName,
            role: details.role,
          });
        }
      }
    });

    // Also check if there's already an existing session (e.g. page refresh)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        setHasSession(true);
        const details = await getInviteDetails();
        if (!details.error) {
          setInviteInfo({
            companyName: details.companyName,
            role: details.role,
          });
        }
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
      toast.success("Account setup complete! Redirecting...");
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
    <div className="text-left space-y-5">
      {/* Invite context header */}
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold text-gray-900">You&apos;re Invited!</h1>
        <p className="text-sm text-gray-600">
          You have been invited to join <strong>{inviteInfo.companyName || "a company"}</strong> on RealLeads CRM.
        </p>
        
        {/* Company & Role badges */}
        <div className="flex flex-wrap gap-3">
          {inviteInfo.companyName && (
            <div className="flex items-center gap-2 rounded-md bg-blue-50 border border-blue-200 px-3 py-1.5">
              <Building2 className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">{inviteInfo.companyName}</span>
            </div>
          )}
          {inviteInfo.role && (
            <div className="flex items-center gap-2 rounded-md bg-green-50 border border-green-200 px-3 py-1.5">
              <Shield className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">{inviteInfo.role}</span>
            </div>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200" />

      {/* Password form */}
      <div>
        <p className="text-sm text-gray-500 mb-4">
          Set a password below to activate your account and start working.
        </p>
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
              placeholder="Minimum 8 characters"
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
              placeholder="Re-enter password"
            />
          </div>
          <Button className="w-full mt-2" type="submit" disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Activate Account & Login"}
          </Button>
        </form>
      </div>
    </div>
  );
}
