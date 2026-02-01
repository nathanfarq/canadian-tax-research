import { http, HttpResponse } from "msw";
import { supabaseHandlers } from "./supabaseHandlers";

// Mock response for chat API
const mockChatResponse = {
  messages: [
    {
      role: "assistant",
      content: "",
      tool_calls: [{ name: "searchDocs", args: { query: "test query" } }],
    },
    {
      role: "tool",
      content: "Source 1: This is mocked tax information from the vector store.",
    },
    {
      role: "assistant",
      content:
        "Based on the search results, here is your answer about Canadian tax law.",
    },
  ],
};

// Mock response for document ingestion
const mockIngestResponse = {
  ok: true,
  chunks_ingested: 5,
};

export const handlers = [
  // Supabase/Conversations API handlers
  ...supabaseHandlers,

  // Existing handlers
  // Chat API endpoint
  http.post("/api/chat/retrieval_agents", async ({ request }) => {
    const body = (await request.json()) as {
      show_intermediate_steps?: boolean;
    };
    const showSteps = body.show_intermediate_steps;

    if (showSteps) {
      return HttpResponse.json(mockChatResponse);
    }

    // Streaming response simulation
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const chunks = [
          "Based ",
          "on ",
          "Canadian ",
          "tax ",
          "law, ",
          "here ",
          "is ",
          "your ",
          "answer.",
        ];
        let index = 0;

        const interval = setInterval(() => {
          if (index < chunks.length) {
            controller.enqueue(encoder.encode(chunks[index]));
            index++;
          } else {
            clearInterval(interval);
            controller.close();
          }
        }, 10);
      },
    });

    return new HttpResponse(stream, {
      headers: { "Content-Type": "text/plain" },
    });
  }),

  // Document ingestion endpoint
  http.post("/api/retrieval/ingest", async ({ request }) => {
    const body = (await request.json()) as { text?: string };

    if (!body.text) {
      return HttpResponse.json(
        { error: "Missing required field: text" },
        { status: 400 }
      );
    }

    return HttpResponse.json(mockIngestResponse);
  }),
];
