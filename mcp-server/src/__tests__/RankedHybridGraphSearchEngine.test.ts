/**
 * RankedHybridGraphSearchEngine.test.ts — N1 ranked-hybrid-graph-search (slot:sierra).
 *
 * Verifies the orchestration re-ranks master-index hits by RRF-fusing the confidence
 * (lexical) ranking against the utilization (structural-importance) ranking. Uses an
 * injected query fn so fusion is exercised deterministically without the live index.
 */
import { describe, it, expect } from "vitest";
import {
  RankedHybridGraphSearchEngine,
  type RankedHybridResult,
} from "../engines/RankedHybridGraphSearchEngine.js";
import type { MasterIndexHit } from "../engines/MasterIndexEngine.js";

function hit(id: string, confidence: number, utilization: number, extra: Partial<MasterIndexHit> = {}): MasterIndexHit {
  return {
    source: "graph_node",
    id,
    label: id,
    confidence,
    utilization,
    buildClass: "wired",
    ...extra,
  };
}

/** Build an engine whose query() returns a fixed hit set (deterministic clock). */
function engineWith(hits: MasterIndexHit[], warnings: string[] = []) {
  return new RankedHybridGraphSearchEngine({
    query: async () => ({ hits, warnings }),
    now: () => "2026-05-29T00:00:00.000Z",
  });
}

describe("RankedHybridGraphSearchEngine.search", () => {
  it("re-ranks: a high-utilization mid-confidence hub beats a high-confidence isolated node", async () => {
    // A: top confidence (rank1) but worst utilization (rank3).
    // B: mid confidence (rank2) AND top utilization (rank1) -> best RRF blend.
    // C: worst confidence (rank3) + mid utilization (rank2).
    const eng = engineWith([
      hit("A.isolated", 0.95, 0.05),
      hit("B.hub", 0.70, 0.99),
      hit("C.minor", 0.40, 0.50),
    ]);
    const r = await eng.search("anything");
    expect(r.totalHits).toBe(3);
    // RRF(k=60): A = 1/61 + 1/63 = 0.032277; B = 1/62 + 1/61 = 0.032531; C = 1/63 + 1/62 = 0.032005
    // B wins (top of one list + 2nd of the other), A second, C third.
    expect(r.hits[0].id).toBe("B.hub");
    expect(r.hits[0].hybrid_rank).toBe(1);
    expect(r.hits[0].confidence_rank).toBe(2);
    expect(r.hits[0].utilization_rank).toBe(1);
    // monotonic non-increasing rrf
    for (let i = 1; i < r.hits.length; i++) {
      expect(r.hits[i - 1].rrf_score).toBeGreaterThanOrEqual(r.hits[i].rrf_score);
    }
  });

  it("preserves the original MasterIndexHit fields on each ranked hit", async () => {
    const eng = engineWith([hit("eng.foo", 0.9, 0.8, { path: "src/engines/Foo.ts", buildClass: "unwired", layer: "L7" })]);
    const r = await eng.search("foo");
    expect(r.hits[0].path).toBe("src/engines/Foo.ts");
    expect(r.hits[0].buildClass).toBe("unwired");
    expect(r.hits[0].layer).toBe("L7");
    expect(r.hits[0]).toHaveProperty("rrf_score");
  });

  it("dedupes the same id from multiple sources, keeping the strongest confidence", async () => {
    const eng = engineWith([
      hit("dup.id", 0.30, 0.10, { source: "engine" }),
      hit("dup.id", 0.80, 0.10, { source: "graph_node" }),
      hit("other.id", 0.50, 0.90),
    ]);
    const r = await eng.search("dup");
    expect(r.totalHits).toBe(2); // dup collapsed
    const dup = r.hits.find((h) => h.id === "dup.id");
    expect(dup?.confidence).toBe(0.80); // strongest kept
  });

  it("honors topK on the fused output", async () => {
    const eng = engineWith([
      hit("a", 0.9, 0.1), hit("b", 0.8, 0.2), hit("c", 0.7, 0.3), hit("d", 0.6, 0.4),
    ]);
    const r = await eng.search("x", { topK: 2 });
    expect(r.hits.length).toBe(2);
  });

  it("respects a custom rrfK and reports it", async () => {
    const eng = engineWith([hit("a", 0.9, 0.1), hit("b", 0.1, 0.9)]);
    const r = await eng.search("x", { rrfK: 10 });
    expect(r.rrfK).toBe(10);
  });

  // --- failure modes ---
  it("empty query -> empty result with warning, never throws", async () => {
    const eng = engineWith([hit("a", 0.9, 0.9)]);
    const r = await eng.search("   ");
    expect(r.totalHits).toBe(0);
    expect(r.warnings).toContain("empty query");
  });

  it("no hits -> empty result, preserves upstream warnings", async () => {
    const eng = engineWith([], ["index cold"]);
    const r = await eng.search("nothing matches");
    expect(r.totalHits).toBe(0);
    expect(r.warnings).toContain("index cold");
  });

  it("NaN/Infinity confidence or utilization coerces to 0, stays sortable", async () => {
    const eng = engineWith([
      hit("nan", Number.NaN, 0.5),
      hit("inf", Number.POSITIVE_INFINITY, 0.5),
      hit("ok", 0.6, 0.5),
    ]);
    const r = await eng.search("x");
    expect(r.totalHits).toBe(3);
    for (const h of r.hits) expect(Number.isFinite(h.rrf_score)).toBe(true);
  });

  it("drops ids longer than the 120-char fusion cap with a warning, never throws", async () => {
    const longId = "x".repeat(121);
    const eng = engineWith([hit(longId, 0.9, 0.9), hit("ok.id", 0.5, 0.5)]);
    const r = await eng.search("x");
    expect(r.totalHits).toBe(1);
    expect(r.hits[0].id).toBe("ok.id");
    expect(r.warnings.some((w) => w.includes("120"))).toBe(true);
  });

  it("skips malformed hits (null / missing id) without throwing", async () => {
    const eng = engineWith([
      hit("good", 0.7, 0.7),
      // @ts-expect-error intentional malformed input
      null,
      // @ts-expect-error intentional malformed input
      { source: "graph_node", label: "no id", confidence: 0.9, utilization: 0.9, buildClass: "wired" },
    ]);
    const r = await eng.search("x");
    expect(r.totalHits).toBe(1);
    expect(r.hits[0].id).toBe("good");
  });

  it("render() produces an audit string and handles empty", async () => {
    const eng = engineWith([hit("a", 0.9, 0.5)]);
    const r = await eng.search("x");
    const s = RankedHybridGraphSearchEngine.render(r);
    expect(s).toContain("RANKED-HYBRID");
    expect(s).toContain("a");
    expect(RankedHybridGraphSearchEngine.render({ query: "", totalHits: 0, hits: [], rrfK: 60, generatedAt: "", warnings: [] } as RankedHybridResult)).toContain("no hits");
  });
});
