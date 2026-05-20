import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SignupForm } from "./signup-form";
export const metadata = {
  title: "Sign Up — Big Lead CRM",
  description: "Create your Big Lead CRM account and start your free trial",
};

/**
 * Signup page — placeholder form.
 * Full signup with Supabase Auth in Phase 3.
 */
export default function SignupPage() {
  return (
    <div className="flex items-center justify-center min-h-screen px-4 bg-[#F7F8FA]">
      <Card className="w-full max-w-[400px] border-gray-200 shadow-sm">
        <CardHeader className="text-center pb-2">
          <div className="flex items-center justify-center size-10 rounded-lg bg-gray-900 text-white text-sm font-bold mx-auto mb-3">
            B
          </div>
          <CardTitle className="text-lg font-semibold text-gray-900">
            Start your free trial
          </CardTitle>
          <p className="text-sm text-gray-500">
            30 days free. No credit card required.
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <SignupForm />
          <p className="text-center text-sm text-gray-500">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-gray-900 font-medium hover:underline"
            >
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
