import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoginForm } from "./login-form";
export const metadata = {
  title: "Log In — BigLead CRM",
  description: "Sign in to your BigLead CRM account",
};

/**
 * Login page.
 */
export default function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-screen px-4 bg-[#F7F8FA]">
      <Card className="w-full max-w-[400px] border-gray-200 shadow-sm">
        <CardHeader className="text-center pb-2">
          <div className="flex items-center justify-center gap-1.5 mx-auto mb-3">
            <span className="text-2xl font-black tracking-tight text-zinc-900">
              BigLead<span className="text-zinc-500">CRM</span>
            </span>
          </div>
          <CardTitle className="text-lg font-semibold text-gray-900">
            Welcome back
          </CardTitle>
          <p className="text-sm text-gray-500">
            Sign in to your BigLead account
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <LoginForm />
          <p className="text-center text-sm text-gray-500">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="text-gray-900 font-medium hover:underline"
            >
              Sign up
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
