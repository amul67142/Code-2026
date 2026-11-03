import Link from "next/link";
import { Bot, Lock, MessageCircle, BookOpen, CalendarCheck, ArrowRight } from "lucide-react";
import { getCachedUserProfile } from "@/lib/auth/cached-user";
import { getAccessFlags } from "@/lib/billing/state";

/**
 * The AI agent is a Basic-plan feature. On the free trial every page under
 * /ai-agent shows this one screen instead — nothing to set up, nothing to
 * read — so the trial never looks like the agent is half-working.
 */
export default async function AiAgentLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCachedUserProfile();
  const allowed = profile?.company_id ? (await getAccessFlags(profile.company_id)).aiAgent : false;
  if (allowed) return children;

  const perks = [
    { icon: MessageCircle, text: "Replies to leads on WhatsApp, day and night" },
    { icon: BookOpen, text: "Answers from your projects, prices and FAQs" },
    { icon: CalendarCheck, text: "Qualifies leads and books site visits" },
  ];

  return (
    <div className="max-w-xl mx-auto pt-12">
      <div className="rounded-xl border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-muted">
          <Bot className="size-7" />
        </div>
        <h1 className="flex items-center justify-center gap-2 text-xl font-bold tracking-tight">
          <Lock className="size-4 text-muted-foreground" /> AI Agent
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The AI agent is available on the Basic plan. Subscribe to set it up and start using it.
        </p>
        <ul className="mx-auto mt-6 max-w-sm space-y-2.5 text-left text-sm">
          {perks.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3">
              <Icon className="size-4 shrink-0 text-muted-foreground" />
              {text}
            </li>
          ))}
        </ul>
        <Link
          href="/settings/billing"
          className="mt-7 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Subscribe to a plan <ArrowRight className="size-4" />
        </Link>
      </div>
    </div>
  );
}
