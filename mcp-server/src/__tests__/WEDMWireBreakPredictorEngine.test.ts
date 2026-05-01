/**
 * WEDMWireBreakPredictorEngine.test.ts
 * Tests for ML-based wire break risk prediction
 */
import { describe, it, expect, beforeEach } from "vitest";
import { WEDMWireBreakPredictorEngine } from "../WEDMWireBreakPredictorEngine.js";

describe("WEDMWireBreakPredictorEngine", () => {
  let engine: WEDMWireBreakPredictorEngine;

  beforeEach(() => {
    engine = new WEDMWireBreakPredictorEngine();
  });

  describe("predict()", () => {
    it("should return low risk for conservative parameters", () => {
      const result = engine.predict({
        wireDiameter_mm: 0.25,
        peakCurrent_A: 8,
        onTime_us: 10,
        offTime_us: 30,
        thickness_mm: 25,
      });
      expect(result.breakProbability).toBeLessThan(0.3);
      expect(result.riskLevel).toBe("low");
    });

    it("should return high risk for aggressive parameters", () => {
      const result = engine.predict({
        wireDiameter_mm: 0.1,
        peakCurrent_A: 25,
        onTime_us: 80,
        offTime_us: 20,
        thickness_mm: 150,
        workpieceMaterial: "carbide",
        dielectricCondition: "contaminated",
      });
      expect(result.breakProbability).toBeGreaterThan(0.5);
      expect(["high", "critical"]).toContain(result.riskLevel);
    });

    it("should identify thermal as dominant factor for high current density", () => {
      const result = engine.predict({
        wireDiameter_mm: 0.15,
        peakCurrent_A: 20,
        onTime_us: 60,
        offTime_us: 15,
        thickness_mm: 30,
      });
      expect(result.riskFactors.thermal).toBeGreaterThan(0.3);
    });

    it("should identify corner as dominant factor for sharp angles", () => {
      const result = engine.predict({
        wireDiameter_mm: 0.25,
        peakCurrent_A: 10,
        onTime_us: 15,
        offTime_us: 30,
        thickness_mm: 25,
        cornerAngle_deg: 20,
      });
      expect(result.riskFactors.corner).toBeGreaterThan(0.5);
      expect(result.dominantFactor).toBe("corner");
    });

    it("should identify material risk for difficult materials", () => {
      const result = engine.predict({
        wireDiameter_mm: 0.25,
        peakCurrent_A: 10,
        onTime_us: 15,
        offTime_us: 30,
        thickness_mm: 80,
        workpieceMaterial: "inconel",
      });
      expect(result.riskFactors.material).toBeGreaterThan(0.3);
    });

    it("should return confidence interval", () => {
      const result = engine.predict({
        wireDiameter_mm: 0.25,
        peakCurrent_A: 12,
        onTime_us: 20,
        offTime_us: 40,
        thickness_mm: 30,
      });
      expect(result.confidenceInterval.lower).toBeLessThanOrEqual(result.breakProbability);
      expect(result.confidenceInterval.upper).toBeGreaterThanOrEqual(result.breakProbability);
    });

    it("should generate recommendations for high-risk scenarios", () => {
      const result = engine.predict({
        wireDiameter_mm: 0.15,
        peakCurrent_A: 18,
        onTime_us: 50,
        offTime_us: 20,
        thickness_mm: 100,
        workpieceMaterial: "carbide",
      });
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it("should compute safe parameters when risk exceeds threshold", () => {
      const result = engine.predict({
        wireDiameter_mm: 0.15,
        peakCurrent_A: 22,
        onTime_us: 70,
        offTime_us: 15,
        thickness_mm: 80,
        workpieceMaterial: "titanium",
      });
      if (result.breakProbability > 0.3) {
        expect(result.safeParameters).toBeDefined();
      }
    });

    it("should handle wire type selection", () => {
      const brassResult = engine.predict({
        wireDiameter_mm: 0.25,
        wireType: "brass_hard",
        peakCurrent_A: 15,
        onTime_us: 25,
        offTime_us: 40,
        thickness_mm: 40,
      });
      const molyResult = engine.predict({
        wireDiameter_mm: 0.25,
        wireType: "molybdenum",
        peakCurrent_A: 15,
        onTime_us: 25,
        offTime_us: 40,
        thickness_mm: 40,
      });
      expect(molyResult.breakProbability).toBeLessThan(brassResult.breakProbability);
    });

    it("should factor in wire tension", () => {
      const lowTension = engine.predict({
        wireDiameter_mm: 0.25,
        wireTension_N: 5,
        peakCurrent_A: 12,
        onTime_us: 20,
        offTime_us: 35,
        thickness_mm: 30,
      });
      const highTension = engine.predict({
        wireDiameter_mm: 0.25,
        wireTension_N: 15,
        peakCurrent_A: 12,
        onTime_us: 20,
        offTime_us: 35,
        thickness_mm: 30,
      });
      expect(highTension.riskFactors.mechanical).toBeGreaterThan(lowTension.riskFactors.mechanical);
    });

    it("should factor in flushing conditions", () => {
      const cleanResult = engine.predict({
        wireDiameter_mm: 0.25,
        peakCurrent_A: 12,
        onTime_us: 20,
        offTime_us: 35,
        thickness_mm: 30,
        dielectricCondition: "clean",
      });
      const contaminatedResult = engine.predict({
        wireDiameter_mm: 0.25,
        peakCurrent_A: 12,
        onTime_us: 20,
        offTime_us: 35,
        thickness_mm: 30,
        dielectricCondition: "contaminated",
      });
      expect(contaminatedResult.riskFactors.flushing).toBeGreaterThan(cleanResult.riskFactors.flushing);
    });

    it("should factor in wire fatigue from reuse", () => {
      const freshWire = engine.predict({
        wireDiameter_mm: 0.25,
        peakCurrent_A: 12,
        onTime_us: 20,
        offTime_us: 35,
        thickness_mm: 30,
        wireReuseCount: 0,
      });
      const reusedWire = engine.predict({
        wireDiameter_mm: 0.25,
        peakCurrent_A: 12,
        onTime_us: 20,
        offTime_us: 35,
        thickness_mm: 30,
        wireReuseCount: 5,
      });
      expect(reusedWire.riskFactors.fatigue).toBeGreaterThan(freshWire.riskFactors.fatigue);
    });
  });

  describe("getSupportedWireTypes()", () => {
    it("should return list of wire types", () => {
      const types = engine.getSupportedWireTypes();
      expect(types).toContain("brass_hard");
      expect(types).toContain("molybdenum");
      expect(types).toContain("tungsten");
      expect(types.length).toBeGreaterThan(5);
    });
  });

  describe("getSupportedMaterials()", () => {
    it("should return list of workpiece materials", () => {
      const materials = engine.getSupportedMaterials();
      expect(materials).toContain("tool_steel");
      expect(materials).toContain("carbide");
      expect(materials).toContain("titanium");
      expect(materials.length).toBeGreaterThan(5);
    });
  });

  describe("compareParameters()", () => {
    it("should compare multiple parameter variations", () => {
      const baseInput = {
        wireDiameter_mm: 0.25,
        peakCurrent_A: 12,
        onTime_us: 20,
        offTime_us: 35,
        thickness_mm: 30,
      };
      const variations = [
        { peakCurrent_A: 8 },
        { peakCurrent_A: 18 },
        { onTime_us: 40 },
      ];
      const results = engine.compareParameters(baseInput, variations);
      expect(results.length).toBe(3);
      expect(results[0].result.breakProbability).toBeLessThan(results[1].result.breakProbability);
    });
  });

  describe("recordOutcome() and getCalibrationStats()", () => {
    it("should start with empty calibration data", () => {
      const stats = engine.getCalibrationStats();
      expect(stats.totalSamples).toBe(0);
    });

    it("should record outcomes for calibration", () => {
      const input = {
        wireDiameter_mm: 0.25,
        peakCurrent_A: 15,
        onTime_us: 30,
        offTime_us: 40,
        thickness_mm: 50,
      };
      engine.recordOutcome({
        input,
        predictedProbability: 0.3,
        actualBreak: false,
      });
      const stats = engine.getCalibrationStats();
      expect(stats.totalSamples).toBe(1);
      expect(stats.breakRate).toBe(0);
    });

    it("should calculate break rate from outcomes", () => {
      const input = {
        wireDiameter_mm: 0.25,
        peakCurrent_A: 15,
        onTime_us: 30,
        offTime_us: 40,
        thickness_mm: 50,
      };
      engine.recordOutcome({ input, predictedProbability: 0.2, actualBreak: false });
      engine.recordOutcome({ input, predictedProbability: 0.6, actualBreak: true });
      const stats = engine.getCalibrationStats();
      expect(stats.totalSamples).toBe(2);
      expect(stats.breakRate).toBeCloseTo(0.5, 2);
    });
  });

  describe("model metrics", () => {
    it("should return model metrics in prediction result", () => {
      const result = engine.predict({
        wireDiameter_mm: 0.25,
        peakCurrent_A: 12,
        onTime_us: 20,
        offTime_us: 35,
        thickness_mm: 30,
      });
      expect(result.modelMetrics).toBeDefined();
      expect(result.modelMetrics.ensembleWeight).toBeLessThanOrEqual(1);
      expect(result.modelMetrics.dataPoints).toBeGreaterThanOrEqual(0);
    });
  });

  describe("edge cases", () => {
    it("should handle minimum wire diameter", () => {
      const result = engine.predict({
        wireDiameter_mm: 0.05,
        peakCurrent_A: 5,
        onTime_us: 5,
        offTime_us: 20,
        thickness_mm: 10,
      });
      expect(result.breakProbability).toBeGreaterThanOrEqual(0);
      expect(result.breakProbability).toBeLessThanOrEqual(1);
    });

    it("should handle maximum thickness", () => {
      const result = engine.predict({
        wireDiameter_mm: 0.25,
        peakCurrent_A: 8,
        onTime_us: 10,
        offTime_us: 30,
        thickness_mm: 500,
      });
      expect(result.breakProbability).toBeGreaterThanOrEqual(0);
      expect(result.breakProbability).toBeLessThanOrEqual(1);
    });

    it("should handle taper cutting", () => {
      const result = engine.predict({
        wireDiameter_mm: 0.25,
        peakCurrent_A: 12,
        onTime_us: 20,
        offTime_us: 35,
        thickness_mm: 30,
        taperAngle_deg: 15,
      });
      expect(result.riskFactors.mechanical).toBeGreaterThan(0);
    });

    it("should handle all materials without errors", () => {
      const materials = engine.getSupportedMaterials();
      for (const mat of materials) {
        const result = engine.predict({
          wireDiameter_mm: 0.25,
          peakCurrent_A: 12,
          onTime_us: 20,
          offTime_us: 35,
          thickness_mm: 30,
          workpieceMaterial: mat,
        });
        expect(result.riskLevel).toBeDefined();
      }
    });

    it("should handle all wire types without errors", () => {
      const wires = engine.getSupportedWireTypes();
      for (const wire of wires) {
        const result = engine.predict({
          wireDiameter_mm: 0.25,
          wireType: wire,
          peakCurrent_A: 12,
          onTime_us: 20,
          offTime_us: 35,
          thickness_mm: 30,
        });
        expect(result.riskLevel).toBeDefined();
      }
    });
  });
});
