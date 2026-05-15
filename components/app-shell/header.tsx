"use client";

import { Bell, Menu, Search } from "lucide-react";
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

/**
 * Top header bar — search, notifications, user menu.
 * Clean white bar with subtle bottom border. GoHighLevel-style.
 */
export function Header() {
  const { toggleSidebar } = useAppStore();

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
        {/* Unread dot — will be dynamic later */}
        <span className="absolute top-1 right-1 size-1.5 bg-red-500 rounded-full" />
      </Button>

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger
          className="inline-flex items-center gap-2 rounded-md px-2 py-1 text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-colors outline-none"
        >
          <Avatar className="size-7">
            <AvatarFallback className="bg-gray-200 text-gray-700 text-xs font-medium">
              U
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[180px]">
          <div className="px-2 py-1.5">
            <p className="text-sm font-medium text-gray-900">User Name</p>
            <p className="text-xs text-gray-500">user@company.com</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-sm cursor-pointer">
            My Profile
          </DropdownMenuItem>
          <DropdownMenuItem className="text-sm cursor-pointer">
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-sm cursor-pointer text-red-600">
            Log Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
