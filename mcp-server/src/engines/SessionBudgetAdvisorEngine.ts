/**
 * SessionBudgetAdvisorEngine — Unified session budget advisor
 *
 * Combines signals from ConversationBudgetEngine, TokenAccountingEngine,
 * CallChainEngine, and HookEfficiencyEngine into a single advisory
 * output. Provides actionable, prioritized recommendations.
 *
 * Token savings: Meta-engine — consolidates multiple sources into
 * one compact advisory, avoiding multiple separate queries.
 *
 * @version 1.0.0
 */

export interface BudgetAdvisory {
  status: "healthy" | "caution" | "critical";
  message: string;
  tokensBudget: number;
  tokensUsed: number;
  tokensRemaining: number;
  percentUsed: number;
  tokensSavedByHooks: number;
  antiPatterns: number;
  recommendations: string[];
  compactSummary: string;
}

export interface SessionMetrics {
  budgetMax: number;
  tokensUsed: number;
  hookSaves: number;
  hookBlocks: number;
  antiPatterns: string[];
  topExpensiveTool: string;
  topExpensiveTokens: number;
  toolCallCount: number;
  efficiencyScore: number;
}

export class SessionBudgetAdvisorEngine {

  /**
   * Generate a budget advisory from session metrics.
   */
  advise(metrics: SessionMetrics): BudgetAdvisory {
    const remaining = Math.max(0, metrics.budgetMax - metrics.tokensUsed);
    const percentUsed = Math.round((metrics.tokensUsed / metrics.budgetMax) * 100);

    let status: "healthy" | "caution" | "critical";
    if (percentUsed >= 85) status = "critical";
    else if (percentUsed >= 60) status = "caution";
    else status = "healthy";

    const recommendations: string[] = [];

    // Budget-based recommendations
    if (percentUsed >= 90) {
      recommendations.push("Run /compact immediately — context overflow imminent");
      recommendations.push("Only essential operations. Skip exploratory reads");
    } else if (percentUsed >= 70) {
      recommendations.push("Use /slim to trim active context");
      recommendations.push("Prefer Grep over Read for file exploration");
      recommendations.push("Use compact output formats (pipe, csv) over JSON");
    } else if (percentUsed >= 50) {
      recommendations.push("Consider /digest instead of full file reads");
    }

    // Tool efficiency recommendations
    if (metrics.efficiencyScore < 60) {
      recommendations.push(`Low efficiency score (${metrics.efficiencyScore}%). Review tool usage patterns`);
    }
    if (metrics.topExpensiveTokens > 5000) {
      recommendations.push(`${metrics.topExpensiveTool} consuming ${metrics.topExpensiveTokens} tokens — consider alternatives`);
    }

    // Anti-pattern recommendations
    if (metrics.antiPatterns.length > 0) {
      recommendations.push(`${metrics.antiPatterns.length} anti-pattern(s) detected: ${metrics.antiPatterns.slice(0, 3).join(", ")}`);
    }

    // Hook effectiveness
    if (metrics.hookSaves > 0) {
      recommendations.push(`Hooks saved ~${metrics.hookSaves} tokens (${metrics.hookBlocks} blocked calls)`);
    }

    // Remaining capacity estimates
    if (remaining > 0) {
      const estReads = Math.floor(remaining / 2000);
      const estGreps = Math.floor(remaining / 500);
      recommendations.push(`Budget allows ~${estReads} reads or ~${estGreps} greps`);
    }

    const message = status === "critical"
      ? `CRITICAL: ${percentUsed}% used — ${remaining} tokens remaining`
      : status === "caution"
        ? `CAUTION: ${percentUsed}% used — conserve tokens`
        : `HEALTHY: ${percentUsed}% used — ${remaining} tokens remaining`;

    const compactSummary = [
      `${status.toUpperCase()} ${percentUsed}%`,
      `${metrics.tokensUsed}/${metrics.budgetMax}`,
      `${metrics.toolCallCount} calls`,
      `${metrics.hookSaves} saved by hooks`,
      `Efficiency: ${metrics.efficiencyScore}%`,
    ].join(" | ");

    return {
      status,
      message,
      tokensBudget: metrics.budgetMax,
      tokensUsed: metrics.tokensUsed,
      tokensRemaining: remaining,
      percentUsed,
      tokensSavedByHooks: metrics.hookSaves,
      antiPatterns: metrics.antiPatterns.length,
      recommendations,
      compactSummary,
    };
  }

  /**
   * Quick one-liner from metrics.
   */
  oneLiner(metrics: SessionMetrics): string {
    const pct = Math.round((metrics.tokensUsed / metrics.budgetMax) * 100);
    const emoji = pct >= 85 ? "🔴" : pct >= 60 ? "🟡" : "🟢";
    return `${emoji} ${pct}% | ${metrics.tokensUsed}/${metrics.budgetMax} | ${metrics.toolCallCount} calls | Eff: ${metrics.efficiencyScore}%`;
  }

  /**
   * Determine if session should compact.
   */
  shouldCompact(metrics: SessionMetrics): boolean {
    return (metrics.tokensUsed / metrics.budgetMax) >= 0.85;
  }

  /**
   * Estimate how many more calls of each type fit in budget.
   */
  estimateCapacity(remaining: number): Record<string, number> {
    return {
      reads: Math.floor(remaining / 2000),
      greps: Math.floor(remaining / 500),
      edits: Math.floor(remaining / 300),
      bashes: Math.floor(remaining / 1500),
      agents: Math.floor(remaining / 5000),
      webSearches: Math.floor(remaining / 1500),
    };
  }
}

export const sessionBudgetAdvisorEngine = new SessionBudgetAdvisorEngine();
