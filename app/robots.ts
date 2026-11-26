import { MetadataRoute } from "next";

/** Signed-in areas: nothing there for a crawler. */
const PRIVATE = [
  "/dashboard",
  "/inbox",
  "/leads",
  "/my-leads",
  "/tasks",
  "/projects",
  "/reports",
  "/support",
  "/settings",
  "/ai-agent",
  "/onboarding",
  "/select-plan",
  "/owner-admin",
  "/invite",
  "/reset-password",
  "/api",
];

export default function robots(): MetadataRoute.Robots {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.biglead.site").replace(/\/$/, "");
  const disallow = PRIVATE.flatMap((p) => [p, `${p}/`]);

  return {
    // Search engines and AI crawlers (GPTBot, Claude, Perplexity, Google-Extended)
    // all get the same rules: public pages and llm.txt open, app pages closed.
    rules: [{ userAgent: "*", allow: ["/", "/llm.txt", "/llm-full.txt"], disallow }],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
