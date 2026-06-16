import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import { Suspense } from "react";
import { Providers } from "@/components/providers";
import { FacebookPixelEvents } from "@/components/FacebookPixelEvents";
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
        {/* Facebook Pixel */}
        <Script id="facebook-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '1322012359385066');
            fbq('track', 'PageView');
          `}
        </Script>
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src="https://www.facebook.com/tr?id=1322012359385066&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
        <Suspense fallback={null}>
          <FacebookPixelEvents />
        </Suspense>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
