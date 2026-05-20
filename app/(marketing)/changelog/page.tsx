import Link from "next/link";
import { ArrowLeft, Sparkles, Tag, GitPullRequest, Milestone } from "lucide-react";

export const metadata = {
  title: "Product Changelog & Updates — BigLead",
  description: "Stay updated with the latest improvements, integrations, pipeline upgrades, and security protocols introduced to BigLead CRM.",
};

export default function ChangelogPage() {
  const versions = [
    {
      version: "v1.0.0",
      date: "May 20, 2026",
      title: "BigLead CRM Launch",
      description: "Our initial stable production launch, loaded with custom lead coordination tools and payment gateway integration.",
      badge: "Major Launch",
      changes: [
        "Fully customizable pipeline stages (New Lead, Contacted, Negotiation, Closed Won, Lost).",
        "Multi-currency pricing integration dynamically toggling Basic, Pro, and Enterprise tiers between USD and INR.",
        "Secure callback triggering routes utilizing standard telecommunication protocols to immediately link clients to agents.",
        "Fully PCI-DSS compliant Indian payment processor checkout flow integrated via PayU.",
        "Supabase isolated row-level database architecture active to keep pipelines private.",
        "Interactive analytics dashboards monitoring conversion counts, team activity log sheets, and active pipelines.",
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-black text-gray-100 flex flex-col font-sans">
      {/* Background Gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff03_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none opacity-40 z-0" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[350px] bg-gradient-to-b from-zinc-900/30 to-transparent blur-3xl pointer-events-none z-0" />

      {/* Header */}
      <header className="border-b border-zinc-900 backdrop-blur-md sticky top-0 z-40 bg-black/90">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-4xl">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight hover:text-white transition-colors">
            <ArrowLeft className="size-4" /> Back to Home
          </Link>
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Changelog</span>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 container mx-auto px-4 py-16 max-w-4xl relative z-10">
        <div className="space-y-6 mb-16 text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-semibold">
            <Sparkles className="size-3.5 text-zinc-300 animate-pulse" /> Constant Platform Evolution
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white">Product Changelog</h1>
          <p className="text-zinc-400 text-base md:text-lg leading-relaxed">
            Discover new updates, automated lead capture syncs, dashboard controls, and performance calibrations launched on BigLead CRM.
          </p>
        </div>

        {/* Timeline Column */}
        <div className="border-l border-zinc-900 space-y-12 pl-6 md:pl-8 ml-4">
          {versions.map((ver) => (
            <div key={ver.version} className="relative space-y-6">
              {/* Timeline dot */}
              <div className="absolute -left-[31px] md:-left-[39px] top-1 size-4 rounded-full bg-black border-2 border-white ring-4 ring-zinc-950 flex items-center justify-center">
                <div className="size-1 rounded-full bg-white" />
              </div>

              {/* Version Card */}
              <div className="bg-zinc-950/45 border border-zinc-900 rounded-3xl p-6 md:p-8 shadow-xl space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded border border-zinc-850 bg-zinc-900/60 text-zinc-300">
                        {ver.version}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                        {ver.badge}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-white tracking-tight">{ver.title}</h3>
                  </div>
                  <div className="text-xs text-zinc-500 font-semibold flex items-center gap-1">
                    <Milestone className="size-3.5 text-zinc-400" /> {ver.date}
                  </div>
                </div>

                <p className="text-sm text-zinc-400 leading-relaxed border-b border-zinc-900 pb-4">
                  {ver.description}
                </p>

                {/* Bullets */}
                <div className="space-y-3.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                    <GitPullRequest className="size-3.5" /> What's New & Upgraded
                  </h4>
                  <ul className="grid grid-cols-1 gap-2.5">
                    {ver.changes.map((change, idx) => (
                      <li key={idx} className="flex gap-2 text-xs md:text-sm text-zinc-300 leading-relaxed">
                        <span className="text-emerald-500 font-bold shrink-0">•</span>
                        <span>{change}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-8 mt-16 text-center text-xs text-zinc-600 bg-black">
        <div className="container mx-auto px-4 max-w-4xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} BigLead. All rights reserved.</p>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 font-medium">
            <Link href="/contact" className="hover:text-zinc-400 transition-colors">Contact Us</Link>
            <Link href="/terms" className="hover:text-zinc-400 transition-colors">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-zinc-400 transition-colors">Privacy Policy</Link>
            <Link href="/security" className="hover:text-zinc-400 transition-colors">Security</Link>
            <Link href="/cookies" className="hover:text-zinc-400 transition-colors">Cookies</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
