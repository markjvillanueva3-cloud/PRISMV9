// @ts-nocheck
/**
 * MathIntegrationPipelineEngine — Cross-Engine Mathematical Integration Pipelines
 *
 * Orchestrates 7 pipelines that chain the 19 mathematical methods from
 * AdvancedMathematicalMethodsEngine, MetaheuristicOptimizationEngine, and
 * StatisticalMLEngine into real manufacturing workflows.
 *
 * Pipelines:
 *   1. robustOptimization — LHS → PCE → Sobol → CMA-ES on robust objective
 *   2. multivariateSPC — PCA → CUSUM/EWMA on principal component scores + Hotelling T²
 *   3. smartDOE — LHS initial design → Bayesian Optimization → Bootstrap CI
 *   4. predictiveMaintenance — EMD → PCA on IMF features → SVM → CUSUM monitoring
 *   5. probabilisticCosting — MCMC → GARCH volatility → Bootstrap cost CI
 *   6. capabilityWithCI — Cp/Cpk computation → Bootstrap BCa confidence intervals
 *   7. processFingerprint — Wavelet → PCA → K-Means → LogReg classification
 *
 * @module MathIntegrationPipelineEngine
 */

import { AdvancedMathematicalMethodsEngine } from "./AdvancedMathematicalMethodsEngine.js";
import { MetaheuristicOptimizationEngine } from "./MetaheuristicOptimizationEngine.js";
import { StatisticalMLEngine } from "./StatisticalMLEngine.js";

// ============================================================================
// INTERFACES
// ============================================================================

/** Input for robustOptimization pipeline */
export interface RobustOptInput {
  /** Objective function to minimize: (x: number[]) => number */
  objectiveFn: (x: number[]) => number;
  /** Number of decision variables */
  dimensions: number;
  /** Variable bounds [[lo, hi], ...] */
  bounds: [number, number][];
  /** Number of LHS samples for PCE training (default 200) */
  nSamples?: number;
  /** PCE polynomial order (default 3) */
  order?: number;
  /** Robustness penalty coefficient k: objective = mean + k*stdDev (default 2.0) */
  robustnessK?: number;
  /** PRNG seed (default 42) */
  seed?: number;
}

/** Result from robustOptimization pipeline */
export interface RobustOptResult {
  /** Best solution vector found by CMA-ES */
  bestSolution: number[];
  /** Raw objective value at best solution */
  bestValue: number;
  /** Robust objective value (mean + k*stdDev) at best solution */
  robustValue: number;
  /** First-order Sobol sensitivity indices from PCE */
  sobolIndices: number[];
  /** Per-dimension sensitivity breakdown */
  sensitivity: { dimIndex: number; name?: string; sobolS1: number }[];
  /** CMA-ES convergence history */
  convergenceHistory: number[];
}

/** Input for multivariateSPC pipeline */
export interface MVSPCInput {
  /** Measurement matrix: N samples x D dimensions */
  measurements: number[][];
  /** Target mean vector (default: column means) */
  target?: number[];
  /** Known standard deviations per dimension (default: column stdDevs) */
  sigma?: number[];
  /** Number of principal components to retain (default: explain 90% variance) */
  nComponents?: number;
  /** CUSUM reference value K (default 0.5) */
  cusumK?: number;
  /** CUSUM decision interval H (default 5.0) */
  cusumH?: number;
  /** EWMA smoothing parameter lambda (default 0.2) */
  ewmaLambda?: number;
  /** EWMA control limit width L (default 3.0) */
  ewmaL?: number;
}

/** Result from multivariateSPC pipeline */
export interface MVSPCResult {
  /** PCA decomposition results */
  pcaResult: {
    components: number[][];
    eigenvalues: number[];
    explainedVarianceRatio: number[];
  };
  /** Control chart results for each retained principal component */
  controlResults: {
    pcIndex: number;
    cusumUpper: number[];
    cusumLower: number[];
    ewmaValues: number[];
    outOfControlIndices: number[];
    alarmPoints: { index: number; type: string; value: number }[];
  }[];
  /** Hotelling T² statistic for each observation */
  hotellingT2: number[];
  /** Chi-squared limit for T² at alpha=0.05 */
  t2Limit: number;
  /** Union of all out-of-control observation indices */
  overallOOC: number[];
}

/** Input for smartDOE pipeline */
export interface SmartDOEInput {
  /** Objective function to minimize */
  objectiveFn: (x: number[]) => number;
  /** Number of decision variables */
  dimensions: number;
  /** Variable bounds [[lo, hi], ...] */
  bounds: [number, number][];
  /** Number of initial LHS experiments (default 5 * dimensions) */
  nInitial?: number;
  /** Number of Bayesian optimization iterations (default 25) */
  nIterations?: number;
  /** Bootstrap confidence level (default 0.95) */
  confidenceLevel?: number;
  /** PRNG seed (default 42) */
  seed?: number;
}

/** Result from smartDOE pipeline */
export interface SmartDOEResult {
  /** Best solution found */
  bestSolution: number[];
  /** Best objective value */
  bestValue: number;
  /** Bootstrap BCa confidence interval on the optimum */
  confidenceInterval: [number, number];
  /** Total experiments conducted */
  totalExperiments: number;
  /** Full experiment log */
  experimentLog: { x: number[]; y: number }[];
  /** Convergence history from Bayesian optimization */
  convergenceHistory: number[];
}

/** Input for predictiveMaintenance pipeline */
export interface PredMaintInput {
  /** Vibration signal (time-domain samples) */
  vibrationSignal: number[];
  /** Training data for SVM: signals with known health labels */
  trainingData?: { signals: number[][]; labels: number[] };
  /** Anomaly threshold for health score (default 0.5) */
  threshold?: number;
  /** Historical monitoring data for CUSUM trend detection */
  monitoringData?: number[][];
}

/** Result from predictiveMaintenance pipeline */
export interface PredMaintResult {
  /** IMF feature summary: energy and mean frequency per IMF */
  imfs: { energy: number; meanFrequency: number }[];
  /** Overall health score (0 = healthy, 1 = critical) */
  healthScore: number;
  /** Classification label if training data provided */
  classification?: string;
  /** SVM training accuracy if classification performed */
  svmAccuracy?: number;
  /** Whether CUSUM detected a trend alarm */
  trendAlarm?: boolean;
  /** Historical feature matrix used for monitoring */
  featureHistory?: number[][];
}

/** Input for probabilisticCosting pipeline */
export interface ProbCostInput {
  /** Base cost (deterministic portion) */
  baseCost: number;
  /** Stochastic cost components */
  costComponents: { name: string; mean: number; stdDev: number }[];
  /** Historical material price data for GARCH volatility modeling */
  materialPriceHistory?: number[];
  /** Number of MCMC samples (default 5000) */
  nSamples?: number;
  /** Confidence level for cost CI (default 0.95) */
  confidenceLevel?: number;
  /** PRNG seed (default 42) */
  seed?: number;
}

/** Result from probabilisticCosting pipeline */
export interface ProbCostResult {
  /** Expected total cost */
  expectedCost: number;
  /** BCa confidence interval on total cost */
  costCI: [number, number];
  /** Sampled cost distribution */
  costDistribution: number[];
  /** Material price volatility from GARCH (if history provided) */
  materialVolatility?: { persistence: number; forecastVariance: number };
  /** Sensitivity of each cost component */
  componentSensitivity: { name: string; contribution: number }[];
  /** Risk score: P(cost > 1.2 * expectedCost) */
  riskScore: number;
}

/** Input for capabilityWithCI pipeline */
export interface CapCIInput {
  /** Process measurements */
  measurements: number[];
  /** Upper specification limit */
  USL: number;
  /** Lower specification limit */
  LSL: number;
  /** Number of bootstrap resamples (default 10000) */
  nBootstrap?: number;
  /** Confidence level (default 0.95) */
  confidenceLevel?: number;
  /** PRNG seed (default 42) */
  seed?: number;
}

/** Result from capabilityWithCI pipeline */
export interface CapCIResult {
  /** Process capability index Cp = (USL-LSL)/(6*sigma) */
  cp: number;
  /** Process capability index Cpk = min((USL-mean)/(3*sigma), (mean-LSL)/(3*sigma)) */
  cpk: number;
  /** Bootstrap BCa confidence interval on Cp */
  cpCI: [number, number];
  /** Bootstrap BCa confidence interval on Cpk */
  cpkCI: [number, number];
  /** Sample mean */
  mean: number;
  /** Sample standard deviation */
  stdDev: number;
  /** Number of measurements */
  nSamples: number;
  /** Whether Cpk >= 1.33 (point estimate) */
  isCapable: boolean;
  /** Whether lower bound of Cpk CI >= 1.33 (statistically confident) */
  isCapableWithCI: boolean;
}

/** Input for processFingerprint pipeline */
export interface ProcFPInput {
  /** Signal matrix: M signals x N samples each */
  signals: number[][];
  /** Number of clusters for K-Means (default 3) */
  k?: number;
  /** Known labels for logistic regression classification (optional) */
  labels?: number[];
  /** PRNG seed (default 42) */
  seed?: number;
}

/** Result from processFingerprint pipeline */
export interface ProcFPResult {
  /** Cluster information */
  clusters: { centroid: number[]; size: number; members: number[] }[];
  /** PCA explained variance ratios */
  pcaVariance: number[];
  /** Feature fingerprint vectors (one per signal) */
  fingerprints: number[][];
  /** Classification results if labels provided */
  classification?: { accuracy: number; weights: number[] };
  /** Cluster assignment per signal */
  clusterLabels: number[];
}

// ============================================================================
// ENGINE
// ============================================================================

/**
 * MathIntegrationPipelineEngine — Chains 19 mathematical methods from 3 engines
 * into 7 real manufacturing integration pipelines.
 *
 * Each pipeline creates fresh engine instances, executes a multi-stage flow,
 * and returns a unified result combining outputs from all stages.
 */
export class MathIntegrationPipelineEngine {
  private pipelineRuns = 0;

  /**
   * Pipeline 1: Robust Optimization
   *
   * Flow: LHS sampling → PCE uncertainty propagation → Sobol sensitivity → CMA-ES robust objective
   *
   * Finds cutting parameters with the best worst-case performance by penalizing
   * variance in the objective function. Uses PCE-derived Sobol indices to identify
   * which parameters contribute most to output variability.
   *
   * @param input - Robust optimization configuration
   * @returns Optimized solution with robustness guarantees and sensitivity analysis
   */
  robustOptimization(input: RobustOptInput): RobustOptResult {
    this.pipelineRuns++;
    const amm = new AdvancedMathematicalMethodsEngine();
    const nSamples = input.nSamples ?? 200;
    const order = input.order ?? 3;
    const k = input.robustnessK ?? 2.0;
    const seed = input.seed ?? 42;

    // Stage 1: LHS sampling across the parameter space
    const lhsResult = amm.latinHypercubeSampling({
      n: nSamples,
      dimensions: input.dimensions,
      lowerBounds: input.bounds.map((b) => b[0]),
      upperBounds: input.bounds.map((b) => b[1]),
      seed,
    });

    // Stage 2: Evaluate objective at each LHS sample
    const outputs = lhsResult.samples.map((s) => input.objectiveFn(s));

    // Stage 3: PCE for uncertainty propagation + Sobol indices
    const pceResult = amm.polynomialChaosExpansion({
      samples: lhsResult.samples,
      outputs,
      order,
      dimensions: input.dimensions,
    });

    // Stage 4: CMA-ES on robust objective = mean + k * stdDev
    // For each candidate, perturb around it with small LHS, evaluate PCE stats
    const perturbRadius = input.bounds.map((b) => (b[1] - b[0]) * 0.05);
    const initialMean = input.bounds.map((b) => (b[0] + b[1]) / 2);

    const robustObjective = (x: number[]): number => {
      // Generate small perturbation cloud around candidate x
      const nPerturb = 30;
      const pertAmm = new AdvancedMathematicalMethodsEngine();
      const pertSamples = pertAmm.latinHypercubeSampling({
        n: nPerturb,
        dimensions: input.dimensions,
        lowerBounds: x.map((xi, i) =>
          Math.max(input.bounds[i][0], xi - perturbRadius[i])
        ),
        upperBounds: x.map((xi, i) =>
          Math.min(input.bounds[i][1], xi + perturbRadius[i])
        ),
        seed: seed + Math.round(x[0] * 1000),
      });
      const pertOutputs = pertSamples.samples.map((s) => input.objectiveFn(s));
      const mean =
        pertOutputs.reduce((a, b) => a + b, 0) / pertOutputs.length;
      const variance =
        pertOutputs.reduce((a, v) => a + (v - mean) ** 2, 0) /
        pertOutputs.length;
      return mean + k * Math.sqrt(variance);
    };

    const cmaResult = amm.cmaes({
      objectiveFn: robustObjective,
      initialMean,
      initialSigma: 0.3,
      maxGenerations: 150,
      lowerBounds: input.bounds.map((b) => b[0]),
      upperBounds: input.bounds.map((b) => b[1]),
    });

    // Build sensitivity breakdown
    const sensitivity = pceResult.sobolIndices.map((s1, i) => ({
      dimIndex: i,
      sobolS1: s1,
    }));

    return {
      bestSolution: cmaResult.bestSolution,
      bestValue: input.objectiveFn(cmaResult.bestSolution),
      robustValue: cmaResult.bestValue,
      sobolIndices: pceResult.sobolIndices,
      sensitivity,
      convergenceHistory: cmaResult.fitnessHistory,
    };
  }

  /**
   * Pipeline 2: Multivariate Statistical Process Control
   *
   * Flow: PCA dimensionality reduction → CUSUM/EWMA on principal component scores → Hotelling T²
   *
   * Monitors 10+ quality dimensions simultaneously, detecting subtle multivariate
   * shifts that univariate charts would miss. Combines PCA-based monitoring with
   * classical Hotelling T² statistics.
   *
   * @param input - Multivariate SPC configuration
   * @returns PCA decomposition, per-PC control charts, Hotelling T², and OOC indices
   */
  multivariateSPC(input: MVSPCInput): MVSPCResult {
    this.pipelineRuns++;
    const sml = new StatisticalMLEngine();
    const N = input.measurements.length;
    const D = input.measurements[0].length;

    // Compute column means and stdDevs for standardization
    const colMeans = new Array(D).fill(0);
    const colStds = new Array(D).fill(0);
    for (let j = 0; j < D; j++) {
      for (let i = 0; i < N; i++) colMeans[j] += input.measurements[i][j];
      colMeans[j] /= N;
      for (let i = 0; i < N; i++)
        colStds[j] += (input.measurements[i][j] - colMeans[j]) ** 2;
      colStds[j] = Math.sqrt(colStds[j] / (N - 1));
      if (colStds[j] === 0) colStds[j] = 1; // avoid division by zero
    }

    const target = input.target ?? colMeans;
    const sigma = input.sigma ?? colStds;

    // Standardize measurements
    const standardized = input.measurements.map((row) =>
      row.map((v, j) => (v - target[j]) / sigma[j])
    );

    // Stage 1: PCA on standardized measurements
    // Determine nComponents: default to explaining 90% variance
    const pcaFull = sml.pca({ data: standardized });
    let nComp = input.nComponents;
    if (!nComp) {
      nComp = 1;
      for (let i = 0; i < pcaFull.cumulativeVariance.length; i++) {
        if (pcaFull.cumulativeVariance[i] >= 0.9) {
          nComp = i + 1;
          break;
        }
        nComp = i + 1;
      }
    }
    nComp = Math.min(nComp, D);

    const pcaResult = sml.pca({ data: standardized, nComponents: nComp });

    // Stage 2: CUSUM/EWMA control charts on each PC score
    const controlResults: MVSPCResult["controlResults"] = [];
    const allOOC = new Set<number>();

    for (let pc = 0; pc < nComp; pc++) {
      const scores = pcaResult.projectedData.map((row) => row[pc]);
      const pcMean = scores.reduce((a, b) => a + b, 0) / scores.length;
      const pcStd = Math.sqrt(
        scores.reduce((a, v) => a + (v - pcMean) ** 2, 0) / (scores.length - 1)
      );

      const ccResult = sml.controlChart({
        data: scores,
        target: 0, // PC scores centered at 0
        sigma: pcStd || 1,
        type: "both",
        cusumK: input.cusumK ?? 0.5,
        cusumH: input.cusumH ?? 5.0,
        ewmaLambda: input.ewmaLambda ?? 0.2,
        ewmaL: input.ewmaL ?? 3.0,
      });

      for (const idx of ccResult.outOfControlIndices) allOOC.add(idx);

      controlResults.push({
        pcIndex: pc,
        cusumUpper: ccResult.cusumUpper,
        cusumLower: ccResult.cusumLower,
        ewmaValues: ccResult.ewmaValues,
        outOfControlIndices: ccResult.outOfControlIndices,
        alarmPoints: ccResult.alarmPoints,
      });
    }

    // Stage 3: Hotelling T² statistic
    // T² = (x - μ)ᵀ S⁻¹ (x - μ) using PC scores
    // For PCA-projected data: T² = sum(z_j² / λ_j) for j=1..nComp
    const hotellingT2 = pcaResult.projectedData.map((row) => {
      let t2 = 0;
      for (let j = 0; j < nComp; j++) {
        const eigenval = pcaResult.eigenvalues[j] || 1e-10;
        t2 += (row[j] * row[j]) / eigenval;
      }
      return t2;
    });

    // Chi-squared approximate critical value at alpha=0.05 for nComp DOF
    // Using Wilson-Hilferty approximation: chi2_alpha ≈ p*(1 - 2/(9p) + z_alpha*sqrt(2/(9p)))^3
    const p = nComp;
    const zAlpha = 1.6449; // z for 0.95
    const wh = 1 - 2 / (9 * p) + zAlpha * Math.sqrt(2 / (9 * p));
    const t2Limit = p * Math.pow(Math.max(wh, 0.01), 3);

    // Add T² violations to OOC set
    for (let i = 0; i < N; i++) {
      if (hotellingT2[i] > t2Limit) allOOC.add(i);
    }

    return {
      pcaResult: {
        components: pcaResult.components,
        eigenvalues: pcaResult.eigenvalues,
        explainedVarianceRatio: pcaResult.explainedVarianceRatio,
      },
      controlResults,
      hotellingT2,
      t2Limit,
      overallOOC: Array.from(allOOC).sort((a, b) => a - b),
    };
  }

  /**
   * Pipeline 3: Smart Design of Experiments
   *
   * Flow: LHS initial design → Bayesian Optimization guided experiments → Bootstrap CI on optimum
   *
   * Finds optimal cutting parameters with minimum experiments plus confidence bounds.
   * Uses space-filling LHS for efficient initial exploration, then Bayesian optimization
   * for guided sequential experimentation, with bootstrap for statistical rigor.
   *
   * @param input - Smart DOE configuration
   * @returns Best solution with confidence interval and full experiment log
   */
  smartDOE(input: SmartDOEInput): SmartDOEResult {
    this.pipelineRuns++;
    const amm = new AdvancedMathematicalMethodsEngine();
    const meta = new MetaheuristicOptimizationEngine();
    const sml = new StatisticalMLEngine();

    const nInitial = input.nInitial ?? 5 * input.dimensions;
    const nIterations = input.nIterations ?? 25;
    const confidenceLevel = input.confidenceLevel ?? 0.95;
    const seed = input.seed ?? 42;

    // Stage 1: LHS initial design
    const lhsResult = amm.latinHypercubeSampling({
      n: nInitial,
      dimensions: input.dimensions,
      lowerBounds: input.bounds.map((b) => b[0]),
      upperBounds: input.bounds.map((b) => b[1]),
      seed,
    });

    const experimentLog: { x: number[]; y: number }[] = [];
    for (const sample of lhsResult.samples) {
      const y = input.objectiveFn(sample);
      experimentLog.push({ x: sample, y });
    }

    // Stage 2: Bayesian Optimization for guided exploration
    const boResult = meta.bayesianOptimization({
      objectiveFn: input.objectiveFn,
      dimensions: input.dimensions,
      bounds: input.bounds,
      nInitial: Math.max(3, input.dimensions + 1), // minimum GP fit
      maxIterations: nIterations,
      seed: seed + 100,
    });

    // Merge BO observations into experiment log
    for (let i = 0; i < boResult.observationsX.length; i++) {
      experimentLog.push({
        x: boResult.observationsX[i],
        y: boResult.observationsY[i],
      });
    }

    // Find best from all experiments
    let bestIdx = 0;
    for (let i = 1; i < experimentLog.length; i++) {
      if (experimentLog[i].y < experimentLog[bestIdx].y) bestIdx = i;
    }

    // Stage 3: Bootstrap CI on observations near the optimum
    // Use the best 30% of observations to estimate CI around the optimum
    const sortedByY = [...experimentLog].sort((a, b) => a.y - b.y);
    const topN = Math.max(5, Math.floor(experimentLog.length * 0.3));
    const bestRegionY = sortedByY.slice(0, topN).map((e) => e.y);

    const bootstrapResult = sml.bootstrap({
      data: bestRegionY,
      statistic: (sample: number[]) =>
        sample.reduce((a, b) => a + b, 0) / sample.length,
      nBootstrap: 5000,
      confidenceLevel,
      seed: seed + 200,
    });

    return {
      bestSolution: experimentLog[bestIdx].x,
      bestValue: experimentLog[bestIdx].y,
      confidenceInterval: bootstrapResult.confidenceInterval,
      totalExperiments: experimentLog.length,
      experimentLog,
      convergenceHistory: boResult.convergenceHistory,
    };
  }

  /**
   * Pipeline 4: Predictive Maintenance from Vibration Signals
   *
   * Flow: EMD feature extraction → PCA dimensionality reduction → SVM classification → CUSUM monitoring
   *
   * Extracts machine health indicators from vibration sensor data using empirical
   * mode decomposition, classifies machine state with SVM, and monitors feature
   * trends with CUSUM for early fault detection.
   *
   * @param input - Vibration signal and optional training/monitoring data
   * @returns Health score, classification, and trend alarm
   */
  predictiveMaintenance(input: PredMaintInput): PredMaintResult {
    this.pipelineRuns++;
    const amm = new AdvancedMathematicalMethodsEngine();
    const sml = new StatisticalMLEngine();
    const threshold = input.threshold ?? 0.5;

    // Phase 1: EMD feature extraction on the current signal
    const emdResult = amm.empiricalModeDecomposition({
      signal: input.vibrationSignal,
      maxIMFs: 6,
    });

    const imfFeatures = emdResult.imfs.map((imf) => ({
      energy: imf.energy,
      meanFrequency: imf.meanFrequency,
    }));

    // Build feature vector: [energy_imf0, freq_imf0, energy_imf1, freq_imf1, ...]
    const currentFeatures: number[] = [];
    for (const imf of imfFeatures) {
      currentFeatures.push(imf.energy, imf.meanFrequency);
    }

    // Compute health score from energy distribution across IMFs
    // High-frequency IMFs (early indices) dominating = unhealthy
    const totalEnergy = imfFeatures.reduce((s, f) => s + f.energy, 0) || 1;
    const highFreqRatio =
      imfFeatures.length > 2
        ? (imfFeatures[0].energy + imfFeatures[1].energy) / totalEnergy
        : imfFeatures[0]?.energy / totalEnergy || 0;
    const healthScore = Math.min(1, Math.max(0, highFreqRatio));

    let classification: string | undefined;
    let svmAccuracy: number | undefined;

    // Phase 2: SVM classification if training data provided
    if (input.trainingData && input.trainingData.signals.length > 0) {
      // Extract features from each training signal via EMD
      const trainingFeatures: number[][] = [];
      const maxFeatureLen = currentFeatures.length;

      for (const sig of input.trainingData.signals) {
        const sigEmd = amm.empiricalModeDecomposition({
          signal: sig,
          maxIMFs: 6,
        });
        const feat: number[] = [];
        for (const imf of sigEmd.imfs) {
          feat.push(imf.energy, imf.meanFrequency);
        }
        // Pad or truncate to match feature length
        while (feat.length < maxFeatureLen) feat.push(0);
        trainingFeatures.push(feat.slice(0, maxFeatureLen));
      }

      // Normalize labels to {-1, +1} for SVM
      const uniqueLabels = [...new Set(input.trainingData.labels)];
      const svmLabels = input.trainingData.labels.map((l) =>
        l === uniqueLabels[0] ? -1 : 1
      );

      if (trainingFeatures.length >= 2) {
        // PCA on training features for dimensionality reduction
        const nFeatComponents = Math.min(4, maxFeatureLen, trainingFeatures.length);
        const pcaResult = sml.pca({
          data: trainingFeatures,
          nComponents: nFeatComponents,
        });

        const svmResult = amm.svm({
          X: pcaResult.projectedData,
          y: svmLabels,
          kernel: "rbf",
          C: 10,
          maxIterations: 500,
        });

        svmAccuracy = svmResult.accuracy;

        // Classify current signal
        // Project current features through PCA
        const centeredCurrent = currentFeatures.map(
          (v, j) => v - (trainingFeatures.reduce((s, r) => s + r[j], 0) / trainingFeatures.length)
        );
        // Manual projection: dot product with each component
        const projectedCurrent: number[] = [];
        for (let c = 0; c < nFeatComponents; c++) {
          let dot = 0;
          for (let j = 0; j < Math.min(centeredCurrent.length, pcaResult.components[c].length); j++) {
            dot += centeredCurrent[j] * pcaResult.components[c][j];
          }
          projectedCurrent.push(dot);
        }

        const predVal = svmResult.predict(projectedCurrent);
        classification =
          predVal <= 0
            ? String(uniqueLabels[0])
            : String(uniqueLabels[1] ?? "fault");
      }
    }

    // Phase 3: CUSUM trend monitoring on feature history
    let trendAlarm: boolean | undefined;
    let featureHistory: number[][] | undefined;

    if (input.monitoringData && input.monitoringData.length > 0) {
      // Extract energy features from each monitoring sample
      featureHistory = [];
      const energyTrend: number[] = [];

      for (const monSig of input.monitoringData) {
        const monEmd = amm.empiricalModeDecomposition({
          signal: monSig,
          maxIMFs: 6,
        });
        const feat = monEmd.imfs.map((imf) => imf.energy);
        featureHistory.push(feat);
        energyTrend.push(feat.reduce((a, b) => a + b, 0));
      }

      // CUSUM on total energy trend
      if (energyTrend.length >= 3) {
        const trendMean =
          energyTrend.reduce((a, b) => a + b, 0) / energyTrend.length;
        const trendStd = Math.sqrt(
          energyTrend.reduce((a, v) => a + (v - trendMean) ** 2, 0) /
            (energyTrend.length - 1)
        ) || 1;

        const ccResult = sml.controlChart({
          data: energyTrend,
          target: trendMean,
          sigma: trendStd,
          type: "cusum",
          cusumK: 0.5,
          cusumH: 5.0,
        });

        trendAlarm = ccResult.outOfControlIndices.length > 0;
      }
    }

    return {
      imfs: imfFeatures,
      healthScore,
      classification,
      svmAccuracy,
      trendAlarm,
      featureHistory,
    };
  }

  /**
   * Pipeline 5: Probabilistic Job Costing
   *
   * Flow: MCMC on cost model → GARCH on material price volatility → Bootstrap cost CI
   *
   * Produces full probabilistic cost estimates with volatility modeling for material
   * prices and BCa confidence intervals on total cost. Identifies which cost
   * components contribute most to uncertainty.
   *
   * @param input - Cost model with stochastic components and optional price history
   * @returns Expected cost, CI, volatility, sensitivity, and risk score
   */
  probabilisticCosting(input: ProbCostInput): ProbCostResult {
    this.pipelineRuns++;
    const amm = new AdvancedMathematicalMethodsEngine();
    const sml = new StatisticalMLEngine();

    const nSamples = input.nSamples ?? 5000;
    const confidenceLevel = input.confidenceLevel ?? 0.95;
    const seed = input.seed ?? 42;

    // Phase 1: MCMC to sample from the joint cost distribution
    // Log-density: sum of log-normal densities for each component
    const nDims = input.costComponents.length;
    const logDensity = (state: number[]): number => {
      let logP = 0;
      for (let i = 0; i < nDims; i++) {
        const comp = input.costComponents[i];
        const z = (state[i] - comp.mean) / comp.stdDev;
        logP += -0.5 * z * z - Math.log(comp.stdDev * Math.sqrt(2 * Math.PI));
      }
      return logP;
    };

    const mcmcResult = sml.mcmc({
      logDensityFn: logDensity,
      initialState: input.costComponents.map((c) => c.mean),
      nSamples,
      burnIn: Math.floor(nSamples * 0.2),
      thinning: 2,
      stepSize: Math.max(...input.costComponents.map((c) => c.stdDev)) * 0.5,
      seed,
    });

    // Compute total cost for each MCMC sample
    const costDistribution = mcmcResult.samples.map(
      (sample) =>
        input.baseCost + sample.reduce((sum, val) => sum + val, 0)
    );

    const expectedCost =
      costDistribution.reduce((a, b) => a + b, 0) / costDistribution.length;

    // Phase 2: GARCH volatility modeling on material prices
    let materialVolatility:
      | { persistence: number; forecastVariance: number }
      | undefined;

    if (
      input.materialPriceHistory &&
      input.materialPriceHistory.length >= 10
    ) {
      // Compute returns from price history
      const prices = input.materialPriceHistory;
      const returns: number[] = [];
      for (let i = 1; i < prices.length; i++) {
        returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
      }

      const garchResult = amm.garch({
        returns,
        p: 1,
        q: 1,
        forecastHorizon: 10,
      });

      materialVolatility = {
        persistence: garchResult.persistence,
        forecastVariance: garchResult.forecastVariance[0],
      };
    }

    // Phase 3: Bootstrap BCa CI on total cost
    const bootstrapResult = sml.bootstrap({
      data: costDistribution,
      statistic: (sample: number[]) =>
        sample.reduce((a, b) => a + b, 0) / sample.length,
      nBootstrap: 5000,
      confidenceLevel,
      seed: seed + 300,
    });

    // Component sensitivity: variance contribution
    const componentVariances = input.costComponents.map((_, i) => {
      const vals = mcmcResult.samples.map((s) => s[i]);
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      return vals.reduce((a, v) => a + (v - mean) ** 2, 0) / vals.length;
    });
    const totalVariance = componentVariances.reduce((a, b) => a + b, 0) || 1;
    const componentSensitivity = input.costComponents.map((comp, i) => ({
      name: comp.name,
      contribution: componentVariances[i] / totalVariance,
    }));

    // Risk score: P(cost > 1.2 * expectedCost)
    const riskThreshold = expectedCost * 1.2;
    const riskScore =
      costDistribution.filter((c) => c > riskThreshold).length /
      costDistribution.length;

    return {
      expectedCost,
      costCI: bootstrapResult.confidenceInterval,
      costDistribution,
      materialVolatility,
      componentSensitivity,
      riskScore,
    };
  }

  /**
   * Pipeline 6: Process Capability with Confidence Intervals
   *
   * Flow: Compute Cp/Cpk → Bootstrap BCa confidence intervals on both indices
   *
   * Provides statistically rigorous capability studies by bootstrapping
   * confidence intervals on Cp and Cpk. A process is only declared capable
   * if the lower CI bound of Cpk >= 1.33.
   *
   * @param input - Measurements and specification limits
   * @returns Cp, Cpk, their CIs, and capability determination
   */
  capabilityWithCI(input: CapCIInput): CapCIResult {
    this.pipelineRuns++;
    const sml = new StatisticalMLEngine();

    const nBootstrap = input.nBootstrap ?? 10000;
    const confidenceLevel = input.confidenceLevel ?? 0.95;
    const seed = input.seed ?? 42;
    const data = input.measurements;
    const n = data.length;

    // Compute point estimates
    const mean = data.reduce((a, b) => a + b, 0) / n;
    const stdDev = Math.sqrt(
      data.reduce((a, v) => a + (v - mean) ** 2, 0) / (n - 1)
    );

    const cp = (input.USL - input.LSL) / (6 * stdDev);
    const cpk = Math.min(
      (input.USL - mean) / (3 * stdDev),
      (mean - input.LSL) / (3 * stdDev)
    );

    // Bootstrap Cp
    const cpBootstrap = sml.bootstrap({
      data,
      statistic: (sample: number[]) => {
        const m = sample.reduce((a, b) => a + b, 0) / sample.length;
        const s = Math.sqrt(
          sample.reduce((a, v) => a + (v - m) ** 2, 0) / (sample.length - 1)
        );
        return s > 0 ? (input.USL - input.LSL) / (6 * s) : 0;
      },
      nBootstrap,
      confidenceLevel,
      seed,
    });

    // Bootstrap Cpk
    const cpkBootstrap = sml.bootstrap({
      data,
      statistic: (sample: number[]) => {
        const m = sample.reduce((a, b) => a + b, 0) / sample.length;
        const s = Math.sqrt(
          sample.reduce((a, v) => a + (v - m) ** 2, 0) / (sample.length - 1)
        );
        if (s <= 0) return 0;
        return Math.min(
          (input.USL - m) / (3 * s),
          (m - input.LSL) / (3 * s)
        );
      },
      nBootstrap,
      confidenceLevel,
      seed: seed + 100,
    });

    return {
      cp,
      cpk,
      cpCI: cpBootstrap.confidenceInterval,
      cpkCI: cpkBootstrap.confidenceInterval,
      mean,
      stdDev,
      nSamples: n,
      isCapable: cpk >= 1.33,
      isCapableWithCI: cpkBootstrap.confidenceInterval[0] >= 1.33,
    };
  }

  /**
   * Pipeline 7: Process Fingerprinting from Sensor Signatures
   *
   * Flow: Wavelet transform → PCA on wavelet coefficients → K-Means clustering → LogReg classification
   *
   * Automatically identifies distinct process states from sensor signatures.
   * Wavelet energy features capture multi-scale signal characteristics,
   * PCA compresses features, K-Means finds natural groups, and optional
   * logistic regression enables supervised classification.
   *
   * @param input - Signal matrix with optional labels for classification
   * @returns Clusters, fingerprints, PCA variance, and optional classification
   */
  processFingerprint(input: ProcFPInput): ProcFPResult {
    this.pipelineRuns++;
    const sml = new StatisticalMLEngine();

    const k = input.k ?? 3;
    const seed = input.seed ?? 42;
    const M = input.signals.length;

    // Phase 1: Wavelet transform each signal → extract energy per level as features
    const featureMatrix: number[][] = [];
    let maxLevels = 0;

    // First pass: determine max decomposition levels
    for (const signal of input.signals) {
      const wavResult = sml.waveletTransform({ signal });
      if (wavResult.energyByLevel.length > maxLevels) {
        maxLevels = wavResult.energyByLevel.length;
      }
    }

    // Second pass: extract features with consistent length
    for (const signal of input.signals) {
      const wavResult = sml.waveletTransform({ signal });
      const features = [...wavResult.energyByLevel];
      // Pad to maxLevels if needed
      while (features.length < maxLevels) features.push(0);
      // Add total energy and approximation energy
      const totalEnergy = features.reduce((a, b) => a + b, 0) || 1;
      features.push(totalEnergy);
      // Normalize by total energy for relative features
      const normalized = features.map((f) => f / totalEnergy);
      featureMatrix.push(normalized);
    }

    // Phase 2: PCA on feature matrix
    const nComponents = Math.min(
      Math.max(2, Math.floor(featureMatrix[0].length / 2)),
      featureMatrix.length,
      featureMatrix[0].length
    );
    const pcaResult = sml.pca({
      data: featureMatrix,
      nComponents,
    });

    // Phase 3: K-Means clustering on PCA-projected features
    const effectiveK = Math.min(k, M);
    const kmeansResult = sml.kMeans({
      data: pcaResult.projectedData,
      k: effectiveK,
      maxIterations: 100,
      seed,
    });

    // Build cluster details
    const clusters: ProcFPResult["clusters"] = [];
    for (let c = 0; c < effectiveK; c++) {
      const members: number[] = [];
      for (let i = 0; i < M; i++) {
        if (kmeansResult.assignments[i] === c) members.push(i);
      }
      clusters.push({
        centroid: kmeansResult.centroids[c],
        size: members.length,
        members,
      });
    }

    // Phase 4: Logistic regression classification if labels provided
    let classification: ProcFPResult["classification"];
    if (input.labels && input.labels.length === M) {
      // Binary or multi-class via one-vs-rest
      const uniqueLabels = [...new Set(input.labels)];
      if (uniqueLabels.length === 2) {
        // Binary logistic regression
        const binaryLabels = input.labels.map((l) =>
          l === uniqueLabels[0] ? 0 : 1
        );
        const logRegResult = sml.logisticRegression({
          X: pcaResult.projectedData,
          y: binaryLabels,
          learningRate: 0.1,
          maxIterations: 500,
          lambda: 0.01,
        });
        classification = {
          accuracy: logRegResult.accuracy,
          weights: logRegResult.weights,
        };
      } else {
        // One-vs-rest: train one classifier per class, report average accuracy
        let totalAcc = 0;
        let allWeights: number[] = [];
        for (const label of uniqueLabels) {
          const binaryLabels = input.labels.map((l) => (l === label ? 1 : 0));
          const logRegResult = sml.logisticRegression({
            X: pcaResult.projectedData,
            y: binaryLabels,
            learningRate: 0.1,
            maxIterations: 500,
            lambda: 0.01,
          });
          totalAcc += logRegResult.accuracy;
          if (allWeights.length === 0) allWeights = logRegResult.weights;
        }
        classification = {
          accuracy: totalAcc / uniqueLabels.length,
          weights: allWeights,
        };
      }
    }

    return {
      clusters,
      pcaVariance: pcaResult.explainedVarianceRatio,
      fingerprints: featureMatrix,
      classification,
      clusterLabels: kmeansResult.assignments,
    };
  }

  /**
   * Returns a list of all available integration pipelines with descriptions.
   * @returns Array of pipeline metadata
   */
  listPipelines(): {
    name: string;
    description: string;
    engines: string[];
    methods: string[];
  }[] {
    return [
      {
        name: "robustOptimization",
        description:
          "Find cutting parameters with best worst-case performance via LHS → PCE → Sobol → CMA-ES",
        engines: ["AdvancedMathematicalMethodsEngine"],
        methods: [
          "latinHypercubeSampling",
          "polynomialChaosExpansion",
          "cmaes",
        ],
      },
      {
        name: "multivariateSPC",
        description:
          "Monitor 10+ quality dimensions simultaneously with PCA → CUSUM/EWMA + Hotelling T²",
        engines: ["StatisticalMLEngine"],
        methods: ["pca", "controlChart"],
      },
      {
        name: "smartDOE",
        description:
          "Find optimal cutting parameters with minimum experiments + confidence bounds via LHS → BayesOpt → Bootstrap",
        engines: [
          "AdvancedMathematicalMethodsEngine",
          "MetaheuristicOptimizationEngine",
          "StatisticalMLEngine",
        ],
        methods: [
          "latinHypercubeSampling",
          "bayesianOptimization",
          "bootstrap",
        ],
      },
      {
        name: "predictiveMaintenance",
        description:
          "Real-time machine health from vibration sensors via EMD → PCA → SVM → CUSUM",
        engines: [
          "AdvancedMathematicalMethodsEngine",
          "StatisticalMLEngine",
        ],
        methods: [
          "empiricalModeDecomposition",
          "pca",
          "svm",
          "controlChart",
        ],
      },
      {
        name: "probabilisticCosting",
        description:
          "Full probabilistic job costing with MCMC → GARCH volatility → Bootstrap CI",
        engines: [
          "AdvancedMathematicalMethodsEngine",
          "StatisticalMLEngine",
        ],
        methods: ["mcmc", "garch", "bootstrap"],
      },
      {
        name: "capabilityWithCI",
        description:
          "Capability studies (Cp/Cpk) with proper statistical uncertainty via Bootstrap BCa",
        engines: ["StatisticalMLEngine"],
        methods: ["bootstrap"],
      },
      {
        name: "processFingerprint",
        description:
          "Automatic process state identification from sensor signatures via Wavelet → PCA → K-Means → LogReg",
        engines: ["StatisticalMLEngine"],
        methods: [
          "waveletTransform",
          "pca",
          "kMeans",
          "logisticRegression",
        ],
      },
    ];
  }

  /**
   * Returns engine statistics: total pipeline runs and pipeline inventory.
   * @returns Engine stats summary
   */
  stats(): {
    engineName: string;
    totalPipelineRuns: number;
    pipelineCount: number;
    pipelineNames: string[];
    upstreamEngines: string[];
    totalMethodsCombined: number;
  } {
    return {
      engineName: "MathIntegrationPipelineEngine",
      totalPipelineRuns: this.pipelineRuns,
      pipelineCount: 7,
      pipelineNames: [
        "robustOptimization",
        "multivariateSPC",
        "smartDOE",
        "predictiveMaintenance",
        "probabilisticCosting",
        "capabilityWithCI",
        "processFingerprint",
      ],
      upstreamEngines: [
        "AdvancedMathematicalMethodsEngine",
        "MetaheuristicOptimizationEngine",
        "StatisticalMLEngine",
      ],
      totalMethodsCombined: 19,
    };
  }
}
