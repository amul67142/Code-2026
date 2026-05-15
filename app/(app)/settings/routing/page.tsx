import { Route, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export const metadata = {
  title: "Routing Rules | RealLeads CRM",
};

export default function RoutingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="flex items-center justify-center size-16 rounded-2xl bg-indigo-50 text-indigo-600 mb-6">
        <Route className="size-8" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-2">
        Lead Routing Coming Soon
      </h1>
      <p className="text-muted-foreground max-w-md mb-8">
        We're building advanced routing rules. Soon you'll be able to automatically assign new leads to team members based on source, project, or round-robin rules.
      </p>
      <Link href="/settings" className={buttonVariants({ variant: "outline" })}>
        <ArrowLeft className="mr-2 size-4" />
        Back to Settings
      </Link>
    </div>
  );
}
