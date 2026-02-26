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
    render(<ChatMessageBubble message={message} />);

    const messageElement = screen.getByText("How do I file taxes?");
    const bubble = messageElement.closest("div[class*='rounded']");
    expect(bubble).toHaveClass("ml-auto"); // User messages align right
  });

  it("should render assistant message with logo", () => {
    const message = createMessage("assistant", "You can file taxes online.");
    render(<ChatMessageBubble message={message} />);

    expect(screen.getByAltText("TaxBuddy")).toBeInTheDocument();
    expect(screen.getByText("You can file taxes online.")).toBeInTheDocument();
  });

  it("should not show logo for user messages", () => {
    const message = createMessage("user", "Hello");
    render(<ChatMessageBubble message={message} />);

    expect(screen.queryByAltText("TaxBuddy")).not.toBeInTheDocument();
  });

  it("should render markdown content", () => {
    const message = createMessage(
      "assistant",
      "**Important**: File by April 30th"
    );
    render(<ChatMessageBubble message={message} />);

    // ReactMarkdown should render the bold text
    const strongElement = screen.getByText("Important");
    expect(strongElement.tagName).toBe("STRONG");
  });

  it("should not display tool steps when showToolSteps is false", () => {
    const message: UIMessage = {
      id: "test-id",
      role: "assistant",
      parts: [
        {
          type: "tool-searchDocs",
          toolCallId: "tc-1",
          state: "output-available",
          input: { query: "tax filing" },
          output: "Search results...",
        } as any,
        { type: "text", text: "Answer" },
      ],
    };
    render(<ChatMessageBubble message={message} showToolSteps={false} />);

    expect(screen.queryByText("searchDocs")).not.toBeInTheDocument();
    expect(screen.getByText("Answer")).toBeInTheDocument();
  });

  it("should display tool steps inline when showToolSteps is true", () => {
    const message: UIMessage = {
      id: "test-id",
      role: "assistant",
      parts: [
        {
          type: "tool-searchDocs",
          toolCallId: "tc-1",
          state: "output-available",
          input: { query: "tax filing" },
          output: "Search results...",
        } as any,
        { type: "text", text: "Based on the results..." },
      ],
    };
    render(<ChatMessageBubble message={message} showToolSteps={true} />);

    expect(screen.getByText("searchDocs")).toBeInTheDocument();
    expect(screen.getByText("Based on the results...")).toBeInTheDocument();
  });
});
