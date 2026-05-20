import Link from "next/link";
import { ArrowLeft, Shield, Eye, Lock, Database, Mail } from "lucide-react";

export const metadata = {
  title: "Privacy Policy — BigLead",
  description: "Understand how BigLead CRM protects and secures your customer lead data, transaction records, and account credentials.",
};

export default function PrivacyPage() {
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
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Privacy Policy</span>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 container mx-auto px-4 py-16 max-w-4xl relative z-10">
        <div className="space-y-6 mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-semibold">
            <Shield className="size-3.5" /> Last Updated: May 20, 2026
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white">Privacy Policy</h1>
          <p className="text-zinc-400 text-lg leading-relaxed">
            Your privacy, database security, and prospect confidentiality are fundamental to our architecture. This Privacy Policy details how BigLead collects, secures, and handles your information.
          </p>
        </div>

        <div className="space-y-10 text-zinc-300 leading-relaxed text-sm md:text-base border-t border-zinc-900 pt-10">
          
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-zinc-500 text-sm font-mono">01.</span> Core Privacy Pledge
            </h2>
            <p>
              At <strong>BigLead</strong>, we operate under a strict core directive: <strong>We do not sell, rent, monetize, or disclose your ingested prospect records or customer pipeline data to any third party under any circumstances.</strong> Your leads remain strictly yours.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-zinc-500 text-sm font-mono">02.</span> Information We Collect
            </h2>
            <p>
              To deliver CRM coordination and telephony trigger capabilities, we collect the following classes of data:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-zinc-400 text-sm">
              <li>
                <strong className="text-zinc-300">Account Credentials:</strong> Name, professional email address (`info@biglead.site` for platform administration), telephone numbers, and corporate authentication profile details during subscription sign-up.
              </li>
              <li>
                <strong className="text-zinc-300">Ingested Pipeline Leads:</strong> Prospect records uploaded via CSV, synced from Facebook Lead Ads/Google Ads webhooks, or entered manually into your dashboard.
              </li>
              <li>
                <strong className="text-zinc-300">Payment & Billing Logins:</strong> Billing country, tax identifiers (GST/PAN in India), and subscription details. Payment cards and banking credentials are never saved on our servers; they are processed entirely through standard PCI-DSS compliant Indian gateways.
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-zinc-500 text-sm font-mono">03.</span> How We Process Your Information
            </h2>
            <p>
              We process your accounts and ingested leads strictly to fulfill services requested:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-zinc-400 text-sm">
              <li>To organize your sales pipeline stages (New Lead, Contacted, Negotiation, Closed Won).</li>
              <li>To trigger smart callback and call routing utilities when a lead is captured.</li>
              <li>To deliver critical billing invoices, platform maintenance alerts, and service updates.</li>
              <li>To prevent malicious abuse, automated pipeline spamming, or server overloads.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-zinc-500 text-sm font-mono">04.</span> Core Data Sub-Processors
            </h2>
            <p>
              To maintain cloud reliability and high security, we coordinate with the following selected infrastructure and compliance sub-processors:
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
              <div className="bg-zinc-950/50 border border-zinc-850 p-5 rounded-2xl space-y-2">
                <div className="size-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
                  <Database className="size-4.5" />
                </div>
                <h4 className="font-bold text-sm text-white">Supabase</h4>
                <p className="text-xs text-zinc-500">Secure SQL database cluster storage, managing accounts & encrypted leads.</p>
              </div>

              <div className="bg-zinc-950/50 border border-zinc-850 p-5 rounded-2xl space-y-2">
                <div className="size-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
                  <Mail className="size-4.5" />
                </div>
                <h4 className="font-bold text-sm text-white">Resend</h4>
                <p className="text-xs text-zinc-500">Secure transactional email delivery for team invitations and notifications.</p>
              </div>

              <div className="bg-zinc-950/50 border border-zinc-850 p-5 rounded-2xl space-y-2">
                <div className="size-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
                  <Lock className="size-4.5" />
                </div>
                <h4 className="font-bold text-sm text-white">Payment Processor</h4>
                <p className="text-xs text-zinc-500">Encrypted tokenization and PCI-DSS subscription charge settlements in INR/USD.</p>
              </div>
            </div>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-zinc-500 text-sm font-mono">05.</span> Information Security & Encryption
            </h2>
            <p>
              BigLead employs standard enterprise-grade security controls. All platform data is encrypted in transit using Transport Layer Security (TLS 1.3) and at rest using AES-256 standard encryption on our cloud host networks. We regularly audit access controls and limit database accessibility to specialized, vetted infrastructure administrators.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-zinc-500 text-sm font-mono">06.</span> Data Retention and Deletion Rights
            </h2>
            <p>
              We retain account data and pipeline lead sheets only for as long as your workspace remains registered and active. You have full structural rights over your workspace information:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-zinc-400 text-sm">
              <li><strong className="text-zinc-300">Export:</strong> You can download your complete lead pipelines into clean CSV sheets at any time.</li>
              <li><strong className="text-zinc-300">Deletion:</strong> Deleting a prospect record or pipeline stage purges the respective row instantly from active cache database collections.</li>
              <li><strong className="text-zinc-300">Account Erasure:</strong> If you request full account termination, we will permanently scrub all database rows relating to your corporate tenant within 30 days.</li>
            </ul>
          </section>

          {/* Section 7 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-zinc-500 text-sm font-mono">07.</span> Privacy Compliance and Inquiries
            </h2>
            <p>
              BigLead is fully compliant with applicable data security standards in the Republic of India. If you have any inquiries regarding data protection, access request logs, or privacy rights, please contact our data safety desk:
            </p>
            
            <div className="bg-zinc-950/40 border border-zinc-850 p-6 rounded-2xl text-sm font-medium space-y-2 max-w-lg">
              <p className="text-zinc-300">
                <strong>BigLead Data Safety Officer</strong>
              </p>
              <p className="text-zinc-400 leading-relaxed text-xs">
                Operating Address: Sector 47, Gurgaon, Haryana — 122001, India<br />
                Direct Desk Email: <a href="mailto:info@biglead.site" className="text-white hover:underline font-semibold">info@biglead.site</a><br />
                Administrative Helpline: <a href="tel:+917982894432" className="text-white hover:underline font-semibold">+91 79828 94432</a>
              </p>
            </div>
          </section>

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
