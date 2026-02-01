import "@testing-library/jest-dom";
import { beforeAll, afterAll, afterEach, vi } from "vitest";
import { server } from "./mocks/server";

// Polyfill ResizeObserver for jsdom (needed by Radix UI)
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Start MSW server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

// Reset handlers after each test
afterEach(() => server.resetHandlers());

// Close server after all tests
afterAll(() => server.close());

// Mock environment variables
vi.stubEnv("QDRANT_URL", "http://localhost:6333");
vi.stubEnv("QDRANT_API_KEY", "test-api-key");
vi.stubEnv("OPENAI_API_KEY", "test-openai-key");

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

// Mock next/image - forward to native img element
vi.mock("next/image", async () => {
  const React = await import("react");
  return {
    default: React.forwardRef(function Image(
      props: React.ImgHTMLAttributes<HTMLImageElement>,
      ref: React.Ref<HTMLImageElement>
    ) {
      // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
      return React.createElement("img", { ...props, ref });
    }),
  };
});

// Mock use-stick-to-bottom
vi.mock("use-stick-to-bottom", () => ({
  StickToBottom: vi.fn().mockImplementation(({ children }) => children),
  useStickToBottomContext: () => ({
    isAtBottom: true,
    scrollToBottom: vi.fn(),
    scrollRef: { current: null },
    contentRef: { current: null },
  }),
}));
