/**
 * Tests for ComplexityAwareRouterEngine (Phase 0.20 U-MATH11)
 */

import { describe, it, expect } from "vitest";
import {
  ComplexityAwareRouterEngine,
  complexityAwareRouterEngine,
} from "../engines/ComplexityAwareRouterEngine.js";

describe("ComplexityAwareRouterEngine", () => {
  const engine = new ComplexityAwareRouterEngine();

  describe("classification", () => {
    it("classifies polynomial problems as P", () => {
      const r = engine.classify({ name: "sort", polynomialKnown: true, sizeN: 1000 });
      expect(r.class).toBe("P");
      expect(r.approximate).toBe(false);
    });

    it("classifies NP-complete problems as NPC with full-search solver", () => {
      const r = engine.classify({ name: "3-SAT", npCompleteKnown: true, sizeN: 500 });
      expect(r.class).toBe("NPC");
      expect(r.solver).toMatch(/SAT|ILP/);
      expect(r.warn).toBe(true);
    });

    it("uses approximation when available for NPC", () => {
      const r = engine.classify({
        name: "vertex-cover",
        npCompleteKnown: true,
        approximableFactor: 2,
        sizeN: 500,
      });
      expect(r.approximate).toBe(true);
      expect(r.solver).toContain("approx");
    });

    it("classifies adversarial games as PSPACE", () => {
      const r = engine.classify({ gameLike: true });
      expect(r.class).toBe("PSPACE");
      expect(r.solver).toBe("alpha-beta");
      expect(r.warn).toBe(true);
    });

    it("refuses turing-complete problems as undecidable", () => {
      const r = engine.classify({ turingComplete: true });
      expect(r.class).toBe("undecidable");
      expect(r.solver).toBe("reject");
      expect(r.estimatedBudgetSeconds).toBe(0);
    });

    it("returns unknown when no feature hints provided", () => {
      const r = engine.classify({});
      expect(r.class).toBe("unknown");
      expect(r.rationale.join(" ")).toContain("more hints");
    });
  });

  describe("validation", () => {
    it("rejects negative sizeN", () => {
      expect(() => engine.classify({ sizeN: -1 })).toThrow(/sizeN/);
    });

    it("rejects approximableFactor ≤ 1", () => {
      expect(() => engine.classify({ approximableFactor: 1 })).toThrow(/approximableFactor/);
    });

    it("rejects contradictory feature hints", () => {
      expect(() =>
        engine.classify({ polynomialKnown: true, npCompleteKnown: true })
      ).toThrow(/contradict/);
    });
  });

  describe("warnings", () => {
    it("warns on large n for non-P problems", () => {
      const r = engine.classify({ npCompleteKnown: true, sizeN: 100000, approximableFactor: 2 });
      expect(r.warn).toBe(true);
      expect(r.rationale.some((s) => s.includes("large n"))).toBe(true);
    });

    it("does not warn on large n for polynomial problems", () => {
      const r = engine.classify({ polynomialKnown: true, sizeN: 100000 });
      expect(r.warn).toBe(false);
    });
  });

  describe("budget", () => {
    it("assigns a positive budget for solvable problems", () => {
      expect(engine.classify({ polynomialKnown: true, sizeN: 1000 }).estimatedBudgetSeconds).toBeGreaterThan(0);
      expect(engine.classify({ npCompleteKnown: true, sizeN: 20, approximableFactor: 2 }).estimatedBudgetSeconds).toBeGreaterThan(0);
    });

    it("scales P budget with sizeN but caps at 60s", () => {
      const tiny = engine.classify({ polynomialKnown: true, sizeN: 1 }).estimatedBudgetSeconds;
      const huge = engine.classify({ polynomialKnown: true, sizeN: 1e9 }).estimatedBudgetSeconds;
      expect(huge).toBeLessThanOrEqual(60);
      expect(huge).toBeGreaterThan(tiny);
    });
  });

  describe("module singleton", () => {
    it("exports a ready-to-use instance", () => {
      const r = complexityAwareRouterEngine.classify({ polynomialKnown: true });
      expect(r.class).toBe("P");
    });
  });
});
