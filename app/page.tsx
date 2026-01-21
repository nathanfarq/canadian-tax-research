import { ChatWindow } from "@/components/ChatWindow";
import { GuideInfoBox } from "@/components/guide/GuideInfoBox";

export default function Home() {
  const InfoCard = (
    <GuideInfoBox>
      <ul>
        <li className="text-l">
          🤖
          <span className="ml-2">
            Welcome to TaxBuddy! I'm your AI-powered tax assistant with access
            to relevant tax documents and information.
          </span>
        </li>
        <li className="hidden text-l md:block">
          🔍
          <span className="ml-2">
            I can search through tax documents to help answer your questions
            about tax-related topics.
          </span>
        </li>
        <li className="text-l">
          👇
          <span className="ml-2">
            Try asking a question about taxes below!
          </span>
        </li>
      </ul>
    </GuideInfoBox>
  );
  return (
    <ChatWindow
      endpoint="api/chat/retrieval_agents"
      emoji="🤖"
      placeholder="Ask me about taxes! I can search through tax documents to help answer your questions."
      emptyStateComponent={InfoCard}
      showIntermediateStepsToggle={true}
    />
  );
}
