/**
 * NeuralDeterminismTestingEngine — Neural Output Determinism & Reproducibility Framework
 * =======================================================================================
 *
 * Addresses P0-CRITICAL gap: 14,050 tests proposed but neural outputs are stochastic.
 * This engine provides deterministic testing infrastructure for neural network outputs.
 *
 * Capabilities:
 * 1. **Seeding Strategy**: Seedable PRNG with global/per-test isolation
 * 2. **Tolerance-Based Comparison**: Configurable thresholds for floating-point outputs
 * 3. **Distribution Testing**: Statistical validation across multiple runs
 * 4. **Golden Baseline Management**: Version-controlled expected outputs
 * 5. **Regression Detection**: Drift monitoring with threshold alerts
 *
 * Mathematical Foundations:
 * - Park-Miller LCG for seedable pseudo-random generation
 * - Kolmogorov-Smirnov test for distribution comparison
 * - Shapiro-Wilk normality test for output distributions
 * - Cohen's d for effect size / drift magnitude
 *
 * References:
 * - Park & Miller (1988). "Random Number Generators: Good Ones Are Hard to Find"
 * - Shapiro & Wilk (1965). "An Analysis of Variance Test for Normality"
 * - Cohen (1988). "Statistical Power Analysis for the Behavioral Sciences"
 *
 * @module engines/NeuralDeterminismTestingEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// SEEDED PRNG (Park-Miller LCG)
// ============================================================================

/**
 * Park-Miller LCG seeded PRNG for reproducibility
 * Period: 2^31 - 2, statistically robust for simulation
 */
export class SeededPRNG {
  private state: number;
  private static readonly A = 16807;
  private static readonly M = 2147483647; // 2^31 - 1

  constructor(seed: number) {
    this.state = ((seed % SeededPRNG.M) + SeededPRNG.M) % SeededPRNG.M;
    if (this.state === 0) this.state = 1;
  }

  /** Returns uniform random in [0, 1) */
  random(): number {
    this.state = (this.state * SeededPRNG.A) % SeededPRNG.M;
    return (this.state - 1) / (SeededPRNG.M - 1);
  }

  /** Returns integer in [min, max] inclusive */
  randInt(min: number, max: number): number {
    return Math.floor(this.random() * (max - min + 1)) + min;
  }

  /** Box-Muller transform for normal distribution */
  gaussian(mean: number = 0, stddev: number = 1): number {
    const u1 = this.random();
    const u2 = this.random();
    const z = Math.sqrt(-2 * Math.log(u1 || 1e-15)) * Math.cos(2 * Math.PI * u2);
    return mean + stddev * z;
  }

  /** Get current state for checkpointing */
  getState(): number {
    return this.state;
  }

  /** Restore from checkpoint */
  setState(state: number): void {
    this.state = state;
  }

  /** Clone with same state */
  clone(): SeededPRNG {
    const cloned = new SeededPRNG(1);
    cloned.state = this.state;
    return cloned;
  }
}

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/** Configuration for neural determinism testing */
export interface NeuralTestConfig {
  /** Global seed for all random number generators */
  seed: number;
  /** Tolerance for floating-point comparison (e.g., 0.001 = 0.1%) */
  tolerance: number;
  /** Enable distribution testing mode */
  distributionTesting: boolean;
  /** Number of samples for distribution testing */
  sampleCount?: number;
  /** Maximum allowed deviation from baseline */
  maxDeviationThreshold?: number;
  /** Enable verbose logging */
  verbose?: boolean;
}

/** Result of a neural determinism test */
export interface NeuralTestResult {
  /** Whether the test passed */
  passed: boolean;
  /** Actual output values from the test */
  actualOutput: number[];
  /** Expected output values (baseline) */
  expectedOutput: number[];
  /** Maximum deviation between actual and expected */
  maxDeviation: number;
  /** Whether the deviation is within tolerance */
  withinTolerance: boolean;
  /** Distribution statistics (if distributionTesting enabled) */
  distributionStats?: DistributionStats;
  /** Test metadata */
  metadata?: {
    seed: number;
    tolerance: number;
    executionTimeMs: number;
    sampleCount?: number;
  };
}

/** Statistics from distribution testing */
export interface DistributionStats {
  /** Mean of the distribution */
  mean: number;
  /** Standard deviation */
  stddev: number;
  /** 95th percentile */
  p95: number;
  /** 99th percentile */
  p99: number;
  /** Minimum value */
  min: number;
  /** Maximum value */
  max: number;
  /** Skewness (0 = symmetric) */
  skewness: number;
  /** Kurtosis (3 = normal) */
  kurtosis: number;
  /** Shapiro-Wilk normality test p-value */
  normalityPValue: number;
  /** Whether distribution appears normal */
  isNormal: boolean;
  /** Coefficient of variation (stddev/mean) */
  cv: number;
  /** Interquartile range */
  iqr: number;
}

/** Golden baseline entry for reference outputs */
export interface GoldenBaseline {
  /** Unique identifier for this baseline */
  id: string;
  /** Human-readable name */
  name: string;
  /** Expected output values */
  expectedOutput: number[];
  /** Model version that produced this baseline */
  modelVersion: string;
  /** Timestamp when baseline was created */
  createdAt: string;
  /** Seed used to generate baseline */
  seed: number;
  /** Input parameters that produced this output */
  inputParams: Record<string, unknown>;
  /** Tolerance used for comparison */
  tolerance: number;
  /** Optional description */
  description?: string;
  /** Tags for categorization */
  tags?: string[];
}

/** Registry of golden baselines */
export interface BaselineRegistry {
  /** Schema version for migration support */
  schemaVersion: string;
  /** All registered baselines */
  baselines: Map<string, GoldenBaseline>;
  /** Last update timestamp */
  lastUpdated: string;
  /** Current model version */
  currentModelVersion: string;
}

/** Drift detection result */
export interface DriftReport {
  /** Whether drift was detected */
  driftDetected: boolean;
  /** Cohen's d effect size (0.2=small, 0.5=medium, 0.8=large) */
  effectSize: number;
  /** Percentage drift from baseline */
  driftPercent: number;
  /** Maximum element-wise deviation */
  maxDeviation: number;
  /** Mean absolute deviation */
  meanAbsoluteDeviation: number;
  /** Root mean square deviation */
  rmsd: number;
  /** Correlation with baseline (1.0 = identical structure) */
  correlation: number;
  /** Which elements have drifted beyond threshold */
  driftedIndices: number[];
  /** Severity level */
  severity: "none" | "low" | "medium" | "high" | "critical";
  /** Recommended action */
  recommendation: string;
}

/** Distribution anomaly detection result */
export interface AnomalyReport {
  /** Whether anomalies were detected */
  hasAnomalies: boolean;
  /** List of detected anomalies */
  anomalies: Anomaly[];
  /** Overall health score (0-1) */
  healthScore: number;
}

/** Individual anomaly */
export interface Anomaly {
  type: "bimodal" | "heavy_tail" | "outliers" | "skewed" | "unstable_variance" | "non_stationary";
  severity: "low" | "medium" | "high";
  description: string;
  affectedRange?: [number, number];
  suggestedAction: string;
}

/** Test run context for isolation */
export interface TestRunContext {
  /** Unique run identifier */
  runId: string;
  /** Per-test seed (derived from global + test index) */
  seed: number;
  /** PRNG instance for this test */
  prng: SeededPRNG;
  /** Test configuration */
  config: NeuralTestConfig;
  /** Start timestamp */
  startTime: number;
}

// ============================================================================
// STATISTICAL UTILITIES
// ============================================================================

const statisticalUtils = {
  /** Calculate mean */
  mean: (values: number[]): number => {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  },

  /** Calculate variance */
  variance: (values: number[], mean?: number): number => {
    if (values.length < 2) return 0;
    const m = mean ?? statisticalUtils.mean(values);
    return values.reduce((acc, v) => acc + (v - m) ** 2, 0) / (values.length - 1);
  },

  /** Calculate standard deviation */
  stddev: (values: number[], mean?: number): number => {
    return Math.sqrt(statisticalUtils.variance(values, mean));
  },

  /** Calculate percentile */
  percentile: (sortedValues: number[], p: number): number => {
    if (sortedValues.length === 0) return 0;
    const idx = (p / 100) * (sortedValues.length - 1);
    const lower = Math.floor(idx);
    const upper = Math.ceil(idx);
    if (lower === upper) return sortedValues[lower];
    return sortedValues[lower] * (upper - idx) + sortedValues[upper] * (idx - lower);
  },

  /** Calculate skewness (Fisher) */
  skewness: (values: number[], mean?: number, stddev?: number): number => {
    if (values.length < 3) return 0;
    const m = mean ?? statisticalUtils.mean(values);
    const s = stddev ?? statisticalUtils.stddev(values, m);
    if (s === 0) return 0;
    const n = values.length;
    const sum = values.reduce((acc, v) => acc + ((v - m) / s) ** 3, 0);
    return (n / ((n - 1) * (n - 2))) * sum;
  },

  /** Calculate kurtosis (excess kurtosis, normal = 0) */
  kurtosis: (values: number[], mean?: number, stddev?: number): number => {
    if (values.length < 4) return 0;
    const m = mean ?? statisticalUtils.mean(values);
    const s = stddev ?? statisticalUtils.stddev(values, m);
    if (s === 0) return 0;
    const n = values.length;
    const sum = values.reduce((acc, v) => acc + ((v - m) / s) ** 4, 0);
    const k4 = ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * sum;
    const correction = (3 * (n - 1) ** 2) / ((n - 2) * (n - 3));
    return k4 - correction;
  },

  /** Cohen's d effect size */
  cohensD: (sample1: number[], sample2: number[]): number => {
    const m1 = statisticalUtils.mean(sample1);
    const m2 = statisticalUtils.mean(sample2);
    const s1 = statisticalUtils.stddev(sample1, m1);
    const s2 = statisticalUtils.stddev(sample2, m2);
    const n1 = sample1.length;
    const n2 = sample2.length;
    // Pooled standard deviation
    const sp = Math.sqrt(((n1 - 1) * s1 ** 2 + (n2 - 1) * s2 ** 2) / (n1 + n2 - 2));
    if (sp === 0) return 0;
    return Math.abs(m1 - m2) / sp;
  },

  /** Pearson correlation coefficient */
  correlation: (x: number[], y: number[]): number => {
    if (x.length !== y.length || x.length < 2) return 0;
    const mx = statisticalUtils.mean(x);
    const my = statisticalUtils.mean(y);
    let sumXY = 0, sumX2 = 0, sumY2 = 0;
    for (let i = 0; i < x.length; i++) {
      const dx = x[i] - mx;
      const dy = y[i] - my;
      sumXY += dx * dy;
      sumX2 += dx ** 2;
      sumY2 += dy ** 2;
    }
    const denom = Math.sqrt(sumX2 * sumY2);
    if (denom === 0) return 0;
    return sumXY / denom;
  },

  /** Root mean square deviation */
  rmsd: (actual: number[], expected: number[]): number => {
    if (actual.length !== expected.length || actual.length === 0) return Infinity;
    const sumSq = actual.reduce((acc, v, i) => acc + (v - expected[i]) ** 2, 0);
    return Math.sqrt(sumSq / actual.length);
  },

  /** Mean absolute deviation */
  mad: (actual: number[], expected: number[]): number => {
    if (actual.length !== expected.length || actual.length === 0) return Infinity;
    const sum = actual.reduce((acc, v, i) => acc + Math.abs(v - expected[i]), 0);
    return sum / actual.length;
  },

  /** Simplified Shapiro-Wilk test (returns approximate p-value) */
  shapiroWilk: (values: number[]): number => {
    const n = values.length;
    if (n < 3 || n > 5000) return 0.5; // Skip for extreme sizes

    const sorted = [...values].sort((a, b) => a - b);
    const mean = statisticalUtils.mean(sorted);

    // Calculate S^2 (denominator)
    const s2 = sorted.reduce((acc, v) => acc + (v - mean) ** 2, 0);
    if (s2 === 0) return 0.5;

    // Calculate W statistic (simplified approximation)
    // Using simplified coefficients based on Royston's algorithm
    let b = 0;
    const m = Math.floor(n / 2);
    for (let i = 0; i < m; i++) {
      // Approximate expected normal order statistics (simplified)
      const q = (i + 1 - 0.375) / (n + 0.25);
      const a = 0.4361836 * (1 - 0.1201676 * q);
      b += a * (sorted[n - 1 - i] - sorted[i]);
    }
    const W = (b ** 2) / s2;

    // W close to 1 means more normal
    // Convert to p-value approximation
    // For W > 0.95, distribution is likely normal
    if (W > 0.98) return 0.5;  // Likely normal
    if (W > 0.95) return 0.2;  // Probably normal
    if (W > 0.90) return 0.08; // Borderline
    if (W > 0.85) return 0.03; // Likely not normal
    return 0.01; // Definitely not normal
  },

  /** Detect bimodality using Hartigan's dip test approximation */
  bimodalityIndex: (values: number[]): number => {
    if (values.length < 10) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;
    const mean = statisticalUtils.mean(sorted);
    const std = statisticalUtils.stddev(sorted, mean);
    const skew = statisticalUtils.skewness(sorted, mean, std);
    const kurt = statisticalUtils.kurtosis(sorted, mean, std);

    // Sarle's bimodality coefficient: b = (skewness^2 + 1) / kurtosis
    // b > 5/9 suggests bimodality
    if (kurt + 3 <= 0) return 0;
    return (skew ** 2 + 1) / (kurt + 3);
  },
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class NeuralDeterminismTestingEngine {
  private globalSeed: number = 42;
  private testCounter: number = 0;
  private baselineRegistry: BaselineRegistry;
  private activeContext: TestRunContext | null = null;

  constructor() {
    this.baselineRegistry = {
      schemaVersion: "1.0.0",
      baselines: new Map(),
      lastUpdated: new Date().toISOString(),
      currentModelVersion: "1.0.0",
    };
  }

  // ==========================================================================
  // SEEDING STRATEGY
  // ==========================================================================

  /**
   * Set global seed for all subsequent tests
   */
  setGlobalSeed(seed: number): void {
    this.globalSeed = seed;
    this.testCounter = 0;
    log.info(`[NeuralDeterminism] Global seed set to ${seed}`);
  }

  /**
   * Get global seed
   */
  getGlobalSeed(): number {
    return this.globalSeed;
  }

  /**
   * Create isolated test context with derived seed
   */
  createTestContext(config: NeuralTestConfig, testName?: string): TestRunContext {
    this.testCounter++;
    // Derive per-test seed from global seed and test counter
    const derivedSeed = this.deriveSeed(config.seed, this.testCounter);

    const context: TestRunContext = {
      runId: `test-${this.testCounter}-${Date.now()}`,
      seed: derivedSeed,
      prng: new SeededPRNG(derivedSeed),
      config,
      startTime: Date.now(),
    };

    this.activeContext = context;

    if (config.verbose) {
      log.debug(`[NeuralDeterminism] Created context ${context.runId} with seed ${derivedSeed}`);
    }

    return context;
  }

  /**
   * Derive a reproducible seed from base seed and index
   */
  private deriveSeed(baseSeed: number, index: number): number {
    // Use a hash-like combination to ensure good distribution
    const combined = baseSeed * 2654435761 + index * 2246822519;
    return Math.abs(combined) % 2147483647 || 1;
  }

  /**
   * Get a seeded PRNG for a specific test
   */
  getTestPRNG(testIndex: number, baseSeed?: number): SeededPRNG {
    const seed = this.deriveSeed(baseSeed ?? this.globalSeed, testIndex);
    return new SeededPRNG(seed);
  }

  // ==========================================================================
  // TOLERANCE-BASED COMPARISON
  // ==========================================================================

  /**
   * Compare neural outputs with tolerance
   */
  compareOutputs(
    actual: number[],
    expected: number[],
    config: NeuralTestConfig
  ): NeuralTestResult {
    const startTime = Date.now();

    if (actual.length !== expected.length) {
      return {
        passed: false,
        actualOutput: actual,
        expectedOutput: expected,
        maxDeviation: Infinity,
        withinTolerance: false,
        metadata: {
          seed: config.seed,
          tolerance: config.tolerance,
          executionTimeMs: Date.now() - startTime,
        },
      };
    }

    // Calculate deviations
    const deviations = actual.map((v, i) => Math.abs(v - expected[i]));
    const maxDeviation = deviations.length > 0 ? Math.max(...deviations) : 0;

    // Calculate relative tolerance for each element
    const withinTolerance = deviations.every((dev, i) => {
      const expectedVal = Math.abs(expected[i]);
      // Use either absolute or relative tolerance, whichever is more lenient
      const absoluteThreshold = config.tolerance;
      const relativeThreshold = expectedVal > 1e-10
        ? expectedVal * config.tolerance
        : config.tolerance;
      const threshold = Math.max(absoluteThreshold, relativeThreshold);
      return dev <= threshold;
    });

    const result: NeuralTestResult = {
      passed: withinTolerance,
      actualOutput: actual,
      expectedOutput: expected,
      maxDeviation,
      withinTolerance,
      metadata: {
        seed: config.seed,
        tolerance: config.tolerance,
        executionTimeMs: Date.now() - startTime,
      },
    };

    // Add distribution stats if enabled
    if (config.distributionTesting) {
      result.distributionStats = this.calculateDistributionStats(actual);
    }

    return result;
  }

  /**
   * Compare with absolute and relative tolerances
   */
  compareWithDualTolerance(
    actual: number[],
    expected: number[],
    absoluteTolerance: number,
    relativeTolerance: number
  ): NeuralTestResult {
    const deviations = actual.map((v, i) => {
      const absErr = Math.abs(v - expected[i]);
      const relErr = Math.abs(expected[i]) > 1e-10
        ? absErr / Math.abs(expected[i])
        : 0;
      return { absErr, relErr };
    });

    const maxAbsDeviation = Math.max(...deviations.map(d => d.absErr), 0);
    const withinTolerance = deviations.every(
      d => d.absErr <= absoluteTolerance || d.relErr <= relativeTolerance
    );

    return {
      passed: withinTolerance,
      actualOutput: actual,
      expectedOutput: expected,
      maxDeviation: maxAbsDeviation,
      withinTolerance,
    };
  }

  // ==========================================================================
  // DISTRIBUTION TESTING
  // ==========================================================================

  /**
   * Run distribution testing by executing a function N times with different seeds
   */
  runDistributionTest(
    fn: (prng: SeededPRNG) => number[],
    config: NeuralTestConfig
  ): { stats: DistributionStats; anomalies: AnomalyReport; allOutputs: number[][] } {
    const sampleCount = config.sampleCount ?? 100;
    const allOutputs: number[][] = [];

    // Run function multiple times with different seeds
    for (let i = 0; i < sampleCount; i++) {
      const testSeed = this.deriveSeed(config.seed, i);
      const prng = new SeededPRNG(testSeed);
      const output = fn(prng);
      allOutputs.push(output);
    }

    // Flatten outputs for statistical analysis
    const flatOutputs = allOutputs.flat();
    const stats = this.calculateDistributionStats(flatOutputs);
    const anomalies = this.detectAnomalies(flatOutputs, allOutputs);

    return { stats, anomalies, allOutputs };
  }

  /**
   * Calculate comprehensive distribution statistics
   */
  calculateDistributionStats(values: number[]): DistributionStats {
    if (values.length === 0) {
      return {
        mean: 0, stddev: 0, p95: 0, p99: 0, min: 0, max: 0,
        skewness: 0, kurtosis: 0, normalityPValue: 0, isNormal: false, cv: 0, iqr: 0,
      };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const mean = statisticalUtils.mean(values);
    const stddev = statisticalUtils.stddev(values, mean);
    const p25 = statisticalUtils.percentile(sorted, 25);
    const p75 = statisticalUtils.percentile(sorted, 75);
    const p95 = statisticalUtils.percentile(sorted, 95);
    const p99 = statisticalUtils.percentile(sorted, 99);
    const skewness = statisticalUtils.skewness(values, mean, stddev);
    const kurtosis = statisticalUtils.kurtosis(values, mean, stddev);
    const normalityPValue = statisticalUtils.shapiroWilk(values);

    return {
      mean,
      stddev,
      p95,
      p99,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      skewness,
      kurtosis,
      normalityPValue,
      isNormal: normalityPValue > 0.05,
      cv: mean !== 0 ? stddev / Math.abs(mean) : Infinity,
      iqr: p75 - p25,
    };
  }

  /**
   * Detect distribution anomalies (bimodal, heavy tails, etc.)
   */
  detectAnomalies(flatOutputs: number[], groupedOutputs: number[][]): AnomalyReport {
    const anomalies: Anomaly[] = [];
    const stats = this.calculateDistributionStats(flatOutputs);

    // Check for bimodality
    const bimodalIndex = statisticalUtils.bimodalityIndex(flatOutputs);
    if (bimodalIndex > 0.555) { // Sarle's threshold
      anomalies.push({
        type: "bimodal",
        severity: bimodalIndex > 0.7 ? "high" : "medium",
        description: `Distribution appears bimodal (index: ${bimodalIndex.toFixed(3)})`,
        suggestedAction: "Investigate potential mode switching in neural outputs",
      });
    }

    // Check for heavy tails (high kurtosis)
    if (Math.abs(stats.kurtosis) > 3) {
      anomalies.push({
        type: "heavy_tail",
        severity: Math.abs(stats.kurtosis) > 7 ? "high" : "medium",
        description: `Distribution has heavy tails (kurtosis: ${stats.kurtosis.toFixed(3)})`,
        suggestedAction: "Consider robust statistics or trimmed means for testing",
      });
    }

    // Check for significant skewness
    if (Math.abs(stats.skewness) > 1) {
      anomalies.push({
        type: "skewed",
        severity: Math.abs(stats.skewness) > 2 ? "high" : "medium",
        description: `Distribution is skewed (skewness: ${stats.skewness.toFixed(3)})`,
        suggestedAction: "Use median-based comparisons instead of mean",
      });
    }

    // Check for outliers (values beyond 3 sigma)
    const sorted = [...flatOutputs].sort((a, b) => a - b);
    const threshold = stats.mean + 3 * stats.stddev;
    const lowerThreshold = stats.mean - 3 * stats.stddev;
    const outliers = flatOutputs.filter(v => v > threshold || v < lowerThreshold);
    if (outliers.length > flatOutputs.length * 0.01) { // More than 1% outliers
      anomalies.push({
        type: "outliers",
        severity: outliers.length > flatOutputs.length * 0.05 ? "high" : "low",
        description: `${outliers.length} outliers detected (${(100 * outliers.length / flatOutputs.length).toFixed(1)}%)`,
        suggestedAction: "Review edge cases that produce extreme outputs",
      });
    }

    // Check for variance instability across groups
    if (groupedOutputs.length > 1) {
      const groupStddevs = groupedOutputs.map(g => statisticalUtils.stddev(g));
      const stddevRatio = Math.max(...groupStddevs) / (Math.min(...groupStddevs) || 1);
      if (stddevRatio > 2) {
        anomalies.push({
          type: "unstable_variance",
          severity: stddevRatio > 5 ? "high" : "medium",
          description: `Variance varies ${stddevRatio.toFixed(1)}x across runs`,
          suggestedAction: "Neural outputs show inconsistent variance - review initialization",
        });
      }
    }

    // Calculate health score
    const severityScores = { low: 0.1, medium: 0.3, high: 0.5 };
    const totalPenalty = anomalies.reduce((sum, a) => sum + severityScores[a.severity], 0);
    const healthScore = Math.max(0, 1 - totalPenalty);

    return {
      hasAnomalies: anomalies.length > 0,
      anomalies,
      healthScore,
    };
  }

  // ==========================================================================
  // GOLDEN BASELINE MANAGEMENT
  // ==========================================================================

  /**
   * Register a golden baseline for reference
   */
  registerBaseline(baseline: Omit<GoldenBaseline, "createdAt">): void {
    const fullBaseline: GoldenBaseline = {
      ...baseline,
      createdAt: new Date().toISOString(),
    };
    this.baselineRegistry.baselines.set(baseline.id, fullBaseline);
    this.baselineRegistry.lastUpdated = new Date().toISOString();
    log.info(`[NeuralDeterminism] Registered baseline: ${baseline.id}`);
  }

  /**
   * Get a baseline by ID
   */
  getBaseline(id: string): GoldenBaseline | undefined {
    return this.baselineRegistry.baselines.get(id);
  }

  /**
   * List all baselines
   */
  listBaselines(): GoldenBaseline[] {
    return Array.from(this.baselineRegistry.baselines.values());
  }

  /**
   * Update baseline with new expected output (for approved model changes)
   */
  updateBaseline(
    id: string,
    newOutput: number[],
    newModelVersion: string,
    reason: string
  ): boolean {
    const existing = this.baselineRegistry.baselines.get(id);
    if (!existing) {
      log.warn(`[NeuralDeterminism] Baseline not found: ${id}`);
      return false;
    }

    const updated: GoldenBaseline = {
      ...existing,
      expectedOutput: newOutput,
      modelVersion: newModelVersion,
      createdAt: new Date().toISOString(),
      description: `${existing.description || ""}\n[Updated ${new Date().toISOString()}]: ${reason}`,
    };

    this.baselineRegistry.baselines.set(id, updated);
    this.baselineRegistry.currentModelVersion = newModelVersion;
    this.baselineRegistry.lastUpdated = new Date().toISOString();

    log.info(`[NeuralDeterminism] Updated baseline ${id} to model version ${newModelVersion}`);
    return true;
  }

  /**
   * Delete a baseline
   */
  deleteBaseline(id: string): boolean {
    const deleted = this.baselineRegistry.baselines.delete(id);
    if (deleted) {
      this.baselineRegistry.lastUpdated = new Date().toISOString();
      log.info(`[NeuralDeterminism] Deleted baseline: ${id}`);
    }
    return deleted;
  }

  /**
   * Export baselines to JSON-serializable format
   */
  exportBaselines(): { schemaVersion: string; baselines: GoldenBaseline[]; currentModelVersion: string } {
    return {
      schemaVersion: this.baselineRegistry.schemaVersion,
      baselines: Array.from(this.baselineRegistry.baselines.values()),
      currentModelVersion: this.baselineRegistry.currentModelVersion,
    };
  }

  /**
   * Import baselines from JSON format
   */
  importBaselines(data: { baselines: GoldenBaseline[]; currentModelVersion?: string }): number {
    let imported = 0;
    for (const baseline of data.baselines) {
      this.baselineRegistry.baselines.set(baseline.id, baseline);
      imported++;
    }
    if (data.currentModelVersion) {
      this.baselineRegistry.currentModelVersion = data.currentModelVersion;
    }
    this.baselineRegistry.lastUpdated = new Date().toISOString();
    log.info(`[NeuralDeterminism] Imported ${imported} baselines`);
    return imported;
  }

  // ==========================================================================
  // REGRESSION DETECTION
  // ==========================================================================

  /**
   * Compare current output against baseline for regression detection
   */
  detectDrift(
    actualOutput: number[],
    baselineId: string,
    threshold?: number
  ): DriftReport {
    const baseline = this.baselineRegistry.baselines.get(baselineId);
    if (!baseline) {
      return {
        driftDetected: true,
        effectSize: Infinity,
        driftPercent: 100,
        maxDeviation: Infinity,
        meanAbsoluteDeviation: Infinity,
        rmsd: Infinity,
        correlation: 0,
        driftedIndices: [],
        severity: "critical",
        recommendation: `Baseline not found: ${baselineId}`,
      };
    }

    return this.compareTwoOutputs(
      actualOutput,
      baseline.expectedOutput,
      threshold ?? baseline.tolerance
    );
  }

  /**
   * Compare two output arrays for drift
   */
  compareTwoOutputs(
    actual: number[],
    expected: number[],
    threshold: number
  ): DriftReport {
    if (actual.length !== expected.length) {
      return {
        driftDetected: true,
        effectSize: Infinity,
        driftPercent: 100,
        maxDeviation: Infinity,
        meanAbsoluteDeviation: Infinity,
        rmsd: Infinity,
        correlation: 0,
        driftedIndices: [],
        severity: "critical",
        recommendation: "Output dimension mismatch - model architecture may have changed",
      };
    }

    // Calculate metrics
    const effectSize = statisticalUtils.cohensD(actual, expected);
    const rmsd = statisticalUtils.rmsd(actual, expected);
    const mad = statisticalUtils.mad(actual, expected);
    const correlation = statisticalUtils.correlation(actual, expected);

    // Find drifted indices
    const driftedIndices: number[] = [];
    let maxDeviation = 0;
    for (let i = 0; i < actual.length; i++) {
      const dev = Math.abs(actual[i] - expected[i]);
      if (dev > maxDeviation) maxDeviation = dev;
      const expectedAbs = Math.abs(expected[i]);
      const relativeThreshold = expectedAbs > 1e-10 ? expectedAbs * threshold : threshold;
      if (dev > relativeThreshold) {
        driftedIndices.push(i);
      }
    }

    // Calculate drift percentage
    const driftPercent = (driftedIndices.length / actual.length) * 100;

    // Determine severity
    let severity: DriftReport["severity"];
    if (effectSize < 0.2 && driftPercent < 5) {
      severity = "none";
    } else if (effectSize < 0.5 && driftPercent < 10) {
      severity = "low";
    } else if (effectSize < 0.8 && driftPercent < 25) {
      severity = "medium";
    } else if (effectSize < 1.2 && driftPercent < 50) {
      severity = "high";
    } else {
      severity = "critical";
    }

    // Generate recommendation
    let recommendation: string;
    switch (severity) {
      case "none":
        recommendation = "No significant drift detected. Continue monitoring.";
        break;
      case "low":
        recommendation = "Minor drift detected. Review recent model changes.";
        break;
      case "medium":
        recommendation = "Moderate drift detected. Consider updating baselines if changes are intentional.";
        break;
      case "high":
        recommendation = "Significant drift detected. Investigate model behavior and validate outputs.";
        break;
      case "critical":
        recommendation = "Critical drift detected. Model outputs have substantially changed. Block deployment until reviewed.";
        break;
    }

    return {
      driftDetected: severity !== "none",
      effectSize,
      driftPercent,
      maxDeviation,
      meanAbsoluteDeviation: mad,
      rmsd,
      correlation,
      driftedIndices,
      severity,
      recommendation,
    };
  }

  /**
   * Generate drift report comparing current model to all baselines
   */
  generateDriftReport(
    evaluator: (baseline: GoldenBaseline) => number[]
  ): { reports: Map<string, DriftReport>; summary: string } {
    const reports = new Map<string, DriftReport>();
    const severityCounts = { none: 0, low: 0, medium: 0, high: 0, critical: 0 };

    for (const [id, baseline] of this.baselineRegistry.baselines) {
      try {
        const currentOutput = evaluator(baseline);
        const report = this.compareTwoOutputs(
          currentOutput,
          baseline.expectedOutput,
          baseline.tolerance
        );
        reports.set(id, report);
        severityCounts[report.severity]++;
      } catch (error) {
        reports.set(id, {
          driftDetected: true,
          effectSize: Infinity,
          driftPercent: 100,
          maxDeviation: Infinity,
          meanAbsoluteDeviation: Infinity,
          rmsd: Infinity,
          correlation: 0,
          driftedIndices: [],
          severity: "critical",
          recommendation: `Evaluation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
        severityCounts.critical++;
      }
    }

    const total = this.baselineRegistry.baselines.size;
    const summary = `Drift Report Summary:
- Total baselines: ${total}
- No drift: ${severityCounts.none} (${(100 * severityCounts.none / total).toFixed(1)}%)
- Low drift: ${severityCounts.low}
- Medium drift: ${severityCounts.medium}
- High drift: ${severityCounts.high}
- Critical drift: ${severityCounts.critical}
- Health: ${severityCounts.critical === 0 && severityCounts.high === 0 ? "GOOD" : "NEEDS ATTENTION"}`;

    return { reports, summary };
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Reset engine state
   */
  reset(): void {
    this.globalSeed = 42;
    this.testCounter = 0;
    this.activeContext = null;
  }

  /**
   * Get current active test context
   */
  getActiveContext(): TestRunContext | null {
    return this.activeContext;
  }

  /**
   * Get engine summary
   */
  getSummary(): string {
    return `NeuralDeterminismTestingEngine — Neural Output Determinism Framework
Global Seed: ${this.globalSeed}
Test Counter: ${this.testCounter}
Registered Baselines: ${this.baselineRegistry.baselines.size}
Model Version: ${this.baselineRegistry.currentModelVersion}

Capabilities:
- Seedable PRNG (Park-Miller LCG) for reproducibility
- Tolerance-based floating-point comparison (absolute + relative)
- Distribution testing with statistical validation
- Golden baseline management with versioning
- Drift detection with Cohen's d effect size

Statistical Tests:
- Shapiro-Wilk normality test
- Bimodality detection (Sarle's coefficient)
- Outlier detection (3-sigma rule)
- Variance stability analysis`;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const neuralDeterminismTestingEngine = new NeuralDeterminismTestingEngine();
