/**
 * Tests for SurfaceFinishCnnEngine (MILL-AGI Phase 0.3)
 *
 * Validates the CNN-based surface finish predictor:
 *   - Kinematic roughness calculations (Brammertz)
 *   - Scallop height predictions
 *   - Material corrections
 *   - Dynamic effect contributions
 *   - Neural inference simulation
 *   - Batch prediction with summary statistics
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  SurfaceFinishCnnEngine,
  surfaceFinishCnnEngine,
  type ToolpathFeatures,
  type MaterialFeatures,
  type DynamicFeatures,
  type SurfaceFinishPrediction,
} from "../engines/SurfaceFinishCnnEngine.js";

describe("SurfaceFinishCnnEngine (MILL-AGI P0.3)", () => {
  let engine: SurfaceFinishCnnEngine;

  beforeAll(() => {
    engine = surfaceFinishCnnEngine;
  });

  // ============================================================================
  // TEST DATA
  // ============================================================================

  const finishingToolpath: ToolpathFeatures = {
    stepoverMm: 0.5,
    depthMm: 0.2,
    feedPerToothMm: 0.05,
    spindleRpm: 12000,
    cutterDiameterMm: 10,
    cornerRadiusMm: 0.5,
    toolGeometry: "bull_nose",
    fluteCount: 4,
    edgeRadiusUm: 8,
    helixAngleDeg: 35,
  };

  const roughingToolpath: ToolpathFeatures = {
    stepoverMm: 5,
    depthMm: 2,
    feedPerToothMm: 0.15,
    spindleRpm: 8000,
    cutterDiameterMm: 12,
    toolGeometry: "flat",
    fluteCount: 4,
    edgeRadiusUm: 15,
    helixAngleDeg: 30,
  };

  const ballToolpath: ToolpathFeatures = {
    stepoverMm: 0.3,
    depthMm: 0.1,
    feedPerToothMm: 0.03,
    spindleRpm: 15000,
    cutterDiameterMm: 6,
    toolGeometry: "ball",
    fluteCount: 2,
    edgeRadiusUm: 5,
    helixAngleDeg: 0,
  };

  const steelMaterial: MaterialFeatures = {
    isoGroup: "P",
    hardnessHrc: 30,
    kc11Mpa: 1800,
  };

  const titaniumMaterial: MaterialFeatures = {
    isoGroup: "S",
    hardnessHrc: 38,
    kc11Mpa: 2100,
  };

  const aluminumMaterial: MaterialFeatures = {
    isoGroup: "N",
    hardnessHrc: 0,
    kc11Mpa: 700,
  };

  const dynamicEffects: DynamicFeatures = {
    chatterAmplitudeUm: 2,
    deflectionUm: 5,
    thermalDriftUm: 1,
    vibrationRms: 0.5,
  };

  // ============================================================================
  // PREDICTION OUTPUT STRUCTURE
  // ============================================================================

  describe("prediction output", () => {
    it("returns valid SurfaceFinishPrediction object", () => {
      const result = engine.predict(finishingToolpath, steelMaterial);

      expect(result).toBeDefined();
      expect(typeof result.raUm).toBe("number");
      expect(typeof result.rzUm).toBe("number");
      expect(typeof result.rtUm).toBe("number");
      expect(result.raUm).toBeGreaterThan(0);
    });

    it("includes scallop height", () => {
      const result = engine.predict(finishingToolpath, steelMaterial);
      expect(result.scallonUm).toBeGreaterThan(0);
    });

    it("includes kinematic contribution", () => {
      const result = engine.predict(finishingToolpath, steelMaterial);
      expect(result.kinematicRaUm).toBeGreaterThan(0);
    });

    it("tracks physics and neural weights", () => {
      const result = engine.predict(finishingToolpath, steelMaterial);
      expect(result.physicsWeight).toBe(0.7);
      expect(result.neuralWeight).toBe(0.3);
    });

    it("includes confidence score", () => {
      const result = engine.predict(finishingToolpath, steelMaterial);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it("includes model version", () => {
      const result = engine.predict(finishingToolpath, steelMaterial);
      expect(result.modelVersion).toMatch(/^\d+\.\d+\.\d+/);
    });

    it("tracks inference time", () => {
      const result = engine.predict(finishingToolpath, steelMaterial);
      expect(result.inferenceTimeMs).toBeGreaterThan(0);
      expect(result.inferenceTimeMs).toBeLessThan(50);
    });
  });

  // ============================================================================
  // PHYSICS CALCULATIONS
  // ============================================================================

  describe("kinematic roughness", () => {
    it("finishing conditions produce lower Ra than roughing", () => {
      const finishing = engine.predict(finishingToolpath, steelMaterial);
      const roughing = engine.predict(roughingToolpath, steelMaterial);

      expect(finishing.kinematicRaUm).toBeLessThan(roughing.kinematicRaUm);
    });

    it("ball endmill produces good finish on curved surfaces", () => {
      const ball = engine.predict(ballToolpath, steelMaterial);
      expect(ball.raUm).toBeLessThan(2);
    });

    it("higher feed increases roughness", () => {
      const lowFeed = engine.predict(
        { ...finishingToolpath, feedPerToothMm: 0.03 },
        steelMaterial
      );
      const highFeed = engine.predict(
        { ...finishingToolpath, feedPerToothMm: 0.12 },
        steelMaterial
      );

      expect(highFeed.kinematicRaUm).toBeGreaterThan(lowFeed.kinematicRaUm);
    });

    it("larger tool radius reduces roughness", () => {
      const smallTool = engine.predict(
        { ...finishingToolpath, cutterDiameterMm: 6 },
        steelMaterial
      );
      const largeTool = engine.predict(
        { ...finishingToolpath, cutterDiameterMm: 16 },
        steelMaterial
      );

      expect(largeTool.kinematicRaUm).toBeLessThan(smallTool.kinematicRaUm);
    });
  });

  describe("scallop height", () => {
    it("wider stepover increases scallop", () => {
      const narrow = engine.predict(
        { ...finishingToolpath, stepoverMm: 0.3 },
        steelMaterial
      );
      const wide = engine.predict(
        { ...finishingToolpath, stepoverMm: 2 },
        steelMaterial
      );

      expect(wide.scallonUm).toBeGreaterThan(narrow.scallonUm);
    });

    it("ball endmill has different scallop formula", () => {
      const flat = engine.predict(
        { ...finishingToolpath, toolGeometry: "flat" },
        steelMaterial
      );
      const ball = engine.predict(
        { ...finishingToolpath, toolGeometry: "ball" },
        steelMaterial
      );

      expect(flat.scallonUm).not.toBe(ball.scallonUm);
    });
  });

  // ============================================================================
  // MATERIAL EFFECTS
  // ============================================================================

  describe("material corrections", () => {
    it("aluminum produces lower Ra than steel", () => {
      const steel = engine.predict(finishingToolpath, steelMaterial);
      const aluminum = engine.predict(finishingToolpath, aluminumMaterial);

      expect(aluminum.kinematicRaUm).toBeLessThan(steel.kinematicRaUm);
    });

    it("titanium produces higher Ra than steel", () => {
      const steel = engine.predict(finishingToolpath, steelMaterial);
      const titanium = engine.predict(finishingToolpath, titaniumMaterial);

      expect(titanium.kinematicRaUm).toBeGreaterThan(steel.kinematicRaUm);
    });

    it("higher hardness increases correction factor", () => {
      const soft = engine.predict(finishingToolpath, {
        ...steelMaterial,
        hardnessHrc: 25,
      });
      const hard = engine.predict(finishingToolpath, {
        ...steelMaterial,
        hardnessHrc: 58,
      });

      expect(hard.kinematicRaUm).toBeGreaterThan(soft.kinematicRaUm);
    });
  });

  // ============================================================================
  // DYNAMIC EFFECTS
  // ============================================================================

  describe("dynamic contributions", () => {
    it("chatter increases surface roughness", () => {
      const noChatter = engine.predict(finishingToolpath, steelMaterial);
      const withChatter = engine.predict(finishingToolpath, steelMaterial, {
        chatterAmplitudeUm: 5,
      });

      expect(withChatter.dynamicContributionUm).toBeGreaterThan(
        noChatter.dynamicContributionUm
      );
      expect(withChatter.raUm).toBeGreaterThan(noChatter.raUm);
    });

    it("deflection contributes to roughness", () => {
      const withDeflection = engine.predict(finishingToolpath, steelMaterial, {
        deflectionUm: 10,
      });

      expect(withDeflection.dynamicContributionUm).toBeGreaterThan(0);
    });

    it("combined dynamic effects accumulate", () => {
      const combined = engine.predict(
        finishingToolpath,
        steelMaterial,
        dynamicEffects
      );

      expect(combined.dynamicContributionUm).toBeGreaterThan(2);
    });
  });

  // ============================================================================
  // TARGET CHECKING
  // ============================================================================

  describe("target checking", () => {
    it("meets target when Ra is below threshold", () => {
      const result = engine.predict(finishingToolpath, aluminumMaterial, undefined, 5);
      expect(result.meetsTarget).toBe(true);
      expect(result.targetRaUm).toBe(5);
    });

    it("fails target when Ra exceeds threshold", () => {
      const result = engine.predict(roughingToolpath, titaniumMaterial, undefined, 0.5);
      expect(result.meetsTarget).toBe(false);
    });

    it("warns when predicted exceeds target", () => {
      const result = engine.predict(roughingToolpath, steelMaterial, undefined, 0.3);
      if (!result.meetsTarget) {
        expect(result.warnings.some((w) => w.includes("exceeds"))).toBe(true);
      }
    });
  });

  // ============================================================================
  // BATCH PREDICTION
  // ============================================================================

  describe("batch prediction", () => {
    it("returns predictions for all segments", () => {
      const segments = [
        { toolpath: finishingToolpath, material: steelMaterial },
        { toolpath: roughingToolpath, material: steelMaterial },
        { toolpath: ballToolpath, material: aluminumMaterial },
      ];

      const result = engine.predictBatch(segments);

      expect(result.predictions.length).toBe(3);
    });

    it("computes summary statistics", () => {
      const segments = [
        { toolpath: finishingToolpath, material: steelMaterial },
        { toolpath: roughingToolpath, material: steelMaterial },
      ];

      const result = engine.predictBatch(segments, 3);

      expect(result.summary.meanRaUm).toBeGreaterThan(0);
      expect(result.summary.maxRaUm).toBeGreaterThanOrEqual(result.summary.meanRaUm);
      expect(result.summary.minRaUm).toBeLessThanOrEqual(result.summary.meanRaUm);
      expect(result.summary.stdRaUm).toBeGreaterThanOrEqual(0);
      expect(result.summary.pctMeetingTarget).toBeLessThanOrEqual(100);
    });

    it("identifies worst segment", () => {
      const segments = [
        { toolpath: finishingToolpath, material: steelMaterial },
        { toolpath: roughingToolpath, material: titaniumMaterial },
        { toolpath: ballToolpath, material: aluminumMaterial },
      ];

      const result = engine.predictBatch(segments);

      const worstRa = result.predictions[result.summary.worstSegmentIdx].raUm;
      expect(worstRa).toBe(result.summary.maxRaUm);
    });
  });

  // ============================================================================
  // INPUT VALIDATION
  // ============================================================================

  describe("input validation", () => {
    it("rejects zero stepover", () => {
      const invalid = { ...finishingToolpath, stepoverMm: 0 };
      const validation = engine.validateInput(invalid, steelMaterial);
      expect(validation.valid).toBe(false);
    });

    it("rejects zero feed", () => {
      const invalid = { ...finishingToolpath, feedPerToothMm: 0 };
      const validation = engine.validateInput(invalid, steelMaterial);
      expect(validation.valid).toBe(false);
    });

    it("rejects stepover exceeding diameter", () => {
      const invalid = { ...finishingToolpath, stepoverMm: 15 };
      const validation = engine.validateInput(invalid, steelMaterial);
      expect(validation.valid).toBe(false);
    });

    it("passes valid input", () => {
      const validation = engine.validateInput(finishingToolpath, steelMaterial);
      expect(validation.valid).toBe(true);
    });
  });

  // ============================================================================
  // MODEL METADATA
  // ============================================================================

  describe("model metadata", () => {
    it("returns metadata", () => {
      const meta = engine.getModelMetadata();
      expect(meta.modelId).toBe("surface-finish-cnn-v1");
    });

    it("includes accuracy metrics", () => {
      const meta = engine.getModelMetadata();
      expect(meta.maeRaUm).toBeLessThan(0.5);
      expect(meta.r2Score).toBeGreaterThan(0.8);
    });
  });

  // ============================================================================
  // SINGLETON
  // ============================================================================

  describe("singleton", () => {
    it("exports singleton instance", () => {
      expect(surfaceFinishCnnEngine).toBeDefined();
      expect(surfaceFinishCnnEngine).toBeInstanceOf(SurfaceFinishCnnEngine);
    });
  });
});
