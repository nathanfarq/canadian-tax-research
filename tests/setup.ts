import "@testing-library/jest-dom";
import { beforeAll, afterAll, afterEach, beforeEach, vi } from "vitest";
import { server } from "./mocks/server";
import {
  createMockSupabaseClient,
  resetMockState,
} from "./mocks/supabase";

// Polyfill ResizeObserver for jsdom (needed by Radix UI)
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Start MSW server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

// Reset handlers and mock state after each test
afterEach(() => {
  server.resetHandlers();
  resetMockState();
});

// Close server after all tests
afterAll(() => server.close());

// Mock environment variables
vi.stubEnv("QDRANT_URL", "http://localhost:6333");
vi.stubEnv("QDRANT_API_KEY", "test-api-key");
vi.stubEnv("OPENAI_API_KEY", "test-openai-key");
vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");

// Mock next/navigation
const mockRouterPush = vi.fn();
const mockRouterReplace = vi.fn();
const mockRouterBack = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockRouterPush,
    replace: mockRouterReplace,
    back: mockRouterBack,
  }),
  useSearchParams: () => new URLSearchParams(),
}));

// Export router mocks for use in tests
export { mockRouterPush, mockRouterReplace, mockRouterBack };

// Reset router mocks before each test
beforeEach(() => {
  mockRouterPush.mockClear();
  mockRouterReplace.mockClear();
  mockRouterBack.mockClear();
});

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

// Mock Supabase browser client
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => createMockSupabaseClient(),
}));

// Mock Supabase SSR packages (for module imports)
vi.mock("@supabase/ssr", () => ({
  createBrowserClient: () => createMockSupabaseClient(),
  createServerClient: () => createMockSupabaseClient(),
}));
