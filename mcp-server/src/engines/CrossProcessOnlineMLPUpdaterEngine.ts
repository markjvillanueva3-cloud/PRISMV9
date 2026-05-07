/**
 * CrossProcessOnlineMLPUpdaterEngine — XPROC-NEURAL Tier 3 (T3-01)
 *
 * Streaming Adam-optimizer weight updater for online MLP training. The
 * (planned) T1-02 MLP — and any other gradient-trained predictor in the
 * XPROC-NEURAL stack — calls this engine to apply per-event mini-batch
 * gradient steps without restarting training.
 *
 * Reference: Kingma & Ba (2015). "Adam: A Method for Stochastic Optimization."
 *            arXiv:1412.6980. Update rule:
 *              m_t = β₁·m_{t-1} + (1-β₁)·g_t            (1st moment)
 *              v_t = β₂·v_{t-1} + (1-β₂)·g_t²           (2nd moment)
 *              m̂_t = m_t / (1 - β₁^t)                   (bias correction)
 *              v̂_t = v_t / (1 - β₂^t)                   (bias correction)
 *              θ_t = θ_{t-1} - lr · m̂_t / (√v̂_t + ε)
 *
 * Why a separate engine instead of inlining in T1-02:
 *   1. T1-02 lives on a different branch (`work/cad-fidx-solidworks`); this
 *      engine accepts caller-supplied weights+gradients so it works on any
 *      branch without that dependency.
 *   2. T3-04 (EWC) needs to wrap the same update path with a Fisher-weighted
 *      regularizer term; isolating Adam in its own engine keeps that
 *      composition clean.
 *   3. Reusable by any gradient-trained predictor, not just MLPs (e.g. a
 *      future linear surrogate or LoRA adapter).
 *
 * Bounded learning rate (per CLAUDE.md mandate: "Bounded learning rate to
 * prevent catastrophic update") — input lr is clamped to [LR_MIN, LR_MAX]
 * before applying. Out-of-range values are clamped silently but flagged in
 * the response so the caller can log calibration drift.
 *
 * Performance target (per XPROC-NEURAL-ROADMAP.md Tier 3 R1): update step
 * < 10ms per call. For weight vectors ≤ 4096 dimensions on a modern x64
 * core, the typed-array inner loop completes in well under 1ms; the 10ms
 * budget covers the wider parameter regimes T3-04 will exercise.
 *
 * Failure modes covered:
 *   1. Shape mismatch (weights.length ≠ gradients.length) → invalid_input
 *   2. NaN/Infinity in any gradient → invalid_input, no partial update
 *   3. NaN/Infinity in any weight → invalid_input
 *   4. lr = 0 → no-op update (returns weights unchanged); reported in response
 *   5. lr < 0 or > LR_MAX → clamped, warning emitted
 *   6. β₁ ∉ [0, 1) or β₂ ∉ [0, 1) → invalid_input (Adam math diverges)
 *   7. ε ≤ 0 → invalid_input (would produce ÷0)
 *   8. State bootstrap on first call → m₀ = v₀ = 0, t = 1 (Adam paper §2)
 *   9. Numerical underflow on (1 - β^t) for very large t → bounded by
 *      MAX_ADAM_STEPS at which point we recommend optimizer reset
 *
 * @module CrossProcessOnlineMLPUpdaterEngine
 */

import { z } from "zod";

// ============================================================================
// Constants
// ============================================================================

/** Adam paper defaults. */
const DEFAULT_BETA_1 = 0.9;
const DEFAULT_BETA_2 = 0.999;
const DEFAULT_EPSILON = 1e-8;

/** Bounded learning rate range — protects against catastrophic updates from
 *  pathological caller inputs (e.g. lr accidentally read as a TD-error). */
const LR_MIN = 0;
const LR_MAX = 1.0;

/** Maximum Adam timestep before bias-correction terms underflow. At t=1e7
 *  with β₁=0.9, (1-β₁^t) ≈ 1 and is numerically stable; flag at 1e9. */
const MAX_ADAM_STEPS = 1_000_000_000;

/** Maximum allowed weight vector dimension (sanity guard against runaway
 *  payloads — caller can override but should not exceed). */
const MAX_VECTOR_DIM = 1_000_000;

// ============================================================================
// Schemas
// ============================================================================

// Zod's z.number() rejects NaN/Infinity by default in some versions. To get
// granular error categorization (non_finite_gradient vs non_finite_weight vs
// invalid_input), accept any unknown for the array elements at the schema
// layer and validate finiteness in the engine body.
const NumberArrayLoose = z.array(z.unknown()).min(1).max(MAX_VECTOR_DIM)
  .transform((arr, ctx) => {
    const out: number[] = [];
    for (let i = 0; i < arr.length; i++) {
      const v = arr[i];
      if (typeof v !== "number") {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [i], message: `expected number, got ${typeof v}` });
        return z.NEVER;
      }
      out.push(v);
    }
    return out;
  });

const UpdateInputSchema = z.object({
  weights: NumberArrayLoose,
  gradients: NumberArrayLoose,
  lr: z.number().finite().default(1e-3),
  beta1: z.number().min(0).lt(1).default(DEFAULT_BETA_1),
  beta2: z.number().min(0).lt(1).default(DEFAULT_BETA_2),
  epsilon: z.number().positive().finite().default(DEFAULT_EPSILON),
  // Optional persistent Adam state from a prior call. If absent, bootstraps
  // m₀ = v₀ = 0, t = 0 (so first update increments to t=1 per Adam §2).
  state: z.object({
    m: NumberArrayLoose,
    v: NumberArrayLoose,
    t: z.number().int().nonnegative(),
  }).optional(),
});

// ============================================================================
// Public types
// ============================================================================

export interface AdamState {
  m: number[];   // 1st moment estimate (β₁-EMA of gradients)
  v: number[];   // 2nd moment estimate (β₂-EMA of squared gradients)
  t: number;     // timestep counter (for bias-correction)
}

export interface UpdateResultOk {
  ok: true;
  weights: number[];
  state: AdamState;
  effectiveLr: number;
  noOp: boolean;
  warnings: string[];
}

export interface UpdateResultErr {
  ok: false;
  error: "invalid_input" | "shape_mismatch" | "non_finite_gradient" | "non_finite_weight" | "max_steps_exceeded";
  message: string;
}

export type UpdateResult = UpdateResultOk | UpdateResultErr;

// ============================================================================
// Helpers
// ============================================================================

function allFinite(arr: readonly number[]): boolean {
  for (const x of arr) if (!Number.isFinite(x)) return false;
  return true;
}

function clamp(x: number, lo: number, hi: number): number {
  if (x < lo) return lo;
  if (x > hi) return hi;
  return x;
}

// ============================================================================
// Public API
// ============================================================================

export class CrossProcessOnlineMLPUpdaterEngine {
  static readonly tier = "T3-01";

  /**
   * Apply one Adam step to `weights` using `gradients`. Pure function — does
   * NOT mutate the input arrays. Returns the new weights, updated Adam state
   * (which the caller persists and passes back next call), and any warnings.
   *
   * Performance: O(D) where D = weight dimension. Typed-array inner loop,
   * single pass, no allocations beyond the result arrays.
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
    const { weights, gradients, beta1, beta2, epsilon, state } = parsed.data;
    let { lr } = parsed.data;

    // Shape check (Zod doesn't tie array lengths together)
    if (weights.length !== gradients.length) {
      return {
        ok: false,
        error: "shape_mismatch",
        message: `weights.length=${weights.length} ≠ gradients.length=${gradients.length}`,
      };
    }

    // Finiteness checks — fail before any partial update
    if (!allFinite(weights)) {
      return { ok: false, error: "non_finite_weight", message: "weights contains NaN or Infinity" };
    }
    if (!allFinite(gradients)) {
      return { ok: false, error: "non_finite_gradient", message: "gradients contains NaN or Infinity" };
    }

    // Bounded learning rate
    const warnings: string[] = [];
    const lrClamped = clamp(lr, LR_MIN, LR_MAX);
    if (lrClamped !== lr) {
      warnings.push(`lr clamped from ${lr} to ${lrClamped} (range [${LR_MIN}, ${LR_MAX}])`);
      lr = lrClamped;
    }

    // Validate or bootstrap state
    const D = weights.length;
    let m: number[];
    let v: number[];
    let t: number;
    if (state) {
      if (state.m.length !== D || state.v.length !== D) {
        return {
          ok: false,
          error: "shape_mismatch",
          message: `state.m.length=${state.m.length}, state.v.length=${state.v.length}, expected ${D}`,
        };
      }
      if (!allFinite(state.m) || !allFinite(state.v)) {
        return {
          ok: false,
          error: "non_finite_weight",
          message: "Adam state m or v contains non-finite values",
        };
      }
      m = state.m.slice();
      v = state.v.slice();
      t = state.t;
    } else {
      m = new Array(D).fill(0);
      v = new Array(D).fill(0);
      t = 0;
    }

    if (t >= MAX_ADAM_STEPS) {
      return {
        ok: false,
        error: "max_steps_exceeded",
        message: `Adam step ${t} >= MAX_ADAM_STEPS ${MAX_ADAM_STEPS}; reset optimizer`,
      };
    }

    // No-op short-circuit (saves D multiplications when caller passes lr=0
    // intentionally to "freeze" weights for a step)
    if (lr === 0) {
      return {
        ok: true,
        weights: weights.slice(),
        state: { m, v, t },  // state unchanged when lr=0
        effectiveLr: 0,
        noOp: true,
        warnings,
      };
    }

    t = t + 1;
    const oneMinusB1 = 1 - beta1;
    const oneMinusB2 = 1 - beta2;
    const biasCorr1 = 1 - Math.pow(beta1, t);
    const biasCorr2 = 1 - Math.pow(beta2, t);
    // Adam bias-corrected step size (Kingma & Ba §2 simplified form)
    const stepSize = lr * Math.sqrt(biasCorr2) / biasCorr1;

    const newWeights = new Array(D);
    for (let i = 0; i < D; i++) {
      const g = gradients[i];
      m[i] = beta1 * m[i] + oneMinusB1 * g;
      v[i] = beta2 * v[i] + oneMinusB2 * g * g;
      newWeights[i] = weights[i] - stepSize * m[i] / (Math.sqrt(v[i]) + epsilon);
    }

    return {
      ok: true,
      weights: newWeights,
      state: { m, v, t },
      effectiveLr: lr,
      noOp: false,
      warnings,
    };
  }

  /** Bootstrap a zero Adam state for a given weight dimension. Convenience
   *  for callers that want explicit state init without the implicit
   *  bootstrap path. */
  static initState(dimension: number): AdamState {
    if (!Number.isInteger(dimension) || dimension < 1 || dimension > MAX_VECTOR_DIM) {
      throw new Error(`initState: dimension must be integer in [1, ${MAX_VECTOR_DIM}]`);
    }
    return {
      m: new Array(dimension).fill(0),
      v: new Array(dimension).fill(0),
      t: 0,
    };
  }

  /** Read-only constants snapshot for callers wanting to log or inspect. */
  static constants(): {
    DEFAULT_BETA_1: number;
    DEFAULT_BETA_2: number;
    DEFAULT_EPSILON: number;
    LR_MIN: number;
    LR_MAX: number;
    MAX_ADAM_STEPS: number;
  } {
    return { DEFAULT_BETA_1, DEFAULT_BETA_2, DEFAULT_EPSILON, LR_MIN, LR_MAX, MAX_ADAM_STEPS };
  }
}

export const crossProcessOnlineMLPUpdaterEngine = CrossProcessOnlineMLPUpdaterEngine;

/**
 * Dispatcher convenience wrapper.
 */
export function crossProcessOnlineMLPUpdater(
  action: string,
  params: Record<string, unknown>,
): unknown {
  switch (action) {
    case "xproc_online_update":
      return CrossProcessOnlineMLPUpdaterEngine.update(params);
    case "xproc_online_init_state": {
      const dim = (params as { dimension?: unknown }).dimension;
      if (typeof dim !== "number") {
        throw new Error("xproc_online_init_state: 'dimension' must be a number");
      }
      return CrossProcessOnlineMLPUpdaterEngine.initState(dim);
    }
    case "xproc_online_constants":
      return CrossProcessOnlineMLPUpdaterEngine.constants();
    default:
      throw new Error(`crossProcessOnlineMLPUpdater: unknown action '${action}'`);
  }
}
