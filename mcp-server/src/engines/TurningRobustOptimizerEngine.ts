/**
 * TurningRobustOptimizerEngine — LATHE-PRO-MS5.2 capstone.
 *
 * Sensitivity-driven robust design:
 *   1. Runs a cheap OAT screen (via SensitivityAnalysisEngine) to find
 *      the top-2 Cpk drivers.
 *   2. Grid-searches (steps × steps) over those two parameters, each
 *      scaled in [1 - adjust_range, 1 + adjust_range].
 *   3. At each grid point, runs a Monte Carlo of the full MS1+MS2
 *      cascade under Gaussian σ on (Vc, f, ap) (via StochasticPlanEngine).
 *   4. Scores each point by P5(Cpk) — the pessimistic quantile.
 *   5. Returns the argmax point, gain vs baseline, and the full grid
 *      so the caller can see the landscape.
 *
 * This engine is the shipped source of truth — dispatcher case
 * `turning_robust_optimizer` delegates here. Tests import directly.
 */
import type { OpSpec } from "./TurningInsertLifeEngine.js";
import { turningStochasticPlanEngine } from "./TurningStochasticPlanEngine.js";
import {
  turningSensitivityAnalysisEngine,
} from "./TurningSensitivityAnalysisEngine.js";
import { turningEnvelopeDistanceEngine } from "./TurningEnvelopeDistanceEngine.js";
import type { RuleGenerationContext } from "./TurningRulesGeneratorEngine.js";

export interface RobustOptimizerInput {
  ops: OpSpec[];
  batch_size: number;
  nominal_mm: number;
  tolerance_mm: number;
  adjust_range?: number;
  grid_steps?: number;
  n_trials?: number;
  sigma_vc_rel?: number;
  sigma_feed_rel?: number;
  sigma_ap_rel?: number;
  seed?: number;
  reliability_threshold?: number;
  vb_failure_um?: number;
  approach_angle_deg?: number;
  probe_interval?: number;
  min_feasibility_rate?: number;
  /** Optional MS5.3 integration: when provided, each grid point is
   *  scored against the canonical rule envelopes from
   *  TurningRulesGeneratorEngine. Grid points whose envelope margin
   *  is below the penalty threshold are demoted in ranking. */
  envelope_context?: RuleGenerationContext;
  /** Weight on envelope margin in the composite score:
   *    score = p05 + envelope_weight * min_margin_to_edge
   *  When 0 (default), ranking is pure P5(Cpk).
   *  When > 0, ties on P5 are broken by envelope margin, and strong
   *  envelope violations are penalized. */
  envelope_weight?: number;
}

export interface GridPoint {
  factors: Record<string, number>;
  p05: number;
  p50: number;
  p95: number;
  feasRate: number;
  /** MS5.3 augment: min margin-to-edge across all ops × rules at this
   *  grid point. Present only when envelope_context is provided. */
  envelope_min_margin?: number;
  /** Composite score used for ranking: p05 + envelope_weight*margin. */
  score?: number;
}

export interface RobustOptimizerResult {
  cpk_baseline: number | null;
  error?: string;
  baseline_p05?: number;
  baseline_p50?: number;
  baseline_feasibility_rate?: number;
  top2_drivers?: string[];
  adjust_range?: number;
  grid_steps?: number;
  n_trials?: number;
  seed?: number;
  best_point?: GridPoint & { feasibility_rate: number };
  cpk_p05_lift?: number;
  grid?: GridPoint[];
  min_feasibility_rate?: number;
  /** MS5.3 envelope-aware augment, present when envelope_context was provided. */
  envelope_used?: boolean;
  envelope_weight?: number;
  baseline_envelope_margin?: number;
  best_envelope_margin?: number;
  source?: string;
}

const ALL_DIMS = [
  "Vc_m_min",
  "f_mm_rev",
  "ap_mm",
  "vb_failure_um",
  "approach_angle_deg",
  "probe_interval",
] as const;

class TurningRobustOptimizerEngine {
  run(input: RobustOptimizerInput): RobustOptimizerResult {
    const batchSize = input.batch_size;
    const nominalMm = input.nominal_mm;
    const toleranceMm = input.tolerance_mm;
    const adjustRange = input.adjust_range ?? 0.15;
    const gridSteps = input.grid_steps ?? 5;
    const nTrials = input.n_trials ?? 50;
    const sVc = input.sigma_vc_rel ?? 0.05;
    const sF = input.sigma_feed_rel ?? 0.05;
    const sAp = input.sigma_ap_rel ?? 0.05;
    const seed = input.seed ?? 1;
    const threshold = input.reliability_threshold ?? 0.85;
    const vbFailureBase = input.vb_failure_um ?? 300;
    const approachBase = input.approach_angle_deg ?? 90;
    const probeBase = input.probe_interval ?? 5;
    const minFeasRate = input.min_feasibility_rate ?? 0.7;

    const baseOps: OpSpec[] = input.ops.map((o) => ({
      conditions: { ...o.conditions },
      duration_min: o.duration_min,
      label: o.label,
    }));

    // Baseline deterministic Cpk
    const cpkBaseline = turningSensitivityAnalysisEngine.evaluateDeterministic({
      ops: baseOps,
      batch_size: batchSize,
      nominal_mm: nominalMm,
      tolerance_mm: toleranceMm,
      reliability_threshold: threshold,
      vb_failure_um: vbFailureBase,
      approach_angle_deg: approachBase,
      probe_interval: probeBase,
    });
    if (cpkBaseline === null) {
      return {
        error: "baseline plan infeasible — loosen threshold or conditions",
        cpk_baseline: null,
      };
    }

    // OAT screen → top-2 drivers
    const sens = turningSensitivityAnalysisEngine.run({
      ops: baseOps,
      batch_size: batchSize,
      nominal_mm: nominalMm,
      tolerance_mm: toleranceMm,
      oat_delta: 0.10,
      // Morris trajectories=4 (minimum allowed) to keep screen cheap
      morris_trajectories: 4,
      morris_levels: 3,
      seed,
      reliability_threshold: threshold,
      vb_failure_um: vbFailureBase,
      approach_angle_deg: approachBase,
      probe_interval: probeBase,
    });
    const top2 = turningSensitivityAnalysisEngine
      .topDriversByElasticity(sens, 2);

    // Monte Carlo at a given operating-point factor vector
    const evalRobustCpk = (factors: Record<string, number>) => {
      const mc = turningStochasticPlanEngine.run({
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
        batch_size: batchSize,
        nominal_mm: nominalMm,
        tolerance_mm: toleranceMm,
        n_trials: nTrials,
        seed,
        sigma_vc_rel: sVc,
        sigma_feed_rel: sF,
        sigma_ap_rel: sAp,
        reliability_threshold: threshold,
        vb_failure_um: vbFailureBase * factors.vb_failure_um,
        approach_angle_deg: Math.min(approachBase * factors.approach_angle_deg, 180),
        auto_offset_enabled: true,
        probe_interval: Math.max(
          Math.round(probeBase * factors.probe_interval),
          1,
        ),
      });
      return {
        p05: mc.cpk_p05,
        p50: mc.cpk_p50,
        p95: mc.cpk_p95,
        feasRate: mc.trials_feasible / Math.max(mc.trials_attempted, 1),
      };
    };

    const fixedFactors: Record<string, number> = Object.fromEntries(
      ALL_DIMS.map((n) => [n, 1.0]),
    );

    // Envelope distance helper: takes a factor vector and returns the
    // minimum margin-to-edge across all ops × rules at the scaled plan.
    const envelopeWeight = input.envelope_weight ?? 0;
    const useEnvelope = input.envelope_context !== undefined;
    const envelopeMargin = (factors: Record<string, number>): number => {
      if (!useEnvelope) return 0;
      const scaledOps: OpSpec[] = baseOps.map((o) => ({
        conditions: {
          ...o.conditions,
          Vc_m_min: o.conditions.Vc_m_min * factors.Vc_m_min,
          f_mm_rev: o.conditions.f_mm_rev * factors.f_mm_rev,
          ap_mm: o.conditions.ap_mm * factors.ap_mm,
        },
        duration_min: o.duration_min,
        label: o.label,
      }));
      const env = turningEnvelopeDistanceEngine.run({
        rules_context: input.envelope_context!,
        ops: scaledOps,
      });
      return env.overall_min_margin;
    };

    const grid: GridPoint[] = [];
    const stepLow = 1 - adjustRange;
    const stepStride = (2 * adjustRange) / Math.max(gridSteps - 1, 1);
    for (let i = 0; i < gridSteps; i++) {
      for (let j = 0; j < gridSteps; j++) {
        const fac = { ...fixedFactors };
        fac[top2[0]] = stepLow + i * stepStride;
        fac[top2[1]] = stepLow + j * stepStride;
        const mc = evalRobustCpk(fac);
        const p05r = Math.round(mc.p05 * 1000) / 1000;
        const gp: GridPoint = {
          factors: { ...fac },
          p05: p05r,
          p50: Math.round(mc.p50 * 1000) / 1000,
          p95: Math.round(mc.p95 * 1000) / 1000,
          feasRate: Math.round(mc.feasRate * 1000) / 1000,
        };
        if (useEnvelope) {
          const m = envelopeMargin(fac);
          gp.envelope_min_margin = Math.round(m * 10000) / 10000;
          gp.score = Math.round((p05r + envelopeWeight * m) * 10000) / 10000;
        } else {
          gp.score = p05r;
        }
        grid.push(gp);
      }
    }

    const feasible = grid.filter((g) => g.feasRate >= minFeasRate);
    const candidates = feasible.length > 0 ? feasible : grid;
    // Select by composite score (p05 + envelope_weight * margin).
    // When envelope is not in use, score === p05, so ranking is
    // identical to the MS5.2 behaviour — fully backwards-compatible.
    const best = candidates.reduce(
      (acc, g) => ((g.score ?? g.p05) > (acc.score ?? acc.p05) ? g : acc),
      candidates[0],
    );
    const baselineRobust = evalRobustCpk(fixedFactors);
    const lift = best.p05 - Math.round(baselineRobust.p05 * 1000) / 1000;
    const baselineEnvMargin = useEnvelope ? envelopeMargin(fixedFactors) : undefined;

    return {
      cpk_baseline: Math.round(cpkBaseline * 1000) / 1000,
      baseline_p05: Math.round(baselineRobust.p05 * 1000) / 1000,
      baseline_p50: Math.round(baselineRobust.p50 * 1000) / 1000,
      baseline_feasibility_rate: Math.round(baselineRobust.feasRate * 1000) / 1000,
      top2_drivers: top2,
      adjust_range: adjustRange,
      grid_steps: gridSteps,
      n_trials: nTrials,
      seed,
      best_point: {
        factors: best.factors,
        p05: best.p05,
        p50: best.p50,
        p95: best.p95,
        feasRate: best.feasRate,
        feasibility_rate: best.feasRate,
        envelope_min_margin: best.envelope_min_margin,
        score: best.score,
      },
      cpk_p05_lift: Math.round(lift * 1000) / 1000,
      grid,
      min_feasibility_rate: minFeasRate,
      envelope_used: useEnvelope,
      envelope_weight: useEnvelope ? envelopeWeight : undefined,
      baseline_envelope_margin:
        baselineEnvMargin !== undefined
          ? Math.round(baselineEnvMargin * 10000) / 10000
          : undefined,
      best_envelope_margin: best.envelope_min_margin,
      source: useEnvelope
        ? "TurningRobustOptimizerEngine.run (OAT + grid × MC + envelope-aware scoring)"
        : "TurningRobustOptimizerEngine.run (OAT-screen → top2 → grid × MC, max P5(Cpk))",
    };
  }
}

export const turningRobustOptimizerEngine = new TurningRobustOptimizerEngine();
export { TurningRobustOptimizerEngine };
