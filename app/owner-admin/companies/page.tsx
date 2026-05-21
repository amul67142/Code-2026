import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2 } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { CompaniesTable } from "./CompaniesTable";

export const metadata = {
  title: "Companies | BigLead Owner",
};

export default async function OwnerCompaniesPage() {
  const supabase = createAdminClient();
  
  const { data: companies, error } = await supabase
    .from("companies")
    .select("*, users(count)")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Registered Companies</h1>
        <p className="text-zinc-400 mt-2">
          Directory of all companies registered on the BigLead platform.
        </p>
      </div>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-400" />
            Company Directory
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CompaniesTable companies={companies || []} />
        </CardContent>
      </Card>
    </div>
  );
}
