// @ts-nocheck
/**
 * StrategyRankingUpdateEngine — CAMX-MS15/U02 (E1151)
 *
 * Bayesian updating of strategy rankings from actual machining results.
 * Uses Wilson score confidence interval for conservative, sample-size-aware
 * ranking. Supports per-material and per-tool calibration so rankings improve
 * with each observed outcome.
 *
 * Mathematics:
 *   Wilson score lower bound (Agresti-Coull style, z=1.96 for 95% CI):
 *     p̂  = (successes + z²/2) / (n + z²)
 *     ci  = z · sqrt(p̂(1−p̂) / (n + z²))
 *     lower = p̂ − ci
 *
 *   Per-(strategy, material, tool) sufficient stats maintained:
 *     n, successes, sum_cycle_ratio, sum_tool_life_ratio
 *
 *   Cycle-time accuracy score (0–1):
 *     cycle_score = clamp(actual / predicted, 0.5, 2.0) mapped to [0,1]
 *     1.0 = perfectly on-target, 0.0 = 2× over or 0.5× under
 *
 *   Tool-life accuracy score (0–1):
 *     life_score  = clamp(actual / predicted, 0.5, 2.0) mapped to [0,1]
 *
 * References:
 *   - Wilson (1927) — Score interval for binomial proportions
 *   - Agresti & Coull (1998) — "Approximate is better than exact"
 *   - Welford (1962) — Online variance, used for running means
 *
 * @module StrategyRankingUpdateEngine
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// ============================================================================
// TYPES
// ============================================================================

/** Outcome of a single machining run */
export interface StrategyOutcome {
  /** Whether the part was accepted and no tool breakage occurred */
  success: boolean;
  /** Actual cycle time measured [min] */
  cycle_time_actual?: number;
  /** Predicted cycle time from CAM system [min] */
  cycle_time_predicted?: number;
  /** Actual tool life consumed [min] */
  tool_life_actual?: number;
  /** Predicted tool life [min] */
  tool_life_predicted?: number;
}

/** Per-(strategy, material, tool) sufficient statistics */
export interface StrategySufficientStats {
  /** Total observation count */
  n: number;
  /** Successful outcomes (part OK, no breakage) */
  successes: number;
  /** Running sum of cycle-time accuracy scores */
  sum_cycle_score: number;
  /** Running sum of tool-life accuracy scores */
  sum_life_score: number;
  /** Last observed timestamp (epoch ms) */
  last_updated: number;
}

/** Wilson score ranking entry */
export interface StrategyRankEntry {
  strategy: string;
  material: string;
  tool: string;
  /** Observation count */
  n: number;
  /** Raw success rate */
  success_rate: number;
  /** Wilson score lower bound (conservative rank key) */
  wilson_lower: number;
  /** Wilson score upper bound */
  wilson_upper: number;
  /** Mean cycle-time accuracy (1.0 = perfect) */
  mean_cycle_accuracy: number;
  /** Mean tool-life accuracy (1.0 = perfect) */
  mean_life_accuracy: number;
  /** Composite score: 0.5*wilson + 0.25*cycle + 0.25*life */
  composite_score: number;
  /** Confidence tier based on sample count */
  confidence: "none" | "low" | "medium" | "high";
}

/** Confidence info for a (strategy, material) pair */
export interface StrategyConfidence {
  strategy: string;
  material: string;
  tool: string;
  n: number;
  /** Wilson 95% CI width (upper - lower) */
  ci_width: number;
  wilson_lower: number;
  wilson_upper: number;
  confidence: "none" | "low" | "medium" | "high";
}

/** Persistence store shape */
interface PersistenceStore {
  version: number;
  stats: Record<string, StrategySufficientStats>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const Z_95 = 1.96; // z-score for 95% CI
const Z2 = Z_95 * Z_95; // z² = 3.8416

// ============================================================================
// HELPERS
// ============================================================================

/** Build composite key */
function makeKey(strategy: string, material: string, tool: string): string {
  return `${strategy.toLowerCase()}|${material.toLowerCase()}|${tool.toLowerCase()}`;
}

/**
 * Wilson score interval for binomial proportion.
 * Returns [lower, upper] CI bounds.
 */
function wilsonCI(successes: number, n: number): [number, number] {
  if (n === 0) return [0, 1];
  const p = successes / n;
  const center = (p + Z2 / (2 * n)) / (1 + Z2 / n);
  const margin = (Z_95 / (1 + Z2 / n)) * Math.sqrt(p * (1 - p) / n + Z2 / (4 * n * n));
  return [Math.max(0, center - margin), Math.min(1, center + margin)];
}

/**
 * Map a ratio (actual/predicted) to an accuracy score [0, 1].
 * ratio = 1.0 → score = 1.0 (perfect)
 * ratio = 0.5 or 2.0 → score = 0.0 (worst)
 */
function ratioToAccuracyScore(ratio: number): number {
  // Clamp to [0.5, 2.0]
  const r = Math.max(0.5, Math.min(2.0, ratio));
  // Map 0.5→0, 1.0→1, 2.0→0 using a tent function
  if (r <= 1.0) {
    return (r - 0.5) / 0.5; // 0.5→0, 1.0→1
  } else {
    return (2.0 - r) / 1.0; // 1.0→1, 2.0→0
  }
}

/** Derive confidence tier from sample count */
function confidenceTier(n: number): "none" | "low" | "medium" | "high" {
  if (n === 0) return "none";
  if (n < 5) return "low";
  if (n < 20) return "medium";
  return "high";
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class StrategyRankingUpdateEngine {
  private stats: Map<string, StrategySufficientStats> = new Map();
  private persistPath: string;

  constructor(persistPath?: string) {
    this.persistPath = persistPath ?? path.join(os.homedir(), ".prism", "strategy-ranking-update.json");
    this._load();
  }

  // --------------------------------------------------------------------------
  // PUBLIC API
  // --------------------------------------------------------------------------

  /**
   * Record an actual machining result for a strategy/material/tool combination.
   * Updates Bayesian sufficient statistics in-place and persists.
   */
  recordResult(
    strategy: string,
    material: string,
    tool: string,
    outcome: StrategyOutcome,
  ): { key: string; updated_stats: StrategySufficientStats } {
    const key = makeKey(strategy, material, tool);
    const existing = this.stats.get(key) ?? {
      n: 0,
      successes: 0,
      sum_cycle_score: 0,
      sum_life_score: 0,
      last_updated: 0,
    };

    // Update counts
    existing.n += 1;
    if (outcome.success) existing.successes += 1;

    // Update cycle-time accuracy
    if (
      outcome.cycle_time_actual != null &&
      outcome.cycle_time_predicted != null &&
      outcome.cycle_time_predicted > 0
    ) {
      const ratio = outcome.cycle_time_actual / outcome.cycle_time_predicted;
      existing.sum_cycle_score += ratioToAccuracyScore(ratio);
    } else {
      // No prediction available — treat as neutral 0.5
      existing.sum_cycle_score += 0.5;
    }

    // Update tool-life accuracy
    if (
      outcome.tool_life_actual != null &&
      outcome.tool_life_predicted != null &&
      outcome.tool_life_predicted > 0
    ) {
      const ratio = outcome.tool_life_actual / outcome.tool_life_predicted;
      existing.sum_life_score += ratioToAccuracyScore(ratio);
    } else {
      existing.sum_life_score += 0.5;
    }

    existing.last_updated = Date.now();
    this.stats.set(key, existing);
    this._save();

    return { key, updated_stats: { ...existing } };
  }

  /**
   * Get strategies ranked by Wilson score lower bound.
   * Optionally filter by material and/or feature_type (stored in tool field prefix).
   */
  getRanking(
    material?: string,
    feature_type?: string,
  ): StrategyRankEntry[] {
    const entries: StrategyRankEntry[] = [];

    for (const [key, stats] of this.stats) {
      const [strategy, mat, tool] = key.split("|");

      // Filter by material
      if (material && mat !== material.toLowerCase()) continue;
      // Filter by feature_type prefix in tool string
      if (feature_type && !tool.startsWith(feature_type.toLowerCase())) continue;

      const [wilson_lower, wilson_upper] = wilsonCI(stats.successes, stats.n);
      const success_rate = stats.n > 0 ? stats.successes / stats.n : 0;
      const mean_cycle_accuracy = stats.n > 0 ? stats.sum_cycle_score / stats.n : 0.5;
      const mean_life_accuracy = stats.n > 0 ? stats.sum_life_score / stats.n : 0.5;

      // Composite: Wilson lower bound dominates (50%), rest equally split
      const composite_score =
        0.5 * wilson_lower + 0.25 * mean_cycle_accuracy + 0.25 * mean_life_accuracy;

      entries.push({
        strategy,
        material: mat,
        tool,
        n: stats.n,
        success_rate,
        wilson_lower,
        wilson_upper,
        mean_cycle_accuracy,
        mean_life_accuracy,
        composite_score,
        confidence: confidenceTier(stats.n),
      });
    }

    // Sort: primary = composite_score desc, secondary = n desc (more data first on ties)
    entries.sort((a, b) => {
      if (Math.abs(b.composite_score - a.composite_score) > 1e-9) {
        return b.composite_score - a.composite_score;
      }
      return b.n - a.n;
    });

    return entries;
  }

  /**
   * Get confidence information for a specific (strategy, material, tool) triple.
   */
  getConfidence(
    strategy: string,
    material: string,
    tool: string = "*",
  ): StrategyConfidence {
    const key = makeKey(strategy, material, tool);
    const stats = this.stats.get(key);

    if (!stats) {
      return {
        strategy,
        material,
        tool,
        n: 0,
        ci_width: 1.0,
        wilson_lower: 0,
        wilson_upper: 1,
        confidence: "none",
      };
    }

    const [lower, upper] = wilsonCI(stats.successes, stats.n);
    return {
      strategy,
      material,
      tool,
      n: stats.n,
      ci_width: upper - lower,
      wilson_lower: lower,
      wilson_upper: upper,
      confidence: confidenceTier(stats.n),
    };
  }

  /**
   * Return all tracked (strategy, material, tool) keys.
   */
  listTracked(): string[] {
    return Array.from(this.stats.keys());
  }

  /**
   * Reset stats for a specific key (or all if no args given).
   */
  reset(strategy?: string, material?: string, tool?: string): void {
    if (strategy && material && tool) {
      this.stats.delete(makeKey(strategy, material, tool));
    } else {
      this.stats.clear();
    }
    this._save();
  }

  // --------------------------------------------------------------------------
  // PERSISTENCE
  // --------------------------------------------------------------------------

  private _load(): void {
    try {
      if (fs.existsSync(this.persistPath)) {
        const raw = fs.readFileSync(this.persistPath, "utf8");
        const store: PersistenceStore = JSON.parse(raw);
        if (store.version === 1 && store.stats) {
          for (const [k, v] of Object.entries(store.stats)) {
            this.stats.set(k, v as StrategySufficientStats);
          }
        }
      }
    } catch {
      // Silent on load failure — start fresh
    }
  }

  private _save(): void {
    try {
      const dir = path.dirname(this.persistPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const store: PersistenceStore = {
        version: 1,
        stats: Object.fromEntries(this.stats),
      };
      fs.writeFileSync(this.persistPath, JSON.stringify(store, null, 2), "utf8");
    } catch {
      // Silent on save failure
    }
  }
}

// Singleton export
export const strategyRankingUpdateEngine = new StrategyRankingUpdateEngine();
