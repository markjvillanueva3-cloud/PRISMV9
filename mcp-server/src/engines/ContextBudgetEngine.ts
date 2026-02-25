/**
 * PRISM R15-MS4 — Context Budget Engine
 * ========================================
 *
 * Tracks and manages token/context budget allocation across dispatchers.
 * Ensures manufacturing operations stay within their allocated token budgets
 * and provides real-time usage reporting per category.
 *
 * Categories:
 *   - manufacturing (40%) — machining, tooling, materials queries
 *   - development   (20%) — code generation, debugging
 *   - context       (20%) — memory, knowledge graph, skill loading
 *   - reserve       (20%) — overflow, safety, uncategorized
 *
 * @version 1.0.0
 * @milestone R15-MS4
 */

// ============================================================================
// TYPES
// ============================================================================

/** Budget allocation entry for a single category */
export interface BudgetAllocation {
  category: string;
  percentage: number;
  tokenLimit: number;
  tokensUsed: number;
}

/** Full budget report across all categories */
export interface BudgetReport {
  totalBudget: number;
  totalUsed: number;
  utilizationPercent: number;
  categories: BudgetAllocation[];
  overBudgetCategories: string[];
  timestamp: string;
}

/** Single usage record */
export interface UsageRecord {
  category: string;
  tokens: number;
  timestamp: string;
}

// ============================================================================
// DEFAULT ALLOCATIONS
// ============================================================================

const DEFAULT_TOTAL_BUDGET = 100_000;

const DEFAULT_ALLOCATIONS: Record<string, number> = {
  manufacturing: 0.40,
  development: 0.20,
  context: 0.20,
  reserve: 0.20,
};

// ============================================================================
// ENGINE
// ============================================================================

/**
 * Context Budget Engine — tracks token/context budget allocation across
 * dispatchers and categories. Uses in-memory counters with percentage-based
 * allocation and real-time over-budget detection.
 */
export class ContextBudgetEngine {
  private static totalBudget: number = DEFAULT_TOTAL_BUDGET;
  private static allocations: Record<string, number> = { ...DEFAULT_ALLOCATIONS };
  private static usage: Map<string, number> = new Map();
  private static history: UsageRecord[] = [];

  /** Returns the current budget allocation map with percentages and limits. */
  static getBudget(): { totalBudget: number; allocations: Record<string, BudgetAllocation> } {
    const result: Record<string, BudgetAllocation> = {};
    for (const [cat, pct] of Object.entries(this.allocations)) {
      result[cat] = {
        category: cat,
        percentage: Math.round(pct * 100),
        tokenLimit: Math.round(this.totalBudget * pct),
        tokensUsed: this.usage.get(cat) ?? 0,
      };
    }
    return { totalBudget: this.totalBudget, allocations: result };
  }

  /** Record token usage for a given category. Creates the category if new. */
  static trackUsage(category: string, tokens: number): { category: string; tokensUsed: number; limit: number } {
    const cat = category.toLowerCase();
    const current = this.usage.get(cat) ?? 0;
    this.usage.set(cat, current + tokens);

    this.history.push({ category: cat, tokens, timestamp: new Date().toISOString() });

    // Ensure category exists in allocations (assign to reserve if unknown)
    const pct = this.allocations[cat] ?? this.allocations["reserve"] ?? 0.20;
    return {
      category: cat,
      tokensUsed: current + tokens,
      limit: Math.round(this.totalBudget * pct),
    };
  }

  /** Returns a full usage breakdown report across all tracked categories. */
  static getUsageReport(): BudgetReport {
    const totalUsed = Array.from(this.usage.values()).reduce((sum, v) => sum + v, 0);
    const overBudget: string[] = [];
    const categories: BudgetAllocation[] = [];

    for (const [cat, pct] of Object.entries(this.allocations)) {
      const used = this.usage.get(cat) ?? 0;
      const limit = Math.round(this.totalBudget * pct);
      categories.push({ category: cat, percentage: Math.round(pct * 100), tokenLimit: limit, tokensUsed: used });
      if (used > limit) overBudget.push(cat);
    }

    // Include any ad-hoc categories not in default allocations
    for (const [cat, used] of this.usage.entries()) {
      if (!this.allocations[cat]) {
        categories.push({ category: cat, percentage: 0, tokenLimit: 0, tokensUsed: used });
        overBudget.push(cat);
      }
    }

    return {
      totalBudget: this.totalBudget,
      totalUsed,
      utilizationPercent: this.totalBudget > 0 ? Math.round((totalUsed / this.totalBudget) * 100) : 0,
      categories,
      overBudgetCategories: overBudget,
      timestamp: new Date().toISOString(),
    };
  }

  /** Check whether a category has exceeded its allocated budget. */
  static isOverBudget(category: string): { overBudget: boolean; tokensUsed: number; limit: number; overage: number } {
    const cat = category.toLowerCase();
    const used = this.usage.get(cat) ?? 0;
    const pct = this.allocations[cat] ?? 0;
    const limit = Math.round(this.totalBudget * pct);
    return {
      overBudget: used > limit,
      tokensUsed: used,
      limit,
      overage: Math.max(0, used - limit),
    };
  }

  /** Reset all usage counters for a new session. Allocations are preserved. */
  static resetBudget(): { reset: true; previousTotal: number; categoriesCleared: number } {
    const prevTotal = Array.from(this.usage.values()).reduce((s, v) => s + v, 0);
    const count = this.usage.size;
    this.usage.clear();
    this.history = [];
    return { reset: true, previousTotal: prevTotal, categoriesCleared: count };
  }
}

export default ContextBudgetEngine;
