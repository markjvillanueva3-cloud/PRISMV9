/**
 * LatheActualFeedbackTuningEngine
 * ================================
 *
 * Post-production closed-loop tuning of lathe physics parameters from
 * actual-vs-predicted residuals.
 *
 * After a production run, compare observed outcomes against predictions and
 * emit corrected values for:
 *   - Taylor tool-life coefficient C (at fixed exponent n)
 *   - Cycle-time model multiplier k_time
 *   - Scrap-rate baseline p_scrap
 *   - Kienzle specific-cutting-force scale kc_scale
 *
 * Algorithm:
 *   1. For each operation, read predicted cycle / tool life / power / scrap
 *      rate from the estimator's record and actual observations from the run
 *      logger.
 *   2. Compute residual ratios:
 *        time_ratio  = actual_time / predicted_time
 *        tl_ratio    = actual_life / predicted_life
 *        power_ratio = actual_power_kW / predicted_power_kW
 *   3. Apply exponential smoothing:
 *        new = old * (1 - α) + observation * α
 *      Default α = 0.25 (slow adaptation prevents one-run noise from
 *      dominating).
 *   4. For Taylor V·T^n = C, refit C at fixed n using actual life:
 *        C_new = V * T_min^n (per sample, then averaged across runs)
 *   5. Emit structured recommendations; caller persists to parameter store.
 *
 * Distinction from existing:
 *   - ActualCostEngine: stores actuals only, no recalibration of physics
 *   - PIDCutEngine: in-cut real-time feedback, not post-run
 *   - CalibrationEngine (generic): instrument calibration, not physics
 *     parameter tuning
 *   - This engine: post-run closed-loop tuning of lathe physics parameters
 *     driven by production residuals
 *
 * References:
 *   - Taylor F.W. 1907 original; Stephenson & Agapiou §5 tool wear
 *   - ISO 3685 tool-life testing
 *   - Box & Jenkins exponential smoothing
 *
 * @module engines/LatheActualFeedbackTuningEngine
 * @milestone LATHE-PRO-MS10
 */

export interface OpCalibrationRecord {
  op: string;
  /** Tool ID (groups records for same insert) */
  tool_id: string;
  /** Cutting speed used (m/min) for Taylor fit */
  cutting_speed_m_min: number;

  predicted_cycle_time_s: number;
  actual_cycle_time_s: number;

  predicted_tool_life_s: number;
  actual_tool_life_s: number;

  predicted_spindle_power_kw?: number;
  actual_spindle_power_kw?: number;

  predicted_scrap_rate?: number;
  actual_scrap_rate?: number;
}

export interface TaylorParams {
  /** Taylor constant C (V * T^n = C, T in min) */
  C: number;
  /** Exponent n (fixed during recalibration) */
  n: number;
}

export interface LatheFeedbackTuningInput {
  records: OpCalibrationRecord[];
  /** Exponential smoothing weight (0..1) — default 0.25 */
  alpha?: number;
  /** Current Taylor params by tool_id */
  taylor: Record<string, TaylorParams>;
  /** Current cycle-time multiplier (default 1.0) */
  cycle_time_k?: number;
  /** Current baseline scrap rate (default 0.02) */
  baseline_scrap_rate?: number;
  /** Current Kienzle kc scale (default 1.0) */
  kc_scale?: number;
  /** Reject outlier ratios beyond this fold (default 3.0 = 3× predicted) */
  outlier_reject_ratio?: number;
}

export interface FeedbackTuningRecommendation {
  taylor_updates: Record<string, TaylorParams>;
  cycle_time_k_new: number;
  baseline_scrap_rate_new: number;
  kc_scale_new: number;
  residual_ratios: {
    avg_time_ratio: number;
    avg_tool_life_ratio: number;
    avg_power_ratio: number;
  };
  records_used: number;
  records_rejected_outlier: number;
  reasoning: string[];
}

class LatheActualFeedbackTuningEngineImpl {
  tune(i: LatheFeedbackTuningInput): FeedbackTuningRecommendation {
    const reasoning: string[] = [];
    const alpha = clamp(i.alpha ?? 0.25, 0, 1);
    const kOld = i.cycle_time_k ?? 1.0;
    const pOld = clamp(i.baseline_scrap_rate ?? 0.02, 0, 1);
    const kcOld = i.kc_scale ?? 1.0;
    const rejectFold = i.outlier_reject_ratio ?? 3.0;

    const timeRatios: number[] = [];
    const tlRatios: number[] = [];
    const powerRatios: number[] = [];
    const scrapActuals: number[] = [];
    let rejected = 0;

    // Collect per-tool Taylor refit data: {tool_id → [{V, T_min}]}
    const taylorSamples: Record<string, Array<{ V: number; T_min: number }>> = {};

    for (const r of i.records) {
      if (r.predicted_cycle_time_s > 0 && r.actual_cycle_time_s > 0) {
        const ratio = r.actual_cycle_time_s / r.predicted_cycle_time_s;
        if (ratio > 0 && ratio < rejectFold && ratio > 1 / rejectFold) {
          timeRatios.push(ratio);
        } else rejected++;
      }
      if (r.predicted_tool_life_s > 0 && r.actual_tool_life_s > 0) {
        const ratio = r.actual_tool_life_s / r.predicted_tool_life_s;
        if (ratio > 0 && ratio < rejectFold && ratio > 1 / rejectFold) {
          tlRatios.push(ratio);

          // Collect for Taylor refit (all accepted actuals)
          if (!taylorSamples[r.tool_id]) taylorSamples[r.tool_id] = [];
          taylorSamples[r.tool_id]!.push({
            V: r.cutting_speed_m_min,
            T_min: r.actual_tool_life_s / 60,
          });
        } else rejected++;
      }
      if (
        r.predicted_spindle_power_kw !== undefined &&
        r.actual_spindle_power_kw !== undefined &&
        r.predicted_spindle_power_kw > 0
      ) {
        const ratio = r.actual_spindle_power_kw / r.predicted_spindle_power_kw;
        if (ratio > 0 && ratio < rejectFold) powerRatios.push(ratio);
      }
      if (r.actual_scrap_rate !== undefined) {
        scrapActuals.push(clamp(r.actual_scrap_rate, 0, 1));
      }
    }

    const avgTimeRatio = mean(timeRatios, 1);
    const avgTlRatio = mean(tlRatios, 1);
    const avgPowerRatio = mean(powerRatios, 1);
    const avgScrap = mean(scrapActuals, pOld);

    // Exponential smoothing toward observed
    const kNew = kOld * (1 - alpha) + avgTimeRatio * kOld * alpha;
    const kcNew = kcOld * (1 - alpha) + avgPowerRatio * kcOld * alpha;
    const pNew = pOld * (1 - alpha) + avgScrap * alpha;

    // Taylor refit at fixed n: C_new = mean(V * T_min^n)
    const taylorUpdates: Record<string, TaylorParams> = {};
    for (const [tid, samples] of Object.entries(taylorSamples)) {
      if (samples.length === 0) continue;
      const old = i.taylor[tid];
      if (!old) continue;
      const cs = samples.map((s) => s.V * Math.pow(s.T_min, old.n));
      const cNewMean = mean(cs, old.C);
      const cSmoothed = old.C * (1 - alpha) + cNewMean * alpha;
      taylorUpdates[tid] = { C: round2(cSmoothed), n: old.n };
    }

    reasoning.push(
      `Records used: ${i.records.length - rejected}, rejected outliers: ${rejected}`,
    );
    reasoning.push(
      `Residual ratios (actual/pred): time=${round3(avgTimeRatio)}, tool_life=${round3(avgTlRatio)}, power=${round3(avgPowerRatio)}`,
    );
    reasoning.push(`Cycle k: ${round3(kOld)} → ${round3(kNew)} (α=${alpha})`);
    reasoning.push(`Scrap baseline: ${round3(pOld)} → ${round3(pNew)}`);
    reasoning.push(`Kienzle kc scale: ${round3(kcOld)} → ${round3(kcNew)}`);
    if (Object.keys(taylorUpdates).length > 0) {
      reasoning.push(
        `Taylor updates: ${Object.entries(taylorUpdates)
          .map(([t, p]) => `${t}:C=${p.C}`)
          .join(", ")}`,
      );
    }

    return {
      taylor_updates: taylorUpdates,
      cycle_time_k_new: round4(kNew),
      baseline_scrap_rate_new: round4(pNew),
      kc_scale_new: round4(kcNew),
      residual_ratios: {
        avg_time_ratio: round3(avgTimeRatio),
        avg_tool_life_ratio: round3(avgTlRatio),
        avg_power_ratio: round3(avgPowerRatio),
      },
      records_used: i.records.length - rejected,
      records_rejected_outlier: rejected,
      reasoning,
    };
  }

  getStats(): { alpha_default: number; parameters_tuned: string[] } {
    return {
      alpha_default: 0.25,
      parameters_tuned: [
        "Taylor C",
        "cycle_time_k",
        "baseline_scrap_rate",
        "kc_scale",
      ],
    };
  }
}

function mean(xs: number[], fallback: number): number {
  if (xs.length === 0) return fallback;
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}
function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export const latheActualFeedbackTuningEngine = new LatheActualFeedbackTuningEngineImpl();
export type { LatheActualFeedbackTuningEngineImpl };
