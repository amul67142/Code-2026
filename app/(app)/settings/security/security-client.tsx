"use client";

import { useState, useTransition } from "react";
import { logoutOtherDevices, logoutAllDevices, type ActiveSession } from "./actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Monitor, MapPin, Clock, Shield, LogOut, Loader2, ShieldCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export function SecurityClient({ sessions }: { sessions: ActiveSession[] }) {
  const [isPending, startTransition] = useTransition();

  function handleLogoutOthers() {
    if (!confirm("Log out of all other devices? They'll be signed out within an hour.")) return;
    startTransition(async () => {
      const res = await logoutOtherDevices();
      if (res?.error) toast.error(res.error);
      else {
        toast.success("All other devices have been logged out");
        // refresh list
        window.location.reload();
      }
    });
  }

  function handleLogoutAll() {
    if (!confirm("Log out EVERYWHERE, including this device? You'll need to sign in again.")) return;
    startTransition(async () => {
      await logoutAllDevices(); // redirects to /login
    });
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Shield className="size-5" /> Security & Devices
        </h1>
        <p className="text-muted-foreground">
          See where your account is signed in and control your active sessions.
        </p>
      </div>

      {/* Single-device notice */}
      <Card className="border-emerald-200 bg-emerald-50/50 dark:bg-emerald-900/10">
        <CardContent className="flex items-start gap-3 py-4">
          <ShieldCheck className="size-5 text-emerald-600 mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-emerald-800 dark:text-emerald-300">Single-device login is on</p>
            <p className="text-emerald-700/80 dark:text-emerald-400/80 text-xs mt-0.5">
              For your security, signing in on a new device automatically logs you out everywhere else.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Active sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active Sessions</CardTitle>
          <CardDescription>Devices currently signed in to your account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No active sessions found.
            </p>
          ) : (
            sessions.map((s) => (
              <div
                key={s.id}
                className="flex items-start justify-between rounded-md border px-4 py-3 bg-muted/20"
              >
                <div className="flex items-start gap-3">
                  <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-lg">
                    <Monitor className="size-4 text-gray-600 dark:text-gray-300" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{s.device}</span>
                      {s.isCurrent && (
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[10px]">
                          This device
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="size-3" /> {s.location} · {s.ip}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="size-3" /> Last active{" "}
                      {(() => {
                        try {
                          return formatDistanceToNow(new Date(s.lastActive), { addSuffix: true });
                        } catch {
                          return "recently";
                        }
                      })()}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Manage Access</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-3">
          <Button variant="outline" onClick={handleLogoutOthers} disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <LogOut className="mr-2 size-4" />}
            Log out other devices
          </Button>
          <Button variant="destructive" onClick={handleLogoutAll} disabled={isPending}>
            <LogOut className="mr-2 size-4" />
            Log out everywhere
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
