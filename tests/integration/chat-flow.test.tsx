import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatWindow } from "@/components/ChatWindow";

// Create mock function that can be updated per test
const mockUseChat = vi.fn();

// Mock the useChat hook from @ai-sdk/react
vi.mock("@ai-sdk/react", () => ({
  useChat: (options: unknown) => mockUseChat(options),
}));

// Mock TextStreamChatTransport
vi.mock("ai", () => ({
  TextStreamChatTransport: vi.fn().mockImplementation(() => ({})),
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}));

describe("ChatWindow Integration", () => {
  beforeEach(() => {
    // Reset mock before each test
    mockUseChat.mockReturnValue({
      messages: [],
      status: "idle",
      sendMessage: vi.fn(),
      setMessages: vi.fn(),
    });
  });

  it("should display initial message when provided", () => {
    mockUseChat.mockReturnValue({
      messages: [
        {
          id: "initial",
          role: "assistant",
          parts: [{ type: "text", text: "Welcome to TaxBuddy!" }],
        },
      ],
      status: "idle",
      sendMessage: vi.fn(),
      setMessages: vi.fn(),
    });

    render(
      <ChatWindow
        endpoint="/api/chat/retrieval_agents"
        initialMessage="Welcome to TaxBuddy!"
      />
    );

    expect(screen.getByText("Welcome to TaxBuddy!")).toBeInTheDocument();
  });

  it("should render chat input with placeholder", () => {
    render(
      <ChatWindow
        endpoint="/api/chat/retrieval_agents"
        placeholder="Ask a tax question..."
      />
    );

    expect(
      screen.getByPlaceholderText("Ask a tax question...")
    ).toBeInTheDocument();
  });

  it("should show intermediate steps toggle when enabled", () => {
    render(
      <ChatWindow
        endpoint="/api/chat/retrieval_agents"
        showIntermediateStepsToggle={true}
      />
    );

    expect(screen.getByLabelText("Show steps")).toBeInTheDocument();
  });

  it("should not show intermediate steps toggle when disabled", () => {
    render(
      <ChatWindow
        endpoint="/api/chat/retrieval_agents"
        showIntermediateStepsToggle={false}
      />
    );

    expect(screen.queryByLabelText("Show steps")).not.toBeInTheDocument();
  });

  it("should display user messages", () => {
    mockUseChat.mockReturnValue({
      messages: [
        {
          id: "1",
          role: "user",
          parts: [
            { type: "text", text: "What is the RRSP contribution limit?" },
          ],
        },
      ],
      status: "idle",
      sendMessage: vi.fn(),
      setMessages: vi.fn(),
    });

    render(<ChatWindow endpoint="/api/chat/retrieval_agents" />);

    expect(
      screen.getByText("What is the RRSP contribution limit?")
    ).toBeInTheDocument();
  });

  it("should display assistant messages with logo", () => {
    mockUseChat.mockReturnValue({
      messages: [
        {
          id: "1",
          role: "assistant",
          parts: [
            {
              type: "text",
              text: "The RRSP contribution limit for 2024 is $31,560.",
            },
          ],
        },
      ],
      status: "idle",
      sendMessage: vi.fn(),
      setMessages: vi.fn(),
    });

    render(<ChatWindow endpoint="/api/chat/retrieval_agents" />);

    expect(
      screen.getByText("The RRSP contribution limit for 2024 is $31,560.")
    ).toBeInTheDocument();
    expect(screen.getByAltText("TaxBuddy")).toBeInTheDocument();
  });

  it("should show loading state when streaming", () => {
    mockUseChat.mockReturnValue({
      messages: [],
      status: "streaming",
      sendMessage: vi.fn(),
      setMessages: vi.fn(),
    });

    render(<ChatWindow endpoint="/api/chat/retrieval_agents" />);

    // Button should show loading spinner
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("should allow typing in the input", async () => {
    const user = userEvent.setup();

    render(
      <ChatWindow
        endpoint="/api/chat/retrieval_agents"
        placeholder="Type here..."
      />
    );

    const textarea = screen.getByPlaceholderText("Type here...");
    await user.type(textarea, "Hello world");

    expect(textarea).toHaveValue("Hello world");
  });

  it("should display system messages as intermediate steps", () => {
    mockUseChat.mockReturnValue({
      messages: [
        {
          id: "1",
          role: "system",
          parts: [
            {
              type: "text",
              text: JSON.stringify({
                action: { name: "searchDocs", args: { query: "tax" } },
                observation: "Found results",
              }),
            },
          ],
        },
      ],
      status: "idle",
      sendMessage: vi.fn(),
      setMessages: vi.fn(),
    });

    render(<ChatWindow endpoint="/api/chat/retrieval_agents" />);

    expect(screen.getByText("searchDocs")).toBeInTheDocument();
  });
});
