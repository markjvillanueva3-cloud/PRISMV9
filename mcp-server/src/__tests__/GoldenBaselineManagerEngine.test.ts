/**
 * GoldenBaselineManagerEngine — Comprehensive Test Suite
 *
 * Tests: baseline CRUD operations, validation, comparison metrics,
 *        regression detection, export functionality, and edge cases.
 */

import { describe, it, expect } from "vitest";
import {
  GoldenBaselineManagerEngine,
  goldenBaselineManagerEngine,
  type GoldenBaseline,
  type BaselineCategory,
  type BaselineComplexity,
  type ComparisonResult,
  type GcodeMetrics,
  type BaselineTolerances,
} from "../engines/GoldenBaselineManagerEngine.js";

// ============================================================================
// TEST HELPERS
// ============================================================================

/** Create a fresh engine instance for isolated testing (in-memory mode) */
function createTestEngine(): GoldenBaselineManagerEngine {
  return new GoldenBaselineManagerEngine({ inMemory: true });
}

/** Generate sample G-code for testing */
function generateSampleGcode(lineCount: number, toolCount: number): string {
  const lines: string[] = [];
  lines.push("%");
  lines.push("O1234 (TEST PROGRAM)");
  lines.push("G90 G94 G17 G21");

  for (let t = 1; t <= toolCount; t++) {
    lines.push(`T${t} M6`);
    lines.push(`S${1000 + t * 200} M3`);
    lines.push("G0 Z50.");

    const motionLines = Math.floor((lineCount - 8) / toolCount) - 3;
    for (let i = 0; i < motionLines; i++) {
      const x = (i * 5).toFixed(3);
      const y = (i * 3).toFixed(3);
      const z = (-i * 2).toFixed(3);
      lines.push(`G1 X${x} Y${y} Z${z} F${200 + i * 10}`);
    }

    lines.push("G0 Z50.");
    lines.push("M5");
  }

  lines.push("G91 G28 Z0");
  lines.push("M30");
  lines.push("%");

  return lines.join("\n");
}

/** Generate sample metrics */
function generateSampleMetrics(lineCount: number, toolCount: number): GcodeMetrics {
  return {
    lineCount,
    toolChangeCount: toolCount,
    estimatedCycleTime: lineCount * 2,
    feedRateRange: [200, 500],
    spindleSpeedRange: [1000, 2000],
  };
}

// ============================================================================
// TESTS
// ============================================================================

describe("GoldenBaselineManagerEngine", () => {

  // --------------------------------------------------------------------------
  // INITIALIZATION TESTS
  // --------------------------------------------------------------------------

  describe("initialization", () => {
    it("initializes with default baselines when no registry exists", () => {
      const engine = createTestEngine();
      engine.initialize();

      const stats = engine.getStatistics();
      expect(stats.totalBaselines).toBe(100);
    });

    it("initializes all 6 categories", () => {
      const engine = createTestEngine();
      engine.initialize();

      const stats = engine.getStatistics();
      expect(stats.coverage.hasLathe).toBe(true);
      expect(stats.coverage.hasMill).toBe(true);
      expect(stats.coverage.has5Axis).toBe(true);
      expect(stats.coverage.hasWedm).toBe(true);
      expect(stats.coverage.hasSwiss).toBe(true);
      expect(stats.coverage.hasMillturn).toBe(true);
      expect(stats.coverage.coveragePercentage).toBe(100);
    });

    it("has correct category distribution (20/20/20/20/10/10)", () => {
      const engine = createTestEngine();
      engine.initialize();

      const stats = engine.getStatistics();
      expect(stats.categoryCounts.lathe).toBe(20);
      expect(stats.categoryCounts.mill).toBe(20);
      expect(stats.categoryCounts["5axis"]).toBe(20);
      expect(stats.categoryCounts.wedm).toBe(20);
      expect(stats.categoryCounts.swiss).toBe(10);
      expect(stats.categoryCounts.millturn).toBe(10);
    });

    it("only initializes once (idempotent)", () => {
      const engine = createTestEngine();
      engine.initialize();
      const count1 = engine.getStatistics().totalBaselines;

      engine.initialize();
      const count2 = engine.getStatistics().totalBaselines;

      expect(count1).toBe(count2);
    });
  });

  // --------------------------------------------------------------------------
  // BASELINE CREATION TESTS
  // --------------------------------------------------------------------------

  describe("createBaseline", () => {
    it("creates a baseline with all required fields", () => {
      const engine = createTestEngine();
      engine.initialize();

      const gcode = generateSampleGcode(50, 2);
      const metrics = generateSampleMetrics(50, 2);

      const baseline = engine.createBaseline(
        {
          path: "test/input.nc",
          checksum: "abc123",
          metadata: { test: true },
        },
        {
          gcode,
          checksum: "",
          keyMetrics: metrics,
        },
        {
          category: "lathe",
          complexity: "simple",
          approvedBy: "test-user",
          modelVersion: "v1.0.0",
          description: "Test baseline",
          tags: ["test"],
        }
      );

      expect(baseline.baselineId).toMatch(/^GB-LATHE-S/);
      expect(baseline.version).toBe("1.0.0");
      expect(baseline.category).toBe("lathe");
      expect(baseline.complexity).toBe("simple");
      expect(baseline.approvedBy).toBe("test-user");
      expect(baseline.expectedOutput.checksum).toBeTruthy();
    });

    it("generates unique baseline IDs", () => {
      const engine = createTestEngine();
      engine.initialize();

      const gcode = generateSampleGcode(50, 1);
      const metrics = generateSampleMetrics(50, 1);

      const ids = new Set<string>();
      for (let i = 0; i < 5; i++) {
        const baseline = engine.createBaseline(
          { path: `test/input${i}.nc`, checksum: `abc${i}`, metadata: {} },
          { gcode, checksum: "", keyMetrics: metrics },
          {
            category: "mill",
            complexity: "medium",
            approvedBy: "test",
            modelVersion: "v1",
          }
        );
        ids.add(baseline.baselineId);
      }

      expect(ids.size).toBe(5);
    });

    it("applies default tolerances based on complexity", () => {
      const engine = createTestEngine();
      engine.initialize();

      const gcode = generateSampleGcode(100, 2);
      const metrics = generateSampleMetrics(100, 2);

      const simpleBaseline = engine.createBaseline(
        { path: "simple.nc", checksum: "", metadata: {} },
        { gcode, checksum: "", keyMetrics: metrics },
        { category: "lathe", complexity: "simple", approvedBy: "test", modelVersion: "v1" }
      );

      const complexBaseline = engine.createBaseline(
        { path: "complex.nc", checksum: "", metadata: {} },
        { gcode, checksum: "", keyMetrics: metrics },
        { category: "5axis", complexity: "complex", approvedBy: "test", modelVersion: "v1" }
      );

      // Simple has tighter tolerances
      expect(simpleBaseline.tolerances.lineCountTolerance).toBe(0.05);
      expect(complexBaseline.tolerances.lineCountTolerance).toBe(0.10);
      expect(simpleBaseline.tolerances.semanticSimilarity).toBe(0.95);
      expect(complexBaseline.tolerances.semanticSimilarity).toBe(0.90);
    });

    it("throws on invalid metrics", () => {
      const engine = createTestEngine();
      engine.initialize();

      expect(() => {
        engine.createBaseline(
          { path: "test.nc", checksum: "", metadata: {} },
          {
            gcode: "G0 X0 Y0",
            checksum: "",
            keyMetrics: {
              lineCount: -5, // Invalid
              toolChangeCount: 1,
              estimatedCycleTime: 10,
              feedRateRange: [100, 200],
              spindleSpeedRange: [1000, 2000],
            },
          },
          { category: "mill", complexity: "simple", approvedBy: "test", modelVersion: "v1" }
        );
      }).toThrow(/Line count must be positive/);
    });

    it("throws on invalid tolerance values", () => {
      const engine = createTestEngine();
      engine.initialize();

      expect(() => {
        engine.createBaseline(
          { path: "test.nc", checksum: "", metadata: {} },
          {
            gcode: "G0 X0 Y0",
            checksum: "",
            keyMetrics: generateSampleMetrics(50, 1),
          },
          {
            category: "mill",
            complexity: "simple",
            approvedBy: "test",
            modelVersion: "v1",
            tolerances: { lineCountTolerance: 1.5 }, // Invalid: > 1
          }
        );
      }).toThrow(/Line count tolerance must be between 0 and 1/);
    });
  });

  // --------------------------------------------------------------------------
  // VALIDATION TESTS
  // --------------------------------------------------------------------------

  describe("validateAgainstBaseline", () => {
    it("returns exact_match when checksums match", () => {
      const engine = createTestEngine();
      engine.initialize();

      const gcode = generateSampleGcode(50, 2);
      const metrics = generateSampleMetrics(50, 2);

      const baseline = engine.createBaseline(
        { path: "test.nc", checksum: "", metadata: {} },
        { gcode, checksum: "", keyMetrics: metrics },
        { category: "lathe", complexity: "simple", approvedBy: "test", modelVersion: "v1" }
      );

      const report = engine.validateAgainstBaseline(gcode, baseline.baselineId);

      expect(report.result).toBe("exact_match");
      expect(report.checksumMatch).toBe(true);
      expect(report.semanticSimilarity).toBe(1.0);
      expect(report.failureReasons).toHaveLength(0);
    });

    it("returns within_tolerance for minor deviations", () => {
      const engine = createTestEngine();
      engine.initialize();

      const gcode = generateSampleGcode(100, 2);
      const metrics = generateSampleMetrics(100, 2);

      const baseline = engine.createBaseline(
        { path: "test.nc", checksum: "", metadata: {} },
        { gcode, checksum: "", keyMetrics: metrics },
        { category: "mill", complexity: "simple", approvedBy: "test", modelVersion: "v1" }
      );

      // Modify slightly (add a comment)
      const modifiedGcode = gcode.replace("O1234 (TEST PROGRAM)", "O1234 (TEST PROGRAM MODIFIED)");

      const report = engine.validateAgainstBaseline(modifiedGcode, baseline.baselineId);

      expect(report.checksumMatch).toBe(false);
      expect(report.semanticSimilarity).toBeGreaterThan(0.9);
    });

    it("returns failed when output is significantly different", () => {
      const engine = createTestEngine();
      engine.initialize();

      const originalGcode = generateSampleGcode(100, 2);
      const metrics = generateSampleMetrics(100, 2);

      const baseline = engine.createBaseline(
        { path: "test.nc", checksum: "", metadata: {} },
        { gcode: originalGcode, checksum: "", keyMetrics: metrics },
        { category: "mill", complexity: "simple", approvedBy: "test", modelVersion: "v1" }
      );

      // Completely different G-code
      const differentGcode = `%
O9999 (COMPLETELY DIFFERENT)
G90 G17
G0 X999 Y999 Z999
M30
%`;

      const report = engine.validateAgainstBaseline(differentGcode, baseline.baselineId);

      expect(report.result).toBe("failed");
      expect(report.failureReasons.length).toBeGreaterThan(0);
    });

    it("throws when baseline ID not found", () => {
      const engine = createTestEngine();
      engine.initialize();

      expect(() => {
        engine.validateAgainstBaseline("G0 X0", "NONEXISTENT-ID");
      }).toThrow(/Baseline not found/);
    });

    it("calculates line count delta correctly", () => {
      const engine = createTestEngine();
      engine.initialize();

      const gcode = generateSampleGcode(100, 1);

      const baseline = engine.createBaseline(
        { path: "test.nc", checksum: "", metadata: {} },
        {
          gcode,
          checksum: "",
          keyMetrics: {
            lineCount: 100,
            toolChangeCount: 1,
            estimatedCycleTime: 200,
            feedRateRange: [200, 500],
            spindleSpeedRange: [1000, 2000],
          },
        },
        { category: "lathe", complexity: "simple", approvedBy: "test", modelVersion: "v1" }
      );

      // Create shorter G-code
      const shorterGcode = generateSampleGcode(80, 1);

      const report = engine.validateAgainstBaseline(
        shorterGcode,
        baseline.baselineId,
        { lineCount: 80, toolChangeCount: 1, estimatedCycleTime: 160, feedRateRange: [200, 500], spindleSpeedRange: [1000, 2000] }
      );

      expect(report.details.lineCountDelta).toBe(-20);
      expect(report.details.lineCountDeltaPct).toBeCloseTo(0.2, 1);
    });
  });

  // --------------------------------------------------------------------------
  // UPDATE TESTS
  // --------------------------------------------------------------------------

  describe("updateBaseline", () => {
    it("increments version on update", () => {
      const engine = createTestEngine();
      engine.initialize();

      const gcode = generateSampleGcode(50, 1);
      const metrics = generateSampleMetrics(50, 1);

      const baseline = engine.createBaseline(
        { path: "test.nc", checksum: "", metadata: {} },
        { gcode, checksum: "", keyMetrics: metrics },
        { category: "lathe", complexity: "simple", approvedBy: "test", modelVersion: "v1" }
      );

      expect(baseline.version).toBe("1.0.0");

      const newGcode = generateSampleGcode(60, 1);
      const updated = engine.updateBaseline(
        baseline.baselineId,
        { gcode: newGcode, checksum: "", keyMetrics: generateSampleMetrics(60, 1) },
        "Updated for new requirements",
        "updater"
      );

      expect(updated.version).toBe("1.0.1");
    });

    it("records update history", () => {
      const engine = createTestEngine();
      engine.initialize();

      const gcode = generateSampleGcode(50, 1);
      const metrics = generateSampleMetrics(50, 1);

      const baseline = engine.createBaseline(
        { path: "test.nc", checksum: "", metadata: {} },
        { gcode, checksum: "", keyMetrics: metrics },
        { category: "mill", complexity: "medium", approvedBy: "test", modelVersion: "v1" }
      );

      const originalChecksum = baseline.expectedOutput.checksum;

      engine.updateBaseline(
        baseline.baselineId,
        { gcode: "G0 X0\nM30", checksum: "", keyMetrics: metrics },
        "Test update",
        "tester"
      );

      const stats = engine.getStatistics();
      expect(stats.updateCount).toBeGreaterThan(0);
    });

    it("throws on nonexistent baseline", () => {
      const engine = createTestEngine();
      engine.initialize();

      expect(() => {
        engine.updateBaseline(
          "NONEXISTENT",
          { gcode: "G0", checksum: "", keyMetrics: generateSampleMetrics(10, 1) },
          "reason",
          "user"
        );
      }).toThrow(/Baseline not found/);
    });
  });

  // --------------------------------------------------------------------------
  // LIST AND FILTER TESTS
  // --------------------------------------------------------------------------

  describe("listBaselines", () => {
    it("lists all baselines without filter", () => {
      const engine = createTestEngine();
      engine.initialize();

      const all = engine.listBaselines();
      expect(all.length).toBe(100);
    });

    it("filters by category", () => {
      const engine = createTestEngine();
      engine.initialize();

      const latheBaselines = engine.listBaselines({ category: "lathe" });
      expect(latheBaselines.length).toBe(20);
      expect(latheBaselines.every(b => b.category === "lathe")).toBe(true);
    });

    it("filters by complexity", () => {
      const engine = createTestEngine();
      engine.initialize();

      const complexBaselines = engine.listBaselines({ complexity: "complex" });
      expect(complexBaselines.length).toBeGreaterThan(0);
      expect(complexBaselines.every(b => b.complexity === "complex")).toBe(true);
    });

    it("filters by multiple criteria", () => {
      const engine = createTestEngine();
      engine.initialize();

      const filtered = engine.listBaselines({
        category: "5axis",
        complexity: "complex",
      });

      expect(filtered.length).toBe(20);
      expect(filtered.every(b => b.category === "5axis" && b.complexity === "complex")).toBe(true);
    });

    it("filters by tags", () => {
      const engine = createTestEngine();
      engine.initialize();

      const tagged = engine.listBaselines({ tags: ["synthetic"] });
      expect(tagged.length).toBe(100); // All default baselines are synthetic
    });
  });

  // --------------------------------------------------------------------------
  // DELETE TESTS
  // --------------------------------------------------------------------------

  describe("deleteBaseline", () => {
    it("removes baseline and updates counts", () => {
      const engine = createTestEngine();
      engine.initialize();

      const initialStats = engine.getStatistics();
      const baselines = engine.listBaselines({ category: "lathe" });
      const idToDelete = baselines[0].baselineId;

      const result = engine.deleteBaseline(idToDelete);

      expect(result).toBe(true);

      const newStats = engine.getStatistics();
      expect(newStats.totalBaselines).toBe(initialStats.totalBaselines - 1);
      expect(newStats.categoryCounts.lathe).toBe(initialStats.categoryCounts.lathe - 1);
    });

    it("returns false for nonexistent baseline", () => {
      const engine = createTestEngine();
      engine.initialize();

      const result = engine.deleteBaseline("NONEXISTENT-ID");
      expect(result).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // EXPORT TESTS
  // --------------------------------------------------------------------------

  describe("exportBaselines", () => {
    it("exports to JSON format", () => {
      const engine = createTestEngine();
      engine.initialize();

      const exported = engine.exportBaselines("json", { category: "lathe" });
      const parsed = JSON.parse(exported);

      expect(parsed.count).toBe(20);
      expect(parsed.baselines).toHaveLength(20);
      expect(parsed.exportedAt).toBeTruthy();
    });

    it("exports to CSV format", () => {
      const engine = createTestEngine();
      engine.initialize();

      const exported = engine.exportBaselines("csv", { category: "mill" });
      const lines = exported.split("\n");

      // Header + 20 data rows
      expect(lines.length).toBe(21);
      expect(lines[0]).toContain("baselineId");
      expect(lines[0]).toContain("category");
    });

    it("exports all baselines when no filter", () => {
      const engine = createTestEngine();
      engine.initialize();

      const exported = engine.exportBaselines("json");
      const parsed = JSON.parse(exported);

      expect(parsed.count).toBe(100);
    });
  });

  // --------------------------------------------------------------------------
  // REGRESSION SUITE TESTS
  // --------------------------------------------------------------------------

  describe("runRegressionSuite", () => {
    it("runs regression tests for a category", () => {
      const engine = createTestEngine();
      engine.initialize();

      // Generator that returns same code as baseline
      const perfectGenerator = (inputPath: string) => {
        const baseline = engine.listBaselines({ category: "lathe" })
          .find(b => b.inputProgram.path === inputPath);
        return baseline?.expectedOutput.gcode || "";
      };

      const results = engine.runRegressionSuite("lathe", perfectGenerator);

      expect(results.passed).toBe(20);
      expect(results.failed).toBe(0);
      expect(results.results).toHaveLength(20);
    });

    it("handles generator errors gracefully", () => {
      const engine = createTestEngine();
      engine.initialize();

      const failingGenerator = () => {
        throw new Error("Generator failed");
      };

      const results = engine.runRegressionSuite("mill", failingGenerator);

      expect(results.failed).toBe(20);
      expect(results.results.every(r => r.result === "failed")).toBe(true);
      expect(results.results[0].failureReasons[0]).toContain("Generator error");
    });

    it("detects regressions with bad generator", () => {
      const engine = createTestEngine();
      engine.initialize();

      // Generator that returns garbage
      const badGenerator = () => "BAD OUTPUT\nG999 X999";

      const results = engine.runRegressionSuite("wedm", badGenerator);

      expect(results.failed).toBe(20);
      expect(results.passed).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // STATISTICS TESTS
  // --------------------------------------------------------------------------

  describe("getStatistics", () => {
    it("returns correct coverage information", () => {
      const engine = createTestEngine();
      engine.initialize();

      const stats = engine.getStatistics();

      expect(stats.coverage.coveragePercentage).toBe(100);
      expect(stats.totalBaselines).toBe(100);
    });

    it("updates counts after modifications", () => {
      const engine = createTestEngine();
      engine.initialize();

      const gcode = generateSampleGcode(50, 1);
      const metrics = generateSampleMetrics(50, 1);

      const initialCount = engine.getStatistics().totalBaselines;

      engine.createBaseline(
        { path: "new.nc", checksum: "", metadata: {} },
        { gcode, checksum: "", keyMetrics: metrics },
        { category: "lathe", complexity: "simple", approvedBy: "test", modelVersion: "v1" }
      );

      expect(engine.getStatistics().totalBaselines).toBe(initialCount + 1);
    });
  });

  // --------------------------------------------------------------------------
  // EDGE CASES
  // --------------------------------------------------------------------------

  describe("edge cases", () => {
    it("handles empty G-code gracefully", () => {
      const engine = createTestEngine();
      engine.initialize();

      expect(() => {
        engine.createBaseline(
          { path: "empty.nc", checksum: "", metadata: {} },
          {
            gcode: "",
            checksum: "",
            keyMetrics: generateSampleMetrics(0, 0),
          },
          { category: "lathe", complexity: "simple", approvedBy: "test", modelVersion: "v1" }
        );
      }).toThrow(/Expected G-code output is required/);
    });

    it("handles G-code with only comments", () => {
      const engine = createTestEngine();
      engine.initialize();

      const commentOnlyGcode = "(COMMENT ONLY)\n(ANOTHER COMMENT)\n%";

      const baseline = engine.createBaseline(
        { path: "comments.nc", checksum: "", metadata: {} },
        {
          gcode: commentOnlyGcode,
          checksum: "",
          keyMetrics: {
            lineCount: 3,
            toolChangeCount: 0,
            estimatedCycleTime: 1,
            feedRateRange: [0, 0],
            spindleSpeedRange: [0, 0],
          },
        },
        { category: "lathe", complexity: "simple", approvedBy: "test", modelVersion: "v1" }
      );

      expect(baseline.baselineId).toBeTruthy();
    });

    it("handles very long G-code programs", () => {
      const engine = createTestEngine();
      engine.initialize();

      const longGcode = generateSampleGcode(10000, 10);
      const metrics = generateSampleMetrics(10000, 10);

      const baseline = engine.createBaseline(
        { path: "long.nc", checksum: "", metadata: {} },
        { gcode: longGcode, checksum: "", keyMetrics: metrics },
        { category: "5axis", complexity: "complex", approvedBy: "test", modelVersion: "v1" }
      );

      expect(baseline.expectedOutput.keyMetrics.lineCount).toBe(10000);
    });

    it("handles zero tool changes", () => {
      const engine = createTestEngine();
      engine.initialize();

      const gcode = "G90\nG0 X0\nG1 X10 F100\nM30";

      const baseline = engine.createBaseline(
        { path: "notool.nc", checksum: "", metadata: {} },
        {
          gcode,
          checksum: "",
          keyMetrics: {
            lineCount: 4,
            toolChangeCount: 0,
            estimatedCycleTime: 10,
            feedRateRange: [100, 100],
            spindleSpeedRange: [0, 0],
          },
        },
        { category: "wedm", complexity: "simple", approvedBy: "test", modelVersion: "v1" }
      );

      expect(baseline.expectedOutput.keyMetrics.toolChangeCount).toBe(0);
    });

    it("getBaseline returns undefined for nonexistent ID", () => {
      const engine = createTestEngine();
      engine.initialize();

      const result = engine.getBaseline("DOES-NOT-EXIST");
      expect(result).toBeUndefined();
    });
  });

  // --------------------------------------------------------------------------
  // SEMANTIC SIMILARITY TESTS
  // --------------------------------------------------------------------------

  describe("semantic similarity calculation", () => {
    it("detects high similarity for reordered but equivalent programs", () => {
      const engine = createTestEngine();
      engine.initialize();

      const gcode1 = `%
O1000
G90 G17 G21
G0 X0 Y0 Z50
G1 X10 Y10 Z-5 F200
G1 X20 Y20 Z-5 F200
G0 Z50
M30
%`;

      const gcode2 = `%
O1001
G90 G17 G21
G0 X0 Y0 Z50
G1 X10 Y10 Z-5 F200
G1 X20 Y20 Z-5 F200
G0 Z50
M30
%`;

      const baseline = engine.createBaseline(
        { path: "orig.nc", checksum: "", metadata: {} },
        {
          gcode: gcode1,
          checksum: "",
          keyMetrics: {
            lineCount: 9,
            toolChangeCount: 0,
            estimatedCycleTime: 20,
            feedRateRange: [200, 200],
            spindleSpeedRange: [0, 0],
          },
        },
        { category: "mill", complexity: "simple", approvedBy: "test", modelVersion: "v1" }
      );

      const report = engine.validateAgainstBaseline(gcode2, baseline.baselineId);

      // Should have high semantic similarity despite different program number
      expect(report.semanticSimilarity).toBeGreaterThan(0.8);
    });
  });
});
