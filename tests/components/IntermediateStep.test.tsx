import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { IntermediateStep } from "@/components/IntermediateStep";
import type { UIMessage } from "@ai-sdk/react";

// Helper to create a step message
function createStepMessage(
  action: { name: string; args: Record<string, unknown> },
  observation: string
): UIMessage {
  return {
    id: "step-1",
    role: "system",
    parts: [{ type: "text", text: JSON.stringify({ action, observation }) }],
  };
}

describe("IntermediateStep", () => {
  it("should display tool name in collapsed state", () => {
    const message = createStepMessage(
      { name: "searchDocs", args: { query: "RRSP limits" } },
      "Found 3 documents..."
    );

    render(<IntermediateStep message={message} />);

    expect(screen.getByText("searchDocs")).toBeInTheDocument();
    expect(screen.getByText(/Step:/)).toBeInTheDocument();
  });

  it("should expand to show input and output on click", () => {
    const message = createStepMessage(
      { name: "searchDocs", args: { query: "RRSP limits" } },
      "Source 1: RRSP contribution limit is $31,560 for 2024"
    );

    render(<IntermediateStep message={message} />);

    const button = screen.getByRole("button");
    fireEvent.click(button);

    expect(screen.getByText(/Input:/)).toBeInTheDocument();
    expect(screen.getByText(/Output:/)).toBeInTheDocument();
    expect(
      screen.getByText(/RRSP contribution limit is \$31,560/)
    ).toBeInTheDocument();
  });

  it("should show args as JSON", () => {
    const message = createStepMessage(
      { name: "searchDocs", args: { query: "capital gains", year: 2024 } },
      "Results found"
    );

    render(<IntermediateStep message={message} />);

    const button = screen.getByRole("button");
    fireEvent.click(button);

    // Should show stringified args
    expect(
      screen.getByText('{"query":"capital gains","year":2024}')
    ).toBeInTheDocument();
  });

  it("should toggle collapse state", () => {
    const message = createStepMessage(
      { name: "searchDocs", args: { query: "test" } },
      "result"
    );

    render(<IntermediateStep message={message} />);

    const button = screen.getByRole("button");

    // Click to expand
    fireEvent.click(button);
    expect(screen.getByText(/Input:/)).toBeVisible();

    // Click again to collapse
    fireEvent.click(button);
    // Content div should have max-h-[0px] class (collapsed)
    const contentDiv = screen.getByText(/Input:/).closest("div")?.parentElement;
    expect(contentDiv).toHaveClass("max-h-[0px]");
  });
});
