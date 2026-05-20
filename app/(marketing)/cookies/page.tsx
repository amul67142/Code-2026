import Link from "next/link";
import { ArrowLeft, Cookie, Info, ToggleLeft, HelpCircle } from "lucide-react";

export const metadata = {
  title: "Cookies Policy — BigLead",
  description: "Learn about how BigLead CRM uses cookies, session identifiers, and local tokens to deliver secure workflows.",
};

export default function CookiesPage() {
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
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Cookies Policy</span>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 container mx-auto px-4 py-16 max-w-4xl relative z-10">
        <div className="space-y-6 mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-semibold">
            <Cookie className="size-3.5 text-amber-400" /> Transparent Cookie Policy
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white">Cookies Policy</h1>
          <p className="text-zinc-400 text-lg leading-relaxed">
            BigLead CRM uses standard web cookies, local browser storage tokens, and session identifiers to operate our platform securely, keep you logged in, and facilitate subscription transactions.
          </p>
        </div>

        <div className="space-y-10 text-zinc-300 leading-relaxed text-sm md:text-base border-t border-zinc-900 pt-10">
          
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-zinc-500 text-sm font-mono">01.</span> What is a Cookie?
            </h2>
            <p>
              Cookies are minor text strings downloaded onto your desktop, tablet, or smartphone when you browse online interfaces. They permit the web application to recognize your session credentials, retain custom options (like dark modes or interface tables), and authorize operations securely.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-zinc-500 text-sm font-mono">02.</span> How BigLead CRM Coordinates Cookies
            </h2>
            <p>
              We prioritize data cleanliness. We do not integrate excessive cross-site ad tracker pixels. The cookies deployed across our pages fall exclusively under these specific operations:
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
              <div className="bg-zinc-950/50 border border-zinc-850 p-5 rounded-2xl space-y-2">
                <div className="size-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
                  <Cookie className="size-4.5 text-zinc-300" />
                </div>
                <h4 className="font-bold text-sm text-white">Strictly Necessary Cookies</h4>
                <p className="text-xs text-zinc-500 font-medium">Deployed to confirm your active workspace registration, verify your Supabase database logins, and maintain account state security as you edit pipeline leads.</p>
              </div>

              <div className="bg-zinc-950/50 border border-zinc-850 p-5 rounded-2xl space-y-2">
                <div className="size-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
                  <ToggleLeft className="size-4.5 text-zinc-300" />
                </div>
                <h4 className="font-bold text-sm text-white">Functional Preferences</h4>
                <p className="text-xs text-zinc-500 font-medium">Deploys settings to preserve UI preferences, currency selection states (USD/INR pricing selector toggle), and dashboard navigation views.</p>
              </div>

              <div className="bg-zinc-950/50 border border-zinc-850 p-5 rounded-2xl space-y-2 md:col-span-2">
                <div className="size-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
                  <Info className="size-4.5 text-zinc-300" />
                </div>
                <h4 className="font-bold text-sm text-white">Payment Operations (PayU Gateway)</h4>
                <p className="text-xs text-zinc-500 font-medium">Standard third-party gateway compliance tokens issued strictly during invoice checkout or plan subscription to verify anti-fraud billing variables. No payment card numbers or credit profiles are stored by these cookies.</p>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-zinc-500 text-sm font-mono">03.</span> Managing & Blocking Deployed Cookies
            </h2>
            <p>
              You have complete liberty to restrict, filter, or delete cookies placed by web portals. If you wish to adjust browser cookie preferences, you can edit settings within your application framework:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-zinc-400 text-sm">
              <li>Google Chrome: Settings &gt; Privacy and Security &gt; Third-party cookies</li>
              <li>Apple Safari: Settings &gt; Privacy &gt; Prevent cross-site tracking / Block cookies</li>
              <li>Mozilla Firefox: Settings &gt; Privacy &gt; Enhanced Tracking Protection</li>
            </ul>
            <p className="bg-zinc-950/50 border border-zinc-850 rounded-2xl p-4 text-xs text-zinc-400">
              <strong>Please Note:</strong> Blocking essential session cookies will immediately impact CRM usability. You will be automatically logged out, and we will be unable to confirm pipeline updates, CSV uploads, or subscription details.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-4 border-t border-zinc-900 pt-8 mt-8">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-zinc-500 text-sm font-mono">04.</span> Cookie Policy Updates
            </h2>
            <p>
              We reserve the right to revise this Cookies Policy in tandem with platform enhancements, sub-processor upgrades, or local data safety legislation. For further questions regarding our cookie practices, please contact our help desk:
            </p>
            
            <div className="bg-zinc-950/40 border border-zinc-850 p-6 rounded-2xl text-sm font-medium space-y-2 max-w-lg">
              <p className="text-zinc-300">
                <strong>BigLead CRM Support Desk</strong>
              </p>
              <p className="text-zinc-400 leading-relaxed text-xs">
                Email Address: <a href="mailto:info@biglead.site" className="text-white hover:underline font-semibold">info@biglead.site</a><br />
                Operating Address: Sector 47, Gurgaon, Haryana — 122001, India<br />
                Administrative Hotline: <a href="tel:+917982894432" className="text-white hover:underline font-semibold">+91 79828 94432</a>
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
