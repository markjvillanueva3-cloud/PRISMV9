/**
 * MetaLearningOptimizerEngine — Learn to learn faster
 *
 * Phase 0.18 U-AGI4 from UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN. Records which
 * learning strategies succeed/fail for which content types, then recommends
 * the best-performing strategy for a new scenario.
 *
 * State model (scenario, strategy) → {attempts, successes, avgDurationMs}
 * recommend(scenario) returns the strategy with the best success rate
 * (Wilson-adjusted so zero-attempt strategies don't look perfect).
 *
 * No I/O. META_LEARNING_LEDGER.jsonl persistence is a caller concern.
 *
 * @module engines/MetaLearningOptimizerEngine
 * @milestone PP-0.18-U-AGI4
 */

export interface StrategyOutcome {
  scenario: string;
  strategy: string;
  success: boolean;
  durationMs?: number;
}

export interface StrategyStats {
  scenario: string;
  strategy: string;
  attempts: number;
  successes: number;
  successRate: number;
  wilsonLowerBound: number;
  avgDurationMs: number | null;
}

export interface StrategyRecommendation extends StrategyStats {
  rationale: string;
}

export class MetaLearningOptimizerEngine {
  private readonly stats = new Map<string, StrategyStats>();

  record(outcome: StrategyOutcome): StrategyStats {
    this.validate(outcome);
    const key = this.keyOf(outcome.scenario, outcome.strategy);
    const existing = this.stats.get(key) ?? {
      scenario: outcome.scenario,
      strategy: outcome.strategy,
      attempts: 0,
      successes: 0,
      successRate: 0,
      wilsonLowerBound: 0,
      avgDurationMs: null,
    };

    existing.attempts += 1;
    if (outcome.success) existing.successes += 1;
    existing.successRate = this.round4(existing.successes / existing.attempts);
    existing.wilsonLowerBound = this.round4(this.wilsonLower(existing.successes, existing.attempts));
    if (outcome.durationMs !== undefined) {
      const current = existing.avgDurationMs ?? 0;
      existing.avgDurationMs = this.round4(current + (outcome.durationMs - current) / existing.attempts);
    }

    this.stats.set(key, existing);
    return { ...existing };
  }

  recommend(scenario: string, minAttempts = 1): StrategyRecommendation | null {
    if (!scenario || scenario.trim() === "") throw new Error("scenario required");
    const candidates = [...this.stats.values()].filter(
      (s) => s.scenario === scenario && s.attempts >= minAttempts
    );
    if (candidates.length === 0) return null;

    candidates.sort((a, b) => {
      if (b.wilsonLowerBound !== a.wilsonLowerBound) return b.wilsonLowerBound - a.wilsonLowerBound;
      if (b.successRate !== a.successRate) return b.successRate - a.successRate;
      return (a.avgDurationMs ?? 0) - (b.avgDurationMs ?? 0);
    });

    const top = candidates[0];
    return {
      ...top,
      rationale: `best Wilson lower bound ${top.wilsonLowerBound.toFixed(4)} across ${top.attempts} attempts`,
    };
  }

  statsFor(scenario: string, strategy: string): StrategyStats | null {
    return this.stats.get(this.keyOf(scenario, strategy)) ?? null;
  }

  listScenarios(): string[] {
    return [...new Set([...this.stats.values()].map((s) => s.scenario))].sort();
  }

  listAll(): StrategyStats[] {
    return [...this.stats.values()].map((s) => ({ ...s }));
  }

  size(): number {
    return this.stats.size;
  }

  clear(): void {
    this.stats.clear();
  }

  // --- internals ---------------------------------------------------------

  private keyOf(scenario: string, strategy: string): string {
    return `${scenario}::${strategy}`;
  }

  private validate(o: StrategyOutcome): void {
    if (!o.scenario || o.scenario.trim() === "") throw new Error("scenario required");
    if (!o.strategy || o.strategy.trim() === "") throw new Error("strategy required");
    if (o.durationMs !== undefined && (!Number.isFinite(o.durationMs) || o.durationMs < 0)) {
      throw new Error("durationMs must be non-negative finite");
    }
  }

  /** Wilson score lower bound at 95% CI (z=1.96). */
  private wilsonLower(successes: number, total: number): number {
    if (total === 0) return 0;
    const z = 1.96;
    const phat = successes / total;
    const denom = 1 + (z * z) / total;
    const center = phat + (z * z) / (2 * total);
    const margin = z * Math.sqrt((phat * (1 - phat) + (z * z) / (4 * total)) / total);
    return Math.max(0, (center - margin) / denom);
  }

  private round4(n: number): number {
    return Math.round(n * 10000) / 10000;
  }
}

export const metaLearningOptimizerEngine = new MetaLearningOptimizerEngine();
