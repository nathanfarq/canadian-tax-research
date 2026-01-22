import { ChatWindow } from "@/components/ChatWindow";

const WELCOME_MESSAGE = `Hi, I'm TaxBuddy! Your Canadian tax research assistant.

I can help you find CRA guidance, interpret tax legislation, and answer your tax questions with citations.

TaxBuddy is an AI research assistant that provides general Canadian tax information with citations. This is not professional advice. By using this tool, you agree that:

- You will verify all information with official CRA sources
- Filing decisions remain your responsibility
- You will consult a qualified professional for complex matters

What can I help you with today?`;

export default function Home() {
  return (
    <ChatWindow
      endpoint="api/chat/retrieval_agents"
      placeholder="Ask a tax question..."
      showIntermediateStepsToggle={true}
      initialMessage={WELCOME_MESSAGE}
    />
  );
}
