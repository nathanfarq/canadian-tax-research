import { NextRequest, NextResponse } from "next/server";
import { QdrantVectorStore } from "@langchain/qdrant";
import { OpenAIEmbeddings } from "@langchain/openai";
import {
  openai,
  streamText,
  generateText,
  convertToModelMessages,
} from "@/lib/langsmith";

export const runtime = "nodejs";

interface ChatMessage {
  role: string;
  content: string;
  parts?: Array<{ type: "text"; text: string }>;
}

type NormalizedMessage = {
  role: "system" | "user" | "assistant";
  parts: Array<{ type: "text"; text: string }>;
};

const formatChatHistory = (messages: ChatMessage[]) => {
  return messages
    .map((message) => {
      if (message.role === "user") {
        return `Human: ${message.content}`;
      } else if (message.role === "assistant") {
        return `Assistant: ${message.content}`;
      }
      return `${message.role}: ${message.content}`;
    })
    .join("\n");
};

function normalizeMessages(messages: ChatMessage[]): NormalizedMessage[] {
  return messages.map((m) => ({
    role: m.role as NormalizedMessage["role"],
    parts: m.parts ?? [{ type: "text", text: m.content }],
  }));
}

const CONDENSE_QUESTION_PROMPT = `Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question, in its original language.

<chat_history>
{chat_history}
</chat_history>

Follow Up Input: {question}
Standalone question:`;

const ANSWER_SYSTEM_PROMPT = `You are an energetic talking puppy named Dana, and must answer all questions like a happy, talking dog would.
Use lots of puns!

Answer the question based only on the following context and chat history:
<context>
{context}
</context>

<chat_history>
{chat_history}
</chat_history>`;

async function getVectorStore() {
  return QdrantVectorStore.fromExistingCollection(
    new OpenAIEmbeddings({ model: "text-embedding-3-small" }),
    {
      url: process.env.QDRANT_URL!,
      apiKey: process.env.QDRANT_API_KEY,
      collectionName: "nathan-farquharson-free-qdrant-cluster",
    }
  );
}

async function condenseQuestion(
  question: string,
  chatHistory: string
): Promise<string> {
  if (!chatHistory || !chatHistory.trim()) {
    return question;
  }

  const prompt = CONDENSE_QUESTION_PROMPT.replace(
    "{chat_history}",
    chatHistory
  ).replace("{question}", question);

  const result = await generateText({
    model: openai("gpt-4o-mini"),
    prompt,
    temperature: 0,
  });

  return result.text;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messages: ChatMessage[] = body.messages ?? [];

    if (messages.length === 0) {
      return NextResponse.json(
        { error: "No messages provided" },
        { status: 400 }
      );
    }

    const previousMessages = messages.slice(0, -1);
    const currentMessageContent = messages[messages.length - 1]?.content ?? "";

    const chatHistory = formatChatHistory(previousMessages) ?? "";

    // Condense follow-up question into standalone question
    const standaloneQuestion = await condenseQuestion(
      currentMessageContent,
      chatHistory
    );

    // Retrieve relevant documents from Qdrant
    const vectorStore = await getVectorStore();
    const documents = await vectorStore.similaritySearch(standaloneQuestion, 4);
    const context = documents.map((doc) => doc.pageContent).join("\n\n");

    // Build system prompt with context
    const systemPrompt = ANSWER_SYSTEM_PROMPT.replace(
      "{context}",
      context
    ).replace("{chat_history}", chatHistory);

    // Normalize and convert messages for AI SDK
    const normalizedMessages = normalizeMessages(
      messages.filter((m) => m.role === "user" || m.role === "assistant")
    );
    const modelMessages = await convertToModelMessages(normalizedMessages);

    // Stream response using AI SDK
    const result = streamText({
      model: openai("gpt-4o-mini"),
      system: systemPrompt,
      messages: modelMessages,
      temperature: 0.2,
    });

    // Serialize sources for response header
    const serializedSources = Buffer.from(
      JSON.stringify(
        documents.map((doc) => ({
          pageContent: doc.pageContent.slice(0, 50) + "...",
          metadata: doc.metadata,
        }))
      )
    ).toString("base64");

    const response = result.toTextStreamResponse();

    // Add custom headers for sources
    response.headers.set(
      "x-message-index",
      (previousMessages.length + 1).toString()
    );
    response.headers.set("x-sources", serializedSources);

    return response;
  } catch (e: unknown) {
    const error = e as { message?: string; status?: number };
    return NextResponse.json(
      { error: error.message ?? "Unknown error" },
      { status: error.status ?? 500 }
    );
  }
}
