/**
 * Smoke tests for Qdrant vector database
 *
 * Validates that Qdrant is reachable, that all 7 domain collections exist and
 * are healthy, and that the hybrid query endpoint (dense + BM25 sparse) works
 * correctly. Run with: yarn test:smoke
 *
 * Prerequisites:
 * - QDRANT_URL must be set in .env.local
 * - QDRANT_API_KEY must be set in .env.local (if using Qdrant Cloud)
 * - OPENAI_API_KEY must be set in .env.local (for the end-to-end search test)
 */

import { describe, it, expect } from "vitest";
import { COLLECTIONS } from "@/lib/qdrant";

const QDRANT_URL = process.env.QDRANT_URL;
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

function makeHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (QDRANT_API_KEY) headers["api-key"] = QDRANT_API_KEY;
  return headers;
}

// Representative collection used for per-endpoint smoke checks
const PROBE_COLLECTION = COLLECTIONS[0]; // cra-collection

describe("Qdrant Smoke Tests", () => {
  // -------------------------------------------------------------------------
  // Environment
  // -------------------------------------------------------------------------

  it("should have QDRANT_URL environment variable set", () => {
    expect(QDRANT_URL).toBeDefined();
    expect(QDRANT_URL).not.toBe("");
  });

  it("COLLECTIONS should export exactly 8 domain collections", () => {
    expect(COLLECTIONS).toHaveLength(8);
  });

  // -------------------------------------------------------------------------
  // Connectivity
  // -------------------------------------------------------------------------

  it("should connect to Qdrant and list collections", async () => {
    if (!QDRANT_URL) {
      console.warn("Skipping: QDRANT_URL not configured");
      return;
    }

    const response = await fetch(`${QDRANT_URL}/collections`, {
      method: "GET",
      headers: makeHeaders(),
    });

    expect(response.ok).toBe(true);

    const data = await response.json();
    expect(data.result).toBeDefined();
    expect(Array.isArray(data.result.collections)).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Per-collection health — one test per entry in COLLECTIONS
  // -------------------------------------------------------------------------

  for (const col of COLLECTIONS) {
    it(`${col.displayName} collection (${col.collectionName}) should exist and be green`, async () => {
      if (!QDRANT_URL) {
        console.warn("Skipping: QDRANT_URL not configured");
        return;
      }

      const response = await fetch(
        `${QDRANT_URL}/collections/${col.collectionName}`,
        { method: "GET", headers: makeHeaders() }
      );

      expect(response.status).not.toBe(404);
      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data.result).toBeDefined();
      expect(data.result.status).toBe("green");
    });
  }

  // -------------------------------------------------------------------------
  // Named vectors
  // -------------------------------------------------------------------------

  it("should have both dense and sparse named vectors on a representative collection", async () => {
    if (!QDRANT_URL) {
      console.warn("Skipping: QDRANT_URL not configured");
      return;
    }

    const response = await fetch(
      `${QDRANT_URL}/collections/${PROBE_COLLECTION.collectionName}`,
      { method: "GET", headers: makeHeaders() }
    );

    expect(response.ok).toBe(true);

    const data = await response.json();
    const vectors: Record<string, unknown> =
      data.result?.config?.params?.vectors ?? {};
    const vectorNames = Object.keys(vectors);

    expect(vectorNames).toContain(`${PROBE_COLLECTION.sourcePrefix}-dense`);
    expect(vectorNames).toContain(`${PROBE_COLLECTION.sourcePrefix}-sparse`);
  });

  // -------------------------------------------------------------------------
  // Hybrid query endpoint
  // -------------------------------------------------------------------------

  it("should accept a hybrid query (dense prefetch + BM25 sparse prefetch) and return results", async () => {
    if (!QDRANT_URL) {
      console.warn("Skipping: QDRANT_URL not configured");
      return;
    }

    const denseVectorName = `${PROBE_COLLECTION.sourcePrefix}-dense`;
    const sparseVectorName = `${PROBE_COLLECTION.sourcePrefix}-sparse`;
    const dummyVector = new Array(1536).fill(0.1);

    const response = await fetch(
      `${QDRANT_URL}/collections/${PROBE_COLLECTION.collectionName}/points/query`,
      {
        method: "POST",
        headers: makeHeaders(),
        body: JSON.stringify({
          prefetch: [
            { query: dummyVector, using: denseVectorName, limit: 6 },
            {
              query: { text: "income tax", model: "qdrant/bm25" },
              using: sparseVectorName,
              limit: 6,
            },
          ],
          query: dummyVector,
          using: denseVectorName,
          limit: 3,
          with_payload: true,
        }),
      }
    );

    expect(response.ok).toBe(true);

    const data = await response.json();
    expect(data.result).toBeDefined();
    expect(Array.isArray(data.result)).toBe(true);
  });

  // -------------------------------------------------------------------------
  // End-to-end: searchAllCollections() via the exported function
  // -------------------------------------------------------------------------

  it("should return typed SearchResult objects from searchAllCollections()", async () => {
    if (!QDRANT_URL || !OPENAI_API_KEY) {
      console.warn(
        "Skipping: QDRANT_URL or OPENAI_API_KEY not configured"
      );
      return;
    }

    const { searchAllCollections } = await import("@/lib/qdrant");
    const results = await searchAllCollections(
      "What are the RRSP contribution limits?",
      3
    );

    expect(Array.isArray(results)).toBe(true);

    if (results.length > 0) {
      const first = results[0];
      expect(typeof first.score).toBe("number");
      expect(typeof first.payload.chunk_text).toBe("string");
      expect(typeof first.collectionSource).toBe("string");
      // Score should be a normalised similarity value
      expect(first.score).toBeGreaterThan(0);
    }
  });

  it("should respect sourceFilter in searchAllCollections()", async () => {
    if (!QDRANT_URL || !OPENAI_API_KEY) {
      console.warn(
        "Skipping: QDRANT_URL or OPENAI_API_KEY not configured"
      );
      return;
    }

    const { searchAllCollections } = await import("@/lib/qdrant");

    // Restrict to CRA only — all results must come from that collection
    const results = await searchAllCollections("tax filing deadline", 3, ["cra"]);

    expect(Array.isArray(results)).toBe(true);
    for (const result of results) {
      expect(result.collectionSource).toBe("CRA");
    }
  });
});
