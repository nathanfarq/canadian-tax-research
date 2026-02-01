"use client";

import { useEffect, useState, useCallback } from "react";

interface ApiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

interface ApiConversation {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  parts: Array<{ type: "text"; text: string }>;
}

interface UseConversationMessagesReturn {
  messages: ChatMessage[];
  conversation: ApiConversation | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useConversationMessages(
  conversationId: string | null | undefined
): UseConversationMessagesReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversation, setConversation] = useState<ApiConversation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!conversationId) {
      setMessages([]);
      setConversation(null);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/conversations/${conversationId}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Conversation not found");
        }
        throw new Error("Failed to fetch conversation");
      }

      const data = await response.json();

      // Transform API messages to ChatMessage format
      const transformedMessages: ChatMessage[] = (data.messages ?? []).map(
        (msg: ApiMessage) => ({
          id: msg.id,
          role: msg.role,
          parts: [{ type: "text" as const, text: msg.content }],
        })
      );

      setMessages(transformedMessages);
      setConversation(data.conversation ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setMessages([]);
      setConversation(null);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  return {
    messages,
    conversation,
    isLoading,
    error,
    refetch: fetchMessages,
  };
}
