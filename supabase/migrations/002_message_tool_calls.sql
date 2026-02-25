-- Add tool_calls column to messages table
-- Stores tool invocation data (searchDocs queries and results) for assistant messages
-- NULL for user messages and assistant messages without tool calls
ALTER TABLE messages ADD COLUMN tool_calls JSONB;
