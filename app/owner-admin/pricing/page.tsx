import { getPricingPlans } from "../actions";
import { getINRtoUSDRate } from "@/lib/currency";
import { PricingPageClient } from "./PricingPageClient";

export const metadata = {
  title: "Manage Pricing — Big Lead CRM Owner",
};

export const revalidate = 0; // always dynamic

export default async function PricingAdminPage() {
  const plans = await getPricingPlans();
  const exchangeRate = await getINRtoUSDRate();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Pricing Plans</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Create, edit, or delete dynamic pricing plans shown on the homepage and landing pages.
          </p>
        </div>
        <div className="px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-950/40 text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          Live Exchange Rate: <strong className="text-white">1 USD = ₹{exchangeRate.toFixed(2)}</strong>
        </div>
      </div>

      <PricingPageClient initialPlans={plans} />
    </div>
  );
}
