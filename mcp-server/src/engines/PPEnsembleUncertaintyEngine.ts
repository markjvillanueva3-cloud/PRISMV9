/**
 * PPEnsembleUncertaintyEngine — PP-DL-MS8
 *
 * Combines multiple embedding-based predictions with uncertainty quantification.
 * When PRISM makes a post-processor recommendation, this engine answers:
 *   "How confident are we?" and "Where is the uncertainty?"
 *
 * Methods:
 *   - Multi-source consensus: compare controller, machine, material, and toolpath
 *     embeddings to see if they "agree" on a recommendation
 *   - Dropout approximation: perturb embeddings with noise to estimate variance
 *   - Epistemic vs aleatoric: separate "we don't know" from "inherently variable"
 *   - Calibrated confidence: convert raw similarity to calibrated probability
 *
 * @module PPEnsembleUncertaintyEngine
 */

import { ppControllerEmbeddingEngine } from "./PPControllerEmbeddingEngine.js";
import { ppMachineVectorEncoderEngine } from "./PPMachineVectorEncoderEngine.js";
import { ppMaterialPropertyVectorEngine } from "./PPMaterialPropertyVectorEngine.js";
import { ppMultiModalFusionEngine, type ScenarioInput } from "./PPMultiModalFusionEngine.js";

// ── Types ─────────────────────────────────────────────────────────────

export interface UncertaintyEstimate {
  scenario: ScenarioInput;
  confidence: number;                    // calibrated 0-1
  epistemic_uncertainty: number;         // "we don't know this" 0-1
  aleatoric_uncertainty: number;         // "inherently variable" 0-1
  source_agreement: number;              // do sources agree? 0-1
  dimension_uncertainties: Array<{
    domain: string;
    uncertainty: number;
    reason: string;
  }>;
  recommendation: "proceed" | "verify" | "caution" | "insufficient_data";
}

export interface EnsemblePrediction {
  predictions: Array<{
    source: string;
    value: number;
    weight: number;
  }>;
  mean: number;
  std_dev: number;
  confidence_interval: { lower: number; upper: number };
  agreement_score: number;
}

// ── Engine ─────────────────────────────────────────────────────────────

export class PPEnsembleUncertaintyEngine {
  /**
   * Estimate uncertainty for a machining scenario.
   */
  estimateUncertainty(scenario: ScenarioInput): UncertaintyEstimate {
    const dimUncertainties: UncertaintyEstimate["dimension_uncertainties"] = [];

    // Check each domain
    const ctrlEmb = ppControllerEmbeddingEngine.embed(scenario.controller_id);
    const machEmb = ppMachineVectorEncoderEngine.embed(scenario.machine_id);
    const matEmb = ppMaterialPropertyVectorEngine.embed(scenario.material_id);

    // Controller uncertainty
    let ctrlConf = 0.9; // default high if found
    if (ctrlEmb) {
      const nearest = ppControllerEmbeddingEngine.findNearest(scenario.controller_id, 1);
      const topSim = nearest.neighbors[0]?.cosine_similarity ?? 0;
      if (topSim < 0.85) {
        ctrlConf = topSim;
        dimUncertainties.push({
          domain: "controller",
          uncertainty: round2(1 - topSim),
          reason: `Controller "${scenario.controller_id}" is ${round2((1 - topSim) * 100)}% different from nearest known dialect`,
        });
      }
    } else {
      // Falls back to generic_fanuc — high uncertainty
      ctrlConf = 0.5;
      dimUncertainties.push({
        domain: "controller",
        uncertainty: 0.5,
        reason: `Controller "${scenario.controller_id}" unknown — using generic_fanuc fallback`,
      });
    }

    // Machine uncertainty
    let machConf = 0.5; // default medium if unknown
    if (machEmb) {
      machConf = 0.9;
      const nearest = ppMachineVectorEncoderEngine.findNearest(scenario.machine_id, 1);
      if (nearest && nearest.neighbors[0]) {
        const topSim = nearest.neighbors[0].cosine_similarity;
        if (topSim < 0.85) {
          machConf = Math.max(0.6, topSim);
          dimUncertainties.push({
            domain: "machine",
            uncertainty: round2(1 - topSim),
            reason: `Machine "${scenario.machine_id}" nearest match similarity: ${round2(topSim * 100)}%`,
          });
        }
      }
    } else {
      dimUncertainties.push({
        domain: "machine",
        uncertainty: 0.5,
        reason: `Machine "${scenario.machine_id}" not in kinematic profiles — no collision/envelope data`,
      });
    }

    // Material uncertainty
    let matConf = 0.5;
    if (matEmb) {
      matConf = 0.9;
    } else {
      dimUncertainties.push({
        domain: "material",
        uncertainty: 0.5,
        reason: `Material "${scenario.material_id}" not in database — cutting parameters unverified`,
      });
    }

    // Cross-modal agreement
    const fused = ppMultiModalFusionEngine.fuse(scenario);
    const sourceAgreement = fused?.compatibility.overall ?? 0.5;
    if (sourceAgreement < 0.6) {
      dimUncertainties.push({
        domain: "cross-modal",
        uncertainty: round2(1 - sourceAgreement),
        reason: `Controller-machine-material compatibility is low (${round2(sourceAgreement * 100)}%)`,
      });
    }

    // Compute overall metrics
    const epistemic = round2(1 - Math.min(ctrlConf, machConf, matConf));
    const aleatoric = round2(Math.max(0, 0.3 - sourceAgreement * 0.3)); // inherent variability
    const confidence = round2(Math.min(ctrlConf, machConf, matConf) * sourceAgreement);

    // Recommendation
    let recommendation: UncertaintyEstimate["recommendation"];
    if (confidence >= 0.75) recommendation = "proceed";
    else if (confidence >= 0.5) recommendation = "verify";
    else if (confidence >= 0.3) recommendation = "caution";
    else recommendation = "insufficient_data";

    return {
      scenario,
      confidence,
      epistemic_uncertainty: epistemic,
      aleatoric_uncertainty: aleatoric,
      source_agreement: round2(sourceAgreement),
      dimension_uncertainties: dimUncertainties,
      recommendation,
    };
  }

  /**
   * Monte Carlo dropout approximation: perturb embeddings with noise
   * to estimate prediction variance.
   */
  monteCarloDropout(scenario: ScenarioInput, samples = 20): EnsemblePrediction {
    const fused = ppMultiModalFusionEngine.fuse(scenario);
    if (!fused) {
      return { predictions: [], mean: 0, std_dev: 1, confidence_interval: { lower: 0, upper: 0 }, agreement_score: 0 };
    }

    const baseVec = fused.fused_vector;
    const predictions: EnsemblePrediction["predictions"] = [];

    // Base prediction (no noise)
    const baseSim = fused.compatibility.overall;
    predictions.push({ source: "base", value: baseSim, weight: 2.0 });

    // Perturbed predictions
    for (let s = 0; s < samples; s++) {
      const noisy = baseVec.map(v => {
        const noise = (Math.random() - 0.5) * 0.1; // ±5% noise
        return Math.max(0, Math.min(1, v + noise));
      });
      // Compute compatibility from noisy vector
      const noisyMag = Math.sqrt(noisy.reduce((s, v) => s + v * v, 0));
      const baseMag = Math.sqrt(baseVec.reduce((s, v) => s + v * v, 0));
      const dot = noisy.reduce((s, v, i) => s + v * baseVec[i], 0);
      const sim = baseMag > 0 && noisyMag > 0 ? dot / (baseMag * noisyMag) : 0;
      predictions.push({ source: `mc_${s}`, value: round4(sim), weight: 1.0 });
    }

    // Weighted statistics
    const totalWeight = predictions.reduce((s, p) => s + p.weight, 0);
    const mean = round4(predictions.reduce((s, p) => s + p.value * p.weight, 0) / totalWeight);
    const variance = predictions.reduce((s, p) => s + p.weight * (p.value - mean) ** 2, 0) / totalWeight;
    const stdDev = round4(Math.sqrt(variance));

    // 95% confidence interval
    const ci95 = 1.96 * stdDev;

    // Agreement: how tight are the predictions?
    const agreement = round2(Math.max(0, 1 - stdDev * 10));

    return {
      predictions,
      mean,
      std_dev: stdDev,
      confidence_interval: { lower: round4(mean - ci95), upper: round4(Math.min(1, mean + ci95)) },
      agreement_score: agreement,
    };
  }

  /**
   * Calibrate a raw similarity score to a probability.
   * Uses sigmoid calibration: p = 1 / (1 + exp(-k*(sim - threshold)))
   */
  calibrate(rawSimilarity: number, threshold = 0.7, steepness = 10): number {
    return round4(1 / (1 + Math.exp(-steepness * (rawSimilarity - threshold))));
  }
}

function round2(x: number): number { return Math.round(x * 100) / 100; }
function round4(x: number): number { return Math.round(x * 10000) / 10000; }

export const ppEnsembleUncertaintyEngine = new PPEnsembleUncertaintyEngine();
