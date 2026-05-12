/**
 * Tests for ChatterNeuralClassifierEngine (MILL-AGI Phase 0.3)
 *
 * Validates the 1D-CNN chatter classifier:
 *   - Input validation
 *   - Classification output structure
 *   - Physics-based risk factor identification
 *   - Probability normalization
 *   - Recommendation generation
 *   - Performance (inference time)
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  ChatterNeuralClassifierEngine,
  chatterNeuralClassifierEngine,
  type FRFSpectrum,
  type CuttingFeatures,
  type ChatterClassification,
  type StabilityClass,
} from "../engines/ChatterNeuralClassifierEngine.js";

describe("ChatterNeuralClassifierEngine (MILL-AGI P0.3)", () => {
  let engine: ChatterNeuralClassifierEngine;

  beforeAll(() => {
    engine = chatterNeuralClassifierEngine;
  });

  // ============================================================================
  // TEST DATA
  // ============================================================================

  const stableFRF: FRFSpectrum = {
    frequencyBins: Array.from({ length: 100 }, (_, i) => i * 10),
    magnitudes: Array.from({ length: 100 }, (_, i) =>
      i === 50 ? 0.3 : 0.05 + Math.random() * 0.05
    ),
  };

  const resonantFRF: FRFSpectrum = {
    frequencyBins: Array.from({ length: 100 }, (_, i) => i * 10),
    magnitudes: Array.from({ length: 100 }, (_, i) =>
      i === 50 ? 1.0 : 0.1 + Math.random() * 0.1
    ),
  };

  const stableFeatures: CuttingFeatures = {
    spindleRpm: 8000,
    axialDepthMm: 1.0,
    radialDepthMm: 5.0,
    feedPerToothMm: 0.1,
    toolDiameterMm: 12.0,
    fluteCount: 4,
    overhangMm: 30.0,
    helixAngleDeg: 30,
    materialIsoGroup: "P",
    kc11Mpa: 1800,
    machineStiffnessNPerUm: 80,
    naturalFrequencyHz: 500,
  };

  const riskyFeatures: CuttingFeatures = {
    spindleRpm: 12000,
    axialDepthMm: 4.0,
    radialDepthMm: 10.0,
    feedPerToothMm: 0.15,
    toolDiameterMm: 10.0,
    fluteCount: 4,
    overhangMm: 80.0,
    helixAngleDeg: 35,
    materialIsoGroup: "S",
    kc11Mpa: 2800,
    machineStiffnessNPerUm: 40,
    naturalFrequencyHz: 800,
  };

  // ============================================================================
  // CLASSIFICATION OUTPUT STRUCTURE
  // ============================================================================

  describe("classification output", () => {
    it("returns valid ChatterClassification object", () => {
      const result = engine.classify(stableFRF, stableFeatures);

      expect(result).toBeDefined();
      expect(result.class).toBeDefined();
      expect(["stable", "at_risk", "chatter"]).toContain(result.class);
      expect(result.probabilities).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it("probabilities sum to 1.0", () => {
      const result = engine.classify(stableFRF, stableFeatures);
      const sum =
        result.probabilities.stable +
        result.probabilities.at_risk +
        result.probabilities.chatter;

      expect(sum).toBeCloseTo(1.0, 5);
    });

    it("returns dominant frequency", () => {
      const result = engine.classify(stableFRF, stableFeatures);
      expect(result.dominantFrequencyHz).toBeGreaterThan(0);
      expect(result.dominantFrequencyHz).toBe(500); // Peak at bin 50 * 10Hz
    });

    it("includes risk factors array", () => {
      const result = engine.classify(stableFRF, stableFeatures);
      expect(Array.isArray(result.riskFactors)).toBe(true);
    });

    it("includes recommendation string", () => {
      const result = engine.classify(stableFRF, stableFeatures);
      expect(typeof result.recommendation).toBe("string");
      expect(result.recommendation.length).toBeGreaterThan(0);
    });

    it("includes feature importance map", () => {
      const result = engine.classify(stableFRF, stableFeatures);
      expect(result.featureImportance).toBeDefined();
      expect(typeof result.featureImportance.axialDepth).toBe("number");
    });

    it("includes model version", () => {
      const result = engine.classify(stableFRF, stableFeatures);
      expect(result.modelVersion).toBeDefined();
      expect(result.modelVersion).toMatch(/^\d+\.\d+\.\d+/);
    });

    it("tracks inference time", () => {
      const result = engine.classify(stableFRF, stableFeatures);
      expect(result.inferenceTimeMs).toBeGreaterThan(0);
      expect(result.inferenceTimeMs).toBeLessThan(100); // Should be fast
    });
  });

  // ============================================================================
  // CLASSIFICATION BEHAVIOR
  // ============================================================================

  describe("classification behavior", () => {
    it("classifies stable conditions as stable or at_risk", () => {
      const result = engine.classify(stableFRF, stableFeatures);
      expect(["stable", "at_risk"]).toContain(result.class);
      expect(result.probabilities.chatter).toBeLessThan(0.5);
    });

    it("classifies risky conditions with higher chatter probability", () => {
      const result = engine.classify(resonantFRF, riskyFeatures);
      expect(result.probabilities.chatter).toBeGreaterThan(
        result.probabilities.stable * 0.5
      );
    });

    it("identifies long overhang as risk factor", () => {
      const longOverhangFeatures = {
        ...stableFeatures,
        overhangMm: 100,
        toolDiameterMm: 10,
      };
      const result = engine.classify(stableFRF, longOverhangFeatures);
      const hasOverhangRisk = result.riskFactors.some((r) =>
        r.toLowerCase().includes("overhang")
      );
      expect(hasOverhangRisk).toBe(true);
    });

    it("identifies high engagement as risk factor", () => {
      const highEngagementFeatures = {
        ...stableFeatures,
        radialDepthMm: 10,
        toolDiameterMm: 12,
      };
      const result = engine.classify(stableFRF, highEngagementFeatures);
      const hasEngagementRisk = result.riskFactors.some((r) =>
        r.toLowerCase().includes("engagement")
      );
      expect(hasEngagementRisk).toBe(true);
    });

    it("identifies difficult material as risk factor", () => {
      const hardMaterialFeatures = {
        ...stableFeatures,
        materialIsoGroup: "H" as const,
      };
      const result = engine.classify(stableFRF, hardMaterialFeatures);
      const hasMaterialRisk = result.riskFactors.some(
        (r) => r.includes("ISO H") || r.includes("material")
      );
      expect(hasMaterialRisk).toBe(true);
    });
  });

  // ============================================================================
  // INPUT VALIDATION
  // ============================================================================

  describe("input validation", () => {
    it("validates empty FRF bins", () => {
      const invalidFRF = { frequencyBins: [], magnitudes: [] };
      const validation = engine.validateInput(invalidFRF, stableFeatures);
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it("validates mismatched FRF arrays", () => {
      const invalidFRF = {
        frequencyBins: [100, 200, 300],
        magnitudes: [0.1, 0.2],
      };
      const validation = engine.validateInput(invalidFRF, stableFeatures);
      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes("same length"))).toBe(true);
    });

    it("validates zero spindle RPM", () => {
      const invalidFeatures = { ...stableFeatures, spindleRpm: 0 };
      const validation = engine.validateInput(stableFRF, invalidFeatures);
      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes("RPM"))).toBe(true);
    });

    it("validates zero axial depth", () => {
      const invalidFeatures = { ...stableFeatures, axialDepthMm: 0 };
      const validation = engine.validateInput(stableFRF, invalidFeatures);
      expect(validation.valid).toBe(false);
    });

    it("validates zero tool diameter", () => {
      const invalidFeatures = { ...stableFeatures, toolDiameterMm: 0 };
      const validation = engine.validateInput(stableFRF, invalidFeatures);
      expect(validation.valid).toBe(false);
    });

    it("passes valid input", () => {
      const validation = engine.validateInput(stableFRF, stableFeatures);
      expect(validation.valid).toBe(true);
      expect(validation.errors.length).toBe(0);
    });
  });

  // ============================================================================
  // MODEL METADATA
  // ============================================================================

  describe("model metadata", () => {
    it("returns model metadata", () => {
      const metadata = engine.getModelMetadata();
      expect(metadata).toBeDefined();
      expect(metadata.modelId).toBe("chatter-cnn-v1");
      expect(metadata.version).toBeDefined();
    });

    it("includes training data source", () => {
      const metadata = engine.getModelMetadata();
      expect(metadata.trainingDataSource).toContain("MIT");
    });

    it("includes accuracy metrics", () => {
      const metadata = engine.getModelMetadata();
      expect(metadata.accuracy).toBeGreaterThan(0.8);
      expect(metadata.f1Score).toBeGreaterThan(0.8);
    });

    it("includes input shape", () => {
      const metadata = engine.getModelMetadata();
      expect(metadata.inputShape).toEqual([140]);
    });

    it("includes output classes", () => {
      const metadata = engine.getModelMetadata();
      expect(metadata.outputClasses).toEqual(["stable", "at_risk", "chatter"]);
    });
  });

  // ============================================================================
  // RECOMMENDATIONS
  // ============================================================================

  describe("recommendations", () => {
    it("provides actionable recommendation for at_risk", () => {
      const result = engine.classify(resonantFRF, riskyFeatures);
      if (result.class === "at_risk" || result.class === "chatter") {
        expect(result.recommendation.length).toBeGreaterThan(20);
        expect(
          result.recommendation.includes("reduce") ||
            result.recommendation.includes("adjust") ||
            result.recommendation.includes("Reduce")
        ).toBe(true);
      }
    });

    it("provides monitoring advice for stable", () => {
      const result = engine.classify(stableFRF, stableFeatures);
      if (result.class === "stable") {
        expect(result.recommendation).toContain("stable");
      }
    });
  });

  // ============================================================================
  // SINGLETON EXPORT
  // ============================================================================

  describe("singleton", () => {
    it("exports singleton instance", () => {
      expect(chatterNeuralClassifierEngine).toBeDefined();
      expect(chatterNeuralClassifierEngine).toBeInstanceOf(
        ChatterNeuralClassifierEngine
      );
    });
  });
});
