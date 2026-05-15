import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Building2,
  Users,
  GitBranch,
  Route,
  Plug,
  CreditCard,
} from "lucide-react";

export const metadata = {
  title: "Settings | RealLeads CRM",
};

const settingsItems = [
  {
    title: "Company",
    description: "Manage your company profile, logo, and preferences.",
    icon: Building2,
    href: "/settings/company",
    ready: false,
  },
  {
    title: "Team",
    description: "Invite agents, manage roles and permissions.",
    icon: Users,
    href: "/settings/team",
    ready: false,
  },
  {
    title: "Pipeline",
    description: "Configure sales pipeline stages and flow.",
    icon: GitBranch,
    href: "/settings/pipeline",
    ready: true,
  },
  {
    title: "Routing",
    description: "Set up lead assignment and routing rules.",
    icon: Route,
    href: "/settings/routing",
    ready: false,
  },
  {
    title: "Integrations",
    description: "Connect webhooks, Google Ads, and Facebook Ads.",
    icon: Plug,
    href: "/settings/integrations",
    ready: false,
  },
  {
    title: "Billing",
    description: "Manage subscription, plans, and invoices.",
    icon: CreditCard,
    href: "/settings/billing",
    ready: false,
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Configure your workspace and integrations.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {settingsItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.title}
              href={item.ready ? item.href : "#"}
              className={item.ready ? "" : "pointer-events-none opacity-60"}
            >
              <Card className="h-full transition-colors hover:bg-muted/50">
                <CardHeader className="flex flex-row items-center space-x-3 space-y-0 pb-2">
                  <div className="rounded-md bg-primary/10 p-2">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-base">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{item.description}</CardDescription>
                  {!item.ready && (
                    <span className="mt-2 inline-block text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                      Coming Soon
                    </span>
                  )}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
