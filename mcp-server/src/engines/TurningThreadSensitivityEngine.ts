/**
 * TurningThreadSensitivityEngine — LATHE-PRO-MS4a.
 *
 * Variability apportionment for single-point threading. Mirrors the
 * MS5.1 OAT sensitivity pattern but applies to the thread cascade.
 *
 * Parameters perturbed (±oat_delta, or ±1 pass for num_passes):
 *   • spindle_rpm          — relative ±
 *   • pitch_mm             — relative ±
 *   • major_diameter_mm    — relative ±
 *   • num_passes           — integer ±1 (boundary-aware)
 *   • lead_in_mm           — relative ±
 *   • lead_out_mm          — relative ±
 *
 * Output per parameter:
 *   • delta_force_p95      — change in P95 force when perturbed ±
 *   • delta_safe_fraction  — change in safe_fraction
 *   • elasticity_force     — (ΔF/F₀) / delta  (dimensionless)
 *   • elasticity_safe      — absolute Δsafe / delta
 *
 * Ranked by |elasticity_safe| (dominant driver of safety wins).
 * Dominant driver feeds the robust pass-count selector's priors.
 *
 * Shipped source of truth — dispatcher action
 * `turning_thread_sensitivity` delegates here.
 */
import {
  turningThreadStochasticPlanEngine,
} from "./TurningThreadStochasticPlanEngine.js";
import type { SPTInput } from "./SinglePointThreadEngine.js";

export interface ThreadSensitivityInput {
  thread: SPTInput;
  oat_delta?: number;
  n_trials?: number;
  seed?: number;
  sigma_rpm_rel?: number;
  sigma_od_abs_mm?: number;
  sigma_pitch_abs_mm?: number;
  sigma_lead_rel?: number;
  force_limit_N?: number;
}

export interface ThreadSensRow {
  parameter: string;
  force_p95_lo: number;
  force_p95_hi: number;
  safe_frac_lo: number;
  safe_frac_hi: number;
  delta_force_p95: number;
  delta_safe_fraction: number;
  elasticity_force: number;
  elasticity_safe: number;
  rank: number;
}

export interface ThreadSensitivityResult {
  baseline_force_p95: number;
  baseline_safe_fraction: number;
  oat_delta: number;
  rows: ThreadSensRow[];
  dominant_force_driver: string | null;
  dominant_safe_driver: string | null;
  source: string;
}

const SENS_PARAMS = [
  "spindle_rpm",
  "pitch_mm",
  "major_diameter_mm",
  "num_passes",
  "lead_in_mm",
  "lead_out_mm",
] as const;
type SensParam = (typeof SENS_PARAMS)[number];

class TurningThreadSensitivityEngine {
  private validate(t: SPTInput): void {
    if (!t || typeof t !== "object") {
      throw new Error("thread spec is required");
    }
    if (!Number.isFinite(t.pitch_mm) || t.pitch_mm <= 0) {
      throw new Error("thread.pitch_mm must be positive finite");
    }
    if (!Number.isFinite(t.major_diameter_mm) || t.major_diameter_mm <= 0) {
      throw new Error("thread.major_diameter_mm must be positive finite");
    }
    if (!Number.isFinite(t.num_passes) || t.num_passes < 1) {
      throw new Error("thread.num_passes must be ≥ 1");
    }
  }

  /** Evaluate the stochastic plan at a perturbed thread spec; returns
   *  {force_p95, safe_fraction} or null when infeasible. */
  private evalAt(
    t: SPTInput,
    common: {
      n_trials: number;
      seed: number;
      sVc: number;
      sOd: number;
      sPitch: number;
      sLead: number;
      force_limit_N: number;
    },
  ): { force_p95: number; safe_fraction: number } | null {
    try {
      const r = turningThreadStochasticPlanEngine.run({
        thread: t,
        n_trials: common.n_trials,
        seed: common.seed,
        sigma_rpm_rel: common.sVc,
        sigma_od_abs_mm: common.sOd,
        sigma_pitch_abs_mm: common.sPitch,
        sigma_lead_rel: common.sLead,
        force_limit_N: common.force_limit_N,
      });
      if (r.trials_feasible === 0) return null;
      return { force_p95: r.force_peak_p95, safe_fraction: r.safe_fraction };
    } catch {
      return null;
    }
  }

  /** Apply a ±factor perturbation along one parameter axis. Returns a
   *  fresh SPTInput clone — does NOT mutate the input. */
  private perturb(base: SPTInput, param: SensParam, factor: number): SPTInput {
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
        // Integer perturbation: ±1 when factor > 1, -1 when factor < 1
        const shift = factor > 1 ? 1 : -1;
        clone.num_passes = Math.max(1, base.num_passes + shift);
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

  run(input: ThreadSensitivityInput): ThreadSensitivityResult {
    this.validate(input.thread);
    const delta = input.oat_delta ?? 0.10;
    if (!Number.isFinite(delta) || delta <= 0 || delta >= 1) {
      throw new Error("oat_delta must be in (0, 1)");
    }

    const common = {
      n_trials: input.n_trials ?? 50,
      seed: input.seed ?? 1,
      sVc: input.sigma_rpm_rel ?? 0.02,
      sOd: input.sigma_od_abs_mm ?? 0.05,
      sPitch: input.sigma_pitch_abs_mm ?? 0.01,
      sLead: input.sigma_lead_rel ?? 0.05,
      force_limit_N: input.force_limit_N ?? 500,
    };

    // Baseline
    const baseline = this.evalAt(input.thread, common);
    if (baseline === null) {
      throw new Error(
        "baseline thread plan infeasible — loosen σ or increase force_limit_N",
      );
    }

    const rows: Omit<ThreadSensRow, "rank">[] = [];
    for (const param of SENS_PARAMS) {
      const lo = this.evalAt(this.perturb(input.thread, param, 1 - delta), common);
      const hi = this.evalAt(this.perturb(input.thread, param, 1 + delta), common);
      const forceLo = lo?.force_p95 ?? baseline.force_p95;
      const forceHi = hi?.force_p95 ?? baseline.force_p95;
      const safeLo = lo?.safe_fraction ?? baseline.safe_fraction;
      const safeHi = hi?.safe_fraction ?? baseline.safe_fraction;
      const dForce = (forceHi - forceLo) / 2;
      const dSafe = (safeHi - safeLo) / 2;
      const forceBase = Math.max(baseline.force_p95, 1e-6);
      const elasticityForce = dForce / (forceBase * delta);
      const elasticitySafe = dSafe / delta;
      rows.push({
        parameter: param,
        force_p95_lo: Math.round(forceLo * 100) / 100,
        force_p95_hi: Math.round(forceHi * 100) / 100,
        safe_frac_lo: Math.round(safeLo * 10000) / 10000,
        safe_frac_hi: Math.round(safeHi * 10000) / 10000,
        delta_force_p95: Math.round(dForce * 100) / 100,
        delta_safe_fraction: Math.round(dSafe * 10000) / 10000,
        elasticity_force: Math.round(elasticityForce * 10000) / 10000,
        elasticity_safe: Math.round(elasticitySafe * 10000) / 10000,
      });
    }

    // Rank primarily by |elasticity_safe| (safety is king), then |elasticity_force|
    const ranked: ThreadSensRow[] = rows
      .slice()
      .sort((a, b) => {
        const d = Math.abs(b.elasticity_safe) - Math.abs(a.elasticity_safe);
        if (Math.abs(d) > 1e-9) return d;
        return Math.abs(b.elasticity_force) - Math.abs(a.elasticity_force);
      })
      .map((r, i) => ({ ...r, rank: i + 1 }));

    const forceRanked = rows
      .slice()
      .sort((a, b) => Math.abs(b.elasticity_force) - Math.abs(a.elasticity_force));

    return {
      baseline_force_p95: Math.round(baseline.force_p95 * 100) / 100,
      baseline_safe_fraction: Math.round(baseline.safe_fraction * 10000) / 10000,
      oat_delta: delta,
      rows: ranked,
      dominant_safe_driver: ranked[0]?.parameter ?? null,
      dominant_force_driver: forceRanked[0]?.parameter ?? null,
      source:
        "TurningThreadSensitivityEngine.run (OAT apportionment on thread cascade)",
    };
  }

  /** Helper for callers that want just the ordered parameter names. */
  topDriversBySafeElasticity(result: ThreadSensitivityResult, n: number): string[] {
    return result.rows.slice(0, n).map((r) => r.parameter);
  }
}

export const turningThreadSensitivityEngine = new TurningThreadSensitivityEngine();
export { TurningThreadSensitivityEngine };
