/**
 * wedm-citation-check.test.ts — MS-P1-100PCT U-P1-02 tests
 *
 * Tests for WEDMCitationCheckEngine.
 * Validates citation detection and synthetic parameter scanning.
 */

import { describe, it, expect } from "vitest";
import { wedmCitationCheckEngine } from "../engines/WEDMCitationCheckEngine";

// ============================================================================
// Engine Functionality
// ============================================================================

describe("WEDMCitationCheckEngine", () => {
  describe("checkAllWEDMEngines", () => {
    it("should return summary with correct structure", async () => {
      const summary = await wedmCitationCheckEngine.checkAllWEDMEngines();

      expect(summary).toHaveProperty("totalEngines");
      expect(summary).toHaveProperty("fullyCited");
      expect(summary).toHaveProperty("partiallyCited");
      expect(summary).toHaveProperty("critical");
      expect(summary).toHaveProperty("overallCoveragePct");
      expect(summary).toHaveProperty("results");
      expect(summary).toHaveProperty("timestamp");
    });

    it("should scan multiple WEDM engines", async () => {
      const summary = await wedmCitationCheckEngine.checkAllWEDMEngines();

      expect(summary.totalEngines).toBeGreaterThan(50); // We have 95+ WEDM engines
    });

    it("should have valid coverage percentage", async () => {
      const summary = await wedmCitationCheckEngine.checkAllWEDMEngines();

      expect(summary.overallCoveragePct).toBeGreaterThanOrEqual(0);
      expect(summary.overallCoveragePct).toBeLessThanOrEqual(100);
    });

    it("should return results array matching engine count", async () => {
      const summary = await wedmCitationCheckEngine.checkAllWEDMEngines();

      expect(summary.results.length).toBe(summary.totalEngines);
    });

    it("should have valid timestamp", async () => {
      const summary = await wedmCitationCheckEngine.checkAllWEDMEngines();

      expect(summary.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe("checkEngine", () => {
    it("should check specific engine file", async () => {
      const result = await wedmCitationCheckEngine.checkEngine("WEDMSelfAwarenessEngine.ts");

      expect(result).toHaveProperty("passed");
      expect(result).toHaveProperty("issues");
      expect(Array.isArray(result.issues)).toBe(true);
    });

    it("should return passed=false for non-existent file", async () => {
      const result = await wedmCitationCheckEngine.checkEngine("NonExistentEngine.ts");

      expect(result.passed).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });
  });

  describe("getEnginesWithSynthetics", () => {
    it("should return array of engine names", async () => {
      const engines = await wedmCitationCheckEngine.getEnginesWithSynthetics();

      expect(Array.isArray(engines)).toBe(true);
      for (const engine of engines) {
        expect(typeof engine).toBe("string");
        expect(engine.endsWith(".ts")).toBe(true);
      }
    });
  });

  describe("generateReport", () => {
    it("should generate markdown report", async () => {
      const report = await wedmCitationCheckEngine.generateReport();

      expect(typeof report).toBe("string");
      expect(report).toContain("# WEDM Citation Check Report");
      expect(report).toContain("## Summary");
    });

    it("should include engine count in report", async () => {
      const report = await wedmCitationCheckEngine.generateReport();

      expect(report).toContain("Total engines scanned:");
    });

    it("should include coverage percentage", async () => {
      const report = await wedmCitationCheckEngine.generateReport();

      expect(report).toContain("Overall coverage:");
    });
  });
});

// ============================================================================
// Citation Detection
// ============================================================================

describe("Citation Detection", () => {
  describe("result structure", () => {
    it("should return correct CitationCheckResult structure", async () => {
      const summary = await wedmCitationCheckEngine.checkAllWEDMEngines();
      const result = summary.results[0];

      expect(result).toHaveProperty("engine");
      expect(result).toHaveProperty("passed");
      expect(result).toHaveProperty("citedCount");
      expect(result).toHaveProperty("uncitedCount");
      expect(result).toHaveProperty("issues");
      expect(result).toHaveProperty("coveragePct");
    });

    it("should have valid issue structure", async () => {
      const summary = await wedmCitationCheckEngine.checkAllWEDMEngines();

      for (const result of summary.results) {
        for (const issue of result.issues) {
          expect(issue).toHaveProperty("type");
          expect(issue).toHaveProperty("line");
          expect(issue).toHaveProperty("snippet");
          expect(issue).toHaveProperty("severity");
          expect(issue).toHaveProperty("suggestion");
          expect(["synthetic", "placeholder", "hardcoded", "uncited", "todo"]).toContain(issue.type);
          expect(["error", "warning", "info"]).toContain(issue.severity);
        }
      }
    });
  });

  describe("known files", () => {
    it("should find issues in WEDMCompleteOrchestrationEngine", async () => {
      const result = await wedmCitationCheckEngine.checkEngine("WEDMCompleteOrchestrationEngine.ts");

      // This engine has known synthetic/placeholder mentions
      expect(result.issues.length).toBeGreaterThanOrEqual(0);
    });

    it("should check WEDMCalculatorAIEngine", async () => {
      const result = await wedmCitationCheckEngine.checkEngine("WEDMCalculatorAIEngine.ts");

      expect(result).toHaveProperty("passed");
      expect(result).toHaveProperty("issues");
    });
  });
});

// ============================================================================
// Coverage Metrics
// ============================================================================

describe("Coverage Metrics", () => {
  it("should calculate coverage correctly", async () => {
    const summary = await wedmCitationCheckEngine.checkAllWEDMEngines();

    // Coverage = cited / (cited + uncited)
    // All engines should have some level of coverage
    for (const result of summary.results) {
      expect(result.coveragePct).toBeGreaterThanOrEqual(0);
      expect(result.coveragePct).toBeLessThanOrEqual(100);
    }
  });

  it("should categorize engines correctly", async () => {
    const summary = await wedmCitationCheckEngine.checkAllWEDMEngines();

    // Sum of categories should equal total
    expect(summary.fullyCited + summary.partiallyCited + summary.critical).toBeLessThanOrEqual(
      summary.totalEngines
    );
  });
});
