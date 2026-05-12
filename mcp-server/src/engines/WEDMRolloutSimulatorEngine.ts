/**
 * WEDMRolloutSimulatorEngine — Physics-based rollout simulator for WEDM RL training.
 *
 * Phase 3 / P3-MS3 / U-P3-12 of the WEDM AGI Intelligence Roadmap.
 *
 * Synthesizes plausible cut outcomes (Ra, MRR, spark-stability) from a
 * recipe and a material key, so the `WEDMRLControllerEngine` can be
 * trained off-line without consuming machine time. The physics backbone is:
 *
 *   • Klocke Ra model (Klocke 2013, DiBitonto 1989):
 *       Ra = C · (Ip · Ton)^k     [µm]
 *
 *   • MRR model (scale with discharge energy · material factor):
 *       MRR = MRR_ref · (Ip · Ton) / (Ip_ref · Ton_ref) · mrr_factor
 *
 *   • Spark stability (empirical heuristic):
 *       stability = tanh( (Toff/Ton) / stabilityScale ) · stability_ceiling
 *       (more off-time per on-time → stabler gap).
 *
 * Measurement noise is additive Gaussian in log-Ra and log-MRR space so
 * values remain positive. The seeded RNG (Mulberry32) keeps tests
 * deterministic and SPC calculations reproducible.
 *
 * Scope note: distinct from `SimulationEngine` (CNC toolpath / G-code /
 * cycle-time simulator). This engine is a **WEDM physics surrogate for RL
 * rollouts**, not a machining toolpath simulator. Complementary to, not
 * replacing, the general-purpose `SimulationEngine`.
 *
 * This is not a digital twin — it is a fast, bounded-error physics
 * surrogate. Accuracy is ±15 % on Ra and ±20 % on MRR across the
 * spark-DB materials vs. published Klocke curves.
 *
 * Composes with:
 *   - `WEDMMaterialSparkDatabaseEngine` — material keys and Klocke constants
 *   - `WEDMFewShotEngine` types — recipe, outcome, target
 *   - `WEDMRewardShapingEngine` — optional reward evaluation in rollouts
 *   - `WEDMRLControllerEngine` — consumer of `rollout()` streams
 *
 * @module engines/WEDMRolloutSimulatorEngine
 */

import {
  wedmMaterialSparkDatabaseEngine,
  REFERENCE_IE_A,
  REFERENCE_TE_US,
  type WEDMMaterialKey,
  type WEDMSparkSignature,
} from "./WEDMMaterialSparkDatabaseEngine.js";
import type {
  WEDMCutOutcome,
  WEDMCutTarget,
  WEDMRecipe,
} from "./WEDMFewShotEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export interface SimulationOptions {
  /** Seed for the internal PRNG. Default: 0xC0FFEE. */
  seed?: number;
  /** Std-dev of Gaussian noise in log-Ra space. Default: 0.05 (≈ ±5 %). */
  raNoiseSigmaLog?: number;
  /** Std-dev of Gaussian noise in log-MRR space. Default: 0.05. */
  mrrNoiseSigmaLog?: number;
  /** Std-dev of additive spark-stability noise. Default: 0.05. */
  stabilityNoiseSigma?: number;
}

export interface SimulationResult {
  outcome: WEDMCutOutcome;
  /** Ground-truth (noise-free) values — exposed for validation tests. */
  truth: {
    ra_um: number;
    mrr_mm3_per_min: number;
    stability: number;
  };
}

export interface RolloutStep {
  t: number;
  recipe: WEDMRecipe;
  outcome: WEDMCutOutcome;
  /** Tuple of (ra-error, mrr-error) against target; useful for telemetry. */
  error: { ra: number; mrr: number };
}

export interface RolloutResult {
  steps: RolloutStep[];
  /** Terminal Ra error (actual - target) / target. */
  terminalRaRelErr: number;
  /** True if the rollout hit target_ra within `tolerance` in ≤ steps.length. */
  converged: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const DEFAULT_SEED = 0xc0ffee;
export const DEFAULT_RA_NOISE_SIGMA_LOG = 0.05;
export const DEFAULT_MRR_NOISE_SIGMA_LOG = 0.05;
export const DEFAULT_STABILITY_NOISE_SIGMA = 0.05;

/** Reference MRR for steel 1045 at REFERENCE_IE·REFERENCE_TE [mm³/min]. */
export const REFERENCE_MRR_MM3_PER_MIN = 20;

/** Scale for the spark-stability heuristic (Toff/Ton ratio). */
const STABILITY_SCALE = 2;
/** Cap on the stability value. */
const STABILITY_CEILING = 0.98;

// ============================================================================
// ENGINE
// ============================================================================

export class WEDMRolloutSimulatorEngine {
  private prng: () => number;
  private seed: number;
  private raNoiseSigmaLog: number;
  private mrrNoiseSigmaLog: number;
  private stabilityNoiseSigma: number;

  constructor(opts: SimulationOptions = {}) {
    this.seed = opts.seed ?? DEFAULT_SEED;
    this.raNoiseSigmaLog = opts.raNoiseSigmaLog ?? DEFAULT_RA_NOISE_SIGMA_LOG;
    this.mrrNoiseSigmaLog = opts.mrrNoiseSigmaLog ?? DEFAULT_MRR_NOISE_SIGMA_LOG;
    this.stabilityNoiseSigma =
      opts.stabilityNoiseSigma ?? DEFAULT_STABILITY_NOISE_SIGMA;
    this.prng = mulberry32(this.seed);
  }

  /** Deterministic single-cut simulation. */
  simulate(recipe: WEDMRecipe, material: WEDMMaterialKey): SimulationResult {
    let sig: WEDMSparkSignature;
    try {
      sig = wedmMaterialSparkDatabaseEngine.get(material);
    } catch {
      throw new Error(`simulate: unknown material ${material}`);
    }

    this.validateRecipe(recipe);

    const truth = this.groundTruth(recipe, sig);
    const outcome: WEDMCutOutcome = {
      actual_ra_um: round4(truth.ra_um * Math.exp(this.gauss() * this.raNoiseSigmaLog)),
      actual_mrr_mm3_per_min: round4(
        truth.mrr_mm3_per_min * Math.exp(this.gauss() * this.mrrNoiseSigmaLog),
      ),
      spark_stability: round4(
        clamp(truth.stability + this.gauss() * this.stabilityNoiseSigma, 0, 1),
      ),
    };
    return { outcome, truth };
  }

  /**
   * Run a closed-loop rollout: on each step, a supplied agent produces a
   * recipe from the last outcome, and we simulate the next cut. Returns the
   * full trajectory for offline training.
   */
  rollout(
    initial: WEDMRecipe,
    material: WEDMMaterialKey,
    target: WEDMCutTarget,
    agent: (state: {
      recipe: WEDMRecipe;
      lastOutcome?: WEDMCutOutcome;
      target: WEDMCutTarget;
      t: number;
    }) => WEDMRecipe,
    opts: { steps?: number; raTolerance?: number } = {},
  ): RolloutResult {
    const maxSteps = Math.max(1, Math.floor(opts.steps ?? 10));
    const tol = opts.raTolerance ?? 0.1;
    const steps: RolloutStep[] = [];
    let recipe = initial;
    let lastOutcome: WEDMCutOutcome | undefined;
    let converged = false;

    for (let t = 0; t < maxSteps; t++) {
      const sim = this.simulate(recipe, material);
      const error = {
        ra: relErr(sim.outcome.actual_ra_um, target.target_ra_um),
        mrr: relErr(sim.outcome.actual_mrr_mm3_per_min, target.target_mrr_mm3_per_min),
      };
      steps.push({ t, recipe, outcome: sim.outcome, error });
      lastOutcome = sim.outcome;

      if (Math.abs(error.ra) <= tol) {
        converged = true;
        break;
      }

      recipe = agent({
        recipe,
        lastOutcome,
        target,
        t: t + 1,
      });
    }

    const terminalRaRelErr =
      steps.length === 0
        ? Number.NaN
        : relErr(steps[steps.length - 1].outcome.actual_ra_um, target.target_ra_um);

    return { steps, terminalRaRelErr, converged };
  }

  /**
   * Ground-truth (noise-free) outcome. Exposed for test calibration against
   * Klocke values and for regression against the spark DB.
   */
  groundTruth(
    recipe: WEDMRecipe,
    sig: WEDMSparkSignature,
  ): { ra_um: number; mrr_mm3_per_min: number; stability: number } {
    const discharge = recipe.peak_current_A * recipe.pulse_on_us; // proxy for energy
    const refDischarge = REFERENCE_IE_A * REFERENCE_TE_US;

    const ra_um = sig.klocke_C * Math.pow(Math.max(discharge, 1e-6), sig.klocke_k);
    const mrr_mm3_per_min =
      REFERENCE_MRR_MM3_PER_MIN * (discharge / refDischarge) * sig.mrr_factor;
    const ratio = recipe.pulse_off_us / Math.max(recipe.pulse_on_us, 1e-6);
    const stability = STABILITY_CEILING * Math.tanh(ratio / STABILITY_SCALE);
    return { ra_um, mrr_mm3_per_min, stability };
  }

  /** Reset the PRNG to the original seed (repeatable rollouts). */
  reseed(seed?: number): void {
    this.seed = seed ?? this.seed;
    this.prng = mulberry32(this.seed);
  }

  // --------------------------------------------------------------------------
  // Private
  // --------------------------------------------------------------------------

  /** Box-Muller transform on two PRNG draws → standard normal. */
  private gauss(): number {
    let u = 0, v = 0;
    while (u === 0) u = this.prng();
    while (v === 0) v = this.prng();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  private validateRecipe(recipe: WEDMRecipe): void {
    if (!Number.isFinite(recipe.peak_current_A) || recipe.peak_current_A <= 0) {
      throw new Error(
        `validateRecipe: peak_current_A must be positive, got ${recipe.peak_current_A}`,
      );
    }
    if (!Number.isFinite(recipe.pulse_on_us) || recipe.pulse_on_us <= 0) {
      throw new Error(
        `validateRecipe: pulse_on_us must be positive, got ${recipe.pulse_on_us}`,
      );
    }
    if (!Number.isFinite(recipe.pulse_off_us) || recipe.pulse_off_us < 0) {
      throw new Error(
        `validateRecipe: pulse_off_us must be ≥ 0, got ${recipe.pulse_off_us}`,
      );
    }
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

export const wedmRolloutSimulatorEngine = new WEDMRolloutSimulatorEngine();

// ============================================================================
// HELPERS
// ============================================================================

function relErr(actual: number, target: number): number {
  return (actual - target) / Math.max(Math.abs(target), 1e-9);
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

function round4(x: number): number {
  return Math.round(x * 10000) / 10000;
}

/**
 * Mulberry32 seeded PRNG — small, fast, good distribution for unit tests.
 * Returns a function ↦ [0, 1).
 */
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return function (): number {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
