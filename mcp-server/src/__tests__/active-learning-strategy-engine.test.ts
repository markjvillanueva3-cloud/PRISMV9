/**
 * Tests for ActiveLearningStrategyEngine (Phase 0.18 U-AGI7)
 */

import { describe, it, expect } from "vitest";
import {
  ActiveLearningStrategyEngine,
  activeLearningStrategyEngine,
  type LearningCandidate,
} from "../engines/ActiveLearningStrategyEngine.js";

function candidate(overrides: Partial<LearningCandidate> = {}): LearningCandidate {
  return {
    id: overrides.id ?? "c1",
    topic: overrides.topic ?? "some topic",
    currentUncertainty: overrides.currentUncertainty ?? 0.5,
    expectedReduction: overrides.expectedReduction ?? 0.5,
    psiImpact: overrides.psiImpact,
    costMinutes: overrides.costMinutes ?? 30,
    tags: overrides.tags,
  };
}

describe("ActiveLearningStrategyEngine", () => {
  const engine = new ActiveLearningStrategyEngine();

  describe("validation", () => {
    it("rejects missing id/topic", () => {
      expect(() => engine.rank([candidate({ id: "" })])).toThrow(/id/);
      expect(() => engine.rank([candidate({ topic: "" })])).toThrow(/topic/);
    });

    it("rejects out-of-range uncertainty or reduction", () => {
      expect(() => engine.rank([candidate({ currentUncertainty: -0.1 })])).toThrow();
      expect(() => engine.rank([candidate({ currentUncertainty: 1.1 })])).toThrow();
      expect(() => engine.rank([candidate({ expectedReduction: -0.1 })])).toThrow();
      expect(() => engine.rank([candidate({ expectedReduction: 1.1 })])).toThrow();
    });

    it("rejects non-positive costMinutes", () => {
      expect(() => engine.rank([candidate({ costMinutes: 0 })])).toThrow(/costMinutes/);
      expect(() => engine.rank([candidate({ costMinutes: -5 })])).toThrow(/costMinutes/);
    });

    it("rejects duplicate ids", () => {
      expect(() => engine.rank([candidate({ id: "a" }), candidate({ id: "a" })])).toThrow(/duplicate/);
    });

    it("rejects non-finite psiImpact", () => {
      expect(() => engine.rank([candidate({ psiImpact: Infinity })])).toThrow(/psiImpact/);
    });
  });

  describe("infoGain", () => {
    it("is zero when currentUncertainty is 0", () => {
      const [r] = engine.rank([candidate({ currentUncertainty: 0 })]);
      expect(r.infoGain).toBe(0);
    });

    it("is zero when currentUncertainty is 1", () => {
      const [r] = engine.rank([candidate({ currentUncertainty: 1 })]);
      expect(r.infoGain).toBe(0);
    });

    it("peaks near maximum-uncertainty + full reduction", () => {
      const [r] = engine.rank([candidate({ currentUncertainty: 0.5, expectedReduction: 1 })]);
      expect(r.infoGain).toBeCloseTo(1, 3);
    });

    it("returns 0 when expectedReduction is 0", () => {
      const [r] = engine.rank([candidate({ expectedReduction: 0 })]);
      expect(r.infoGain).toBe(0);
    });
  });

  describe("ranking", () => {
    it("orders by score descending", () => {
      const ranked = engine.rank([
        candidate({ id: "slow", currentUncertainty: 0.5, expectedReduction: 0.9, costMinutes: 120 }),
        candidate({ id: "fast", currentUncertainty: 0.5, expectedReduction: 0.9, costMinutes: 10 }),
      ]);
      expect(ranked[0].id).toBe("fast");
      expect(ranked[0].rank).toBe(1);
    });

    it("psiImpact boosts score", () => {
      const low = engine.rank([
        candidate({ id: "a", currentUncertainty: 0.5, expectedReduction: 0.5 }),
        candidate({ id: "b", currentUncertainty: 0.5, expectedReduction: 0.5, psiImpact: 5 }),
      ]);
      expect(low[0].id).toBe("b");
    });

    it("breaks ties by id ascending", () => {
      const ranked = engine.rank([
        candidate({ id: "zeta", currentUncertainty: 0.5, expectedReduction: 0.5 }),
        candidate({ id: "alpha", currentUncertainty: 0.5, expectedReduction: 0.5 }),
      ]);
      expect(ranked[0].id).toBe("alpha");
    });

    it("assigns sequential rank numbers", () => {
      const ranked = engine.rank([
        candidate({ id: "a" }),
        candidate({ id: "b" }),
        candidate({ id: "c" }),
      ]);
      expect(ranked.map((r) => r.rank)).toEqual([1, 2, 3]);
    });
  });

  describe("summary()", () => {
    it("sums infoGain and picks the top topic", () => {
      const ranked = engine.rank([
        candidate({ id: "a", topic: "topic-a", currentUncertainty: 0.5, expectedReduction: 0.5 }),
        candidate({ id: "b", topic: "topic-b", currentUncertainty: 0.5, expectedReduction: 0.5, costMinutes: 1 }),
      ]);
      const s = engine.summary(ranked);
      expect(s.total).toBe(2);
      expect(s.topTopic).toBe("topic-b");
      expect(s.totalInfoGain).toBeGreaterThan(0);
    });

    it("handles empty input", () => {
      expect(engine.summary([])).toEqual({ total: 0, totalInfoGain: 0, topTopic: null });
    });
  });

  describe("module singleton", () => {
    it("exports a ready-to-use instance", () => {
      const ranked = activeLearningStrategyEngine.rank([candidate({ id: "s" })]);
      expect(ranked).toHaveLength(1);
    });
  });
});
