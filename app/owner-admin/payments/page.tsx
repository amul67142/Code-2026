import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, CreditCard } from "lucide-react";

export const metadata = {
  title: "Payments | BigLead Owner",
};

export default function OwnerPaymentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          Payments Collection
          <span className="text-[10px] uppercase tracking-wider bg-zinc-800 text-zinc-400 px-2 py-1 rounded-full align-middle">
            Coming Soon
          </span>
        </h1>
        <p className="text-zinc-400 mt-2">
          Monitor all platform revenue, invoices, and payment gateway transactions.
        </p>
      </div>

      <Card className="bg-zinc-900 border-zinc-800 text-center py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-zinc-950/50" />
        <CardContent className="relative z-10 flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center mb-6">
            <Lock className="w-8 h-8 text-zinc-500" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Payment Integration Pending</h2>
          <p className="text-zinc-400 max-w-md mx-auto mb-8">
            Revenue & payment tracking will be displayed here once a billing provider is securely connected to the platform.
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl opacity-50 pointer-events-none">
            {[
              { title: "Total Revenue", val: "₹0.00" },
              { title: "Active MRR", val: "₹0.00" },
              { title: "Invoices", val: "0" }
            ].map(m => (
              <div key={m.title} className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
                <p className="text-sm font-medium text-zinc-400">{m.title}</p>
                <p className="text-2xl font-bold text-zinc-300 mt-1">{m.val}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
