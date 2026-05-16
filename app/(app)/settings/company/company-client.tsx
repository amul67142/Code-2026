"use client";

import { useState, useEffect, useRef } from "react";
import { getCompanySettings, updateCompanySettings, uploadCompanyLogo } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Upload, Building2, Globe, DollarSign, Mail } from "lucide-react";

const TIMEZONES = [
  "Asia/Kolkata",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Dubai",
  "Asia/Singapore",
  "Australia/Sydney",
];

const CURRENCIES = [
  { code: "INR", label: "₹ INR — Indian Rupee" },
  { code: "USD", label: "$ USD — US Dollar" },
  { code: "EUR", label: "€ EUR — Euro" },
  { code: "GBP", label: "£ GBP — British Pound" },
  { code: "AED", label: "د.إ AED — UAE Dirham" },
  { code: "SGD", label: "$ SGD — Singapore Dollar" },
  { code: "AUD", label: "$ AUD — Australian Dollar" },
];

interface CompanyData {
  id: string;
  name: string;
  logo_url: string | null;
  timezone: string | null;
  currency: string | null;
  billing_email: string | null;
}

export function CompanyClient() {
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    timezone: "Asia/Kolkata",
    currency: "INR",
    billing_email: "",
  });

  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      const res = await getCompanySettings();
      if (res.error) {
        toast.error(res.error);
      } else if (res.company) {
        setCompany(res.company as CompanyData);
        setForm({
          name: res.company.name || "",
          timezone: res.company.timezone || "Asia/Kolkata",
          currency: res.company.currency || "INR",
          billing_email: res.company.billing_email || "",
        });
      }
      setLoading(false);
    }
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const res = await updateCompanySettings(form);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Company settings updated!");
    }
    setSaving(false);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const fd = new FormData();
    fd.append("logo", file);

    const res = await uploadCompanyLogo(fd);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Logo uploaded!");
      if (res.url) {
        setCompany((prev) => prev ? { ...prev, logo_url: res.url! } : prev);
      }
    }
    setUploading(false);
    // Reset input
    if (logoInputRef.current) logoInputRef.current.value = "";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="size-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Logo Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="size-5" /> Company Logo
          </CardTitle>
          <CardDescription>Upload your company logo (max 2MB, PNG/JPG/SVG).</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center size-20 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 overflow-hidden">
              {company?.logo_url ? (
                <img
                  src={company.logo_url}
                  alt="Company logo"
                  className="size-full object-contain"
                />
              ) : (
                <Building2 className="size-8 text-gray-300" />
              )}
            </div>
            <div>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                className="hidden"
                onChange={handleLogoUpload}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => logoInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="size-3.5 animate-spin mr-1.5" />
                ) : (
                  <Upload className="size-3.5 mr-1.5" />
                )}
                {uploading ? "Uploading..." : "Upload Logo"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Company Settings</CardTitle>
          <CardDescription>Manage your workspace details.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-5">
            {/* Company Name */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="companyName" className="flex items-center gap-1.5">
                <Building2 className="size-3.5" /> Company Name
              </Label>
              <Input
                id="companyName"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Acme Corp"
              />
            </div>

            {/* Timezone */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="timezone" className="flex items-center gap-1.5">
                <Globe className="size-3.5" /> Timezone
              </Label>
              <select
                id="timezone"
                value={form.timezone}
                onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                className="h-9 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>

            {/* Currency */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="currency" className="flex items-center gap-1.5">
                <DollarSign className="size-3.5" /> Currency
              </Label>
              <select
                id="currency"
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className="h-9 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Billing Email */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="billingEmail" className="flex items-center gap-1.5">
                <Mail className="size-3.5" /> Billing Email
              </Label>
              <Input
                id="billingEmail"
                type="email"
                value={form.billing_email}
                onChange={(e) => setForm({ ...form, billing_email: e.target.value })}
                placeholder="billing@company.com"
              />
            </div>

            {/* Save */}
            <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
              {saving ? <Loader2 className="size-4 animate-spin mr-1.5" /> : null}
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
