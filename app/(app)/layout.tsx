import { Sidebar, MobileSidebar, Header } from "@/components/app-shell";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Authenticated app layout.
 * Sidebar + Header + scrollable content area.
 * All routes inside (app) group use this layout.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get current pathname injected by middleware
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || "";

  // Check if user has completed onboarding (has a public.users profile)
  const adminClient = createAdminClient();
  const { data: userProfile } = await adminClient
    .from("users")
    .select("id, role, company_id, name")
    .eq("auth_user_id", user.id)
    .single();

  const isOnboarded = !!userProfile;

  // Enforce onboarding route logic
  if (!isOnboarded && pathname !== "/onboarding") {
    redirect("/onboarding");
  }

  if (isOnboarded && pathname === "/onboarding") {
    redirect("/dashboard");
  }

  // If not onboarded and on the onboarding page, ONLY render the children (no sidebar/header)
  if (!isOnboarded) {
    return <>{children}</>;
  }

  // Render full app shell for onboarded users
  return (
    <div className="flex h-screen overflow-hidden bg-[#F7F8FA]">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Mobile sidebar (drawer) */}
      <MobileSidebar />

      {/* Main content area */}
      <div className="flex flex-1 flex-col min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
