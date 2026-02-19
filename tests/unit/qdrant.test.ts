/**
 * Unit tests for lib/qdrant.ts
 *
 * Verifies the COLLECTIONS structure, singleton accessors, and
 * searchAllCollections() behaviour — including hybrid (dense + BM25 sparse)
 * query construction, source filtering, result merging/sorting, and graceful
 * degradation when individual collections fail.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  COLLECTIONS,
  getQdrantClient,
  getEmbeddings,
  searchAllCollections,
} from "@/lib/qdrant";

// ---------------------------------------------------------------------------
// Hoisted mocks — must be declared before vi.mock() factory calls
// ---------------------------------------------------------------------------

const { mockQuery, mockEmbedQuery } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockEmbedQuery: vi.fn(),
}));

vi.mock("@qdrant/js-client-rest", () => ({
  QdrantClient: vi.fn().mockImplementation(() => ({
    query: mockQuery,
  })),
}));

vi.mock("@langchain/openai", () => ({
  OpenAIEmbeddings: vi.fn().mockImplementation(() => ({
    embedQuery: mockEmbedQuery,
    embedDocuments: vi.fn(),
  })),
}));

// ---------------------------------------------------------------------------
// Shared test data
// ---------------------------------------------------------------------------

const DUMMY_VECTOR = new Array(1536).fill(0.1);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("COLLECTIONS", () => {
  it("has exactly 7 entries", () => {
    expect(COLLECTIONS).toHaveLength(7);
  });

  it("each entry has non-empty collectionName, sourcePrefix, and displayName", () => {
    for (const col of COLLECTIONS) {
      expect(typeof col.collectionName).toBe("string");
      expect(col.collectionName.length).toBeGreaterThan(0);
      expect(typeof col.sourcePrefix).toBe("string");
      expect(col.sourcePrefix.length).toBeGreaterThan(0);
      expect(typeof col.displayName).toBe("string");
      expect(col.displayName.length).toBeGreaterThan(0);
    }
  });

  it("contains the CRA collection with correct values", () => {
    const cra = COLLECTIONS.find((c) => c.sourcePrefix === "cra");
    expect(cra).toEqual({
      collectionName: "cra-collection",
      sourcePrefix: "cra",
      displayName: "CRA",
    });
  });

  it("contains all expected source prefixes", () => {
    const prefixes = COLLECTIONS.map((c) => c.sourcePrefix);
    expect(prefixes).toEqual(
      expect.arrayContaining(["cra", "dof", "eta", "fedbudget", "ita", "provtax", "taxlaw"])
    );
  });

  it("derives correct dense/sparse vector names from each sourcePrefix", () => {
    for (const col of COLLECTIONS) {
      expect(`${col.sourcePrefix}-dense`).toBe(`${col.sourcePrefix}-dense`);
      expect(`${col.sourcePrefix}-sparse`).toBe(`${col.sourcePrefix}-sparse`);
    }
  });
});

// ---------------------------------------------------------------------------

describe("getQdrantClient()", () => {
  it("returns the same instance on repeated calls (singleton)", () => {
    const a = getQdrantClient();
    const b = getQdrantClient();
    expect(a).toBe(b);
  });
});

describe("getEmbeddings()", () => {
  it("returns the same instance on repeated calls (singleton)", () => {
    const a = getEmbeddings();
    const b = getEmbeddings();
    expect(a).toBe(b);
  });
});

// ---------------------------------------------------------------------------

describe("searchAllCollections()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEmbedQuery.mockResolvedValue(DUMMY_VECTOR);
    mockQuery.mockResolvedValue({ points: [] });
  });

  it("calls embedQuery exactly once with the query text", async () => {
    await searchAllCollections("tax credits");
    expect(mockEmbedQuery).toHaveBeenCalledTimes(1);
    expect(mockEmbedQuery).toHaveBeenCalledWith("tax credits");
  });

  it("queries all 7 collections when no sourceFilter is supplied", async () => {
    await searchAllCollections("RRSP limits");
    expect(mockQuery).toHaveBeenCalledTimes(7);
  });

  it("queries only matching collections when sourceFilter is provided", async () => {
    await searchAllCollections("capital gains", 3, ["cra", "ita"]);
    expect(mockQuery).toHaveBeenCalledTimes(2);

    const calledCollections = mockQuery.mock.calls.map(
      (call: unknown[]) => call[0] as string
    );
    expect(calledCollections).toContain("cra-collection");
    expect(calledCollections).toContain("ita-collection");
  });

  it("queries all 7 collections when sourceFilter is an empty array", async () => {
    await searchAllCollections("deductions", 3, []);
    expect(mockQuery).toHaveBeenCalledTimes(7);
  });

  it("sends a hybrid prefetch with dense vector and BM25 sparse entries", async () => {
    const queryText = "dividend income";
    await searchAllCollections(queryText, 3, ["cra"]);

    expect(mockQuery).toHaveBeenCalledTimes(1);

    const [collectionName, queryParams] = mockQuery.mock.calls[0] as [
      string,
      {
        prefetch: Array<{ query: unknown; using: string; limit: number }>;
        query: unknown;
        using: string;
        limit: number;
        with_payload: boolean;
      },
    ];

    expect(collectionName).toBe("cra-collection");

    // Two prefetch candidates: dense + sparse
    expect(queryParams.prefetch).toHaveLength(2);

    const densePrefetch = queryParams.prefetch.find((p) => p.using === "cra-dense");
    expect(densePrefetch).toBeDefined();
    expect(densePrefetch!.query).toEqual(DUMMY_VECTOR);

    const sparsePrefetch = queryParams.prefetch.find((p) => p.using === "cra-sparse");
    expect(sparsePrefetch).toBeDefined();
    expect(sparsePrefetch!.query).toEqual({ text: queryText, model: "qdrant/bm25" });

    // Final re-rank uses the dense vector
    expect(queryParams.query).toEqual(DUMMY_VECTOR);
    expect(queryParams.using).toBe("cra-dense");
    expect(queryParams.with_payload).toBe(true);
  });

  it("uses prefetch limits of limit * 2 for both dense and sparse", async () => {
    await searchAllCollections("test", 5, ["cra"]);

    const [, queryParams] = mockQuery.mock.calls[0] as [
      string,
      { prefetch: Array<{ limit: number }>; limit: number },
    ];

    for (const prefetchEntry of queryParams.prefetch) {
      expect(prefetchEntry.limit).toBe(10); // 5 * 2
    }
    expect(queryParams.limit).toBe(5);
  });

  it("merges results from multiple collections and sorts by score descending", async () => {
    mockQuery
      .mockResolvedValueOnce({
        points: [{ score: 0.5, payload: { chunk_text: "CRA result" } }],
      })
      .mockResolvedValueOnce({
        points: [{ score: 0.9, payload: { chunk_text: "ITA result" } }],
      });

    const results = await searchAllCollections("test", 5, ["cra", "ita"]);
    expect(results).toHaveLength(2);
    expect(results[0].score).toBe(0.9);
    expect(results[1].score).toBe(0.5);
  });

  it("returns only the top limit results across all collections", async () => {
    mockQuery.mockResolvedValue({
      points: [
        { score: 0.8, payload: { chunk_text: "result A" } },
        { score: 0.6, payload: { chunk_text: "result B" } },
      ],
    });

    // 3 collections × 2 results = 6 total, limit is 3
    const results = await searchAllCollections("test", 3, ["cra", "ita", "eta"]);
    expect(results).toHaveLength(3);
    expect(results[0].score).toBeGreaterThanOrEqual(results[1].score);
    expect(results[1].score).toBeGreaterThanOrEqual(results[2].score);
  });

  it("attaches collectionSource (displayName) to each result", async () => {
    mockQuery.mockResolvedValueOnce({
      points: [{ score: 0.7, payload: { chunk_text: "CRA content" } }],
    });

    const results = await searchAllCollections("test", 3, ["cra"]);
    expect(results[0].collectionSource).toBe("CRA");
  });

  it("returns results from healthy collections when one collection fails", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    // cra fails, ita succeeds — order mirrors COLLECTIONS filter order
    mockQuery
      .mockRejectedValueOnce(new Error("Connection refused"))
      .mockResolvedValueOnce({
        points: [{ score: 0.7, payload: { chunk_text: "ITA content" } }],
      });

    const results = await searchAllCollections("test", 3, ["cra", "ita"]);

    expect(results).toHaveLength(1);
    expect(results[0].collectionSource).toBe("ITA");

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("cra-collection"),
      expect.any(Error)
    );

    warnSpy.mockRestore();
  });

  it("returns an empty array when all collections fail", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    mockQuery.mockRejectedValue(new Error("Qdrant unreachable"));

    const results = await searchAllCollections("test");
    expect(results).toEqual([]);
  });
});
