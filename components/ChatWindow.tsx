"use client";

import { type UIMessage, useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState, useMemo, useEffect, useRef } from "react";
import type { FormEvent, ReactNode } from "react";
import { toast } from "sonner";
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom";

import { ChatMessageBubble } from "@/components/ChatMessageBubble";
import { Button } from "./ui/button";
import { ArrowDown, ChevronDown, LoaderCircle, Paperclip } from "lucide-react";
import { Checkbox } from "./ui/checkbox";
import { UploadDocumentsForm } from "./UploadDocumentsForm";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { cn } from "@/utils/cn";
import { useConversationMessages } from "@/hooks/useConversationMessages";

const SOURCE_FILTERS = [
  { key: "cra",       label: "CRA" },
  { key: "dof",       label: "DoF" },
  { key: "eta",       label: "ETA" },
  { key: "ita",       label: "ITA" },
  { key: "provtax",   label: "Prov Tax" },
  { key: "taxlaw",    label: "Tax Law" },
  { key: "taxcomment", label: "Commentary" },
] as const;

const ALL_SOURCE_KEYS = SOURCE_FILTERS.map((s) => s.key) as string[];

// Helper to create a UIMessage with text content
function createTextMessage(
  id: string,
  role: "user" | "assistant" | "system",
  content: string
): UIMessage {
  return {
    id,
    role,
    parts: [{ type: "text", text: content }],
  };
}

function ChatMessages(props: {
  messages: UIMessage[];
  emptyStateComponent: ReactNode;
  aiEmoji?: string;
  className?: string;
  onEditMessage?: (messageId: string, newContent: string) => void;
  isLoading?: boolean;
  showToolSteps?: boolean;
}) {
  return (
    <div className="flex flex-col max-w-[768px] mx-auto pb-12 w-full">
      {props.messages.map((m, i) => {
        // Only allow editing the last user message and when not loading
        const isLastUserMessage = m.role === "user" &&
          props.messages.slice(i + 1).every(msg => msg.role !== "user");

        return (
          <ChatMessageBubble
            key={m.id}
            message={m}
            aiEmoji={props.aiEmoji}
            onEdit={props.onEditMessage}
            isEditable={isLastUserMessage && !props.isLoading}
            showToolSteps={props.showToolSteps}
          />
        );
      })}
    </div>
  );
}

export function ChatInput(props: {
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onStop?: () => void;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  loading?: boolean;
  placeholder?: string;
  children?: ReactNode;
  className?: string;
  actions?: ReactNode;
  filterRow?: ReactNode;
}) {
  const disabled = props.loading && props.onStop == null;
  return (
    <form
      onSubmit={(e) => {
        e.stopPropagation();
        e.preventDefault();

        if (props.loading) {
          props.onStop?.();
        } else {
          props.onSubmit(e);
        }
      }}
      className={cn("flex w-full flex-col", props.className)}
    >
      <div className="border border-input bg-secondary rounded-lg flex flex-col gap-2 max-w-[768px] w-full mx-auto">
        <textarea
          value={props.value}
          placeholder={props.placeholder}
          onChange={props.onChange}
          rows={1}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = "auto";
            const lineHeight = 24;
            const maxHeight = lineHeight * 5;
            target.style.height = `${Math.min(target.scrollHeight, maxHeight)}px`;
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          className="border-none outline-none bg-transparent p-4 resize-none overflow-y-auto"
          style={{ maxHeight: "120px" }}
        />

        {props.filterRow && (
          <div className="px-3 pb-1">{props.filterRow}</div>
        )}

        <div className="flex justify-between ml-4 mr-2 mb-2">
          <div className="flex gap-3">{props.children}</div>

          <div className="flex gap-2 self-end">
            {props.actions}
            <Button type="submit" className="self-end" disabled={disabled}>
              {props.loading ? (
                <span role="status" className="flex justify-center">
                  <LoaderCircle className="animate-spin" />
                  <span className="sr-only">Loading...</span>
                </span>
              ) : (
                <span>Send</span>
              )}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}

function ScrollToBottom(props: { className?: string }) {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();

  if (isAtBottom) return null;
  return (
    <Button
      variant="outline"
      className={props.className}
      onClick={() => scrollToBottom()}
    >
      <ArrowDown className="w-4 h-4" />
      <span>Scroll to bottom</span>
    </Button>
  );
}

function StickyToBottomContent(props: {
  content: ReactNode;
  footer?: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  const context = useStickToBottomContext();

  // scrollRef will also switch between overflow: unset to overflow: auto
  return (
    <div
      ref={context.scrollRef}
      style={{ width: "100%", height: "100%" }}
      className={cn("grid grid-rows-[1fr,auto]", props.className)}
    >
      <div ref={context.contentRef} className={props.contentClassName}>
        {props.content}
      </div>

      {props.footer}
    </div>
  );
}

export function ChatLayout(props: { content: ReactNode; footer: ReactNode }) {
  return (
    <StickToBottom>
      <StickyToBottomContent
        className="absolute inset-0"
        contentClassName="py-8 px-2"
        content={props.content}
        footer={
          <div className="sticky bottom-0 px-2 pb-8 pt-4 bg-gradient-to-t from-background from-80% to-transparent">
            <ScrollToBottom className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4" />
            {props.footer}
          </div>
        }
      />
    </StickToBottom>
  );
}

export function ChatWindow(props: {
  endpoint: string;
  emptyStateComponent?: ReactNode;
  placeholder?: string;
  emoji?: string;
  showIngestForm?: boolean;
  initialMessage?: string;
  conversationId?: string | null;
  onConversationChange?: (id: string | null) => void;
}) {
  const [showToolSteps, setShowToolSteps] = useState(true);
  const [inputValue, setInputValue] = useState("");

  const [selectedSources, setSelectedSources] = useState<string[]>([...ALL_SOURCE_KEYS]);

  function toggleSource(key: string) {
    setSelectedSources((prev) => {
      if (prev.includes(key)) {
        if (prev.length === 1) return prev; // prevent deselecting last source
        return prev.filter((k) => k !== key);
      }
      return [...prev, key];
    });
  }

  const [sourceDropdownOpen, setSourceDropdownOpen] = useState(false);
  const sourceDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (sourceDropdownRef.current && !sourceDropdownRef.current.contains(e.target as Node)) {
        setSourceDropdownOpen(false);
      }
    }
    if (sourceDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [sourceDropdownOpen]);

  // Track current conversation ID for sending with requests
  const currentConversationIdRef = useRef<string | null>(props.conversationId ?? null);

  // Keep a stable ref to onConversationChange so the transport closure always uses the latest version
  const onConversationChangeRef = useRef(props.onConversationChange);
  useEffect(() => {
    onConversationChangeRef.current = props.onConversationChange;
  }, [props.onConversationChange]);

  // Fetch conversation messages when conversationId changes
  const {
    messages: loadedMessages,
    isLoading: isLoadingConversation,
  } = useConversationMessages(props.conversationId);

  // Create transport for the chat API endpoint with custom fetch to capture headers
  const transport = useMemo(
    () => new DefaultChatTransport({
      api: props.endpoint,
      fetch: async (url, init) => {
        const response = await globalThis.fetch(url, init);
        // Capture conversation ID from response header
        const newConversationId = response.headers.get("X-Conversation-ID");
        if (newConversationId && newConversationId !== currentConversationIdRef.current) {
          currentConversationIdRef.current = newConversationId;
          onConversationChangeRef.current?.(newConversationId);
        }
        return response;
      },
    }),
    [props.endpoint]
  );

  const chat = useChat({
    transport,
    onError: (e) =>
      toast.error(`Error while processing your request`, {
        description: e.message,
      }),
  });

  // Update ref when prop changes
  useEffect(() => {
    currentConversationIdRef.current = props.conversationId ?? null;
  }, [props.conversationId]);

  // Load messages when conversation changes
  useEffect(() => {
    if (props.conversationId && loadedMessages.length > 0) {
      // Convert loaded messages to UIMessage format
      // Cast parts since our persisted tool parts use string type which is compatible at runtime
      const uiMessages = loadedMessages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        parts: msg.parts,
      })) as UIMessage[];
      chat.setMessages(uiMessages);
    } else if (props.conversationId === null) {
      // New chat - clear messages and show welcome
      chat.setMessages([]);
      if (props.initialMessage) {
        chat.setMessages([createTextMessage("initial", "assistant", props.initialMessage)]);
      }
    }
  }, [props.conversationId, loadedMessages]);

  // Set initial message on mount (only for new chats)
  useEffect(() => {
    if (props.initialMessage && chat.messages.length === 0 && !props.conversationId) {
      chat.setMessages([createTextMessage("initial", "assistant", props.initialMessage)]);
    }
  }, []);

  async function sendMessage(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (chat.status === "streaming") return;
    if (!inputValue.trim()) return;

    const text = inputValue;
    setInputValue("");

    await chat.sendMessage(
      { text },
      {
        body: {
          conversation_id: currentConversationIdRef.current,
          selected_sources: selectedSources,
        },
      }
    );
  }

  // Handle editing a message and resubmitting
  async function handleEditMessage(messageId: string, newContent: string) {
    if (chat.status === "streaming") return;

    // Find the message index
    const messageIndex = chat.messages.findIndex((m) => m.id === messageId);
    if (messageIndex === -1) return;

    // Keep only messages before the edited one
    const messagesUpToEdit = chat.messages.slice(0, messageIndex);
    chat.setMessages(messagesUpToEdit);

    // Submit the edited content as a new message
    await chat.sendMessage(
      { text: newContent },
      {
        body: {
          conversation_id: currentConversationIdRef.current,
          selected_sources: selectedSources,
        },
      }
    );
  }

  // Show loading state when fetching conversation
  if (isLoadingConversation && props.conversationId) {
    return (
      <ChatLayout
        content={
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <LoaderCircle className="h-8 w-8 animate-spin" />
              <span>Loading conversation...</span>
            </div>
          </div>
        }
        footer={<div />}
      />
    );
  }

  return (
    <ChatLayout
      content={
        chat.messages.length === 0 ? (
          <div>{props.emptyStateComponent}</div>
        ) : (
          <ChatMessages
            aiEmoji={props.emoji}
            messages={chat.messages}
            emptyStateComponent={props.emptyStateComponent}
            onEditMessage={handleEditMessage}
            isLoading={chat.status === "streaming"}
            showToolSteps={showToolSteps}
          />
        )
      }
      footer={
        <ChatInput
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onSubmit={sendMessage}
          loading={chat.status === "streaming"}
          placeholder={props.placeholder ?? "Type your message here..."}
        >
          {/* Sources dropdown */}
          <div className="relative" ref={sourceDropdownRef}>
            {sourceDropdownOpen && (
              <div className="absolute bottom-full left-0 mb-1 w-48 rounded-md border border-input bg-popover shadow-md py-2 z-10">
                <p className="text-xs font-semibold text-foreground mb-1.5 px-3">Sources</p>

                <label className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-accent cursor-pointer select-none">
                  <Checkbox
                    checked={selectedSources.length === ALL_SOURCE_KEYS.length}
                    onCheckedChange={() => setSelectedSources([...ALL_SOURCE_KEYS])}
                  />
                  <span className="text-sm">Select all</span>
                </label>

                <div className="my-1.5 mx-3 border-t border-border" />

                {SOURCE_FILTERS.map(({ key, label }) => (
                  <label
                    key={key}
                    className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-accent cursor-pointer select-none"
                  >
                    <Checkbox
                      checked={selectedSources.includes(key)}
                      onCheckedChange={() => toggleSource(key)}
                    />
                    <span className="text-sm">{label}</span>
                  </label>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => setSourceDropdownOpen((o) => !o)}
              className={cn(
                "flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border transition-colors",
                selectedSources.length < ALL_SOURCE_KEYS.length
                  ? "border-primary text-primary"
                  : "border-input text-muted-foreground hover:border-primary"
              )}
            >
              <span>Sources</span>
              {selectedSources.length < ALL_SOURCE_KEYS.length && (
                <span className="bg-primary text-primary-foreground rounded-full px-1.5 text-[10px] font-medium leading-4">
                  {selectedSources.length}
                </span>
              )}
              <ChevronDown className={cn("size-3 transition-transform", sourceDropdownOpen && "rotate-180")} />
            </button>
          </div>

          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <Checkbox
              id="show_tool_steps"
              name="show_tool_steps"
              checked={showToolSteps}
              onCheckedChange={(e) => setShowToolSteps(!!e)}
            />
            <span className="text-xs text-muted-foreground">Show steps</span>
          </label>

          {props.showIngestForm && (
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  className="pl-2 pr-3 -ml-2"
                  disabled={chat.messages.length !== 0}
                >
                  <Paperclip className="size-4" />
                  <span>Upload document</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload document</DialogTitle>
                  <DialogDescription>
                    Upload a document to use for the chat.
                  </DialogDescription>
                </DialogHeader>
                <UploadDocumentsForm />
              </DialogContent>
            </Dialog>
          )}
        </ChatInput>
      }
    />
  );
}
