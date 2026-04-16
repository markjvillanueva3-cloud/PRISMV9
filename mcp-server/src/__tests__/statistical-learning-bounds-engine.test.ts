/**
 * Tests for StatisticalLearningBoundsEngine (Phase 0.20 U-MATH5)
 */

import { describe, it, expect } from "vitest";
import {
  StatisticalLearningBoundsEngine,
  statisticalLearningBoundsEngine,
} from "../engines/StatisticalLearningBoundsEngine.js";

describe("StatisticalLearningBoundsEngine", () => {
  const engine = new StatisticalLearningBoundsEngine();

  describe("pacSampleComplexity()", () => {
    it("computes ⌈(1/ε)·(ln|H| + ln(1/δ))⌉", () => {
      const r = engine.pacSampleComplexity({ hypothesisClassSize: 100, epsilon: 0.1, delta: 0.05 });
      const expected = Math.ceil((1 / 0.1) * (Math.log(100) + Math.log(1 / 0.05)));
      expect(r.value).toBe(expected);
    });

    it("scales inversely with ε", () => {
      const a = engine.pacSampleComplexity({ hypothesisClassSize: 100, epsilon: 0.1, delta: 0.05 });
      const b = engine.pacSampleComplexity({ hypothesisClassSize: 100, epsilon: 0.01, delta: 0.05 });
      expect(b.value).toBeGreaterThan(a.value);
    });

    it("rejects invalid inputs", () => {
      expect(() => engine.pacSampleComplexity({ hypothesisClassSize: 0, epsilon: 0.1, delta: 0.1 })).toThrow(/H/);
      expect(() => engine.pacSampleComplexity({ hypothesisClassSize: 10, epsilon: 0, delta: 0.1 })).toThrow(/epsilon/);
      expect(() => engine.pacSampleComplexity({ hypothesisClassSize: 10, epsilon: 0.1, delta: 0 })).toThrow(/delta/);
    });
  });

  describe("vcBound()", () => {
    it("decreases with n (fixed d, δ)", () => {
      const small = engine.vcBound({ vcDim: 10, n: 100, delta: 0.05 });
      const big = engine.vcBound({ vcDim: 10, n: 10000, delta: 0.05 });
      expect(big.value).toBeLessThan(small.value);
    });

    it("increases with VC dimension (fixed n, δ)", () => {
      const low = engine.vcBound({ vcDim: 5, n: 1000, delta: 0.05 });
      const high = engine.vcBound({ vcDim: 100, n: 1000, delta: 0.05 });
      expect(high.value).toBeGreaterThan(low.value);
    });

    it("rejects invalid inputs", () => {
      expect(() => engine.vcBound({ vcDim: -1, n: 100, delta: 0.05 })).toThrow(/vcDim/);
      expect(() => engine.vcBound({ vcDim: 5, n: 0, delta: 0.05 })).toThrow(/n/);
      expect(() => engine.vcBound({ vcDim: 5, n: 100, delta: 1 })).toThrow(/delta/);
    });
  });

  describe("rademacherBound()", () => {
    it("matches the closed form 2·R̂ + 3·√(ln(2/δ)/(2n))", () => {
      const r = engine.rademacherBound({ empiricalRademacher: 0.1, n: 100, delta: 0.05 });
      const expected = 2 * 0.1 + 3 * Math.sqrt(Math.log(2 / 0.05) / 200);
      expect(r.value).toBeCloseTo(Math.round(expected * 10000) / 10000, 4);
    });

    it("rejects negative empirical Rademacher", () => {
      expect(() => engine.rademacherBound({ empiricalRademacher: -0.1, n: 100, delta: 0.05 })).toThrow();
    });

    it("rejects invalid n or δ", () => {
      expect(() => engine.rademacherBound({ empiricalRademacher: 0.1, n: 0, delta: 0.05 })).toThrow(/n/);
      expect(() => engine.rademacherBound({ empiricalRademacher: 0.1, n: 100, delta: 0 })).toThrow(/delta/);
    });
  });

  describe("pacBayesBound()", () => {
    it("matches √((KL + ln(n/δ))/(2(n-1)))", () => {
      const r = engine.pacBayesBound({ kl: 2, n: 100, delta: 0.05 });
      const expected = Math.sqrt((2 + Math.log(100 / 0.05)) / (2 * 99));
      expect(r.value).toBeCloseTo(Math.round(expected * 10000) / 10000, 4);
    });

    it("rejects n ≤ 1 and negative KL", () => {
      expect(() => engine.pacBayesBound({ kl: -1, n: 100, delta: 0.05 })).toThrow(/kl/);
      expect(() => engine.pacBayesBound({ kl: 1, n: 1, delta: 0.05 })).toThrow(/n/);
    });
  });

  describe("module singleton", () => {
    it("exports a ready-to-use instance", () => {
      const r = statisticalLearningBoundsEngine.vcBound({ vcDim: 10, n: 1000, delta: 0.05 });
      expect(r.value).toBeGreaterThan(0);
    });
  });
});
