/**
 * Smoke test for Supabase connectivity
 *
 * This test validates that Supabase is configured correctly
 * and can make real API calls. Run with: yarn test:smoke:supabase
 *
 * Prerequisites:
 * - NEXT_PUBLIC_SUPABASE_URL must be set in .env.local
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY must be set in .env.local
 */

import { describe, it, expect } from "vitest";

// Load environment variables (not mocked for smoke tests)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

describe("Supabase Smoke Tests", () => {
  describe("Environment Configuration", () => {
    it("should have NEXT_PUBLIC_SUPABASE_URL environment variable set", () => {
      expect(SUPABASE_URL).toBeDefined();
      expect(SUPABASE_URL).not.toBe("");
      expect(SUPABASE_URL).toMatch(/^https:\/\/.+\.supabase\.co$/);
    });

    it("should have NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable set", () => {
      expect(SUPABASE_ANON_KEY).toBeDefined();
      expect(SUPABASE_ANON_KEY).not.toBe("");
      expect(SUPABASE_ANON_KEY?.length).toBeGreaterThan(100); // JWT tokens are typically long
    });
  });

  describe("Supabase Connectivity", () => {
    it("should connect to Supabase and verify project is accessible", async () => {
      if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        console.warn("Skipping: Supabase environment variables not configured");
        return;
      }

      // Test the REST API health endpoint
      const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      });

      // Should return 200 (even if empty)
      expect(response.ok).toBe(true);
    });

    it("should be able to query conversations table (RLS will return empty for anon)", async () => {
      if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        console.warn("Skipping: Supabase environment variables not configured");
        return;
      }

      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/conversations?select=id,title&limit=1`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      expect(response.ok).toBe(true);

      const data = await response.json();
      // Due to RLS, anonymous users should get empty array (not an error)
      expect(Array.isArray(data)).toBe(true);
    });

    it("should be able to query messages table (RLS will return empty for anon)", async () => {
      if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        console.warn("Skipping: Supabase environment variables not configured");
        return;
      }

      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/messages?select=id,content&limit=1`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe("Supabase Auth", () => {
    it("should be able to access auth health endpoint", async () => {
      if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        console.warn("Skipping: Supabase environment variables not configured");
        return;
      }

      const response = await fetch(`${SUPABASE_URL}/auth/v1/health`, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
        },
      });

      // Auth health endpoint should be accessible
      expect(response.ok).toBe(true);
    });

    it("should verify anonymous user returns no session", async () => {
      if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        console.warn("Skipping: Supabase environment variables not configured");
        return;
      }

      const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      });

      // Without a valid session, should return 401
      expect(response.status).toBe(401);
    });
  });

  describe("RLS Validation", () => {
    it("should not allow anonymous insert to conversations", async () => {
      if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        console.warn("Skipping: Supabase environment variables not configured");
        return;
      }

      const response = await fetch(`${SUPABASE_URL}/rest/v1/conversations`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          title: "Unauthorized conversation",
          user_id: "fake-user-id",
        }),
      });

      // RLS should block this - expecting 401 or 403
      expect(response.ok).toBe(false);
    });

    it("should not allow anonymous insert to messages", async () => {
      if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        console.warn("Skipping: Supabase environment variables not configured");
        return;
      }

      const response = await fetch(`${SUPABASE_URL}/rest/v1/messages`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          conversation_id: "fake-conversation-id",
          role: "user",
          content: "Unauthorized message",
        }),
      });

      // RLS should block this
      expect(response.ok).toBe(false);
    });
  });
});
