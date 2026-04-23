/**
 * OutputBudgetEnforcerEngine - Enforces per-tool output token budgets
 *
 * Assigns token budgets to each tool type and provides truncation strategies
 * when output exceeds the budget. Tracks actual vs budgeted usage and
 * identifies chronically over-budget tools.
 *
 * @version 1.0.0
 */

export interface BudgetRule {
  tool: string;
  maxTokens: number;
  strategy: "head" | "tail" | "headtail" | "summary";
}

export interface EnforceResult {
  withinBudget: boolean;
  originalTokens: number;
  budgetTokens: number;
  truncated: string;
  savedTokens: number;
}

export interface BudgetStats {
  totalEnforced: number;
  totalSaved: number;
  overBudgetCount: number;
  topOffenders: Array<{ tool: string; overCount: number; totalWasted: number }>;
}

const DEFAULT_BUDGETS: BudgetRule[] = [
  { tool: "Bash", maxTokens: 2000, strategy: "tail" },
  { tool: "Read", maxTokens: 5000, strategy: "headtail" },
  { tool: "Grep", maxTokens: 1500, strategy: "head" },
  { tool: "Glob", maxTokens: 1000, strategy: "head" },
  { tool: "WebFetch", maxTokens: 3000, strategy: "headtail" },
  { tool: "WebSearch", maxTokens: 2000, strategy: "head" },
  { tool: "Agent", maxTokens: 4000, strategy: "headtail" },
];

export class OutputBudgetEnforcerEngine {
  private rules: Map<string, BudgetRule>;
  private defaultMaxTokens: number;
  private stats = {
    totalEnforced: 0,
    totalSaved: 0,
    offenders: new Map<string, { overCount: number; totalWasted: number }>(),
  };

  constructor(defaultMaxTokens = 3000) {
    this.defaultMaxTokens = defaultMaxTokens;
    this.rules = new Map();
    for (const rule of DEFAULT_BUDGETS) {
      this.rules.set(rule.tool, rule);
    }
  }

  /**
   * Enforce budget on tool output.
   */
  enforce(tool: string, output: string): EnforceResult {
    const originalTokens = Math.ceil(output.length / 4);
    const rule = this.rules.get(tool);
    const maxTokens = rule?.maxTokens ?? this.defaultMaxTokens;
    const strategy = rule?.strategy ?? "headtail";

    if (originalTokens <= maxTokens) {
      return {
        withinBudget: true,
        originalTokens,
        budgetTokens: maxTokens,
        truncated: output,
        savedTokens: 0,
      };
    }

    this.stats.totalEnforced++;
    const maxChars = maxTokens * 4;
    const truncated = this.truncate(output, maxChars, strategy);
    const savedTokens = originalTokens - Math.ceil(truncated.length / 4);
    this.stats.totalSaved += savedTokens;

    const offender = this.stats.offenders.get(tool) ?? { overCount: 0, totalWasted: 0 };
    offender.overCount++;
    offender.totalWasted += savedTokens;
    this.stats.offenders.set(tool, offender);

    return {
      withinBudget: false,
      originalTokens,
      budgetTokens: maxTokens,
      truncated,
      savedTokens,
    };
  }

  /**
   * Check if output would exceed budget without truncating.
   */
  wouldExceed(tool: string, outputLength: number): boolean {
    const rule = this.rules.get(tool);
    const maxTokens = rule?.maxTokens ?? this.defaultMaxTokens;
    return Math.ceil(outputLength / 4) > maxTokens;
  }

  /**
   * Set a custom budget rule.
   */
  setRule(tool: string, maxTokens: number, strategy: "head" | "tail" | "headtail" | "summary" = "headtail"): void {
    this.rules.set(tool, { tool, maxTokens, strategy });
  }

  /**
   * Get budget statistics.
   */
  getStats(): BudgetStats {
    const topOffenders = Array.from(this.stats.offenders.entries())
      .map(([tool, data]) => ({ tool, ...data }))
      .sort((a, b) => b.totalWasted - a.totalWasted)
      .slice(0, 5);

    return {
      totalEnforced: this.stats.totalEnforced,
      totalSaved: this.stats.totalSaved,
      overBudgetCount: this.stats.totalEnforced,
      topOffenders,
    };
  }

  /**
   * One-liner status.
   */
  oneLiner(): string {
    const s = this.getStats();
    return "Budget: " + s.totalEnforced + " enforced, ~" + s.totalSaved + " tokens saved";
  }

  /**
   * Reset statistics.
   */
  reset(): void {
    this.stats.totalEnforced = 0;
    this.stats.totalSaved = 0;
    this.stats.offenders.clear();
  }

  private truncate(text: string, maxChars: number, strategy: "head" | "tail" | "headtail" | "summary"): string {
    if (text.length <= maxChars) return text;

    switch (strategy) {
      case "head":
        return text.slice(0, maxChars) + "\n... [truncated, " + (text.length - maxChars) + " chars omitted]";

      case "tail":
        return "[truncated, " + (text.length - maxChars) + " chars omitted] ...\n" + text.slice(-maxChars);

      case "headtail": {
        const half = Math.floor(maxChars / 2);
        return (
          text.slice(0, half) +
          "\n... [" + (text.length - maxChars) + " chars omitted] ...\n" +
          text.slice(-half)
        );
      }

      case "summary":
        return text.slice(0, maxChars) + "\n... [truncated, " + (text.length - maxChars) + " chars omitted]";

      default:
        return text.slice(0, maxChars);
    }
  }
}

export const outputBudgetEnforcerEngine = new OutputBudgetEnforcerEngine();
