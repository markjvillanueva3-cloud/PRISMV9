/**
 * TokenEconomyEngine — MXU-MS2
 *
 * Optimal token allocation and context management:
 *   1. Budget computation — per-task token allocation
 *   2. Spending tracking — actual vs budgeted per session
 *   3. Waste detection — identify token waste patterns
 *   4. Compression strategy — recommend context compression approaches
 *   5. ROI computation — token cost vs capability value
 *
 * Sources:
 *   - MXU-MS2: Token Economy + Context Kernel
 *   - ContextChainEngine (ACP-MS3) for pressure estimation
 *   - AutomationChainEngine for task classification
 */

import type { TaskClass } from "./AutomationChainEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export interface TokenBudget {
  task_class: TaskClass;
  total_budget: number;
  context_loading: number;
  tool_calls: number;
  reasoning: number;
  output: number;
  reserve: number;
}

export interface TokenSpending {
  session_id: string;
  task_class: TaskClass;
  budget: TokenBudget;
  actual: {
    context_loading: number;
    tool_calls: number;
    reasoning: number;
    output: number;
  };
  utilization_pct: number;
  waste_pct: number;
  overspend: boolean;
}

export interface WastePattern {
  pattern: string;
  description: string;
  estimated_waste_tokens: number;
  fix: string;
  severity: "high" | "medium" | "low";
}

export interface CompressionStrategy {
  strategy: string;
  description: string;
  estimated_savings_pct: number;
  applicable_to: TaskClass[];
  tradeoff: string;
}

export interface TokenROI {
  task_class: TaskClass;
  tokens_spent: number;
  capabilities_unlocked: number;
  cost_per_capability: number;
  efficiency_rating: "excellent" | "good" | "fair" | "poor";
}

export interface EconomyReport {
  timestamp: string;
  session_count: number;
  total_tokens_spent: number;
  total_tokens_budgeted: number;
  overall_utilization_pct: number;
  overall_waste_pct: number;
  waste_patterns: WastePattern[];
  compression_recommendations: CompressionStrategy[];
  task_class_breakdown: Array<{
    task_class: TaskClass;
    sessions: number;
    avg_tokens: number;
    avg_utilization_pct: number;
  }>;
}

// ============================================================================
// BUDGET PROFILES
// ============================================================================

/** Token budget profiles per task class (for 1M context window) */
const BUDGET_PROFILES: Record<TaskClass, TokenBudget> = {
  backend: {
    task_class: "backend",
    total_budget: 200_000,
    context_loading: 40_000,
    tool_calls: 80_000,
    reasoning: 50_000,
    output: 20_000,
    reserve: 10_000,
  },
  web: {
    task_class: "web",
    total_budget: 150_000,
    context_loading: 30_000,
    tool_calls: 60_000,
    reasoning: 35_000,
    output: 15_000,
    reserve: 10_000,
  },
  cad_python: {
    task_class: "cad_python",
    total_budget: 120_000,
    context_loading: 25_000,
    tool_calls: 50_000,
    reasoning: 25_000,
    output: 12_000,
    reserve: 8_000,
  },
  roadmap: {
    task_class: "roadmap",
    total_budget: 180_000,
    context_loading: 50_000,
    tool_calls: 60_000,
    reasoning: 40_000,
    output: 20_000,
    reserve: 10_000,
  },
  audit: {
    task_class: "audit",
    total_budget: 250_000,
    context_loading: 60_000,
    tool_calls: 100_000,
    reasoning: 50_000,
    output: 30_000,
    reserve: 10_000,
  },
  speed_feed: {
    task_class: "speed_feed",
    total_budget: 100_000,
    context_loading: 30_000,
    tool_calls: 30_000,
    reasoning: 20_000,
    output: 12_000,
    reserve: 8_000,
  },
  post_process: {
    task_class: "post_process",
    total_budget: 150_000,
    context_loading: 35_000,
    tool_calls: 60_000,
    reasoning: 30_000,
    output: 15_000,
    reserve: 10_000,
  },
  erp: {
    task_class: "erp",
    total_budget: 130_000,
    context_loading: 30_000,
    tool_calls: 50_000,
    reasoning: 25_000,
    output: 15_000,
    reserve: 10_000,
  },
  general: {
    task_class: "general",
    total_budget: 160_000,
    context_loading: 35_000,
    tool_calls: 65_000,
    reasoning: 35_000,
    output: 15_000,
    reserve: 10_000,
  },
};

/** Known waste patterns */
const WASTE_PATTERNS: WastePattern[] = [
  {
    pattern: "duplicate_reads",
    description: "Reading the same file multiple times in one session",
    estimated_waste_tokens: 5_000,
    fix: "Use read-once caching hook (already active)",
    severity: "medium",
  },
  {
    pattern: "broad_search",
    description: "Grep/Glob without path narrowing — scans entire tree",
    estimated_waste_tokens: 10_000,
    fix: "Use ENGINE_DIGEST.md or /navigate before searching",
    severity: "high",
  },
  {
    pattern: "verbose_output",
    description: "Engine returning full data when summary would suffice",
    estimated_waste_tokens: 8_000,
    fix: "Use slimResponse() wrapper on dispatcher output",
    severity: "medium",
  },
  {
    pattern: "redundant_typecheck",
    description: "Running tsc --noEmit after every small edit",
    estimated_waste_tokens: 3_000,
    fix: "Batch edits, run tsc after 3-5 related changes",
    severity: "low",
  },
  {
    pattern: "context_bloat",
    description: "Loading full files when only a section is needed",
    estimated_waste_tokens: 15_000,
    fix: "Use offset/limit parameters on Read calls",
    severity: "high",
  },
  {
    pattern: "agent_over_spawn",
    description: "Spawning agents for tasks that could be done inline",
    estimated_waste_tokens: 20_000,
    fix: "Only use agents for parallelizable or deep-research tasks",
    severity: "high",
  },
];

/** Compression strategies */
const COMPRESSION_STRATEGIES: CompressionStrategy[] = [
  {
    strategy: "index_first",
    description: "Load digest indexes before any file search — avoids multi-round glob/grep",
    estimated_savings_pct: 30,
    applicable_to: ["backend", "audit", "roadmap"],
    tradeoff: "Requires up-to-date digest files",
  },
  {
    strategy: "task_bundles",
    description: "Load only task-relevant context bundles instead of everything",
    estimated_savings_pct: 25,
    applicable_to: ["backend", "web", "speed_feed", "post_process", "erp"],
    tradeoff: "May miss cross-domain dependencies",
  },
  {
    strategy: "progressive_detail",
    description: "Start with summaries, load details only when needed",
    estimated_savings_pct: 20,
    applicable_to: ["audit", "roadmap", "general"],
    tradeoff: "Slightly slower for detail-heavy tasks",
  },
  {
    strategy: "result_compression",
    description: "Compress tool call results using slimResponse()",
    estimated_savings_pct: 15,
    applicable_to: ["backend", "audit", "speed_feed", "post_process"],
    tradeoff: "May lose detail needed for debugging",
  },
  {
    strategy: "handoff_pruning",
    description: "Keep only critical facts in handoff, discard intermediate work",
    estimated_savings_pct: 40,
    applicable_to: ["backend", "roadmap", "audit"],
    tradeoff: "Context loss across compactions if pruning too aggressive",
  },
];

// ============================================================================
// ENGINE
// ============================================================================

export class TokenEconomyEngine {

  private spendingHistory: TokenSpending[] = [];

  // ── Budget Computation ─────────────────────────────────────

  /**
   * Get the optimal token budget for a task class.
   */
  getBudget(taskClass: TaskClass): TokenBudget {
    const profile = BUDGET_PROFILES[taskClass] || BUDGET_PROFILES.general;
    return { ...profile };
  }

  /**
   * Scale a budget by a multiplier (e.g., for complex tasks).
   */
  scaleBudget(budget: TokenBudget, multiplier: number): TokenBudget {
    return {
      ...budget,
      total_budget: Math.round(budget.total_budget * multiplier),
      context_loading: Math.round(budget.context_loading * multiplier),
      tool_calls: Math.round(budget.tool_calls * multiplier),
      reasoning: Math.round(budget.reasoning * multiplier),
      output: Math.round(budget.output * multiplier),
      reserve: Math.round(budget.reserve * multiplier),
    };
  }

  // ── Spending Tracking ──────────────────────────────────────

  /**
   * Record a session's token spending.
   */
  recordSpending(
    sessionId: string,
    taskClass: TaskClass,
    actual: { context_loading: number; tool_calls: number; reasoning: number; output: number },
  ): TokenSpending {
    const budget = this.getBudget(taskClass);
    const totalActual = actual.context_loading + actual.tool_calls + actual.reasoning + actual.output;
    const utilization = parseFloat(((totalActual / budget.total_budget) * 100).toFixed(1));

    // Waste = tokens spent beyond budget category allocations
    const overContext = Math.max(0, actual.context_loading - budget.context_loading);
    const overTool = Math.max(0, actual.tool_calls - budget.tool_calls);
    const overReason = Math.max(0, actual.reasoning - budget.reasoning);
    const overOutput = Math.max(0, actual.output - budget.output);
    const totalWaste = overContext + overTool + overReason + overOutput;
    const wastePct = parseFloat(((totalWaste / totalActual) * 100).toFixed(1));

    const spending: TokenSpending = {
      session_id: sessionId,
      task_class: taskClass,
      budget,
      actual,
      utilization_pct: utilization,
      waste_pct: wastePct,
      overspend: totalActual > budget.total_budget,
    };

    this.spendingHistory.push(spending);
    return spending;
  }

  // ── Waste Detection ────────────────────────────────────────

  /**
   * Detect waste patterns in a session.
   *
   * @param toolCallCount Number of tool calls made
   * @param fileReadsCount Number of file reads
   * @param uniqueFilesRead Number of unique files read
   * @param searchCount Number of search operations
   * @param agentSpawnCount Number of agents spawned
   * @returns Detected waste patterns with severity
   */
  detectWaste(
    toolCallCount: number,
    fileReadsCount: number,
    uniqueFilesRead: number,
    searchCount: number,
    agentSpawnCount: number,
  ): WastePattern[] {
    const detected: WastePattern[] = [];

    // Duplicate reads
    if (fileReadsCount > uniqueFilesRead * 1.5) {
      detected.push(WASTE_PATTERNS.find(p => p.pattern === "duplicate_reads")!);
    }

    // Broad search
    if (searchCount > 10) {
      detected.push(WASTE_PATTERNS.find(p => p.pattern === "broad_search")!);
    }

    // Agent over-spawn
    if (agentSpawnCount > 5) {
      detected.push(WASTE_PATTERNS.find(p => p.pattern === "agent_over_spawn")!);
    }

    // Context bloat (proxy: high read count relative to tool calls)
    if (fileReadsCount > toolCallCount * 0.4) {
      detected.push(WASTE_PATTERNS.find(p => p.pattern === "context_bloat")!);
    }

    return detected;
  }

  // ── Compression Recommendations ────────────────────────────

  /**
   * Get compression strategies applicable to a task class.
   */
  getCompressionStrategies(taskClass: TaskClass): CompressionStrategy[] {
    return COMPRESSION_STRATEGIES.filter(s =>
      s.applicable_to.includes(taskClass)
    ).sort((a, b) => b.estimated_savings_pct - a.estimated_savings_pct);
  }

  // ── ROI Computation ────────────────────────────────────────

  /**
   * Compute token ROI for a session.
   */
  computeROI(
    taskClass: TaskClass,
    tokensSpent: number,
    capabilitiesDelivered: number,
  ): TokenROI {
    const costPerCap = capabilitiesDelivered > 0 ? tokensSpent / capabilitiesDelivered : Infinity;

    let rating: TokenROI["efficiency_rating"];
    if (costPerCap < 10_000) rating = "excellent";
    else if (costPerCap < 25_000) rating = "good";
    else if (costPerCap < 50_000) rating = "fair";
    else rating = "poor";

    return {
      task_class: taskClass,
      tokens_spent: tokensSpent,
      capabilities_unlocked: capabilitiesDelivered,
      cost_per_capability: Math.round(costPerCap),
      efficiency_rating: rating,
    };
  }

  // ── Economy Report ─────────────────────────────────────────

  /**
   * Generate economy report from spending history.
   */
  generateReport(): EconomyReport {
    const totalSpent = this.spendingHistory.reduce((sum, s) =>
      sum + s.actual.context_loading + s.actual.tool_calls + s.actual.reasoning + s.actual.output, 0);
    const totalBudgeted = this.spendingHistory.reduce((sum, s) => sum + s.budget.total_budget, 0);

    // Task class breakdown
    const byClass = new Map<TaskClass, { sessions: number; totalTokens: number; totalUtil: number }>();
    for (const s of this.spendingHistory) {
      const existing = byClass.get(s.task_class) || { sessions: 0, totalTokens: 0, totalUtil: 0 };
      existing.sessions++;
      existing.totalTokens += s.actual.context_loading + s.actual.tool_calls + s.actual.reasoning + s.actual.output;
      existing.totalUtil += s.utilization_pct;
      byClass.set(s.task_class, existing);
    }

    const breakdown = Array.from(byClass.entries()).map(([tc, data]) => ({
      task_class: tc,
      sessions: data.sessions,
      avg_tokens: Math.round(data.totalTokens / data.sessions),
      avg_utilization_pct: parseFloat((data.totalUtil / data.sessions).toFixed(1)),
    }));

    return {
      timestamp: new Date().toISOString(),
      session_count: this.spendingHistory.length,
      total_tokens_spent: totalSpent,
      total_tokens_budgeted: totalBudgeted,
      overall_utilization_pct: totalBudgeted > 0 ? parseFloat(((totalSpent / totalBudgeted) * 100).toFixed(1)) : 0,
      overall_waste_pct: this.spendingHistory.length > 0
        ? parseFloat((this.spendingHistory.reduce((s, sp) => s + sp.waste_pct, 0) / this.spendingHistory.length).toFixed(1))
        : 0,
      waste_patterns: WASTE_PATTERNS,
      compression_recommendations: COMPRESSION_STRATEGIES,
      task_class_breakdown: breakdown,
    };
  }

  /**
   * Get all known waste patterns.
   */
  getAllWastePatterns(): WastePattern[] {
    return [...WASTE_PATTERNS];
  }

  /**
   * Clear spending history (for testing).
   */
  clearHistory(): void {
    this.spendingHistory = [];
  }

  /**
   * Get spending history.
   */
  getHistory(): TokenSpending[] {
    return [...this.spendingHistory];
  }
}

export const tokenEconomyEngine = new TokenEconomyEngine();
