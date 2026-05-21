import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, LifeBuoy } from "lucide-react";

export const metadata = {
  title: "Tickets | BigLead Owner",
};

export default function OwnerTicketsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          Support Tickets
          <span className="text-[10px] uppercase tracking-wider bg-zinc-800 text-zinc-400 px-2 py-1 rounded-full align-middle">
            Coming Soon
          </span>
        </h1>
        <p className="text-zinc-400 mt-2">
          Manage and respond to help requests from platform users.
        </p>
      </div>

      <Card className="bg-zinc-900 border-zinc-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-zinc-950/80 z-10 flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center mb-6">
            <Lock className="w-8 h-8 text-zinc-500" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Help System Pending</h2>
          <p className="text-zinc-400 max-w-md mx-auto text-center">
            Customer support tickets will appear here once the internal helpdesk system is launched.
          </p>
        </div>

        <CardHeader>
          <CardTitle className="text-lg text-zinc-600 flex items-center gap-2">
            <LifeBuoy className="w-5 h-5" />
            Recent Tickets
          </CardTitle>
        </CardHeader>
        <CardContent className="opacity-20 pointer-events-none pb-20">
          <div className="rounded-md border border-zinc-800 overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="text-xs bg-zinc-900 uppercase">
                <tr>
                  <th className="px-6 py-4 font-medium">Ticket ID</th>
                  <th className="px-6 py-4 font-medium">Subject</th>
                  <th className="px-6 py-4 font-medium">Company</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {[1, 2, 3].map(i => (
                  <tr key={i}>
                    <td className="px-6 py-4 font-mono">#TKT-{1000 + i}</td>
                    <td className="px-6 py-4">Cannot access settings panel</td>
                    <td className="px-6 py-4">Acme Corp</td>
                    <td className="px-6 py-4">Open</td>
                    <td className="px-6 py-4">Oct 2{i}, 2023</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
