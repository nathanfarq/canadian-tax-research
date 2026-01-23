import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { zodSchema } from "ai";
import { QdrantVectorStore } from "@langchain/qdrant";
import { OpenAIEmbeddings } from "@langchain/openai";
import {
  openai,
  streamText,
  tool,
  convertToModelMessages,
  stepCountIs,
} from "@/lib/langsmith";
import { readFileSync } from "fs";
import { join } from "path";

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

function normalizeMessages(messages: ApiChatMessage[]): NormalizedMessage[] {
  return messages.map((m) => ({
    role: m.role as NormalizedMessage["role"],
    parts: m.parts ?? [{ type: "text", text: m.content }],
  }));
}

async function getVectorStore() {
  return QdrantVectorStore.fromExistingCollection(
    new OpenAIEmbeddings({ model: "text-embedding-3-small" }),
    {
      url: process.env.QDRANT_URL!,
      apiKey: process.env.QDRANT_API_KEY,
      collectionName: "taxbuddy-documents",
    }
  );
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

// Create the search tool that queries Qdrant
const createSearchDocsTool = (vectorStore: QdrantVectorStore) =>
  tool({
    description: "Search the Canadian tax document database",
    inputSchema: zodSchema(searchInputSchema),
    execute: async ({ query, keywords }) => {
      // Build search query with optional keywords
      const queryParts = [query];
      if (keywords?.length) queryParts.push(...keywords);

      const searchQuery = queryParts.join(" ");
      const docs = await vectorStore.similaritySearch(searchQuery, 3);

      // Format results with metadata (title, URL, chunk info)
      const results = docs.map((d, i) => {
        const title = d.metadata?.title || "Untitled";
        const url = d.metadata?.url || null;
        const chunkInfo = d.metadata?.chunk_index !== undefined
          ? `(chunk ${d.metadata.chunk_index + 1}/${d.metadata.total_chunks})`
          : "";

        const header = url
          ? `[${title}](${url}) ${chunkInfo}`
          : `${title} ${chunkInfo}`;

        return `### Source ${i + 1}: ${header}\n${d.pageContent}`;
      }).join("\n\n---\n\n");

      return `[Query: ${searchQuery}]\n\n${results}`;
    },
  });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const returnIntermediateSteps = body.show_intermediate_steps;

    // Filter out system messages (intermediate steps displayed in UI)
    const filteredMessages = (body.messages ?? []).filter(
      (message: ApiChatMessage) =>
        message.role === "user" || message.role === "assistant"
    );

    // Normalize messages to UIMessage format before conversion
    const normalizedMessages = normalizeMessages(filteredMessages);
    const messages = await convertToModelMessages(normalizedMessages);

    // Initialize Qdrant vector store and create search tool
    const vectorStore = await getVectorStore();
    const searchDocs = createSearchDocsTool(vectorStore);

    if (!returnIntermediateSteps) {
      // Stream response with tool calling
      const result = streamText({
        model: openai("gpt-4o-mini"),
        system: AGENT_SYSTEM_PROMPT,
        messages,
        tools: { searchDocs },
        stopWhen: stepCountIs(5),
        temperature: 0.2,
      });

      return result.toTextStreamResponse();
    } else {
      // Return intermediate steps for debugging/display
      const result = streamText({
        model: openai("gpt-4o-mini"),
        system: AGENT_SYSTEM_PROMPT,
        messages,
        tools: { searchDocs },
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

      return NextResponse.json({ messages: allSteps }, { status: 200 });
    }
  } catch (e: unknown) {
    const error = e as { message?: string; status?: number };
    return NextResponse.json(
      { error: error.message ?? "Unknown error" },
      { status: error.status ?? 500 }
    );
  }
}
