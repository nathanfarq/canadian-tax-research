import { http, HttpResponse } from "msw";
import {
  mockState,
  mockConversation,
  mockConversation2,
  mockMessages,
} from "./supabase";

// ============================================================================
// Conversations API Handlers
// ============================================================================

export const supabaseHandlers = [
  // GET /api/conversations - List all conversations
  http.get("/api/conversations", () => {
    // Check auth
    if (!mockState.user) {
      return HttpResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Return user's conversations sorted by updated_at descending
    const conversations = [...mockState.conversations].sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );

    return HttpResponse.json({ conversations });
  }),

  // POST /api/conversations - Create a new conversation
  http.post("/api/conversations", async ({ request }) => {
    // Check auth
    if (!mockState.user) {
      return HttpResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as { title?: string };
    const title = body.title || null;

    const newConversation = {
      id: `conv-${Date.now()}`,
      user_id: mockState.user.id,
      title,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    mockState.conversations.push(newConversation);

    return HttpResponse.json({ conversation: newConversation }, { status: 201 });
  }),

  // GET /api/conversations/:id - Get conversation with messages
  http.get("/api/conversations/:id", ({ params }) => {
    const { id } = params;

    // Check auth
    if (!mockState.user) {
      return HttpResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find conversation
    const conversation = mockState.conversations.find((c) => c.id === id);
    if (!conversation) {
      return HttpResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Get messages for this conversation
    const messages = mockState.messages
      .filter((m) => m.conversation_id === id)
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

    return HttpResponse.json({ conversation, messages });
  }),

  // PATCH /api/conversations/:id - Update conversation
  http.patch("/api/conversations/:id", async ({ params, request }) => {
    const { id } = params;

    // Check auth
    if (!mockState.user) {
      return HttpResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { title?: string };

    if (typeof body.title !== "string") {
      return HttpResponse.json({ error: "Title is required" }, { status: 400 });
    }

    // Find and update conversation
    const index = mockState.conversations.findIndex((c) => c.id === id);
    if (index === -1) {
      return HttpResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    mockState.conversations[index] = {
      ...mockState.conversations[index],
      title: body.title,
      updated_at: new Date().toISOString(),
    };

    return HttpResponse.json({ conversation: mockState.conversations[index] });
  }),

  // DELETE /api/conversations/:id - Delete conversation
  http.delete("/api/conversations/:id", ({ params }) => {
    const { id } = params;

    // Check auth
    if (!mockState.user) {
      return HttpResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find and remove conversation
    const index = mockState.conversations.findIndex((c) => c.id === id);
    if (index === -1) {
      // DELETE should be idempotent, return success even if not found
      return new HttpResponse(null, { status: 204 });
    }

    mockState.conversations.splice(index, 1);
    // Also remove associated messages
    mockState.messages = mockState.messages.filter(
      (m) => m.conversation_id !== id
    );

    return new HttpResponse(null, { status: 204 });
  }),
];

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Sets up mock data with default conversations and messages
 */
export function setupMockConversationsData() {
  mockState.conversations = [mockConversation, mockConversation2];
  mockState.messages = [...mockMessages];
}

/**
 * Clears all mock conversation data
 */
export function clearMockConversationsData() {
  mockState.conversations = [];
  mockState.messages = [];
}
