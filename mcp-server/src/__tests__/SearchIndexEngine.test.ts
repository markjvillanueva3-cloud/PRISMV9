/**
 * SearchIndexEngine tests -- Phase 2 of INFRA-SYNERGY-RESEARCH-2026-06-25.
 *
 * Validates the fail-soft Elasticsearch client against a MOCKED fetch (no live
 * cluster needed). R15 matrix: happy + >=3 failure modes + >=2 adversarial +
 * backend-flag + input-validation. The live round-trip is opt-in
 * (PRISM_ES_LIVE=1) so CI/Docker-down runs skip it -- it is NOT a substitute
 * for the mocked coverage; it proves the wire end-to-end when a cluster exists.
 *
 * NOTE (R12): with no live ES this suite validates the engine's CONTRACT, not
 * a real ES round-trip. The live backfill + parity gate are deferred to when a
 * cluster is up (INFRA-SYNERGY-PHASE2-ELASTICSEARCH-DESIGN.md sec 6).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SearchIndexEngine } from "../engines/SearchIndexEngine.js";

function mockRes(status: number, body: unknown) {
  const text = typeof body === "string" ? body : JSON.stringify(body);
  return { ok: status >= 200 && status < 300, status, text: async () => text };
}

function setFetch(fn: (...args: unknown[]) => unknown) {
  (globalThis as { fetch: unknown }).fetch = fn as unknown as typeof fetch;
}

describe("SearchIndexEngine (mocked fetch)", () => {
  const ES = "http://localhost:9200";
  let engine: SearchIndexEngine;
  let realFetch: typeof fetch;

  beforeEach(() => {
    engine = new SearchIndexEngine(ES);
    realFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
    delete process.env.PRISM_SEARCH_BACKEND;
  });

  // ---- HAPPY PATH ----
  it("index() upserts valid docs via _bulk and reports the count", async () => {
    const fetchMock = vi.fn(async () => mockRes(200, { errors: false, items: [{ index: {} }, { index: {} }] }));
    setFetch(fetchMock);
    const res = await engine.index("prism-graph-nodes", [{ id: "a", label: "x" }, { id: "b", label: "y" }]);
    expect(res.ok).toBe(true);
    expect(res.indexed).toBe(2);
    expect(res.failed).toBe(0);
    // proves it hit the _bulk endpoint with ndjson, not a single giant body
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/_bulk");
    expect(String(init.body)).toContain('"_index":"prism-graph-nodes"');
  });

  it("query() maps ES hits to {id,score,source}", async () => {
    setFetch(vi.fn(async () => mockRes(200, {
      hits: { total: { value: 1 }, hits: [{ _id: "n1", _score: 4.2, _source: { label: "kc1.1 ref" } }] },
    })));
    const res = await engine.query("prism-graph-nodes", { q: "kc1.1", k: 5 });
    expect(res.ok).toBe(true);
    expect(res.fellBack).toBe(false);
    expect(res.total).toBe(1);
    expect(res.hits).toEqual([{ id: "n1", score: 4.2, source: { label: "kc1.1 ref" } }]);
  });

  // ---- FAILURE MODES (fail-soft, never throw) ----
  it("FAILURE 1: ES unreachable -> health/index/query fail soft, no throw", async () => {
    setFetch(vi.fn(async () => { throw new Error("ECONNREFUSED"); }));
    const h = await engine.health();
    expect(h.ok).toBe(false);
    expect(h.error).toContain("ECONNREFUSED");

    const idx = await engine.index("x", [{ id: "1" }]);
    expect(idx.ok).toBe(false);
    expect(idx.indexed).toBe(0); // never claims a write it did not achieve (the 2026-06-08 clobber lesson)

    const q = await engine.query("x", { q: "z" });
    expect(q.ok).toBe(false);
    expect(q.fellBack).toBe(true); // caller falls back to the file backend
    expect(q.hits).toEqual([]);
  });

  it("FAILURE 2: ES returns non-200 -> fail soft", async () => {
    setFetch(vi.fn(async () => mockRes(503, { error: { reason: "cluster unavailable" } })));
    const q = await engine.query("x", { q: "z" });
    expect(q.ok).toBe(false);
    expect(q.fellBack).toBe(true);
    expect(q.error).toContain("cluster unavailable");
  });

  it("FAILURE 3: malformed / id-less docs are skipped and counted as failed", async () => {
    const fetchMock = vi.fn(async () => mockRes(200, { errors: false, items: [{ index: {} }] }));
    setFetch(fetchMock);
    const res = await engine.index("x", [
      { id: "ok", v: 1 },     // valid
      null,                    // not an object
      5,                       // not an object
      ["arr"],                 // array, not a plain object
      { noId: true },          // missing id field
      { id: "" },              // empty id
    ]);
    expect(res.ok).toBe(true);
    expect(res.indexed).toBe(1);
    expect(res.failed).toBe(5);
    expect(fetchMock).toHaveBeenCalledTimes(1); // only the one valid doc was sent
  });

  it("FAILURE 4: a 200 with no items is UNVERIFIABLE -> fail-closed, never credited", async () => {
    // proxy-injected / truncated 200 body with no per-item detail (the 2026-06-08 clobber class)
    setFetch(vi.fn(async () => mockRes(200, { acknowledged: true })));
    const res = await engine.index("x", [{ id: "1" }, { id: "2" }]);
    expect(res.ok).toBe(false);
    expect(res.indexed).toBe(0);            // NEVER claims a write it did not verify
    expect(res.failed).toBe(2);             // indexed + failed === docs.length
    expect(res.error).toContain("unverifiable");
  });

  it("FAILURE 5: ES per-item errors count as failed, not indexed", async () => {
    setFetch(vi.fn(async () => mockRes(200, {
      errors: true,
      items: [{ index: {} }, { index: { error: { type: "mapper_parsing_exception" } } }],
    })));
    const res = await engine.index("x", [{ id: "good" }, { id: "bad" }]);
    expect(res.ok).toBe(true);
    expect(res.indexed).toBe(1);            // only the confirmed doc
    expect(res.failed).toBe(1);             // the rejected doc, invariant holds
  });

  // ---- ADVERSARIAL ----
  it("ADVERSARIAL 3: a mid-stream chunk failure keeps indexed + failed === doc count", async () => {
    let call = 0;
    setFetch(vi.fn(async () => {
      call++;
      if (call === 1) return mockRes(200, { errors: false, items: new Array(500).fill({ index: {} }) });
      return mockRes(503, { error: { reason: "node down mid-batch" } }); // chunk 2 fails
    }));
    const docs = Array.from({ length: 1200 }, (_, i) => ({ id: `d${i}` }));
    const res = await engine.index("x", docs, { chunkSize: 500 });
    expect(res.ok).toBe(false);
    expect(res.indexed).toBe(500);          // only chunk 1 confirmed
    expect(res.indexed + res.failed).toBe(1200); // no doc silently dropped from the accounting
  });

  it("ADVERSARIAL 4: an items array LONGER than the chunk is unverifiable (no over-credit)", async () => {
    // proxy-injected / malformed 200: 4 items returned for a 2-doc submit
    setFetch(vi.fn(async () => mockRes(200, { errors: false, items: [{ index: {} }, { index: {} }, { index: {} }, { index: {} }] })));
    const res = await engine.index("x", [{ id: "1" }, { id: "2" }]);
    expect(res.ok).toBe(false);
    expect(res.indexed).toBe(0);                  // count mismatch -> fail closed, NEVER over-credit
    expect(res.indexed).toBeLessThanOrEqual(2);   // never exceeds docs submitted
    expect(res.failed).toBeGreaterThanOrEqual(0); // accounting never goes negative
    expect(res.indexed + res.failed).toBe(2);
  });

  it("ADVERSARIAL 1: a large batch is chunked (never one giant string body)", async () => {
    const fetchMock = vi.fn(async (_url: unknown, init: unknown) => {
      const lines = String((init as RequestInit).body).trim().split("\n");
      return mockRes(200, { errors: false, items: new Array(lines.length / 2).fill({ index: {} }) });
    });
    setFetch(fetchMock);
    const docs = Array.from({ length: 1200 }, (_, i) => ({ id: `d${i}`, n: i }));
    const res = await engine.index("x", docs, { chunkSize: 500 });
    expect(res.indexed).toBe(1200);
    expect(res.failed).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(3); // ceil(1200/500) -> proves chunking, no 512MB string
  });

  it("ADVERSARIAL 2: empty query becomes match_all bounded by k (no crash)", async () => {
    const fetchMock = vi.fn(async () => mockRes(200, { hits: { total: 2, hits: [
      { _id: "a", _score: 1, _source: {} }, { _id: "b", _score: 1, _source: {} },
    ] } }));
    setFetch(fetchMock);
    const res = await engine.query("x", { q: "", k: 7 });
    expect(res.ok).toBe(true);
    expect(res.hits).toHaveLength(2);
    const body = JSON.parse(String((fetchMock.mock.calls[0] as [string, RequestInit])[1].body));
    expect(body.size).toBe(7);
    expect(body.query.bool.must).toEqual([{ match_all: {} }]);
  });

  // ---- BACKEND FLAG (zero-behavior-change default) ----
  it("backend flag defaults to 'file' (ES off until an operator flips it)", () => {
    delete process.env.PRISM_SEARCH_BACKEND;
    expect(engine.searchBackend()).toBe("file");
    expect(engine.isEsEnabled()).toBe(false);
    process.env.PRISM_SEARCH_BACKEND = "es";
    expect(engine.searchBackend()).toBe("es");
    expect(engine.isEsEnabled()).toBe(true);
  });

  // ---- INPUT VALIDATION (programmer error -> throw, like GrokClientEngine) ----
  it("rejects bad arguments by throwing", async () => {
    await expect(engine.index("", [])).rejects.toThrow(/indexName/);
    await expect(engine.index("x", "nope" as unknown as unknown[])).rejects.toThrow(/array/);
    await expect(engine.query("", {})).rejects.toThrow(/indexName/);
    await expect(engine.query("x", { k: 0 })).rejects.toThrow(/positive/);
  });
});

// ---- LIVE round-trip (opt-in; skipped unless a real cluster is up) ----
describe("SearchIndexEngine (live ES -- opt-in via PRISM_ES_LIVE=1)", () => {
  it.skipIf(process.env.PRISM_ES_LIVE !== "1")("indexes then queries a real cluster", async () => {
    const engine = new SearchIndexEngine(process.env.PRISM_ES_URL ?? "http://127.0.0.1:9200");
    const idx = `prism-test-${Date.now()}`;
    const wrote = await engine.index(idx, [{ id: "live1", label: "kienzle force model" }]);
    expect(wrote.ok).toBe(true);
    expect(wrote.indexed).toBe(1);
    // Poll until ES makes the doc searchable (refresh interval ~1s, longer under
    // load) -- a bounded poll instead of a flaky fixed sleep. Max ~6s.
    let found = await engine.query(idx, { q: "kienzle" });
    for (let i = 0; i < 20 && !found.hits.some((h) => h.id === "live1"); i++) {
      await new Promise((r) => setTimeout(r, 300));
      found = await engine.query(idx, { q: "kienzle" });
    }
    expect(found.ok).toBe(true);
    expect(found.hits.some((h) => h.id === "live1")).toBe(true);
  });
});
