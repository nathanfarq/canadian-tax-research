import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatInput } from "@/components/ChatWindow";

describe("ChatInput", () => {
  const defaultProps = {
    onSubmit: vi.fn((e) => e.preventDefault()),
    value: "",
    onChange: vi.fn(),
    loading: false,
  };

  it("should render textarea with placeholder", () => {
    render(<ChatInput {...defaultProps} placeholder="Ask a question..." />);
    expect(screen.getByPlaceholderText("Ask a question...")).toBeInTheDocument();
  });

  it("should call onChange when typing", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ChatInput {...defaultProps} onChange={onChange} />);

    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "Hello");

    expect(onChange).toHaveBeenCalled();
  });

  it("should submit on Enter key", () => {
    const onSubmit = vi.fn((e) => e.preventDefault());
    render(<ChatInput {...defaultProps} onSubmit={onSubmit} value="Test" />);

    const textarea = screen.getByRole("textbox");
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

    expect(onSubmit).toHaveBeenCalled();
  });

  it("should not submit on Shift+Enter", () => {
    const onSubmit = vi.fn((e) => e.preventDefault());
    render(<ChatInput {...defaultProps} onSubmit={onSubmit} />);

    const textarea = screen.getByRole("textbox");
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("should show loading spinner when loading", () => {
    render(<ChatInput {...defaultProps} loading={true} />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("should disable button when loading without onStop", () => {
    render(<ChatInput {...defaultProps} loading={true} />);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("should show Send text when not loading", () => {
    render(<ChatInput {...defaultProps} loading={false} />);
    expect(screen.getByRole("button")).toHaveTextContent("Send");
  });

  it("should call onStop when loading and button clicked", async () => {
    const user = userEvent.setup();
    const onStop = vi.fn();
    render(<ChatInput {...defaultProps} loading={true} onStop={onStop} />);

    const button = screen.getByRole("button");
    await user.click(button);

    expect(onStop).toHaveBeenCalled();
  });

  it("should display current value", () => {
    render(<ChatInput {...defaultProps} value="Current message" />);
    expect(screen.getByRole("textbox")).toHaveValue("Current message");
  });
});
