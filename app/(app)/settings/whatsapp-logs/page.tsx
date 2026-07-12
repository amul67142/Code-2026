import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getWhatsAppMessageLog } from "../integrations/whatsapp-bulk-actions";
import { WhatsAppLogsClient } from "./whatsapp-logs-client";

export const metadata = {
  title: "WhatsApp Message Log | Big Lead CRM",
};

export default async function WhatsAppLogsPage() {
  const { rows } = await getWhatsAppMessageLog();

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <Link
          href="/settings/integrations"
          className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 mb-3"
        >
          <ArrowLeft className="size-4" /> Back to Integrations
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">WhatsApp Message Log</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Every message sent, failed, and received — with the exact number and reason.
        </p>
      </div>

      <WhatsAppLogsClient initialRows={rows} />
    </div>
  );
}
