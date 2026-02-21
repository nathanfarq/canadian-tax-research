import { cn } from "@/utils/cn";
import type { UIMessage } from "@ai-sdk/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { Pencil, Check, X } from "lucide-react";
import { Button } from "./ui/button";

// Helper to extract text content from UIMessage parts
function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("");
}

export function ChatMessageBubble(props: {
  message: UIMessage;
  aiEmoji?: string;
  sources: any[];
  onEdit?: (messageId: string, newContent: string) => void;
  isEditable?: boolean;
}) {
  const messageContent = getMessageText(props.message);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(messageContent);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isUserMessage = props.message.role === "user";
  const canEdit = isUserMessage && props.isEditable && props.onEdit;

  // Focus and resize textarea when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [isEditing]);

  const handleStartEdit = () => {
    setEditContent(messageContent);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditContent(messageContent);
    setIsEditing(false);
  };

  const handleSaveEdit = () => {
    if (editContent.trim() && editContent !== messageContent) {
      props.onEdit?.(props.message.id, editContent.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === "Escape") {
      handleCancelEdit();
    }
  };

  return (
    <div
      className={cn(
        `rounded-[24px] max-w-[80%] mb-8 flex group`,
        props.message.role === "user"
          ? "bg-secondary text-secondary-foreground px-4 py-2"
          : null,
        props.message.role === "user" ? "ml-auto" : "mr-auto",
      )}
    >
      {/* Edit button for user messages */}
      {canEdit && !isEditing && (
        <button
          onClick={handleStartEdit}
          className="opacity-0 group-hover:opacity-100 transition-opacity mr-2 self-center p-1 hover:bg-muted rounded"
          title="Edit message"
        >
          <Pencil className="h-4 w-4 text-muted-foreground" />
        </button>
      )}

      {props.message.role !== "user" && (
        <div className="mr-4 -mt-2 w-10 h-10 flex-shrink-0 flex items-center justify-center">
          <Image
            src="/images/20260125-logo2-icon-transparent.png"
            alt="TaxBuddy"
            width={40}
            height={40}
          />
        </div>
      )}

      <div className="flex flex-col flex-1">
        {isEditing ? (
          <div className="flex flex-col gap-2">
            <textarea
              ref={textareaRef}
              value={editContent}
              onChange={(e) => {
                setEditContent(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
              onKeyDown={handleKeyDown}
              className="w-full bg-background border border-input rounded-lg p-2 resize-none outline-none focus:ring-2 focus:ring-ring"
              rows={1}
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelEdit}
                className="h-7 px-2"
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveEdit}
                disabled={!editContent.trim() || editContent === messageContent}
                className="h-7 px-2"
              >
                <Check className="h-4 w-4 mr-1" />
                Save & Submit
              </Button>
            </div>
          </div>
        ) : (
          <div
            className={cn(
              "max-w-none",
              !isUserMessage && "prose prose-sm text-foreground",
            )}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {messageContent}
            </ReactMarkdown>
          </div>
        )}

        {props.sources && props.sources.length ? (
          <>
            <code className="mt-4 mr-auto bg-primary px-2 py-1 rounded">
              <h2>🔍 Sources:</h2>
            </code>
            <code className="mt-1 mr-2 bg-primary px-2 py-1 rounded text-xs">
              {props.sources?.map((source, i) => (
                <div className="mt-2" key={"source:" + i}>
                  {i + 1}. &quot;{source.pageContent}&quot;
                  {source.metadata?.loc?.lines !== undefined ? (
                    <div>
                      <br />
                      Lines {source.metadata?.loc?.lines?.from} to{" "}
                      {source.metadata?.loc?.lines?.to}
                    </div>
                  ) : (
                    ""
                  )}
                </div>
              ))}
            </code>
          </>
        ) : null}
      </div>
    </div>
  );
}
