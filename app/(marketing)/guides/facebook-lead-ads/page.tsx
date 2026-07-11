import Link from "next/link";
import {
  ArrowLeft,
  Megaphone,
  ShieldCheck,
  Link2,
  FolderTree,
  TestTube2,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

export const metadata = {
  title: "Facebook Lead Ads Setup Guide — BigLead",
  description:
    "Step-by-step guide to connect your Facebook Page to BigLead, grant Leads Access, map your lead forms, and test that leads flow into your CRM automatically.",
};

const steps = [
  {
    n: 1,
    icon: Link2,
    title: "Connect your Facebook Page",
    body: [
      "In BigLead, go to Settings → Integrations → Facebook and click Connect Facebook.",
      "Log in with the Facebook account that manages your Page and approve the requested permissions.",
      "You'll be brought back to BigLead — your Page now shows as Connected.",
    ],
    tip: "You must be an admin of the Facebook Page. Pages you only have partial access to may not appear.",
  },
  {
    n: 2,
    icon: ShieldCheck,
    title: "Grant BigLead access in Leads Access Manager",
    important: true,
    body: [
      "This is the #1 reason leads silently don't arrive. If your Page uses Leads Access Manager, Facebook blocks every CRM until you grant it access — being connected is not enough.",
      "Open your Facebook Page → Settings → Leads Access (or Meta Business Suite → Leads Access).",
      "Go to the CRMs tab → Assign CRMs → find BigLead CRM → grant access.",
    ],
    tip: "If you skip this, leads are delivered to Facebook but never reach BigLead — with no error shown to you.",
  },
  {
    n: 3,
    icon: FolderTree,
    title: "Map your lead form to a project",
    body: [
      "Back in BigLead → Settings → Integrations, your Page's Instant Forms are listed.",
      "For each form you want to use, pick the destination Project and how leads should be assigned (round-robin or a specific agent), then Save mapping.",
      "Unmapped forms are rejected — a lead from an unmapped form will not appear in your pipeline.",
    ],
    tip: "You can map different forms to different projects — e.g. a Lucknow form to your Lucknow project.",
  },
  {
    n: 4,
    icon: TestTube2,
    title: "Test that a lead flows in",
    body: [
      "The most reliable test is a real submission: run your Lead Ad and fill the Instant Form yourself (previews do NOT count and won't trigger delivery).",
      "Alternatively, in the Meta App Dashboard, switch the app to Development mode, open Tools → Lead Ads Testing Tool, pick your form and click Create lead, then switch back to Live.",
      "Within seconds the lead should appear in your BigLead pipeline, auto-assigned, with the welcome email/WhatsApp fired.",
    ],
    tip: "The Testing Tool hides a Page while it's connected to a Live app — that's normal and doesn't affect real delivery.",
  },
];

const troubleshoot = [
  "Leads not arriving? First check Step 2 — grant BigLead access in your Page's Leads Access settings.",
  "Lead came in but isn't in the pipeline? The form probably isn't mapped — complete Step 3.",
  'The Testing Tool "Send to server" button always sends the same dummy lead, which is skipped as a duplicate. Use "Create lead" instead.',
  "A Facebook Page can only be connected to one BigLead account at a time.",
];

export default function FacebookGuidePage() {
  return (
    <div className="min-h-screen bg-black text-gray-100 flex flex-col font-sans">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff03_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none opacity-40 z-0" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[350px] bg-gradient-to-b from-zinc-900/30 to-transparent blur-3xl pointer-events-none z-0" />

      {/* Header */}
      <header className="border-b border-zinc-900 backdrop-blur-md sticky top-0 z-40 bg-black/90">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-4xl">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-semibold tracking-tight hover:text-white transition-colors"
          >
            <ArrowLeft className="size-4" /> Back to Home
          </Link>
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Setup Guide</span>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 container mx-auto px-4 py-16 max-w-4xl relative z-10">
        {/* Intro */}
        <div className="space-y-5 mb-16 text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-semibold">
            <Megaphone className="size-3.5" /> Facebook Lead Ads
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white">
            Connect Facebook Lead Ads
          </h1>
          <p className="text-zinc-400 text-base md:text-lg leading-relaxed">
            Capture every lead from your Facebook &amp; Instagram ads directly into BigLead — the
            moment they submit, auto-assigned and followed up. Four steps, about 5 minutes.
          </p>
        </div>

        {/* Steps */}
        <div className="border-l border-zinc-900 space-y-10 pl-6 md:pl-8 ml-4">
          {steps.map((s) => (
            <div key={s.n} className="relative space-y-4">
              <div className="absolute -left-[31px] md:-left-[39px] top-1 size-4 rounded-full bg-black border-2 border-white ring-4 ring-zinc-950" />
              <div
                className={
                  "rounded-3xl p-6 md:p-8 shadow-xl space-y-5 border " +
                  (s.important
                    ? "bg-amber-950/20 border-amber-900/50"
                    : "bg-zinc-950/45 border-zinc-900")
                }
              >
                <div className="flex items-center gap-3">
                  <div
                    className={
                      "size-10 rounded-xl flex items-center justify-center border shrink-0 " +
                      (s.important
                        ? "bg-amber-500/10 border-amber-800 text-amber-300"
                        : "bg-zinc-900 border-zinc-800 text-zinc-300")
                    }
                  >
                    <s.icon className="size-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                      Step {s.n}
                      {s.important && (
                        <span className="ml-2 text-amber-400">Don&apos;t skip this</span>
                      )}
                    </div>
                    <h2 className="text-lg md:text-xl font-bold text-white tracking-tight">
                      {s.title}
                    </h2>
                  </div>
                </div>

                <ul className="space-y-2.5">
                  {s.body.map((line, i) => (
                    <li key={i} className="flex gap-2.5 text-sm text-zinc-300 leading-relaxed">
                      <CheckCircle2 className="size-4 text-zinc-500 shrink-0 mt-0.5" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>

                {s.tip && (
                  <p className="text-xs text-zinc-400 bg-black/40 border border-zinc-850 rounded-xl p-3 leading-relaxed">
                    <strong className="text-zinc-300">Note:</strong> {s.tip}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Troubleshooting */}
        <div className="mt-16 rounded-3xl border border-zinc-900 bg-zinc-950/45 p-6 md:p-8">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2 mb-4">
            <AlertTriangle className="size-4 text-amber-400" /> Troubleshooting
          </h3>
          <ul className="space-y-3">
            {troubleshoot.map((t, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-zinc-300 leading-relaxed">
                <span className="text-amber-500 font-bold shrink-0">•</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <p className="text-sm text-zinc-400 mb-4">Ready to connect your Page?</p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 h-11 rounded-full bg-white text-black font-semibold text-sm hover:bg-zinc-100 transition-colors"
          >
            Open BigLead <ArrowLeft className="size-4 rotate-180" />
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-8 mt-16 text-center text-xs text-zinc-600 bg-black">
        <div className="container mx-auto px-4 max-w-4xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} BigLead. All rights reserved.</p>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 font-medium">
            <Link href="/docs" className="hover:text-zinc-400 transition-colors">Documentation</Link>
            <Link href="/help" className="hover:text-zinc-400 transition-colors">Help Center</Link>
            <Link href="/contact" className="hover:text-zinc-400 transition-colors">Contact Us</Link>
            <Link href="/privacy" className="hover:text-zinc-400 transition-colors">Privacy Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
