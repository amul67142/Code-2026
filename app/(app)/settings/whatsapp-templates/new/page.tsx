import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCachedUserProfile } from "@/lib/auth/cached-user";
import { getWhatsAppConnection } from "../../integrations/whatsapp-actions";
import { TemplateCreateClient } from "./template-create-client";

export const metadata = {
  title: "New WhatsApp Template | Big Lead CRM",
};

export default async function NewWhatsAppTemplatePage() {
  const [conn, profile] = await Promise.all([
    getWhatsAppConnection(),
    getCachedUserProfile(),
  ]);

  let companyName: string | null = null;
  if (profile?.company_id) {
    const admin = createAdminClient();
    const { data } = await admin
      .from("companies")
      .select("name")
      .eq("id", profile.company_id)
      .maybeSingle();
    companyName = data?.name || null;
  }

  const connected = conn?.status === "ACTIVE";

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <Link
          href="/settings/whatsapp-templates"
          className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 mb-3"
        >
          <ArrowLeft className="size-4" /> Back to Templates
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">New WhatsApp Template</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Write your message, preview it exactly as the lead will see it, and submit to Meta for review.
        </p>
      </div>

      {!connected ? (
        <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
          <p>Connect WhatsApp first to create templates.</p>
          <Link href="/settings/integrations" className="text-primary hover:underline mt-1 inline-block">
            Go to Integrations →
          </Link>
        </div>
      ) : (
        <TemplateCreateClient companyName={companyName} />
      )}
    </div>
  );
}
