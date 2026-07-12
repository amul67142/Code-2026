import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getWhatsAppTemplates } from "../integrations/whatsapp-templates-actions";
import { getWhatsAppConnection } from "../integrations/whatsapp-actions";
import { WhatsAppTemplates } from "../integrations/whatsapp-templates";

export const metadata = {
  title: "WhatsApp Templates | Big Lead CRM",
};

export default async function WhatsAppTemplatesPage() {
  const [data, conn] = await Promise.all([
    getWhatsAppTemplates(),
    getWhatsAppConnection(),
  ]);

  const connected = conn?.status === "ACTIVE";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <Link
          href="/settings"
          className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 mb-3"
        >
          <ArrowLeft className="size-4" /> Back to Settings
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">WhatsApp Templates</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Create message templates, track their Meta approval status, and use approved ones as your
          automatic welcome message.
        </p>
      </div>

      {!connected ? (
        <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
          <p>Connect WhatsApp first to manage templates.</p>
          <Link href="/settings/integrations" className="text-primary hover:underline mt-1 inline-block">
            Go to Integrations →
          </Link>
        </div>
      ) : (
        <WhatsAppTemplates
          initialTemplates={data.templates}
          initialCooldown={data.cooldownRemainingSec}
          hasWaba={data.hasWaba}
          currentDefault={conn?.default_template}
        />
      )}
    </div>
  );
}
