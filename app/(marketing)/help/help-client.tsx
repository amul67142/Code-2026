"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, HelpCircle, ChevronDown, ChevronUp } from "lucide-react";
import type { FaqGroup } from "@/lib/support/faq";

export default function HelpClient({ groups }: { groups: FaqGroup[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

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
            <HelpCircle className="size-3.5 text-zinc-400" /> Help Center
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white">How can we help?</h1>
          <p className="text-zinc-400 text-lg leading-relaxed">
            Answers about getting leads in, WhatsApp, your team and billing. Already a customer? Raise a ticket from Support inside BigLead.
          </p>
        </div>

        {/* FAQs Accordion */}
        <div className="mx-auto max-w-3xl space-y-10">
          {groups.map((g) => (
            <section key={g.title} className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500">{g.title}</h2>
              {g.items.map((faq) => {
                const id = `${g.title}:${faq.q}`;
                const isOpen = openId === id;
                return (
                  <div key={id} className="overflow-hidden rounded-2xl border border-zinc-900 bg-zinc-950/45 transition-colors hover:border-zinc-800">
                    <button
                      onClick={() => setOpenId(isOpen ? null : id)}
                      className="flex w-full items-center justify-between gap-4 p-5 text-left focus:outline-none md:p-6"
                      aria-expanded={isOpen}
                    >
                      <span className="text-sm font-bold tracking-tight text-white md:text-base">{faq.q}</span>
                      <span className="shrink-0 text-zinc-500">
                        {isOpen ? <ChevronUp className="size-5" /> : <ChevronDown className="size-5" />}
                      </span>
                    </button>
                    {isOpen && (
                      <p className="border-t border-zinc-900/60 p-5 text-sm leading-relaxed text-zinc-400 md:p-6">{faq.a}</p>
                    )}
                  </div>
                );
              })}
            </section>
          ))}
        </div>

        {/* Support Card */}
        <div className="mt-16 bg-gradient-to-b from-zinc-900/40 to-transparent border border-zinc-900 p-8 rounded-3xl max-w-3xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-xl">
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-white">Still have questions?</h3>
            <p className="text-xs md:text-sm text-zinc-400 max-w-md leading-relaxed">
              Customers can raise a ticket from Support inside BigLead, with screenshots or a screen recording. Not a customer yet? Get in touch.
            </p>
          </div>
          <Link 
            href="/contact" 
            className="px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-semibold shadow-md transition-colors cursor-pointer"
          >
            Contact us
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
