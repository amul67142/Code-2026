import Link from "next/link";
import { ArrowLeft, ShieldCheck, ScrollText, Calendar, Building, Globe } from "lucide-react";

export const metadata = {
  title: "Terms of Service — BigLead",
  description: "Terms and conditions for utilizing the BigLead CRM software and automated pipeline solutions.",
};

export default function TermsPage() {
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
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Terms of Service</span>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 container mx-auto px-4 py-16 max-w-4xl relative z-10">
        <div className="space-y-6 mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-semibold">
            <ScrollText className="size-3.5" /> Effective Date: May 20, 2026
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white">Terms of Service</h1>
          <p className="text-zinc-400 text-lg leading-relaxed">
            Please read these Terms of Service carefully before utilizing the BigLead CRM software, platform features, and telephony callback automation systems.
          </p>
        </div>

        <div className="space-y-10 text-zinc-300 leading-relaxed text-sm md:text-base border-t border-zinc-900 pt-10">
          
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-zinc-500 text-sm font-mono">01.</span> Acceptance of Agreement
            </h2>
            <p>
              By signing up, registering an account, accessing, or utilizing the CRM platform, lead ingestion endpoints, or dashboard features provided by <strong>BigLead</strong> ("we", "us", or "our"), you ("User", "Subscriber", or "Client") explicitly agree to be bound by all the terms, policies, and conditions outlined herein. If you do not agree with any part of these terms, you are prohibited from utilizing our software or services.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-zinc-500 text-sm font-mono">02.</span> Scope of Service
            </h2>
            <p>
              BigLead provides an integrated cloud-based Customer Relationship Management (CRM) platform designed to capture prospects from multi-channel advertising sources, coordinate pipelines, and trigger automated telephony callback integrations. 
            </p>
            <p className="bg-zinc-950/60 border border-zinc-850 rounded-2xl p-4 text-xs text-zinc-400 leading-relaxed">
              <strong>Compliance Notice:</strong> BigLead operates as a routing utility. Any automated callback routing or integrated telephony features provided within the dashboard are designed strictly to establish standard telephonic connections between clients and sales representatives, fully adhering to local telecommunication authorities and anti-spam protocols. We do not provide or endorse unsolicited robocalling tools.
            </p>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-zinc-500 text-sm font-mono">03.</span> Registration and Account Security
            </h2>
            <p>
              To access and configure pipeline features, you must register a corporate account and link valid authentication credentials. You are solely responsible for:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-zinc-400 text-sm">
              <li>Maintaining the confidentiality of your credentials and linked API tokens.</li>
              <li>Providing authentic, updated corporate entity information.</li>
              <li>Any activity that takes place under your registered organizational tenant.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-zinc-500 text-sm font-mono">04.</span> Subscription Billing & Pricing Plans
            </h2>
            <p>
              Subscribers agree to pay all applicable platform fees according to the subscription models chosen. Fees are displayed in both United States Dollar (USD) and Indian Rupee (INR) equivalents, structured as follows:
            </p>
            
            <div className="overflow-x-auto my-6 border border-zinc-850 rounded-2xl bg-zinc-950/40">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-zinc-900 text-zinc-400 uppercase tracking-wider text-[10px] font-bold border-b border-zinc-800">
                  <tr>
                    <th className="p-4">Plan Name</th>
                    <th className="p-4">USD Price</th>
                    <th className="p-4">INR Price (approx)</th>
                    <th className="p-4">Billing Cycle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900 text-zinc-300 font-medium">
                  <tr>
                    <td className="p-4 text-white font-bold">Basic</td>
                    <td className="p-4">$9</td>
                    <td className="p-4">₹749</td>
                    <td className="p-4">Monthly</td>
                  </tr>
                  <tr className="bg-zinc-900/20">
                    <td className="p-4 text-white font-bold">Pro</td>
                    <td className="p-4">$19</td>
                    <td className="p-4">₹1,599</td>
                    <td className="p-4">Monthly</td>
                  </tr>
                  <tr>
                    <td className="p-4 text-white font-bold">Enterprise</td>
                    <td className="p-4">Custom Contract</td>
                    <td className="p-4">Custom Contract</td>
                    <td className="p-4">Annual / Custom</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <p>
              Indian customer subscriptions are processed in Indian Rupees (INR) through local payment gateways (such as PayU). We reserve the right to modify prices or adjust currency conversions upon prior notification. Subscription renewals are billed automatically on the anniversary date.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-zinc-500 text-sm font-mono">05.</span> Cancellations and Refund Policy
            </h2>
            <p>
              You can cancel your subscription at any time via the billing settings dashboard. Upon cancellation, your access remains active until the end of the current paid billing cycle. 
            </p>
            <p>
              Refunds are issued at our sole discretion. Standard processing times apply for refunds handled through Indian banking infrastructure, typically reflecting in the user's account within 5 to 7 business days from authorization.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-zinc-500 text-sm font-mono">06.</span> Compliance with Local Telecommunication Laws
            </h2>
            <p>
              When utilizing the CRM callback or lead-dialer routing, subscribers explicitly covenant and agree that they will:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-zinc-400 text-sm">
              <li>Adhere to the Telecom Regulatory Authority of India (TRAI) guidelines, including checking national Do Not Disturb (DND) registers.</li>
              <li>Only route callback telephony to prospects who have explicitly opted in or requested communication via verified online channels.</li>
              <li>Hold BigLead harmless from any administrative penalties, litigations, or chargeback claims resulting from unauthorized lead dialing.</li>
            </ul>
          </section>

          {/* Section 7 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-zinc-500 text-sm font-mono">07.</span> Limitation of Liability
            </h2>
            <p>
              In no event shall BigLead, its directors, or its affiliates be liable for any indirect, incidental, punitive, or consequential damages (including loss of prospective business, pipeline analytics data, or lead conversion profits) arising out of the use or inability to use our CRM software. Our aggregate liability shall never exceed the fees paid by you in the immediate three (3) months preceding the claim.
            </p>
          </section>

          {/* Section 8 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-zinc-500 text-sm font-mono">08.</span> Governing Law and Jurisdiction
            </h2>
            <p>
              These Terms of Service shall be governed by, construed, and enforced in accordance with the laws of the Republic of India. Any disputes arising out of this agreement or your utilization of BigLead CRM services shall fall under the exclusive jurisdiction of the courts located in <strong>Gurgaon, Haryana, India</strong>.
            </p>
          </section>

          {/* Section 9 */}
          <section className="space-y-4 border-t border-zinc-900 pt-8 mt-8">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-zinc-500 text-sm font-mono">09.</span> Contact and Corporate Information
            </h2>
            <p>
              If you have any questions, clarifications, or support queries regarding these terms, please contact our compliance desk:
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-zinc-950/40 border border-zinc-850 p-6 rounded-2xl text-sm font-medium">
              <div className="space-y-2">
                <div className="text-xs text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Building className="size-3.5" /> Corporate Office
                </div>
                <p className="text-zinc-300">
                  <strong>BigLead</strong><br />
                  Sector 47<br />
                  Gurgaon, Haryana — 122001<br />
                  India
                </p>
              </div>
              <div className="space-y-2">
                <div className="text-xs text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Globe className="size-3.5" /> Direct Channels
                </div>
                <p className="text-zinc-300">
                  Email: <a href="mailto:info@biglead.site" className="text-white hover:underline">info@biglead.site</a><br />
                  Phone: <a href="tel:+917982894432" className="text-white hover:underline">+91 79828 94432</a><br />
                  Web: <Link href="/" className="text-white hover:underline">biglead.site</Link>
                </p>
              </div>
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
