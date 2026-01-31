"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Settings, LogOut, LogIn, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { SettingsDialog } from "./SettingsDialog";

export function AccountButton() {
  const { user, isGuest, isLoading, signOut } = useAuth();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleSignOut = async () => {
    setDropdownOpen(false);
    await signOut();
    router.push("/auth");
  };

  const handleSignIn = () => {
    setDropdownOpen(false);
    router.push("/auth");
  };

  const handleOpenSettings = () => {
    setDropdownOpen(false);
    setSettingsOpen(true);
  };

  if (isLoading) {
    return (
      <Button variant="ghost" size="sm" disabled>
        <User className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <>
      <DropdownMenu
        open={dropdownOpen}
        onOpenChange={setDropdownOpen}
        trigger={
          <Button variant="ghost" size="sm" className="gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">
              {isGuest ? "Guest" : user?.email?.split("@")[0] || "Account"}
            </span>
          </Button>
        }
      >
        {!isGuest ? (
          <>
            <div className="px-2 py-1.5 text-xs text-muted-foreground border-b mb-1">
              {user?.email}
            </div>
            <DropdownMenuItem onClick={handleOpenSettings}>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSignOut} destructive>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <div className="px-2 py-1.5 text-xs text-muted-foreground border-b mb-1">
              You are browsing as a guest
            </div>
            <DropdownMenuItem onClick={handleSignIn}>
              <LogIn className="h-4 w-4 mr-2" />
              Sign In
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSignIn}>
              <UserPlus className="h-4 w-4 mr-2" />
              Create Account
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenu>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
