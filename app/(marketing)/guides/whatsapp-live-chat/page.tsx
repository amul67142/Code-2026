import Link from "next/link";
import {
  ArrowLeft,
  MessageCircle,
  Link2,
  FileCheck2,
  MessagesSquare,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from "lucide-react";

export const metadata = {
  title: "WhatsApp & Live Chat Setup Guide — BigLead",
  description:
    "Connect your WhatsApp Business number in one click, create approved templates, auto-message every new lead, and chat with leads in real time from the BigLead Live Chat inbox.",
};

const steps = [
  {
    n: 1,
    icon: Link2,
    title: "Connect your WhatsApp Business number",
    body: [
      "In BigLead, go to Settings → Integrations → WhatsApp and click Connect WhatsApp.",
      "Meta's official popup opens — log in with your Facebook, pick (or create) your WhatsApp Business Account and phone number, and add a payment method for Meta's messaging charges.",
      "Finish the popup and you're connected — BigLead wires up everything behind the scenes, including two-way messaging.",
    ],
    tip: "Use a number that isn't active on the WhatsApp mobile app (or migrate it). Meta bills message costs directly to you — BigLead never touches that payment.",
  },
  {
    n: 2,
    icon: FileCheck2,
    title: "Create your welcome template",
    body: [
      "Go to Settings → WhatsApp Templates → New template.",
      "Write your message using {{1}} for the lead's name and {{2}} for the project name — BigLead fills them automatically on every send. Add quick-reply buttons like \"Yes, interested\" or an image header for marketing messages.",
      "Watch the live WhatsApp preview, then submit. Meta reviews templates (usually minutes to a few hours) — track the status on the same page and click \"Use as welcome\" once approved.",
    ],
    tip: "Utility templates approve faster and cost less than Marketing ones. Avoid salesy wording — that's the #1 rejection reason.",
  },
  {
    n: 3,
    icon: Zap,
    title: "Turn on auto-engagement",
    body: [
      "Every new lead now gets your welcome message within seconds of arriving — from any source: Facebook ads, website forms, or manual entry.",
      "In Settings → Integrations → WhatsApp → Reply automation, add qualify keywords (e.g. yes, interested, call me) and pick a qualified stage.",
      "When a lead replies with a keyword — or taps a quick-reply button — they're automatically moved to that stage and the assigned agent is alerted instantly.",
    ],
    tip: "Bulk CSV imports never auto-message — that's deliberate, to protect your number's quality rating from spam reports.",
  },
  {
    n: 4,
    icon: MessagesSquare,
    title: "Chat with leads in Live Chat",
    body: [
      "Open Live Chat from the sidebar — every WhatsApp conversation appears with unread counts, sorted by latest.",
      "Reply in real time with delivery and read ticks, just like WhatsApp. Admins see all conversations and can assign any conversation to an agent — assigned agents see only their own chats.",
      "If a lead sends a photo or document, download it straight to your device with one click.",
    ],
    tip: "WhatsApp's 24-hour rule: you can type freely for 24 hours after the lead's last message. After that, BigLead switches the composer to your approved template — one send re-opens the conversation when they reply.",
  },
];

const troubleshoot = [
  "Message failed with a \"parameter\" error? Your template's variables don't match — rebuild it in the Template studio using {{1}} and {{2}} only.",
  "Replies not appearing in Live Chat? Reconnect via Connect WhatsApp — BigLead re-links your WhatsApp account for two-way messaging automatically.",
  "Can't type in a conversation? The 24-hour window has closed — send your approved template to re-open it.",
  "Watch the quality rating on the WhatsApp card: if it drops to Medium or Low, slow down and message only genuine leads — Meta limits low-quality numbers.",
];

export default function WhatsAppGuidePage() {
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
        <div className="space-y-5 mb-16 text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-semibold">
            <MessageCircle className="size-3.5 text-[#25D366]" /> WhatsApp &amp; Live Chat
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white">
            WhatsApp on Autopilot — <span className="text-zinc-400">and Live when it matters</span>
          </h1>
          <p className="text-zinc-400 text-base md:text-lg leading-relaxed">
            Auto-message every new lead in seconds, qualify them from their replies, and chat in real
            time from one team inbox. Four steps, about 10 minutes.
          </p>
        </div>

        {/* Steps */}
        <div className="border-l border-zinc-900 space-y-10 pl-6 md:pl-8 ml-4">
          {steps.map((s) => (
            <div key={s.n} className="relative space-y-4">
              <div className="absolute -left-[31px] md:-left-[39px] top-1 size-4 rounded-full bg-black border-2 border-white ring-4 ring-zinc-950" />
              <div className="rounded-3xl p-6 md:p-8 shadow-xl space-y-5 border bg-zinc-950/45 border-zinc-900">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl flex items-center justify-center border shrink-0 bg-zinc-900 border-zinc-800 text-zinc-300">
                    <s.icon className="size-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                      Step {s.n}
                    </div>
                    <h2 className="text-lg md:text-xl font-bold text-white tracking-tight">{s.title}</h2>
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

        {/* 24h window explainer */}
        <div className="mt-16 rounded-3xl border border-zinc-900 bg-zinc-950/45 p-6 md:p-8">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2 mb-3">
            <Clock className="size-4 text-zinc-300" /> How the 24-hour window works
          </h3>
          <p className="text-sm text-zinc-300 leading-relaxed">
            WhatsApp (Meta) allows free-form replies only within <strong>24 hours of the lead&apos;s last
            message</strong>. Inside the window, type anything in Live Chat. Outside it, BigLead
            automatically switches to your approved template — sending it invites the lead to reply,
            which re-opens the window. This is a WhatsApp platform rule, not a BigLead limit; every
            WhatsApp tool works this way.
          </p>
        </div>

        {/* Troubleshooting */}
        <div className="mt-8 rounded-3xl border border-zinc-900 bg-zinc-950/45 p-6 md:p-8">
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
          <p className="text-sm text-zinc-400 mb-4">Ready to put WhatsApp on autopilot?</p>
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
            <Link href="/guides/facebook-lead-ads" className="hover:text-zinc-400 transition-colors">Facebook Guide</Link>
            <Link href="/help" className="hover:text-zinc-400 transition-colors">Help Center</Link>
            <Link href="/contact" className="hover:text-zinc-400 transition-colors">Contact Us</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
