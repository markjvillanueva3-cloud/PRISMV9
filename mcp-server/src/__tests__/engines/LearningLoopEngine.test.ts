/**
 * Tests for LearningLoopEngine
 *
 * AGENT ROADMAP: U-AGT06 (MS2)
 * Verifies learning from corrections and pattern detection
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  LearningLoopEngine,
  learningLoopEngine,
  Correction,
} from "../../engines/LearningLoopEngine.js";

describe("LearningLoopEngine", () => {
  let engine: LearningLoopEngine;

  beforeEach(async () => {
    engine = new LearningLoopEngine();
    await engine.clearAll();
  });

  describe("recordCorrection", () => {
    it("should record a value correction", async () => {
      const correction = await engine.recordCorrection(
        "Use 500 SFM for D2",
        "Use 150 SFM for D2",
        { type: "value", reason: "D2 is hardened tool steel" }
      );

      expect(correction.id).toMatch(/^corr_/);
      expect(correction.type).toBe("value");
      expect(correction.incorrect).toBe("Use 500 SFM for D2");
      expect(correction.correct).toBe("Use 150 SFM for D2");
      expect(correction.reason).toBe("D2 is hardened tool steel");
      expect(correction.verified).toBe(false);
      expect(correction.recurrences).toBe(0);
    });

    it("should infer correction type from content", async () => {
      // Value correction (numbers changed)
      const valueCorr = await engine.recordCorrection(
        "Feed rate 0.010 ipm",
        "Feed rate 0.003 ipm"
      );
      expect(valueCorr.type).toBe("value");

      // Safety correction (no numbers to trigger value check first)
      const safetyCorr = await engine.recordCorrection(
        "Approach at rapid feed",
        "Never approach rapidly, danger of collision"
      );
      expect(safetyCorr.type).toBe("safety");

      // Preference correction (no numbers)
      const prefCorr = await engine.recordCorrection(
        "Use flood coolant here",
        "Always use mist coolant, user prefers this style"
      );
      expect(prefCorr.type).toBe("preference");
    });

    it("should infer domain from content", async () => {
      const speedCorr = await engine.recordCorrection(
        "Run at 800 SFM",
        "Run at 400 SFM"
      );
      expect(speedCorr.domain).toBe("speed_feed");

      const toolCorr = await engine.recordCorrection(
        "Use HSS endmill",
        "Use carbide insert"
      );
      expect(toolCorr.domain).toBe("tooling");

      const matCorr = await engine.recordCorrection(
        "Material is 1018",
        "Material is D2 steel"
      );
      expect(matCorr.domain).toBe("material");
    });

    it("should extract entities from content", async () => {
      const correction = await engine.recordCorrection(
        "Use standard insert on D2",
        "Use Mitsubishi insert for D2 on Okuma"
      );

      expect(correction.entities).toContain("D2");
      expect(correction.entities).toContain("Mitsubishi");
      expect(correction.entities).toContain("Okuma");
    });

    it("should assess severity based on content", async () => {
      // Safety-related should be high severity
      const safetyCorr = await engine.recordCorrection(
        "Approach at rapid",
        "Approach slowly to avoid crash damage"
      );
      expect(safetyCorr.severity).toBe(10);

      // Large numeric difference should be high severity
      const bigDiffCorr = await engine.recordCorrection(
        "Use 1000 SFM",
        "Use 100 SFM"
      );
      expect(bigDiffCorr.severity).toBeGreaterThanOrEqual(6);
    });

    it("should record with custom options", async () => {
      const correction = await engine.recordCorrection(
        "Wrong approach",
        "Correct approach",
        {
          type: "approach",
          domain: "programming",
          entities: ["Haas", "G-code"],
          severity: 7,
          reason: "Custom reason",
        }
      );

      expect(correction.type).toBe("approach");
      expect(correction.domain).toBe("programming");
      expect(correction.entities).toContain("Haas");
      expect(correction.severity).toBe(7);
      expect(correction.reason).toBe("Custom reason");
    });
  });

  describe("checkForCorrection", () => {
    beforeEach(async () => {
      await engine.recordCorrection(
        "Use 500 SFM for D2",
        "Use 150 SFM for D2",
        { reason: "D2 is hardened" }
      );
      await engine.recordCorrection(
        "Feed rate 0.010",
        "Feed rate 0.003",
        { reason: "Too aggressive" }
      );
    });

    it("should detect matching correction", async () => {
      const check = await engine.checkForCorrection(
        "I recommend using 500 SFM for D2 steel"
      );

      expect(check.triggered).toBe(true);
      expect(check.correction).toBeDefined();
      expect(check.correction?.incorrect).toContain("500 SFM");
      expect(check.suggestion).toContain("150 SFM");
      expect(check.confidence).toBeGreaterThan(0.7);
    });

    it("should not trigger for unrelated content", async () => {
      const check = await engine.checkForCorrection(
        "The weather is nice today"
      );

      expect(check.triggered).toBe(false);
      expect(check.correction).toBeUndefined();
      expect(check.confidence).toBe(0);
    });

    it("applies an absolute-overlap floor so short patterns don't fuzzy-match on common words", async () => {
      // Positive control: a genuine 5-word overlap with "Use 500 SFM for D2"
      // triggers and surfaces the recorded correction value.
      const hit = await engine.checkForCorrection("please use 500 SFM for D2 now");
      expect(hit.triggered).toBe(true);
      expect(hit.suggestion).toContain("150 SFM");
      expect(hit.confidence).toBeGreaterThan(0.7);

      // Negative: the 3-word "Feed rate 0.010" pattern shares only "feed" + "rate"
      // (2 words, ratio 0.67 > 0.6) with this unrelated prose -- below the
      // absolute-overlap floor of 3, so it must NOT fuzzy-trigger. Regression:
      // before the floor this returned triggered=true with a spurious suggestion.
      const miss = await engine.checkForCorrection("the feed rate question here is unrelated");
      expect(miss.triggered).toBe(false);
      expect(miss.confidence).toBe(0);
    });

    it("should increment recurrence count when triggered", async () => {
      await engine.checkForCorrection("Use 500 SFM for D2");
      await engine.checkForCorrection("500 SFM for D2 is recommended");

      const corrections = await engine.getByDomain("speed_feed");
      const d2Corr = corrections.find(c => c.incorrect.includes("500 SFM"));

      expect(d2Corr?.recurrences).toBeGreaterThanOrEqual(1);
    });

    it("should update lastTriggeredAt when triggered", async () => {
      const before = new Date().toISOString();
      await engine.checkForCorrection("Use 500 SFM for D2");

      const corrections = await engine.getByDomain("speed_feed");
      const d2Corr = corrections.find(c => c.incorrect.includes("500 SFM"));

      expect(d2Corr?.lastTriggeredAt).toBeDefined();
      expect(d2Corr?.lastTriggeredAt! >= before).toBe(true);
    });
  });

  describe("verifyCorrection", () => {
    it("should mark correction as verified", async () => {
      const correction = await engine.recordCorrection(
        "Wrong value",
        "Correct value"
      );

      const result = await engine.verifyCorrection(correction.id);
      expect(result).toBe(true);

      // Get the correction to check verified flag
      const stats = await engine.getStats();
      expect(stats.improvementRate).toBeGreaterThan(0);
    });

    it("should return false for unknown ID", async () => {
      const result = await engine.verifyCorrection("nonexistent_id");
      expect(result).toBe(false);
    });
  });

  describe("getByDomain", () => {
    it("should filter by domain", async () => {
      // Use unique domain names for this test
      const uniqueDomain1 = `test_domain_${Date.now()}_1`;
      const uniqueDomain2 = `test_domain_${Date.now()}_2`;

      await engine.recordCorrection("Speed too high", "Speed lower", {
        domain: uniqueDomain1,
      });
      await engine.recordCorrection("Wrong tool", "Correct tool", {
        domain: uniqueDomain2,
      });
      await engine.recordCorrection("More speed issues", "Fixed speed", {
        domain: uniqueDomain1,
      });

      const domain1Corrections = await engine.getByDomain(uniqueDomain1);
      expect(domain1Corrections.length).toBe(2);
      expect(domain1Corrections.every((c) => c.domain === uniqueDomain1)).toBe(true);

      const domain2Corrections = await engine.getByDomain(uniqueDomain2);
      expect(domain2Corrections.length).toBe(1);
    });

    it("should return empty for unknown domain", async () => {
      const corrections = await engine.getByDomain("nonexistent_domain_xyz_123");
      expect(corrections.length).toBe(0);
    });
  });

  describe("getByEntity", () => {
    it("should filter by entity", async () => {
      // Use unique entity names
      const uniqueEntity1 = `TestEntity_${Date.now()}_A`;
      const uniqueEntity2 = `TestEntity_${Date.now()}_B`;

      await engine.recordCorrection(
        "Entity1 at 500 SFM",
        "Entity1 at 150 SFM",
        { entities: [uniqueEntity1] }
      );
      await engine.recordCorrection(
        "Entity2 settings wrong",
        "Entity2 settings correct",
        { entities: [uniqueEntity2] }
      );

      const entity1Corrections = await engine.getByEntity(uniqueEntity1);
      expect(entity1Corrections.length).toBe(1);
      expect(entity1Corrections[0].entities).toContain(uniqueEntity1);

      const entity2Corrections = await engine.getByEntity(uniqueEntity2);
      expect(entity2Corrections.length).toBe(1);
    });

    it("should be case insensitive", async () => {
      const uniqueEntity = `CaseTestEntity_${Date.now()}`;
      await engine.recordCorrection(
        "Case test wrong",
        "Case test correct",
        { entities: [uniqueEntity] }
      );

      const corrections = await engine.getByEntity(uniqueEntity.toLowerCase());
      expect(corrections.length).toBe(1);
    });
  });

  describe("getCriticalCorrections", () => {
    beforeEach(async () => {
      // High severity unverified
      await engine.recordCorrection(
        "Crash risk",
        "Avoid crash damage by slowing",
        { severity: 10 }
      );
      // High severity but verified
      const verified = await engine.recordCorrection(
        "Another critical",
        "Fixed critical",
        { severity: 9 }
      );
      await engine.verifyCorrection(verified.id);
      // Low severity
      await engine.recordCorrection("Minor issue", "Minor fix", {
        severity: 3,
      });
    });

    it("should return only high severity unverified corrections", async () => {
      const critical = await engine.getCriticalCorrections();

      expect(critical.length).toBe(1);
      expect(critical[0].severity).toBe(10);
      expect(critical[0].verified).toBe(false);
    });

    it("should respect limit parameter", async () => {
      // Add more critical corrections
      await engine.recordCorrection("Critical 2", "Fix 2", { severity: 8 });
      await engine.recordCorrection("Critical 3", "Fix 3", { severity: 9 });

      const critical = await engine.getCriticalCorrections(2);
      expect(critical.length).toBe(2);
    });

    it("should sort by severity descending", async () => {
      await engine.recordCorrection("Severity 8", "Fix 8", { severity: 8 });

      const critical = await engine.getCriticalCorrections();
      expect(critical[0].severity).toBeGreaterThanOrEqual(critical[1]?.severity ?? 0);
    });
  });

  describe("getRecurringCorrections", () => {
    it("should return corrections with minimum recurrences", async () => {
      const corr = await engine.recordCorrection(
        "Recurring mistake",
        "Correct way"
      );

      // Trigger multiple times
      await engine.checkForCorrection("Recurring mistake here");
      await engine.checkForCorrection("Another recurring mistake");
      await engine.checkForCorrection("Yet again recurring mistake");

      const recurring = await engine.getRecurringCorrections(2);
      expect(recurring.length).toBeGreaterThanOrEqual(1);
      expect(recurring[0].recurrences).toBeGreaterThanOrEqual(2);
    });

    it("should sort by recurrence count", async () => {
      const corr1 = await engine.recordCorrection("Mistake 1", "Fix 1");
      const corr2 = await engine.recordCorrection("Mistake 2", "Fix 2");

      // Trigger corr1 once
      await engine.checkForCorrection("Mistake 1");

      // Trigger corr2 multiple times
      await engine.checkForCorrection("Mistake 2");
      await engine.checkForCorrection("Mistake 2 again");
      await engine.checkForCorrection("Mistake 2 once more");

      const recurring = await engine.getRecurringCorrections(1);
      expect(recurring[0].incorrect).toBe("Mistake 2");
    });
  });

  describe("getStats", () => {
    it("should return comprehensive statistics", async () => {
      // Get baseline stats first
      const baselineStats = await engine.getStats();
      const baselineTotal = baselineStats.totalCorrections;

      // Add test corrections
      await engine.recordCorrection("Value wrong", "Value correct", {
        type: "value",
        domain: "speed_feed",
        severity: 5,
      });
      await engine.recordCorrection("Approach wrong", "Approach correct", {
        type: "approach",
        domain: "tooling",
        severity: 7,
      });
      const verified = await engine.recordCorrection("Safety issue", "Safe way", {
        type: "safety",
        domain: "safety",
        severity: 10,
      });
      await engine.verifyCorrection(verified.id);

      const stats = await engine.getStats();

      // Check that corrections were added
      expect(stats.totalCorrections).toBe(baselineTotal + 3);
      expect(stats.byType.value).toBeGreaterThanOrEqual(1);
      expect(stats.byType.approach).toBeGreaterThanOrEqual(1);
      expect(stats.byType.safety).toBeGreaterThanOrEqual(1);
      expect(stats.avgSeverity).toBeGreaterThan(0);
      expect(stats.improvementRate).toBeGreaterThanOrEqual(0);
      expect(stats.improvementRate).toBeLessThanOrEqual(1);
    });

    it("should identify common patterns", async () => {
      // Add some corrections to ensure patterns exist
      await engine.recordCorrection("Pattern test 1", "Fix 1", { type: "value", domain: "test" });
      await engine.recordCorrection("Pattern test 2", "Fix 2", { type: "value", domain: "test" });

      const stats = await engine.getStats();

      expect(stats.commonPatterns.length).toBeGreaterThan(0);
      expect(stats.commonPatterns[0]).toHaveProperty("pattern");
      expect(stats.commonPatterns[0]).toHaveProperty("count");
    });

    it("should handle stats calculation correctly", async () => {
      // Get baseline stats
      const stats = await engine.getStats();

      // Stats should have valid structure
      expect(typeof stats.totalCorrections).toBe("number");
      expect(stats.totalCorrections).toBeGreaterThanOrEqual(0);
      expect(typeof stats.avgSeverity).toBe("number");
      expect(stats.avgSeverity).toBeGreaterThanOrEqual(0);
      expect(typeof stats.improvementRate).toBe("number");
      expect(stats.improvementRate).toBeGreaterThanOrEqual(0);
      expect(stats.improvementRate).toBeLessThanOrEqual(1);
      expect(typeof stats.byType).toBe("object");
      expect(typeof stats.byDomain).toBe("object");
      expect(Array.isArray(stats.commonPatterns)).toBe(true);
    });
  });

  describe("getLearningContext", () => {
    beforeEach(async () => {
      await engine.recordCorrection(
        "D2 at 500 SFM",
        "D2 at 150 SFM",
        { domain: "speed_feed", severity: 8 }
      );
      await engine.recordCorrection(
        "Wrong tool for S7",
        "Use carbide for S7",
        { domain: "tooling", severity: 6 }
      );
    });

    it("should generate learning context summary", async () => {
      const context = await engine.getLearningContext();

      expect(context).toContain("Key corrections");
      expect(context).toContain("D2");
      expect(context).toContain("150 SFM");
    });

    it("should respect token limit", async () => {
      // Add many corrections
      for (let i = 0; i < 20; i++) {
        await engine.recordCorrection(
          `Wrong value ${i}`,
          `Correct value ${i}`,
          { severity: 3 }
        );
      }

      const context = await engine.getLearningContext(100);
      const tokens = Math.ceil(context.length / 4);

      // Should be within reasonable range of limit
      expect(tokens).toBeLessThanOrEqual(150); // Allow some overhead
    });

    it("should prioritize high severity corrections", async () => {
      await engine.recordCorrection("Low priority", "Low fix", { severity: 1 });

      const context = await engine.getLearningContext(200);

      // High severity should appear first
      expect(context.indexOf("D2")).toBeLessThan(
        context.indexOf("Low priority") === -1
          ? context.length
          : context.indexOf("Low priority")
      );
    });

    it("should return message for empty corrections", async () => {
      await engine.clearAll();
      const context = await engine.getLearningContext();

      expect(context).toContain("No corrections");
    });
  });

  describe("clearAll", () => {
    it("should remove all corrections", async () => {
      await engine.recordCorrection("Correction 1", "Fix 1");
      await engine.recordCorrection("Correction 2", "Fix 2");

      await engine.clearAll();

      const stats = await engine.getStats();
      expect(stats.totalCorrections).toBe(0);
    });
  });

  describe("singleton instance", () => {
    it("should export singleton learningLoopEngine", () => {
      expect(learningLoopEngine).toBeInstanceOf(LearningLoopEngine);
    });
  });
});
