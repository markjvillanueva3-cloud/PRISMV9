/**
 * WEDMFeedbackCalibrationEngine — Self-improving feedback loop for WEDM programs.
 *
 * Accepts operator feedback (actual Ra, cycle time, issues) and compares against
 * predicted values. Deviations >10% flag for calibration. Adjustments are bounded
 * to prevent oscillation and stored for future program improvements.
 *
 * Bayesian update model (same as EDMQualityOrchestratorEngine):
 *   posterior_mean = (prior_precision × prior + obs_precision × observed) / total_precision
 *   posterior_variance = 1 / total_precision
 *
 * Calibration parameters:
 *   k_ra    — Ra prediction correction factor (Klocke model)
 *   eta_mrr — MRR efficiency correction factor (Kunieda model)
 *
 * Bounded adjustments: max ±30% per feedback, max ±50% cumulative from default.
 *
 * Ref: Kunieda 2005, Klocke 2013, Bayesian conjugate normal update
 *
 * @module engines/WEDMFeedbackCalibrationEngine
 */
import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export interface WEDMFeedback {
  /** Material used (e.g. "D2", "304SS") */
  material: string;
  /** Workpiece thickness in mm */
  thickness_mm: number;
  /** Predicted surface finish Ra (µm) from program generation */
  predicted_ra_um: number;
  /** Actual measured surface finish Ra (µm) */
  actual_ra_um: number;
  /** Predicted cycle time (min) */
  predicted_time_min: number;
  /** Actual cycle time (min) */
  actual_time_min: number;
  /** Operator notes (optional) */
  notes?: string;
  /** Wire breaks during job (optional) */
  wire_breaks?: number;
  /** Machine identifier (optional, for stratification) */
  machine?: string;
}

export interface CalibrationEntry {
  /** Material-stratified key */
  key: string;
  /** Parameter name */
  param: string;
  /** Prior value before this update */
  prior_value: number;
  /** Posterior value after this update */
  posterior_value: number;
  /** Observed ratio (actual/predicted) */
  observed_ratio: number;
  /** Deviation percentage */
  deviation_pct: number;
  /** Whether this triggered a calibration flag */
  flagged: boolean;
  /** Number of samples in this prior */
  samples: number;
  /** Timestamp of this update */
  timestamp: string;
}

export interface FeedbackResult {
  /** Whether feedback was accepted */
  accepted: boolean;
  /** Ra deviation percentage (actual vs predicted) */
  ra_deviation_pct: number;
  /** Time deviation percentage (actual vs predicted) */
  time_deviation_pct: number;
  /** Whether Ra deviation >10% flagged calibration */
  ra_flagged: boolean;
  /** Whether time deviation >10% flagged calibration */
  time_flagged: boolean;
  /** Calibration entries (adjustments applied) */
  calibrations: CalibrationEntry[];
  /** Updated k_ra for this material (after calibration) */
  current_k_ra: number;
  /** Updated eta_mrr for this material (after calibration) */
  current_eta_mrr: number;
  /** Summary message */
  summary: string;
}

interface BayesianPrior {
  value: number;
  variance: number;
  samples: number;
}

// ============================================================================
// ENGINE
// ============================================================================

export class WEDMFeedbackCalibrationEngine {
  /** Bayesian priors stratified by material:param */
  private priors = new Map<string, BayesianPrior>();

  /** Feedback history for audit */
  private history: Array<{ feedback: WEDMFeedback; result: FeedbackResult; timestamp: string }> = [];

  /** Observation variance for Bayesian update (fixed, decoupled from posterior) */
  private static readonly OBS_VARIANCE: Record<string, number> = {
    k_ra: 0.04,       // Ra correction factor variance
    eta_mrr: 0.04,    // MRR efficiency variance
  };

  /** Default priors */
  private static readonly DEFAULT_PRIORS: Record<string, BayesianPrior> = {
    k_ra: { value: 1.0, variance: 0.1, samples: 5 },
    eta_mrr: { value: 1.0, variance: 0.1, samples: 5 },
  };

  /** Deviation threshold for flagging (10%) */
  private static readonly DEVIATION_THRESHOLD = 0.10;

  /** Max single-step adjustment (30%) */
  private static readonly MAX_STEP_ADJUSTMENT = 0.30;

  /** Max cumulative adjustment from default (50%) */
  private static readonly MAX_CUMULATIVE_ADJUSTMENT = 0.50;

  /**
   * Submit operator feedback and apply calibration.
   *
   * @param feedback Actual vs predicted values from a WEDM job
   * @returns Calibration result with adjustments applied
   */
  submit_feedback(feedback: WEDMFeedback): FeedbackResult {
    // Validate input
    if (feedback.predicted_ra_um <= 0 || feedback.actual_ra_um <= 0) {
      return {
        accepted: false,
        ra_deviation_pct: 0,
        time_deviation_pct: 0,
        ra_flagged: false,
        time_flagged: false,
        calibrations: [],
        current_k_ra: this.getPriorValue(feedback.material, "k_ra"),
        current_eta_mrr: this.getPriorValue(feedback.material, "eta_mrr"),
        summary: "Invalid feedback: Ra values must be positive",
      };
    }
    if (feedback.predicted_time_min <= 0 || feedback.actual_time_min <= 0) {
      return {
        accepted: false,
        ra_deviation_pct: 0,
        time_deviation_pct: 0,
        ra_flagged: false,
        time_flagged: false,
        calibrations: [],
        current_k_ra: this.getPriorValue(feedback.material, "k_ra"),
        current_eta_mrr: this.getPriorValue(feedback.material, "eta_mrr"),
        summary: "Invalid feedback: time values must be positive",
      };
    }

    // Calculate deviations
    const raRatio = feedback.actual_ra_um / feedback.predicted_ra_um;
    const timeRatio = feedback.actual_time_min / feedback.predicted_time_min;
    const raDeviation = Math.abs(raRatio - 1.0);
    const timeDeviation = Math.abs(timeRatio - 1.0);
    const raFlagged = raDeviation > WEDMFeedbackCalibrationEngine.DEVIATION_THRESHOLD;
    const timeFlagged = timeDeviation > WEDMFeedbackCalibrationEngine.DEVIATION_THRESHOLD;

    const calibrations: CalibrationEntry[] = [];

    // Calibrate k_ra if flagged
    if (raFlagged) {
      const entry = this.calibrate(feedback.material, "k_ra", raRatio);
      calibrations.push(entry);
    }

    // Calibrate eta_mrr if flagged (time deviation reflects MRR accuracy)
    if (timeFlagged) {
      const entry = this.calibrate(feedback.material, "eta_mrr", 1.0 / timeRatio);
      calibrations.push(entry);
    }

    const result: FeedbackResult = {
      accepted: true,
      ra_deviation_pct: Math.round(raDeviation * 1000) / 10,
      time_deviation_pct: Math.round(timeDeviation * 1000) / 10,
      ra_flagged: raFlagged,
      time_flagged: timeFlagged,
      calibrations,
      current_k_ra: this.getPriorValue(feedback.material, "k_ra"),
      current_eta_mrr: this.getPriorValue(feedback.material, "eta_mrr"),
      summary: this.buildSummary(raDeviation, timeDeviation, raFlagged, timeFlagged, calibrations),
    };

    // Store in history
    this.history.push({
      feedback,
      result,
      timestamp: new Date().toISOString(),
    });

    log.info(`[WEDMFeedbackCalibration] Feedback for ${feedback.material}: Ra dev=${(raDeviation*100).toFixed(1)}%, Time dev=${(timeDeviation*100).toFixed(1)}%`);

    return result;
  }

  /**
   * Get current calibration factors for a material.
   */
  get_calibration(material: string): { k_ra: number; eta_mrr: number; samples: number } {
    const k_ra = this.getOrCreatePrior(material, "k_ra");
    const eta_mrr = this.getOrCreatePrior(material, "eta_mrr");
    return {
      k_ra: k_ra.value,
      eta_mrr: eta_mrr.value,
      samples: Math.max(k_ra.samples, eta_mrr.samples),
    };
  }

  /**
   * Get feedback history (most recent first).
   */
  get_history(limit = 20): Array<{ feedback: WEDMFeedback; result: FeedbackResult; timestamp: string }> {
    return this.history.slice(-limit).reverse();
  }

  /**
   * Reset calibration for a material to defaults.
   */
  reset_calibration(material: string): void {
    const matKey = material.toLowerCase().replace(/\s+/g, "_");
    this.priors.delete(`${matKey}:k_ra`);
    this.priors.delete(`${matKey}:eta_mrr`);
  }

  // ---- PRIVATE ----

  private calibrate(material: string, param: string, observedRatio: number): CalibrationEntry {
    const prior = this.getOrCreatePrior(material, param);
    const priorValue = prior.value;

    // Bound the observed ratio to prevent extreme single-step adjustments
    const maxStep = WEDMFeedbackCalibrationEngine.MAX_STEP_ADJUSTMENT;
    const boundedRatio = Math.max(1.0 - maxStep, Math.min(1.0 + maxStep, observedRatio));

    // Bayesian update
    const obsVariance = WEDMFeedbackCalibrationEngine.OBS_VARIANCE[param] ?? 0.04;
    const priorPrecision = 1.0 / prior.variance;
    const obsPrecision = 1.0 / obsVariance;
    const totalPrecision = priorPrecision + obsPrecision;

    let posteriorMean = (priorPrecision * prior.value + obsPrecision * boundedRatio) / totalPrecision;
    const posteriorVariance = 1.0 / totalPrecision;

    // Enforce cumulative bounds: max ±50% from default (1.0)
    const maxCum = WEDMFeedbackCalibrationEngine.MAX_CUMULATIVE_ADJUSTMENT;
    posteriorMean = Math.max(1.0 - maxCum, Math.min(1.0 + maxCum, posteriorMean));

    // Update the prior
    const matKey = material.toLowerCase().replace(/\s+/g, "_");
    this.priors.set(`${matKey}:${param}`, {
      value: Math.round(posteriorMean * 10000) / 10000,
      variance: posteriorVariance,
      samples: prior.samples + 1,
    });

    return {
      key: `${matKey}:${param}`,
      param,
      prior_value: Math.round(priorValue * 10000) / 10000,
      posterior_value: Math.round(posteriorMean * 10000) / 10000,
      observed_ratio: Math.round(observedRatio * 10000) / 10000,
      deviation_pct: Math.round(Math.abs(observedRatio - 1.0) * 1000) / 10,
      flagged: true,
      samples: prior.samples + 1,
      timestamp: new Date().toISOString(),
    };
  }

  private getOrCreatePrior(material: string, param: string): BayesianPrior {
    const matKey = material.toLowerCase().replace(/\s+/g, "_");
    const key = `${matKey}:${param}`;
    let prior = this.priors.get(key);
    if (!prior) {
      const defaults = WEDMFeedbackCalibrationEngine.DEFAULT_PRIORS[param];
      prior = defaults ? { ...defaults } : { value: 1.0, variance: 0.1, samples: 5 };
      this.priors.set(key, prior);
    }
    return prior;
  }

  private getPriorValue(material: string, param: string): number {
    return this.getOrCreatePrior(material, param).value;
  }

  private buildSummary(
    raDev: number, timeDev: number,
    raFlagged: boolean, timeFlagged: boolean,
    calibrations: CalibrationEntry[],
  ): string {
    const parts: string[] = [];
    parts.push(`Ra deviation: ${(raDev*100).toFixed(1)}%${raFlagged ? ' (FLAGGED)' : ''}`);
    parts.push(`Time deviation: ${(timeDev*100).toFixed(1)}%${timeFlagged ? ' (FLAGGED)' : ''}`);
    if (calibrations.length > 0) {
      for (const c of calibrations) {
        parts.push(`${c.param}: ${c.prior_value} → ${c.posterior_value} (${c.deviation_pct}% dev)`);
      }
    } else {
      parts.push("No calibration needed — within 10% tolerance");
    }
    return parts.join(". ");
  }
}

export const wedmFeedbackCalibrationEngine = new WEDMFeedbackCalibrationEngine();
