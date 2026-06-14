/**
 * MillActualFeedbackTuningEngine
 * ================================
 *
 * Post-production closed-loop tuning of mill physics parameters from
 * actual-vs-predicted residuals. Mill parity for LatheActualFeedbackTuningEngine
 * (LATHE-PRO-MS10) with three mill-canonical tunable parameters added:
 *
 *   - Taylor C (V·T^n=C, refit at fixed n)               [shared with lathe]
 *   - cycle_time_k multiplier                             [shared with lathe]
 *   - baseline_scrap_rate                                 [shared with lathe]
 *   - Kienzle kc_scale (specific cutting force)           [shared with lathe]
 *   - fz_scale (feed-per-tooth correction)                [MILL-CANONICAL]
 *   - adaptive_ae_scale (radial engagement for HSM)       [MILL-CANONICAL]
 *   - chatter_threshold_scale (chatter detect sensitivity) [MILL-CANONICAL]
 *
 * Mill differs from lathe in three feedback-relevant ways:
 *   1. Feed is per-tooth (mm/tooth) — Z-axis programmed feed scales with
 *      flute count and rpm in a way that lathe's mm/rev doesn't
 *   2. HSM (high-speed machining) adaptive clearing uses constant radial
 *      engagement (ae) as the master variable — chip thinning makes ae
 *      tuning more sensitive than for lathe DOC
 *   3. Chatter is more prevalent on mills (stochastic regeneration in
 *      multi-flute engagement) — chatter_threshold needs run-by-run tuning
 *
 * Algorithm:
 *   1. For each operation, read predicted vs actual cycle, tool life,
 *      power, scrap, chatter-events, fz used, ae used
 *   2. Compute residual ratios with outlier rejection (>= rejectFold)
 *   3. Apply exponential smoothing (default α = 0.25)
 *   4. Refit Taylor C at fixed n per tool_id
 *   5. Emit per-parameter recommendations (caller persists)
 *
 * Distinct from existing:
 *   - LatheActualFeedbackTuningEngine : lathe parameters (no fz / ae /
 *                                       chatter threshold)
 *   - ActualCostEngine                : stores actuals, no recalibration
 *   - PIDCutEngine                    : in-cut real-time feedback
 *   - This engine                     : POST-run closed-loop mill physics
 *
 * References:
 *   - Taylor F.W. 1907 original; Stephenson & Agapiou §5 tool wear
 *   - ISO 3685 tool-life testing
 *   - Box & Jenkins exponential smoothing (1976)
 *   - Altintas Y. "Manufacturing Automation" 2e §3 (mill chatter)
 *   - Tlusty & Polacek 1963 (regenerative chatter)
 *
 * @module engines/MillActualFeedbackTuningEngine
 * @milestone MILL-PARITY-UPGRADE-MS0 / U-MILL-ACTUAL-FEEDBACK-TUNING (iter75)
 */

// ═══════════════════════════════════════════════════════════════════════
// CONSTANTS — sourced + locked
// ═══════════════════════════════════════════════════════════════════════

/** Default exponential smoothing weight — slow adaptation. */
export const DEFAULT_ALPHA = 0.25;

/** Default outlier rejection fold — reject ratios > Nx or < 1/Nx of predicted. */
export const DEFAULT_OUTLIER_REJECT_FOLD = 3.0;

/** Default cycle-time scale baseline. */
export const DEFAULT_CYCLE_TIME_K = 1.0;

/** Default baseline scrap rate per AIAG. */
export const DEFAULT_BASELINE_SCRAP_RATE = 0.02;

/** Default Kienzle kc scale baseline. */
export const DEFAULT_KC_SCALE = 1.0;

/** Default fz (feed-per-tooth) scale baseline. */
export const DEFAULT_FZ_SCALE = 1.0;

/** Default adaptive radial engagement scale baseline. */
export const DEFAULT_ADAPTIVE_AE_SCALE = 1.0;

/** Default chatter-threshold scale baseline. */
export const DEFAULT_CHATTER_THRESHOLD_SCALE = 1.0;

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

export interface MillOpCalibrationRecord {
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

  /** Predicted feed-per-tooth (mm/tooth) — for fz_scale tuning */
  predicted_fz_mm_tooth?: number;
  /** Actual feed-per-tooth used after operator/CAM override */
  actual_fz_mm_tooth?: number;

  /** Predicted radial engagement (mm) — for adaptive_ae_scale tuning */
  predicted_ae_mm?: number;
  /** Actual radial engagement after CAM-side trochoidal cleanup */
  actual_ae_mm?: number;

  /** Predicted chatter events count (per minute) — for threshold tuning */
  predicted_chatter_events_per_min?: number;
  /** Actual chatter events observed */
  actual_chatter_events_per_min?: number;
}

export interface MillTaylorParams {
  C: number;
  n: number;
}

export interface MillFeedbackTuningInput {
  records: MillOpCalibrationRecord[];
  /** Exponential smoothing weight (0..1) — default DEFAULT_ALPHA */
  alpha?: number;
  /** Current Taylor params by tool_id */
  taylor: Record<string, MillTaylorParams>;
  /** Current cycle-time multiplier */
  cycle_time_k?: number;
  /** Current baseline scrap rate */
  baseline_scrap_rate?: number;
  /** Current Kienzle kc scale */
  kc_scale?: number;
  /** Current fz scale */
  fz_scale?: number;
  /** Current adaptive ae scale */
  adaptive_ae_scale?: number;
  /** Current chatter threshold scale */
  chatter_threshold_scale?: number;
  /** Reject outliers beyond this fold (default DEFAULT_OUTLIER_REJECT_FOLD) */
  outlier_reject_ratio?: number;
}

export interface MillFeedbackTuningRecommendation {
  taylor_updates: Record<string, MillTaylorParams>;
  cycle_time_k_new: number;
  baseline_scrap_rate_new: number;
  kc_scale_new: number;
  /** MILL-CANONICAL: feed-per-tooth scale recommendation */
  fz_scale_new: number;
  /** MILL-CANONICAL: adaptive radial engagement scale */
  adaptive_ae_scale_new: number;
  /** MILL-CANONICAL: chatter threshold scale */
  chatter_threshold_scale_new: number;
  residual_ratios: {
    avg_time_ratio: number;
    avg_tool_life_ratio: number;
    avg_power_ratio: number;
    avg_fz_ratio: number;
    avg_ae_ratio: number;
    avg_chatter_ratio: number;
  };
  records_used: number;
  records_rejected_outlier: number;
  reasoning: string[];
}

// ═══════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════

function mean(xs: number[], fallback: number): number {
  if (xs.length === 0) return fallback;
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}
function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
function round3(n: number): number { return Math.round(n * 1000) / 1000; }
function round4(n: number): number { return Math.round(n * 10000) / 10000; }
function round2(n: number): number { return Math.round(n * 100) / 100; }

/**
 * Collects a ratio if both sides positive and within outlier bounds.
 * Returns 1 (accepted) or 0 (rejected). Used to count rejections in caller.
 */
function pushIfInBounds(
  predicted: number | undefined,
  actual: number | undefined,
  rejectFold: number,
  bucket: number[],
): 0 | 1 {
  if (typeof predicted !== "number" || typeof actual !== "number") return 0;
  if (!(predicted > 0) || !(actual > 0)) return 0;
  const ratio = actual / predicted;
  if (ratio > 0 && ratio < rejectFold && ratio > 1 / rejectFold) {
    bucket.push(ratio);
    return 1;
  }
  return 0;
}

// ═══════════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════════

class MillActualFeedbackTuningEngineImpl {
  tune(i: MillFeedbackTuningInput): MillFeedbackTuningRecommendation {
    this.validate(i);
    const reasoning: string[] = [];
    const alpha = clamp(i.alpha ?? DEFAULT_ALPHA, 0, 1);
    const kOld = i.cycle_time_k ?? DEFAULT_CYCLE_TIME_K;
    const pOld = clamp(i.baseline_scrap_rate ?? DEFAULT_BASELINE_SCRAP_RATE, 0, 1);
    const kcOld = i.kc_scale ?? DEFAULT_KC_SCALE;
    const fzOld = i.fz_scale ?? DEFAULT_FZ_SCALE;
    const aeOld = i.adaptive_ae_scale ?? DEFAULT_ADAPTIVE_AE_SCALE;
    const chOld = i.chatter_threshold_scale ?? DEFAULT_CHATTER_THRESHOLD_SCALE;
    const rejectFold = i.outlier_reject_ratio ?? DEFAULT_OUTLIER_REJECT_FOLD;

    const timeRatios: number[] = [];
    const tlRatios: number[] = [];
    const powerRatios: number[] = [];
    const fzRatios: number[] = [];
    const aeRatios: number[] = [];
    const chatterRatios: number[] = [];
    const scrapActuals: number[] = [];
    let rejected = 0;

    const taylorSamples: Record<string, Array<{ V: number; T_min: number }>> = {};

    for (const r of i.records) {
      // Time ratio
      if (r.predicted_cycle_time_s > 0 && r.actual_cycle_time_s > 0) {
        const ratio = r.actual_cycle_time_s / r.predicted_cycle_time_s;
        if (ratio > 0 && ratio < rejectFold && ratio > 1 / rejectFold) {
          timeRatios.push(ratio);
        } else rejected++;
      }

      // Tool life ratio + Taylor sample collection
      if (r.predicted_tool_life_s > 0 && r.actual_tool_life_s > 0) {
        const ratio = r.actual_tool_life_s / r.predicted_tool_life_s;
        if (ratio > 0 && ratio < rejectFold && ratio > 1 / rejectFold) {
          tlRatios.push(ratio);
          if (!taylorSamples[r.tool_id]) taylorSamples[r.tool_id] = [];
          taylorSamples[r.tool_id]!.push({
            V: r.cutting_speed_m_min,
            T_min: r.actual_tool_life_s / 60,
          });
        } else rejected++;
      }

      // Power, fz, ae, chatter ratios (optional fields)
      pushIfInBounds(r.predicted_spindle_power_kw, r.actual_spindle_power_kw, rejectFold, powerRatios);
      pushIfInBounds(r.predicted_fz_mm_tooth, r.actual_fz_mm_tooth, rejectFold, fzRatios);
      pushIfInBounds(r.predicted_ae_mm, r.actual_ae_mm, rejectFold, aeRatios);
      // Chatter events: zero predicted is valid (no chatter expected); use ratio only when both > 0
      if (
        typeof r.predicted_chatter_events_per_min === "number" &&
        typeof r.actual_chatter_events_per_min === "number" &&
        r.predicted_chatter_events_per_min > 0 &&
        r.actual_chatter_events_per_min >= 0
      ) {
        const ratio = r.actual_chatter_events_per_min / r.predicted_chatter_events_per_min;
        if (ratio >= 0 && ratio < rejectFold) chatterRatios.push(ratio);
      }

      if (r.actual_scrap_rate !== undefined) {
        scrapActuals.push(clamp(r.actual_scrap_rate, 0, 1));
      }
    }

    const avgTimeRatio = mean(timeRatios, 1);
    const avgTlRatio = mean(tlRatios, 1);
    const avgPowerRatio = mean(powerRatios, 1);
    const avgFzRatio = mean(fzRatios, 1);
    const avgAeRatio = mean(aeRatios, 1);
    const avgChatterRatio = mean(chatterRatios, 1);
    const avgScrap = mean(scrapActuals, pOld);

    // Exponential smoothing
    const kNew = kOld * (1 - alpha) + avgTimeRatio * kOld * alpha;
    const kcNew = kcOld * (1 - alpha) + avgPowerRatio * kcOld * alpha;
    const pNew = pOld * (1 - alpha) + avgScrap * alpha;
    const fzNew = fzOld * (1 - alpha) + avgFzRatio * fzOld * alpha;
    const aeNew = aeOld * (1 - alpha) + avgAeRatio * aeOld * alpha;
    // Chatter threshold: when actual > predicted (more chatter than expected),
    // INCREASE threshold scale so future predictions are more sensitive.
    const chNew = chOld * (1 - alpha) + avgChatterRatio * chOld * alpha;

    // Taylor refit at fixed n: C_new = mean(V * T_min^n)
    const taylorUpdates: Record<string, MillTaylorParams> = {};
    for (const [tid, samples] of Object.entries(taylorSamples)) {
      if (samples.length === 0) continue;
      const old = i.taylor[tid];
      if (!old) continue;
      const cs = samples.map((s) => s.V * Math.pow(s.T_min, old.n));
      const cNewMean = mean(cs, old.C);
      const cSmoothed = old.C * (1 - alpha) + cNewMean * alpha;
      taylorUpdates[tid] = { C: round2(cSmoothed), n: old.n };
    }

    reasoning.push(`Records used: ${i.records.length - rejected}, rejected outliers: ${rejected}`);
    reasoning.push(
      `Residuals (actual/pred): time=${round3(avgTimeRatio)}, tool_life=${round3(avgTlRatio)}, power=${round3(avgPowerRatio)}, fz=${round3(avgFzRatio)}, ae=${round3(avgAeRatio)}, chatter=${round3(avgChatterRatio)}`,
    );
    reasoning.push(`Cycle k: ${round3(kOld)} → ${round3(kNew)} (α=${alpha})`);
    reasoning.push(`Scrap baseline: ${round3(pOld)} → ${round3(pNew)}`);
    reasoning.push(`Kienzle kc scale: ${round3(kcOld)} → ${round3(kcNew)}`);
    reasoning.push(`Mill fz scale: ${round3(fzOld)} → ${round3(fzNew)}`);
    reasoning.push(`Mill ae scale: ${round3(aeOld)} → ${round3(aeNew)}`);
    reasoning.push(`Mill chatter threshold scale: ${round3(chOld)} → ${round3(chNew)}`);
    if (Object.keys(taylorUpdates).length > 0) {
      reasoning.push(
        `Taylor updates: ${Object.entries(taylorUpdates).map(([t, p]) => `${t}:C=${p.C}`).join(", ")}`,
      );
    }

    return {
      taylor_updates: taylorUpdates,
      cycle_time_k_new: round4(kNew),
      baseline_scrap_rate_new: round4(pNew),
      kc_scale_new: round4(kcNew),
      fz_scale_new: round4(fzNew),
      adaptive_ae_scale_new: round4(aeNew),
      chatter_threshold_scale_new: round4(chNew),
      residual_ratios: {
        avg_time_ratio: round3(avgTimeRatio),
        avg_tool_life_ratio: round3(avgTlRatio),
        avg_power_ratio: round3(avgPowerRatio),
        avg_fz_ratio: round3(avgFzRatio),
        avg_ae_ratio: round3(avgAeRatio),
        avg_chatter_ratio: round3(avgChatterRatio),
      },
      records_used: i.records.length - rejected,
      records_rejected_outlier: rejected,
      reasoning,
    };
  }

  getStats(): {
    alpha_default: number;
    parameters_tuned: string[];
    mill_canonical_extensions: string[];
    reference: string;
  } {
    return {
      alpha_default: DEFAULT_ALPHA,
      parameters_tuned: [
        "Taylor C",
        "cycle_time_k",
        "baseline_scrap_rate",
        "kc_scale",
        "fz_scale",
        "adaptive_ae_scale",
        "chatter_threshold_scale",
      ],
      mill_canonical_extensions: ["fz_scale", "adaptive_ae_scale", "chatter_threshold_scale"], // 3 extras vs lathe's 4 shared
      reference: "Taylor 1907; Stephenson & Agapiou §5; ISO 3685; Box & Jenkins; Altintas Manufacturing Automation 2e §3; Tlusty & Polacek 1963",
    };
  }

  private validate(i: MillFeedbackTuningInput): void {
    if (!i || typeof i !== "object") throw new TypeError("MillActualFeedbackTuningEngine.tune: input required");
    if (!Array.isArray(i.records)) throw new TypeError("records[] required");
    if (!i.taylor || typeof i.taylor !== "object") throw new TypeError("taylor map required");
  }
}

export const millActualFeedbackTuningEngine = new MillActualFeedbackTuningEngineImpl();
export type { MillActualFeedbackTuningEngineImpl };
