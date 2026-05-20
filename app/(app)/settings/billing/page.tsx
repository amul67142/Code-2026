import { CreditCard, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export const metadata = {
  title: "Billing | Big Lead CRM",
};

export default function BillingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="flex items-center justify-center size-16 rounded-2xl bg-emerald-50 text-emerald-600 mb-6">
        <CreditCard className="size-8" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-2">
        Billing & Subscriptions
      </h1>
      <p className="text-muted-foreground max-w-md mb-8">
        The billing portal is currently under development. Soon you'll be able to manage your subscription plan, payment methods, and download past invoices.
      </p>
      <Link href="/settings" className={buttonVariants({ variant: "outline" })}>
        <ArrowLeft className="mr-2 size-4" />
        Back to Settings
      </Link>
    </div>
  );
}
