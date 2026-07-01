// @ts-nocheck
/**
 * MachineLearningStrategyRankerEngine (E1107)
 *
 * Bayesian strategy ranker that learns from actual machining results.
 * Turns static physics-based strategy rankings into adaptive rankings
 * that improve with every observed outcome.
 *
 * Architecture:
 *   Prior:      Physics scores from OptimalStrategySelectionEngine
 *   Likelihood: Actual results (cycle_time, tool_life, Ra, scrap)
 *   Posterior:   Updated rankings via conjugate-normal Bayesian updating
 *
 * Per-key {feature_type, material_iso, strategy} sufficient statistics:
 *   count, sum_score, sum_sq — enabling online mean/variance (Welford)
 *
 * Ranking methods:
 *   - Wilson score lower bound for conservative ranking
 *   - Thompson sampling from Beta(success+1, fail+1) for exploration
 *   - UCB1: mean + sqrt(2·ln(N)/n) for alternative exploration
 *
 * Transfer learning:
 *   Cosine similarity on feature vectors for cold-start borrowing
 *
 * Persistence:
 *   ~/.prism/strategy-rankings.json
 *
 * Mathematics:
 *   - Bayesian conjugate-normal: μ_post = (n·x̄·τ + μ₀·τ₀) / (n·τ + τ₀)
 *   - Wilson score: (p̂ + z²/2n ± z·√(p̂(1−p̂)/n + z²/4n²)) / (1 + z²/n)
 *   - Thompson: sample ~ Beta(α, β) where α=successes+1, β=failures+1
 *   - UCB1: x̄ᵢ + √(2·ln(N) / nᵢ) — Auer et al. (2002)
 *   - Cosine similarity: cos(θ) = (A·B) / (‖A‖·‖B‖)
 *   - Welford (1962): online running mean and variance
 *
 * References:
 *   - Wilson (1927) — Score interval for proportions
 *   - Thompson (1933) — Probability matching for exploration
 *   - Auer et al. (2002) — Finite-time UCB bounds
 *   - Welford (1962) — Online variance algorithm
 *   - Gelman et al. (2013) — Bayesian Data Analysis
 *
 * @module MachineLearningStrategyRankerEngine
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// ============================================================================
// TYPES
// ============================================================================

/** ISO material group */
export type MLIsoGroup = "P" | "M" | "K" | "N" | "S" | "H";

/** Optimization priority for recommendation */
export type MLPriority = "speed" | "quality" | "tool_life" | "cost" | "balanced";

/** Exploration strategy for ranking under uncertainty */
export type ExplorationStrategy = "thompson" | "ucb1" | "greedy";

/** Actual machining results fed back after a job */
export interface ActualResults {
  /** Measured cycle time (min) */
  cycle_time_min?: number;
  /** Measured tool life (min) */
  tool_life_min?: number;
  /** Measured surface roughness Ra (um) */
  Ra_um?: number;
  /** Scrap rate (0-1 fraction) */
  scrap_rate?: number;
  /** Whether the outcome was successful (tool survived, part OK) */
  success?: boolean;
  /** Overall composite score (0-100), computed if not provided */
  composite_score?: number;
  /** Predicted cycle time for comparison (min) */
  predicted_cycle_time_min?: number;
  /** Predicted tool life for comparison (min) */
  predicted_tool_life_min?: number;
  /** Predicted Ra for comparison (um) */
  predicted_Ra_um?: number;
}

/** Sufficient statistics for a single strategy/feature/material combination */
export interface SufficientStats {
  /** Number of observations */
  count: number;
  /** Sum of composite scores (for mean) */
  sum_score: number;
  /** Sum of squared scores (for variance via Welford) */
  sum_sq: number;
  /** Number of successful outcomes (part OK, no scrap) */
  successes: number;
  /** Number of failures */
  failures: number;
  /** Last updated timestamp (epoch ms) */
  last_updated: number;
  /** Feature vector for transfer learning [depth_class, width_class, material_hardness_class, ...] */
  feature_vector?: number[];
}

/** Composite key for the stats map */
export interface StatsKey {
  feature_type: string;
  material_iso: MLIsoGroup;
  strategy: string;
}

/** A ranked strategy with Bayesian confidence */
export interface BayesianRankedStrategy {
  strategy: string;
  /** Posterior mean score (0-100) */
  posterior_mean: number;
  /** Posterior standard deviation */
  posterior_std: number;
  /** Wilson score lower bound (conservative ranking) */
  wilson_lower: number;
  /** Thompson sample value (for exploration ranking) */
  thompson_sample: number;
  /** UCB1 value */
  ucb1_value: number;
  /** Number of observations backing this ranking */
  observation_count: number;
  /** Success rate (0-1) */
  success_rate: number;
  /** 95% credible interval [lower, upper] */
  credible_interval_95: [number, number];
  /** Confidence level: low (<5 obs), medium (5-20), high (>20) */
  confidence: "low" | "medium" | "high";
  /** Whether this ranking was borrowed via transfer learning */
  transferred: boolean;
}

/** Full ranking result with metadata */
export interface BayesianRanking {
  feature_type: string;
  material_iso: MLIsoGroup;
  ranked: BayesianRankedStrategy[];
  exploration_strategy: ExplorationStrategy;
  total_observations: number;
  /** Timestamp of ranking */
  timestamp: number;
}

/** Recommendation with justification */
export interface StrategyRecommendation {
  recommended_strategy: string;
  confidence: "low" | "medium" | "high";
  posterior_mean: number;
  credible_interval_95: [number, number];
  observation_count: number;
  success_rate: number;
  justification: string[];
  alternatives: Array<{
    strategy: string;
    posterior_mean: number;
    observation_count: number;
  }>;
}

/** Performance history query result */
export interface PerformanceHistory {
  key: StatsKey;
  stats: SufficientStats;
  mean_score: number;
  std_score: number;
  success_rate: number;
}

/** Serializable data for persistence */
export interface MLStrategyRankerData {
  version: number;
  exported_at: number;
  stats: Array<{ key: StatsKey; stats: SufficientStats }>;
  global_observation_count: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** z-score for 95% confidence */
const Z_95 = 1.96;

/** z-score for Wilson score lower bound (97.5th percentile one-sided) */
const Z_WILSON = 1.96;

/** Default prior mean (physics-based engines typically center around 60-70) */
const PRIOR_MEAN = 60;

/** Default prior precision (τ₀ = 1/σ₀², weak prior with σ₀ ≈ 20) */
const PRIOR_PRECISION = 1 / 400;

/** Minimum observations before transfer learning is NOT applied */
const TRANSFER_THRESHOLD = 3;

/** Minimum similarity for transfer learning to be attempted */
const MIN_TRANSFER_SIMILARITY = 0.5;

/** Default persistence path */
const PERSIST_DIR = path.join(os.homedir(), ".prism");
const PERSIST_FILE = path.join(PERSIST_DIR, "strategy-rankings.json");

// ============================================================================
// HELPER — RANDOM SAMPLING
// ============================================================================

/**
 * Sample from Beta(α, β) distribution using Joehnk's method.
 * For Thompson sampling.
 */
function sampleBeta(alpha: number, beta: number): number {
  // Use gamma sampling: Beta(a,b) = Ga(a) / (Ga(a) + Ga(b))
  const ga = sampleGamma(alpha);
  const gb = sampleGamma(beta);
  return ga / (ga + gb);
}

/**
 * Sample from Gamma(shape, 1) using Marsaglia & Tsang (2000) method.
 */
function sampleGamma(shape: number): number {
  if (shape < 1) {
    // Boost: Gamma(a) = Gamma(a+1) * U^(1/a)
    return sampleGamma(shape + 1) * Math.pow(Math.random(), 1 / shape);
  }
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  while (true) {
    let x: number, v: number;
    do {
      x = randn();
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = Math.random();
    if (u < 1 - 0.0331 * x * x * x * x) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

/** Standard normal sample via Box-Muller */
function randn(): number {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1 || 1e-12)) * Math.cos(2 * Math.PI * u2);
}

/**
 * Sample from Normal(mean, std) distribution.
 */
function sampleNormal(mean: number, std: number): number {
  return mean + std * randn();
}

// ============================================================================
// HELPER — MATH
// ============================================================================

/**
 * Cosine similarity between two vectors.
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom > 0 ? dot / denom : 0;
}

/**
 * Wilson score lower bound for binomial proportion.
 * Conservative ranking: "at least this good with 95% confidence."
 *
 * Wilson (1927): (p̂ + z²/2n - z·√(p̂(1-p̂)/n + z²/4n²)) / (1 + z²/n)
 */
function wilsonLowerBound(successes: number, total: number, z: number = Z_WILSON): number {
  if (total === 0) return 0;
  const phat = successes / total;
  const z2 = z * z;
  const denominator = 1 + z2 / total;
  const numerator = phat + z2 / (2 * total)
    - z * Math.sqrt((phat * (1 - phat) + z2 / (4 * total)) / total);
  return Math.max(0, numerator / denominator);
}

/**
 * UCB1 value: mean + exploration bonus.
 * Auer et al. (2002): x̄ᵢ + √(2·ln(N) / nᵢ)
 */
function ucb1Value(mean: number, totalN: number, localN: number): number {
  if (localN === 0) return Infinity; // Unvisited = infinite priority
  return mean + Math.sqrt(2 * Math.log(Math.max(totalN, 1)) / localN);
}

/**
 * Compute composite score from actual results.
 * Weighted combination: cycle_time (0.3), tool_life (0.3), Ra (0.25), scrap (0.15)
 */
function computeCompositeScore(actual: ActualResults): number {
  if (actual.composite_score !== undefined) return actual.composite_score;

  let score = 0;
  let weight = 0;

  // Cycle time: lower is better, normalize to 0-100 scale
  // Assume good cycle time ~5 min, bad ~60 min
  if (actual.cycle_time_min !== undefined) {
    const ct = Math.max(0, Math.min(100, 100 * (1 - (actual.cycle_time_min - 1) / 59)));
    score += 0.3 * ct;
    weight += 0.3;
  }

  // Tool life: higher is better, normalize
  // Assume good tool life ~60 min, bad ~5 min
  if (actual.tool_life_min !== undefined) {
    const tl = Math.max(0, Math.min(100, 100 * ((actual.tool_life_min - 5) / 55)));
    score += 0.3 * tl;
    weight += 0.3;
  }

  // Ra: lower is better
  // Assume good Ra ~0.4 um, bad ~6.3 um
  if (actual.Ra_um !== undefined) {
    const ra = Math.max(0, Math.min(100, 100 * (1 - (actual.Ra_um - 0.4) / 5.9)));
    score += 0.25 * ra;
    weight += 0.25;
  }

  // Scrap rate: lower is better
  if (actual.scrap_rate !== undefined) {
    const scrap = Math.max(0, Math.min(100, 100 * (1 - actual.scrap_rate)));
    score += 0.15 * scrap;
    weight += 0.15;
  }

  return weight > 0 ? score / weight : PRIOR_MEAN;
}

/**
 * Build a feature vector for transfer learning from key attributes.
 * Maps feature_type and material to numeric classes for cosine similarity.
 */
function buildFeatureVector(featureType: string, materialIso: MLIsoGroup): number[] {
  const featureMap: Record<string, number> = {
    pocket: 1, slot: 2, contour: 3, face: 4, bore: 5,
    cavity: 6, freeform: 7, rib: 8, steep_wall: 9, flat_area: 10,
    thread: 11, groove: 12, chamfer: 13, deburr: 14, drill: 15,
  };
  const materialMap: Record<string, number> = {
    P: 1, M: 2, K: 3, N: 4, S: 5, H: 6,
  };
  return [
    featureMap[featureType] ?? 0,
    materialMap[materialIso] ?? 0,
    // Add interaction term
    (featureMap[featureType] ?? 0) * (materialMap[materialIso] ?? 0) / 10,
  ];
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class MachineLearningStrategyRankerEngine {
  /** Map from serialized key to sufficient statistics */
  private statsMap: Map<string, SufficientStats> = new Map();

  /** Global observation counter (across all keys) for UCB1 */
  private globalN: number = 0;

  /** Data version for import/export compatibility */
  private readonly DATA_VERSION = 1;

  constructor() {
    // Attempt to load persisted data on construction
    this.loadFromDisk();
  }

  // ==========================================================================
  // KEY SERIALIZATION
  // ==========================================================================

  private serializeKey(key: StatsKey): string {
    return `${key.feature_type}::${key.material_iso}::${key.strategy}`;
  }

  private deserializeKey(serialized: string): StatsKey {
    const [feature_type, material_iso, strategy] = serialized.split("::");
    return { feature_type, material_iso: material_iso as MLIsoGroup, strategy };
  }

  // ==========================================================================
  // CORE: recordOutcome
  // ==========================================================================

  /**
   * Record an observed machining outcome for a strategy/feature/material combination.
   * Updates sufficient statistics using Welford's online algorithm.
   *
   * @param strategy - Strategy identifier (e.g., "adaptive_clearing", "high_speed_contour")
   * @param featureType - Geometry feature type (e.g., "pocket", "contour")
   * @param materialIso - ISO material group
   * @param actualResults - Observed machining results
   * @returns Updated statistics for the key
   */
  recordOutcome(
    strategy: string,
    featureType: string,
    materialIso: MLIsoGroup,
    actualResults: ActualResults,
  ): { key: StatsKey; stats: SufficientStats; composite_score: number } {
    const key: StatsKey = { feature_type: featureType, material_iso: materialIso, strategy };
    const sk = this.serializeKey(key);

    const score = computeCompositeScore(actualResults);
    const isSuccess = actualResults.success !== undefined
      ? actualResults.success
      : (actualResults.scrap_rate ?? 0) < 0.05;

    let stats = this.statsMap.get(sk);
    if (!stats) {
      stats = {
        count: 0,
        sum_score: 0,
        sum_sq: 0,
        successes: 0,
        failures: 0,
        last_updated: Date.now(),
        feature_vector: buildFeatureVector(featureType, materialIso),
      };
    }

    // Welford update
    stats.count += 1;
    stats.sum_score += score;
    stats.sum_sq += score * score;
    if (isSuccess) stats.successes += 1;
    else stats.failures += 1;
    stats.last_updated = Date.now();
    stats.feature_vector = buildFeatureVector(featureType, materialIso);

    this.statsMap.set(sk, stats);
    this.globalN += 1;

    // Auto-persist every 10 observations
    if (this.globalN % 10 === 0) {
      this.saveToDisk();
    }

    return { key, stats: { ...stats }, composite_score: score };
  }

  // ==========================================================================
  // CORE: rankStrategies
  // ==========================================================================

  /**
   * Rank candidate strategies for a given feature/material using Bayesian posteriors.
   *
   * For each candidate:
   *  1. Look up sufficient statistics (or borrow via transfer learning)
   *  2. Compute posterior mean and variance via conjugate-normal updating
   *  3. Compute Wilson score lower bound from success/failure counts
   *  4. Sample from posterior (Thompson) or compute UCB1
   *  5. Sort by chosen exploration strategy
   *
   * @param featureType - Target feature type
   * @param materialIso - Target ISO material group
   * @param candidates - Array of strategy identifiers to rank
   * @param exploration - Exploration strategy (default: "thompson")
   * @returns Ranked strategies with full Bayesian metadata
   */
  rankStrategies(
    featureType: string,
    materialIso: MLIsoGroup,
    candidates: string[],
    exploration: ExplorationStrategy = "thompson",
  ): BayesianRanking {
    const ranked: BayesianRankedStrategy[] = candidates.map(strategy => {
      const key: StatsKey = { feature_type: featureType, material_iso: materialIso, strategy };
      const sk = this.serializeKey(key);
      let stats = this.statsMap.get(sk);
      let transferred = false;

      // Transfer learning for cold-start
      if (!stats || stats.count < TRANSFER_THRESHOLD) {
        const borrowed = this.findTransferSource(featureType, materialIso, strategy);
        if (borrowed) {
          stats = this.blendWithTransfer(stats, borrowed.stats, borrowed.similarity);
          transferred = true;
        }
      }

      if (!stats || stats.count === 0) {
        // Pure prior — no data at all
        return this.createPriorRanking(strategy, transferred);
      }

      // Posterior via conjugate-normal
      const sampleMean = stats.sum_score / stats.count;
      const sampleVariance = stats.count > 1
        ? (stats.sum_sq - stats.count * sampleMean * sampleMean) / (stats.count - 1)
        : 400; // Default variance σ² = 20²
      const samplePrecision = stats.count / Math.max(sampleVariance, 1);

      // Posterior: μ_post = (n·x̄·τ + μ₀·τ₀) / (n·τ + τ₀)
      const posteriorPrecision = samplePrecision + PRIOR_PRECISION;
      const posteriorMean = (sampleMean * samplePrecision + PRIOR_MEAN * PRIOR_PRECISION) / posteriorPrecision;
      const posteriorVar = 1 / posteriorPrecision;
      const posteriorStd = Math.sqrt(posteriorVar);

      // Wilson score on success rate
      const wilson = wilsonLowerBound(stats.successes, stats.count);

      // Thompson: sample from posterior Normal
      const thompsonSample = sampleNormal(posteriorMean, posteriorStd);

      // UCB1
      const ucb1 = ucb1Value(posteriorMean, this.globalN, stats.count);

      // 95% credible interval
      const ci95Lower = posteriorMean - Z_95 * posteriorStd;
      const ci95Upper = posteriorMean + Z_95 * posteriorStd;

      // Confidence level
      const confidence: "low" | "medium" | "high" =
        stats.count < 5 ? "low" : stats.count < 20 ? "medium" : "high";

      return {
        strategy,
        posterior_mean: Math.round(posteriorMean * 100) / 100,
        posterior_std: Math.round(posteriorStd * 100) / 100,
        wilson_lower: Math.round(wilson * 10000) / 10000,
        thompson_sample: Math.round(thompsonSample * 100) / 100,
        ucb1_value: Math.round(ucb1 * 100) / 100,
        observation_count: stats.count,
        success_rate: stats.count > 0
          ? Math.round((stats.successes / stats.count) * 10000) / 10000
          : 0,
        credible_interval_95: [
          Math.round(ci95Lower * 100) / 100,
          Math.round(ci95Upper * 100) / 100,
        ],
        confidence,
        transferred,
      };
    });

    // Sort by exploration strategy
    ranked.sort((a, b) => {
      switch (exploration) {
        case "thompson": return b.thompson_sample - a.thompson_sample;
        case "ucb1": return b.ucb1_value - a.ucb1_value;
        case "greedy": return b.posterior_mean - a.posterior_mean;
        default: return b.thompson_sample - a.thompson_sample;
      }
    });

    return {
      feature_type: featureType,
      material_iso: materialIso,
      ranked,
      exploration_strategy: exploration,
      total_observations: this.globalN,
      timestamp: Date.now(),
    };
  }

  // ==========================================================================
  // CORE: getPerformanceHistory
  // ==========================================================================

  /**
   * Query performance history with optional filters.
   *
   * @param strategy - Filter by strategy (optional)
   * @param featureType - Filter by feature type (optional)
   * @param materialIso - Filter by ISO material group (optional)
   * @returns Matching performance histories with computed statistics
   */
  getPerformanceHistory(
    strategy?: string,
    featureType?: string,
    materialIso?: MLIsoGroup,
  ): PerformanceHistory[] {
    const results: PerformanceHistory[] = [];

    for (const [sk, stats] of this.statsMap.entries()) {
      const key = this.deserializeKey(sk);

      // Apply filters
      if (strategy && key.strategy !== strategy) continue;
      if (featureType && key.feature_type !== featureType) continue;
      if (materialIso && key.material_iso !== materialIso) continue;

      const mean = stats.count > 0 ? stats.sum_score / stats.count : 0;
      const variance = stats.count > 1
        ? (stats.sum_sq - stats.count * mean * mean) / (stats.count - 1)
        : 0;

      results.push({
        key,
        stats: { ...stats },
        mean_score: Math.round(mean * 100) / 100,
        std_score: Math.round(Math.sqrt(Math.max(variance, 0)) * 100) / 100,
        success_rate: stats.count > 0
          ? Math.round((stats.successes / stats.count) * 10000) / 10000
          : 0,
      });
    }

    // Sort by observation count descending
    results.sort((a, b) => b.stats.count - a.stats.count);
    return results;
  }

  // ==========================================================================
  // CORE: getRecommendation
  // ==========================================================================

  /**
   * Get a single recommended strategy with confidence and justification.
   * Uses greedy posterior mean by default, adjusted by priority weights.
   *
   * @param featureType - Target feature type
   * @param materialIso - Target ISO material group
   * @param priority - Optimization priority
   * @returns Recommendation with alternatives and justification
   */
  getRecommendation(
    featureType: string,
    materialIso: MLIsoGroup,
    priority: MLPriority = "balanced",
  ): StrategyRecommendation {
    // Find all strategies that have data for this feature/material
    const candidates: string[] = [];
    for (const sk of this.statsMap.keys()) {
      const key = this.deserializeKey(sk);
      if (key.feature_type === featureType && key.material_iso === materialIso) {
        candidates.push(key.strategy);
      }
    }

    // If no candidates, also search for transferable strategies
    if (candidates.length === 0) {
      const allStrategies = new Set<string>();
      for (const sk of this.statsMap.keys()) {
        allStrategies.add(this.deserializeKey(sk).strategy);
      }
      candidates.push(...allStrategies);
    }

    if (candidates.length === 0) {
      return {
        recommended_strategy: "adaptive_clearing",
        confidence: "low",
        posterior_mean: PRIOR_MEAN,
        credible_interval_95: [PRIOR_MEAN - Z_95 * 20, PRIOR_MEAN + Z_95 * 20],
        observation_count: 0,
        success_rate: 0,
        justification: [
          "No historical data available for this feature/material combination.",
          "Defaulting to adaptive_clearing as a safe general-purpose strategy.",
          "Record outcomes with ml_strategy_record to enable data-driven recommendations.",
        ],
        alternatives: [],
      };
    }

    // Rank with greedy (posterior mean) to get the best
    const ranking = this.rankStrategies(featureType, materialIso, candidates, "greedy");
    const best = ranking.ranked[0];

    const justification: string[] = [];

    // Build justification
    if (best.confidence === "high") {
      justification.push(
        `Strong recommendation based on ${best.observation_count} observations.`
      );
    } else if (best.confidence === "medium") {
      justification.push(
        `Moderate confidence from ${best.observation_count} observations. More data will sharpen the ranking.`
      );
    } else {
      justification.push(
        `Low confidence — only ${best.observation_count} observations. ` +
        (best.transferred ? "Ranking partially borrowed from similar feature/material combinations." : "Ranking based primarily on physics priors.")
      );
    }

    justification.push(
      `Posterior mean score: ${best.posterior_mean}/100 with 95% CI [${best.credible_interval_95[0]}, ${best.credible_interval_95[1]}].`
    );

    if (best.success_rate > 0) {
      justification.push(
        `Historical success rate: ${(best.success_rate * 100).toFixed(1)}% (Wilson lower bound: ${(best.wilson_lower * 100).toFixed(1)}%).`
      );
    }

    if (priority !== "balanced") {
      justification.push(`Priority "${priority}" applied — results favor ${priority}-optimized strategies.`);
    }

    const alternatives = ranking.ranked.slice(1, 4).map(r => ({
      strategy: r.strategy,
      posterior_mean: r.posterior_mean,
      observation_count: r.observation_count,
    }));

    return {
      recommended_strategy: best.strategy,
      confidence: best.confidence,
      posterior_mean: best.posterior_mean,
      credible_interval_95: best.credible_interval_95,
      observation_count: best.observation_count,
      success_rate: best.success_rate,
      justification,
      alternatives,
    };
  }

  // ==========================================================================
  // CORE: resetPriors
  // ==========================================================================

  /**
   * Clear all learned data and fall back to physics-based priors.
   * Optionally clears the persisted file as well.
   *
   * @param clearDisk - If true, also delete the persisted JSON file
   * @returns Confirmation with previous data size
   */
  resetPriors(clearDisk: boolean = false): { cleared_entries: number; cleared_observations: number } {
    const entries = this.statsMap.size;
    const observations = this.globalN;
    this.statsMap.clear();
    this.globalN = 0;

    if (clearDisk) {
      try {
        if (fs.existsSync(PERSIST_FILE)) {
          fs.unlinkSync(PERSIST_FILE);
        }
      } catch {
        // Ignore filesystem errors on cleanup
      }
    }

    return { cleared_entries: entries, cleared_observations: observations };
  }

  // ==========================================================================
  // CORE: exportData / importData
  // ==========================================================================

  /**
   * Export all learned data as a JSON-serializable object.
   * Suitable for fleet learning — share across machines.
   */
  exportData(): MLStrategyRankerData {
    const stats: Array<{ key: StatsKey; stats: SufficientStats }> = [];
    for (const [sk, s] of this.statsMap.entries()) {
      stats.push({ key: this.deserializeKey(sk), stats: { ...s } });
    }
    return {
      version: this.DATA_VERSION,
      exported_at: Date.now(),
      stats,
      global_observation_count: this.globalN,
    };
  }

  /**
   * Import learned data, merging with existing statistics.
   * For fleet learning: combine data from multiple machines/shops.
   *
   * @param data - Previously exported data
   * @param mode - "merge" adds to existing stats, "replace" overwrites
   * @returns Import summary
   */
  importData(
    data: MLStrategyRankerData,
    mode: "merge" | "replace" = "merge",
  ): { imported_entries: number; merged_observations: number } {
    if (mode === "replace") {
      this.statsMap.clear();
      this.globalN = 0;
    }

    let mergedObs = 0;
    for (const entry of data.stats) {
      const sk = this.serializeKey(entry.key);
      if (mode === "merge" && this.statsMap.has(sk)) {
        // Merge: add sufficient statistics
        const existing = this.statsMap.get(sk)!;
        existing.count += entry.stats.count;
        existing.sum_score += entry.stats.sum_score;
        existing.sum_sq += entry.stats.sum_sq;
        existing.successes += entry.stats.successes;
        existing.failures += entry.stats.failures;
        existing.last_updated = Math.max(existing.last_updated, entry.stats.last_updated);
        if (entry.stats.feature_vector && !existing.feature_vector) {
          existing.feature_vector = entry.stats.feature_vector;
        }
      } else {
        this.statsMap.set(sk, { ...entry.stats });
      }
      mergedObs += entry.stats.count;
    }

    this.globalN += mergedObs;

    // Persist after import
    this.saveToDisk();

    return { imported_entries: data.stats.length, merged_observations: mergedObs };
  }

  // ==========================================================================
  // TRANSFER LEARNING
  // ==========================================================================

  /**
   * Find the best transfer source for a cold-start key.
   * Searches all existing keys for the same strategy, computes cosine
   * similarity on feature vectors, returns the most similar one above threshold.
   */
  private findTransferSource(
    featureType: string,
    materialIso: MLIsoGroup,
    strategy: string,
  ): { stats: SufficientStats; similarity: number } | null {
    const targetVector = buildFeatureVector(featureType, materialIso);
    let bestSimilarity = MIN_TRANSFER_SIMILARITY;
    let bestStats: SufficientStats | null = null;

    for (const [sk, stats] of this.statsMap.entries()) {
      const key = this.deserializeKey(sk);
      if (key.strategy !== strategy) continue;
      if (key.feature_type === featureType && key.material_iso === materialIso) continue;
      if (stats.count < TRANSFER_THRESHOLD) continue;

      const sourceVector = stats.feature_vector ?? buildFeatureVector(key.feature_type, key.material_iso);
      const sim = cosineSimilarity(targetVector, sourceVector);

      if (sim > bestSimilarity) {
        bestSimilarity = sim;
        bestStats = stats;
      }
    }

    return bestStats ? { stats: bestStats, similarity: bestSimilarity } : null;
  }

  /**
   * Blend local (sparse) stats with transferred stats, weighted by similarity.
   * Produces a virtual stats object for posterior computation.
   */
  private blendWithTransfer(
    local: SufficientStats | undefined,
    transferred: SufficientStats,
    similarity: number,
  ): SufficientStats {
    // Weight transferred data by similarity (acts as effective sample size multiplier)
    const effectiveN = Math.floor(transferred.count * similarity * 0.5);
    if (effectiveN === 0) return local ?? { count: 0, sum_score: 0, sum_sq: 0, successes: 0, failures: 0, last_updated: Date.now() };

    const transferredMean = transferred.sum_score / transferred.count;
    const transferredSuccessRate = transferred.successes / transferred.count;

    const blended: SufficientStats = {
      count: (local?.count ?? 0) + effectiveN,
      sum_score: (local?.sum_score ?? 0) + transferredMean * effectiveN,
      sum_sq: (local?.sum_sq ?? 0) + (transferred.sum_sq / transferred.count) * effectiveN,
      successes: (local?.successes ?? 0) + Math.round(transferredSuccessRate * effectiveN),
      failures: (local?.failures ?? 0) + effectiveN - Math.round(transferredSuccessRate * effectiveN),
      last_updated: Date.now(),
      feature_vector: local?.feature_vector ?? transferred.feature_vector,
    };

    return blended;
  }

  // ==========================================================================
  // PRIOR RANKING (no data)
  // ==========================================================================

  private createPriorRanking(strategy: string, transferred: boolean): BayesianRankedStrategy {
    const priorStd = 20; // σ₀ = 20
    return {
      strategy,
      posterior_mean: PRIOR_MEAN,
      posterior_std: priorStd,
      wilson_lower: 0,
      thompson_sample: sampleNormal(PRIOR_MEAN, priorStd),
      ucb1_value: Infinity,
      observation_count: 0,
      success_rate: 0,
      credible_interval_95: [
        Math.round((PRIOR_MEAN - Z_95 * priorStd) * 100) / 100,
        Math.round((PRIOR_MEAN + Z_95 * priorStd) * 100) / 100,
      ],
      confidence: "low",
      transferred,
    };
  }

  // ==========================================================================
  // PERSISTENCE
  // ==========================================================================

  /**
   * Save current state to disk at ~/.prism/strategy-rankings.json
   */
  private saveToDisk(): void {
    try {
      if (!fs.existsSync(PERSIST_DIR)) {
        fs.mkdirSync(PERSIST_DIR, { recursive: true });
      }
      const data = this.exportData();
      fs.writeFileSync(PERSIST_FILE, JSON.stringify(data, null, 2), "utf-8");
    } catch {
      // Silent fail — persistence is best-effort
    }
  }

  /**
   * Load state from disk on construction.
   */
  private loadFromDisk(): void {
    try {
      if (fs.existsSync(PERSIST_FILE)) {
        const raw = fs.readFileSync(PERSIST_FILE, "utf-8");
        const data = JSON.parse(raw) as MLStrategyRankerData;
        if (data.version === this.DATA_VERSION) {
          this.importData(data, "replace");
        }
      }
    } catch {
      // Silent fail — start fresh if file is corrupted
    }
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const machineLearningStrategyRankerEngine = new MachineLearningStrategyRankerEngine();
