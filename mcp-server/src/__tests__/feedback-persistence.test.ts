/**
 * Tests for FeedbackPersistenceEngine — Production-ready ML feedback improvements
 */
import { describe, it, expect, afterEach } from "vitest";
import { FeedbackPersistenceEngine } from "../engines/FeedbackPersistenceEngine.js";
import { MachineLearningFeedbackEngine } from "../engines/MachineLearningFeedbackEngine.js";
import * as fs from "fs";

const pe = new FeedbackPersistenceEngine();
const TEST_FILE = "C:/PRISM/mcp-server/data/test-ml-persist.json";

afterEach(() => {
  try { fs.unlinkSync(TEST_FILE); } catch { /* ignore */ }
  try { fs.unlinkSync(TEST_FILE + ".tmp"); } catch { /* ignore */ }
});

describe("FeedbackPersistenceEngine", () => {
  // ── 1. Persist to File ─────────────────────────────────────────────
  describe("persistToFile()", () => {
    it("should save ML data to JSON file", () => {
      const mlf = new MachineLearningFeedbackEngine();
      mlf.recordMeasurement({
        machineId: "DMG-1", measurementType: "dimension",
        measured: 25.01, predicted: 25.0, unit: "mm",
      });
      const r = pe.persistToFile({ engine: mlf, filePath: TEST_FILE });
      expect(r.saved).toBe(true);
      expect(r.machines).toBe(1);
      expect(r.measurements).toBe(1);
      expect(r.sizeBytes).toBeGreaterThan(0);
      expect(fs.existsSync(TEST_FILE)).toBe(true);
    });
  });

  // ── 2. Restore from File ───────────────────────────────────────────
  describe("restoreFromFile()", () => {
    it("should restore previously saved data", () => {
      const mlf1 = new MachineLearningFeedbackEngine();
      mlf1.recordMeasurement({
        machineId: "HAAS-1", measurementType: "force",
        measured: 520, predicted: 500, unit: "N",
      });
      mlf1.recordMeasurement({
        machineId: "HAAS-1", measurementType: "surface_finish",
        measured: 1.6, predicted: 1.5, unit: "um",
      });
      pe.persistToFile({ engine: mlf1, filePath: TEST_FILE });

      const mlf2 = new MachineLearningFeedbackEngine();
      const r = pe.restoreFromFile({ engine: mlf2, filePath: TEST_FILE });
      expect(r.restored).toBe(true);
      expect(r.machines).toBe(1);
      expect(r.measurements).toBe(2);
      expect(r.dataAge_hours).toBeGreaterThanOrEqual(0);

      // Verify data survived
      const profile = mlf2.getMachineProfile({ machineId: "HAAS-1" });
      expect(profile.totalMeasurements).toBe(2);
    });

    it("should handle missing file gracefully", () => {
      const mlf = new MachineLearningFeedbackEngine();
      const r = pe.restoreFromFile({ engine: mlf, filePath: "C:/PRISM/mcp-server/data/nonexistent-test-file.json" });
      expect(r.restored).toBe(false);
    });
  });

  // ── 3. Auto Match Prediction ───────────────────────────────────────
  describe("autoMatchPrediction()", () => {
    it("should predict force for steel using Kienzle", () => {
      const r = pe.autoMatchPrediction({
        measurementType: "force",
        parameters: { speed_mpm: 200, feed_mmrev: 0.15, depth_mm: 2 },
        material: "steel",
      });
      expect(r.predicted).toBeGreaterThan(0);
      expect(r.model).toContain("Kienzle");
    });

    it("should predict Ra for any material", () => {
      const r = pe.autoMatchPrediction({
        measurementType: "surface_finish",
        parameters: { feed_mmrev: 0.15, noseRadius_mm: 0.8 },
      });
      expect(r.predicted).toBeGreaterThan(0);
      expect(r.model.toLowerCase()).toContain("geometric");
    });

    it("should predict tool life using Taylor", () => {
      const r = pe.autoMatchPrediction({
        measurementType: "tool_life",
        parameters: { speed_mpm: 200 },
        material: "aluminum",
      });
      expect(r.predicted).toBeGreaterThan(0);
      expect(r.model).toContain("Taylor");
    });

    it("should return null for dimension (no standard model)", () => {
      const r = pe.autoMatchPrediction({
        measurementType: "dimension",
        parameters: {},
      });
      expect(r.predicted).toBeNull();
    });

    it("should handle superalloy material", () => {
      const r = pe.autoMatchPrediction({
        measurementType: "force",
        parameters: { feed_mmrev: 0.1, depth_mm: 1 },
        material: "inconel",
      });
      expect(r.predicted).toBeGreaterThan(0);
    });
  });

  // ── 4. Fleet Learning ──────────────────────────────────────────────
  describe("fleetLearning()", () => {
    it("should propagate bias from source to targets", () => {
      const mlf = new MachineLearningFeedbackEngine();
      // Source machine has learned bias
      for (let i = 0; i < 8; i++) {
        mlf.recordMeasurement({
          machineId: "DMG-1", measurementType: "dimension",
          measured: 25.02, predicted: 25.0, unit: "mm",
        });
      }
      // Initialize target machine
      mlf.recordMeasurement({
        machineId: "DMG-2", measurementType: "dimension",
        measured: 25.0, predicted: 25.0, unit: "mm",
      });
      mlf.autoCalibrate({ machineId: "DMG-1" });

      const r = pe.fleetLearning({
        sourceEngine: mlf,
        sourceMachineId: "DMG-1",
        targetMachineIds: ["DMG-2"],
        similarityWeights: { "DMG-2": 0.7 },
      });
      expect(r.message).toBeDefined();
      expect(r.targets).toBeDefined();
    });

    it("should not propagate with insufficient data", () => {
      const mlf = new MachineLearningFeedbackEngine();
      mlf.recordMeasurement({
        machineId: "M1", measurementType: "force",
        measured: 500, predicted: 490, unit: "N",
      });
      const r = pe.fleetLearning({
        sourceEngine: mlf,
        sourceMachineId: "M1",
        targetMachineIds: ["M2"],
        minSamples: 5,
      });
      expect(r.propagated).toBe(false);
    });
  });

  // ── 5. Anomaly Guard ───────────────────────────────────────────────
  describe("anomalyGuard()", () => {
    it("should accept normal measurement", () => {
      const history = [{ measured: 25.01 }, { measured: 24.99 }, { measured: 25.02 },
        { measured: 25.0 }, { measured: 24.98 }];
      const r = pe.anomalyGuard({
        measurement: { machineId: "M1", measurementType: "dimension", measured: 25.01, unit: "mm" },
        history,
      });
      expect(r.isAnomaly).toBe(false);
      expect(r.recommendation).toBe("accept");
    });

    it("should flag extreme outlier", () => {
      const history = [{ measured: 25.0 }, { measured: 25.01 }, { measured: 24.99 },
        { measured: 25.02 }, { measured: 24.98 }];
      const r = pe.anomalyGuard({
        measurement: { machineId: "M1", measurementType: "dimension", measured: 30.0, unit: "mm" },
        history,
      });
      expect(r.isAnomaly).toBe(true);
      expect(r.recommendation).toBe("reject");
      expect(Math.abs(r.zScore)).toBeGreaterThan(3);
    });

    it("should reject physically impossible values", () => {
      const r = pe.anomalyGuard({
        measurement: { machineId: "M1", measurementType: "surface_finish", measured: -0.5, unit: "um" },
        history: [{ measured: 1.5 }, { measured: 1.6 }],
      });
      expect(r.isAnomaly).toBe(true);
      expect(r.reason!.toLowerCase()).toContain("physical");
    });
  });

  // ── 6. Time-Weighted Calibrate ─────────────────────────────────────
  describe("timeWeightedCalibrate()", () => {
    it("should weight recent measurements more", () => {
      const now = Date.now();
      const measurements = [
        // Old measurements (30 days ago): bias = +0.05
        ...Array.from({ length: 5 }, (_, i) => ({
          measured: 25.05, predicted: 25.0,
          timestamp: now - 30 * 24 * 60 * 60 * 1000 + i * 1000,
        })),
        // Recent measurements (1 day ago): bias = -0.02
        ...Array.from({ length: 5 }, (_, i) => ({
          measured: 24.98, predicted: 25.0,
          timestamp: now - 1 * 24 * 60 * 60 * 1000 + i * 1000,
        })),
      ];
      const r = pe.timeWeightedCalibrate({ measurements, decayRate: 0.05, now });
      // Weighted bias should lean toward recent (-0.02) not old (+0.05)
      expect(r.weightedBias).toBeLessThan(0.03);
      expect(r.effectiveSampleSize).toBeGreaterThan(0);
      expect(r.effectiveSampleSize).toBeLessThanOrEqual(10);
      expect(r.trendDirection).toBeDefined();
    });

    it("should handle all recent measurements equally", () => {
      const now = Date.now();
      const measurements = Array.from({ length: 5 }, (_, i) => ({
        measured: 25.01, predicted: 25.0,
        timestamp: now - i * 60 * 1000, // all within last 5 minutes
      }));
      const r = pe.timeWeightedCalibrate({ measurements, now });
      expect(r.weightedBias).toBeCloseTo(0.01, 2);
      expect(r.effectiveSampleSize).toBeCloseTo(5, 0);
    });
  });

  // ── 7. Parse CMM Export ────────────────────────────────────────────
  describe("parseCMMExport()", () => {
    it("should parse standard CMM CSV", () => {
      const csv = `Feature,Nominal,Actual,Deviation,Tolerance
Bore_1,25.000,25.012,0.012,0.025
Bore_2,30.000,29.995,-0.005,0.020
Width_1,50.000,50.045,0.045,0.040`;
      const r = pe.parseCMMExport({ csvContent: csv, machineId: "CMM-1" });
      expect(r.totalFeatures).toBe(3);
      expect(r.measurements).toHaveLength(3);
      expect(r.outOfTolerance).toBe(1); // Width_1 exceeds tolerance
      expect(r.worstDeviation.feature).toBe("Width_1");
      expect(r.measurements[0].nominal).toBe(25.0);
      expect(r.measurements[0].actual).toBe(25.012);
    });

    it("should handle semicolon delimiter", () => {
      const csv = `Feature;Nominal;Actual;Deviation;Tolerance
D1;10.000;10.005;0.005;0.010`;
      const r = pe.parseCMMExport({ csvContent: csv, machineId: "CMM-1", delimiter: ";" });
      expect(r.totalFeatures).toBe(1);
    });
  });

  // ── Stats ──────────────────────────────────────────────────────────
  describe("stats()", () => {
    it("should report 7 methods", () => {
      const s = pe.stats();
      expect(s.methods).toHaveLength(7);
    });
  });
});
