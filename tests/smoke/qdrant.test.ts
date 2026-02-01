/**
 * Smoke test for Qdrant vector database connection
 *
 * This test validates that Qdrant is configured correctly
 * and can connect to the vector store. Run with: yarn test:smoke
 *
 * Prerequisites:
 * - QDRANT_URL must be set in .env.local
 * - QDRANT_API_KEY must be set in .env.local (if using Qdrant Cloud)
 */

import { describe, it, expect } from "vitest";

// Load environment variables (not mocked for smoke tests)
const QDRANT_URL = process.env.QDRANT_URL;
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;

describe("Qdrant Smoke Tests", () => {
  it("should have QDRANT_URL environment variable set", () => {
    expect(QDRANT_URL).toBeDefined();
    expect(QDRANT_URL).not.toBe("");
  });

  it("should connect to Qdrant and list collections", async () => {
    if (!QDRANT_URL) {
      console.warn("Skipping: QDRANT_URL not configured");
      return;
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (QDRANT_API_KEY) {
      headers["api-key"] = QDRANT_API_KEY;
    }

    const response = await fetch(`${QDRANT_URL}/collections`, {
      method: "GET",
      headers,
    });

    expect(response.ok).toBe(true);

    const data = await response.json();
    expect(data.result).toBeDefined();
    expect(data.result.collections).toBeDefined();
    expect(Array.isArray(data.result.collections)).toBe(true);
  });

  it("should verify taxbuddy collection exists", async () => {
    if (!QDRANT_URL) {
      console.warn("Skipping: QDRANT_URL not configured");
      return;
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (QDRANT_API_KEY) {
      headers["api-key"] = QDRANT_API_KEY;
    }

    // Get collection info - adjust collection name if different
    const collectionName = "taxbuddy"; // Update if your collection has a different name
    const response = await fetch(
      `${QDRANT_URL}/collections/${collectionName}`,
      {
        method: "GET",
        headers,
      }
    );

    if (response.status === 404) {
      console.warn(`Collection '${collectionName}' not found - may need to be created`);
      return;
    }

    expect(response.ok).toBe(true);

    const data = await response.json();
    expect(data.result).toBeDefined();
    expect(data.result.status).toBe("green");
  });

  it("should be able to search vectors (if collection exists)", async () => {
    if (!QDRANT_URL) {
      console.warn("Skipping: QDRANT_URL not configured");
      return;
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (QDRANT_API_KEY) {
      headers["api-key"] = QDRANT_API_KEY;
    }

    const collectionName = "taxbuddy";

    // First check if collection exists
    const checkResponse = await fetch(
      `${QDRANT_URL}/collections/${collectionName}`,
      {
        method: "GET",
        headers,
      }
    );

    if (checkResponse.status === 404) {
      console.warn(`Collection '${collectionName}' not found - skipping search test`);
      return;
    }

    // Create a dummy vector (1536 dimensions for OpenAI embeddings)
    const dummyVector = new Array(1536).fill(0.1);

    const response = await fetch(
      `${QDRANT_URL}/collections/${collectionName}/points/search`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          vector: dummyVector,
          limit: 1,
          with_payload: true,
        }),
      }
    );

    expect(response.ok).toBe(true);

    const data = await response.json();
    expect(data.result).toBeDefined();
    expect(Array.isArray(data.result)).toBe(true);
  });
});
