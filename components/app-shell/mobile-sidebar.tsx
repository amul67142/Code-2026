"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  KanbanSquare,
  CheckSquare,
  Building2,
  BarChart3,
  Settings,
  Building,
  UserPlus,
  GitBranch,
  Route,
  Plug,
  CreditCard,
  ChevronDown,
  X,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useAppStore } from "@/stores/app-store";
import { useUser, hasMinRole, ROLE_LABELS } from "@/lib/user-context";
import { useState } from "react";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Minimum role required to see this item */
  minRole?: string;
  /** Roles that should NOT see this item */
  hideForRoles?: string[];
  children?: { title: string; href: string; icon: React.ComponentType<{ className?: string }>; minRole?: string }[];
}

const navigation: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Leads", href: "/leads", icon: Users },
  { title: "My Leads", href: "/my-leads", icon: ClipboardList, hideForRoles: ["SUPER_ADMIN"] },
  { title: "Pipeline", href: "/leads/kanban", icon: KanbanSquare, minRole: "TEAM_LEAD" },
  { title: "Tasks", href: "/tasks", icon: CheckSquare },
  { title: "Projects", href: "/projects", icon: Building2, minRole: "TEAM_LEAD" },
  { title: "Reports", href: "/reports", icon: BarChart3, minRole: "TEAM_LEAD" },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    minRole: "ADMIN",
    children: [
      { title: "Company", href: "/settings/company", icon: Building, minRole: "ADMIN" },
      { title: "Team", href: "/settings/team", icon: UserPlus, minRole: "ADMIN" },
      { title: "Pipeline", href: "/settings/pipeline", icon: GitBranch, minRole: "ADMIN" },
      { title: "Routing", href: "/settings/routing", icon: Route, minRole: "ADMIN" },
      { title: "Integrations", href: "/settings/integrations", icon: Plug, minRole: "ADMIN" },
      { title: "Billing", href: "/settings/billing", icon: CreditCard, minRole: "SUPER_ADMIN" },
    ],
  },
];

/**
 * Mobile sidebar — rendered as a Sheet (drawer) overlay.
 * Role-filtered navigation matching desktop sidebar.
 */
export function MobileSidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useAppStore();
  const user = useUser();
  const [settingsOpen, setSettingsOpen] = useState(
    pathname.startsWith("/settings")
  );

  const visibleNav = navigation.filter((item) => {
    if (item.minRole && !hasMinRole(user.role, item.minRole)) return false;
    if (item.hideForRoles && item.hideForRoles.includes(user.role)) return false;
    return true;
  });

  return (
    <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <SheetContent side="left" className="w-[260px] p-0 bg-white">
        <SheetTitle className="sr-only">Navigation</SheetTitle>

        {/* Brand */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center size-8 rounded-lg bg-gray-900 text-white text-sm font-bold">
              R
            </div>
            <span className="text-sm font-semibold text-gray-900">
              {user.companyName || "RealLeads"}
            </span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-2">
          <nav className="flex flex-col gap-0.5 px-2">
            {visibleNav.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(item.href + "/");
              const hasChildren = item.children && item.children.length > 0;

              if (hasChildren) {
                const visibleChildren = item.children!.filter(
                  (child) => !child.minRole || hasMinRole(user.role, child.minRole)
                );

                if (visibleChildren.length === 0) return null;

                return (
                  <div key={item.title}>
                    <button
                      onClick={() => setSettingsOpen(!settingsOpen)}
                      className={cn(
                        "flex items-center gap-2 w-full rounded-md px-2.5 py-2 text-sm transition-colors",
                        "text-gray-600 hover:text-gray-900 hover:bg-gray-100",
                        isActive && "text-gray-900 bg-gray-100"
                      )}
                    >
                      <item.icon className="size-4 shrink-0" />
                      <span className="flex-1 text-left">{item.title}</span>
                      <ChevronDown
                        className={cn(
                          "size-3.5 transition-transform",
                          settingsOpen && "rotate-180"
                        )}
                      />
                    </button>
                    {settingsOpen && (
                      <div className="ml-4 mt-0.5 flex flex-col gap-0.5 border-l border-gray-200 pl-2">
                        {visibleChildren.map((child) => {
                          const childActive = pathname === child.href;
                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              onClick={() => setSidebarOpen(false)}
                              className={cn(
                                "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                                "text-gray-500 hover:text-gray-900 hover:bg-gray-50",
                                childActive &&
                                  "text-gray-900 bg-gray-100 font-medium"
                              )}
                            >
                              <child.icon className="size-3.5 shrink-0" />
                              <span>{child.title}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors",
                    "text-gray-600 hover:text-gray-900 hover:bg-gray-100",
                    isActive && "text-gray-900 bg-gray-100 font-medium"
                  )}
                >
                  <item.icon className="size-4 shrink-0" />
                  <span>{item.title}</span>
                </Link>
              );
            })}
          </nav>
        </ScrollArea>

        {/* User info at bottom */}
        <div className="border-t border-gray-200 px-4 py-3">
          <p className="text-xs text-gray-400 truncate">{user.email}</p>
          <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">
            {ROLE_LABELS[user.role] || user.role}
          </span>
        </div>
      </SheetContent>
    </Sheet>
  );
}
