-- Chat History Tables Migration
-- Creates conversations and messages tables for authenticated users
-- Guest users are excluded from chat history (no records saved)

-- ============================================================================
-- CONVERSATIONS TABLE
-- Stores chat conversation metadata for each user
-- ============================================================================
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT,  -- Nullable, auto-generated from first message later
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookup of user's conversations
CREATE INDEX idx_conversations_user_id ON conversations(user_id);

-- ============================================================================
-- MESSAGES TABLE
-- Stores individual messages within conversations
-- ============================================================================
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast retrieval of messages in a conversation
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);

-- Index for ordering messages by creation time
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- ============================================================================
-- AUTO-UPDATE TRIGGER
-- Automatically updates conversations.updated_at when the row is modified
-- ============================================================================
CREATE OR REPLACE FUNCTION update_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_conversations_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_conversations_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY - CONVERSATIONS
-- Users can only access their own conversations
-- ============================================================================
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own conversations
-- Ensures users only see conversations where they are the owner
CREATE POLICY "Users can view own conversations"
    ON conversations
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can create conversations for themselves
-- Prevents users from creating conversations for other users
CREATE POLICY "Users can create own conversations"
    ON conversations
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own conversations
-- Allows users to modify title and other fields on their conversations
CREATE POLICY "Users can update own conversations"
    ON conversations
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own conversations
-- Cascade delete will also remove associated messages
CREATE POLICY "Users can delete own conversations"
    ON conversations
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- ROW LEVEL SECURITY - MESSAGES
-- Users can only access messages in their own conversations
-- ============================================================================
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view messages in their conversations
-- Join check ensures the parent conversation belongs to the user
CREATE POLICY "Users can view messages in own conversations"
    ON messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM conversations
            WHERE conversations.id = messages.conversation_id
            AND conversations.user_id = auth.uid()
        )
    );

-- Policy: Users can insert messages into their conversations
-- Validates that the target conversation belongs to the user
CREATE POLICY "Users can insert messages in own conversations"
    ON messages
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM conversations
            WHERE conversations.id = messages.conversation_id
            AND conversations.user_id = auth.uid()
        )
    );

-- Policy: Users can update messages in their conversations
-- Allows editing of message content within owned conversations
CREATE POLICY "Users can update messages in own conversations"
    ON messages
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM conversations
            WHERE conversations.id = messages.conversation_id
            AND conversations.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM conversations
            WHERE conversations.id = messages.conversation_id
            AND conversations.user_id = auth.uid()
        )
    );

-- Policy: Users can delete messages in their conversations
-- Individual message deletion (conversation delete cascades automatically)
CREATE POLICY "Users can delete messages in own conversations"
    ON messages
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM conversations
            WHERE conversations.id = messages.conversation_id
            AND conversations.user_id = auth.uid()
        )
    );
