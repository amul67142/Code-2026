import { CompanyClient } from "./company-client";

export const metadata = {
  title: "Company Settings | RealLeads CRM",
};

export default function CompanySettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Company Settings</h1>
        <p className="text-muted-foreground">
          Manage your workspace profile, logo, and preferences.
        </p>
      </div>
      <CompanyClient />
    </div>
  );
}
