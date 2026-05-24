import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://biglead.site";
  
  return {
    rules: [
      {
        // 1. General Search & AI Crawlers
        userAgent: "*",
        allow: ["/", "/login", "/signup"], // Only allow indexable public pages
        disallow: [
          "/dashboard",
          "/dashboard/*",
          "/onboarding",
          "/onboarding/*",
          "/select-plan",
          "/settings",
          "/settings/*",
          "/api",
          "/api/*",
        ],
      },
      {
        // 2. Specific AI Crawler - ChatGPT (GPTBot)
        userAgent: "GPTBot",
        allow: ["/"],
        disallow: ["/*"], // Block ChatGPT from scanning any inner subpages
      },
      {
        // 3. Specific AI Crawler - Claude (ClaudeBot / Claude-Web)
        userAgent: "Claude-Web",
        allow: ["/"],
        disallow: ["/*"],
      },
      {
        // 4. Specific AI Crawler - Perplexity (PerplexityBot)
        userAgent: "PerplexityBot",
        allow: ["/"],
        disallow: ["/*"],
      }
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
