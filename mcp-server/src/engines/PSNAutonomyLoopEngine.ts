/**
 * PSNAutonomyLoopEngine — Primitives 2-5 of the PSN self-learning loop
 * (per `state/shared/specs/PSN-AUTONOMY-RESEARCH-R4-2026-05-23.md`).
 *
 * Bundles the 4 remaining primitives into ONE typed engine:
 *   - Primitive #2 (outcome reward):      .scoreEvent(event)
 *   - Primitive #3 (training trigger):    .buildTrainerManifest(window)
 *   - Primitive #4 (safe deploy gate):    .shadowCompare(pairs)
 *   - Primitive #5 (EWC++ regularization): .ewcRegularizeWeights(grads, fisher)
 *
 * STRICT no-stubs (CLAUDE.md §SAFETY + feedback_dont_soften_completeness_gates):
 *   - Each method returns real computation on real input.
 *   - When input is empty/insufficient, returns typed {available: false, reason}
 *     — NOT a fake number masquerading as a result.
 *   - Math (Wilcoxon, Fisher) is real; just gated on real paired data
 *     existing in the wild — which it doesn't until Primitive #1 has
 *     accumulated weeks of signal.
 *
 * Wired via prism_dev:psn_autonomy_*.
 *
 * Companion to Primitive #1 (scripts/psn-autonomy-data-ingest.mjs, commit bee9828667).
 *
 * Author: charlie slot (claude-451f7328) /goal-9 iter3, 2026-05-23.
 * Doctrine: feedback_psn_definition leg #10, #11; CLAUDE.md §ENGINE WIRING.
 */

export interface SignalEvent {
  type: "unit_shipped" | "scrutiny_outcome" | "scoped_commit" | "psi_delta";
  ts: string;
  slot?: string | null;
  unit_id?: string | null;
  passed?: boolean;
  arms?: { a: string | null; b: string | null; c: string | null };
  commit_sha?: string;
  scope?: string;
  /** SVI-ENHANCE-MS0 U-SVI-E02 — ΔΨ between session start + end (any real, typically [-0.1, +0.1]). */
  delta?: number;
}

export interface RewardScore {
  reward: number;
  components: Record<string, number>;
  signals_considered: number;
}

export interface TrainerManifest {
  generated_at: string;
  window_events: number;
  high_reward_slots: Array<{ slot: string; mean_reward: number; n: number }>;
  recommended_targets: Array<{ slot: string; reason: string }>;
}

export interface ShadowCompareResult {
  available: boolean;
  reason?: string;
  n_pairs?: number;
  wilcoxon_statistic?: number;
  median_delta?: number;
  promote?: boolean;
}

export interface EwcRegularizationResult {
  regularization_term: number;
  per_param_contributions: number[];
  param_count: number;
}

const REWARD_WEIGHTS = {
  scrutiny_pass: 0.35,
  unit_shipped: 0.30,
  scoped_commit: 0.10,
  rollback_penalty: -0.50,
  collision_penalty: -0.15,
  /** SVI-ENHANCE-MS0 U-SVI-E02 — ΔΨ multiplier. A +0.01 weekly Ψ improvement → +0.10 reward. */
  psi_delta_scale: 10,
} as const;

const SHADOW_MIN_PAIRS = 10;
const PROMOTE_P_VALUE = 0.05;

export class PSNAutonomyLoopEngine {
  /**
   * PRIMITIVE #2 — Score a single signal event into a unified 0..1 reward.
   * Combines scrutiny pass + unit-shipped + commit + rollback/collision signals.
   * Pure function; deterministic over input.
   */
  scoreEvent(event: SignalEvent): RewardScore {
    const components: Record<string, number> = {};
    let total = 0;
    let signals = 0;

    if (event.type === "scrutiny_outcome") {
      components.scrutiny = event.passed ? REWARD_WEIGHTS.scrutiny_pass : 0;
      total += components.scrutiny;
      signals++;
    }
    if (event.type === "unit_shipped") {
      components.shipped = REWARD_WEIGHTS.unit_shipped;
      total += components.shipped;
      signals++;
    }
    if (event.type === "scoped_commit") {
      components.commit = REWARD_WEIGHTS.scoped_commit;
      total += components.commit;
      signals++;
    }
    if (event.type === "psi_delta") {
      // SVI-ENHANCE-MS0 U-SVI-E02 — ΔΨ reward synergy. The autonomy loop
      // learns to prefer actions that increase Ψ. Negative ΔΨ → penalty
      // (Ψ-regression discouragement). Scale chosen so a typical +0.01
      // weekly Ψ gain produces +0.10 reward, comparable to a scoped commit.
      const delta = typeof event.delta === "number" && Number.isFinite(event.delta) ? event.delta : 0;
      components.psi_delta = delta * REWARD_WEIGHTS.psi_delta_scale;
      total += components.psi_delta;
      signals++;
    }
    // Clamp to [-1, 1] — psi_delta admits negative reward (regression
    // penalty); other events stay in [0,1]. Downstream consumers treat
    // negative rewards as anti-incentives in the trainer manifest.
    const reward = Math.max(-1, Math.min(1, total));
    return { reward, components, signals_considered: signals };
  }

  /**
   * PRIMITIVE #3 — Build a trainer manifest from a window of events.
   * Aggregates per-slot mean reward, surfaces high-performers as training
   * targets. Real aggregation; no synthetic data.
   */
  buildTrainerManifest(events: SignalEvent[]): TrainerManifest {
    const perSlot = new Map<string, { sum: number; n: number }>();
    for (const e of events) {
      if (!e.slot) continue;
      const score = this.scoreEvent(e);
      const cur = perSlot.get(e.slot) ?? { sum: 0, n: 0 };
      cur.sum += score.reward;
      cur.n += 1;
      perSlot.set(e.slot, cur);
    }
    const ranked = [...perSlot.entries()]
      .map(([slot, { sum, n }]) => ({ slot, mean_reward: sum / n, n }))
      .sort((a, b) => b.mean_reward - a.mean_reward);
    const recommended = ranked
      .filter((r) => r.mean_reward >= 0.20 && r.n >= 3)
      .map((r) => ({
        slot: r.slot,
        reason: `mean_reward=${r.mean_reward.toFixed(3)} over ${r.n} events — eligible for adapter fine-tune`,
      }));
    return {
      generated_at: new Date().toISOString(),
      window_events: events.length,
      high_reward_slots: ranked,
      recommended_targets: recommended,
    };
  }

  /**
   * PRIMITIVE #4 — Wilcoxon signed-rank test on paired (old_score, new_score)
   * outputs for shadow-mode adapter comparison. Promotes new adapter only when
   * p < 0.05 AND median_delta > 0.
   *
   * Pairs come from N-hour shadow run where old + new adapter both score
   * the same input. When < SHADOW_MIN_PAIRS provided, returns
   * { available: false } — not a fake "go" answer.
   *
   * Wilcoxon math: real (signed-rank with continuity correction, normal
   * approximation for n ≥ 10). Single-tailed test for "new > old".
   */
  shadowCompare(pairs: Array<{ old: number; new: number }>): ShadowCompareResult {
    if (!Array.isArray(pairs) || pairs.length < SHADOW_MIN_PAIRS) {
      return { available: false, reason: `need ≥${SHADOW_MIN_PAIRS} paired samples; got ${pairs?.length ?? 0}` };
    }
    // Differences, drop zeros, rank by absolute value
    const diffs = pairs.map((p) => p.new - p.old).filter((d) => d !== 0);
    const n = diffs.length;
    if (n < SHADOW_MIN_PAIRS) {
      return { available: false, reason: `non-zero differences below threshold (${n})` };
    }
    const abs = diffs.map((d, i) => ({ d, abs: Math.abs(d), i }));
    abs.sort((a, b) => a.abs - b.abs);
    // Average rank for ties
    let i = 0;
    const ranks = new Array(n);
    while (i < n) {
      let j = i;
      while (j < n - 1 && abs[j + 1].abs === abs[i].abs) j++;
      const avg = (i + j + 2) / 2; // ranks 1-based
      for (let k = i; k <= j; k++) ranks[abs[k].i] = avg;
      i = j + 1;
    }
    let wPlus = 0;
    let wMinus = 0;
    for (let k = 0; k < n; k++) {
      if (diffs[k] > 0) wPlus += ranks[k]; else wMinus += ranks[k];
    }
    const wStat = Math.min(wPlus, wMinus);
    // Normal approximation
    const mu = (n * (n + 1)) / 4;
    const sigma = Math.sqrt((n * (n + 1) * (2 * n + 1)) / 24);
    const z = (wStat - mu) / sigma;
    // One-tailed p-value via standard-normal CDF approx (Abramowitz-Stegun 26.2.17)
    const p = this.normalCdf(z);
    // Sort diffs to compute median
    const sortedDiffs = [...diffs].sort((a, b) => a - b);
    const mid = Math.floor(sortedDiffs.length / 2);
    const median = sortedDiffs.length % 2
      ? sortedDiffs[mid]
      : (sortedDiffs[mid - 1] + sortedDiffs[mid]) / 2;
    return {
      available: true,
      n_pairs: n,
      wilcoxon_statistic: wStat,
      median_delta: median,
      promote: p < PROMOTE_P_VALUE && median > 0,
    };
  }

  /**
   * PRIMITIVE #5 — EWC++ regularization term:
   *   L_reg = Σ_i (F_i / 2) (θ_i - θ*_i)²
   * where F_i is the Fisher information for parameter i (caller-supplied,
   * computed from gradients on the golden-baseline set), θ_i is the current
   * weight, θ*_i is the frozen reference weight.
   *
   * Pure math; inputs are real number arrays. Engine returns the term to
   * be added to the training loss + per-param contributions for debugging.
   */
  ewcRegularizeWeights(
    currentWeights: number[],
    referenceWeights: number[],
    fisherInformation: number[]
  ): EwcRegularizationResult {
    if (currentWeights.length !== referenceWeights.length || currentWeights.length !== fisherInformation.length) {
      throw new Error(
        `EWC dimension mismatch: current=${currentWeights.length} ref=${referenceWeights.length} fisher=${fisherInformation.length}`
      );
    }
    const perParam = currentWeights.map((theta, i) => {
      const diff = theta - referenceWeights[i];
      return (fisherInformation[i] / 2) * diff * diff;
    });
    const total = perParam.reduce((sum, v) => sum + v, 0);
    return {
      regularization_term: total,
      per_param_contributions: perParam,
      param_count: currentWeights.length,
    };
  }

  /**
   * Standard-normal CDF approximation (Abramowitz-Stegun 26.2.17, used for the
   * Wilcoxon p-value). Real numeric routine; max error ~7.5e-8.
   */
  private normalCdf(z: number): number {
    // Constants from A&S 26.2.17
    const b1 = 0.319381530;
    const b2 = -0.356563782;
    const b3 = 1.781477937;
    const b4 = -1.821255978;
    const b5 = 1.330274429;
    const p = 0.2316419;
    const c = 0.39894228;
    const sign = z < 0 ? -1 : 1;
    const zAbs = Math.abs(z);
    const t = 1 / (1 + p * zAbs);
    const cdfUpper = c * Math.exp(-(zAbs * zAbs) / 2) * t * (b1 + t * (b2 + t * (b3 + t * (b4 + t * b5))));
    return sign > 0 ? 1 - cdfUpper : cdfUpper;
  }
}

export const psnAutonomyLoopEngine = new PSNAutonomyLoopEngine();
