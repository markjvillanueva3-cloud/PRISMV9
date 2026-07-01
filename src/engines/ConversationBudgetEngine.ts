/**
 * ConversationBudgetEngine — Conversation-level token budget management
 *
 * Tracks cumulative token usage across a conversation and provides
 * budget alerts, usage breakdowns, and optimization recommendations.
 * Works with the hook system's token tracker for real-time monitoring.
 *
 * Token savings: Proactive budget management prevents context overflow.
 *
 * @version 1.0.0
 */

export interface TokenUsage {
  toolCalls: number;
  inputTokens: number;
  outputTokens: number;
  largestCall: { tool: string; tokens: number };
  byTool: Record<string, number>;
}

export interface BudgetAlert {
  level: "info" | "warn" | "critical";
  message: string;
  usedPercent: number;
  recommendation: string;
}

export class ConversationBudgetEngine {
  private usage: TokenUsage;
  private readonly maxBudget: number;

  constructor(maxBudget = 150_000) {
    this.maxBudget = maxBudget;
    this.usage = this.createEmpty();
  }

  /**
   * Record a tool call's token usage.
   */
  recordToolCall(tool: string, inputTokens: number, outputTokens: number): void {
    const total = inputTokens + outputTokens;
    this.usage.toolCalls++;
    this.usage.inputTokens += inputTokens;
    this.usage.outputTokens += outputTokens;
    this.usage.byTool[tool] = (this.usage.byTool[tool] || 0) + total;

    if (total > this.usage.largestCall.tokens) {
      this.usage.largestCall = { tool, tokens: total };
    }
  }

  /**
   * Get current usage status.
   */
  getStatus(): TokenUsage & { totalTokens: number; budgetPercent: number; remaining: number } {
    const totalTokens = this.usage.inputTokens + this.usage.outputTokens;
    return {
      ...this.usage,
      totalTokens,
      budgetPercent: Math.round((totalTokens / this.maxBudget) * 100),
      remaining: Math.max(0, this.maxBudget - totalTokens),
    };
  }

  /**
   * Check if a budget alert should be raised.
   */
  checkBudget(): BudgetAlert | null {
    const status = this.getStatus();

    if (status.budgetPercent >= 90) {
      return {
        level: "critical",
        message: `Context ${status.budgetPercent}% full — compaction imminent`,
        usedPercent: status.budgetPercent,
        recommendation: "Run /compact now. Avoid large file reads. Use digest/snapshot engines.",
      };
    }
    if (status.budgetPercent >= 70) {
      return {
        level: "warn",
        message: `Context ${status.budgetPercent}% full — conserve tokens`,
        usedPercent: status.budgetPercent,
        recommendation: "Use compact outputs. Avoid reading large files. Prefer Grep over Read.",
      };
    }
    if (status.budgetPercent >= 50) {
      return {
        level: "info",
        message: `Context ${status.budgetPercent}% used — ${status.remaining} tokens remaining`,
        usedPercent: status.budgetPercent,
        recommendation: "Normal usage. Consider using compact tools for large operations.",
      };
    }
    return null;
  }

  /**
   * Get top token consumers.
   */
  getTopConsumers(n = 5): Array<{ tool: string; tokens: number; percent: number }> {
    const total = this.usage.inputTokens + this.usage.outputTokens;
    if (total === 0) return [];

    return Object.entries(this.usage.byTool)
      .sort(([, a], [, b]) => b - a)
      .slice(0, n)
      .map(([tool, tokens]) => ({
        tool,
        tokens,
        percent: Math.round((tokens / total) * 100),
      }));
  }

  /**
   * Get a compact one-line status.
   */
  getStatusLine(): string {
    const s = this.getStatus();
    return `Tokens: ${s.totalTokens}/${this.maxBudget} (${s.budgetPercent}%) | Calls: ${s.toolCalls} | Largest: ${s.largestCall.tool}(${s.largestCall.tokens})`;
  }

  /**
   * Estimate how many more operations can fit in the budget.
   */
  estimateRemaining(): { reads: number; greps: number; edits: number; dispatchers: number } {
    const remaining = Math.max(0, this.maxBudget - this.usage.inputTokens - this.usage.outputTokens);
    return {
      reads: Math.floor(remaining / 2000),      // ~2K tokens per file read
      greps: Math.floor(remaining / 500),        // ~500 tokens per grep
      edits: Math.floor(remaining / 300),        // ~300 tokens per edit
      dispatchers: Math.floor(remaining / 1000), // ~1K tokens per dispatcher call
    };
  }

  /**
   * Reset usage tracking.
   */
  reset(): void {
    this.usage = this.createEmpty();
  }

  // ── Private ──────────────────────────────────────────────────

  private createEmpty(): TokenUsage {
    return {
      toolCalls: 0,
      inputTokens: 0,
      outputTokens: 0,
      largestCall: { tool: "none", tokens: 0 },
      byTool: {},
    };
  }
}

export const conversationBudgetEngine = new ConversationBudgetEngine();
