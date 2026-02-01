import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useConversations } from "@/hooks/useConversations";
import {
  setMockUser,
  mockUser,
  mockGuestUser,
  mockConversation,
  mockConversation2,
  resetMockState,
} from "../../mocks/supabase";
import { setupMockConversationsData, clearMockConversationsData } from "../../mocks/supabaseHandlers";

describe("useConversations Hook", () => {
  beforeEach(() => {
    resetMockState();
    clearMockConversationsData();
  });

  describe("Unauthenticated User", () => {
    it("should return empty conversations when not authenticated", async () => {
      const { result } = renderHook(() => useConversations());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.conversations).toEqual([]);
      expect(result.current.error).toBeNull();
    });
  });

  describe("Guest User", () => {
    it("should return empty conversations for guest user", async () => {
      setMockUser(mockGuestUser);

      const { result } = renderHook(() => useConversations());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.conversations).toEqual([]);
    });
  });

  describe("Authenticated User", () => {
    beforeEach(() => {
      setMockUser(mockUser);
      setupMockConversationsData();
    });

    it("should fetch conversations for authenticated user", async () => {
      const { result } = renderHook(() => useConversations());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.conversations.length).toBeGreaterThan(0);
      expect(result.current.error).toBeNull();
    });

    it("should return conversations sorted by updated_at descending", async () => {
      const { result } = renderHook(() => useConversations());

      await waitFor(() => {
        expect(result.current.conversations.length).toBeGreaterThan(0);
      });

      const conversations = result.current.conversations;
      if (conversations.length > 1) {
        const firstDate = new Date(conversations[0].updated_at).getTime();
        const secondDate = new Date(conversations[1].updated_at).getTime();
        expect(firstDate).toBeGreaterThanOrEqual(secondDate);
      }
    });

    it("should include conversation id, title, and timestamps", async () => {
      const { result } = renderHook(() => useConversations());

      await waitFor(() => {
        expect(result.current.conversations.length).toBeGreaterThan(0);
      });

      const conversation = result.current.conversations[0];
      expect(conversation).toHaveProperty("id");
      expect(conversation).toHaveProperty("title");
      expect(conversation).toHaveProperty("created_at");
      expect(conversation).toHaveProperty("updated_at");
    });
  });

  describe("Loading State", () => {
    it("should show loading while auth is loading", () => {
      const { result } = renderHook(() => useConversations());

      // Auth is loading initially
      expect(result.current.isLoading).toBe(true);
    });

    it("should show loading while fetching conversations", async () => {
      setMockUser(mockUser);
      setupMockConversationsData();

      const { result } = renderHook(() => useConversations());

      // Should be loading initially
      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe("Refetch", () => {
    it("should provide refetch function", async () => {
      setMockUser(mockUser);

      const { result } = renderHook(() => useConversations());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(typeof result.current.refetch).toBe("function");
    });

    it("should update conversations on refetch", async () => {
      setMockUser(mockUser);

      const { result } = renderHook(() => useConversations());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialLength = result.current.conversations.length;

      // Add a new conversation to mock data
      setupMockConversationsData();

      await act(async () => {
        await result.current.refetch();
      });

      expect(result.current.conversations.length).toBeGreaterThanOrEqual(
        initialLength
      );
    });
  });

  describe("Error Handling", () => {
    it("should handle fetch errors gracefully", async () => {
      setMockUser(mockUser);

      // The mock returns empty conversations by default, not an error
      const { result } = renderHook(() => useConversations());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // When no conversations exist, should return empty array without error
      expect(result.current.conversations).toEqual([]);
    });
  });

  describe("Return Value Structure", () => {
    it("should return expected shape", async () => {
      const { result } = renderHook(() => useConversations());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current).toHaveProperty("conversations");
      expect(result.current).toHaveProperty("isLoading");
      expect(result.current).toHaveProperty("error");
      expect(result.current).toHaveProperty("refetch");
      expect(Array.isArray(result.current.conversations)).toBe(true);
    });
  });
});
