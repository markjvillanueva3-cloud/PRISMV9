/**
 * PRISM MCP Server - Agent Intelligence Hooks
 * D1.2 Enhancement: Agent Tier Selection, Cost Control, Escalation
 * 
 * Synergizes with:
 * - HookEngine AGENT-COST-GUARD-001 (blocking gate in autoHookWrapper)
 * - HookEngine AGENT-ESCALATION-DETECT-001 (escalation advisory)
 * - HookEngine AGENT-RESULT-QUALITY-001 (quality gate)
 * - DISPATCHER_HOOK_MAP: prism_manus, prism_autopilot_d, prism_atcs → AGENT
 * 
 * These HookExecutor hooks fire via hookExecutor.execute("pre-agent-execute", ctx)
 * while HookEngine hooks fire via fireHook("AGENT-BEFORE-EXEC-001", ctx).
 * Both systems run — HookEngine for fast phase0 checks, HookExecutor for
 * deep domain-specific validation with richer context.
 * 
 * HOOKS IN THIS MODULE:
 * - pre-agent-tier-recommend: Recommend optimal tier based on task complexity
 * - pre-agent-cost-estimate: Estimate API cost before execution
 * - post-agent-escalation-check: Detect when result quality warrants escalation
 * - post-agent-performance-track: Track agent success rates by tier/task
 * - on-agent-timeout-recovery: Handle agent timeouts with retry/fallback
 * - pre-agent-duplicate-guard: Prevent redundant agent calls for same task
 * - post-agent-learning-extract: Extract patterns from agent successes/failures
 * - on-agent-safety-escalate: Auto-escalate to OPUS for safety-critical tasks
 *
 * @version 1.0.0
 * @date 2026-02-12
 */

import {
  HookDefinition,
  HookContext,
  HookResult,
  hookSuccess,
  hookBlock,
  hookWarning
} from "../engines/HookExecutor.js";
import { log } from "../utils/Logger.js";

// ============================================================================
// CONSTANTS & STATE
// ============================================================================

/** Cost per 1M tokens by tier (input + output blended estimate) */
const TIER_COSTS: Record<string, number> = {
  opus: 75.0,
  sonnet: 3.0,
  haiku: 0.25
};

/** Estimated tokens per agent call by complexity */
const COMPLEXITY_TOKENS: Record<string, number> = {
  simple: 2000,
  medium: 8000,
  complex: 25000,
  critical: 50000
};

/** Actions that are inherently simple lookups */
const SIMPLE_ACTIONS = new Set([
  "material_get", "material_search", "machine_get", "machine_search",
  "tool_get", "tool_search", "tool_facets", "alarm_decode", "alarm_search",
  "formula_get", "skill_get", "script_get", "skill_list", "script_list"
]);

/** Actions that are safety-critical and warrant OPUS */
const SAFETY_CRITICAL_ACTIONS = new Set([
  "check_toolpath_collision", "validate_rapid_moves", "check_fixture_clearance",
  "predict_tool_breakage", "calculate_tool_stress", "check_chip_load_limits",
  "check_spindle_torque", "check_spindle_power", "validate_workholding_setup"
]);

/** Track agent performance across the session */
const agentPerformance: Map<string, { 
  calls: number; successes: number; failures: number; 
  totalDuration: number; lastCall: string 
}> = new Map();

/** Track recent agent tasks to detect duplicates */
const recentAgentTasks: Array<{ task: string; tier: string; timestamp: number; result: string }> = [];
const MAX_RECENT_TASKS = 20;

// ============================================================================
// HOOK DEFINITIONS
// ============================================================================

/**
 * Pre-agent tier recommendation — suggests optimal tier before execution.
 * Synergy: Complements HookEngine AGENT-COST-GUARD-001 (which BLOCKS wasteful OPUS).
 * This hook ADVISES the right tier; the HookEngine hook ENFORCES it.
 */
const preAgentTierRecommend: HookDefinition = {
  id: "pre-agent-tier-recommend",
  name: "Agent Tier Recommender",
  description: "Recommends optimal agent tier based on task complexity, safety criticality, and cost.",
  phase: "pre-agent-execute",
  category: "agent",
  mode: "warning",
  priority: "high",
  enabled: true,
  tags: ["agent", "cost-optimization", "tier-selection"],
  handler: (context: HookContext): HookResult => {
    const hook = preAgentTierRecommend;
    const meta = context.metadata as Record<string, any> | undefined;
    const action = (meta?.action || context.operation || "") as string;
    const requestedTier = ((meta?.tier || meta?.model || "") as string).toLowerCase();
    const taskComplexity = (meta?.complexity || "medium") as string;

    let recommendedTier = "sonnet"; // Default
    let reason = "Standard complexity task";

    // Safety-critical → always OPUS
    if (SAFETY_CRITICAL_ACTIONS.has(action) || meta?.safety_critical === true) {
      recommendedTier = "opus";
      reason = `Safety-critical action: ${action}`;
    }
    // Simple lookups → HAIKU
    else if (SIMPLE_ACTIONS.has(action as string) || taskComplexity === "simple") {
      recommendedTier = "haiku";
      reason = `Simple lookup: ${action}`;
    }
    // Complex reasoning → OPUS
    else if (taskComplexity === "complex" || taskComplexity === "critical") {
      recommendedTier = "opus";
      reason = `Complex task: ${taskComplexity}`;
    }

    const tierMatch = requestedTier.includes(recommendedTier);
    if (!tierMatch && requestedTier) {
      return hookWarning(hook, 
        `Tier advisory: requested ${requestedTier}, recommended ${recommendedTier}. ${reason}`, {
        recommended_tier: recommendedTier,
        requested_tier: requestedTier,
        reason,
        cost_ratio: requestedTier.includes("opus") && recommendedTier === "haiku" 
          ? `${(TIER_COSTS.opus / TIER_COSTS.haiku).toFixed(0)}x more expensive` : undefined
      });
    }
    return hookSuccess(hook, `Tier ${recommendedTier} appropriate. ${reason}`);
  }
};

/**
 * Pre-agent cost estimate — warn if estimated cost is high.
 */
const preAgentCostEstimate: HookDefinition = {
  id: "pre-agent-cost-estimate",
  name: "Agent Cost Estimator",
  description: "Estimates API cost before agent execution and warns if expensive.",
  phase: "pre-agent-execute",
  category: "agent",
  mode: "warning",
  priority: "normal",
  enabled: true,
  tags: ["agent", "cost-optimization"],
  handler: (context: HookContext): HookResult => {
    const hook = preAgentCostEstimate;
    const meta = context.metadata as Record<string, any> | undefined;
    const tier = ((meta?.tier || "sonnet") as string).toLowerCase();
    const complexity = (meta?.complexity || "medium") as string;
    const tierKey = tier.includes("opus") ? "opus" : tier.includes("haiku") ? "haiku" : "sonnet";
    const estimatedTokens = COMPLEXITY_TOKENS[complexity] || COMPLEXITY_TOKENS.medium;
    const estimatedCost = (estimatedTokens / 1_000_000) * (TIER_COSTS[tierKey] || TIER_COSTS.sonnet);
    
    if (estimatedCost > 0.10) {
      return hookWarning(hook,
        `High estimated cost: $${estimatedCost.toFixed(4)} (${tierKey}/${complexity}, ~${estimatedTokens} tokens)`, {
        estimated_cost_usd: estimatedCost,
        tier: tierKey,
        estimated_tokens: estimatedTokens
      });
    }
    return hookSuccess(hook, `Cost estimate: $${estimatedCost.toFixed(4)} (${tierKey})`);
  }
};

/**
 * Post-agent performance tracking — builds success rate data per tier/action.
 * Synergy: Feeds data to AGENT-ESCALATION-DETECT-001 for smarter escalation.
 */
const postAgentPerformanceTrack: HookDefinition = {
  id: "post-agent-performance-track",
  name: "Agent Performance Tracker",
  description: "Tracks agent success rates by tier and action for pattern detection.",
  phase: "post-agent-execute",
  category: "agent",
  mode: "logging",
  priority: "low",
  enabled: true,
  tags: ["agent", "observability", "learning"],
  handler: (context: HookContext): HookResult => {
    const hook = postAgentPerformanceTrack;
    const meta = context.metadata as Record<string, any> | undefined;
    const tier = ((meta?.tier || "sonnet") as string).toLowerCase();
    const action = (meta?.action || "unknown") as string;
    const success = meta?.success !== false;
    const duration = (meta?.duration_ms || 0) as number;
    const key = `${tier}:${action}`;

    const perf = agentPerformance.get(key) || { calls: 0, successes: 0, failures: 0, totalDuration: 0, lastCall: "" };
    perf.calls++;
    if (success) perf.successes++; else perf.failures++;
    perf.totalDuration += duration;
    perf.lastCall = new Date().toISOString();
    agentPerformance.set(key, perf);

    const successRate = perf.calls > 0 ? (perf.successes / perf.calls * 100).toFixed(1) : "N/A";
    return hookSuccess(hook, `${key}: ${successRate}% success (${perf.calls} calls)`, {
      agent_key: key, success_rate: successRate, total_calls: perf.calls
    });
  }
};

/**
 * Agent timeout recovery — suggest retry with different tier on timeout.
 */
const onAgentTimeoutRecovery: HookDefinition = {
  id: "on-agent-timeout-recovery",
  name: "Agent Timeout Recovery",
  description: "On agent timeout, suggests retry with faster tier or simplified prompt.",
  phase: "on-agent-timeout",
  category: "agent",
  mode: "warning",
  priority: "high",
  enabled: true,
  tags: ["agent", "recovery", "resilience"],
  handler: (context: HookContext): HookResult => {
    const hook = onAgentTimeoutRecovery;
    const meta = context.metadata as Record<string, any> | undefined;
    const tier = ((meta?.tier || "") as string).toLowerCase();
    const action = (meta?.action || "") as string;
    const timeoutMs = (meta?.timeout_ms || 30000) as number;
    
    let suggestion = "Retry with reduced prompt complexity";
    if (tier.includes("opus")) {
      suggestion = "Downgrade to SONNET for faster response, or increase timeout";
    } else if (tier.includes("sonnet")) {
      suggestion = "Try HAIKU for quick lookup, or split into smaller subtasks";
    }
    return hookWarning(hook,
      `Agent timeout after ${(timeoutMs / 1000).toFixed(1)}s on ${tier}:${action}. ${suggestion}`, {
      tier, action, timeout_ms: timeoutMs, suggestion
    });
  }
};

/**
 * Duplicate agent guard — detect repeated calls for same task.
 */
const preAgentDuplicateGuard: HookDefinition = {
  id: "pre-agent-duplicate-guard",
  name: "Agent Duplicate Guard",
  description: "Warns if same agent task was recently executed (possible wasted API call).",
  phase: "pre-agent-execute",
  category: "agent",
  mode: "warning",
  priority: "normal",
  enabled: true,
  tags: ["agent", "cost-optimization", "dedup"],
  handler: (context: HookContext): HookResult => {
    const hook = preAgentDuplicateGuard;
    const meta = context.metadata as Record<string, any> | undefined;
    const task = (meta?.task || meta?.prompt || "") as string;
    const tier = ((meta?.tier || "sonnet") as string).toLowerCase();
    if (!task || task.length < 20) return hookSuccess(hook, "No task to dedup");

    const taskFingerprint = task.slice(0, 100).toLowerCase().replace(/\s+/g, " ");
    const now = Date.now();
    const duplicate = recentAgentTasks.find(t => 
      t.task === taskFingerprint && (now - t.timestamp) < 300000 // 5 min window
    );

    // Track this task
    recentAgentTasks.push({ task: taskFingerprint, tier, timestamp: now, result: "pending" });
    if (recentAgentTasks.length > MAX_RECENT_TASKS) recentAgentTasks.shift();

    if (duplicate) {
      return hookWarning(hook,
        `Duplicate agent task detected (last run ${((now - duplicate.timestamp) / 1000).toFixed(0)}s ago, result: ${duplicate.result}). Consider using cached result.`, {
        previous_result: duplicate.result, seconds_ago: (now - duplicate.timestamp) / 1000
      });
    }
    return hookSuccess(hook, "No duplicate detected");
  }
};

/**
 * Safety auto-escalation — force OPUS for safety-critical calculations.
 * Synergy: Works with HookEngine AGENT-ESCALATION-DETECT-001 but this one
 * is BLOCKING — it will actually prevent execution at wrong tier.
 */
const onAgentSafetyEscalate: HookDefinition = {
  id: "on-agent-safety-escalate",
  name: "Safety Auto-Escalation (BLOCKING)",
  description: "BLOCKS non-OPUS agents from executing safety-critical calculations.",
  phase: "pre-agent-execute",
  category: "agent",
  mode: "blocking",
  priority: "critical",
  enabled: true,
  tags: ["agent", "safety", "escalation", "critical"],
  handler: (context: HookContext): HookResult => {
    const hook = onAgentSafetyEscalate;
    const meta = context.metadata as Record<string, any> | undefined;
    const action = (meta?.action || context.operation || "") as string;
    const tier = ((meta?.tier || meta?.model || "") as string).toLowerCase();
    const isSafetyCritical = SAFETY_CRITICAL_ACTIONS.has(action as string) ||
      meta?.safety_critical === true ||
      (meta?.safety_score !== undefined && meta?.safety_score !== null && (meta.safety_score as number) < 0.75);

    if (isSafetyCritical && !tier.includes("opus")) {
      return hookBlock(hook,
        `🚫 SAFETY ESCALATION: Action "${action}" is safety-critical. Must use OPUS tier (got ${tier}). Lives depend on maximum reasoning quality.`, {
        action, current_tier: tier, required_tier: "opus",
        reason: "Safety-critical operations require OPUS-level reasoning"
      });
    }
    return hookSuccess(hook, `Tier ${tier} acceptable for ${action}`);
  }
};

/**
 * Post-agent learning extraction — capture what worked/failed for future sessions.
 * Synergy: Feeds into prism_guard→learning_save and session_memory.json
 */
const postAgentLearningExtract: HookDefinition = {
  id: "post-agent-learning-extract",
  name: "Agent Learning Extractor",
  description: "Extracts success/failure patterns from agent executions for cross-session learning.",
  phase: "post-agent-execute",
  category: "agent",
  mode: "logging",
  priority: "background",
  enabled: true,
  tags: ["agent", "learning", "patterns"],
  handler: (context: HookContext): HookResult => {
    const hook = postAgentLearningExtract;
    const meta = context.metadata as Record<string, any> | undefined;
    const tier = ((meta?.tier || "sonnet") as string).toLowerCase();
    const action = (meta?.action || "unknown") as string;
    const success = meta?.success !== false;
    const duration = (meta?.duration_ms || 0) as number;
    const errorMsg = (meta?.error_message || "") as string;

    // Update recent tasks with result
    const taskFingerprint = ((meta?.task || "") as string).slice(0, 100).toLowerCase().replace(/\s+/g, " ");
    const recent = recentAgentTasks.find(t => t.task === taskFingerprint && t.result === "pending");
    if (recent) recent.result = success ? "success" : "failed";

    const pattern = {
      tier, action, success, duration_ms: duration,
      error_type: errorMsg ? errorMsg.split(":")[0] : undefined,
      timestamp: new Date().toISOString()
    };

    return hookSuccess(hook, 
      `Learning captured: ${tier}:${action} → ${success ? "✓" : "✗"} (${duration}ms)`, {
      pattern, agent_performance: Object.fromEntries(
        [...agentPerformance.entries()].slice(-10).map(([k, v]) => [k, { 
          rate: `${(v.successes / v.calls * 100).toFixed(0)}%`, calls: v.calls 
        }])
      )
    });
  }
};

// ============================================================================
// EXPORT
// ============================================================================

export const agentHooks: HookDefinition[] = [
  preAgentTierRecommend,
  preAgentCostEstimate,
  postAgentPerformanceTrack,
  onAgentTimeoutRecovery,
  preAgentDuplicateGuard,
  onAgentSafetyEscalate,
  postAgentLearningExtract,
];
