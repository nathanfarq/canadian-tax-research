"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "./useAuth";

export interface Conversation {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

interface UseConversationsReturn {
  conversations: Conversation[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  isGuest: boolean;
}

export function useConversations(): UseConversationsReturn {
  const { user, isGuest, isLoading: authLoading } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasConversationsRef = useRef(false);

  // Keep ref in sync with conversations state
  useEffect(() => {
    hasConversationsRef.current = conversations.length > 0;
  }, [conversations]);

  const fetchConversations = useCallback(async () => {
    if (isGuest || !user) {
      setConversations([]);
      return;
    }

    // Only show loading skeleton on initial load, not on refetch
    if (!hasConversationsRef.current) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const response = await fetch("/api/conversations");

      if (!response.ok) {
        throw new Error("Failed to fetch conversations");
      }

      const data = await response.json();
      setConversations(data.conversations ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setConversations([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, isGuest]);

  // Fetch conversations when user changes
  useEffect(() => {
    if (!authLoading) {
      fetchConversations();
    }
  }, [authLoading, fetchConversations]);

  return {
    conversations,
    isLoading: isLoading || authLoading,
    error,
    refetch: fetchConversations,
    isGuest,
  };
}
