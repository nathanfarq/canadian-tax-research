"use client";

import { useEffect, useState, useCallback } from "react";

interface ToolCallData {
  toolName: string;
  input: unknown;
  output?: unknown;
}

interface ApiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  tool_calls?: ToolCallData[] | null;
  created_at: string;
}

interface ApiConversation {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

// Tool parts use the v6 UIMessage format: type is "tool-{name}" with flat properties
type ToolMessagePart = {
  type: string; // "tool-searchDocs", "dynamic-tool", etc.
  toolCallId: string;
  toolName?: string;
  state: "output-available";
  input: unknown;
  output: unknown;
};

type MessagePart =
  | { type: "text"; text: string }
  | ToolMessagePart;

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  parts: MessagePart[];
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

      // Transform API messages to ChatMessage format, including tool call parts
      const transformedMessages: ChatMessage[] = (data.messages ?? []).map(
        (msg: ApiMessage) => {
          const parts: MessagePart[] = [];

          // Add tool invocation parts before the text (they happened during generation)
          if (msg.tool_calls?.length) {
            for (let i = 0; i < msg.tool_calls.length; i++) {
              const tc = msg.tool_calls[i];
              parts.push({
                type: `tool-${tc.toolName}`,
                toolCallId: `${msg.id}-${tc.toolName}-${i}`,
                state: "output-available",
                input: tc.input,
                output: tc.output,
              });
            }
          }

          // Add text part
          parts.push({ type: "text" as const, text: msg.content });

          return {
            id: msg.id,
            role: msg.role,
            parts,
          };
        }
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
