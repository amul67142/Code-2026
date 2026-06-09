import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://biglead.site";
  
  return {
    rules: [
      {
        // 1. General Search & AI Crawlers
        userAgent: "*",
        allow: ["/", "/login", "/signup", "/llm.txt", "/llm-full.txt"],
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
        allow: ["/", "/llm.txt", "/llm-full.txt"],
        disallow: ["/dashboard", "/dashboard/*", "/api", "/api/*", "/settings", "/settings/*"],
      },
      {
        // 3. Specific AI Crawler - Claude (ClaudeBot / Claude-Web)
        userAgent: "Claude-Web",
        allow: ["/", "/llm.txt", "/llm-full.txt"],
        disallow: ["/dashboard", "/dashboard/*", "/api", "/api/*", "/settings", "/settings/*"],
      },
      {
        // 4. Specific AI Crawler - Perplexity (PerplexityBot)
        userAgent: "PerplexityBot",
        allow: ["/", "/llm.txt", "/llm-full.txt"],
        disallow: ["/dashboard", "/dashboard/*", "/api", "/api/*", "/settings", "/settings/*"],
      },
      {
        // 5. Google AI - Gemini (Google-Extended)
        userAgent: "Google-Extended",
        allow: ["/", "/llm.txt", "/llm-full.txt"],
        disallow: ["/dashboard", "/dashboard/*", "/api", "/api/*", "/settings", "/settings/*"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
