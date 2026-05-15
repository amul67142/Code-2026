"use client";

import { useTransition } from "react";
import { completeOnboarding } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function OnboardingPage() {
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await completeOnboarding(formData);
      if (result?.error) {
        toast.error(result.error);
      } else if (result?.success) {
        // Handled by the action's redirect, but just in case
        toast.success(result.success);
      }
    });
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-4 bg-[#F7F8FA] absolute inset-0 z-50">
      <Card className="w-full max-w-[450px] border-gray-200 shadow-sm">
        <CardHeader className="text-center pb-4">
          <div className="flex items-center justify-center size-12 rounded-xl bg-gray-900 text-white text-lg font-bold mx-auto mb-4">
            R
          </div>
          <CardTitle className="text-xl font-bold text-gray-900">
            Welcome to RealLeads!
          </CardTitle>
          <CardDescription className="text-sm text-gray-500 mt-2">
            Let&apos;s set up your workspace. This will only take a minute.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="first_name" className="text-sm font-medium text-gray-700">
                  First Name
                </Label>
                <Input
                  id="first_name"
                  name="first_name"
                  placeholder="John"
                  className="h-10"
                  required
                  disabled={isPending}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="last_name" className="text-sm font-medium text-gray-700">
                  Last Name
                </Label>
                <Input
                  id="last_name"
                  name="last_name"
                  placeholder="Doe"
                  className="h-10"
                  required
                  disabled={isPending}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="company_name" className="text-sm font-medium text-gray-700">
                Company Name
              </Label>
              <Input
                id="company_name"
                name="company_name"
                placeholder="e.g. Acme Realty"
                className="h-10"
                required
                disabled={isPending}
              />
            </div>

            <Button className="w-full h-10 mt-2" type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Workspace...
                </>
              ) : (
                "Complete Setup"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
