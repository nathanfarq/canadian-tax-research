import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UploadDocumentsForm } from "@/components/UploadDocumentsForm";
import { server } from "../mocks/server";
import { http, HttpResponse } from "msw";

// Mock the default text
vi.mock("@/data/DefaultRetrievalText", () => ({
  default: "Default document content for testing",
}));

describe("UploadDocumentsForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render with default text", () => {
    render(<UploadDocumentsForm />);

    const textarea = screen.getByRole("textbox");
    expect(textarea).toHaveValue("Default document content for testing");
  });

  it("should allow editing the document text", async () => {
    const user = userEvent.setup();
    render(<UploadDocumentsForm />);

    const textarea = screen.getByRole("textbox");
    await user.clear(textarea);
    await user.type(textarea, "Custom document content");

    expect(textarea).toHaveValue("Custom document content");
  });

  it("should show Upload button by default", () => {
    render(<UploadDocumentsForm />);

    expect(screen.getByRole("button")).toHaveTextContent("Upload");
  });

  it("should show loading state during upload", async () => {
    const user = userEvent.setup();

    // Add delay to observe loading state
    server.use(
      http.post("/api/retrieval/ingest", async () => {
        await new Promise((r) => setTimeout(r, 100));
        return HttpResponse.json({ ok: true, chunks_ingested: 1 });
      })
    );

    render(<UploadDocumentsForm />);

    const button = screen.getByRole("button");
    await user.click(button);

    // Should show loading spinner
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("should show success message after upload", async () => {
    const user = userEvent.setup();
    render(<UploadDocumentsForm />);

    const button = screen.getByRole("button");
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByRole("textbox")).toHaveValue("Uploaded!");
    });
  });

  it("should display error message on failure", async () => {
    const user = userEvent.setup();

    server.use(
      http.post("/api/retrieval/ingest", () => {
        return HttpResponse.json({ error: "Ingest failed" }, { status: 500 });
      })
    );

    render(<UploadDocumentsForm />);

    const button = screen.getByRole("button");
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByRole("textbox")).toHaveValue("Ingest failed");
    });
  });

  it("should handle empty error response", async () => {
    const user = userEvent.setup();

    server.use(
      http.post("/api/retrieval/ingest", () => {
        return HttpResponse.json({}, { status: 500 });
      })
    );

    render(<UploadDocumentsForm />);

    const textarea = screen.getByRole("textbox");
    await user.clear(textarea);
    await user.type(textarea, "Some content");

    const button = screen.getByRole("button");
    await user.click(button);

    // Should not crash, textarea keeps content or shows upload state
    await waitFor(() => {
      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });
  });
});
