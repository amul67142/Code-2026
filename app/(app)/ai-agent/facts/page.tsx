import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getFactsData } from "../actions";
import FactsClient from "./facts-client";

export const metadata = {
  title: "AI Products & Prices | Big Lead CRM",
};

export const dynamic = "force-dynamic";

export default async function AiFactsPage() {
  const data = await getFactsData();
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
        <h1 className="text-2xl font-bold tracking-tight">Products &amp; Prices</h1>
        <p className="text-sm text-muted-foreground mt-1">
          The only numbers the bot is allowed to quote — word for word. Prices, unit sizes, RERA
          numbers, possession dates, payment plans, charges. If a lead asks something that isn&apos;t
          here, the bot says it will confirm and hands the chat to your team — it never guesses.
          <span className="font-medium text-foreground"> Keep this current:</span> a stale price
          quoted to a lead is your problem, not the bot&apos;s.
        </p>
      </div>

      <FactsClient facts={data.facts} projects={data.projects} />
    </div>
  );
}
