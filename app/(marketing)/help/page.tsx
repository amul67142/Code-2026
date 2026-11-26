import { FAQ } from "@/lib/support/faq";
import HelpClient from "./help-client";

export const metadata = {
  title: "Help Center — BigLead CRM",
  description:
    "Answers to common BigLead CRM questions: connecting Facebook lead ads, WhatsApp payment errors, templates, Live Chat, adding your team, billing and WhatsApp credits.",
  alternates: { canonical: "/help" },
};

/** FAQ structured data so search engines can show the answers directly. */
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.flatMap((g) =>
    g.items.map((i) => ({
      "@type": "Question",
      name: i.q,
      acceptedAnswer: { "@type": "Answer", text: i.a },
    }))
  ),
};

export default function HelpPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\u003c") }}
      />
      <HelpClient groups={FAQ} />
    </>
  );
}
