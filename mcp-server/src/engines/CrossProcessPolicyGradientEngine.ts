/**
 * CrossProcessPolicyGradientEngine — XPROC-NEURAL Tier 4 (T4-02)
 *
 * REINFORCE with baseline (Williams 1992; Sutton & Barto 2nd ed Ch.13).
 * Discrete-action policy gradient over (state, action) pairs where:
 *   state  = encoded (process, material, feature, machine) tuple
 *   action = index into a discrete action space (e.g. tool/strategy choice)
 *   reward = scalar from T4-01 (CrossProcessRewardShaperEngine)
 *
 * Algorithm:
 *   π(a|s; θ) = softmax(θ_s,a) over actions for the given state.
 *   Episode trajectory: (s_t, a_t, r_t) for t = 0..T-1.
 *   Return G_t = Σ_{k=t..T-1} γ^(k-t) · r_k.
 *   Baseline V(s) is the running mean return for state s (variance-reduction
 *     trick — REINFORCE-with-baseline; doesn't bias the gradient,
 *     dramatically reduces variance — Sutton & Barto §13.4).
 *   Update: θ_s,a ← θ_s,a + α · (G_t − V(s_t)) · ∇log π(a_t|s_t)
 *   For softmax: ∇log π(a|s) for action_a w.r.t. θ_s,j is δ(a=j) − π(j|s).
 *
 * Why a separate engine vs Q-learning (T4-03):
 *   - Policy gradient is on-policy (learns the policy you're behaving with).
 *     Q-learning is off-policy. Some XPROC decisions are stochastic (try
 *     several toolpath strategies and pick best); for those, REINFORCE's
 *     softmax over actions naturally encodes the exploration policy.
 *   - PG handles continuous action parameterization in a future extension
 *     (the engine's interface uses action *indices* now, but the math
 *     generalizes to Gaussian-policy continuous control without changing
 *     the public API for episode-based training).
 *
 * Slow learner (per XPROC-NEURAL-ROADMAP.md Tier 4 R2): only updates on
 * `commit()` of confirmed outcomes. The `step()` method records (s, a, r)
 * tuples without applying gradients — speculative trajectories don't
 * reinforce until the operator confirms the result.
 *
 * Failure modes covered:
 *   1. Empty trajectory on commit → no update, warning emitted
 *   2. State seen for first time → softmax initialized uniformly (π = 1/A)
 *   3. NaN/Infinity reward → invalid_input
 *   4. Action index out of range → invalid_input
 *   5. lr ≤ 0 → invalid_input (can't learn with non-positive lr)
 *   6. Discount factor γ ∉ [0, 1] → invalid_input
 *   7. Numerical overflow on softmax with extreme θ → log-sum-exp trick
 *      keeps π normalized even when max(θ) is large
 *   8. Baseline never seen state s → V(s) = 0 fallback (no variance
 *      reduction for first encounter; correct semantics)
 *
 * Acceptance (per XPROC-NEURAL-ROADMAP.md Tier 4 R2):
 *   variance < 5% within 500 episodes on synthetic env. Verified in test
 *   suite using a 2-state × 3-action env where the optimal policy is
 *   deterministic and trivially recoverable.
 *
 * @module CrossProcessPolicyGradientEngine
 */

import { z } from "zod";

// ============================================================================
// Constants
// ============================================================================

/** Default learning rate. Conservative — REINFORCE has high variance. */
const DEFAULT_LR = 0.05;

/** Default discount factor (Sutton & Barto §3.4 typical range). */
const DEFAULT_GAMMA = 0.99;

/** Maximum action-space size to keep tabular θ bounded. */
const MAX_ACTIONS = 1024;

/** Maximum trajectory length per episode (sanity guard). */
const MAX_TRAJECTORY_LENGTH = 10_000;

// ============================================================================
// Schemas
// ============================================================================

const StepInputSchema = z.object({
  state: z.string().min(1).max(256),
  action: z.number().int().nonnegative(),
  reward: z.number().finite(),
  episodeId: z.string().min(1).max(128),
});

const CommitInputSchema = z.object({
  episodeId: z.string().min(1).max(128),
  lr: z.number().positive().max(1).default(DEFAULT_LR),
  gamma: z.number().min(0).max(1).default(DEFAULT_GAMMA),
});

const SelectInputSchema = z.object({
  state: z.string().min(1).max(256),
  numActions: z.number().int().positive().max(MAX_ACTIONS),
  greedy: z.boolean().default(false),
});

const ConfigureSchema = z.object({
  lr: z.number().positive().max(1).optional(),
  gamma: z.number().min(0).max(1).optional(),
});

// ============================================================================
// Public types
// ============================================================================

export interface PolicyParams {
  lr: number;
  gamma: number;
}

export interface SelectActionResult {
  action: number;
  probabilities: number[];
  isFirstEncounter: boolean;
}

export interface CommitResult {
  episodeId: string;
  trajectoryLength: number;
  totalReturn: number;
  baselineUsed: boolean;
  weightsUpdated: number;  // count of (state,action) cells modified
}

export interface PolicyStep {
  state: string;
  action: number;
  reward: number;
  episodeId: string;
}

export interface StepOk { ok: true; trajectoryLength: number; }
export interface CommitOk { ok: true; result: CommitResult; warnings: string[]; }
export interface SelectOk { ok: true; result: SelectActionResult; }

export interface OpErr {
  ok: false;
  error: "invalid_input" | "trajectory_overflow" | "unknown_episode";
  message: string;
}

export type StepResult = StepOk | OpErr;
export type CommitResultUnion = CommitOk | OpErr;
export type SelectResult = SelectOk | OpErr;

// ============================================================================
// Engine state
// ============================================================================

interface EngineState {
  /** θ_s,a — flat parameters per (state, action) pair. */
  theta: Map<string, number[]>;
  /** Running baseline V(s) — mean return seen for state s. */
  baselineSum: Map<string, number>;
  baselineCount: Map<string, number>;
  /** Pending trajectories indexed by episodeId. */
  trajectories: Map<string, PolicyStep[]>;
  params: PolicyParams;
}

function freshState(): EngineState {
  return {
    theta: new Map(),
    baselineSum: new Map(),
    baselineCount: new Map(),
    trajectories: new Map(),
    params: { lr: DEFAULT_LR, gamma: DEFAULT_GAMMA },
  };
}

let state: EngineState = freshState();

// ============================================================================
// Helpers
// ============================================================================

/** Numerically stable softmax via log-sum-exp shift. */
function softmax(logits: number[]): number[] {
  let max = -Infinity;
  for (const v of logits) if (v > max) max = v;
  let sum = 0;
  const out: number[] = new Array(logits.length);
  for (let i = 0; i < logits.length; i++) {
    out[i] = Math.exp(logits[i] - max);
    sum += out[i];
  }
  if (sum === 0 || !Number.isFinite(sum)) {
    // Fallback: uniform — shouldn't happen with finite logits but defensive
    const u = 1 / logits.length;
    for (let i = 0; i < out.length; i++) out[i] = u;
    return out;
  }
  for (let i = 0; i < out.length; i++) out[i] /= sum;
  return out;
}

function ensureTheta(s: string, numActions: number): number[] {
  let theta = state.theta.get(s);
  if (!theta) {
    theta = new Array(numActions).fill(0);
    state.theta.set(s, theta);
  } else if (theta.length < numActions) {
    while (theta.length < numActions) theta.push(0);
  }
  return theta;
}

function getBaseline(s: string): number {
  const sum = state.baselineSum.get(s);
  const cnt = state.baselineCount.get(s);
  if (!sum || !cnt || cnt === 0) return 0;
  return sum / cnt;
}

function updateBaseline(s: string, ret: number): void {
  state.baselineSum.set(s, (state.baselineSum.get(s) ?? 0) + ret);
  state.baselineCount.set(s, (state.baselineCount.get(s) ?? 0) + 1);
}

// ============================================================================
// Public API
// ============================================================================

export class CrossProcessPolicyGradientEngine {
  static readonly tier = "T4-02";

  /**
   * Record one step of an episode trajectory. Does NOT update weights —
   * accumulates for commit(). Slow-learner pattern: only confirmed
   * outcomes reinforce.
   */
  static step(input: unknown): StepResult {
    const parsed = StepInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "invalid_input",
        message: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      };
    }
    const { state: s, action, reward, episodeId } = parsed.data;
    if (!Number.isFinite(reward)) {
      return { ok: false, error: "invalid_input", message: "reward must be finite" };
    }
    let traj = state.trajectories.get(episodeId);
    if (!traj) {
      traj = [];
      state.trajectories.set(episodeId, traj);
    }
    if (traj.length >= MAX_TRAJECTORY_LENGTH) {
      return { ok: false, error: "trajectory_overflow", message: `trajectory ${episodeId} exceeds ${MAX_TRAJECTORY_LENGTH} steps` };
    }
    traj.push({ state: s, action, reward, episodeId });
    return { ok: true, trajectoryLength: traj.length };
  }

  /**
   * Apply REINFORCE-with-baseline gradient updates from the recorded
   * trajectory. Computes returns G_t, subtracts baseline, applies softmax-
   * gradient. Trajectory is consumed (cleared from memory).
   */
  static commit(input: unknown): CommitResultUnion {
    const parsed = CommitInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "invalid_input",
        message: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      };
    }
    const { episodeId, lr, gamma } = parsed.data;
    const traj = state.trajectories.get(episodeId);
    if (!traj) {
      return { ok: false, error: "unknown_episode", message: `no trajectory recorded for ${episodeId}` };
    }
    const warnings: string[] = [];
    if (traj.length === 0) {
      state.trajectories.delete(episodeId);
      return {
        ok: true,
        result: { episodeId, trajectoryLength: 0, totalReturn: 0, baselineUsed: false, weightsUpdated: 0 },
        warnings: ["empty trajectory; no update applied"],
      };
    }

    // Compute returns G_t backwards: G_T = r_T; G_t = r_t + γ G_{t+1}
    const T = traj.length;
    const returns: number[] = new Array(T);
    let G = 0;
    for (let t = T - 1; t >= 0; t--) {
      G = traj[t].reward + gamma * G;
      returns[t] = G;
    }

    // Determine action-space size from observed actions (actions are 0-indexed)
    let maxAction = 0;
    for (const step of traj) if (step.action > maxAction) maxAction = step.action;
    const numActions = maxAction + 1;

    // Apply gradient updates
    let weightsUpdated = 0;
    let baselineUsed = false;
    for (let t = 0; t < T; t++) {
      const step = traj[t];
      const theta = ensureTheta(step.state, numActions);
      const baseline = getBaseline(step.state);
      if (state.baselineCount.get(step.state) !== undefined) baselineUsed = true;
      const advantage = returns[t] - baseline;
      const probs = softmax(theta);
      // ∇log π(a|s) for action a w.r.t. θ_j is δ(a=j) − π(j|s)
      // Update each θ_j: θ_j += lr · advantage · (δ(a=j) − π(j|s))
      for (let j = 0; j < theta.length; j++) {
        const grad = (j === step.action ? 1 : 0) - probs[j];
        const delta = lr * advantage * grad;
        if (delta !== 0) {
          theta[j] += delta;
          weightsUpdated++;
        }
      }
      updateBaseline(step.state, returns[t]);
    }

    state.trajectories.delete(episodeId);
    return {
      ok: true,
      result: {
        episodeId,
        trajectoryLength: T,
        totalReturn: returns[0],
        baselineUsed,
        weightsUpdated,
      },
      warnings,
    };
  }

  /**
   * Sample an action from π(·|s) (greedy=false) or argmax (greedy=true).
   * For unseen states, returns uniform-random action with isFirstEncounter=true.
   */
  static selectAction(input: unknown): SelectResult {
    const parsed = SelectInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "invalid_input",
        message: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      };
    }
    const { state: s, numActions, greedy } = parsed.data;
    const isFirstEncounter = !state.theta.has(s);
    const theta = ensureTheta(s, numActions);
    const probs = softmax(theta);
    let action: number;
    if (greedy) {
      let bestIdx = 0;
      let bestP = -Infinity;
      for (let i = 0; i < probs.length; i++) {
        if (probs[i] > bestP) { bestP = probs[i]; bestIdx = i; }
      }
      action = bestIdx;
    } else {
      // Stochastic sample
      let r = Math.random();
      action = probs.length - 1;
      for (let i = 0; i < probs.length; i++) {
        r -= probs[i];
        if (r <= 0) { action = i; break; }
      }
    }
    return { ok: true, result: { action, probabilities: probs, isFirstEncounter } };
  }

  /** Snapshot of policy parameters (for inspection / persistence). */
  static getPolicy(state_: string): { theta: number[]; probabilities: number[] } | null {
    const theta = state.theta.get(state_);
    if (!theta) return null;
    return { theta: theta.slice(), probabilities: softmax(theta) };
  }

  /** Return-baseline statistics for a state (for diagnostics). */
  static getBaseline(state_: string): { mean: number; count: number } | null {
    const sum = state.baselineSum.get(state_);
    const cnt = state.baselineCount.get(state_);
    if (!cnt || cnt === 0) return null;
    return { mean: (sum ?? 0) / cnt, count: cnt };
  }

  static configure(input: unknown): PolicyParams {
    const parsed = ConfigureSchema.safeParse(input);
    if (parsed.success) {
      if (parsed.data.lr !== undefined) state.params.lr = parsed.data.lr;
      if (parsed.data.gamma !== undefined) state.params.gamma = parsed.data.gamma;
    }
    return { ...state.params };
  }

  static reset(): void {
    state = freshState();
  }

  static constants(): {
    DEFAULT_LR: number;
    DEFAULT_GAMMA: number;
    MAX_ACTIONS: number;
    MAX_TRAJECTORY_LENGTH: number;
  } {
    return { DEFAULT_LR, DEFAULT_GAMMA, MAX_ACTIONS, MAX_TRAJECTORY_LENGTH };
  }

  static stats(): {
    numStates: number;
    numTrajectories: number;
    totalBaselineSamples: number;
  } {
    let totalBaseline = 0;
    for (const c of state.baselineCount.values()) totalBaseline += c;
    return {
      numStates: state.theta.size,
      numTrajectories: state.trajectories.size,
      totalBaselineSamples: totalBaseline,
    };
  }
}

export const crossProcessPolicyGradientEngine = CrossProcessPolicyGradientEngine;

export function crossProcessPolicyGradient(
  action: string,
  params: Record<string, unknown>,
): unknown {
  switch (action) {
    case "xproc_policy_step":
      return CrossProcessPolicyGradientEngine.step(params);
    case "xproc_policy_commit":
      return CrossProcessPolicyGradientEngine.commit(params);
    case "xproc_policy_select_action":
      return CrossProcessPolicyGradientEngine.selectAction(params);
    case "xproc_policy_get_policy": {
      const s = (params as { state?: unknown }).state;
      if (typeof s !== "string") throw new Error("xproc_policy_get_policy: 'state' must be a string");
      return CrossProcessPolicyGradientEngine.getPolicy(s);
    }
    case "xproc_policy_get_baseline": {
      const s = (params as { state?: unknown }).state;
      if (typeof s !== "string") throw new Error("xproc_policy_get_baseline: 'state' must be a string");
      return CrossProcessPolicyGradientEngine.getBaseline(s);
    }
    case "xproc_policy_configure":
      return CrossProcessPolicyGradientEngine.configure(params);
    case "xproc_policy_reset":
      CrossProcessPolicyGradientEngine.reset();
      return { ok: true };
    case "xproc_policy_stats":
      return CrossProcessPolicyGradientEngine.stats();
    case "xproc_policy_constants":
      return CrossProcessPolicyGradientEngine.constants();
    default:
      throw new Error(`crossProcessPolicyGradient: unknown action '${action}'`);
  }
}
