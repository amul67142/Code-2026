import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getRubricData } from "../actions";
import QualificationClient from "./qualification-client";

export const metadata = {
  title: "AI Qualification | Big Lead CRM",
};

export const dynamic = "force-dynamic";

export default async function AiQualificationPage() {
  const data = await getRubricData();
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
        <h1 className="text-2xl font-bold tracking-tight">Qualification</h1>
        <p className="text-sm text-muted-foreground mt-1">
          What the bot finds out about each lead — asked naturally across the conversation, never as
          a form. When every required field is answered and the lead is genuinely interested, the bot
          marks them qualified, moves them to your chosen pipeline stage, and pushes for the site
          visit.
        </p>
      </div>

      <QualificationClient fields={data.fields} />
    </div>
  );
}
