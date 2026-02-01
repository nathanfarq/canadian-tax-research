import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useAuth } from "@/hooks/useAuth";
import {
  setMockUser,
  mockUser,
  mockGuestUser,
  mockSession,
  resetMockState,
  triggerAuthStateChange,
} from "../../mocks/supabase";

describe("useAuth Hook", () => {
  beforeEach(() => {
    resetMockState();
  });

  describe("Initial State", () => {
    it("should start with loading state", () => {
      const { result } = renderHook(() => useAuth());

      // Initially loading
      expect(result.current.isLoading).toBe(true);
    });

    it("should have null user when not authenticated", async () => {
      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toBeNull();
    });
  });

  describe("Authenticated User", () => {
    it("should return user when authenticated", async () => {
      setMockUser(mockUser);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.user?.email).toBe("test@example.com");
    });

    it("should set isGuest to false for regular user", async () => {
      setMockUser(mockUser);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isGuest).toBe(false);
    });
  });

  describe("Guest User Detection", () => {
    it("should detect anonymous user as guest", async () => {
      setMockUser(mockGuestUser);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isGuest).toBe(true);
      expect(result.current.user?.is_anonymous).toBe(true);
    });

    it("should treat null user as guest", async () => {
      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isGuest).toBe(true);
    });
  });

  describe("Sign Out", () => {
    it("should provide signOut function", async () => {
      setMockUser(mockUser);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(typeof result.current.signOut).toBe("function");
    });

    it("should clear user on signOut", async () => {
      setMockUser(mockUser);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      await act(async () => {
        await result.current.signOut();
      });

      expect(result.current.user).toBeNull();
    });
  });

  describe("Auth State Changes", () => {
    it("should update user when auth state changes", async () => {
      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Initially no user
      expect(result.current.user).toBeNull();

      // Simulate sign in
      act(() => {
        triggerAuthStateChange("SIGNED_IN", { ...mockSession, user: mockUser });
      });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });
    });

    it("should handle sign out auth state change", async () => {
      setMockUser(mockUser);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      // Simulate sign out
      act(() => {
        triggerAuthStateChange("SIGNED_OUT", null);
      });

      await waitFor(() => {
        expect(result.current.user).toBeNull();
      });
    });
  });

  describe("Return Value Structure", () => {
    it("should return expected shape", async () => {
      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current).toHaveProperty("user");
      expect(result.current).toHaveProperty("isGuest");
      expect(result.current).toHaveProperty("isLoading");
      expect(result.current).toHaveProperty("signOut");
    });
  });
});
