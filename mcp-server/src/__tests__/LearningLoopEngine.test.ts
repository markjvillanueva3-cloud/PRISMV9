/**
 * LearningLoopEngine Test Suite
 * ==============================
 *
 * AGENT-MS2 U-AGT06 — Validates the continuous-improvement engine that
 * tracks corrections, recurrence, and verification.
 *
 * Note: Shares the singleton with AgentMemoryFabricEngine — tests clear
 * state between runs via clearAll().
 *
 * @milestone AGENT-MS2
 * @unit U-AGT06
 */

import { describe, it, expect, beforeEach } from "vitest";
import { learningLoopEngine } from "../engines/LearningLoopEngine.js";

beforeEach(async () => {
  await learningLoopEngine.clearAll();
});

describe("LearningLoopEngine", () => {
  // ── recordCorrection() ────────────────────────────────────────────────

  describe("recordCorrection()", () => {
    it("records a correction with default inference", async () => {
      const corr = await learningLoopEngine.recordCorrection(
        "Use 500 RPM",
        "Use 1500 RPM"
      );
      expect(corr.id).toBeDefined();
      expect(corr.incorrect).toBe("Use 500 RPM");
      expect(corr.correct).toBe("Use 1500 RPM");
      expect(corr.verified).toBe(false);
    });

    it("infers 'value' type when only numbers change", async () => {
      const corr = await learningLoopEngine.recordCorrection(
        "Feed rate is 0.15",
        "Feed rate is 0.20"
      );
      expect(corr.type).toBe("value");
    });

    it("infers 'safety' type when corrected text mentions maximum", async () => {
      const corr = await learningLoopEngine.recordCorrection(
        "Set rpm high",
        "Never exceed maximum spindle rpm"
      );
      expect(corr.type).toBe("safety");
    });

    it("accepts explicit type override", async () => {
      const corr = await learningLoopEngine.recordCorrection(
        "A",
        "B",
        { type: "preference" }
      );
      expect(corr.type).toBe("preference");
    });

    it("accepts explicit domain override", async () => {
      const corr = await learningLoopEngine.recordCorrection(
        "A",
        "B",
        { domain: "custom_domain" }
      );
      expect(corr.domain).toBe("custom_domain");
    });

    it("accepts explicit severity override", async () => {
      const corr = await learningLoopEngine.recordCorrection(
        "A",
        "B",
        { severity: 9 }
      );
      expect(corr.severity).toBe(9);
    });

    it("extracts entities from text", async () => {
      const corr = await learningLoopEngine.recordCorrection(
        "Okuma LB3000 runs Mastercam",
        "Okuma LB3000 runs hyperMILL"
      );
      expect(corr.entities.length).toBeGreaterThan(0);
    });
  });

  // ── checkForCorrection() ──────────────────────────────────────────────

  describe("checkForCorrection()", () => {
    it("returns triggered=false when no corrections recorded", async () => {
      const check = await learningLoopEngine.checkForCorrection("anything");
      expect(check.triggered).toBe(false);
      expect(check.confidence).toBe(0);
    });

    it("triggers when response contains previously-corrected text", async () => {
      await learningLoopEngine.recordCorrection(
        "feed rate 0.15 mmrev",
        "feed rate 0.20 mmrev"
      );
      const check = await learningLoopEngine.checkForCorrection(
        "You should use feed rate 0.15 mmrev for this"
      );
      expect(check.triggered).toBe(true);
      expect(check.correction).toBeDefined();
      expect(check.suggestion).toContain("Previously corrected");
    });

    it("increments recurrences on each trigger", async () => {
      const corr = await learningLoopEngine.recordCorrection(
        "feed rate 0.15 mmrev",
        "feed rate 0.20 mmrev"
      );
      await learningLoopEngine.checkForCorrection("feed rate 0.15 mmrev");
      await learningLoopEngine.checkForCorrection("feed rate 0.15 mmrev");
      const byDomain = await learningLoopEngine.getByDomain(corr.domain);
      expect(byDomain[0]?.recurrences).toBeGreaterThanOrEqual(2);
    });
  });

  // ── verifyCorrection() ────────────────────────────────────────────────

  describe("verifyCorrection()", () => {
    it("marks a correction as verified", async () => {
      const corr = await learningLoopEngine.recordCorrection("X", "Y");
      const result = await learningLoopEngine.verifyCorrection(corr.id);
      expect(result).toBe(true);
    });

    it("returns false for unknown correction id", async () => {
      const result = await learningLoopEngine.verifyCorrection("corr_ghost");
      expect(result).toBe(false);
    });
  });

  // ── getByDomain() / getByEntity() ─────────────────────────────────────

  describe("getByDomain() / getByEntity()", () => {
    it("filters by domain", async () => {
      await learningLoopEngine.recordCorrection("a", "b", { domain: "speed_feed" });
      await learningLoopEngine.recordCorrection("c", "d", { domain: "tooling" });
      const results = await learningLoopEngine.getByDomain("speed_feed");
      expect(results.length).toBe(1);
      expect(results[0]?.domain).toBe("speed_feed");
    });

    it("returns empty for unknown domain", async () => {
      const results = await learningLoopEngine.getByDomain("xxx_not_a_domain");
      expect(results).toEqual([]);
    });

    it("filters by entity (case-insensitive)", async () => {
      await learningLoopEngine.recordCorrection("X", "Y", { entities: ["LB3000"] });
      const results = await learningLoopEngine.getByEntity("lb3000");
      expect(results.length).toBe(1);
    });
  });

  // ── getCriticalCorrections() ─────────────────────────────────────────

  describe("getCriticalCorrections()", () => {
    it("returns only unverified corrections with severity >= 7", async () => {
      await learningLoopEngine.recordCorrection("A", "B", { severity: 9 });
      await learningLoopEngine.recordCorrection("C", "D", { severity: 3 });
      const critical = await learningLoopEngine.getCriticalCorrections();
      expect(critical.every((c) => c.severity >= 7)).toBe(true);
      expect(critical.every((c) => c.verified === false)).toBe(true);
    });

    it("sorts by severity descending", async () => {
      await learningLoopEngine.recordCorrection("A", "B", { severity: 8 });
      await learningLoopEngine.recordCorrection("C", "D", { severity: 10 });
      await learningLoopEngine.recordCorrection("E", "F", { severity: 9 });
      const critical = await learningLoopEngine.getCriticalCorrections();
      for (let i = 1; i < critical.length; i++) {
        expect(critical[i]!.severity).toBeLessThanOrEqual(critical[i - 1]!.severity);
      }
    });

    it("respects limit parameter", async () => {
      for (let i = 0; i < 5; i++) {
        await learningLoopEngine.recordCorrection(`A${i}`, `B${i}`, { severity: 9 });
      }
      const critical = await learningLoopEngine.getCriticalCorrections(2);
      expect(critical.length).toBe(2);
    });
  });

  // ── getRecurringCorrections() ────────────────────────────────────────

  describe("getRecurringCorrections()", () => {
    it("returns corrections with recurrences >= threshold", async () => {
      const corr = await learningLoopEngine.recordCorrection(
        "feed rate 0.15 mmrev",
        "feed rate 0.20 mmrev"
      );
      // Trigger recurrences
      await learningLoopEngine.checkForCorrection("feed rate 0.15 mmrev");
      await learningLoopEngine.checkForCorrection("feed rate 0.15 mmrev");
      const recurring = await learningLoopEngine.getRecurringCorrections(2);
      expect(recurring.length).toBeGreaterThan(0);
      expect(recurring[0]?.recurrences).toBeGreaterThanOrEqual(2);
    });
  });

  // ── getStats() ─────────────────────────────────────────────────────────

  describe("getStats()", () => {
    it("returns zero totals when no corrections", async () => {
      const stats = await learningLoopEngine.getStats();
      expect(stats.totalCorrections).toBe(0);
      expect(stats.improvementRate).toBe(1); // 1 by definition when no corrections
    });

    it("tracks corrections by type and domain", async () => {
      await learningLoopEngine.recordCorrection("A", "B", { domain: "speed_feed" });
      await learningLoopEngine.recordCorrection("C", "D", { domain: "tooling" });
      const stats = await learningLoopEngine.getStats();
      expect(stats.totalCorrections).toBe(2);
      expect(stats.byDomain.speed_feed).toBe(1);
      expect(stats.byDomain.tooling).toBe(1);
    });

    it("computes average severity", async () => {
      await learningLoopEngine.recordCorrection("A", "B", { severity: 4 });
      await learningLoopEngine.recordCorrection("C", "D", { severity: 8 });
      const stats = await learningLoopEngine.getStats();
      expect(stats.avgSeverity).toBeCloseTo(6, 0);
    });

    it("computes improvement rate as verified/total", async () => {
      const a = await learningLoopEngine.recordCorrection("A", "B");
      await learningLoopEngine.recordCorrection("C", "D");
      await learningLoopEngine.verifyCorrection(a.id);
      const stats = await learningLoopEngine.getStats();
      expect(stats.improvementRate).toBeCloseTo(0.5, 1);
    });
  });

  // ── getLearningContext() ──────────────────────────────────────────────

  describe("getLearningContext()", () => {
    it("returns a message when no corrections", async () => {
      const ctx = await learningLoopEngine.getLearningContext();
      expect(ctx).toContain("No corrections");
    });

    it("returns formatted context when corrections exist", async () => {
      await learningLoopEngine.recordCorrection("A", "B", { severity: 8 });
      const ctx = await learningLoopEngine.getLearningContext();
      expect(ctx).toContain("corrections");
    });

    it("respects token budget", async () => {
      for (let i = 0; i < 50; i++) {
        await learningLoopEngine.recordCorrection(
          `Long incorrect text iteration ${i}`,
          `Long correct text iteration ${i}`
        );
      }
      const ctx = await learningLoopEngine.getLearningContext(100);
      // Allow generous slack (engine estimates 4 chars = 1 token)
      expect(ctx.length).toBeLessThan(100 * 4 + 200);
    });
  });
});
