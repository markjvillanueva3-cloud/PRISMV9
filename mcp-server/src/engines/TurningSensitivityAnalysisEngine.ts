/**
 * TurningSensitivityAnalysisEngine — LATHE-PRO-MS5.1 variability apportionment.
 *
 * Runs two complementary sensitivity methods over the MS1+MS2 cascade:
 *
 *   A. LOCAL ONE-AT-A-TIME (OAT):
 *      Perturbs each of 6 parameters by ±delta, measures ΔCpk,
 *      reports elasticity s_i = (ΔCpk/Cpk0) / (Δx_i/x_i).
 *
 *   B. MORRIS ELEMENTARY EFFECTS:
 *      Draws R trajectories through a p-level grid, flips one
 *      coordinate per step, reports μ* (importance) and σ
 *      (non-linearity / interactions).
 *
 * This engine is the shipped source of truth — dispatcher case
 * `turning_sensitivity_analysis` delegates here. Tests import
 * this engine directly.
 */
import {
  turningStochasticPlanEngine,
  type StochasticPlanInput,
} from "./TurningStochasticPlanEngine.js";
import type { OpSpec } from "./TurningInsertLifeEngine.js";

export interface SensitivityInput {
  ops: OpSpec[];
  batch_size: number;
  nominal_mm: number;
  tolerance_mm: number;
  oat_delta?: number;
  morris_trajectories?: number;
  morris_levels?: number;
  seed?: number;
  reliability_threshold?: number;
  vb_failure_um?: number;
  approach_angle_deg?: number;
  probe_interval?: number;
}

export interface OatRow {
  parameter: string;
  cpk_lo: number | null;
  cpk_hi: number | null;
  delta_cpk: number;
  elasticity: number;
  rank: number;
}

export interface MorrisRow {
  parameter: string;
  mu_star: number;
  sigma: number;
  samples: number;
  rank: number;
}

export interface SensitivityResult {
  cpk_baseline: number | null;
  error?: string;
  oat_delta?: number;
  morris_trajectories?: number;
  morris_grid_levels?: number;
  seed?: number;
  oat?: OatRow[];
  morris?: MorrisRow[];
  dominant_driver_oat?: string | null;
  dominant_driver_morris?: string | null;
  consensus_dominant?: string | null;
  source?: string;
}

const SENS_PARAMS = [
  "Vc_m_min",
  "f_mm_rev",
  "ap_mm",
  "vb_failure_um",
  "approach_angle_deg",
  "probe_interval",
] as const;
type SensParam = (typeof SENS_PARAMS)[number];

class TurningSensitivityAnalysisEngine {
  /** Deterministic cascade evaluator (shared with robust optimizer).
   *  Returns Cpk at a single operating point, or null when infeasible. */
  evaluateDeterministic(ctx: {
    ops: OpSpec[];
    batch_size: number;
    nominal_mm: number;
    tolerance_mm: number;
    reliability_threshold: number;
    vb_failure_um: number;
    approach_angle_deg: number;
    probe_interval: number;
  }): number | null {
    const r = turningStochasticPlanEngine.evaluateCascadeSample({
      ops: ctx.ops,
      batch_size: ctx.batch_size,
      nominal_mm: ctx.nominal_mm,
      tolerance_mm: ctx.tolerance_mm,
      reliability_threshold: ctx.reliability_threshold,
      vb_failure_um: ctx.vb_failure_um,
      approach_angle_deg: ctx.approach_angle_deg,
      auto_offset_enabled: true,
      probe_interval: Math.max(Math.round(ctx.probe_interval), 1),
    });
    return r === null ? null : r.cpk;
  }

  run(input: SensitivityInput): SensitivityResult {
    const batchSize = input.batch_size;
    const nominalMm = input.nominal_mm;
    const toleranceMm = input.tolerance_mm;
    const vbFailureBase = input.vb_failure_um ?? 300;
    const approachBase = input.approach_angle_deg ?? 90;
    const probeBase = input.probe_interval ?? 5;
    const threshold = input.reliability_threshold ?? 0.85;
    const delta = input.oat_delta ?? 0.10;
    const morrisR = input.morris_trajectories ?? 20;
    const p = input.morris_levels ?? 4;
    const seed = input.seed ?? 1;

    const baseOps: OpSpec[] = input.ops.map((o) => ({
      conditions: { ...o.conditions },
      duration_min: o.duration_min,
      label: o.label,
    }));

    const evalCpk = (x: {
      ops: OpSpec[];
      vbFailure: number;
      approachDeg: number;
      probeInterval: number;
    }): number | null =>
      this.evaluateDeterministic({
        ops: x.ops,
        batch_size: batchSize,
        nominal_mm: nominalMm,
        tolerance_mm: toleranceMm,
        reliability_threshold: threshold,
        vb_failure_um: x.vbFailure,
        approach_angle_deg: x.approachDeg,
        probe_interval: x.probeInterval,
      });

    const cpk0 = evalCpk({
      ops: baseOps,
      vbFailure: vbFailureBase,
      approachDeg: approachBase,
      probeInterval: probeBase,
    });
    if (cpk0 === null) {
      return {
        error: "baseline plan infeasible — loosen threshold or conditions",
        cpk_baseline: null,
      };
    }

    // ── A. LOCAL OAT ──
    const makePerturbedOps = (field: "Vc_m_min" | "f_mm_rev" | "ap_mm", factor: number) =>
      baseOps.map((o) => ({
        conditions: { ...o.conditions, [field]: o.conditions[field] * factor },
        duration_min: o.duration_min,
        label: o.label,
      }));
    const oatRaw: Omit<OatRow, "rank">[] = [];
    const push = (name: string, lo: number | null, hi: number | null) => {
      if (lo === null || hi === null) {
        oatRaw.push({ parameter: name, cpk_lo: lo, cpk_hi: hi, delta_cpk: 0, elasticity: 0 });
        return;
      }
      const d = Math.abs(hi - lo) / 2;
      const elasticity = d / (cpk0 * delta);
      oatRaw.push({
        parameter: name,
        cpk_lo: Math.round(lo * 1000) / 1000,
        cpk_hi: Math.round(hi * 1000) / 1000,
        delta_cpk: Math.round(d * 1000) / 1000,
        elasticity: Math.round(elasticity * 1000) / 1000,
      });
    };
    push("Vc_m_min",
      evalCpk({ ops: makePerturbedOps("Vc_m_min", 1 - delta), vbFailure: vbFailureBase, approachDeg: approachBase, probeInterval: probeBase }),
      evalCpk({ ops: makePerturbedOps("Vc_m_min", 1 + delta), vbFailure: vbFailureBase, approachDeg: approachBase, probeInterval: probeBase }));
    push("f_mm_rev",
      evalCpk({ ops: makePerturbedOps("f_mm_rev", 1 - delta), vbFailure: vbFailureBase, approachDeg: approachBase, probeInterval: probeBase }),
      evalCpk({ ops: makePerturbedOps("f_mm_rev", 1 + delta), vbFailure: vbFailureBase, approachDeg: approachBase, probeInterval: probeBase }));
    push("ap_mm",
      evalCpk({ ops: makePerturbedOps("ap_mm", 1 - delta), vbFailure: vbFailureBase, approachDeg: approachBase, probeInterval: probeBase }),
      evalCpk({ ops: makePerturbedOps("ap_mm", 1 + delta), vbFailure: vbFailureBase, approachDeg: approachBase, probeInterval: probeBase }));
    push("vb_failure_um",
      evalCpk({ ops: baseOps, vbFailure: vbFailureBase * (1 - delta), approachDeg: approachBase, probeInterval: probeBase }),
      evalCpk({ ops: baseOps, vbFailure: vbFailureBase * (1 + delta), approachDeg: approachBase, probeInterval: probeBase }));
    push("approach_angle_deg",
      evalCpk({ ops: baseOps, vbFailure: vbFailureBase, approachDeg: approachBase * (1 - delta), probeInterval: probeBase }),
      evalCpk({ ops: baseOps, vbFailure: vbFailureBase, approachDeg: Math.min(approachBase * (1 + delta), 180), probeInterval: probeBase }));
    push("probe_interval",
      evalCpk({ ops: baseOps, vbFailure: vbFailureBase, approachDeg: approachBase, probeInterval: Math.max(probeBase * (1 - delta), 1) }),
      evalCpk({ ops: baseOps, vbFailure: vbFailureBase, approachDeg: approachBase, probeInterval: probeBase * (1 + delta) }));

    const oatRanked: OatRow[] = oatRaw
      .slice()
      .sort((a, b) => Math.abs(b.elasticity) - Math.abs(a.elasticity))
      .map((row, i) => ({ ...row, rank: i + 1 }));

    // ── B. MORRIS screening ──
    const { rand } = turningStochasticPlanEngine.makeSeededRandom(seed);
    const gridStep = 1 / (p - 1);
    const morrisDelta = gridStep * Math.floor(p / 2);
    const effects: Record<string, number[]> = Object.fromEntries(
      SENS_PARAMS.map((n) => [n, []]),
    );
    const scaleFromLevel = (name: SensParam, lvl: number): number => {
      const norm = lvl * gridStep;
      const scale = 1 - delta + norm * 2 * delta;
      if (name === "approach_angle_deg") return Math.min(scale, 2.0);
      if (name === "probe_interval") return Math.max(scale, 0.2);
      return scale;
    };
    const buildPoint = (levels: number[]) => {
      const factors = Object.fromEntries(
        SENS_PARAMS.map((n, i) => [n, scaleFromLevel(n, levels[i])]),
      );
      return {
        ops: baseOps.map((o) => ({
          conditions: {
            ...o.conditions,
            Vc_m_min: o.conditions.Vc_m_min * factors.Vc_m_min,
            f_mm_rev: o.conditions.f_mm_rev * factors.f_mm_rev,
            ap_mm: o.conditions.ap_mm * factors.ap_mm,
          },
          duration_min: o.duration_min,
          label: o.label,
        })),
        vbFailure: vbFailureBase * factors.vb_failure_um,
        approachDeg: Math.min(approachBase * factors.approach_angle_deg, 180),
        probeInterval: Math.max(probeBase * factors.probe_interval, 1),
      };
    };
    for (let r = 0; r < morrisR; r++) {
      const current = SENS_PARAMS.map(() => Math.floor(rand() * p));
      const order = SENS_PARAMS.map((_, i) => i);
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }
      let prevCpk = evalCpk(buildPoint(current));
      for (const dim of order) {
        if (prevCpk === null) {
          prevCpk = cpk0;
          current[dim] = Math.floor(p / 2);
          continue;
        }
        const step = current[dim] + Math.floor(p / 2) < p ? 1 : -1;
        current[dim] += step * Math.floor(p / 2);
        current[dim] = Math.max(0, Math.min(p - 1, current[dim]));
        const nextCpk = evalCpk(buildPoint(current));
        if (nextCpk !== null) {
          effects[SENS_PARAMS[dim]].push(Math.abs(nextCpk - prevCpk) / morrisDelta);
          prevCpk = nextCpk;
        }
      }
    }

    const morrisRaw = SENS_PARAMS.map((name) => {
      const arr = effects[name];
      const n = arr.length;
      const mean = n ? arr.reduce((s, v) => s + v, 0) / n : 0;
      const variance = n > 1 ? arr.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1) : 0;
      return {
        parameter: name as string,
        mu_star: Math.round(mean * 1000) / 1000,
        sigma: Math.round(Math.sqrt(variance) * 1000) / 1000,
        samples: n,
      };
    });
    const morrisRanked: MorrisRow[] = morrisRaw
      .slice()
      .sort((a, b) => b.mu_star - a.mu_star)
      .map((row, i) => ({ ...row, rank: i + 1 }));

    return {
      cpk_baseline: Math.round(cpk0 * 1000) / 1000,
      oat_delta: delta,
      morris_trajectories: morrisR,
      morris_grid_levels: p,
      seed,
      oat: oatRanked,
      morris: morrisRanked,
      dominant_driver_oat: oatRanked[0]?.parameter ?? null,
      dominant_driver_morris: morrisRanked[0]?.parameter ?? null,
      consensus_dominant:
        oatRanked[0]?.parameter === morrisRanked[0]?.parameter
          ? oatRanked[0]?.parameter
          : null,
      source: "TurningSensitivityAnalysisEngine.run (local-OAT + Morris)",
    };
  }

  /** Helper: return top-N drivers by |elasticity| from a full result. */
  topDriversByElasticity(result: SensitivityResult, n: number): string[] {
    if (!result.oat) return [];
    return result.oat.slice(0, n).map((r) => r.parameter);
  }
}

export const turningSensitivityAnalysisEngine = new TurningSensitivityAnalysisEngine();
export { TurningSensitivityAnalysisEngine };
