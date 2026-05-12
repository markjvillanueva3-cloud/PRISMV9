/**
 * Tests for SemanticAssetIndexEngine (PP-INFRA-SEMANTIC-INDEX)
 *
 * Uses a stub Qdrant store + deterministic embedder so we can assert the
 * wiring without a running Qdrant instance.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  SemanticAssetIndexEngine,
  type IndexEmbedder,
  type IndexableAsset,
} from "../engines/SemanticAssetIndexEngine.js";
import type {
  QdrantVectorStoreEngine,
  Result,
  SearchHit,
  CollectionSpec,
  UpsertPoint,
  SearchOptions,
} from "../engines/QdrantVectorStoreEngine.js";

// ---------------------------------------------------------------------------

interface CapturedUpsert {
  collection: string;
  points: UpsertPoint[];
}

interface CapturedSearch extends SearchOptions {
  /* just the shape, for introspection */
}

function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}
function err<T>(error: string): Result<T> {
  return { ok: false, error };
}

class StubStore {
  collections: string[] = [];
  upserts: CapturedUpsert[] = [];
  searches: CapturedSearch[] = [];
  counts: Array<{ collection: string; filter: unknown }> = [];
  nextSearchHits: SearchHit[] = [];
  failNext: "ensure" | "upsert" | "search" | "count" | null = null;

  async ensureCollection(spec: CollectionSpec): Promise<Result<"created" | "exists">> {
    if (this.failNext === "ensure") {
      this.failNext = null;
      return err("ensure forced fail");
    }
    if (!this.collections.includes(spec.name)) {
      this.collections.push(spec.name);
      return ok("created");
    }
    return ok("exists");
  }

  async upsert(collection: string, points: readonly UpsertPoint[]): Promise<Result<number>> {
    if (this.failNext === "upsert") {
      this.failNext = null;
      return err("upsert forced fail");
    }
    this.upserts.push({ collection, points: [...points] });
    return ok(points.length);
  }

  async search(options: SearchOptions): Promise<Result<SearchHit[]>> {
    if (this.failNext === "search") {
      this.failNext = null;
      return err("search forced fail");
    }
    this.searches.push({ ...options });
    return ok(this.nextSearchHits);
  }

  async count(collection: string, filter?: Record<string, unknown>): Promise<Result<number>> {
    if (this.failNext === "count") {
      this.failNext = null;
      return err("count forced fail");
    }
    this.counts.push({ collection, filter });
    return ok(42);
  }
}

function stubEmbedder(dim: number, failOn?: string): IndexEmbedder {
  return {
    async embed(text: string) {
      if (failOn && text.includes(failOn)) {
        return { ok: false, vector: [], error: "synthetic failure" };
      }
      // deterministic "embedding": hash text into `dim` floats summing to something sensible
      const vector = Array.from({ length: dim }, (_, i) => ((text.charCodeAt(i % text.length) + i) % 17) / 17);
      return { ok: true, vector, error: null };
    },
  };
}

function wrongDimEmbedder(dim: number): IndexEmbedder {
  return {
    async embed() {
      return { ok: true, vector: new Array(dim).fill(0.1), error: null };
    },
  };
}

function asset(overrides: Partial<IndexableAsset> = {}): IndexableAsset {
  return {
    id: overrides.id ?? "engine-1",
    kind: overrides.kind ?? "engine",
    name: overrides.name ?? "Demo",
    description: overrides.description,
    tags: overrides.tags,
  };
}

// ---------------------------------------------------------------------------

describe("SemanticAssetIndexEngine", () => {
  let store: StubStore;
  let engine: SemanticAssetIndexEngine;

  beforeEach(() => {
    store = new StubStore();
    engine = new SemanticAssetIndexEngine(
      store as unknown as QdrantVectorStoreEngine,
      stubEmbedder(8),
      { collection: "assets", vectorSize: 8 }
    );
  });

  describe("construction", () => {
    it("rejects missing dependencies", () => {
      expect(
        () =>
          new SemanticAssetIndexEngine(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            undefined as any,
            stubEmbedder(8),
            { collection: "c", vectorSize: 8 }
          )
      ).toThrow(/store/);
      expect(
        () =>
          new SemanticAssetIndexEngine(
            store as unknown as QdrantVectorStoreEngine,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            undefined as any,
            { collection: "c", vectorSize: 8 }
          )
      ).toThrow(/embedder/);
    });

    it("rejects invalid config", () => {
      expect(
        () =>
          new SemanticAssetIndexEngine(
            store as unknown as QdrantVectorStoreEngine,
            stubEmbedder(8),
            { collection: "", vectorSize: 8 }
          )
      ).toThrow(/collection/);
      expect(
        () =>
          new SemanticAssetIndexEngine(
            store as unknown as QdrantVectorStoreEngine,
            stubEmbedder(8),
            { collection: "c", vectorSize: 0 }
          )
      ).toThrow(/vectorSize/);
    });
  });

  describe("ensureReady()", () => {
    it("creates the collection if missing", async () => {
      const r = await engine.ensureReady();
      expect(r.ok).toBe(true);
      expect(store.collections).toEqual(["assets"]);
    });

    it("propagates store failures", async () => {
      store.failNext = "ensure";
      const r = await engine.ensureReady();
      expect(r.ok).toBe(false);
    });
  });

  describe("indexAsset()", () => {
    it("rejects bad asset fields", async () => {
      await expect(() => engine.indexAsset(asset({ id: "" }))).rejects.toThrow(/id/);
      await expect(() => engine.indexAsset(asset({ kind: "" }))).rejects.toThrow(/kind/);
      await expect(() => engine.indexAsset(asset({ name: "" }))).rejects.toThrow(/name/);
    });

    it("uploads an upsert point with payload to the configured collection", async () => {
      const r = await engine.indexAsset(asset({ id: "e1", name: "A", description: "x", tags: ["k"] }));
      expect(r.ok).toBe(true);
      expect(store.upserts).toHaveLength(1);
      expect(store.upserts[0].collection).toBe("assets");
      // Qdrant requires UUID ids; original slug is preserved in payload.externalId.
      expect(store.upserts[0].points[0].id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
      );
      expect(store.upserts[0].points[0].payload?.externalId).toBe("e1");
      expect(store.upserts[0].points[0].vector.length).toBe(8);
      expect(store.upserts[0].points[0].payload?.kind).toBe("engine");
      expect(store.upserts[0].points[0].payload?.tags).toEqual(["k"]);
    });

    it("returns ok=false when embedder fails", async () => {
      const local = new SemanticAssetIndexEngine(
        store as unknown as QdrantVectorStoreEngine,
        stubEmbedder(8, "fail"),
        { collection: "assets", vectorSize: 8 }
      );
      const r = await local.indexAsset(asset({ id: "e2", name: "fail-me", description: "fail" }));
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toMatch(/embedder failed/);
    });

    it("rejects when embedder returns wrong dimension", async () => {
      const local = new SemanticAssetIndexEngine(
        store as unknown as QdrantVectorStoreEngine,
        wrongDimEmbedder(16),
        { collection: "assets", vectorSize: 8 }
      );
      const r = await local.indexAsset(asset());
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toMatch(/16-dim/);
    });

    it("propagates store upsert failure", async () => {
      store.failNext = "upsert";
      const r = await engine.indexAsset(asset());
      expect(r.ok).toBe(false);
    });
  });

  describe("indexBatch()", () => {
    it("rejects empty arrays", async () => {
      const r = await engine.indexBatch([]);
      expect(r.ok).toBe(false);
    });

    it("indexes all assets in a single upsert call", async () => {
      const r = await engine.indexBatch([
        asset({ id: "a1", name: "A" }),
        asset({ id: "a2", name: "B" }),
      ]);
      expect(r.ok).toBe(true);
      expect(store.upserts).toHaveLength(1);
      expect(store.upserts[0].points.length).toBe(2);
    });

    it("stops on first embedder failure and reports the offending id", async () => {
      const local = new SemanticAssetIndexEngine(
        store as unknown as QdrantVectorStoreEngine,
        stubEmbedder(8, "bomb"),
        { collection: "assets", vectorSize: 8 }
      );
      const r = await local.indexBatch([
        asset({ id: "ok", name: "A" }),
        asset({ id: "boom", name: "bomb" }),
      ]);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toMatch(/boom/);
    });

    it("validates each asset before embedding", async () => {
      await expect(() =>
        engine.indexBatch([asset({ id: "" })])
      ).rejects.toThrow(/id/);
    });
  });

  describe("search()", () => {
    it("rejects empty queries and bad limits", async () => {
      const empty = await engine.search("");
      expect(empty.ok).toBe(false);
      const badLimit = await engine.search("hello", 0);
      expect(badLimit.ok).toBe(false);
    });

    it("embeds the query and passes the vector + limit to the store", async () => {
      store.nextSearchHits = [
        { id: "e1", score: 0.9, payload: { kind: "engine", name: "A", tags: ["x"] } },
      ];
      const r = await engine.search("hello", 5);
      expect(r.ok).toBe(true);
      expect(store.searches).toHaveLength(1);
      expect(store.searches[0].limit).toBe(5);
      expect(store.searches[0].vector.length).toBe(8);
      if (r.ok) {
        expect(r.value[0].kind).toBe("engine");
        expect(r.value[0].tags).toEqual(["x"]);
      }
    });

    it("applies filterKind through the store filter", async () => {
      await engine.search("x", 3, "formula");
      expect(store.searches[0].filter).toMatchObject({
        must: [{ key: "kind", match: { value: "formula" } }],
      });
    });

    it("returns store errors verbatim", async () => {
      store.failNext = "search";
      const r = await engine.search("q");
      expect(r.ok).toBe(false);
    });

    it("propagates dimension mismatch from the embedder", async () => {
      const local = new SemanticAssetIndexEngine(
        store as unknown as QdrantVectorStoreEngine,
        wrongDimEmbedder(4),
        { collection: "assets", vectorSize: 8 }
      );
      const r = await local.search("q");
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toMatch(/dim/);
    });

    it("normalizes missing payload fields", async () => {
      store.nextSearchHits = [{ id: "e2", score: 0.5 }];
      const r = await engine.search("x");
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.value[0].kind).toBe("unknown");
        expect(r.value[0].name).toBe("");
        expect(r.value[0].tags).toEqual([]);
      }
    });
  });

  describe("count()", () => {
    it("delegates to the store with an optional kind filter", async () => {
      const r1 = await engine.count();
      expect(r1.ok).toBe(true);
      expect(store.counts[0].filter).toBeUndefined();

      const r2 = await engine.count("engine");
      expect(r2.ok).toBe(true);
      expect(store.counts[1].filter).toMatchObject({
        must: [{ key: "kind", match: { value: "engine" } }],
      });
    });

    it("propagates store failures", async () => {
      store.failNext = "count";
      const r = await engine.count();
      expect(r.ok).toBe(false);
    });
  });

  describe("getConfig()", () => {
    it("returns the active config", () => {
      expect(engine.getConfig()).toEqual({ collection: "assets", vectorSize: 8 });
    });
  });
});
