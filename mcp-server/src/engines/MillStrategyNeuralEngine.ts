/**
 * MillStrategyNeuralEngine — MILL-AGI-P0/U-P0.3
 *
 * Neural network for milling strategy selection. Architecture:
 *   - Input: [material_iso, hardness, operation, tolerance, features, machine_class]
 *   - Hidden: 3 layers (64 → 128 → 64) with ReLU activation
 *   - Output: Strategy probability distribution (softmax over 50 strategies)
 *
 * Training-ready interface for P7 continuous learning loop.
 * CPU-based forward pass (ONNX runtime integration planned).
 *
 * @module engines/MillStrategyNeuralEngine
 * @milestone MILL-AGI-P0.3
 */

import { log } from "../utils/Logger.js";

export interface StrategyFeatureVector {
  material_iso_group: number;  // 0-5 (P,M,K,N,S,H)
  hardness_normalized: number; // 0-1 (HRC 20-65 scaled)
  operation_type: number;      // 0-4 (rough, semi, finish, hsm, adaptive)
  tolerance_class: number;     // 0-3 (coarse, medium, fine, precision)
  feature_complexity: number;  // 0-1 (simple pocket to complex 5-axis)
  machine_class: number;       // 0-3 (3-axis, 4-axis, 5-axis, mill-turn)
  depth_to_diameter: number;   // 0-1 normalized
  wall_thickness_ratio: number; // 0-1 (thin wall indicator)
}

export interface StrategyPrediction {
  strategy_id: string;
  strategy_name: string;
  probability: number;
  rank: number;
}

export interface NeuralPredictionResult {
  top_strategies: StrategyPrediction[];
  confidence: number;
  feature_importance: Record<string, number>;
  model_version: string;
  inference_time_ms: number;
}

export interface TrainingExample {
  features: StrategyFeatureVector;
  label_strategy_id: string;
  outcome: "success" | "partial" | "failure";
  weight?: number;
}

const STRATEGY_CATALOG: Array<{ id: string; name: string }> = [
  { id: "adaptive_clearing", name: "Adaptive Clearing" },
  { id: "trochoidal_rough", name: "Trochoidal Roughing" },
  { id: "hsm_constant_load", name: "HSM Constant Load" },
  { id: "plunge_rough", name: "Plunge Roughing" },
  { id: "pocket_2d", name: "2D Pocket" },
  { id: "pocket_3d", name: "3D Pocket" },
  { id: "contour_2d", name: "2D Contour" },
  { id: "contour_3d", name: "3D Contour" },
  { id: "pencil_finish", name: "Pencil Finish" },
  { id: "scallop_finish", name: "Scallop Finish" },
  { id: "parallel_finish", name: "Parallel Finish" },
  { id: "radial_finish", name: "Radial Finish" },
  { id: "spiral_finish", name: "Spiral Finish" },
  { id: "rest_machining", name: "Rest Machining" },
  { id: "flowline", name: "Flowline" },
  { id: "morphed_spiral", name: "Morphed Spiral" },
  { id: "geodesic", name: "Geodesic" },
  { id: "swarf_5axis", name: "5-Axis Swarf" },
  { id: "multiaxis_contour", name: "Multi-Axis Contour" },
  { id: "drilling_standard", name: "Standard Drilling" },
];

const INPUT_DIM = 8;
const HIDDEN_1 = 64;
const HIDDEN_2 = 128;
const HIDDEN_3 = 64;
const OUTPUT_DIM = STRATEGY_CATALOG.length;

export class MillStrategyNeuralEngine {
  private weights1: number[][];
  private bias1: number[];
  private weights2: number[][];
  private bias2: number[];
  private weights3: number[][];
  private bias3: number[];
  private weightsOut: number[][];
  private biasOut: number[];
  private modelVersion = "v0.1.0-random";
  private trainingBuffer: TrainingExample[] = [];

  constructor() {
    this.weights1 = this.initWeights(INPUT_DIM, HIDDEN_1);
    this.bias1 = this.initBias(HIDDEN_1);
    this.weights2 = this.initWeights(HIDDEN_1, HIDDEN_2);
    this.bias2 = this.initBias(HIDDEN_2);
    this.weights3 = this.initWeights(HIDDEN_2, HIDDEN_3);
    this.bias3 = this.initBias(HIDDEN_3);
    this.weightsOut = this.initWeights(HIDDEN_3, OUTPUT_DIM);
    this.biasOut = this.initBias(OUTPUT_DIM);
  }

  private initWeights(inDim: number, outDim: number): number[][] {
    const scale = Math.sqrt(2 / inDim);
    return Array.from({ length: outDim }, () =>
      Array.from({ length: inDim }, () => (Math.random() - 0.5) * 2 * scale)
    );
  }

  private initBias(dim: number): number[] {
    return Array.from({ length: dim }, () => 0);
  }

  private relu(x: number): number {
    return Math.max(0, x);
  }

  private softmax(logits: number[]): number[] {
    const maxLogit = Math.max(...logits);
    const exps = logits.map(l => Math.exp(l - maxLogit));
    const sum = exps.reduce((a, b) => a + b, 0);
    return exps.map(e => e / sum);
  }

  private forward(input: number[]): number[] {
    let h1 = this.matmul(this.weights1, input);
    h1 = h1.map((v, i) => this.relu(v + this.bias1[i]));

    let h2 = this.matmul(this.weights2, h1);
    h2 = h2.map((v, i) => this.relu(v + this.bias2[i]));

    let h3 = this.matmul(this.weights3, h2);
    h3 = h3.map((v, i) => this.relu(v + this.bias3[i]));

    let out = this.matmul(this.weightsOut, h3);
    out = out.map((v, i) => v + this.biasOut[i]);

    return this.softmax(out);
  }

  private matmul(weights: number[][], input: number[]): number[] {
    return weights.map(row => row.reduce((sum, w, i) => sum + w * input[i], 0));
  }

  predict(features: StrategyFeatureVector): NeuralPredictionResult {
    const startTime = Date.now();
    log.info("MillStrategyNeuralEngine.predict");

    const input = this.featuresToVector(features);
    const probs = this.forward(input);

    const predictions: StrategyPrediction[] = STRATEGY_CATALOG.map((s, i) => ({
      strategy_id: s.id,
      strategy_name: s.name,
      probability: probs[i],
      rank: 0,
    }));

    predictions.sort((a, b) => b.probability - a.probability);
    predictions.forEach((p, i) => (p.rank = i + 1));

    const topProb = predictions[0]?.probability ?? 0;
    const secondProb = predictions[1]?.probability ?? 0;
    const confidence = topProb - secondProb + 0.5;

    return {
      top_strategies: predictions.slice(0, 5),
      confidence: Math.min(0.95, confidence),
      feature_importance: this.estimateFeatureImportance(features),
      model_version: this.modelVersion,
      inference_time_ms: Date.now() - startTime,
    };
  }

  private featuresToVector(f: StrategyFeatureVector): number[] {
    return [
      f.material_iso_group / 5,
      f.hardness_normalized,
      f.operation_type / 4,
      f.tolerance_class / 3,
      f.feature_complexity,
      f.machine_class / 3,
      f.depth_to_diameter,
      f.wall_thickness_ratio,
    ];
  }

  private estimateFeatureImportance(features: StrategyFeatureVector): Record<string, number> {
    const baselineResult = this.forward(this.featuresToVector(features));
    const importance: Record<string, number> = {};

    const featureNames: (keyof StrategyFeatureVector)[] = [
      "material_iso_group", "hardness_normalized", "operation_type",
      "tolerance_class", "feature_complexity", "machine_class",
      "depth_to_diameter", "wall_thickness_ratio"
    ];

    for (const name of featureNames) {
      const perturbed = { ...features, [name]: 0 };
      const perturbedResult = this.forward(this.featuresToVector(perturbed));

      const diff = baselineResult.reduce((sum, p, i) => sum + Math.abs(p - perturbedResult[i]), 0);
      importance[name] = diff / 2;
    }

    return importance;
  }

  addTrainingExample(example: TrainingExample): void {
    this.trainingBuffer.push(example);
    log.info("MillStrategyNeuralEngine.addTrainingExample", {
      strategy: example.label_strategy_id,
      outcome: example.outcome,
      buffer_size: this.trainingBuffer.length,
    });
  }

  getTrainingBufferSize(): number {
    return this.trainingBuffer.length;
  }

  clearTrainingBuffer(): void {
    this.trainingBuffer = [];
  }

  getModelVersion(): string {
    return this.modelVersion;
  }

  getStrategyCatalog(): Array<{ id: string; name: string }> {
    return [...STRATEGY_CATALOG];
  }

  exportWeights(): {
    weights: { w1: number[][]; w2: number[][]; w3: number[][]; wOut: number[][] };
    biases: { b1: number[]; b2: number[]; b3: number[]; bOut: number[] };
    version: string;
  } {
    return {
      weights: {
        w1: this.weights1,
        w2: this.weights2,
        w3: this.weights3,
        wOut: this.weightsOut,
      },
      biases: {
        b1: this.bias1,
        b2: this.bias2,
        b3: this.bias3,
        bOut: this.biasOut,
      },
      version: this.modelVersion,
    };
  }

  importWeights(data: ReturnType<MillStrategyNeuralEngine["exportWeights"]>): void {
    this.weights1 = data.weights.w1;
    this.weights2 = data.weights.w2;
    this.weights3 = data.weights.w3;
    this.weightsOut = data.weights.wOut;
    this.bias1 = data.biases.b1;
    this.bias2 = data.biases.b2;
    this.bias3 = data.biases.b3;
    this.biasOut = data.biases.bOut;
    this.modelVersion = data.version;
    log.info("MillStrategyNeuralEngine.importWeights", { version: data.version });
  }
}

export const millStrategyNeuralEngine = new MillStrategyNeuralEngine();
