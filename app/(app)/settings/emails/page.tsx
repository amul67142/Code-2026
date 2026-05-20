import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import EmailsClient from "./emails-client";

export const metadata = {
  title: "Email Templates | Big Lead CRM",
};

export default function EmailsSettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/settings"
            className={buttonVariants({ variant: "ghost", size: "icon" })}
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Email Templates</h1>
            <p className="text-muted-foreground">
              Preview the automated emails sent by the system.
            </p>
          </div>
        </div>
      </div>
      
      <EmailsClient />
    </div>
  );
}
