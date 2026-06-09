import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import { Providers } from "@/components/providers";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Big Lead CRM",
    template: "%s — Big Lead CRM",
  },
  description:
    "Capture, assign, track, and close every real estate lead from one simple dashboard.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
};

/**
 * Root layout — wraps the entire app with font, providers, and base structure.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <head>
        {/* llm.txt - AI discovery files */}
        <link rel="help" type="text/plain" href="/llm.txt" />
        <link rel="help" type="text/plain" href="/llm-full.txt" title="BigLead CRM Full Documentation" />
        {/* Instant redirect for invite links — runs before React hydration */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            var h=window.location.hash;
            if(h && h.indexOf('type=invite')!==-1 && window.location.pathname==='/'){
              window.location.replace('/invite'+h);
            }
          })();
        `}} />
      </head>
      <body className="min-h-full font-sans antialiased">
        {/* Google Analytics Tag */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-HKP97THEQ3"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-HKP97THEQ3');
          `}
        </Script>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
