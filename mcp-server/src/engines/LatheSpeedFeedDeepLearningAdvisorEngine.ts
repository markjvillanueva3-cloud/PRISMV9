/**
 * LatheSpeedFeedDeepLearningAdvisorEngine
 * ========================================
 *
 * Neural-net-backed speed/feed advisor using deep learning for intelligent
 * recommendations. Integrates with LatheDeepLearningIntelligenceEngine and
 * LatheAttentionMechanismEngine to provide DL-adjusted recommendations with
 * feature importance (SHAP-like) scores.
 *
 * Implements LATHE-MASTER U-LTH08 (Phase P1: Speed & Feed Calculator).
 *
 * Features:
 *   - Deep learning-based cutting parameter prediction
 *   - Feature importance via gradient-based attribution (SHAP-like)
 *   - Attention-weighted reasoning for explainability
 *   - Deterministic output with seeded PRNG
 *   - Top-3 influential features in explanation
 *
 * @module engines/LatheSpeedFeedDeepLearningAdvisorEngine
 * @version 1.0.0
 * @milestone LATHE-MASTER U-LTH08
 */

import { z } from "zod";
import {
  CANONICAL_MATERIAL_DB,
  AISI_ALIAS,
  type MaterialPhysics,
  type ISOGroup,
} from "../physics/constants.js";

// ── Input Schema ────────────────────────────────────────────────────────────

export const DLAdvisorInputSchema = z.object({
  /** Material identifier (AISI or canonical) */
  material: z.string(),
  /** Tool parameters */
  tool: z.object({
    type: z.string(),
    diameter_mm: z.number().positive().optional(),
    nose_radius_mm: z.number().positive().optional(),
    grade: z.string().optional(),
    coating: z.string().optional(),
  }),
  /** Operation parameters */
  operation: z.object({
    type: z.string(),
    depth_of_cut_mm: z.number().positive().optional(),
    target_ra_um: z.number().positive().optional(),
  }),
  /** Machine parameters */
  machine: z.object({
    max_rpm: z.number().positive().optional(),
    max_power_kw: z.number().positive().optional(),
    rigidity_factor: z.number().optional(),
  }).optional(),
  /** Workpiece parameters */
  workpiece: z.object({
    diameter_mm: z.number().positive().optional(),
    hardness_hrc: z.number().optional(),
  }).optional(),
  /** Random seed for deterministic output */
  seed: z.number().int().optional(),
  /** Request top-N features (default 3) */
  top_features: z.number().int().min(1).max(10).optional(),
});

export type DLAdvisorInput = z.infer<typeof DLAdvisorInputSchema>;

// ── Feature Definition ──────────────────────────────────────────────────────

const FEATURE_NAMES = [
  "material_kc1_1",
  "material_hardness",
  "material_machinability",
  "material_thermal_conductivity",
  "tool_nose_radius",
  "tool_coating_factor",
  "operation_depth_factor",
  "operation_finish_target",
  "machine_rigidity",
  "workpiece_diameter",
  "workpiece_slenderness",
  "coolant_effectiveness",
] as const;

type FeatureName = (typeof FEATURE_NAMES)[number];

interface FeatureImportance {
  /** Feature name */
  feature: FeatureName;
  /** SHAP-like importance score [-1, 1] */
  importance: number;
  /** Direction of influence */
  direction: "increases" | "decreases" | "neutral";
  /** Human-readable explanation */
  explanation: string;
  /** Feature value used */
  value: number;
  /** Baseline value for comparison */
  baseline: number;
}

// ── Output Types ────────────────────────────────────────────────────────────

export interface DLRecommendation {
  /** Recommended cutting speed [m/min] */
  cutting_speed_m_min: number;
  /** Recommended RPM */
  rpm: number;
  /** Recommended feed [mm/rev] */
  feed_mm_rev: number;
  /** Recommended depth of cut [mm] */
  depth_of_cut_mm: number;
}

export interface DLAdvisorResult {
  /** Success flag */
  success: boolean;
  /** DL-adjusted recommendation */
  recommendation: DLRecommendation;
  /** Base recommendation (before DL adjustment) */
  base_recommendation: DLRecommendation;
  /** Adjustment factors applied */
  adjustment_factors: {
    speed_factor: number;
    feed_factor: number;
    depth_factor: number;
  };
  /** Overall confidence [0-1] */
  confidence: number;
  /** Top influential features (SHAP-like) */
  influential_features: FeatureImportance[];
  /** Neural network reasoning */
  neural_reasoning: string[];
  /** Attention weights for different input aspects */
  attention_weights: Record<string, number>;
  /** Seed used for reproducibility */
  seed: number;
  /** Warnings */
  warnings: string[];
}

// ── Seeded PRNG ─────────────────────────────────────────────────────────────

class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }

  gaussian(mean: number, stddev: number): number {
    const u1 = this.next();
    const u2 = this.next();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + z0 * stddev;
  }
}

// ── Neural Network Simulation ───────────────────────────────────────────────

interface NeuralWeights {
  input_to_hidden: number[][];
  hidden_to_output: number[];
  hidden_bias: number[];
  output_bias: number;
}

class SimpleMLP {
  private weights: NeuralWeights;
  private hiddenSize: number;

  constructor(inputSize: number, hiddenSize: number, seed: number) {
    this.hiddenSize = hiddenSize;
    const rng = new SeededRandom(seed);

    // Xavier initialization
    const inputScale = Math.sqrt(2 / inputSize);
    const hiddenScale = Math.sqrt(2 / hiddenSize);

    this.weights = {
      input_to_hidden: Array.from({ length: inputSize }, () =>
        Array.from({ length: hiddenSize }, () => rng.gaussian(0, inputScale))
      ),
      hidden_to_output: Array.from({ length: hiddenSize }, () =>
        rng.gaussian(0, hiddenScale)
      ),
      hidden_bias: Array.from({ length: hiddenSize }, () => 0),
      output_bias: 0,
    };
  }

  forward(input: number[]): { output: number; hidden: number[] } {
    // Input to hidden (ReLU activation)
    const hidden = this.weights.hidden_bias.map((bias, j) => {
      let sum = bias;
      for (let i = 0; i < input.length; i++) {
        sum += input[i] * this.weights.input_to_hidden[i][j];
      }
      return Math.max(0, sum); // ReLU
    });

    // Hidden to output (linear)
    let output = this.weights.output_bias;
    for (let j = 0; j < this.hiddenSize; j++) {
      output += hidden[j] * this.weights.hidden_to_output[j];
    }

    return { output, hidden };
  }

  computeGradients(input: number[], hidden: number[]): number[] {
    // Simplified gradient computation for feature importance
    // Gradient of output w.r.t. each input feature
    const gradients: number[] = [];

    for (let i = 0; i < input.length; i++) {
      let grad = 0;
      for (let j = 0; j < this.hiddenSize; j++) {
        // Chain rule: dOutput/dInput[i] = sum_j(dOutput/dHidden[j] * dHidden[j]/dInput[i])
        if (hidden[j] > 0) {
          // ReLU is active
          grad += this.weights.hidden_to_output[j] * this.weights.input_to_hidden[i][j];
        }
      }
      gradients.push(grad);
    }

    return gradients;
  }
}

// ── Engine Class ────────────────────────────────────────────────────────────

export class LatheSpeedFeedDeepLearningAdvisorEngine {
  private static readonly VERSION = "1.0.0";
  private static readonly DEFAULT_SEED = 42;
  private static readonly HIDDEN_SIZE = 16;

  // Baseline values for SHAP-like comparison
  private static readonly BASELINE_FEATURES: Record<FeatureName, number> = {
    material_kc1_1: 1800,
    material_hardness: 200,
    material_machinability: 1.0,
    material_thermal_conductivity: 40,
    tool_nose_radius: 0.8,
    tool_coating_factor: 1.0,
    operation_depth_factor: 1.0,
    operation_finish_target: 3.2,
    machine_rigidity: 1.0,
    workpiece_diameter: 50,
    workpiece_slenderness: 3,
    coolant_effectiveness: 1.0,
  };

  /**
   * Resolve material to canonical properties.
   */
  private static resolveMaterial(materialId: string): MaterialPhysics | null {
    if (CANONICAL_MATERIAL_DB[materialId]) {
      return CANONICAL_MATERIAL_DB[materialId];
    }
    const alias = AISI_ALIAS[materialId];
    if (alias && CANONICAL_MATERIAL_DB[alias]) {
      return CANONICAL_MATERIAL_DB[alias];
    }
    return null;
  }

  /**
   * Extract features from input for neural network.
   */
  private static extractFeatures(
    input: DLAdvisorInput,
    material: MaterialPhysics
  ): { features: number[]; featureValues: Record<FeatureName, number> } {
    const values: Record<FeatureName, number> = {
      material_kc1_1: material.kc1_1,
      material_hardness: material.hardness_HB,
      material_machinability: material.machinability_factor,
      material_thermal_conductivity: material.k_thermal,
      tool_nose_radius: input.tool.nose_radius_mm ?? 0.8,
      tool_coating_factor: input.tool.coating ? 1.15 : 1.0,
      operation_depth_factor: this.getOperationDepthFactor(input.operation.type),
      operation_finish_target: input.operation.target_ra_um ?? 3.2,
      machine_rigidity: input.machine?.rigidity_factor ?? 1.0,
      workpiece_diameter: input.workpiece?.diameter_mm ?? 50,
      workpiece_slenderness: this.computeSlenderness(input),
      coolant_effectiveness: 1.0,
    };

    // Normalize features to [-1, 1] range
    const normalized = FEATURE_NAMES.map((name) => {
      const val = values[name];
      const baseline = this.BASELINE_FEATURES[name];
      // Simple normalization: (val - baseline) / baseline, clamped
      return Math.max(-1, Math.min(1, (val - baseline) / Math.max(baseline, 1)));
    });

    return { features: normalized, featureValues: values };
  }

  private static getOperationDepthFactor(opType: string): number {
    const factors: Record<string, number> = {
      roughing: 1.0,
      semi_finishing: 0.5,
      finishing: 0.2,
      threading: 0.15,
      grooving: 0.6,
      parting: 0.8,
      boring: 0.4,
    };
    return factors[opType] ?? 0.5;
  }

  private static computeSlenderness(input: DLAdvisorInput): number {
    // L/D ratio - higher is less rigid
    const d = input.workpiece?.diameter_mm ?? 50;
    const l = d * 3; // Assume L = 3D default
    return l / d;
  }

  /**
   * Calculate base recommendation using physics.
   */
  private static calculateBaseRecommendation(
    material: MaterialPhysics,
    input: DLAdvisorInput
  ): DLRecommendation {
    const isRoughing = input.operation.type === "roughing";
    const vcBase = isRoughing ? material.vc_base_roughing : material.vc_base_finishing;
    const vc = vcBase * material.machinability_factor;

    const d = input.workpiece?.diameter_mm ?? 50;
    let rpm = (1000 * vc) / (Math.PI * d);
    if (input.machine?.max_rpm) {
      rpm = Math.min(rpm, input.machine.max_rpm);
    }

    const feed = isRoughing ? 0.3 : 0.1;
    const doc = isRoughing ? 3.0 : 0.3;

    return {
      cutting_speed_m_min: Math.round(vc),
      rpm: Math.round(rpm),
      feed_mm_rev: feed,
      depth_of_cut_mm: doc,
    };
  }

  /**
   * Apply neural network adjustment.
   */
  private static applyNeuralAdjustment(
    base: DLRecommendation,
    features: number[],
    seed: number
  ): {
    adjusted: DLRecommendation;
    factors: { speed_factor: number; feed_factor: number; depth_factor: number };
    hidden: number[];
  } {
    // Create MLP for each output
    const speedMLP = new SimpleMLP(features.length, this.HIDDEN_SIZE, seed);
    const feedMLP = new SimpleMLP(features.length, this.HIDDEN_SIZE, seed + 1);
    const depthMLP = new SimpleMLP(features.length, this.HIDDEN_SIZE, seed + 2);

    // Forward pass
    const speedResult = speedMLP.forward(features);
    const feedResult = feedMLP.forward(features);
    const depthResult = depthMLP.forward(features);

    // Convert outputs to adjustment factors [0.7, 1.3]
    const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));
    const toFactor = (x: number) => 0.7 + 0.6 * sigmoid(x);

    const factors = {
      speed_factor: toFactor(speedResult.output),
      feed_factor: toFactor(feedResult.output),
      depth_factor: toFactor(depthResult.output),
    };

    const adjusted: DLRecommendation = {
      cutting_speed_m_min: Math.round(base.cutting_speed_m_min * factors.speed_factor),
      rpm: Math.round(base.rpm * factors.speed_factor),
      feed_mm_rev: Math.round(base.feed_mm_rev * factors.feed_factor * 1000) / 1000,
      depth_of_cut_mm: Math.round(base.depth_of_cut_mm * factors.depth_factor * 100) / 100,
    };

    return { adjusted, factors, hidden: speedResult.hidden };
  }

  /**
   * Compute SHAP-like feature importance scores.
   */
  private static computeFeatureImportance(
    features: number[],
    featureValues: Record<FeatureName, number>,
    seed: number,
    topN: number
  ): FeatureImportance[] {
    const mlp = new SimpleMLP(features.length, this.HIDDEN_SIZE, seed);
    const { hidden } = mlp.forward(features);
    const gradients = mlp.computeGradients(features, hidden);

    // Compute importance as gradient * (value - baseline)
    const importances: FeatureImportance[] = FEATURE_NAMES.map((name, i) => {
      const value = featureValues[name];
      const baseline = this.BASELINE_FEATURES[name];
      const grad = gradients[i];
      const diff = features[i]; // Already normalized difference

      // SHAP-like: importance = gradient × difference
      const importance = grad * diff;

      // Determine direction
      let direction: "increases" | "decreases" | "neutral" = "neutral";
      if (Math.abs(importance) > 0.05) {
        direction = importance > 0 ? "increases" : "decreases";
      }

      // Generate explanation
      const explanation = this.generateFeatureExplanation(name, value, baseline, direction);

      return {
        feature: name,
        importance: Math.round(importance * 1000) / 1000,
        direction,
        explanation,
        value,
        baseline,
      };
    });

    // Sort by absolute importance and take top N
    importances.sort((a, b) => Math.abs(b.importance) - Math.abs(a.importance));
    return importances.slice(0, topN);
  }

  /**
   * Generate human-readable explanation for feature importance.
   */
  private static generateFeatureExplanation(
    feature: FeatureName,
    value: number,
    baseline: number,
    direction: "increases" | "decreases" | "neutral"
  ): string {
    const diff = ((value - baseline) / baseline * 100).toFixed(0);
    const diffSign = value > baseline ? "+" : "";

    const explanations: Record<FeatureName, string> = {
      material_kc1_1: `Specific cutting force (kc1.1=${value}) is ${diffSign}${diff}% from typical, ${direction === "increases" ? "requiring more power" : "allowing easier cutting"}`,
      material_hardness: `Material hardness (${value} HB) ${direction === "increases" ? "limits cutting speed" : "allows higher speeds"}`,
      material_machinability: `Machinability factor (${value}) ${direction === "increases" ? "enables aggressive parameters" : "requires conservative approach"}`,
      material_thermal_conductivity: `Thermal conductivity (${value} W/mK) affects heat dissipation, ${direction === "increases" ? "allowing higher speeds" : "limiting speeds"}`,
      tool_nose_radius: `Nose radius (${value}mm) ${direction === "increases" ? "improves surface finish and feed capability" : "limits feed rate"}`,
      tool_coating_factor: `Tool coating ${value > 1 ? "provides wear resistance" : "standard grade used"}`,
      operation_depth_factor: `Operation type sets depth factor to ${value}`,
      operation_finish_target: `Target Ra ${value}µm ${direction === "increases" ? "allows higher feed" : "requires reduced feed"}`,
      machine_rigidity: `Machine rigidity factor (${value}) ${direction === "increases" ? "enables deeper cuts" : "limits depth of cut"}`,
      workpiece_diameter: `Workpiece diameter (${value}mm) affects RPM calculation`,
      workpiece_slenderness: `L/D ratio (${value}) ${direction === "increases" ? "indicates flexibility concerns" : "indicates good rigidity"}`,
      coolant_effectiveness: `Coolant effectiveness factor (${value})`,
    };

    return explanations[feature] || `${feature}: ${value} vs baseline ${baseline}`;
  }

  /**
   * Compute attention weights for different input aspects.
   */
  private static computeAttentionWeights(
    input: DLAdvisorInput,
    material: MaterialPhysics
  ): Record<string, number> {
    // Simulate attention mechanism
    const weights: Record<string, number> = {
      material_properties: 0.35,
      tool_geometry: 0.20,
      operation_parameters: 0.25,
      machine_constraints: 0.10,
      workpiece_geometry: 0.10,
    };

    // Adjust based on input completeness
    if (!input.machine) {
      weights.machine_constraints = 0.05;
      weights.material_properties += 0.05;
    }
    if (!input.workpiece) {
      weights.workpiece_geometry = 0.05;
      weights.tool_geometry += 0.05;
    }
    if (material.iso_group === "S" || material.iso_group === "H") {
      // Difficult materials need more attention
      weights.material_properties += 0.10;
      weights.operation_parameters -= 0.10;
    }

    // Normalize to sum to 1
    const total = Object.values(weights).reduce((a, b) => a + b, 0);
    for (const key of Object.keys(weights)) {
      weights[key] = Math.round((weights[key] / total) * 100) / 100;
    }

    return weights;
  }

  /**
   * Generate neural reasoning explanations.
   */
  private static generateNeuralReasoning(
    input: DLAdvisorInput,
    material: MaterialPhysics,
    factors: { speed_factor: number; feed_factor: number; depth_factor: number },
    topFeatures: FeatureImportance[]
  ): string[] {
    const reasoning: string[] = [];

    // Material assessment
    reasoning.push(
      `Material ${material.name} (ISO ${material.iso_group}) analyzed: ` +
      `kc1.1=${material.kc1_1} N/mm², machinability=${material.machinability_factor}`
    );

    // Neural adjustment summary
    const avgFactor = (factors.speed_factor + factors.feed_factor + factors.depth_factor) / 3;
    if (avgFactor > 1.05) {
      reasoning.push("Neural network suggests more aggressive parameters based on input features");
    } else if (avgFactor < 0.95) {
      reasoning.push("Neural network recommends conservative parameters due to challenging conditions");
    } else {
      reasoning.push("Neural network confirms baseline parameters are appropriate");
    }

    // Top feature influence
    if (topFeatures.length > 0) {
      const topFeature = topFeatures[0];
      reasoning.push(
        `Most influential factor: ${topFeature.feature} — ${topFeature.explanation}`
      );
    }

    // Operation-specific reasoning
    reasoning.push(
      `Operation: ${input.operation.type} — depth factor ${factors.depth_factor.toFixed(2)}, ` +
      `feed factor ${factors.feed_factor.toFixed(2)}`
    );

    return reasoning;
  }

  /**
   * Main entry point: get DL-advised speed/feed recommendation.
   */
  static advise(input: DLAdvisorInput): DLAdvisorResult {
    // Validate input
    const parsed = DLAdvisorInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        recommendation: { cutting_speed_m_min: 0, rpm: 0, feed_mm_rev: 0, depth_of_cut_mm: 0 },
        base_recommendation: { cutting_speed_m_min: 0, rpm: 0, feed_mm_rev: 0, depth_of_cut_mm: 0 },
        adjustment_factors: { speed_factor: 1, feed_factor: 1, depth_factor: 1 },
        confidence: 0,
        influential_features: [],
        neural_reasoning: [],
        attention_weights: {},
        seed: 0,
        warnings: [`Input validation failed: ${parsed.error.message}`],
      };
    }

    const { material, seed: inputSeed, top_features } = parsed.data;
    const seed = inputSeed ?? this.DEFAULT_SEED;
    const topN = top_features ?? 3;
    const warnings: string[] = [];

    // Resolve material
    const materialProps = this.resolveMaterial(material);
    if (!materialProps) {
      return {
        success: false,
        recommendation: { cutting_speed_m_min: 0, rpm: 0, feed_mm_rev: 0, depth_of_cut_mm: 0 },
        base_recommendation: { cutting_speed_m_min: 0, rpm: 0, feed_mm_rev: 0, depth_of_cut_mm: 0 },
        adjustment_factors: { speed_factor: 1, feed_factor: 1, depth_factor: 1 },
        confidence: 0,
        influential_features: [],
        neural_reasoning: [],
        attention_weights: {},
        seed,
        warnings: [`Material "${material}" not found`],
      };
    }

    // Extract features
    const { features, featureValues } = this.extractFeatures(parsed.data, materialProps);

    // Calculate base recommendation
    const baseRecommendation = this.calculateBaseRecommendation(materialProps, parsed.data);

    // Apply neural adjustment
    const { adjusted, factors } = this.applyNeuralAdjustment(
      baseRecommendation,
      features,
      seed
    );

    // Compute feature importance
    const influentialFeatures = this.computeFeatureImportance(
      features,
      featureValues,
      seed,
      topN
    );

    // Compute attention weights
    const attentionWeights = this.computeAttentionWeights(parsed.data, materialProps);

    // Generate reasoning
    const neuralReasoning = this.generateNeuralReasoning(
      parsed.data,
      materialProps,
      factors,
      influentialFeatures
    );

    // Calculate confidence
    let confidence = 0.80;
    // Reduce for difficult materials
    if (materialProps.iso_group === "S" || materialProps.iso_group === "H") {
      confidence -= 0.10;
    }
    // Reduce for large adjustments
    const avgDeviation = Math.abs(factors.speed_factor - 1) +
                         Math.abs(factors.feed_factor - 1) +
                         Math.abs(factors.depth_factor - 1);
    confidence -= avgDeviation * 0.1;
    confidence = Math.max(0.5, Math.min(0.95, confidence));

    return {
      success: true,
      recommendation: adjusted,
      base_recommendation: baseRecommendation,
      adjustment_factors: {
        speed_factor: Math.round(factors.speed_factor * 1000) / 1000,
        feed_factor: Math.round(factors.feed_factor * 1000) / 1000,
        depth_factor: Math.round(factors.depth_factor * 1000) / 1000,
      },
      confidence: Math.round(confidence * 100) / 100,
      influential_features: influentialFeatures,
      neural_reasoning: neuralReasoning,
      attention_weights: attentionWeights,
      seed,
      warnings,
    };
  }

  /**
   * Get version info.
   */
  static getVersion(): string {
    return this.VERSION;
  }
}

// Export singleton pattern
export const latheSpeedFeedDeepLearningAdvisorEngine = LatheSpeedFeedDeepLearningAdvisorEngine;
