/**
 * Conversation memory using LangGraph's InMemoryStore.
 * Uses namespace-based storage for thread-level persistence.
 * Supports message summarization for conversations exceeding the limit.
 */
import { InMemoryStore } from "@langchain/langgraph-checkpoint";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ConversationData {
  messages: ChatMessage[];
  summary?: string;
}

// Singleton store instance for in-memory conversation storage
const store = new InMemoryStore();

// Namespace prefix for conversation messages
const CONVERSATIONS_NS = "conversations";

/**
 * Retrieves conversation data (messages and summary) from the store.
 */
export async function getConversationData(
  conversationId: string
): Promise<ConversationData> {
  const namespace = [CONVERSATIONS_NS, conversationId];
  const items = await store.search(namespace);

  if (items.length === 0) {
    return { messages: [] };
  }

  const dataItem = items.find((item) => item.key === "data");
  if (!dataItem?.value) {
    // Fallback: check for legacy "messages" key
    const messagesItem = items.find((item) => item.key === "messages");
    if (messagesItem?.value?.messages) {
      return { messages: messagesItem.value.messages as ChatMessage[] };
    }
    return { messages: [] };
  }

  return {
    messages: (dataItem.value.messages as ChatMessage[]) ?? [],
    summary: dataItem.value.summary as string | undefined,
  };
}

/**
 * Retrieves messages for a conversation from the store.
 */
export async function getConversationMessages(
  conversationId: string
): Promise<ChatMessage[]> {
  const data = await getConversationData(conversationId);
  return data.messages;
}

/**
 * Retrieves the summary for a conversation.
 */
export async function getConversationSummary(
  conversationId: string
): Promise<string | undefined> {
  const data = await getConversationData(conversationId);
  return data.summary;
}

/**
 * Saves conversation data (messages and optional summary) to the store.
 */
export async function saveConversationData(
  conversationId: string,
  data: ConversationData
): Promise<void> {
  const namespace = [CONVERSATIONS_NS, conversationId];
  await store.put(namespace, "data", {
    messages: data.messages,
    summary: data.summary,
  });
}

/**
 * Saves messages to the conversation store (preserves existing summary).
 */
export async function saveConversationMessages(
  conversationId: string,
  messages: ChatMessage[]
): Promise<void> {
  const existingData = await getConversationData(conversationId);
  await saveConversationData(conversationId, {
    messages,
    summary: existingData.summary,
  });
}

/**
 * Updates the conversation summary.
 */
export async function saveConversationSummary(
  conversationId: string,
  summary: string
): Promise<void> {
  const existingData = await getConversationData(conversationId);
  await saveConversationData(conversationId, {
    messages: existingData.messages,
    summary,
  });
}

/**
 * Adds a single message to the conversation.
 */
export async function addMessageToConversation(
  conversationId: string,
  role: "user" | "assistant",
  content: string
): Promise<void> {
  const existing = await getConversationMessages(conversationId);
  existing.push({ role, content });
  await saveConversationMessages(conversationId, existing);
}

/**
 * Hydrates the store with messages from an external source (e.g., Supabase).
 * Only hydrates if the conversation doesn't already exist in memory.
 */
export async function hydrateFromMessages(
  conversationId: string,
  messages: Array<{ role: string; content: string }>
): Promise<void> {
  const existing = await getConversationMessages(conversationId);
  if (existing.length > 0) {
    return; // Already hydrated
  }

  const chatMessages: ChatMessage[] = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  await saveConversationMessages(conversationId, chatMessages);
}

/**
 * Checks if a conversation exists in memory.
 */
export async function hasConversation(conversationId: string): Promise<boolean> {
  const messages = await getConversationMessages(conversationId);
  return messages.length > 0;
}

/**
 * Clears all data for a conversation (messages and summary).
 */
export async function clearConversation(conversationId: string): Promise<void> {
  const namespace = [CONVERSATIONS_NS, conversationId];
  await store.delete(namespace, "data");
  // Also delete legacy "messages" key if it exists
  await store.delete(namespace, "messages");
}

/**
 * Summarizes older messages and keeps only the most recent ones.
 * This should be called when messages exceed the threshold.
 *
 * @param conversationId - The conversation to summarize
 * @param summarizer - Function that takes messages and existing summary, returns new summary
 * @param messagesToKeep - Number of recent messages to preserve (default: 2)
 * @returns The updated conversation data with summary and trimmed messages
 */
export async function summarizeAndTrimMessages(
  conversationId: string,
  summarizer: (messages: ChatMessage[], existingSummary?: string) => Promise<string>,
  messagesToKeep: number = 2
): Promise<ConversationData> {
  const data = await getConversationData(conversationId);
  const { messages, summary: existingSummary } = data;

  if (messages.length <= messagesToKeep) {
    return data;
  }

  // Split messages: older ones to summarize, recent ones to keep
  const messagesToSummarize = messages.slice(0, -messagesToKeep);
  const recentMessages = messages.slice(-messagesToKeep);

  // Generate new summary incorporating the older messages
  const newSummary = await summarizer(messagesToSummarize, existingSummary);

  // Save the updated data
  const updatedData: ConversationData = {
    messages: recentMessages,
    summary: newSummary,
  };
  await saveConversationData(conversationId, updatedData);

  console.log(`[MEMORY] Summarized ${messagesToSummarize.length} messages, kept ${recentMessages.length}`);
  return updatedData;
}

// Export the store for direct access if needed
export { store };
