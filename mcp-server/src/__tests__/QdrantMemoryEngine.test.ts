/**
 * Tests for QdrantMemoryEngine (PP-0.19-U-LLM4)
 *
 * Uses an in-memory fake QdrantVectorStoreEngine + deterministic embedder
 * so we exercise contract & error paths without a running Qdrant daemon.
 * Covers: embedder missing, store disconnected, remember→recall round
 * trip, multi-kind isolation, validation rejections, count, forgetAll,
 * vector size mismatch, and collection naming.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  QdrantMemoryEngine,
  qdrantMemoryEngine,
  MEMORY_KINDS,
  type MemoryKind,
  type Embedder,
} from "../engines/QdrantMemoryEngine.js";
import type {
  QdrantVectorStoreEngine,
  CollectionSpec,
  SearchHit,
  SearchOptions,
  UpsertPoint,
  Result,
} from "../engines/QdrantVectorStoreEngine.js";

// ── fake Qdrant ──────────────────────────────────────────────────────

interface StoredPoint {
  id: string | number;
  vector: number[];
  payload?: Record<string, unknown>;
}

function makeFakeStore(): QdrantVectorStoreEngine {
  const collections = new Map<string, StoredPoint[]>();
  let connected = true;

  function dot(a: number[], b: number[]): number {
    let s = 0;
    for (let i = 0; i < a.length && i < b.length; i++) s += a[i] * b[i];
    return s;
  }

  const fake = {
    isConnected: () => connected,
    async ensureCollection(
      spec: CollectionSpec,
    ): Promise<Result<"created" | "exists">> {
      if (!collections.has(spec.name)) {
        collections.set(spec.name, []);
        return { ok: true, value: "created" };
      }
      return { ok: true, value: "exists" };
    },
    async deleteCollection(name: string): Promise<Result<boolean>> {
      collections.delete(name);
      return { ok: true, value: true };
    },
    async upsert(
      collection: string,
      points: readonly UpsertPoint[],
    ): Promise<Result<number>> {
      const list = collections.get(collection) ?? [];
      for (const p of points) {
        const idx = list.findIndex((q) => q.id === p.id);
        const stored = { id: p.id, vector: [...p.vector], payload: p.payload };
        if (idx >= 0) list[idx] = stored;
        else list.push(stored);
      }
      collections.set(collection, list);
      return { ok: true, value: points.length };
    },
    async search(options: SearchOptions): Promise<Result<SearchHit[]>> {
      const list = collections.get(options.collection) ?? [];
      const scored: SearchHit[] = list
        .map((p) => ({
          id: p.id,
          score: dot(options.vector, p.vector),
          payload: p.payload,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, options.limit ?? 10);
      return { ok: true, value: scored };
    },
    async count(collection: string): Promise<Result<number>> {
      return { ok: true, value: collections.get(collection)?.length ?? 0 };
    },
    // test-only helpers dangling off the same object
    __setConnected(v: boolean) {
      connected = v;
    },
    __allCollections() {
      return Array.from(collections.keys()).sort();
    },
  } as unknown as QdrantVectorStoreEngine;

  return fake;
}

/** Tiny deterministic embedder: hash chars into fixed bins. */
function makeDeterministicEmbedder(size = 8): Embedder {
  return async (text: string) => {
    const vec = new Array<number>(size).fill(0);
    for (let i = 0; i < text.length; i++) {
      vec[i % size] += text.charCodeAt(i);
    }
    // normalize so dot products behave.
    const n = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
    return vec.map((v) => v / n);
  };
}

// ── tests ─────────────────────────────────────────────────────────────

describe("QdrantMemoryEngine", () => {
  let store: QdrantVectorStoreEngine;
  let engine: QdrantMemoryEngine;
  const embedder = makeDeterministicEmbedder(8);

  beforeEach(() => {
    store = makeFakeStore();
    engine = new QdrantMemoryEngine({
      store,
      embedder,
      vectorSize: 8,
      collectionPrefix: "test_mem",
    });
  });

  it("exports a singleton", () => {
    expect(qdrantMemoryEngine).toBeInstanceOf(QdrantMemoryEngine);
  });

  it("listKinds() matches MEMORY_KINDS constant", () => {
    expect(engine.listKinds()).toEqual(MEMORY_KINDS);
  });

  it("collectionFor() applies prefix and kind", () => {
    expect(engine.collectionFor("tip")).toBe("test_mem_tip");
  });

  it("remember() rejects with 'embedder not configured' when unset", async () => {
    engine.setEmbedder(null);
    const r = await engine.remember({
      kind: "tip",
      id: "t-1",
      text: "thin walls are squirrelly",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/embedder/);
  });

  it("remember() rejects when store is disconnected", async () => {
    (store as unknown as { __setConnected: (v: boolean) => void }).__setConnected(
      false,
    );
    const r = await engine.remember({
      kind: "tip",
      id: "t-1",
      text: "hello",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/not connected/);
  });

  it("remember→recall round trip returns the stored item with metadata", async () => {
    const put = await engine.remember({
      kind: "tip",
      id: "t-1",
      text: "thin wall milling uses light radial engagement",
      metadata: { source: "JM-DIE", tribal: true },
    });
    expect(put.ok).toBe(true);

    const got = await engine.recall({
      kind: "tip",
      query: "thin wall milling",
      limit: 3,
    });
    expect(got.ok).toBe(true);
    if (got.ok) {
      expect(got.value.length).toBe(1);
      expect(got.value[0].id).toBe("t-1");
      expect(got.value[0].text).toContain("thin wall");
      expect(got.value[0].metadata.source).toBe("JM-DIE");
      expect(typeof got.value[0].createdAt).toBe("string");
    }
  });

  it("collections are isolated by kind", async () => {
    await engine.remember({ kind: "tip", id: 1, text: "tip one" });
    await engine.remember({ kind: "outcome", id: 2, text: "scrapped part" });

    const tips = await engine.recall({ kind: "tip", query: "tip one" });
    const outcomes = await engine.recall({
      kind: "outcome",
      query: "scrapped part",
    });
    expect(tips.ok && tips.value.length).toBe(1);
    expect(outcomes.ok && outcomes.value.length).toBe(1);

    const cAll = (
      store as unknown as { __allCollections: () => string[] }
    ).__allCollections();
    expect(cAll).toContain("test_mem_tip");
    expect(cAll).toContain("test_mem_outcome");
  });

  it("recall() limit respects caller cap", async () => {
    for (let i = 0; i < 5; i++) {
      await engine.remember({
        kind: "note",
        id: i,
        text: `note ${i} shares keywords`,
      });
    }
    const r = await engine.recall({ kind: "note", query: "shares", limit: 2 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.length).toBe(2);
  });

  it("recall() rejects empty query", async () => {
    const r = await engine.recall({ kind: "tip", query: "" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/query/);
  });

  it("recall() rejects unknown kind", async () => {
    const r = await engine.recall({
      kind: "bogus" as MemoryKind,
      query: "x",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/unknown kind/);
  });

  it("remember() rejects empty text and missing id", async () => {
    const a = await engine.remember({ kind: "tip", id: "", text: "x" });
    const b = await engine.remember({ kind: "tip", id: "1", text: "  " });
    expect(a.ok).toBe(false);
    expect(b.ok).toBe(false);
  });

  it("remember() surfaces vector size mismatch", async () => {
    engine.setEmbedder(async () => [1, 2, 3]); // wrong dim
    const r = await engine.remember({ kind: "tip", id: 1, text: "x" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/vector/);
  });

  it("count() returns per-kind totals", async () => {
    await engine.remember({ kind: "tip", id: 1, text: "a" });
    await engine.remember({ kind: "tip", id: 2, text: "b" });
    await engine.remember({ kind: "outcome", id: 3, text: "c" });

    const tips = await engine.count("tip");
    expect(tips.ok && tips.value).toBe(2);
    const outcomes = await engine.count("outcome");
    expect(outcomes.ok && outcomes.value).toBe(1);
  });

  it("forgetAll() drops a collection and future count()s re-create it empty", async () => {
    await engine.remember({ kind: "tip", id: 1, text: "keep-then-drop" });
    const drop = await engine.forgetAll("tip");
    expect(drop.ok).toBe(true);
    const after = await engine.count("tip");
    expect(after.ok && after.value).toBe(0);
  });

  it("embedder failure surfaces as ok:false with cause", async () => {
    engine.setEmbedder(async () => {
      throw new Error("no ollama");
    });
    const r = await engine.remember({ kind: "tip", id: 1, text: "x" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toMatch(/embed failed/);
      expect(r.cause).toBeInstanceOf(Error);
    }
  });
});
