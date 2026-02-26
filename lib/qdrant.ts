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
  { collectionName: "ita-collection", sourcePrefix: "ita", displayName: "ITA" },
  { collectionName: "provtax-collection", sourcePrefix: "provtax", displayName: "Provincial Tax" },
  { collectionName: "taxlaw-collection", sourcePrefix: "taxlaw", displayName: "Tax Law" },
  { collectionName: "taxcomment-collection", sourcePrefix: "taxcomment", displayName: "Tax Commentary" },
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


async function queryCollection(
  client: QdrantClient,
  config: CollectionConfig,
  denseVector: number[],
  queryText: string,
  limit: number,
): Promise<SearchResult[]> {
  const { collectionName, sourcePrefix, displayName } = config;
  const denseVectorName = `${sourcePrefix}-dense`;
  const sparseVectorName = `${sourcePrefix}-sparse`;

  const prefetch = [
    { query: denseVector, using: denseVectorName, limit: limit * 2 },
    { query: { text: queryText, model: 'qdrant/bm25' }, using: sparseVectorName, limit: limit * 2 },
  ];

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
 * Search across collections concurrently.
 * Merges results by score, returns top N.
 * If a collection fails, logs a warning and continues with remaining collections.
 * @param sourceFilter Optional array of sourcePrefix keys to restrict which collections are queried.
 *                     If omitted or empty, all collections are queried.
 */
export async function searchAllCollections(
  queryText: string,
  limit: number = 5,
  sourceFilter?: string[],
): Promise<SearchResult[]> {
  const client = getQdrantClient();
  const embeddings = getEmbeddings();
  const denseVector = await embeddings.embedQuery(queryText);

  const collectionsToQuery =
    sourceFilter && sourceFilter.length > 0
      ? COLLECTIONS.filter((c) => sourceFilter.includes(c.sourcePrefix))
      : COLLECTIONS;

  const results = await Promise.allSettled(
    collectionsToQuery.map((config) =>
      queryCollection(client, config, denseVector, queryText, limit)
    )
  );

  const allResults: SearchResult[] = [];
  results.forEach((result, i) => {
    if (result.status === "fulfilled") {
      allResults.push(...result.value);
    } else {
      console.warn(
        `[QDRANT] Collection ${collectionsToQuery[i].collectionName} failed:`,
        result.reason
      );
    }
  });

  allResults.sort((a, b) => b.score - a.score);
  return allResults.slice(0, limit);
}
