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

const COLLECTION_NAME = "tax_documents";
const embeddings = new OpenAIEmbeddings({ model: "text-embedding-3-small" });

// Initialize QdrantVectorStore to access the underlying Qdrant client
async function getQdrantClient() {
  const vectorStore = await QdrantVectorStore.fromExistingCollection(
    embeddings,
    {
      url: process.env.QDRANT_URL!,
      apiKey: process.env.QDRANT_API_KEY,
      collectionName: COLLECTION_NAME,
    }
  );
  return vectorStore.client;
}

// Qdrant payload structure (flat, not nested under metadata)
interface QdrantPayload {
  chunk_text: string;
  title?: string;
  url?: string;
  chunk_index?: number;
  total_chunks?: number;
  source?: string;
  doc_type?: string;
  scraped_at?: string;
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

// Create the search tool that queries Qdrant directly
const createSearchDocsTool = (qdrantClient: Awaited<ReturnType<typeof getQdrantClient>>) =>
  tool({
    description: "Search the Canadian tax document database",
    inputSchema: zodSchema(searchInputSchema),
    execute: async ({ query, keywords }) => {
      // Build search query with optional keywords
      const queryParts = [query];
      if (keywords?.length) queryParts.push(...keywords);

      const searchQuery = queryParts.join(" ");

      // Retrieval diagnostics
      console.log("[RETRIEVAL] Query:", searchQuery);
      console.log("[RETRIEVAL] Keywords:", keywords ?? "none");

      // Generate embedding for the query
      const queryVector = await embeddings.embedQuery(searchQuery);

      // Query Qdrant directly to get flat payload structure
      const searchResult = await qdrantClient.search(COLLECTION_NAME, {
        vector: queryVector,
        limit: 3,
        with_payload: true,
      });

      // Log retrieval results
      console.log("[RETRIEVAL] Results count:", searchResult.length);
      searchResult.forEach((result, i) => {
        const payload = result.payload as unknown as QdrantPayload;
        console.log(`[RETRIEVAL] Result ${i + 1}:`, {
          score: result.score,
          title: payload?.title || "Untitled",
          url: payload?.url || "no URL",
          contentPreview: payload?.chunk_text?.substring(0, 150) + "...",
        });
      });

      // Format results with metadata (title, URL, chunk info)
      const results = searchResult.map((result, i) => {
        const payload = result.payload as unknown as QdrantPayload;
        const title = payload?.title || "Untitled";
        const url = payload?.url || null;
        const chunkInfo = payload?.chunk_index !== undefined
          ? `(chunk ${payload.chunk_index + 1}/${payload.total_chunks})`
          : "";

        const header = url
          ? `[${title}](${url}) ${chunkInfo}`
          : `${title} ${chunkInfo}`;

        return `### Source ${i + 1}: ${header}\n${payload?.chunk_text || ""}`;
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

    // Initialize Qdrant client and create search tool
    const qdrantClient = await getQdrantClient();
    const searchDocs = createSearchDocsTool(qdrantClient);

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
