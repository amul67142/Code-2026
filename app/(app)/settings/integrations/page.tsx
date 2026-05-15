import { Construction, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export const metadata = {
  title: "Integrations | RealLeads CRM",
};

export default function IntegrationsPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="flex items-center justify-center size-16 rounded-2xl bg-blue-50 text-blue-600 mb-6">
        <Construction className="size-8" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-2">
        Integrations Coming Soon
      </h1>
      <p className="text-muted-foreground max-w-md mb-8">
        We're building connections to your favorite tools. Soon you'll be able to link Facebook Ads, Google Ads, and custom Webhooks directly to your CRM.
      </p>
      <Link href="/settings" className={buttonVariants({ variant: "outline" })}>
        <ArrowLeft className="mr-2 size-4" />
        Back to Settings
      </Link>
    </div>
  );
}
