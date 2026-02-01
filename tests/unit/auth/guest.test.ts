import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  setGuestSession,
  isGuestSession,
  clearGuestSession,
} from "@/lib/auth/guest";

describe("Guest Session Management", () => {
  const GUEST_KEY = "taxbuddy_guest";

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  describe("setGuestSession", () => {
    it("should set guest session in localStorage", () => {
      setGuestSession();
      expect(localStorage.getItem(GUEST_KEY)).toBe("true");
    });

    it("should overwrite existing value", () => {
      localStorage.setItem(GUEST_KEY, "false");
      setGuestSession();
      expect(localStorage.getItem(GUEST_KEY)).toBe("true");
    });
  });

  describe("isGuestSession", () => {
    it("should return false when no guest session exists", () => {
      expect(isGuestSession()).toBe(false);
    });

    it("should return true when guest session is set", () => {
      localStorage.setItem(GUEST_KEY, "true");
      expect(isGuestSession()).toBe(true);
    });

    it("should return false when guest session value is not 'true'", () => {
      localStorage.setItem(GUEST_KEY, "false");
      expect(isGuestSession()).toBe(false);
    });

    it("should return false when guest session value is empty", () => {
      localStorage.setItem(GUEST_KEY, "");
      expect(isGuestSession()).toBe(false);
    });
  });

  describe("clearGuestSession", () => {
    it("should remove guest session from localStorage", () => {
      localStorage.setItem(GUEST_KEY, "true");
      clearGuestSession();
      expect(localStorage.getItem(GUEST_KEY)).toBeNull();
    });

    it("should not throw when no guest session exists", () => {
      expect(() => clearGuestSession()).not.toThrow();
    });
  });

  describe("session workflow", () => {
    it("should correctly set and detect guest session", () => {
      expect(isGuestSession()).toBe(false);
      setGuestSession();
      expect(isGuestSession()).toBe(true);
    });

    it("should correctly clear guest session", () => {
      setGuestSession();
      expect(isGuestSession()).toBe(true);
      clearGuestSession();
      expect(isGuestSession()).toBe(false);
    });
  });
});
