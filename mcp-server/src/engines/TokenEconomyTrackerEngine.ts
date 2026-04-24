/**
 * TokenEconomyTrackerEngine
 *
 * Tracks token spending across sessions, identifies waste patterns,
 * and provides optimization recommendations.
 *
 * Features:
 * - Per-session and cumulative tracking
 * - Operation categorization (build, test, search, edit, read)
 * - Waste detection (redundant reads, unnecessary exploration)
 * - Savings attribution (RTK, hooks, offloading)
 * - Budget forecasting
 */

import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { atomicWriteJson, safeReadJson, snapshotLastGood } from "../utils/atomicSessionWrite.js";

export interface TokenSpend {
  timestamp: string;
  sessionId: string;
  operation: OperationType;
  inputTokens: number;
  outputTokens: number;
  model: ModelType;
  tool?: string;
  file?: string;
  wasteFlags?: WasteFlag[];
  savingsSource?: SavingsSource;
}

export type OperationType =
  | "build"
  | "test"
  | "search"
  | "read"
  | "write"
  | "edit"
  | "agent"
  | "mcp"
  | "bash"
  | "other";

export type ModelType = "opus" | "sonnet" | "haiku" | "ollama" | "unknown";

export type WasteFlag =
  | "redundant_read"
  | "repeated_search"
  | "excessive_glob"
  | "large_output"
  | "failed_operation"
  | "unnecessary_agent";

export type SavingsSource =
  | "rtk"
  | "ollama_offload"
  | "hook_block"
  | "cache_hit"
  | "batch_operation";

export interface SessionSummary {
  sessionId: string;
  startTime: string;
  endTime?: string;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  operationBreakdown: Record<OperationType, number>;
  wasteTokens: number;
  savingsTokens: number;
  efficiency: number;
}

export interface EconomyReport {
  period: "day" | "week" | "month" | "all";
  sessions: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  avgSessionCost: number;
  topWastePatterns: Array<{ pattern: WasteFlag; count: number; tokens: number }>;
  topSavings: Array<{ source: SavingsSource; tokens: number; percent: number }>;
  recommendations: string[];
  trendDirection: "improving" | "stable" | "degrading";
}

export interface BudgetStatus {
  dailyBudget: number;
  dailySpent: number;
  dailyRemaining: number;
  weeklyBudget: number;
  weeklySpent: number;
  weeklyRemaining: number;
  projectedDailyOverage: number;
  alertLevel: "green" | "yellow" | "red";
}

// SHARED-STATE: Cross-session aggregation for budget tracking across all 8 concurrent chats
const STATE_FILE = "H:/prism/state/token-economy.json";
const COST_PER_1K_INPUT = { opus: 0.015, sonnet: 0.003, haiku: 0.00025, ollama: 0, unknown: 0.003 };
const COST_PER_1K_OUTPUT = { opus: 0.075, sonnet: 0.015, haiku: 0.00125, ollama: 0, unknown: 0.015 };

interface State {
  spends: TokenSpend[];
  sessions: Record<string, SessionSummary>;
  config: {
    dailyBudget: number;
    weeklyBudget: number;
    wasteThresholds: Record<WasteFlag, number>;
  };
}

export class TokenEconomyTrackerEngine {
  private state: State;

  constructor() {
    this.state = this.loadState();
  }

  private loadState(): State {
    const fallback: State = {
      spends: [],
      sessions: {},
      config: {
        dailyBudget: 5.0,
        weeklyBudget: 25.0,
        wasteThresholds: {
          redundant_read: 3,
          repeated_search: 2,
          excessive_glob: 5,
          large_output: 10000,
          failed_operation: 1,
          unnecessary_agent: 1,
        },
      },
    };
    const loaded = safeReadJson<State>(STATE_FILE, fallback);
    if (loaded !== fallback) snapshotLastGood(STATE_FILE, loaded);
    return loaded;
  }

  private saveState(): void {
    const dir = dirname(STATE_FILE);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const trimmed: State = {
      ...this.state,
      spends: this.state.spends.slice(-10000),
    };
    atomicWriteJson(STATE_FILE, trimmed);
  }

  recordSpend(spend: Omit<TokenSpend, "timestamp">): TokenSpend {
    const record: TokenSpend = {
      ...spend,
      timestamp: new Date().toISOString(),
    };

    record.wasteFlags = this.detectWaste(record);

    this.state.spends.push(record);
    this.updateSessionSummary(record);
    this.saveState();

    return record;
  }

  private detectWaste(spend: TokenSpend): WasteFlag[] {
    const flags: WasteFlag[] = [];
    const recent = this.state.spends.slice(-20);

    if (spend.operation === "read" && spend.file) {
      const sameFileReads = recent.filter(
        (s) => s.operation === "read" && s.file === spend.file
      );
      if (sameFileReads.length >= this.state.config.wasteThresholds.redundant_read) {
        flags.push("redundant_read");
      }
    }

    if (spend.operation === "search") {
      const recentSearches = recent.filter((s) => s.operation === "search");
      if (recentSearches.length >= this.state.config.wasteThresholds.repeated_search) {
        flags.push("repeated_search");
      }
    }

    if (spend.outputTokens > this.state.config.wasteThresholds.large_output) {
      flags.push("large_output");
    }

    if (spend.operation === "agent" && spend.outputTokens < 100) {
      flags.push("unnecessary_agent");
    }

    return flags;
  }

  private updateSessionSummary(spend: TokenSpend): void {
    const sessionId = spend.sessionId;
    if (!this.state.sessions[sessionId]) {
      this.state.sessions[sessionId] = {
        sessionId,
        startTime: spend.timestamp,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalCost: 0,
        operationBreakdown: {
          build: 0,
          test: 0,
          search: 0,
          read: 0,
          write: 0,
          edit: 0,
          agent: 0,
          mcp: 0,
          bash: 0,
          other: 0,
        },
        wasteTokens: 0,
        savingsTokens: 0,
        efficiency: 1.0,
      };
    }

    const session = this.state.sessions[sessionId];
    session.endTime = spend.timestamp;
    session.totalInputTokens += spend.inputTokens;
    session.totalOutputTokens += spend.outputTokens;
    session.operationBreakdown[spend.operation] += spend.inputTokens + spend.outputTokens;

    const cost = this.calculateCost(spend);
    session.totalCost += cost;

    if (spend.wasteFlags && spend.wasteFlags.length > 0) {
      session.wasteTokens += spend.outputTokens;
    }

    if (spend.savingsSource) {
      session.savingsTokens += spend.outputTokens * 0.7;
    }

    const totalTokens = session.totalInputTokens + session.totalOutputTokens;
    session.efficiency = totalTokens > 0 ? 1 - session.wasteTokens / totalTokens : 1;
  }

  private calculateCost(spend: TokenSpend): number {
    const inputCost = (spend.inputTokens / 1000) * COST_PER_1K_INPUT[spend.model];
    const outputCost = (spend.outputTokens / 1000) * COST_PER_1K_OUTPUT[spend.model];
    return inputCost + outputCost;
  }

  getSessionSummary(sessionId: string): SessionSummary | null {
    return this.state.sessions[sessionId] || null;
  }

  generateReport(period: "day" | "week" | "month" | "all" = "day"): EconomyReport {
    const now = new Date();
    const cutoff = new Date();

    switch (period) {
      case "day":
        cutoff.setDate(cutoff.getDate() - 1);
        break;
      case "week":
        cutoff.setDate(cutoff.getDate() - 7);
        break;
      case "month":
        cutoff.setMonth(cutoff.getMonth() - 1);
        break;
      case "all":
        cutoff.setFullYear(2020);
        break;
    }

    const relevantSpends = this.state.spends.filter(
      (s) => new Date(s.timestamp) >= cutoff
    );

    const relevantSessions = Object.values(this.state.sessions).filter(
      (s) => new Date(s.startTime) >= cutoff
    );

    const totalInputTokens = relevantSpends.reduce((sum, s) => sum + s.inputTokens, 0);
    const totalOutputTokens = relevantSpends.reduce((sum, s) => sum + s.outputTokens, 0);
    const totalCost = relevantSpends.reduce((sum, s) => sum + this.calculateCost(s), 0);

    const wastePatterns = this.aggregateWastePatterns(relevantSpends);
    const savingsBreakdown = this.aggregateSavings(relevantSpends);

    const recommendations = this.generateRecommendations(wastePatterns, relevantSpends);
    const trendDirection = this.calculateTrend(relevantSessions);

    return {
      period,
      sessions: relevantSessions.length,
      totalInputTokens,
      totalOutputTokens,
      totalCost,
      avgSessionCost: relevantSessions.length > 0 ? totalCost / relevantSessions.length : 0,
      topWastePatterns: wastePatterns.slice(0, 5),
      topSavings: savingsBreakdown,
      recommendations,
      trendDirection,
    };
  }

  private aggregateWastePatterns(
    spends: TokenSpend[]
  ): Array<{ pattern: WasteFlag; count: number; tokens: number }> {
    const patterns: Record<WasteFlag, { count: number; tokens: number }> = {
      redundant_read: { count: 0, tokens: 0 },
      repeated_search: { count: 0, tokens: 0 },
      excessive_glob: { count: 0, tokens: 0 },
      large_output: { count: 0, tokens: 0 },
      failed_operation: { count: 0, tokens: 0 },
      unnecessary_agent: { count: 0, tokens: 0 },
    };

    for (const spend of spends) {
      if (spend.wasteFlags) {
        for (const flag of spend.wasteFlags) {
          patterns[flag].count++;
          patterns[flag].tokens += spend.outputTokens;
        }
      }
    }

    return Object.entries(patterns)
      .map(([pattern, data]) => ({ pattern: pattern as WasteFlag, ...data }))
      .filter((p) => p.count > 0)
      .sort((a, b) => b.tokens - a.tokens);
  }

  private aggregateSavings(
    spends: TokenSpend[]
  ): Array<{ source: SavingsSource; tokens: number; percent: number }> {
    const savings: Record<SavingsSource, number> = {
      rtk: 0,
      ollama_offload: 0,
      hook_block: 0,
      cache_hit: 0,
      batch_operation: 0,
    };

    for (const spend of spends) {
      if (spend.savingsSource) {
        savings[spend.savingsSource] += spend.outputTokens * 0.7;
      }
    }

    const totalSavings = Object.values(savings).reduce((sum, v) => sum + v, 0);

    return Object.entries(savings)
      .map(([source, tokens]) => ({
        source: source as SavingsSource,
        tokens,
        percent: totalSavings > 0 ? (tokens / totalSavings) * 100 : 0,
      }))
      .filter((s) => s.tokens > 0)
      .sort((a, b) => b.tokens - a.tokens);
  }

  private generateRecommendations(
    wastePatterns: Array<{ pattern: WasteFlag; count: number; tokens: number }>,
    spends: TokenSpend[]
  ): string[] {
    const recommendations: string[] = [];

    for (const waste of wastePatterns) {
      switch (waste.pattern) {
        case "redundant_read":
          recommendations.push(
            `${waste.count} redundant file reads detected. Use caching or read files once.`
          );
          break;
        case "repeated_search":
          recommendations.push(
            `${waste.count} repeated searches. Use Explore agent for comprehensive search instead of multiple greps.`
          );
          break;
        case "large_output":
          recommendations.push(
            `${waste.count} operations with excessive output. Use RTK prefix for all commands.`
          );
          break;
        case "unnecessary_agent":
          recommendations.push(
            `${waste.count} agents spawned for trivial tasks. Use direct tools for simple operations.`
          );
          break;
      }
    }

    const nonRTKBash = spends.filter(
      (s) => s.operation === "bash" && !s.savingsSource
    );
    if (nonRTKBash.length > 10) {
      recommendations.push(
        `${nonRTKBash.length} bash commands without RTK. Prefix all commands with 'rtk' for 60-90% savings.`
      );
    }

    const ollamaOpportunities = spends.filter(
      (s) =>
        s.model !== "ollama" &&
        (s.operation === "other" || s.tool?.includes("explain"))
    );
    if (ollamaOpportunities.length > 5) {
      recommendations.push(
        `${ollamaOpportunities.length} tasks could be offloaded to Ollama for 80%+ savings.`
      );
    }

    return recommendations.slice(0, 5);
  }

  private calculateTrend(
    sessions: SessionSummary[]
  ): "improving" | "stable" | "degrading" {
    if (sessions.length < 3) return "stable";

    const sorted = [...sessions].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    const firstHalf = sorted.slice(0, Math.floor(sorted.length / 2));
    const secondHalf = sorted.slice(Math.floor(sorted.length / 2));

    const avgEffFirst =
      firstHalf.reduce((sum, s) => sum + s.efficiency, 0) / firstHalf.length;
    const avgEffSecond =
      secondHalf.reduce((sum, s) => sum + s.efficiency, 0) / secondHalf.length;

    const diff = avgEffSecond - avgEffFirst;
    if (diff > 0.05) return "improving";
    if (diff < -0.05) return "degrading";
    return "stable";
  }

  getBudgetStatus(): BudgetStatus {
    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(dayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    const todaySpends = this.state.spends.filter(
      (s) => new Date(s.timestamp) >= dayStart
    );
    const weekSpends = this.state.spends.filter(
      (s) => new Date(s.timestamp) >= weekStart
    );

    const dailySpent = todaySpends.reduce(
      (sum, s) => sum + this.calculateCost(s),
      0
    );
    const weeklySpent = weekSpends.reduce(
      (sum, s) => sum + this.calculateCost(s),
      0
    );

    const hoursElapsed = (now.getTime() - dayStart.getTime()) / (1000 * 60 * 60);
    const projectedDaily = hoursElapsed > 0 ? (dailySpent / hoursElapsed) * 24 : 0;
    const projectedOverage = Math.max(
      0,
      projectedDaily - this.state.config.dailyBudget
    );

    let alertLevel: "green" | "yellow" | "red" = "green";
    if (dailySpent > this.state.config.dailyBudget * 0.8) alertLevel = "yellow";
    if (dailySpent > this.state.config.dailyBudget) alertLevel = "red";

    return {
      dailyBudget: this.state.config.dailyBudget,
      dailySpent,
      dailyRemaining: Math.max(0, this.state.config.dailyBudget - dailySpent),
      weeklyBudget: this.state.config.weeklyBudget,
      weeklySpent,
      weeklyRemaining: Math.max(0, this.state.config.weeklyBudget - weeklySpent),
      projectedDailyOverage: projectedOverage,
      alertLevel,
    };
  }

  setBudget(daily?: number, weekly?: number): void {
    if (daily !== undefined) this.state.config.dailyBudget = daily;
    if (weekly !== undefined) this.state.config.weeklyBudget = weekly;
    this.saveState();
  }

  getStats(): {
    totalSessions: number;
    totalSpends: number;
    totalCost: number;
    avgEfficiency: number;
    topOperations: Array<{ operation: OperationType; tokens: number }>;
  } {
    const sessions = Object.values(this.state.sessions);
    const totalCost = sessions.reduce((sum, s) => sum + s.totalCost, 0);
    const avgEfficiency =
      sessions.length > 0
        ? sessions.reduce((sum, s) => sum + s.efficiency, 0) / sessions.length
        : 1;

    const opTotals: Record<OperationType, number> = {
      build: 0,
      test: 0,
      search: 0,
      read: 0,
      write: 0,
      edit: 0,
      agent: 0,
      mcp: 0,
      bash: 0,
      other: 0,
    };

    for (const session of sessions) {
      for (const [op, tokens] of Object.entries(session.operationBreakdown)) {
        opTotals[op as OperationType] += tokens;
      }
    }

    const topOperations = Object.entries(opTotals)
      .map(([operation, tokens]) => ({ operation: operation as OperationType, tokens }))
      .sort((a, b) => b.tokens - a.tokens)
      .slice(0, 5);

    return {
      totalSessions: sessions.length,
      totalSpends: this.state.spends.length,
      totalCost,
      avgEfficiency,
      topOperations,
    };
  }

  reset(): void {
    this.state = {
      spends: [],
      sessions: {},
      config: this.state.config,
    };
    this.saveState();
  }
}
