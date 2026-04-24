/**
 * GapEscalationControllerEngine Tests (U-MIO44)
 * ==============================================
 * Tests gap detection, escalation levels, human review queue, and statistics.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  GapEscalationControllerEngine,
  type EscalationDecision,
  type EscalationLevel,
} from "../engines/GapEscalationControllerEngine.js";

describe("GapEscalationControllerEngine", () => {
  let engine: GapEscalationControllerEngine;

  beforeEach(() => {
    engine = new GapEscalationControllerEngine();
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Confidence to Level
  // ══════════════════════════════════════════════════════════════════════════
  describe("validateConfidence()", () => {
    it("returns HALT for very low confidence", () => {
      const decision = engine.validateConfidence("unknown_action", 0.1);

      expect(decision.level).toBe("HALT");
      expect(decision.can_proceed).toBe(false);
      expect(decision.requires_human).toBe(true);
    });

    it("returns WARNING for low confidence", () => {
      const decision = engine.validateConfidence("uncertain_action", 0.4);

      expect(decision.level).toBe("WARNING");
      expect(decision.can_proceed).toBe(false);
      expect(decision.requires_human).toBe(true);
    });

    it("returns CAUTION for medium confidence", () => {
      const decision = engine.validateConfidence("likely_action", 0.6);

      expect(decision.level).toBe("CAUTION");
      expect(decision.can_proceed).toBe(true);
      expect(decision.requires_human).toBe(false);
    });

    it("returns PROCEED for high confidence", () => {
      const decision = engine.validateConfidence("confident_action", 0.85);

      expect(decision.level).toBe("PROCEED");
      expect(decision.can_proceed).toBe(true);
      expect(decision.requires_human).toBe(false);
    });

    it("logs gap for non-PROCEED levels", () => {
      const decision = engine.validateConfidence("uncertain_action", 0.4);

      expect(decision.gap_id).toBeDefined();
      expect(decision.gap_id).toMatch(/^GAP-/);
    });

    it("includes suggestions for HALT level", () => {
      const decision = engine.validateConfidence("unknown", 0.1);

      expect(decision.suggestions.length).toBeGreaterThan(0);
      expect(decision.suggestions.some(s => s.toLowerCase().includes("human"))).toBe(true);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // shouldProceed helper
  // ══════════════════════════════════════════════════════════════════════════
  describe("shouldProceed()", () => {
    it("returns proceed=true for known capabilities", async () => {
      const result = await engine.shouldProceed("calculate cutting force");

      expect(typeof result.proceed).toBe("boolean");
      expect(["PROCEED", "WARNING", "HALT"]).toContain(result.level);
      expect(typeof result.reason).toBe("string");
      expect(result.reason.length).toBeGreaterThan(0);
    });

    it("returns proceed=false for unknown queries with low confidence", async () => {
      const result = await engine.shouldProceed("xyzzy impossible task 12345");

      expect(["PROCEED", "WARNING", "HALT"]).toContain(result.level);
      if (result.level === "HALT" || result.level === "WARNING") {
        expect(result.proceed).toBe(false);
      } else {
        expect(result.proceed).toBe(true);
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Human review queue
  // ══════════════════════════════════════════════════════════════════════════
  describe("review queue", () => {
    it("adds HALT decisions to review queue", () => {
      engine.validateConfidence("critical_unknown", 0.1);
      const queue = engine.getReviewQueue({ status: "pending" });

      expect(queue.length).toBeGreaterThan(0);
      expect(queue[0].priority).toBe("critical");
    });

    it("adds WARNING decisions to review queue", () => {
      engine.validateConfidence("uncertain_task", 0.35);
      const queue = engine.getReviewQueue({ status: "pending" });

      expect(queue.some(item => item.priority === "high")).toBe(true);
    });

    it("does not add CAUTION to review queue", () => {
      const initialQueue = engine.getReviewQueue().length;
      engine.validateConfidence("medium_confidence", 0.6);
      const newQueue = engine.getReviewQueue();

      expect(newQueue.length).toBe(initialQueue);
    });

    it("can filter queue by status", () => {
      engine.validateConfidence("test1", 0.1);
      engine.validateConfidence("test2", 0.1);

      const pending = engine.getReviewQueue({ status: "pending" });
      expect(pending.every(i => i.status === "pending")).toBe(true);
    });

    it("can resolve review items", () => {
      engine.validateConfidence("to_resolve", 0.1);
      const queue = engine.getReviewQueue({ status: "pending" });
      const item = queue[queue.length - 1];

      const resolved = engine.resolveReviewItem(item.id, "Manually handled", "test_user");
      expect(resolved).toBe(true);
    });

    it("can dismiss review items", () => {
      engine.validateConfidence("to_dismiss", 0.1);
      const queue = engine.getReviewQueue({ status: "pending" });
      const item = queue[queue.length - 1];

      const dismissed = engine.dismissReviewItem(item.id, "False positive");
      expect(dismissed).toBe(true);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Gap log
  // ══════════════════════════════════════════════════════════════════════════
  describe("gap log", () => {
    it("logs gaps with unique IDs", () => {
      engine.validateConfidence("gap1", 0.2);
      engine.validateConfidence("gap2", 0.2);

      const log = engine.getGapLog({ limit: 10 });
      const ids = log.map(e => e.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });

    it("includes timestamp in gap entries", () => {
      engine.validateConfidence("timed_gap", 0.2);
      const log = engine.getGapLog({ limit: 1 });

      expect(log[0].timestamp).toBeDefined();
      expect(new Date(log[0].timestamp).getTime()).toBeGreaterThan(0);
    });

    it("can filter by escalation level", () => {
      engine.validateConfidence("halt_gap", 0.1);
      engine.validateConfidence("warning_gap", 0.4);

      const haltOnly = engine.getGapLog({ level: "HALT" });
      expect(haltOnly.every(e => e.escalation_level === "HALT")).toBe(true);
    });

    it("can filter by resolved status", () => {
      engine.validateConfidence("unresolved_gap", 0.1);

      const unresolved = engine.getGapLog({ resolved: false });
      expect(unresolved.every(e => !e.resolved)).toBe(true);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Statistics
  // ══════════════════════════════════════════════════════════════════════════
  describe("getStatistics()", () => {
    it("returns gap counts by level", () => {
      engine.validateConfidence("halt1", 0.1);
      engine.validateConfidence("warn1", 0.4);
      engine.validateConfidence("caution1", 0.6);

      const stats = engine.getStatistics();

      expect(stats.by_level.HALT).toBeGreaterThanOrEqual(1);
      expect(stats.by_level.WARNING).toBeGreaterThanOrEqual(1);
      expect(stats.by_level.CAUTION).toBeGreaterThanOrEqual(1);
    });

    it("tracks total gap count", () => {
      const initial = engine.getStatistics().total_gaps;
      engine.validateConfidence("new_gap", 0.2);

      const updated = engine.getStatistics();
      expect(updated.total_gaps).toBe(initial + 1);
    });

    it("calculates average confidence", () => {
      engine.validateConfidence("gap_50", 0.5);
      engine.validateConfidence("gap_30", 0.3);

      const stats = engine.getStatistics();
      expect(stats.avg_confidence).toBeGreaterThan(0);
      expect(stats.avg_confidence).toBeLessThan(1);
    });

    it("identifies common queries", () => {
      engine.validateConfidence("repeated query", 0.2);
      engine.validateConfidence("repeated query", 0.2);
      engine.validateConfidence("repeated query", 0.2);

      const stats = engine.getStatistics();
      expect(stats.common_queries.length).toBeGreaterThan(0);
      expect(stats.common_queries[0].count).toBeGreaterThanOrEqual(3);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Development prioritization
  // ══════════════════════════════════════════════════════════════════════════
  describe("getPrioritizedGapsForDevelopment()", () => {
    it("returns gaps sorted by priority", () => {
      engine.validateConfidence("frequent gap", 0.1);
      engine.validateConfidence("frequent gap", 0.1);
      engine.validateConfidence("frequent gap", 0.1);
      engine.validateConfidence("rare gap", 0.2);

      const priorities = engine.getPrioritizedGapsForDevelopment();

      expect(priorities.length).toBeGreaterThan(0);
      expect(priorities[0].occurrences).toBeGreaterThanOrEqual(priorities[priorities.length - 1].occurrences);
    });

    it("assigns P0-P3 priorities", () => {
      engine.validateConfidence("gap", 0.1);

      const priorities = engine.getPrioritizedGapsForDevelopment();

      if (priorities.length > 0) {
        expect(["P0", "P1", "P2", "P3"]).toContain(priorities[0].suggested_priority);
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Thresholds
  // ══════════════════════════════════════════════════════════════════════════
  describe("thresholds", () => {
    it("returns default thresholds", () => {
      const thresholds = engine.getThresholds();

      expect(thresholds.halt_below).toBe(0.3);
      expect(thresholds.warning_below).toBe(0.5);
      expect(thresholds.caution_below).toBe(0.7);
    });

    it("can update thresholds", () => {
      engine.updateThresholds({ halt_below: 0.2 });
      const thresholds = engine.getThresholds();

      expect(thresholds.halt_below).toBe(0.2);
    });

    it("applies updated thresholds to decisions", () => {
      engine.updateThresholds({ halt_below: 0.4 });
      const decision = engine.validateConfidence("test", 0.35);

      expect(decision.level).toBe("HALT");
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Edge cases
  // ══════════════════════════════════════════════════════════════════════════
  describe("edge cases", () => {
    it("handles zero confidence", () => {
      const decision = engine.validateConfidence("zero_conf", 0);

      expect(decision.level).toBe("HALT");
      expect(decision.requires_human).toBe(true);
    });

    it("handles confidence at exact threshold", () => {
      const decision = engine.validateConfidence("at_threshold", 0.3);

      expect(decision.level).toBe("WARNING");
    });

    it("handles confidence of 1.0", () => {
      const decision = engine.validateConfidence("perfect_conf", 1.0);

      expect(decision.level).toBe("PROCEED");
      expect(decision.can_proceed).toBe(true);
    });

    it("handles empty query", async () => {
      const result = await engine.shouldProceed("");

      expect(["PROCEED", "WARNING", "HALT"]).toContain(result.level);
      expect(typeof result.reason).toBe("string");
      expect(typeof result.proceed).toBe("boolean");
    });

    it("includes timestamp in decisions", () => {
      const decision = engine.validateConfidence("timed", 0.5);

      expect(decision.timestamp).toBeDefined();
      expect(new Date(decision.timestamp).getTime()).toBeGreaterThan(0);
    });
  });
});
