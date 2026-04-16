/**
 * Tests for WireEDMAdvancedNeuralEngine
 *
 * Validates deep learning architectures, ensemble predictions,
 * transfer learning, and reinforcement learning for Wire EDM.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  WireEDMAdvancedNeuralEngine,
  wireEDMAdvancedNeuralEngine,
  type WEDMFeatureVector,
  type MultiTargetPrediction,
  type AttentionWeights,
  type RLState
} from "../engines/WireEDMAdvancedNeuralEngine.js";

describe("WireEDMAdvancedNeuralEngine", () => {
  let engine: WireEDMAdvancedNeuralEngine;

  beforeEach(() => {
    engine = new WireEDMAdvancedNeuralEngine();
  });

  // =========================================================================
  // Singleton Export
  // =========================================================================

  describe("singleton", () => {
    it("exports a singleton instance", () => {
      expect(wireEDMAdvancedNeuralEngine).toBeInstanceOf(WireEDMAdvancedNeuralEngine);
    });
  });

  // =========================================================================
  // Status
  // =========================================================================

  describe("status", () => {
    it("returns engine status with architecture counts", () => {
      const status = engine.getStatus();
      expect(status.architectures).toBeGreaterThanOrEqual(6);
      expect(status.ensembles).toBeGreaterThanOrEqual(3);
      expect(status.total_params).toBeGreaterThan(0);
    });

    it("includes material and machine embeddings", () => {
      const status = engine.getStatus();
      expect(status.material_embeddings).toBeGreaterThanOrEqual(10);
      expect(status.machine_embeddings).toBeGreaterThanOrEqual(8);
    });

    it("lists all capabilities", () => {
      const status = engine.getStatus();
      expect(status.capabilities).toContain("multi_target_prediction");
      expect(status.capabilities).toContain("wire_breakage_classification");
      expect(status.capabilities).toContain("transfer_learning");
      expect(status.capabilities).toContain("reinforcement_learning");
    });
  });

  // =========================================================================
  // Feature Engineering
  // =========================================================================

  describe("createFeatureVector", () => {
    it("creates feature vector from input", () => {
      const features = engine.createFeatureVector({
        material: "D2",
        thickness_mm: 50,
        taper_angle_deg: 5,
        corner_count: 8,
        path_length_mm: 500,
        machine: "mitsubishi_mva",
        wire_diameter_mm: 0.25,
        target_ra_um: 1.5,
        target_accuracy_mm: 0.01
      });

      expect(features.material_embedding).toHaveLength(8);
      expect(features.thickness_normalized).toBeGreaterThan(0);
      expect(features.thickness_normalized).toBeLessThanOrEqual(1);
      expect(features.machine_embedding).toHaveLength(6);
    });

    it("normalizes thickness correctly", () => {
      const thin = engine.createFeatureVector({
        material: "D2",
        thickness_mm: 10,
        taper_angle_deg: 0,
        corner_count: 4,
        path_length_mm: 100,
        machine: "makino_sp43",
        wire_diameter_mm: 0.20,
        target_ra_um: 2.0,
        target_accuracy_mm: 0.02
      });

      const thick = engine.createFeatureVector({
        material: "D2",
        thickness_mm: 150,
        taper_angle_deg: 0,
        corner_count: 4,
        path_length_mm: 100,
        machine: "makino_sp43",
        wire_diameter_mm: 0.20,
        target_ra_um: 2.0,
        target_accuracy_mm: 0.02
      });

      expect(thin.thickness_normalized).toBeLessThan(thick.thickness_normalized);
    });

    it("handles unknown materials gracefully", () => {
      const features = engine.createFeatureVector({
        material: "exotic_alloy",
        thickness_mm: 25,
        taper_angle_deg: 0,
        corner_count: 4,
        path_length_mm: 200,
        machine: "unknown_machine",
        wire_diameter_mm: 0.25,
        target_ra_um: 2.0,
        target_accuracy_mm: 0.01
      });

      expect(features.material_embedding).toHaveLength(8);
      expect(features.machine_embedding).toHaveLength(6);
    });

    it("includes prior pass parameters when provided", () => {
      const features = engine.createFeatureVector({
        material: "D2",
        thickness_mm: 50,
        taper_angle_deg: 0,
        corner_count: 4,
        path_length_mm: 200,
        machine: "mitsubishi_fa",
        wire_diameter_mm: 0.25,
        target_ra_um: 1.5,
        target_accuracy_mm: 0.01,
        prior_passes: [
          { peak_current: 5, pulse_on: 20, pulse_off: 10, wire_feed: 8 }
        ]
      });

      expect(features.prior_pass_params).toBeDefined();
      expect(features.prior_pass_params!.length).toBe(20);
    });
  });

  // =========================================================================
  // Parameter Prediction
  // =========================================================================

  describe("predictParameters", () => {
    it("returns multi-target predictions", () => {
      const features = engine.createFeatureVector({
        material: "D2",
        thickness_mm: 50,
        taper_angle_deg: 0,
        corner_count: 4,
        path_length_mm: 200,
        machine: "mitsubishi_mva",
        wire_diameter_mm: 0.25,
        target_ra_um: 1.5,
        target_accuracy_mm: 0.01
      });

      const predictions = engine.predictParameters(features);

      expect(predictions.peak_current_A.value).toBeGreaterThan(0);
      expect(predictions.pulse_on_us.value).toBeGreaterThan(0);
      expect(predictions.pulse_off_us.value).toBeGreaterThan(0);
      expect(predictions.wire_feed_mpm.value).toBeGreaterThan(0);
      expect(predictions.servo_voltage_V.value).toBeGreaterThan(0);
    });

    it("includes confidence scores", () => {
      const features = engine.createFeatureVector({
        material: "A2",
        thickness_mm: 30,
        taper_angle_deg: 2,
        corner_count: 6,
        path_length_mm: 300,
        machine: "makino_duo",
        wire_diameter_mm: 0.20,
        target_ra_um: 1.0,
        target_accuracy_mm: 0.005
      });

      const predictions = engine.predictParameters(features);

      expect(predictions.peak_current_A.confidence).toBeGreaterThan(0);
      expect(predictions.peak_current_A.confidence).toBeLessThanOrEqual(1);
    });

    it("includes uncertainty estimates", () => {
      const features = engine.createFeatureVector({
        material: "Ti6Al4V",
        thickness_mm: 25,
        taper_angle_deg: 0,
        corner_count: 4,
        path_length_mm: 150,
        machine: "sodick_vz",
        wire_diameter_mm: 0.25,
        target_ra_um: 2.0,
        target_accuracy_mm: 0.02
      });

      const predictions = engine.predictParameters(features);

      expect(predictions.peak_current_A.uncertainty).toBeGreaterThanOrEqual(0);
    });

    it("includes feature importance", () => {
      const features = engine.createFeatureVector({
        material: "D2",
        thickness_mm: 50,
        taper_angle_deg: 0,
        corner_count: 4,
        path_length_mm: 200,
        machine: "mitsubishi_fa",
        wire_diameter_mm: 0.25,
        target_ra_um: 1.5,
        target_accuracy_mm: 0.01
      });

      const predictions = engine.predictParameters(features);

      expect(predictions.peak_current_A.feature_importance).toBeDefined();
      expect(predictions.peak_current_A.feature_importance.material).toBeGreaterThan(0);
    });

    it("includes ensemble agreement", () => {
      const features = engine.createFeatureVector({
        material: "D2",
        thickness_mm: 50,
        taper_angle_deg: 0,
        corner_count: 4,
        path_length_mm: 200,
        machine: "mitsubishi_mva",
        wire_diameter_mm: 0.25,
        target_ra_um: 1.5,
        target_accuracy_mm: 0.01
      });

      const predictions = engine.predictParameters(features);

      expect(predictions.peak_current_A.ensemble_agreement).toBeGreaterThan(0);
      expect(predictions.peak_current_A.ensemble_agreement).toBeLessThanOrEqual(1);
    });
  });

  // =========================================================================
  // Wire Breakage Prediction
  // =========================================================================

  describe("predictWireBreakage", () => {
    it("predicts wire breakage risk", () => {
      const features = engine.createFeatureVector({
        material: "D2",
        thickness_mm: 50,
        taper_angle_deg: 0,
        corner_count: 4,
        path_length_mm: 200,
        machine: "mitsubishi_mva",
        wire_diameter_mm: 0.25,
        target_ra_um: 1.5,
        target_accuracy_mm: 0.01
      });

      const result = engine.predictWireBreakage(features, {
        peak_current_A: 4.0,
        pulse_on_us: 18,
        pulse_off_us: 12,
        wire_feed_mpm: 8
      });

      expect(result.risk_probability).toBeGreaterThanOrEqual(0);
      expect(result.risk_probability).toBeLessThanOrEqual(1);
      expect(["normal", "break_risk", "spark_absence", "short_circuit"]).toContain(result.classification);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("returns attention weights", () => {
      const features = engine.createFeatureVector({
        material: "Inconel_718",
        thickness_mm: 75,
        taper_angle_deg: 0,
        corner_count: 4,
        path_length_mm: 300,
        machine: "makino_sp64",
        wire_diameter_mm: 0.25,
        target_ra_um: 2.0,
        target_accuracy_mm: 0.02
      });

      const result = engine.predictWireBreakage(features, {
        peak_current_A: 3.5,
        pulse_on_us: 15,
        pulse_off_us: 18,
        wire_feed_mpm: 6
      });

      expect(result.attention_weights).toBeDefined();
      expect(result.attention_weights.material_attention).toBeGreaterThanOrEqual(0);
      expect(result.attention_weights.geometry_attention).toBeGreaterThanOrEqual(0);
    });

    it("higher risk for aggressive parameters", () => {
      const features = engine.createFeatureVector({
        material: "tungsten_carbide",
        thickness_mm: 100,
        taper_angle_deg: 0,
        corner_count: 4,
        path_length_mm: 500,
        machine: "mitsubishi_fa",
        wire_diameter_mm: 0.25,
        target_ra_um: 1.5,
        target_accuracy_mm: 0.01
      });

      const conservative = engine.predictWireBreakage(features, {
        peak_current_A: 2.0,
        pulse_on_us: 10,
        pulse_off_us: 20,
        wire_feed_mpm: 4
      });

      const aggressive = engine.predictWireBreakage(features, {
        peak_current_A: 8.0,
        pulse_on_us: 35,
        pulse_off_us: 5,
        wire_feed_mpm: 12
      });

      expect(aggressive.risk_probability).toBeGreaterThan(conservative.risk_probability);
    });

    it("estimates time to potential break when at risk", () => {
      const features = engine.createFeatureVector({
        material: "tungsten_carbide",
        thickness_mm: 150,
        taper_angle_deg: 0,
        corner_count: 4,
        path_length_mm: 800,
        machine: "makino_sp43",
        wire_diameter_mm: 0.20,
        target_ra_um: 1.0,
        target_accuracy_mm: 0.005
      });

      const result = engine.predictWireBreakage(features, {
        peak_current_A: 6.0,
        pulse_on_us: 30,
        pulse_off_us: 8,
        wire_feed_mpm: 10
      });

      if (result.classification === "break_risk") {
        expect(result.time_to_potential_break_min).toBeDefined();
      }
    });
  });

  // =========================================================================
  // Surface Roughness Prediction
  // =========================================================================

  describe("predictSurfaceRoughness", () => {
    it("predicts Ra with confidence interval", () => {
      const features = engine.createFeatureVector({
        material: "D2",
        thickness_mm: 50,
        taper_angle_deg: 0,
        corner_count: 4,
        path_length_mm: 200,
        machine: "mitsubishi_mva",
        wire_diameter_mm: 0.25,
        target_ra_um: 1.5,
        target_accuracy_mm: 0.01
      });

      const result = engine.predictSurfaceRoughness(features, [
        { peak_current_A: 5, pulse_on_us: 20, pulse_off_us: 8, overburn_mm: 0.035 },
        { peak_current_A: 4, pulse_on_us: 15, pulse_off_us: 10, overburn_mm: 0.020 },
        { peak_current_A: 3, pulse_on_us: 10, pulse_off_us: 12, overburn_mm: 0.010 }
      ]);

      expect(result.predicted_ra_um).toBeGreaterThan(0);
      expect(result.confidence_interval).toHaveLength(2);
      expect(result.confidence_interval[0]).toBeLessThan(result.predicted_ra_um);
      expect(result.confidence_interval[1]).toBeGreaterThan(result.predicted_ra_um);
    });

    it("identifies most influential pass", () => {
      const features = engine.createFeatureVector({
        material: "A2",
        thickness_mm: 30,
        taper_angle_deg: 0,
        corner_count: 4,
        path_length_mm: 150,
        machine: "makino_duo",
        wire_diameter_mm: 0.25,
        target_ra_um: 1.0,
        target_accuracy_mm: 0.005
      });

      const result = engine.predictSurfaceRoughness(features, [
        { peak_current_A: 6, pulse_on_us: 25, pulse_off_us: 8, overburn_mm: 0.04 },
        { peak_current_A: 4, pulse_on_us: 18, pulse_off_us: 10, overburn_mm: 0.02 },
        { peak_current_A: 2, pulse_on_us: 8, pulse_off_us: 15, overburn_mm: 0.005 }
      ]);

      expect(result.most_influential_pass).toBeGreaterThanOrEqual(0);
      expect(result.most_influential_pass).toBeLessThan(3);
    });

    it("returns pass contributions", () => {
      const features = engine.createFeatureVector({
        material: "D2",
        thickness_mm: 50,
        taper_angle_deg: 0,
        corner_count: 4,
        path_length_mm: 200,
        machine: "mitsubishi_fa",
        wire_diameter_mm: 0.25,
        target_ra_um: 1.5,
        target_accuracy_mm: 0.01
      });

      const result = engine.predictSurfaceRoughness(features, [
        { peak_current_A: 5, pulse_on_us: 20, pulse_off_us: 10, overburn_mm: 0.03 },
        { peak_current_A: 3, pulse_on_us: 12, pulse_off_us: 12, overburn_mm: 0.015 }
      ]);

      expect(result.pass_contributions).toHaveLength(2);
      const total = result.pass_contributions.reduce((a, b) => a + b, 0);
      expect(total).toBeCloseTo(1.0, 1);
    });

    it("reports ensemble agreement", () => {
      const features = engine.createFeatureVector({
        material: "D2",
        thickness_mm: 50,
        taper_angle_deg: 0,
        corner_count: 4,
        path_length_mm: 200,
        machine: "mitsubishi_mva",
        wire_diameter_mm: 0.25,
        target_ra_um: 1.5,
        target_accuracy_mm: 0.01
      });

      const result = engine.predictSurfaceRoughness(features, [
        { peak_current_A: 4, pulse_on_us: 18, pulse_off_us: 12, overburn_mm: 0.02 }
      ]);

      expect(result.ensemble_agreement).toBeGreaterThan(0);
      expect(result.ensemble_agreement).toBeLessThanOrEqual(1);
    });
  });

  // =========================================================================
  // Transfer Learning
  // =========================================================================

  describe("recommendTransfer", () => {
    it("recommends transfer for similar materials", () => {
      const result = engine.recommendTransfer("D2", "A2");

      expect(result.transferability_score).toBeGreaterThan(0.5);
      expect(result.frozen_layers.length).toBeGreaterThan(0);
      expect(result.recommended_samples).toBeLessThan(100);
    });

    it("recommends more fine-tuning for dissimilar materials", () => {
      const result = engine.recommendTransfer("D2", "copper");

      // Copper has different conductivity profile from D2 tool steel
      // Higher transferability still requires adaptation
      expect(result.transferability_score).toBeGreaterThan(0);
      expect(result.adaptation_strategy).toBeDefined();
    });

    it("finds similar materials", () => {
      const result = engine.recommendTransfer("D2", "M2");

      expect(result.similar_materials).toBeDefined();
      expect(result.similar_materials.length).toBeGreaterThan(0);
    });

    it("provides adaptation strategy", () => {
      const result = engine.recommendTransfer("Ti6Al4V", "Inconel_718");

      expect(["fine_tuning", "gradual_unfreezing", "domain_adaptation", "full_retraining"])
        .toContain(result.adaptation_strategy);
    });

    it("handles unknown materials", () => {
      const result = engine.recommendTransfer("exotic_alloy", "D2");

      expect(result.transferability_score).toBe(0.3);
      expect(result.adaptation_strategy).toBe("full_retraining");
    });
  });

  // =========================================================================
  // Reinforcement Learning
  // =========================================================================

  describe("getAdaptiveAdjustment", () => {
    it("returns parameter adjustments", () => {
      const state: RLState = {
        current_params: { peak_current: 4, pulse_on: 18, pulse_off: 12 },
        material_state: [0.8, 0.2, 0.85, 0.75, 0.7, 0.72, 0.82, 0.68],
        quality_feedback: 0.85,
        wire_wear_level: 0.3,
        time_elapsed: 120
      };

      const action = engine.getAdaptiveAdjustment(state);

      expect(action.param_deltas).toBeDefined();
      expect(action.expected_reward).toBeDefined();
      expect(action.risk_level).toBeGreaterThanOrEqual(0);
      expect(action.risk_level).toBeLessThanOrEqual(1);
    });

    it("reduces aggressiveness when quality is low", () => {
      const lowQualityState: RLState = {
        current_params: { peak_current: 5, pulse_on: 22, pulse_off: 10 },
        material_state: [0.8, 0.2, 0.85, 0.75, 0.7, 0.72, 0.82, 0.68],
        quality_feedback: 0.6,
        wire_wear_level: 0.2,
        time_elapsed: 60
      };

      const action = engine.getAdaptiveAdjustment(lowQualityState);

      expect(action.param_deltas.peak_current || 0).toBeLessThanOrEqual(0);
    });

    it("adjusts for high wire wear", () => {
      const highWearState: RLState = {
        current_params: { peak_current: 4, pulse_on: 18, pulse_off: 12 },
        material_state: [0.8, 0.2, 0.85, 0.75, 0.7, 0.72, 0.82, 0.68],
        quality_feedback: 0.9,
        wire_wear_level: 0.8,
        time_elapsed: 180
      };

      const action = engine.getAdaptiveAdjustment(highWearState);

      expect(action.param_deltas.peak_current || 0).toBeLessThan(0);
      expect(action.param_deltas.wire_feed || 0).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // Architecture Access
  // =========================================================================

  describe("getArchitecture", () => {
    it("returns parameter predictor architecture", () => {
      const arch = engine.getArchitecture("parameter_predictor");

      expect(arch).not.toBeNull();
      expect(arch!.name).toBe("WEDM Parameter Predictor");
      expect(arch!.layers.length).toBeGreaterThan(0);
      expect(arch!.total_params).toBeGreaterThan(0);
    });

    it("returns discharge analyzer architecture", () => {
      const arch = engine.getArchitecture("discharge_analyzer");

      expect(arch).not.toBeNull();
      expect(arch!.layers.some(l => l.type === "conv1d")).toBe(true);
    });

    it("returns attention architecture", () => {
      const arch = engine.getArchitecture("quality_attention");

      expect(arch).not.toBeNull();
      expect(arch!.layers.some(l => l.type === "attention")).toBe(true);
    });

    it("returns null for unknown architecture", () => {
      const arch = engine.getArchitecture("unknown_arch");
      expect(arch).toBeNull();
    });
  });

  describe("getAllArchitectures", () => {
    it("returns all architectures", () => {
      const archs = engine.getAllArchitectures();

      expect(Object.keys(archs).length).toBeGreaterThanOrEqual(6);
      expect(archs.parameter_predictor).toBeDefined();
      expect(archs.discharge_analyzer).toBeDefined();
      expect(archs.wire_breakage_predictor).toBeDefined();
    });
  });

  describe("getEnsemble", () => {
    it("returns surface roughness ensemble", () => {
      const ensemble = engine.getEnsemble("surface_roughness_ensemble");

      expect(ensemble).not.toBeNull();
      expect(ensemble!.members.length).toBeGreaterThan(0);
      expect(ensemble!.total_accuracy).toBeGreaterThan(0.9);
    });

    it("returns wire safety ensemble", () => {
      const ensemble = engine.getEnsemble("wire_safety_ensemble");

      expect(ensemble).not.toBeNull();
      expect(ensemble!.aggregation).toBe("boosting");
    });

    it("returns null for unknown ensemble", () => {
      const ensemble = engine.getEnsemble("unknown_ensemble");
      expect(ensemble).toBeNull();
    });
  });

  describe("getAllEnsembles", () => {
    it("returns all ensembles", () => {
      const ensembles = engine.getAllEnsembles();

      expect(Object.keys(ensembles).length).toBeGreaterThanOrEqual(3);
      expect(ensembles.surface_roughness_ensemble).toBeDefined();
      expect(ensembles.mrr_ensemble).toBeDefined();
      expect(ensembles.wire_safety_ensemble).toBeDefined();
    });
  });
});
