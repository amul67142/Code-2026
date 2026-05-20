"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, HelpCircle, ChevronDown, ChevronUp, Mail, Phone, MapPin } from "lucide-react";

export default function HelpPage() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const faqs = [
    {
      q: "How do I upgrade to the Pro plan in Indian Rupees (INR)?",
      a: "Indian customer transactions are processed in INR through local card and net banking processing channels. Simply toggle the currency state switcher on our landing page or billing page to 'INR pricing' and proceed to standard secure checkout. Subscription settlements typically reflect within minutes on your user dashboard.",
    },
    {
      q: "How does the smart telephony callback scheduling operate?",
      a: "Our smart telephony system operates purely on standard communication channels to route callback leads. The absolute instant a lead registers via active integrations or webhook nodes, our CRM establishes standard connections between your sales representative and the prospect dynamically, saving valuable follow-up time.",
    },
    {
      q: "Is my imported customer pipeline data secure on BigLead?",
      a: "Yes. All ingested prospects and lead parameters are fully isolated on private virtual database instances hosted via Supabase. We enforce strict Row Level Security (RLS) policies at the query level, ensuring client organizations can never view or write data outside their respective workspace containers. All data is encrypted with AES-256 at rest.",
    },
    {
      q: "What is the processing window for cancellation refunds?",
      a: "You can request subscription cancellation inside dashboard settings at any time. Authorized refunds are processed over standard domestic banking networks and typically reflect in the client's source bank card or UPI portal within 5 to 7 business days.",
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
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Help Center</span>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 container mx-auto px-4 py-16 max-w-4xl relative z-10">
        <div className="space-y-6 mb-12 text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-semibold">
            <HelpCircle className="size-3.5 text-zinc-350" /> Support Desk FAQ
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white">How can we help?</h1>
          <p className="text-zinc-400 text-lg leading-relaxed">
            Find immediate answers regarding workspace configurations, payment settlements in INR, database safety parameters, and API webhooks.
          </p>
        </div>

        {/* FAQs Accordion */}
        <div className="space-y-4 max-w-3xl mx-auto">
          {faqs.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div 
                key={idx} 
                className="bg-zinc-950/45 border border-zinc-900 hover:border-zinc-850 rounded-2xl overflow-hidden transition-all duration-300 shadow-lg"
              >
                <button
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  className="w-full text-left p-5 md:p-6 flex justify-between items-center gap-4 focus:outline-none"
                >
                  <span className="text-sm md:text-base font-bold text-white tracking-tight">
                    {faq.q}
                  </span>
                  <span className="text-zinc-500 shrink-0">
                    {isOpen ? <ChevronUp className="size-5" /> : <ChevronDown className="size-5" />}
                  </span>
                </button>
                <div 
                  className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-[300px] border-t border-zinc-900/60' : 'max-h-0'}`}
                >
                  <p className="p-5 md:p-6 text-xs md:text-sm text-zinc-400 leading-relaxed bg-zinc-950/20">
                    {faq.a}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Support Card */}
        <div className="mt-16 bg-gradient-to-b from-zinc-900/40 to-transparent border border-zinc-900 p-8 rounded-3xl max-w-3xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-xl">
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-white">Still have questions?</h3>
            <p className="text-xs md:text-sm text-zinc-400 max-w-md leading-relaxed">
              Our direct support and system engineering desks are ready to assist you with customized configurations.
            </p>
          </div>
          <Link 
            href="/contact" 
            className="px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-semibold shadow-md transition-colors cursor-pointer"
          >
            Contact Helpdesk
          </Link>
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
