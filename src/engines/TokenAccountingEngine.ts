/**
 * TokenAccountingEngine — Centralized token cost accounting
 *
 * Tracks actual vs optimized token costs across all tool interactions.
 * Provides per-tool cost baselines, actual costs, and efficiency scores.
 * Powers the /token-budget and /hook-stats commands with data.
 *
 * Token savings: Meta-engine — no direct savings, enables optimization.
 *
 * @version 1.0.0
 */

export interface ToolCost {
  tool: string;
  callCount: number;
  totalTokens: number;
  avgTokens: number;
  maxTokens: number;
  minTokens: number;
}

export interface AccountingReport {
  totalCalls: number;
  totalTokensIn: number;
  totalTokensOut: number;
  totalTokens: number;
  byTool: ToolCost[];
  topExpensive: ToolCost[];
  efficiencyScore: number; // 0-100
  recommendations: string[];
}

// Baseline expected costs per tool call type
const BASELINES: Record<string, { avgIn: number; avgOut: number }> = {
  Read:       { avgIn: 100, avgOut: 2000 },
  Grep:       { avgIn: 150, avgOut: 800 },
  Glob:       { avgIn: 100, avgOut: 400 },
  Edit:       { avgIn: 500, avgOut: 200 },
  Write:      { avgIn: 300, avgOut: 100 },
  Bash:       { avgIn: 200, avgOut: 1500 },
  Agent:      { avgIn: 500, avgOut: 5000 },
  WebFetch:   { avgIn: 100, avgOut: 3000 },
  WebSearch:  { avgIn: 100, avgOut: 1500 },
  ToolSearch: { avgIn: 100, avgOut: 200 },
};

interface CallRecord {
  tool: string;
  tokensIn: number;
  tokensOut: number;
}

export class TokenAccountingEngine {
  private records: CallRecord[] = [];

  /**
   * Record a tool call's token cost.
   */
  record(tool: string, tokensIn: number, tokensOut: number): void {
    this.records.push({ tool, tokensIn, tokensOut });
  }

  /**
   * Get per-tool cost breakdown.
   */
  getByTool(): ToolCost[] {
    const grouped: Record<string, { count: number; total: number; max: number; min: number }> = {};

    for (const r of this.records) {
      const total = r.tokensIn + r.tokensOut;
      if (!grouped[r.tool]) {
        grouped[r.tool] = { count: 0, total: 0, max: 0, min: Infinity };
      }
      grouped[r.tool].count++;
      grouped[r.tool].total += total;
      grouped[r.tool].max = Math.max(grouped[r.tool].max, total);
      grouped[r.tool].min = Math.min(grouped[r.tool].min, total);
    }

    return Object.entries(grouped).map(([tool, data]) => ({
      tool,
      callCount: data.count,
      totalTokens: data.total,
      avgTokens: Math.round(data.total / data.count),
      maxTokens: data.max,
      minTokens: data.min === Infinity ? 0 : data.min,
    }));
  }

  /**
   * Generate a full accounting report.
   */
  getReport(): AccountingReport {
    const byTool = this.getByTool();
    const totalCalls = this.records.length;
    const totalTokensIn = this.records.reduce((s, r) => s + r.tokensIn, 0);
    const totalTokensOut = this.records.reduce((s, r) => s + r.tokensOut, 0);
    const totalTokens = totalTokensIn + totalTokensOut;

    // Sort by total cost descending
    const topExpensive = [...byTool].sort((a, b) => b.totalTokens - a.totalTokens).slice(0, 5);

    // Calculate efficiency score
    let expectedTotal = 0;
    for (const r of this.records) {
      const baseline = BASELINES[r.tool];
      if (baseline) {
        expectedTotal += baseline.avgIn + baseline.avgOut;
      } else {
        expectedTotal += 1000; // default baseline
      }
    }

    const efficiency = expectedTotal > 0
      ? Math.round(Math.min(100, (expectedTotal / Math.max(1, totalTokens)) * 100))
      : 100;

    // Generate recommendations
    const recommendations: string[] = [];
    for (const tc of topExpensive) {
      const baseline = BASELINES[tc.tool];
      if (baseline && tc.avgTokens > (baseline.avgIn + baseline.avgOut) * 2) {
        recommendations.push(
          `${tc.tool} avg cost (${tc.avgTokens}) is ${Math.round(tc.avgTokens / (baseline.avgIn + baseline.avgOut))}x baseline. Consider more targeted usage.`
        );
      }
    }

    if (byTool.find(t => t.tool === "Read" && t.callCount > 20)) {
      recommendations.push("High Read call count. Consider using Grep or digest instead.");
    }
    if (byTool.find(t => t.tool === "Agent" && t.callCount > 5)) {
      recommendations.push("Frequent Agent usage. Direct Glob/Grep may be cheaper.");
    }

    return {
      totalCalls,
      totalTokensIn,
      totalTokensOut,
      totalTokens,
      byTool,
      topExpensive,
      efficiencyScore: efficiency,
      recommendations,
    };
  }

  /**
   * Get a compact one-liner.
   */
  getStatusLine(): string {
    const r = this.getReport();
    return `Tokens: ${r.totalTokens} (${r.totalCalls} calls) | Efficiency: ${r.efficiencyScore}% | Top: ${r.topExpensive[0]?.tool || "none"}`;
  }

  /**
   * Get baseline for a tool.
   */
  getBaseline(tool: string): { avgIn: number; avgOut: number } | null {
    return BASELINES[tool] || null;
  }

  /**
   * Reset all records.
   */
  reset(): void {
    this.records = [];
  }
}

export const tokenAccountingEngine = new TokenAccountingEngine();
