import { vi } from "vitest";
import type { User, AuthChangeEvent, Session } from "@supabase/supabase-js";

// ============================================================================
// Mock Data
// ============================================================================

export const mockUser: User = {
  id: "user-123",
  email: "test@example.com",
  aud: "authenticated",
  role: "authenticated",
  email_confirmed_at: "2024-01-01T00:00:00Z",
  phone: undefined,
  confirmed_at: "2024-01-01T00:00:00Z",
  last_sign_in_at: "2024-01-01T00:00:00Z",
  app_metadata: {},
  user_metadata: {},
  identities: [],
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  is_anonymous: false,
};

export const mockGuestUser: User = {
  ...mockUser,
  id: "guest-456",
  email: "anonymous@example.com",
  is_anonymous: true,
};

export const mockSession: Session = {
  access_token: "mock-access-token",
  token_type: "bearer",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  refresh_token: "mock-refresh-token",
  user: mockUser,
};

export interface MockConversation {
  id: string;
  user_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export const mockConversation: MockConversation = {
  id: "conv-123",
  user_id: mockUser.id,
  title: "Test Conversation",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

export const mockConversation2: MockConversation = {
  id: "conv-456",
  user_id: mockUser.id,
  title: "Another Conversation",
  created_at: "2024-01-02T00:00:00Z",
  updated_at: "2024-01-02T00:00:00Z",
};

export const mockMessages = [
  {
    id: "msg-1",
    conversation_id: mockConversation.id,
    role: "user" as const,
    content: "Hello, I have a tax question",
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "msg-2",
    conversation_id: mockConversation.id,
    role: "assistant" as const,
    content: "I'd be happy to help with your tax question!",
    created_at: "2024-01-01T00:00:01Z",
  },
];

// ============================================================================
// Mock State
// ============================================================================

interface MockSupabaseState {
  user: User | null;
  session: Session | null;
  conversations: MockConversation[];
  messages: typeof mockMessages;
  authError: Error | null;
}

export const mockState: MockSupabaseState = {
  user: null,
  session: null,
  conversations: [],
  messages: [],
  authError: null,
};

// Reset state to defaults
export function resetMockState() {
  mockState.user = null;
  mockState.session = null;
  mockState.conversations = [];
  mockState.messages = [];
  mockState.authError = null;
}

// Set authenticated user
export function setMockUser(user: User | null, session?: Session | null) {
  mockState.user = user;
  mockState.session = session ?? (user ? { ...mockSession, user } : null);
}

// Set conversations
export function setMockConversations(conversations: MockConversation[]) {
  mockState.conversations = conversations;
}

// Set messages
export function setMockMessages(messages: typeof mockMessages) {
  mockState.messages = messages;
}

// Set auth error
export function setMockAuthError(error: Error | null) {
  mockState.authError = error;
}

// ============================================================================
// Auth State Change Listeners
// ============================================================================

type AuthStateChangeCallback = (
  event: AuthChangeEvent,
  session: Session | null
) => void;

const authStateChangeListeners = new Set<AuthStateChangeCallback>();

export function triggerAuthStateChange(
  event: AuthChangeEvent,
  session: Session | null
) {
  authStateChangeListeners.forEach((callback) => callback(event, session));
}

// ============================================================================
// Chainable Query Builder
// ============================================================================

interface QueryResult<T> {
  data: T | null;
  error: Error | null;
}

function createQueryBuilder<T>(tableName: string, initialData: T[]) {
  let data: T[] = [...initialData];
  let selectedFields: string[] | null = null;
  let singleResult = false;
  let insertData: Partial<T> | null = null;
  let updateData: Partial<T> | null = null;
  let isDelete = false;

  const builder = {
    select(fields?: string) {
      selectedFields = fields ? fields.split(",").map((f) => f.trim()) : null;
      return builder;
    },
    insert(values: Partial<T> | Partial<T>[]) {
      insertData = Array.isArray(values) ? values[0] : values;
      return builder;
    },
    update(values: Partial<T>) {
      updateData = values;
      return builder;
    },
    delete() {
      isDelete = true;
      return builder;
    },
    eq(column: string, value: unknown) {
      data = data.filter(
        (item) => (item as Record<string, unknown>)[column] === value
      );
      return builder;
    },
    neq(column: string, value: unknown) {
      data = data.filter(
        (item) => (item as Record<string, unknown>)[column] !== value
      );
      return builder;
    },
    order(column: string, options?: { ascending?: boolean }) {
      const ascending = options?.ascending ?? true;
      data = [...data].sort((a, b) => {
        const aVal = (a as Record<string, unknown>)[column] as string | number;
        const bVal = (b as Record<string, unknown>)[column] as string | number;
        if (aVal < bVal) return ascending ? -1 : 1;
        if (aVal > bVal) return ascending ? 1 : -1;
        return 0;
      });
      return builder;
    },
    limit(count: number) {
      data = data.slice(0, count);
      return builder;
    },
    single() {
      singleResult = true;
      return builder;
    },
    maybeSingle() {
      singleResult = true;
      return builder;
    },
    async then<TResult>(
      resolve: (value: QueryResult<T | T[] | null>) => TResult
    ): Promise<TResult> {
      // Handle insert
      if (insertData) {
        const newItem = {
          id: `${tableName}-${Date.now()}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...insertData,
        } as T;

        if (tableName === "conversations") {
          mockState.conversations.push(
            newItem as unknown as MockConversation
          );
        } else if (tableName === "messages") {
          mockState.messages.push(newItem as unknown as (typeof mockMessages)[0]);
        }

        return resolve({
          data: singleResult ? newItem : [newItem],
          error: null,
        });
      }

      // Handle update
      if (updateData) {
        if (data.length === 0) {
          return resolve({ data: null, error: new Error("Not found") });
        }
        const updated = { ...data[0], ...updateData, updated_at: new Date().toISOString() };
        return resolve({ data: singleResult ? updated : [updated], error: null });
      }

      // Handle delete
      if (isDelete) {
        return resolve({ data: null, error: null });
      }

      // Handle select
      if (singleResult) {
        if (data.length === 0) {
          return resolve({ data: null, error: new Error("Not found") });
        }
        return resolve({ data: data[0], error: null });
      }

      return resolve({ data, error: null });
    },
  };

  return builder;
}

// ============================================================================
// Mock Supabase Client Factory
// ============================================================================

export function createMockSupabaseClient() {
  return {
    auth: {
      getUser: vi.fn(async () => {
        if (mockState.authError) {
          return { data: { user: null }, error: mockState.authError };
        }
        return { data: { user: mockState.user }, error: null };
      }),
      getSession: vi.fn(async () => {
        if (mockState.authError) {
          return { data: { session: null }, error: mockState.authError };
        }
        return { data: { session: mockState.session }, error: null };
      }),
      signInWithPassword: vi.fn(
        async ({ email, password }: { email: string; password: string }) => {
          // Add minimal delay to allow tests to observe loading state
          await new Promise((resolve) => setTimeout(resolve, 0));
          if (mockState.authError) {
            return { data: { user: null, session: null }, error: mockState.authError };
          }
          if (email === "test@example.com" && password === "Password123") {
            setMockUser(mockUser);
            triggerAuthStateChange("SIGNED_IN", mockState.session);
            return { data: { user: mockUser, session: mockState.session }, error: null };
          }
          return {
            data: { user: null, session: null },
            error: new Error("Invalid login credentials"),
          };
        }
      ),
      signUp: vi.fn(
        async ({ email, password }: { email: string; password: string }) => {
          if (mockState.authError) {
            return { data: { user: null, session: null }, error: mockState.authError };
          }
          if (email && password) {
            const newUser = { ...mockUser, id: `user-${Date.now()}`, email };
            return { data: { user: newUser, session: null }, error: null };
          }
          return {
            data: { user: null, session: null },
            error: new Error("Invalid email or password"),
          };
        }
      ),
      signOut: vi.fn(async () => {
        setMockUser(null);
        triggerAuthStateChange("SIGNED_OUT", null);
        return { error: null };
      }),
      resetPasswordForEmail: vi.fn(async (email: string) => {
        if (mockState.authError) {
          return { data: null, error: mockState.authError };
        }
        if (email) {
          return { data: {}, error: null };
        }
        return { data: null, error: new Error("Email is required") };
      }),
      updateUser: vi.fn(async (updates: Partial<User>) => {
        if (mockState.authError) {
          return { data: { user: null }, error: mockState.authError };
        }
        if (mockState.user) {
          const updatedUser = { ...mockState.user, ...updates };
          setMockUser(updatedUser);
          return { data: { user: updatedUser }, error: null };
        }
        return { data: { user: null }, error: new Error("Not authenticated") };
      }),
      onAuthStateChange: vi.fn((callback: AuthStateChangeCallback) => {
        authStateChangeListeners.add(callback);
        // Call asynchronously to allow tests to observe loading state
        queueMicrotask(() => {
          callback(
            mockState.session ? "INITIAL_SESSION" : "SIGNED_OUT",
            mockState.session
          );
        });
        return {
          data: {
            subscription: {
              id: "mock-subscription",
              callback,
              unsubscribe: () => {
                authStateChangeListeners.delete(callback);
              },
            },
          },
        };
      }),
      signInAnonymously: vi.fn(async () => {
        if (mockState.authError) {
          return { data: { user: null, session: null }, error: mockState.authError };
        }
        const guestSession = { ...mockSession, user: mockGuestUser };
        setMockUser(mockGuestUser, guestSession);
        triggerAuthStateChange("SIGNED_IN", guestSession);
        return { data: { user: mockGuestUser, session: guestSession }, error: null };
      }),
    },
    from: vi.fn((tableName: string) => {
      switch (tableName) {
        case "conversations":
          return createQueryBuilder(tableName, mockState.conversations);
        case "messages":
          return createQueryBuilder(tableName, mockState.messages);
        default:
          return createQueryBuilder(tableName, []);
      }
    }),
  };
}

// Export a default mock client instance for convenience
export const mockSupabaseClient = createMockSupabaseClient();
