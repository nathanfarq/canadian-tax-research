"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/utils/cn";
import { formatRelativeTime } from "@/lib/utils/formatTime";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";

interface ConversationItemProps {
  id: string;
  title: string | null;
  updatedAt: string;
  isActive: boolean;
  onClick: () => void;
  onDelete: (id: string) => Promise<void>;
  onRename: (id: string, newTitle: string) => Promise<void>;
}

export function ConversationItem({
  id,
  title,
  updatedAt,
  isActive,
  onClick,
  onDelete,
  onRename,
}: ConversationItemProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(title || "");
  const [isRenaming, setIsRenaming] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const displayTitle = title || "New conversation";

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartRename = () => {
    setEditValue(title || "");
    setIsEditing(true);
    setIsMenuOpen(false);
  };

  const handleCancelRename = () => {
    setIsEditing(false);
    setEditValue(title || "");
  };

  const handleSaveRename = async () => {
    const trimmedValue = editValue.trim();
    if (!trimmedValue || trimmedValue === title) {
      handleCancelRename();
      return;
    }

    setIsRenaming(true);
    try {
      await onRename(id, trimmedValue);
      setIsEditing(false);
    } catch {
      // Error is handled by parent, keep editing mode open
    } finally {
      setIsRenaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSaveRename();
    } else if (e.key === "Escape") {
      handleCancelRename();
    }
  };

  const handleDeleteClick = () => {
    setIsMenuOpen(false);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(id);
      setShowDeleteConfirm(false);
    } catch {
      // Error is handled by parent
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div
        className={cn(
          "group relative flex items-center rounded-md transition-colors",
          "hover:bg-accent",
          isActive && "bg-accent"
        )}
      >
        {isEditing ? (
          <div className="flex-1 px-2 py-1.5">
            <Input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSaveRename}
              disabled={isRenaming}
              className="h-7 text-sm"
              placeholder="Conversation title"
            />
          </div>
        ) : (
          <button
            onClick={onClick}
            className="flex-1 text-left px-3 py-2 min-w-0"
          >
            <div className="truncate text-sm font-medium">{displayTitle}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {formatRelativeTime(updatedAt)}
            </div>
          </button>
        )}

        {/* Menu button - visible on hover or when menu is open */}
        {!isEditing && (
          <div
            className={cn(
              "absolute right-1 top-1/2 -translate-y-1/2",
              "opacity-0 group-hover:opacity-100 transition-opacity",
              isMenuOpen && "opacity-100"
            )}
          >
            <DropdownMenu
              open={isMenuOpen}
              onOpenChange={setIsMenuOpen}
              trigger={
                <button
                  className={cn(
                    "p-1.5 rounded-md",
                    "hover:bg-background/80 transition-colors",
                    "focus:outline-none focus:ring-1 focus:ring-ring"
                  )}
                  onClick={(e) => e.stopPropagation()}
                  aria-label="Conversation options"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              }
            >
              <DropdownMenuItem onClick={handleStartRename}>
                <Pencil className="h-4 w-4 mr-2" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem destructive onClick={handleDeleteClick}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenu>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete conversation"
        message="Are you sure you want to delete this conversation? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        isLoading={isDeleting}
        destructive
      />
    </>
  );
}
