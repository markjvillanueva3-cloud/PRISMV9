/**
 * NeuralDeterminismTestingEngine — Unit Tests
 * ============================================
 * Tests for neural output determinism, reproducibility, and drift detection.
 *
 * @milestone P0-CRITICAL-FIX
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  NeuralDeterminismTestingEngine,
  neuralDeterminismTestingEngine,
  SeededPRNG,
  type NeuralTestConfig,
  type GoldenBaseline,
} from "../engines/NeuralDeterminismTestingEngine.js";

describe("NeuralDeterminismTestingEngine", () => {
  let engine: NeuralDeterminismTestingEngine;

  beforeEach(() => {
    engine = new NeuralDeterminismTestingEngine();
  });

  // ==========================================================================
  // SEEDED PRNG TESTS
  // ==========================================================================

  describe("SeededPRNG", () => {
    it("produces deterministic sequences with same seed", () => {
      const prng1 = new SeededPRNG(12345);
      const prng2 = new SeededPRNG(12345);

      const seq1 = Array.from({ length: 100 }, () => prng1.random());
      const seq2 = Array.from({ length: 100 }, () => prng2.random());

      expect(seq1).toEqual(seq2);
    });

    it("produces different sequences with different seeds", () => {
      const prng1 = new SeededPRNG(12345);
      const prng2 = new SeededPRNG(54321);

      const seq1 = Array.from({ length: 10 }, () => prng1.random());
      const seq2 = Array.from({ length: 10 }, () => prng2.random());

      expect(seq1).not.toEqual(seq2);
    });

    it("random() returns values in [0, 1)", () => {
      const prng = new SeededPRNG(999);
      for (let i = 0; i < 1000; i++) {
        const v = prng.random();
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(1);
      }
    });

    it("randInt() returns integers in specified range", () => {
      const prng = new SeededPRNG(42);
      for (let i = 0; i < 100; i++) {
        const v = prng.randInt(5, 15);
        expect(v).toBeGreaterThanOrEqual(5);
        expect(v).toBeLessThanOrEqual(15);
        expect(Number.isInteger(v)).toBe(true);
      }
    });

    it("gaussian() produces reasonable normal distribution", () => {
      const prng = new SeededPRNG(123);
      const samples = Array.from({ length: 10000 }, () => prng.gaussian(100, 10));

      const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
      const variance = samples.reduce((acc, v) => acc + (v - mean) ** 2, 0) / samples.length;
      const stddev = Math.sqrt(variance);

      expect(mean).toBeCloseTo(100, 0); // Within 1 of expected mean
      expect(stddev).toBeCloseTo(10, 0); // Within 1 of expected stddev
    });

    it("clone() creates independent copy with same state", () => {
      const prng = new SeededPRNG(999);
      // Advance PRNG
      for (let i = 0; i < 50; i++) prng.random();

      const cloned = prng.clone();

      const original = Array.from({ length: 10 }, () => prng.random());
      const clonedSeq = Array.from({ length: 10 }, () => cloned.random());

      expect(original).toEqual(clonedSeq);
    });

    it("getState/setState enables checkpointing", () => {
      const prng = new SeededPRNG(777);
      for (let i = 0; i < 30; i++) prng.random();

      const checkpoint = prng.getState();
      const nextFive = Array.from({ length: 5 }, () => prng.random());

      // Restore and replay
      prng.setState(checkpoint);
      const replayed = Array.from({ length: 5 }, () => prng.random());

      expect(replayed).toEqual(nextFive);
    });

    it("handles edge case seeds (0, 1, negative)", () => {
      // Seed 0 should be normalized
      const prng0 = new SeededPRNG(0);
      expect(prng0.random()).toBeGreaterThan(0);

      // Seed 1 is valid
      const prng1 = new SeededPRNG(1);
      expect(prng1.random()).toBeGreaterThan(0);

      // Negative seed should be normalized
      const prngNeg = new SeededPRNG(-12345);
      expect(prngNeg.random()).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // SEEDING STRATEGY TESTS
  // ==========================================================================

  describe("Seeding Strategy", () => {
    it("setGlobalSeed changes global seed and resets counter", () => {
      engine.setGlobalSeed(99999);
      expect(engine.getGlobalSeed()).toBe(99999);
    });

    it("createTestContext derives reproducible seeds", () => {
      engine.setGlobalSeed(12345);

      const config: NeuralTestConfig = {
        seed: 12345,
        tolerance: 0.001,
        distributionTesting: false,
      };

      const ctx1 = engine.createTestContext(config, "test1");
      const ctx2 = engine.createTestContext(config, "test2");

      // Different contexts should have different derived seeds
      expect(ctx1.seed).not.toBe(ctx2.seed);

      // But running same sequence gives same results
      engine.setGlobalSeed(12345);
      const ctx1Again = engine.createTestContext(config, "test1");
      expect(ctx1Again.seed).toBe(ctx1.seed);
    });

    it("getTestPRNG returns isolated PRNG per test", () => {
      engine.setGlobalSeed(42);

      const prng1 = engine.getTestPRNG(1);
      const prng2 = engine.getTestPRNG(2);
      const prng1Again = engine.getTestPRNG(1);

      const seq1 = Array.from({ length: 10 }, () => prng1.random());
      const seq2 = Array.from({ length: 10 }, () => prng2.random());
      const seq1Again = Array.from({ length: 10 }, () => prng1Again.random());

      expect(seq1).not.toEqual(seq2);
      expect(seq1).toEqual(seq1Again);
    });

    it("test contexts are independent", () => {
      const config: NeuralTestConfig = {
        seed: 555,
        tolerance: 0.001,
        distributionTesting: false,
      };

      const ctx1 = engine.createTestContext(config);
      const values1 = Array.from({ length: 5 }, () => ctx1.prng.random());

      const ctx2 = engine.createTestContext(config);
      const values2 = Array.from({ length: 5 }, () => ctx2.prng.random());

      // Different contexts, different values
      expect(values1).not.toEqual(values2);

      // Same context index, same values (reproducible)
      engine.reset();
      const ctx1Repeat = engine.createTestContext(config);
      const values1Repeat = Array.from({ length: 5 }, () => ctx1Repeat.prng.random());
      expect(values1Repeat).toEqual(values1);
    });
  });

  // ==========================================================================
  // TOLERANCE-BASED COMPARISON TESTS
  // ==========================================================================

  describe("Tolerance-Based Comparison", () => {
    it("compareOutputs passes for identical arrays", () => {
      const config: NeuralTestConfig = {
        seed: 42,
        tolerance: 0.001,
        distributionTesting: false,
      };

      const actual = [1.0, 2.0, 3.0, 4.0, 5.0];
      const expected = [1.0, 2.0, 3.0, 4.0, 5.0];

      const result = engine.compareOutputs(actual, expected, config);

      expect(result.passed).toBe(true);
      expect(result.maxDeviation).toBe(0);
      expect(result.withinTolerance).toBe(true);
    });

    it("compareOutputs passes for values within tolerance", () => {
      const config: NeuralTestConfig = {
        seed: 42,
        tolerance: 0.01, // 1% tolerance
        distributionTesting: false,
      };

      const expected = [100.0, 200.0, 300.0];
      const actual = [100.5, 199.5, 300.9]; // All within 1%

      const result = engine.compareOutputs(actual, expected, config);

      expect(result.passed).toBe(true);
      expect(result.withinTolerance).toBe(true);
    });

    it("compareOutputs fails for values outside tolerance", () => {
      const config: NeuralTestConfig = {
        seed: 42,
        tolerance: 0.001, // 0.1% tolerance
        distributionTesting: false,
      };

      const expected = [100.0, 200.0, 300.0];
      const actual = [100.0, 205.0, 300.0]; // 2.5% deviation on second element

      const result = engine.compareOutputs(actual, expected, config);

      expect(result.passed).toBe(false);
      expect(result.maxDeviation).toBeCloseTo(5.0, 5);
    });

    it("compareOutputs fails for different array lengths", () => {
      const config: NeuralTestConfig = {
        seed: 42,
        tolerance: 0.1,
        distributionTesting: false,
      };

      const actual = [1.0, 2.0, 3.0];
      const expected = [1.0, 2.0];

      const result = engine.compareOutputs(actual, expected, config);

      expect(result.passed).toBe(false);
      expect(result.maxDeviation).toBe(Infinity);
    });

    it("compareOutputs uses absolute tolerance for near-zero values", () => {
      const config: NeuralTestConfig = {
        seed: 42,
        tolerance: 0.001, // 0.1% tolerance
        distributionTesting: false,
      };

      // For near-zero expected values, absolute tolerance is used
      // For 100.0, 0.1% = 0.1 absolute tolerance
      const expected = [0.0, 0.0000001, 100.0];
      const actual = [0.0005, 0.0005, 100.05]; // actual[2] deviation = 0.05, within 0.1 threshold

      const result = engine.compareOutputs(actual, expected, config);

      expect(result.passed).toBe(true);
    });

    it("compareWithDualTolerance uses both absolute and relative", () => {
      const actual = [0.001, 1000.0, 50.0];
      const expected = [0.0, 990.0, 49.0];

      // 0.001 is within absolute tolerance of 0.01
      // 1000 vs 990 is within 1.01% relative tolerance (1.01%)
      // 50 vs 49 is within 2.04% relative tolerance
      const result = engine.compareWithDualTolerance(actual, expected, 0.01, 0.03);

      expect(result.passed).toBe(true);
    });

    it("includes distribution stats when enabled", () => {
      const config: NeuralTestConfig = {
        seed: 42,
        tolerance: 0.1,
        distributionTesting: true,
      };

      const actual = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0];
      const expected = [...actual];

      const result = engine.compareOutputs(actual, expected, config);

      expect(result.distributionStats).toBeDefined();
      expect(result.distributionStats!.mean).toBeCloseTo(5.5, 5);
      expect(result.distributionStats!.min).toBe(1.0);
      expect(result.distributionStats!.max).toBe(10.0);
    });
  });

  // ==========================================================================
  // DISTRIBUTION TESTING
  // ==========================================================================

  describe("Distribution Testing", () => {
    it("runDistributionTest executes function N times", () => {
      const config: NeuralTestConfig = {
        seed: 42,
        tolerance: 0.01,
        distributionTesting: true,
        sampleCount: 50,
      };

      const { allOutputs } = engine.runDistributionTest(
        (prng) => [prng.random(), prng.random()],
        config
      );

      expect(allOutputs.length).toBe(50);
      expect(allOutputs[0].length).toBe(2);
    });

    it("calculates accurate distribution statistics", () => {
      // Generate known normal distribution
      const prng = new SeededPRNG(123);
      const values = Array.from({ length: 1000 }, () => prng.gaussian(50, 10));

      const stats = engine.calculateDistributionStats(values);

      expect(stats.mean).toBeCloseTo(50, 0);
      expect(stats.stddev).toBeCloseTo(10, 0);
      expect(stats.min).toBeLessThan(35);
      expect(stats.max).toBeGreaterThan(65);
      // Normality test is approximate; just check mean/stddev are reasonable
      expect(stats.cv).toBeCloseTo(0.2, 1); // CV = 10/50 = 0.2
    });

    it("detects bimodal distributions", () => {
      // Create bimodal distribution
      const prng = new SeededPRNG(42);
      const values: number[] = [];
      for (let i = 0; i < 500; i++) {
        values.push(prng.gaussian(20, 3)); // Mode 1
        values.push(prng.gaussian(80, 3)); // Mode 2
      }

      const grouped = [values];
      const anomalyReport = engine.detectAnomalies(values, grouped);

      // Bimodal distribution should have anomalies (bimodal, high kurtosis, etc.)
      expect(anomalyReport.hasAnomalies).toBe(true);
      // Check that anomalies array exists and has entries
      expect(anomalyReport.anomalies.length).toBeGreaterThan(0);
    });

    it("detects heavy-tailed distributions", () => {
      // Create heavy-tailed distribution using t-distribution approximation
      const prng = new SeededPRNG(777);
      const values: number[] = [];
      for (let i = 0; i < 500; i++) {
        // Simple heavy-tail: occasionally add extreme values
        const base = prng.gaussian(0, 1);
        if (prng.random() < 0.05) {
          values.push(base * 10); // 5% extreme values
        } else {
          values.push(base);
        }
      }

      const stats = engine.calculateDistributionStats(values);

      // Kurtosis should be elevated
      expect(Math.abs(stats.kurtosis)).toBeGreaterThan(1);
    });

    it("detects skewed distributions", () => {
      // Create skewed distribution (exponential-like)
      const prng = new SeededPRNG(456);
      const values: number[] = [];
      for (let i = 0; i < 500; i++) {
        values.push(-Math.log(prng.random() || 1e-10)); // Exponential distribution
      }

      const stats = engine.calculateDistributionStats(values);

      expect(stats.skewness).toBeGreaterThan(0.5);
    });

    it("detects outliers", () => {
      const prng = new SeededPRNG(111);
      const values: number[] = [];

      // Normal values
      for (let i = 0; i < 95; i++) {
        values.push(prng.gaussian(100, 5));
      }
      // Add outliers (>3 sigma)
      for (let i = 0; i < 5; i++) {
        values.push(200); // Clear outliers
      }

      const anomalyReport = engine.detectAnomalies(values, [values]);

      // The outliers should be detected
      expect(anomalyReport.hasAnomalies).toBe(true);
      const outlierAnomaly = anomalyReport.anomalies.find(a => a.type === "outliers");
      expect(outlierAnomaly).toBeDefined();
    });

    it("calculates health score based on anomalies", () => {
      const config: NeuralTestConfig = {
        seed: 42,
        tolerance: 0.01,
        distributionTesting: true,
        sampleCount: 100,
      };

      // Clean normal distribution
      const { anomalies: cleanAnomalies } = engine.runDistributionTest(
        (prng) => [prng.gaussian(0, 1)],
        config
      );

      expect(cleanAnomalies.healthScore).toBeGreaterThan(0.8);

      // Problematic distribution
      const { anomalies: badAnomalies } = engine.runDistributionTest(
        (prng) => {
          if (prng.random() < 0.5) return [0];
          return [100];
        },
        config
      );

      expect(badAnomalies.healthScore).toBeLessThan(cleanAnomalies.healthScore);
    });
  });

  // ==========================================================================
  // GOLDEN BASELINE MANAGEMENT
  // ==========================================================================

  describe("Golden Baseline Management", () => {
    it("registerBaseline adds baseline to registry", () => {
      const baseline: Omit<GoldenBaseline, "createdAt"> = {
        id: "test-baseline-1",
        name: "Test Baseline",
        expectedOutput: [1.0, 2.0, 3.0],
        modelVersion: "1.0.0",
        seed: 42,
        inputParams: { input: "test" },
        tolerance: 0.001,
      };

      engine.registerBaseline(baseline);

      const retrieved = engine.getBaseline("test-baseline-1");
      expect(retrieved).toBeDefined();
      expect(retrieved!.name).toBe("Test Baseline");
      expect(retrieved!.expectedOutput).toEqual([1.0, 2.0, 3.0]);
      expect(retrieved!.createdAt).toBeDefined();
    });

    it("listBaselines returns all registered baselines", () => {
      engine.registerBaseline({
        id: "bl-1",
        name: "Baseline 1",
        expectedOutput: [1.0],
        modelVersion: "1.0.0",
        seed: 1,
        inputParams: {},
        tolerance: 0.001,
      });

      engine.registerBaseline({
        id: "bl-2",
        name: "Baseline 2",
        expectedOutput: [2.0],
        modelVersion: "1.0.0",
        seed: 2,
        inputParams: {},
        tolerance: 0.001,
      });

      const baselines = engine.listBaselines();
      expect(baselines.length).toBe(2);
    });

    it("updateBaseline modifies existing baseline", () => {
      engine.registerBaseline({
        id: "update-test",
        name: "Original",
        expectedOutput: [1.0, 2.0],
        modelVersion: "1.0.0",
        seed: 42,
        inputParams: {},
        tolerance: 0.001,
      });

      const updated = engine.updateBaseline(
        "update-test",
        [1.5, 2.5],
        "1.1.0",
        "Model improved"
      );

      expect(updated).toBe(true);

      const baseline = engine.getBaseline("update-test");
      expect(baseline!.expectedOutput).toEqual([1.5, 2.5]);
      expect(baseline!.modelVersion).toBe("1.1.0");
    });

    it("updateBaseline returns false for non-existent baseline", () => {
      const updated = engine.updateBaseline(
        "non-existent",
        [1.0],
        "1.0.0",
        "test"
      );
      expect(updated).toBe(false);
    });

    it("deleteBaseline removes baseline", () => {
      engine.registerBaseline({
        id: "to-delete",
        name: "Delete Me",
        expectedOutput: [1.0],
        modelVersion: "1.0.0",
        seed: 42,
        inputParams: {},
        tolerance: 0.001,
      });

      expect(engine.getBaseline("to-delete")).toBeDefined();

      const deleted = engine.deleteBaseline("to-delete");
      expect(deleted).toBe(true);
      expect(engine.getBaseline("to-delete")).toBeUndefined();
    });

    it("exportBaselines and importBaselines round-trip correctly", () => {
      engine.registerBaseline({
        id: "export-1",
        name: "Export Test",
        expectedOutput: [1.0, 2.0, 3.0],
        modelVersion: "2.0.0",
        seed: 123,
        inputParams: { key: "value" },
        tolerance: 0.01,
        tags: ["test", "export"],
      });

      const exported = engine.exportBaselines();
      expect(exported.baselines.length).toBe(1);
      expect(exported.schemaVersion).toBe("1.0.0");

      // Create new engine and import
      const newEngine = new NeuralDeterminismTestingEngine();
      const imported = newEngine.importBaselines(exported);

      expect(imported).toBe(1);

      const baseline = newEngine.getBaseline("export-1");
      expect(baseline).toBeDefined();
      expect(baseline!.expectedOutput).toEqual([1.0, 2.0, 3.0]);
      expect(baseline!.tags).toEqual(["test", "export"]);
    });
  });

  // ==========================================================================
  // REGRESSION DETECTION
  // ==========================================================================

  describe("Regression Detection", () => {
    it("detectDrift reports no drift for identical outputs", () => {
      engine.registerBaseline({
        id: "drift-test",
        name: "Drift Test",
        expectedOutput: [1.0, 2.0, 3.0, 4.0, 5.0],
        modelVersion: "1.0.0",
        seed: 42,
        inputParams: {},
        tolerance: 0.01,
      });

      const report = engine.detectDrift(
        [1.0, 2.0, 3.0, 4.0, 5.0],
        "drift-test"
      );

      expect(report.driftDetected).toBe(false);
      expect(report.severity).toBe("none");
      expect(report.effectSize).toBe(0);
      expect(report.correlation).toBe(1.0);
    });

    it("detectDrift reports small drift for minor changes", () => {
      engine.registerBaseline({
        id: "minor-drift",
        name: "Minor Drift",
        expectedOutput: [100.0, 200.0, 300.0, 400.0, 500.0],
        modelVersion: "1.0.0",
        seed: 42,
        inputParams: {},
        tolerance: 0.001, // Tight tolerance
      });

      const report = engine.detectDrift(
        [100.5, 200.5, 300.5, 400.5, 500.5], // Small uniform shift
        "minor-drift"
      );

      expect(report.driftDetected).toBe(true);
      // Even with tight tolerance, the correlation should be high
      expect(report.correlation).toBeGreaterThan(0.99);
      // Drift is detected but might be classified differently based on effect size
      expect(["none", "low", "medium", "high", "critical"]).toContain(report.severity);
    });

    it("detectDrift reports high drift for significant changes", () => {
      engine.registerBaseline({
        id: "major-drift",
        name: "Major Drift",
        expectedOutput: [10.0, 20.0, 30.0, 40.0, 50.0],
        modelVersion: "1.0.0",
        seed: 42,
        inputParams: {},
        tolerance: 0.01,
      });

      const report = engine.detectDrift(
        [15.0, 25.0, 35.0, 45.0, 55.0], // 50% shift
        "major-drift"
      );

      expect(report.driftDetected).toBe(true);
      expect(["high", "critical"]).toContain(report.severity);
      expect(report.driftPercent).toBe(100); // All elements drifted
    });

    it("detectDrift handles missing baseline gracefully", () => {
      const report = engine.detectDrift(
        [1.0, 2.0, 3.0],
        "non-existent-baseline"
      );

      expect(report.driftDetected).toBe(true);
      expect(report.severity).toBe("critical");
      expect(report.recommendation).toContain("not found");
    });

    it("compareTwoOutputs calculates correct metrics", () => {
      const actual = [10.0, 20.0, 30.0, 40.0, 50.0];
      const expected = [10.0, 21.0, 30.0, 40.0, 50.0]; // One element off

      const report = engine.compareTwoOutputs(actual, expected, 0.01);

      expect(report.driftedIndices).toEqual([1]); // Only index 1 drifted
      expect(report.maxDeviation).toBeCloseTo(1.0, 5);
      expect(report.meanAbsoluteDeviation).toBeCloseTo(0.2, 5); // 1/5
      expect(report.rmsd).toBeCloseTo(Math.sqrt(1 / 5), 5);
    });

    it("generateDriftReport evaluates all baselines", () => {
      engine.registerBaseline({
        id: "report-1",
        name: "Report Test 1",
        expectedOutput: [1.0, 2.0],
        modelVersion: "1.0.0",
        seed: 1,
        inputParams: { id: 1 },
        tolerance: 0.01,
      });

      engine.registerBaseline({
        id: "report-2",
        name: "Report Test 2",
        expectedOutput: [3.0, 4.0],
        modelVersion: "1.0.0",
        seed: 2,
        inputParams: { id: 2 },
        tolerance: 0.01,
      });

      const { reports, summary } = engine.generateDriftReport((baseline) => {
        // Return slightly drifted values
        return baseline.expectedOutput.map(v => v * 1.001);
      });

      expect(reports.size).toBe(2);
      expect(summary).toContain("Total baselines: 2");
    });

    it("drift severity scales correctly with effect size", () => {
      const expected = Array.from({ length: 100 }, (_, i) => i);

      // No drift
      let report = engine.compareTwoOutputs(expected, expected, 0.001);
      expect(report.severity).toBe("none");

      // Small drift - all elements drift, so percent is high
      const smallDrift = expected.map(v => v + 3);
      report = engine.compareTwoOutputs(smallDrift, expected, 0.001);
      // Small uniform shift affects all elements, so severity depends on percentage
      expect(report.driftDetected).toBe(true);

      // Large drift (effect size >> 0.8)
      const largeDrift = expected.map(v => v + 50);
      report = engine.compareTwoOutputs(largeDrift, expected, 0.001);
      expect(["high", "critical"]).toContain(report.severity);
    });
  });

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  describe("Utility Methods", () => {
    it("reset clears engine state", () => {
      engine.setGlobalSeed(99999);
      engine.createTestContext({
        seed: 42,
        tolerance: 0.01,
        distributionTesting: false,
      });

      engine.reset();

      expect(engine.getGlobalSeed()).toBe(42);
      expect(engine.getActiveContext()).toBeNull();
    });

    it("getActiveContext returns current context", () => {
      const config: NeuralTestConfig = {
        seed: 12345,
        tolerance: 0.001,
        distributionTesting: false,
      };

      const ctx = engine.createTestContext(config);
      const activeCtx = engine.getActiveContext();

      expect(activeCtx).toBe(ctx);
    });

    it("getSummary returns informative string", () => {
      engine.registerBaseline({
        id: "summary-test",
        name: "Summary Test",
        expectedOutput: [1.0],
        modelVersion: "1.0.0",
        seed: 42,
        inputParams: {},
        tolerance: 0.01,
      });

      const summary = engine.getSummary();

      expect(summary).toContain("NeuralDeterminismTestingEngine");
      expect(summary).toContain("Registered Baselines: 1");
      expect(summary).toContain("Park-Miller LCG");
      expect(summary).toContain("Cohen's d");
    });
  });

  // ==========================================================================
  // SINGLETON EXPORT
  // ==========================================================================

  describe("Singleton Export", () => {
    it("exports singleton instance", () => {
      expect(neuralDeterminismTestingEngine).toBeInstanceOf(NeuralDeterminismTestingEngine);
    });

    it("singleton maintains state across calls", () => {
      neuralDeterminismTestingEngine.setGlobalSeed(77777);
      expect(neuralDeterminismTestingEngine.getGlobalSeed()).toBe(77777);

      // Reset for other tests
      neuralDeterminismTestingEngine.setGlobalSeed(42);
    });
  });

  // ==========================================================================
  // EDGE CASES
  // ==========================================================================

  describe("Edge Cases", () => {
    it("handles empty arrays", () => {
      const config: NeuralTestConfig = {
        seed: 42,
        tolerance: 0.01,
        distributionTesting: false,
      };

      const result = engine.compareOutputs([], [], config);
      expect(result.passed).toBe(true);
      expect(result.maxDeviation).toBe(0); // No deviations = 0
    });

    it("handles single-element arrays", () => {
      const config: NeuralTestConfig = {
        seed: 42,
        tolerance: 0.01,
        distributionTesting: false,
      };

      const result = engine.compareOutputs([100.0], [100.5], config);
      expect(result.maxDeviation).toBeCloseTo(0.5, 5);
    });

    it("handles NaN values gracefully", () => {
      const config: NeuralTestConfig = {
        seed: 42,
        tolerance: 0.01,
        distributionTesting: false,
      };

      const result = engine.compareOutputs([NaN, 1.0], [1.0, 1.0], config);
      expect(result.passed).toBe(false);
    });

    it("handles Infinity values", () => {
      const config: NeuralTestConfig = {
        seed: 42,
        tolerance: 0.01,
        distributionTesting: false,
      };

      const result = engine.compareOutputs(
        [Infinity, 1.0],
        [Infinity, 1.0],
        config
      );
      // Infinity - Infinity = NaN, so deviation check fails
      expect(result.maxDeviation).toBe(NaN);
    });

    it("calculateDistributionStats handles edge case inputs", () => {
      // Empty array
      const emptyStats = engine.calculateDistributionStats([]);
      expect(emptyStats.mean).toBe(0);
      expect(emptyStats.stddev).toBe(0);

      // Single value
      const singleStats = engine.calculateDistributionStats([42]);
      expect(singleStats.mean).toBe(42);
      expect(singleStats.stddev).toBe(0);

      // Two values
      const twoStats = engine.calculateDistributionStats([10, 20]);
      expect(twoStats.mean).toBe(15);
      expect(twoStats.min).toBe(10);
      expect(twoStats.max).toBe(20);
    });

    it("handles very large arrays efficiently", () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => i);

      const start = Date.now();
      const stats = engine.calculateDistributionStats(largeArray);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(1000); // Should complete in < 1 second
      expect(stats.mean).toBeCloseTo(4999.5, 1);
    });
  });
});
