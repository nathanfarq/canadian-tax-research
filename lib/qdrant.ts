import { QdrantClient } from "@qdrant/js-client-rest";
import { OpenAIEmbeddings } from "@langchain/openai";

// --- Collection Configuration ---

export interface CollectionConfig {
  collectionName: string;
  sourcePrefix: string;
  displayName: string;
}

export const COLLECTIONS: CollectionConfig[] = [
  { collectionName: "cra-collection", sourcePrefix: "cra", displayName: "CRA" },
  { collectionName: "dof-collection", sourcePrefix: "dof", displayName: "Dept. of Finance" },
  { collectionName: "eta-collection", sourcePrefix: "eta", displayName: "ETA" },
  { collectionName: "fedbudget-collection", sourcePrefix: "fedbudget", displayName: "Federal Budget" },
  { collectionName: "ita-collection", sourcePrefix: "ita", displayName: "ITA" },
  { collectionName: "provtax-collection", sourcePrefix: "provtax", displayName: "Provincial Tax" },
  { collectionName: "taxlaw-collection", sourcePrefix: "taxlaw", displayName: "Tax Law" },
];

// --- Singleton Qdrant Client ---

let _client: QdrantClient | null = null;

export function getQdrantClient(): QdrantClient {
  if (!_client) {
    _client = new QdrantClient({
      url: process.env.QDRANT_URL!,
      apiKey: process.env.QDRANT_API_KEY,
    });
  }
  return _client;
}

// --- Singleton Embeddings ---

let _embeddings: OpenAIEmbeddings | null = null;

export function getEmbeddings(): OpenAIEmbeddings {
  if (!_embeddings) {
    _embeddings = new OpenAIEmbeddings({ model: "text-embedding-3-small" });
  }
  return _embeddings;
}

// --- Payload Types ---

export interface QdrantPayload {
  chunk_text: string;
  title?: string;
  url?: string;
  chunk_index?: number;
  total_chunks?: number;
  source?: string;
  doc_type?: string;
  scraped_at?: string;
}

export interface SearchResult {
  score: number;
  payload: QdrantPayload;
  collectionSource: string;
}

// --- Search Functions ---

interface SparseVector {
  indices: number[];
  values: number[];
}

async function queryCollection(
  client: QdrantClient,
  config: CollectionConfig,
  denseVector: number[],
  sparseVector: SparseVector | null,
  limit: number,
): Promise<SearchResult[]> {
  const { collectionName, sourcePrefix, displayName } = config;
  const denseVectorName = `${sourcePrefix}-dense`;
  const sparseVectorName = `${sourcePrefix}-sparse`;

  const prefetch: Array<{
    query: number[] | { indices: number[]; values: number[] };
    using: string;
    limit: number;
  }> = [
    { query: denseVector, using: denseVectorName, limit: limit * 2 },
  ];

  if (sparseVector) {
    prefetch.push({
      query: sparseVector,
      using: sparseVectorName,
      limit: limit * 2,
    });
  }

  const response = await client.query(collectionName, {
    prefetch,
    query: denseVector,
    using: denseVectorName,
    limit,
    with_payload: true,
  });

  return response.points.map((point) => ({
    score: point.score ?? 0,
    payload: point.payload as unknown as QdrantPayload,
    collectionSource: displayName,
  }));
}

/**
 * Search across all 7 collections concurrently.
 * Merges results by score, returns top N.
 * If a collection fails, logs a warning and continues with remaining collections.
 */
export async function searchAllCollections(
  queryText: string,
  limit: number = 3,
  sparseVector: SparseVector | null = null,
): Promise<SearchResult[]> {
  const client = getQdrantClient();
  const embeddings = getEmbeddings();
  const denseVector = await embeddings.embedQuery(queryText);

  const results = await Promise.allSettled(
    COLLECTIONS.map((config) =>
      queryCollection(client, config, denseVector, sparseVector, limit)
    )
  );

  const allResults: SearchResult[] = [];
  results.forEach((result, i) => {
    if (result.status === "fulfilled") {
      allResults.push(...result.value);
    } else {
      console.warn(
        `[QDRANT] Collection ${COLLECTIONS[i].collectionName} failed:`,
        result.reason
      );
    }
  });

  allResults.sort((a, b) => b.score - a.score);
  return allResults.slice(0, limit);
}
