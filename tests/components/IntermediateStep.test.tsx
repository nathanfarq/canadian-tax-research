import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ToolInvocationStep } from "@/components/IntermediateStep";

describe("ToolInvocationStep", () => {
  it("should display tool name in collapsed state", () => {
    render(
      <ToolInvocationStep
        invocation={{
          toolName: "searchDocs",
          toolCallId: "tc-1",
          state: "output-available",
          input: { query: "RRSP limits" },
          output: "Found 3 documents...",
        }}
        visible={true}
      />
    );

    expect(screen.getByText("searchDocs")).toBeInTheDocument();
    expect(screen.getByText(/Step:/)).toBeInTheDocument();
  });

  it("should expand to show input and output on click", () => {
    render(
      <ToolInvocationStep
        invocation={{
          toolName: "searchDocs",
          toolCallId: "tc-1",
          state: "output-available",
          input: { query: "RRSP limits" },
          output: "Source 1: RRSP contribution limit is $31,560 for 2024",
        }}
        visible={true}
      />
    );

    const button = screen.getByRole("button");
    fireEvent.click(button);

    expect(screen.getByText(/Input:/)).toBeInTheDocument();
    expect(screen.getByText(/Output:/)).toBeInTheDocument();
    expect(
      screen.getByText(/RRSP contribution limit is \$31,560/)
    ).toBeInTheDocument();
  });

  it("should show args as JSON", () => {
    render(
      <ToolInvocationStep
        invocation={{
          toolName: "searchDocs",
          toolCallId: "tc-1",
          state: "output-available",
          input: { query: "capital gains", year: 2024 },
          output: "Results found",
        }}
        visible={true}
      />
    );

    const button = screen.getByRole("button");
    fireEvent.click(button);

    expect(
      screen.getByText('{"query":"capital gains","year":2024}')
    ).toBeInTheDocument();
  });

  it("should not render when visible is false", () => {
    const { container } = render(
      <ToolInvocationStep
        invocation={{
          toolName: "searchDocs",
          toolCallId: "tc-1",
          state: "output-available",
          input: { query: "test" },
          output: "result",
        }}
        visible={false}
      />
    );

    expect(container.innerHTML).toBe("");
  });

  it("should toggle collapse state", () => {
    render(
      <ToolInvocationStep
        invocation={{
          toolName: "searchDocs",
          toolCallId: "tc-1",
          state: "output-available",
          input: { query: "test" },
          output: "result",
        }}
        visible={true}
      />
    );

    const button = screen.getByRole("button");

    // Click to expand
    fireEvent.click(button);
    expect(screen.getByText(/Input:/)).toBeVisible();

    // Click again to collapse
    fireEvent.click(button);
    const contentDiv = screen.getByText(/Input:/).closest("div")?.parentElement;
    expect(contentDiv).toHaveClass("max-h-[0px]");
  });
});
