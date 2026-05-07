/**
 * HookBanditEngine — USSH Phase 0.25 / U-SCI08
 * =============================================
 *
 * Thompson Sampling multi-armed bandit for intelligent hook selection.
 * With 53+ validation hooks, not all need to run every time.
 * This engine learns which hooks are most valuable and schedules accordingly.
 *
 * Theory:
 *   - Each hook is an arm with unknown reward distribution
 *   - Model each arm with Beta(α, β) posterior
 *   - Thompson Sampling: sample from posteriors, run top-k
 *   - Update based on whether hook caught a real issue
 *
 * MIT 6.262 / 6.867 / Reinforcement Learning foundations
 *
 * @module engines/HookBanditEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Hook arm in the bandit */
export interface HookArm {
  hookId: string;
  name: string;
  category: "safety" | "validation" | "awareness" | "wiring" | "quality" | "performance";
  priority: "critical" | "high" | "medium" | "low";

  alpha: number;        // successes + prior
  beta: number;         // failures + prior

  totalRuns: number;
  totalCatches: number;
  avgExecutionMs: number;

  lastRun?: number;
  lastCatch?: number;
}

/** Selection result */
export interface HookSelection {
  selectedHooks: HookArm[];
  samples: Array<{ hookId: string; sample: number }>;
  exploitFraction: number;  // % chosen by exploitation vs exploration
  budget: {
    requested: number;
    totalTimeMs: number;
    avgTimePerHook: number;
  };
}

/** Update result */
export interface HookUpdateResult {
  hookId: string;
  priorAlpha: number;
  priorBeta: number;
  posteriorAlpha: number;
  posteriorBeta: number;
  estimatedValue: number;  // E[reward]
  uncertainty: number;     // Var[reward]
}

/** Performance report */
export interface BanditReport {
  timestamp: number;
  totalHooks: number;
  totalRuns: number;
  totalCatches: number;
  overallCatchRate: number;
  topPerformers: HookArm[];
  underperformers: HookArm[];
  recommendations: string[];
  regretEstimate: number;  // cumulative regret bound
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

class HookBanditEngine {
  private arms: Map<string, HookArm> = new Map();

  /** Prior parameters — slightly optimistic for exploration */
  private readonly priorAlpha = 2;
  private readonly priorBeta = 1;

  /** Always-run hooks (bypass bandit) */
  private alwaysRun: Set<string> = new Set();

  /**
   * Register a hook as a bandit arm
   */
  registerHook(
    hookId: string,
    name: string,
    category: HookArm["category"],
    priority: HookArm["priority"]
  ): void {
    if (this.arms.has(hookId)) return;

    this.arms.set(hookId, {
      hookId,
      name,
      category,
      priority,
      alpha: this.priorAlpha,
      beta: this.priorBeta,
      totalRuns: 0,
      totalCatches: 0,
      avgExecutionMs: 50
    });

    if (priority === "critical") {
      this.alwaysRun.add(hookId);
    }

    log.debug(`HookBandit: registered ${hookId} (${category}/${priority})`);
  }

  /**
   * Sample from Beta distribution
   */
  private betaSample(alpha: number, beta: number): number {
    const gammaA = this.gammaSample(alpha);
    const gammaB = this.gammaSample(beta);
    return gammaA / (gammaA + gammaB);
  }

  /**
   * Gamma distribution sample (for Beta sampling)
   */
  private gammaSample(shape: number): number {
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

      if (u < 1 - 0.0331 * (x * x) * (x * x)) return d * v;
      if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
    }
  }

  /**
   * Standard normal sample (Box-Muller)
   */
  private normalSample(): number {
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  /**
   * Select top-k hooks via Thompson Sampling
   */
  select(k: number, timeBudgetMs: number = 500): HookSelection {
    const arms = Array.from(this.arms.values());
    const critical = arms.filter(a => this.alwaysRun.has(a.hookId));
    const optional = arms.filter(a => !this.alwaysRun.has(a.hookId));

    const samples = optional.map(arm => ({
      hookId: arm.hookId,
      sample: this.betaSample(arm.alpha, arm.beta)
    }));

    samples.sort((a, b) => b.sample - a.sample);

    let timeUsed = critical.reduce((s, a) => s + a.avgExecutionMs, 0);
    const selected = [...critical];
    const selectedSamples = critical.map(a => ({ hookId: a.hookId, sample: 1.0 }));

    let exploited = 0;
    for (const { hookId, sample } of samples) {
      if (selected.length >= k) break;

      const arm = this.arms.get(hookId)!;
      if (timeUsed + arm.avgExecutionMs > timeBudgetMs) continue;

      selected.push(arm);
      selectedSamples.push({ hookId, sample });
      timeUsed += arm.avgExecutionMs;

      const mean = arm.alpha / (arm.alpha + arm.beta);
      if (sample >= mean) exploited++;
    }

    return {
      selectedHooks: selected,
      samples: selectedSamples,
      exploitFraction: selected.length > critical.length
        ? exploited / (selected.length - critical.length)
        : 1,
      budget: {
        requested: k,
        totalTimeMs: timeUsed,
        avgTimePerHook: selected.length > 0 ? timeUsed / selected.length : 0
      }
    };
  }

  /**
   * Update hook with outcome
   */
  update(hookId: string, caughtIssue: boolean, executionMs: number): HookUpdateResult | null {
    const arm = this.arms.get(hookId);
    if (!arm) return null;

    const priorAlpha = arm.alpha;
    const priorBeta = arm.beta;

    if (caughtIssue) {
      arm.alpha += 1;
      arm.totalCatches += 1;
      arm.lastCatch = Date.now();
    } else {
      arm.beta += 1;
    }

    arm.totalRuns += 1;
    arm.lastRun = Date.now();

    arm.avgExecutionMs = (arm.avgExecutionMs * (arm.totalRuns - 1) + executionMs) / arm.totalRuns;

    const estimatedValue = arm.alpha / (arm.alpha + arm.beta);
    const variance = (arm.alpha * arm.beta) /
      ((arm.alpha + arm.beta) ** 2 * (arm.alpha + arm.beta + 1));

    return {
      hookId,
      priorAlpha,
      priorBeta,
      posteriorAlpha: arm.alpha,
      posteriorBeta: arm.beta,
      estimatedValue,
      uncertainty: Math.sqrt(variance)
    };
  }

  /**
   * Batch update multiple hooks
   */
  batchUpdate(results: Array<{ hookId: string; caughtIssue: boolean; executionMs: number }>): HookUpdateResult[] {
    return results.map(r => this.update(r.hookId, r.caughtIssue, r.executionMs)).filter(Boolean) as HookUpdateResult[];
  }

  /**
   * Get expected value (mean reward) for hook
   */
  getExpectedValue(hookId: string): number {
    const arm = this.arms.get(hookId);
    if (!arm) return 0;
    return arm.alpha / (arm.alpha + arm.beta);
  }

  /**
   * Get upper confidence bound (UCB) for hook
   */
  getUCB(hookId: string, c: number = 2): number {
    const arm = this.arms.get(hookId);
    if (!arm) return Infinity;

    const mean = arm.alpha / (arm.alpha + arm.beta);
    const variance = (arm.alpha * arm.beta) /
      ((arm.alpha + arm.beta) ** 2 * (arm.alpha + arm.beta + 1));

    return mean + c * Math.sqrt(variance);
  }

  /**
   * Get arm statistics
   */
  getArm(hookId: string): HookArm | undefined {
    return this.arms.get(hookId);
  }

  /**
   * List all arms
   */
  listArms(): HookArm[] {
    return Array.from(this.arms.values());
  }

  /**
   * Generate performance report
   */
  generateReport(): BanditReport {
    const arms = this.listArms();

    const totalRuns = arms.reduce((s, a) => s + a.totalRuns, 0);
    const totalCatches = arms.reduce((s, a) => s + a.totalCatches, 0);

    const sorted = [...arms].sort((a, b) =>
      (b.alpha / (b.alpha + b.beta)) - (a.alpha / (a.alpha + a.beta))
    );

    const topPerformers = sorted.slice(0, 5);
    const underperformers = sorted.slice(-5).reverse();

    const recommendations: string[] = [];

    const lowUtility = arms.filter(a =>
      a.totalRuns > 50 && a.totalCatches / a.totalRuns < 0.01
    );
    if (lowUtility.length > 0) {
      recommendations.push(
        `Consider disabling ${lowUtility.length} hooks with <1% catch rate: ${lowUtility.map(a => a.name).join(", ")}`
      );
    }

    const highLatency = arms.filter(a => a.avgExecutionMs > 200);
    if (highLatency.length > 0) {
      recommendations.push(
        `Optimize ${highLatency.length} slow hooks (>200ms): ${highLatency.map(a => `${a.name} (${a.avgExecutionMs.toFixed(0)}ms)`).join(", ")}`
      );
    }

    const unexplored = arms.filter(a => a.totalRuns < 10);
    if (unexplored.length > 0) {
      recommendations.push(
        `${unexplored.length} hooks need more exploration (runs<10)`
      );
    }

    const optimalCatchRate = Math.max(...arms.map(a => a.alpha / (a.alpha + a.beta)));
    const actualCatchRate = totalRuns > 0 ? totalCatches / totalRuns : 0;
    const regretEstimate = totalRuns * (optimalCatchRate - actualCatchRate);

    return {
      timestamp: Date.now(),
      totalHooks: arms.length,
      totalRuns,
      totalCatches,
      overallCatchRate: actualCatchRate,
      topPerformers,
      underperformers,
      recommendations,
      regretEstimate
    };
  }

  /**
   * Mark hook as always-run (bypass bandit)
   */
  markAlwaysRun(hookId: string): void {
    this.alwaysRun.add(hookId);
  }

  /**
   * Unmark hook from always-run
   */
  unmarkAlwaysRun(hookId: string): void {
    this.alwaysRun.delete(hookId);
  }

  /**
   * Get always-run hooks
   */
  getAlwaysRun(): string[] {
    return Array.from(this.alwaysRun);
  }

  /**
   * Reset all arms
   */
  reset(): void {
    this.arms.clear();
    this.alwaysRun.clear();
  }

  /**
   * Reset specific arm (back to prior)
   */
  resetArm(hookId: string): void {
    const arm = this.arms.get(hookId);
    if (arm) {
      arm.alpha = this.priorAlpha;
      arm.beta = this.priorBeta;
      arm.totalRuns = 0;
      arm.totalCatches = 0;
    }
  }

  /**
   * Import arm state (for persistence)
   */
  importArms(arms: HookArm[]): void {
    for (const arm of arms) {
      this.arms.set(arm.hookId, arm);
      if (arm.priority === "critical") {
        this.alwaysRun.add(arm.hookId);
      }
    }
    log.info(`HookBandit: imported ${arms.length} arms`);
  }

  /**
   * Export arm state (for persistence)
   */
  exportArms(): HookArm[] {
    return this.listArms();
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const hookBanditEngine = new HookBanditEngine();
