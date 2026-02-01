/**
 * Memory constants and utilities for conversation management.
 * Storage is handled by LangGraph's InMemoryStore in conversationMemory.ts.
 */

// Guest session key for unauthenticated users
export const GUEST_SESSION_KEY = "guest-session";

// Maximum messages to include in context (10 = 5 user/assistant pairs)
export const MAX_MEMORY_MESSAGES = 10;

// Number of recent messages to keep when summarizing (keep last 2 messages)
export const MESSAGES_TO_KEEP = 2;

// Threshold to trigger summarization (when messages exceed this count)
export const SUMMARIZATION_THRESHOLD = MAX_MEMORY_MESSAGES;
