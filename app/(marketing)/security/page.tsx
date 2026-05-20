import Link from "next/link";
import { ArrowLeft, ShieldAlert, Key, Server, Lock, ClipboardCheck, ArrowRight } from "lucide-react";

export const metadata = {
  title: "Security Operations & Compliance — BigLead",
  description: "Understand BigLead CRM's database protections, encryption methodologies, and standard telephony routing compliance policies.",
};

export default function SecurityPage() {
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
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Security Assurance</span>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 container mx-auto px-4 py-16 max-w-4xl relative z-10">
        <div className="space-y-6 mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-semibold">
            <ShieldAlert className="size-3.5 text-emerald-400" /> Active Security Posture: Verified
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white">Security Operations</h1>
          <p className="text-zinc-400 text-lg leading-relaxed">
            Data security is engineered into the absolute foundation of BigLead CRM. We employ industry-standard protocols, encrypted data handling, and sandboxed storage systems to safeguard your customer records and sales pipelines.
          </p>
        </div>

        <div className="space-y-10 text-zinc-300 leading-relaxed text-sm md:text-base border-t border-zinc-900 pt-10">
          
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-zinc-500 text-sm font-mono">01.</span> Encrypted Storage & Data Transmissions
            </h2>
            <p>
              Every transaction, pipeline change, and prospect upload routed through BigLead is fully guarded under multiple layers of modern cryptography:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-zinc-400 text-sm">
              <li>
                <strong className="text-zinc-300">Data In-Transit:</strong> All platform communications are encrypted utilizing Transport Layer Security (TLS 1.3) protocols over HTTPS, eliminating man-in-the-middle exploits.
              </li>
              <li>
                <strong className="text-zinc-300">Data At-Rest:</strong> Client database containers are encrypted using Advanced Encryption Standard (AES-256) at our datacenters, keeping sensitive telephony metadata, phone logs, and lead parameters absolutely isolated.
              </li>
            </ul>
          </section>

          {/* Section 2 */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-zinc-500 text-sm font-mono">02.</span> Architecture Safeguards
            </h2>
            <p>
              Rather than generic shared storage clusters, we coordinate lead pipelines across secure virtual private instances to prevent data leakage:
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
              <div className="bg-zinc-950/50 border border-zinc-850 p-5 rounded-2xl space-y-2">
                <div className="size-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
                  <Key className="size-4.5 text-blue-400" />
                </div>
                <h4 className="font-bold text-sm text-white">Row Level Security</h4>
                <p className="text-xs text-zinc-500">Supabase SQL triggers guarantee strict tenant isolation—Workspaces can never view or write into neighboring organization collections.</p>
              </div>

              <div className="bg-zinc-950/50 border border-zinc-850 p-5 rounded-2xl space-y-2">
                <div className="size-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
                  <Server className="size-4.5 text-violet-400" />
                </div>
                <h4 className="font-bold text-sm text-white">Cloud Firewalls</h4>
                <p className="text-xs text-zinc-500">Automated Web Application Firewalls (WAF) filter malicious payloads, SQL injection threats, and DDoS spikes dynamically.</p>
              </div>

              <div className="bg-zinc-950/50 border border-zinc-850 p-5 rounded-2xl space-y-2">
                <div className="size-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
                  <Lock className="size-4.5 text-emerald-400" />
                </div>
                <h4 className="font-bold text-sm text-white">Gateway Tokenization</h4>
                <p className="text-xs text-zinc-500">We do not store credit cards or net banking logins. Our secure payment processor handles subscription settlements over direct certified token pipelines.</p>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-zinc-500 text-sm font-mono">03.</span> Telephony Integration Safety Rules
            </h2>
            <p>
              To maintain absolute compliance with standard telecommunication guidelines, we implement robust safety gates:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-zinc-400 text-sm">
              <li>Callback operations are strictly initialized on-demand and routing is conducted over standard telecommunication trunks.</li>
              <li>Authentication checks block third-party accounts from triggering events or webhooks in your registered workflows.</li>
              <li>Detailed audit logs trace every automated trigger, webhook response, and team operation to prevent staff misuse.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-zinc-500 text-sm font-mono">04.</span> Continuous Auditing and Updates
            </h2>
            <p>
              Our infrastructure is continuously monitored for security updates and dependency upgrades. We conduct regular automated vulnerability scanning and code reviews on updates before pushing to production networks.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-4 border-t border-zinc-900 pt-8 mt-8">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-zinc-500 text-sm font-mono">05.</span> Incident Response & Vulnerability Disclosure
            </h2>
            <p>
              We maintain an active security monitoring program. If you suspect an authentication bug, data access anomaly, or configuration vulnerability, please report it immediately to our security safety desk for swift verification and patch deployment:
            </p>
            
            <div className="bg-zinc-950/40 border border-zinc-850 p-6 rounded-2xl text-sm font-medium space-y-2 max-w-lg">
              <p className="text-zinc-300">
                <strong>BigLead Security Desk</strong>
              </p>
              <p className="text-zinc-400 leading-relaxed text-xs">
                Incident Response Email: <a href="mailto:info@biglead.site" className="text-white hover:underline font-semibold">info@biglead.site</a><br />
                General Helpdesk: <a href="mailto:info@biglead.site" className="text-white hover:underline font-semibold">info@biglead.site</a><br />
                Helpline Support: <a href="tel:+917982894432" className="text-white hover:underline font-semibold">+91 79828 94432</a>
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
