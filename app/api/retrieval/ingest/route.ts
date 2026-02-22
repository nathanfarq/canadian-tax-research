import { NextRequest, NextResponse } from "next/server";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { getQdrantClient, getEmbeddings } from "@/lib/qdrant";
import { v4 as uuidv4 } from "uuid";

export const runtime = "nodejs";

const COLLECTION_NAME = "tax_documents";

const MAX_RETRIES = 2;

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (e: unknown) {
      lastError = e as Error;
      if (attempt < MAX_RETRIES - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }
  throw lastError;
}


/**
 * This handler takes input text, splits it into chunks, and embeds those chunks
 * into a vector store for later retrieval using a flat payload structure.
 *
 * Expected body: { text: string, title?: string, url?: string, source?: string, doc_type?: string }
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { text, title, url, source, doc_type } = body;

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

  if (!text) {
    return NextResponse.json(
      { error: "Missing required field: text" },
      { status: 400 },
    );
  }

  try {
    const splitter = RecursiveCharacterTextSplitter.fromLanguage("markdown", {
      chunkSize: 256,
      chunkOverlap: 20,
    });

    const splitDocuments = await splitter.createDocuments([text]);
    const totalChunks = splitDocuments.length;

    // Generate embeddings for all chunks
    const chunkTexts = splitDocuments.map((doc) => doc.pageContent);
    const vectors = await getEmbeddings().embedDocuments(chunkTexts);

    // Build points with flat payload structure
    const points = splitDocuments.map((doc, index) => {
      const payload: Record<string, unknown> = {
        chunk_text: doc.pageContent,
        chunk_index: index,
        total_chunks: totalChunks,
        scraped_at: new Date().toISOString(),
      };

      // Only add optional fields if provided
      if (title) payload.title = title;
      if (url) payload.url = url;
      if (source) payload.source = source;
      if (doc_type) payload.doc_type = doc_type;

      return {
        id: uuidv4(),
        vector: vectors[index],
        payload,
      };
    });

    // Get Qdrant client and upsert points directly
    const qdrantClient = getQdrantClient();

    await withRetry(async () => {
      await qdrantClient.upsert(COLLECTION_NAME, {
        wait: true,
        points,
      });
    });

    return NextResponse.json(
      { ok: true, chunks_ingested: totalChunks },
      { status: 200 }
    );
  } catch (e: unknown) {
    const error = e as Error;
    console.error("[INGEST] Error:", error.message);
    return NextResponse.json(
      {
        error:
          "We encountered an issue processing your request. Please try submitting again.",
      },
      { status: 500 },
    );
  }
}
