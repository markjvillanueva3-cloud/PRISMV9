/**
 * SessionTokenLedgerEngine - Real-time token accounting ledger
 *
 * Tracks every tool call's estimated input/output token cost, maintains
 * running totals, and provides burn rate analysis. Identifies the most
 * expensive operations and predicts context exhaustion.
 *
 * @version 1.0.0
 */

export interface LedgerEntry {
  tool: string;
  inputTokens: number;
  outputTokens: number;
  timestamp: number;
  label?: string;
}

export interface LedgerSummary {
  totalEntries: number;
  totalInput: number;
  totalOutput: number;
  totalTokens: number;
  burnRate: number;
  topTools: Array<{ tool: string; total: number; count: number; avgCost: number }>;
  recentEntries: LedgerEntry[];
}

export interface BurnProjection {
  tokensUsed: number;
  tokensRemaining: number;
  burnRatePerMinute: number;
  estimatedMinutesLeft: number;
  status: "healthy" | "warning" | "critical";
}

export class SessionTokenLedgerEngine {
  private entries: LedgerEntry[] = [];
  private contextLimit: number;

  constructor(contextLimit = 200000) {
    this.contextLimit = contextLimit;
  }

  /**
   * Record a tool call's token cost.
   */
  record(tool: string, inputTokens: number, outputTokens: number, label?: string): void {
    this.entries.push({
      tool,
      inputTokens,
      outputTokens,
      timestamp: Date.now(),
      label,
    });
  }

  /**
   * Record from raw text lengths (estimates tokens as chars/4).
   */
  recordFromText(tool: string, inputText: string, outputText: string, label?: string): void {
    this.record(
      tool,
      Math.ceil(inputText.length / 4),
      Math.ceil(outputText.length / 4),
      label,
    );
  }

  /**
   * Get summary of all recorded entries.
   */
  summary(): LedgerSummary {
    const totalInput = this.entries.reduce((s, e) => s + e.inputTokens, 0);
    const totalOutput = this.entries.reduce((s, e) => s + e.outputTokens, 0);

    // Per-tool aggregation
    const toolMap = new Map<string, { total: number; count: number }>();
    for (const entry of this.entries) {
      const existing = toolMap.get(entry.tool) ?? { total: 0, count: 0 };
      existing.total += entry.inputTokens + entry.outputTokens;
      existing.count++;
      toolMap.set(entry.tool, existing);
    }

    const topTools = Array.from(toolMap.entries())
      .map(([tool, data]) => ({
        tool,
        total: data.total,
        count: data.count,
        avgCost: Math.round(data.total / data.count),
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);

    // Burn rate (tokens per minute)
    let burnRate = 0;
    if (this.entries.length >= 2) {
      const first = this.entries[0].timestamp;
      const last = this.entries[this.entries.length - 1].timestamp;
      const minutes = (last - first) / 60000;
      if (minutes > 0) {
        burnRate = Math.round((totalInput + totalOutput) / minutes);
      }
    }

    return {
      totalEntries: this.entries.length,
      totalInput,
      totalOutput,
      totalTokens: totalInput + totalOutput,
      burnRate,
      topTools,
      recentEntries: this.entries.slice(-5),
    };
  }

  /**
   * Project context exhaustion.
   */
  project(): BurnProjection {
    const s = this.summary();
    const tokensRemaining = Math.max(0, this.contextLimit - s.totalTokens);

    let estimatedMinutesLeft = Infinity;
    if (s.burnRate > 0) {
      estimatedMinutesLeft = Math.round(tokensRemaining / s.burnRate);
    }

    let status: "healthy" | "warning" | "critical" = "healthy";
    const usage = s.totalTokens / this.contextLimit;
    if (usage > 0.85) status = "critical";
    else if (usage > 0.6) status = "warning";

    return {
      tokensUsed: s.totalTokens,
      tokensRemaining,
      burnRatePerMinute: s.burnRate,
      estimatedMinutesLeft,
      status,
    };
  }

  /**
   * Get the most expensive single tool call.
   */
  mostExpensive(): LedgerEntry | undefined {
    if (this.entries.length === 0) return undefined;
    return this.entries.reduce((max, e) =>
      e.inputTokens + e.outputTokens > max.inputTokens + max.outputTokens ? e : max,
    );
  }

  /**
   * One-liner status.
   */
  oneLiner(): string {
    const s = this.summary();
    const p = this.project();
    return (
      s.totalTokens + "/" + this.contextLimit +
      " tokens (" + Math.round((s.totalTokens / this.contextLimit) * 100) +
      "%) | " + s.burnRate + " tok/min | " + p.status
    );
  }

  /**
   * Reset ledger.
   */
  reset(): void {
    this.entries = [];
  }

  /**
   * Get entry count.
   */
  get count(): number {
    return this.entries.length;
  }
}

export const sessionTokenLedgerEngine = new SessionTokenLedgerEngine();
