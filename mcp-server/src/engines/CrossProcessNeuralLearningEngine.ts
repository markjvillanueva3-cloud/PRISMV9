/**
 * CrossProcessNeuralLearningEngine — pure-JS multi-layer perceptron that
 * predicts {success, failure, operator_override} from a CrossProcess
 * OutcomeRecord. Trained online from CrossProcessOutcomeStore events.
 *
 * Milestone: INFRA-NEURAL-LEDGER-MS1 / U-XPROC-NEURAL-T1-02.
 *
 * Why this exists
 * ---------------
 * T1-01 (CrossProcessOutcomeStore) gives the system an event ledger but no
 * way to learn from it. Risk #1 in the architect audit was outcome data
 * starvation — once events flow, downstream optimizers need a probabilistic
 * model of "given this request shape, what is the chance this run will
 * succeed / fail / get overridden by the operator?". This engine is the
 * minimum learnable bridge: a tiny supervised classifier over featurized
 * outcomes, suitable for online training as events accumulate.
 *
 * Architecture
 * ------------
 *   Input (32) — featurize(OutcomeRecord)
 *     Numeric (7):   tool_diameter_mm, depth_of_cut_mm, workpiece_thickness_mm,
 *                    target_ra_um, spindle_rpm, feed_rate_mm_min,
 *                    cutting_speed_m_min — log1p-normalized to bounded range
 *     Bridge (5):    one-hot (sf, post, feature, ai, router)
 *     Process (3):   one-hot (mill, lathe, wedm)
 *     material (4):  string-hash bucket
 *     tool_material (3), machine_family (3), operation (3): string-hash buckets
 *     Aux (4):       success-flag, warnings-norm, has-operator, bias
 *     Total: 7 + 5 + 3 + 4 + 3 + 3 + 3 + 4 = 32
 *
 *   Hidden (16) — tanh activation
 *   Output (3)  — softmax → P(success), P(failure), P(operator_override)
 *
 * Training
 * --------
 *   Xavier (Glorot uniform) init: U[-r, r], r = sqrt(6 / (fan_in + fan_out))
 *   Loss: cross-entropy
 *   Optimizer: SGD with momentum (default β=0.9, lr=0.01)
 *   Records with outcome.kind === "pending" are silently excluded — they
 *     have no label yet.
 *
 * Determinism
 * -----------
 *   Mulberry32 PRNG seeded by config.seed (default 42). Same seed + same
 *   training set → bit-identical weights (provided no concurrent mutation).
 *
 * Persistence
 * -----------
 *   serialize() / fromSerialized(state) round-trip preserves weights, biases,
 *   training metrics, and config. Atomic save/load via tmp+rename.
 *
 * @module engines/CrossProcessNeuralLearningEngine
 */

import * as fs from "node:fs";
import * as path from "node:path";

import type {
  OutcomeRecord,
  OutcomeBridge,
  OutcomeProcess,
} from "./CrossProcessOutcomeStore.js";

// ============================================================================
// CONSTANTS
// ============================================================================

export const SCHEMA_VERSION = "1.0.0";

export const INPUT_DIM = 32;
export const HIDDEN_DIM = 16;
export const OUTPUT_DIM = 3;

export const CLASS_SUCCESS = 0;
export const CLASS_FAILURE = 1;
export const CLASS_OVERRIDE = 2;

const DEFAULT_LEARNING_RATE = 0.01;
const DEFAULT_MOMENTUM = 0.9;
const DEFAULT_EPOCHS = 1;
const DEFAULT_BATCH_SIZE = 32;
const DEFAULT_SEED = 42;
const SOFTMAX_EPSILON = 1e-9;
const LOG1P_NUMERIC_DIVISOR = 12; // tames the log1p output into roughly [0, 1] for sane shop-floor magnitudes

const BRIDGE_INDEX: Record<OutcomeBridge, number> = {
  sf: 0,
  post: 1,
  feature: 2,
  ai: 3,
  router: 4,
};
const BRIDGE_DIM = 5;

const PROCESS_INDEX: Record<OutcomeProcess, number> = {
  mill: 0,
  lathe: 1,
  wedm: 2,
};
const PROCESS_DIM = 3;

const MATERIAL_BUCKETS = 4;
const TOOL_MATERIAL_BUCKETS = 3;
const MACHINE_FAMILY_BUCKETS = 3;
const OPERATION_BUCKETS = 3;
const AUX_DIM = 4; // success-flag, warnings-norm, has-operator, bias

const NUMERIC_KEYS = [
  "tool_diameter_mm",
  "depth_of_cut_mm",
  "workpiece_thickness_mm",
  "target_ra_um",
  "spindle_rpm",
  "feed_rate_mm_min",
  "cutting_speed_m_min",
] as const;

// ============================================================================
// TYPES
// ============================================================================

export interface NeuralConfig {
  learningRate: number;
  momentum: number;
  seed: number;
  /** Default training epochs per call to train(). */
  epochs: number;
  /** Mini-batch size — caps per-step memory and gradient noise. */
  batchSize: number;
}

export interface TrainOpts {
  epochs?: number;
  batchSize?: number;
  /** If true, shuffle the training set each epoch. Default true. */
  shuffle?: boolean;
}

export interface TrainResult {
  epochsRun: number;
  samplesUsed: number;
  samplesSkipped: number;
  /** Cross-entropy loss across the last full pass (mean over samples). */
  finalLoss: number;
  /** Per-class accuracy on training set after final epoch (sanity check, not validation). */
  trainAccuracy: number;
  /** Loss at the start (before any updates this call). */
  initialLoss: number;
}

export interface ClassProbs {
  success: number;
  failure: number;
  operator_override: number;
}

export interface PredictionResult {
  probs: ClassProbs;
  predictedClass: keyof ClassProbs;
  /** Argmax probability — used as confidence. */
  confidence: number;
}

export interface EvaluateResult {
  total: number;
  correct: number;
  accuracy: number;
  /** confusion[expected][predicted] = count */
  confusion: number[][];
  loss: number;
}

export interface SerializedNeural {
  schemaVersion: typeof SCHEMA_VERSION;
  config: NeuralConfig;
  /** [HIDDEN_DIM × INPUT_DIM] row-major */
  W1: number[];
  /** [HIDDEN_DIM] */
  b1: number[];
  /** [OUTPUT_DIM × HIDDEN_DIM] row-major */
  W2: number[];
  /** [OUTPUT_DIM] */
  b2: number[];
  metrics: {
    totalSamplesSeen: number;
    totalEpochsRun: number;
    lastLoss: number;
    lastAccuracy: number;
  };
}

// ============================================================================
// ENGINE
// ============================================================================

export class CrossProcessNeuralLearningEngine {
  private config: NeuralConfig;
  private rng: () => number;

  // Layer 1 weights+biases: hidden = tanh(W1 · input + b1)
  private W1: Float64Array; // [HIDDEN_DIM × INPUT_DIM]
  private b1: Float64Array; // [HIDDEN_DIM]
  // Layer 2 weights+biases: logits = W2 · hidden + b2; probs = softmax(logits)
  private W2: Float64Array; // [OUTPUT_DIM × HIDDEN_DIM]
  private b2: Float64Array; // [OUTPUT_DIM]

  // Momentum buffers — same shapes as W*/b*
  private vW1: Float64Array;
  private vb1: Float64Array;
  private vW2: Float64Array;
  private vb2: Float64Array;

  // Online metrics
  private totalSamplesSeen = 0;
  private totalEpochsRun = 0;
  private lastLoss = 0;
  private lastAccuracy = 0;

  constructor(config: Partial<NeuralConfig> = {}) {
    this.config = {
      learningRate: config.learningRate ?? DEFAULT_LEARNING_RATE,
      momentum: config.momentum ?? DEFAULT_MOMENTUM,
      seed: config.seed ?? DEFAULT_SEED,
      epochs: config.epochs ?? DEFAULT_EPOCHS,
      batchSize: config.batchSize ?? DEFAULT_BATCH_SIZE,
    };
    this.rng = mulberry32(this.config.seed);

    this.W1 = new Float64Array(HIDDEN_DIM * INPUT_DIM);
    this.b1 = new Float64Array(HIDDEN_DIM);
    this.W2 = new Float64Array(OUTPUT_DIM * HIDDEN_DIM);
    this.b2 = new Float64Array(OUTPUT_DIM);

    this.vW1 = new Float64Array(this.W1.length);
    this.vb1 = new Float64Array(this.b1.length);
    this.vW2 = new Float64Array(this.W2.length);
    this.vb2 = new Float64Array(this.b2.length);

    this.xavierInit();
  }

  /** Reset all weights with Xavier (Glorot) uniform initialization. */
  reset(seed?: number): void {
    if (seed !== undefined) {
      this.config.seed = seed;
      this.rng = mulberry32(seed);
    }
    this.W1.fill(0);
    this.b1.fill(0);
    this.W2.fill(0);
    this.b2.fill(0);
    this.vW1.fill(0);
    this.vb1.fill(0);
    this.vW2.fill(0);
    this.vb2.fill(0);
    this.totalSamplesSeen = 0;
    this.totalEpochsRun = 0;
    this.lastLoss = 0;
    this.lastAccuracy = 0;
    this.xavierInit();
  }

  /**
   * Featurize an OutcomeRecord into a fixed 32-dim input vector. Pure
   * function — no internal state mutation, no randomness. Pending records
   * featurize identically to non-pending; only the label generation
   * (recordToLabel) differs.
   */
  featurize(record: OutcomeRecord): Float64Array {
    const f = new Float64Array(INPUT_DIM);
    let offset = 0;

    // 1. Numeric features (7) — log1p normalize, clamped to a bounded range.
    const reqAny = record.request_summary as Record<string, unknown>;
    for (const k of NUMERIC_KEYS) {
      const v = reqAny[k];
      if (typeof v === "number" && Number.isFinite(v) && v >= 0) {
        // log1p makes spindle_rpm=20000 and tool_diameter_mm=0.5 comparable
        f[offset] = Math.min(1, Math.log1p(v) / LOG1P_NUMERIC_DIVISOR);
      } else {
        f[offset] = 0;
      }
      offset++;
    }

    // 2. Bridge one-hot (5).
    const bIdx = BRIDGE_INDEX[record.bridge];
    if (bIdx !== undefined) f[offset + bIdx] = 1;
    offset += BRIDGE_DIM;

    // 3. Process one-hot (3).
    const pIdx = PROCESS_INDEX[record.process];
    if (pIdx !== undefined) f[offset + pIdx] = 1;
    offset += PROCESS_DIM;

    // 4. material hash bucket (4).
    setHashOneHot(f, offset, record.request_summary.material, MATERIAL_BUCKETS);
    offset += MATERIAL_BUCKETS;

    // 5. tool_material hash bucket (3).
    setHashOneHot(f, offset, record.request_summary.tool_material, TOOL_MATERIAL_BUCKETS);
    offset += TOOL_MATERIAL_BUCKETS;

    // 6. machine_family hash bucket (3).
    setHashOneHot(f, offset, record.request_summary.machine_family, MACHINE_FAMILY_BUCKETS);
    offset += MACHINE_FAMILY_BUCKETS;

    // 7. operation hash bucket (3).
    setHashOneHot(f, offset, record.request_summary.operation, OPERATION_BUCKETS);
    offset += OPERATION_BUCKETS;

    // 8. Aux features (4): success-flag, warnings-norm, has-operator, bias.
    const succ = record.response_summary?.success;
    f[offset++] = succ === true ? 1 : succ === false ? -1 : 0;
    const warn = record.response_summary?.warnings_count ?? 0;
    f[offset++] = Math.min(1, Math.max(0, warn) / 10); // 0..10+ warnings → 0..1
    f[offset++] = record.operator?.id ? 1 : 0;
    f[offset++] = 1; // bias unit

    return f;
  }

  /**
   * Map an OutcomeRecord to a class index. Returns null when the record has
   * no usable label (pending or missing outcome). Caller decides whether to
   * skip silently or throw.
   */
  recordToLabel(record: OutcomeRecord): number | null {
    const kind = record.outcome?.kind;
    if (kind === "success") return CLASS_SUCCESS;
    if (kind === "failure") return CLASS_FAILURE;
    if (kind === "operator_override") return CLASS_OVERRIDE;
    return null; // pending or missing
  }

  /**
   * Train on a batch of OutcomeRecords. Pending records are silently
   * skipped. Returns final loss and accuracy across the batch. Empty
   * (or all-pending) input is a graceful no-op with samplesUsed = 0.
   */
  train(records: readonly OutcomeRecord[], opts: TrainOpts = {}): TrainResult {
    const epochs = Math.max(1, opts.epochs ?? this.config.epochs);
    const batchSize = Math.max(1, opts.batchSize ?? this.config.batchSize);
    const shuffle = opts.shuffle !== false;

    // Prepare labeled samples once.
    const samples: Array<{ x: Float64Array; y: number }> = [];
    let skipped = 0;
    for (const r of records) {
      const y = this.recordToLabel(r);
      if (y === null) {
        skipped++;
        continue;
      }
      samples.push({ x: this.featurize(r), y });
    }

    if (samples.length === 0) {
      return {
        epochsRun: 0,
        samplesUsed: 0,
        samplesSkipped: skipped,
        finalLoss: this.lastLoss,
        trainAccuracy: this.lastAccuracy,
        initialLoss: this.lastLoss,
      };
    }

    const initialLoss = this.computeMeanLoss(samples);
    let lastLoss = initialLoss;
    let lastCorrect = 0;

    for (let ep = 0; ep < epochs; ep++) {
      if (shuffle) this.shuffleInPlace(samples);
      lastCorrect = 0;
      let epochLoss = 0;
      for (let i = 0; i < samples.length; i += batchSize) {
        const end = Math.min(i + batchSize, samples.length);
        for (let j = i; j < end; j++) {
          const { x, y } = samples[j];
          const { loss, correct } = this.stepOne(x, y);
          epochLoss += loss;
          if (correct) lastCorrect++;
        }
      }
      lastLoss = epochLoss / samples.length;
      this.totalEpochsRun++;
    }

    const trainAccuracy = lastCorrect / samples.length;
    this.totalSamplesSeen += samples.length * epochs;
    this.lastLoss = lastLoss;
    this.lastAccuracy = trainAccuracy;

    return {
      epochsRun: epochs,
      samplesUsed: samples.length,
      samplesSkipped: skipped,
      finalLoss: lastLoss,
      trainAccuracy,
      initialLoss,
    };
  }

  /** Predict from a featurized input vector. Pure (no state change). */
  predict(input: Float64Array): PredictionResult {
    if (input.length !== INPUT_DIM) {
      throw new Error(
        `predict: input length must be ${INPUT_DIM} (got ${input.length})`,
      );
    }
    const { probs } = this.forward(input);
    let argmax = 0;
    let max = probs[0];
    for (let i = 1; i < probs.length; i++) {
      if (probs[i] > max) {
        max = probs[i];
        argmax = i;
      }
    }
    const className: keyof ClassProbs =
      argmax === CLASS_SUCCESS
        ? "success"
        : argmax === CLASS_FAILURE
          ? "failure"
          : "operator_override";
    return {
      probs: {
        success: probs[CLASS_SUCCESS],
        failure: probs[CLASS_FAILURE],
        operator_override: probs[CLASS_OVERRIDE],
      },
      predictedClass: className,
      confidence: max,
    };
  }

  /** Convenience: featurize a record then predict. */
  predictFromRecord(record: OutcomeRecord): PredictionResult {
    return this.predict(this.featurize(record));
  }

  /**
   * Evaluate accuracy + cross-entropy on a held-out batch. Pending records
   * are skipped. Confusion matrix dim is OUTPUT_DIM × OUTPUT_DIM.
   */
  evaluate(records: readonly OutcomeRecord[]): EvaluateResult {
    const confusion: number[][] = Array.from({ length: OUTPUT_DIM }, () =>
      new Array<number>(OUTPUT_DIM).fill(0),
    );
    let correct = 0;
    let total = 0;
    let lossSum = 0;
    for (const r of records) {
      const y = this.recordToLabel(r);
      if (y === null) continue;
      const { probs } = this.forward(this.featurize(r));
      let argmax = 0;
      for (let i = 1; i < probs.length; i++) if (probs[i] > probs[argmax]) argmax = i;
      confusion[y][argmax]++;
      if (argmax === y) correct++;
      lossSum += -Math.log(Math.max(SOFTMAX_EPSILON, probs[y]));
      total++;
    }
    return {
      total,
      correct,
      accuracy: total === 0 ? 0 : correct / total,
      confusion,
      loss: total === 0 ? 0 : lossSum / total,
    };
  }

  /**
   * Snapshot the engine's full state for persistence. Returns a JSON-safe
   * object. Symmetric with fromSerialized.
   */
  serialize(): SerializedNeural {
    return {
      schemaVersion: SCHEMA_VERSION,
      config: { ...this.config },
      W1: Array.from(this.W1),
      b1: Array.from(this.b1),
      W2: Array.from(this.W2),
      b2: Array.from(this.b2),
      metrics: {
        totalSamplesSeen: this.totalSamplesSeen,
        totalEpochsRun: this.totalEpochsRun,
        lastLoss: this.lastLoss,
        lastAccuracy: this.lastAccuracy,
      },
    };
  }

  /**
   * Restore engine state from a serialized snapshot. Throws on shape or
   * schema mismatch — this is a hard fail because predictions would be
   * silently wrong otherwise.
   */
  static fromSerialized(state: SerializedNeural): CrossProcessNeuralLearningEngine {
    if (!state || state.schemaVersion !== SCHEMA_VERSION) {
      throw new Error(
        `fromSerialized: schemaVersion mismatch (expected ${SCHEMA_VERSION}, got ${state?.schemaVersion})`,
      );
    }
    if (state.W1.length !== HIDDEN_DIM * INPUT_DIM) {
      throw new Error(
        `fromSerialized: W1 length mismatch (expected ${HIDDEN_DIM * INPUT_DIM}, got ${state.W1.length})`,
      );
    }
    if (state.b1.length !== HIDDEN_DIM) {
      throw new Error(
        `fromSerialized: b1 length mismatch (expected ${HIDDEN_DIM}, got ${state.b1.length})`,
      );
    }
    if (state.W2.length !== OUTPUT_DIM * HIDDEN_DIM) {
      throw new Error(
        `fromSerialized: W2 length mismatch (expected ${OUTPUT_DIM * HIDDEN_DIM}, got ${state.W2.length})`,
      );
    }
    if (state.b2.length !== OUTPUT_DIM) {
      throw new Error(
        `fromSerialized: b2 length mismatch (expected ${OUTPUT_DIM}, got ${state.b2.length})`,
      );
    }
    const eng = new CrossProcessNeuralLearningEngine(state.config);
    eng.W1.set(state.W1);
    eng.b1.set(state.b1);
    eng.W2.set(state.W2);
    eng.b2.set(state.b2);
    eng.vW1.fill(0);
    eng.vb1.fill(0);
    eng.vW2.fill(0);
    eng.vb2.fill(0);
    eng.totalSamplesSeen = state.metrics.totalSamplesSeen;
    eng.totalEpochsRun = state.metrics.totalEpochsRun;
    eng.lastLoss = state.metrics.lastLoss;
    eng.lastAccuracy = state.metrics.lastAccuracy;
    return eng;
  }

  /** Atomic JSON write of serialize(). */
  saveTo(filePath: string): void {
    if (filePath.includes("..")) {
      throw new Error(`saveTo: refusing to write to path with '..': ${filePath}`);
    }
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const tmp = `${filePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.serialize()), "utf-8");
    fs.renameSync(tmp, filePath);
  }

  /** Read JSON, validate via fromSerialized. */
  static loadFrom(filePath: string): CrossProcessNeuralLearningEngine {
    const raw = fs.readFileSync(filePath, "utf-8");
    const state = JSON.parse(raw) as SerializedNeural;
    return CrossProcessNeuralLearningEngine.fromSerialized(state);
  }

  getConfig(): NeuralConfig {
    return { ...this.config };
  }

  getMetrics(): SerializedNeural["metrics"] {
    return {
      totalSamplesSeen: this.totalSamplesSeen,
      totalEpochsRun: this.totalEpochsRun,
      lastLoss: this.lastLoss,
      lastAccuracy: this.lastAccuracy,
    };
  }

  // ──────── PRIVATE ────────

  /** Xavier (Glorot) uniform: U[-r, r], r = sqrt(6 / (fan_in + fan_out)). */
  private xavierInit(): void {
    const r1 = Math.sqrt(6 / (INPUT_DIM + HIDDEN_DIM));
    for (let i = 0; i < this.W1.length; i++) {
      this.W1[i] = (this.rng() * 2 - 1) * r1;
    }
    const r2 = Math.sqrt(6 / (HIDDEN_DIM + OUTPUT_DIM));
    for (let i = 0; i < this.W2.length; i++) {
      this.W2[i] = (this.rng() * 2 - 1) * r2;
    }
    // biases initialize to 0 (already done by Float64Array default)
  }

  /** Forward pass: returns hidden activations + softmax probs. */
  private forward(x: Float64Array): { hidden: Float64Array; probs: Float64Array } {
    // hidden_pre = W1 · x + b1
    const hidden = new Float64Array(HIDDEN_DIM);
    for (let h = 0; h < HIDDEN_DIM; h++) {
      let s = this.b1[h];
      const rowOff = h * INPUT_DIM;
      for (let i = 0; i < INPUT_DIM; i++) {
        s += this.W1[rowOff + i] * x[i];
      }
      hidden[h] = Math.tanh(s);
    }
    // logits = W2 · hidden + b2
    const logits = new Float64Array(OUTPUT_DIM);
    for (let o = 0; o < OUTPUT_DIM; o++) {
      let s = this.b2[o];
      const rowOff = o * HIDDEN_DIM;
      for (let h = 0; h < HIDDEN_DIM; h++) {
        s += this.W2[rowOff + h] * hidden[h];
      }
      logits[o] = s;
    }
    // softmax (numerically stable: subtract max)
    let max = logits[0];
    for (let o = 1; o < OUTPUT_DIM; o++) if (logits[o] > max) max = logits[o];
    let sum = 0;
    const probs = new Float64Array(OUTPUT_DIM);
    for (let o = 0; o < OUTPUT_DIM; o++) {
      probs[o] = Math.exp(logits[o] - max);
      sum += probs[o];
    }
    for (let o = 0; o < OUTPUT_DIM; o++) probs[o] /= sum;
    return { hidden, probs };
  }

  /**
   * Single forward+backward+update step. Returns sample loss + whether the
   * argmax matched the label (for in-line accuracy tally).
   */
  private stepOne(x: Float64Array, y: number): { loss: number; correct: boolean } {
    const { hidden, probs } = this.forward(x);

    // Cross-entropy: -log(probs[y]).
    const loss = -Math.log(Math.max(SOFTMAX_EPSILON, probs[y]));
    const argmax = probs[0] >= probs[1] && probs[0] >= probs[2]
      ? 0
      : probs[1] >= probs[2]
        ? 1
        : 2;

    // dL/dlogits = probs - one_hot(y).
    const dLogits = new Float64Array(OUTPUT_DIM);
    for (let o = 0; o < OUTPUT_DIM; o++) {
      dLogits[o] = probs[o] - (o === y ? 1 : 0);
    }

    // dL/dW2[o,h] = dLogits[o] * hidden[h]; dL/db2[o] = dLogits[o].
    const lr = this.config.learningRate;
    const mom = this.config.momentum;
    for (let o = 0; o < OUTPUT_DIM; o++) {
      const rowOff = o * HIDDEN_DIM;
      for (let h = 0; h < HIDDEN_DIM; h++) {
        const grad = dLogits[o] * hidden[h];
        this.vW2[rowOff + h] = mom * this.vW2[rowOff + h] - lr * grad;
        this.W2[rowOff + h] += this.vW2[rowOff + h];
      }
      this.vb2[o] = mom * this.vb2[o] - lr * dLogits[o];
      this.b2[o] += this.vb2[o];
    }

    // dL/dhidden_pre[h] = (1 - tanh(hidden_pre)^2) * sum_o(W2[o,h] * dLogits[o]).
    // hidden[h] = tanh(hidden_pre[h]) → tanh' = 1 - hidden[h]^2.
    const dHiddenPre = new Float64Array(HIDDEN_DIM);
    for (let h = 0; h < HIDDEN_DIM; h++) {
      let s = 0;
      for (let o = 0; o < OUTPUT_DIM; o++) {
        s += this.W2[o * HIDDEN_DIM + h] * dLogits[o];
      }
      dHiddenPre[h] = (1 - hidden[h] * hidden[h]) * s;
    }

    // dL/dW1[h,i] = dHiddenPre[h] * x[i]; dL/db1[h] = dHiddenPre[h].
    for (let h = 0; h < HIDDEN_DIM; h++) {
      const rowOff = h * INPUT_DIM;
      for (let i = 0; i < INPUT_DIM; i++) {
        const grad = dHiddenPre[h] * x[i];
        this.vW1[rowOff + i] = mom * this.vW1[rowOff + i] - lr * grad;
        this.W1[rowOff + i] += this.vW1[rowOff + i];
      }
      this.vb1[h] = mom * this.vb1[h] - lr * dHiddenPre[h];
      this.b1[h] += this.vb1[h];
    }

    return { loss, correct: argmax === y };
  }

  private computeMeanLoss(samples: Array<{ x: Float64Array; y: number }>): number {
    if (samples.length === 0) return 0;
    let s = 0;
    for (const { x, y } of samples) {
      const { probs } = this.forward(x);
      s += -Math.log(Math.max(SOFTMAX_EPSILON, probs[y]));
    }
    return s / samples.length;
  }

  /** Fisher-Yates with seeded RNG. */
  private shuffleInPlace<T>(arr: T[]): void {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
  }
}

// ============================================================================
// HELPERS
// ============================================================================

/** Mulberry32: tiny seeded PRNG, returns U[0,1). Same seed → same stream. */
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable string hash (djb2-derived) into [0, modulus). */
function hashStringMod(s: string | undefined, modulus: number): number {
  if (!s) return -1;
  let h = 5381;
  const lower = s.toLowerCase();
  for (let i = 0; i < lower.length; i++) {
    h = (h * 33) ^ lower.charCodeAt(i);
  }
  return ((h >>> 0) % modulus);
}

/** Set a one-hot bit at offset+hash(s) within a `width`-wide slot. */
function setHashOneHot(
  f: Float64Array,
  offset: number,
  s: string | undefined,
  width: number,
): void {
  const idx = hashStringMod(s, width);
  if (idx >= 0) f[offset + idx] = 1;
}

export const crossProcessNeuralLearningEngine = new CrossProcessNeuralLearningEngine();
