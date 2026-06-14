/**
 * HybridIndexEngine tests — HMEMV10. Asserts exact RRF arithmetic + ordering.
 */
import { describe, it, expect } from "vitest";
import { HybridIndexEngine, type RankedHit } from "../engines/HybridIndexEngine.js";

const h = (id: string, rank: number, score = 1): RankedHit => ({ entry_id: id, rank, score });

describe("HybridIndexEngine.fuse — RRF arithmetic", () => {
  it("doc in both lists ranks higher than doc in one list (k=60)", () => {
    const r = HybridIndexEngine.fuse(
      [h("both", 1), h("bm_only", 2)],
      [h("both", 1), h("sem_only", 2)],
    );
    expect(r[0].entry_id).toBe("both");
    // both: 1/(60+1) + 1/(60+1) = 2/61 ≈ 0.03279
    expect(r[0].rrf_score).toBeCloseTo(2 / 61, 9);
    expect(r[0].bm25_rank).toBe(1);
    expect(r[0].semantic_rank).toBe(1);
  });

  it("identical bm25 + semantic rankings produce sorted output by RRF DESC", () => {
    const r = HybridIndexEngine.fuse(
      [h("a", 1), h("b", 2), h("c", 3)],
      [h("a", 1), h("b", 2), h("c", 3)],
    );
    expect(r.map((x) => x.entry_id)).toEqual(["a", "b", "c"]);
    expect(r[0].final_rank).toBe(1);
    expect(r[1].final_rank).toBe(2);
    expect(r[2].final_rank).toBe(3);
  });

  it("respects custom k (smaller k → stronger top-hit boost)", () => {
    const r = HybridIndexEngine.fuse(
      [h("a", 1)], [h("a", 1)], { k: 10 },
    );
    expect(r[0].rrf_score).toBeCloseTo(2 / 11, 9);
  });

  it("topK truncates output exactly", () => {
    const r = HybridIndexEngine.fuse(
      [h("a", 1), h("b", 2), h("c", 3), h("d", 4)],
      [h("a", 1)], { topK: 2 },
    );
    expect(r).toHaveLength(2);
  });

  it("empty bm25 falls back to semantic-only ranking", () => {
    const r = HybridIndexEngine.fuse([], [h("only", 1)]);
    expect(r).toHaveLength(1);
    expect(r[0].entry_id).toBe("only");
    expect(r[0].bm25_rank === undefined).toBe(true);
    expect(r[0].semantic_rank).toBe(1);
  });

  it("rejects negative k (adversarial)", () => {
    expect(() => HybridIndexEngine.fuse([h("a", 1)], [], { k: -1 })).toThrow();
  });

  it("renderFusion shows entries with RRF scores + ranks", () => {
    const r = HybridIndexEngine.fuse([h("a", 1)], [h("a", 1)]);
    const md = HybridIndexEngine.renderFusion(r);
    expect(md.includes("[FUSION] 1 result(s)")).toBe(true);
    expect(md.includes("#1")).toBe(true);
    expect(md.includes("a")).toBe(true);
  });

  it("renderFusion of empty → exact '(empty)' banner", () => {
    expect(HybridIndexEngine.renderFusion([])).toBe("[FUSION] (empty)");
  });

  it("empty bm25 falls back to bm25-only ranking when semantic empty", () => {
    const r = HybridIndexEngine.fuse([h("a", 1), h("b", 2)], []);
    expect(r).toHaveLength(2);
    expect(r[0].entry_id).toBe("a");
  });

  it("rejects non-integer rank (zod adversarial)", () => {
    expect(() => HybridIndexEngine.fuse([{ entry_id: "x", rank: 1.5, score: 1 }], [])).toThrow();
  });

  it("doc only in semantic list scores from semantic only (rrf = 1/(k+rank))", () => {
    const r = HybridIndexEngine.fuse([], [h("sem_only", 1)], { k: 60 });
    expect(r[0].rrf_score).toBeCloseTo(1 / 61, 9);
    expect(r[0].bm25_rank === undefined).toBe(true);
  });
});
