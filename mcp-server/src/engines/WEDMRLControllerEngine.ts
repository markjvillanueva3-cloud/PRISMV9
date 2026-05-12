/**
 * WEDMRLControllerEngine — Reinforcement learning for WEDM parameter control
 *
 * Phase 3 / P3-MS3 / U-P3-10 of the WEDM AGI Intelligence Roadmap.
 *
 * Implements a **LinUCB contextual-bandit controller** (Li, Chu, Langford &
 * Schapire, WWW 2010) over a small discrete action grid of recipe deltas.
 * For a 1–3 dimensional continuous control problem where rewards are sparse
 * and samples are expensive (each cut takes machine time), a contextual
 * bandit with linear payoff is the pragmatic SOTA — it has logarithmic
 * regret bounds and does not require gradient-based training.
 *
 * Formulation:
 *   - Context x_t ∈ R^d  : material embedding + recent error signals (d = 9)
 *   - Action a_t ∈ A     : one of 9 discrete deltas over (Ip, Ton)
 *   - Reward r_t ∈ R     : shaped signal from WEDMRewardShapingEngine (next U)
 *
 * Per-arm model θ_a = (A_a)^{-1} b_a  with regularized design matrix
 *   A_a = λI + Σ_t x_t x_t^T · 1[a_t = a]
 *   b_a = Σ_t r_t x_t · 1[a_t = a]
 *
 * UCB selection rule:
 *   a* = argmax_a  θ_a^T x + α · √(x^T A_a^{-1} x)
 *
 * Online update uses Sherman-Morrison so every step is O(d²) (no inverse).
 *
 * Roadmap scope note: the original v3 draft specified "PPO/SAC" — this
 * engine implements LinUCB instead because (a) sample complexity for a
 * machine-time-bounded process strongly favours bandit algorithms and
 * (b) PPO / SAC both require neural-network autodiff that PRISM does not
 * currently expose. If PPO / SAC become desirable later, they can slot in
 * behind the same `select()` / `update()` interface.
 *
 * Composes with:
 *   - `WEDMFewShotEngine.embed` — shared 7-dim material embedding
 *   - `WEDMRewardShapingEngine` (U-P3-11) — source of shaped reward signal
 *
 * @module engines/WEDMRLControllerEngine
 */

import {
  embed,
  type UnknownMaterialFeatures,
  type WEDMCutOutcome,
  type WEDMCutTarget,
  type WEDMRecipe,
} from "./WEDMFewShotEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export interface RLState {
  features: UnknownMaterialFeatures;
  target: WEDMCutTarget;
  /** Recipe the controller most recently proposed. */
  lastRecipe: WEDMRecipe;
  /** Measured outcome of the last proposed recipe, if any. */
  lastOutcome?: WEDMCutOutcome;
}

export interface RLAction {
  /** Integer step on the peak-current axis: -1, 0, +1. */
  dIp: -1 | 0 | 1;
  /** Integer step on the pulse-on-time axis: -1, 0, +1. */
  dTon: -1 | 0 | 1;
  /** Human-readable action id (e.g. "Ip+0_Ton-1"). */
  id: string;
}

export interface RLDecision {
  action: RLAction;
  /** Recipe produced by applying `action` to `state.lastRecipe`. */
  recipe: WEDMRecipe;
  /** Mean predicted reward θ^T x (unitless, reward-scale). */
  meanReward: number;
  /** UCB confidence bonus α √(x^T A^{-1} x). */
  ucbBonus: number;
  /** meanReward + ucbBonus = the argmax criterion value. */
  ucbScore: number;
  /** True if the arm was picked because it had never been tried (cold-start). */
  coldStart: boolean;
}

export interface RLUpdate {
  action: RLAction;
  /** Scalar reward from the shaping engine. */
  reward: number;
  /** Context dimension the design matrix was updated with. */
  dim: number;
}

export interface RLSnapshot {
  /** Policy version — bumped on every update(). */
  version: number;
  /** Sample count per arm. */
  pulls: Record<string, number>;
  /** Mean observed reward per arm (diagnostic). */
  meanReward: Record<string, number>;
  /** Current UCB α. */
  alpha: number;
  /** Ridge regularizer λ. */
  lambda: number;
  /** Context dim. */
  dim: number;
  /** θ_a for each arm (linear coefficients). */
  theta: Record<string, number[]>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Context dim: 7 (material embedding) + 2 (Ra error, MRR error). */
export const CONTEXT_DIM = 9;

/** Default UCB exploration coefficient (Li 2010). Larger → explore more. */
export const DEFAULT_ALPHA = 1.0;

/** Ridge prior strength. Small + positive. */
export const DEFAULT_LAMBDA = 1.0;

/** Step size on the recipe axes for each delta. */
export const STEP_IP_A = 1.0;   // peak current axis step [A]
export const STEP_TON_US = 2.0; // pulse-on axis step [µs]

/** Maximum policy version kept; beyond this we no-op writes (defensive). */
const MAX_VERSION = 10_000_000;

// 9-arm action grid: (dIp ∈ {-1, 0, +1}) × (dTon ∈ {-1, 0, +1}).
const ACTIONS: RLAction[] = (() => {
  const out: RLAction[] = [];
  for (const dIp of [-1, 0, 1] as const) {
    for (const dTon of [-1, 0, 1] as const) {
      out.push({ dIp, dTon, id: `Ip${signed(dIp)}_Ton${signed(dTon)}` });
    }
  }
  return out;
})();

function signed(n: -1 | 0 | 1): string {
  if (n === 0) return "+0";
  return n > 0 ? `+${n}` : `${n}`;
}

// ============================================================================
// ENGINE
// ============================================================================

export class WEDMRLControllerEngine {
  private readonly dim: number;
  private readonly alpha: number;
  private readonly lambda: number;

  /** Per-arm inverse design matrix (A^-1). */
  private Ainv: Record<string, number[][]>;
  /** Per-arm b vector (Σ rₜ xₜ). */
  private b: Record<string, number[]>;
  /** Per-arm pull count. */
  private pulls: Record<string, number>;
  /** Per-arm cumulative reward (for diagnostic mean). */
  private cumReward: Record<string, number>;
  /** Policy version (bumped on update). */
  private version: number;

  constructor(opts: { alpha?: number; lambda?: number } = {}) {
    this.dim = CONTEXT_DIM;
    this.alpha = opts.alpha ?? DEFAULT_ALPHA;
    this.lambda = opts.lambda ?? DEFAULT_LAMBDA;
    this.Ainv = {};
    this.b = {};
    this.pulls = {};
    this.cumReward = {};
    this.version = 0;
    for (const a of ACTIONS) this.initArm(a.id);
  }

  /**
   * Select the next action (a delta-recipe) given the current RL state.
   * Cold-start: any arm that has never been pulled wins over any UCB score,
   * so the controller explores every arm at least once before exploiting.
   */
  select(state: RLState): RLDecision {
    const x = this.contextVector(state);

    // Cold-start any unpulled arm first.
    for (const action of ACTIONS) {
      if (this.pulls[action.id] === 0) {
        const recipe = this.applyAction(state.lastRecipe, action);
        return {
          action,
          recipe,
          meanReward: 0,
          ucbBonus: Infinity,
          ucbScore: Infinity,
          coldStart: true,
        };
      }
    }

    // UCB selection over fully-initialised arms.
    let bestAction = ACTIONS[0];
    let bestScore = -Infinity;
    let bestMean = 0;
    let bestBonus = 0;
    for (const action of ACTIONS) {
      const theta = this.thetaOf(action.id);
      const mean = dot(theta, x);
      const Ax = matVec(this.Ainv[action.id], x);
      const variance = Math.max(0, dot(x, Ax));
      const bonus = this.alpha * Math.sqrt(variance);
      const score = mean + bonus;
      if (score > bestScore) {
        bestScore = score;
        bestMean = mean;
        bestBonus = bonus;
        bestAction = action;
      }
    }

    return {
      action: bestAction,
      recipe: this.applyAction(state.lastRecipe, bestAction),
      meanReward: round4(bestMean),
      ucbBonus: round4(bestBonus),
      ucbScore: round4(bestScore),
      coldStart: false,
    };
  }

  /**
   * Online update after an action produced a reward. Uses Sherman-Morrison
   * to update A^-1 in O(d²):
   *   A^{-1}_{new} = A^{-1} - (A^{-1} x xᵀ A^{-1}) / (1 + xᵀ A^{-1} x)
   * and b_{new} = b + r·x.
   */
  update(state: RLState, action: RLAction, reward: number): RLUpdate {
    if (!Number.isFinite(reward)) {
      throw new Error(`update: reward must be finite, got ${reward}`);
    }
    if (this.version >= MAX_VERSION) return { action, reward, dim: this.dim };
    if (!this.Ainv[action.id]) this.initArm(action.id);

    const x = this.contextVector(state);
    const Ainv = this.Ainv[action.id];
    const Ax = matVec(Ainv, x);
    const denom = 1 + dot(x, Ax);
    const outer = outerProduct(Ax, Ax);

    // Ainv ← Ainv - outer / denom
    for (let i = 0; i < this.dim; i++) {
      for (let j = 0; j < this.dim; j++) {
        Ainv[i][j] -= outer[i][j] / denom;
      }
    }

    // b ← b + r·x
    for (let i = 0; i < this.dim; i++) this.b[action.id][i] += reward * x[i];

    this.pulls[action.id] = (this.pulls[action.id] ?? 0) + 1;
    this.cumReward[action.id] = (this.cumReward[action.id] ?? 0) + reward;
    this.version++;
    return { action, reward, dim: this.dim };
  }

  /** One end-to-end step: select → apply → caller measures → update. */
  step(
    state: RLState,
    measure: (recipe: WEDMRecipe) => { outcome: WEDMCutOutcome; reward: number },
  ): { decision: RLDecision; outcome: WEDMCutOutcome; reward: number } {
    const decision = this.select(state);
    const { outcome, reward } = measure(decision.recipe);
    this.update(state, decision.action, reward);
    return { decision, outcome, reward };
  }

  /** Reset the controller to its freshly-initialised state. */
  reset(): void {
    this.Ainv = {};
    this.b = {};
    this.pulls = {};
    this.cumReward = {};
    this.version = 0;
    for (const a of ACTIONS) this.initArm(a.id);
  }

  /** Serializable snapshot for persistence / WEDM_RL_POLICY.json. */
  snapshot(): RLSnapshot {
    const theta: Record<string, number[]> = {};
    const meanReward: Record<string, number> = {};
    for (const a of ACTIONS) {
      theta[a.id] = this.thetaOf(a.id).map(round4);
      const n = this.pulls[a.id] ?? 0;
      meanReward[a.id] = n > 0 ? round4(this.cumReward[a.id] / n) : 0;
    }
    return {
      version: this.version,
      pulls: { ...this.pulls },
      meanReward,
      alpha: this.alpha,
      lambda: this.lambda,
      dim: this.dim,
      theta,
    };
  }

  /** Load a previously-serialised policy — used for warm-start from disk. */
  load(snap: RLSnapshot): void {
    if (snap.dim !== this.dim) {
      throw new Error(
        `load: snapshot dim ${snap.dim} mismatches engine dim ${this.dim}`,
      );
    }
    // This load function initializes Ainv with ridge prior and reconstructs
    // b = A · θ.  We do not recover the full A_t history — clients that need
    // strict continuation should persist (A, b) instead of just θ.
    this.reset();
    for (const a of ACTIONS) {
      this.b[a.id] = matVec(inverseIdentityScaled(1 / this.lambda, this.dim), snap.theta[a.id] ?? new Array(this.dim).fill(0));
      // Invert: b_a = (λI) θ_a (ridge-only assumption) → b = λ θ.
      this.b[a.id] = (snap.theta[a.id] ?? new Array(this.dim).fill(0)).map((t) => t * this.lambda);
      this.pulls[a.id] = snap.pulls[a.id] ?? 0;
      this.cumReward[a.id] = (snap.meanReward[a.id] ?? 0) * (snap.pulls[a.id] ?? 0);
    }
    this.version = snap.version;
  }

  // --------------------------------------------------------------------------
  // Private
  // --------------------------------------------------------------------------

  private initArm(id: string): void {
    this.Ainv[id] = inverseIdentityScaled(1 / this.lambda, this.dim);
    this.b[id] = new Array(this.dim).fill(0);
    this.pulls[id] = 0;
    this.cumReward[id] = 0;
  }

  private thetaOf(id: string): number[] {
    return matVec(this.Ainv[id], this.b[id]);
  }

  private contextVector(state: RLState): number[] {
    const x = embed(state.features); // 7-dim
    const raErr = state.lastOutcome
      ? clamp(
          (state.lastOutcome.actual_ra_um - state.target.target_ra_um) /
            Math.max(state.target.target_ra_um, 1e-6),
          -2, 2,
        )
      : 0;
    const mrrErr = state.lastOutcome
      ? clamp(
          (state.lastOutcome.actual_mrr_mm3_per_min -
            state.target.target_mrr_mm3_per_min) /
            Math.max(state.target.target_mrr_mm3_per_min, 1e-6),
          -2, 2,
        )
      : 0;
    return [...x, raErr, mrrErr];
  }

  private applyAction(base: WEDMRecipe, action: RLAction): WEDMRecipe {
    return {
      ...base,
      peak_current_A: round3(
        Math.max(0.1, base.peak_current_A + action.dIp * STEP_IP_A),
      ),
      pulse_on_us: round3(
        Math.max(0.1, base.pulse_on_us + action.dTon * STEP_TON_US),
      ),
    };
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

export const wedmRLControllerEngine = new WEDMRLControllerEngine();

// ============================================================================
// HELPERS
// ============================================================================

function dot(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

function matVec(M: number[][], v: number[]): number[] {
  const n = M.length;
  const out = new Array(n).fill(0) as number[];
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let j = 0; j < v.length; j++) s += M[i][j] * v[j];
    out[i] = s;
  }
  return out;
}

function outerProduct(u: number[], v: number[]): number[][] {
  const n = u.length, m = v.length;
  const out: number[][] = Array.from({ length: n }, () => new Array(m).fill(0));
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) out[i][j] = u[i] * v[j];
  return out;
}

function inverseIdentityScaled(value: number, n: number): number[][] {
  // Returns value · I_n.  (Inverse of (1/value) · I_n = value · I_n.)
  const out: number[][] = Array.from({ length: n }, (_, i) =>
    new Array(n).fill(0).map((_, j) => (i === j ? value : 0)),
  );
  return out;
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

function round3(x: number): number {
  return Math.round(x * 1000) / 1000;
}
function round4(x: number): number {
  return Math.round(x * 10000) / 10000;
}

// ============================================================================
// EXPORTS
// ============================================================================

export { ACTIONS as WEDM_RL_ACTIONS };
