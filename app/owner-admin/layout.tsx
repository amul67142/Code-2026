"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  CreditCard, 
  LifeBuoy,
  LogOut,
  ShieldAlert
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Overview", href: "/owner-admin", icon: LayoutDashboard },
  { name: "Companies", href: "/owner-admin/companies", icon: Building2 },
  { name: "Users", href: "/owner-admin/users", icon: Users },
  { name: "Payments", href: "/owner-admin/payments", icon: CreditCard, locked: true },
  { name: "Tickets", href: "/owner-admin/tickets", icon: LifeBuoy, locked: true },
];

export default function OwnerAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const handleLogout = async () => {
    await fetch("/api/owner/logout", { method: "POST" });
    window.location.href = "/owner-admin/login";
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex">
      {/* Sidebar */}
      <div className="w-64 border-r border-zinc-800 bg-zinc-900/50 flex flex-col">
        <div className="p-6 border-b border-zinc-800">
          <div className="flex items-center gap-2 font-bold text-lg">
            <img 
              src="https://res.cloudinary.com/dy2zpgv6q/image/upload/v1779125703/Gemini_Generated_Image_c60xw7c60xw7c60x-Photoroom_laj5vl.png" 
              alt="BigLead" 
              className="h-8 w-auto object-contain"
            />
            <span className="sr-only">BigLead Owner</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navigation.map((item) => {
            const isActive = item.href === "/owner-admin"
              ? pathname === "/owner-admin" || pathname === "/"
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-indigo-500/10 text-indigo-400"
                    : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.name}
                {item.locked && (
                  <span className="ml-auto text-[10px] uppercase tracking-wider bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded">
                    Soon
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-zinc-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-md text-sm font-medium text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
