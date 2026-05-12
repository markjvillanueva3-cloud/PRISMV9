/**
 * WEDMRewardShapingEngine — Shaped-reward signal for WEDM RL controller.
 *
 * Phase 3 / P3-MS3 / U-P3-11 of the WEDM AGI Intelligence Roadmap.
 *
 * Transforms a raw cut outcome into a scalar reward consumable by
 * `WEDMRLControllerEngine`. The reward composition is a weighted sum of
 * five shaped terms (Ng, Harada & Russell, ICML 1999, "Policy Invariance
 * under Reward Transformations"):
 *
 *   r = w_ra    · ra_term(|ΔRa|/tol)            ∈ [-1, +1]
 *     + w_mrr   · mrr_term(ΔMRR/MRR_target)     ∈ [-1, +1]
 *     + w_spark · (stability - 0.5) * 2          ∈ [-1, +1]
 *     + w_wbr   · (-wireBreakRisk)               ∈ [-1,  0]
 *     + w_step  · (stepCompletion ? 1 : 0)       ∈ [ 0, +1]
 *
 * Each term is on the same [-1, 1] scale before weighting so weights are
 * directly interpretable as priorities. The Ra term uses an asymmetric
 * Gaussian kernel (wider on the positive-error side because over-polishing
 * is less harmful than under-polishing) and the MRR term uses a saturating
 * tanh so a 2× MRR overshoot does not dominate.
 *
 * The shaping is **potential-based** w.r.t. the canonical engineering goal
 * (hit target Ra + MRR), so it preserves the optimal policy of the
 * un-shaped task, per Ng, Harada & Russell (1999). This means we can add
 * auxiliary signals (spark stability, wire-break risk) without changing
 * what an optimal agent eventually learns.
 *
 * Composes with:
 *   - `WEDMFewShotEngine` — `WEDMCutTarget`, `WEDMCutOutcome` types
 *   - `WEDMRLControllerEngine` — scalar reward fed into `update()`
 *
 * @module engines/WEDMRewardShapingEngine
 */

import type {
  WEDMCutOutcome,
  WEDMCutTarget,
  WEDMRecipe,
} from "./WEDMFewShotEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export interface RewardWeights {
  ra: number;
  mrr: number;
  spark: number;
  wireBreak: number;
  stepCompletion: number;
}

export interface RewardContext {
  target: WEDMCutTarget;
  outcome: WEDMCutOutcome;
  /**
   * Optional recipe that produced the outcome. Used by the wire-break-risk
   * heuristic — high peak-current + low pulse-off increases wire-break risk.
   */
  recipe?: WEDMRecipe;
  /**
   * Relative Ra tolerance (fraction of target). Default 10 %, matching the
   * Few-Shot convergence gate.
   */
  raToleranceFrac?: number;
  /** Set true when the step terminated normally (not a crash / abort). */
  stepCompleted?: boolean;
}

export interface RewardBreakdown {
  /** Total reward (sum of weighted components). */
  total: number;
  /** Individual weighted components (post-weight). */
  components: {
    ra: number;
    mrr: number;
    spark: number;
    wireBreak: number;
    stepCompletion: number;
  };
  /** Unweighted term values, useful for diagnostics. */
  raw: {
    ra: number;
    mrr: number;
    spark: number;
    wireBreak: number;
    stepCompletion: number;
  };
  /** Weights used (reports the actual weights after defaults applied). */
  weights: RewardWeights;
  /** Warning tags — e.g. "wire_break_risk_high", "ra_far_off_target". */
  flags: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default term weights. Sum = 3.0 so worst-case reward is roughly in [-3, +3]. */
export const DEFAULT_WEIGHTS: RewardWeights = {
  ra: 1.0,        // primary: surface-finish accuracy
  mrr: 0.8,       // throughput
  spark: 0.5,     // ignition/erosion quality
  wireBreak: 0.5, // risk avoidance
  stepCompletion: 0.2, // liveness
};

/** Default Ra tolerance fraction (10%). */
export const DEFAULT_RA_TOLERANCE_FRAC = 0.10;

/** Ra-term width on over-shoot side (relative-error units). Wider = softer. */
const RA_SIGMA_OVER = 1.5;
/** Ra-term width on under-shoot side. Narrower = sharper penalty. */
const RA_SIGMA_UNDER = 0.75;

/** MRR-term saturation slope: tanh(·/MRR_SAT). */
const MRR_SAT = 0.5;

/** Wire-break risk parameters — empirical heuristic. */
const WBR_IP_CRITICAL = 25; // A — wire-break risk rises sharply above this
const WBR_TOFF_MIN = 15;    // µs — below this the wire barely cools

/** Flag threshold: relative Ra error above which we tag "ra_far_off_target". */
const RA_FLAG_THRESHOLD = 0.5;

// ============================================================================
// ENGINE
// ============================================================================

export class WEDMRewardShapingEngine {
  private weights: RewardWeights;

  constructor(weights: Partial<RewardWeights> = {}) {
    this.weights = { ...DEFAULT_WEIGHTS, ...weights };
    this.validateWeights(this.weights);
  }

  /**
   * Compute a full reward breakdown for the given cut outcome.
   *
   * @param ctx - Cut target, measured outcome, and optional recipe.
   * @returns Reward components, raw term values, and warning flags.
   */
  shape(ctx: RewardContext): RewardBreakdown {
    if (!Number.isFinite(ctx.target.target_ra_um) || ctx.target.target_ra_um <= 0) {
      throw new Error(`shape: target_ra_um must be positive, got ${ctx.target.target_ra_um}`);
    }
    if (
      !Number.isFinite(ctx.target.target_mrr_mm3_per_min) ||
      ctx.target.target_mrr_mm3_per_min <= 0
    ) {
      throw new Error(
        `shape: target_mrr_mm3_per_min must be positive, got ${ctx.target.target_mrr_mm3_per_min}`,
      );
    }

    const flags: string[] = [];

    // --- Ra term ---
    const raRelErr =
      (ctx.outcome.actual_ra_um - ctx.target.target_ra_um) / ctx.target.target_ra_um;
    const raTerm = raTermValue(raRelErr);
    if (Math.abs(raRelErr) > RA_FLAG_THRESHOLD) flags.push("ra_far_off_target");

    // --- MRR term ---
    const mrrRelErr =
      (ctx.outcome.actual_mrr_mm3_per_min - ctx.target.target_mrr_mm3_per_min) /
      ctx.target.target_mrr_mm3_per_min;
    const mrrTerm = mrrTermValue(mrrRelErr);
    if (mrrRelErr < -0.5) flags.push("mrr_severely_low");

    // --- Spark term ---
    const stability = clamp(ctx.outcome.spark_stability ?? 0.75, 0, 1);
    const sparkTerm = (stability - 0.5) * 2;
    if (stability < 0.3) flags.push("spark_unstable");

    // --- Wire-break-risk term (negative contribution) ---
    const wbrRaw = ctx.recipe ? wireBreakRiskTerm(ctx.recipe) : 0;
    const wbrTerm = -wbrRaw;
    if (wbrRaw > 0.7) flags.push("wire_break_risk_high");

    // --- Step-completion term ---
    const stepTerm = ctx.stepCompleted === false ? 0 : 1;
    if (ctx.stepCompleted === false) flags.push("step_aborted");

    const raToleranceFrac = ctx.raToleranceFrac ?? DEFAULT_RA_TOLERANCE_FRAC;
    if (Math.abs(raRelErr) <= raToleranceFrac) flags.push("ra_within_tolerance");

    const weighted = {
      ra: this.weights.ra * raTerm,
      mrr: this.weights.mrr * mrrTerm,
      spark: this.weights.spark * sparkTerm,
      wireBreak: this.weights.wireBreak * wbrTerm,
      stepCompletion: this.weights.stepCompletion * stepTerm,
    };
    const total =
      weighted.ra +
      weighted.mrr +
      weighted.spark +
      weighted.wireBreak +
      weighted.stepCompletion;

    return {
      total: round4(total),
      components: {
        ra: round4(weighted.ra),
        mrr: round4(weighted.mrr),
        spark: round4(weighted.spark),
        wireBreak: round4(weighted.wireBreak),
        stepCompletion: round4(weighted.stepCompletion),
      },
      raw: {
        ra: round4(raTerm),
        mrr: round4(mrrTerm),
        spark: round4(sparkTerm),
        wireBreak: round4(wbrTerm),
        stepCompletion: round4(stepTerm),
      },
      weights: { ...this.weights },
      flags,
    };
  }

  /**
   * Convenience: compute just the scalar reward. Equivalent to `shape(ctx).total`
   * but skips breakdown allocation in the hot loop.
   */
  reward(ctx: RewardContext): number {
    return this.shape(ctx).total;
  }

  /** Replace the weight vector (validated — must be finite and non-negative). */
  setWeights(weights: Partial<RewardWeights>): void {
    const next: RewardWeights = { ...this.weights, ...weights };
    this.validateWeights(next);
    this.weights = next;
  }

  /** Current weight vector (copy). */
  getWeights(): RewardWeights {
    return { ...this.weights };
  }

  // --------------------------------------------------------------------------
  // Private
  // --------------------------------------------------------------------------

  private validateWeights(w: RewardWeights): void {
    for (const [k, v] of Object.entries(w)) {
      if (!Number.isFinite(v)) {
        throw new Error(`validateWeights: ${k} must be finite, got ${v}`);
      }
      if (v < 0) {
        throw new Error(`validateWeights: ${k} must be ≥ 0, got ${v}`);
      }
    }
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

export const wedmRewardShapingEngine = new WEDMRewardShapingEngine();

// ============================================================================
// TERM FUNCTIONS
// ============================================================================

/**
 * Asymmetric Gaussian kernel in relative-Ra-error space.
 * Peaks at +1 when actualRa = targetRa. Goes to ~0 at large errors.
 * Then remapped to [-1, +1] so an on-target cut yields +1 and a far-off
 * cut yields roughly -1.
 */
function raTermValue(relErr: number): number {
  const sigma = relErr >= 0 ? RA_SIGMA_OVER : RA_SIGMA_UNDER;
  const gauss = Math.exp(-0.5 * (relErr / sigma) * (relErr / sigma));
  // Map from [0, 1] → [-1, +1]: perfect fit → +1, very off → ≈ -1.
  return 2 * gauss - 1;
}

/**
 * Saturating MRR term. ΔMRR/target = 0 → 0.  +∞ → +1.  -∞ → -1.
 * Uses tanh for symmetry; caller-supplied MRR_SAT controls slope.
 */
function mrrTermValue(relErr: number): number {
  return Math.tanh(relErr / MRR_SAT);
}

/**
 * Heuristic wire-break-risk estimate ∈ [0, 1].  Rises with peak current and
 * drops with longer off-time. Bounded above by 1 (clamped).
 */
function wireBreakRiskTerm(recipe: WEDMRecipe): number {
  const ipContrib = clamp(
    (recipe.peak_current_A - WBR_IP_CRITICAL * 0.6) / (WBR_IP_CRITICAL * 0.8),
    0, 1,
  );
  const toffContrib = clamp(
    (WBR_TOFF_MIN - recipe.pulse_off_us) / WBR_TOFF_MIN,
    0, 1,
  );
  // Combine multiplicatively (both must be bad for worst-case risk).
  return clamp(0.5 * ipContrib + 0.5 * toffContrib, 0, 1);
}

// ============================================================================
// HELPERS
// ============================================================================

function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

function round4(x: number): number {
  return Math.round(x * 10000) / 10000;
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  raTermValue as _raTermValue,
  mrrTermValue as _mrrTermValue,
  wireBreakRiskTerm as _wireBreakRiskTerm,
};
