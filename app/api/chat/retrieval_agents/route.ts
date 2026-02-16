import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { zodSchema } from "ai";
import { searchAllCollections, type QdrantPayload } from "@/lib/qdrant";
import {
  openai,
  streamText,
  generateText,
  tool,
  convertToModelMessages,
  stepCountIs,
} from "@/lib/langsmith";
import { readFileSync } from "fs";
import { join } from "path";
import { createClient } from "@/lib/supabase/server";
import { SupabaseClient } from "@supabase/supabase-js";
import {
  getConversationMessages,
  getConversationData,
  addMessageToConversation,
  hydrateFromMessages,
  hasConversation,
  summarizeAndTrimMessages,
  ChatMessage,
} from "@/lib/memory/conversationMemory";
import {
  GUEST_SESSION_KEY,
  MAX_MEMORY_MESSAGES,
  MESSAGES_TO_KEEP,
  SUMMARIZATION_THRESHOLD,
} from "@/lib/memory/memoryCache";

export const runtime = "nodejs";

// Load system prompt from XML file
const systemPromptPath = join(process.cwd(), "app/api/chat/retrieval_agents/system-prompt.xml");
const systemPromptXml = readFileSync(systemPromptPath, "utf-8");
const AGENT_SYSTEM_PROMPT = systemPromptXml
  .replace(/<system-prompt>\n?/, "")
  .replace(/\n?<\/system-prompt>/, "")
  .trim();

interface ApiChatMessage {
  role: string;
  content: string;
  parts?: Array<{ type: "text"; text: string }>;
}

type NormalizedMessage = {
  role: "system" | "user" | "assistant";
  parts: Array<{ type: "text"; text: string }>;
};

interface ChatRequestBody {
  messages?: ApiChatMessage[];
  conversation_id?: string;
  show_intermediate_steps?: boolean;
}

/**
 * Generates a short, relevant conversation title using GPT-4-mini.
 * Designed to be lightweight and cost-effective.
 */
async function generateConversationTitle(firstMessage: string): Promise<string> {
  try {
    const result = await generateText({
      model: openai("gpt-4o-mini"),
      messages: [
        {
          role: "user",
          content: `Generate a very short title (max 5 words) for a conversation that starts with this message. Return ONLY the title, no quotes or punctuation at the end.

Message: "${firstMessage.substring(0, 200)}"`,
        },
      ],
      temperature: 0.1,
    });

    // Clean up the title (remove quotes, trim, limit length)
    let title = result.text.trim().replace(/^["']|["']$/g, "");
    if (title.length > 50) {
      title = title.substring(0, 47) + "...";
    }
    return title || firstMessage.substring(0, 50);
  } catch (err) {
    console.error("[TITLE] Failed to generate title:", err);
    // Fallback to truncated message
    return firstMessage.substring(0, 50) + (firstMessage.length > 50 ? "..." : "");
  }
}

/**
 * Updates conversation title in Supabase (fire-and-forget).
 */
async function updateConversationTitle(
  supabase: SupabaseClient,
  conversationId: string,
  title: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from("conversations")
      .update({ title })
      .eq("id", conversationId);

    if (error) {
      console.error("[TITLE] Failed to update title:", error.message);
    } else {
      console.log(`[TITLE] Updated conversation ${conversationId}: "${title}"`);
    }
  } catch (err) {
    console.error("[TITLE] Unexpected error updating title:", err);
  }
}

// Persist a message to Supabase (fire-and-forget, logs errors but doesn't throw)
async function persistMessage(
  supabase: SupabaseClient,
  conversationId: string,
  role: "user" | "assistant",
  content: string
): Promise<void> {
  try {
    const { error: msgError } = await supabase
      .from("messages")
      .insert({ conversation_id: conversationId, role, content });

    if (msgError) {
      console.error("[PERSIST] Failed to save message:", msgError.message);
      return;
    }

    // Update conversation's updated_at timestamp
    const { error: updateError } = await supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);

    if (updateError) {
      console.error("[PERSIST] Failed to update conversation timestamp:", updateError.message);
    }
  } catch (err) {
    console.error("[PERSIST] Unexpected error:", err);
  }
}

function normalizeMessages(messages: ApiChatMessage[]): NormalizedMessage[] {
  return messages.map((m) => ({
    role: m.role as NormalizedMessage["role"],
    parts: m.parts ?? [{ type: "text", text: m.content }],
  }));
}


/**
 * Gets the memory key for a conversation.
 * Uses conversation_id for authenticated users, guest key for others.
 */
function getMemoryKey(conversationId: string | undefined, isAuthenticated: boolean): string {
  return isAuthenticated && conversationId ? conversationId : GUEST_SESSION_KEY;
}

/**
 * Ensures memory is hydrated from Supabase for authenticated users.
 */
async function ensureMemoryHydrated(
  memoryKey: string,
  isAuthenticated: boolean,
  supabase: SupabaseClient
): Promise<void> {
  // Skip hydration for guests or if already hydrated
  if (!isAuthenticated || memoryKey === GUEST_SESSION_KEY) return;
  if (await hasConversation(memoryKey)) return;

  try {
    const { data: messages, error } = await supabase
      .from("messages")
      .select("role, content")
      .eq("conversation_id", memoryKey)
      .order("created_at", { ascending: true });

    if (!error && messages?.length) {
      await hydrateFromMessages(memoryKey, messages);
      console.log(`[MEMORY] Hydrated ${messages.length} messages for ${memoryKey}`);
    }
  } catch (err) {
    console.error("[MEMORY] Hydration failed:", err);
  }
}

/**
 * Creates a summarizer function that uses OpenAI to summarize conversation messages.
 */
async function createConversationSummary(
  messages: ChatMessage[],
  existingSummary?: string
): Promise<string> {
  // Format messages for summarization
  const messagesText = messages
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n\n");

  let summaryPrompt: string;
  if (existingSummary) {
    summaryPrompt = `This is a summary of the conversation to date:
${existingSummary}

Here are new messages from the conversation:
${messagesText}

Extend the summary by incorporating the new messages above. Keep the summary concise but capture key topics, questions asked, and important information shared.`;
  } else {
    summaryPrompt = `Here is a conversation between a user and an assistant:
${messagesText}

Create a concise summary of this conversation. Capture key topics discussed, questions asked, and important information shared.`;
  }

  try {
    const result = await generateText({
      model: openai("gpt-4o-mini"),
      messages: [{ role: "user", content: summaryPrompt }],
      temperature: 0.3,
    });

    return result.text;
  } catch (err) {
    console.error("[SUMMARY] Failed to generate summary:", err);
    // Return existing summary or empty string on failure
    return existingSummary ?? "";
  }
}

/**
 * Checks if summarization is needed and performs it.
 */
async function checkAndSummarize(memoryKey: string): Promise<void> {
  const messages = await getConversationMessages(memoryKey);

  if (messages.length > SUMMARIZATION_THRESHOLD) {
    console.log(`[MEMORY] Messages (${messages.length}) exceed threshold (${SUMMARIZATION_THRESHOLD}), summarizing...`);
    await summarizeAndTrimMessages(memoryKey, createConversationSummary, MESSAGES_TO_KEEP);
  }
}

// Define the search tool input schema
const searchInputSchema = z.object({
  query: z.string().describe(
    "Primary search query for Canadian tax documents. Be specific and natural. Describe what the user is looking for."
  ),
  keywords: z
    .array(z.string())
    .optional()
    .describe(
      "Additional terms to boost relevance: tax years (e.g., '2024'), taxpayer types (individual, corporation, trust, partnership), source types (CRA, ITA, ETA), section numbers, defined terms, or case references."
    ),
});

// Search tool that queries all 7 Qdrant collections concurrently
const searchDocsTool = tool({
  description: "Search the Canadian tax document database across all source collections",
  inputSchema: zodSchema(searchInputSchema),
  execute: async ({ query, keywords }) => {
    const queryParts = [query];
    if (keywords?.length) queryParts.push(...keywords);
    const searchQuery = queryParts.join(" ");

    console.log("[RETRIEVAL] Query:", searchQuery);
    console.log("[RETRIEVAL] Keywords:", keywords ?? "none");

    const results = await searchAllCollections(searchQuery, 3);

    console.log("[RETRIEVAL] Results count:", results.length);
    results.forEach((result, i) => {
      console.log(`[RETRIEVAL] Result ${i + 1}:`, {
        score: result.score,
        source: result.collectionSource,
        title: result.payload?.title || "Untitled",
        url: result.payload?.url || "no URL",
        contentPreview: result.payload?.chunk_text?.substring(0, 150) + "...",
      });
    });

    const formatted = results.map((result, i) => {
      const { payload, collectionSource } = result;
      const title = payload?.title || "Untitled";
      const url = payload?.url || null;
      const chunkInfo = payload?.chunk_index !== undefined
        ? `(chunk ${payload.chunk_index + 1}/${payload.total_chunks})`
        : "";
      const sourceTag = `[Source: ${collectionSource}]`;
      const header = url
        ? `${sourceTag} [${title}](${url}) ${chunkInfo}`
        : `${sourceTag} ${title} ${chunkInfo}`;
      return `### Source ${i + 1}: ${header}\n${payload?.chunk_text || ""}`;
    }).join("\n\n---\n\n");

    return `[Query: ${searchQuery}]\n\n${formatted}`;
  },
});

export async function POST(req: NextRequest) {
  try {
    const body: ChatRequestBody = await req.json();
    const returnIntermediateSteps = body.show_intermediate_steps;
    let conversationId = body.conversation_id;

    // Authenticate user (optional - guests can still use chat)
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const isAuthenticated = !!user;

    // Filter out system messages (intermediate steps displayed in UI)
    const filteredMessages = (body.messages ?? []).filter(
      (message: ApiChatMessage) =>
        message.role === "user" || message.role === "assistant"
    );

    // Get the latest user message for persistence
    const latestUserMessage = [...filteredMessages]
      .reverse()
      .find((m) => m.role === "user");
    const userMessageContent = latestUserMessage?.content ?? "";

    // For authenticated users: handle conversation persistence
    if (isAuthenticated && user) {
      // Create new conversation if none provided
      if (!conversationId) {
        // Use truncated message as temporary title (shown immediately)
        const tempTitle = userMessageContent.substring(0, 50) + (userMessageContent.length > 50 ? "..." : "");
        const { data: newConv, error: convError } = await supabase
          .from("conversations")
          .insert({ user_id: user.id, title: tempTitle || null })
          .select("id")
          .single();

        if (convError) {
          console.error("[PERSIST] Failed to create conversation:", convError.message);
        } else {
          conversationId = newConv.id;

          // Generate AI title asynchronously (fire-and-forget)
          // This updates the title in the background without blocking the response
          generateConversationTitle(userMessageContent).then((aiTitle) => {
            updateConversationTitle(supabase, newConv.id, aiTitle);
          });
        }
      }

      // Save user message (fire-and-forget)
      if (conversationId && userMessageContent) {
        persistMessage(supabase, conversationId, "user", userMessageContent);
      }
    }

    // Get memory key and ensure hydration from Supabase
    const memoryKey = getMemoryKey(conversationId, isAuthenticated);
    await ensureMemoryHydrated(memoryKey, isAuthenticated, supabase);

    // Get conversation data including summary and messages
    const conversationData = await getConversationData(memoryKey);
    const historyMessages = conversationData.messages;
    const conversationSummary = conversationData.summary;
    const recentHistory = historyMessages.slice(-MAX_MEMORY_MESSAGES);

    // Combine history with current messages, avoiding duplicates
    // Only prepend history if current messages don't already include it
    const currentMessagesSet = new Set(
      filteredMessages.map((m) => `${m.role}:${m.content}`)
    );
    const uniqueHistory = recentHistory.filter(
      (m) => !currentMessagesSet.has(`${m.role}:${m.content}`)
    );

    // Merge: history first, then current messages
    const combinedMessages: ApiChatMessage[] = [
      ...uniqueHistory.map((m) => ({ role: m.role, content: m.content })),
      ...filteredMessages,
    ];

    // Normalize messages to UIMessage format before conversion
    const normalizedMessages = normalizeMessages(combinedMessages);

    // Prepend conversation summary as a system message if available
    // This provides context from earlier conversation without modifying the main system prompt
    const messagesWithSummary: NormalizedMessage[] = conversationSummary
      ? [
          {
            role: "system" as const,
            parts: [{ type: "text" as const, text: `Summary of earlier conversation:\n${conversationSummary}` }],
          },
          ...normalizedMessages,
        ]
      : normalizedMessages;

    const messages = await convertToModelMessages(messagesWithSummary);

    // Prepare response headers with conversation ID
    const responseHeaders: HeadersInit = {};
    if (conversationId) {
      responseHeaders["X-Conversation-ID"] = conversationId;
    }

    if (!returnIntermediateSteps) {
      // Stream response with tool calling
      const result = streamText({
        model: openai("gpt-4o"),
        system: AGENT_SYSTEM_PROMPT,
        messages,
        tools: { searchDocs: searchDocsTool },
        stopWhen: stepCountIs(5),
        temperature: 0.2,
        onFinish: async ({ text }) => {
          // Save to memory (always, for context continuity)
          if (userMessageContent && text) {
            await addMessageToConversation(memoryKey, "user", userMessageContent);
            await addMessageToConversation(memoryKey, "assistant", text);
            // Check if summarization is needed after adding messages
            await checkAndSummarize(memoryKey);
          }
          // Save assistant response to Supabase for authenticated users
          if (isAuthenticated && conversationId && text) {
            await persistMessage(supabase, conversationId, "assistant", text);
          }
        },
      });

      return result.toTextStreamResponse({ headers: responseHeaders });
    } else {
      // Return intermediate steps for debugging/display
      const result = streamText({
        model: openai("gpt-4o"),
        system: AGENT_SYSTEM_PROMPT,
        messages,
        tools: { searchDocs: searchDocsTool },
        stopWhen: stepCountIs(5),
        temperature: 0.2,
      });

      // Collect all steps
      const allSteps: Array<{
        role: string;
        content: string;
        tool_calls?: Array<{ name: string; args: unknown }>;
      }> = [];

      for await (const part of result.fullStream) {
        if (part.type === "tool-call") {
          allSteps.push({
            role: "assistant",
            content: "",
            tool_calls: [{ name: part.toolName, args: part.input }],
          });
        } else if (part.type === "tool-result") {
          allSteps.push({
            role: "tool",
            content:
              typeof part.output === "string"
                ? part.output
                : JSON.stringify(part.output),
          });
        } else if (part.type === "text-delta") {
          // Accumulate text in the last assistant message or create new one
          const lastStep = allSteps[allSteps.length - 1];
          if (lastStep && lastStep.role === "assistant" && !lastStep.tool_calls) {
            lastStep.content += part.text;
          } else {
            allSteps.push({
              role: "assistant",
              content: part.text,
            });
          }
        }
      }

      // Extract final assistant response for persistence
      const finalAssistantContent = allSteps
        .filter((s) => s.role === "assistant" && !s.tool_calls && s.content)
        .map((s) => s.content)
        .join("");

      // Save to memory (always, for context continuity)
      if (userMessageContent && finalAssistantContent) {
        await addMessageToConversation(memoryKey, "user", userMessageContent);
        await addMessageToConversation(memoryKey, "assistant", finalAssistantContent);
        // Check if summarization is needed after adding messages
        await checkAndSummarize(memoryKey);
      }
      // Save assistant response to Supabase for authenticated users
      if (isAuthenticated && conversationId && finalAssistantContent) {
        persistMessage(supabase, conversationId, "assistant", finalAssistantContent);
      }

      return NextResponse.json(
        { messages: allSteps, conversation_id: conversationId },
        { status: 200, headers: responseHeaders }
      );
    }
  } catch (e: unknown) {
    const error = e as { message?: string; status?: number };
    return NextResponse.json(
      { error: error.message ?? "Unknown error" },
      { status: error.status ?? 500 }
    );
  }
}
