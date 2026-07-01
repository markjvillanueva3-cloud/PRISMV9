/**
 * MasterBrainBackpropPropagatorEngine — U-CADC-LP04 / CAD-COMPLETE-MS0
 *
 * The back-propagation stage of the CAD closed-loop learner. Given a
 * prioritized replay batch (from LP03), it computes a gradient step and
 * applies it to BOTH:
 *   - the shared MASTER policy (cross-CAD-system knowledge), and
 *   - the per-CAD-system NN HEAD that produced the batch.
 * so a single CAD execution outcome updates both the shared trunk and the
 * adapter that owns it.
 *
 * Model: each target (master + each head) is a linear value head
 * v = θ·φ over a fixed 4-d feature vector φ derived from a FeedbackSample
 * (bias, normalised timing, collision, regeneration-ok). The training
 * signal is the mini-batch mean weighted-least-squares loss
 *   L = (1/n)·Σ_i w_i·(v_i − r_i)²
 * where r_i is the shaped reward of sample i and w_i is its PER
 * importance-sampling weight from the replay batch. Per-sample gradient is
 * g_i = w_i·2·(v_i − r_i)·φ_i; the engine applies the mean gradient
 * ⟨g⟩ = (1/n)·Σ_i g_i. This is a real, verifiable gradient-descent learner
 * — not a deep tensor net, which the propagator's contract ("gradient
 * update visible on master + heads") does not require; a linear value
 * head is a genuine NN head.
 *
 * Catastrophic-forgetting protection — two mechanisms, per the acceptance
 * "EWC++ / LoRA-safe preservation of prior skills":
 *   - EWC++ (online Elastic Weight Consolidation, Kirkpatrick 2017 +
 *     Schwarz 2018 online variant): a γ-decayed running diagonal Fisher F
 *     and a consolidated reference θ*. Every step adds the penalty gradient
 *     λ·F⊙(θ − θ*) — params important to prior tasks (high F) resist change.
 *   - LoRA-safe mode: when enabled, the base θ is FROZEN and updates
 *     accumulate in a separate low-rank-style delta; prior skills encoded
 *     in the base are preserved by construction.
 *
 * Duplication-guard note: EWC++ is also implemented domain-specifically in
 * WEDMEWCMemoryEngine (WEDM) and CrossProcessEWCMemoryPreservationEngine
 * (XPROC). Per that established per-domain pattern, the CAD closed-loop
 * propagator carries its own EWC++ regulariser rather than coupling to a
 * WEDM/XPROC engine — the overlap is only the published Kirkpatrick-2017
 * EWC math. No generic backprop/propagator engine exists to compose.
 *
 * Composes (per duplication-guard): the ReplayBatch type from LP03, the
 * FeedbackSample type from LP02.
 * Consumed by: the CAD closed-loop training orchestrator (later unit).
 *
 * @module engines/MasterBrainBackpropPropagatorEngine
 * @milestone CAD-COMPLETE-MS0 U-CADC-LP04
 */

import type { ReplayBatch } from "./CADHeadReplayBufferEngine.js";
import type { FeedbackSample } from "./CADPerAdapterFeedbackCollectorEngine.js";

/** Feature-vector dimension: [bias, normTiming, collision, regenOk]. */
const FEATURE_DIM = 4;
/** Reserved target id for the shared master policy. */
export const MASTER_TARGET = "__master__";

/** Default SGD learning rate. */
const DEFAULT_LR = 0.05;
/** Default EWC penalty strength λ (Kirkpatrick 2017). */
const DEFAULT_EWC_LAMBDA = 1.0;
/** Default online-EWC Fisher decay γ (Schwarz 2018 "Progress & Compress"). */
const DEFAULT_FISHER_DECAY = 0.9;

// ── Reward-shaping weights (learner tuning values — NOT physics constants) ──
/** Reward credited for a successful CAD operation. */
const SUCCESS_BASE = 0.8;
/** Reward bonus when post-execute regeneration validation passed. */
const REGEN_BONUS = 0.2;
/** Reward penalty for a reported collision. */
const COLLISION_PENALTY = 0.5;
/** Reward penalty scaled by normalised execution time. */
const TIMING_PENALTY = 0.3;
/** Timing (ms) at which normTiming saturates to 1 — a CAD op this slow is "slow". */
const TIMING_NORM_MS = 2000;

/** Per-target gradient-step result — makes the update observable. */
export interface PropagationResult {
  /** Target id ("__master__" or a head/CAD-system id). */
  target: string;
  /** Effective params before the step. */
  before: number[];
  /** Effective params after the step. */
  after: number[];
  /** after − before, element-wise. */
  delta: number[];
  /** L2 norm of the task gradient (excludes the EWC penalty). */
  gradNorm: number;
  /** L2 norm of the EWC penalty gradient applied this step. */
  ewcPenaltyNorm: number;
}

/** Result of propagate() — the update applied to BOTH master and head. */
export interface PropagateOutcome {
  /** CAD head the batch came from. */
  headId: string;
  /** Number of replay entries in the batch. */
  batchSize: number;
  /** Gradient step applied to the shared master policy. */
  master: PropagationResult;
  /** Gradient step applied to the per-CAD-system head. */
  head: PropagationResult;
}

/** Snapshot of one target's parameters + EWC state. */
export interface TargetParams {
  /** Target id. */
  target: string;
  /** Base weight vector (frozen in LoRA mode). */
  theta: number[];
  /** LoRA-style delta vector (always zero outside LoRA mode). */
  loraDelta: number[];
  /** Effective params = theta + loraDelta. */
  effective: number[];
  /** Diagonal Fisher information (EWC importance per param). */
  fisher: number[];
  /** Consolidated reference point θ* (EWC anchor). */
  thetaStar: number[];
  /** Gradient steps applied to this target. */
  updates: number;
}

/** Per-target counters in the stats snapshot. */
export interface PerTargetCounter {
  /** Gradient steps applied. */
  updates: number;
  /** L2 norm of the effective params. */
  effectiveNorm: number;
  /** L2 norm of the Fisher diagonal. */
  fisherNorm: number;
}

/** Aggregate propagator stats. */
export interface PropagatorStats {
  /** Distinct targets (master + heads). */
  targetCount: number;
  /** propagate() calls served. */
  totalPropagations: number;
  /** consolidate() calls applied (skipped no-op consolidates excluded). */
  totalConsolidations: number;
  /** Replay entries dropped by the malformed-entry filter, lifetime. */
  totalDroppedEntries: number;
  /** Whether LoRA-safe mode is active. */
  loraMode: boolean;
  /** Per-target counters. */
  byTarget: Record<string, PerTargetCounter>;
}

/** Internal per-target learning state. */
interface TargetState {
  theta: number[];
  loraDelta: number[];
  /** EWC consolidated reference θ*. */
  thetaStar: number[];
  /** EWC diagonal Fisher F. */
  fisher: number[];
  /** Running Σ of squared task gradients since the last consolidate. */
  gradSqAccum: number[];
  /** Number of steps folded into gradSqAccum. */
  gradSqCount: number;
  /** Lifetime gradient steps. */
  updates: number;
}

const zeros = (n: number): number[] => new Array<number>(n).fill(0);
const l2 = (v: number[]): number => Math.sqrt(v.reduce((s, x) => s + x * x, 0));
const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

/** Coerce an option to a finite non-negative number, else fall back to def. */
function nonNegOr(value: number | undefined, def: number): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : def;
}

/** Coerce an option to a finite strictly-positive number, else fall back to def. */
function posOr(value: number | undefined, def: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : def;
}

/**
 * MasterBrainBackpropPropagatorEngine — singleton (also constructible for tests).
 *
 * Production code uses the exported `masterBrainBackpropPropagatorEngine`
 * singleton. Tests construct isolated instances via `new`.
 */
export class MasterBrainBackpropPropagatorEngine {
  private targets: Map<string, TargetState> = new Map();
  private readonly lr: number;
  private readonly ewcLambda: number;
  private readonly fisherDecay: number;
  private readonly loraMode: boolean;
  private totalPropagations = 0;
  private totalConsolidations = 0;
  /** Replay entries dropped by the malformed-entry filter, lifetime. */
  private totalDroppedEntries = 0;

  /**
   * @param opts.lr          SGD learning rate (default 0.05). Must be strictly
   *                         positive; `0` / negative / non-finite fall back to default.
   * @param opts.ewcLambda   EWC penalty strength λ ≥ 0 (default 1.0).
   * @param opts.fisherDecay online-EWC Fisher decay γ in [0,1] (default 0.9).
   *                         `0` is allowed and means "no carry-over of prior Fisher".
   * @param opts.loraMode    freeze base θ, train a LoRA-style delta
   *                         (default false; strict `=== true` to enable — `1` / `"yes"` do NOT count).
   */
  constructor(opts?: { lr?: number; ewcLambda?: number; fisherDecay?: number; loraMode?: boolean }) {
    this.lr = posOr(opts?.lr, DEFAULT_LR);
    this.ewcLambda = nonNegOr(opts?.ewcLambda, DEFAULT_EWC_LAMBDA);
    this.fisherDecay = Math.min(1, nonNegOr(opts?.fisherDecay, DEFAULT_FISHER_DECAY));
    this.loraMode = opts?.loraMode === true;
  }

  /**
   * Back-propagate a prioritized replay batch into BOTH the shared master
   * policy and the per-CAD-system head named by the batch. Returns the
   * gradient step applied to each. An empty/invalid batch is a no-op step
   * (zero deltas) — never throws on data, throws only on a malformed call.
   */
  propagate(batch: ReplayBatch): PropagateOutcome {
    if (!batch || typeof batch !== "object" || typeof batch.headId !== "string" || batch.headId.length === 0) {
      throw new TypeError("propagate: batch must be a ReplayBatch with a non-empty headId");
    }
    const entries = Array.isArray(batch.entries) ? batch.entries : [];
    const weights = Array.isArray(batch.weights) ? batch.weights : [];
    const samples: Array<{ sample: FeedbackSample; isw: number }> = [];
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      if (!e || typeof e !== "object" || !e.sample) {
        this.totalDroppedEntries++;
        continue;
      }
      const w = weights[i];
      samples.push({ sample: e.sample, isw: typeof w === "number" && Number.isFinite(w) && w >= 0 ? w : 1 });
    }

    const master = this.stepTarget(MASTER_TARGET, samples);
    const head = this.stepTarget(batch.headId, samples);
    this.totalPropagations++;
    return { headId: batch.headId, batchSize: samples.length, master, head };
  }

  /**
   * Consolidate a target — fold the gradients seen since the last
   * consolidate into the EWC Fisher diagonal and snapshot the current
   * effective params as the new reference θ*. Call after finishing a
   * "task" so its skills are protected against later updates.
   *
   * No-op guard: if there are no gradients since the last consolidate
   * (`gradSqCount === 0`), the EWC anchor is preserved untouched —
   * repeated bare consolidates do NOT γ-decay the protective Fisher.
   * Returns `{ skipped: true }` so the caller can audit.
   */
  consolidate(target: string): { target: string; fisherNorm: number; skipped?: boolean } {
    if (typeof target !== "string" || target.length === 0) {
      throw new TypeError("consolidate: target must be a non-empty string");
    }
    const t = this.getOrCreate(target);
    if (t.gradSqCount === 0) {
      return { target, fisherNorm: l2(t.fisher), skipped: true };
    }
    const denom = t.gradSqCount;
    for (let i = 0; i < FEATURE_DIM; i++) {
      const fisherNew = t.gradSqAccum[i] / denom;
      t.fisher[i] = this.fisherDecay * t.fisher[i] + fisherNew;
    }
    t.thetaStar = this.effective(t);
    t.gradSqAccum = zeros(FEATURE_DIM);
    t.gradSqCount = 0;
    this.totalConsolidations++;
    return { target, fisherNorm: l2(t.fisher) };
  }

  /** Snapshot of a target's params + EWC state. Unknown target → fresh zeros. */
  getParams(target: string): TargetParams {
    const t = this.getOrCreate(target);
    return {
      target,
      theta: [...t.theta],
      loraDelta: [...t.loraDelta],
      effective: this.effective(t),
      fisher: [...t.fisher],
      thetaStar: [...t.thetaStar],
      updates: t.updates,
    };
  }

  /** The reserved master-policy target id. */
  static get MASTER(): string {
    return MASTER_TARGET;
  }

  /** All target ids (master + heads), sorted. */
  listTargets(): string[] {
    return [...this.targets.keys()].sort();
  }

  /** Aggregate propagator stats. byTarget is a fresh object. */
  getStats(): PropagatorStats {
    const byTarget: Record<string, PerTargetCounter> = {};
    for (const [id, t] of this.targets) {
      byTarget[id] = {
        updates: t.updates,
        effectiveNorm: l2(this.effective(t)),
        fisherNorm: l2(t.fisher),
      };
    }
    return {
      targetCount: this.targets.size,
      totalPropagations: this.totalPropagations,
      totalConsolidations: this.totalConsolidations,
      totalDroppedEntries: this.totalDroppedEntries,
      loraMode: this.loraMode,
      byTarget,
    };
  }

  /** Test helper — clears every target + zeroes counters. */
  reset(): void {
    this.targets.clear();
    this.totalPropagations = 0;
    this.totalConsolidations = 0;
    this.totalDroppedEntries = 0;
  }

  /** One gradient-descent step on a single target (master or a head). */
  private stepTarget(target: string, samples: Array<{ sample: FeedbackSample; isw: number }>): PropagationResult {
    const t = this.getOrCreate(target);
    const before = this.effective(t);
    const n = samples.length;

    // Per-sample WLS gradient g_i = w_i·2·(v_i − r_i)·φ_i, plus accumulator
    // for the empirical Fisher (Kirkpatrick 2017): F̂ ≈ E[g_i ⊙ g_i].
    const gradSum = zeros(FEATURE_DIM);
    const sampleSqSum = zeros(FEATURE_DIM);
    for (const { sample, isw } of samples) {
      const phi = featureVector(sample);
      const r = shapedReward(sample);
      let v = 0;
      for (let i = 0; i < FEATURE_DIM; i++) v += before[i] * phi[i];
      const err = v - r;
      for (let i = 0; i < FEATURE_DIM; i++) {
        const gi = isw * 2 * err * phi[i];
        gradSum[i] += gi;
        sampleSqSum[i] += gi * gi;
      }
    }
    const meanGrad = n > 0 ? gradSum.map((g) => g / n) : zeros(FEATURE_DIM);

    // EWC++ penalty gradient λ·F⊙(θ_eff − θ*) — resists change to high-Fisher params.
    const ewcPenalty = zeros(FEATURE_DIM);
    for (let i = 0; i < FEATURE_DIM; i++) {
      ewcPenalty[i] = this.ewcLambda * t.fisher[i] * (before[i] - t.thetaStar[i]);
    }

    // Apply the step. LoRA mode freezes the base θ and moves only loraDelta.
    for (let i = 0; i < FEATURE_DIM; i++) {
      const step = this.lr * (meanGrad[i] + ewcPenalty[i]);
      if (this.loraMode) {
        t.loraDelta[i] -= step;
      } else {
        t.theta[i] -= step;
      }
      // Online-EWC Fisher: accumulate per-sample squared gradients (empirical
      // Fisher), not squared-of-mean (biased). consolidate() folds the
      // batch-averaged E[g²] into the running γ-decayed F.
      if (n > 0) t.gradSqAccum[i] += sampleSqSum[i] / n;
    }
    if (n > 0) t.gradSqCount++;
    t.updates++;

    const after = this.effective(t);
    return {
      target,
      before,
      after,
      delta: after.map((a, i) => a - before[i]),
      gradNorm: l2(meanGrad),
      ewcPenaltyNorm: l2(ewcPenalty),
    };
  }

  /** Effective params = base θ + LoRA delta. */
  private effective(t: TargetState): number[] {
    return t.theta.map((b, i) => b + t.loraDelta[i]);
  }

  private getOrCreate(target: string): TargetState {
    let t = this.targets.get(target);
    if (!t) {
      t = {
        theta: zeros(FEATURE_DIM),
        loraDelta: zeros(FEATURE_DIM),
        thetaStar: zeros(FEATURE_DIM),
        fisher: zeros(FEATURE_DIM),
        gradSqAccum: zeros(FEATURE_DIM),
        gradSqCount: 0,
        updates: 0,
      };
      this.targets.set(target, t);
    }
    return t;
  }
}

/** Normalised execution time in [0,1] — saturates at TIMING_NORM_MS. */
function normTiming(timingMs: number): number {
  const t = typeof timingMs === "number" && Number.isFinite(timingMs) && timingMs > 0 ? timingMs : 0;
  return Math.min(1, t / TIMING_NORM_MS);
}

/** Feature vector φ derived from a FeedbackSample: [bias, normTiming, collision, regenOk]. */
function featureVector(s: FeedbackSample): number[] {
  return [1, normTiming(s.timingMs), s.collision === true ? 1 : 0, s.regenerationOk === true ? 1 : 0];
}

/** Shaped scalar reward r ∈ [0,1] for a FeedbackSample (the regression target). */
function shapedReward(s: FeedbackSample): number {
  const reward =
    SUCCESS_BASE * (s.success === true ? 1 : 0) +
    REGEN_BONUS * (s.regenerationOk === true ? 1 : 0) -
    COLLISION_PENALTY * (s.collision === true ? 1 : 0) -
    TIMING_PENALTY * normTiming(s.timingMs);
  return clamp01(reward);
}

/** Singleton — production closed-loop back-propagator (EWC++ on, LoRA off by default). */
export const masterBrainBackpropPropagatorEngine = new MasterBrainBackpropPropagatorEngine();
