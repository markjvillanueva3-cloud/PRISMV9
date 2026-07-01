/**
 * MOEAStoppingCriterion — principled stopping criterion for multi-objective
 * evolutionary algorithms (MOEAs) using the canonical HypervolumeIndicator
 * (ALGO-SYNERGY-MS0/U-ALGO-MAT-10).
 *
 * Replaces fixed-generation stopping with a hypervolume-saturation rule:
 *     stop when relativeImprovement_k = (HV_k - HV_{k-w}) / max(HV_k, eps) < tolerance
 *     for `stableWindow` consecutive evaluations
 *
 * Used by MultiObjectiveParetoEngine, WEDMParetoFrontierSearchEngine,
 * LatheGeneticAlgorithmEngine, and any future MO solver.
 *
 * Why this is a separate engine (not inlined into each solver):
 *   - The same stopping logic + the same canonical HV computation must be used
 *     across all MO solvers so their stopping decisions are comparable.
 *   - Telemetry (per-generation HV trajectory) is exposed for /system-viz to
 *     plot convergence curves.
 *   - Operator-tunable thresholds live in one place — not duplicated in 7+
 *     engines that each invent their own "max generations" heuristic.
 *
 * @module engines/MOEAStoppingCriterion
 * @since ALGO-SYNERGY-MS0 Phase 5 (2026-05-25, slot:tango)
 */

import { HypervolumeIndicator } from "../algorithms/HypervolumeIndicator.js";
import type { Point } from "../algorithms/HypervolumeIndicator.js";

export interface StoppingConfig {
  /** Relative-improvement tolerance below which we consider HV "saturated" (default 1e-3 = 0.1%). */
  tolerance?: number;
  /** Consecutive evaluations below tolerance to confirm convergence (default 3). */
  stableWindow?: number;
  /** Lookback window size for the improvement ratio (default 5). */
  lookback?: number;
  /** Optional reference point shared across the run for comparable HV across generations. */
  reference?: Point;
  /** Hard cap on generations even if HV hasn't saturated (default 200). */
  maxGenerations?: number;
}

export type StopReason = "saturated" | "max_generations" | "running" | "no_data";

export interface StoppingDecision {
  shouldStop: boolean;
  reason: StopReason;
  /** HV at this generation. NaN if the front was empty. */
  hypervolume: number;
  /** Generations seen so far (1-indexed). */
  generation: number;
  /** Relative improvement over the lookback window. */
  relativeImprovement: number;
  /** Number of consecutive sub-tolerance evaluations (the saturated counter). */
  saturatedStreak: number;
}

export class MOEAStoppingCriterion {
  private cfg: Required<Omit<StoppingConfig, "reference">> & {
    reference?: Point;
  };
  private hvHistory: number[] = [];
  private saturatedStreak = 0;

  constructor(config: StoppingConfig = {}) {
    this.cfg = {
      tolerance: config.tolerance ?? 1e-3,
      stableWindow: config.stableWindow ?? 3,
      lookback: config.lookback ?? 5,
      maxGenerations: config.maxGenerations ?? 200,
      reference: config.reference,
    };
  }

  /**
   * Evaluate one generation's front. Returns whether to stop + diagnostics.
   * Caller passes the front already minimization-normalized (negate
   * maximization objectives) — same convention as HypervolumeIndicator.
   */
  evaluate(front: ReadonlyArray<Point>): StoppingDecision {
    const generation = this.hvHistory.length + 1;

    if (front.length === 0) {
      this.hvHistory.push(NaN);
      return {
        shouldStop: false,
        reason: "no_data",
        hypervolume: NaN,
        generation,
        relativeImprovement: 0,
        saturatedStreak: this.saturatedStreak,
      };
    }

    const hvResult = HypervolumeIndicator.calculate({
      points: front.map((p) => Array.from(p)),
      reference: this.cfg.reference,
      assume_non_dominated: true,
    });
    const hv = hvResult.hypervolume;
    this.hvHistory.push(hv);

    // Relative improvement: (HV_now - HV_{now-lookback}) / max(HV_now, eps).
    let relativeImprovement = Infinity; // not enough history yet → "keep going"
    if (this.hvHistory.length > this.cfg.lookback) {
      const lookbackHV = this.hvHistory[this.hvHistory.length - 1 - this.cfg.lookback];
      const denom = Math.max(Math.abs(hv), 1e-12);
      relativeImprovement = (hv - lookbackHV) / denom;
    }

    // Saturation tracking.
    if (
      Number.isFinite(relativeImprovement) &&
      relativeImprovement < this.cfg.tolerance
    ) {
      this.saturatedStreak++;
    } else {
      this.saturatedStreak = 0;
    }

    let reason: StopReason = "running";
    let shouldStop = false;
    if (this.saturatedStreak >= this.cfg.stableWindow) {
      reason = "saturated";
      shouldStop = true;
    } else if (generation >= this.cfg.maxGenerations) {
      reason = "max_generations";
      shouldStop = true;
    }

    return {
      shouldStop,
      reason,
      hypervolume: hv,
      generation,
      relativeImprovement,
      saturatedStreak: this.saturatedStreak,
    };
  }

  /**
   * Full HV trajectory across all evaluated generations.
   * Use this for /system-viz convergence-curve overlay or post-hoc analysis.
   */
  trajectory(): ReadonlyArray<number> {
    return this.hvHistory;
  }

  /** Reset internal state for reuse across solver runs. */
  reset(): void {
    this.hvHistory = [];
    this.saturatedStreak = 0;
  }
}
