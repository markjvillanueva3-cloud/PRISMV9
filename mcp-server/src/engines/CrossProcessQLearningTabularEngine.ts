/**
 * CrossProcessQLearningTabularEngine — XPROC-NEURAL Tier 4 (T4-03)
 *
 * Tabular Q-learning (Watkins 1989; Sutton & Barto §6.5). Off-policy
 * temporal-difference control over discrete (state, action) pairs.
 *
 *   Q-learning update rule:
 *     Q(s, a) ← Q(s, a) + α · [r + γ · max_{a'} Q(s', a') − Q(s, a)]
 *
 * Where:
 *   α    = learning rate ∈ (0, 1]
 *   γ    = discount factor ∈ [0, 1]
 *   r    = immediate reward from T4-01
 *   s'   = next state (or null for terminal — in which case max term is 0)
 *
 * Q-learning vs PolicyGradient (T4-02):
 *   - Q-learning is OFF-POLICY: learns the optimal greedy policy regardless
 *     of the behavior policy used to generate experience. PG is on-policy.
 *   - Q-learning converges in tabular settings with high probability under
 *     standard assumptions (Watkins & Dayan 1992 convergence proof).
 *   - PG handles continuous actions naturally; Q-learning needs DQN for
 *     state spaces too large for the table.
 *
 * Tabular bound (per XPROC-NEURAL-ROADMAP.md Tier 4 R3):
 *   Capacity ≤ MAX_STATE_ACTION_PAIRS = 1000. When the table is full and a
 *   new (s, a) pair would be added, we either:
 *     (a) reject with capacity_exceeded (caller must reset or upgrade to
 *         function approximation T4-02 PG / DQN extension);
 *     (b) replace least-recently-updated pair if `evictLRU=true` is set.
 *   Default is (a) — explicit failure prevents silent learning loss.
 *
 * Exploration:
 *   ε-greedy: with probability ε, sample uniform random action; otherwise
 *   greedy argmax. ε is supplied per-call (no schedule — caller controls
 *   exploration decay externally based on episode count).
 *
 * Failure modes covered:
 *   1. Unknown state on argmax → returns null (caller decides default policy)
 *   2. NaN/Infinity reward → invalid_input
 *   3. Empty action space → invalid_input
 *   4. α ≤ 0 → invalid_input (no learning); α > 1 → invalid_input (oscillation)
 *   5. γ < 0 or > 1 → invalid_input
 *   6. Capacity exceeded → capacity_exceeded with eviction option
 *   7. Negative action indices → invalid_input
 *   8. Terminal next-state encoding (nextState=null) → max term forced to 0
 *
 * Acceptance (per XPROC-NEURAL-ROADMAP.md Tier 4 R3):
 *   converges to optimal in 100 episodes on synthetic env. Verified using
 *   a 5-state chain MDP where the optimal policy is "always go right".
 *
 * @module CrossProcessQLearningTabularEngine
 */

import { z } from "zod";

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_ALPHA = 0.1;
const DEFAULT_GAMMA = 0.95;
const DEFAULT_EPSILON = 0.1;

/** Tabular bound — beyond this, caller should switch to function approx. */
const MAX_STATE_ACTION_PAIRS = 1000;

/** Maximum action-space size to prevent runaway memory. */
const MAX_ACTIONS = 256;

// ============================================================================
// Schemas
// ============================================================================

const UpdateInputSchema = z.object({
  state: z.string().min(1).max(256),
  action: z.number().int().nonnegative().max(MAX_ACTIONS),
  reward: z.number().finite(),
  nextState: z.string().min(1).max(256).nullable(),
  numActionsNext: z.number().int().positive().max(MAX_ACTIONS).optional(),
  alpha: z.number().positive().max(1).default(DEFAULT_ALPHA),
  gamma: z.number().min(0).max(1).default(DEFAULT_GAMMA),
  evictLRU: z.boolean().default(false),
});

const ArgmaxInputSchema = z.object({
  state: z.string().min(1).max(256),
  numActions: z.number().int().positive().max(MAX_ACTIONS),
});

const EpsilonGreedyInputSchema = z.object({
  state: z.string().min(1).max(256),
  numActions: z.number().int().positive().max(MAX_ACTIONS),
  epsilon: z.number().min(0).max(1).default(DEFAULT_EPSILON),
});

const ConfigureSchema = z.object({
  alpha: z.number().positive().max(1).optional(),
  gamma: z.number().min(0).max(1).optional(),
  epsilon: z.number().min(0).max(1).optional(),
});

// ============================================================================
// Public types
// ============================================================================

export interface QLearningParams {
  alpha: number;
  gamma: number;
  epsilon: number;
}

export interface UpdateOk {
  ok: true;
  oldQ: number;
  newQ: number;
  tdError: number;
  tableSize: number;
  evicted: { state: string; action: number } | null;
}

export interface ArgmaxOk {
  ok: true;
  result: {
    action: number | null;
    qValues: number[] | null;
    isFirstEncounter: boolean;
  };
}

export interface EpsilonGreedyOk {
  ok: true;
  result: {
    action: number;
    isExploration: boolean;
    qValues: number[];
  };
}

export interface OpErr {
  ok: false;
  error: "invalid_input" | "capacity_exceeded";
  message: string;
}

export type UpdateResult = UpdateOk | OpErr;
export type ArgmaxResult = ArgmaxOk | OpErr;
export type EpsilonGreedyResult = EpsilonGreedyOk | OpErr;

// ============================================================================
// Engine state
// ============================================================================

interface EngineState {
  /** Q-table: state → action → Q-value. */
  q: Map<string, Map<number, number>>;
  /** Last-update timestamp per (state, action) — for LRU eviction. */
  lastUpdated: Map<string, number>;
  /** Total state-action pairs currently in table. */
  pairCount: number;
  /** Monotonic counter for LRU ordering. */
  counter: number;
  params: QLearningParams;
}

function freshState(): EngineState {
  return {
    q: new Map(),
    lastUpdated: new Map(),
    pairCount: 0,
    counter: 0,
    params: { alpha: DEFAULT_ALPHA, gamma: DEFAULT_GAMMA, epsilon: DEFAULT_EPSILON },
  };
}

let state: EngineState = freshState();

// ============================================================================
// Helpers
// ============================================================================

function pairKey(s: string, a: number): string {
  return `${s}|${a}`;
}

function getQ(s: string, a: number): number {
  return state.q.get(s)?.get(a) ?? 0;
}

function maxQOver(s: string, numActions: number): number {
  const inner = state.q.get(s);
  if (!inner) return 0;  // unseen state → all actions Q=0 → max=0
  let max = -Infinity;
  for (let a = 0; a < numActions; a++) {
    const q = inner.get(a) ?? 0;
    if (q > max) max = q;
  }
  return max === -Infinity ? 0 : max;
}

function evictLRUPair(): { state: string; action: number } | null {
  let oldestKey: string | null = null;
  let oldestTime = Infinity;
  for (const [k, t] of state.lastUpdated) {
    if (t < oldestTime) {
      oldestTime = t;
      oldestKey = k;
    }
  }
  if (oldestKey === null) return null;
  const idx = oldestKey.lastIndexOf("|");
  const s = oldestKey.slice(0, idx);
  const a = parseInt(oldestKey.slice(idx + 1), 10);
  const inner = state.q.get(s);
  if (inner) {
    inner.delete(a);
    if (inner.size === 0) state.q.delete(s);
  }
  state.lastUpdated.delete(oldestKey);
  state.pairCount--;
  return { state: s, action: a };
}

// ============================================================================
// Public API
// ============================================================================

export class CrossProcessQLearningTabularEngine {
  static readonly tier = "T4-03";

  /**
   * Apply one Q-learning update.
   *   Q(s,a) ← Q(s,a) + α · [r + γ · max Q(s',·) − Q(s,a)]
   * Pass nextState=null for terminal transitions (max term forced to 0).
   */
  static update(input: unknown): UpdateResult {
    const parsed = UpdateInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "invalid_input",
        message: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      };
    }
    const { state: s, action, reward, nextState, numActionsNext, alpha, gamma, evictLRU } = parsed.data;
    if (!Number.isFinite(reward)) {
      return { ok: false, error: "invalid_input", message: "reward must be finite" };
    }

    const key = pairKey(s, action);
    const isNewPair = !state.lastUpdated.has(key);
    let evicted: { state: string; action: number } | null = null;

    if (isNewPair && state.pairCount >= MAX_STATE_ACTION_PAIRS) {
      if (!evictLRU) {
        return {
          ok: false,
          error: "capacity_exceeded",
          message: `table at MAX_STATE_ACTION_PAIRS=${MAX_STATE_ACTION_PAIRS}; pass evictLRU=true to allow eviction`,
        };
      }
      evicted = evictLRUPair();
    }

    const oldQ = getQ(s, action);
    const maxNext = nextState === null
      ? 0  // terminal — no future reward
      : maxQOver(nextState, numActionsNext ?? MAX_ACTIONS);
    const tdTarget = reward + gamma * maxNext;
    const tdError = tdTarget - oldQ;
    const newQ = oldQ + alpha * tdError;

    let inner = state.q.get(s);
    if (!inner) {
      inner = new Map();
      state.q.set(s, inner);
    }
    inner.set(action, newQ);
    if (isNewPair) state.pairCount++;
    state.counter++;
    state.lastUpdated.set(key, state.counter);

    return {
      ok: true,
      oldQ,
      newQ,
      tdError,
      tableSize: state.pairCount,
      evicted,
    };
  }

  /**
   * Greedy action selection — argmax_a Q(s, a). Returns null action when
   * state is unseen (all Q=0, no preference; caller decides default).
   */
  static argmax(input: unknown): ArgmaxResult {
    const parsed = ArgmaxInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "invalid_input",
        message: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      };
    }
    const { state: s, numActions } = parsed.data;
    const inner = state.q.get(s);
    if (!inner) {
      return {
        ok: true,
        result: { action: null, qValues: null, isFirstEncounter: true },
      };
    }
    const qValues: number[] = [];
    let bestAction = 0;
    let bestQ = -Infinity;
    for (let a = 0; a < numActions; a++) {
      const q = inner.get(a) ?? 0;
      qValues.push(q);
      if (q > bestQ) {
        bestQ = q;
        bestAction = a;
      }
    }
    return {
      ok: true,
      result: { action: bestAction, qValues, isFirstEncounter: false },
    };
  }

  /**
   * ε-greedy action selection: random with probability ε, argmax otherwise.
   * For unseen states with all Q=0, falls back to uniform-random.
   */
  static epsilonGreedy(input: unknown): EpsilonGreedyResult {
    const parsed = EpsilonGreedyInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "invalid_input",
        message: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      };
    }
    const { state: s, numActions, epsilon } = parsed.data;
    const inner = state.q.get(s);
    const qValues: number[] = [];
    for (let a = 0; a < numActions; a++) qValues.push(inner?.get(a) ?? 0);
    const isExplore = Math.random() < epsilon;
    let action: number;
    if (isExplore || !inner) {
      action = Math.floor(Math.random() * numActions);
    } else {
      let best = 0;
      let bestQ = -Infinity;
      for (let a = 0; a < numActions; a++) {
        if (qValues[a] > bestQ) { bestQ = qValues[a]; best = a; }
      }
      action = best;
    }
    return {
      ok: true,
      result: { action, isExploration: isExplore, qValues },
    };
  }

  /** Inspect Q-row for a state (for diagnostics). */
  static getQRow(state_: string, numActions: number): number[] | null {
    const inner = state.q.get(state_);
    if (!inner) return null;
    const out: number[] = [];
    for (let a = 0; a < numActions; a++) out.push(inner.get(a) ?? 0);
    return out;
  }

  static configure(input: unknown): QLearningParams {
    const parsed = ConfigureSchema.safeParse(input);
    if (parsed.success) {
      if (parsed.data.alpha !== undefined) state.params.alpha = parsed.data.alpha;
      if (parsed.data.gamma !== undefined) state.params.gamma = parsed.data.gamma;
      if (parsed.data.epsilon !== undefined) state.params.epsilon = parsed.data.epsilon;
    }
    return { ...state.params };
  }

  static reset(): void {
    state = freshState();
  }

  static stats(): {
    numStates: number;
    numStateActionPairs: number;
    capacity: number;
  } {
    return {
      numStates: state.q.size,
      numStateActionPairs: state.pairCount,
      capacity: MAX_STATE_ACTION_PAIRS,
    };
  }

  static constants(): {
    DEFAULT_ALPHA: number;
    DEFAULT_GAMMA: number;
    DEFAULT_EPSILON: number;
    MAX_STATE_ACTION_PAIRS: number;
    MAX_ACTIONS: number;
  } {
    return { DEFAULT_ALPHA, DEFAULT_GAMMA, DEFAULT_EPSILON, MAX_STATE_ACTION_PAIRS, MAX_ACTIONS };
  }
}

export const crossProcessQLearningTabularEngine = CrossProcessQLearningTabularEngine;

export function crossProcessQLearningTabular(
  action: string,
  params: Record<string, unknown>,
): unknown {
  switch (action) {
    case "xproc_qlearn_update":
      return CrossProcessQLearningTabularEngine.update(params);
    case "xproc_qlearn_argmax":
      return CrossProcessQLearningTabularEngine.argmax(params);
    case "xproc_qlearn_epsilon_greedy":
      return CrossProcessQLearningTabularEngine.epsilonGreedy(params);
    case "xproc_qlearn_get_q_row": {
      const s = (params as { state?: unknown }).state;
      const n = (params as { numActions?: unknown }).numActions;
      if (typeof s !== "string") throw new Error("xproc_qlearn_get_q_row: 'state' must be a string");
      if (typeof n !== "number") throw new Error("xproc_qlearn_get_q_row: 'numActions' must be a number");
      return CrossProcessQLearningTabularEngine.getQRow(s, n);
    }
    case "xproc_qlearn_configure":
      return CrossProcessQLearningTabularEngine.configure(params);
    case "xproc_qlearn_reset":
      CrossProcessQLearningTabularEngine.reset();
      return { ok: true };
    case "xproc_qlearn_stats":
      return CrossProcessQLearningTabularEngine.stats();
    case "xproc_qlearn_constants":
      return CrossProcessQLearningTabularEngine.constants();
    default:
      throw new Error(`crossProcessQLearningTabular: unknown action '${action}'`);
  }
}
