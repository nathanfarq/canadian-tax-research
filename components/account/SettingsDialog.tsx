"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface UserPreferences {
  displayName: string;
  emailNotifications: boolean;
  saveHistory: boolean;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  displayName: "",
  emailNotifications: true,
  saveHistory: true,
};

const PREFERENCES_KEY = "taxbuddy_user_preferences";

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      const stored = localStorage.getItem(PREFERENCES_KEY);
      if (stored) {
        try {
          setPreferences({ ...DEFAULT_PREFERENCES, ...JSON.parse(stored) });
        } catch {
          setPreferences(DEFAULT_PREFERENCES);
        }
      } else {
        setPreferences({
          ...DEFAULT_PREFERENCES,
          displayName: user?.email?.split("@")[0] || "",
        });
      }
    }
  }, [open, user]);

  const handleSave = () => {
    setIsSaving(true);
    try {
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
      toast.success("Settings saved");
      onOpenChange(false);
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Manage your account settings and preferences.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="email"
              value={user?.email || ""}
              disabled
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="displayName" className="text-sm font-medium">
              Display Name
            </label>
            <Input
              id="displayName"
              value={preferences.displayName}
              onChange={(e) =>
                setPreferences({ ...preferences, displayName: e.target.value })
              }
              placeholder="Enter your display name"
            />
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-medium">Preferences</h4>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="emailNotifications"
                checked={preferences.emailNotifications}
                onCheckedChange={(checked) =>
                  setPreferences({
                    ...preferences,
                    emailNotifications: checked === true,
                  })
                }
              />
              <label
                htmlFor="emailNotifications"
                className="text-sm leading-none cursor-pointer"
              >
                Receive email notifications
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="saveHistory"
                checked={preferences.saveHistory}
                onCheckedChange={(checked) =>
                  setPreferences({
                    ...preferences,
                    saveHistory: checked === true,
                  })
                }
              />
              <label
                htmlFor="saveHistory"
                className="text-sm leading-none cursor-pointer"
              >
                Save conversation history
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
