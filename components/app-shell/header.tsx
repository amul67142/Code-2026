"use client";

import { Bell, Menu, Search, LogOut, User, Settings as SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAppStore } from "@/stores/app-store";
import { Breadcrumbs } from "./breadcrumbs";
import { useUser, ROLE_LABELS } from "@/lib/user-context";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

/**
 * Top header bar — search, notifications, user menu.
 * Shows real user data from UserContext.
 */
export function Header() {
  const { toggleSidebar } = useAppStore();
  const user = useUser();
  const router = useRouter();

  /** Get initials from name, e.g. "Amul Sharma" → "AS" */
  const initials = user.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 h-14 px-4 border-b border-gray-200 bg-white">
      {/* Mobile menu trigger */}
      <Button
        variant="ghost"
        size="sm"
        className="lg:hidden text-gray-500 hover:text-gray-900 -ml-1"
        onClick={toggleSidebar}
      >
        <Menu className="size-5" />
      </Button>

      {/* Breadcrumbs */}
      <div className="hidden md:flex items-center">
        <Breadcrumbs />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search */}
      <div className="hidden sm:flex items-center">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-gray-400" />
          <Input
            placeholder="Search..."
            className="w-[200px] lg:w-[260px] h-8 pl-8 text-sm bg-gray-50 border-gray-200 placeholder:text-gray-400"
          />
        </div>
      </div>

      {/* Notifications */}
      <Button
        variant="ghost"
        size="sm"
        className="relative text-gray-500 hover:text-gray-900"
      >
        <Bell className="size-4" />
        <span className="absolute top-1 right-1 size-1.5 bg-red-500 rounded-full" />
      </Button>

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger
          className="inline-flex items-center gap-2 rounded-md px-2 py-1 text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-colors outline-none"
        >
          <Avatar className="size-7">
            <AvatarFallback className="bg-gray-200 text-gray-700 text-xs font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[220px]">
          <div className="px-3 py-2">
            <p className="text-sm font-medium text-gray-900">{user.name}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
            <span className="mt-1 inline-block text-[10px] font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded">
              {ROLE_LABELS[user.role] || user.role}
            </span>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-sm cursor-pointer" onClick={() => router.push("/settings/profile")}>
            <User className="size-3.5 mr-2" />
            My Profile
          </DropdownMenuItem>
          <DropdownMenuItem className="text-sm cursor-pointer" onClick={() => router.push("/settings")}>
            <SettingsIcon className="size-3.5 mr-2" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-sm cursor-pointer text-red-600"
            onClick={handleLogout}
          >
            <LogOut className="size-3.5 mr-2" />
            Log Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
