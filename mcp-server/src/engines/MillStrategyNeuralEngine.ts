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

/** Options for {@link MillStrategyNeuralEngine.trainFromBuffer}. */
export interface TrainFromBufferOptions {
  /** SGD passes over the buffer. Default 10. Must be a positive integer. */
  epochs?: number;
  /** SGD step size. Default 0.05. Must be a positive finite number. */
  learningRate?: number;
  /**
   * Sample weight applied to "failure" outcomes. Default 0 (failures excluded
   * from positive reinforcement). A negative value enables failure "unlearning"
   * (pushes probability AWAY from the failed label); cross-entropy gradient on a
   * softmax is bounded so this is numerically stable, but off by default.
   */
  failureWeight?: number;
}

/** Result of a {@link MillStrategyNeuralEngine.trainFromBuffer} pass. */
export interface TrainingResult {
  trained: boolean;
  examples_used: number;
  examples_skipped: number;
  epochs: number;
  learning_rate: number;
  loss_before: number;
  loss_after: number;
  model_version: string;
  reason?: string;
}

/** Result of {@link MillStrategyNeuralEngine.recordOutcome}. */
export interface RecordOutcomeResult {
  recorded: boolean;
  buffer_size: number;
  strategy_id: string;
  outcome: TrainingExample["outcome"];
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
  private trainRounds = 0;

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

  // ----------------------------------------------------------------------------
  // Closed learning loop: record actuals -> train weights from buffered outcomes.
  // Before this, predict() ran forever on random-init weights and addTrainingExample
  // was a dead-end sink (the buffer was never consumed). recordOutcome is the
  // validated capture side; trainFromBuffer is the SGD step that actually closes
  // the loop (buffered actuals -> updated weights -> better predictions).
  // ----------------------------------------------------------------------------

  /**
   * Validated capture of a real-world strategy outcome (the actuals side of the
   * learning loop). Wraps {@link addTrainingExample} with contract checks so the
   * dispatcher surface cannot silently buffer garbage.
   *
   * @param features      the StrategyFeatureVector the prediction was made on
   * @param labelStrategyId the strategy actually run (must be in the catalog)
   * @param outcome       observed outcome -- success | partial | failure
   * @param weight        optional per-example weight multiplier (>= 0)
   * @returns             {recorded, buffer_size, strategy_id, outcome}
   * @throws              on unknown strategy id, bad outcome, non-finite feature, or negative weight
   */
  recordOutcome(
    features: StrategyFeatureVector,
    labelStrategyId: string,
    outcome: TrainingExample["outcome"],
    weight?: number,
  ): RecordOutcomeResult {
    if (!STRATEGY_CATALOG.some(s => s.id === labelStrategyId)) {
      throw new Error(
        `MillStrategyNeuralEngine.recordOutcome: unknown strategy_id '${labelStrategyId}' (not in catalog of ${STRATEGY_CATALOG.length})`,
      );
    }
    if (outcome !== "success" && outcome !== "partial" && outcome !== "failure") {
      throw new Error(
        `MillStrategyNeuralEngine.recordOutcome: outcome must be success|partial|failure, got '${outcome}'`,
      );
    }
    if (weight !== undefined && (typeof weight !== "number" || !Number.isFinite(weight) || weight < 0)) {
      throw new Error("MillStrategyNeuralEngine.recordOutcome: weight must be a finite number >= 0");
    }
    this.assertFiniteFeatures(features);

    this.addTrainingExample({ features, label_strategy_id: labelStrategyId, outcome, weight });
    return {
      recorded: true,
      buffer_size: this.trainingBuffer.length,
      strategy_id: labelStrategyId,
      outcome,
    };
  }

  /**
   * Train the network on the buffered outcomes via online SGD (cross-entropy over
   * the softmax output, backprop through the 8->64->128->64->20 ReLU stack). This
   * is what actually closes the loop: buffered actuals update the weights and bump
   * the model version. Outcome maps to a sample weight (success 1.0, partial 0.5,
   * failure {@link TrainFromBufferOptions.failureWeight}, default 0 => excluded).
   *
   * @param opts epochs (default 10) / learningRate (default 0.05) / failureWeight (default 0)
   * @returns    {trained, examples_used, examples_skipped, loss_before, loss_after, model_version, ...}
   * @throws     on non-positive epochs / non-positive learningRate / non-finite failureWeight
   */
  trainFromBuffer(opts: TrainFromBufferOptions = {}): TrainingResult {
    const epochs = opts.epochs ?? 10;
    const learningRate = opts.learningRate ?? 0.05;
    const failureWeight = opts.failureWeight ?? 0;

    if (typeof epochs !== "number" || !Number.isInteger(epochs) || epochs <= 0) {
      throw new Error("MillStrategyNeuralEngine.trainFromBuffer: epochs must be a positive integer");
    }
    if (typeof learningRate !== "number" || !Number.isFinite(learningRate) || learningRate <= 0) {
      throw new Error("MillStrategyNeuralEngine.trainFromBuffer: learningRate must be a positive finite number");
    }
    if (typeof failureWeight !== "number" || !Number.isFinite(failureWeight)) {
      throw new Error("MillStrategyNeuralEngine.trainFromBuffer: failureWeight must be a finite number");
    }

    const samples = this.trainingBuffer
      .map(ex => ({
        input: this.featuresToVector(ex.features),
        labelIdx: STRATEGY_CATALOG.findIndex(s => s.id === ex.label_strategy_id),
        w: this.effectiveWeight(ex, failureWeight),
      }))
      .filter(s => s.labelIdx >= 0 && Number.isFinite(s.w) && s.w !== 0);

    const skipped = this.trainingBuffer.length - samples.length;
    if (samples.length === 0) {
      return {
        trained: false,
        examples_used: 0,
        examples_skipped: this.trainingBuffer.length,
        epochs,
        learning_rate: learningRate,
        loss_before: 0,
        loss_after: 0,
        model_version: this.modelVersion,
        reason: "no trainable (catalog-valid, non-zero-weight) examples in buffer",
      };
    }

    const lossBefore = this.meanLoss(samples);

    // Deep-copy snapshot for rollback. exportWeights() returns LIVE array references, so
    // sgdStep would mutate it in place -- a shallow copy could not restore a diverged model.
    const snapshot = {
      weights: {
        w1: this.weights1.map(r => [...r]),
        w2: this.weights2.map(r => [...r]),
        w3: this.weights3.map(r => [...r]),
        wOut: this.weightsOut.map(r => [...r]),
      },
      biases: {
        b1: [...this.bias1], b2: [...this.bias2], b3: [...this.bias3], bOut: [...this.biasOut],
      },
      version: this.modelVersion,
    };

    for (let e = 0; e < epochs; e++) {
      for (const s of samples) this.sgdStep(s.input, s.labelIdx, s.w, learningRate);
    }
    const lossAfter = this.meanLoss(samples);

    if (!Number.isFinite(lossAfter) || !this.weightsFinite()) {
      // Divergence (learningRate too high or |failureWeight| too large): roll back so the
      // model is NEVER silently left corrupted, and report it (R12) -- not a false trained:true.
      // The meanLoss prob-clamp would otherwise keep loss_after finite over NaN weights.
      this.importWeights(snapshot);
      return {
        trained: false,
        examples_used: samples.length,
        examples_skipped: skipped,
        epochs,
        learning_rate: learningRate,
        loss_before: lossBefore,
        loss_after: lossBefore,
        model_version: this.modelVersion,
        reason: "training diverged to non-finite weights; rolled back -- reduce learning_rate or failure_weight magnitude",
      };
    }

    this.trainRounds += 1;
    this.modelVersion = `v0.2.${this.trainRounds}-sgd`;
    return {
      trained: true,
      examples_used: samples.length,
      examples_skipped: skipped,
      epochs,
      learning_rate: learningRate,
      loss_before: lossBefore,
      loss_after: lossAfter,
      model_version: this.modelVersion,
    };
  }

  /** Number of completed {@link trainFromBuffer} passes (0 = untrained / random-init). */
  getTrainRounds(): number {
    return this.trainRounds;
  }

  private effectiveWeight(ex: TrainingExample, failureWeight: number): number {
    const base = ex.outcome === "success" ? 1 : ex.outcome === "partial" ? 0.5 : failureWeight;
    const mult = ex.weight !== undefined ? ex.weight : 1;
    return base * mult;
  }

  private assertFiniteFeatures(features: StrategyFeatureVector): void {
    // Require EVERY field present AND finite -- a missing field would become NaN in
    // featuresToVector (undefined/5) and silently poison training/loss. (R12)
    const required: (keyof StrategyFeatureVector)[] = [
      "material_iso_group", "hardness_normalized", "operation_type", "tolerance_class",
      "feature_complexity", "machine_class", "depth_to_diameter", "wall_thickness_ratio",
    ];
    for (const k of required) {
      const v = (features as unknown as Record<string, unknown>)[k as string];
      if (typeof v !== "number" || !Number.isFinite(v)) {
        throw new Error(`MillStrategyNeuralEngine: feature '${k}' must be a finite number, got ${String(v)}`);
      }
    }
  }

  private weightsFinite(): boolean {
    for (const m of [this.weights1, this.weights2, this.weights3, this.weightsOut]) {
      for (const row of m) for (const v of row) if (!Number.isFinite(v)) return false;
    }
    for (const b of [this.bias1, this.bias2, this.bias3, this.biasOut]) {
      for (const v of b) if (!Number.isFinite(v)) return false;
    }
    return true;
  }

  /** Forward pass retaining post-activation layers for backprop. */
  private forwardCache(input: number[]): { a1: number[]; a2: number[]; a3: number[]; probs: number[] } {
    const z1 = this.matmul(this.weights1, input);
    const a1 = z1.map((v, i) => this.relu(v + this.bias1[i]));
    const z2 = this.matmul(this.weights2, a1);
    const a2 = z2.map((v, i) => this.relu(v + this.bias2[i]));
    const z3 = this.matmul(this.weights3, a2);
    const a3 = z3.map((v, i) => this.relu(v + this.bias3[i]));
    const zo = this.matmul(this.weightsOut, a3).map((v, i) => v + this.biasOut[i]);
    const probs = this.softmax(zo);
    return { a1, a2, a3, probs };
  }

  /** One online SGD step (cross-entropy gradient, backprop through ReLU). Updates weights in place. */
  private sgdStep(input: number[], labelIdx: number, sampleWeight: number, lr: number): void {
    const { a1, a2, a3, probs } = this.forwardCache(input);

    // Output layer: dL/dzo = w * (softmax - onehot)
    const dzo = probs.map((p, k) => sampleWeight * (p - (k === labelIdx ? 1 : 0)));
    const da3 = new Array(HIDDEN_3).fill(0);
    for (let k = 0; k < OUTPUT_DIM; k++) {
      const g = dzo[k];
      const row = this.weightsOut[k];
      for (let i = 0; i < HIDDEN_3; i++) {
        da3[i] += row[i] * g; // read old weight before update
        row[i] -= lr * g * a3[i];
      }
      this.biasOut[k] -= lr * g;
    }

    // Hidden layer 3 (ReLU': mask on post-activation > 0)
    const da2 = new Array(HIDDEN_2).fill(0);
    for (let i = 0; i < HIDDEN_3; i++) {
      if (a3[i] <= 0) continue;
      const g = da3[i];
      if (g === 0) continue;
      const row = this.weights3[i];
      for (let j = 0; j < HIDDEN_2; j++) {
        da2[j] += row[j] * g;
        row[j] -= lr * g * a2[j];
      }
      this.bias3[i] -= lr * g;
    }

    // Hidden layer 2
    const da1 = new Array(HIDDEN_1).fill(0);
    for (let j = 0; j < HIDDEN_2; j++) {
      if (a2[j] <= 0) continue;
      const g = da2[j];
      if (g === 0) continue;
      const row = this.weights2[j];
      for (let m = 0; m < HIDDEN_1; m++) {
        da1[m] += row[m] * g;
        row[m] -= lr * g * a1[m];
      }
      this.bias2[j] -= lr * g;
    }

    // Hidden layer 1
    for (let m = 0; m < HIDDEN_1; m++) {
      if (a1[m] <= 0) continue;
      const g = da1[m];
      if (g === 0) continue;
      const row = this.weights1[m];
      for (let n = 0; n < INPUT_DIM; n++) {
        row[n] -= lr * g * input[n];
      }
      this.bias1[m] -= lr * g;
    }
  }

  /** Mean cross-entropy of the current model over the given samples (loss reporting). */
  private meanLoss(samples: Array<{ input: number[]; labelIdx: number }>): number {
    if (samples.length === 0) return 0;
    let total = 0;
    for (const s of samples) {
      const { probs } = this.forwardCache(s.input);
      total += -Math.log(Math.max(probs[s.labelIdx], 1e-9));
    }
    return total / samples.length;
  }
}

export const millStrategyNeuralEngine = new MillStrategyNeuralEngine();
