import { NextRequest, NextResponse } from "next/server";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

import { QdrantVectorStore } from "@langchain/qdrant";
import { OpenAIEmbeddings } from "@langchain/openai";

export const runtime = "nodejs";

const MAX_RETRIES = 2;

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (e: any) {
      lastError = e;
      if (attempt < MAX_RETRIES - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }
  throw lastError;
}

// Before running, follow set-up instructions at
// https://docs.langchain.com/oss/javascript/integrations/vectorstores/qdrant
/**
 * This handler takes input text, splits it into chunks, and embeds those chunks
 * into a vector store for later retrieval. See the following docs for more information:
 *
 * https://js.langchain.com/v0.2/docs/how_to/recursive_text_splitter
 * https://docs.langchain.com/oss/javascript/integrations/vectorstores/qdrant
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const text = body.text;

  if (process.env.NEXT_PUBLIC_DEMO === "true") {
    return NextResponse.json(
      {
        error: [
          "Ingest is not supported in demo mode.",
          "Please set up your own version of the repo here: https://github.com/langchain-ai/langchain-nextjs-template",
        ].join("\n"),
      },
      { status: 403 },
    );
  }

  try {
    const splitter = RecursiveCharacterTextSplitter.fromLanguage("markdown", {
      chunkSize: 256,
      chunkOverlap: 20,
    });

    const splitDocuments = await splitter.createDocuments([text]);

    await withRetry(async () => {
      await QdrantVectorStore.fromDocuments(
        splitDocuments,
        new OpenAIEmbeddings({ model: "text-embedding-3-small" }),
        {
          url: process.env.QDRANT_URL!,
          apiKey: process.env.QDRANT_API_KEY,
          collectionName: "taxbuddy-documents",
        },
      );
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      {
        error:
          "We encountered an issue processing your request. Please try submitting again.",
      },
      { status: 500 },
    );
  }
}
