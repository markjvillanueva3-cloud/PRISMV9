/**
 * ContextChainEngine — ACP-MS3
 *
 * Context management for automation chains:
 *   1. Task-aware bundle loading — select optimal files for the current task
 *   2. Context pressure estimation — predict when compaction is needed
 *   3. Compaction planning — what to preserve and what to prune
 *   4. Handoff generation — structure session state for resume
 *   5. Bundle priority scoring — rank bundles by relevance and cost
 *
 * Integrates with AutomationChainEngine's task classification and
 * context bundles to ensure each task gets optimal context loading.
 *
 * Sources:
 *   - ACP-MS3: Context, Compaction + Handoff Chain
 *   - AUTOMATION_CENSUS.json gap: context_management 90% → 100%
 *   - Existing hooks: context-pressure-tracker, auto-compact-gate
 */

import type { TaskClass, ContextBundle } from "./AutomationChainEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export interface ContextPressure {
  estimated_tokens_used: number;
  estimated_tokens_available: number;
  utilization_pct: number;
  pressure_level: "low" | "medium" | "high" | "critical";
  should_compact: boolean;
  estimated_messages_remaining: number;
}

export interface BundlePriority {
  bundle_id: string;
  files: string[];
  relevance_score: number;       // 0-1 how relevant to current task
  token_cost: number;            // estimated tokens
  cost_benefit_ratio: number;    // relevance / cost (higher = better)
  load_recommendation: "must_load" | "should_load" | "optional" | "skip";
}

export interface ContextLoadPlan {
  task_class: TaskClass;
  total_budget_tokens: number;
  bundles_to_load: BundlePriority[];
  bundles_skipped: BundlePriority[];
  estimated_token_cost: number;
  budget_remaining: number;
}

export interface CompactionPlan {
  should_compact: boolean;
  reason: string;
  preserve: CompactionPreserveItem[];
  prune: string[];
  estimated_savings_tokens: number;
  handoff_template: HandoffTemplate;
}

export interface CompactionPreserveItem {
  category: "position" | "physics" | "wiring" | "bugs" | "build" | "incomplete_work";
  content: string;
  priority: "critical" | "high" | "medium";
}

export interface HandoffTemplate {
  resume_instruction: string;
  state_summary: string;
  build_status: string;
  active_task: string;
  critical_facts: string[];
}

export interface ContextHealthReport {
  memory_lines: number;
  memory_status: "lean" | "ok" | "heavy" | "overflow";
  active_bundles: number;
  total_bundle_cost: number;
  pressure: ContextPressure;
  recommendations: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Token thresholds for context pressure levels */
const PRESSURE_THRESHOLDS = {
  low: 0.40,       // <40% utilization
  medium: 0.60,    // 40-60%
  high: 0.75,      // 60-75%
  critical: 0.85,  // >75% → should compact
};

/** Maximum memory lines before warning */
const MEMORY_LINE_LIMITS = {
  lean: 100,
  ok: 150,
  heavy: 200,
  overflow: 250,
};

/** Default context window size (1M model) */
const DEFAULT_CONTEXT_TOKENS = 1_000_000;

/** Approximate tokens per message exchange */
const TOKENS_PER_MESSAGE = 2000;

/** Task-specific relevance weights for bundle selection */
const TASK_BUNDLE_WEIGHTS: Record<TaskClass, Record<string, number>> = {
  backend: { "engine-digest": 0.9, "dispatcher-digest": 0.8, "physics": 0.3 },
  web: { "web-structure": 0.9 },
  cad_python: { "cad-structure": 0.9 },
  roadmap: { "position": 1.0, "handoff": 0.9 },
  audit: { "health": 0.8, "engine-digest": 0.6 },
  speed_feed: { "physics": 1.0, "engine-digest": 0.4 },
  post_process: { "pp-pipeline": 0.9, "physics": 0.5 },
  erp: { "biz-engines": 0.8 },
  general: {},
};

// ============================================================================
// ENGINE
// ============================================================================

export class ContextChainEngine {

  // ── Context Pressure ───────────────────────────────────────

  /**
   * Estimate current context pressure based on token usage.
   *
   * @param tokensUsed Approximate tokens consumed so far
   * @param contextSize Total context window size (default 1M)
   * @returns Pressure assessment with compaction recommendation
   */
  estimatePressure(tokensUsed: number, contextSize: number = DEFAULT_CONTEXT_TOKENS): ContextPressure {
    const utilization = tokensUsed / contextSize;
    let level: ContextPressure["pressure_level"];

    if (utilization >= PRESSURE_THRESHOLDS.critical) {
      level = "critical";
    } else if (utilization >= PRESSURE_THRESHOLDS.high) {
      level = "high";
    } else if (utilization >= PRESSURE_THRESHOLDS.medium) {
      level = "medium";
    } else {
      level = "low";
    }

    const remaining = contextSize - tokensUsed;
    const messagesRemaining = Math.max(0, Math.floor(remaining / TOKENS_PER_MESSAGE));

    return {
      estimated_tokens_used: tokensUsed,
      estimated_tokens_available: remaining,
      utilization_pct: parseFloat((utilization * 100).toFixed(1)),
      pressure_level: level,
      should_compact: level === "critical",
      estimated_messages_remaining: messagesRemaining,
    };
  }

  // ── Bundle Priority Scoring ────────────────────────────────

  /**
   * Score and prioritize context bundles for the current task.
   *
   * @param taskClass Current task classification
   * @param bundles Available context bundles
   * @param budgetTokens Maximum tokens to allocate for context
   * @returns Prioritized bundles with load recommendations
   */
  prioritizeBundles(
    taskClass: TaskClass,
    bundles: ContextBundle[],
    budgetTokens: number,
  ): BundlePriority[] {
    const weights = TASK_BUNDLE_WEIGHTS[taskClass] || {};

    return bundles.map(bundle => {
      const relevance = weights[bundle.id] ?? 0.3; // default low relevance
      const cost = bundle.token_cost_estimate;
      const ratio = cost > 0 ? relevance / (cost / 1000) : 0; // normalize cost to K tokens

      let recommendation: BundlePriority["load_recommendation"];
      if (relevance >= 0.8) {
        recommendation = "must_load";
      } else if (relevance >= 0.5) {
        recommendation = "should_load";
      } else if (relevance >= 0.2 && cost <= budgetTokens * 0.1) {
        recommendation = "optional";
      } else {
        recommendation = "skip";
      }

      return {
        bundle_id: bundle.id,
        files: bundle.files,
        relevance_score: relevance,
        token_cost: cost,
        cost_benefit_ratio: parseFloat(ratio.toFixed(3)),
        load_recommendation: recommendation,
      };
    }).sort((a, b) => b.relevance_score - a.relevance_score);
  }

  // ── Context Load Planning ──────────────────────────────────

  /**
   * Create a context load plan: which bundles to load within budget.
   *
   * @param taskClass Current task classification
   * @param bundles Available context bundles
   * @param budgetTokens Token budget for context loading
   * @returns Load plan with selected bundles and budget accounting
   */
  planContextLoad(
    taskClass: TaskClass,
    bundles: ContextBundle[],
    budgetTokens: number,
  ): ContextLoadPlan {
    const priorities = this.prioritizeBundles(taskClass, bundles, budgetTokens);

    const toLoad: BundlePriority[] = [];
    const skipped: BundlePriority[] = [];
    let totalCost = 0;

    for (const p of priorities) {
      if (p.load_recommendation === "skip") {
        skipped.push(p);
        continue;
      }

      if (totalCost + p.token_cost <= budgetTokens) {
        toLoad.push(p);
        totalCost += p.token_cost;
      } else if (p.load_recommendation === "must_load") {
        // Must-load bundles override budget (with warning)
        toLoad.push(p);
        totalCost += p.token_cost;
      } else {
        skipped.push(p);
      }
    }

    return {
      task_class: taskClass,
      total_budget_tokens: budgetTokens,
      bundles_to_load: toLoad,
      bundles_skipped: skipped,
      estimated_token_cost: totalCost,
      budget_remaining: Math.max(0, budgetTokens - totalCost),
    };
  }

  // ── Compaction Planning ────────────────────────────────────

  /**
   * Plan what to preserve and prune during compaction.
   *
   * @param pressure Current context pressure
   * @param activeTask Current task being worked on
   * @param buildStatus Last known build status
   * @param criticalFacts Key facts that must survive compaction
   * @returns Compaction plan with handoff template
   */
  planCompaction(
    pressure: ContextPressure,
    activeTask: string,
    buildStatus: string,
    criticalFacts: string[],
  ): CompactionPlan {
    const shouldCompact = pressure.pressure_level === "critical" ||
      pressure.utilization_pct >= PRESSURE_THRESHOLDS.critical * 100;

    const preserve: CompactionPreserveItem[] = [];

    // Always preserve: roadmap position
    preserve.push({
      category: "position",
      content: `Active task: ${activeTask}`,
      priority: "critical",
    });

    // Always preserve: build status
    preserve.push({
      category: "build",
      content: buildStatus,
      priority: "critical",
    });

    // Preserve critical facts
    for (const fact of criticalFacts) {
      preserve.push({
        category: "incomplete_work",
        content: fact,
        priority: "high",
      });
    }

    // Prune candidates (things safe to drop)
    const prune = [
      "Tool call details (only need results)",
      "File contents already committed",
      "Intermediate search results",
      "Verbose error traces (keep summary only)",
      "Completed task details (keep outcome only)",
    ];

    const handoff: HandoffTemplate = {
      resume_instruction: `Continue ${activeTask}. Build: ${buildStatus}.`,
      state_summary: `${preserve.length} facts preserved, ${prune.length} categories pruned.`,
      build_status: buildStatus,
      active_task: activeTask,
      critical_facts: criticalFacts,
    };

    return {
      should_compact: shouldCompact,
      reason: shouldCompact
        ? `Context at ${pressure.utilization_pct}% — compaction required`
        : `Context at ${pressure.utilization_pct}% — compaction not yet needed`,
      preserve,
      prune,
      estimated_savings_tokens: Math.round(pressure.estimated_tokens_used * 0.6),
      handoff_template: handoff,
    };
  }

  // ── Context Health Report ──────────────────────────────────

  /**
   * Generate a context health report.
   *
   * @param memoryLines Current MEMORY.md line count
   * @param tokensUsed Approximate tokens consumed
   * @param activeBundles Number of loaded context bundles
   * @param bundleCost Total token cost of loaded bundles
   * @returns Health report with recommendations
   */
  getHealthReport(
    memoryLines: number,
    tokensUsed: number,
    activeBundles: number = 0,
    bundleCost: number = 0,
  ): ContextHealthReport {
    const pressure = this.estimatePressure(tokensUsed);

    let memoryStatus: ContextHealthReport["memory_status"];
    if (memoryLines <= MEMORY_LINE_LIMITS.lean) {
      memoryStatus = "lean";
    } else if (memoryLines <= MEMORY_LINE_LIMITS.ok) {
      memoryStatus = "ok";
    } else if (memoryLines <= MEMORY_LINE_LIMITS.heavy) {
      memoryStatus = "heavy";
    } else {
      memoryStatus = "overflow";
    }

    const recommendations: string[] = [];

    if (memoryStatus === "heavy" || memoryStatus === "overflow") {
      recommendations.push(`Memory at ${memoryLines} lines — run /context-audit to identify stale entries`);
    }

    if (pressure.pressure_level === "critical") {
      recommendations.push("Context pressure CRITICAL — compact immediately");
    } else if (pressure.pressure_level === "high") {
      recommendations.push("Context pressure high — plan compaction within 5-10 messages");
    }

    if (activeBundles === 0 && tokensUsed > 50000) {
      recommendations.push("No context bundles loaded — run task classification to load relevant bundles");
    }

    if (bundleCost > tokensUsed * 0.3) {
      recommendations.push("Context bundles consuming >30% of tokens — consider pruning low-relevance bundles");
    }

    return {
      memory_lines: memoryLines,
      memory_status: memoryStatus,
      active_bundles: activeBundles,
      total_bundle_cost: bundleCost,
      pressure,
      recommendations,
    };
  }

  // ── Utility ────────────────────────────────────────────────

  /**
   * Get pressure thresholds (for testing/inspection).
   */
  getPressureThresholds(): typeof PRESSURE_THRESHOLDS {
    return { ...PRESSURE_THRESHOLDS };
  }

  /**
   * Get memory line limits (for testing/inspection).
   */
  getMemoryLimits(): typeof MEMORY_LINE_LIMITS {
    return { ...MEMORY_LINE_LIMITS };
  }
}

export const contextChainEngine = new ContextChainEngine();
