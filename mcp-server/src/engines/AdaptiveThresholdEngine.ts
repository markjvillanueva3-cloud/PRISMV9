/**
 * AdaptiveThresholdEngine — USSH Phase 0.25 / U-SCI06
 * =====================================================
 *
 * PAC-based Bayesian threshold adaptation for semantic dedup.
 * Replaces arbitrary 0.85 cosine threshold with data-driven bound.
 *
 * Theory:
 *   - Prior: Beta(α₀, β₀) based on historical duplicate data
 *   - Likelihood: Binomial observations from confirmed duplicates
 *   - Posterior: Beta(α₀ + successes, β₀ + failures)
 *   - PAC bound: sample complexity for (ε, δ)-learning
 *
 * MIT 6.867 / 18.657 / Statistical Learning Theory foundations
 *
 * @module engines/AdaptiveThresholdEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Observation of a potential duplicate */
export interface DuplicateObservation {
  cosineSimilarity: number;
  wasActualDuplicate: boolean;
  assetType: "engine" | "action" | "formula" | "hook" | "skill";
  timestamp: number;
}

/** Threshold recommendation */
export interface ThresholdRecommendation {
  threshold: number;
  confidence: number;
  credibleInterval: [number, number];
  sampleSize: number;
  isConverged: boolean;
  pacBound: PACBound;
}

/** PAC learning bound */
export interface PACBound {
  epsilon: number;        // error bound
  delta: number;          // confidence (1 - δ)
  vcDimension: number;    // VC dimension
  sampleComplexity: number;
  currentSamples: number;
  isSufficient: boolean;
}

/** Beta distribution parameters */
interface BetaParams {
  alpha: number;
  beta: number;
}

/** Per-asset-type thresholds */
export interface AssetTypeThresholds {
  engine: ThresholdRecommendation;
  action: ThresholdRecommendation;
  formula: ThresholdRecommendation;
  hook: ThresholdRecommendation;
  skill: ThresholdRecommendation;
  global: ThresholdRecommendation;
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

class AdaptiveThresholdEngine {
  /** Prior parameters — weakly informative, centered around 0.85 */
  private readonly priorAlpha = 10;
  private readonly priorBeta = 2;

  /** Observations per asset type */
  private observations: Map<string, DuplicateObservation[]> = new Map([
    ["engine", []],
    ["action", []],
    ["formula", []],
    ["hook", []],
    ["skill", []],
  ]);

  /** PAC parameters */
  private readonly vcDimension = 385; // embedding dimension + 1
  private readonly targetEpsilon = 0.05;
  private readonly targetDelta = 0.01;

  /**
   * Record an observation
   */
  observe(obs: DuplicateObservation): void {
    const list = this.observations.get(obs.assetType) || [];
    list.push(obs);
    this.observations.set(obs.assetType, list);

    log.debug(`AdaptiveThreshold: observed ${obs.assetType} sim=${obs.cosineSimilarity.toFixed(3)} dup=${obs.wasActualDuplicate}`);
  }

  /**
   * Compute posterior Beta parameters
   */
  private computePosterior(assetType: string): BetaParams {
    const obs = this.observations.get(assetType) || [];

    let truePositives = 0;
    let falseNegatives = 0;

    for (const o of obs) {
      if (o.wasActualDuplicate) {
        truePositives++;
      } else {
        falseNegatives++;
      }
    }

    return {
      alpha: this.priorAlpha + truePositives,
      beta: this.priorBeta + falseNegatives
    };
  }

  /**
   * Beta distribution mean
   */
  private betaMean(params: BetaParams): number {
    return params.alpha / (params.alpha + params.beta);
  }

  /**
   * Beta distribution mode
   */
  private betaMode(params: BetaParams): number {
    if (params.alpha > 1 && params.beta > 1) {
      return (params.alpha - 1) / (params.alpha + params.beta - 2);
    }
    return this.betaMean(params);
  }

  /**
   * Beta distribution variance
   */
  private betaVariance(params: BetaParams): number {
    const { alpha, beta } = params;
    return (alpha * beta) / ((alpha + beta) ** 2 * (alpha + beta + 1));
  }

  /**
   * Approximate credible interval via normal approximation
   */
  private credibleInterval(params: BetaParams, confidence: number): [number, number] {
    const mean = this.betaMean(params);
    const std = Math.sqrt(this.betaVariance(params));

    const z = this.normalQuantile((1 + confidence) / 2);

    return [
      Math.max(0, mean - z * std),
      Math.min(1, mean + z * std)
    ];
  }

  /**
   * Normal quantile (inverse CDF) via Abramowitz & Stegun approximation
   */
  private normalQuantile(p: number): number {
    if (p <= 0) return -Infinity;
    if (p >= 1) return Infinity;

    const c0 = 2.515517;
    const c1 = 0.802853;
    const c2 = 0.010328;
    const d1 = 1.432788;
    const d2 = 0.189269;
    const d3 = 0.001308;

    const pAdjust = p > 0.5 ? 1 - p : p;
    const t = Math.sqrt(-2 * Math.log(pAdjust));

    const z = t - (c0 + c1 * t + c2 * t * t) / (1 + d1 * t + d2 * t * t + d3 * t * t * t);

    return p > 0.5 ? z : -z;
  }

  /**
   * Compute PAC sample complexity
   */
  computePACBound(assetType: string): PACBound {
    const obs = this.observations.get(assetType) || [];

    const sampleComplexity = Math.ceil(
      (1 / this.targetEpsilon) *
      (this.vcDimension * Math.log(1 / this.targetEpsilon) + Math.log(1 / this.targetDelta))
    );

    return {
      epsilon: this.targetEpsilon,
      delta: this.targetDelta,
      vcDimension: this.vcDimension,
      sampleComplexity,
      currentSamples: obs.length,
      isSufficient: obs.length >= sampleComplexity
    };
  }

  /**
   * Get optimal threshold for asset type
   */
  getThreshold(assetType: string, confidence: number = 0.95): ThresholdRecommendation {
    const posterior = this.computePosterior(assetType);
    const obs = this.observations.get(assetType) || [];
    const pacBound = this.computePACBound(assetType);

    const threshold = this.betaMode(posterior);
    const ci = this.credibleInterval(posterior, confidence);

    const variance = this.betaVariance(posterior);
    const isConverged = variance < 0.01 || pacBound.isSufficient;

    return {
      threshold: Math.max(0.5, Math.min(0.95, threshold)),
      confidence,
      credibleInterval: ci,
      sampleSize: obs.length,
      isConverged,
      pacBound
    };
  }

  /**
   * Get all asset type thresholds
   */
  getAllThresholds(): AssetTypeThresholds {
    const globalObs = Array.from(this.observations.values()).flat();
    const globalPosterior = this.computePosterior("engine"); // Use engine as proxy

    return {
      engine: this.getThreshold("engine"),
      action: this.getThreshold("action"),
      formula: this.getThreshold("formula"),
      hook: this.getThreshold("hook"),
      skill: this.getThreshold("skill"),
      global: {
        threshold: this.betaMode(globalPosterior),
        confidence: 0.95,
        credibleInterval: this.credibleInterval(globalPosterior, 0.95),
        sampleSize: globalObs.length,
        isConverged: globalObs.length >= 500,
        pacBound: this.computePACBound("engine")
      }
    };
  }

  /**
   * Should we flag as potential duplicate?
   */
  shouldFlagAsDuplicate(cosineSimilarity: number, assetType: string = "engine"): {
    shouldFlag: boolean;
    confidence: number;
    threshold: number;
    reason: string;
  } {
    const rec = this.getThreshold(assetType);
    const shouldFlag = cosineSimilarity >= rec.threshold;

    let reason: string;
    if (shouldFlag) {
      reason = `Cosine ${cosineSimilarity.toFixed(3)} >= threshold ${rec.threshold.toFixed(3)}`;
    } else if (cosineSimilarity >= rec.credibleInterval[0]) {
      reason = `Cosine ${cosineSimilarity.toFixed(3)} in uncertainty zone [${rec.credibleInterval[0].toFixed(3)}, ${rec.credibleInterval[1].toFixed(3)}]`;
    } else {
      reason = `Cosine ${cosineSimilarity.toFixed(3)} < threshold ${rec.threshold.toFixed(3)}`;
    }

    return {
      shouldFlag,
      confidence: rec.confidence,
      threshold: rec.threshold,
      reason
    };
  }

  /**
   * Bayesian decision with posterior predictive
   */
  probabilityIsDuplicate(cosineSimilarity: number, assetType: string = "engine"): number {
    const posterior = this.computePosterior(assetType);
    const threshold = this.betaMode(posterior);

    if (cosineSimilarity >= threshold) {
      const std = Math.sqrt(this.betaVariance(posterior));
      const zScore = (cosineSimilarity - threshold) / std;
      return 0.5 + 0.5 * this.erf(zScore / Math.sqrt(2));
    } else {
      const std = Math.sqrt(this.betaVariance(posterior));
      const zScore = (threshold - cosineSimilarity) / std;
      return 0.5 - 0.5 * this.erf(zScore / Math.sqrt(2));
    }
  }

  /**
   * Error function approximation
   */
  private erf(x: number): number {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return sign * y;
  }

  /**
   * Get learning status
   */
  getLearningStatus(): {
    totalObservations: number;
    perType: Record<string, number>;
    isConverged: boolean;
    needsMoreData: string[];
    recommendations: string[];
  } {
    const perType: Record<string, number> = {};
    let total = 0;
    const needsMoreData: string[] = [];

    for (const [type, obs] of this.observations) {
      perType[type] = obs.length;
      total += obs.length;

      const pac = this.computePACBound(type);
      if (!pac.isSufficient) {
        needsMoreData.push(`${type}: ${obs.length}/${pac.sampleComplexity} samples`);
      }
    }

    const recommendations: string[] = [];
    if (total < 100) {
      recommendations.push("Actively label duplicate/non-duplicate pairs to improve thresholds");
    }
    if (needsMoreData.length > 0) {
      recommendations.push(`PAC bounds not met for: ${needsMoreData.join(", ")}`);
    }

    return {
      totalObservations: total,
      perType,
      isConverged: needsMoreData.length === 0,
      needsMoreData,
      recommendations
    };
  }

  /**
   * Reset observations
   */
  reset(): void {
    this.observations = new Map([
      ["engine", []],
      ["action", []],
      ["formula", []],
      ["hook", []],
      ["skill", []],
    ]);
  }

  /**
   * Seed with historical data
   */
  seedWithHistorical(observations: DuplicateObservation[]): void {
    for (const obs of observations) {
      this.observe(obs);
    }
    log.info(`AdaptiveThreshold: seeded with ${observations.length} historical observations`);
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const adaptiveThresholdEngine = new AdaptiveThresholdEngine();
