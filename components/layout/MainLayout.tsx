"use client";

import { ReactNode } from "react";
import { useSidebar } from "@/contexts/SidebarContext";
import { AccountButton } from "@/components/account/AccountButton";
import { cn } from "@/utils/cn";

const Logo = () => (
  <a href="https://taxbuddy.online/">
    <img
      src="/images/20260125-logo2-cropped-transparent.png"
      alt="TaxBuddy"
      className="h-12"
    />
  </a>
);

export function MainLayout({ children }: { children: ReactNode }) {
  const { isCollapsed } = useSidebar();

  // Sidebar strip is always 48px (w-12)
  // Expanded panel adds 260px when open
  // Total: 48px collapsed, 308px expanded
  return (
    <div className="flex h-[100dvh]">
      <div
        className={cn(
          "flex-1 flex flex-col bg-secondary transition-all duration-300 ease-in-out",
          isCollapsed ? "ml-12" : "ml-12 md:ml-[308px]"
        )}
      >
        <div className="p-4">
          <div className="flex gap-4 flex-col md:flex-row md:items-center justify-between">
            <Logo />
            <AccountButton />
          </div>
        </div>
        <div className="bg-background mx-4 relative grid rounded-t-2xl border border-input border-b-0 flex-1">
          <div className="absolute inset-0">{children}</div>
        </div>
      </div>
    </div>
  );
}
