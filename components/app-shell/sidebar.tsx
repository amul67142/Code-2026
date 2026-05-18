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
  Mail,
  ChevronDown,
  PanelLeftClose,
  PanelLeft,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
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
  children?: {
    title: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    minRole?: string;
  }[];
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
      { title: "Emails", href: "/settings/emails", icon: Mail, minRole: "ADMIN" },
      { title: "Billing", href: "/settings/billing", icon: CreditCard, minRole: "SUPER_ADMIN" },
    ],
  },
];

/**
 * Desktop sidebar — collapsible left navigation.
 * Filters menu items based on user role.
 */
export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleCollapsed } = useAppStore();
  const user = useUser();
  const [settingsOpen, setSettingsOpen] = useState(
    pathname.startsWith("/settings")
  );

  /** Filter nav items by role */
  const visibleNav = navigation.filter((item) => {
    if (item.minRole && !hasMinRole(user.role, item.minRole)) return false;
    if (item.hideForRoles && item.hideForRoles.includes(user.role)) return false;
    return true;
  });

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col border-r border-gray-200 bg-white transition-all duration-200",
        sidebarCollapsed ? "w-[60px]" : "w-[240px]"
      )}
    >
      {/* Logo / Brand */}
      <div className="flex items-center gap-2 px-4 h-14 border-b border-gray-200">
        {user.companyLogo ? (
          <img
            src={user.companyLogo}
            alt={user.companyName || "Company"}
            className="size-8 rounded-lg object-cover shrink-0"
          />
        ) : (
          <div className="flex items-center justify-center size-8 rounded-lg bg-gray-900 text-white text-sm font-bold shrink-0">
            {(user.companyName || "R").charAt(0).toUpperCase()}
          </div>
        )}
        {!sidebarCollapsed && (
          <span className="text-sm font-semibold text-gray-900 truncate">
            {user.companyName || "RealLeads"}
          </span>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-2">
        <nav className="flex flex-col gap-0.5 px-2">
          {visibleNav.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            const hasChildren = item.children && item.children.length > 0;

            if (hasChildren) {
              // Filter children by role too
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
                      isActive && "text-gray-900 bg-gray-100",
                      sidebarCollapsed && "justify-center px-0"
                    )}
                  >
                    <item.icon className="size-4 shrink-0" />
                    {!sidebarCollapsed && (
                      <>
                        <span className="flex-1 text-left">{item.title}</span>
                        <ChevronDown
                          className={cn(
                            "size-3.5 transition-transform",
                            settingsOpen && "rotate-180"
                          )}
                        />
                      </>
                    )}
                  </button>
                  {settingsOpen && !sidebarCollapsed && (
                    <div className="ml-4 mt-0.5 flex flex-col gap-0.5 border-l border-gray-200 pl-2">
                      {visibleChildren.map((child) => {
                        const childActive = pathname === child.href;
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
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
                className={cn(
                  "flex items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors",
                  "text-gray-600 hover:text-gray-900 hover:bg-gray-100",
                  isActive && "text-gray-900 bg-gray-100 font-medium",
                  sidebarCollapsed && "justify-center px-0"
                )}
              >
                <item.icon className="size-4 shrink-0" />
                {!sidebarCollapsed && <span>{item.title}</span>}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      <Separator />

      {/* Role badge + collapse toggle */}
      <div className="p-2 space-y-1">
        {!sidebarCollapsed && (
          <div className="px-2 py-1">
            <p className="text-xs text-gray-400 truncate">{user.email}</p>
            <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">
              {ROLE_LABELS[user.role] || user.role}
            </span>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleCollapsed}
          className="w-full justify-center text-gray-500 hover:text-gray-900"
        >
          {sidebarCollapsed ? (
            <PanelLeft className="size-4" />
          ) : (
            <PanelLeftClose className="size-4" />
          )}
        </Button>
      </div>
    </aside>
  );
}
