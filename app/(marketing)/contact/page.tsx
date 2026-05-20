"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Phone, MapPin, ArrowLeft, Send, CheckCircle2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function ContactPage() {
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) return;
    setIsSubmitting(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSubmitting(false);
    setIsSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-black text-gray-100 flex flex-col font-sans">
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff04_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none opacity-50 z-0" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[400px] bg-gradient-to-b from-zinc-900/40 to-transparent blur-3xl pointer-events-none z-0" />

      {/* Header */}
      <header className="border-b border-zinc-900 backdrop-blur-md sticky top-0 z-40 bg-black/90">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-6xl">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight hover:text-white transition-colors">
            <ArrowLeft className="size-4" /> Back to Home
          </Link>
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Contact Us</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-16 max-w-6xl relative z-10 flex flex-col justify-center">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white">Get in Touch</h1>
          <p className="text-zinc-400 text-lg leading-relaxed">
            Have questions about BigLead CRM plans, onboarding, or integrations? We're here to help you succeed.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-stretch">
          {/* Info Card */}
          <div className="lg:col-span-2 bg-gradient-to-b from-zinc-900/60 to-black border border-zinc-800 rounded-3xl p-8 md:p-10 flex flex-col justify-between shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/20 via-zinc-900/10 to-transparent pointer-events-none opacity-50" />
            
            <div className="space-y-8 relative z-10">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">BigLead CRM</h2>
                <p className="text-zinc-500 text-sm">Official Corporate Representation</p>
              </div>

              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="size-11 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
                    <MapPin className="size-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Operating Address</h4>
                    <p className="text-sm text-zinc-300 leading-relaxed font-medium">
                      Sector 47<br />
                      Gurgaon, Haryana — 122001<br />
                      India
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="size-11 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
                    <Mail className="size-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Official Email</h4>
                    <a href="mailto:info@biglead.site" className="text-sm text-zinc-300 hover:text-white transition-colors font-medium">
                      info@biglead.site
                    </a>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="size-11 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
                    <Phone className="size-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Phone Number</h4>
                    <a href="tel:+917982894432" className="text-sm text-zinc-300 hover:text-white transition-colors font-medium">
                      +91 79828 94432
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-zinc-900 mt-8 text-zinc-600 text-xs relative z-10 font-medium">
              Registered Entity: <span className="text-zinc-400">BigLead</span>
            </div>
          </div>

          {/* Form Card */}
          <div className="lg:col-span-3 bg-zinc-900/20 border border-zinc-850 rounded-3xl p-8 md:p-10 shadow-2xl relative">
            {isSubmitted ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12 space-y-4">
                <div className="size-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="size-8" />
                </div>
                <h3 className="text-2xl font-bold text-white">Message Sent!</h3>
                <p className="text-zinc-400 text-sm max-w-sm">
                  Thank you for reaching out. A BigLead representative will get back to you at <span className="text-white font-semibold">{formData.email}</span> shortly.
                </p>
                <button 
                  onClick={() => { setIsSubmitted(false); setFormData({ name: "", email: "", phone: "", message: "" }); }}
                  className={cn(buttonVariants({ variant: "outline" }), "rounded-full text-xs cursor-pointer border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-950 mt-6 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 shadow-sm")}
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider" htmlFor="name">Full Name *</label>
                    <input 
                      id="name"
                      type="text" 
                      required
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-zinc-950/80 border border-zinc-800 focus:border-zinc-500 rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider" htmlFor="email">Email Address *</label>
                    <input 
                      id="email"
                      type="email" 
                      required
                      placeholder="john@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-zinc-950/80 border border-zinc-800 focus:border-zinc-500 rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider" htmlFor="phone">Phone Number (Optional)</label>
                  <input 
                    id="phone"
                    type="tel" 
                    placeholder="+91 XXXXXXXXXX"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-zinc-950/80 border border-zinc-800 focus:border-zinc-500 rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider" htmlFor="message">Your Message *</label>
                  <textarea 
                    id="message"
                    required
                    rows={5}
                    placeholder="Tell us what you're looking for..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full bg-zinc-950/80 border border-zinc-800 focus:border-zinc-500 rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition-colors resize-none"
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className={cn(buttonVariants({ size: "lg" }), "w-full rounded-xl font-semibold flex items-center justify-center gap-2 cursor-pointer bg-white hover:bg-zinc-100 text-black border border-transparent transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 shadow-sm h-12")}
                >
                  {isSubmitting ? "Sending..." : <>Send Message <Send className="size-4" /></>}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-8 mt-16 text-center text-xs text-zinc-600 bg-black">
        <div className="container mx-auto px-4 max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4">
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
