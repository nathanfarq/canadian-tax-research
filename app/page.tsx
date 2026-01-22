import { ChatWindow } from "@/components/ChatWindow";
import { GuideInfoBox } from "@/components/guide/GuideInfoBox";

export default function Home() {
  const InfoCard = (
    <GuideInfoBox>
      <ul>
        <li className="text-l">
          Hi, I'm TaxBuddy! Your Canadian tax research assistant. 
        </li>
        <li className="text-l">  
          I can help you find CRA guidance, interpret tax legislation, and answer your tax
          questions with citations.
        </li>
        <li className="text-l">
          TaxBuddy is an AI research assistant that provides general Canadian tax information with citations. This is not professional advice. By using this tool, you agree that:
          <ul className="list-disc ml-6 mt-2">
            <li>You will verify all information with official CRA sources</li>
            <li>Filing decisions remain your responsibility</li>
            <li>You will consult a qualified professional for complex matters</li>
          </ul>
        </li>
        <li className="text-l">What can I help you with today?</li>
      </ul>
    </GuideInfoBox>
  );
  return (
    <ChatWindow
      endpoint="api/chat/retrieval_agents"
      placeholder="Ask a tax question..."
      emptyStateComponent={InfoCard}
      showIntermediateStepsToggle={true}
    />
  );
}
