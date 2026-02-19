"use client";

import { type UIMessage, useChat } from "@ai-sdk/react";
import { TextStreamChatTransport } from "ai";
import { useState, useMemo, useEffect, useRef } from "react";
import type { FormEvent, ReactNode } from "react";
import { toast } from "sonner";
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom";

import { ChatMessageBubble } from "@/components/ChatMessageBubble";
import { IntermediateStep } from "./IntermediateStep";
import { Button } from "./ui/button";
import { ArrowDown, LoaderCircle, Paperclip } from "lucide-react";
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
  { key: "fedbudget", label: "Fed Budget" },
  { key: "ita",       label: "ITA" },
  { key: "provtax",   label: "Prov Tax" },
  { key: "taxlaw",    label: "Tax Law" },
] as const;

const ALL_SOURCE_KEYS = SOURCE_FILTERS.map((s) => s.key) as string[];

// Helper to extract text content from UIMessage parts
function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("");
}

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
  sourcesForMessages: Record<string, any>;
  aiEmoji?: string;
  className?: string;
  onEditMessage?: (messageId: string, newContent: string) => void;
  isLoading?: boolean;
}) {
  return (
    <div className="flex flex-col max-w-[768px] mx-auto pb-12 w-full">
      {props.messages.map((m, i) => {
        if (m.role === "system") {
          return <IntermediateStep key={m.id} message={m} />;
        }

        const sourceKey = (props.messages.length - 1 - i).toString();
        // Only allow editing the last user message and when not loading
        const isLastUserMessage = m.role === "user" &&
          props.messages.slice(i + 1).every(msg => msg.role !== "user");

        return (
          <ChatMessageBubble
            key={m.id}
            message={m}
            aiEmoji={props.aiEmoji}
            sources={props.sourcesForMessages[sourceKey]}
            onEdit={props.onEditMessage}
            isEditable={isLastUserMessage && !props.isLoading}
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
  showIntermediateStepsToggle?: boolean;
  initialMessage?: string;
  conversationId?: string | null;
  onConversationChange?: (id: string | null) => void;
}) {
  const [showIntermediateSteps, setShowIntermediateSteps] = useState(
    !!props.showIntermediateStepsToggle,
  );
  const [intermediateStepsLoading, setIntermediateStepsLoading] =
    useState(false);

  const [sourcesForMessages, setSourcesForMessages] = useState<
    Record<string, any>
  >({});

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

  // Track current conversation ID for sending with requests
  const currentConversationIdRef = useRef<string | null>(props.conversationId ?? null);

  // Fetch conversation messages when conversationId changes
  const {
    messages: loadedMessages,
    isLoading: isLoadingConversation,
  } = useConversationMessages(props.conversationId);

  // Create transport for the chat API endpoint
  const transport = useMemo(
    () => new TextStreamChatTransport({ api: props.endpoint }),
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
      const uiMessages: UIMessage[] = loadedMessages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        parts: msg.parts,
      }));
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

  // Helper to handle conversation ID from response
  function handleConversationIdFromResponse(response: Response) {
    const newConversationId = response.headers.get("X-Conversation-ID");
    if (newConversationId && newConversationId !== currentConversationIdRef.current) {
      currentConversationIdRef.current = newConversationId;
      props.onConversationChange?.(newConversationId);
    }
  }

  async function sendMessage(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (chat.status === "streaming" || intermediateStepsLoading) return;

    if (!showIntermediateSteps) {
      // For streaming mode, we need to intercept the response to get the conversation ID
      // The useChat hook handles streaming, but we need the header
      const messagesForApi = [...chat.messages, createTextMessage("temp", "user", inputValue)].map((m) => ({
        role: m.role,
        content: getMessageText(m),
      }));

      // Make a preflight-style request to get conversation ID, then let useChat handle streaming
      // Actually, we need to modify the transport or use fetch directly
      // For now, send via fetch to capture headers, then update chat state
      const response = await fetch(props.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messagesForApi,
          conversation_id: currentConversationIdRef.current,
          selected_sources: selectedSources,
        }),
      });

      handleConversationIdFromResponse(response);

      if (!response.ok) {
        const json = await response.json();
        toast.error(`Error while processing your request`, { description: json.error });
        return;
      }

      // Read the stream and update messages
      const reader = response.body?.getReader();
      if (!reader) return;

      const userMessage = createTextMessage(chat.messages.length.toString(), "user", inputValue);
      const newMessages = [...chat.messages, userMessage];
      chat.setMessages(newMessages);
      setInputValue("");

      let assistantContent = "";
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        assistantContent += chunk;

        // Update assistant message in real-time
        chat.setMessages([
          ...newMessages,
          createTextMessage((newMessages.length).toString(), "assistant", assistantContent),
        ]);
      }

      return;
    }

    // Some extra work to show intermediate steps properly
    setIntermediateStepsLoading(true);

    const userMessage = createTextMessage(
      chat.messages.length.toString(),
      "user",
      inputValue
    );
    setInputValue("");
    const messagesWithUserReply = [...chat.messages, userMessage];
    chat.setMessages(messagesWithUserReply);

    // Convert UIMessages to a simpler format for the API
    const apiMessages = messagesWithUserReply.map((m) => ({
      role: m.role,
      content: getMessageText(m),
    }));

    const response = await fetch(props.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: apiMessages,
        conversation_id: currentConversationIdRef.current,
        show_intermediate_steps: true,
        selected_sources: selectedSources,
      }),
    });

    handleConversationIdFromResponse(response);

    const json = await response.json();
    setIntermediateStepsLoading(false);

    if (!response.ok) {
      toast.error(`Error while processing your request`, {
        description: json.error,
      });
      return;
    }

    // Response messages from LangChain API (not UIMessage format)
    interface LangChainMessage {
      role: string;
      content: string;
      tool_calls?: Array<{ name: string; args: unknown }>;
    }
    const responseMessages: LangChainMessage[] = json.messages;

    // Represent intermediate steps as system messages for display purposes
    // Explicitly pair assistant tool calls with their tool responses
    const intermediateStepMessages: UIMessage[] = [];
    let stepIndex = 0;

    for (let i = 0; i < responseMessages.length; i++) {
      const message = responseMessages[i];

      // Find assistant messages with tool calls
      if (message.role === "assistant" && message.tool_calls?.length) {
        // Look for the next tool message as the response
        const toolMessage = responseMessages[i + 1];

        if (toolMessage?.role === "tool") {
          intermediateStepMessages.push(
            createTextMessage(
              (messagesWithUserReply.length + stepIndex).toString(),
              "system",
              JSON.stringify({
                action: message.tool_calls[0],
                observation: toolMessage.content,
              })
            )
          );
          stepIndex++;
        }
      }
    }
    const newMessages = [...messagesWithUserReply];
    for (const message of intermediateStepMessages) {
      newMessages.push(message);
      chat.setMessages([...newMessages]);
      await new Promise((resolve) =>
        setTimeout(resolve, 1000 + Math.random() * 1000),
      );
    }

    const lastResponseContent =
      responseMessages[responseMessages.length - 1]?.content ?? "";
    chat.setMessages([
      ...newMessages,
      createTextMessage(newMessages.length.toString(), "assistant", lastResponseContent),
    ]);
  }

  // Handle editing a message and resubmitting
  async function handleEditMessage(messageId: string, newContent: string) {
    if (chat.status === "streaming" || intermediateStepsLoading) return;

    // Find the message index
    const messageIndex = chat.messages.findIndex((m) => m.id === messageId);
    if (messageIndex === -1) return;

    // Create updated message
    const updatedMessage = createTextMessage(messageId, "user", newContent);

    // Keep only messages up to and including the edited message
    const messagesUpToEdit = chat.messages.slice(0, messageIndex);
    const newMessages = [...messagesUpToEdit, updatedMessage];

    // Update messages in the UI immediately
    chat.setMessages(newMessages);

    // Prepare messages for API
    const messagesForApi = newMessages.map((m) => ({
      role: m.role,
      content: getMessageText(m),
    }));

    // Send to API and get response
    if (!showIntermediateSteps) {
      const response = await fetch(props.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messagesForApi,
          conversation_id: currentConversationIdRef.current,
          selected_sources: selectedSources,
        }),
      });

      handleConversationIdFromResponse(response);

      if (!response.ok) {
        const json = await response.json();
        toast.error(`Error while processing your request`, { description: json.error });
        return;
      }

      // Read the stream and update messages
      const reader = response.body?.getReader();
      if (!reader) return;

      let assistantContent = "";
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        assistantContent += chunk;

        // Update assistant message in real-time
        chat.setMessages([
          ...newMessages,
          createTextMessage((newMessages.length).toString(), "assistant", assistantContent),
        ]);
      }
    } else {
      // Handle intermediate steps mode
      setIntermediateStepsLoading(true);

      const response = await fetch(props.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messagesForApi,
          conversation_id: currentConversationIdRef.current,
          show_intermediate_steps: true,
          selected_sources: selectedSources,
        }),
      });

      handleConversationIdFromResponse(response);

      const json = await response.json();
      setIntermediateStepsLoading(false);

      if (!response.ok) {
        toast.error(`Error while processing your request`, {
          description: json.error,
        });
        return;
      }

      interface LangChainMessage {
        role: string;
        content: string;
        tool_calls?: Array<{ name: string; args: unknown }>;
      }
      const responseMessages: LangChainMessage[] = json.messages;

      const intermediateStepMessages: UIMessage[] = [];
      let stepIndex = 0;

      for (let i = 0; i < responseMessages.length; i++) {
        const message = responseMessages[i];

        if (message.role === "assistant" && message.tool_calls?.length) {
          const toolMessage = responseMessages[i + 1];

          if (toolMessage?.role === "tool") {
            intermediateStepMessages.push(
              createTextMessage(
                (newMessages.length + stepIndex).toString(),
                "system",
                JSON.stringify({
                  action: message.tool_calls[0],
                  observation: toolMessage.content,
                })
              )
            );
            stepIndex++;
          }
        }
      }

      const messagesWithSteps = [...newMessages];
      for (const message of intermediateStepMessages) {
        messagesWithSteps.push(message);
        chat.setMessages([...messagesWithSteps]);
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 + Math.random() * 1000)
        );
      }

      const lastResponseContent =
        responseMessages[responseMessages.length - 1]?.content ?? "";
      chat.setMessages([
        ...messagesWithSteps,
        createTextMessage(messagesWithSteps.length.toString(), "assistant", lastResponseContent),
      ]);
    }
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
            sourcesForMessages={sourcesForMessages}
            onEditMessage={handleEditMessage}
            isLoading={chat.status === "streaming" || intermediateStepsLoading}
          />
        )
      }
      footer={
        <ChatInput
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onSubmit={sendMessage}
          loading={chat.status === "streaming" || intermediateStepsLoading}
          placeholder={props.placeholder ?? "Type your message here..."}
          filterRow={
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setSelectedSources([...ALL_SOURCE_KEYS])}
                className={cn(
                  "text-xs px-2 py-0.5 rounded-full border transition-colors",
                  selectedSources.length === ALL_SOURCE_KEYS.length
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-transparent text-muted-foreground border-input hover:border-primary"
                )}
              >
                All
              </button>
              {SOURCE_FILTERS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleSource(key)}
                  className={cn(
                    "text-xs px-2 py-0.5 rounded-full border transition-colors",
                    selectedSources.includes(key)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-transparent text-muted-foreground border-input hover:border-primary"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          }
        >
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

          {props.showIntermediateStepsToggle && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="show_intermediate_steps"
                name="show_intermediate_steps"
                checked={showIntermediateSteps}
                disabled={chat.status === "streaming" || intermediateStepsLoading}
                onCheckedChange={(e) => setShowIntermediateSteps(!!e)}
              />
              <label htmlFor="show_intermediate_steps" className="text-sm">
                Show steps
              </label>
            </div>
          )}
        </ChatInput>
      }
    />
  );
}
