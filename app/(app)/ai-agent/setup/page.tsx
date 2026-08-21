import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getAiSetupData } from "../actions";
import SetupClient from "./setup-client";

export const metadata = {
  title: "AI Agent Setup | Big Lead CRM",
};

export const dynamic = "force-dynamic";

export default async function AiAgentSetupPage() {
  const data = await getAiSetupData();
  if (!data) redirect("/dashboard");

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <Link
          href="/ai-agent"
          className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 mb-3"
        >
          <ArrowLeft className="size-4" /> Back to AI Agent
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Setup</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Who the bot is, how it talks, and how much rope it gets. Start in shadow mode — it drafts
          replies for your approval in Live Chat and sends nothing on its own.
        </p>
      </div>

      <SetupClient config={data.config} stages={data.stages} />
    </div>
  );
}
