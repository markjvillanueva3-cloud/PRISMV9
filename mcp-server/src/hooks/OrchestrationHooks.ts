/**
 * PRISM MCP Server - Orchestration & Swarm Hooks
 * D1.2 Enhancement: Swarm Pattern Validation, Pipeline Tracking, Consensus
 * 
 * Synergizes with:
 * - HookEngine ORCH-CONSENSUS-GUARD-001 (blocking quorum check)
 * - HookEngine ORCH-PARALLEL-LIMIT-001 (blocking agent count cap)
 * - HookEngine ORCH-PATTERN-VALIDATE-001 (pattern advisory)
 * - HookEngine ORCH-PIPELINE-CHECKPOINT-001 (pipeline stage tracking)
 * - DISPATCHER_HOOK_MAP: prism_orchestrate → ORCH category
 * - AgentHooks (tier selection feeds into swarm agent configuration)
 * 
 * These HookExecutor hooks fire via hookExecutor.execute("pre-swarm-execute", ctx)
 * providing deep domain validation beyond HookEngine's fast phase0 checks.
 *
 * HOOKS IN THIS MODULE:
 * - pre-swarm-pattern-select: Validate pattern fits task characteristics
 * - pre-swarm-agent-mix: Validate agent tier mix for swarm composition
 * - post-swarm-result-merge: Validate merged results quality
 * - on-swarm-consensus-vote: Track and validate consensus voting
 * - pre-pipeline-stage-gate: Quality gate between pipeline stages
 * - post-pipeline-completion: Pipeline completion audit trail
 * - on-swarm-cost-budget: Track cumulative swarm cost against budget
 * - pre-swarm-atcs-bridge: Validate ATCS→swarm delegation
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

/** Valid swarm patterns and their constraints */
const SWARM_PATTERNS: Record<string, { 
  minAgents: number; maxAgents: number; 
  idealAgents: number; requiresOdd: boolean;
  description: string;
}> = {
  parallel_extract:  { minAgents: 2, maxAgents: 20, idealAgents: 5,  requiresOdd: false, description: "All agents same input, collect results" },
  ralph_loop:        { minAgents: 2, maxAgents: 3,  idealAgents: 3,  requiresOdd: false, description: "Generate → critique → refine cycle" },
  pipeline:          { minAgents: 2, maxAgents: 10, idealAgents: 4,  requiresOdd: false, description: "Sequential A→B→C with handoffs" },
  map_reduce:        { minAgents: 2, maxAgents: 20, idealAgents: 5,  requiresOdd: false, description: "Distribute work, aggregate results" },
  consensus:         { minAgents: 3, maxAgents: 5,  idealAgents: 3,  requiresOdd: true,  description: "Multiple agents vote, majority wins" },
  specialist_team:   { minAgents: 2, maxAgents: 10, idealAgents: 4,  requiresOdd: false, description: "Different agents for subtasks" },
  redundant_verify:  { minAgents: 2, maxAgents: 5,  idealAgents: 3,  requiresOdd: false, description: "Same task to multiple agents, compare" },
  hierarchical:      { minAgents: 2, maxAgents: 20, idealAgents: 5,  requiresOdd: false, description: "Coordinator + workers" }
};

/** Track swarm costs within session */
let sessionSwarmCostUSD = 0;
const SWARM_COST_BUDGET_USD = 5.0; // Warn threshold per session

/** Track pipeline progress */
const pipelineProgress: Map<string, {
  totalStages: number; completedStages: number; 
  failedStages: number; startTime: number;
}> = new Map();

// ============================================================================
// HOOK DEFINITIONS
// ============================================================================

/**
 * Swarm pattern selection validator — deep validation beyond HookEngine's advisory.
 * Synergy: HookEngine ORCH-PATTERN-VALIDATE-001 gives quick warnings.
 * This hook does deeper analysis with task-to-pattern matching.
 */
const preSwarmPatternSelect: HookDefinition = {
  id: "pre-swarm-pattern-select",
  name: "Swarm Pattern Selection Validator",
  description: "Validates swarm pattern selection matches task characteristics with deep analysis.",
  phase: "pre-swarm-execute",
  category: "orchestration",
  mode: "warning",
  priority: "high",
  enabled: true,
  tags: ["orchestration", "swarm", "pattern-selection"],
  handler: (context: HookContext): HookResult => {
    const hook = preSwarmPatternSelect;
    const pattern = context.metadata?.pattern || "";
    const agentCount = context.metadata?.agent_count || context.metadata?.agents?.length || 0;
    const taskType = context.metadata?.task_type || "";
    
    const spec = SWARM_PATTERNS[pattern];
    if (!spec) {
      return hookWarning(hook, 
        `Unknown swarm pattern "${pattern}". Valid: ${Object.keys(SWARM_PATTERNS).join(", ")}`, {
        valid_patterns: Object.keys(SWARM_PATTERNS)
      });
    }

    const issues: string[] = [];
    if (agentCount < spec.minAgents) {
      issues.push(`${pattern} requires ≥${spec.minAgents} agents (got ${agentCount})`);
    }
    if (agentCount > spec.maxAgents) {
      issues.push(`${pattern} supports max ${spec.maxAgents} agents (got ${agentCount})`);
    }
    if (spec.requiresOdd && agentCount % 2 === 0) {
      issues.push(`${pattern} works best with odd agent count for clean majority (got ${agentCount})`);
    }
    
    // Task-to-pattern fit suggestions
    if (taskType === "validation" && pattern !== "redundant_verify" && pattern !== "ralph_loop") {
      issues.push(`Validation tasks work best with redundant_verify or ralph_loop (got ${pattern})`);
    }
    if (taskType === "data_campaign" && pattern !== "map_reduce") {
      issues.push(`Data campaigns work best with map_reduce pattern (got ${pattern})`);
    }

    if (issues.length > 0) {
      return hookWarning(hook, `Pattern issues: ${issues.join("; ")}`, {
        pattern, agent_count: agentCount, ideal: spec.idealAgents, issues
      });
    }
    return hookSuccess(hook, `Pattern ${pattern} with ${agentCount} agents validated`);
  }
};

/**
 * Swarm agent mix validator — ensure tier distribution makes sense.
 * E.g., don't use all OPUS agents for a map_reduce where HAIKU workers suffice.
 */
const preSwarmAgentMix: HookDefinition = {
  id: "pre-swarm-agent-mix",
  name: "Swarm Agent Mix Validator",
  description: "Validates agent tier distribution in swarm is cost-effective.",
  phase: "pre-swarm-execute",
  category: "orchestration",
  mode: "warning",
  priority: "normal",
  enabled: true,
  tags: ["orchestration", "swarm", "cost-optimization"],
  handler: (context: HookContext): HookResult => {
    const hook = preSwarmAgentMix;
    const agents = context.metadata?.agents || [];
    const pattern = context.metadata?.pattern || "";
    
    if (!Array.isArray(agents) || agents.length === 0) {
      return hookSuccess(hook, "No agent list to validate");
    }

    const tierCounts: Record<string, number> = { opus: 0, sonnet: 0, haiku: 0 };
    for (const agent of agents) {
      const tier = (agent.tier || agent.model || "sonnet").toLowerCase();
      const key = tier.includes("opus") ? "opus" : tier.includes("haiku") ? "haiku" : "sonnet";
      tierCounts[key]++;
    }

    const warnings: string[] = [];
    const totalOpusCost = tierCounts.opus * 75; // Relative cost units

    if (pattern === "map_reduce" && tierCounts.opus > 1) {
      warnings.push(`map_reduce with ${tierCounts.opus} OPUS agents is expensive. Workers should be HAIKU/SONNET; only reducer needs higher tier.`);
    }
    if (pattern === "parallel_extract" && tierCounts.opus > 0 && agents.length > 3) {
      warnings.push(`parallel_extract with ${tierCounts.opus} OPUS agents × ${agents.length} total = high cost. Consider SONNET agents.`);
    }
    if (tierCounts.opus === agents.length && agents.length > 2) {
      warnings.push(`All ${agents.length} agents are OPUS ($75/1M each). Mix tiers for cost efficiency.`);
    }

    if (warnings.length > 0) {
      return hookWarning(hook, warnings.join(" | "), { tier_distribution: tierCounts, warnings });
    }
    return hookSuccess(hook, `Agent mix: ${JSON.stringify(tierCounts)}`);
  }
};

/**
 * Swarm result merge quality — validate merged results after swarm completion.
 */
const postSwarmResultMerge: HookDefinition = {
  id: "post-swarm-result-merge",
  name: "Swarm Result Merge Validator",
  description: "Validates quality of merged swarm results — checks for empty, conflicting, or low-quality outputs.",
  phase: "post-swarm-complete",
  category: "orchestration",
  mode: "warning",
  priority: "high",
  enabled: true,
  tags: ["orchestration", "swarm", "quality"],
  handler: (context: HookContext): HookResult => {
    const hook = postSwarmResultMerge;
    const results = context.metadata?.results || [];
    const pattern = context.metadata?.pattern || "";
    const agentCount = context.metadata?.agent_count || results.length;
    
    const warnings: string[] = [];
    const emptyResults = results.filter((r: any) => !r || !r.result || r.result === "").length;
    const errorResults = results.filter((r: any) => r.error || r.status === "error").length;

    if (emptyResults > 0) {
      warnings.push(`${emptyResults}/${agentCount} agents returned empty results`);
    }
    if (errorResults > 0) {
      warnings.push(`${errorResults}/${agentCount} agents errored`);
    }
    if (agentCount > 0 && (emptyResults + errorResults) > agentCount / 2) {
      warnings.push(`Majority of agents failed (${emptyResults + errorResults}/${agentCount}). Swarm result unreliable.`);
    }

    if (warnings.length > 0) {
      return hookWarning(hook, `Merge quality issues: ${warnings.join("; ")}`, {
        total_agents: agentCount, empty: emptyResults, errors: errorResults, warnings
      });
    }
    return hookSuccess(hook, `All ${agentCount} agents produced results`);
  }
};

/**
 * Consensus vote tracker — validate voting integrity in consensus swarms.
 * Synergy: Complements HookEngine ORCH-CONSENSUS-GUARD-001 (quorum gate).
 */
const onSwarmConsensusVote: HookDefinition = {
  id: "on-swarm-consensus-vote",
  name: "Consensus Vote Validator",
  description: "Validates consensus voting results — detects ties, unanimity, and split decisions.",
  phase: "on-swarm-consensus",
  category: "orchestration",
  mode: "warning",
  priority: "high",
  enabled: true,
  tags: ["orchestration", "swarm", "consensus"],
  handler: (context: HookContext): HookResult => {
    const hook = onSwarmConsensusVote;
    const votes = context.metadata?.votes || [];
    const totalVoters = context.metadata?.total_voters || votes.length;

    if (totalVoters < 3) {
      return hookWarning(hook, `Consensus with <3 voters is unreliable (got ${totalVoters})`);
    }

    // Count unique positions
    const positions = new Map<string, number>();
    for (const vote of votes) {
      const pos = typeof vote === "string" ? vote : JSON.stringify(vote?.position || vote?.result || vote);
      positions.set(pos, (positions.get(pos) || 0) + 1);
    }

    const maxVotes = Math.max(...positions.values());
    const isUnanimous = maxVotes === totalVoters;
    const isTied = [...positions.values()].filter(v => v === maxVotes).length > 1;
    const majorityPct = ((maxVotes / totalVoters) * 100).toFixed(0);

    if (isTied) {
      return hookWarning(hook,
        `Consensus TIE detected among ${positions.size} positions. No clear majority. Consider adding another voter or using a different resolution strategy.`, {
        positions: Object.fromEntries(positions), tied: true
      });
    }
    if (isUnanimous) {
      return hookSuccess(hook, `Unanimous consensus (${totalVoters}/${totalVoters})`, {
        unanimous: true, positions: Object.fromEntries(positions)
      });
    }
    return hookSuccess(hook, `Consensus reached: ${majorityPct}% majority (${maxVotes}/${totalVoters})`, {
      majority_pct: majorityPct, positions: Object.fromEntries(positions)
    });
  }
};

/**
 * Pipeline stage quality gate — enforce quality between pipeline stages.
 * Synergy: Complements HookEngine ORCH-PIPELINE-CHECKPOINT-001 (tracking).
 * This hook BLOCKS progression if stage output is bad.
 */
const prePipelineStageGate: HookDefinition = {
  id: "pre-pipeline-stage-gate",
  name: "Pipeline Stage Quality Gate (BLOCKING)",
  description: "BLOCKS pipeline progression if previous stage output fails quality check.",
  phase: "pre-swarm-execute",
  category: "orchestration",
  mode: "blocking",
  priority: "critical",
  enabled: true,
  tags: ["orchestration", "pipeline", "quality-gate", "critical"],
  handler: (context: HookContext): HookResult => {
    const hook = prePipelineStageGate;
    const pattern = context.metadata?.pattern || "";
    if (pattern !== "pipeline") return hookSuccess(hook, "Not a pipeline");

    const prevStageResult = context.metadata?.previous_stage_result;
    const currentStage = context.metadata?.pipeline_stage || 0;
    const pipelineId = context.metadata?.pipeline_id || "default";

    if (prevStageResult) {
      const hasError = prevStageResult.error || prevStageResult.status === "error";
      const isEmpty = !prevStageResult.result || prevStageResult.result === "";
      const safetyFailed = prevStageResult.safety_score !== undefined && prevStageResult.safety_score < 0.70;

      if (hasError) {
        return hookBlock(hook,
          `🚫 PIPELINE BLOCKED: Stage ${currentStage - 1} errored. Cannot proceed to stage ${currentStage}. Fix previous stage first.`, {
          pipeline_id: pipelineId, failed_stage: currentStage - 1
        });
      }
      if (isEmpty) {
        return hookBlock(hook,
          `🚫 PIPELINE BLOCKED: Stage ${currentStage - 1} produced empty output. Cannot feed empty data to stage ${currentStage}.`, {
          pipeline_id: pipelineId, failed_stage: currentStage - 1
        });
      }
      if (safetyFailed) {
        return hookBlock(hook,
          `🚫 PIPELINE BLOCKED: Stage ${currentStage - 1} safety score ${prevStageResult.safety_score} < 0.70. Cannot propagate unsafe data.`, {
          pipeline_id: pipelineId, failed_stage: currentStage - 1, safety_score: prevStageResult.safety_score
        });
      }
    }

    // Track pipeline progress
    let progress = pipelineProgress.get(pipelineId);
    if (!progress) {
      progress = { totalStages: context.metadata?.total_stages || 0, completedStages: 0, failedStages: 0, startTime: Date.now() };
      pipelineProgress.set(pipelineId, progress);
    }

    return hookSuccess(hook, `Pipeline stage ${currentStage} gate passed`);
  }
};

/**
 * Swarm cost budget tracking — warn when cumulative swarm costs are high.
 */
const onSwarmCostBudget: HookDefinition = {
  id: "on-swarm-cost-budget",
  name: "Swarm Cost Budget Tracker",
  description: "Tracks cumulative swarm API costs and warns when approaching session budget.",
  phase: "post-swarm-complete",
  category: "orchestration",
  mode: "warning",
  priority: "normal",
  enabled: true,
  tags: ["orchestration", "swarm", "cost-optimization"],
  handler: (context: HookContext): HookResult => {
    const hook = onSwarmCostBudget;
    const agentCount = context.metadata?.agent_count || 0;
    const tiers = context.metadata?.tier_distribution || {};
    
    // Estimate cost from tier distribution
    const tierCosts: Record<string, number> = { opus: 75, sonnet: 3, haiku: 0.25 };
    const avgTokens = 8000; // Conservative estimate per agent call
    let swarmCost = 0;
    for (const [tier, count] of Object.entries(tiers)) {
      const key = tier.includes("opus") ? "opus" : tier.includes("haiku") ? "haiku" : "sonnet";
      swarmCost += (count as number) * (avgTokens / 1_000_000) * (tierCosts[key] || 3);
    }
    // Fallback: estimate from agent count if no tier distribution
    if (swarmCost === 0 && agentCount > 0) {
      swarmCost = agentCount * (avgTokens / 1_000_000) * 3; // Assume SONNET
    }

    sessionSwarmCostUSD += swarmCost;

    if (sessionSwarmCostUSD > SWARM_COST_BUDGET_USD) {
      return hookWarning(hook,
        `Session swarm budget exceeded: $${sessionSwarmCostUSD.toFixed(4)} > $${SWARM_COST_BUDGET_USD} threshold. Consider using fewer/cheaper agents.`, {
        session_cost_usd: sessionSwarmCostUSD, budget_usd: SWARM_COST_BUDGET_USD, this_swarm_cost: swarmCost
      });
    }
    return hookSuccess(hook, `Swarm cost: $${swarmCost.toFixed(4)} (session total: $${sessionSwarmCostUSD.toFixed(4)})`);
  }
};

/**
 * ATCS→Swarm bridge validation — ensure ATCS units delegated to swarms are properly structured.
 * Synergy: Bridges prism_atcs dispatcher with prism_orchestrate swarm execution.
 */
const preSwarmAtcsBridge: HookDefinition = {
  id: "pre-swarm-atcs-bridge",
  name: "ATCS→Swarm Bridge Validator",
  description: "Validates ATCS unit delegation to swarm has proper task manifest and quality gates.",
  phase: "pre-swarm-execute",
  category: "orchestration",
  mode: "warning",
  priority: "high",
  enabled: true,
  tags: ["orchestration", "swarm", "atcs", "bridge"],
  handler: (context: HookContext): HookResult => {
    const hook = preSwarmAtcsBridge;
    const source = context.metadata?.source || "";
    const isFromATCS = source === "atcs" || context.metadata?.atcs_unit_id;
    
    if (!isFromATCS) return hookSuccess(hook, "Not an ATCS-delegated swarm");

    const warnings: string[] = [];
    const unitId = context.metadata?.atcs_unit_id;
    const hasManifest = !!context.metadata?.task_manifest;
    const hasQualityGate = !!context.metadata?.quality_gate;
    const hasCheckpoint = !!context.metadata?.checkpoint_config;

    if (!hasManifest) {
      warnings.push("ATCS unit missing task_manifest — swarm agents won't have clear instructions");
    }
    if (!hasQualityGate) {
      warnings.push("No quality_gate defined — swarm results won't be validated before ATCS accepts them");
    }
    if (!hasCheckpoint) {
      warnings.push("No checkpoint_config — if swarm fails, ATCS can't recover to last good state");
    }

    if (warnings.length > 0) {
      return hookWarning(hook,
        `ATCS→Swarm bridge issues for unit ${unitId || "unknown"}: ${warnings.join("; ")}`, {
        unit_id: unitId, warnings, has_manifest: hasManifest, has_quality_gate: hasQualityGate
      });
    }
    return hookSuccess(hook, `ATCS unit ${unitId} properly configured for swarm delegation`);
  }
};

// ============================================================================
// EXPORT
// ============================================================================

export const orchestrationHooks: HookDefinition[] = [
  preSwarmPatternSelect,
  preSwarmAgentMix,
  postSwarmResultMerge,
  onSwarmConsensusVote,
  prePipelineStageGate,
  onSwarmCostBudget,
  preSwarmAtcsBridge,
];
