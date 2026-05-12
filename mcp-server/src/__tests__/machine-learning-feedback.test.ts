/**
 * Tests for MachineLearningFeedbackEngine — User measurement feedback loop
 * The engine that makes PRISM learn from every part the user makes.
 */
import { describe, it, expect } from "vitest";
import { MachineLearningFeedbackEngine } from "../engines/MachineLearningFeedbackEngine.js";

describe("MachineLearningFeedbackEngine", () => {
  // ── 1. Record Measurements ─────────────────────────────────────────
  describe("recordMeasurement()", () => {
    it("should record a dimension measurement and compute residual", () => {
      const engine = new MachineLearningFeedbackEngine();
      const r = engine.recordMeasurement({
        machineId: "DMG-1",
        measurementType: "dimension",
        measured: 25.012,
        predicted: 25.000,
        unit: "mm",
        material: "steel_1045",
        operation: "milling",
      });
      expect(r.id).toBeDefined();
      expect(r.residual).toBeCloseTo(0.012, 3);
      expect(r.measurementCount).toBe(1);
      expect(r.message).toBeDefined();
    });

    it("should accumulate measurements and compute running bias", () => {
      const engine = new MachineLearningFeedbackEngine();
      // Consistently measuring 0.01mm over predicted
      for (let i = 0; i < 10; i++) {
        engine.recordMeasurement({
          machineId: "DMG-1",
          measurementType: "dimension",
          measured: 25.01 + (Math.random() - 0.5) * 0.002,
          predicted: 25.000,
          unit: "mm",
        });
      }
      const r = engine.recordMeasurement({
        machineId: "DMG-1",
        measurementType: "dimension",
        measured: 25.012,
        predicted: 25.000,
        unit: "mm",
      });
      expect(r.measurementCount).toBe(11);
      expect(r.currentBias).toBeGreaterThan(0.005); // ~0.01 bias
      expect(r.currentRMSE).toBeGreaterThan(0);
    });

    it("should recommend calibration when bias is significant", () => {
      const engine = new MachineLearningFeedbackEngine();
      // 10 measurements all 0.5mm too high
      for (let i = 0; i < 10; i++) {
        engine.recordMeasurement({
          machineId: "HAAS-VF2",
          measurementType: "surface_finish",
          measured: 2.0,
          predicted: 1.5,
          unit: "um",
        });
      }
      const r = engine.recordMeasurement({
        machineId: "HAAS-VF2",
        measurementType: "surface_finish",
        measured: 2.1,
        predicted: 1.5,
        unit: "um",
      });
      expect(r.calibrationRecommended).toBe(true);
    });
  });

  // ── 2. Machine Profile ─────────────────────────────────────────────
  describe("getMachineProfile()", () => {
    it("should return profile with accumulated stats", () => {
      const engine = new MachineLearningFeedbackEngine();
      engine.recordMeasurement({
        machineId: "DMG-1", measurementType: "dimension",
        measured: 25.01, predicted: 25.0, unit: "mm", material: "steel_1045",
      });
      engine.recordMeasurement({
        machineId: "DMG-1", measurementType: "surface_finish",
        measured: 1.6, predicted: 1.5, unit: "um", material: "aluminum_6061",
      });
      const r = engine.getMachineProfile({ machineId: "DMG-1" });
      expect(r.totalMeasurements).toBe(2);
      expect(r.materials.length).toBeGreaterThanOrEqual(1);
      expect(r.measurementsByType).toBeDefined();
    });

    it("should return empty profile for unknown machine", () => {
      const engine = new MachineLearningFeedbackEngine();
      const r = engine.getMachineProfile({ machineId: "UNKNOWN" });
      expect(r.totalMeasurements).toBe(0);
    });
  });

  // ── 3. Auto Calibrate ──────────────────────────────────────────────
  describe("autoCalibrate()", () => {
    it("should calibrate force model from measurements", () => {
      const engine = new MachineLearningFeedbackEngine();
      // Record force measurements that are consistently 10% higher than predicted
      for (let i = 0; i < 8; i++) {
        engine.recordMeasurement({
          machineId: "DMG-1", measurementType: "force",
          measured: 550 + Math.random() * 20, predicted: 500,
          unit: "N", material: "steel_1045",
          parameters: { speed_mpm: 200, feed_mmrev: 0.15, depth_mm: 2 },
        });
      }
      const r = engine.autoCalibrate({ machineId: "DMG-1", measurementType: "force" });
      expect(r.calibrated).toBe(true);
      expect(r.calibrations.length).toBeGreaterThan(0);
      expect(r.machineCoefficients).toBeDefined();
    });

    it("should not calibrate with insufficient data", () => {
      const engine = new MachineLearningFeedbackEngine();
      engine.recordMeasurement({
        machineId: "DMG-1", measurementType: "force",
        measured: 550, predicted: 500, unit: "N",
      });
      const r = engine.autoCalibrate({ machineId: "DMG-1", minSamples: 5 });
      expect(r.calibrated).toBe(false);
    });

    it("should calibrate surface finish bias", () => {
      const engine = new MachineLearningFeedbackEngine();
      for (let i = 0; i < 6; i++) {
        engine.recordMeasurement({
          machineId: "OKUMA-1", measurementType: "surface_finish",
          measured: 1.8 + Math.random() * 0.1, predicted: 1.5,
          unit: "um",
        });
      }
      const r = engine.autoCalibrate({ machineId: "OKUMA-1" });
      expect(r.calibrated).toBe(true);
      const sfCal = r.calibrations.find((c) => c.type === "surface_finish");
      expect(sfCal).toBeDefined();
      expect(Math.abs(sfCal!.afterBias)).toBeLessThan(Math.abs(sfCal!.beforeBias));
    });
  });

  // ── 4. Predict with Learning ───────────────────────────────────────
  describe("predict()", () => {
    it("should predict with no_data confidence when no history", () => {
      const engine = new MachineLearningFeedbackEngine();
      const r = engine.predict({
        machineId: "NEW-MACHINE",
        predictionType: "force",
        parameters: { speed_mpm: 200, feed_mmrev: 0.15, depth_mm: 2 },
      });
      expect(r.predicted).toBeGreaterThan(0);
      expect(r.confidence).toBe("no_data");
      expect(r.basedOnMeasurements).toBe(0);
    });

    it("should improve predictions after calibration", () => {
      const engine = new MachineLearningFeedbackEngine();
      // This machine's Ra is always 0.3 higher than predicted
      for (let i = 0; i < 8; i++) {
        engine.recordMeasurement({
          machineId: "DMG-1", measurementType: "surface_finish",
          measured: 1.8, predicted: 1.5, unit: "um",
        });
      }
      engine.autoCalibrate({ machineId: "DMG-1" });
      const r = engine.predict({
        machineId: "DMG-1",
        predictionType: "surface_finish",
        parameters: { feed_mmrev: 0.15 },
      });
      expect(r.basedOnMeasurements).toBe(8);
      expect(r.adjustments.length).toBeGreaterThan(0);
    });
  });

  // ── 5. Accuracy Report ─────────────────────────────────────────────
  describe("getAccuracyReport()", () => {
    it("should compute accuracy metrics", () => {
      const engine = new MachineLearningFeedbackEngine();
      for (let i = 0; i < 15; i++) {
        engine.recordMeasurement({
          machineId: "DMG-1", measurementType: "dimension",
          measured: 25.0 + (Math.random() - 0.5) * 0.01,
          predicted: 25.0, unit: "mm", material: i < 10 ? "steel" : "aluminum",
        });
      }
      const r = engine.getAccuracyReport({ machineId: "DMG-1" });
      expect(r.overallAccuracy).toBeGreaterThanOrEqual(0);
      expect(r.overallAccuracy).toBeLessThanOrEqual(100);
      expect(r.rmse).toBeGreaterThanOrEqual(0);
      expect(r.trendDirection).toBeDefined();
    });

    it("should return empty report for unknown machine", () => {
      const engine = new MachineLearningFeedbackEngine();
      const r = engine.getAccuracyReport({ machineId: "UNKNOWN" });
      expect(r.totalMeasurements || r.overallAccuracy).toBeDefined();
    });
  });

  // ── 6. Compare Machines ────────────────────────────────────────────
  describe("compareMachines()", () => {
    it("should compare two machines", () => {
      const engine = new MachineLearningFeedbackEngine();
      // Machine A: accurate
      for (let i = 0; i < 5; i++) {
        engine.recordMeasurement({
          machineId: "MACHINE-A", measurementType: "dimension",
          measured: 25.001, predicted: 25.0, unit: "mm",
        });
      }
      // Machine B: biased
      for (let i = 0; i < 5; i++) {
        engine.recordMeasurement({
          machineId: "MACHINE-B", measurementType: "dimension",
          measured: 25.05, predicted: 25.0, unit: "mm",
        });
      }
      const r = engine.compareMachines({ machineIds: ["MACHINE-A", "MACHINE-B"] });
      expect(r.comparison).toHaveLength(2);
      expect(r.bestMachine).toBeDefined();
      expect(r.worstMachine).toBeDefined();
    });
  });

  // ── 7 & 8. Export/Import ───────────────────────────────────────────
  describe("export/import", () => {
    it("should export and reimport data", () => {
      const engine1 = new MachineLearningFeedbackEngine();
      engine1.recordMeasurement({
        machineId: "DMG-1", measurementType: "force",
        measured: 520, predicted: 500, unit: "N",
      });
      engine1.recordMeasurement({
        machineId: "DMG-1", measurementType: "dimension",
        measured: 25.01, predicted: 25.0, unit: "mm",
      });
      const exported = engine1.exportLearningData({});
      expect(exported.measurementCount).toBe(2);

      const engine2 = new MachineLearningFeedbackEngine();
      const imported = engine2.importLearningData({ data: exported.data });
      expect(imported.imported).toBe(2);
      expect(imported.machines).toContain("DMG-1");

      // Verify data survived
      const profile = engine2.getMachineProfile({ machineId: "DMG-1" });
      expect(profile.totalMeasurements).toBe(2);
    });
  });

  // ── Stats ──────────────────────────────────────────────────────────
  describe("stats()", () => {
    it("should report machine count and measurements", () => {
      const engine = new MachineLearningFeedbackEngine();
      engine.recordMeasurement({
        machineId: "M1", measurementType: "force",
        measured: 500, unit: "N",
      });
      const s = engine.stats();
      expect(s.machines).toBe(1);
      expect(s.totalMeasurements).toBe(1);
    });
  });
});
