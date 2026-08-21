import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getKnowledgeData } from "../actions";
import KnowledgeClient from "./knowledge-client";

export const metadata = {
  title: "AI Knowledge | Big Lead CRM",
};

export const dynamic = "force-dynamic";

export default async function AiKnowledgePage() {
  const data = await getKnowledgeData();
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
        <h1 className="text-2xl font-bold tracking-tight">Knowledge</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Paste what the bot should know: project overview, amenities, location advantages, developer
          background, common objections and their answers. Plain text works best. The bot is exactly
          as good as what you put here — but exact numbers (prices, sizes, RERA) belong in{" "}
          <Link href="/ai-agent/facts" className="text-primary hover:underline">
            Products &amp; Prices
          </Link>
          , not in prose.
        </p>
      </div>

      <KnowledgeClient docs={data.docs} projects={data.projects} />
    </div>
  );
}
