/**
 * Smoke test for OpenAI API connection
 *
 * This test validates that the OpenAI API key is configured correctly
 * and can make real API calls. Run with: yarn test:smoke
 *
 * Prerequisites:
 * - OPENAI_API_KEY must be set in .env.local
 */

import { describe, it, expect } from "vitest";

// Load environment variables (not mocked for smoke tests)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

describe("OpenAI Smoke Tests", () => {
  it("should have OPENAI_API_KEY environment variable set", () => {
    expect(OPENAI_API_KEY).toBeDefined();
    expect(OPENAI_API_KEY).not.toBe("");
    expect(OPENAI_API_KEY).not.toBe("YOUR_API_KEY");
  });

  it("should connect to OpenAI and get a response", async () => {
    if (!OPENAI_API_KEY || OPENAI_API_KEY === "YOUR_API_KEY") {
      console.warn("Skipping: OPENAI_API_KEY not configured");
      return;
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: "Say hello in one word." }],
        max_tokens: 10,
      }),
    });

    expect(response.ok).toBe(true);

    const data = await response.json();
    expect(data.choices).toBeDefined();
    expect(data.choices.length).toBeGreaterThan(0);
    expect(data.choices[0].message.content).toBeDefined();
  });

  it("should connect to OpenAI embeddings endpoint", async () => {
    if (!OPENAI_API_KEY || OPENAI_API_KEY === "YOUR_API_KEY") {
      console.warn("Skipping: OPENAI_API_KEY not configured");
      return;
    }

    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: "Test embedding",
      }),
    });

    expect(response.ok).toBe(true);

    const data = await response.json();
    expect(data.data).toBeDefined();
    expect(data.data.length).toBeGreaterThan(0);
    expect(data.data[0].embedding).toBeDefined();
    expect(Array.isArray(data.data[0].embedding)).toBe(true);
  });
});
