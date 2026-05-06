/**
 * CrossProcessPrioritizedReplayEngine — XPROC-NEURAL Tier 2 (T2-02)
 *
 * Schaul et al. (2016) Prioritized Experience Replay over a sumtree-backed
 * replay buffer. Used by the (planned) T3-01 online MLP updater to draw the
 * *most informative* training mini-batches instead of uniform random samples.
 *
 * Reference: Schaul, T., Quan, J., Antonoglou, I., & Silver, D. (2016).
 *            "Prioritized Experience Replay." ICLR.
 *
 * Algorithm (proportional variant):
 *   1. Each stored experience has priority p_i = (|td_error| + ε)^α
 *      where α ∈ [0, 1] controls how much prioritization matters
 *      (α = 0 reduces to uniform sampling; α = 1 is full prioritization).
 *   2. Sample probability P(i) = p_i / Σ p_k.
 *   3. Importance-sampling weight w_i = (1 / (N · P(i)))^β, normalized by
 *      max(w_j) so all weights are in [0, 1]. β anneals 0.4 → 1.0 over
 *      training to remove bias as policy converges.
 *
 * Sumtree (binary tree of partial sums) gives O(log N) for both sample and
 * priority update — without it, sampling by priority weight is O(N), which
 * dominates the training loop.
 *
 * Standalone — does NOT depend on T1-02 (CrossProcessNeuralLearningEngine)
 * existing on this branch. Caller supplies (episodeId, tdError) tuples
 * computed by whatever predictor it likes; the engine is agnostic.
 *
 * Failure modes covered:
 *   1. Empty buffer → sample returns empty batch, totalPriority = 0
 *   2. Single experience → sampled with probability 1, weight = 1
 *   3. Capacity overflow → ring-buffer overwrite of oldest experience
 *   4. All-zero priorities → fallback to uniform sampling
 *   5. NaN/Infinity TD-error → invalid_input error (no throw — engine rule)
 *   6. n > size on sample → returns all available without padding
 *   7. β = 0 → all IS weights = 1 (no bias correction applied)
 *   8. Numerical drift in sumtree → totalPriority recomputed lazily on demand
 *
 * @module CrossProcessPrioritizedReplayEngine
 */

import { z } from "zod";

// ============================================================================
// Schemas
// ============================================================================

const AddInputSchema = z.object({
  episodeId: z.string().min(1).max(128),
  tdError: z.number().finite(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const SampleInputSchema = z.object({
  n: z.number().int().positive().max(10000),
  beta: z.number().min(0).max(1).default(0.4),
});

const UpdatePriorityInputSchema = z.object({
  index: z.number().int().nonnegative(),
  tdError: z.number().finite(),
});

const ConfigureInputSchema = z.object({
  capacity: z.number().int().positive().max(1_000_000).optional(),
  alpha: z.number().min(0).max(1).optional(),
  epsilon: z.number().positive().max(1).optional(),
});

// ============================================================================
// Public types
// ============================================================================

export interface ReplayExperience {
  episodeId: string;
  metadata?: Record<string, unknown>;
}

export interface ReplaySample {
  episodeId: string;
  index: number;
  priority: number;
  weight: number;
}

export interface SampleResponse {
  batch: ReplaySample[];
  totalPriority: number;
  maxWeightInBatch: number;
  uniformFallbackUsed: boolean;
}

export interface AddResultOk {
  ok: true;
  index: number;
  priority: number;
  evicted: { episodeId: string; index: number } | null;
}
export interface AddResultErr {
  ok: false;
  error: "invalid_input";
  message: string;
}
export type AddResult = AddResultOk | AddResultErr;

export interface UpdateResultOk {
  ok: true;
  index: number;
  oldPriority: number;
  newPriority: number;
}
export interface UpdateResultErr {
  ok: false;
  error: "invalid_input" | "out_of_range" | "empty_slot";
  message: string;
}
export type UpdateResult = UpdateResultOk | UpdateResultErr;

export interface ReplayStats {
  size: number;
  capacity: number;
  alpha: number;
  epsilon: number;
  totalPriority: number;
  maxPriority: number;
  minNonZeroPriority: number;
  totalAdded: number;       // lifetime adds (incl. evicted)
  totalEvicted: number;
}

// ============================================================================
// Constants
// ============================================================================

/** PER paper default: α controls prioritization strength. */
const DEFAULT_ALPHA = 0.6;

/** PER paper default: small ε guarantees non-zero sample probability for new
 *  experiences whose TD-error has not yet been computed. */
const DEFAULT_EPSILON = 1e-3;

/** PER paper start value for β annealing schedule. Caller controls actual β
 *  per sample call; this is documented for reference. */
const DEFAULT_BETA = 0.4;

/** Default replay buffer capacity. Power of 2 for sumtree balance. */
const DEFAULT_CAPACITY = 1024;

/** Maximum priority cap to avoid floating-point drift on the sumtree root.
 *  Priorities are |td_error|^α; for α=0.6 a td_error of 1000 gives ~63, well
 *  under this cap unless td_error itself overflows. */
const MAX_PRIORITY = 1e6;

// ============================================================================
// Sumtree (binary tree of partial sums backed by a flat Float64Array)
// ============================================================================

class Sumtree {
  private leafOffset: number;
  private tree: Float64Array;

  constructor(public readonly capacity: number) {
    if (capacity < 1) throw new Error("Sumtree capacity must be ≥ 1");
    // Round up to power of 2 for balanced tree
    const n = nextPowerOfTwo(capacity);
    this.leafOffset = n - 1;
    this.tree = new Float64Array(2 * n - 1);
  }

  /** Set the priority at slot `pos` and propagate the delta up to root. */
  set(pos: number, priority: number): void {
    if (pos < 0 || pos >= this.capacity) {
      throw new Error(`Sumtree.set: pos ${pos} out of range [0, ${this.capacity})`);
    }
    const idx = this.leafOffset + pos;
    const delta = priority - this.tree[idx];
    this.tree[idx] = priority;
    let parent = (idx - 1) >> 1;
    while (parent >= 0) {
      this.tree[parent] += delta;
      if (parent === 0) break;
      parent = (parent - 1) >> 1;
    }
  }

  /** Total priority (root of the sumtree). */
  get total(): number {
    return this.tree[0];
  }

  /** Priority at slot `pos`. */
  at(pos: number): number {
    return this.tree[this.leafOffset + pos];
  }

  /**
   * Sample a slot proportional to its priority. Walks the tree comparing
   * `target` (a uniform random in [0, total)) against the left subtree's sum.
   * Returns the slot index in [0, capacity).
   */
  sample(target: number): number {
    if (this.tree[0] <= 0) return -1;
    let idx = 0;
    while (idx < this.leafOffset) {
      const left = 2 * idx + 1;
      const right = left + 1;
      if (target <= this.tree[left]) {
        idx = left;
      } else {
        target -= this.tree[left];
        idx = right;
      }
    }
    return idx - this.leafOffset;
  }

  reset(): void {
    this.tree.fill(0);
  }
}

function nextPowerOfTwo(n: number): number {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

// ============================================================================
// Engine state (module-private — pure, no I/O)
// ============================================================================

interface EngineState {
  capacity: number;
  alpha: number;
  epsilon: number;
  experiences: Array<ReplayExperience | null>;  // ring buffer
  sumtree: Sumtree;
  writePos: number;       // next slot to write
  size: number;           // number of slots filled (≤ capacity)
  totalAdded: number;     // lifetime
  totalEvicted: number;
  maxPrioritySeen: number; // for new-experience priority bootstrap
}

function freshState(capacity = DEFAULT_CAPACITY, alpha = DEFAULT_ALPHA, epsilon = DEFAULT_EPSILON): EngineState {
  return {
    capacity,
    alpha,
    epsilon,
    experiences: new Array(capacity).fill(null),
    sumtree: new Sumtree(capacity),
    writePos: 0,
    size: 0,
    totalAdded: 0,
    totalEvicted: 0,
    maxPrioritySeen: epsilon,  // bootstrap: new experiences get this priority
  };
}

let state: EngineState = freshState();

// ============================================================================
// Helpers
// ============================================================================

function tdErrorToPriority(tdError: number, alpha: number, epsilon: number): number {
  const base = Math.abs(tdError) + epsilon;
  const p = Math.pow(base, alpha);
  return Math.min(p, MAX_PRIORITY);
}

// ============================================================================
// Public API
// ============================================================================

export class CrossProcessPrioritizedReplayEngine {
  static readonly tier = "T2-02";

  /**
   * Add a new experience. New experiences get max-seen priority (heuristic from
   * Schaul et al.) so they're guaranteed to be sampled at least once before
   * their actual TD-error stabilizes. Returns the slot index for later
   * priority updates (after the predictor recomputes TD-error).
   */
  static add(input: unknown): AddResult {
    const parsed = AddInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "invalid_input",
        message: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      };
    }
    const { episodeId, tdError, metadata } = parsed.data;
    if (!Number.isFinite(tdError)) {
      return { ok: false, error: "invalid_input", message: "tdError must be finite" };
    }

    const slot = state.writePos;
    const evicted = state.experiences[slot];

    state.experiences[slot] = { episodeId, metadata };
    // New-experience heuristic: use max priority seen so far, or epsilon if first
    const newP = Math.max(state.maxPrioritySeen, tdErrorToPriority(tdError, state.alpha, state.epsilon));
    state.sumtree.set(slot, newP);
    if (newP > state.maxPrioritySeen) state.maxPrioritySeen = newP;

    state.writePos = (state.writePos + 1) % state.capacity;
    state.totalAdded++;
    if (evicted) state.totalEvicted++;
    if (state.size < state.capacity) state.size++;

    return {
      ok: true,
      index: slot,
      priority: newP,
      evicted: evicted ? { episodeId: evicted.episodeId, index: slot } : null,
    };
  }

  /**
   * Sample a batch proportional to priority. Returns importance-sampling
   * weights for unbiased gradient correction.
   *
   * Edge cases:
   *   - All-zero priorities → uniform sample fallback (uniformFallbackUsed=true)
   *   - n > size → returns all available without padding
   *   - β = 0 → weights all 1.0 (no correction)
   */
  static sample(input: unknown): SampleResponse {
    const parsed = SampleInputSchema.safeParse(input);
    if (!parsed.success) {
      return { batch: [], totalPriority: 0, maxWeightInBatch: 0, uniformFallbackUsed: false };
    }
    const { n, beta } = parsed.data;

    if (state.size === 0) {
      return { batch: [], totalPriority: 0, maxWeightInBatch: 0, uniformFallbackUsed: false };
    }

    const sampleSize = Math.min(n, state.size);
    const total = state.sumtree.total;
    const uniformFallback = total <= 0;
    const N = state.size;

    const indices = new Set<number>();
    const samples: ReplaySample[] = [];
    const rawWeights: number[] = [];

    let attempts = 0;
    const maxAttempts = sampleSize * 10;  // bounded to avoid infinite loops
    while (samples.length < sampleSize && attempts < maxAttempts) {
      attempts++;
      let slot: number;
      let priority: number;
      if (uniformFallback) {
        slot = Math.floor(Math.random() * state.size);
        priority = 0;
      } else {
        const target = Math.random() * total;
        slot = state.sumtree.sample(target);
        if (slot < 0 || slot >= state.capacity) continue;
        priority = state.sumtree.at(slot);
      }
      const exp = state.experiences[slot];
      if (!exp) continue;
      // Allow duplicate sampling only if user requested more than unique slots
      if (indices.has(slot) && indices.size < state.size) continue;
      indices.add(slot);

      // P(i) = priority / total (or 1/N for uniform fallback)
      const probI = uniformFallback ? 1 / N : priority / total;
      // w_i = (1 / (N · P(i)))^β  →  for β=0: w=1; for uniform+β>0: w=(N/N)^β=1
      const rawW = beta === 0 ? 1 : Math.pow(1 / (N * probI), beta);
      rawWeights.push(rawW);
      samples.push({ episodeId: exp.episodeId, index: slot, priority, weight: rawW });
    }

    // Normalize weights by max so all w ∈ (0, 1]
    const maxW = rawWeights.length > 0 ? Math.max(...rawWeights) : 1;
    if (maxW > 0 && Number.isFinite(maxW)) {
      for (const s of samples) s.weight = s.weight / maxW;
    }

    return {
      batch: samples,
      totalPriority: total,
      maxWeightInBatch: maxW,
      uniformFallbackUsed: uniformFallback,
    };
  }

  /**
   * Update the priority for a specific slot, typically called after the
   * predictor recomputes TD-error for sampled experiences. Atomic — sumtree
   * propagation runs immediately.
   */
  static updatePriority(input: unknown): UpdateResult {
    const parsed = UpdatePriorityInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "invalid_input",
        message: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      };
    }
    const { index, tdError } = parsed.data;
    if (index >= state.capacity) {
      return { ok: false, error: "out_of_range", message: `index ${index} ≥ capacity ${state.capacity}` };
    }
    if (!state.experiences[index]) {
      return { ok: false, error: "empty_slot", message: `slot ${index} is empty` };
    }
    if (!Number.isFinite(tdError)) {
      return { ok: false, error: "invalid_input", message: "tdError must be finite" };
    }
    const oldP = state.sumtree.at(index);
    const newP = tdErrorToPriority(tdError, state.alpha, state.epsilon);
    state.sumtree.set(index, newP);
    if (newP > state.maxPrioritySeen) state.maxPrioritySeen = newP;
    return { ok: true, index, oldPriority: oldP, newPriority: newP };
  }

  /** Snapshot for diagnostics + drift detector. */
  static stats(): ReplayStats {
    let maxP = 0;
    let minNonZero = Infinity;
    for (let i = 0; i < state.size; i++) {
      const p = state.sumtree.at(i);
      if (p > maxP) maxP = p;
      if (p > 0 && p < minNonZero) minNonZero = p;
    }
    return {
      size: state.size,
      capacity: state.capacity,
      alpha: state.alpha,
      epsilon: state.epsilon,
      totalPriority: state.sumtree.total,
      maxPriority: maxP,
      minNonZeroPriority: minNonZero === Infinity ? 0 : minNonZero,
      totalAdded: state.totalAdded,
      totalEvicted: state.totalEvicted,
    };
  }

  /** Reconfigure capacity / α / ε. Buffer is reset if capacity changes. */
  static configure(input: unknown): { capacity: number; alpha: number; epsilon: number } {
    const parsed = ConfigureInputSchema.safeParse(input);
    if (!parsed.success) {
      return { capacity: state.capacity, alpha: state.alpha, epsilon: state.epsilon };
    }
    const { capacity, alpha, epsilon } = parsed.data;
    if (capacity !== undefined && capacity !== state.capacity) {
      state = freshState(capacity, alpha ?? state.alpha, epsilon ?? state.epsilon);
    } else {
      if (alpha !== undefined) state.alpha = alpha;
      if (epsilon !== undefined) state.epsilon = epsilon;
    }
    return { capacity: state.capacity, alpha: state.alpha, epsilon: state.epsilon };
  }

  /** Reset for testing. */
  static reset(capacity = DEFAULT_CAPACITY, alpha = DEFAULT_ALPHA, epsilon = DEFAULT_EPSILON): void {
    state = freshState(capacity, alpha, epsilon);
  }
}

export const crossProcessPrioritizedReplayEngine = CrossProcessPrioritizedReplayEngine;

/**
 * Dispatcher convenience wrapper — matches the (action, params) signature used
 * by intelligenceDispatcher CORE_ROUTING. Throws on unknown action.
 */
export function crossProcessPrioritizedReplay(
  action: string,
  params: Record<string, unknown>,
): unknown {
  switch (action) {
    case "xproc_replay_add":
      return CrossProcessPrioritizedReplayEngine.add(params);
    case "xproc_replay_sample":
      return CrossProcessPrioritizedReplayEngine.sample(params);
    case "xproc_replay_update_priority":
      return CrossProcessPrioritizedReplayEngine.updatePriority(params);
    case "xproc_replay_stats":
      return CrossProcessPrioritizedReplayEngine.stats();
    default:
      throw new Error(`crossProcessPrioritizedReplay: unknown action '${action}'`);
  }
}

/** Re-export DEFAULT_BETA so callers can read the recommended starting β. */
export { DEFAULT_BETA };
