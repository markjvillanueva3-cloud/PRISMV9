/**
 * TurningThreadStochasticPlanEngine — LATHE-PRO-MS4a.
 *
 * Monte Carlo wrapper for single-point threading under shop-floor
 * variability. Extends the MS5 stochastic pattern (seeded mulberry32 +
 * Box-Muller Gaussian sampling + P5/P50/P95 quantiles) to the
 * threading cascade.
 *
 * Variability axes (independent Gaussian noise per trial):
 *   • sigma_rpm_rel        — spindle RPM tolerance (relative, default 2%)
 *   • sigma_od_abs_mm      — stock OD tolerance (absolute mm, default 0.05)
 *   • sigma_pitch_abs_mm   — insert pitch tolerance (absolute mm, default 0.01)
 *   • sigma_lead_rel       — lead-in/lead-out variability (relative, default 5%)
 *
 * Output quantiles over feasible trials:
 *   • max_chip_area_mm²    — peak cutting load
 *   • force_peak_N         — chip_area × material_tensile (Kienzle-like scalar)
 *   • overtravel_mm        — actual overtravel (safety: must fit lead_out)
 *   • time_sec             — cycle time
 *   • safe_fraction        — proportion of trials where validator passes
 *
 * This engine is the shipped source of truth — dispatcher action
 * `turning_thread_stochastic_plan` delegates here. Tests import directly
 * AND invoke through the dispatcher.
 */
import {
  singlePointThreadEngine,
  type SPTInput,
} from "./SinglePointThreadEngine.js";

export interface ThreadStochasticInput {
  /** Deterministic base thread spec. Every MC trial perturbs this. */
  thread: SPTInput;
  n_trials?: number;
  seed?: number;
  sigma_rpm_rel?: number;
  sigma_od_abs_mm?: number;
  sigma_pitch_abs_mm?: number;
  sigma_lead_rel?: number;
  /** Force limit for "safe trial" classification (N). Default 500. */
  force_limit_N?: number;
}

export interface ThreadStochasticResult {
  trials_attempted: number;
  trials_feasible: number;
  safe_fraction: number;
  chip_area_p05: number;
  chip_area_p50: number;
  chip_area_p95: number;
  force_peak_p05: number;
  force_peak_p50: number;
  force_peak_p95: number;
  overtravel_p05: number;
  overtravel_p50: number;
  overtravel_p95: number;
  time_p05: number;
  time_p50: number;
  time_p95: number;
  /** Raw feasible samples for custom aggregation. */
  chip_areas: number[];
  forces: number[];
  overtravels: number[];
  times: number[];
  source: string;
}

export interface RobustPassCountInput {
  thread: SPTInput;
  /** Candidate pass counts to evaluate. */
  candidate_passes: number[];
  n_trials?: number;
  seed?: number;
  force_limit_N?: number;
  sigma_rpm_rel?: number;
  sigma_od_abs_mm?: number;
  sigma_pitch_abs_mm?: number;
  sigma_lead_rel?: number;
}

export interface RobustPassCountCandidate {
  num_passes: number;
  safe_fraction: number;
  force_p95: number;
  time_p50: number;
  score: number;
}

export interface RobustPassCountResult {
  candidates: RobustPassCountCandidate[];
  best: RobustPassCountCandidate | null;
  source: string;
}

class TurningThreadStochasticPlanEngine {
  /** Seeded mulberry32 + Box-Muller normal. Matches the convention used
   *  by TurningStochasticPlanEngine so both cascades share PRNG behaviour. */
  makeSeededRandom(seed: number): { rand: () => number; normal: () => number } {
    let state = seed;
    const rand = () => {
      let t = (state += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const normal = () => {
      const u1 = Math.max(rand(), 1e-10);
      const u2 = rand();
      return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    };
    return { rand, normal };
  }

  quantile(arr: number[], q: number): number {
    if (!arr.length) return 0;
    const s = [...arr].sort((a, b) => a - b);
    return s[Math.min(Math.max(Math.floor(q * s.length), 0), s.length - 1)];
  }

  /** Validate the base input once, so MC loop doesn't re-check per trial. */
  private validateInput(t: SPTInput): void {
    if (!t || typeof t !== "object") {
      throw new Error("TurningThreadStochasticPlanEngine: thread spec is required");
    }
    const numChecks: Array<[string, number]> = [
      ["pitch_mm", t.pitch_mm],
      ["major_diameter_mm", t.major_diameter_mm],
      ["total_depth_mm", t.total_depth_mm],
      ["spindle_rpm", t.spindle_rpm],
      ["num_passes", t.num_passes],
      ["spring_passes", t.spring_passes],
      ["lead_in_mm", t.lead_in_mm],
      ["lead_out_mm", t.lead_out_mm],
      ["thread_length_mm", t.thread_length_mm],
      ["material_tensile_MPa", t.material_tensile_MPa],
    ];
    for (const [k, v] of numChecks) {
      if (!Number.isFinite(v)) {
        throw new Error(`thread.${k} must be finite, got ${v}`);
      }
    }
    if (t.pitch_mm <= 0) throw new Error("pitch_mm must be positive");
    if (t.major_diameter_mm <= 0) throw new Error("major_diameter_mm must be positive");
    if (t.num_passes < 1) throw new Error("num_passes must be ≥ 1");
    if (t.spring_passes < 0) throw new Error("spring_passes must be ≥ 0");
    if (t.spindle_rpm <= 0) throw new Error("spindle_rpm must be positive");
  }

  /** Evaluate a single (possibly perturbed) thread spec: returns peak chip area,
   *  peak force estimate, overtravel, and cycle time. Returns null on infeasible. */
  evaluateTrial(
    t: SPTInput,
    forceLimit: number,
  ): {
    chipArea: number;
    forcePeak: number;
    overtravel: number;
    time: number;
    safe: boolean;
  } | null {
    try {
      const plan = singlePointThreadEngine.calculatePassPlan(t);
      const validation = singlePointThreadEngine.validate(t);
      // Force peak = max_chip_area × tensile (N, coarse bound)
      const forcePeak = plan.max_chip_area_mm2 * t.material_tensile_MPa;
      const safe =
        validation.clearance_ok &&
        validation.synchronization_ok &&
        forcePeak <= forceLimit;
      return {
        chipArea: plan.max_chip_area_mm2,
        forcePeak,
        overtravel: validation.overtravel_mm,
        time: plan.estimated_time_sec,
        safe,
      };
    } catch {
      return null;
    }
  }

  run(input: ThreadStochasticInput): ThreadStochasticResult {
    this.validateInput(input.thread);
    const trials = input.n_trials ?? 100;
    if (trials < 10 || trials > 5000) {
      throw new Error(`n_trials must be in [10, 5000], got ${trials}`);
    }
    const seed = input.seed ?? 1;
    const sRpm = input.sigma_rpm_rel ?? 0.02;
    const sOd = input.sigma_od_abs_mm ?? 0.05;
    const sPitch = input.sigma_pitch_abs_mm ?? 0.01;
    const sLead = input.sigma_lead_rel ?? 0.05;
    const forceLimit = input.force_limit_N ?? 500;

    const { normal } = this.makeSeededRandom(seed);

    const chipAreas: number[] = [];
    const forces: number[] = [];
    const overtravels: number[] = [];
    const times: number[] = [];
    let safeCount = 0;

    for (let t = 0; t < trials; t++) {
      const perturbed: SPTInput = {
        ...input.thread,
        spindle_rpm: Math.max(
          input.thread.spindle_rpm * (1 + normal() * sRpm),
          1,
        ),
        major_diameter_mm: Math.max(
          input.thread.major_diameter_mm + normal() * sOd,
          0.01,
        ),
        pitch_mm: Math.max(input.thread.pitch_mm + normal() * sPitch, 0.01),
        lead_in_mm: Math.max(input.thread.lead_in_mm * (1 + normal() * sLead), 0),
        lead_out_mm: Math.max(input.thread.lead_out_mm * (1 + normal() * sLead), 0),
      };
      const r = this.evaluateTrial(perturbed, forceLimit);
      if (r !== null) {
        chipAreas.push(r.chipArea);
        forces.push(r.forcePeak);
        overtravels.push(r.overtravel);
        times.push(r.time);
        if (r.safe) safeCount++;
      }
    }

    const round = (x: number, dp: number) =>
      Math.round(x * 10 ** dp) / 10 ** dp;
    return {
      trials_attempted: trials,
      trials_feasible: chipAreas.length,
      safe_fraction: round(safeCount / Math.max(chipAreas.length, 1), 4),
      chip_area_p05: round(this.quantile(chipAreas, 0.05), 5),
      chip_area_p50: round(this.quantile(chipAreas, 0.5), 5),
      chip_area_p95: round(this.quantile(chipAreas, 0.95), 5),
      force_peak_p05: round(this.quantile(forces, 0.05), 2),
      force_peak_p50: round(this.quantile(forces, 0.5), 2),
      force_peak_p95: round(this.quantile(forces, 0.95), 2),
      overtravel_p05: round(this.quantile(overtravels, 0.05), 3),
      overtravel_p50: round(this.quantile(overtravels, 0.5), 3),
      overtravel_p95: round(this.quantile(overtravels, 0.95), 3),
      time_p05: round(this.quantile(times, 0.05), 2),
      time_p50: round(this.quantile(times, 0.5), 2),
      time_p95: round(this.quantile(times, 0.95), 2),
      chip_areas: chipAreas,
      forces,
      overtravels,
      times,
      source:
        "TurningThreadStochasticPlanEngine.run (MC over SinglePointThread with σ on RPM/OD/pitch/lead)",
    };
  }

  /** Robust pass-count selector: evaluate each candidate under MC and pick
   *  the one maximising safe_fraction with time as tie-breaker. */
  selectRobustPassCount(input: RobustPassCountInput): RobustPassCountResult {
    this.validateInput(input.thread);
    if (!Array.isArray(input.candidate_passes) || input.candidate_passes.length === 0) {
      throw new Error("candidate_passes must be a non-empty array");
    }
    for (const n of input.candidate_passes) {
      if (!Number.isFinite(n) || n < 1 || n !== Math.floor(n)) {
        throw new Error(`candidate_passes must contain positive integers, got ${n}`);
      }
    }

    const candidates: RobustPassCountCandidate[] = [];
    for (const np of input.candidate_passes) {
      const r = this.run({
        thread: { ...input.thread, num_passes: np },
        n_trials: input.n_trials ?? 50,
        seed: input.seed,
        sigma_rpm_rel: input.sigma_rpm_rel,
        sigma_od_abs_mm: input.sigma_od_abs_mm,
        sigma_pitch_abs_mm: input.sigma_pitch_abs_mm,
        sigma_lead_rel: input.sigma_lead_rel,
        force_limit_N: input.force_limit_N,
      });
      // Score: safe_fraction dominates; break ties by negative time
      const score =
        r.safe_fraction - r.time_p50 / 1e6; // tiny time penalty
      candidates.push({
        num_passes: np,
        safe_fraction: r.safe_fraction,
        force_p95: r.force_peak_p95,
        time_p50: r.time_p50,
        score: Math.round(score * 100000) / 100000,
      });
    }

    candidates.sort((a, b) => b.score - a.score);
    const best = candidates.length > 0 ? candidates[0] : null;
    return {
      candidates,
      best,
      source:
        "TurningThreadStochasticPlanEngine.selectRobustPassCount (MC over candidates)",
    };
  }
}

export const turningThreadStochasticPlanEngine = new TurningThreadStochasticPlanEngine();
export { TurningThreadStochasticPlanEngine };
