/**
 * OllamaEmbedderEngine.test.ts
 *
 * OBSIDIAN-AUTOMATE-MS3/U-EMBEDDING-CONNECTIONS
 *
 * Validates the Ollama embedder wrapper: cosine math, pairwise output shape,
 * graceful failure on transport error, and deterministic mock-fetch
 * injection (so tests don't depend on Ollama running).
 *
 * 13 it() cases.
 */

import { describe, it, expect } from "vitest";
import { OllamaEmbedderEngine, cosine, pairKey } from "../engines/OllamaEmbedderEngine.js";

function mockFetchWithVectors(byText: Record<string, number[]>): typeof fetch {
  return async (url: any, init: any) => {
    void url;
    const body = JSON.parse(String(init.body));
    const vec = byText[body.prompt];
    if (!vec) {
      return new Response(JSON.stringify({ embedding: null }), { status: 200 });
    }
    return new Response(JSON.stringify({ embedding: vec }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
}

function failingFetch(status = 500): typeof fetch {
  return async () => new Response("err", { status });
}

function throwingFetch(): typeof fetch {
  return async () => { throw new Error("network down"); };
}

describe("OllamaEmbedderEngine — cosine helper", () => {
  it("identical vectors → cosine = 1", () => {
    expect(cosine([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 6);
  });

  it("orthogonal vectors → cosine = 0", () => {
    expect(cosine([1, 0], [0, 1])).toBeCloseTo(0, 6);
  });

  it("opposite vectors → cosine = -1", () => {
    expect(cosine([1, 1], [-1, -1])).toBeCloseTo(-1, 6);
  });

  it("zero vector → cosine = 0 (no NaN)", () => {
    expect(cosine([0, 0, 0], [1, 2, 3])).toBe(0);
  });

  it("mismatched lengths → cosine = 0", () => {
    expect(cosine([1, 2], [1, 2, 3])).toBe(0);
  });
});

describe("OllamaEmbedderEngine — pairKey helper", () => {
  it("alphabetical canonicalization (a, b)", () => {
    expect(pairKey("a", "b")).toBe("a||b");
  });

  it("alphabetical canonicalization (b, a)", () => {
    expect(pairKey("b", "a")).toBe("a||b");
  });
});

describe("OllamaEmbedderEngine — embed()", () => {
  it("returns ok with the model's embedding vector", async () => {
    const eng = new OllamaEmbedderEngine({
      fetchImpl: mockFetchWithVectors({ "hello": [0.1, 0.2, 0.3] }),
    });
    const r = await eng.embed("hello");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.vector).toEqual([0.1, 0.2, 0.3]);
  });

  it("returns error result on HTTP non-2xx (no throw)", async () => {
    const eng = new OllamaEmbedderEngine({ fetchImpl: failingFetch(500) });
    const r = await eng.embed("hi");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/^http-/);
  });

  it("returns error result when fetch throws (no throw to caller)", async () => {
    const eng = new OllamaEmbedderEngine({ fetchImpl: throwingFetch() });
    const r = await eng.embed("hi");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("fetch-failed");
  });

  it("returns error when response body lacks embedding field", async () => {
    const eng = new OllamaEmbedderEngine({
      fetchImpl: async () => new Response(JSON.stringify({ wrong: "shape" }), { status: 200 }),
    });
    const r = await eng.embed("x");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("no-embedding-in-response");
  });
});

describe("OllamaEmbedderEngine — pairwiseCosine()", () => {
  it("emits one similarity per pair for a 3-doc input (3 pairs)", async () => {
    const eng = new OllamaEmbedderEngine({
      fetchImpl: mockFetchWithVectors({
        "a-text": [1, 0, 0],
        "b-text": [1, 0.1, 0],
        "c-text": [0, 1, 0],
      }),
    });
    const r = await eng.pairwiseCosine([
      { path: "/notes/a.md", text: "a-text" },
      { path: "/notes/b.md", text: "b-text" },
      { path: "/notes/c.md", text: "c-text" },
    ]);
    expect(r.ok).toBe(true);
    expect(r.embedded).toBe(3);
    expect(r.similarities!.size).toBe(3);
    // a||b should be very high (~0.995), a||c near 0
    expect(r.similarities!.get(pairKey("/notes/a.md", "/notes/b.md"))!).toBeGreaterThan(0.99);
    expect(r.similarities!.get(pairKey("/notes/a.md", "/notes/c.md"))!).toBeCloseTo(0, 4);
  });

  it("excludes failed embeddings from the pair set", async () => {
    const eng = new OllamaEmbedderEngine({
      fetchImpl: async (url: any, init: any) => {
        void url;
        const body = JSON.parse(String(init.body));
        if (body.prompt === "broken") return new Response("e", { status: 500 });
        return new Response(JSON.stringify({ embedding: [1, 0, 0] }), { status: 200 });
      },
    });
    const r = await eng.pairwiseCosine([
      { path: "/a.md", text: "ok-1" },
      { path: "/b.md", text: "broken" },
      { path: "/c.md", text: "ok-2" },
    ]);
    expect(r.embedded).toBe(2);
    expect(r.failed.length).toBe(1);
    expect(r.failed[0].path).toBe("/b.md");
    // Only a||c pair survives (no key contains b.md).
    expect(r.similarities!.size).toBe(1);
    expect(r.similarities!.has(pairKey("/a.md", "/c.md"))).toBe(true);
  });

  it("empty input returns empty similarities map without error", async () => {
    const eng = new OllamaEmbedderEngine({ fetchImpl: failingFetch() });
    const r = await eng.pairwiseCosine([]);
    expect(r.ok).toBe(true);
    expect(r.embedded).toBe(0);
    expect(r.similarities!.size).toBe(0);
  });

  it("single input returns empty similarities (no pairs possible)", async () => {
    const eng = new OllamaEmbedderEngine({
      fetchImpl: mockFetchWithVectors({ "lonely": [1, 0, 0] }),
    });
    const r = await eng.pairwiseCosine([{ path: "/a.md", text: "lonely" }]);
    expect(r.embedded).toBe(1);
    expect(r.similarities!.size).toBe(0);
  });
});
