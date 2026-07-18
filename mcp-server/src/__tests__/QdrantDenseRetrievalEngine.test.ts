/**
 * AI-SYNERGY/U-INDIA-QDRANT-ARM-WIRE companion tests.
 *
 * Covers every degrade path and the happy-path payload-id mapping of
 * QdrantDenseRetrievalEngine.search(). No real network I/O -- fetch is
 * replaced with a module-level vi.stubGlobal so tests are hermetic.
 *
 * Degrade contract (from engine JSDoc):
 *   empty-vector  -> { ok: false, hits: [], error: "empty-vector" }
 *   fetch-error   -> { ok: false, hits: [], error: "fetch-error:..." }
 *   timeout/abort -> { ok: false, hits: [], error: "timeout" }
 *   http-NNN      -> { ok: false, hits: [], error: "http-NNN" }
 *   parse-error   -> { ok: false, hits: [], error: "parse-error" }
 *   no-result-arr -> { ok: false, hits: [], error: "no-result-array" }
 *   happy path    -> { ok: true, hits: [...], durationMs: number }
 *
 * payload-id priority (pickPayloadId):
 *   externalId > node_id > name > sourceFile > String(point.id)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  QdrantDenseRetrievalEngine,
  pickPayloadId,
} from "../engines/ai-training/QdrantDenseRetrievalEngine.js";

// ---------------------------------------------------------------------------
// Helpers to build minimal fake Response objects
// ---------------------------------------------------------------------------

function fakeResponse(status: number, body: unknown, ok?: boolean): Response {
  return {
    ok: ok !== undefined ? ok : status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

function stubFetch(impl: () => Promise<Response>) {
  vi.stubGlobal("fetch", vi.fn(impl));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("QdrantDenseRetrievalEngine", () => {
  let engine: QdrantDenseRetrievalEngine;

  beforeEach(() => {
    engine = new QdrantDenseRetrievalEngine();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // -------------------------------------------------------------------------
  // Degrade paths
  // -------------------------------------------------------------------------

  it("returns empty-vector error when vector is empty array", async () => {
    const result = await engine.search({ vector: [] });
    expect(result.ok).toBe(false);
    expect(result.error).toBe("empty-vector");
    expect(result.hits).toEqual([]);
  });

  it("returns empty-vector error when vector is not an array", async () => {
    // Type cast to exercise the runtime guard
    const result = await engine.search({ vector: null as unknown as number[] });
    expect(result.ok).toBe(false);
    expect(result.error).toBe("empty-vector");
    expect(result.hits).toEqual([]);
  });

  it("returns fetch-error degrade on network failure", async () => {
    stubFetch(() => Promise.reject(new Error("ECONNREFUSED")));
    const result = await engine.search({ vector: [0.1, 0.2] });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/^fetch-error:/);
    expect(result.hits).toEqual([]);
  });

  it("returns timeout degrade when AbortController fires", async () => {
    // Simulate an AbortError thrown by fetch
    stubFetch(() => {
      const err = new Error("The operation was aborted");
      err.name = "AbortError";
      return Promise.reject(err);
    });
    const result = await engine.search({ vector: [0.1, 0.2], timeoutMs: 1 });
    expect(result.ok).toBe(false);
    expect(result.error).toBe("timeout");
    expect(result.hits).toEqual([]);
  });

  it("returns http-NNN error on non-200 HTTP response", async () => {
    stubFetch(() => Promise.resolve(fakeResponse(503, {}, false)));
    const result = await engine.search({ vector: [0.1, 0.2] });
    expect(result.ok).toBe(false);
    expect(result.error).toBe("http-503");
    expect(result.hits).toEqual([]);
  });

  it("returns http-404 for a 404 response", async () => {
    stubFetch(() => Promise.resolve(fakeResponse(404, {}, false)));
    const result = await engine.search({ vector: [0.5] });
    expect(result.ok).toBe(false);
    expect(result.error).toBe("http-404");
  });

  it("returns parse-error when response body is not valid JSON", async () => {
    const badJsonResponse = {
      ok: true,
      status: 200,
      json: async () => { throw new SyntaxError("Unexpected token"); },
    } as unknown as Response;
    stubFetch(() => Promise.resolve(badJsonResponse));
    const result = await engine.search({ vector: [0.1, 0.2] });
    expect(result.ok).toBe(false);
    expect(result.error).toBe("parse-error");
    expect(result.hits).toEqual([]);
  });

  it("returns no-result-array when parsed body lacks result array", async () => {
    stubFetch(() => Promise.resolve(fakeResponse(200, { status: "ok" })));
    const result = await engine.search({ vector: [0.1, 0.2] });
    expect(result.ok).toBe(false);
    expect(result.error).toBe("no-result-array");
    expect(result.hits).toEqual([]);
  });

  it("returns no-result-array when result key is null", async () => {
    stubFetch(() => Promise.resolve(fakeResponse(200, { result: null })));
    const result = await engine.search({ vector: [0.1, 0.2] });
    expect(result.ok).toBe(false);
    expect(result.error).toBe("no-result-array");
  });

  // -------------------------------------------------------------------------
  // Happy path
  // -------------------------------------------------------------------------

  it("returns ok:true with normalized hits on successful response", async () => {
    const fakeResult = [
      { id: 1, score: 0.92, payload: { externalId: "engine:FooEngine", name: "FooEngine" } },
      { id: 2, score: 0.85, payload: { node_id: "eng.BarEngine" } },
    ];
    stubFetch(() => Promise.resolve(fakeResponse(200, { result: fakeResult })));
    const result = await engine.search({ vector: [0.1, 0.2, 0.3], limit: 5 });
    expect(result.ok).toBe(true);
    expect(result.hits).toHaveLength(2);
    expect(result.hits[0].id).toBe("engine:FooEngine"); // externalId wins
    expect(result.hits[0].score).toBeCloseTo(0.92);
    expect(result.hits[1].id).toBe("eng.BarEngine");    // node_id wins over numeric id
    expect(typeof result.durationMs).toBe("number");
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("returns empty hits array (ok:true) when result array is empty", async () => {
    stubFetch(() => Promise.resolve(fakeResponse(200, { result: [] })));
    const result = await engine.search({ vector: [0.5, 0.5] });
    expect(result.ok).toBe(true);
    expect(result.hits).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// pickPayloadId -- payload-id priority chain
// ---------------------------------------------------------------------------

describe("pickPayloadId", () => {
  it("prefers externalId over all other fields", () => {
    expect(pickPayloadId({
      id: 99,
      payload: { externalId: "engine:Foo", node_id: "eng.Foo", name: "Foo" },
    })).toBe("engine:Foo");
  });

  it("falls back to node_id when externalId absent", () => {
    expect(pickPayloadId({
      id: 99,
      payload: { node_id: "eng.Bar", name: "Bar" },
    })).toBe("eng.Bar");
  });

  it("falls back to name when node_id absent", () => {
    expect(pickPayloadId({
      id: 99,
      payload: { name: "BazEngine" },
    })).toBe("BazEngine");
  });

  it("falls back to sourceFile when name absent", () => {
    expect(pickPayloadId({
      id: 99,
      payload: { sourceFile: "src/engines/BazEngine.ts" },
    })).toBe("src/engines/BazEngine.ts");
  });

  it("falls back to String(point.id) when payload has no usable field", () => {
    expect(pickPayloadId({ id: 42, payload: {} })).toBe("42");
  });

  it("falls back to String(point.id) when payload is null", () => {
    expect(pickPayloadId({ id: 7, payload: null })).toBe("7");
  });

  it("returns 'unknown' when point has no id and no useful payload", () => {
    expect(pickPayloadId({ payload: null })).toBe("unknown");
  });

  it("ignores empty-string externalId and moves to node_id", () => {
    expect(pickPayloadId({
      id: 1,
      payload: { externalId: "", node_id: "eng.Qux" },
    })).toBe("eng.Qux");
  });
});
