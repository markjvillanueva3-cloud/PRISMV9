/**
 * Tests for FisherInformationEngine (Phase 0.25.3 U-MATH-B5)
 */

import { describe, it, expect } from "vitest";
import {
  FisherInformationEngine,
  fisherInformationEngine,
} from "../engines/FisherInformationEngine.js";

describe("FisherInformationEngine", () => {
  const engine = new FisherInformationEngine();

  describe("entropy()", () => {
    it("is 0 for a deterministic distribution", () => {
      expect(engine.entropy({ a: 1, b: 0 })).toBe(0);
    });

    it("is log2(N) for a uniform over N states", () => {
      expect(engine.entropy({ a: 1, b: 1, c: 1, d: 1 })).toBeCloseTo(2, 5);
    });

    it("accepts unnormalised counts", () => {
      expect(engine.entropy({ a: 3, b: 3 })).toBeCloseTo(1, 5);
    });

    it("rejects negative or non-finite mass", () => {
      expect(() => engine.entropy({ a: -1 })).toThrow(/non-negative/);
      expect(() => engine.entropy({ a: Infinity })).toThrow(/finite/);
    });

    it("rejects an empty distribution", () => {
      expect(() => engine.entropy({})).toThrow(/at least one/);
    });
  });

  describe("klDivergence()", () => {
    it("is 0 when P == Q", () => {
      expect(engine.klDivergence({ a: 1, b: 1 }, { a: 2, b: 2 })).toBe(0);
    });

    it("is Infinity when Q has zero where P has mass", () => {
      expect(engine.klDivergence({ a: 1, b: 1 }, { a: 1, b: 0 })).toBe(Number.POSITIVE_INFINITY);
    });

    it("is positive when distributions differ", () => {
      expect(engine.klDivergence({ a: 0.9, b: 0.1 }, { a: 0.5, b: 0.5 })).toBeGreaterThan(0);
    });

    it("is asymmetric: D(P‖Q) ≠ D(Q‖P) in general", () => {
      const ab = engine.klDivergence({ a: 0.9, b: 0.1 }, { a: 0.5, b: 0.5 });
      const ba = engine.klDivergence({ a: 0.5, b: 0.5 }, { a: 0.9, b: 0.1 });
      expect(ab).not.toBe(ba);
    });
  });

  describe("jsDivergence()", () => {
    it("is 0 when P == Q", () => {
      expect(engine.jsDivergence({ a: 1 }, { a: 1 })).toBe(0);
    });

    it("is 1 for disjoint-support distributions", () => {
      expect(engine.jsDivergence({ a: 1 }, { b: 1 })).toBe(1);
    });

    it("is symmetric", () => {
      const ab = engine.jsDivergence({ a: 0.9, b: 0.1 }, { a: 0.5, b: 0.5 });
      const ba = engine.jsDivergence({ a: 0.5, b: 0.5 }, { a: 0.9, b: 0.1 });
      expect(ab).toBeCloseTo(ba, 6);
    });

    it("always lies in [0, 1]", () => {
      const d = engine.jsDivergence({ a: 0.7, b: 0.3 }, { a: 0.2, b: 0.8 });
      expect(d).toBeGreaterThanOrEqual(0);
      expect(d).toBeLessThanOrEqual(1);
    });
  });

  describe("mutualInformation()", () => {
    it("is 0 for independent variables", () => {
      const joint = {
        x0: { y0: 25, y1: 25 },
        x1: { y0: 25, y1: 25 },
      };
      expect(engine.mutualInformation(joint)).toBeCloseTo(0, 5);
    });

    it("is positive when X perfectly predicts Y", () => {
      const joint = {
        x0: { y0: 50, y1: 0 },
        x1: { y0: 0, y1: 50 },
      };
      expect(engine.mutualInformation(joint)).toBeCloseTo(1, 5);
    });

    it("rejects non-finite / negative joint values", () => {
      expect(() =>
        engine.mutualInformation({ a: { b: -1 } })
      ).toThrow(/non-negative/);
    });

    it("returns 0 for an empty joint table", () => {
      expect(engine.mutualInformation({})).toBe(0);
    });
  });

  describe("maxEntropyDistribution()", () => {
    it("returns uniform over allowed outcomes", () => {
      const d = engine.maxEntropyDistribution(["a", "b", "c"]);
      for (const k of ["a", "b", "c"]) expect(d[k]).toBeCloseTo(1 / 3, 5);
    });

    it("excludes forbidden outcomes", () => {
      const d = engine.maxEntropyDistribution(["a", "b", "c"], ["b"]);
      expect(d.b).toBeUndefined();
      expect(d.a).toBeCloseTo(0.5, 5);
      expect(d.c).toBeCloseTo(0.5, 5);
    });

    it("rejects empty or all-forbidden outcomes", () => {
      expect(() => engine.maxEntropyDistribution([])).toThrow(/non-empty/);
      expect(() => engine.maxEntropyDistribution(["x"], ["x"])).toThrow(/forbidden/);
    });
  });

  describe("bernoulliFisherInformation()", () => {
    it("equals 1/(θ(1−θ))", () => {
      expect(engine.bernoulliFisherInformation(0.5)).toBeCloseTo(4, 5);
      expect(engine.bernoulliFisherInformation(0.1)).toBeCloseTo(1 / 0.09, 5);
    });

    it("is +∞ at the boundary", () => {
      expect(engine.bernoulliFisherInformation(0)).toBe(Number.POSITIVE_INFINITY);
      expect(engine.bernoulliFisherInformation(1)).toBe(Number.POSITIVE_INFINITY);
    });

    it("rejects θ outside [0, 1]", () => {
      expect(() => engine.bernoulliFisherInformation(-0.1)).toThrow(/theta/);
      expect(() => engine.bernoulliFisherInformation(1.5)).toThrow(/theta/);
    });
  });

  describe("cramerRaoLowerBound()", () => {
    it("is θ(1−θ)/n for Bernoulli MLE", () => {
      const lb = engine.cramerRaoLowerBound(0.3, 100);
      expect(lb).toBeCloseTo((0.3 * 0.7) / 100, 5);
    });

    it("returns 0 at the boundary where Fisher info is infinite", () => {
      expect(engine.cramerRaoLowerBound(0, 100)).toBe(0);
      expect(engine.cramerRaoLowerBound(1, 100)).toBe(0);
    });

    it("rejects non-positive sample size", () => {
      expect(() => engine.cramerRaoLowerBound(0.5, 0)).toThrow(/sampleSize/);
    });
  });

  describe("module singleton", () => {
    it("exports a ready-to-use instance", () => {
      expect(fisherInformationEngine.entropy({ a: 1 })).toBe(0);
    });
  });
});
