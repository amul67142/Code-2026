import Link from "next/link";
import { ArrowLeft, Layers, Send, Table, MessageSquare, Cpu, Cable, ArrowRight } from "lucide-react";

export const metadata = {
  title: "Native Software Integrations — BigLead",
  description: "Connect BigLead CRM with your favorite marketing channels, Google Sheets, Zapier workflows, and webhook nodes.",
};

export default function IntegrationsPage() {
  const integrations = [
    {
      name: "Facebook Lead Ads",
      icon: <Layers className="size-6 text-blue-500" />,
      tag: "Marketing",
      desc: "Synchronize prospects captured in Facebook & Instagram instant forms into your CRM pipeline instantly via secure webhooks.",
      status: "Native Support",
    },
    {
      name: "Google Sheets",
      icon: <Table className="size-6 text-emerald-500" />,
      tag: "Productivity",
      desc: "Automatically sync CRM pipeline contacts to Google Sheets rows in real-time, or import massive CSV lead lists directly.",
      status: "Native Support",
    },
    {
      name: "Zapier Ecosystem",
      icon: <Cable className="size-6 text-orange-500" />,
      tag: "Automation",
      desc: "Trigger multi-app workflow rules in Zapier, linking BigLead data to thousands of digital sales and corporate applications.",
      status: "Certified",
    },
    {
      name: "WhatsApp Cloud API",
      icon: <MessageSquare className="size-6 text-green-500" />,
      tag: "Messaging",
      desc: "Connect official WhatsApp business routers to automatically follow up with leads the exact second they enter your pipeline.",
      status: "Beta Testing",
    },
    {
      name: "Custom Webhooks & APIs",
      icon: <Cpu className="size-6 text-zinc-400" />,
      tag: "Developers",
      desc: "Deploy custom webhook triggers and explore developer-friendly REST endpoints to integrate with bespoke systems.",
      status: "Available",
    },
  ];

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
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Integrations</span>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 container mx-auto px-4 py-16 max-w-5xl relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-semibold">
            <Cable className="size-3.5 text-zinc-300" /> Infinite Lead Connectivity
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white">Native Integrations</h1>
          <p className="text-zinc-400 text-lg leading-relaxed">
            Eliminate copy-pasting. Seamlessly sync leads from top advertising sources directly into your customized pipeline instantly.
          </p>
        </div>

        {/* Integration Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {integrations.map((item) => (
            <div 
              key={item.name} 
              className="bg-zinc-950/40 border border-zinc-900 hover:border-zinc-800 p-6 rounded-3xl transition-all duration-300 flex flex-col justify-between group shadow-xl hover:shadow-zinc-950/20"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className="size-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                    {item.icon}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-zinc-800 bg-zinc-900/60 text-zinc-400">
                    {item.tag}
                  </span>
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-base font-bold text-white group-hover:text-zinc-100 transition-colors">
                    {item.name}
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
              <div className="pt-6 border-t border-zinc-900 mt-6 flex justify-between items-center text-xs font-semibold">
                <span className="text-zinc-500">{item.status}</span>
                <span className="text-zinc-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer">
                  Setup Integration <ArrowRight className="size-3 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </main>

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
