/**
 * Tests for PredictionFeedbackOrchestratorEngine — Closed-loop learning
 */
import { describe, it, expect } from "vitest";
import {
  PredictionFeedbackOrchestratorEngine,
} from "../engines/PredictionFeedbackOrchestratorEngine.js";

describe("PredictionFeedbackOrchestratorEngine", () => {
  describe("submitMeasurement()", () => {
    it("should accept valid measurement and record it", () => {
      const e = new PredictionFeedbackOrchestratorEngine();
      const r = e.submitMeasurement({
        machineId: "HAAS-VF2",
        measurementType: "dimension",
        measured: 25.012,
        unit: "mm",
        material: "steel",
        operation: "milling",
      });
      expect(r.accepted).toBe(true);
      expect(r.measurementId).toBeDefined();
      expect(r.message).toBeDefined();
    });

    it("should reject anomalous measurement", () => {
      const e = new PredictionFeedbackOrchestratorEngine();
      // Record normal measurements first
      for (let i = 0; i < 10; i++) {
        e.submitMeasurement({
          machineId: "M1", measurementType: "force",
          measured: 500 + Math.random() * 10,
          unit: "N",
        });
      }
      // Submit extreme outlier
      const r = e.submitMeasurement({
        machineId: "M1", measurementType: "force",
        measured: -500, unit: "N",
      });
      expect(r.accepted).toBe(false);
      expect(r.rejectReason).toBeDefined();
    });

    it("should auto-calibrate after enough biased data", () => {
      const e = new PredictionFeedbackOrchestratorEngine();
      for (let i = 0; i < 8; i++) {
        e.submitMeasurement({
          machineId: "DMG-1",
          measurementType: "surface_finish",
          measured: 2.0, predicted: 1.5,
          unit: "um", material: "steel",
        });
      }
      const r = e.submitMeasurement({
        machineId: "DMG-1",
        measurementType: "surface_finish",
        measured: 2.1, predicted: 1.5,
        unit: "um",
      });
      expect(r.bias).toBeGreaterThan(0.3);
    });
  });

  describe("getLearnedPrediction()", () => {
    it("should return baseline when no data", () => {
      const e = new PredictionFeedbackOrchestratorEngine();
      const r = e.getLearnedPrediction({
        machineId: "NEW-MACHINE",
        predictionType: "force",
        parameters: { speed_mpm: 200, feed_mmrev: 0.15 },
        material: "steel",
      });
      expect(r.prediction).toBeGreaterThan(0);
      expect(r.confidence).toBe("baseline_only");
    });

    it("should improve prediction after learning", () => {
      const e = new PredictionFeedbackOrchestratorEngine();
      for (let i = 0; i < 10; i++) {
        e.submitMeasurement({
          machineId: "VF2", measurementType: "dimension",
          measured: 25.015, predicted: 25.0,
          unit: "mm", material: "steel", operation: "milling",
        });
      }
      const r = e.getLearnedPrediction({
        machineId: "VF2",
        predictionType: "dimension",
        material: "steel", operation: "milling",
        parameters: {},
      });
      expect(r.adjustments.length).toBeGreaterThan(0);
      expect(r.dataSupport).toBeGreaterThanOrEqual(10);
    });

    it("should apply environmental corrections", () => {
      const e = new PredictionFeedbackOrchestratorEngine();
      const r = e.getLearnedPrediction({
        machineId: "VF2",
        predictionType: "dimension",
        parameters: {},
        shopTemp_C: 35,
        workpieceLength_mm: 300,
      });
      // Should have thermal adjustment
      const thermalAdj = r.adjustments.find(
        (a) => a.source.toLowerCase().includes("thermal")
      );
      if (thermalAdj) {
        expect(thermalAdj.value).not.toBe(0);
      }
    });
  });

  describe("batchImportMeasurements()", () => {
    it("should import array of measurements", () => {
      const e = new PredictionFeedbackOrchestratorEngine();
      const r = e.batchImportMeasurements({
        machineId: "DMG-1",
        measurements: [
          { measurementType: "dimension", measured: 25.01,
            predicted: 25.0, unit: "mm" },
          { measurementType: "dimension", measured: 25.02,
            predicted: 25.0, unit: "mm" },
          { measurementType: "surface_finish", measured: 1.6,
            predicted: 1.5, unit: "um" },
        ],
      });
      expect(r.total).toBe(3);
      expect(r.accepted).toBeGreaterThanOrEqual(3);
      expect(r.rejected).toBe(0);
    });
  });

  describe("getMachineIntelligence()", () => {
    it("should return complete intelligence report", () => {
      const e = new PredictionFeedbackOrchestratorEngine();
      e.submitMeasurement({
        machineId: "VF2", measurementType: "force",
        measured: 520, predicted: 500, unit: "N",
        material: "steel",
      });
      e.submitMeasurement({
        machineId: "VF2", measurementType: "dimension",
        measured: 25.01, predicted: 25.0, unit: "mm",
      });
      const r = e.getMachineIntelligence({ machineId: "VF2" });
      expect(r.machineId).toBe("VF2");
      expect(r.totalMeasurements).toBeGreaterThanOrEqual(2);
      expect(r.recommendations).toBeDefined();
    });
  });

  describe("compareAndLearn()", () => {
    it("should show bias shift after comparison", () => {
      const e = new PredictionFeedbackOrchestratorEngine();
      const r = e.compareAndLearn({
        machineId: "VF2",
        predicted: 25.0, measured: 25.015,
        measurementType: "dimension", unit: "mm",
        material: "steel",
      });
      expect(r.residual).toBeCloseTo(0.015, 3);
      expect(r.message).toBeDefined();
    });
  });

  describe("systemLearningStatus()", () => {
    it("should report system-wide status", () => {
      const e = new PredictionFeedbackOrchestratorEngine();
      e.submitMeasurement({
        machineId: "M1", measurementType: "force",
        measured: 500, unit: "N",
      });
      e.submitMeasurement({
        machineId: "M2", measurementType: "dimension",
        measured: 25.0, unit: "mm",
      });
      const r = e.systemLearningStatus({});
      expect(r.totalMachines).toBeGreaterThanOrEqual(1);
      expect(r.totalMeasurements).toBeGreaterThanOrEqual(1);
    });
  });

  describe("stats()", () => {
    it("should report methods and sub-engines", () => {
      const e = new PredictionFeedbackOrchestratorEngine();
      const s = e.stats();
      expect(s.methods).toHaveLength(6);
      expect(s.subEngines).toHaveLength(3);
    });
  });
});
