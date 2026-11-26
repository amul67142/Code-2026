import Link from "next/link";
import { ArrowLeft, ArrowRight, CircleHelp, Megaphone, MessageCircle } from "lucide-react";

export const metadata = {
  title: "Setup Guides — BigLead CRM",
  description:
    "Step-by-step guides to connect Facebook & Instagram Lead Ads, WhatsApp and Live Chat to BigLead CRM, so every real estate lead is captured and answered in seconds.",
  alternates: { canonical: "/guides" },
};

const GUIDES = [
  {
    href: "/guides/facebook-lead-ads",
    icon: Megaphone,
    iconClass: "text-[#1877F2]",
    tag: "Lead capture",
    title: "Connect Facebook & Instagram Lead Ads",
    desc: "Connect your Facebook Page, give BigLead Leads Access, map your lead forms to projects, and send a test lead to check it lands.",
  },
  {
    href: "/guides/whatsapp-live-chat",
    icon: MessageCircle,
    iconClass: "text-[#25D366]",
    tag: "WhatsApp",
    title: "WhatsApp welcome messages & Live Chat",
    desc: "Connect your WhatsApp Business number, get a welcome template approved, message every new lead automatically and reply from the Live Chat inbox.",
  },
];

export default function GuidesPage() {
  return (
    <div className="min-h-screen bg-black font-sans text-gray-100">
      <header className="sticky top-0 z-40 border-b border-zinc-900 bg-black/90 backdrop-blur-md">
        <div className="container mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight transition-colors hover:text-white">
            <ArrowLeft className="size-4" /> Back to Home
          </Link>
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Guides</span>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl px-4 py-16">
        <div className="mx-auto mb-12 max-w-2xl space-y-4 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-white md:text-5xl">Setup guides</h1>
          <p className="text-lg text-zinc-400">
            Get your leads flowing into BigLead and answered on WhatsApp. Each guide takes about ten minutes.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {GUIDES.map((g) => (
            <Link
              key={g.href}
              href={g.href}
              className="group flex flex-col rounded-2xl border border-zinc-800 bg-zinc-950 p-6 transition-colors hover:border-zinc-600"
            >
              <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs font-semibold text-zinc-300">
                <g.icon className={`size-3.5 ${g.iconClass}`} /> {g.tag}
              </div>
              <h2 className="text-xl font-bold text-white">{g.title}</h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-400">{g.desc}</p>
              <span className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-white">
                Read the guide <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>

        <Link
          href="/help"
          className="mt-4 flex items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 transition-colors hover:border-zinc-600"
        >
          <div className="flex items-center gap-4">
            <CircleHelp className="size-6 shrink-0 text-zinc-400" />
            <div>
              <p className="font-semibold text-white">Common questions</p>
              <p className="text-sm text-zinc-400">Payment errors on WhatsApp, missing Facebook leads, adding your team, billing.</p>
            </div>
          </div>
          <ArrowRight className="size-4 shrink-0 text-zinc-400" />
        </Link>
      </main>
    </div>
  );
}
