/**
 * TurningThreadRobustOptimizerEngine — LATHE-PRO-MS4a.
 *
 * Sensitivity-driven robust design for single-point threading. Mirrors
 * the MS5.2 pattern (`TurningRobustOptimizerEngine`) but optimizes
 * thread safety + speed instead of production Cpk.
 *
 * Flow:
 *   1. OAT sensitivity screen (via TurningThreadSensitivityEngine)
 *      → top-2 drivers ranked by |elasticity_safe|.
 *   2. Grid search (steps × steps) over those two parameters, each
 *      scaled in [1 - adjust_range, 1 + adjust_range].
 *   3. At each grid point, Monte Carlo of the threading cascade
 *      (via TurningThreadStochasticPlanEngine).
 *   4. Score = safe_fraction + time_weight × (−time_p50 / baseline_time).
 *      By default time_weight = 0 → pure safety ranking.
 *   5. Returns argmax point, safe lift vs baseline, full grid.
 *
 * Perturbation semantics:
 *   • num_passes is perturbed as integer ±N (rounded from factor),
 *     clamped to [1, 30].
 *   • All other axes are continuous relative scaling.
 *
 * Shipped source of truth — dispatcher action
 * `turning_thread_robust_optimizer` delegates here.
 */
import {
  turningThreadStochasticPlanEngine,
} from "./TurningThreadStochasticPlanEngine.js";
import {
  turningThreadSensitivityEngine,
} from "./TurningThreadSensitivityEngine.js";
import type { SPTInput } from "./SinglePointThreadEngine.js";

export interface ThreadRobustInput {
  thread: SPTInput;
  adjust_range?: number;
  grid_steps?: number;
  n_trials?: number;
  seed?: number;
  sigma_rpm_rel?: number;
  sigma_od_abs_mm?: number;
  sigma_pitch_abs_mm?: number;
  sigma_lead_rel?: number;
  force_limit_N?: number;
  /** Weight on (−time_p50 / baseline_time) in composite score.
   *  Default 0 → pure safety. Positive values prefer faster cycles. */
  time_weight?: number;
  /** Minimum feasibility fraction a grid point must clear. Default 0.5. */
  min_feasibility_rate?: number;
}

export interface ThreadGridPoint {
  factors: Record<string, number>;
  safe_fraction: number;
  force_p95: number;
  time_p50: number;
  feasibility_rate: number;
  score: number;
  /** Perturbed thread spec (for explainability). */
  thread: SPTInput;
}

export interface ThreadRobustResult {
  baseline_safe_fraction: number;
  baseline_force_p95: number;
  baseline_time_p50: number;
  top2_drivers: string[];
  adjust_range: number;
  grid_steps: number;
  n_trials: number;
  seed: number;
  time_weight: number;
  min_feasibility_rate: number;
  best_point: ThreadGridPoint | null;
  safe_fraction_lift: number;
  grid: ThreadGridPoint[];
  source: string;
}

const THREAD_DIMS = [
  "spindle_rpm",
  "pitch_mm",
  "major_diameter_mm",
  "num_passes",
  "lead_in_mm",
  "lead_out_mm",
] as const;
type ThreadDim = (typeof THREAD_DIMS)[number];

class TurningThreadRobustOptimizerEngine {
  private validateInput(input: ThreadRobustInput): void {
    if (!input.thread || typeof input.thread !== "object") {
      throw new Error("thread spec is required");
    }
    const range = input.adjust_range ?? 0.15;
    if (!Number.isFinite(range) || range <= 0 || range >= 1) {
      throw new Error("adjust_range must be in (0, 1)");
    }
    const steps = input.grid_steps ?? 5;
    if (!Number.isFinite(steps) || steps < 2 || steps > 11) {
      throw new Error("grid_steps must be in [2, 11]");
    }
    const nTrials = input.n_trials ?? 40;
    if (!Number.isFinite(nTrials) || nTrials < 10 || nTrials > 2000) {
      throw new Error("n_trials must be in [10, 2000]");
    }
    const weight = input.time_weight ?? 0;
    if (!Number.isFinite(weight) || weight < 0) {
      throw new Error("time_weight must be ≥ 0 and finite");
    }
    const feasMin = input.min_feasibility_rate ?? 0.5;
    if (!Number.isFinite(feasMin) || feasMin < 0 || feasMin > 1) {
      throw new Error("min_feasibility_rate must be in [0, 1]");
    }
  }

  /** Apply one axis scaling. num_passes uses integer delta from factor-1. */
  private applyFactor(base: SPTInput, param: ThreadDim, factor: number): SPTInput {
    const clone: SPTInput = { ...base };
    switch (param) {
      case "spindle_rpm":
        clone.spindle_rpm = Math.max(1, base.spindle_rpm * factor);
        break;
      case "pitch_mm":
        clone.pitch_mm = Math.max(0.01, base.pitch_mm * factor);
        break;
      case "major_diameter_mm":
        clone.major_diameter_mm = Math.max(0.01, base.major_diameter_mm * factor);
        break;
      case "num_passes": {
        // Factor 0.85 → -1 pass; 1.15 → +1 pass (approx linear map)
        const delta = Math.round((factor - 1) * Math.max(base.num_passes, 1));
        clone.num_passes = Math.max(1, Math.min(30, base.num_passes + delta));
        break;
      }
      case "lead_in_mm":
        clone.lead_in_mm = Math.max(0, base.lead_in_mm * factor);
        break;
      case "lead_out_mm":
        clone.lead_out_mm = Math.max(0, base.lead_out_mm * factor);
        break;
    }
    return clone;
  }

  /** Single MC evaluation of a perturbed thread spec. */
  private evalPoint(
    t: SPTInput,
    common: {
      n_trials: number;
      seed: number;
      sRpm: number;
      sOd: number;
      sPitch: number;
      sLead: number;
      force_limit_N: number;
    },
  ): {
    safe_fraction: number;
    force_p95: number;
    time_p50: number;
    feasibility_rate: number;
  } {
    const r = turningThreadStochasticPlanEngine.run({
      thread: t,
      n_trials: common.n_trials,
      seed: common.seed,
      sigma_rpm_rel: common.sRpm,
      sigma_od_abs_mm: common.sOd,
      sigma_pitch_abs_mm: common.sPitch,
      sigma_lead_rel: common.sLead,
      force_limit_N: common.force_limit_N,
    });
    return {
      safe_fraction: r.safe_fraction,
      force_p95: r.force_peak_p95,
      time_p50: r.time_p50,
      feasibility_rate:
        r.trials_feasible / Math.max(r.trials_attempted, 1),
    };
  }

  run(input: ThreadRobustInput): ThreadRobustResult {
    this.validateInput(input);

    const adjustRange = input.adjust_range ?? 0.15;
    const gridSteps = input.grid_steps ?? 5;
    const nTrials = input.n_trials ?? 40;
    const seed = input.seed ?? 1;
    const timeWeight = input.time_weight ?? 0;
    const feasMin = input.min_feasibility_rate ?? 0.5;

    const common = {
      n_trials: nTrials,
      seed,
      sRpm: input.sigma_rpm_rel ?? 0.02,
      sOd: input.sigma_od_abs_mm ?? 0.05,
      sPitch: input.sigma_pitch_abs_mm ?? 0.01,
      sLead: input.sigma_lead_rel ?? 0.05,
      force_limit_N: input.force_limit_N ?? 500,
    };

    // Sensitivity screen
    const sens = turningThreadSensitivityEngine.run({
      thread: input.thread,
      oat_delta: 0.10,
      n_trials: Math.min(nTrials, 30), // cheaper screen
      seed,
      sigma_rpm_rel: common.sRpm,
      sigma_od_abs_mm: common.sOd,
      sigma_pitch_abs_mm: common.sPitch,
      sigma_lead_rel: common.sLead,
      force_limit_N: common.force_limit_N,
    });
    const top2Raw = turningThreadSensitivityEngine.topDriversBySafeElasticity(sens, 2);
    // Defensive: if sensitivity returned < 2 valid drivers, fall back to (pitch, num_passes)
    const fallback: ThreadDim[] = ["pitch_mm", "num_passes"];
    const top2: ThreadDim[] = [
      (top2Raw[0] as ThreadDim) ?? fallback[0],
      (top2Raw[1] as ThreadDim) ??
        fallback.find((f) => f !== (top2Raw[0] as ThreadDim)) ??
        fallback[1],
    ];

    // Baseline
    const baseline = this.evalPoint(input.thread, common);
    const baseTime = Math.max(baseline.time_p50, 1e-6);

    // Grid
    const grid: ThreadGridPoint[] = [];
    const stepLow = 1 - adjustRange;
    const stepStride = (2 * adjustRange) / Math.max(gridSteps - 1, 1);
    for (let i = 0; i < gridSteps; i++) {
      for (let j = 0; j < gridSteps; j++) {
        const fi = stepLow + i * stepStride;
        const fj = stepLow + j * stepStride;
        let perturbed = input.thread;
        perturbed = this.applyFactor(perturbed, top2[0], fi);
        perturbed = this.applyFactor(perturbed, top2[1], fj);
        const mc = this.evalPoint(perturbed, common);
        const score =
          mc.safe_fraction - timeWeight * (mc.time_p50 / baseTime);
        grid.push({
          factors: { [top2[0]]: fi, [top2[1]]: fj },
          safe_fraction: mc.safe_fraction,
          force_p95: Math.round(mc.force_p95 * 100) / 100,
          time_p50: Math.round(mc.time_p50 * 100) / 100,
          feasibility_rate: Math.round(mc.feasibility_rate * 10000) / 10000,
          score: Math.round(score * 10000) / 10000,
          thread: perturbed,
        });
      }
    }

    const feasible = grid.filter((g) => g.feasibility_rate >= feasMin);
    const candidates = feasible.length > 0 ? feasible : grid;
    const best =
      candidates.length === 0
        ? null
        : candidates.reduce((acc, g) => (g.score > acc.score ? g : acc), candidates[0]);

    const lift =
      best === null
        ? 0
        : Math.round((best.safe_fraction - baseline.safe_fraction) * 10000) / 10000;

    return {
      baseline_safe_fraction: Math.round(baseline.safe_fraction * 10000) / 10000,
      baseline_force_p95: Math.round(baseline.force_p95 * 100) / 100,
      baseline_time_p50: Math.round(baseline.time_p50 * 100) / 100,
      top2_drivers: [top2[0], top2[1]],
      adjust_range: adjustRange,
      grid_steps: gridSteps,
      n_trials: nTrials,
      seed,
      time_weight: timeWeight,
      min_feasibility_rate: feasMin,
      best_point: best,
      safe_fraction_lift: lift,
      grid,
      source:
        "TurningThreadRobustOptimizerEngine.run (sensitivity → top2 → grid × MC, max safe_fraction)",
    };
  }
}

export const turningThreadRobustOptimizerEngine = new TurningThreadRobustOptimizerEngine();
export { TurningThreadRobustOptimizerEngine };
