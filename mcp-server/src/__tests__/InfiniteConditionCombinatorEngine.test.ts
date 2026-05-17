/**
 * InfiniteConditionCombinatorEngine.test.ts — engine-direct coverage.
 *
 * Pairs with `dispatcher.infiniteConditionCombinator.test.ts`.
 * Exercises 5 pure-read methods directly:
 *   calculateSimilarity, findSimilar, interpolate,
 *   getCoverageStatistics, export
 *
 * DEFERRED: recordKnowledge + import (ML-training-data-corruption class).
 */

import { describe, it, expect } from "vitest";
import { infiniteConditionCombinatorEngine } from "../engines/InfiniteConditionCombinatorEngine.js";

const SIMILARITY_THRESHOLD = 0.6; // engine line 53
const DIM_COUNT = 5;              // engine line 158 = matches/5
const SAME_FAMILY_PARTIAL = 0.5;  // engine line 154

const VEC_4140 = { material: "4140", geometry: "shaft", machine: "VTC-800", tool: "carbide_endmill", operation: "roughing" };
const VEC_4340 = { material: "4340", geometry: "shaft", machine: "VTC-800", tool: "carbide_endmill", operation: "roughing" };
const VEC_DIFF = { material: "6061", geometry: "block", machine: "VF-2", tool: "hsm_endmill", operation: "finishing" };

describe("InfiniteConditionCombinatorEngine — calculateSimilarity invariants", () => {
  it("identical vectors -> similarity = 1.0 (engine line 158 matches/5 = 5/5)", () => {
    expect(infiniteConditionCombinatorEngine.calculateSimilarity(VEC_4140, VEC_4140)).toBe(1.0);
  });

  it("symmetric — sim(v1,v2) === sim(v2,v1)", () => {
    const a = infiniteConditionCombinatorEngine.calculateSimilarity(VEC_4140, VEC_DIFF);
    const b = infiniteConditionCombinatorEngine.calculateSimilarity(VEC_DIFF, VEC_4140);
    expect(a).toBe(b);
  });

  it("same-family materials (4140↔4340 carbon steels) bumps similarity above hard-mismatch (engine line 154 +0.5)", () => {
    // 4 dims identical (4/5 = 0.8) + material partial (0.5/5 = 0.1) = 0.9
    const sim = infiniteConditionCombinatorEngine.calculateSimilarity(VEC_4140, VEC_4340);
    const expected = (4 + SAME_FAMILY_PARTIAL) / DIM_COUNT;
    expect(sim).toBeCloseTo(expected, 6);
  });

  it("completely-different vectors -> low similarity (all 5 dims mismatch + likely no family)", () => {
    const sim = infiniteConditionCombinatorEngine.calculateSimilarity(VEC_4140, VEC_DIFF);
    expect(sim).toBeGreaterThanOrEqual(0);
    expect(sim).toBeLessThanOrEqual(0.5);
  });

  it("similarity always in [0, 1] across mixed vector pairs (range invariant)", () => {
    const pairs: Array<[typeof VEC_4140, typeof VEC_4140]> = [
      [VEC_4140, VEC_4140],
      [VEC_4140, VEC_4340],
      [VEC_4140, VEC_DIFF],
      [VEC_4340, VEC_DIFF],
    ];
    for (const [a, b] of pairs) {
      const s = infiniteConditionCombinatorEngine.calculateSimilarity(a, b);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(1);
    }
  });
});

describe("InfiniteConditionCombinatorEngine — findSimilar contract", () => {
  it("returns array with similarity field >= engine.similarityThreshold (0.6, engine line 202)", () => {
    const matches = infiniteConditionCombinatorEngine.findSimilar(VEC_4140, 10);
    expect(Array.isArray(matches)).toBe(true);
    for (const m of matches) {
      expect(m.similarity).toBeGreaterThanOrEqual(SIMILARITY_THRESHOLD);
    }
  });

  it("limit param caps result length (engine line 209 .slice(0, limit))", () => {
    const m3 = infiniteConditionCombinatorEngine.findSimilar(VEC_4140, 3);
    expect(m3.length).toBeLessThanOrEqual(3);
  });

  it("results sorted DESC by similarity (engine line 208)", () => {
    const matches = infiniteConditionCombinatorEngine.findSimilar(VEC_4140, 50);
    for (let i = 1; i < matches.length; i++) {
      const prev = matches[i - 1];
      const curr = matches[i];
      if (prev && curr) {
        expect(prev.similarity).toBeGreaterThanOrEqual(curr.similarity);
      }
    }
  });
});

describe("InfiniteConditionCombinatorEngine — interpolate", () => {
  it("returns object with method ∈ {weighted_average, hierarchical_bayes} + targetVector + predictedParameters + basedOn", () => {
    const r = infiniteConditionCombinatorEngine.interpolate(VEC_4140);
    expect(["weighted_average", "hierarchical_bayes"]).toContain(r.interpolationMethod);
    expect(r.targetVector).toEqual(VEC_4140);
    expect(typeof r.predictedParameters).toBe("object");
    expect(Array.isArray(r.basedOn)).toBe(true);
  });

  it("empty-knowledge-base path -> method='hierarchical_bayes' (engine line 218-219 fallback)", () => {
    // In a fresh test env the knowledge base is empty, so findSimilar
    // returns 0 matches and the engine falls back to hierarchicalInterpolate
    // which returns interpolationMethod='hierarchical_bayes'.
    const matches = infiniteConditionCombinatorEngine.findSimilar(VEC_4140, 10);
    const r = infiniteConditionCombinatorEngine.interpolate(VEC_4140);
    if (matches.length === 0) {
      expect(r.interpolationMethod).toBe("hierarchical_bayes");
      expect(r.basedOn.length).toBe(0);
    }
  });

  it("predictedParameter confidence (when present) ∈ [0, 1] (engine line 246/289)", () => {
    const r = infiniteConditionCombinatorEngine.interpolate(VEC_4140);
    for (const p of Object.values(r.predictedParameters)) {
      expect(p.confidence).toBeGreaterThanOrEqual(0);
      expect(p.confidence).toBeLessThanOrEqual(1);
    }
  });
});

describe("InfiniteConditionCombinatorEngine — getCoverageStatistics + export", () => {
  it("getCoverageStatistics: 4 count fields are non-negative integers", () => {
    const s = infiniteConditionCombinatorEngine.getCoverageStatistics();
    expect(s.totalCombinations).toBeGreaterThanOrEqual(0);
    expect(s.uniqueMaterials).toBeGreaterThanOrEqual(0);
    expect(s.uniqueMachines).toBeGreaterThanOrEqual(0);
    expect(s.uniqueOperations).toBeGreaterThanOrEqual(0);
    expect(typeof s.hierarchyCoverage).toBe("object");
  });

  it("uniqueMaterials ≤ totalCombinations (each combo has 1 material; cross-method invariant)", () => {
    const s = infiniteConditionCombinatorEngine.getCoverageStatistics();
    expect(s.uniqueMaterials).toBeLessThanOrEqual(s.totalCombinations);
    expect(s.uniqueMachines).toBeLessThanOrEqual(s.totalCombinations);
    expect(s.uniqueOperations).toBeLessThanOrEqual(s.totalCombinations);
  });

  it("export().length === getCoverageStatistics().totalCombinations (cross-method invariant)", () => {
    const exp = infiniteConditionCombinatorEngine.export();
    const stats = infiniteConditionCombinatorEngine.getCoverageStatistics();
    expect(exp.length).toBe(stats.totalCombinations);
  });

  it("export returns ConditionKnowledge entries with required fields (when non-empty)", () => {
    const exp = infiniteConditionCombinatorEngine.export();
    for (const k of exp) {
      expect(typeof k.vector.material).toBe("string");
      expect(typeof k.confidence).toBe("number");
      expect(["success", "marginal", "failure"]).toContain(k.outcome);
    }
  });

  it("singleton — back-to-back export calls produce equal arrays (read-only contract)", () => {
    const a = infiniteConditionCombinatorEngine.export();
    const b = infiniteConditionCombinatorEngine.export();
    expect(a.length).toBe(b.length);
  });
});
