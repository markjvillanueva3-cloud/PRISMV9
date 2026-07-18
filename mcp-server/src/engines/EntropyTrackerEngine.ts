/**
 * EntropyTrackerEngine — USSH Phase 0.25 / U-SCI07
 * =================================================
 *
 * Shannon entropy tracking for asset space diversity.
 * Monitors whether the system is converging on narrow patterns
 * or maintaining healthy diversity.
 *
 * Theory:
 *   - Shannon entropy: H(X) = -Σ p(x)·log₂(p(x))
 *   - Maximum entropy = log₂(n) for uniform distribution
 *   - Normalized entropy: H/H_max ∈ [0,1]
 *   - Low entropy = concentrated patterns (concerning)
 *   - High entropy = diverse coverage (healthy)
 *
 * MIT 6.050J / 6.441 / Information Theory foundations
 *
 * @module engines/EntropyTrackerEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Asset distribution snapshot */
export interface AssetDistribution {
  engines: number;
  actions: number;
  formulas: number;
  hooks: number;
  skills: number;
  scripts: number;
  dispatchers: number;
  total: number;
}

/** Domain distribution */
export interface DomainDistribution {
  force: number;
  thermal: number;
  surface: number;
  tool_life: number;
  stability: number;
  safety: number;
  quality: number;
  business: number;
  cad_cam: number;
  infrastructure: number;
  total: number;
}

/** Entropy measurement */
export interface EntropyMeasurement {
  timestamp: number;
  entropy: number;            // H(X) in bits
  maxEntropy: number;         // log₂(n)
  normalizedEntropy: number;  // H(X) / H_max ∈ [0,1]
  categories: string[];
  probabilities: number[];
  dominantCategory: string;
  dominantShare: number;
}

/** Entropy trend analysis */
export interface EntropyTrend {
  direction: "increasing" | "decreasing" | "stable";
  rate: number;               // bits per hour
  isHealthy: boolean;
  recommendation: string;
  historicalMean: number;
  historicalStd: number;
  currentDeviation: number;   // standard deviations from mean
}

/** Full entropy report */
export interface EntropyReport {
  timestamp: number;
  assetTypeEntropy: EntropyMeasurement;
  domainEntropy: EntropyMeasurement;
  trend: EntropyTrend;
  diversity: {
    giniIndex: number;        // 0 = equal, 1 = concentrated
    simpsonIndex: number;     // probability of two random picks being same
    effectiveCategories: number;  // exp(H) — equivalent number of equal categories
  };
  alerts: string[];
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class EntropyTrackerEngine {
  private history: EntropyMeasurement[] = [];
  private readonly maxHistory = 1000;
  private readonly healthyEntropyFloor = 0.6; // Normalized entropy should stay above this

  /**
   * Compute Shannon entropy
   */
  private computeEntropy(counts: number[]): number {
    const total = counts.reduce((a, b) => a + b, 0);
    if (total === 0) return 0;

    let entropy = 0;
    for (const count of counts) {
      if (count > 0) {
        const p = count / total;
        entropy -= p * Math.log2(p);
      }
    }

    return entropy;
  }

  /**
   * Compute maximum entropy
   */
  private maxEntropy(n: number): number {
    return n > 0 ? Math.log2(n) : 0;
  }

  /**
   * Compute Gini index
   */
  private computeGini(counts: number[]): number {
    const n = counts.length;
    const total = counts.reduce((a, b) => a + b, 0);
    if (total === 0 || n <= 1) return 0;

    const sorted = [...counts].sort((a, b) => a - b);
    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += (2 * (i + 1) - n - 1) * sorted[i];
    }

    return sum / (n * total);
  }

  /**
   * Compute Simpson's diversity index
   */
  private computeSimpson(counts: number[]): number {
    const total = counts.reduce((a, b) => a + b, 0);
    if (total <= 1) return 0;

    let sum = 0;
    for (const count of counts) {
      sum += count * (count - 1);
    }

    return sum / (total * (total - 1));
  }

  /**
   * Measure asset type entropy
   */
  measureAssetTypeEntropy(dist: AssetDistribution): EntropyMeasurement {
    const categories = ["engines", "actions", "formulas", "hooks", "skills", "scripts", "dispatchers"];
    const counts = [
      dist.engines,
      dist.actions,
      dist.formulas,
      dist.hooks,
      dist.skills,
      dist.scripts,
      dist.dispatchers
    ];

    const total = counts.reduce((a, b) => a + b, 0);
    const probabilities = counts.map(c => c / total);

    const entropy = this.computeEntropy(counts);
    const maxEnt = this.maxEntropy(categories.length);

    const maxIdx = counts.indexOf(Math.max(...counts));

    const measurement: EntropyMeasurement = {
      timestamp: Date.now(),
      entropy,
      maxEntropy: maxEnt,
      normalizedEntropy: maxEnt > 0 ? entropy / maxEnt : 0,
      categories,
      probabilities,
      dominantCategory: categories[maxIdx],
      dominantShare: probabilities[maxIdx]
    };

    this.history.push(measurement);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    return measurement;
  }

  /**
   * Measure domain entropy
   */
  measureDomainEntropy(dist: DomainDistribution): EntropyMeasurement {
    const categories = [
      "force", "thermal", "surface", "tool_life", "stability",
      "safety", "quality", "business", "cad_cam", "infrastructure"
    ];
    const counts = [
      dist.force,
      dist.thermal,
      dist.surface,
      dist.tool_life,
      dist.stability,
      dist.safety,
      dist.quality,
      dist.business,
      dist.cad_cam,
      dist.infrastructure
    ];

    const total = counts.reduce((a, b) => a + b, 0);
    const probabilities = counts.map(c => c / total);

    const entropy = this.computeEntropy(counts);
    const maxEnt = this.maxEntropy(categories.length);

    const maxIdx = counts.indexOf(Math.max(...counts));

    return {
      timestamp: Date.now(),
      entropy,
      maxEntropy: maxEnt,
      normalizedEntropy: maxEnt > 0 ? entropy / maxEnt : 0,
      categories,
      probabilities,
      dominantCategory: categories[maxIdx],
      dominantShare: probabilities[maxIdx]
    };
  }

  /**
   * Analyze entropy trend
   */
  analyzeTrend(): EntropyTrend {
    if (this.history.length < 5) {
      return {
        direction: "stable",
        rate: 0,
        isHealthy: true,
        recommendation: "Insufficient history for trend analysis",
        historicalMean: 0,
        historicalStd: 0,
        currentDeviation: 0
      };
    }

    const recent = this.history.slice(-20);
    const values = recent.map(m => m.normalizedEntropy);

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
    const std = Math.sqrt(variance);

    const first = values.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
    const last = values.slice(-5).reduce((a, b) => a + b, 0) / 5;
    const timeDiffHours = (recent[recent.length - 1].timestamp - recent[0].timestamp) / 3600000;

    const rate = timeDiffHours > 0 ? (last - first) / timeDiffHours : 0;

    let direction: "increasing" | "decreasing" | "stable";
    if (rate > 0.01) direction = "increasing";
    else if (rate < -0.01) direction = "decreasing";
    else direction = "stable";

    const currentDeviation = std > 0 ? (values[values.length - 1] - mean) / std : 0;
    const isHealthy = values[values.length - 1] >= this.healthyEntropyFloor && direction !== "decreasing";

    let recommendation: string;
    if (!isHealthy && direction === "decreasing") {
      recommendation = "Entropy declining — system converging on narrow patterns. Consider diversifying work.";
    } else if (!isHealthy) {
      recommendation = "Low entropy — asset distribution is concentrated. Balance coverage across types.";
    } else if (direction === "increasing") {
      recommendation = "Healthy entropy growth — maintaining diverse coverage.";
    } else {
      recommendation = "Entropy stable — system in equilibrium.";
    }

    return {
      direction,
      rate,
      isHealthy,
      recommendation,
      historicalMean: mean,
      historicalStd: std,
      currentDeviation
    };
  }

  /**
   * Generate full entropy report
   */
  generateReport(
    assetDist: AssetDistribution,
    domainDist: DomainDistribution
  ): EntropyReport {
    const assetTypeEntropy = this.measureAssetTypeEntropy(assetDist);
    const domainEntropy = this.measureDomainEntropy(domainDist);
    const trend = this.analyzeTrend();

    const assetCounts = [
      assetDist.engines,
      assetDist.actions,
      assetDist.formulas,
      assetDist.hooks,
      assetDist.skills,
      assetDist.scripts,
      assetDist.dispatchers
    ];

    const diversity = {
      giniIndex: this.computeGini(assetCounts),
      simpsonIndex: this.computeSimpson(assetCounts),
      effectiveCategories: Math.exp(assetTypeEntropy.entropy * Math.LN2)
    };

    const alerts: string[] = [];

    if (assetTypeEntropy.normalizedEntropy < this.healthyEntropyFloor) {
      alerts.push(`Asset type entropy ${assetTypeEntropy.normalizedEntropy.toFixed(2)} below threshold ${this.healthyEntropyFloor}`);
    }

    if (domainEntropy.normalizedEntropy < this.healthyEntropyFloor) {
      alerts.push(`Domain entropy ${domainEntropy.normalizedEntropy.toFixed(2)} below threshold ${this.healthyEntropyFloor}`);
    }

    if (assetTypeEntropy.dominantShare > 0.5) {
      alerts.push(`${assetTypeEntropy.dominantCategory} dominates with ${(assetTypeEntropy.dominantShare * 100).toFixed(0)}% share`);
    }

    if (diversity.giniIndex > 0.5) {
      alerts.push(`High Gini index ${diversity.giniIndex.toFixed(2)} — unequal distribution`);
    }

    if (!trend.isHealthy) {
      alerts.push(trend.recommendation);
    }

    const report: EntropyReport = {
      timestamp: Date.now(),
      assetTypeEntropy,
      domainEntropy,
      trend,
      diversity,
      alerts
    };

    if (alerts.length > 0) {
      log.warn(`EntropyTracker: ${alerts.length} alerts — ${alerts[0]}`);
    }

    return report;
  }

  /**
   * Get historical entropy values
   */
  getHistory(): EntropyMeasurement[] {
    return [...this.history];
  }

  /**
   * Check if system is diverse enough
   */
  isDiverse(assetDist: AssetDistribution): boolean {
    const measurement = this.measureAssetTypeEntropy(assetDist);
    return measurement.normalizedEntropy >= this.healthyEntropyFloor;
  }

  /**
   * Get recommendations for improving diversity
   */
  recommendDiversification(assetDist: AssetDistribution): string[] {
    const counts: Array<[string, number]> = [
      ["engines", assetDist.engines],
      ["actions", assetDist.actions],
      ["formulas", assetDist.formulas],
      ["hooks", assetDist.hooks],
      ["skills", assetDist.skills],
      ["scripts", assetDist.scripts],
      ["dispatchers", assetDist.dispatchers]
    ];

    const total = counts.reduce((s, [, c]) => s + c, 0);
    const ideal = total / counts.length;

    const recommendations: string[] = [];
    const sorted = [...counts].sort((a, b) => a[1] - b[1]);

    for (const [category, count] of sorted) {
      if (count < ideal * 0.5) {
        recommendations.push(`Increase ${category}: ${count} is well below ideal ${Math.round(ideal)}`);
      }
    }

    return recommendations;
  }

  /**
   * Reset history
   */
  reset(): void {
    this.history = [];
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const entropyTrackerEngine = new EntropyTrackerEngine();
