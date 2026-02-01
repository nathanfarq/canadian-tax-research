import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useConversationMessages } from "@/hooks/useConversationMessages";
import {
  setMockUser,
  mockUser,
  mockConversation,
  mockMessages,
  resetMockState,
} from "../../mocks/supabase";
import {
  setupMockConversationsData,
  clearMockConversationsData,
} from "../../mocks/supabaseHandlers";

describe("useConversationMessages Hook", () => {
  beforeEach(() => {
    resetMockState();
    clearMockConversationsData();
  });

  describe("No Conversation ID", () => {
    it("should return empty state when conversationId is null", async () => {
      const { result } = renderHook(() => useConversationMessages(null));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.messages).toEqual([]);
      expect(result.current.conversation).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it("should return empty state when conversationId is undefined", async () => {
      const { result } = renderHook(() => useConversationMessages(undefined));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.messages).toEqual([]);
      expect(result.current.conversation).toBeNull();
    });
  });

  describe("Valid Conversation", () => {
    beforeEach(() => {
      setMockUser(mockUser);
      setupMockConversationsData();
    });

    it("should fetch messages for valid conversation ID", async () => {
      const { result } = renderHook(() =>
        useConversationMessages(mockConversation.id)
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.messages.length).toBeGreaterThan(0);
      expect(result.current.error).toBeNull();
    });

    it("should return conversation details", async () => {
      const { result } = renderHook(() =>
        useConversationMessages(mockConversation.id)
      );

      await waitFor(() => {
        expect(result.current.conversation).not.toBeNull();
      });

      expect(result.current.conversation).toHaveProperty("id");
      expect(result.current.conversation).toHaveProperty("title");
      expect(result.current.conversation).toHaveProperty("created_at");
      expect(result.current.conversation).toHaveProperty("updated_at");
    });

    it("should transform messages to ChatMessage format", async () => {
      const { result } = renderHook(() =>
        useConversationMessages(mockConversation.id)
      );

      await waitFor(() => {
        expect(result.current.messages.length).toBeGreaterThan(0);
      });

      const message = result.current.messages[0];
      expect(message).toHaveProperty("id");
      expect(message).toHaveProperty("role");
      expect(message).toHaveProperty("parts");
      expect(Array.isArray(message.parts)).toBe(true);
      expect(message.parts[0]).toHaveProperty("type", "text");
      expect(message.parts[0]).toHaveProperty("text");
    });

    it("should have messages sorted by created_at ascending", async () => {
      const { result } = renderHook(() =>
        useConversationMessages(mockConversation.id)
      );

      await waitFor(() => {
        expect(result.current.messages.length).toBeGreaterThan(1);
      });

      // Messages should be in chronological order (ascending)
      // This is verified by checking the first message is user, second is assistant
      expect(result.current.messages[0].role).toBe("user");
      expect(result.current.messages[1].role).toBe("assistant");
    });
  });

  describe("Non-Existent Conversation", () => {
    beforeEach(() => {
      setMockUser(mockUser);
      setupMockConversationsData();
    });

    it("should set error for non-existent conversation", async () => {
      const { result } = renderHook(() =>
        useConversationMessages("non-existent-id")
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe("Conversation not found");
      expect(result.current.messages).toEqual([]);
      expect(result.current.conversation).toBeNull();
    });
  });

  describe("Unauthenticated User", () => {
    it("should handle unauthorized access", async () => {
      // No user set - should get 401
      const { result } = renderHook(() =>
        useConversationMessages("any-id")
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).not.toBeNull();
    });
  });

  describe("Loading State", () => {
    it("should show loading while fetching", () => {
      setMockUser(mockUser);
      setupMockConversationsData();

      const { result } = renderHook(() =>
        useConversationMessages(mockConversation.id)
      );

      expect(result.current.isLoading).toBe(true);
    });

    it("should stop loading after fetch completes", async () => {
      setMockUser(mockUser);
      setupMockConversationsData();

      const { result } = renderHook(() =>
        useConversationMessages(mockConversation.id)
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe("Refetch", () => {
    beforeEach(() => {
      setMockUser(mockUser);
      setupMockConversationsData();
    });

    it("should provide refetch function", async () => {
      const { result } = renderHook(() =>
        useConversationMessages(mockConversation.id)
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(typeof result.current.refetch).toBe("function");
    });

    it("should refetch messages when called", async () => {
      const { result } = renderHook(() =>
        useConversationMessages(mockConversation.id)
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialLength = result.current.messages.length;

      await act(async () => {
        await result.current.refetch();
      });

      // After refetch, should still have messages
      expect(result.current.messages.length).toBe(initialLength);
    });
  });

  describe("Conversation ID Changes", () => {
    beforeEach(() => {
      setMockUser(mockUser);
      setupMockConversationsData();
    });

    it("should refetch when conversation ID changes", async () => {
      const { result, rerender } = renderHook(
        ({ id }: { id: string | null }) => useConversationMessages(id),
        { initialProps: { id: mockConversation.id } }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.conversation?.id).toBe(mockConversation.id);

      // Change to null
      rerender({ id: null as unknown as string });

      await waitFor(() => {
        expect(result.current.messages).toEqual([]);
      });
    });

    it("should clear state when ID becomes null", async () => {
      const { result, rerender } = renderHook(
        ({ id }: { id: string | null }) => useConversationMessages(id),
        { initialProps: { id: mockConversation.id } }
      );

      await waitFor(() => {
        expect(result.current.messages.length).toBeGreaterThan(0);
      });

      rerender({ id: null as unknown as string });

      await waitFor(() => {
        expect(result.current.messages).toEqual([]);
        expect(result.current.conversation).toBeNull();
        expect(result.current.error).toBeNull();
      });
    });
  });

  describe("Return Value Structure", () => {
    it("should return expected shape", async () => {
      const { result } = renderHook(() => useConversationMessages(null));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current).toHaveProperty("messages");
      expect(result.current).toHaveProperty("conversation");
      expect(result.current).toHaveProperty("isLoading");
      expect(result.current).toHaveProperty("error");
      expect(result.current).toHaveProperty("refetch");
      expect(Array.isArray(result.current.messages)).toBe(true);
    });
  });
});
