"use client";

import { useState, useCallback } from "react";
import { ChatWindow } from "@/components/ChatWindow";
import { ConversationSidebar } from "@/components/sidebar/ConversationSidebar";
import { useConversations } from "@/hooks/useConversations";

const WELCOME_MESSAGE = `Hi, I'm TaxBuddy! Your Canadian tax research assistant.

I can help you find CRA guidance, interpret tax legislation, and answer your tax questions with citations.

TaxBuddy is an AI research assistant that provides general Canadian tax information with citations. This is not professional advice. By using this tool, you agree that:

- You will verify all information with official CRA sources
- Filing decisions remain your responsibility
- You will consult a qualified professional for complex matters

What can I help you with today?`;

export default function Home() {
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const { refetch: refetchConversations } = useConversations();

  const handleSelectConversation = useCallback((id: string) => {
    setCurrentConversationId(id);
  }, []);

  const handleNewConversation = useCallback(() => {
    setCurrentConversationId(null);
  }, []);

  const handleDeleteConversation = useCallback((deletedId: string) => {
    // If the deleted conversation was currently selected, reset to new chat
    if (deletedId === currentConversationId) {
      setCurrentConversationId(null);
    }
  }, [currentConversationId]);

  const handleConversationChange = useCallback((id: string | null) => {
    if (id) {
      setCurrentConversationId(id);
      // Refetch sidebar to show new conversation
      refetchConversations();
    }
  }, [refetchConversations]);

  return (
    <div className="flex h-full">
      <ConversationSidebar
        currentConversationId={currentConversationId ?? undefined}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
      />
      <div className="flex-1 relative">
        <ChatWindow
          endpoint="api/chat/retrieval_agents"
          placeholder="Ask a tax question..."
          showIntermediateStepsToggle={true}
          initialMessage={WELCOME_MESSAGE}
          conversationId={currentConversationId}
          onConversationChange={handleConversationChange}
        />
      </div>
    </div>
  );
}
