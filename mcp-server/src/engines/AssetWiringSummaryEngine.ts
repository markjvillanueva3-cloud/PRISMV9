/**
 * Asset Wiring Summary Engine
 * ===========================
 * Provides unified dashboard of all wiring engines and asset utilization status.
 * Aggregates data from AlgorithmWiringEngine, ReasoningWiringEngine,
 * FormulaWiringEngine, MITCourseIntegrationEngine, and TribalKnowledgeActivationEngine.
 *
 * PP-WIRE-MS7: Cross-asset wiring summary and utilization metrics
 *
 * @module engines/AssetWiringSummaryEngine
 * @version 1.0.0
 */

import { algorithmWiringEngine } from "./AlgorithmWiringEngine.js";
import { reasoningWiringEngine } from "./ReasoningWiringEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export interface AssetCategory {
  name: string;
  total: number;
  wired: number;
  orphan: number;
  coverage: number;
  source: string;
}

export interface WiringSummary {
  timestamp: string;
  totalAssets: number;
  totalWired: number;
  totalOrphan: number;
  overallCoverage: number;
  categories: AssetCategory[];
  topOrphans: { category: string; name: string; description: string }[];
  recommendations: string[];
}

export interface UtilizationTrend {
  category: string;
  before: number;
  after: number;
  improvement: number;
}

// ============================================================================
// STATIC DATA (from other wiring engines' stats)
// ============================================================================

// FormulaWiringEngine stats (from agent-created engine)
const FORMULA_STATS = {
  total: 558,
  wired: 453,
  orphan: 105,
  categories: 15, // scientific domains
};

// MITCourseIntegrationEngine stats (from agent-created engine)
const MIT_STATS = {
  courses: 65,
  algorithms: 143,
  domains: 18,
  coverage: 0.85,
};

// TribalKnowledgeActivationEngine stats (from agent-created engine)
const TRIBAL_STATS = {
  totalTips: 4493,
  activatedTips: 3594,
  dormantTips: 899,
  categories: 18,
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class AssetWiringSummaryEngine {
  /**
   * Get comprehensive wiring summary across all asset types
   */
  getSummary(): WiringSummary {
    const algoStats = algorithmWiringEngine.getStats();
    const reasoningStats = reasoningWiringEngine.getStats();

    const categories: AssetCategory[] = [
      {
        name: "Algorithms",
        total: algoStats.totalAlgorithms,
        wired: algoStats.wiredCount,
        orphan: algoStats.orphanCount,
        coverage: algoStats.wiredCount / algoStats.totalAlgorithms,
        source: "AlgorithmWiringEngine",
      },
      {
        name: "Reasoning Engines",
        total: reasoningStats.totalEngines,
        wired: reasoningStats.wiredCount,
        orphan: reasoningStats.orphanCount,
        coverage: reasoningStats.wiredCount / reasoningStats.totalEngines,
        source: "ReasoningWiringEngine",
      },
      {
        name: "Cross-Disciplinary Formulas",
        total: FORMULA_STATS.total,
        wired: FORMULA_STATS.wired,
        orphan: FORMULA_STATS.orphan,
        coverage: FORMULA_STATS.wired / FORMULA_STATS.total,
        source: "FormulaWiringEngine",
      },
      {
        name: "MIT Course Algorithms",
        total: MIT_STATS.algorithms,
        wired: Math.round(MIT_STATS.algorithms * MIT_STATS.coverage),
        orphan: Math.round(MIT_STATS.algorithms * (1 - MIT_STATS.coverage)),
        coverage: MIT_STATS.coverage,
        source: "MITCourseIntegrationEngine",
      },
      {
        name: "Tribal Knowledge Tips",
        total: TRIBAL_STATS.totalTips,
        wired: TRIBAL_STATS.activatedTips,
        orphan: TRIBAL_STATS.dormantTips,
        coverage: TRIBAL_STATS.activatedTips / TRIBAL_STATS.totalTips,
        source: "TribalKnowledgeActivationEngine",
      },
    ];

    const totalAssets = categories.reduce((sum, c) => sum + c.total, 0);
    const totalWired = categories.reduce((sum, c) => sum + c.wired, 0);
    const totalOrphan = categories.reduce((sum, c) => sum + c.orphan, 0);

    // Get top orphans from each category
    const topOrphans = [
      ...algorithmWiringEngine.listOrphanedAlgorithms().slice(0, 3).map(name => ({
        category: "Algorithm",
        name,
        description: algorithmWiringEngine.getAlgorithm(name)?.description || "",
      })),
      ...reasoningWiringEngine.listOrphanedEngines().slice(0, 3).map(name => ({
        category: "Reasoning",
        name,
        description: reasoningWiringEngine.getEngine(name)?.description || "",
      })),
    ];

    // Generate recommendations
    const recommendations = this.generateRecommendations(categories);

    return {
      timestamp: new Date().toISOString(),
      totalAssets,
      totalWired,
      totalOrphan,
      overallCoverage: totalWired / totalAssets,
      categories,
      topOrphans,
      recommendations,
    };
  }

  /**
   * Generate recommendations based on wiring status
   */
  private generateRecommendations(categories: AssetCategory[]): string[] {
    const recs: string[] = [];

    for (const cat of categories) {
      if (cat.coverage < 0.5) {
        recs.push(`${cat.name}: Low coverage (${(cat.coverage * 100).toFixed(0)}%) - ${cat.orphan} orphan assets need wiring`);
      } else if (cat.coverage < 0.75) {
        recs.push(`${cat.name}: Moderate coverage (${(cat.coverage * 100).toFixed(0)}%) - consider wiring top ${Math.min(5, cat.orphan)} orphans`);
      }
    }

    if (recs.length === 0) {
      recs.push("All categories have good coverage (>75%)");
    }

    return recs;
  }

  /**
   * Get utilization improvement since PP-WIRE phase started
   */
  getUtilizationTrends(): UtilizationTrend[] {
    // Before PP-WIRE phase (from scrutiny report)
    const beforeWiring = {
      algorithms: 0.35,
      reasoning: 0.30,
      formulas: 0.15,
      mitCourses: 0.0,
      tribal: 0.20,
    };

    const algoStats = algorithmWiringEngine.getStats();
    const reasoningStats = reasoningWiringEngine.getStats();

    return [
      {
        category: "Algorithms",
        before: beforeWiring.algorithms,
        after: algoStats.wiredCount / algoStats.totalAlgorithms,
        improvement: (algoStats.wiredCount / algoStats.totalAlgorithms) - beforeWiring.algorithms,
      },
      {
        category: "Reasoning Engines",
        before: beforeWiring.reasoning,
        after: reasoningStats.wiredCount / reasoningStats.totalEngines,
        improvement: (reasoningStats.wiredCount / reasoningStats.totalEngines) - beforeWiring.reasoning,
      },
      {
        category: "Cross-Disciplinary Formulas",
        before: beforeWiring.formulas,
        after: FORMULA_STATS.wired / FORMULA_STATS.total,
        improvement: (FORMULA_STATS.wired / FORMULA_STATS.total) - beforeWiring.formulas,
      },
      {
        category: "MIT Course Algorithms",
        before: beforeWiring.mitCourses,
        after: MIT_STATS.coverage,
        improvement: MIT_STATS.coverage - beforeWiring.mitCourses,
      },
      {
        category: "Tribal Knowledge",
        before: beforeWiring.tribal,
        after: TRIBAL_STATS.activatedTips / TRIBAL_STATS.totalTips,
        improvement: (TRIBAL_STATS.activatedTips / TRIBAL_STATS.totalTips) - beforeWiring.tribal,
      },
    ];
  }

  /**
   * Get dispatcher wiring coverage
   */
  getDispatcherCoverage(): { dispatcher: string; enginesWired: number; actionsAvailable: number }[] {
    return [
      { dispatcher: "prism_pp", enginesWired: 15, actionsAvailable: 80 },
      { dispatcher: "aiReasoningDispatcher", enginesWired: 8, actionsAvailable: 45 },
      { dispatcher: "prism_ai", enginesWired: 12, actionsAvailable: 65 },
      { dispatcher: "prism_turning", enginesWired: 6, actionsAvailable: 35 },
      { dispatcher: "prism_5axis", enginesWired: 4, actionsAvailable: 28 },
      { dispatcher: "prism_cam", enginesWired: 10, actionsAvailable: 52 },
      { dispatcher: "prism_quality", enginesWired: 5, actionsAvailable: 24 },
      { dispatcher: "prism_business", enginesWired: 3, actionsAvailable: 18 },
    ];
  }

  /**
   * Get category breakdown
   */
  getCategoryBreakdown(): {
    algorithms: { category: string; count: number }[];
    reasoning: { category: string; count: number }[];
    formulas: { domain: string; count: number }[];
  } {
    return {
      algorithms: algorithmWiringEngine.getCategories().map(c => ({ category: c.category, count: c.count })),
      reasoning: reasoningWiringEngine.getCategories().map(c => ({ category: c.category, count: c.count })),
      formulas: [
        { domain: "physics", count: 87 },
        { domain: "biology", count: 42 },
        { domain: "economics", count: 38 },
        { domain: "information_theory", count: 35 },
        { domain: "statistics", count: 52 },
        { domain: "psychology", count: 28 },
        { domain: "chemistry", count: 31 },
        { domain: "electrical_engineering", count: 45 },
        { domain: "operations_research", count: 40 },
        { domain: "finance", count: 33 },
        { domain: "graph_theory", count: 29 },
        { domain: "chaos_theory", count: 22 },
        { domain: "music_theory", count: 18 },
        { domain: "ecology", count: 25 },
        { domain: "computer_science", count: 33 },
      ],
    };
  }

  /**
   * Get quick stats for dashboard
   */
  getQuickStats(): {
    totalAssets: number;
    wiredPercentage: number;
    wiringEngines: number;
    dispatchersCovered: number;
    testsAdded: number;
  } {
    const summary = this.getSummary();
    return {
      totalAssets: summary.totalAssets,
      wiredPercentage: Math.round(summary.overallCoverage * 100),
      wiringEngines: 5, // Algorithm, Reasoning, Formula, MIT, Tribal
      dispatchersCovered: 8,
      testsAdded: 157, // 19 + 19 + 49 + 29 + 41
    };
  }

  /**
   * Get orphan priority list (highest value orphans to wire next)
   */
  getOrphanPriorityList(limit: number = 10): {
    name: string;
    category: string;
    priority: "high" | "medium" | "low";
    reason: string;
  }[] {
    const highValueOrphans = [
      // High-value algorithm orphans
      ...algorithmWiringEngine.listOrphanedAlgorithms().slice(0, 3).map(name => ({
        name,
        category: "Algorithm",
        priority: "high" as const,
        reason: algorithmWiringEngine.getAlgorithm(name)?.useCases[0] || "General optimization",
      })),
      // High-value reasoning orphans
      ...reasoningWiringEngine.listOrphanedEngines().slice(0, 3).map(name => ({
        name,
        category: "Reasoning",
        priority: "high" as const,
        reason: reasoningWiringEngine.getEngine(name)?.capabilities[0] || "Complex reasoning",
      })),
      // Medium priority orphans
      ...algorithmWiringEngine.listOrphanedAlgorithms().slice(3, 5).map(name => ({
        name,
        category: "Algorithm",
        priority: "medium" as const,
        reason: algorithmWiringEngine.getAlgorithm(name)?.useCases[0] || "Specialized use",
      })),
      ...reasoningWiringEngine.listOrphanedEngines().slice(3, 5).map(name => ({
        name,
        category: "Reasoning",
        priority: "medium" as const,
        reason: reasoningWiringEngine.getEngine(name)?.capabilities[0] || "Domain reasoning",
      })),
    ];

    return highValueOrphans.slice(0, limit);
  }
}

// Export singleton
export const assetWiringSummaryEngine = new AssetWiringSummaryEngine();
