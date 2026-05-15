import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

/**
 * Public landing page — serves as the root "/" route.
 * Full marketing landing page will be built in Phase 20.
 */
export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 bg-white">
      <div className="flex items-center justify-center size-16 rounded-2xl bg-gray-900 text-white text-2xl font-bold mb-6">
        R
      </div>
      <h1 className="text-3xl font-bold text-gray-900 text-center">
        RealLeads CRM
      </h1>
      <p className="mt-2 text-gray-500 text-center max-w-md">
        The lead management platform for real estate companies.
        Capture, assign, track, and close every lead from one dashboard.
      </p>
      <div className="flex items-center gap-3 mt-8">
        <Link href="/login" className={buttonVariants({ variant: "default" })}>
          Log In
        </Link>
        <Link href="/signup" className={buttonVariants({ variant: "outline" })}>
          Start Free Trial
        </Link>
      </div>
    </div>
  );
}
