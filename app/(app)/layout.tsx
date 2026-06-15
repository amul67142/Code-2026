import { Sidebar, MobileSidebar, Header } from "@/components/app-shell";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { UserProvider, type UserProfile } from "@/lib/user-context";
import { hasActiveAccess } from "@/lib/billing/access";
import { AutoLogout } from "@/components/auto-logout";

export const metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

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

  // Check if user has completed onboarding (has a public.users profile AND company name is not "Pending Onboarding")
  const adminClient = createAdminClient();
  const { data: userProfile } = await adminClient
    .from("users")
    .select("id, role, company_id, name, email, companies(name)")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  // Check subscription status (include current_period_end for cancelled grace period)
  let hasPaid = false;
  if (userProfile?.company_id) {
    const { data: sub } = await adminClient
      .from("subscriptions")
      .select("status, current_period_end")
      .eq("company_id", userProfile.company_id)
      .maybeSingle();
    hasPaid = hasActiveAccess(sub);
  }

  const companyName = (userProfile?.companies as any)?.name;
  const isOnboarded = !!userProfile && companyName && companyName !== "Pending Onboarding";

  // Enforce payment redirect if they haven't paid yet
  if (!hasPaid) {
    if (pathname !== "/select-plan") {
      redirect("/select-plan");
    }
  } else {
    // If they have paid, but haven't onboarded yet
    if (!isOnboarded && pathname !== "/onboarding") {
      redirect("/onboarding");
    }
    // If they have paid AND onboarded, they shouldn't go to onboarding or select-plan
    if (isOnboarded && (pathname === "/onboarding" || pathname === "/select-plan")) {
      redirect("/dashboard");
    }
  }

  // If not fully onboarded (either not paid or on the onboarding page), ONLY render the children (no sidebar/header)
  if (!hasPaid || !isOnboarded) {
    return <>{children}</>;
  }

  // Fetch company info for the context
  const { data: company } = await adminClient
    .from("companies")
    .select("name, logo_url")
    .eq("id", userProfile.company_id)
    .single();

  const userCtx: UserProfile = {
    id: userProfile.id,
    name: userProfile.name || user.email?.split("@")[0] || "User",
    email: userProfile.email || user.email || "",
    role: userProfile.role || "AGENT",
    companyId: userProfile.company_id,
    companyName: company?.name || "My Company",
    companyLogo: company?.logo_url || null,
  };

  // Render full app shell for onboarded users
  return (
    <UserProvider user={userCtx}>
      <AutoLogout />
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
    </UserProvider>
  );
}
