/**
 * LatheBayesianOptimizationEngine - Bayesian Optimization for Lathe Parameter Search
 * ==================================================================================
 *
 * Implements full Bayesian optimization with uncertainty quantification for
 * optimal lathe cutting parameter selection. Uses Gaussian Process regression
 * with RBF/Matern kernels and multiple acquisition functions.
 *
 * Key Features:
 * - Gaussian Process Regression with RBF/Matern kernels
 * - Multiple acquisition functions: EI, UCB, PI, Knowledge Gradient
 * - Multi-objective optimization with EHVI (Expected Hypervolume Improvement)
 * - Batch optimization with q-EI, hallucination, and Thompson sampling
 * - Uncertainty quantification: epistemic vs aleatoric separation
 * - Manufacturing-specific: speed/feed, tool life, surface finish optimization
 *
 * References:
 * - Rasmussen & Williams (2006) "Gaussian Processes for Machine Learning"
 * - Snoek et al. (2012) "Practical Bayesian Optimization"
 * - Frazier (2018) "A Tutorial on Bayesian Optimization"
 * - Daulton et al. (2020) "qEHVI: q-Expected Hypervolume Improvement"
 *
 * @module LatheBayesianOptimizationEngine
 * @version 1.0.0
 * @milestone LATHE-BAYES-MS0
 */

import { CholeskyEngine } from "./CholeskyEngine.js";
import { SVDEngine } from "./SVDEngine.js";
import {
  CANONICAL_KIENZLE,
  CANONICAL_TAYLOR,
  CANONICAL_MATERIAL_DB,
  type ISOGroup,
  type MaterialPhysics,
} from "../physics/constants.js";

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

/** Kernel type selection */
export type KernelType = "RBF" | "Matern32" | "Matern52" | "RationalQuadratic" | "Composite";

/** Acquisition function type */
export type AcquisitionType = "EI" | "UCB" | "PI" | "KG" | "qEI" | "ThompsonSampling";

/** Optimization direction */
export type OptimizationDirection = "minimize" | "maximize";

/** Parameter bounds specification */
export interface ParameterBounds {
  name: string;
  min: number;
  max: number;
  type?: "continuous" | "integer" | "categorical";
  categories?: string[];
}

/** Lathe-specific parameter bounds */
export interface LatheParameterBounds {
  cutting_speed_m_min: { min: number; max: number };
  feed_mm_rev: { min: number; max: number };
  depth_of_cut_mm: { min: number; max: number };
  nose_radius_mm?: { min: number; max: number };
  rake_angle_deg?: { min: number; max: number };
}

/** Observation point in the optimization space */
export interface BayesianObservation {
  x: number[];
  y: number;
  noise_variance?: number;
  timestamp?: number;
  metadata?: Record<string, unknown>;
}

/** Multi-objective observation */
export interface MultiObjectiveObservation {
  x: number[];
  objectives: number[];
  constraints?: number[];
  feasible: boolean;
}

/** GP kernel configuration */
export interface KernelConfig {
  type: KernelType;
  length_scales: number[];       // Per-dimension length scales (ARD)
  signal_variance?: number;      // Output scale (default 1.0)
  noise_variance?: number;       // Observation noise (default 1e-6)
  matern_nu?: 1.5 | 2.5;         // For Matern kernel
  alpha?: number;                // RQ alpha parameter
}

/** GP hyperparameter optimization config */
export interface HyperparameterConfig {
  optimize: boolean;
  method?: "marginal_likelihood" | "cross_validation" | "evidence_approximation";
  max_iterations?: number;
  learning_rate?: number;
  bounds?: {
    length_scale: [number, number];
    signal_variance: [number, number];
    noise_variance: [number, number];
  };
}

/** Bayesian optimization configuration */
export interface BOConfig {
  dimensions: number;
  bounds: ParameterBounds[];
  kernel: KernelConfig;
  acquisition: AcquisitionType;
  ucb_kappa?: number;                 // UCB exploration parameter (default 2.0)
  ei_xi?: number;                     // EI improvement threshold (default 0.01)
  initial_points?: number;            // Latin hypercube samples (default 5*d)
  max_iterations?: number;            // BO iterations (default 50)
  batch_size?: number;                // For batch acquisition (default 1)
  hyperparameters?: HyperparameterConfig;
  direction?: OptimizationDirection;
  seed?: number;
}

/** Manufacturing-specific optimization config */
export interface LatheOptimizationConfig {
  material: string | ISOGroup;
  operation: "roughing" | "finishing" | "threading" | "grooving" | "boring";
  machine: {
    max_rpm: number;
    max_power_kw: number;
    turret_positions: number;
    has_live_tooling: boolean;
  };
  tool: {
    type: "carbide" | "cbn" | "ceramic" | "hss";
    nose_radius_mm: number;
    approach_angle_deg: number;
    insert_grade?: string;
  };
  workpiece: {
    diameter_mm: number;
    length_mm: number;
    hardness_HRC?: number;
  };
  constraints?: {
    max_surface_roughness_um?: number;
    min_tool_life_min?: number;
    max_cutting_force_N?: number;
    max_power_kw?: number;
  };
  objectives: Array<{
    name: string;
    weight: number;
    direction: OptimizationDirection;
  }>;
}

/** Gaussian Process prediction result */
export interface GPPrediction {
  mean: number;
  variance: number;
  std_dev: number;
  confidence_interval: [number, number];
  epistemic_uncertainty: number;
  aleatoric_uncertainty: number;
}

/** Batch prediction result */
export interface BatchPrediction {
  means: number[];
  variances: number[];
  covariance_matrix: number[][];
  joint_samples?: number[][];
}

/** Uncertainty quantification result */
export interface UncertaintyQuantification {
  total_uncertainty: number;
  epistemic_fraction: number;
  aleatoric_fraction: number;
  calibration_score: number;
  coverage_probability: number;
  out_of_distribution_score: number;
  confidence_level: number;
}

/** Pareto solution for multi-objective */
export interface ParetoSolution {
  x: number[];
  objectives: number[];
  hypervolume_contribution: number;
  dominated: boolean;
  rank: number;
}

/** Multi-objective result */
export interface MultiObjectiveResult {
  pareto_front: ParetoSolution[];
  hypervolume: number;
  utopia_point: number[];
  nadir_point: number[];
  best_compromise: ParetoSolution;
  dominated_count: number;
}

/** Single-objective optimization result */
export interface BOResult {
  best_x: number[];
  best_y: number;
  observations: BayesianObservation[];
  iterations: number;
  model_fit: {
    mean_squared_error: number;
    coverage_probability: number;
    log_marginal_likelihood: number;
  };
  convergence: {
    converged: boolean;
    improvement_rate: number;
    stagnation_count: number;
  };
  uncertainty: UncertaintyQuantification;
}

/** Manufacturing optimization result */
export interface LatheOptimizationResult extends BOResult {
  optimal_parameters: {
    cutting_speed_m_min: number;
    feed_mm_rev: number;
    depth_of_cut_mm: number;
    spindle_rpm: number;
    feed_rate_mm_min: number;
  };
  predicted_outcomes: {
    tool_life_min: number;
    surface_roughness_um: number;
    material_removal_rate_cm3_min: number;
    cutting_force_N: number;
    power_kw: number;
    cost_per_part: number;
  };
  tribal_knowledge_applied: string[];
  safety_warnings: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const EPS = 1e-10;
const SQRT_2PI = Math.sqrt(2 * Math.PI);
const LOG_2PI = Math.log(2 * Math.PI);

// JM Die shop defaults
const JM_DIE_DEFAULTS = {
  machine_rate_per_hour: 85.0,
  tool_cost_per_edge: 12.50,
  setup_time_min: 15.0,
  overhead_factor: 1.35,
};

// ============================================================================
// GAUSSIAN PROCESS IMPLEMENTATION
// ============================================================================

/**
 * Internal GP model structure
 */
interface GPModel {
  X: number[][];
  Y: number[];
  kernel_config: KernelConfig;
  L: number[][] | null;           // Cholesky factor
  K_inv: number[][] | null;       // Inverse kernel matrix (fallback)
  alpha: number[];                // K^{-1} * Y
  log_marginal_likelihood: number;
}

/**
 * LatheBayesianOptimizationEngine
 *
 * Full Bayesian optimization for lathe parameter tuning with:
 * - Multiple kernel options (RBF, Matern, Composite)
 * - Advanced acquisition functions
 * - Multi-objective Pareto optimization
 * - Batch optimization for parallel evaluation
 * - Uncertainty quantification and calibration
 */
export class LatheBayesianOptimizationEngine {
  private rng: () => number;

  constructor(seed?: number) {
    this.rng = seed !== undefined ? this.seededRng(seed) : Math.random;
  }

  // ==========================================================================
  // PUBLIC API: Main Optimization Methods
  // ==========================================================================

  /**
   * Main Bayesian optimization loop for minimization/maximization.
   *
   * @param objective - Black-box objective function to optimize
   * @param config - Optimization configuration
   * @returns Optimization result with best parameters and uncertainty
   */
  optimizeParameters(
    objective: (x: number[]) => number,
    config: BOConfig
  ): BOResult {
    const {
      dimensions,
      bounds,
      kernel,
      acquisition,
      ucb_kappa = 2.0,
      ei_xi = 0.01,
      initial_points = Math.max(5, dimensions * 2),
      max_iterations = 50,
      batch_size = 1,
      direction = "minimize",
      seed,
    } = config;

    if (seed !== undefined) {
      this.rng = this.seededRng(seed);
    }

    const observations: BayesianObservation[] = [];
    const boundsArray = bounds.map(b => ({ min: b.min, max: b.max }));

    // Phase 1: Initial Latin Hypercube Sampling
    const initialX = this.latinHypercube(dimensions, boundsArray, initial_points);
    for (const x of initialX) {
      const y = direction === "minimize" ? objective(x) : -objective(x);
      observations.push({ x, y, timestamp: Date.now() });
    }

    // Phase 2: Sequential Bayesian Optimization
    let stagnationCount = 0;
    let lastBestY = Math.min(...observations.map(o => o.y));
    const improvementHistory: number[] = [];

    for (let iter = 0; iter < max_iterations; iter++) {
      // Fit GP model
      const gp = this.fitGP(observations, kernel);

      // Select next point(s) via acquisition function
      let nextPoints: number[][];
      if (batch_size > 1) {
        nextPoints = this.batchAcquisition(
          gp, boundsArray, dimensions, acquisition, batch_size,
          { kappa: ucb_kappa, xi: ei_xi }, observations
        );
      } else {
        const nextX = this.optimizeAcquisition(
          gp, boundsArray, dimensions, acquisition,
          { kappa: ucb_kappa, xi: ei_xi }, observations
        );
        nextPoints = [nextX];
      }

      // Evaluate objective at selected points
      for (const x of nextPoints) {
        const y = direction === "minimize" ? objective(x) : -objective(x);
        observations.push({ x, y, timestamp: Date.now() });
      }

      // Track convergence
      const currentBestY = Math.min(...observations.map(o => o.y));
      const improvement = lastBestY - currentBestY;
      improvementHistory.push(improvement);

      if (improvement < EPS) {
        stagnationCount++;
      } else {
        stagnationCount = 0;
      }
      lastBestY = currentBestY;

      // Early stopping if no improvement for many iterations
      if (stagnationCount > Math.min(10, max_iterations / 5)) {
        break;
      }
    }

    // Find best observation
    let bestIdx = 0;
    for (let i = 1; i < observations.length; i++) {
      if (observations[i].y < observations[bestIdx].y) bestIdx = i;
    }

    // Final model fit for uncertainty quantification
    const finalGP = this.fitGP(observations, kernel);
    const uncertainty = this.quantifyUncertainty(
      observations.map(o => o.x),
      finalGP,
      boundsArray
    );

    // Transform back if maximizing
    const bestY = direction === "minimize"
      ? observations[bestIdx].y
      : -observations[bestIdx].y;

    const transformedObs = direction === "minimize"
      ? observations
      : observations.map(o => ({ ...o, y: -o.y }));

    return {
      best_x: observations[bestIdx].x,
      best_y: bestY,
      observations: transformedObs,
      iterations: observations.length - initial_points,
      model_fit: this.assessModelFit(observations, kernel),
      convergence: {
        converged: stagnationCount > 5,
        improvement_rate: improvementHistory.length > 0
          ? improvementHistory.reduce((a, b) => a + b, 0) / improvementHistory.length
          : 0,
        stagnation_count: stagnationCount,
      },
      uncertainty,
    };
  }

  /**
   * Fit Gaussian Process to observations.
   *
   * @param observations - Training data points
   * @param kernel_config - Kernel configuration
   * @returns Fitted GP model
   */
  fitGP(observations: BayesianObservation[], kernel_config: KernelConfig): GPModel {
    const n = observations.length;
    const X = observations.map(o => o.x);
    const Y = observations.map(o => o.y);

    const noise = kernel_config.noise_variance ?? 1e-6;

    // Compute kernel matrix K + sigma^2 * I
    const K = this.computeKernelMatrix(X, kernel_config);
    for (let i = 0; i < n; i++) {
      K[i][i] += noise;
    }

    // Cholesky decomposition for stable solving
    let L: number[][] | null = null;
    let K_inv: number[][] | null = null;
    let alpha: number[];
    let logML = -Infinity;

    try {
      // Check condition number before Cholesky
      const kappa = this.estimateConditionNumber(K);
      if (kappa > 1e12) {
        // Add jitter for numerical stability
        for (let i = 0; i < n; i++) K[i][i] += 1e-6;
      }

      const choleskyResult = CholeskyEngine.factorize(K);
      if (choleskyResult.isPositiveDefinite) {
        L = choleskyResult.L;
        alpha = CholeskyEngine.solve(L, Y);

        // Compute log marginal likelihood
        // log p(y|X) = -0.5 * y^T * K^{-1} * y - 0.5 * log|K| - n/2 * log(2*pi)
        let yKinvY = 0;
        for (let i = 0; i < n; i++) {
          yKinvY += Y[i] * alpha[i];
        }
        let logDetK = 0;
        for (let i = 0; i < n; i++) {
          logDetK += Math.log(L[i][i]);
        }
        logDetK *= 2;
        logML = -0.5 * yKinvY - 0.5 * logDetK - 0.5 * n * LOG_2PI;
      } else {
        throw new Error("Matrix not positive definite");
      }
    } catch {
      // Fallback to direct inverse
      K_inv = this.invertMatrix(K);
      alpha = K_inv.map(row => row.reduce((s, v, j) => s + v * Y[j], 0));
      logML = -0.5 * n * LOG_2PI; // Approximate
    }

    return { X, Y, kernel_config, L, K_inv, alpha, log_marginal_likelihood: logML };
  }

  /**
   * Predict at a query point using fitted GP.
   *
   * @param gp - Fitted GP model
   * @param x - Query point
   * @returns Prediction with mean, variance, and uncertainty decomposition
   */
  predictGP(gp: GPModel, x: number[]): GPPrediction {
    const kStar = gp.X.map(xi => this.computeKernel(x, xi, gp.kernel_config));
    const mean = kStar.reduce((s, k, i) => s + k * gp.alpha[i], 0);

    // Variance = k(x,x) - k*^T K^{-1} k*
    const kxx = this.computeKernel(x, x, gp.kernel_config);
    let variance: number;

    if (gp.L) {
      // Solve L*v = k* via forward substitution
      const v = this.forwardSubstitution(gp.L, kStar);
      const vTv = v.reduce((s, vi) => s + vi * vi, 0);
      variance = Math.max(0, kxx - vTv);
    } else if (gp.K_inv) {
      // Direct computation with inverse
      let kStarKinvKStar = 0;
      for (let i = 0; i < gp.X.length; i++) {
        for (let j = 0; j < gp.X.length; j++) {
          kStarKinvKStar += kStar[i] * gp.K_inv[i][j] * kStar[j];
        }
      }
      variance = Math.max(0, kxx - kStarKinvKStar);
    } else {
      variance = kxx;
    }

    const std_dev = Math.sqrt(variance);
    const noise = gp.kernel_config.noise_variance ?? 1e-6;

    // Decompose uncertainty: epistemic (model) vs aleatoric (noise)
    const epistemic = Math.max(0, variance - noise);
    const aleatoric = noise;

    return {
      mean,
      variance,
      std_dev,
      confidence_interval: [mean - 1.96 * std_dev, mean + 1.96 * std_dev],
      epistemic_uncertainty: Math.sqrt(epistemic),
      aleatoric_uncertainty: Math.sqrt(aleatoric),
    };
  }

  /**
   * Compute Expected Improvement acquisition function.
   *
   * @param gp - Fitted GP model
   * @param x - Query point
   * @param best_y - Current best observation
   * @param xi - Improvement threshold (jitter)
   * @returns EI value
   */
  acquisitionEI(gp: GPModel, x: number[], best_y: number, xi = 0.01): number {
    const pred = this.predictGP(gp, x);
    if (pred.std_dev < EPS) return 0;

    const improvement = best_y - pred.mean - xi;
    const z = improvement / pred.std_dev;

    return improvement * this.normalCDF(z) + pred.std_dev * this.normalPDF(z);
  }

  /**
   * Compute Upper Confidence Bound acquisition function.
   *
   * @param gp - Fitted GP model
   * @param x - Query point
   * @param kappa - Exploration-exploitation tradeoff
   * @returns UCB value (negated for minimization)
   */
  acquisitionUCB(gp: GPModel, x: number[], kappa = 2.0): number {
    const pred = this.predictGP(gp, x);
    // For minimization: lower bound = mean - kappa * sigma
    // Return negative because we maximize acquisition
    return -(pred.mean - kappa * pred.std_dev);
  }

  /**
   * Compute Probability of Improvement acquisition function.
   *
   * @param gp - Fitted GP model
   * @param x - Query point
   * @param best_y - Current best observation
   * @returns PI value
   */
  acquisitionPI(gp: GPModel, x: number[], best_y: number): number {
    const pred = this.predictGP(gp, x);
    if (pred.std_dev < EPS) return pred.mean < best_y ? 1 : 0;

    const z = (best_y - pred.mean) / pred.std_dev;
    return this.normalCDF(z);
  }

  /**
   * Compute Knowledge Gradient acquisition function.
   * Approximation using one-step lookahead.
   *
   * @param gp - Fitted GP model
   * @param x - Query point
   * @param observations - Current observations
   * @returns KG value
   */
  acquisitionKG(
    gp: GPModel,
    x: number[],
    observations: BayesianObservation[]
  ): number {
    const pred = this.predictGP(gp, x);
    const currentBest = Math.min(...observations.map(o => o.y));

    // One-step lookahead: expected improvement in best after observing x
    // KG(x) = E[min(f*, f(x)) | x] - f*
    // Approximated by sampling from posterior

    const nSamples = 20;
    let expectedBest = 0;

    for (let i = 0; i < nSamples; i++) {
      const sample = pred.mean + this.rng() * pred.std_dev;
      expectedBest += Math.min(currentBest, sample);
    }
    expectedBest /= nSamples;

    return currentBest - expectedBest;
  }

  /**
   * Multi-objective optimization with Pareto frontier tracking.
   *
   * @param objectives - Array of objective functions
   * @param config - Optimization configuration
   * @returns Multi-objective result with Pareto front
   */
  multiObjectiveOptimize(
    objectives: Array<(x: number[]) => number>,
    config: BOConfig & {
      objective_directions?: OptimizationDirection[];
      reference_point?: number[];
    }
  ): MultiObjectiveResult {
    const {
      dimensions,
      bounds,
      kernel,
      initial_points = Math.max(10, dimensions * 3),
      max_iterations = 50,
      objective_directions,
      reference_point,
    } = config;

    const numObjectives = objectives.length;
    const directions = objective_directions || objectives.map(() => "minimize" as const);
    const boundsArray = bounds.map(b => ({ min: b.min, max: b.max }));

    const observations: MultiObjectiveObservation[] = [];

    // Initial sampling
    const initialX = this.latinHypercube(dimensions, boundsArray, initial_points);
    for (const x of initialX) {
      const objValues = objectives.map((f, i) =>
        directions[i] === "minimize" ? f(x) : -f(x)
      );
      observations.push({ x, objectives: objValues, feasible: true });
    }

    // Fit separate GPs for each objective
    const gps: GPModel[] = [];
    for (let i = 0; i < numObjectives; i++) {
      const singleObs = observations.map(o => ({
        x: o.x,
        y: o.objectives[i],
      }));
      gps.push(this.fitGP(singleObs, kernel));
    }

    // Main optimization loop using EHVI
    for (let iter = 0; iter < max_iterations; iter++) {
      // Compute Pareto front
      const paretoFront = this.computeParetoFront(observations);

      // Compute reference point if not provided
      const refPoint = reference_point || this.computeNadirPoint(paretoFront).map(v => v * 1.1);

      // Optimize EHVI acquisition
      const nextX = this.optimizeEHVI(gps, boundsArray, dimensions, paretoFront, refPoint);

      // Evaluate objectives
      const objValues = objectives.map((f, i) =>
        directions[i] === "minimize" ? f(nextX) : -f(nextX)
      );
      observations.push({ x: nextX, objectives: objValues, feasible: true });

      // Update GPs
      for (let i = 0; i < numObjectives; i++) {
        const singleObs = observations.map(o => ({
          x: o.x,
          y: o.objectives[i],
        }));
        gps[i] = this.fitGP(singleObs, kernel);
      }
    }

    // Final Pareto front
    const finalParetoFront = this.computeParetoFront(observations);
    const refPoint = reference_point || this.computeNadirPoint(finalParetoFront).map(v => v * 1.1);
    const hypervolume = this.computeHypervolume(finalParetoFront, refPoint);

    // Transform back if maximizing
    const transformedFront = finalParetoFront.map(sol => ({
      ...sol,
      objectives: sol.objectives.map((v, i) =>
        directions[i] === "minimize" ? v : -v
      ),
    }));

    const utopia = this.computeUtopiaPoint(transformedFront);
    const nadir = this.computeNadirPoint(transformedFront);

    return {
      pareto_front: transformedFront,
      hypervolume,
      utopia_point: utopia,
      nadir_point: nadir,
      best_compromise: this.findBestCompromise(transformedFront, utopia, nadir),
      dominated_count: observations.length - finalParetoFront.length,
    };
  }

  /**
   * Quantify uncertainty at given points.
   *
   * @param X - Points to evaluate
   * @param gp - Fitted GP model
   * @param bounds - Parameter bounds for OOD detection
   * @returns Uncertainty quantification metrics
   */
  quantifyUncertainty(
    X: number[][],
    gp: GPModel,
    bounds: { min: number; max: number }[]
  ): UncertaintyQuantification {
    const predictions = X.map(x => this.predictGP(gp, x));

    // Total uncertainty (average std dev)
    const totalUncertainty = predictions.reduce((s, p) => s + p.std_dev, 0) / predictions.length;

    // Epistemic vs aleatoric fractions
    const avgEpistemic = predictions.reduce((s, p) => s + p.epistemic_uncertainty ** 2, 0) / predictions.length;
    const avgAleatoric = predictions.reduce((s, p) => s + p.aleatoric_uncertainty ** 2, 0) / predictions.length;
    const totalVar = avgEpistemic + avgAleatoric;

    // Calibration: check if true values fall within confidence intervals
    // (Can only be assessed with validation data - return placeholder)
    const calibrationScore = 0.95;

    // Coverage probability
    const coverageProbability = 0.95;

    // Out-of-distribution detection: distance from training data
    const oodScores = X.map(x => this.computeOODScore(x, gp.X, bounds));
    const avgOODScore = oodScores.reduce((s, v) => s + v, 0) / oodScores.length;

    return {
      total_uncertainty: totalUncertainty,
      epistemic_fraction: totalVar > 0 ? avgEpistemic / totalVar : 0.5,
      aleatoric_fraction: totalVar > 0 ? avgAleatoric / totalVar : 0.5,
      calibration_score: calibrationScore,
      coverage_probability: coverageProbability,
      out_of_distribution_score: avgOODScore,
      confidence_level: 0.95,
    };
  }

  // ==========================================================================
  // MANUFACTURING-SPECIFIC OPTIMIZATION
  // ==========================================================================

  /**
   * Optimize lathe cutting parameters using physics-informed Bayesian optimization.
   *
   * @param config - Lathe-specific optimization configuration
   * @returns Optimal parameters with predicted outcomes
   */
  optimizeLatheCutting(config: LatheOptimizationConfig): LatheOptimizationResult {
    const { material, operation, machine, tool, workpiece, constraints, objectives } = config;

    // Get material physics
    const matPhysics = this.getMaterialPhysics(material);
    const isoGroup = matPhysics.iso_group;

    // Define parameter bounds based on material and operation
    const bounds = this.getLatheBounds(matPhysics, operation, tool, machine, workpiece);

    // Build composite objective function
    const objectiveWeights = objectives.map(o => o.weight);
    const objectiveDirections = objectives.map(o => o.direction);

    const compositeObjective = (params: number[]): number => {
      const [vc, feed, doc] = params;
      const rpm = (1000 * vc) / (Math.PI * workpiece.diameter_mm);
      const feedRate = feed * rpm;

      // Compute physical outcomes
      const kienzle = CANONICAL_KIENZLE[isoGroup];
      const taylor = CANONICAL_TAYLOR[isoGroup];

      // Cutting force (Kienzle model)
      const hm = feed; // Undeformed chip thickness ~ feed for turning
      const Fc = kienzle.kc1_1 * doc * Math.pow(Math.max(0.01, hm), 1 - kienzle.mc);

      // Power
      const power = (Fc * vc) / 60000;

      // Tool life (Taylor model)
      const toolLife = taylor.C * Math.pow(taylor.C / vc, 1 / taylor.n);

      // Surface roughness (theoretical)
      const Ra = this.computeTheoreticalRa(feed, tool.nose_radius_mm);

      // MRR
      const mrr = (Math.PI * workpiece.diameter_mm * feed * doc * rpm) / 1e6; // cm^3/min

      // Cost per part
      const cycleTime = workpiece.length_mm / feedRate;
      const toolCostPerPart = (cycleTime / toolLife) * JM_DIE_DEFAULTS.tool_cost_per_edge;
      const machineCost = (cycleTime / 60) * JM_DIE_DEFAULTS.machine_rate_per_hour;
      const costPerPart = (toolCostPerPart + machineCost) * JM_DIE_DEFAULTS.overhead_factor;

      // Map objectives to computed values
      const objValues: Record<string, number> = {
        tool_life: toolLife,
        surface_finish: Ra,
        mrr: mrr,
        cycle_time: cycleTime,
        cost: costPerPart,
        force: Fc,
        power: power,
      };

      // Apply constraints as penalties
      let penalty = 0;
      if (constraints) {
        if (constraints.max_surface_roughness_um && Ra > constraints.max_surface_roughness_um) {
          penalty += 1000 * (Ra - constraints.max_surface_roughness_um);
        }
        if (constraints.min_tool_life_min && toolLife < constraints.min_tool_life_min) {
          penalty += 100 * (constraints.min_tool_life_min - toolLife);
        }
        if (constraints.max_cutting_force_N && Fc > constraints.max_cutting_force_N) {
          penalty += 10 * (Fc - constraints.max_cutting_force_N);
        }
        if (constraints.max_power_kw && power > constraints.max_power_kw) {
          penalty += 100 * (power - constraints.max_power_kw);
        }
      }

      // Weighted sum of normalized objectives
      let score = 0;
      for (let i = 0; i < objectives.length; i++) {
        const objName = objectives[i].name.toLowerCase().replace(/ /g, "_");
        const val = objValues[objName] || 0;
        const normalized = this.normalizeObjective(val, objName, operation);
        const direction = objectiveDirections[i] === "minimize" ? 1 : -1;
        score += objectiveWeights[i] * direction * normalized;
      }

      return score + penalty;
    };

    // Run Bayesian optimization
    const boConfig: BOConfig = {
      dimensions: 3,
      bounds: [
        { name: "cutting_speed", min: bounds.cutting_speed_m_min.min, max: bounds.cutting_speed_m_min.max },
        { name: "feed", min: bounds.feed_mm_rev.min, max: bounds.feed_mm_rev.max },
        { name: "depth_of_cut", min: bounds.depth_of_cut_mm.min, max: bounds.depth_of_cut_mm.max },
      ],
      kernel: {
        type: "Matern52",
        length_scales: [50, 0.05, 0.5],
        signal_variance: 1.0,
        noise_variance: 0.01,
      },
      acquisition: "EI",
      initial_points: 15,
      max_iterations: 40,
      direction: "minimize",
    };

    const result = this.optimizeParameters(compositeObjective, boConfig);

    // Extract optimal parameters
    const [optVc, optFeed, optDoc] = result.best_x;
    const optRpm = (1000 * optVc) / (Math.PI * workpiece.diameter_mm);
    const optFeedRate = optFeed * optRpm;

    // Compute final predicted outcomes
    const kienzle = CANONICAL_KIENZLE[isoGroup];
    const taylor = CANONICAL_TAYLOR[isoGroup];
    const hm = optFeed;
    const Fc = kienzle.kc1_1 * optDoc * Math.pow(Math.max(0.01, hm), 1 - kienzle.mc);
    const power = (Fc * optVc) / 60000;
    const toolLife = taylor.C * Math.pow(taylor.C / optVc, 1 / taylor.n);
    const Ra = this.computeTheoreticalRa(optFeed, tool.nose_radius_mm);
    const mrr = (Math.PI * workpiece.diameter_mm * optFeed * optDoc * optRpm) / 1e6;
    const cycleTime = workpiece.length_mm / optFeedRate;
    const toolCostPerPart = (cycleTime / toolLife) * JM_DIE_DEFAULTS.tool_cost_per_edge;
    const machineCost = (cycleTime / 60) * JM_DIE_DEFAULTS.machine_rate_per_hour;
    const costPerPart = (toolCostPerPart + machineCost) * JM_DIE_DEFAULTS.overhead_factor;

    // Generate tribal knowledge tips and warnings
    const tribalKnowledge = this.generateTribalKnowledge(
      matPhysics, operation, optVc, optFeed, optDoc, tool
    );
    const safetyWarnings = this.generateSafetyWarnings(
      optRpm, machine.max_rpm, power, machine.max_power_kw, optFeed, operation
    );

    return {
      ...result,
      optimal_parameters: {
        cutting_speed_m_min: Math.round(optVc * 10) / 10,
        feed_mm_rev: Math.round(optFeed * 1000) / 1000,
        depth_of_cut_mm: Math.round(optDoc * 100) / 100,
        spindle_rpm: Math.round(optRpm),
        feed_rate_mm_min: Math.round(optFeedRate),
      },
      predicted_outcomes: {
        tool_life_min: Math.round(toolLife * 10) / 10,
        surface_roughness_um: Math.round(Ra * 100) / 100,
        material_removal_rate_cm3_min: Math.round(mrr * 1000) / 1000,
        cutting_force_N: Math.round(Fc),
        power_kw: Math.round(power * 100) / 100,
        cost_per_part: Math.round(costPerPart * 100) / 100,
      },
      tribal_knowledge_applied: tribalKnowledge,
      safety_warnings: safetyWarnings,
    };
  }

  /**
   * Speed/feed optimization with tool life vs cycle time tradeoff.
   *
   * @param material - Material specification
   * @param workpiece_diameter_mm - Workpiece diameter
   * @param target_mrr - Target MRR (optional)
   * @returns Pareto front of speed/feed combinations
   */
  optimizeSpeedFeedTradeoff(
    material: string | ISOGroup,
    workpiece_diameter_mm: number,
    options?: {
      target_mrr?: number;
      min_tool_life_min?: number;
      max_ra_um?: number;
      tool_nose_radius_mm?: number;
    }
  ): MultiObjectiveResult {
    const matPhysics = this.getMaterialPhysics(material);
    const isoGroup = matPhysics.iso_group;
    const kienzle = CANONICAL_KIENZLE[isoGroup];
    const taylor = CANONICAL_TAYLOR[isoGroup];
    const noseRadius = options?.tool_nose_radius_mm || 0.8;

    // Define bounds
    const vcMin = matPhysics.vc_base_roughing * 0.5;
    const vcMax = matPhysics.vc_base_finishing * 1.5;
    const feedMin = 0.05;
    const feedMax = 0.4;

    // Objective 1: Minimize cycle time (maximize MRR)
    const cycleTimeObj = (x: number[]): number => {
      const [vc, feed] = x;
      const rpm = (1000 * vc) / (Math.PI * workpiece_diameter_mm);
      const feedRate = feed * rpm;
      return 1 / feedRate; // Lower is better (faster)
    };

    // Objective 2: Maximize tool life
    const toolLifeObj = (x: number[]): number => {
      const [vc, feed] = x;
      // Taylor with feed correction
      const feedFactor = Math.pow(feed / 0.1, 0.3);
      const toolLife = taylor.C * Math.pow(taylor.C / vc, 1 / taylor.n) / feedFactor;
      return -toolLife; // Negate for minimization
    };

    // Run multi-objective optimization
    const config: BOConfig & { reference_point?: number[] } = {
      dimensions: 2,
      bounds: [
        { name: "cutting_speed", min: vcMin, max: vcMax },
        { name: "feed", min: feedMin, max: feedMax },
      ],
      kernel: {
        type: "Matern52",
        length_scales: [30, 0.1],
        signal_variance: 1.0,
        noise_variance: 0.001,
      },
      acquisition: "EI",
      initial_points: 20,
      max_iterations: 30,
    };

    return this.multiObjectiveOptimize([cycleTimeObj, toolLifeObj], config);
  }

  /**
   * Surface finish targeting optimization.
   *
   * @param target_ra_um - Target surface roughness
   * @param material - Material specification
   * @param tool_nose_radius_mm - Tool nose radius
   * @returns Optimal parameters to achieve target Ra
   */
  targetSurfaceFinish(
    target_ra_um: number,
    material: string | ISOGroup,
    tool_nose_radius_mm: number,
    options?: {
      max_cycle_time_multiplier?: number;
      prefer_higher_speed?: boolean;
    }
  ): BOResult {
    const matPhysics = this.getMaterialPhysics(material);
    const multiplier = options?.max_cycle_time_multiplier || 2.0;
    const preferSpeed = options?.prefer_higher_speed || false;

    // Objective: minimize deviation from target Ra while maximizing productivity
    const objective = (x: number[]): number => {
      const [vc, feed] = x;
      const Ra = this.computeTheoreticalRa(feed, tool_nose_radius_mm);

      // Deviation penalty
      const deviation = Math.abs(Ra - target_ra_um);

      // Productivity bonus (negative penalty)
      const productivityBonus = preferSpeed ? -vc / 200 : 0;

      // Feed rate penalty (want higher feed if Ra allows)
      const feedPenalty = -feed * 0.5;

      return deviation * 10 + productivityBonus + feedPenalty;
    };

    const vcMin = matPhysics.vc_base_finishing * 0.7;
    const vcMax = matPhysics.vc_base_finishing * 1.5;

    // Feed bounds based on target Ra
    const feedMax = Math.sqrt(8 * target_ra_um * tool_nose_radius_mm) * 1.5;
    const feedMin = feedMax / 10;

    const config: BOConfig = {
      dimensions: 2,
      bounds: [
        { name: "cutting_speed", min: vcMin, max: vcMax },
        { name: "feed", min: feedMin, max: Math.min(0.3, feedMax) },
      ],
      kernel: {
        type: "RBF",
        length_scales: [20, 0.05],
        signal_variance: 1.0,
        noise_variance: 0.001,
      },
      acquisition: "EI",
      initial_points: 10,
      max_iterations: 25,
      direction: "minimize",
    };

    return this.optimizeParameters(objective, config);
  }

  // ==========================================================================
  // BATCH OPTIMIZATION
  // ==========================================================================

  /**
   * Batch acquisition for parallel evaluation using q-EI.
   *
   * @param gp - Fitted GP model
   * @param bounds - Parameter bounds
   * @param dimensions - Number of dimensions
   * @param acquisitionType - Type of acquisition function
   * @param batchSize - Number of points to select
   * @param params - Acquisition parameters
   * @param observations - Current observations
   * @returns Array of next points to evaluate
   */
  batchAcquisition(
    gp: GPModel,
    bounds: { min: number; max: number }[],
    dimensions: number,
    acquisitionType: AcquisitionType,
    batchSize: number,
    params: { kappa?: number; xi?: number },
    observations: BayesianObservation[]
  ): number[][] {
    const points: number[][] = [];
    const bestY = Math.min(...observations.map(o => o.y));

    if (acquisitionType === "ThompsonSampling") {
      return this.thompsonSamplingBatch(gp, bounds, dimensions, batchSize);
    }

    // Local penalization method for batch q-EI
    const fantasyObs = [...observations];

    for (let b = 0; b < batchSize; b++) {
      // Fit GP with fantasy observations
      const fantasyGP = this.fitGP(fantasyObs, gp.kernel_config);

      // Optimize acquisition
      const nextX = this.optimizeAcquisition(
        fantasyGP, bounds, dimensions, acquisitionType, params, fantasyObs
      );

      points.push(nextX);

      // Add fantasy observation (hallucination)
      const pred = this.predictGP(fantasyGP, nextX);
      fantasyObs.push({
        x: nextX,
        y: pred.mean, // Use predicted mean as fantasy value
      });
    }

    return points;
  }

  /**
   * Thompson sampling batch acquisition.
   *
   * @param gp - Fitted GP model
   * @param bounds - Parameter bounds
   * @param dimensions - Number of dimensions
   * @param batchSize - Number of points to select
   * @returns Array of next points
   */
  thompsonSamplingBatch(
    gp: GPModel,
    bounds: { min: number; max: number }[],
    dimensions: number,
    batchSize: number
  ): number[][] {
    const points: number[][] = [];
    const candidatesPerSample = 200;

    for (let b = 0; b < batchSize; b++) {
      // Generate candidates
      const candidates = Array.from({ length: candidatesPerSample }, () =>
        bounds.map(bound => bound.min + this.rng() * (bound.max - bound.min))
      );

      // Sample from posterior at each candidate
      const samples = candidates.map(x => {
        const pred = this.predictGP(gp, x);
        return {
          x,
          sample: pred.mean + this.standardNormal() * pred.std_dev,
        };
      });

      // Select best sample
      let bestIdx = 0;
      for (let i = 1; i < samples.length; i++) {
        if (samples[i].sample < samples[bestIdx].sample) bestIdx = i;
      }

      points.push(samples[bestIdx].x);
    }

    return points;
  }

  // ==========================================================================
  // KERNEL IMPLEMENTATIONS
  // ==========================================================================

  /**
   * Compute kernel value between two points.
   */
  private computeKernel(x1: number[], x2: number[], config: KernelConfig): number {
    switch (config.type) {
      case "RBF":
        return this.rbfKernel(x1, x2, config.length_scales, config.signal_variance);
      case "Matern32":
        return this.matern32Kernel(x1, x2, config.length_scales, config.signal_variance);
      case "Matern52":
        return this.matern52Kernel(x1, x2, config.length_scales, config.signal_variance);
      case "RationalQuadratic":
        return this.rationalQuadraticKernel(x1, x2, config.length_scales, config.signal_variance, config.alpha);
      case "Composite":
        return this.compositeKernel(x1, x2, config);
      default:
        return this.rbfKernel(x1, x2, config.length_scales, config.signal_variance);
    }
  }

  /**
   * RBF (Squared Exponential) kernel: k(x,x') = sigma^2 * exp(-0.5 * sum((x-x')^2 / l^2))
   * Reference: Rasmussen & Williams (2006), Eq. 4.9
   */
  private rbfKernel(
    x1: number[],
    x2: number[],
    lengthScales: number[],
    signalVariance = 1.0
  ): number {
    let r2 = 0;
    for (let i = 0; i < x1.length; i++) {
      const ls = lengthScales[i] || lengthScales[0];
      r2 += ((x1[i] - x2[i]) / ls) ** 2;
    }
    return signalVariance * Math.exp(-0.5 * r2);
  }

  /**
   * Matern 3/2 kernel: k(x,x') = sigma^2 * (1 + sqrt(3)*r) * exp(-sqrt(3)*r)
   * Reference: Rasmussen & Williams (2006), Eq. 4.17
   */
  private matern32Kernel(
    x1: number[],
    x2: number[],
    lengthScales: number[],
    signalVariance = 1.0
  ): number {
    let r = 0;
    for (let i = 0; i < x1.length; i++) {
      const ls = lengthScales[i] || lengthScales[0];
      r += ((x1[i] - x2[i]) / ls) ** 2;
    }
    r = Math.sqrt(r);
    const sqrt3r = Math.sqrt(3) * r;
    return signalVariance * (1 + sqrt3r) * Math.exp(-sqrt3r);
  }

  /**
   * Matern 5/2 kernel: k(x,x') = sigma^2 * (1 + sqrt(5)*r + 5/3*r^2) * exp(-sqrt(5)*r)
   * Reference: Rasmussen & Williams (2006), Eq. 4.17
   */
  private matern52Kernel(
    x1: number[],
    x2: number[],
    lengthScales: number[],
    signalVariance = 1.0
  ): number {
    let r2 = 0;
    for (let i = 0; i < x1.length; i++) {
      const ls = lengthScales[i] || lengthScales[0];
      r2 += ((x1[i] - x2[i]) / ls) ** 2;
    }
    const r = Math.sqrt(r2);
    const sqrt5r = Math.sqrt(5) * r;
    return signalVariance * (1 + sqrt5r + (5 / 3) * r2) * Math.exp(-sqrt5r);
  }

  /**
   * Rational Quadratic kernel: k(x,x') = sigma^2 * (1 + r^2/(2*alpha*l^2))^(-alpha)
   * Reference: Rasmussen & Williams (2006), Eq. 4.19
   */
  private rationalQuadraticKernel(
    x1: number[],
    x2: number[],
    lengthScales: number[],
    signalVariance = 1.0,
    alpha = 1.0
  ): number {
    let r2 = 0;
    for (let i = 0; i < x1.length; i++) {
      const ls = lengthScales[i] || lengthScales[0];
      r2 += ((x1[i] - x2[i]) / ls) ** 2;
    }
    return signalVariance * Math.pow(1 + r2 / (2 * alpha), -alpha);
  }

  /**
   * Composite kernel: sum of RBF and Matern
   */
  private compositeKernel(x1: number[], x2: number[], config: KernelConfig): number {
    const rbf = this.rbfKernel(x1, x2, config.length_scales, config.signal_variance);
    const matern = this.matern52Kernel(x1, x2, config.length_scales.map(l => l * 0.5), config.signal_variance);
    return 0.6 * rbf + 0.4 * matern;
  }

  /**
   * Compute full kernel matrix for training points.
   */
  private computeKernelMatrix(X: number[][], config: KernelConfig): number[][] {
    const n = X.length;
    const K: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = i; j < n; j++) {
        const kij = this.computeKernel(X[i], X[j], config);
        K[i][j] = kij;
        K[j][i] = kij;
      }
    }

    return K;
  }

  // ==========================================================================
  // ACQUISITION FUNCTION OPTIMIZATION
  // ==========================================================================

  /**
   * Optimize acquisition function to find next evaluation point.
   */
  private optimizeAcquisition(
    gp: GPModel,
    bounds: { min: number; max: number }[],
    dimensions: number,
    acquisitionType: AcquisitionType,
    params: { kappa?: number; xi?: number },
    observations: BayesianObservation[]
  ): number[] {
    const bestY = Math.min(...observations.map(o => o.y));
    const numCandidates = 500;
    const numLocalOpt = 10;

    // Random search for candidates
    const candidates: Array<{ x: number[]; acq: number }> = [];

    for (let c = 0; c < numCandidates; c++) {
      const x = bounds.map(b => b.min + this.rng() * (b.max - b.min));
      let acqValue: number;

      switch (acquisitionType) {
        case "EI":
          acqValue = this.acquisitionEI(gp, x, bestY, params.xi);
          break;
        case "UCB":
          acqValue = this.acquisitionUCB(gp, x, params.kappa);
          break;
        case "PI":
          acqValue = this.acquisitionPI(gp, x, bestY);
          break;
        case "KG":
          acqValue = this.acquisitionKG(gp, x, observations);
          break;
        default:
          acqValue = this.acquisitionEI(gp, x, bestY, params.xi);
      }

      candidates.push({ x, acq: acqValue });
    }

    // Sort by acquisition value (descending)
    candidates.sort((a, b) => b.acq - a.acq);

    // Local optimization on top candidates
    let bestX = candidates[0].x;
    let bestAcq = candidates[0].acq;

    for (let i = 0; i < numLocalOpt && i < candidates.length; i++) {
      const localOptResult = this.localOptimize(
        candidates[i].x,
        (x) => {
          switch (acquisitionType) {
            case "EI": return this.acquisitionEI(gp, x, bestY, params.xi);
            case "UCB": return this.acquisitionUCB(gp, x, params.kappa);
            case "PI": return this.acquisitionPI(gp, x, bestY);
            case "KG": return this.acquisitionKG(gp, x, observations);
            default: return this.acquisitionEI(gp, x, bestY, params.xi);
          }
        },
        bounds
      );

      if (localOptResult.value > bestAcq) {
        bestX = localOptResult.x;
        bestAcq = localOptResult.value;
      }
    }

    return bestX;
  }

  /**
   * Local optimization using gradient-free method (Nelder-Mead simplex).
   */
  private localOptimize(
    x0: number[],
    f: (x: number[]) => number,
    bounds: { min: number; max: number }[],
    maxIter = 50
  ): { x: number[]; value: number } {
    const n = x0.length;
    const alpha = 1.0;
    const gamma = 2.0;
    const rho = 0.5;
    const sigma = 0.5;

    // Initialize simplex
    const simplex: Array<{ x: number[]; f: number }> = [];
    simplex.push({ x: [...x0], f: f(x0) });

    for (let i = 0; i < n; i++) {
      const xi = [...x0];
      xi[i] += (bounds[i].max - bounds[i].min) * 0.05;
      xi[i] = Math.min(bounds[i].max, Math.max(bounds[i].min, xi[i]));
      simplex.push({ x: xi, f: f(xi) });
    }

    for (let iter = 0; iter < maxIter; iter++) {
      // Sort by function value (descending since we maximize)
      simplex.sort((a, b) => b.f - a.f);

      // Centroid (excluding worst)
      const centroid = new Array(n).fill(0);
      for (let i = 0; i < n; i++) {
        for (let d = 0; d < n; d++) {
          centroid[d] += simplex[i].x[d];
        }
      }
      for (let d = 0; d < n; d++) centroid[d] /= n;

      // Reflection
      const xr = centroid.map((c, d) => {
        const reflected = c + alpha * (c - simplex[n].x[d]);
        return Math.min(bounds[d].max, Math.max(bounds[d].min, reflected));
      });
      const fr = f(xr);

      if (fr > simplex[0].f) {
        // Expansion
        const xe = centroid.map((c, d) => {
          const expanded = c + gamma * (xr[d] - c);
          return Math.min(bounds[d].max, Math.max(bounds[d].min, expanded));
        });
        const fe = f(xe);
        simplex[n] = fe > fr ? { x: xe, f: fe } : { x: xr, f: fr };
      } else if (fr > simplex[n - 1].f) {
        simplex[n] = { x: xr, f: fr };
      } else {
        // Contraction
        const xc = centroid.map((c, d) => {
          const contracted = c + rho * (simplex[n].x[d] - c);
          return Math.min(bounds[d].max, Math.max(bounds[d].min, contracted));
        });
        const fc = f(xc);

        if (fc > simplex[n].f) {
          simplex[n] = { x: xc, f: fc };
        } else {
          // Shrink
          for (let i = 1; i <= n; i++) {
            simplex[i].x = simplex[0].x.map((x0d, d) => {
              const shrunk = x0d + sigma * (simplex[i].x[d] - x0d);
              return Math.min(bounds[d].max, Math.max(bounds[d].min, shrunk));
            });
            simplex[i].f = f(simplex[i].x);
          }
        }
      }
    }

    simplex.sort((a, b) => b.f - a.f);
    return { x: simplex[0].x, value: simplex[0].f };
  }

  // ==========================================================================
  // MULTI-OBJECTIVE HELPERS
  // ==========================================================================

  /**
   * Compute Pareto front from observations.
   */
  private computeParetoFront(observations: MultiObjectiveObservation[]): ParetoSolution[] {
    const feasible = observations.filter(o => o.feasible);
    const solutions: ParetoSolution[] = feasible.map((o, i) => ({
      x: o.x,
      objectives: o.objectives,
      hypervolume_contribution: 0,
      dominated: false,
      rank: 0,
    }));

    // Pareto dominance check
    for (let i = 0; i < solutions.length; i++) {
      for (let j = 0; j < solutions.length; j++) {
        if (i === j) continue;
        if (this.dominates(solutions[j].objectives, solutions[i].objectives)) {
          solutions[i].dominated = true;
          break;
        }
      }
    }

    return solutions.filter(s => !s.dominated);
  }

  /**
   * Check if a dominates b (all objectives minimized).
   */
  private dominates(a: number[], b: number[]): boolean {
    let dominated = true;
    let strictlyBetter = false;

    for (let i = 0; i < a.length; i++) {
      if (a[i] > b[i]) {
        dominated = false;
        break;
      }
      if (a[i] < b[i]) {
        strictlyBetter = true;
      }
    }

    return dominated && strictlyBetter;
  }

  /**
   * Compute hypervolume indicator.
   */
  private computeHypervolume(front: ParetoSolution[], referencePoint: number[]): number {
    if (front.length === 0) return 0;
    if (front[0].objectives.length === 2) {
      return this.hypervolume2D(front, referencePoint);
    }
    return this.hypervolumeND(front, referencePoint);
  }

  /**
   * 2D hypervolume computation.
   */
  private hypervolume2D(front: ParetoSolution[], ref: number[]): number {
    const sorted = [...front].sort((a, b) => a.objectives[0] - b.objectives[0]);
    let hv = 0;
    let prevY = ref[1];

    for (const sol of sorted) {
      const width = ref[0] - sol.objectives[0];
      const height = prevY - sol.objectives[1];
      if (width > 0 && height > 0) {
        hv += width * height;
      }
      prevY = sol.objectives[1];
    }

    return hv;
  }

  /**
   * N-dimensional hypervolume (approximation via Monte Carlo).
   */
  private hypervolumeND(front: ParetoSolution[], ref: number[]): number {
    const nSamples = 10000;
    const nObj = ref.length;
    let inside = 0;

    // Find bounding box
    const minBounds = front[0].objectives.map((_, i) =>
      Math.min(...front.map(s => s.objectives[i]))
    );

    for (let s = 0; s < nSamples; s++) {
      const point = minBounds.map((min, i) => min + this.rng() * (ref[i] - min));

      // Check if dominated by any Pareto point
      let dominatedBySome = false;
      for (const sol of front) {
        let dominates = true;
        for (let i = 0; i < nObj; i++) {
          if (sol.objectives[i] > point[i]) {
            dominates = false;
            break;
          }
        }
        if (dominates) {
          dominatedBySome = true;
          break;
        }
      }

      if (dominatedBySome) inside++;
    }

    // Volume of bounding box
    let boxVolume = 1;
    for (let i = 0; i < nObj; i++) {
      boxVolume *= ref[i] - minBounds[i];
    }

    return boxVolume * (inside / nSamples);
  }

  /**
   * Optimize Expected Hypervolume Improvement.
   */
  private optimizeEHVI(
    gps: GPModel[],
    bounds: { min: number; max: number }[],
    dimensions: number,
    paretoFront: ParetoSolution[],
    referencePoint: number[]
  ): number[] {
    const numCandidates = 300;
    let bestX = bounds.map(b => (b.min + b.max) / 2);
    let bestEHVI = -Infinity;

    const currentHV = this.computeHypervolume(paretoFront, referencePoint);

    for (let c = 0; c < numCandidates; c++) {
      const x = bounds.map(b => b.min + this.rng() * (b.max - b.min));

      // Predict objectives at candidate
      const predictions = gps.map(gp => this.predictGP(gp, x));

      // Monte Carlo estimate of EHVI
      const nSamples = 50;
      let ehvi = 0;

      for (let s = 0; s < nSamples; s++) {
        const sampledObj = predictions.map(p =>
          p.mean + this.standardNormal() * p.std_dev
        );

        // Add to Pareto front and compute new HV
        const augmentedFront = [...paretoFront, {
          x,
          objectives: sampledObj,
          hypervolume_contribution: 0,
          dominated: false,
          rank: 0,
        }];

        const newFront = this.computeParetoFront(
          augmentedFront.map(s => ({ x: s.x, objectives: s.objectives, feasible: true }))
        );
        const newHV = this.computeHypervolume(newFront, referencePoint);
        ehvi += Math.max(0, newHV - currentHV);
      }

      ehvi /= nSamples;

      if (ehvi > bestEHVI) {
        bestEHVI = ehvi;
        bestX = x;
      }
    }

    return bestX;
  }

  /**
   * Compute utopia point (ideal point).
   */
  private computeUtopiaPoint(front: ParetoSolution[]): number[] {
    if (front.length === 0) return [];
    return front[0].objectives.map((_, i) =>
      Math.min(...front.map(s => s.objectives[i]))
    );
  }

  /**
   * Compute nadir point.
   */
  private computeNadirPoint(front: ParetoSolution[]): number[] {
    if (front.length === 0) return [];
    return front[0].objectives.map((_, i) =>
      Math.max(...front.map(s => s.objectives[i]))
    );
  }

  /**
   * Find best compromise solution (closest to utopia).
   */
  private findBestCompromise(
    front: ParetoSolution[],
    utopia: number[],
    nadir: number[]
  ): ParetoSolution {
    if (front.length === 0) {
      return {
        x: [],
        objectives: [],
        hypervolume_contribution: 0,
        dominated: false,
        rank: 0,
      };
    }

    let bestIdx = 0;
    let bestDist = Infinity;

    for (let i = 0; i < front.length; i++) {
      let dist = 0;
      for (let j = 0; j < utopia.length; j++) {
        const range = nadir[j] - utopia[j] || 1;
        const normalized = (front[i].objectives[j] - utopia[j]) / range;
        dist += normalized ** 2;
      }
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }

    return front[bestIdx];
  }

  // ==========================================================================
  // MANUFACTURING HELPERS
  // ==========================================================================

  /**
   * Get material physics from identifier.
   */
  private getMaterialPhysics(material: string | ISOGroup): MaterialPhysics {
    if (typeof material === "string" && material.length === 1) {
      // ISO group
      const defaultMaterials: Record<ISOGroup, string> = {
        P: "steel",
        M: "stainless_304",
        K: "cast_iron",
        N: "aluminum",
        S: "titanium",
        H: "tool_steel",
      };
      return CANONICAL_MATERIAL_DB[defaultMaterials[material as ISOGroup]] || CANONICAL_MATERIAL_DB.steel;
    }

    const lowerMaterial = material.toLowerCase().replace(/ /g, "_");
    return CANONICAL_MATERIAL_DB[lowerMaterial] || CANONICAL_MATERIAL_DB.steel;
  }

  /**
   * Get lathe parameter bounds based on material and operation.
   */
  private getLatheBounds(
    material: MaterialPhysics,
    operation: string,
    tool: { type: string; nose_radius_mm: number },
    machine: { max_rpm: number; max_power_kw: number },
    workpiece: { diameter_mm: number }
  ): LatheParameterBounds {
    const isRoughing = operation === "roughing";
    const isFinishing = operation === "finishing";

    // Speed bounds
    let vcMin = material.vc_base_roughing * 0.6;
    let vcMax = material.vc_base_finishing * 1.3;
    if (isRoughing) {
      vcMin = material.vc_base_roughing * 0.7;
      vcMax = material.vc_base_roughing * 1.2;
    } else if (isFinishing) {
      vcMin = material.vc_base_finishing * 0.8;
      vcMax = material.vc_base_finishing * 1.4;
    }

    // Feed bounds
    let feedMin = 0.05;
    let feedMax = 0.35;
    if (isRoughing) {
      feedMin = 0.15;
      feedMax = 0.5;
    } else if (isFinishing) {
      feedMin = 0.03;
      feedMax = 0.15;
    }

    // DOC bounds
    let docMin = 0.5;
    let docMax = 4.0;
    if (isRoughing) {
      docMin = 1.0;
      docMax = 6.0;
    } else if (isFinishing) {
      docMin = 0.1;
      docMax = 0.5;
    }

    // Adjust for tool type
    if (tool.type === "cbn" || tool.type === "ceramic") {
      feedMax *= 0.7; // Reduce feed for brittle tools
    }

    return {
      cutting_speed_m_min: { min: vcMin, max: vcMax },
      feed_mm_rev: { min: feedMin, max: feedMax },
      depth_of_cut_mm: { min: docMin, max: docMax },
    };
  }

  /**
   * Compute theoretical surface roughness.
   * Ra = f^2 / (32 * r) where f = feed, r = nose radius
   * Reference: Groover "Fundamentals of Manufacturing" Eq. 24.4
   */
  private computeTheoreticalRa(feed_mm_rev: number, nose_radius_mm: number): number {
    if (nose_radius_mm <= 0) return 999;
    // Ra in micrometers
    return (feed_mm_rev ** 2 / (32 * nose_radius_mm)) * 1000;
  }

  /**
   * Normalize objective value for weighted sum.
   */
  private normalizeObjective(value: number, objName: string, operation: string): number {
    const ranges: Record<string, { min: number; max: number }> = {
      tool_life: { min: 5, max: 120 },
      surface_finish: { min: 0.4, max: 12.5 },
      mrr: { min: 0.5, max: 50 },
      cycle_time: { min: 0.1, max: 60 },
      cost: { min: 0.5, max: 50 },
      force: { min: 100, max: 5000 },
      power: { min: 0.1, max: 30 },
    };

    const range = ranges[objName] || { min: 0, max: 1 };
    return (value - range.min) / (range.max - range.min);
  }

  /**
   * Generate tribal knowledge tips based on parameters.
   */
  private generateTribalKnowledge(
    material: MaterialPhysics,
    operation: string,
    vc: number,
    feed: number,
    doc: number,
    tool: { type: string; nose_radius_mm: number }
  ): string[] {
    const tips: string[] = [];

    // Material-specific tips
    if (material.iso_group === "H") {
      tips.push("Hard material (>45 HRC): Use CBN or ceramic inserts for extended tool life");
      if (tool.type === "carbide") {
        tips.push("WARNING: Carbide may chip on hardened material; consider CBN");
      }
    }

    if (material.iso_group === "M") {
      tips.push("Stainless steel: Use positive rake geometry to reduce work hardening");
      if (vc > 150) {
        tips.push("High speed on stainless may cause built-up edge; monitor tool condition");
      }
    }

    if (material.iso_group === "S") {
      tips.push("Superalloy: Keep cutting speed low (40-80 m/min) and use heavy coolant");
      if (vc > 80) {
        tips.push("Cutting speed too high for titanium/superalloy; expect rapid wear");
      }
    }

    // Operation-specific tips
    if (operation === "roughing") {
      if (doc < 1.5) {
        tips.push("Depth of cut may be too shallow for efficient roughing; consider increasing");
      }
      if (feed < 0.15) {
        tips.push("Feed rate low for roughing; can likely increase for faster MRR");
      }
    }

    if (operation === "finishing") {
      if (feed > 0.12) {
        tips.push("Feed rate high for finishing; may exceed target Ra");
      }
      const theoreticalRa = this.computeTheoreticalRa(feed, tool.nose_radius_mm);
      if (theoreticalRa > 3.2) {
        tips.push(`Theoretical Ra = ${theoreticalRa.toFixed(2)} um; reduce feed for better finish`);
      }
    }

    // General tips
    if (doc > 3 && feed > 0.3) {
      tips.push("High DOC with high feed: Monitor power consumption and vibration");
    }

    return tips;
  }

  /**
   * Generate safety warnings based on parameters.
   */
  private generateSafetyWarnings(
    rpm: number,
    maxRpm: number,
    power: number,
    maxPower: number,
    feed: number,
    operation: string
  ): string[] {
    const warnings: string[] = [];

    if (rpm > maxRpm * 0.95) {
      warnings.push(`CRITICAL: RPM (${Math.round(rpm)}) near machine limit (${maxRpm}); add G50 S${Math.floor(maxRpm * 0.9)}`);
    }

    if (power > maxPower * 0.9) {
      warnings.push(`WARNING: Power consumption (${power.toFixed(1)} kW) approaching machine limit (${maxPower} kW)`);
    }

    if (operation === "cutoff" && feed > 0.08) {
      warnings.push("Cutoff feed > 0.08 mm/rev may cause blade deflection; reduce to 0.05-0.07");
    }

    if (rpm < 100) {
      warnings.push("Very low RPM may cause poor surface finish and chatter; verify CSS mode");
    }

    return warnings;
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Latin Hypercube Sampling for initial design.
   */
  private latinHypercube(
    dims: number,
    bounds: { min: number; max: number }[],
    n: number
  ): number[][] {
    const result: number[][] = [];

    for (let d = 0; d < dims; d++) {
      const perm = this.shuffle(Array.from({ length: n }, (_, i) => i));
      for (let i = 0; i < n; i++) {
        if (!result[i]) result[i] = [];
        const low = perm[i] / n;
        const high = (perm[i] + 1) / n;
        const u = low + this.rng() * (high - low);
        result[i][d] = bounds[d].min + u * (bounds[d].max - bounds[d].min);
      }
    }

    return result;
  }

  /**
   * Fisher-Yates shuffle.
   */
  private shuffle(arr: number[]): number[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /**
   * Standard normal PDF.
   */
  private normalPDF(z: number): number {
    return Math.exp(-0.5 * z * z) / SQRT_2PI;
  }

  /**
   * Standard normal CDF (Horner approximation).
   */
  private normalCDF(z: number): number {
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
    const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;

    const sign = z < 0 ? -1 : 1;
    const x = Math.abs(z) / Math.sqrt(2);
    const t = 1 / (1 + p * x);
    const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return 0.5 * (1 + sign * y);
  }

  /**
   * Generate standard normal sample (Box-Muller).
   */
  private standardNormal(): number {
    const u1 = this.rng();
    const u2 = this.rng();
    return Math.sqrt(-2 * Math.log(u1 + EPS)) * Math.cos(2 * Math.PI * u2);
  }

  /**
   * Seeded random number generator (LCG).
   */
  private seededRng(seed: number): () => number {
    let s = seed;
    return () => {
      s = (s * 1664525 + 1013904223) & 0x7fffffff;
      return s / 0x7fffffff;
    };
  }

  /**
   * Forward substitution for solving L*x = b.
   */
  private forwardSubstitution(L: number[][], b: number[]): number[] {
    const n = L.length;
    const x = new Array(n).fill(0);

    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let j = 0; j < i; j++) {
        sum += L[i][j] * x[j];
      }
      x[i] = (b[i] - sum) / L[i][i];
    }

    return x;
  }

  /**
   * Matrix inversion (Gauss-Jordan).
   */
  private invertMatrix(M: number[][]): number[][] {
    const n = M.length;
    const aug: number[][] = M.map((row, i) => [
      ...row,
      ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
    ]);

    for (let col = 0; col < n; col++) {
      // Partial pivoting
      let maxRow = col;
      for (let row = col + 1; row < n; row++) {
        if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) {
          maxRow = row;
        }
      }
      [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];

      const pivot = aug[col][col];
      if (Math.abs(pivot) < EPS) continue;

      for (let j = 0; j < 2 * n; j++) {
        aug[col][j] /= pivot;
      }

      for (let row = 0; row < n; row++) {
        if (row === col) continue;
        const factor = aug[row][col];
        for (let j = 0; j < 2 * n; j++) {
          aug[row][j] -= factor * aug[col][j];
        }
      }
    }

    return aug.map(row => row.slice(n));
  }

  /**
   * Estimate condition number (ratio of max to min diagonal).
   */
  private estimateConditionNumber(M: number[][]): number {
    const diag = M.map((row, i) => Math.abs(row[i]));
    const maxD = Math.max(...diag);
    const minD = Math.min(...diag.filter(d => d > EPS));
    return minD > 0 ? maxD / minD : Infinity;
  }

  /**
   * Compute out-of-distribution score.
   */
  private computeOODScore(
    x: number[],
    trainingX: number[][],
    bounds: { min: number; max: number }[]
  ): number {
    // Minimum distance to training points (normalized)
    let minDist = Infinity;

    for (const xi of trainingX) {
      let dist = 0;
      for (let d = 0; d < x.length; d++) {
        const range = bounds[d].max - bounds[d].min || 1;
        dist += ((x[d] - xi[d]) / range) ** 2;
      }
      dist = Math.sqrt(dist);
      if (dist < minDist) minDist = dist;
    }

    // OOD score: high distance = likely OOD
    return Math.min(1, minDist / Math.sqrt(x.length));
  }

  /**
   * Assess GP model fit quality.
   */
  private assessModelFit(
    observations: BayesianObservation[],
    kernel: KernelConfig
  ): { mean_squared_error: number; coverage_probability: number; log_marginal_likelihood: number } {
    if (observations.length < 5) {
      return { mean_squared_error: 0, coverage_probability: 0, log_marginal_likelihood: -Infinity };
    }

    // Leave-one-out cross-validation
    let totalErr = 0;
    let withinCI = 0;
    const n = Math.min(observations.length, 30);

    for (let i = 0; i < n; i++) {
      const train = observations.filter((_, j) => j !== i);
      const gp = this.fitGP(train, kernel);
      const pred = this.predictGP(gp, observations[i].x);

      totalErr += (pred.mean - observations[i].y) ** 2;
      if (Math.abs(pred.mean - observations[i].y) < 2 * pred.std_dev) {
        withinCI++;
      }
    }

    const fullGP = this.fitGP(observations, kernel);

    return {
      mean_squared_error: totalErr / n,
      coverage_probability: withinCI / n,
      log_marginal_likelihood: fullGP.log_marginal_likelihood,
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const latheBayesianOptimizationEngine = new LatheBayesianOptimizationEngine();
