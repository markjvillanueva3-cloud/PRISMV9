/**
 * WikiRAGFeatureEngine.test.ts
 * U-NN-FEAT04 — verifies RAG features extract correctly from the tribal
 * knowledge corpus, cache properly, and degrade gracefully when the corpus
 * is missing or empty.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  WikiRAGFeatureEngine,
  RAG_FEATURE_DIM,
  RAG_FEATURE_INDEX,
  wikiRAGFeatureEngine,
} from "../engines/WikiRAGFeatureEngine.js";
import type { OutcomeRecord } from "../engines/CrossProcessOutcomeStore.js";

const STORE_SCHEMA_VERSION = "1.1.0";

function makeRecord(partial: {
  process?: "mill" | "lathe" | "wedm";
  bridge?: "sf" | "post" | "feature" | "ai" | "router";
  request?: Record<string, unknown>;
}): OutcomeRecord {
  return {
    schemaVersion: STORE_SCHEMA_VERSION as never,
    id: "test",
    ts: "2026-05-07T00:00:00Z",
    bridge: (partial.bridge ?? "sf") as never,
    process: partial.process ?? "mill",
    request_summary: (partial.request ?? {}) as never,
    response_summary: {},
  };
}

describe("WikiRAGFeatureEngine", () => {
  beforeEach(() => {
    WikiRAGFeatureEngine.clearCache();
    WikiRAGFeatureEngine.reloadTips();
  });

  // ───────── shape ─────────

  it("returns Float64Array of length RAG_FEATURE_DIM (=8)", () => {
    const f = WikiRAGFeatureEngine.extractRAGFeatures(makeRecord({}));
    expect(f).toBeInstanceOf(Float64Array);
    expect(f.length).toBe(RAG_FEATURE_DIM);
    expect(RAG_FEATURE_DIM).toBe(8);
  });

  it("RAG_FEATURE_INDEX provides 8 distinct slot positions", () => {
    const positions = Object.values(RAG_FEATURE_INDEX);
    expect(positions.length).toBe(RAG_FEATURE_DIM);
    const distinct = new Set(positions);
    expect(distinct.size).toBe(positions.length);
    // All positions must be in [0, RAG_FEATURE_DIM)
    for (const p of positions) {
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThan(RAG_FEATURE_DIM);
    }
  });

  // ───────── graceful degradation ─────────

  it("returns all-zeros for an empty record (no material, no operation)", () => {
    const f = WikiRAGFeatureEngine.extractRAGFeatures(makeRecord({}));
    for (let i = 0; i < f.length; i++) {
      expect(f[i]).toBe(0);
    }
  });

  it("never throws on missing or malformed material/operation strings", () => {
    expect(() =>
      WikiRAGFeatureEngine.extractRAGFeatures(
        makeRecord({
          request: {
            material: undefined,
            operation: undefined,
          },
        }),
      ),
    ).not.toThrow();
    expect(() =>
      WikiRAGFeatureEngine.extractRAGFeatures(
        makeRecord({
          request: {
            material: "",
            operation: "",
          },
        }),
      ),
    ).not.toThrow();
  });

  it("never throws when called with the same record many times in a row (cache hits)", () => {
    const r = makeRecord({
      request: { material: "1018", operation: "milling" },
    });
    for (let i = 0; i < 50; i++) {
      const f = WikiRAGFeatureEngine.extractRAGFeatures(r);
      expect(f.length).toBe(RAG_FEATURE_DIM);
      for (let j = 0; j < f.length; j++) {
        expect(Number.isFinite(f[j])).toBe(true);
        expect(f[j]).toBeGreaterThanOrEqual(0);
      }
    }
  });

  // ───────── caching behavior ─────────

  it("LRU cache reuses results for identical (material, operation) keys", () => {
    const r1 = makeRecord({ request: { material: "1018", operation: "milling" } });
    const r2 = makeRecord({
      // Different record (id, ts), but same key fields → cache hit.
      request: { material: "1018", operation: "milling" },
    });
    const f1 = WikiRAGFeatureEngine.extractRAGFeatures(r1);
    const cacheBefore = WikiRAGFeatureEngine.cacheSize();
    const f2 = WikiRAGFeatureEngine.extractRAGFeatures(r2);
    const cacheAfter = WikiRAGFeatureEngine.cacheSize();

    expect(cacheAfter).toBe(cacheBefore); // No new cache entry
    // Both calls return arrays with identical contents.
    for (let i = 0; i < f1.length; i++) {
      expect(f1[i]).toBe(f2[i]);
    }
  });

  it("LRU cache creates separate entries for different (material, operation) keys", () => {
    WikiRAGFeatureEngine.extractRAGFeatures(
      makeRecord({ request: { material: "1018", operation: "milling" } }),
    );
    const sizeAfter1 = WikiRAGFeatureEngine.cacheSize();
    WikiRAGFeatureEngine.extractRAGFeatures(
      makeRecord({ request: { material: "Ti-6Al-4V", operation: "turning" } }),
    );
    const sizeAfter2 = WikiRAGFeatureEngine.cacheSize();
    expect(sizeAfter2).toBeGreaterThan(sizeAfter1);
  });

  it("clearCache empties the LRU cache", () => {
    WikiRAGFeatureEngine.extractRAGFeatures(
      makeRecord({ request: { material: "1018", operation: "milling" } }),
    );
    expect(WikiRAGFeatureEngine.cacheSize()).toBeGreaterThan(0);
    WikiRAGFeatureEngine.clearCache();
    expect(WikiRAGFeatureEngine.cacheSize()).toBe(0);
  });

  // ───────── feature semantics ─────────

  it("tip_count slot is non-negative and clipped to a sane upper bound", () => {
    const f = WikiRAGFeatureEngine.extractRAGFeatures(
      makeRecord({ request: { material: "steel", operation: "milling" } }),
    );
    const TIP_COUNT_CLIP = 50;
    expect(f[RAG_FEATURE_INDEX.TIP_COUNT]).toBeGreaterThanOrEqual(0);
    expect(f[RAG_FEATURE_INDEX.TIP_COUNT]).toBeLessThanOrEqual(TIP_COUNT_CLIP);
  });

  it("confidence slots are bounded in [0, 1]", () => {
    const f = WikiRAGFeatureEngine.extractRAGFeatures(
      makeRecord({ request: { material: "1018", operation: "milling" } }),
    );
    expect(f[RAG_FEATURE_INDEX.TOP_CONFIDENCE]).toBeGreaterThanOrEqual(0);
    expect(f[RAG_FEATURE_INDEX.TOP_CONFIDENCE]).toBeLessThanOrEqual(1);
    expect(f[RAG_FEATURE_INDEX.AVG_CONFIDENCE]).toBeGreaterThanOrEqual(0);
    expect(f[RAG_FEATURE_INDEX.AVG_CONFIDENCE]).toBeLessThanOrEqual(1);
  });

  it("avg_confidence ≤ top_confidence (mean cannot exceed max)", () => {
    const f = WikiRAGFeatureEngine.extractRAGFeatures(
      makeRecord({ request: { material: "1018", operation: "milling" } }),
    );
    expect(f[RAG_FEATURE_INDEX.AVG_CONFIDENCE]).toBeLessThanOrEqual(
      f[RAG_FEATURE_INDEX.TOP_CONFIDENCE] + 1e-9,
    );
  });

  it("category indicators are binary (0 or 1) — five mutually independent slots", () => {
    const f = WikiRAGFeatureEngine.extractRAGFeatures(
      makeRecord({ request: { material: "1018", operation: "milling" } }),
    );
    const categorySlots = [
      RAG_FEATURE_INDEX.CATEGORY_FORCE,
      RAG_FEATURE_INDEX.CATEGORY_SURFACE,
      RAG_FEATURE_INDEX.CATEGORY_CHATTER,
      RAG_FEATURE_INDEX.CATEGORY_THERMAL,
      RAG_FEATURE_INDEX.CATEGORY_TOOL_LIFE,
    ];
    for (const slot of categorySlots) {
      const v = f[slot];
      expect(v === 0 || v === 1).toBe(true);
    }
    expect(categorySlots.length).toBe(5);
  });

  // ───────── determinism ─────────

  it("extract is pure: same record produces identical output across calls", () => {
    const r = makeRecord({
      request: { material: "Inconel 718", operation: "turning" },
    });
    const f1 = WikiRAGFeatureEngine.extractRAGFeatures(r);
    WikiRAGFeatureEngine.clearCache(); // Force re-compute, not cache hit.
    const f2 = WikiRAGFeatureEngine.extractRAGFeatures(r);
    for (let i = 0; i < RAG_FEATURE_DIM; i++) {
      expect(f1[i]).toBe(f2[i]);
    }
  });

  // ───────── singleton ─────────

  it("singleton export is a working instance", () => {
    expect(wikiRAGFeatureEngine).toBeInstanceOf(WikiRAGFeatureEngine);
  });

  // ───────── per-record query time (cache effectiveness) ─────────

  it("100 queries against the same key complete in <100ms total (cache effective)", () => {
    const r = makeRecord({
      request: { material: "1018", operation: "milling" },
    });
    // Prime cache.
    WikiRAGFeatureEngine.extractRAGFeatures(r);
    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      WikiRAGFeatureEngine.extractRAGFeatures(r);
    }
    const elapsed = performance.now() - start;
    // 100 cache hits should be way under 100ms — well-cached at ~1 μs/call.
    expect(elapsed).toBeLessThan(100);
  });

  // ───────── tips-loaded introspection ─────────

  it("tipsLoaded returns a finite non-negative count after first call", () => {
    WikiRAGFeatureEngine.extractRAGFeatures(makeRecord({}));
    const n = WikiRAGFeatureEngine.tipsLoaded();
    expect(Number.isFinite(n)).toBe(true);
    expect(n).toBeGreaterThanOrEqual(0);
  });
});
