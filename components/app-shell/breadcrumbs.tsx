"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Fragment } from "react";

/** Route segment → display label mapping */
const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  leads: "Leads",
  kanban: "Pipeline",
  tasks: "Tasks",
  projects: "Projects",
  reports: "Reports",
  settings: "Settings",
  company: "Company",
  team: "Team",
  pipeline: "Pipeline",
  routing: "Routing",
  integrations: "Integrations",
  webhooks: "Webhooks",
  billing: "Billing",
  new: "New",
  import: "Import",
  overview: "Overview",
  agents: "Agents",
  sources: "Sources",
  campaigns: "Campaigns",
  onboarding: "Onboarding",
};

/**
 * Dynamic breadcrumbs based on route segments.
 * Renders: Home > Segment > Segment
 */
export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname
    .split("/")
    .filter(Boolean)
    .filter((s) => !s.startsWith("("));

  if (segments.length === 0) return null;

  return (
    <nav className="flex items-center gap-1 text-sm">
      {segments.map((segment, idx) => {
        const href = "/" + segments.slice(0, idx + 1).join("/");
        const label = SEGMENT_LABELS[segment] || segment;
        const isLast = idx === segments.length - 1;

        return (
          <Fragment key={href}>
            {idx > 0 && (
              <ChevronRight className="size-3 text-gray-400 shrink-0" />
            )}
            {isLast ? (
              <span className="text-gray-900 font-medium truncate max-w-[160px]">
                {label}
              </span>
            ) : (
              <Link
                href={href}
                className="text-gray-500 hover:text-gray-700 truncate max-w-[120px]"
              >
                {label}
              </Link>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
