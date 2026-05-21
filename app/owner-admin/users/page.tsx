import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { UsersTable } from "./UsersTable";

export const metadata = {
  title: "Users | BigLead Owner",
};

export default async function OwnerUsersPage() {
  const supabase = createAdminClient();
  
  const { data: users, error } = await supabase
    .from("users")
    .select("*, companies(name)")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Platform Users</h1>
        <p className="text-zinc-400 mt-2">
          Directory of all users across all companies on the BigLead platform.
        </p>
      </div>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            User Directory
          </CardTitle>
        </CardHeader>
        <CardContent>
          <UsersTable users={users || []} />
        </CardContent>
      </Card>
    </div>
  );
}
