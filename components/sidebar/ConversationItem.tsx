"use client";

import { cn } from "@/utils/cn";
import { formatRelativeTime } from "@/lib/utils/formatTime";

interface ConversationItemProps {
  id: string;
  title: string | null;
  updatedAt: string;
  isActive: boolean;
  onClick: () => void;
}

export function ConversationItem({
  title,
  updatedAt,
  isActive,
  onClick,
}: ConversationItemProps) {
  const displayTitle = title || "New conversation";

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-3 py-2 rounded-md transition-colors",
        "hover:bg-accent",
        isActive && "bg-accent"
      )}
    >
      <div className="truncate text-sm font-medium">{displayTitle}</div>
      <div className="text-xs text-muted-foreground mt-0.5">
        {formatRelativeTime(updatedAt)}
      </div>
    </button>
  );
}
