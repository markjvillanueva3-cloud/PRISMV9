/**
 * EmbeddingRouterEngine tests — HMEMV04. Exact arithmetic on routing scores.
 */
import { describe, it, expect } from "vitest";
import { EmbeddingRouterEngine, type CorpusProfile } from "../engines/EmbeddingRouterEngine.js";

const flat: CorpusProfile = {
  corpus_id: "flat", doc_count: 100,
  avg_hierarchy_depth: 1, avg_branching_factor: 3, has_taxonomy: false,
};
const deep: CorpusProfile = {
  corpus_id: "deep", doc_count: 1000,
  avg_hierarchy_depth: 5, avg_branching_factor: 15, has_taxonomy: true,
};

describe("EmbeddingRouterEngine.route", () => {
  it("routes flat corpus → euclidean with hyperbolic_score=0", () => {
    const d = EmbeddingRouterEngine.route(flat);
    expect(d.recommended_space).toBe("euclidean");
    expect(d.hyperbolic_score).toBe(0);
    expect(d.euclidean_score).toBe(1);
    expect(d.reason.includes("flat")).toBe(true);
  });

  it("routes deep+branched+taxonomic corpus → hyperbolic with score=1.1 (>0.5)", () => {
    const d = EmbeddingRouterEngine.route(deep);
    expect(d.recommended_space).toBe("hyperbolic");
    expect(d.hyperbolic_score).toBeCloseTo(1.1, 9);
    expect(d.euclidean_score).toBeCloseTo(-0.1, 9);
    expect(d.reason.includes("hierarchy")).toBe(true);
    expect(d.reason.includes("branching")).toBe(true);
    expect(d.reason.includes("taxonomy")).toBe(true);
  });

  it("routes depth-only corpus → euclidean (0.5 score not > 0.5)", () => {
    const p: CorpusProfile = { ...flat, avg_hierarchy_depth: 5 };
    const d = EmbeddingRouterEngine.route(p);
    expect(d.hyperbolic_score).toBe(0.5);
    expect(d.recommended_space).toBe("euclidean");
  });

  it("routes branching+taxonomy corpus → hyperbolic with score=0.6 (>0.5)", () => {
    const p: CorpusProfile = { ...flat, avg_branching_factor: 15, has_taxonomy: true };
    const d = EmbeddingRouterEngine.route(p);
    expect(d.hyperbolic_score).toBeCloseTo(0.6, 9);
    expect(d.recommended_space).toBe("hyperbolic");
  });

  it("rejects negative hierarchy depth (adversarial)", () => {
    expect(() => EmbeddingRouterEngine.route({ ...flat, avg_hierarchy_depth: -1 })).toThrow();
  });

  it("rejects NaN branching factor (adversarial)", () => {
    expect(() => EmbeddingRouterEngine.route({ ...flat, avg_branching_factor: NaN })).toThrow();
  });

  it("renderDecision emits cluster id + space + scores", () => {
    const md = EmbeddingRouterEngine.renderDecision(EmbeddingRouterEngine.route(deep));
    expect(md.includes("hyperbolic")).toBe(true);
    expect(md.includes("deep")).toBe(true);
    expect(md.includes("hyp=1.10")).toBe(true);
  });

  it("taxonomy-only signal contributes exactly 0.2 to hyperbolic score", () => {
    const p: CorpusProfile = { ...flat, has_taxonomy: true };
    const d = EmbeddingRouterEngine.route(p);
    expect(d.hyperbolic_score).toBe(0.2);
    expect(d.recommended_space).toBe("euclidean");
  });

  it("hierarchy-only signal contributes exactly 0.5 to hyperbolic score", () => {
    const p: CorpusProfile = { ...flat, avg_hierarchy_depth: 4 };
    const d = EmbeddingRouterEngine.route(p);
    expect(d.hyperbolic_score).toBe(0.5);
  });

  it("branching-only signal contributes exactly 0.4 to hyperbolic score", () => {
    const p: CorpusProfile = { ...flat, avg_branching_factor: 11 };
    const d = EmbeddingRouterEngine.route(p);
    expect(d.hyperbolic_score).toBe(0.4);
  });

  it("score boundary at threshold (depth == 3) stays euclidean (strict >)", () => {
    const p: CorpusProfile = { ...flat, avg_hierarchy_depth: 3 };
    const d = EmbeddingRouterEngine.route(p);
    expect(d.hyperbolic_score).toBe(0);
    expect(d.recommended_space).toBe("euclidean");
  });
});
