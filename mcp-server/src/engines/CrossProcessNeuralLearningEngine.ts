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

// U-NN-LOOP03: subscribe to FeedbackBus 'outcome.recorded' for auto-train.
import {
  feedbackBusEngine,
  type FeedbackEvent,
  type SubscriptionHandle,
} from "./FeedbackBusEngine.js";

import type {
  OutcomeRecord,
  OutcomeBridge,
  OutcomeProcess,
} from "./CrossProcessOutcomeStore.js";
// U-CN10: experience-replay mixing pulls historical records from the store.
// (Value import — the store is lower-layer; no import cycle.)
import { crossProcessOutcomeStore } from "./CrossProcessOutcomeStore.js";
import {
  PhysicsFeatureExtractorEngine,
  PHYSICS_FEATURE_DIM,
} from "./PhysicsFeatureExtractorEngine.js";
import {
  WikiRAGFeatureEngine,
  RAG_FEATURE_DIM,
} from "./WikiRAGFeatureEngine.js";
// U-CN11: EWC (Elastic Weight Consolidation, Kirkpatrick et al. 2017) — anchors
// old-task weights via a diagonal-Fisher penalty in the retrain. The math (Fisher
// from squared per-sample grads · Schwarz-EMA running-Fisher · λ/2·F·(θ−θ*)² penalty)
// lives in CrossProcessEWCMemoryPreservationEngine; this engine supplies the
// per-sample gradients + the flat-parameter view and applies the penalty gradient.
// (Value import — the EWC engine depends only on zod; no import cycle.)
import { CrossProcessEWCMemoryPreservationEngine } from "./CrossProcessEWCMemoryPreservationEngine.js";

// ============================================================================
// CONSTANTS
// ============================================================================

// Schema 1.0.0→2.0.0 with U-NN-FEAT01: input layer expanded 32→131 dims
//   via wider categorical hash buckets.
// Schema 2.0.0→2.1.0 with U-NN-FEAT02: Welford z-score state added for
//   numeric feature whitening. 2.0.0 models load with empty Welford and
//   will warm-up from scratch.
// Schema 2.1.0→2.2.0 with U-NN-FEAT03: 5 physics features appended
//   (Kienzle force, Taylor life, chatter risk, Brammertz Ra, thermal load).
//   Input dim 131→136. Welford extended to cover physics features too.
// Schema 2.2.0→2.3.0 with U-NN-FEAT04: 8 RAG features appended (tip count,
//   top-K confidence stats, 5 category indicators). Input dim 136→144.
//   RAG features are NOT z-scored — counts/binaries already in unit range.
export const SCHEMA_VERSION = "2.3.0";

const NUMERIC_KEYS_DIM = 7;
const BRIDGE_DIM = 5;
const PROCESS_DIM = 3;
const MATERIAL_BUCKETS = 64;
const TOOL_MATERIAL_BUCKETS = 16;
const MACHINE_FAMILY_BUCKETS = 16;
const OPERATION_BUCKETS = 16;
const AUX_DIM = 4;
// U-NN-FEAT03: physics-derived features go through the same Welford
// accumulator as the raw numerics — they're real-valued continuous inputs.
const PHYSICS_DIM = PHYSICS_FEATURE_DIM; // = 5
// Total numerics seen by Welford = raw (7) + physics (5) = 12.
// RAG features (counts + confidences + binary indicators) are already in
// unit range and do NOT pass through Welford.
const TOTAL_NUMERIC_DIM = NUMERIC_KEYS_DIM + PHYSICS_DIM;
const RAG_DIM = RAG_FEATURE_DIM; // = 8 (U-NN-FEAT04)

export const INPUT_DIM =
  NUMERIC_KEYS_DIM +
  BRIDGE_DIM +
  PROCESS_DIM +
  MATERIAL_BUCKETS +
  TOOL_MATERIAL_BUCKETS +
  MACHINE_FAMILY_BUCKETS +
  OPERATION_BUCKETS +
  AUX_DIM +
  PHYSICS_DIM +
  RAG_DIM; // 7+5+3+64+16+16+16+4+5+8 = 144
export const HIDDEN_DIM = 16;
export const OUTPUT_DIM = 3;

// U-CN11: flat-parameter vector dimension — the EWC layer sees the network as one
// vector laid out [W2, b2, W1, b1] (output layer first). getFlatWeights() and
// flattenGrads() MUST use this exact order so an EWC gradient index maps to the
// right parameter. = 3·16 + 3 + 16·144 + 16 = 2371.
export const FLAT_PARAM_DIM =
  OUTPUT_DIM * HIDDEN_DIM + OUTPUT_DIM + HIDDEN_DIM * INPUT_DIM + HIDDEN_DIM;
/** U-CN11: default EWC penalty strength λ when consolidate is requested without one. */
const DEFAULT_EWC_LAMBDA = 1.0;
/** U-CN11: default Schwarz-EMA decay for the running Fisher (F_run ← decay·F_run + (1−decay)·F_task). */
const DEFAULT_EWC_DECAY = 0.9;

export const CLASS_SUCCESS = 0;
export const CLASS_FAILURE = 1;
export const CLASS_OVERRIDE = 2;

const DEFAULT_LEARNING_RATE = 0.01;
const DEFAULT_MOMENTUM = 0.9;
const DEFAULT_EPOCHS = 1;
const DEFAULT_BATCH_SIZE = 32;
const DEFAULT_SEED = 42;
const SOFTMAX_EPSILON = 1e-9;
// U-NN-FEAT02: Welford z-score normalization for numeric features.
const WELFORD_WARMUP_SAMPLES = 30; // First 30 samples bypass z-score (insufficient stats).
const WELFORD_VARIANCE_EPSILON = 1e-8; // Prevents div-by-zero when variance is tiny.
const Z_SCORE_CLIP_RANGE = 3; // Standard ±3σ clipping (≥99.7% of normal data).
// LOG1P_NUMERIC_DIVISOR is the WARMUP fallback during the first 30 samples,
// when Welford running statistics are too sparse for z-scoring. log1p(x)/12
// maps shop-floor magnitudes (RPM 100..30000, mm 0.1..50) to roughly [0,1].
const LOG1P_NUMERIC_DIVISOR = 12;

const BRIDGE_INDEX: Record<OutcomeBridge, number> = {
  sf: 0,
  post: 1,
  feature: 2,
  ai: 3,
  router: 4,
};

const PROCESS_INDEX: Record<OutcomeProcess, number> = {
  mill: 0,
  lathe: 1,
  wedm: 2,
};

// MATERIAL_BUCKETS, TOOL_MATERIAL_BUCKETS, MACHINE_FAMILY_BUCKETS,
// OPERATION_BUCKETS, AUX_DIM declared near INPUT_DIM constants above.
// AUX_DIM = 4 slots: RESERVED-zero (placeholder for future skill_level),
// warnings-norm, has-operator, bias.

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
  /**
   * U-CN11: if set, after the epoch loop consolidate the *just-trained* samples as
   * an EWC task — compute the diagonal Fisher, merge it into the running Fisher
   * (Schwarz EMA), snapshot the converged weights as the new anchor, and arm the
   * EWC penalty for subsequent training with strength `lambda` (clamped [0, 1e6];
   * 0 = consolidate-and-disarm). `decay` (clamped [0,1], default 0.9) is the EMA
   * weight on the prior running Fisher. When the EWC penalty is already armed, the
   * penalty gradient computed during *this* call's updates uses the previous anchor/
   * Fisher (the new ones take effect on the next train()).
   */
  ewc?: { lambda?: number; decay?: number };
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
  /** U-CN11: present iff `opts.ewc` was given and consolidation succeeded. */
  ewcConsolidated?: { numSamples: number; meanFisher: number; reliable: boolean; lambda: number };
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
  /**
   * U-NN-FEAT02: Welford running mean/M2 for numeric feature z-scoring.
   * Optional for backward compatibility with schema 2.0.0 saves — when
   * absent on load, deserializer initializes empty (warmup from scratch).
   */
  welford?: {
    count: number;
    mean: number[]; // length NUMERIC_KEYS_DIM
    M2: number[];   // length NUMERIC_KEYS_DIM (sum of squared deviations)
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

  // U-NN-FEAT02/03: Welford online mean/variance for numeric feature z-scoring.
  // Slots 0..6 = raw numerics (NUMERIC_KEYS), slots 7..11 = physics features
  // (Kienzle force, Taylor life, chatter risk, Brammertz Ra, thermal load).
  // Updated incrementally inside train() before featurize is called per sample.
  // Persisted in serialize() and restored in loadFrom().
  private welfordCount = 0;
  private welfordMean: Float64Array; // [TOTAL_NUMERIC_DIM]
  private welfordM2: Float64Array;   // [TOTAL_NUMERIC_DIM] sum of squared deviations from mean

  // Online metrics
  private totalSamplesSeen = 0;
  private totalEpochsRun = 0;
  private lastLoss = 0;
  private lastAccuracy = 0;

  // U-NN-LOOP03: auto-train state.
  private autoTrainHandle: SubscriptionHandle | null = null;
  private autoTrainBuffer: OutcomeRecord[] = [];
  private autoTrainThreshold = 16;
  private autoTrainTotalTicks = 0;
  // U-CN10: experience-replay mixing — fraction of the FIFO buffer size to also
  // pull from CrossProcessOutcomeStore (stratified by process) and concat into
  // each retrain batch, so a process burst doesn't catastrophically wipe what the
  // model learned about other processes/materials. 0 disables (default for direct
  // enableAutoTrain callers); the XProcNeuralAutoFireEngine boot path opts into 0.5.
  private autoTrainReplayMixRatio = 0;
  private autoTrainReplayMaxRecords = 256;
  // U-CN11: EWC config forwarded into the auto-train retrain (lambda 0 = off, the
  // default — and the default for the boot path). Reported by autoTrainStatus(); both
  // reset by disableAutoTrain(). The EWC *state* below (anchor/fisher/lambda) persists
  // across disable/enable — only clearEWC() forgets it.
  private autoTrainEwcLambda = 0;
  private autoTrainEwcDecay = DEFAULT_EWC_DECAY;

  // U-CN11: EWC (Elastic Weight Consolidation) state. `ewcEnabled` gates the penalty
  // term in stepBatch; `ewcAnchor` = θ* snapshot (flat, [W2,b2,W1,b1] layout, length
  // FLAT_PARAM_DIM); `ewcFisher` = the Schwarz-EMA running diagonal Fisher (same layout/
  // length). All null until consolidateCurrentTask() / a train({ewc}) pass arms it.
  private ewcEnabled = false;
  private ewcLambda = 0;
  private ewcDecay = DEFAULT_EWC_DECAY;
  private ewcAnchor: number[] | null = null;
  private ewcFisher: number[] | null = null;

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

    this.welfordMean = new Float64Array(TOTAL_NUMERIC_DIM);
    this.welfordM2 = new Float64Array(TOTAL_NUMERIC_DIM);

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
    this.welfordCount = 0;
    this.welfordMean.fill(0);
    this.welfordM2.fill(0);
    this.totalSamplesSeen = 0;
    this.totalEpochsRun = 0;
    this.lastLoss = 0;
    this.lastAccuracy = 0;
    this.xavierInit();
  }

  /**
   * Featurize an OutcomeRecord into a fixed INPUT_DIM-dim input vector
   * (131 dims as of schema 2.0.0). Pure function — no internal state
   * mutation, no randomness. Pending records featurize identically to
   * non-pending; only the label generation (recordToLabel) differs.
   */
  featurize(record: OutcomeRecord): Float64Array {
    const f = new Float64Array(INPUT_DIM);
    let offset = 0;

    // 1. Numeric features (7) — U-NN-FEAT02: Welford z-score normalization.
    //    Pre-warmup (first WELFORD_WARMUP_SAMPLES samples): log1p fallback
    //    (preserves the original featurize behavior — raw clipping at ±3
    //    saturates shop-floor magnitudes like RPM=20000 to a single value).
    //    Post-warmup: (x - mean) / sqrt(variance + eps), clipped to ±3σ.
    //    Once the model has seen ≥30 samples, the running statistics are
    //    stable enough to whiten inputs across orders-of-magnitude spans.
    const reqAny = record.request_summary as Record<string, unknown>;
    for (let i = 0; i < NUMERIC_KEYS.length; i++) {
      const k = NUMERIC_KEYS[i];
      const v = reqAny[k];
      const raw =
        typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : 0;
      let normalized: number;
      const variance = this.welfordM2[i] / Math.max(1, this.welfordCount);
      const useZScore =
        this.welfordCount >= WELFORD_WARMUP_SAMPLES &&
        variance > WELFORD_VARIANCE_EPSILON;
      if (!useZScore) {
        // Warmup or degenerate-variance fallback: log1p compression maps
        // [0, ∞) → [0, 1] roughly. Used when (a) we have <30 samples or
        // (b) all observed values for this feature were identical (e.g.
        // every training record left the field empty → mean=var=0; a new
        // non-zero input would z-score to ∞ and clip to 3, collapsing all
        // distinct raw values into a single output and zeroing variance.)
        normalized = Math.min(1, Math.log1p(raw) / LOG1P_NUMERIC_DIVISOR);
      } else {
        const mean = this.welfordMean[i];
        const std = Math.sqrt(variance + WELFORD_VARIANCE_EPSILON);
        normalized = clamp(
          (raw - mean) / std,
          -Z_SCORE_CLIP_RANGE,
          Z_SCORE_CLIP_RANGE,
        );
      }
      f[offset++] = normalized;
    }

    // 2. Bridge one-hot (5).
    const bIdx = BRIDGE_INDEX[record.bridge];
    if (bIdx !== undefined) f[offset + bIdx] = 1;
    offset += BRIDGE_DIM;

    // 3. Process one-hot (3).
    const pIdx = PROCESS_INDEX[record.process];
    if (pIdx !== undefined) f[offset + pIdx] = 1;
    offset += PROCESS_DIM;

    // 4. material hash bucket (64). U-NN-FEAT01: widened 4→64 to drop
    //    collision rate from ~76% (8 materials in 4 buckets) to <5% on
    //    the real material catalog.
    setHashOneHot(f, offset, record.request_summary.material, MATERIAL_BUCKETS);
    offset += MATERIAL_BUCKETS;

    // 5. tool_material hash bucket (16). U-NN-FEAT01: widened 3→16.
    setHashOneHot(f, offset, record.request_summary.tool_material, TOOL_MATERIAL_BUCKETS);
    offset += TOOL_MATERIAL_BUCKETS;

    // 6. machine_family hash bucket (16). U-NN-FEAT01: widened 3→16.
    setHashOneHot(f, offset, record.request_summary.machine_family, MACHINE_FAMILY_BUCKETS);
    offset += MACHINE_FAMILY_BUCKETS;

    // 7. operation hash bucket (16). U-NN-FEAT01: widened 3→16.
    setHashOneHot(f, offset, record.request_summary.operation, OPERATION_BUCKETS);
    offset += OPERATION_BUCKETS;

    // 8. Aux features (4): RESERVED-zero, warnings-norm, has-operator, bias.
    // U-NN-FIX02: removed response_summary.success injection — that field is
    // downstream of outcome.kind (set BY the outcome we're trying to predict).
    // Leaving it as input was a label leak that gave the model a free shortcut
    // to memorize labels. Slot is preserved as a zero placeholder so INPUT_DIM
    // is stable per schema version (131 in 2.0.0). Future use: operator skill_level.
    f[offset++] = 0;
    const warn = record.response_summary?.warnings_count ?? 0;
    f[offset++] = Math.min(1, Math.max(0, warn) / 10); // 0..10+ warnings → 0..1
    f[offset++] = record.operator?.id ? 1 : 0;
    f[offset++] = 1; // bias unit

    // 9. Physics features (5) — U-NN-FEAT03. Z-scored using Welford slots
    //    NUMERIC_KEYS_DIM..TOTAL_NUMERIC_DIM-1 (which welfordUpdate already
    //    populates with the same PhysicsFeatureExtractor.extract output).
    //    During warmup or when variance is degenerate, fall back to log1p
    //    compression of the raw physics value (same logic as raw numerics).
    const physics = PhysicsFeatureExtractorEngine.extract(record);
    for (let j = 0; j < PHYSICS_FEATURE_DIM; j++) {
      const slot = NUMERIC_KEYS.length + j;
      const raw = Number.isFinite(physics[j]) ? physics[j] : 0;
      const variance = this.welfordM2[slot] / Math.max(1, this.welfordCount);
      const useZScore =
        this.welfordCount >= WELFORD_WARMUP_SAMPLES &&
        variance > WELFORD_VARIANCE_EPSILON;
      let normalized: number;
      if (!useZScore) {
        normalized = Math.min(1, Math.log1p(raw) / LOG1P_NUMERIC_DIVISOR);
      } else {
        const mean = this.welfordMean[slot];
        const std = Math.sqrt(variance + WELFORD_VARIANCE_EPSILON);
        normalized = clamp(
          (raw - mean) / std,
          -Z_SCORE_CLIP_RANGE,
          Z_SCORE_CLIP_RANGE,
        );
      }
      f[offset++] = normalized;
    }

    // 10. Wiki RAG features (8) — U-NN-FEAT04. Already unit-bounded
    //     (counts clipped to TIP_COUNT_CLIP, confidences in [0,1], category
    //     indicators in {0,1}), so they bypass Welford. The first slot
    //     (tip_count) is divided by its clip to bring it into [0,1].
    const rag = WikiRAGFeatureEngine.extractRAGFeatures(record);
    const TIP_COUNT_CLIP_FOR_NORM = 50;
    for (let k = 0; k < RAG_FEATURE_DIM; k++) {
      const raw = Number.isFinite(rag[k]) ? rag[k] : 0;
      // Slot 0 (tip_count) needs scaling; slots 1..7 are already bounded.
      const normalized =
        k === 0 ? Math.min(1, raw / TIP_COUNT_CLIP_FOR_NORM) : raw;
      f[offset++] = normalized;
    }

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

    // U-NN-FEAT02: Update Welford running mean/var with each sample's raw
    // numerics BEFORE featurize. This way featurize sees the most up-to-date
    // statistics — after the warmup period, every featurize call applies
    // z-score with the running mean/std accumulated from prior samples.
    const samples: Array<{ x: Float64Array; y: number }> = [];
    let skipped = 0;
    for (const r of records) {
      const y = this.recordToLabel(r);
      if (y === null) {
        skipped++;
        continue;
      }
      this.welfordUpdate(r);
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

    // U-NN-FIX03: HONEST loss reporting.
    // initialLoss: forward-only on frozen weights BEFORE any updates.
    // finalLoss:   forward-only on frozen weights AFTER all updates.
    // Both use computeMeanLoss(samples), making them directly comparable.
    // Previously finalLoss was accumulated DURING training (per-sample loss
    // computed BEFORE that sample's update), giving a moving-target value
    // that under-reported convergence on a stable model.
    const initialLoss = this.computeMeanLoss(samples);

    // U-NN-FIX04: true minibatch SGD. Gradients are accumulated across batchSize
    // samples then ONE update is applied with the averaged gradient. Previously
    // each sample triggered its own update inside the "batch" loop (effectively
    // online SGD with arbitrary periodicity).
    for (let ep = 0; ep < epochs; ep++) {
      if (shuffle) this.shuffleInPlace(samples);
      for (let i = 0; i < samples.length; i += batchSize) {
        const end = Math.min(i + batchSize, samples.length);
        const batch: Array<{ x: Float64Array; y: number }> = samples.slice(i, end);
        this.stepBatch(batch);
      }
      this.totalEpochsRun++;
    }

    // Post-training measurement: recompute loss + accuracy on the FINAL frozen
    // weights, not on the moving-target mid-training values.
    const finalLoss = this.computeMeanLoss(samples);
    const finalCorrect = this.computeCorrectCount(samples);
    const trainAccuracy = finalCorrect / samples.length;
    this.totalSamplesSeen += samples.length * epochs;
    this.lastLoss = finalLoss;
    this.lastAccuracy = trainAccuracy;

    // U-CN11: optional EWC consolidation of the just-trained samples (Fisher diagonal
    // computed at these converged weights → merged into the running Fisher → new anchor →
    // penalty armed for subsequent training). lambda/decay clamped; failures are
    // swallowed (no ewcConsolidated field, training result otherwise unchanged).
    let ewcConsolidated: TrainResult["ewcConsolidated"];
    if (opts.ewc) {
      const lambda = clamp(Number.isFinite(opts.ewc.lambda) ? (opts.ewc.lambda as number) : DEFAULT_EWC_LAMBDA, 0, 1_000_000);
      const decay = clamp(Number.isFinite(opts.ewc.decay) ? (opts.ewc.decay as number) : DEFAULT_EWC_DECAY, 0, 1);
      const r = this.consolidateFromSamples(samples, lambda, decay);
      if (r) ewcConsolidated = r;
    }

    return {
      epochsRun: epochs,
      samplesUsed: samples.length,
      samplesSkipped: skipped,
      finalLoss,
      trainAccuracy,
      initialLoss,
      ...(ewcConsolidated ? { ewcConsolidated } : {}),
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
      welford: {
        count: this.welfordCount,
        mean: Array.from(this.welfordMean),
        M2: Array.from(this.welfordM2),
      },
    };
  }

  /**
   * Restore engine state from a serialized snapshot. Throws on shape or
   * schema mismatch — this is a hard fail because predictions would be
   * silently wrong otherwise.
   */
  static fromSerialized(state: SerializedNeural): CrossProcessNeuralLearningEngine {
    // Accept any 2.x.y schema. 2.0.0 lacked welford state — initialize empty
    // and warmup from scratch on next train(). 2.1.0+ persists welford.
    if (!state || typeof state.schemaVersion !== "string" || !state.schemaVersion.startsWith("2.")) {
      throw new Error(
        `fromSerialized: schemaVersion mismatch (expected 2.x.y, got ${state?.schemaVersion})`,
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
    // U-NN-FEAT02: restore welford if present (2.1.0+); else stay empty.
    if (state.welford) {
      // Schema 2.1.0 saved 7 slots (NUMERIC_KEYS_DIM); 2.2.0 saves 12
      // (TOTAL_NUMERIC_DIM = raw + physics). Accept either; on legacy
      // 2.1.0 we restore the first 7 slots and physics warms up fresh.
      const len = state.welford.mean.length;
      if (
        (len !== NUMERIC_KEYS_DIM && len !== TOTAL_NUMERIC_DIM) ||
        state.welford.M2.length !== len
      ) {
        throw new Error(
          `fromSerialized: welford.mean/M2 length mismatch (expected ${NUMERIC_KEYS_DIM} or ${TOTAL_NUMERIC_DIM}, got ${len})`,
        );
      }
      eng.welfordCount = state.welford.count;
      // Set leaves the rest at 0 — physics slots warm up on next train().
      eng.welfordMean.set(state.welford.mean);
      eng.welfordM2.set(state.welford.M2);
    }
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

  /**
   * U-NN-FEAT02: Welford online mean/variance update for numeric features.
   * Welford (1962): single-pass numerically-stable algorithm for streaming
   * variance. Each call processes one sample's NUMERIC_KEYS values and
   * updates running mean and M2 (sum of squared deviations from mean).
   *
   * Variance is computed on-demand as M2/count (population variance) inside
   * featurize. We use population (not sample) because the network observes
   * the entire training set, not a sample of it.
   *
   * Reference: B.P. Welford, "Note on a method for calculating corrected
   * sums of squares and products", Technometrics 4(3):419-420, 1962.
   */
  private welfordUpdate(record: OutcomeRecord): void {
    const reqAny = record.request_summary as Record<string, unknown>;
    this.welfordCount++;
    const n = this.welfordCount;

    // Slots 0..NUMERIC_KEYS_DIM-1: raw numeric features.
    for (let i = 0; i < NUMERIC_KEYS.length; i++) {
      const v = reqAny[NUMERIC_KEYS[i]];
      const x =
        typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : 0;
      const oldMean = this.welfordMean[i];
      const newMean = oldMean + (x - oldMean) / n;
      this.welfordMean[i] = newMean;
      this.welfordM2[i] += (x - oldMean) * (x - newMean);
    }

    // Slots NUMERIC_KEYS_DIM..TOTAL_NUMERIC_DIM-1: physics features.
    // U-NN-FEAT03: extract Kienzle/Taylor/chatter/Ra/thermal and accumulate
    // them through the same Welford machinery. Each physics feature has its
    // own native scale (force in N, life in min, Ra in μm), so individual
    // mean/variance is essential for joint z-scoring.
    const physics = PhysicsFeatureExtractorEngine.extract(record);
    for (let j = 0; j < PHYSICS_FEATURE_DIM; j++) {
      const slot = NUMERIC_KEYS.length + j;
      const x = Number.isFinite(physics[j]) ? physics[j] : 0;
      const oldMean = this.welfordMean[slot];
      const newMean = oldMean + (x - oldMean) / n;
      this.welfordMean[slot] = newMean;
      this.welfordM2[slot] += (x - oldMean) * (x - newMean);
    }
  }

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

    // U-NN-FIX01: Snapshot W2 BEFORE in-place momentum update so the hidden-layer
    // gradient (which needs the FORWARD-pass W2) reads the pre-update weights, not
    // the post-update weights. The previous order computed dHiddenPre against the
    // already-updated W2 — biased gradient descent.
    const W2Snapshot = new Float64Array(this.W2);

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
    // Use the W2 snapshot — the forward-pass weights, not the just-updated ones.
    const dHiddenPre = new Float64Array(HIDDEN_DIM);
    for (let h = 0; h < HIDDEN_DIM; h++) {
      let s = 0;
      for (let o = 0; o < OUTPUT_DIM; o++) {
        s += W2Snapshot[o * HIDDEN_DIM + h] * dLogits[o];
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

  /**
   * U-CN11 (refactor of U-NN-FIX04): forward + backward over the batch, accumulating
   * the SUMMED (not yet averaged) gradients. No state mutation — reads the current
   * weights, returns fresh accumulator arrays. Extracted so EWC consolidation can
   * compute per-sample gradients (the Fisher diagonal) without applying any update.
   *
   * Layout: gW2 [OUTPUT_DIM·HIDDEN_DIM], gb2 [OUTPUT_DIM], gW1 [HIDDEN_DIM·INPUT_DIM],
   * gb1 [HIDDEN_DIM] — same shapes as the weight arrays. Standard chain rule with a
   * W2 snapshot (U-NN-FIX01) so the hidden-layer gradient reads the forward-pass weights.
   */
  private accumulateGradients(
    batch: Array<{ x: Float64Array; y: number }>,
  ): { gW1: Float64Array; gb1: Float64Array; gW2: Float64Array; gb2: Float64Array } {
    // Snapshot W2 ONCE (constant during accumulation — no updates happen here).
    const W2Snapshot = new Float64Array(this.W2);
    const gW2 = new Float64Array(OUTPUT_DIM * HIDDEN_DIM);
    const gb2 = new Float64Array(OUTPUT_DIM);
    const gW1 = new Float64Array(HIDDEN_DIM * INPUT_DIM);
    const gb1 = new Float64Array(HIDDEN_DIM);

    for (let s = 0; s < batch.length; s++) {
      const { x, y } = batch[s];
      const { hidden, probs } = this.forward(x);

      // dL/dlogits = probs - one_hot(y).
      const dLogits = new Float64Array(OUTPUT_DIM);
      for (let o = 0; o < OUTPUT_DIM; o++) {
        dLogits[o] = probs[o] - (o === y ? 1 : 0);
      }

      // Output-layer gradients.
      for (let o = 0; o < OUTPUT_DIM; o++) {
        const rowOff = o * HIDDEN_DIM;
        for (let h = 0; h < HIDDEN_DIM; h++) {
          gW2[rowOff + h] += dLogits[o] * hidden[h];
        }
        gb2[o] += dLogits[o];
      }

      // Hidden-layer gradients (using the W2 snapshot, not the accumulator).
      const dHiddenPre = new Float64Array(HIDDEN_DIM);
      for (let h = 0; h < HIDDEN_DIM; h++) {
        let sum = 0;
        for (let o = 0; o < OUTPUT_DIM; o++) {
          sum += W2Snapshot[o * HIDDEN_DIM + h] * dLogits[o];
        }
        dHiddenPre[h] = (1 - hidden[h] * hidden[h]) * sum;
      }

      // Input-layer gradients.
      for (let h = 0; h < HIDDEN_DIM; h++) {
        const rowOff = h * INPUT_DIM;
        for (let i = 0; i < INPUT_DIM; i++) {
          gW1[rowOff + i] += dHiddenPre[h] * x[i];
        }
        gb1[h] += dHiddenPre[h];
      }
    }
    return { gW1, gb1, gW2, gb2 };
  }

  /**
   * U-NN-FIX04 / U-CN11: TRUE minibatch SGD step. Accumulate gradients across the
   * batch (accumulateGradients), then apply ONE momentum update with the AVERAGED
   * data gradient — plus, when EWC is armed (consolidateCurrentTask() / a train({ewc})
   * pass / enableAutoTrain({ewcLambda})), the diagonal EWC penalty gradient
   * λ·max(F_i,0)·(θ_i−θ*_i) (Kirkpatrick et al. 2017). For batch_size=1 with EWC off
   * this is mathematically equivalent to stepOne (online SGD); the apply order over
   * parameters changed (W2 block, then b2, then W1, then b1 — matching getFlatWeights)
   * but parameter updates are independent so the result is unchanged.
   */
  private stepBatch(batch: Array<{ x: Float64Array; y: number }>): void {
    const B = batch.length;
    if (B === 0) return;

    const { gW1, gb1, gW2, gb2 } = this.accumulateGradients(batch);

    const lr = this.config.learningRate;
    const mom = this.config.momentum;
    const invB = 1 / B;

    // U-CN11: EWC penalty gradient over the flat parameter vector ([W2, b2, W1, b1]),
    // computed once per batch against the CURRENT weights. regLoss returns
    // gradient[i] = λ·max(F_i,0)·(θ_i−θ*_i). On any failure (shape/non-finite/!ok) we
    // skip the penalty for this step rather than corrupt the update.
    let ewcGrad: number[] | null = null;
    if (this.ewcEnabled && this.ewcLambda > 0 && this.ewcAnchor !== null && this.ewcFisher !== null) {
      const r = CrossProcessEWCMemoryPreservationEngine.regLoss({
        newWeights: this.getFlatWeights(),
        oldWeights: this.ewcAnchor,
        fisher: this.ewcFisher,
        lambda: this.ewcLambda,
      });
      if (r.ok && r.result.gradient.length === FLAT_PARAM_DIM) ewcGrad = r.result.gradient;
    }
    // Flat-index cursor — MUST walk [W2, b2, W1, b1] in the same order as getFlatWeights().
    let fi = 0;

    for (let o = 0; o < OUTPUT_DIM; o++) {
      const rowOff = o * HIDDEN_DIM;
      for (let h = 0; h < HIDDEN_DIM; h++, fi++) {
        let grad = gW2[rowOff + h] * invB;
        if (ewcGrad) grad += ewcGrad[fi];
        this.vW2[rowOff + h] = mom * this.vW2[rowOff + h] - lr * grad;
        this.W2[rowOff + h] += this.vW2[rowOff + h];
      }
    }
    for (let o = 0; o < OUTPUT_DIM; o++, fi++) {
      let grad = gb2[o] * invB;
      if (ewcGrad) grad += ewcGrad[fi];
      this.vb2[o] = mom * this.vb2[o] - lr * grad;
      this.b2[o] += this.vb2[o];
    }
    for (let h = 0; h < HIDDEN_DIM; h++) {
      const rowOff = h * INPUT_DIM;
      for (let i = 0; i < INPUT_DIM; i++, fi++) {
        let grad = gW1[rowOff + i] * invB;
        if (ewcGrad) grad += ewcGrad[fi];
        this.vW1[rowOff + i] = mom * this.vW1[rowOff + i] - lr * grad;
        this.W1[rowOff + i] += this.vW1[rowOff + i];
      }
    }
    for (let h = 0; h < HIDDEN_DIM; h++, fi++) {
      let grad = gb1[h] * invB;
      if (ewcGrad) grad += ewcGrad[fi];
      this.vb1[h] = mom * this.vb1[h] - lr * grad;
      this.b1[h] += this.vb1[h];
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // U-CN11: EWC (Elastic Weight Consolidation) — flat-parameter views + helpers
  // ──────────────────────────────────────────────────────────────────────────

  /** Flatten the weights into one vector, layout [W2, b2, W1, b1] (length FLAT_PARAM_DIM). */
  private getFlatWeights(): number[] {
    const out = new Array<number>(FLAT_PARAM_DIM);
    let k = 0;
    for (let i = 0; i < this.W2.length; i++) out[k++] = this.W2[i];
    for (let i = 0; i < this.b2.length; i++) out[k++] = this.b2[i];
    for (let i = 0; i < this.W1.length; i++) out[k++] = this.W1[i];
    for (let i = 0; i < this.b1.length; i++) out[k++] = this.b1[i];
    return out;
  }

  /** Flatten an accumulateGradients() result into one vector, same [W2, b2, W1, b1] layout. */
  private flattenGrads(g: { gW1: Float64Array; gb1: Float64Array; gW2: Float64Array; gb2: Float64Array }): number[] {
    const out = new Array<number>(FLAT_PARAM_DIM);
    let k = 0;
    for (let i = 0; i < g.gW2.length; i++) out[k++] = g.gW2[i];
    for (let i = 0; i < g.gb2.length; i++) out[k++] = g.gb2[i];
    for (let i = 0; i < g.gW1.length; i++) out[k++] = g.gW1[i];
    for (let i = 0; i < g.gb1.length; i++) out[k++] = g.gb1[i];
    return out;
  }

  /**
   * Consolidate already-featurized samples as an EWC task: per-sample flat gradients →
   * diagonal Fisher (CrossProcessEWCMemoryPreservationEngine.computeFisher) → merge into
   * the running Fisher (Schwarz EMA, `decay`) → snapshot the converged weights as the new
   * anchor → arm/disarm the penalty (`lambda` ≤ 0 ⇒ disarm but keep anchor/Fisher).
   * Returns null if there are no samples or the EWC math rejects the input.
   */
  private consolidateFromSamples(
    samples: Array<{ x: Float64Array; y: number }>,
    lambda: number,
    decay: number,
  ): { numSamples: number; meanFisher: number; reliable: boolean; lambda: number } | null {
    if (samples.length === 0) return null;
    const gradientSamples: number[][] = samples.map((s) => this.flattenGrads(this.accumulateGradients([s])));
    const fisherR = CrossProcessEWCMemoryPreservationEngine.computeFisher({ gradientSamples });
    if (!fisherR.ok) return null;
    const consolidated = CrossProcessEWCMemoryPreservationEngine.consolidate({ newFisher: fisherR.result.fisher, decay });
    if (!consolidated.ok) return null;
    this.ewcFisher = consolidated.fisher;
    this.ewcAnchor = this.getFlatWeights();
    this.ewcLambda = lambda;
    this.ewcDecay = decay;
    this.ewcEnabled = lambda > 0;
    return { numSamples: fisherR.result.numSamples, meanFisher: fisherR.result.meanFisher, reliable: fisherR.result.reliable, lambda };
  }

  /**
   * Public EWC consolidation from raw OutcomeRecords (for manual / dispatcher use).
   * Featurizes each labelable record with the CURRENT z-score statistics (does NOT update
   * Welford — call train() first if you want the model fitted to these records), then
   * delegates to consolidateFromSamples. `lambda` clamped to [0, 1e6] (default 1.0);
   * `decay` clamped to [0, 1] (default 0.9). Returns `{ok:false}` with a reason on failure.
   */
  consolidateCurrentTask(
    records: readonly OutcomeRecord[],
    opts: { lambda?: number; decay?: number } = {},
  ):
    | { ok: true; numSamples: number; meanFisher: number; reliable: boolean; lambda: number }
    | { ok: false; reason: string } {
    const lambda = clamp(Number.isFinite(opts.lambda) ? (opts.lambda as number) : DEFAULT_EWC_LAMBDA, 0, 1_000_000);
    const decay = clamp(Number.isFinite(opts.decay) ? (opts.decay as number) : DEFAULT_EWC_DECAY, 0, 1);
    const samples: Array<{ x: Float64Array; y: number }> = [];
    for (const r of records) {
      const y = this.recordToLabel(r);
      if (y === null) continue;
      samples.push({ x: this.featurize(r), y });
    }
    if (samples.length === 0) return { ok: false, reason: "no_labelable_samples" };
    const res = this.consolidateFromSamples(samples, lambda, decay);
    if (!res) return { ok: false, reason: "ewc_math_rejected_input" };
    return { ok: true, ...res };
  }

  /** Disarm EWC and forget the anchor/Fisher (also resets the shared running-Fisher state). */
  clearEWC(): void {
    this.ewcEnabled = false;
    this.ewcLambda = 0;
    this.ewcDecay = DEFAULT_EWC_DECAY;
    this.ewcAnchor = null;
    this.ewcFisher = null;
    CrossProcessEWCMemoryPreservationEngine.reset();
  }

  /** Snapshot of the EWC state. `fisherDim` 0 / `anchored` false ⇒ never consolidated. */
  ewcStatus(): { enabled: boolean; lambda: number; decay: number; anchored: boolean; fisherDim: number; autoTrainLambda: number } {
    return {
      enabled: this.ewcEnabled,
      lambda: this.ewcLambda,
      decay: this.ewcDecay,
      anchored: this.ewcAnchor !== null,
      fisherDim: this.ewcFisher?.length ?? 0,
      autoTrainLambda: this.autoTrainEwcLambda,
    };
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

  /**
   * U-NN-FIX03 helper: argmax-correctness count under the CURRENT frozen weights.
   * Used for honest post-training accuracy reporting (vs the prior in-loop tally
   * that scored each sample on the weights BEFORE its own update).
   */
  private computeCorrectCount(samples: Array<{ x: Float64Array; y: number }>): number {
    let correct = 0;
    for (const { x, y } of samples) {
      const { probs } = this.forward(x);
      let argmax = 0;
      let max = probs[0];
      for (let o = 1; o < OUTPUT_DIM; o++) {
        if (probs[o] > max) { max = probs[o]; argmax = o; }
      }
      if (argmax === y) correct++;
    }
    return correct;
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

/** Clamp x into [lo, hi]. */
function clamp(x: number, lo: number, hi: number): number {
  if (x < lo) return lo;
  if (x > hi) return hi;
  return x;
}

/**
 * Stable string hash (djb2-derived) into [0, modulus). Exported for
 * collision-audit tests (U-NN-FEAT01).
 */
export function hashStringMod(s: string | undefined, modulus: number): number {
  if (!s) return -1;
  let h = 5381;
  const lower = s.toLowerCase();
  for (let i = 0; i < lower.length; i++) {
    h = (h * 33) ^ lower.charCodeAt(i);
  }
  return ((h >>> 0) % modulus);
}

// U-NN-LOOP03 — AUTO-TRAIN SUBSCRIPTION HOOKS

export interface AutoTrainOptions {
  threshold?: number;
  trainOpts?: TrainOpts;
  /**
   * U-CN10: experience-replay mixing. For each retrain, also pull up to
   * `ceil(buffer.length * replayMixRatio)` historical terminal records from
   * CrossProcessOutcomeStore (stratified by process, deduped against the
   * current buffer) and concat them into the training batch. 0 disables
   * (default). Clamped to [0, 100].
   */
  replayMixRatio?: number;
  /** U-CN10: hard cap on historical records pulled per retrain. Default 256. Clamped to [0, 100000]. */
  replayMaxRecords?: number;
  /**
   * U-CN11: EWC penalty strength λ for the retrain. When > 0, each retrain also
   * consolidates the just-trained samples as an EWC task (Fisher diagonal → running
   * Fisher → new anchor) and the next retrain's updates carry the diagonal penalty
   * λ·F_i·(θ_i−θ*_i). 0 disables (default for direct callers and the boot path — EWC
   * is the riskiest forgetting mitigation and wants operator tuning). Clamped [0, 1e6].
   */
  ewcLambda?: number;
  /** U-CN11: Schwarz-EMA decay for the running Fisher (F_run ← decay·F_run + (1−decay)·F_task). Default 0.9. Clamped [0,1]. */
  ewcDecay?: number;
}

export interface AutoTrainStatus {
  active: boolean;
  threshold: number;
  bufferedSamples: number;
  totalTicks: number;
  totalSamplesSeen: number;
  lastLoss: number;
  lastAccuracy: number;
  /** U-CN10: effective experience-replay mix ratio (0 = off). */
  replayMixRatio: number;
  /** U-CN10: effective hard cap on historical records pulled per retrain. */
  replayMaxRecords: number;
  /** U-CN11: effective EWC penalty strength λ forwarded into the retrain (0 = off). */
  ewcLambda: number;
}

declare module "./CrossProcessNeuralLearningEngine.js" {
  interface CrossProcessNeuralLearningEngine {
    enableAutoTrain(opts?: AutoTrainOptions): SubscriptionHandle;
    disableAutoTrain(): boolean;
    autoTrainStatus(): AutoTrainStatus;
    flushAutoTrainBuffer(): TrainResult | null;
  }
}

// U-CN10 — replay-mixing helper. Given the FIFO auto-train buffer, return it
// plus a stratified-by-process sample of historical terminal records from the
// outcome store (deduped against the buffer). Pure aside from the store read;
// returns the buffer unchanged when mixing is off, the buffer is empty, or the
// store has nothing new to offer.
const REPLAY_PROCESSES: readonly OutcomeProcess[] = ["mill", "lathe", "wedm"];

function buildReplayMixedBatch(
  buffer: readonly OutcomeRecord[],
  mixRatio: number,
  maxRecords: number,
): { batch: OutcomeRecord[]; replayMixed: number } {
  if (mixRatio <= 0 || buffer.length === 0) {
    return { batch: buffer.slice(), replayMixed: 0 };
  }
  const want = Math.min(Math.max(0, Math.floor(maxRecords)), Math.ceil(buffer.length * mixRatio));
  if (want <= 0) {
    return { batch: buffer.slice(), replayMixed: 0 };
  }
  const seen = new Set<string>(buffer.map((r) => r.id));
  const sampled: OutcomeRecord[] = [];
  const isUsableTerminal = (r: OutcomeRecord): boolean =>
    !!r.outcome?.kind && r.outcome.kind !== "pending" && typeof r.id === "string" && !seen.has(r.id);
  const takeFrom = (recs: readonly OutcomeRecord[], cap: number): void => {
    for (const r of recs) {
      if (sampled.length >= cap) break;
      if (!isUsableTerminal(r)) continue;
      sampled.push(r);
      seen.add(r.id);
    }
  };
  // Stratified pass: pull a recency-windowed slice per process, round-robin.
  const perProc = Math.max(1, Math.ceil(want / REPLAY_PROCESSES.length));
  for (const p of REPLAY_PROCESSES) {
    if (sampled.length >= want) break;
    let recs: OutcomeRecord[];
    try {
      recs = crossProcessOutcomeStore.query({ process: p, limit: perProc * 5 });
    } catch {
      recs = [];
    }
    takeFrom(recs, Math.min(want, sampled.length + perProc));
  }
  // Top-up pass: if some processes were empty, fill the remainder from a global window.
  if (sampled.length < want) {
    let more: OutcomeRecord[];
    try {
      more = crossProcessOutcomeStore.query({ limit: want * 5 });
    } catch {
      more = [];
    }
    takeFrom(more, want);
  }
  if (sampled.length === 0) {
    return { batch: buffer.slice(), replayMixed: 0 };
  }
  return { batch: [...buffer, ...sampled], replayMixed: sampled.length };
}

CrossProcessNeuralLearningEngine.prototype.enableAutoTrain = function (
  this: CrossProcessNeuralLearningEngine,
  opts: AutoTrainOptions = {},
): SubscriptionHandle {
  // @ts-expect-error private
  if (this.autoTrainHandle !== null) {
    throw new Error("CrossProcessNeuralLearningEngine.enableAutoTrain: already active. Call disableAutoTrain() before re-enabling.");
  }
  const threshold = Math.max(1, opts.threshold ?? 16);
  // @ts-expect-error private
  this.autoTrainThreshold = threshold;
  // @ts-expect-error private
  this.autoTrainBuffer = [];
  // U-CN10: clamp + persist the replay-mixing config (0 disables; default off).
  // @ts-expect-error private
  this.autoTrainReplayMixRatio = clamp(Number.isFinite(opts.replayMixRatio) ? (opts.replayMixRatio as number) : 0, 0, 100);
  // @ts-expect-error private
  this.autoTrainReplayMaxRecords = Math.floor(clamp(Number.isFinite(opts.replayMaxRecords) ? (opts.replayMaxRecords as number) : 256, 0, 100_000));
  // U-CN11: clamp + persist the EWC config (lambda 0 disables; default off).
  // @ts-expect-error private
  this.autoTrainEwcLambda = clamp(Number.isFinite(opts.ewcLambda) ? (opts.ewcLambda as number) : 0, 0, 1_000_000);
  // @ts-expect-error private
  this.autoTrainEwcDecay = clamp(Number.isFinite(opts.ewcDecay) ? (opts.ewcDecay as number) : DEFAULT_EWC_DECAY, 0, 1);
  const trainOpts = opts.trainOpts;
  const handle = feedbackBusEngine.subscribe("outcome.recorded", (event: FeedbackEvent) => {
    const payload = event.payload as { record?: OutcomeRecord } | undefined;
    const record = payload?.record;
    if (!record) return;
    if (this.recordToLabel(record) === null) return;
    // @ts-expect-error private
    this.autoTrainBuffer.push(record);
    // @ts-expect-error private
    if (this.autoTrainBuffer.length >= this.autoTrainThreshold) {
      // @ts-expect-error private
      const fifoBatch: OutcomeRecord[] = this.autoTrainBuffer;
      // @ts-expect-error private
      this.autoTrainBuffer = [];
      // @ts-expect-error private
      const { batch, replayMixed } = buildReplayMixedBatch(fifoBatch, this.autoTrainReplayMixRatio, this.autoTrainReplayMaxRecords);
      // @ts-expect-error private
      const ewcL = this.autoTrainEwcLambda as number;
      // @ts-expect-error private
      const ewcD = this.autoTrainEwcDecay as number;
      const effOpts: TrainOpts = { ...(trainOpts ?? {}), ...(ewcL > 0 ? { ewc: { lambda: ewcL, decay: ewcD } } : {}) };
      const result = this.train(batch, effOpts);
      // @ts-expect-error private
      this.autoTrainTotalTicks += 1;
      feedbackBusEngine.publish("neural.train.tick", {
        // @ts-expect-error private
        tick: this.autoTrainTotalTicks,
        samplesUsed: result.samplesUsed,
        samplesSkipped: result.samplesSkipped,
        replayMixed,
        ewcConsolidated: result.ewcConsolidated ?? null,
        finalLoss: result.finalLoss,
        trainAccuracy: result.trainAccuracy,
        // @ts-expect-error private
        totalSamplesSeen: this.totalSamplesSeen,
      });
    }
  });
  // @ts-expect-error private
  this.autoTrainHandle = handle;
  return handle;
};

CrossProcessNeuralLearningEngine.prototype.disableAutoTrain = function (
  this: CrossProcessNeuralLearningEngine,
): boolean {
  // @ts-expect-error private
  const handle = this.autoTrainHandle;
  if (handle === null) return false;
  feedbackBusEngine.unsubscribe(handle);
  // @ts-expect-error private
  this.autoTrainHandle = null;
  // @ts-expect-error private
  this.autoTrainBuffer = [];
  // U-CN11: the auto-train EWC *config* is per-session; the EWC *state* (anchor/Fisher)
  // persists across disable/enable — only clearEWC() forgets that.
  // @ts-expect-error private
  this.autoTrainEwcLambda = 0;
  // @ts-expect-error private
  this.autoTrainEwcDecay = DEFAULT_EWC_DECAY;
  return true;
};

CrossProcessNeuralLearningEngine.prototype.autoTrainStatus = function (
  this: CrossProcessNeuralLearningEngine,
): AutoTrainStatus {
  return {
    // @ts-expect-error private
    active: this.autoTrainHandle !== null,
    // @ts-expect-error private
    threshold: this.autoTrainThreshold,
    // @ts-expect-error private
    bufferedSamples: this.autoTrainBuffer.length,
    // @ts-expect-error private
    totalTicks: this.autoTrainTotalTicks,
    // @ts-expect-error private
    totalSamplesSeen: this.totalSamplesSeen,
    // @ts-expect-error private
    lastLoss: this.lastLoss,
    // @ts-expect-error private
    lastAccuracy: this.lastAccuracy,
    // @ts-expect-error private
    replayMixRatio: this.autoTrainReplayMixRatio,
    // @ts-expect-error private
    replayMaxRecords: this.autoTrainReplayMaxRecords,
    // @ts-expect-error private
    ewcLambda: this.autoTrainEwcLambda,
  };
};

CrossProcessNeuralLearningEngine.prototype.flushAutoTrainBuffer = function (
  this: CrossProcessNeuralLearningEngine,
): TrainResult | null {
  // @ts-expect-error private
  const buf: OutcomeRecord[] = this.autoTrainBuffer;
  if (buf.length === 0) return null;
  // @ts-expect-error private
  this.autoTrainBuffer = [];
  // @ts-expect-error private
  const { batch, replayMixed } = buildReplayMixedBatch(buf, this.autoTrainReplayMixRatio, this.autoTrainReplayMaxRecords);
  // @ts-expect-error private
  const ewcL = this.autoTrainEwcLambda as number;
  // @ts-expect-error private
  const ewcD = this.autoTrainEwcDecay as number;
  const result = this.train(batch, ewcL > 0 ? { ewc: { lambda: ewcL, decay: ewcD } } : undefined);
  // @ts-expect-error private
  this.autoTrainTotalTicks += 1;
  feedbackBusEngine.publish("neural.train.tick", {
    // @ts-expect-error private
    tick: this.autoTrainTotalTicks,
    samplesUsed: result.samplesUsed,
    samplesSkipped: result.samplesSkipped,
    replayMixed,
    ewcConsolidated: result.ewcConsolidated ?? null,
    finalLoss: result.finalLoss,
    trainAccuracy: result.trainAccuracy,
    // @ts-expect-error private
    totalSamplesSeen: this.totalSamplesSeen,
    forced: true,
  });
  return result;
};

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

// ============================================================================
// U-CN11 — dispatcher convenience wrapper for the EWC controls on the singleton
// (route surface for prism_ai; the auto-train EWC λ itself is set via
// xproc_autofire_activate({autoTrainEwcLambda}). consolidate pulls recent terminal
// outcomes from CrossProcessOutcomeStore, mirroring xproc_rl_bridge_replay.)
// ============================================================================

const DEFAULT_EWC_CONSOLIDATE_LIMIT = 200;
const MAX_EWC_CONSOLIDATE_LIMIT = 100_000;

export function crossProcessNeuralEwcDispatch(action: string, params: Record<string, unknown>): unknown {
  switch (action) {
    case "xproc_neural_ewc_status":
      return {
        ok: true,
        ewc: crossProcessNeuralLearningEngine.ewcStatus(),
        autoTrain: crossProcessNeuralLearningEngine.autoTrainStatus(),
      };
    case "xproc_neural_ewc_clear":
      crossProcessNeuralLearningEngine.clearEWC();
      return { ok: true };
    case "xproc_neural_ewc_consolidate": {
      const limitRaw = (params as { limit?: unknown }).limit;
      const limit = typeof limitRaw === "number" && Number.isFinite(limitRaw) && limitRaw >= 1
        ? Math.min(Math.floor(limitRaw), MAX_EWC_CONSOLIDATE_LIMIT)
        : DEFAULT_EWC_CONSOLIDATE_LIMIT;
      const processRaw = (params as { process?: unknown }).process;
      const process = processRaw === "mill" || processRaw === "lathe" || processRaw === "wedm" ? processRaw : undefined;
      const lambdaRaw = (params as { lambda?: unknown }).lambda;
      const decayRaw = (params as { decay?: unknown }).decay;
      let records: OutcomeRecord[] = [];
      try {
        records = crossProcessOutcomeStore.query({ limit, ...(process ? { process } : {}) });
      } catch {
        records = [];
      }
      const terminal = records.filter((r) => !!r.outcome?.kind && r.outcome.kind !== "pending");
      const res = crossProcessNeuralLearningEngine.consolidateCurrentTask(terminal, {
        ...(typeof lambdaRaw === "number" ? { lambda: lambdaRaw } : {}),
        ...(typeof decayRaw === "number" ? { decay: decayRaw } : {}),
      });
      return { ok: res.ok, scanned: records.length, usable: terminal.length, result: res };
    }
    default:
      throw new Error(`crossProcessNeuralEwcDispatch: unknown action '${action}'`);
  }
}
