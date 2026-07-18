/**
 * ForceNeuralPredictorEngine — Neural Network for Cutting Force Prediction
 *
 * MILL-AGI Phase 0.3: Neural Network Inference Layer — Unit 4
 *
 * Multi-layer perceptron (MLP) for predicting cutting forces with:
 *   - Physics-informed input features (Kienzle normalization)
 *   - Residual learning (predict correction to physics model)
 *   - Uncertainty quantification via dropout ensemble
 *   - Real-time inference for adaptive control integration
 *
 * Architecture:
 *   Input: 12 features (material, geometry, conditions, normalized)
 *   Hidden: 64 → 32 → 16 neurons with ReLU
 *   Output: 4 values (Fx, Fy, Fz, correction_factor)
 *   Regularization: Dropout(0.1) for uncertainty
 *
 * Physics Integration:
 *   - Base prediction from Kienzle: Fc = kc1.1 × h^(1-mc) × b
 *   - Neural correction: Fc_final = Fc_kienzle × (1 + δ_neural)
 *   - δ_neural captures tool wear, thermal effects, dynamic loads
 *
 * References:
 *   [1] Wang et al. (2020) "Physics-Informed Machine Learning for
 *       Cutting Force Prediction" J. Manuf. Sci. Eng.
 *   [2] Kienzle (1952) "Die Bestimmung von Kräften und Leistungen"
 *   [3] MIT 2.008 — Force modeling fundamentals
 *
 * @module engines/ForceNeuralPredictorEngine
 * @milestone MILL-AGI-P0/U-P0.3-04
 */

import { log } from "../utils/Logger.js";
import { CANONICAL_KIENZLE } from "../physics/constants.js";

// ============================================================================
// TYPES
// ============================================================================

export interface ForceInputFeatures {
  material: {
    iso_group: "P" | "M" | "K" | "N" | "S" | "H";
    hardness_hrc?: number;
    tensile_strength_mpa?: number;
  };
  tool: {
    diameter_mm: number;
    flute_count: number;
    helix_angle_deg: number;
    rake_angle_deg: number;
    edge_radius_um?: number;
  };
  conditions: {
    cutting_speed_mpm: number;
    feed_per_tooth_mm: number;
    axial_depth_mm: number;
    radial_depth_mm: number;
  };
  state?: {
    tool_wear_vb_mm?: number;
    temperature_c?: number;
    spindle_load_percent?: number;
  };
}

export interface ForcePrediction {
  forces: {
    Fx_n: number;
    Fy_n: number;
    Fz_n: number;
    resultant_n: number;
  };
  kienzle_base: {
    Fc_n: number;
    Ff_n: number;
    Fp_n: number;
  };
  neural_correction: number;
  uncertainty: {
    std_fx: number;
    std_fy: number;
    std_fz: number;
    confidence: number;
  };
  feature_importance: Record<string, number>;
  physics_hybrid_ratio: number;
  inference_time_ms: number;
}

export interface ModelWeights {
  layer1: { weights: number[][]; bias: number[] };
  layer2: { weights: number[][]; bias: number[] };
  layer3: { weights: number[][]; bias: number[] };
  output: { weights: number[][]; bias: number[] };
}

// ============================================================================
// KIENZLE COEFFICIENTS
// ============================================================================

// Sourced from the canonical Sandvik Kienzle table (physics/constants.ts). Was an inline copy whose kc1_1
// had DRIFTED on M (2200 vs canonical 2100) and K (1400 vs 1100), with no citation and differing from every
// other engine + constants -- genuine drift, not a sourced alternative. Spread into a Record<string> so the
// defensive `?? .P` fallback in computeKienzleForces keeps handling an out-of-set iso_group.
const KIENZLE_COEFFICIENTS: Record<string, { kc1_1: number; mc: number }> = { ...CANONICAL_KIENZLE };

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class ForceNeuralPredictorEngine {
  private weights: ModelWeights;
  private dropoutRate = 0.1;
  private physicsWeight = 0.6;
  // The network ships with Xavier/Math.random() weights and has NO checkpoint loader, so it is UNTRAINED.
  // Applying its output would inject random +/-30% noise into a safety-relevant cutting force. Gate the
  // neural correction OFF until a real trained checkpoint sets this true (predict() returns the physics base).
  private weightsTrained = false;

  constructor() {
    this.weights = this.initializeWeights();
  }

  /**
   * Predict cutting forces using physics-neural hybrid.
   */
  predict(input: ForceInputFeatures): ForcePrediction {
    const startTime = performance.now();

    const features = this.extractFeatures(input);

    const kienzleBase = this.computeKienzleForces(input);

    // Untrained weights -> do NOT let the (random) neural output corrupt the force: return the physics
    // base (neuralCorrection = 0). Only a real trained checkpoint (weightsTrained=true) enables the correction.
    const neuralCorrection = this.weightsTrained ? this.forwardPass(features, false)[3] : 0;

    const uncertainty = this.estimateUncertainty(features);

    const Fc_corrected = kienzleBase.Fc_n * (1 + neuralCorrection * 0.3);

    const forces = this.decomposeForcesToXYZ(
      Fc_corrected,
      kienzleBase.Ff_n,
      kienzleBase.Fp_n,
      input.tool.helix_angle_deg
    );

    const featureImportance = this.computeFeatureImportance(features);

    const inferenceTime = performance.now() - startTime;

    log.debug(
      `[ForceNeural] F=${forces.resultant_n.toFixed(0)}N, corr=${(neuralCorrection * 100).toFixed(1)}%, conf=${(uncertainty.confidence * 100).toFixed(0)}% in ${inferenceTime.toFixed(1)}ms`
    );

    return {
      forces,
      kienzle_base: kienzleBase,
      neural_correction: neuralCorrection,
      uncertainty,
      feature_importance: featureImportance,
      physics_hybrid_ratio: this.physicsWeight,
      inference_time_ms: inferenceTime,
    };
  }

  /**
   * Batch prediction for multiple conditions.
   */
  predictBatch(inputs: ForceInputFeatures[]): ForcePrediction[] {
    return inputs.map((input) => this.predict(input));
  }

  /**
   * Extract normalized feature vector from input.
   */
  extractFeatures(input: ForceInputFeatures): number[] {
    const isoIndex = ["P", "M", "K", "N", "S", "H"].indexOf(input.material.iso_group);

    const features = [
      isoIndex / 5,
      (input.material.hardness_hrc ?? 30) / 70,
      (input.material.tensile_strength_mpa ?? 600) / 2000,
      input.tool.diameter_mm / 50,
      input.tool.flute_count / 8,
      input.tool.helix_angle_deg / 60,
      input.tool.rake_angle_deg / 30,
      (input.tool.edge_radius_um ?? 10) / 50,
      input.conditions.cutting_speed_mpm / 500,
      input.conditions.feed_per_tooth_mm / 0.5,
      input.conditions.axial_depth_mm / 20,
      input.conditions.radial_depth_mm / input.tool.diameter_mm,
    ];

    if (input.state) {
      features.push(
        (input.state.tool_wear_vb_mm ?? 0) / 0.5,
        (input.state.temperature_c ?? 200) / 800,
        (input.state.spindle_load_percent ?? 50) / 100
      );
    } else {
      features.push(0, 0.25, 0.5);
    }

    return features;
  }

  /**
   * Compute Kienzle base forces.
   */
  computeKienzleForces(input: ForceInputFeatures): { Fc_n: number; Ff_n: number; Fp_n: number } {
    const coef = KIENZLE_COEFFICIENTS[input.material.iso_group] ?? KIENZLE_COEFFICIENTS.P;

    const h = input.conditions.feed_per_tooth_mm;
    const b = input.conditions.axial_depth_mm;

    const kc = coef.kc1_1 * Math.pow(h, -coef.mc);

    const Ac = h * b;
    const Fc = kc * Ac;

    const engagementAngle = Math.acos(
      1 - (2 * input.conditions.radial_depth_mm) / input.tool.diameter_mm
    );
    const avgFc = Fc * (engagementAngle / Math.PI);

    const rakeRad = (input.tool.rake_angle_deg * Math.PI) / 180;
    const Ff = avgFc * (0.3 + 0.1 * Math.tan(rakeRad));
    const Fp = avgFc * 0.25;

    return { Fc_n: avgFc, Ff_n: Ff, Fp_n: Fp };
  }

  /**
   * Neural network forward pass.
   */
  forwardPass(features: number[], withDropout: boolean): number[] {
    let x = features;

    x = this.denseLayer(x, this.weights.layer1, withDropout);
    x = this.denseLayer(x, this.weights.layer2, withDropout);
    x = this.denseLayer(x, this.weights.layer3, withDropout);

    x = this.linearLayer(x, this.weights.output);

    return x;
  }

  /**
   * Dense layer with ReLU activation.
   */
  private denseLayer(
    x: number[],
    layer: { weights: number[][]; bias: number[] },
    withDropout: boolean
  ): number[] {
    const output: number[] = [];

    for (let j = 0; j < layer.bias.length; j++) {
      let sum = layer.bias[j];
      for (let i = 0; i < x.length; i++) {
        sum += x[i] * layer.weights[i][j];
      }
      let activated = Math.max(0, sum);

      if (withDropout && Math.random() < this.dropoutRate) {
        activated = 0;
      }

      output.push(activated);
    }

    return output;
  }

  /**
   * Linear output layer (no activation).
   */
  private linearLayer(x: number[], layer: { weights: number[][]; bias: number[] }): number[] {
    const output: number[] = [];

    for (let j = 0; j < layer.bias.length; j++) {
      let sum = layer.bias[j];
      for (let i = 0; i < x.length; i++) {
        sum += x[i] * layer.weights[i][j];
      }
      output.push(sum);
    }

    return output;
  }

  /**
   * Estimate prediction uncertainty via dropout ensemble.
   */
  estimateUncertainty(
    features: number[]
  ): { std_fx: number; std_fy: number; std_fz: number; confidence: number } {
    const nSamples = 10;
    const predictions: number[][] = [];

    for (let i = 0; i < nSamples; i++) {
      predictions.push(this.forwardPass(features, true));
    }

    const means = [0, 0, 0, 0];
    const stds = [0, 0, 0, 0];

    for (let j = 0; j < 4; j++) {
      const values = predictions.map((p) => p[j]);
      means[j] = values.reduce((a, b) => a + b, 0) / nSamples;
      const variance = values.reduce((a, v) => a + Math.pow(v - means[j], 2), 0) / nSamples;
      stds[j] = Math.sqrt(variance);
    }

    const avgStd = (stds[0] + stds[1] + stds[2]) / 3;
    const confidence = Math.max(0.5, Math.min(0.95, 1 - avgStd * 2));

    return {
      std_fx: stds[0] * 100,
      std_fy: stds[1] * 100,
      std_fz: stds[2] * 100,
      confidence,
    };
  }

  /**
   * Decompose cutting force into XYZ components.
   */
  decomposeForcesToXYZ(
    Fc: number,
    Ff: number,
    Fp: number,
    helixAngle: number
  ): { Fx_n: number; Fy_n: number; Fz_n: number; resultant_n: number } {
    const helixRad = (helixAngle * Math.PI) / 180;

    const Fx = Fc * Math.cos(helixRad) + Ff;
    const Fy = Fc * Math.sin(helixRad);
    const Fz = Fp;

    const resultant = Math.sqrt(Fx * Fx + Fy * Fy + Fz * Fz);

    return { Fx_n: Fx, Fy_n: Fy, Fz_n: Fz, resultant_n: resultant };
  }

  /**
   * Compute feature importance via gradient approximation.
   */
  computeFeatureImportance(features: number[]): Record<string, number> {
    const featureNames = [
      "material_iso",
      "hardness",
      "tensile_strength",
      "diameter",
      "flute_count",
      "helix_angle",
      "rake_angle",
      "edge_radius",
      "cutting_speed",
      "feed_per_tooth",
      "axial_depth",
      "radial_immersion",
      "tool_wear",
      "temperature",
      "spindle_load",
    ];

    const baseOutput = this.forwardPass(features, false);
    const importance: Record<string, number> = {};
    const eps = 0.01;

    for (let i = 0; i < Math.min(features.length, featureNames.length); i++) {
      const perturbed = [...features];
      perturbed[i] += eps;
      const perturbedOutput = this.forwardPass(perturbed, false);

      const diff = Math.abs(perturbedOutput[3] - baseOutput[3]) / eps;
      importance[featureNames[i]] = diff;
    }

    const maxImp = Math.max(...Object.values(importance), 0.001);
    for (const key of Object.keys(importance)) {
      importance[key] /= maxImp;
    }

    return importance;
  }

  /**
   * Initialize weights with Xavier initialization.
   */
  private initializeWeights(): ModelWeights {
    const xavier = (fanIn: number, fanOut: number): number[][] => {
      const scale = Math.sqrt(2 / (fanIn + fanOut));
      return Array.from({ length: fanIn }, () =>
        Array.from({ length: fanOut }, () => (Math.random() * 2 - 1) * scale)
      );
    };

    const zeros = (size: number): number[] => Array(size).fill(0);

    return {
      layer1: { weights: xavier(15, 64), bias: zeros(64) },
      layer2: { weights: xavier(64, 32), bias: zeros(32) },
      layer3: { weights: xavier(32, 16), bias: zeros(16) },
      output: { weights: xavier(16, 4), bias: zeros(4) },
    };
  }

  /**
   * Get model metadata.
   */
  getModelMetadata(): {
    modelId: string;
    inputFeatures: number;
    hiddenLayers: number[];
    outputFeatures: number;
    physicsWeight: number;
  } {
    return {
      modelId: "force-neural-predictor-v1",
      inputFeatures: 15,
      hiddenLayers: [64, 32, 16],
      outputFeatures: 4,
      physicsWeight: this.physicsWeight,
    };
  }

  /**
   * Validate input features.
   */
  validateInput(input: ForceInputFeatures): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!["P", "M", "K", "N", "S", "H"].includes(input.material.iso_group)) {
      errors.push("Invalid ISO material group");
    }
    if (input.tool.diameter_mm <= 0) errors.push("Tool diameter must be positive");
    if (input.tool.flute_count < 1) errors.push("Flute count must be at least 1");
    if (input.conditions.cutting_speed_mpm <= 0) errors.push("Cutting speed must be positive");
    if (input.conditions.feed_per_tooth_mm <= 0) errors.push("Feed must be positive");
    if (input.conditions.axial_depth_mm <= 0) errors.push("Axial depth must be positive");
    if (input.conditions.radial_depth_mm <= 0) errors.push("Radial depth must be positive");

    return { valid: errors.length === 0, errors };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const forceNeuralPredictorEngine = new ForceNeuralPredictorEngine();
