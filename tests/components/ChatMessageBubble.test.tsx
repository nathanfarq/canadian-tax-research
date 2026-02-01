import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChatMessageBubble } from "@/components/ChatMessageBubble";
import type { UIMessage } from "@ai-sdk/react";

// Helper to create a UIMessage
function createMessage(
  role: "user" | "assistant",
  text: string
): UIMessage {
  return {
    id: "test-id",
    role,
    parts: [{ type: "text", text }],
  };
}

describe("ChatMessageBubble", () => {
  it("should render user message with correct styling", () => {
    const message = createMessage("user", "How do I file taxes?");
    render(<ChatMessageBubble message={message} sources={[]} />);

    const messageElement = screen.getByText("How do I file taxes?");
    const bubble = messageElement.closest("div[class*='rounded']");
    expect(bubble).toHaveClass("ml-auto"); // User messages align right
  });

  it("should render assistant message with logo", () => {
    const message = createMessage("assistant", "You can file taxes online.");
    render(<ChatMessageBubble message={message} sources={[]} />);

    expect(screen.getByAltText("TaxBuddy")).toBeInTheDocument();
    expect(screen.getByText("You can file taxes online.")).toBeInTheDocument();
  });

  it("should not show logo for user messages", () => {
    const message = createMessage("user", "Hello");
    render(<ChatMessageBubble message={message} sources={[]} />);

    expect(screen.queryByAltText("TaxBuddy")).not.toBeInTheDocument();
  });

  it("should render markdown content", () => {
    const message = createMessage(
      "assistant",
      "**Important**: File by April 30th"
    );
    render(<ChatMessageBubble message={message} sources={[]} />);

    // ReactMarkdown should render the bold text
    const strongElement = screen.getByText("Important");
    expect(strongElement.tagName).toBe("STRONG");
  });

  it("should display sources when provided", () => {
    const message = createMessage("assistant", "Answer");
    const sources = [
      { pageContent: "CRA guidance on filing deadlines", metadata: {} },
    ];

    render(<ChatMessageBubble message={message} sources={sources} />);

    expect(screen.getByText("🔍 Sources:")).toBeInTheDocument();
    expect(
      screen.getByText(/"CRA guidance on filing deadlines"/)
    ).toBeInTheDocument();
  });

  it("should display multiple sources", () => {
    const message = createMessage("assistant", "Answer");
    const sources = [
      { pageContent: "Source one content", metadata: {} },
      { pageContent: "Source two content", metadata: {} },
    ];

    render(<ChatMessageBubble message={message} sources={sources} />);

    expect(screen.getByText(/"Source one content"/)).toBeInTheDocument();
    expect(screen.getByText(/"Source two content"/)).toBeInTheDocument();
  });

  it("should not display sources section when empty", () => {
    const message = createMessage("assistant", "Answer");
    render(<ChatMessageBubble message={message} sources={[]} />);

    expect(screen.queryByText("🔍 Sources:")).not.toBeInTheDocument();
  });

  it("should display line numbers when available in metadata", () => {
    const message = createMessage("assistant", "Answer");
    const sources = [
      {
        pageContent: "Tax code section",
        metadata: { loc: { lines: { from: 10, to: 20 } } },
      },
    ];

    render(<ChatMessageBubble message={message} sources={sources} />);

    expect(screen.getByText(/Lines 10 to 20/)).toBeInTheDocument();
  });
});
