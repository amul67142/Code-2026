import Link from "next/link";
import { ArrowLeft, BookOpen, ChevronRight, Terminal, UserCheck, RefreshCw, BarChart2 } from "lucide-react";

export const metadata = {
  title: "Documentation & Developer Guides — BigLead",
  description: "Configure BigLead CRM, ingest prospects from lead ad sync APIs, format CSV sheets, customize sales cycles, and map webhooks.",
};

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-black text-gray-100 flex flex-col font-sans">
      {/* Background Gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff03_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none opacity-40 z-0" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[350px] bg-gradient-to-b from-zinc-900/30 to-transparent blur-3xl pointer-events-none z-0" />

      {/* Header */}
      <header className="border-b border-zinc-900 backdrop-blur-md sticky top-0 z-40 bg-black/90">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-5xl">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight hover:text-white transition-colors">
            <ArrowLeft className="size-4" /> Back to Home
          </Link>
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Documentation</span>
        </div>
      </header>

      {/* Content Layout */}
      <div className="flex-grow container mx-auto px-4 py-12 max-w-5xl relative z-10 grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Sidebar Nav */}
        <aside className="lg:col-span-1 space-y-6 lg:sticky lg:top-24 h-fit">
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
              <BookOpen className="size-3.5" /> Documentation
            </h3>
            <p className="text-xs text-zinc-500 font-medium">BigLead CRM User Guide</p>
          </div>
          <nav className="flex flex-col gap-1.5">
            {[
              { title: "01. Quickstart Guide", href: "#quickstart" },
              { title: "02. Lead Ingestion", href: "#ingestion" },
              { title: "03. Pipeline Setup", href: "#pipeline" },
              { title: "04. Telephony Callback", href: "#telephony" },
              { title: "05. Team Collaboration", href: "#team" }
            ].map((section) => (
              <a 
                key={section.title} 
                href={section.href} 
                className="text-xs font-semibold text-zinc-400 hover:text-white hover:translate-x-0.5 transition-all flex items-center justify-between py-2 border-b border-zinc-900/60"
              >
                {section.title} <ChevronRight className="size-3 text-zinc-650" />
              </a>
            ))}
          </nav>
        </aside>

        {/* Guides Content */}
        <main className="lg:col-span-3 space-y-12 border-t lg:border-t-0 lg:border-l border-zinc-900 pt-10 lg:pt-0 lg:pl-8 text-sm md:text-base leading-relaxed text-zinc-300">
          
          <div className="space-y-4">
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Technical Reference & Guide</h1>
            <p className="text-zinc-400 text-base">
              Learn how to configure your sales pipeline dashboards, upload lead records correctly, trigger telephone follow-ups, and organize team permission scopes inside BigLead.
            </p>
          </div>

          {/* Quickstart */}
          <section id="quickstart" className="space-y-3.5 scroll-mt-24">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-zinc-900 pb-2">
              <Terminal className="size-4.5 text-zinc-400" /> 01. Quickstart Guide
            </h2>
            <p>
              To initiate your CRM dashboard setup, complete standard credentials sign-up at the registration gateway. Once workspace parameters are active:
            </p>
            <ol className="list-decimal pl-6 space-y-2 text-zinc-400 text-xs sm:text-sm">
              <li>Navigate to your organizational workspace environment.</li>
              <li>Establish custom pipeline columns representing your unique conversion stages.</li>
              <li>Ingest your first batch of active lead contacts using our clean CSV file uploader.</li>
              <li>Track progress and configure webhook nodes for real-time campaign syncs.</li>
            </ol>
          </section>

          {/* Ingestion */}
          <section id="ingestion" className="space-y-3.5 scroll-mt-24">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-zinc-900 pb-2">
              <RefreshCw className="size-4.5 text-zinc-400" /> 02. Lead Ingestion Methods
            </h2>
            <p>
              BigLead supports two flexible approaches to loading customer prospect records into databases:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-zinc-400 text-xs sm:text-sm">
              <li>
                <strong className="text-zinc-300">CSV Sheet Imports:</strong> Ensure your column layouts correspond strictly to: `name`, `email`, `phone`, `company`, `value`. BigLead sanitizes numbers dynamically during import.
              </li>
              <li>
                <strong className="text-zinc-300">Webhook Triggers:</strong> Sync automated webhooks from Facebook Lead Ads or custom landing pages directly to your workspace secret API token URL to record leads instantly.
              </li>
            </ul>
          </section>

          {/* Pipeline */}
          <section id="pipeline" className="space-y-3.5 scroll-mt-24">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-zinc-900 pb-2">
              <BarChart2 className="size-4.5 text-zinc-400" /> 03. Customizing Pipelines
            </h2>
            <p>
              Map your physical conversion checkpoints inside the Drag-and-Drop pipeline settings. Move columns easily to mirror:
            </p>
            <p className="bg-zinc-950/60 border border-zinc-850 rounded-2xl p-4 text-xs font-mono text-zinc-400 leading-relaxed">
              New Capture &gt;&gt; Telephony Call Connected &gt;&gt; Live Negotiation &gt;&gt; Invoiced &gt;&gt; Contract Completed
            </p>
          </section>

          {/* Telephony */}
          <section id="telephony" className="space-y-3.5 scroll-mt-24">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-zinc-900 pb-2">
              <Terminal className="size-4.5 text-zinc-400" /> 04. Telephony Callback Setup
            </h2>
            <p>
              Automated Callback schedules establish a direct telephonic bridge. The moment a new leadwebhook maps in, the platform triggers routing. Configure caller ID rules, representative ring order, and timezone safety limits inside Telephony Settings to respect local country DND guidelines.
            </p>
          </section>

          {/* Team */}
          <section id="team" className="space-y-3.5 scroll-mt-24">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-zinc-900 pb-2">
              <UserCheck className="size-4.5 text-zinc-400" /> 05. Team Permissions & Security
            </h2>
            <p>
              Secure workspaces from unauthorized exports or edits using role structures:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-zinc-400 text-xs sm:text-sm">
              <li><strong className="text-zinc-300">Administrators:</strong> Full authority over database exports, team membership, subscription invoices, and webhook configurations.</li>
              <li><strong className="text-zinc-300">Sales Representatives:</strong> View assigned lead rows, drag pipeline cards, and log phone notes.</li>
            </ul>
          </section>

        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-8 mt-16 text-center text-xs text-zinc-600 bg-black">
        <div className="container mx-auto px-4 max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-4">
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
