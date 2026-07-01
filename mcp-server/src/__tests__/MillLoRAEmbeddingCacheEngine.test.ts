import { describe, it, expect, beforeEach } from "vitest";
import {
  MillLoRAEmbeddingCacheEngine,
  DEFAULT_MAX_ENTRIES,
  DEFAULT_SIMILARITY_THRESHOLD,
  DEFAULT_EMBEDDING_DIMENSION,
  type MillOpType,
  type MillFeatureSignature,
} from "../engines/MillLoRAEmbeddingCacheEngine.js";

let eng: MillLoRAEmbeddingCacheEngine;

beforeEach(() => {
  eng = new MillLoRAEmbeddingCacheEngine();
});

function vec(dim: number, fillVal: number): number[] {
  return Array.from({ length: dim }, () => fillVal);
}

function unitVec(dim: number, hotIndex: number): number[] {
  const v = new Array(dim).fill(0);
  v[hotIndex] = 1;
  return v;
}

describe("MillLoRAEmbeddingCacheEngine", () => {
  it("default config: max 1000, threshold 0.92, dim 768, LRU policy", () => {
    const c = eng.getConfig();
    expect(c.max_entries).toBe(DEFAULT_MAX_ENTRIES);
    expect(c.similarity_threshold).toBe(DEFAULT_SIMILARITY_THRESHOLD);
    expect(c.embedding_dimension).toBe(DEFAULT_EMBEDDING_DIMENSION);
    expect(c.eviction_policy).toBe("lru");
  });

  it("setConfig: partial override merges with defaults", () => {
    eng.setConfig({ max_entries: 50, similarity_threshold: 0.8 });
    const c = eng.getConfig();
    expect(c.max_entries).toBe(50);
    expect(c.similarity_threshold).toBe(0.8);
    expect(c.embedding_dimension).toBe(DEFAULT_EMBEDDING_DIMENSION);
  });

  it("cosineSimilarity: orthogonal vectors → 0", () => {
    expect(eng.cosineSimilarity([1, 0, 0], [0, 1, 0])).toBe(0);
  });

  it("cosineSimilarity: identical vectors → 1", () => {
    expect(eng.cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 5);
  });

  it("cosineSimilarity: opposite vectors → -1", () => {
    expect(eng.cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1, 5);
  });

  it("cosineSimilarity: dimension mismatch → 0", () => {
    expect(eng.cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
  });

  it("set: creates entry with id, created_at, last_accessed, op_type, feature_signature", () => {
    const e = eng.set("face mill SS304", vec(DEFAULT_EMBEDDING_DIMENSION, 0.1), {
      op_type: "face", feature_signature: "prismatic",
    });
    expect(e.input).toBe("face mill SS304");
    expect(e.op_type).toBe("face");
    expect(e.feature_signature).toBe("prismatic");
    expect(typeof e.id).toBe("string");
    expect(e.hit_count).toBe(0);
  });

  it("getExact: returns match + increments hit_count + bumps last_accessed", async () => {
    const e = eng.set("ABCD", vec(768, 1));
    const initialAccess = e.last_accessed;
    await new Promise(r => setTimeout(r, 5));
    const m = eng.getExact("ABCD");
    expect(m?.id).toBe(e.id);
    expect(m?.hit_count).toBe(1);
    expect((m?.last_accessed ?? 0)).toBeGreaterThan(initialAccess);
  });

  it("getExact: returns null + increments misses on no match", () => {
    eng.set("ABCD", vec(768, 1));
    const m = eng.getExact("MISSING");
    expect(m).toBeNull();
    const s = eng.getStats();
    expect(s.total_misses).toBe(1);
  });

  it("findSimilar: only matches above threshold (cosine >= 0.92)", () => {
    const v1 = unitVec(768, 0);
    const v2 = unitVec(768, 100); // orthogonal — 0 similarity
    eng.set("entry1", v1);
    eng.set("entry2", v2);
    const matches = eng.findSimilar(unitVec(768, 0));
    expect(matches.length).toBe(1);
    expect(matches[0].similarity).toBeCloseTo(1, 5);
  });

  it("findSimilar: matches sorted by similarity desc", () => {
    // 3 entries with descending similarity to query
    const q = [1, 0, 0, 0, ...new Array(764).fill(0)];
    const closest = [1, 0, 0, 0, ...new Array(764).fill(0)];
    const middle = [0.95, 0.31, 0, 0, ...new Array(764).fill(0)]; // ~0.95 cosine
    eng.setConfig({ similarity_threshold: 0.9 });
    eng.set("a", closest);
    eng.set("b", middle);
    const matches = eng.findSimilar(q);
    expect(matches.length).toBe(2);
    expect(matches[0].similarity).toBeGreaterThan(matches[1].similarity);
  });

  it("findSimilar: with limit caps result count", () => {
    eng.setConfig({ similarity_threshold: 0.5 });
    for (let i = 0; i < 5; i++) eng.set(`e${i}`, vec(768, 1));
    const m = eng.findSimilar(vec(768, 1), { limit: 2 });
    expect(m.length).toBe(2);
  });

  it("MILL-CANONICAL: op_type_filter restricts findSimilar to matching op_type", () => {
    eng.setConfig({ similarity_threshold: 0.5 });
    eng.set("face_entry", vec(768, 1), { op_type: "face" });
    eng.set("drill_entry", vec(768, 1), { op_type: "drill" });
    eng.set("contour_entry", vec(768, 1), { op_type: "contour" });
    const m = eng.findSimilar(vec(768, 1), { op_type_filter: "drill" });
    expect(m.length).toBe(1);
    expect(m[0].entry.op_type).toBe("drill");
  });

  it("MILL-CANONICAL: feature_signature_filter restricts to matching family", () => {
    eng.setConfig({ similarity_threshold: 0.5 });
    eng.set("prism_e", vec(768, 1), { feature_signature: "prismatic" });
    eng.set("mold_e", vec(768, 1), { feature_signature: "mold_3d" });
    const m = eng.findSimilar(vec(768, 1), { feature_signature_filter: "mold_3d" });
    expect(m.length).toBe(1);
    expect(m[0].entry.feature_signature).toBe("mold_3d");
  });

  it("MILL-CANONICAL: combined op_type + feature_signature filters AND together", () => {
    eng.setConfig({ similarity_threshold: 0.5 });
    eng.set("a", vec(768, 1), { op_type: "face", feature_signature: "prismatic" });
    eng.set("b", vec(768, 1), { op_type: "face", feature_signature: "mold_3d" });
    eng.set("c", vec(768, 1), { op_type: "drill", feature_signature: "prismatic" });
    const m = eng.findSimilar(vec(768, 1), {
      op_type_filter: "face", feature_signature_filter: "prismatic",
    });
    expect(m.length).toBe(1);
    expect(m[0].entry.input).toBe("a");
  });

  it("MILL-CANONICAL: listByMillTag finds entries without embedding search", () => {
    eng.set("a", vec(768, 1), { op_type: "5_axis_simul" });
    eng.set("b", vec(768, 2), { op_type: "5_axis_simul" });
    eng.set("c", vec(768, 3), { op_type: "drill" });
    const found = eng.listByMillTag({ op_type: "5_axis_simul" });
    expect(found.length).toBe(2);
    const ids = found.map(f => f.input).sort();
    expect(ids).toEqual(["a", "b"]);
  });

  it("LRU eviction: oldest last_accessed evicted when capacity full", async () => {
    eng.setConfig({ max_entries: 2 });
    eng.set("first", vec(768, 1));
    await new Promise(r => setTimeout(r, 5));
    eng.set("second", vec(768, 2));
    await new Promise(r => setTimeout(r, 5));
    eng.set("third", vec(768, 3));
    expect(eng.getStats().total_entries).toBe(2);
    expect(eng.getExact("first")).toBeNull();
    expect(eng.getExact("third")?.input).toBe("third");
  });

  it("LFU eviction: lowest hit_count evicted", () => {
    eng.setConfig({ max_entries: 2, eviction_policy: "lfu" });
    eng.set("popular", vec(768, 1));
    eng.set("rare", vec(768, 2));
    eng.getExact("popular");
    eng.getExact("popular");
    eng.set("newcomer", vec(768, 3)); // should evict "rare" (hit_count=0)
    expect(eng.getExact("rare")).toBeNull();
    expect(eng.getExact("popular")?.input).toBe("popular");
  });

  it("FIFO eviction: oldest created_at evicted", async () => {
    eng.setConfig({ max_entries: 2, eviction_policy: "fifo" });
    eng.set("oldest", vec(768, 1));
    await new Promise(r => setTimeout(r, 5));
    eng.set("middle", vec(768, 2));
    eng.getExact("oldest"); // doesn't help under FIFO
    await new Promise(r => setTimeout(r, 5));
    eng.set("newest", vec(768, 3));
    expect(eng.getExact("oldest")).toBeNull();
  });

  it("delete removes entry by id", () => {
    const e = eng.set("ABC", vec(768, 1));
    expect(eng.delete(e.id)).toBe(true);
    expect(eng.getStats().total_entries).toBe(0);
  });

  it("delete returns false for unknown id", () => {
    expect(eng.delete("MISSING")).toBe(false);
  });

  it("clear: empties cache and resets hit/miss counters", () => {
    eng.set("a", vec(768, 1));
    eng.getExact("a");
    eng.getExact("MISS");
    eng.clear();
    const s = eng.getStats();
    expect(s.total_entries).toBe(0);
    expect(s.total_hits).toBe(0);
    expect(s.total_misses).toBe(0);
  });

  it("getStats: hit_rate = hits / (hits + misses)", () => {
    eng.set("a", vec(768, 1));
    eng.getExact("a");        // hit
    eng.getExact("MISS");     // miss
    eng.getExact("a");        // hit
    const s = eng.getStats();
    expect(s.total_hits).toBe(2);
    expect(s.total_misses).toBe(1);
    expect(s.hit_rate).toBeCloseTo(2 / 3, 4);
  });

  it("MILL-CANONICAL: entries_by_op_type counts entries per tag", () => {
    eng.set("a", vec(768, 1), { op_type: "face" });
    eng.set("b", vec(768, 1), { op_type: "face" });
    eng.set("c", vec(768, 1), { op_type: "drill" });
    eng.set("d", vec(768, 1));
    const s = eng.getStats();
    expect(s.entries_by_op_type.face).toBe(2);
    expect(s.entries_by_op_type.drill).toBe(1);
    expect(s.entries_by_op_type.untagged).toBe(1);
  });

  it("MILL-CANONICAL: entries_by_feature_signature counts entries per family", () => {
    eng.set("a", vec(768, 1), { feature_signature: "prismatic" });
    eng.set("b", vec(768, 1), { feature_signature: "mold_3d" });
    eng.set("c", vec(768, 1), { feature_signature: "mold_3d" });
    const s = eng.getStats();
    expect(s.entries_by_feature_signature.prismatic).toBe(1);
    expect(s.entries_by_feature_signature.mold_3d).toBe(2);
  });

  it("memory_bytes_estimated scales with cache size + dimension", () => {
    eng.setConfig({ embedding_dimension: 128 });
    const empty = eng.getStats().memory_bytes_estimated;
    eng.set("a", vec(128, 1));
    eng.set("b", vec(128, 1));
    const filled = eng.getStats().memory_bytes_estimated;
    expect(empty).toBe(0);
    expect(filled).toBe(2 * (128 * 8 + 200));
  });

  it("setConfig with smaller max_entries triggers eviction down to new limit", () => {
    for (let i = 0; i < 10; i++) eng.set(`e${i}`, vec(768, i));
    eng.setConfig({ max_entries: 3 });
    expect(eng.getStats().total_entries).toBe(3);
  });

  it("getSummary: includes hit rate + memory + policy", () => {
    eng.set("a", vec(768, 1));
    const summary = eng.getSummary();
    expect(summary).toMatch(/Mill Embedding Cache Summary/);
    expect(summary).toMatch(/Entries: 1/);
    expect(summary).toMatch(/Policy: LRU/);
    expect(summary).toMatch(/Dimension: 768/);
  });

  it("variability ≥3 op types: face, 5_axis_simul, thread_mill — all 3 cached + retrievable by filter", () => {
    eng.set("face_op", vec(768, 1), { op_type: "face" });
    eng.set("5axis_op", vec(768, 1), { op_type: "5_axis_simul" });
    eng.set("thread_op", vec(768, 1), { op_type: "thread_mill" });
    const ops: MillOpType[] = ["face", "5_axis_simul", "thread_mill"];
    for (const ot of ops) {
      const m = eng.listByMillTag({ op_type: ot });
      expect(m.length).toBe(1);
    }
  });

  it("variability ≥3 feature signatures: prismatic, mold_3d, thin_wall — retrievable by filter", () => {
    eng.set("a", vec(768, 1), { feature_signature: "prismatic" });
    eng.set("b", vec(768, 1), { feature_signature: "mold_3d" });
    eng.set("c", vec(768, 1), { feature_signature: "thin_wall" });
    const sigs: MillFeatureSignature[] = ["prismatic", "mold_3d", "thin_wall"];
    for (const sig of sigs) {
      const m = eng.listByMillTag({ feature_signature: sig });
      expect(m.length).toBe(1);
    }
  });

  it("getBestMatch returns top result when above threshold, null otherwise", () => {
    eng.setConfig({ similarity_threshold: 0.99 });
    eng.set("a", unitVec(768, 0));
    const best = eng.getBestMatch(unitVec(768, 0));
    expect(best?.entry.input).toBe("a");
    expect(best?.similarity).toBeCloseTo(1, 5);
    // Orthogonal query → no match
    const noMatch = eng.getBestMatch(unitVec(768, 5));
    expect(noMatch).toBeNull();
  });

  it("reset: restores defaults + clears state", () => {
    eng.setConfig({ max_entries: 50, similarity_threshold: 0.5 });
    eng.set("a", vec(768, 1));
    eng.reset();
    expect(eng.getStats().total_entries).toBe(0);
    expect(eng.getConfig().max_entries).toBe(DEFAULT_MAX_ENTRIES);
    expect(eng.getConfig().similarity_threshold).toBe(DEFAULT_SIMILARITY_THRESHOLD);
  });

  it("entry id format: starts with 'emb-' + timestamp + random", () => {
    const e = eng.set("x", vec(768, 1));
    expect(e.id.startsWith("emb-")).toBe(true);
  });
});
