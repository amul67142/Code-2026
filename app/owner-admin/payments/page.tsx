import { getOwnerRevenueMetrics } from "../actions";
import { PaymentsClient } from "./PaymentsClient";

export const metadata = {
  title: "Payments Collection | BigLead Owner",
};

export default async function OwnerPaymentsPage() {
  const metrics = await getOwnerRevenueMetrics();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          Payments Collection
          <span className="text-[10px] uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full align-middle font-bold">
            Live
          </span>
        </h1>
        <p className="text-zinc-400 mt-2">
          Monitor all platform revenue, invoices, and active recurring subscriptions.
        </p>
      </div>

      <PaymentsClient metrics={metrics} />
    </div>
  );
}
