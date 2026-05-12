/**
 * Tests for StratifiedCalibrationEngine — Hierarchical Bayesian calibration
 * accounting for ALL variability sources
 */
import { describe, it, expect } from "vitest";
import { StratifiedCalibrationEngine } from "../engines/StratifiedCalibrationEngine.js";

describe("StratifiedCalibrationEngine", () => {
  // ── 1. Record Stratified ──────────────────────────────────────────
  describe("recordStratified()", () => {
    it("should record with full context at Level 5", () => {
      const e = new StratifiedCalibrationEngine();
      const r = e.recordStratified({
        machineId: "HAAS-VF2", material: "steel_1045",
        operation: "milling", toolFamily: "endmill", axis: "X",
        measurementType: "dimension",
        measured: 25.012, predicted: 25.0, unit: "mm",
      });
      expect(r.id).toBeDefined();
      expect(r.residual).toBeCloseTo(0.012, 3);
      expect(r.level).toBe(5);
      expect(r.contextKey).toContain("HAAS-VF2");
      expect(r.contextKey).toContain("steel_1045");
    });

    it("should record at Level 1 when only machine given", () => {
      const e = new StratifiedCalibrationEngine();
      const r = e.recordStratified({
        machineId: "DMG-1", measurementType: "force",
        measured: 520, predicted: 500, unit: "N",
      });
      expect(r.level).toBeGreaterThanOrEqual(1);
      expect(r.measurementsAtThisLevel).toBe(1);
    });

    it("should accumulate bias over multiple measurements", () => {
      const e = new StratifiedCalibrationEngine();
      for (let i = 0; i < 10; i++) {
        e.recordStratified({
          machineId: "HAAS-VF2", material: "steel",
          measurementType: "dimension",
          measured: 25.01, predicted: 25.0, unit: "mm",
        });
      }
      const r = e.recordStratified({
        machineId: "HAAS-VF2", material: "steel",
        measurementType: "dimension",
        measured: 25.012, predicted: 25.0, unit: "mm",
      });
      expect(r.measurementsAtThisLevel).toBe(11);
      expect(r.bias).toBeGreaterThan(0.005);
    });
  });

  // ── 2. Get Stratified Bias ────────────────────────────────────────
  describe("getStratifiedBias()", () => {
    it("should return Level 5 bias when data exists", () => {
      const e = new StratifiedCalibrationEngine();
      for (let i = 0; i < 8; i++) {
        e.recordStratified({
          machineId: "HAAS-VF2", material: "steel",
          operation: "milling", toolFamily: "endmill", axis: "X",
          measurementType: "dimension",
          measured: 25.015, predicted: 25.0, unit: "mm",
        });
      }
      const r = e.getStratifiedBias({
        machineId: "HAAS-VF2", material: "steel",
        operation: "milling", toolFamily: "endmill", axis: "X",
        measurementType: "dimension",
      });
      expect(r.bias).toBeCloseTo(0.015, 2);
      expect(r.nMeasurements).toBe(8);
      expect(r.confidence).not.toBe("prior_only");
    });

    it("should fall back to parent level when data sparse", () => {
      const e = new StratifiedCalibrationEngine();
      // Only record at machine+material level
      for (let i = 0; i < 8; i++) {
        e.recordStratified({
          machineId: "HAAS-VF2", material: "steel",
          measurementType: "dimension",
          measured: 25.02, predicted: 25.0, unit: "mm",
        });
      }
      // Query at deeper level (no data there)
      const r = e.getStratifiedBias({
        machineId: "HAAS-VF2", material: "steel",
        operation: "milling", toolFamily: "endmill", axis: "X",
        measurementType: "dimension",
      });
      expect(r.fallbackChain.length).toBeGreaterThan(0);
      // Should still find a bias from parent level
      expect(Math.abs(r.bias)).toBeGreaterThan(0);
    });
  });

  // ── 3. Calibrate Stratified ───────────────────────────────────────
  describe("calibrateStratified()", () => {
    it("should calibrate at deepest level with enough data", () => {
      const e = new StratifiedCalibrationEngine();
      for (let i = 0; i < 10; i++) {
        e.recordStratified({
          machineId: "DMG-1", material: "aluminum",
          operation: "milling", measurementType: "surface_finish",
          measured: 1.8, predicted: 1.5, unit: "um",
        });
      }
      const r = e.calibrateStratified({ machineId: "DMG-1" });
      expect(r.totalCalibrated).toBeGreaterThan(0);
      expect(r.calibrations.length).toBeGreaterThan(0);
    });
  });

  // ── 4. Context Tree ───────────────────────────────────────────────
  describe("getContextTree()", () => {
    it("should build tree of learned contexts", () => {
      const e = new StratifiedCalibrationEngine();
      e.recordStratified({
        machineId: "VF2", material: "steel", operation: "milling",
        measurementType: "dimension", measured: 25.01, predicted: 25.0, unit: "mm",
      });
      e.recordStratified({
        machineId: "VF2", material: "aluminum", operation: "drilling",
        measurementType: "force", measured: 300, predicted: 280, unit: "N",
      });
      const r = e.getContextTree({ machineId: "VF2" });
      expect(r.totalContexts).toBeGreaterThan(0);
      expect(r.totalMeasurements).toBeGreaterThanOrEqual(2);
    });
  });

  // ── 5. Environmental Adjust ───────────────────────────────────────
  describe("environmentalAdjust()", () => {
    it("should compute thermal correction", () => {
      const e = new StratifiedCalibrationEngine();
      const r = e.environmentalAdjust({
        shopTemp_C: 30, referenceTemp_C: 20,
        workpieceLength_mm: 200, thermalExpCoeff: 12e-6,
      });
      // δ = 12e-6 * 10 * 200 = 0.024mm
      expect(r.thermalCorrection_mm).toBeCloseTo(0.024, 3);
      expect(r.adjustmentBreakdown.length).toBeGreaterThan(0);
    });

    it("should compute coolant degradation factor", () => {
      const e = new StratifiedCalibrationEngine();
      const r = e.environmentalAdjust({ coolantAge_days: 30 });
      expect(r.coolantFactor).toBeGreaterThan(1);
    });

    it("should compute warm-up factor", () => {
      const e = new StratifiedCalibrationEngine();
      const cold = e.environmentalAdjust({ machineRuntime_hours: 0.1 });
      const warm = e.environmentalAdjust({ machineRuntime_hours: 4 });
      // Cold machine warm-up factor deviates more from 1.0
      expect(Math.abs(1 - cold.warmupFactor)).toBeGreaterThan(Math.abs(1 - warm.warmupFactor));
    });
  });

  // ── 6. Tool Wear Bias Model ───────────────────────────────────────
  describe("toolWearBiasModel()", () => {
    it("should fit quadratic wear-bias model", () => {
      const e = new StratifiedCalibrationEngine();
      const measurements = [
        { measured: 24.995, predicted: 25.0, toolWearState: 0.0 },
        { measured: 24.998, predicted: 25.0, toolWearState: 0.1 },
        { measured: 25.000, predicted: 25.0, toolWearState: 0.3 },
        { measured: 25.002, predicted: 25.0, toolWearState: 0.5 },
        { measured: 25.008, predicted: 25.0, toolWearState: 0.7 },
        { measured: 25.020, predicted: 25.0, toolWearState: 0.9 },
        { measured: 25.035, predicted: 25.0, toolWearState: 1.0 },
      ];
      const r = e.toolWearBiasModel({ measurements });
      expect(r.model.a).toBeDefined();
      expect(r.model.b).toBeDefined();
      expect(r.model.c).toBeDefined();
      // Fresh tool should be slightly negative bias
      expect(r.biasAtFresh).toBeLessThan(0.005);
      // End-of-life should be positive
      expect(r.biasAtEndOfLife).toBeGreaterThan(0.01);
      expect(r.rSquared).toBeGreaterThan(0.8);
      expect(typeof r.predictBias).toBe("function");
    });
  });

  // ── 7. Interaction Analysis ───────────────────────────────────────
  describe("interactionAnalysis()", () => {
    it("should detect main effects", () => {
      const e = new StratifiedCalibrationEngine();
      const measurements = [
        // Steel on Machine A: +0.01 bias
        ...Array.from({ length: 5 }, () => ({
          machineId: "A", material: "steel",
          operation: "milling", residual: 0.01,
        })),
        // Aluminum on Machine A: -0.01 bias
        ...Array.from({ length: 5 }, () => ({
          machineId: "A", material: "aluminum",
          operation: "milling", residual: -0.01,
        })),
        // Steel on Machine B: +0.02 bias
        ...Array.from({ length: 5 }, () => ({
          machineId: "B", material: "steel",
          operation: "milling", residual: 0.02,
        })),
        // Aluminum on Machine B: +0.005
        ...Array.from({ length: 5 }, () => ({
          machineId: "B", material: "aluminum",
          operation: "milling", residual: 0.005,
        })),
      ];
      const r = e.interactionAnalysis({ measurements });
      expect(r.mainEffects.length).toBeGreaterThan(0);
      expect(r.recommendations.length).toBeGreaterThan(0);
    });
  });

  // ── 8. Prediction With Full Context ───────────────────────────────
  describe("predictionWithFullContext()", () => {
    it("should combine all corrections", () => {
      const e = new StratifiedCalibrationEngine();
      // Build some history
      for (let i = 0; i < 10; i++) {
        e.recordStratified({
          machineId: "VF2", material: "steel", operation: "milling",
          measurementType: "dimension",
          measured: 25.015, predicted: 25.0, unit: "mm",
        });
      }
      e.calibrateStratified({ machineId: "VF2" });

      const r = e.predictionWithFullContext({
        machineId: "VF2", material: "steel", operation: "milling",
        predictionType: "dimension",
        baselinePrediction: 25.0,
        shopTemp_C: 28,
        workpieceLength_mm: 200,
        toolWearState: 0.5,
      });
      expect(r.finalPrediction).not.toBe(25.0);
      expect(r.adjustmentBreakdown.length).toBeGreaterThan(0);
      expect(r.totalAdjustment).not.toBe(0);
      expect(r.confidence).toBeDefined();
    });

    it("should return baseline when no data", () => {
      const e = new StratifiedCalibrationEngine();
      const r = e.predictionWithFullContext({
        machineId: "UNKNOWN", predictionType: "dimension",
        baselinePrediction: 50.0,
      });
      expect(r.finalPrediction).toBeCloseTo(50.0, 0);
      expect(r.confidence).toBe("baseline_only");
    });
  });

  // ── Engine instantiation ────────────────────────────────────────────
  describe("instantiation", () => {
    it("should create engine with 8 public methods", () => {
      const e = new StratifiedCalibrationEngine();
      expect(typeof e.recordStratified).toBe("function");
      expect(typeof e.getStratifiedBias).toBe("function");
      expect(typeof e.calibrateStratified).toBe("function");
      expect(typeof e.getContextTree).toBe("function");
      expect(typeof e.environmentalAdjust).toBe("function");
      expect(typeof e.toolWearBiasModel).toBe("function");
      expect(typeof e.interactionAnalysis).toBe("function");
      expect(typeof e.predictionWithFullContext).toBe("function");
    });
  });
});
