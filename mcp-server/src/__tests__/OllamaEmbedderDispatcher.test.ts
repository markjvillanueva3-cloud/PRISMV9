/**
 * OllamaEmbedderDispatcher.test.ts
 *
 * OBSIDIAN-AUTOMATE-MS3/U-EMBEDDER-WIRE
 *
 * Asserts the dispatcher-level marshalling that routes prism_memory
 * actions `embed_text` and `embed_pairwise_cosine` through
 * OllamaEmbedderEngine. We exercise the same logical paths that the
 * dispatcher case blocks contain (param validation, type guards,
 * map→array conversion of the similarity result) without spinning up
 * an MCP server.
 *
 * The dispatcher case handlers are pure pass-through aside from:
 *   1. param validation (text non-empty, inputs is array of {path,text})
 *   2. result reshape (vector dims for embed_text, Map→Array for pairs)
 *
 * Both reshapes are tested here against a deterministic mock fetch.
 *
 * 9 it() cases.
 */

import { describe, it, expect } from "vitest";
import { OllamaEmbedderEngine, pairKey } from "../engines/OllamaEmbedderEngine.js";

// ---------------------------------------------------------------------------
// Shared mocks
// ---------------------------------------------------------------------------

/** Returns a deterministic 4-dim vector based on the prompt's char codes. */
function makeMockFetch(failOn: Set<string> = new Set()): typeof fetch {
  return (async (_url: string | URL | Request, init?: RequestInit) => {
    const body = JSON.parse((init?.body as string) ?? "{}");
    const prompt: string = body.prompt;
    if (failOn.has(prompt)) {
      return new Response("upstream", { status: 502 });
    }
    // deterministic 4-dim vector: hash chars into 4 buckets
    const v = [0, 0, 0, 0];
    for (let i = 0; i < prompt.length; i++) v[i % 4] += prompt.charCodeAt(i);
    const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
    return new Response(JSON.stringify({ embedding: v.map((x) => x / norm) }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as unknown as typeof fetch;
}

// ---------------------------------------------------------------------------
// Dispatcher-shape helpers — mirror the case-block logic in memoryDispatcher
// ---------------------------------------------------------------------------

async function dispatchEmbedText(
  engine: OllamaEmbedderEngine,
  params: { text?: unknown },
) {
  const text = typeof params.text === "string" ? params.text : "";
  if (!text) return { ok: false, error: "missing-text-param" };
  const r = await engine.embed(text);
  return r.ok
    ? { ok: true, dims: r.vector.length, vector: r.vector }
    : { ok: false, error: r.error };
}

async function dispatchEmbedPairwiseCosine(
  engine: OllamaEmbedderEngine,
  params: { inputs?: unknown },
) {
  const inputs = Array.isArray(params.inputs) ? params.inputs : [];
  const valid = inputs.filter(
    (x: unknown): x is { path: string; text: string } =>
      !!x && typeof x === "object" &&
      typeof (x as { path?: unknown }).path === "string" &&
      typeof (x as { text?: unknown }).text === "string",
  );
  if (valid.length === 0) {
    return { ok: false, error: "no-valid-inputs", embedded: 0, failed: [], pairs: [] };
  }
  const r = await engine.pairwiseCosine(valid);
  return {
    ok: r.ok,
    embedded: r.embedded,
    failed: r.failed,
    pairs: r.similarities
      ? Array.from(r.similarities.entries()).map(([k, s]) => ({ pair: k, similarity: s }))
      : [],
  };
}

// ---------------------------------------------------------------------------

describe("memoryDispatcher → embed_text routing", () => {
  it("returns ok+dims+vector on a valid embedding", async () => {
    const engine = new OllamaEmbedderEngine({ fetchImpl: makeMockFetch() });
    const r = await dispatchEmbedText(engine, { text: "hello world" });
    expect(r.ok).toBe(true);
    expect((r as { dims: number }).dims).toBe(4);
    expect(Array.isArray((r as { vector: number[] }).vector)).toBe(true);
    expect((r as { vector: number[] }).vector.length).toBe(4);
  });

  it("rejects empty text with stable error envelope (no throw)", async () => {
    const engine = new OllamaEmbedderEngine({ fetchImpl: makeMockFetch() });
    const r = await dispatchEmbedText(engine, { text: "" });
    expect(r).toEqual({ ok: false, error: "missing-text-param" });
  });

  it("rejects missing text param entirely with the same error envelope", async () => {
    const engine = new OllamaEmbedderEngine({ fetchImpl: makeMockFetch() });
    const r = await dispatchEmbedText(engine, {});
    expect(r).toEqual({ ok: false, error: "missing-text-param" });
  });

  it("rejects non-string text param without throwing", async () => {
    const engine = new OllamaEmbedderEngine({ fetchImpl: makeMockFetch() });
    const r = await dispatchEmbedText(engine, { text: 42 as unknown as string });
    expect(r).toEqual({ ok: false, error: "missing-text-param" });
  });

  it("propagates upstream HTTP failure as ok:false with typed error", async () => {
    const engine = new OllamaEmbedderEngine({ fetchImpl: makeMockFetch(new Set(["bad"])) });
    const r = await dispatchEmbedText(engine, { text: "bad" });
    expect(r.ok).toBe(false);
    expect((r as { error: string }).error).toMatch(/^http-/);
  });
});

describe("memoryDispatcher → embed_pairwise_cosine routing", () => {
  it("converts the similarity Map into a sorted-stable pairs array", async () => {
    const engine = new OllamaEmbedderEngine({ fetchImpl: makeMockFetch() });
    const r = await dispatchEmbedPairwiseCosine(engine, {
      inputs: [
        { path: "/v/a.md", text: "alpha alpha" },
        { path: "/v/b.md", text: "beta beta beta" },
        { path: "/v/c.md", text: "alpha alpha gamma" },
      ],
    });
    expect(r.ok).toBe(true);
    expect((r as { embedded: number }).embedded).toBe(3);
    const pairs = (r as { pairs: Array<{ pair: string; similarity: number }> }).pairs;
    expect(pairs.length).toBe(3); // C(3,2)
    // all keys must be canonical (basename||basename, alpha-sorted)
    for (const p of pairs) {
      expect(p.pair.includes("||")).toBe(true);
      const [l, rr] = p.pair.split("||");
      expect(l <= rr).toBe(true);
      expect(typeof p.similarity).toBe("number");
    }
    // a-c share "alpha" tokens → must be more similar than b-c
    const ac = pairs.find((p) => p.pair === pairKey("/v/a.md", "/v/c.md"))!;
    const bc = pairs.find((p) => p.pair === pairKey("/v/b.md", "/v/c.md"))!;
    expect(ac.similarity).toBeGreaterThan(bc.similarity);
  });

  it("rejects empty inputs list with stable error envelope shape", async () => {
    const engine = new OllamaEmbedderEngine({ fetchImpl: makeMockFetch() });
    const r = await dispatchEmbedPairwiseCosine(engine, { inputs: [] });
    expect(r).toEqual({
      ok: false,
      error: "no-valid-inputs",
      embedded: 0,
      failed: [],
      pairs: [],
    });
  });

  it("filters malformed inputs (missing path or text) before embedding", async () => {
    const engine = new OllamaEmbedderEngine({ fetchImpl: makeMockFetch() });
    const r = await dispatchEmbedPairwiseCosine(engine, {
      inputs: [
        { path: "/v/a.md", text: "alpha" },
        { path: 42, text: "bad-path" },          // path not string → dropped
        { path: "/v/c.md", text: 99 },           // text not string → dropped
        null,                                    // null → dropped
        "string-not-object",                     // primitive → dropped
        { path: "/v/d.md", text: "delta" },
      ],
    });
    expect(r.ok).toBe(true);
    // Only 2 inputs survived the type-guard filter
    expect((r as { embedded: number }).embedded).toBe(2);
    expect((r as { pairs: unknown[] }).pairs.length).toBe(1); // C(2,2)=1
  });

  it("non-array inputs param falls back to empty-input error envelope", async () => {
    const engine = new OllamaEmbedderEngine({ fetchImpl: makeMockFetch() });
    const r = await dispatchEmbedPairwiseCosine(engine, { inputs: "not-an-array" as unknown as never });
    expect(r.ok).toBe(false);
    expect((r as { error: string }).error).toBe("no-valid-inputs");
  });

  it("upstream embedding failures appear in failed[] not pairs[]", async () => {
    const engine = new OllamaEmbedderEngine({ fetchImpl: makeMockFetch(new Set(["broken"])) });
    const r = await dispatchEmbedPairwiseCosine(engine, {
      inputs: [
        { path: "/v/ok1.md", text: "alpha" },
        { path: "/v/bad.md", text: "broken" },
        { path: "/v/ok2.md", text: "gamma" },
      ],
    });
    expect((r as { embedded: number }).embedded).toBe(2);
    const failed = (r as { failed: Array<{ path: string; reason: string }> }).failed;
    expect(failed.length).toBe(1);
    expect(failed[0].path).toBe("/v/bad.md");
    expect(failed[0].reason).toMatch(/^http-/);
    // 1 surviving pair from the 2 successful embeddings
    expect((r as { pairs: unknown[] }).pairs.length).toBe(1);
  });
});
