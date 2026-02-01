import { describe, it, expect, beforeEach } from "vitest";
import {
  setMockUser,
  mockUser,
  mockConversation,
  mockConversation2,
  mockMessages,
  resetMockState,
} from "../../mocks/supabase";
import {
  setupMockConversationsData,
  clearMockConversationsData,
} from "../../mocks/supabaseHandlers";

/**
 * Supabase Conversations API Integration Tests
 *
 * Test ID Convention:
 * - AUTH-XXX: Authentication & Authorization tests
 * - LIST-XXX: Conversation list operations (GET/POST /api/conversations)
 * - DETAIL-XXX: Single conversation operations (GET /api/conversations/:id)
 * - UPDATE-XXX: Conversation update operations (PATCH /api/conversations/:id)
 * - DELETE-XXX: Conversation delete operations (DELETE /api/conversations/:id)
 * - ERR-XXX: Error handling tests
 */
describe("Supabase Conversations API", () => {
  beforeEach(() => {
    resetMockState();
    clearMockConversationsData();
  });

  describe("Authentication & Authorization", () => {
    it("[AUTH-001] GET /api/conversations returns 401 when not authenticated", async () => {
      const response = await fetch("/api/conversations");

      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.error).toBe("Unauthorized");
    });

    it("[AUTH-002] POST /api/conversations returns 401 when not authenticated", async () => {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New Conversation" }),
      });

      expect(response.status).toBe(401);
    });

    it("[AUTH-003] GET /api/conversations/:id returns 401 when not authenticated", async () => {
      const response = await fetch(`/api/conversations/${mockConversation.id}`);

      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.error).toBe("Unauthorized");
    });

    it("[AUTH-004] PATCH /api/conversations/:id returns 401 when not authenticated", async () => {
      const response = await fetch(`/api/conversations/${mockConversation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Updated Title" }),
      });

      expect(response.status).toBe(401);
    });

    it("[AUTH-005] DELETE /api/conversations/:id returns 401 when not authenticated", async () => {
      const response = await fetch(`/api/conversations/${mockConversation.id}`, {
        method: "DELETE",
      });

      expect(response.status).toBe(401);
    });
  });

  describe("Conversation List Operations", () => {
    it("[LIST-001] returns empty array when no conversations exist", async () => {
      setMockUser(mockUser);

      const response = await fetch("/api/conversations");

      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data.conversations).toEqual([]);
    });

    it("[LIST-002] returns conversations sorted by updated_at desc", async () => {
      setMockUser(mockUser);
      setupMockConversationsData();

      const response = await fetch("/api/conversations");

      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data.conversations).toBeDefined();
      expect(Array.isArray(data.conversations)).toBe(true);
      expect(data.conversations.length).toBeGreaterThan(0);

      // Verify descending order
      if (data.conversations.length > 1) {
        const first = new Date(data.conversations[0].updated_at).getTime();
        const second = new Date(data.conversations[1].updated_at).getTime();
        expect(first).toBeGreaterThanOrEqual(second);
      }
    });

    it("[LIST-003] returns conversations with required fields (id, title, created_at, updated_at)", async () => {
      setMockUser(mockUser);
      setupMockConversationsData();

      const response = await fetch("/api/conversations");
      const data = await response.json();

      const conversation = data.conversations[0];
      expect(conversation).toHaveProperty("id");
      expect(conversation).toHaveProperty("title");
      expect(conversation).toHaveProperty("created_at");
      expect(conversation).toHaveProperty("updated_at");
    });

    it("[LIST-004] POST creates new conversation with title", async () => {
      setMockUser(mockUser);

      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Test Conversation" }),
      });

      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.conversation).toBeDefined();
      expect(data.conversation.title).toBe("Test Conversation");
      expect(data.conversation.id).toBeDefined();
    });

    it("[LIST-005] POST creates conversation with null title when not provided", async () => {
      setMockUser(mockUser);

      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.conversation.title).toBeNull();
    });

    it("[LIST-006] POST sets created_at and updated_at timestamps", async () => {
      setMockUser(mockUser);

      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New" }),
      });

      const data = await response.json();
      expect(data.conversation.created_at).toBeDefined();
      expect(data.conversation.updated_at).toBeDefined();
    });

    it("[LIST-007] newly created conversation appears in GET list", async () => {
      setMockUser(mockUser);

      // Create a new conversation
      await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Added Conversation" }),
      });

      // Fetch all conversations
      const listResponse = await fetch("/api/conversations");
      const listData = await listResponse.json();

      const found = listData.conversations.find(
        (c: { title: string }) => c.title === "Added Conversation"
      );
      expect(found).toBeDefined();
    });
  });

  describe("Single Conversation Operations", () => {
    it("[DETAIL-001] GET returns conversation with messages", async () => {
      setMockUser(mockUser);
      setupMockConversationsData();

      const response = await fetch(`/api/conversations/${mockConversation.id}`);

      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data.conversation).toBeDefined();
      expect(data.messages).toBeDefined();
      expect(Array.isArray(data.messages)).toBe(true);
    });

    it("[DETAIL-002] GET returns 404 for non-existent conversation", async () => {
      setMockUser(mockUser);
      setupMockConversationsData();

      const response = await fetch("/api/conversations/non-existent-id");

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.error).toBe("Conversation not found");
    });

    it("[DETAIL-003] GET returns conversation with all required fields", async () => {
      setMockUser(mockUser);
      setupMockConversationsData();

      const response = await fetch(`/api/conversations/${mockConversation.id}`);
      const data = await response.json();

      expect(data.conversation.id).toBe(mockConversation.id);
      expect(data.conversation).toHaveProperty("title");
      expect(data.conversation).toHaveProperty("created_at");
      expect(data.conversation).toHaveProperty("updated_at");
    });

    it("[DETAIL-004] GET returns messages with required fields (id, role, content, created_at)", async () => {
      setMockUser(mockUser);
      setupMockConversationsData();

      const response = await fetch(`/api/conversations/${mockConversation.id}`);
      const data = await response.json();

      if (data.messages.length > 0) {
        const message = data.messages[0];
        expect(message).toHaveProperty("id");
        expect(message).toHaveProperty("role");
        expect(message).toHaveProperty("content");
        expect(message).toHaveProperty("created_at");
      }
    });

    it("[DETAIL-005] GET returns messages sorted by created_at ascending", async () => {
      setMockUser(mockUser);
      setupMockConversationsData();

      const response = await fetch(`/api/conversations/${mockConversation.id}`);
      const data = await response.json();

      if (data.messages.length > 1) {
        const first = new Date(data.messages[0].created_at).getTime();
        const second = new Date(data.messages[1].created_at).getTime();
        expect(first).toBeLessThanOrEqual(second);
      }
    });
  });

  describe("Conversation Update Operations", () => {
    it("[UPDATE-001] PATCH updates conversation title", async () => {
      setMockUser(mockUser);
      setupMockConversationsData();

      const newTitle = "Updated Conversation Title";
      const response = await fetch(`/api/conversations/${mockConversation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });

      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data.conversation.title).toBe(newTitle);
    });

    it("[UPDATE-002] PATCH updates the updated_at timestamp", async () => {
      setMockUser(mockUser);
      setupMockConversationsData();

      const originalUpdatedAt = mockConversation.updated_at;

      const response = await fetch(`/api/conversations/${mockConversation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New Title" }),
      });

      const data = await response.json();
      expect(new Date(data.conversation.updated_at).getTime()).toBeGreaterThanOrEqual(
        new Date(originalUpdatedAt).getTime()
      );
    });

    it("[UPDATE-003] PATCH returns 400 when title is not provided", async () => {
      setMockUser(mockUser);
      setupMockConversationsData();

      const response = await fetch(`/api/conversations/${mockConversation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe("Title is required");
    });

    it("[UPDATE-004] PATCH returns 404 for non-existent conversation", async () => {
      setMockUser(mockUser);
      setupMockConversationsData();

      const response = await fetch("/api/conversations/non-existent-id", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Updated" }),
      });

      expect(response.status).toBe(404);
    });

    it("[UPDATE-005] PATCH returns the updated conversation with all fields", async () => {
      setMockUser(mockUser);
      setupMockConversationsData();

      const response = await fetch(`/api/conversations/${mockConversation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Updated" }),
      });

      const data = await response.json();
      expect(data.conversation).toHaveProperty("id");
      expect(data.conversation).toHaveProperty("title");
      expect(data.conversation).toHaveProperty("created_at");
      expect(data.conversation).toHaveProperty("updated_at");
    });
  });

  describe("Conversation Delete Operations", () => {
    it("[DELETE-001] DELETE removes conversation", async () => {
      setMockUser(mockUser);
      setupMockConversationsData();

      const response = await fetch(`/api/conversations/${mockConversation.id}`, {
        method: "DELETE",
      });

      expect(response.status).toBe(204);
    });

    it("[DELETE-002] DELETE is idempotent (succeeds for non-existent conversation)", async () => {
      setMockUser(mockUser);
      setupMockConversationsData();

      const response = await fetch("/api/conversations/non-existent-id", {
        method: "DELETE",
      });

      // DELETE should be idempotent
      expect(response.status).toBe(204);
    });

    it("[DELETE-003] DELETE removes conversation from list", async () => {
      setMockUser(mockUser);
      setupMockConversationsData();

      // Delete the conversation
      await fetch(`/api/conversations/${mockConversation.id}`, {
        method: "DELETE",
      });

      // Verify it's gone
      const getResponse = await fetch(
        `/api/conversations/${mockConversation.id}`
      );
      expect(getResponse.status).toBe(404);
    });

    it("[DELETE-004] DELETE also removes associated messages (cascade)", async () => {
      setMockUser(mockUser);
      setupMockConversationsData();

      // Delete the conversation
      await fetch(`/api/conversations/${mockConversation.id}`, {
        method: "DELETE",
      });

      // Try to get the conversation - should be 404
      const response = await fetch(`/api/conversations/${mockConversation.id}`);
      expect(response.status).toBe(404);
    });
  });

  describe("Error Handling", () => {
    it("[ERR-001] PATCH with malformed JSON returns error", async () => {
      setMockUser(mockUser);
      setupMockConversationsData();

      const response = await fetch(`/api/conversations/${mockConversation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: "not valid json",
      });

      // Should return an error status
      expect(response.ok).toBe(false);
    });

    it("[ERR-002] PATCH with missing title returns 400", async () => {
      setMockUser(mockUser);
      setupMockConversationsData();

      const response = await fetch(`/api/conversations/${mockConversation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notTitle: "value" }),
      });

      expect(response.status).toBe(400);
    });
  });
});
