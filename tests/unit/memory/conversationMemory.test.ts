import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getConversationData,
  getConversationMessages,
  getConversationSummary,
  saveConversationData,
  saveConversationMessages,
  saveConversationSummary,
  addMessageToConversation,
  hydrateFromMessages,
  hasConversation,
  clearConversation,
  summarizeAndTrimMessages,
  type ChatMessage,
  type ConversationData,
} from "@/lib/memory/conversationMemory";

describe("Conversation Memory", () => {
  const testConversationId = "test-conv-123";

  beforeEach(async () => {
    // Clear test conversation before each test
    await clearConversation(testConversationId);
  });

  describe("getConversationData", () => {
    it("should return empty messages for non-existent conversation", async () => {
      const data = await getConversationData("non-existent");
      expect(data.messages).toEqual([]);
      expect(data.summary).toBeUndefined();
    });

    it("should return saved data", async () => {
      const testData: ConversationData = {
        messages: [{ role: "user", content: "Hello" }],
        summary: "User greeted",
      };
      await saveConversationData(testConversationId, testData);

      const result = await getConversationData(testConversationId);
      expect(result.messages).toEqual(testData.messages);
      expect(result.summary).toBe(testData.summary);
    });
  });

  describe("getConversationMessages", () => {
    it("should return empty array for non-existent conversation", async () => {
      const messages = await getConversationMessages("non-existent");
      expect(messages).toEqual([]);
    });

    it("should return only messages without summary", async () => {
      const testMessages: ChatMessage[] = [
        { role: "user", content: "Question" },
        { role: "assistant", content: "Answer" },
      ];
      await saveConversationMessages(testConversationId, testMessages);

      const result = await getConversationMessages(testConversationId);
      expect(result).toEqual(testMessages);
    });
  });

  describe("getConversationSummary", () => {
    it("should return undefined for conversation without summary", async () => {
      await saveConversationMessages(testConversationId, [
        { role: "user", content: "Test" },
      ]);

      const summary = await getConversationSummary(testConversationId);
      expect(summary).toBeUndefined();
    });

    it("should return saved summary", async () => {
      await saveConversationData(testConversationId, {
        messages: [],
        summary: "Test summary",
      });

      const summary = await getConversationSummary(testConversationId);
      expect(summary).toBe("Test summary");
    });
  });

  describe("saveConversationData", () => {
    it("should save messages and summary together", async () => {
      const data: ConversationData = {
        messages: [{ role: "user", content: "Hello" }],
        summary: "Greeting",
      };

      await saveConversationData(testConversationId, data);

      const result = await getConversationData(testConversationId);
      expect(result).toEqual(data);
    });

    it("should overwrite existing data", async () => {
      await saveConversationData(testConversationId, {
        messages: [{ role: "user", content: "First" }],
        summary: "First summary",
      });

      const newData: ConversationData = {
        messages: [{ role: "user", content: "Second" }],
        summary: "Second summary",
      };
      await saveConversationData(testConversationId, newData);

      const result = await getConversationData(testConversationId);
      expect(result).toEqual(newData);
    });
  });

  describe("saveConversationMessages", () => {
    it("should save messages while preserving existing summary", async () => {
      await saveConversationData(testConversationId, {
        messages: [{ role: "user", content: "Old" }],
        summary: "Existing summary",
      });

      const newMessages: ChatMessage[] = [
        { role: "user", content: "New" },
        { role: "assistant", content: "Response" },
      ];
      await saveConversationMessages(testConversationId, newMessages);

      const result = await getConversationData(testConversationId);
      expect(result.messages).toEqual(newMessages);
      expect(result.summary).toBe("Existing summary");
    });
  });

  describe("saveConversationSummary", () => {
    it("should save summary while preserving existing messages", async () => {
      const messages: ChatMessage[] = [{ role: "user", content: "Test" }];
      await saveConversationMessages(testConversationId, messages);

      await saveConversationSummary(testConversationId, "New summary");

      const result = await getConversationData(testConversationId);
      expect(result.messages).toEqual(messages);
      expect(result.summary).toBe("New summary");
    });
  });

  describe("addMessageToConversation", () => {
    it("should add message to empty conversation", async () => {
      await addMessageToConversation(testConversationId, "user", "Hello");

      const messages = await getConversationMessages(testConversationId);
      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual({ role: "user", content: "Hello" });
    });

    it("should append message to existing conversation", async () => {
      await saveConversationMessages(testConversationId, [
        { role: "user", content: "First" },
      ]);

      await addMessageToConversation(testConversationId, "assistant", "Second");

      const messages = await getConversationMessages(testConversationId);
      expect(messages).toHaveLength(2);
      expect(messages[1]).toEqual({ role: "assistant", content: "Second" });
    });
  });

  describe("hydrateFromMessages", () => {
    it("should hydrate empty conversation from external messages", async () => {
      const externalMessages = [
        { role: "user", content: "Question 1" },
        { role: "assistant", content: "Answer 1" },
        { role: "system", content: "Should be filtered" },
      ];

      await hydrateFromMessages(testConversationId, externalMessages);

      const messages = await getConversationMessages(testConversationId);
      expect(messages).toHaveLength(2);
      expect(messages[0].role).toBe("user");
      expect(messages[1].role).toBe("assistant");
    });

    it("should not overwrite existing messages", async () => {
      await saveConversationMessages(testConversationId, [
        { role: "user", content: "Existing" },
      ]);

      await hydrateFromMessages(testConversationId, [
        { role: "user", content: "New" },
      ]);

      const messages = await getConversationMessages(testConversationId);
      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe("Existing");
    });

    it("should filter out non-user/assistant roles", async () => {
      await hydrateFromMessages(testConversationId, [
        { role: "user", content: "User message" },
        { role: "system", content: "System message" },
        { role: "tool", content: "Tool message" },
        { role: "assistant", content: "Assistant message" },
      ]);

      const messages = await getConversationMessages(testConversationId);
      expect(messages).toHaveLength(2);
      expect(messages.every((m) => ["user", "assistant"].includes(m.role))).toBe(
        true
      );
    });
  });

  describe("hasConversation", () => {
    it("should return false for non-existent conversation", async () => {
      const exists = await hasConversation("non-existent");
      expect(exists).toBe(false);
    });

    it("should return false for conversation with empty messages", async () => {
      await saveConversationMessages(testConversationId, []);
      const exists = await hasConversation(testConversationId);
      expect(exists).toBe(false);
    });

    it("should return true for conversation with messages", async () => {
      await saveConversationMessages(testConversationId, [
        { role: "user", content: "Test" },
      ]);

      const exists = await hasConversation(testConversationId);
      expect(exists).toBe(true);
    });
  });

  describe("clearConversation", () => {
    it("should remove all conversation data", async () => {
      await saveConversationData(testConversationId, {
        messages: [{ role: "user", content: "Test" }],
        summary: "Summary",
      });

      await clearConversation(testConversationId);

      const data = await getConversationData(testConversationId);
      expect(data.messages).toEqual([]);
      expect(data.summary).toBeUndefined();
    });

    it("should not throw for non-existent conversation", async () => {
      await expect(clearConversation("non-existent")).resolves.not.toThrow();
    });
  });

  describe("summarizeAndTrimMessages", () => {
    it("should not summarize when messages are below threshold", async () => {
      const messages: ChatMessage[] = [
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi" },
      ];
      await saveConversationMessages(testConversationId, messages);

      const mockSummarizer = vi.fn();
      const result = await summarizeAndTrimMessages(
        testConversationId,
        mockSummarizer,
        3
      );

      expect(mockSummarizer).not.toHaveBeenCalled();
      expect(result.messages).toEqual(messages);
    });

    it("should summarize older messages and keep recent ones", async () => {
      const messages: ChatMessage[] = [
        { role: "user", content: "Message 1" },
        { role: "assistant", content: "Response 1" },
        { role: "user", content: "Message 2" },
        { role: "assistant", content: "Response 2" },
      ];
      await saveConversationMessages(testConversationId, messages);

      const mockSummarizer = vi.fn().mockResolvedValue("Summary of older messages");
      const result = await summarizeAndTrimMessages(
        testConversationId,
        mockSummarizer,
        2
      );

      expect(mockSummarizer).toHaveBeenCalledWith(
        messages.slice(0, 2),
        undefined
      );
      expect(result.messages).toHaveLength(2);
      expect(result.messages).toEqual(messages.slice(-2));
      expect(result.summary).toBe("Summary of older messages");
    });

    it("should pass existing summary to summarizer", async () => {
      await saveConversationData(testConversationId, {
        messages: [
          { role: "user", content: "Old message" },
          { role: "assistant", content: "Old response" },
          { role: "user", content: "New message" },
          { role: "assistant", content: "New response" },
        ],
        summary: "Previous summary",
      });

      const mockSummarizer = vi.fn().mockResolvedValue("Updated summary");
      await summarizeAndTrimMessages(testConversationId, mockSummarizer, 2);

      expect(mockSummarizer).toHaveBeenCalledWith(
        expect.any(Array),
        "Previous summary"
      );
    });

    it("should persist summarized data", async () => {
      const messages: ChatMessage[] = [
        { role: "user", content: "1" },
        { role: "assistant", content: "2" },
        { role: "user", content: "3" },
        { role: "assistant", content: "4" },
      ];
      await saveConversationMessages(testConversationId, messages);

      const mockSummarizer = vi.fn().mockResolvedValue("New summary");
      await summarizeAndTrimMessages(testConversationId, mockSummarizer, 2);

      // Verify persisted data
      const data = await getConversationData(testConversationId);
      expect(data.messages).toHaveLength(2);
      expect(data.summary).toBe("New summary");
    });
  });
});
