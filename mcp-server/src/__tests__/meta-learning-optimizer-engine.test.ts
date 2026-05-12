/**
 * Tests for MetaLearningOptimizerEngine (Phase 0.18 U-AGI4)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  MetaLearningOptimizerEngine,
  metaLearningOptimizerEngine,
} from "../engines/MetaLearningOptimizerEngine.js";

describe("MetaLearningOptimizerEngine", () => {
  let e: MetaLearningOptimizerEngine;

  beforeEach(() => {
    e = new MetaLearningOptimizerEngine();
  });

  describe("record()", () => {
    it("creates stats on first observation", () => {
      const s = e.record({ scenario: "pdf", strategy: "table-extract", success: true });
      expect(s.attempts).toBe(1);
      expect(s.successes).toBe(1);
    });

    it("accumulates attempts and successes", () => {
      e.record({ scenario: "pdf", strategy: "x", success: true });
      e.record({ scenario: "pdf", strategy: "x", success: false });
      const s = e.statsFor("pdf", "x")!;
      expect(s.attempts).toBe(2);
      expect(s.successes).toBe(1);
      expect(s.successRate).toBe(0.5);
    });

    it("averages duration incrementally", () => {
      e.record({ scenario: "pdf", strategy: "x", success: true, durationMs: 100 });
      e.record({ scenario: "pdf", strategy: "x", success: true, durationMs: 200 });
      expect(e.statsFor("pdf", "x")!.avgDurationMs).toBe(150);
    });

    it("rejects empty scenario/strategy", () => {
      expect(() => e.record({ scenario: "", strategy: "x", success: true })).toThrow();
      expect(() => e.record({ scenario: "x", strategy: "", success: true })).toThrow();
    });

    it("rejects negative duration", () => {
      expect(() => e.record({ scenario: "x", strategy: "y", success: true, durationMs: -1 })).toThrow();
    });
  });

  describe("wilsonLowerBound behavior", () => {
    it("is lower than successRate for small samples", () => {
      e.record({ scenario: "s", strategy: "A", success: true });
      const s = e.statsFor("s", "A")!;
      expect(s.wilsonLowerBound).toBeLessThan(s.successRate);
    });

    it("approaches successRate with many samples", () => {
      for (let i = 0; i < 200; i += 1) e.record({ scenario: "s", strategy: "A", success: true });
      const s = e.statsFor("s", "A")!;
      expect(s.wilsonLowerBound).toBeGreaterThan(0.9);
    });

    it("is 0 for zero successes", () => {
      e.record({ scenario: "s", strategy: "A", success: false });
      expect(e.statsFor("s", "A")!.wilsonLowerBound).toBe(0);
    });
  });

  describe("recommend()", () => {
    it("returns null when no data for scenario", () => {
      expect(e.recommend("missing")).toBeNull();
    });

    it("ranks strategies by Wilson lower bound first", () => {
      // A: 10/10, B: 1/1 → B has higher successRate but A has higher Wilson LB
      for (let i = 0; i < 10; i += 1) e.record({ scenario: "s", strategy: "A", success: true });
      e.record({ scenario: "s", strategy: "B", success: true });
      expect(e.recommend("s")!.strategy).toBe("A");
    });

    it("breaks ties by success rate then duration", () => {
      e.record({ scenario: "s", strategy: "A", success: true, durationMs: 100 });
      e.record({ scenario: "s", strategy: "B", success: true, durationMs: 50 });
      expect(e.recommend("s")!.strategy).toBe("B");
    });

    it("respects minAttempts filter", () => {
      e.record({ scenario: "s", strategy: "A", success: true });
      expect(e.recommend("s", 2)).toBeNull();
    });

    it("rejects empty scenario", () => {
      expect(() => e.recommend("")).toThrow();
    });

    it("rationale mentions Wilson bound", () => {
      e.record({ scenario: "s", strategy: "A", success: true });
      expect(e.recommend("s")?.rationale).toMatch(/Wilson/);
    });
  });

  describe("lifecycle helpers", () => {
    it("listScenarios returns unique sorted scenarios", () => {
      e.record({ scenario: "b", strategy: "x", success: true });
      e.record({ scenario: "a", strategy: "x", success: true });
      expect(e.listScenarios()).toEqual(["a", "b"]);
    });

    it("listAll returns detached copies", () => {
      e.record({ scenario: "a", strategy: "x", success: true });
      const all = e.listAll();
      (all[0] as unknown as { attempts: number }).attempts = 999;
      expect(e.statsFor("a", "x")?.attempts).toBe(1);
    });

    it("clear empties state", () => {
      e.record({ scenario: "a", strategy: "x", success: true });
      e.clear();
      expect(e.size()).toBe(0);
    });

    it("statsFor returns null for unknown pairs", () => {
      expect(e.statsFor("a", "b")).toBeNull();
    });
  });

  describe("module singleton", () => {
    it("exports a ready-to-use instance", () => {
      metaLearningOptimizerEngine.clear();
      metaLearningOptimizerEngine.record({ scenario: "s", strategy: "x", success: true });
      expect(metaLearningOptimizerEngine.size()).toBe(1);
      metaLearningOptimizerEngine.clear();
    });
  });
});
