import { describe, it, expect, beforeEach } from "vitest";
import {
  EngineAccuracyTrackerEngine,
  type PredictionOutcome,
  type EngineAccuracySummary,
  type DegradationAlert,
} from "../engines/EngineAccuracyTrackerEngine.js";

describe("EngineAccuracyTrackerEngine", () => {
  let engine: EngineAccuracyTrackerEngine;

  beforeEach(() => {
    engine = new EngineAccuracyTrackerEngine();
  });

  describe("recordOutcome", () => {
    it("should record a prediction outcome with all fields", () => {
      const outcome = engine.recordOutcome(
        "KienzleForceEngine",
        "cutting_force",
        450,
        463,
        "N",
        { material: "P20", ap: 2, fz: 0.1 }
      );

      expect(outcome.id).toMatch(/^eat-/);
      expect(outcome.engineId).toBe("KienzleForceEngine");
      expect(outcome.metricName).toBe("cutting_force");
      expect(outcome.predicted).toBe(450);
      expect(outcome.actual).toBe(463);
      expect(outcome.unit).toBe("N");
      expect(outcome.context).toEqual({ material: "P20", ap: 2, fz: 0.1 });
      expect(outcome.timestamp).toBeDefined();
    });

    it("should record outcome without optional fields", () => {
      const outcome = engine.recordOutcome("TaylorToolLifeEngine", "tool_life", 60, 55);

      expect(outcome.engineId).toBe("TaylorToolLifeEngine");
      expect(outcome.unit).toBeUndefined();
      expect(outcome.context).toBeUndefined();
    });

    it("should throw on empty engineId", () => {
      expect(() => engine.recordOutcome("", "metric", 1, 1)).toThrow("engineId is required");
      expect(() => engine.recordOutcome("  ", "metric", 1, 1)).toThrow("engineId is required");
    });

    it("should throw on empty metricName", () => {
      expect(() => engine.recordOutcome("engine", "", 1, 1)).toThrow("metricName is required");
    });

    it("should throw on non-finite predicted value", () => {
      expect(() => engine.recordOutcome("engine", "metric", NaN, 1)).toThrow(
        "predicted must be a finite number"
      );
      expect(() => engine.recordOutcome("engine", "metric", Infinity, 1)).toThrow(
        "predicted must be a finite number"
      );
    });

    it("should throw on non-finite actual value", () => {
      expect(() => engine.recordOutcome("engine", "metric", 1, NaN)).toThrow(
        "actual must be a finite number"
      );
    });

    it("should handle zero values correctly", () => {
      const outcome = engine.recordOutcome("TestEngine", "metric", 0, 0);
      expect(outcome.predicted).toBe(0);
      expect(outcome.actual).toBe(0);
    });

    it("should handle negative values", () => {
      const outcome = engine.recordOutcome("TestEngine", "temp_error", -5.2, -4.8);
      expect(outcome.predicted).toBeCloseTo(-5.2);
      expect(outcome.actual).toBeCloseTo(-4.8);
    });
  });

  describe("getEngineAccuracy", () => {
    it("should return null for unknown engine", () => {
      expect(engine.getEngineAccuracy("UnknownEngine")).toBeNull();
    });

    it("should throw on empty engineId", () => {
      expect(() => engine.getEngineAccuracy("")).toThrow("engineId required");
    });

    it("should compute accuracy for single outcome", () => {
      engine.recordOutcome("TestEngine", "force", 100, 110);

      const summary = engine.getEngineAccuracy("TestEngine");
      expect(summary).not.toBeNull();
      expect(summary!.engineId).toBe("TestEngine");
      expect(summary!.totalOutcomes).toBe(1);
      expect(summary!.overallMape).toBeCloseTo(0.0909, 3);
      expect(summary!.overallAccuracy).toBeCloseTo(0.9091, 3);
    });

    it("should compute accuracy across multiple outcomes", () => {
      engine.recordOutcome("ForceEngine", "Fc", 450, 460);
      engine.recordOutcome("ForceEngine", "Fc", 500, 490);
      engine.recordOutcome("ForceEngine", "Fc", 380, 395);

      const summary = engine.getEngineAccuracy("ForceEngine");
      expect(summary!.totalOutcomes).toBe(3);
      expect(summary!.overallMape).toBeLessThan(0.05);
      expect(summary!.overallAccuracy).toBeGreaterThan(0.95);
    });

    it("should track multiple metrics per engine", () => {
      engine.recordOutcome("HybridEngine", "force", 100, 105);
      engine.recordOutcome("HybridEngine", "power", 5.0, 5.2);
      engine.recordOutcome("HybridEngine", "temperature", 200, 210);

      const summary = engine.getEngineAccuracy("HybridEngine");
      expect(summary!.metrics.size).toBe(3);
      expect(summary!.metrics.has("force")).toBe(true);
      expect(summary!.metrics.has("power")).toBe(true);
      expect(summary!.metrics.has("temperature")).toBe(true);
    });

    it("should include timestamps", () => {
      engine.recordOutcome("TestEngine", "metric", 1, 1);

      const summary = engine.getEngineAccuracy("TestEngine");
      expect(summary!.firstRecordedAt).toBeDefined();
      expect(summary!.lastRecordedAt).toBeDefined();
      expect(new Date(summary!.firstRecordedAt).getTime()).toBeGreaterThan(0);
    });
  });

  describe("getMetricAccuracy", () => {
    beforeEach(() => {
      engine.recordOutcome("Engine", "metric_a", 100, 105);
      engine.recordOutcome("Engine", "metric_a", 200, 210);
      engine.recordOutcome("Engine", "metric_b", 50, 52);
    });

    it("should return stats for specific metric", () => {
      const stats = engine.getMetricAccuracy("Engine", "metric_a");
      expect(stats).not.toBeNull();
      expect(stats!.metricName).toBe("metric_a");
      expect(stats!.sampleCount).toBe(2);
    });

    it("should return null for unknown metric", () => {
      expect(engine.getMetricAccuracy("Engine", "unknown")).toBeNull();
    });

    it("should throw on empty inputs", () => {
      expect(() => engine.getMetricAccuracy("", "metric")).toThrow("engineId required");
      expect(() => engine.getMetricAccuracy("Engine", "")).toThrow("metricName required");
    });

    it("should compute bias correctly", () => {
      const stats = engine.getMetricAccuracy("Engine", "metric_a");
      expect(stats!.bias).toBeGreaterThan(0);
    });
  });

  describe("getAccuracyReport", () => {
    it("should return empty report for no data", () => {
      const report = engine.getAccuracyReport();
      expect(report.totalEngines).toBe(0);
      expect(report.totalOutcomes).toBe(0);
      expect(report.engineSummaries).toHaveLength(0);
    });

    it("should aggregate multiple engines", () => {
      engine.recordOutcome("Engine1", "force", 100, 105);
      engine.recordOutcome("Engine2", "power", 10, 11);
      engine.recordOutcome("Engine3", "temp", 200, 195);

      const report = engine.getAccuracyReport();
      expect(report.totalEngines).toBe(3);
      expect(report.totalOutcomes).toBe(3);
      expect(report.engineSummaries).toHaveLength(3);
    });

    it("should identify top performers", () => {
      engine.recordOutcome("AccurateEngine", "metric", 100, 100);
      engine.recordOutcome("InaccurateEngine", "metric", 100, 150);

      const report = engine.getAccuracyReport();
      expect(report.topPerformers[0].engineId).toBe("AccurateEngine");
    });

    it("should calculate system-wide accuracy", () => {
      for (let i = 0; i < 10; i++) {
        engine.recordOutcome("GoodEngine", "metric", 100, 100 + i);
      }

      const report = engine.getAccuracyReport();
      expect(report.systemAccuracy).toBeGreaterThan(0.9);
    });

    it("should include generation timestamp", () => {
      const report = engine.getAccuracyReport();
      expect(report.generatedAt).toBeDefined();
      expect(new Date(report.generatedAt).getTime()).toBeGreaterThan(0);
    });
  });

  describe("flagDegradingEngines", () => {
    it("should return empty for no data", () => {
      expect(engine.flagDegradingEngines()).toHaveLength(0);
    });

    it("should not flag engines with too few samples", () => {
      engine.recordOutcome("TestEngine", "metric", 100, 200);
      expect(engine.flagDegradingEngines()).toHaveLength(0);
    });

    it("should flag low-accuracy engines", () => {
      for (let i = 0; i < 10; i++) {
        engine.recordOutcome("BadEngine", "metric", 100, 170);
      }

      const alerts = engine.flagDegradingEngines(0.8);
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].engineId).toBe("BadEngine");
    });

    it("should include recommendation in alerts", () => {
      for (let i = 0; i < 10; i++) {
        engine.recordOutcome("BadEngine", "metric", 100, 200);
      }

      const alerts = engine.flagDegradingEngines(0.8);
      expect(alerts[0].recommendation).toBeDefined();
      expect(alerts[0].recommendation.length).toBeGreaterThan(0);
    });

    it("should respect custom threshold", () => {
      for (let i = 0; i < 10; i++) {
        engine.recordOutcome("OkEngine", "metric", 100, 115);
      }

      const alertsStrict = engine.flagDegradingEngines(0.95);
      const alertsLenient = engine.flagDegradingEngines(0.7);

      expect(alertsStrict.length).toBeGreaterThanOrEqual(alertsLenient.length);
    });
  });

  describe("queryOutcomes", () => {
    beforeEach(() => {
      engine.recordOutcome("Engine1", "force", 100, 105);
      engine.recordOutcome("Engine1", "power", 10, 11);
      engine.recordOutcome("Engine2", "force", 200, 210);
    });

    it("should filter by engineId", () => {
      const results = engine.queryOutcomes({ engineId: "Engine1" });
      expect(results).toHaveLength(2);
      expect(results.every((r) => r.engineId === "Engine1")).toBe(true);
    });

    it("should filter by metricName", () => {
      const results = engine.queryOutcomes({ metricName: "force" });
      expect(results).toHaveLength(2);
      expect(results.every((r) => r.metricName === "force")).toBe(true);
    });

    it("should respect limit", () => {
      const results = engine.queryOutcomes({ limit: 1 });
      expect(results).toHaveLength(1);
    });

    it("should sort by timestamp descending", () => {
      const results = engine.queryOutcomes({});
      const timestamps = results.map((r) => new Date(r.timestamp).getTime());

      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i]).toBeLessThanOrEqual(timestamps[i - 1]);
      }
    });

    it("should combine filters", () => {
      const results = engine.queryOutcomes({ engineId: "Engine1", metricName: "force" });
      expect(results).toHaveLength(1);
    });
  });

  describe("listEngines and listMetrics", () => {
    beforeEach(() => {
      engine.recordOutcome("Alpha", "x", 1, 1);
      engine.recordOutcome("Beta", "y", 2, 2);
      engine.recordOutcome("Alpha", "z", 3, 3);
    });

    it("should list all engines", () => {
      const engines = engine.listEngines();
      expect(engines).toContain("Alpha");
      expect(engines).toContain("Beta");
      expect(engines).toHaveLength(2);
    });

    it("should list engines in sorted order", () => {
      const engines = engine.listEngines();
      expect(engines[0]).toBe("Alpha");
      expect(engines[1]).toBe("Beta");
    });

    it("should list metrics for specific engine", () => {
      const metrics = engine.listMetrics("Alpha");
      expect(metrics).toContain("x");
      expect(metrics).toContain("z");
      expect(metrics).not.toContain("y");
    });
  });

  describe("getStats", () => {
    it("should return zero counts for empty engine", () => {
      const stats = engine.getStats();
      expect(stats.totalOutcomes).toBe(0);
      expect(stats.totalEngines).toBe(0);
      expect(stats.totalMetrics).toBe(0);
      expect(stats.oldestRecord).toBeNull();
      expect(stats.newestRecord).toBeNull();
    });

    it("should count correctly", () => {
      engine.recordOutcome("E1", "m1", 1, 1);
      engine.recordOutcome("E1", "m2", 2, 2);
      engine.recordOutcome("E2", "m1", 3, 3);

      const stats = engine.getStats();
      expect(stats.totalOutcomes).toBe(3);
      expect(stats.totalEngines).toBe(2);
      expect(stats.totalMetrics).toBe(3);
    });
  });

  describe("clear", () => {
    it("should remove all outcomes", () => {
      engine.recordOutcome("E1", "m", 1, 1);
      engine.recordOutcome("E2", "m", 2, 2);
      expect(engine.getStats().totalOutcomes).toBe(2);

      engine.clear();
      expect(engine.getStats().totalOutcomes).toBe(0);
      expect(engine.listEngines()).toHaveLength(0);
    });
  });

  describe("export and import", () => {
    it("should export all outcomes", () => {
      engine.recordOutcome("E1", "m1", 100, 105);
      engine.recordOutcome("E2", "m2", 200, 210);

      const exported = engine.exportOutcomes();
      expect(exported).toHaveLength(2);
      expect(exported[0].engineId).toBe("E1");
    });

    it("should import valid outcomes", () => {
      const outcomes: PredictionOutcome[] = [
        {
          id: "test-1",
          engineId: "ImportedEngine",
          timestamp: new Date().toISOString(),
          metricName: "imported_metric",
          predicted: 50,
          actual: 55,
        },
      ];

      const count = engine.importOutcomes(outcomes);
      expect(count).toBe(1);
      expect(engine.listEngines()).toContain("ImportedEngine");
    });

    it("should filter invalid outcomes during import", () => {
      const outcomes = [
        { id: "valid", engineId: "E", metricName: "m", predicted: 1, actual: 1, timestamp: "" },
        { id: "", engineId: "E", metricName: "m", predicted: 1, actual: 1, timestamp: "" },
        { id: "x", engineId: "", metricName: "m", predicted: 1, actual: 1, timestamp: "" },
      ] as PredictionOutcome[];

      const count = engine.importOutcomes(outcomes);
      expect(count).toBe(1);
    });
  });

  describe("trend detection", () => {
    it("should report unknown trend with insufficient data", () => {
      for (let i = 0; i < 10; i++) {
        engine.recordOutcome("TestEngine", "metric", 100, 105);
      }

      const summary = engine.getEngineAccuracy("TestEngine");
      expect(summary!.trend).toBe("unknown");
    });

    it("should detect stable trend", () => {
      for (let i = 0; i < 50; i++) {
        engine.recordOutcome("StableEngine", "metric", 100, 105);
      }

      const summary = engine.getEngineAccuracy("StableEngine");
      expect(summary!.trend).toBe("stable");
    });

    it("should detect degrading trend", () => {
      for (let i = 0; i < 30; i++) {
        engine.recordOutcome("DegradingEngine", "metric", 100, 105);
      }
      for (let i = 0; i < 30; i++) {
        engine.recordOutcome("DegradingEngine", "metric", 100, 140);
      }

      const summary = engine.getEngineAccuracy("DegradingEngine");
      expect(summary!.trend).toBe("degrading");
    });

    it("should detect improving trend", () => {
      for (let i = 0; i < 30; i++) {
        engine.recordOutcome("ImprovingEngine", "metric", 100, 140);
      }
      for (let i = 0; i < 30; i++) {
        engine.recordOutcome("ImprovingEngine", "metric", 100, 102);
      }

      const summary = engine.getEngineAccuracy("ImprovingEngine");
      expect(summary!.trend).toBe("improving");
    });
  });

  describe("Wilson confidence interval", () => {
    it("should compute Wilson bounds for metric accuracy", () => {
      for (let i = 0; i < 100; i++) {
        const error = Math.random() * 0.15;
        engine.recordOutcome("WilsonTest", "metric", 100, 100 * (1 + error));
      }

      const stats = engine.getMetricAccuracy("WilsonTest", "metric");
      expect(stats!.wilson95Lower).toBeGreaterThanOrEqual(0);
      expect(stats!.wilson95Upper).toBeLessThanOrEqual(1);
      expect(stats!.wilson95Lower).toBeLessThan(stats!.wilson95Upper);
    });
  });

  describe("edge cases", () => {
    it("should handle prediction equal to actual", () => {
      engine.recordOutcome("PerfectEngine", "metric", 100, 100);

      const summary = engine.getEngineAccuracy("PerfectEngine");
      expect(summary!.overallMape).toBe(0);
      expect(summary!.overallAccuracy).toBe(1);
    });

    it("should handle actual value of zero", () => {
      engine.recordOutcome("ZeroActual", "metric", 5, 0);

      const summary = engine.getEngineAccuracy("ZeroActual");
      expect(summary).not.toBeNull();
      expect(Number.isFinite(summary!.overallMape)).toBe(true);
    });

    it("should handle very small values", () => {
      engine.recordOutcome("SmallValues", "metric", 0.0001, 0.00012);

      const summary = engine.getEngineAccuracy("SmallValues");
      expect(summary).not.toBeNull();
      expect(summary!.overallAccuracy).toBeGreaterThan(0);
    });

    it("should handle very large values", () => {
      engine.recordOutcome("LargeValues", "metric", 1e10, 1.05e10);

      const summary = engine.getEngineAccuracy("LargeValues");
      expect(summary).not.toBeNull();
      expect(summary!.overallMape).toBeCloseTo(0.05, 2);
    });
  });
});
