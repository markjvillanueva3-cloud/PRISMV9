/**
 * BanditParameterOptimizerEngine — Multi-Armed Bandit Parameter Optimization
 *
 * MILL-AGI Phase 0.4: Online Learning Layer — Unit 3
 *
 * Optimizes milling parameters using multi-armed bandit algorithms:
 *   - Thompson Sampling for continuous parameter spaces
 *   - Upper Confidence Bound (UCB) for discrete choices
 *   - LinUCB for contextual bandits with feature vectors
 *   - Bayesian optimization with Gaussian Process priors
 *
 * Applications:
 *   - Speed/feed optimization during production
 *   - Tool selection for new materials
 *   - Coolant strategy selection
 *   - Cutting depth adaptation
 *
 * References:
 *   [1] Chapelle & Li (2011) "An Empirical Evaluation of Thompson Sampling" NIPS
 *   [2] Li et al. (2010) "A Contextual-Bandit Approach to Personalized News
 *       Article Recommendation" WWW
 *   [3] Srinivas et al. (2010) "Gaussian Process Optimization in the Bandit
 *       Setting: No Regret and Experimental Design" ICML
 *
 * @module engines/BanditParameterOptimizerEngine
 * @milestone MILL-AGI-P0/U-P0.4-03
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export interface ParameterArm {
  id: string;
  name: string;
  parameters: {
    cutting_speed_mpm?: number;
    feed_per_tooth_mm?: number;
    axial_depth_mm?: number;
    radial_depth_mm?: number;
    coolant_type?: "dry" | "flood" | "mql" | "cryogenic";
  };
  constraints?: {
    min_speed?: number;
    max_speed?: number;
    min_feed?: number;
    max_feed?: number;
  };
}

export interface ArmStats {
  arm_id: string;
  pulls: number;
  total_reward: number;
  mean_reward: number;
  variance: number;
  ucb_score: number;
  thompson_sample?: number;
}

export interface Context {
  material_hardness_hrc: number;
  tool_wear_vb_mm: number;
  spindle_load_percent: number;
  vibration_level: number;
  temperature_c: number;
  surface_roughness_um?: number;
}

export interface RewardSignal {
  mrr_reward: number;
  tool_life_reward: number;
  quality_reward: number;
  safety_penalty: number;
  total: number;
}

export interface BanditConfig {
  algorithm: "ucb" | "thompson" | "linucb" | "gp-ucb";
  ucb_exploration: number;
  thompson_alpha: number;
  thompson_beta: number;
  linucb_alpha: number;
  gp_length_scale: number;
  gp_variance: number;
  discount_factor: number;
}

export interface OptimizationResult {
  selected_arm: ParameterArm;
  confidence: number;
  exploration_bonus: number;
  expected_reward: number;
  algorithm_used: string;
}

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

const DEFAULT_CONFIG: BanditConfig = {
  algorithm: "thompson",
  ucb_exploration: 2.0,
  thompson_alpha: 1.0,
  thompson_beta: 1.0,
  linucb_alpha: 0.5,
  gp_length_scale: 1.0,
  gp_variance: 1.0,
  discount_factor: 0.99,
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class BanditParameterOptimizerEngine {
  private config: BanditConfig;
  private arms: Map<string, ParameterArm>;
  private armStats: Map<string, ArmStats>;
  private totalPulls: number;
  private linucbWeights: Map<string, number[]>;
  private linucbCovInverse: Map<string, number[][]>;
  private gpObservations: Array<{ context: number[]; reward: number; arm_id: string }>;

  constructor(config?: Partial<BanditConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.arms = new Map();
    this.armStats = new Map();
    this.totalPulls = 0;
    this.linucbWeights = new Map();
    this.linucbCovInverse = new Map();
    this.gpObservations = [];
  }

  /**
   * Register a parameter arm.
   */
  registerArm(arm: ParameterArm): void {
    this.arms.set(arm.id, arm);
    this.armStats.set(arm.id, {
      arm_id: arm.id,
      pulls: 0,
      total_reward: 0,
      mean_reward: 0,
      variance: 1.0,
      ucb_score: Infinity,
    });

    // Initialize LinUCB structures
    const featureDim = 6;
    this.linucbWeights.set(arm.id, new Array(featureDim).fill(0));
    this.linucbCovInverse.set(arm.id, this.identityMatrix(featureDim));
  }

  /**
   * Select best arm given context.
   */
  selectArm(context?: Context): OptimizationResult {
    if (this.arms.size === 0) {
      throw new Error("No arms registered");
    }

    let selectedArm: ParameterArm | undefined;
    let confidence = 0;
    let explorationBonus = 0;
    let expectedReward = 0;

    switch (this.config.algorithm) {
      case "ucb":
        ({ selectedArm, confidence, explorationBonus, expectedReward } =
          this.selectUCB());
        break;

      case "thompson":
        ({ selectedArm, confidence, explorationBonus, expectedReward } =
          this.selectThompson());
        break;

      case "linucb":
        if (!context) {
          throw new Error("LinUCB requires context");
        }
        ({ selectedArm, confidence, explorationBonus, expectedReward } =
          this.selectLinUCB(context));
        break;

      case "gp-ucb":
        if (!context) {
          throw new Error("GP-UCB requires context");
        }
        ({ selectedArm, confidence, explorationBonus, expectedReward } =
          this.selectGPUCB(context));
        break;
    }

    log.debug(
      `[Bandit] Selected arm=${selectedArm!.id}, algo=${this.config.algorithm}, conf=${confidence.toFixed(3)}`
    );

    return {
      selected_arm: selectedArm!,
      confidence,
      exploration_bonus: explorationBonus,
      expected_reward: expectedReward,
      algorithm_used: this.config.algorithm,
    };
  }

  /**
   * Update arm statistics with observed reward.
   */
  updateReward(armId: string, reward: RewardSignal, context?: Context): void {
    const stats = this.armStats.get(armId);
    if (!stats) return;

    const r = reward.total;
    this.totalPulls++;
    stats.pulls++;

    // Incremental mean update
    const oldMean = stats.mean_reward;
    stats.total_reward += r;
    stats.mean_reward = stats.total_reward / stats.pulls;

    // Incremental variance (Welford's algorithm)
    if (stats.pulls > 1) {
      const delta = r - oldMean;
      const delta2 = r - stats.mean_reward;
      stats.variance += (delta * delta2 - stats.variance) / stats.pulls;
    }

    // Update UCB score
    const exploration = this.config.ucb_exploration *
      Math.sqrt(Math.log(this.totalPulls + 1) / (stats.pulls + 1));
    stats.ucb_score = stats.mean_reward + exploration;

    // Update LinUCB if context provided
    if (context && this.config.algorithm === "linucb") {
      this.updateLinUCB(armId, context, r);
    }

    // Update GP observations
    if (context) {
      this.gpObservations.push({
        context: this.contextToFeatures(context),
        reward: r,
        arm_id: armId,
      });
      if (this.gpObservations.length > 500) {
        this.gpObservations.shift();
      }
    }
  }

  /**
   * Get statistics for all arms.
   */
  getArmStats(): ArmStats[] {
    return Array.from(this.armStats.values());
  }

  /**
   * Get best arm based on mean reward.
   */
  getBestArm(): { arm: ParameterArm; stats: ArmStats } | null {
    let best: { arm: ParameterArm; stats: ArmStats } | null = null;
    let bestMean = -Infinity;

    for (const [id, stats] of this.armStats.entries()) {
      if (stats.pulls >= 5 && stats.mean_reward > bestMean) {
        bestMean = stats.mean_reward;
        const arm = this.arms.get(id);
        if (arm) {
          best = { arm, stats };
        }
      }
    }

    return best;
  }

  /**
   * Get exploration vs exploitation ratio.
   */
  getExplorationRatio(): number {
    if (this.totalPulls === 0) return 1.0;

    const stats = Array.from(this.armStats.values());
    const minPulls = Math.min(...stats.map((s) => s.pulls));
    const maxPulls = Math.max(...stats.map((s) => s.pulls));

    if (maxPulls === 0) return 1.0;

    // High ratio = more exploration (more even pulls)
    return minPulls / maxPulls;
  }

  /**
   * Get cumulative regret estimate.
   */
  getCumulativeRegret(): number {
    const best = this.getBestArm();
    if (!best) return 0;

    let regret = 0;
    for (const stats of this.armStats.values()) {
      const suboptimality = Math.max(0, best.stats.mean_reward - stats.mean_reward);
      regret += suboptimality * stats.pulls;
    }

    return regret;
  }

  /**
   * Recommend parameter adjustment.
   */
  recommendAdjustment(
    currentParams: ParameterArm["parameters"],
    context: Context
  ): {
    adjustment: Partial<ParameterArm["parameters"]>;
    expected_improvement: number;
    confidence: number;
  } {
    const result = this.selectArm(context);
    const selectedParams = result.selected_arm.parameters;

    const adjustment: Partial<ParameterArm["parameters"]> = {};
    let changes = 0;

    if (
      selectedParams.cutting_speed_mpm !== undefined &&
      currentParams.cutting_speed_mpm !== undefined
    ) {
      const diff = selectedParams.cutting_speed_mpm - currentParams.cutting_speed_mpm;
      if (Math.abs(diff) > 5) {
        adjustment.cutting_speed_mpm = selectedParams.cutting_speed_mpm;
        changes++;
      }
    }

    if (
      selectedParams.feed_per_tooth_mm !== undefined &&
      currentParams.feed_per_tooth_mm !== undefined
    ) {
      const diff = selectedParams.feed_per_tooth_mm - currentParams.feed_per_tooth_mm;
      if (Math.abs(diff) > 0.01) {
        adjustment.feed_per_tooth_mm = selectedParams.feed_per_tooth_mm;
        changes++;
      }
    }

    if (selectedParams.coolant_type !== currentParams.coolant_type) {
      adjustment.coolant_type = selectedParams.coolant_type;
      changes++;
    }

    const expectedImprovement = changes > 0 ? result.expected_reward * 0.1 : 0;

    return {
      adjustment,
      expected_improvement: expectedImprovement,
      confidence: result.confidence,
    };
  }

  /**
   * Reset all statistics.
   */
  reset(): void {
    for (const stats of this.armStats.values()) {
      stats.pulls = 0;
      stats.total_reward = 0;
      stats.mean_reward = 0;
      stats.variance = 1.0;
      stats.ucb_score = Infinity;
    }
    this.totalPulls = 0;
    this.gpObservations = [];

    // Reset LinUCB
    const featureDim = 6;
    for (const id of this.linucbWeights.keys()) {
      this.linucbWeights.set(id, new Array(featureDim).fill(0));
      this.linucbCovInverse.set(id, this.identityMatrix(featureDim));
    }
  }

  /**
   * Get configuration.
   */
  getConfig(): BanditConfig {
    return { ...this.config };
  }

  /**
   * Set algorithm.
   */
  setAlgorithm(algorithm: BanditConfig["algorithm"]): void {
    this.config.algorithm = algorithm;
  }

  // ============================================================================
  // PRIVATE: UCB SELECTION
  // ============================================================================

  private selectUCB(): {
    selectedArm: ParameterArm;
    confidence: number;
    explorationBonus: number;
    expectedReward: number;
  } {
    let bestArm: ParameterArm | undefined;
    let bestScore = -Infinity;
    let bestExpected = 0;
    let bestBonus = 0;

    for (const [id, stats] of this.armStats.entries()) {
      const arm = this.arms.get(id)!;

      if (stats.pulls === 0) {
        return {
          selectedArm: arm,
          confidence: 0,
          explorationBonus: Infinity,
          expectedReward: 0,
        };
      }

      const exploration = this.config.ucb_exploration *
        Math.sqrt(Math.log(this.totalPulls + 1) / stats.pulls);
      const score = stats.mean_reward + exploration;

      if (score > bestScore) {
        bestScore = score;
        bestArm = arm;
        bestExpected = stats.mean_reward;
        bestBonus = exploration;
      }
    }

    const confidence = 1 / (1 + bestBonus);

    return {
      selectedArm: bestArm!,
      confidence,
      explorationBonus: bestBonus,
      expectedReward: bestExpected,
    };
  }

  // ============================================================================
  // PRIVATE: THOMPSON SAMPLING
  // ============================================================================

  private selectThompson(): {
    selectedArm: ParameterArm;
    confidence: number;
    explorationBonus: number;
    expectedReward: number;
  } {
    let bestArm: ParameterArm | undefined;
    let bestSample = -Infinity;
    let bestMean = 0;

    const samples: Map<string, number> = new Map();

    for (const [id, stats] of this.armStats.entries()) {
      const arm = this.arms.get(id)!;

      // Beta posterior for success rate (scaled rewards)
      const alpha = this.config.thompson_alpha + stats.total_reward;
      const beta = this.config.thompson_beta + stats.pulls - stats.total_reward / 2;

      const sample = this.betaSample(Math.max(0.1, alpha), Math.max(0.1, beta));
      samples.set(id, sample);

      if (sample > bestSample) {
        bestSample = sample;
        bestArm = arm;
        bestMean = stats.mean_reward;
      }
    }

    // Confidence based on posterior concentration
    const bestStats = this.armStats.get(bestArm!.id)!;
    const confidence = bestStats.pulls / (bestStats.pulls + 10);

    const explorationBonus = bestSample - bestMean;

    return {
      selectedArm: bestArm!,
      confidence,
      explorationBonus: Math.abs(explorationBonus),
      expectedReward: bestMean,
    };
  }

  // ============================================================================
  // PRIVATE: LINUCB
  // ============================================================================

  private selectLinUCB(context: Context): {
    selectedArm: ParameterArm;
    confidence: number;
    explorationBonus: number;
    expectedReward: number;
  } {
    const features = this.contextToFeatures(context);
    let bestArm: ParameterArm | undefined;
    let bestScore = -Infinity;
    let bestExpected = 0;
    let bestBonus = 0;

    for (const [id, arm] of this.arms.entries()) {
      const weights = this.linucbWeights.get(id)!;
      const covInv = this.linucbCovInverse.get(id)!;

      // Expected reward
      const expected = this.dotProduct(weights, features);

      // Confidence bound
      const temp = this.matVecMult(covInv, features);
      const variance = this.dotProduct(features, temp);
      const bonus = this.config.linucb_alpha * Math.sqrt(variance);

      const score = expected + bonus;

      if (score > bestScore) {
        bestScore = score;
        bestArm = arm;
        bestExpected = expected;
        bestBonus = bonus;
      }
    }

    const confidence = 1 / (1 + bestBonus);

    return {
      selectedArm: bestArm!,
      confidence,
      explorationBonus: bestBonus,
      expectedReward: bestExpected,
    };
  }

  private updateLinUCB(armId: string, context: Context, reward: number): void {
    const features = this.contextToFeatures(context);
    const covInv = this.linucbCovInverse.get(armId)!;
    const weights = this.linucbWeights.get(armId)!;

    // Sherman-Morrison update for inverse covariance
    const temp = this.matVecMult(covInv, features);
    const denom = 1 + this.dotProduct(features, temp);

    for (let i = 0; i < covInv.length; i++) {
      for (let j = 0; j < covInv[i].length; j++) {
        covInv[i][j] -= (temp[i] * temp[j]) / denom;
      }
    }

    // Update weights
    const newTemp = this.matVecMult(covInv, features);
    for (let i = 0; i < weights.length; i++) {
      weights[i] += reward * newTemp[i];
    }
  }

  // ============================================================================
  // PRIVATE: GP-UCB
  // ============================================================================

  private selectGPUCB(context: Context): {
    selectedArm: ParameterArm;
    confidence: number;
    explorationBonus: number;
    expectedReward: number;
  } {
    const features = this.contextToFeatures(context);
    let bestArm: ParameterArm | undefined;
    let bestScore = -Infinity;
    let bestMean = 0;
    let bestStd = 0;

    for (const [id, arm] of this.arms.entries()) {
      const { mean, std } = this.gpPredict(features, id);

      // GP-UCB acquisition function
      const beta = 2 * Math.log(this.totalPulls + 1);
      const score = mean + Math.sqrt(beta) * std;

      if (score > bestScore) {
        bestScore = score;
        bestArm = arm;
        bestMean = mean;
        bestStd = std;
      }
    }

    const confidence = 1 / (1 + bestStd);

    return {
      selectedArm: bestArm!,
      confidence,
      explorationBonus: bestStd,
      expectedReward: bestMean,
    };
  }

  private gpPredict(
    features: number[],
    armId: string
  ): { mean: number; std: number } {
    const relevantObs = this.gpObservations.filter((o) => o.arm_id === armId);

    if (relevantObs.length === 0) {
      return { mean: 0, std: this.config.gp_variance };
    }

    // Simple RBF kernel-based prediction
    let totalWeight = 0;
    let weightedSum = 0;
    let minDist = Infinity;

    for (const obs of relevantObs) {
      const dist = this.squaredDistance(features, obs.context);
      const weight = Math.exp(-dist / (2 * this.config.gp_length_scale ** 2));
      totalWeight += weight;
      weightedSum += weight * obs.reward;
      minDist = Math.min(minDist, dist);
    }

    const mean = totalWeight > 0 ? weightedSum / totalWeight : 0;

    // Uncertainty decreases with proximity to observations
    const proximityFactor = Math.exp(-minDist / (2 * this.config.gp_length_scale ** 2));
    const std = this.config.gp_variance * (1 - proximityFactor * 0.8);

    return { mean, std };
  }

  // ============================================================================
  // PRIVATE: HELPERS
  // ============================================================================

  private contextToFeatures(context: Context): number[] {
    return [
      context.material_hardness_hrc / 60,
      context.tool_wear_vb_mm / 0.3,
      context.spindle_load_percent / 100,
      context.vibration_level / 10,
      context.temperature_c / 500,
      (context.surface_roughness_um ?? 1.6) / 5,
    ];
  }

  private betaSample(alpha: number, beta: number): number {
    // Gamma-based beta sampling
    const x = this.gammaSample(alpha);
    const y = this.gammaSample(beta);
    return x / (x + y);
  }

  private gammaSample(shape: number): number {
    // Marsaglia and Tsang's method
    if (shape < 1) {
      return this.gammaSample(shape + 1) * Math.pow(Math.random(), 1 / shape);
    }

    const d = shape - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);

    while (true) {
      let x: number;
      let v: number;

      do {
        x = this.normalSample();
        v = 1 + c * x;
      } while (v <= 0);

      v = v * v * v;
      const u = Math.random();

      if (u < 1 - 0.0331 * x * x * x * x) {
        return d * v;
      }

      if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
        return d * v;
      }
    }
  }

  private normalSample(): number {
    // Box-Muller transform
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  private dotProduct(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += a[i] * b[i];
    }
    return sum;
  }

  private matVecMult(mat: number[][], vec: number[]): number[] {
    const result = new Array(vec.length).fill(0);
    for (let i = 0; i < mat.length; i++) {
      for (let j = 0; j < vec.length; j++) {
        result[i] += mat[i][j] * vec[j];
      }
    }
    return result;
  }

  private squaredDistance(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const diff = a[i] - b[i];
      sum += diff * diff;
    }
    return sum;
  }

  private identityMatrix(n: number): number[][] {
    const mat: number[][] = [];
    for (let i = 0; i < n; i++) {
      mat[i] = new Array(n).fill(0);
      mat[i][i] = 1;
    }
    return mat;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const banditParameterOptimizerEngine = new BanditParameterOptimizerEngine();
