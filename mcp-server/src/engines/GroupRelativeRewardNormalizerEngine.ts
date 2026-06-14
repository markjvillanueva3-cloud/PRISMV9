/**
 * GroupRelativeRewardNormalizerEngine — ULTRACODE-SYNERGY-MS0 / Order 3 (GRPO)
 * ============================================================================
 *
 * The critic-free, group-relative advantage normalizer that PRISM's RL training
 * spine was missing. Pairs the EXISTING reward-shaping layer (CrossProcessReward
 * ShaperEngine / WEDMRewardShapingEngine / LatheLoRARewardShapingEngine produce
 * the per-trajectory SCALAR reward; PolicyExperienceLedgerEngine.reward_total
 * stores it) with the across-N-trajectory normalization that GRPO/RLVR needs and
 * nothing in PRISM implements.
 *
 * Why this is NOT a duplicate of PolicyExperienceLedgerEngine.normalized_z_score:
 *   That field z-scores EACH OBJECTIVE across its own distribution (finish-dist
 *   vs life-dist) for cross-objective comparability — a per-component transform.
 *   GRPO normalizes the N FINAL scalar rewards of N trajectories sampled for the
 *   SAME prompt against their shared group mean/std → a per-group transform. The
 *   two compose: shapers/ledger give the scalar; this engine turns a GROUP of
 *   those scalars into the advantage tensor a policy-gradient step consumes.
 *
 * Algorithm (DeepSeek-R1 GRPO, Shao et al. 2024, arXiv:2402.03300 §4.1; the same
 * group-baseline used by RULER/OpenPipe ART):
 *   Â_i = (r_i − mean(r)) / (std(r) + ε)
 *   where r = {r_1…r_N} are the N trajectory rewards in one group. The group mean
 *   is the critic-free baseline (replaces PPO's learned value model); dividing by
 *   std stabilizes the signal across prompts of different difficulty. Only the
 *   RELATIVE ordering matters to the gradient — which is why an LLM-judge's
 *   relative ranking (RULER) maps directly onto this.
 *
 * Degenerate-group fallback (the failure mode a naive impl silently mishandles):
 *   When std(r) ≈ 0 (all trajectories scored ~equal), (r_i − mean)/(std+ε) → a
 *   huge-magnitude or all-≈0 vector dominated by ε noise — useless and unstable.
 *   We detect std ≤ STD_FLOOR and fall back to RANK-normalization: map the rank
 *   order to evenly-spaced advantages in [−1, 1] (mean 0), so a faint but real
 *   ordering still produces a clean, bounded gradient signal instead of NaN/blowup.
 *   A TRULY constant group (all rewards bit-identical) yields all-zero advantages
 *   (no signal — correct: there is nothing to learn from).
 *
 * Pure: no I/O, no state. Never throws — bad input returns a structured result
 * with a `warning` (engine convention: edge cases return structured errors).
 *
 * @module engines/GroupRelativeRewardNormalizerEngine
 * @milestone ULTRACODE-SYNERGY-MS0 U-ULTRACODE-GRPO
 */

/** ε added to std in the GRPO denominator for numerical stability. */
const EPS = 1e-8;
/**
 * Numerical floor below which a group's std is treated as degenerate (rank fallback).
 * Pinned to EPS so the rank-fallback owns the ENTIRE ε-dominated regime: any group whose
 * std ≤ EPS (where the z-score denominator would be ε-dominated, not std-dominated) routes
 * to the bounded rank-normalizer instead. Above EPS the z-score denom is std-dominated and
 * well-conditioned. (Scrutiny P2: a floor < EPS leaves a confusing ε-dominated z-score sliver.)
 */
const STD_FLOOR = EPS;

export type NormalizeMode = "zscore" | "rank-fallback" | "constant-zero";

export interface GroupAdvantage {
  /** index of this reward within the input group (preserves caller order) */
  index: number;
  /** the raw scalar reward fed in */
  reward: number;
  /** the normalized advantage Â_i (mean≈0 across the group) */
  advantage: number;
}

export interface GroupNormalizeResult {
  ok: boolean;
  /** how the group was normalized: standard z-score, rank fallback, or constant→zero */
  mode: NormalizeMode;
  /** per-reward advantages, in the SAME order as the input rewards */
  advantages: GroupAdvantage[];
  /** group statistics (mean/std/min/max/n) computed from the raw rewards */
  stats: { n: number; mean: number; std: number; min: number; max: number };
  /** set when input was rejected or a degenerate path was taken */
  warning?: string;
  source: "grpo-group-relative";
}

export class GroupRelativeRewardNormalizerEngine {
  /**
   * Normalize a GROUP of N trajectory rewards into critic-free GRPO advantages.
   *
   * @param rewards - the N final scalar rewards (one per sampled trajectory for the
   *   same prompt). Typically sourced from PolicyExperienceLedgerEngine.reward_total
   *   or a reward shaper — do NOT re-shape here.
   * @returns GroupNormalizeResult with per-reward advantages (mean≈0), the chosen
   *   mode, group stats, and a warning on any degenerate/rejected path. Never throws.
   */
  static normalizeGroup(rewards: number[]): GroupNormalizeResult {
    // `ok` is true for any normalization that produced a usable advantage vector —
    // that INCLUDES the rank-fallback and constant-zero modes (a constant group
    // legitimately has zero signal). It is false ONLY for a hard input rejection
    // (non-array, or a group poisoned by NaN/Infinity where no signal can be trusted).
    const make = (
      ok: boolean,
      mode: NormalizeMode,
      advantages: GroupAdvantage[],
      stats: GroupNormalizeResult["stats"],
      warning?: string,
    ): GroupNormalizeResult => ({
      ok,
      mode,
      advantages,
      stats,
      ...(warning ? { warning } : {}),
      source: "grpo-group-relative",
    });

    // ── input validation (fail-loud-as-structured-result, engine convention) ──
    if (!Array.isArray(rewards)) {
      return make(false, "constant-zero", [], { n: 0, mean: 0, std: 0, min: 0, max: 0 }, "rewards must be an array");
    }
    const clean = rewards.map((r, index) => ({ r: typeof r === "number" ? r : NaN, index }));
    const bad = clean.filter((c) => !Number.isFinite(c.r));
    if (bad.length > 0) {
      // GRPO over a group with a NaN/Infinity reward is meaningless — reject the whole group
      // rather than silently dropping members (dropping would shift the baseline for the rest).
      return make(
        false,
        "constant-zero",
        rewards.map((r, index) => ({ index, reward: r, advantage: 0 })),
        { n: rewards.length, mean: 0, std: 0, min: 0, max: 0 },
        `group contains ${bad.length} non-finite reward(s) (NaN/Infinity) at index ${bad.map((b) => b.index).join(",")} — advantages zeroed (no signal)`,
      );
    }

    const n = clean.length;
    if (n === 0) {
      return make(false, "constant-zero", [], { n: 0, mean: 0, std: 0, min: 0, max: 0 }, "empty group — nothing to normalize");
    }
    if (n === 1) {
      // a group of one has no relative signal (the baseline IS the single reward → advantage 0).
      // ok:true — this is a valid (if signal-free) result, not a rejection.
      return make(
        true,
        "constant-zero",
        [{ index: 0, reward: clean[0].r, advantage: 0 }],
        { n: 1, mean: clean[0].r, std: 0, min: clean[0].r, max: clean[0].r },
        "group of size 1 — no relative baseline, advantage zeroed",
      );
    }

    // ── group statistics ──
    let sum = 0;
    let min = Infinity;
    let max = -Infinity;
    for (const c of clean) {
      sum += c.r;
      if (c.r < min) min = c.r;
      if (c.r > max) max = c.r;
    }
    const mean = sum / n;
    let varSum = 0;
    for (const c of clean) varSum += (c.r - mean) ** 2;
    // population std (GRPO normalizes within the sampled group, not a sample estimate)
    const std = Math.sqrt(varSum / n);
    const stats = { n, mean, std, min, max };

    // ── truly-constant group: no ordering, no signal → all-zero advantages ──
    if (max === min) {
      return make(
        true,
        "constant-zero",
        clean.map((c) => ({ index: c.index, reward: c.r, advantage: 0 })),
        stats,
        "all rewards identical — no relative signal, advantages zeroed",
      );
    }

    // ── degenerate std (≈0 but not bit-identical): rank-normalize to a bounded signal ──
    if (std <= STD_FLOOR) {
      // sort indices by reward asc; assign evenly-spaced advantages in [-1, 1], mean 0.
      const order = clean.slice().sort((a, b) => a.r - b.r);
      const adv = new Array<number>(n);
      // ties share the average of their rank positions so equal rewards get equal advantage
      let i = 0;
      while (i < n) {
        let j = i;
        while (j + 1 < n && order[j + 1].r === order[i].r) j++;
        // positions i..j are tied; their shared normalized rank
        const avgPos = (i + j) / 2;
        const a = n === 1 ? 0 : (avgPos / (n - 1)) * 2 - 1; // map [0,n-1] → [-1,1]
        for (let k = i; k <= j; k++) adv[order[k].index] = a;
        i = j + 1;
      }
      return make(
        true,
        "rank-fallback",
        clean.map((c) => ({ index: c.index, reward: c.r, advantage: adv[c.index] })),
        stats,
        `group std ${std.toExponential(2)} ≤ floor — rank-normalized to bounded [-1,1] (faint ordering preserved, no blowup)`,
      );
    }

    // ── standard GRPO z-score advantage ──
    const denom = std + EPS;
    const advantages = clean.map((c) => ({
      index: c.index,
      reward: c.r,
      advantage: (c.r - mean) / denom,
    }));
    return make(true, "zscore", advantages, stats);
  }

  /**
   * Convenience: normalize and return just the advantage vector in input order.
   * @param rewards - N trajectory rewards
   * @returns number[] of advantages (mean≈0), same order as input
   */
  static advantages(rewards: number[]): number[] {
    return GroupRelativeRewardNormalizerEngine.normalizeGroup(rewards).advantages.map((a) => a.advantage);
  }

  static getSelfAwareness() {
    return {
      name: "GroupRelativeRewardNormalizerEngine",
      version: "1.0.0",
      milestone: "ULTRACODE-SYNERGY-MS0 U-ULTRACODE-GRPO",
      capabilities: ["normalizeGroup", "advantages"],
      dependencies: [],
      dataSourcesUsed: [],
      reference: "DeepSeek-R1 GRPO (Shao et al. 2024, arXiv:2402.03300 §4.1)",
    };
  }
}

export const groupRelativeRewardNormalizerEngine = new GroupRelativeRewardNormalizerEngine();
