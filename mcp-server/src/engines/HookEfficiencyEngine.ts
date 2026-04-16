/**
 * HookEfficiencyEngine — Hook token savings tracker
 *
 * Tracks how many tokens hooks have saved by blocking, warning,
 * or rewriting tool calls. Provides ROI metrics for the hook system.
 *
 * Token savings: Meta-engine — measures and reports hook effectiveness.
 *
 * @version 1.0.0
 */

export interface HookSave {
  hook: string;
  tool: string;
  action: "block" | "warn" | "rewrite";
  tokensEstimated: number;
  timestamp: number;
}

export interface HookStats {
  totalSaves: number;
  totalTokensSaved: number;
  byHook: Record<string, { count: number; tokens: number }>;
  byAction: Record<string, { count: number; tokens: number }>;
  topSavers: Array<{ hook: string; tokens: number; count: number }>;
}

// Estimated tokens per tool call type (average)
const TOOL_TOKEN_ESTIMATES: Record<string, number> = {
  Read: 2000,
  Grep: 800,
  Glob: 400,
  Bash: 1500,
  Agent: 5000,
  WebFetch: 3000,
  WebSearch: 1500,
  Edit: 500,
  Write: 300,
  ToolSearch: 200,
};

export class HookEfficiencyEngine {
  private saves: HookSave[] = [];
  private readonly maxHistory = 500;

  /**
   * Record a hook save event.
   */
  record(hook: string, tool: string, action: "block" | "warn" | "rewrite", tokensEstimated?: number): void {
    const estimate = tokensEstimated ?? TOOL_TOKEN_ESTIMATES[tool] ?? 500;
    // Blocks save full amount, warns save ~30%, rewrites save ~50%
    const multiplier = action === "block" ? 1.0 : action === "rewrite" ? 0.5 : 0.3;

    this.saves.push({
      hook,
      tool,
      action,
      tokensEstimated: Math.round(estimate * multiplier),
      timestamp: Date.now(),
    });

    if (this.saves.length > this.maxHistory) {
      this.saves = this.saves.slice(-this.maxHistory);
    }
  }

  /**
   * Get comprehensive stats.
   */
  getStats(): HookStats {
    const byHook: Record<string, { count: number; tokens: number }> = {};
    const byAction: Record<string, { count: number; tokens: number }> = {};
    let totalTokens = 0;

    for (const save of this.saves) {
      totalTokens += save.tokensEstimated;

      if (!byHook[save.hook]) byHook[save.hook] = { count: 0, tokens: 0 };
      byHook[save.hook].count++;
      byHook[save.hook].tokens += save.tokensEstimated;

      if (!byAction[save.action]) byAction[save.action] = { count: 0, tokens: 0 };
      byAction[save.action].count++;
      byAction[save.action].tokens += save.tokensEstimated;
    }

    const topSavers = Object.entries(byHook)
      .map(([hook, data]) => ({ hook, ...data }))
      .sort((a, b) => b.tokens - a.tokens)
      .slice(0, 10);

    return {
      totalSaves: this.saves.length,
      totalTokensSaved: totalTokens,
      byHook,
      byAction,
      topSavers,
    };
  }

  /**
   * Get a compact one-liner status.
   */
  getStatusLine(): string {
    const s = this.getStats();
    if (s.totalSaves === 0) return "Hooks: 0 saves (session just started)";
    const top = s.topSavers[0];
    return `Hooks: ${s.totalSaves} saves, ~${s.totalTokensSaved} tokens saved | Top: ${top?.hook || "none"} (${top?.tokens || 0} tokens)`;
  }

  /**
   * Get saves within a time window (minutes).
   */
  getRecent(minutes = 10): HookSave[] {
    const cutoff = Date.now() - minutes * 60_000;
    return this.saves.filter(s => s.timestamp >= cutoff);
  }

  /**
   * Estimate session-level ROI.
   */
  getROI(sessionBudget = 150_000): { tokensSaved: number; budgetPercent: number; callsBlocked: number } {
    const stats = this.getStats();
    const blocked = stats.byAction["block"]?.count ?? 0;
    return {
      tokensSaved: stats.totalTokensSaved,
      budgetPercent: Math.round((stats.totalTokensSaved / sessionBudget) * 100),
      callsBlocked: blocked,
    };
  }

  /**
   * Reset tracking.
   */
  reset(): void {
    this.saves = [];
  }
}

export const hookEfficiencyEngine = new HookEfficiencyEngine();
