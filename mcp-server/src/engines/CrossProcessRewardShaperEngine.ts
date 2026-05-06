/**
 * CrossProcessRewardShaperEngine — XPROC-NEURAL Tier 4 (T4-01)
 *
 * Maps a CrossProcessOutcomeEvent (or any equivalent shop-floor outcome
 * tuple) → scalar reward used by T4-02 (PolicyGradient), T4-03 (QLearning),
 * and T4-04 (Bandit). The reward function is the *contract* the RL stack
 * optimizes against — getting the components and weights right is the
 * single most important RL design decision (Sutton & Barto §17.4).
 *
 * Reward components (per XPROC-NEURAL-ROADMAP.md Tier 4 R1):
 *   1. surface_finish_error  — Ra_actual / Ra_target − 1, NEGATIVE
 *      (we want Ra ≤ target; positive means under-spec; clipped to ≥−2)
 *   2. tool_life_delta       — (life_actual − life_predicted) / life_predicted
 *      POSITIVE when actual outlived prediction (good); clipped to [−1, 1]
 *   3. cycle_time_delta      — (time_predicted − time_actual) / time_predicted
 *      POSITIVE when faster than predicted; clipped to [−1, 1]
 *   4. safety_veto_count     — count of safety vetoes during operation
 *      LARGE NEGATIVE per veto (multiplied by SAFETY_VETO_PENALTY)
 *   5. operator_override_count — count of operator overrides
 *      SMALL NEGATIVE per override (less severe than vetoes; the operator
 *      may have been adjusting for shop-floor tribal knowledge we should
 *      learn FROM, not penalize harshly)
 *
 * Final reward = w_finish·finish + w_life·life + w_cycle·cycle
 *              + w_safety·(−vetoes·SAFETY_VETO_PENALTY)
 *              + w_override·(−overrides·OVERRIDE_PENALTY)
 *
 * Default weights are normalized so the data-quality components (finish,
 * life, cycle) sum to ≈1 in best-case absolute reward, and safety/override
 * dominate when fired (one veto can cancel the entire data-quality reward,
 * which is the desired signal: never produce parts when safety vetoed).
 *
 * Why a separate engine vs inlined in T4-02:
 *   1. The reward function is policy. RL agents optimize whatever reward
 *      we give them — mistakes are subtle (reward hacking, Mesh-Anomaly).
 *      Centralizing it lets us A/B-test reward designs without touching
 *      the policy gradient or Q-update math.
 *   2. T4-04 (Bandit) needs the same reward signal but with a different
 *      action space; sharing the shaper guarantees consistency.
 *   3. The audit() method exposes per-component contributions so we can
 *      debug "why did the policy converge to X?" — essential for shop-
 *      floor governance (operator-in-the-loop mandate).
 *
 * Failure modes covered:
 *   1. Empty event → returns 0 reward + warning
 *   2. NaN/Infinity in any component → invalid_input
 *   3. Negative life or cycle time (impossible) → invalid_input
 *   4. Ra_target = 0 → invalid_input (would produce ÷0)
 *   5. Negative weights → Zod gate (would invert reward direction)
 *   6. Component magnitudes outside [-CLIP, CLIP] → clipped, not rejected
 *      (real shop-floor data has outliers; we don't want a single bad
 *      outcome to dominate gradient updates)
 *   7. Missing component fields → treated as 0 (graceful default —
 *      partial outcome data is better than no learning signal)
 *
 * @module CrossProcessRewardShaperEngine
 */

import { z } from "zod";

// ============================================================================
// Constants — reward weights and clip ranges
// ============================================================================

/** Default component weights. Sum ≈ 1 for the three data-quality components
 *  so reward magnitude is bounded around [-3, 1] in normal operation, and
 *  safety/override dominate when fired. */
const DEFAULT_WEIGHTS = {
  finish: 0.4,
  life: 0.3,
  cycle: 0.3,
  safety: 1.0,
  override: 1.0,
} as const;

/** Per-veto penalty (multiplied by veto count). Large enough that one veto
 *  cancels the maximum data-quality reward. */
const SAFETY_VETO_PENALTY = 2.0;

/** Per-override penalty (smaller — operator overrides may be tribal-
 *  knowledge corrections we should learn FROM, not punish severely). */
const OVERRIDE_PENALTY = 0.2;

/** Outlier clipping for finish error component. Ra ratio of −2 caps the
 *  worst-case finish reward at −0.8 (with default w_finish = 0.4). */
const FINISH_CLIP_LOW = -2.0;
const FINISH_CLIP_HIGH = 1.0;

/** Tool life and cycle time deltas clipped to ±1 (= 100% deviation cap). */
const DELTA_CLIP = 1.0;

// ============================================================================
// Schemas
// ============================================================================

const OutcomeEventSchema = z.object({
  raActualMicrometers: z.number().nonnegative().finite().optional(),
  raTargetMicrometers: z.number().positive().finite().optional(),
  toolLifeActualMin: z.number().nonnegative().finite().optional(),
  toolLifePredictedMin: z.number().positive().finite().optional(),
  cycleTimeActualS: z.number().nonnegative().finite().optional(),
  cycleTimePredictedS: z.number().positive().finite().optional(),
  safetyVetoCount: z.number().int().nonnegative().optional(),
  operatorOverrideCount: z.number().int().nonnegative().optional(),
});

// NOTE: Zod's `.default({})` on an object schema does NOT re-parse the empty
// object through inner field schemas — the literal {} becomes the parsed
// value and inner field defaults never fire. To make inner defaults apply,
// pass a fully-populated default object (or use partial+merge-with-defaults
// in the engine). We do the latter via the engine-side `?? DEFAULT_WEIGHTS`
// fallback, and use `.partial()` here so callers can override any subset of
// fields without supplying all five.
const WeightsSchema = z.object({
  finish: z.number().nonnegative().finite(),
  life: z.number().nonnegative().finite(),
  cycle: z.number().nonnegative().finite(),
  safety: z.number().nonnegative().finite(),
  override: z.number().nonnegative().finite(),
}).partial();

const ShapeInputSchema = z.object({
  event: OutcomeEventSchema,
  weights: WeightsSchema.optional(),
});

const AuditInputSchema = ShapeInputSchema;

// ============================================================================
// Public types
// ============================================================================

export interface OutcomeEvent {
  raActualMicrometers?: number;
  raTargetMicrometers?: number;
  toolLifeActualMin?: number;
  toolLifePredictedMin?: number;
  cycleTimeActualS?: number;
  cycleTimePredictedS?: number;
  safetyVetoCount?: number;
  operatorOverrideCount?: number;
}

export interface RewardWeights {
  finish: number;
  life: number;
  cycle: number;
  safety: number;
  override: number;
}

export interface ComponentBreakdown {
  finish: number;
  life: number;
  cycle: number;
  safety: number;
  override: number;
  total: number;
  clipsApplied: string[];
  missingFields: string[];
}

export interface ShapeOk {
  ok: true;
  reward: number;
  warnings: string[];
}

export interface AuditOk {
  ok: true;
  components: ComponentBreakdown;
  weights: RewardWeights;
  warnings: string[];
}

export interface OpErr {
  ok: false;
  error: "invalid_input";
  message: string;
}

export type ShapeResult = ShapeOk | OpErr;
export type AuditResult = AuditOk | OpErr;

// ============================================================================
// Helpers
// ============================================================================

function clamp(x: number, lo: number, hi: number): number {
  if (x < lo) return lo;
  if (x > hi) return hi;
  return x;
}

/**
 * Compute per-component contributions, returning both raw values and the
 * audit metadata (which fields were clipped, which were missing).
 */
function computeComponents(
  ev: OutcomeEvent,
  w: RewardWeights,
): ComponentBreakdown {
  const missingFields: string[] = [];
  const clipsApplied: string[] = [];

  // 1. Surface finish — negative reward when actual exceeds target
  let finishRaw = 0;
  if (ev.raActualMicrometers !== undefined && ev.raTargetMicrometers !== undefined) {
    const ratio = ev.raTargetMicrometers > 0
      ? -(ev.raActualMicrometers / ev.raTargetMicrometers - 1)
      : 0;
    const clipped = clamp(ratio, FINISH_CLIP_LOW, FINISH_CLIP_HIGH);
    if (clipped !== ratio) clipsApplied.push("finish");
    finishRaw = clipped;
  } else {
    if (ev.raActualMicrometers === undefined) missingFields.push("raActualMicrometers");
    if (ev.raTargetMicrometers === undefined) missingFields.push("raTargetMicrometers");
  }

  // 2. Tool life delta — positive when life exceeded prediction
  let lifeRaw = 0;
  if (ev.toolLifeActualMin !== undefined && ev.toolLifePredictedMin !== undefined) {
    const delta = ev.toolLifePredictedMin > 0
      ? (ev.toolLifeActualMin - ev.toolLifePredictedMin) / ev.toolLifePredictedMin
      : 0;
    const clipped = clamp(delta, -DELTA_CLIP, DELTA_CLIP);
    if (clipped !== delta) clipsApplied.push("life");
    lifeRaw = clipped;
  } else {
    if (ev.toolLifeActualMin === undefined) missingFields.push("toolLifeActualMin");
    if (ev.toolLifePredictedMin === undefined) missingFields.push("toolLifePredictedMin");
  }

  // 3. Cycle time delta — positive when faster than predicted
  let cycleRaw = 0;
  if (ev.cycleTimeActualS !== undefined && ev.cycleTimePredictedS !== undefined) {
    const delta = ev.cycleTimePredictedS > 0
      ? (ev.cycleTimePredictedS - ev.cycleTimeActualS) / ev.cycleTimePredictedS
      : 0;
    const clipped = clamp(delta, -DELTA_CLIP, DELTA_CLIP);
    if (clipped !== delta) clipsApplied.push("cycle");
    cycleRaw = clipped;
  } else {
    if (ev.cycleTimeActualS === undefined) missingFields.push("cycleTimeActualS");
    if (ev.cycleTimePredictedS === undefined) missingFields.push("cycleTimePredictedS");
  }

  // 4. Safety vetoes — large negative
  const vetoes = ev.safetyVetoCount ?? 0;
  const safetyRaw = -vetoes * SAFETY_VETO_PENALTY;

  // 5. Operator overrides — small negative
  const overrides = ev.operatorOverrideCount ?? 0;
  const overrideRaw = -overrides * OVERRIDE_PENALTY;

  // Apply weights
  const finish = w.finish * finishRaw;
  const life = w.life * lifeRaw;
  const cycle = w.cycle * cycleRaw;
  const safety = w.safety * safetyRaw;
  const override = w.override * overrideRaw;
  const total = finish + life + cycle + safety + override;

  return {
    finish,
    life,
    cycle,
    safety,
    override,
    total,
    clipsApplied,
    missingFields,
  };
}

// ============================================================================
// Public API
// ============================================================================

export class CrossProcessRewardShaperEngine {
  static readonly tier = "T4-01";

  /**
   * Compute the scalar reward for an outcome event. Used by T4-02/03/04
   * as the gradient/update signal. Pure function — no I/O.
   */
  static shape(input: unknown): ShapeResult {
    const parsed = ShapeInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "invalid_input",
        message: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      };
    }
    const { event, weights } = parsed.data;
    const w: RewardWeights = {
      finish: weights?.finish ?? DEFAULT_WEIGHTS.finish,
      life: weights?.life ?? DEFAULT_WEIGHTS.life,
      cycle: weights?.cycle ?? DEFAULT_WEIGHTS.cycle,
      safety: weights?.safety ?? DEFAULT_WEIGHTS.safety,
      override: weights?.override ?? DEFAULT_WEIGHTS.override,
    };
    const breakdown = computeComponents(event, w);
    const warnings: string[] = [];
    if (breakdown.missingFields.length > 0) {
      warnings.push(`missing fields treated as zero: ${breakdown.missingFields.join(", ")}`);
    }
    if (breakdown.clipsApplied.length > 0) {
      warnings.push(`components clipped: ${breakdown.clipsApplied.join(", ")}`);
    }
    return { ok: true, reward: breakdown.total, warnings };
  }

  /**
   * Compute reward + per-component breakdown for governance/explainability.
   * Operators reviewing why a recommended action got a high/low reward use
   * this to verify the policy isn't optimizing the wrong thing.
   */
  static audit(input: unknown): AuditResult {
    const parsed = AuditInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "invalid_input",
        message: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      };
    }
    const { event, weights } = parsed.data;
    const w: RewardWeights = {
      finish: weights?.finish ?? DEFAULT_WEIGHTS.finish,
      life: weights?.life ?? DEFAULT_WEIGHTS.life,
      cycle: weights?.cycle ?? DEFAULT_WEIGHTS.cycle,
      safety: weights?.safety ?? DEFAULT_WEIGHTS.safety,
      override: weights?.override ?? DEFAULT_WEIGHTS.override,
    };
    const breakdown = computeComponents(event, w);
    const warnings: string[] = [];
    if (breakdown.missingFields.length > 0) {
      warnings.push(`missing fields treated as zero: ${breakdown.missingFields.join(", ")}`);
    }
    return { ok: true, components: breakdown, weights: w, warnings };
  }

  /** Default weights snapshot. */
  static defaultWeights(): RewardWeights {
    return { ...DEFAULT_WEIGHTS };
  }

  /** Read-only constants snapshot. */
  static constants(): {
    SAFETY_VETO_PENALTY: number;
    OVERRIDE_PENALTY: number;
    FINISH_CLIP_LOW: number;
    FINISH_CLIP_HIGH: number;
    DELTA_CLIP: number;
    DEFAULT_WEIGHTS: RewardWeights;
  } {
    return {
      SAFETY_VETO_PENALTY,
      OVERRIDE_PENALTY,
      FINISH_CLIP_LOW,
      FINISH_CLIP_HIGH,
      DELTA_CLIP,
      DEFAULT_WEIGHTS: { ...DEFAULT_WEIGHTS },
    };
  }
}

export const crossProcessRewardShaperEngine = CrossProcessRewardShaperEngine;

/**
 * Dispatcher convenience wrapper.
 */
export function crossProcessRewardShaper(
  action: string,
  params: Record<string, unknown>,
): unknown {
  switch (action) {
    case "xproc_reward_shape":
      return CrossProcessRewardShaperEngine.shape(params);
    case "xproc_reward_audit":
      return CrossProcessRewardShaperEngine.audit(params);
    case "xproc_reward_default_weights":
      return CrossProcessRewardShaperEngine.defaultWeights();
    case "xproc_reward_constants":
      return CrossProcessRewardShaperEngine.constants();
    default:
      throw new Error(`crossProcessRewardShaper: unknown action '${action}'`);
  }
}
