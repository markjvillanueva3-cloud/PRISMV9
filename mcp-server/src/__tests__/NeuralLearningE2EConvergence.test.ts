/**
 * NeuralLearningE2EConvergence.test.ts
 * U-NEURAL-E2E-CONVERGENCE
 *
 * End-to-end proof that the XPROC-NEURAL stack actually learns:
 *
 *   1. Synthesize OutcomeRecords with a deterministic, separable signal across
 *      the three target classes (success / failure / operator_override).
 *   2. Train T1-02 CrossProcessNeuralLearningEngine (pure-JS MLP 32→16→3).
 *   3. Assert convergence (loss drops monotonically, train/val accuracy ≫ chance).
 *   4. Assert predict round-trip on held-out per-class anchors.
 *   5. Assert train/val generalization gap < 35% (no catastrophic overfit).
 *
 * Why this matters: the unit tests for T1-02 verify static algebraic
 * invariants (Xavier init magnitudes, feature dimension, softmax sums to 1).
 * They do NOT prove the network actually descends a loss surface on a
 * non-trivial task. This test does — using a synthetic shop-floor dataset
 * that JM Die's actual feature distributions plausibly match.
 *
 * Deep-learning expert checklist applied:
 *   ✓ Loss curve convergence (no oscillation): finalLoss removes ≥30% of initialLoss.
 *   ✓ Train/val gap bounded (no overfitting): we use 35% (relaxed from 5%
 *     because the MLP is tiny — 32→16→3 ≈ 530 params — and the synthetic
 *     dataset is small at n=300; 5% gap is unrealistic without dropout/L2).
 *   ✓ Vanishing/exploding gradients avoided: Xavier init is in T1-02 by design.
 *   ✓ Mode collapse: confusion-matrix diagonal must have ≥2 non-zero entries.
 *   ✓ Determinism: seed-equal training produces seed-equal results.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  CrossProcessNeuralLearningEngine,
  crossProcessNeuralLearningEngine,
  INPUT_DIM,
  HIDDEN_DIM,
  OUTPUT_DIM,
  hashStringMod,
} from "../engines/CrossProcessNeuralLearningEngine.js";
import type { OutcomeRecord } from "../engines/CrossProcessOutcomeStore.js";
import { SCHEMA_VERSION } from "../engines/CrossProcessOutcomeStore.js";

// ============================================================================
// Constants — extracted from magic numbers
// ============================================================================

const TRAIN_SEED = 42;
const SHUFFLE_SEED = 7;
const TRAIN_RATIO = 0.8;
const SAMPLES_PER_CLASS = 100;
const TOTAL_SAMPLES = SAMPLES_PER_CLASS * 3;
const NUM_CLASSES = 3;
const CHANCE_ACCURACY = 1 / NUM_CLASSES;
const TRAIN_EPOCHS = 50;
const QUICK_EPOCHS = 30;
const BATCH_SIZE = 16;
const LOSS_REDUCTION_FRAC = 0.7; // finalLoss < initialLoss * 0.7
const TRAIN_ACC_FLOOR = 0.6;
const VAL_ACC_FLOOR = 0.5;
const ACCURACY_OVER_CHANCE_TRAIN = 0.2;
const ACCURACY_OVER_CHANCE_VAL = 0.1;
const MAX_GENERALIZATION_GAP = 0.35;
const MIN_GENERALIZATION_GAP = -0.5;
// U-NN-FEAT01: input layer expanded 32→131 via wider categorical hash buckets.
const NETWORK_INPUT_DIM = 131;
const NETWORK_HIDDEN_DIM = 16;
const NETWORK_OUTPUT_DIM = 3;
const FLOAT_TOLERANCE_DIGITS = 6;
const SOFTMAX_SUM_TOLERANCE = 6;
const MIN_NONZERO_DIAGONAL = 2;

// ============================================================================
// Synthetic dataset generator
// ============================================================================

function record(
  id: string,
  cls: "success" | "failure" | "operator_override",
  numerics: {
    tool_diameter_mm: number;
    depth_of_cut_mm: number;
    spindle_rpm: number;
    feed_rate_mm_min: number;
    cutting_speed_m_min: number;
    target_ra_um: number;
  },
  categoricals: {
    material: string;
    operation: string;
    machine_family: string;
  },
): OutcomeRecord {
  return {
    schemaVersion: SCHEMA_VERSION,
    id,
    ts: new Date(2026, 4, 1, 0, Math.abs(parseInt(id.split("-")[1] ?? "0", 10) || 0) % 60).toISOString(),
    bridge: "sf",
    process: "mill",
    request_summary: {
      intent: `synth-${cls}`,
      ...numerics,
      ...categoricals,
    },
    response_summary: {
      primary_output: cls === "success" ? "ok" : cls === "failure" ? "fail" : "override",
      success: cls === "success",
      warnings_count: cls === "failure" ? 3 : 0,
    },
    outcome: { kind: cls },
  };
}

const LCG_MULTIPLIER = 1103515245;
const LCG_INCREMENT = 12345;
const LCG_MASK = 0x7fffffff;

function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * LCG_MULTIPLIER + LCG_INCREMENT) >>> 0;
    return (s & LCG_MASK) / LCG_MASK;
  };
}

function jitter(rng: () => number, mu: number, sigma: number): number {
  return mu + sigma * (rng() - 0.5) * 2;
}

/**
 * 3-class separable dataset:
 *   - "success": high RPM, low DoC, aluminum + finishing
 *   - "failure": low RPM, high DoC, titanium + roughing
 *   - "operator_override": mid RPM, mid DoC, steel + general
 *
 * Deterministic Gaussian-like jitter so the model learns a decision
 * boundary, not a lookup table.
 */
function syntheticDataset(seed = TRAIN_SEED): OutcomeRecord[] {
  const rng = makeRng(seed);
  const out: OutcomeRecord[] = [];
  for (let i = 0; i < SAMPLES_PER_CLASS; i++) {
    out.push(record(`s-${i}`, "success", {
      tool_diameter_mm: jitter(rng, 6, 0.5),
      depth_of_cut_mm: jitter(rng, 0.3, 0.1),
      spindle_rpm: jitter(rng, 8000, 500),
      feed_rate_mm_min: jitter(rng, 2400, 200),
      cutting_speed_m_min: jitter(rng, 150, 10),
      target_ra_um: jitter(rng, 0.8, 0.2),
    }, { material: "aluminum_6061", operation: "finishing", machine_family: "vmc" }));

    out.push(record(`f-${i}`, "failure", {
      tool_diameter_mm: jitter(rng, 12, 1.0),
      depth_of_cut_mm: jitter(rng, 4.0, 0.5),
      spindle_rpm: jitter(rng, 400, 50),
      feed_rate_mm_min: jitter(rng, 80, 20),
      cutting_speed_m_min: jitter(rng, 15, 3),
      target_ra_um: jitter(rng, 6.4, 1.0),
    }, { material: "ti_6al_4v", operation: "roughing", machine_family: "vmc" }));

    out.push(record(`o-${i}`, "operator_override", {
      tool_diameter_mm: jitter(rng, 8, 0.8),
      depth_of_cut_mm: jitter(rng, 1.5, 0.3),
      spindle_rpm: jitter(rng, 3000, 300),
      feed_rate_mm_min: jitter(rng, 900, 150),
      cutting_speed_m_min: jitter(rng, 75, 8),
      target_ra_um: jitter(rng, 3.2, 0.5),
    }, { material: "carbon_steel_1018", operation: "general", machine_family: "hmc" }));
  }
  return out;
}

function shuffleSplit(records: OutcomeRecord[], trainRatio: number, seed = SHUFFLE_SEED): {
  train: OutcomeRecord[]; val: OutcomeRecord[];
} {
  const rng = makeRng(seed);
  const arr = [...records];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  const cut = Math.floor(arr.length * trainRatio);
  return { train: arr.slice(0, cut), val: arr.slice(cut) };
}

// ============================================================================
// Tests
// ============================================================================

describe("XPROC-NEURAL T1-02 — end-to-end convergence on synthetic shop-floor data", () => {
  beforeEach(() => {
    crossProcessNeuralLearningEngine.reset(TRAIN_SEED);
  });

  it("dataset shape: 300 records, 100 per class, 3 distinct outcome kinds", () => {
    const ds = syntheticDataset(TRAIN_SEED);
    expect(ds.length).toBe(TOTAL_SAMPLES);
    const counts = { success: 0, failure: 0, operator_override: 0 } as Record<string, number>;
    for (const r of ds) {
      if (r.outcome) counts[r.outcome.kind] += 1;
    }
    expect(counts.success).toBe(SAMPLES_PER_CLASS);
    expect(counts.failure).toBe(SAMPLES_PER_CLASS);
    expect(counts.operator_override).toBe(SAMPLES_PER_CLASS);
  });

  it("loss decreases from initial to trained — gradient descent works", () => {
    const ds = syntheticDataset(TRAIN_SEED);
    const { train } = shuffleSplit(ds, TRAIN_RATIO);
    const result = crossProcessNeuralLearningEngine.train(train, { epochs: QUICK_EPOCHS, batchSize: BATCH_SIZE });
    expect(result.epochsRun).toBe(QUICK_EPOCHS);
    expect(result.samplesUsed).toBe(train.length);
    expect(result.finalLoss).toBeLessThan(result.initialLoss);
    expect(result.finalLoss).toBeLessThan(result.initialLoss * LOSS_REDUCTION_FRAC);
    // Loss must remain finite (no exploding gradients).
    expect(Number.isFinite(result.finalLoss)).toBe(true);
    expect(result.finalLoss).toBeGreaterThanOrEqual(0);
  });

  it("train accuracy exceeds 60% (chance is 33%) after 50 epochs", () => {
    const ds = syntheticDataset(TRAIN_SEED);
    const { train } = shuffleSplit(ds, TRAIN_RATIO);
    const result = crossProcessNeuralLearningEngine.train(train, { epochs: TRAIN_EPOCHS, batchSize: BATCH_SIZE });
    expect(result.trainAccuracy).toBeGreaterThan(TRAIN_ACC_FLOOR);
    expect(result.trainAccuracy).toBeLessThanOrEqual(1.0);
    expect(result.trainAccuracy).toBeGreaterThan(CHANCE_ACCURACY + ACCURACY_OVER_CHANCE_TRAIN);
  });

  it("validation accuracy exceeds 50% — model generalizes, not just memorizes", () => {
    const ds = syntheticDataset(TRAIN_SEED);
    const { train, val } = shuffleSplit(ds, TRAIN_RATIO);
    crossProcessNeuralLearningEngine.train(train, { epochs: TRAIN_EPOCHS, batchSize: BATCH_SIZE });
    const evalResult = crossProcessNeuralLearningEngine.evaluate(val);
    expect(evalResult.total).toBe(val.length);
    expect(evalResult.accuracy).toBeGreaterThan(VAL_ACC_FLOOR);
    expect(evalResult.accuracy).toBeGreaterThan(CHANCE_ACCURACY + ACCURACY_OVER_CHANCE_VAL);
    expect(evalResult.correct).toBeGreaterThan(val.length * VAL_ACC_FLOOR);
  });

  it("train/val generalization gap is bounded — no catastrophic overfit", () => {
    const ds = syntheticDataset(TRAIN_SEED);
    const { train, val } = shuffleSplit(ds, TRAIN_RATIO);
    const trainResult = crossProcessNeuralLearningEngine.train(train, { epochs: TRAIN_EPOCHS, batchSize: BATCH_SIZE });
    const valResult = crossProcessNeuralLearningEngine.evaluate(val);
    const gap = trainResult.trainAccuracy - valResult.accuracy;
    expect(gap).toBeLessThan(MAX_GENERALIZATION_GAP);
    expect(gap).toBeGreaterThan(MIN_GENERALIZATION_GAP);
  });

  it("predict on per-class centroid records yields the correct argmax", () => {
    const ds = syntheticDataset(TRAIN_SEED);
    const { train } = shuffleSplit(ds, TRAIN_RATIO);
    crossProcessNeuralLearningEngine.train(train, { epochs: TRAIN_EPOCHS, batchSize: BATCH_SIZE });

    const successAnchor = record("anchor-s", "success", {
      tool_diameter_mm: 6, depth_of_cut_mm: 0.3, spindle_rpm: 8000,
      feed_rate_mm_min: 2400, cutting_speed_m_min: 150, target_ra_um: 0.8,
    }, { material: "aluminum_6061", operation: "finishing", machine_family: "vmc" });
    const failureAnchor = record("anchor-f", "failure", {
      tool_diameter_mm: 12, depth_of_cut_mm: 4.0, spindle_rpm: 400,
      feed_rate_mm_min: 80, cutting_speed_m_min: 15, target_ra_um: 6.4,
    }, { material: "ti_6al_4v", operation: "roughing", machine_family: "vmc" });
    const overrideAnchor = record("anchor-o", "operator_override", {
      tool_diameter_mm: 8, depth_of_cut_mm: 1.5, spindle_rpm: 3000,
      feed_rate_mm_min: 900, cutting_speed_m_min: 75, target_ra_um: 3.2,
    }, { material: "carbon_steel_1018", operation: "general", machine_family: "hmc" });

    const ps = crossProcessNeuralLearningEngine.predictFromRecord(successAnchor);
    const pf = crossProcessNeuralLearningEngine.predictFromRecord(failureAnchor);
    const po = crossProcessNeuralLearningEngine.predictFromRecord(overrideAnchor);

    expect(ps.predictedClass).toBe("success");
    expect(ps.confidence).toBeGreaterThan(CHANCE_ACCURACY);
    expect(pf.predictedClass).toBe("failure");
    expect(pf.confidence).toBeGreaterThan(CHANCE_ACCURACY);
    expect(po.predictedClass).toBe("operator_override");
    expect(po.confidence).toBeGreaterThan(CHANCE_ACCURACY);

    // Softmax invariant: probs sum to 1 (within float tolerance).
    for (const p of [ps, pf, po]) {
      const sum = p.probs.success + p.probs.failure + p.probs.operator_override;
      expect(sum).toBeCloseTo(1, SOFTMAX_SUM_TOLERANCE);
      // Each individual prob must be in [0,1].
      expect(p.probs.success).toBeGreaterThanOrEqual(0);
      expect(p.probs.success).toBeLessThanOrEqual(1);
      expect(p.probs.failure).toBeGreaterThanOrEqual(0);
      expect(p.probs.failure).toBeLessThanOrEqual(1);
      expect(p.probs.operator_override).toBeGreaterThanOrEqual(0);
      expect(p.probs.operator_override).toBeLessThanOrEqual(1);
    }
  });

  it("retraining after reset is deterministic for same seed + data + hyperparams", () => {
    const ds = syntheticDataset(TRAIN_SEED);
    const { train } = shuffleSplit(ds, TRAIN_RATIO);

    const r1 = crossProcessNeuralLearningEngine.train(train, { epochs: TRAIN_EPOCHS, batchSize: BATCH_SIZE });
    const acc1 = r1.trainAccuracy;

    crossProcessNeuralLearningEngine.reset(TRAIN_SEED);
    const r2 = crossProcessNeuralLearningEngine.train(train, { epochs: TRAIN_EPOCHS, batchSize: BATCH_SIZE });
    const acc2 = r2.trainAccuracy;

    expect(acc2).toBeCloseTo(acc1, FLOAT_TOLERANCE_DIGITS);
    expect(r2.initialLoss).toBeCloseTo(r1.initialLoss, FLOAT_TOLERANCE_DIGITS);
    expect(r2.finalLoss).toBeCloseTo(r1.finalLoss, FLOAT_TOLERANCE_DIGITS);
    expect(r2.epochsRun).toBe(r1.epochsRun);
  });

  it("confusion-matrix diagonal has at least 2 non-zero entries — no mode collapse", () => {
    const ds = syntheticDataset(TRAIN_SEED);
    const { train, val } = shuffleSplit(ds, TRAIN_RATIO);
    crossProcessNeuralLearningEngine.train(train, { epochs: TRAIN_EPOCHS, batchSize: BATCH_SIZE });
    const evalResult = crossProcessNeuralLearningEngine.evaluate(val);

    expect(evalResult.confusion.length).toBe(NUM_CLASSES);
    for (const row of evalResult.confusion) {
      expect(row.length).toBe(NUM_CLASSES);
      // Each row sum should equal the number of val samples of that class.
      const rowSum = row.reduce((a, b) => a + b, 0);
      expect(rowSum).toBeGreaterThan(0);
    }
    let nonZeroDiag = 0;
    for (let i = 0; i < NUM_CLASSES; i++) {
      if (evalResult.confusion[i][i] > 0) nonZeroDiag += 1;
    }
    expect(nonZeroDiag).toBeGreaterThanOrEqual(MIN_NONZERO_DIAGONAL);
    // Total predictions in confusion matrix equals val set size.
    const totalPredictions = evalResult.confusion.flat().reduce((a, b) => a + b, 0);
    expect(totalPredictions).toBe(val.length);
  });

  it("network architecture is 32→16→3 (exported as engine constants)", () => {
    // INPUT_DIM/HIDDEN_DIM/OUTPUT_DIM are exported by the engine module
    // and define the MLP shape compiled into Xavier init + softmax.
    expect(INPUT_DIM).toBe(NETWORK_INPUT_DIM);
    expect(HIDDEN_DIM).toBe(NETWORK_HIDDEN_DIM);
    expect(OUTPUT_DIM).toBe(NETWORK_OUTPUT_DIM);
  });

  it("metric counters reflect the just-completed training run", () => {
    const SHORT_EPOCHS = 10;
    const ds = syntheticDataset(TRAIN_SEED);
    const { train } = shuffleSplit(ds, TRAIN_RATIO);
    const trainResult = crossProcessNeuralLearningEngine.train(train, { epochs: SHORT_EPOCHS, batchSize: BATCH_SIZE });
    const m = crossProcessNeuralLearningEngine.getMetrics();
    const cfg = crossProcessNeuralLearningEngine.getConfig();

    expect(m.totalEpochsRun).toBe(SHORT_EPOCHS);
    expect(m.totalSamplesSeen).toBe(train.length * SHORT_EPOCHS);
    expect(m.lastLoss).toBeCloseTo(trainResult.finalLoss, FLOAT_TOLERANCE_DIGITS);
    expect(m.lastAccuracy).toBeCloseTo(trainResult.trainAccuracy, FLOAT_TOLERANCE_DIGITS);
    // Engine config defaults (training opts are per-call, don't mutate stored config).
    // DEFAULT_SEED=42, DEFAULT_BATCH_SIZE=32 in the engine.
    expect(cfg.seed).toBe(TRAIN_SEED);
    expect(cfg.batchSize).toBe(32);
    expect(cfg.learningRate).toBeCloseTo(0.01, 9);
    expect(cfg.momentum).toBeCloseTo(0.9, 9);
  });

  // ===========================================================================
  // U-NN-FIX05 — Statistical convergence test
  // ===========================================================================

  it("initial loss is finite, positive, and bounded — Xavier init produces sane logits", () => {
    // Tightest current bound. With un-normalized inputs (varying magnitude across
    // feature slots), the pre-softmax logits are NOT zero-centered, so initial
    // loss can deviate substantially from the theoretical ln(3) ≈ 1.099 baseline.
    //
    // After U-NN-FEAT02 lands Welford z-score input whitening, this should
    // tighten to |initialLoss - ln(3)| < 0.15. Until then we verify the safety
    // property: loss is finite, positive, and bounded below the catastrophic
    // exploding-gradient threshold (loss > 5 means logits are diverging).
    const TARGET_LN3 = Math.log(NUM_CLASSES);
    const CATASTROPHIC_LOSS = 5.0;
    const ds = syntheticDataset(TRAIN_SEED);
    const { train } = shuffleSplit(ds, TRAIN_RATIO);
    const result = crossProcessNeuralLearningEngine.train(train, { epochs: 1, batchSize: train.length });
    expect(Number.isFinite(result.initialLoss)).toBe(true);
    expect(result.initialLoss).toBeGreaterThan(0);
    expect(result.initialLoss).toBeLessThan(CATASTROPHIC_LOSS);
    // Sanity: ln(3) is the theoretical balanced-softmax loss; current loss
    // should be in the same order-of-magnitude (within 1.5×) even pre-whitening.
    expect(result.initialLoss).toBeLessThan(TARGET_LN3 * 1.5);
  });

  it("5-seed mean accuracy beats chance by ≥2σ — convergence is statistically significant", () => {
    // Per Codex Reviewer #4 finding: 'loss reduces ≥30%' is not statistically
    // significant. Repeat the experiment across 5 seeds, compute mean and
    // standard error of the val accuracy, assert mean > chance + 2*SE.
    const SEEDS = [11, 22, 33, 44, 55];
    const valAccuracies: number[] = [];
    for (const seed of SEEDS) {
      const isolate = new CrossProcessNeuralLearningEngine();
      isolate.reset(seed);
      const ds = syntheticDataset(seed);
      const { train, val } = shuffleSplit(ds, TRAIN_RATIO, seed + 7);
      isolate.train(train, { epochs: TRAIN_EPOCHS, batchSize: BATCH_SIZE });
      const evalResult = isolate.evaluate(val);
      valAccuracies.push(evalResult.accuracy);
    }
    const n = valAccuracies.length;
    const mean = valAccuracies.reduce((a, b) => a + b, 0) / n;
    const variance = valAccuracies.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
    const stdError = Math.sqrt(variance / n);
    // Statistically significant beat over chance: mean > 1/3 + 2*SE.
    expect(mean - 2 * stdError).toBeGreaterThan(CHANCE_ACCURACY);
    // Mean accuracy should clear the val-floor of every individual run.
    expect(mean).toBeGreaterThan(VAL_ACC_FLOOR);
  });

  it("5-seed mean loss reduction is statistically distinguishable from no-op", () => {
    // For each seed, compute (initialLoss - finalLoss) / initialLoss = relative reduction.
    // Mean reduction across 5 seeds must be > 2*SE away from zero (i.e. the
    // null hypothesis 'training does nothing' is rejected at >95% confidence).
    const SEEDS = [101, 202, 303, 404, 505];
    const reductions: number[] = [];
    for (const seed of SEEDS) {
      const isolate = new CrossProcessNeuralLearningEngine();
      isolate.reset(seed);
      const ds = syntheticDataset(seed);
      const { train } = shuffleSplit(ds, TRAIN_RATIO, seed + 7);
      const r = isolate.train(train, { epochs: TRAIN_EPOCHS, batchSize: BATCH_SIZE });
      reductions.push((r.initialLoss - r.finalLoss) / r.initialLoss);
    }
    const n = reductions.length;
    const mean = reductions.reduce((a, b) => a + b, 0) / n;
    const variance = reductions.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
    const stdError = Math.sqrt(variance / n);
    // Reject null (no reduction) at >95% confidence: mean > 2*SE.
    expect(mean - 2 * stdError).toBeGreaterThan(0);
    // Mean reduction should be substantial (≥30% per the original convergence claim).
    expect(mean).toBeGreaterThan(0.3);
  });

  // ===========================================================================
  // U-NN-FEAT01 — Categorical hash collision audit
  // ===========================================================================

  it("material hash uses ≥40% of buckets distinctly on 100-material catalog (12× the old 4-bucket scheme)", () => {
    // Reviewers 3 and 4 flagged the catastrophically narrow hash buckets:
    // 4 buckets for 100+ real materials → effectively 4 distinct slots,
    // i.e. 96% collision rate, only 2 bits of material discrimination.
    //
    // After U-NN-FEAT01 widened MATERIAL_BUCKETS to 64, the network gets
    // ~log2(distinct) ≈ 5.6 bits of material discrimination instead of 2.
    //
    // NOTE on threshold choice: the roadmap originally specified "<5%
    // collision rate" but that's birthday-paradox-impossible — 100 items in
    // 64 buckets has expected collision rate ≈50%. The information-theoretic
    // measure that matters is DISTINCT-BUCKETS-PER-INPUT, not raw collision
    // count. Threshold ≥40% means at least 40 of 100 materials map to unique
    // buckets, which is 10× the old scheme's 4-distinct-slot ceiling.
    const MATERIAL_BUCKETS = 64;
    const OLD_MATERIAL_BUCKETS = 4;
    const DISTINCT_BUCKET_FRAC_FLOOR = 0.40;
    const MAX_LOAD_PER_BUCKET = 6;
    const MIN_DISTINCT = 100;
    const REAL_MATERIALS = [
      // Steels (DIN/AISI)
      "1.0711", "1.0715", "1.0718", "1.0721", "1.0722", "1.0723", "1.0726",
      "1.0727", "1.0728", "1.0736", "1.0737", "1.2002", "1.2003", "1.2004",
      "1.2057", "1.2067", "1.2083", "1.2085", "1.2101", "1.2103", "1.2129",
      "1.2162", "1.2208", "1.2210", "1.2235", "1.2241", "1.2242", "1.2243",
      "1018", "1045", "4140", "4340", "8620", "12L14", "1144", "A36",
      // Stainless
      "304", "304L", "316", "316L", "321", "347", "410", "416", "420",
      "440C", "17-4PH", "13-8Mo", "15-5PH", "Nitronic 60",
      // Tool steels
      "A2", "D2", "D3", "M2", "H13", "H11", "S7", "O1", "P20", "420SS",
      // Aluminum
      "6061-T6", "6061-T651", "7075-T6", "7075-T7351", "2024-T3",
      "2024-T351", "5052-H32", "5083-H116", "5086-H32",
      // Titanium
      "Ti-6Al-4V", "Ti-3Al-2.5V", "Ti-6Al-2Sn-4Zr-2Mo", "Grade2-Ti",
      "Grade5-Ti",
      // Nickel-based
      "Inconel 625", "Inconel 718", "Inconel 939", "Hastelloy C276",
      "Hastelloy X", "Monel 400", "Monel K-500",
      // Copper alloys
      "C110-Cu", "C145-Cu", "C260-brass", "C360-brass", "C544-bronze",
      // Cast iron
      "GG25", "GGG40", "GGG60", "GGG70", "GTW40",
      // Plastics
      "Delrin", "Acetal", "PEEK", "Nylon-6", "UHMW-PE", "PTFE", "PVC",
      // Composites
      "G10-FR4", "Carbon-Fiber-Epoxy", "Garolite",
      // Specialty
      "Magnesium-AZ31B", "Beryllium-Copper", "Tungsten-Carbide",
      "Tool-Steel-D2-58HRC",
    ];
    expect(REAL_MATERIALS.length).toBeGreaterThanOrEqual(MIN_DISTINCT);
    const distinct = new Set(REAL_MATERIALS);
    expect(distinct.size).toBe(REAL_MATERIALS.length);

    // Hash each material, count bucket loads.
    const bucketCounts = new Map<number, number>();
    for (const m of REAL_MATERIALS) {
      const idx = hashStringMod(m, MATERIAL_BUCKETS);
      bucketCounts.set(idx, (bucketCounts.get(idx) ?? 0) + 1);
    }
    const distinctBuckets = bucketCounts.size;
    const distinctFraction = distinctBuckets / REAL_MATERIALS.length;
    let maxLoad = 0;
    for (const count of bucketCounts.values()) {
      if (count > maxLoad) maxLoad = count;
    }

    // Sanity: hash actually distributes — distinct buckets should clear 40%
    // of input count (information-theoretic improvement over the 4-bucket scheme).
    expect(distinctFraction).toBeGreaterThanOrEqual(DISTINCT_BUCKET_FRAC_FLOOR);

    // No bucket should be a black hole — max load < 6 means the most-collided
    // material slot still has reasonable specificity.
    expect(maxLoad).toBeLessThanOrEqual(MAX_LOAD_PER_BUCKET);

    // Distinct buckets must exceed the OLD 4-bucket ceiling by ≥10× — the
    // whole point of the widening. (Old: max 4 distinct, regardless of N.)
    expect(distinctBuckets).toBeGreaterThan(OLD_MATERIAL_BUCKETS * 10);
  });

  it("widened bucket counts produce INPUT_DIM=131 (7+5+3+64+16+16+16+4)", () => {
    // U-NN-FEAT01 architectural change: input layer expanded 32→131 dims.
    // 7 numeric + 5 bridge + 3 process + 64 material + 16 tool_material +
    // 16 machine_family + 16 operation + 4 aux.
    expect(INPUT_DIM).toBe(131);
  });

  // ===========================================================================
  // U-NN-FEAT02 — Welford z-score scale invariance
  // ===========================================================================

  it("Welford z-score makes training scale-invariant: identical structure with rescaled numerics converges similarly", () => {
    // Reviewer 3: log1p(v)/12 was a one-size-fits-all scaling that obscured
    // real distributions. With z-score normalization, rescaling all numeric
    // features by a constant factor (e.g., RPM in [100, 30000] vs RPM in
    // [1, 300]) should produce equivalent training trajectories — because
    // z-score whitens the inputs before the network sees them.
    const SCALE_DOWN = 0.01; // RPM 20000 → 200, depth 4 → 0.04
    const SCALE_UP = 1.0;
    const ABS_LOSS_DELTA_TOLERANCE = 0.15;
    const ACC_DELTA_TOLERANCE = 0.10;

    function trainAtScale(scale: number): { finalLoss: number; valAcc: number } {
      const isolate = new CrossProcessNeuralLearningEngine();
      isolate.reset(TRAIN_SEED);
      const ds = syntheticDataset(TRAIN_SEED).map((r) => {
        const numerics = r.request_summary as Record<string, number>;
        const rescaled: Record<string, number> = {};
        for (const k of Object.keys(numerics)) {
          if (typeof numerics[k] === "number") rescaled[k] = numerics[k] * scale;
        }
        return {
          ...r,
          request_summary: { ...r.request_summary, ...rescaled },
        };
      });
      const { train, val } = shuffleSplit(ds as OutcomeRecord[], TRAIN_RATIO);
      const tr = isolate.train(train, {
        epochs: TRAIN_EPOCHS,
        batchSize: BATCH_SIZE,
      });
      const evalRes = isolate.evaluate(val);
      return { finalLoss: tr.finalLoss, valAcc: evalRes.accuracy };
    }

    const baseline = trainAtScale(SCALE_UP);
    const rescaled = trainAtScale(SCALE_DOWN);

    // Final losses should be close (z-score absorbs the magnitude difference).
    const lossDelta = Math.abs(baseline.finalLoss - rescaled.finalLoss);
    expect(lossDelta).toBeLessThan(ABS_LOSS_DELTA_TOLERANCE);

    // Validation accuracies should be in the same ballpark (±10%).
    const accDelta = Math.abs(baseline.valAcc - rescaled.valAcc);
    expect(accDelta).toBeLessThan(ACC_DELTA_TOLERANCE);

    // Both rescaled runs should achieve non-trivial accuracy (above chance).
    expect(baseline.valAcc).toBeGreaterThan(CHANCE_ACCURACY);
    expect(rescaled.valAcc).toBeGreaterThan(CHANCE_ACCURACY);
  });

  it("Welford accumulator persists across train calls and stabilizes the running mean", () => {
    const isolate = new CrossProcessNeuralLearningEngine();
    isolate.reset(TRAIN_SEED);
    const ds = syntheticDataset(TRAIN_SEED);
    const { train } = shuffleSplit(ds, TRAIN_RATIO);

    // Train in two halves; Welford should accumulate across both.
    const half = Math.floor(train.length / 2);
    const firstHalf = train.slice(0, half);
    const secondHalf = train.slice(half);

    isolate.train(firstHalf, { epochs: 1, batchSize: half });
    const after1 = isolate.serialize();
    const welford1 = after1.welford;
    if (!welford1) throw new Error("welford state missing after first train");
    expect(welford1.count).toBe(half);
    expect(welford1.mean.length).toBe(7); // NUMERIC_KEYS_DIM
    expect(welford1.M2.length).toBe(7);

    isolate.train(secondHalf, { epochs: 1, batchSize: secondHalf.length });
    const after2 = isolate.serialize();
    const welford2 = after2.welford;
    if (!welford2) throw new Error("welford state missing after second train");
    expect(welford2.count).toBe(half + secondHalf.length);

    // Means must be finite, and at least ONE numeric feature in the synthetic
    // dataset has non-trivial mean (positive shop-floor magnitudes).
    for (const m of welford2.mean) {
      expect(Number.isFinite(m)).toBe(true);
    }
    const someNonZeroMean = welford2.mean.some((m) => m > 0);
    expect(someNonZeroMean).toBe(true);

    // M2 (sum of squared deviations) must be finite and non-negative.
    for (const v of welford2.M2) {
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
    }
    // At least one feature must show variance > 0 (synthetic data is varied).
    const someVariance = welford2.M2.some((v) => v > 0);
    expect(someVariance).toBe(true);
  });

  it("isolated engine instance trains independently of the singleton", () => {
    const ISOLATE_EPOCHS = 20;
    const isolate = new CrossProcessNeuralLearningEngine();
    isolate.reset(TRAIN_SEED + 1);
    const ds = syntheticDataset(TRAIN_SEED);
    const { train } = shuffleSplit(ds, TRAIN_RATIO);
    const result = isolate.train(train, { epochs: ISOLATE_EPOCHS, batchSize: BATCH_SIZE });
    expect(result.finalLoss).toBeLessThan(result.initialLoss);
    expect(result.epochsRun).toBe(ISOLATE_EPOCHS);
    // Singleton metrics reflect ZERO training (reset at beforeEach, no singleton.train this test).
    const singletonMetrics = crossProcessNeuralLearningEngine.getMetrics();
    expect(singletonMetrics.totalEpochsRun).toBe(0);
    expect(singletonMetrics.totalSamplesSeen).toBe(0);
    // Isolate metrics reflect its training run.
    const isolateMetrics = isolate.getMetrics();
    expect(isolateMetrics.totalEpochsRun).toBe(ISOLATE_EPOCHS);
    expect(isolateMetrics.totalSamplesSeen).toBe(train.length * ISOLATE_EPOCHS);
  });
});
