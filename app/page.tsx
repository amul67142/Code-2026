import type { Metadata } from "next";
import HomePage from "./home-client";
import { BASIC_PRICING, TRIAL_DAYS } from "@/lib/billing/plans";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.biglead.site").replace(/\/$/, "");

const TITLE = "BigLead CRM — Real Estate CRM with WhatsApp Built In";
const DESCRIPTION =
  "Real estate CRM for builders and channel partners. Leads from Facebook & Instagram ads, Google, 99acres and your website land in one place, get assigned instantly and get a WhatsApp reply from your own number in seconds.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: [
    "real estate CRM",
    "real estate CRM India",
    "WhatsApp CRM",
    "CRM for builders",
    "CRM for channel partners",
    "Facebook lead ads CRM",
    "99acres leads CRM",
    "lead management software",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/",
    type: "website",
  },
};

/** Structured data: what BigLead is and what it costs, for search and AI answers. */
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE}/#organization`,
      name: "BigLead CRM",
      url: SITE,
      logo: `${SITE}/icon.png`,
      email: "info@biglead.site",
    },
    {
      "@type": "SoftwareApplication",
      name: "BigLead CRM",
      url: SITE,
      applicationCategory: "BusinessApplication",
      applicationSubCategory: "Real Estate CRM",
      operatingSystem: "Web",
      description: DESCRIPTION,
      publisher: { "@id": `${SITE}/#organization` },
      offers: {
        "@type": "Offer",
        price: String(BASIC_PRICING.platformFee),
        priceCurrency: "INR",
        description: `Basic plan: ₹${BASIC_PRICING.platformFee.toLocaleString("en-IN")}/month with ${BASIC_PRICING.includedSeats} users included, ₹${BASIC_PRICING.seatPrice}/month per extra user. ${TRIAL_DAYS}-day free trial.`,
        url: `${SITE}/signup`,
      },
      featureList: [
        "Native Facebook and Instagram Lead Ads capture",
        "Leads from Google Ads, 99acres, website forms and webhooks",
        "Instant auto-assignment to agents",
        "WhatsApp welcome message from your own number",
        "Two-way WhatsApp Live Chat inbox",
        "WhatsApp template builder",
        "Pipeline per project, tasks and reports",
        "Push leads to your existing CRM",
        "Meta Conversions API",
      ],
    },
  ],
};

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <HomePage />
    </>
  );
}
