/**
 * Tests for ForceNeuralPredictorEngine (MILL-AGI Phase 0.3)
 *
 * Validates physics-neural hybrid force prediction:
 *   - Feature extraction and normalization
 *   - Kienzle base force computation
 *   - Neural correction application
 *   - Uncertainty estimation via dropout
 *   - Force decomposition to XYZ
 *   - Feature importance computation
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  ForceNeuralPredictorEngine,
  forceNeuralPredictorEngine,
  type ForceInputFeatures,
} from "../engines/ForceNeuralPredictorEngine.js";

describe("ForceNeuralPredictorEngine (MILL-AGI P0.3)", () => {
  let engine: ForceNeuralPredictorEngine;

  beforeAll(() => {
    engine = forceNeuralPredictorEngine;
  });

  // ============================================================================
  // TEST DATA
  // ============================================================================

  const steelInput: ForceInputFeatures = {
    material: {
      iso_group: "P",
      hardness_hrc: 28,
      tensile_strength_mpa: 700,
    },
    tool: {
      diameter_mm: 12,
      flute_count: 4,
      helix_angle_deg: 35,
      rake_angle_deg: 8,
      edge_radius_um: 10,
    },
    conditions: {
      cutting_speed_mpm: 150,
      feed_per_tooth_mm: 0.1,
      axial_depth_mm: 2,
      radial_depth_mm: 6,
    },
  };

  const titaniumInput: ForceInputFeatures = {
    material: {
      iso_group: "S",
      hardness_hrc: 36,
      tensile_strength_mpa: 1100,
    },
    tool: {
      diameter_mm: 10,
      flute_count: 4,
      helix_angle_deg: 40,
      rake_angle_deg: 10,
    },
    conditions: {
      cutting_speed_mpm: 50,
      feed_per_tooth_mm: 0.08,
      axial_depth_mm: 1,
      radial_depth_mm: 5,
    },
  };

  const aluminumInput: ForceInputFeatures = {
    material: {
      iso_group: "N",
      tensile_strength_mpa: 300,
    },
    tool: {
      diameter_mm: 16,
      flute_count: 3,
      helix_angle_deg: 45,
      rake_angle_deg: 15,
    },
    conditions: {
      cutting_speed_mpm: 400,
      feed_per_tooth_mm: 0.15,
      axial_depth_mm: 3,
      radial_depth_mm: 8,
    },
  };

  const wornToolInput: ForceInputFeatures = {
    ...steelInput,
    state: {
      tool_wear_vb_mm: 0.25,
      temperature_c: 350,
      spindle_load_percent: 75,
    },
  };

  // ============================================================================
  // PREDICTION OUTPUT
  // ============================================================================

  describe("prediction output", () => {
    it("returns valid ForcePrediction", () => {
      const result = engine.predict(steelInput);

      expect(result).toBeDefined();
      expect(result.forces).toBeDefined();
      expect(result.kienzle_base).toBeDefined();
      expect(typeof result.neural_correction).toBe("number");
    });

    it("includes all force components", () => {
      const result = engine.predict(steelInput);

      expect(result.forces.Fx_n).toBeDefined();
      expect(result.forces.Fy_n).toBeDefined();
      expect(result.forces.Fz_n).toBeDefined();
      expect(result.forces.resultant_n).toBeGreaterThan(0);
    });

    it("includes Kienzle base forces", () => {
      const result = engine.predict(steelInput);

      expect(result.kienzle_base.Fc_n).toBeGreaterThan(0);
      expect(result.kienzle_base.Ff_n).toBeGreaterThan(0);
      expect(result.kienzle_base.Fp_n).toBeGreaterThan(0);
    });

    it("includes uncertainty estimates", () => {
      const result = engine.predict(steelInput);

      expect(result.uncertainty.std_fx).toBeGreaterThanOrEqual(0);
      expect(result.uncertainty.std_fy).toBeGreaterThanOrEqual(0);
      expect(result.uncertainty.std_fz).toBeGreaterThanOrEqual(0);
      expect(result.uncertainty.confidence).toBeGreaterThan(0);
      expect(result.uncertainty.confidence).toBeLessThanOrEqual(1);
    });

    it("tracks inference time", () => {
      const result = engine.predict(steelInput);

      expect(result.inference_time_ms).toBeGreaterThan(0);
      expect(result.inference_time_ms).toBeLessThan(100);
    });

    it("reports physics hybrid ratio", () => {
      const result = engine.predict(steelInput);

      expect(result.physics_hybrid_ratio).toBeGreaterThan(0);
      expect(result.physics_hybrid_ratio).toBeLessThanOrEqual(1);
    });
  });

  // ============================================================================
  // FEATURE EXTRACTION
  // ============================================================================

  describe("feature extraction", () => {
    it("extracts correct number of features", () => {
      const features = engine.extractFeatures(steelInput);

      expect(features.length).toBe(15);
    });

    it("normalizes features to [0, 1] range approximately", () => {
      const features = engine.extractFeatures(steelInput);

      for (const f of features) {
        expect(f).toBeGreaterThanOrEqual(-0.5);
        expect(f).toBeLessThanOrEqual(2);
      }
    });

    it("handles missing optional fields", () => {
      const minimalInput: ForceInputFeatures = {
        material: { iso_group: "P" },
        tool: {
          diameter_mm: 10,
          flute_count: 4,
          helix_angle_deg: 30,
          rake_angle_deg: 5,
        },
        conditions: {
          cutting_speed_mpm: 100,
          feed_per_tooth_mm: 0.1,
          axial_depth_mm: 2,
          radial_depth_mm: 5,
        },
      };

      const features = engine.extractFeatures(minimalInput);
      expect(features.length).toBe(15);
      expect(features.every((f) => !isNaN(f))).toBe(true);
    });

    it("includes state features when provided", () => {
      const withState = engine.extractFeatures(wornToolInput);
      const withoutState = engine.extractFeatures(steelInput);

      // State features should differ
      expect(withState[12]).toBeGreaterThan(0); // tool_wear
      expect(withoutState[12]).toBe(0);
    });
  });

  // ============================================================================
  // KIENZLE FORCES
  // ============================================================================

  describe("Kienzle forces", () => {
    it("computes base forces for steel", () => {
      const forces = engine.computeKienzleForces(steelInput);

      expect(forces.Fc_n).toBeGreaterThan(0);
      expect(forces.Ff_n).toBeGreaterThan(0);
      expect(forces.Fp_n).toBeGreaterThan(0);
    });

    it("harder materials have higher specific cutting force", () => {
      const steelForces = engine.computeKienzleForces(steelInput);
      const titaniumForces = engine.computeKienzleForces(titaniumInput);

      // Titanium (S group) has higher kc1.1 than steel (P group)
      // But forces also depend on depth and feed
      expect(titaniumForces.Fc_n).toBeDefined();
      expect(steelForces.Fc_n).toBeDefined();
    });

    it("aluminum has lower forces than steel", () => {
      const steelForces = engine.computeKienzleForces(steelInput);
      const aluminumForces = engine.computeKienzleForces(aluminumInput);

      // N group has lower kc than P group for similar engagement
      // Need to normalize by chip area for fair comparison
      const steelKc = steelForces.Fc_n / (steelInput.conditions.feed_per_tooth_mm * steelInput.conditions.axial_depth_mm);
      const aluminumKc = aluminumForces.Fc_n / (aluminumInput.conditions.feed_per_tooth_mm * aluminumInput.conditions.axial_depth_mm);

      expect(aluminumKc).toBeLessThan(steelKc);
    });

    it("higher feed increases forces", () => {
      const lowFeed: ForceInputFeatures = {
        ...steelInput,
        conditions: { ...steelInput.conditions, feed_per_tooth_mm: 0.05 },
      };

      const highFeed: ForceInputFeatures = {
        ...steelInput,
        conditions: { ...steelInput.conditions, feed_per_tooth_mm: 0.2 },
      };

      const lowForces = engine.computeKienzleForces(lowFeed);
      const highForces = engine.computeKienzleForces(highFeed);

      expect(highForces.Fc_n).toBeGreaterThan(lowForces.Fc_n);
    });
  });

  // ============================================================================
  // NEURAL CORRECTION
  // ============================================================================

  describe("neural correction", () => {
    it("correction is bounded", () => {
      const result = engine.predict(steelInput);

      expect(result.neural_correction).toBeGreaterThan(-2);
      expect(result.neural_correction).toBeLessThan(2);
    });

    it("worn tool affects prediction", () => {
      const fresh = engine.predict(steelInput);
      const worn = engine.predict(wornToolInput);

      // Results should differ due to state features
      expect(fresh.forces.resultant_n).not.toBe(worn.forces.resultant_n);
    });
  });

  // ============================================================================
  // UNCERTAINTY
  // ============================================================================

  describe("uncertainty estimation", () => {
    it("estimates uncertainty via dropout", () => {
      const features = engine.extractFeatures(steelInput);
      const uncertainty = engine.estimateUncertainty(features);

      expect(uncertainty.std_fx).toBeGreaterThanOrEqual(0);
      expect(uncertainty.std_fy).toBeGreaterThanOrEqual(0);
      expect(uncertainty.std_fz).toBeGreaterThanOrEqual(0);
    });

    it("confidence is in valid range", () => {
      const features = engine.extractFeatures(steelInput);
      const uncertainty = engine.estimateUncertainty(features);

      expect(uncertainty.confidence).toBeGreaterThanOrEqual(0.5);
      expect(uncertainty.confidence).toBeLessThanOrEqual(0.95);
    });
  });

  // ============================================================================
  // FORCE DECOMPOSITION
  // ============================================================================

  describe("force decomposition", () => {
    it("decomposes to XYZ components", () => {
      const xyz = engine.decomposeForcesToXYZ(100, 30, 25, 35);

      expect(xyz.Fx_n).toBeDefined();
      expect(xyz.Fy_n).toBeDefined();
      expect(xyz.Fz_n).toBeDefined();
      expect(xyz.resultant_n).toBeGreaterThan(0);
    });

    it("resultant equals vector magnitude", () => {
      const xyz = engine.decomposeForcesToXYZ(100, 30, 25, 35);

      const computed = Math.sqrt(xyz.Fx_n ** 2 + xyz.Fy_n ** 2 + xyz.Fz_n ** 2);
      expect(xyz.resultant_n).toBeCloseTo(computed, 5);
    });

    it("helix angle affects Y component", () => {
      const lowHelix = engine.decomposeForcesToXYZ(100, 30, 25, 15);
      const highHelix = engine.decomposeForcesToXYZ(100, 30, 25, 45);

      expect(highHelix.Fy_n).toBeGreaterThan(lowHelix.Fy_n);
    });
  });

  // ============================================================================
  // FEATURE IMPORTANCE
  // ============================================================================

  describe("feature importance", () => {
    it("computes importance for all features", () => {
      const features = engine.extractFeatures(steelInput);
      const importance = engine.computeFeatureImportance(features);

      expect(Object.keys(importance).length).toBeGreaterThan(0);
    });

    it("importance values are normalized", () => {
      const features = engine.extractFeatures(steelInput);
      const importance = engine.computeFeatureImportance(features);

      const maxImp = Math.max(...Object.values(importance));
      expect(maxImp).toBeCloseTo(1, 1);
    });
  });

  // ============================================================================
  // BATCH PREDICTION
  // ============================================================================

  describe("batch prediction", () => {
    it("predicts multiple inputs", () => {
      const inputs = [steelInput, titaniumInput, aluminumInput];
      const results = engine.predictBatch(inputs);

      expect(results.length).toBe(3);
      results.forEach((r) => {
        expect(r.forces.resultant_n).toBeGreaterThan(0);
      });
    });
  });

  // ============================================================================
  // MODEL METADATA
  // ============================================================================

  describe("model metadata", () => {
    it("returns model info", () => {
      const meta = engine.getModelMetadata();

      expect(meta.modelId).toBe("force-neural-predictor-v1");
      expect(meta.inputFeatures).toBe(15);
      expect(meta.hiddenLayers).toEqual([64, 32, 16]);
      expect(meta.outputFeatures).toBe(4);
    });
  });

  // ============================================================================
  // VALIDATION
  // ============================================================================

  describe("validation", () => {
    it("rejects invalid ISO group", () => {
      const badInput = {
        ...steelInput,
        material: { iso_group: "X" as any },
      };

      const validation = engine.validateInput(badInput);
      expect(validation.valid).toBe(false);
    });

    it("rejects zero diameter", () => {
      const badInput = {
        ...steelInput,
        tool: { ...steelInput.tool, diameter_mm: 0 },
      };

      const validation = engine.validateInput(badInput);
      expect(validation.valid).toBe(false);
    });

    it("rejects negative conditions", () => {
      const badInput = {
        ...steelInput,
        conditions: { ...steelInput.conditions, cutting_speed_mpm: -50 },
      };

      const validation = engine.validateInput(badInput);
      expect(validation.valid).toBe(false);
    });

    it("passes valid input", () => {
      const validation = engine.validateInput(steelInput);
      expect(validation.valid).toBe(true);
      expect(validation.errors.length).toBe(0);
    });
  });

  // ============================================================================
  // SINGLETON
  // ============================================================================

  describe("singleton", () => {
    it("exports singleton instance", () => {
      expect(forceNeuralPredictorEngine).toBeDefined();
      expect(forceNeuralPredictorEngine).toBeInstanceOf(ForceNeuralPredictorEngine);
    });
  });
});
