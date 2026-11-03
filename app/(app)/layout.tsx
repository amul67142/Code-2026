import { Sidebar, MobileSidebar, Header } from "@/components/app-shell";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCachedAuthUser } from "@/lib/auth/cached-user";
import { UserProvider, type UserProfile } from "@/lib/user-context";
import { getAccessFlags, type AccessFlags } from "@/lib/billing/state";
import { BillingNotice } from "@/components/app-shell/billing-notice";
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
  // Request-deduped auth — shares one auth round-trip with page actions.
  const user = await getCachedAuthUser();

  if (!user) {
    redirect("/login");
  }

  // Check if user has completed onboarding (has a public.users profile AND company name is not "Pending Onboarding")
  const adminClient = createAdminClient();
  const { data: userProfile } = await adminClient
    .from("users")
    .select("id, role, company_id, name, email, companies(name)")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  // Access: a running free trial counts, and the platform company is never
  // locked. Same rule every other gate uses (lib/billing/state.ts).
  let hasPaid = false;
  let notice: AccessFlags["notice"] = null;
  if (userProfile?.company_id) {
    const flags = await getAccessFlags(userProfile.company_id);
    hasPaid = flags.access;
    notice = flags.notice;
  }

  const companyName = (userProfile?.companies as any)?.name;
  const isOnboarded = !!userProfile && companyName && companyName !== "Pending Onboarding";

  // Paywall: /select-plan and /onboarding live OUTSIDE this layout (route
  // group "(billing)"), so these redirects can never loop into themselves —
  // no pathname sniffing needed.
  if (!hasPaid) {
    redirect("/select-plan");
  }
  if (!isOnboarded) {
    redirect("/onboarding");
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
          {notice && <BillingNotice kind={notice.kind} endsAt={notice.endsAt} soon={notice.soon} />}
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
        </div>
      </div>
    </UserProvider>
  );
}
