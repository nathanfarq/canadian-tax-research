"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { cn } from "@/utils/cn";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useConversations } from "@/hooks/useConversations";
import { ConversationItem } from "./ConversationItem";

interface ConversationSidebarProps {
  currentConversationId?: string;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation?: (id: string) => void;
}

export function ConversationSidebar({
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
}: ConversationSidebarProps) {
  const { isGuest, isLoading: authLoading } = useAuth();
  const { conversations, isLoading: conversationsLoading, refetch } = useConversations();
  const [isCollapsed, setIsCollapsed] = useState(true);

  // Default: collapsed on mobile, expanded on desktop
  useEffect(() => {
    const handleResize = () => {
      setIsCollapsed(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/conversations/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete conversation");
      }

      // Notify parent if this was the active conversation
      if (id === currentConversationId) {
        onDeleteConversation?.(id);
      }

      // Refetch conversations to update the list
      await refetch();

      toast.success("Conversation deleted");
    } catch (error) {
      toast.error("Failed to delete conversation", {
        description: error instanceof Error ? error.message : "An error occurred",
      });
      throw error; // Re-throw so ConversationItem knows it failed
    }
  }, [currentConversationId, onDeleteConversation, refetch]);

  const handleRename = useCallback(async (id: string, newTitle: string) => {
    try {
      const response = await fetch(`/api/conversations/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: newTitle }),
      });

      if (!response.ok) {
        throw new Error("Failed to rename conversation");
      }

      // Refetch conversations to update the list
      await refetch();

      toast.success("Conversation renamed");
    } catch (error) {
      toast.error("Failed to rename conversation", {
        description: error instanceof Error ? error.message : "An error occurred",
      });
      throw error; // Re-throw so ConversationItem knows it failed
    }
  }, [refetch]);

  const isLoading = authLoading || conversationsLoading;

  return (
    <>
      {/* Persistent sidebar strip */}
      <div className="fixed left-0 top-0 h-full w-12 bg-secondary z-50 flex flex-col items-center py-4 gap-3">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 hover:bg-accent rounded-md transition-colors"
          aria-label={isCollapsed ? "Open sidebar" : "Close sidebar"}
        >
          <MenuIcon className="h-5 w-5" />
        </button>
        <button
          onClick={onNewConversation}
          className="p-2 hover:bg-accent rounded-md transition-colors"
          aria-label="New chat"
        >
          <PlusIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Expanded sidebar panel */}
      <div
        className={cn(
          "fixed left-12 top-0 h-full z-40",
          "bg-background border-r border-input",
          "transition-all duration-300 ease-in-out",
          "flex flex-col",
          isCollapsed ? "w-0 overflow-hidden" : "w-[260px]"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-input">
          <h2 className="font-semibold text-lg">Chat History</h2>
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-1 hover:bg-accent rounded-md transition-colors"
            aria-label="Close sidebar"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
        </div>

        {/* New Chat button */}
        <div className="p-4 border-b border-input">
          <Button onClick={onNewConversation} className="w-full" size="sm">
            <PlusIcon className="h-4 w-4 mr-2" />
            New Chat
          </Button>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto p-2">
          {isGuest ? (
            <GuestMessage />
          ) : isLoading ? (
            <LoadingState />
          ) : conversations.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-1">
              {conversations.map((conversation) => (
                <ConversationItem
                  key={conversation.id}
                  id={conversation.id}
                  title={conversation.title}
                  updatedAt={conversation.updated_at}
                  isActive={conversation.id === currentConversationId}
                  onClick={() => onSelectConversation(conversation.id)}
                  onDelete={handleDelete}
                  onRename={handleRename}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Overlay for mobile when sidebar is open */}
      {!isCollapsed && (
        <div
          className="fixed inset-0 bg-black/20 z-30 md:hidden"
          onClick={() => setIsCollapsed(true)}
          style={{ left: '48px' }}
        />
      )}
    </>
  );
}

function GuestMessage() {
  return (
    <div className="text-center py-8 px-4">
      <p className="text-sm text-muted-foreground mb-3">
        Sign in to save your chat history
      </p>
      <Button asChild variant="outline" size="sm">
        <a href="/auth">Sign in</a>
      </Button>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-2 p-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="animate-pulse">
          <div className="h-4 bg-muted rounded w-3/4 mb-1" />
          <div className="h-3 bg-muted rounded w-1/2" />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-8 px-4">
      <p className="text-sm text-muted-foreground">No conversations yet</p>
    </div>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}
