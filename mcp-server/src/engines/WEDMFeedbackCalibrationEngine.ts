/**
 * WEDMFeedbackCalibrationEngine — Self-improving feedback loop for WEDM programs.
 *
 * Accepts operator feedback (actual Ra, cycle time, issues) and compares against
 * predicted values. Deviations >10% flag for calibration. Adjustments are bounded
 * to prevent oscillation and stored for future program improvements.
 *
 * Bayesian update model:
 *   posterior_mean = (prior_precision × prior + obs_precision × observed) / total_precision
 *   posterior_variance = 1 / total_precision
 *
 * Calibration parameters:
 *   k_ra    — Ra prediction correction factor (Klocke model)
 *   eta_mrr — MRR efficiency correction factor (Kunieda model)
 *
 * @module engines/WEDMFeedbackCalibrationEngine
 */
import { log } from "../utils/Logger.js";
import { prismIntelligence, type AIReasoningResult } from "./PRISMIntelligenceLayer.js";

// ============================================================================
// TYPES
// ============================================================================

export interface WEDMFeedback {
  material: string;
  thickness_mm: number;
  predicted_ra_um: number;
  actual_ra_um: number;
  predicted_time_min: number;
  actual_time_min: number;
  notes?: string;
  wire_breaks?: number;
  machine?: string;
}

export interface FeedbackResult {
  accepted: boolean;
  ra_deviation_pct: number;
  time_deviation_pct: number;
  ra_flagged: boolean;
  time_flagged: boolean;
  current_k_ra: number;
  current_eta_mrr: number;
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
  private priors = new Map<string, BayesianPrior>();
  private history: Array<{ feedback: WEDMFeedback; result: FeedbackResult; timestamp: string }> = [];

  private static readonly DEVIATION_THRESHOLD = 0.10;
  private static readonly MAX_STEP_ADJUSTMENT = 0.30;
  private static readonly MAX_CUMULATIVE_ADJUSTMENT = 0.50;

  submit_feedback(feedback: WEDMFeedback): FeedbackResult {
    if (feedback.predicted_ra_um <= 0 || feedback.actual_ra_um <= 0 ||
        feedback.predicted_time_min <= 0 || feedback.actual_time_min <= 0) {
      return {
        accepted: false,
        ra_deviation_pct: 0,
        time_deviation_pct: 0,
        ra_flagged: false,
        time_flagged: false,
        current_k_ra: this.getPriorValue(feedback.material, "k_ra"),
        current_eta_mrr: this.getPriorValue(feedback.material, "eta_mrr"),
        summary: "Invalid feedback: values must be positive",
      };
    }

    const raRatio = feedback.actual_ra_um / feedback.predicted_ra_um;
    const timeRatio = feedback.actual_time_min / feedback.predicted_time_min;
    const raDeviation = Math.abs(raRatio - 1.0);
    const timeDeviation = Math.abs(timeRatio - 1.0);
    const raFlagged = raDeviation > WEDMFeedbackCalibrationEngine.DEVIATION_THRESHOLD;
    const timeFlagged = timeDeviation > WEDMFeedbackCalibrationEngine.DEVIATION_THRESHOLD;

    if (raFlagged) this.calibrate(feedback.material, "k_ra", raRatio);
    if (timeFlagged) this.calibrate(feedback.material, "eta_mrr", 1.0 / timeRatio);

    const result: FeedbackResult = {
      accepted: true,
      ra_deviation_pct: Math.round(raDeviation * 1000) / 10,
      time_deviation_pct: Math.round(timeDeviation * 1000) / 10,
      ra_flagged: raFlagged,
      time_flagged: timeFlagged,
      current_k_ra: this.getPriorValue(feedback.material, "k_ra"),
      current_eta_mrr: this.getPriorValue(feedback.material, "eta_mrr"),
      summary: `Ra dev: ${(raDeviation*100).toFixed(1)}%, Time dev: ${(timeDeviation*100).toFixed(1)}%`,
    };

    this.history.push({ feedback, result, timestamp: new Date().toISOString() });
    log.info(`[WEDMFeedbackCalibration] ${feedback.material}: Ra=${(raDeviation*100).toFixed(1)}%, Time=${(timeDeviation*100).toFixed(1)}%`);
    return result;
  }

  get_calibration(material: string) {
    return {
      k_ra: this.getPriorValue(material, "k_ra"),
      eta_mrr: this.getPriorValue(material, "eta_mrr"),
      samples: this.getOrCreatePrior(material, "k_ra").samples,
    };
  }

  get_history(limit = 20) {
    return this.history.slice(-limit).reverse();
  }

  reset_calibration(material: string) {
    const matKey = material.toLowerCase().replace(/\s+/g, "_");
    this.priors.delete(`${matKey}:k_ra`);
    this.priors.delete(`${matKey}:eta_mrr`);
  }

  private calibrate(material: string, param: string, observedRatio: number) {
    const prior = this.getOrCreatePrior(material, param);
    const maxStep = WEDMFeedbackCalibrationEngine.MAX_STEP_ADJUSTMENT;
    const boundedRatio = Math.max(1.0 - maxStep, Math.min(1.0 + maxStep, observedRatio));

    const obsVariance = 0.04;
    const priorPrecision = 1.0 / prior.variance;
    const obsPrecision = 1.0 / obsVariance;
    const totalPrecision = priorPrecision + obsPrecision;

    let posteriorMean = (priorPrecision * prior.value + obsPrecision * boundedRatio) / totalPrecision;
    const maxCum = WEDMFeedbackCalibrationEngine.MAX_CUMULATIVE_ADJUSTMENT;
    posteriorMean = Math.max(1.0 - maxCum, Math.min(1.0 + maxCum, posteriorMean));

    const matKey = material.toLowerCase().replace(/\s+/g, "_");
    this.priors.set(`${matKey}:${param}`, {
      value: Math.round(posteriorMean * 10000) / 10000,
      variance: 1.0 / totalPrecision,
      samples: prior.samples + 1,
    });
  }

  private getOrCreatePrior(material: string, param: string): BayesianPrior {
    const matKey = material.toLowerCase().replace(/\s+/g, "_");
    const key = `${matKey}:${param}`;
    let prior = this.priors.get(key);
    if (!prior) {
      prior = { value: 1.0, variance: 0.1, samples: 5 };
      this.priors.set(key, prior);
    }
    return prior;
  }

  private getPriorValue(material: string, param: string): number {
    return this.getOrCreatePrior(material, param).value;
  }

  // AI-powered methods
  async analyzeWithAI(material: string, recentFeedbackCount = 10): Promise<AIReasoningResult> {
    const matKey = material.toLowerCase().replace(/\s+/g, "_");
    const calibration = this.get_calibration(material);
    const recentHistory = this.get_history(recentFeedbackCount)
      .filter(h => h.feedback.material.toLowerCase().replace(/\s+/g, "_") === matKey);

    const raDeviations = recentHistory.map(h => h.result.ra_deviation_pct);
    const avgRaDev = raDeviations.length > 0 ? raDeviations.reduce((a, b) => a + b, 0) / raDeviations.length : 0;

    return prismIntelligence.reason({
      domain: "wedm_calibration",
      intent: "Analyze WEDM feedback calibration data and provide recommendations",
      context: {
        material,
        current_k_ra: calibration.k_ra,
        current_eta_mrr: calibration.eta_mrr,
        samples: calibration.samples,
        recent_count: recentHistory.length,
        avg_ra_deviation_pct: avgRaDev,
      },
      options: { require_explanation: true, include_alternatives: true, safety_check: true },
    });
  }

  async predictCalibrationWithAI(material: string, similarMaterial?: string): Promise<AIReasoningResult> {
    const knownMaterials: Array<{ material: string; k_ra: number; eta_mrr: number }> = [];
    for (const [key, prior] of this.priors.entries()) {
      const [mat, param] = key.split(":");
      if (param === "k_ra") {
        const eta = this.priors.get(`${mat}:eta_mrr`);
        knownMaterials.push({ material: mat, k_ra: prior.value, eta_mrr: eta?.value ?? 1.0 });
      }
    }

    return prismIntelligence.reason({
      domain: "wedm_calibration",
      intent: `Predict optimal calibration factors for ${material}`,
      context: { new_material: material, similar_material: similarMaterial, known_calibrations: knownMaterials },
      options: { require_explanation: true, include_alternatives: true },
    });
  }

  async troubleshootWithAI(material: string, symptom: string): Promise<AIReasoningResult> {
    const calibration = this.get_calibration(material);
    const history = this.get_history(20).filter(h => h.feedback.material.toLowerCase() === material.toLowerCase());

    return prismIntelligence.reason({
      domain: "wedm_troubleshoot",
      intent: `Troubleshoot WEDM calibration anomaly: ${symptom} for ${material}`,
      context: {
        material,
        symptom,
        k_ra: calibration.k_ra,
        eta_mrr: calibration.eta_mrr,
        samples: calibration.samples,
        recent_feedback: history.slice(0, 5).map(h => ({
          ra_deviation: h.result.ra_deviation_pct,
          time_deviation: h.result.time_deviation_pct,
          wire_breaks: h.feedback.wire_breaks,
        })),
      },
      options: { require_explanation: true, include_alternatives: true, safety_check: true },
    });
  }
}

export const wedmFeedbackCalibrationEngine = new WEDMFeedbackCalibrationEngine();
