/**
 * PRISM MCP Server - Swarm Execution Tools V2
 * MCP tools for multi-agent swarm patterns
 * 
 * Tools (6):
 * - swarm_execute: Execute a swarm with specified pattern
 * - swarm_parallel: Quick parallel execution
 * - swarm_consensus: Quick consensus execution
 * - swarm_pipeline: Quick pipeline execution
 * - swarm_status: Get swarm status and results
 * - swarm_patterns: List available swarm patterns
 * 
 * For advanced multi-agent coordination workflows
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { log } from "../utils/Logger.js";
import {
  swarmExecutor,
  executeSwarm,
  executeParallelSwarm,
  executeConsensusSwarm,
  type SwarmPattern,
  type ReduceFunction,
  type SwarmResult
} from "../engines/SwarmExecutor.js";
import { agentRegistry } from "../registries/AgentRegistry.js";

// ============================================================================
// HELPERS
// ============================================================================

function successResponse(content: string, metadata?: Record<string, unknown>) {
  return {
    content: [{ type: "text" as const, text: content }],
    metadata
  };
}

function formatAsJson(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}min`;
}

function formatSwarmResult(result: SwarmResult, format: "json" | "markdown"): string {
  if (format === "json") {
    return formatAsJson({
      swarmId: result.swarmId,
      name: result.name,
      pattern: result.pattern,
      status: result.status,
      duration_ms: result.duration_ms,
      successCount: result.successCount,
      failCount: result.failCount,
      aggregatedOutput: result.aggregatedOutput,
      consensus: result.consensus,
      competition: result.competition,
      collaboration: result.collaboration,
      warnings: result.warnings
    });
  }

  // Markdown format
  const statusIcon = result.status === "completed" ? "✅" : result.status === "partial" ? "⚠️" : "❌";
  let content = `## ${statusIcon} Swarm Execution: ${result.name}\n\n`;

  content += `### Summary\n`;
  content += `| Property | Value |\n`;
  content += `|----------|-------|\n`;
  content += `| **Swarm ID** | \`${result.swarmId}\` |\n`;
  content += `| Pattern | ${result.pattern} |\n`;
  content += `| Status | **${result.status}** |\n`;
  content += `| Duration | ${formatDuration(result.duration_ms)} |\n`;
  content += `| Agents | ${result.successCount} succeeded, ${result.failCount} failed |\n\n`;

  // Pattern-specific results
  if (result.consensus) {
    const cons = result.consensus;
    content += `### Consensus Results\n`;
    content += `| Metric | Value |\n`;
    content += `|--------|-------|\n`;
    content += `| Consensus Reached | ${cons.reached ? "✅ Yes" : "❌ No"} |\n`;
    content += `| Agreement | ${(cons.actualAgreement * 100).toFixed(0)}% |\n`;
    content += `| Threshold | ${(cons.threshold * 100).toFixed(0)}% |\n`;
    if (cons.dissenting.length > 0) {
      content += `| Dissenting | ${cons.dissenting.join(", ")} |\n`;
    }
    content += `\n`;
  }

  if (result.competition) {
    const comp = result.competition;
    content += `### Competition Results\n`;
    content += `| Rank | Agent | Score |\n`;
    content += `|------|-------|-------|\n`;
    comp.rankings.forEach((r, i) => {
      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
      content += `| ${medal} | ${r.agentId} | ${r.score.toFixed(2)} |\n`;
    });
    content += `\n`;
  }

  if (result.collaboration) {
    const collab = result.collaboration;
    content += `### Collaboration Results\n`;
    content += `| Metric | Value |\n`;
    content += `|--------|-------|\n`;
    content += `| Iterations | ${collab.iterations} |\n`;
    content += `| Converged | ${collab.converged ? "✅ Yes" : "❌ No"} |\n`;
    content += `| Final Delta | ${collab.finalDelta.toFixed(4)} |\n`;
    content += `\n`;
  }

  // Agent results
  const agentResults = Array.from(result.agentResults.values());
  if (agentResults.length > 0 && agentResults.length <= 10) {
    content += `### Agent Results\n`;
    content += `| Agent | Status | Duration |\n`;
    content += `|-------|--------|----------|\n`;
    agentResults.forEach(ar => {
      const status = ar.status === "success" ? "✅" : "❌";
      content += `| ${ar.agentName} | ${status} | ${formatDuration(ar.duration_ms)} |\n`;
    });
    content += `\n`;
  } else if (agentResults.length > 10) {
    content += `*${agentResults.length} agent results (showing summary)*\n\n`;
  }

  // Aggregated output
  if (result.aggregatedOutput !== null && result.aggregatedOutput !== undefined) {
    content += `### Aggregated Output\n`;
    content += `\`\`\`json\n${JSON.stringify(result.aggregatedOutput, null, 2)}\n\`\`\`\n`;
  }

  // Warnings
  if (result.warnings.length > 0) {
    content += `### ⚠️ Warnings\n`;
    result.warnings.forEach(w => content += `- ${w}\n`);
  }

  return content;
}

// ============================================================================
// SCHEMAS
// ============================================================================

const SwarmExecuteSchema = z.object({
  name: z.string().describe("Name for the swarm execution"),
  pattern: z.enum([
    "parallel", "pipeline", "map_reduce", "consensus", 
    "hierarchical", "ensemble", "competition", "collaboration"
  ]).describe("Swarm execution pattern"),
  agents: z.array(z.string()).min(1).max(20).describe("Agent IDs to include in swarm"),
  input: z.record(z.unknown()).describe("Input parameters for all agents"),
  timeout_ms: z.number().min(1000).max(300000).default(30000).describe("Per-agent timeout"),
  options: z.object({
    // Map-Reduce
    reduceFunction: z.enum(["concat", "merge", "sum", "average", "max", "min", "first", "last", "vote"]).optional(),
    // Consensus
    consensusThreshold: z.number().min(0).max(1).optional(),
    consensusField: z.string().optional(),
    // Hierarchical
    layers: z.array(z.array(z.string())).optional(),
    // Ensemble
    weights: z.record(z.number()).optional(),
    aggregationMethod: z.enum(["weighted_avg", "weighted_vote", "max", "min"]).optional(),
    // Competition
    scoreField: z.string().optional(),
    scoreDirection: z.enum(["max", "min"]).optional(),
    // Collaboration
    maxIterations: z.number().min(1).max(10).optional(),
    convergenceThreshold: z.number().min(0).max(1).optional()
  }).optional().describe("Pattern-specific options"),
  response_format: z.enum(["json", "markdown"]).default("markdown")
});

const SwarmParallelSchema = z.object({
  name: z.string().describe("Name for the swarm execution"),
  agents: z.array(z.string()).min(1).max(20).describe("Agent IDs to run in parallel"),
  input: z.record(z.unknown()).describe("Input parameters for all agents"),
  timeout_ms: z.number().min(1000).max(300000).default(30000).describe("Per-agent timeout"),
  response_format: z.enum(["json", "markdown"]).default("markdown")
});

const SwarmConsensusSchema = z.object({
  name: z.string().describe("Name for the consensus swarm"),
  agents: z.array(z.string()).min(2).max(20).describe("Agent IDs to vote"),
  input: z.record(z.unknown()).describe("Input parameters for all agents"),
  threshold: z.number().min(0.5).max(1).default(0.5).describe("Consensus threshold (0.5 = majority)"),
  consensus_field: z.string().optional().describe("Specific field to compare for consensus"),
  timeout_ms: z.number().min(1000).max(300000).default(30000).describe("Per-agent timeout"),
  response_format: z.enum(["json", "markdown"]).default("markdown")
});

const SwarmPipelineSchema = z.object({
  name: z.string().describe("Name for the pipeline swarm"),
  agents: z.array(z.string()).min(2).max(10).describe("Agent IDs in pipeline order"),
  input: z.record(z.unknown()).describe("Initial input parameters"),
  timeout_ms: z.number().min(1000).max(300000).default(30000).describe("Per-agent timeout"),
  response_format: z.enum(["json", "markdown"]).default("markdown")
});

const SwarmStatusSchema = z.object({
  swarm_id: z.string().describe("Swarm ID to check"),
  response_format: z.enum(["json", "markdown"]).default("markdown")
});

const SwarmPatternsSchema = z.object({
  response_format: z.enum(["json", "markdown"]).default("markdown")
});

// ============================================================================
// TOOL REGISTRATION
// ============================================================================

export function registerSwarmToolsV2(server: McpServer): void {

  // =========================================================================
  // SWARM EXECUTE
  // =========================================================================

  server.tool(
    "swarm_execute",
    "Execute a multi-agent swarm with specified pattern. Supports parallel, pipeline, map-reduce, consensus, hierarchical, ensemble, competition, and collaboration patterns.",
    SwarmExecuteSchema.shape,
    async (params) => {
      log.info(`[swarm_execute] ${params.pattern} swarm "${params.name}" with ${params.agents.length} agents`);

      // Validate agents exist
      const invalidAgents = params.agents.filter(id => !agentRegistry.get(id));
      if (invalidAgents.length === params.agents.length) {
        const available = agentRegistry.list().slice(0, 10).map(a => a.id);
        return successResponse(
          `❌ No valid agents found. Invalid: ${invalidAgents.join(", ")}\n\nAvailable agents (first 10): ${available.join(", ")}`,
          { success: false }
        );
      }

      try {
        const result = await executeSwarm({
          name: params.name,
          pattern: params.pattern as SwarmPattern,
          agents: params.agents,
          input: params.input,
          timeout_ms: params.timeout_ms,
          options: params.options as any
        });

        const content = formatSwarmResult(result, params.response_format);

        return successResponse(content, {
          success: result.status !== "failed",
          swarmId: result.swarmId,
          pattern: result.pattern,
          successCount: result.successCount,
          failCount: result.failCount
        });

      } catch (error) {
        return successResponse(
          `❌ Swarm execution failed: ${error instanceof Error ? error.message : String(error)}`,
          { success: false }
        );
      }
    }
  );

  // =========================================================================
  // SWARM PARALLEL
  // =========================================================================

  server.tool(
    "swarm_parallel",
    "Execute multiple agents in parallel. All agents run simultaneously and results are collected.",
    SwarmParallelSchema.shape,
    async (params) => {
      log.info(`[swarm_parallel] "${params.name}" with ${params.agents.length} agents`);

      try {
        const result = await swarmExecutor.execute({
          name: params.name,
          pattern: "parallel",
          agents: params.agents,
          input: params.input,
          timeout_ms: params.timeout_ms
        });

        const content = formatSwarmResult(result, params.response_format);

        return successResponse(content, {
          success: result.status !== "failed",
          swarmId: result.swarmId,
          successCount: result.successCount
        });

      } catch (error) {
        return successResponse(
          `❌ Parallel swarm failed: ${error instanceof Error ? error.message : String(error)}`,
          { success: false }
        );
      }
    }
  );

  // =========================================================================
  // SWARM CONSENSUS
  // =========================================================================

  server.tool(
    "swarm_consensus",
    "Execute agents and find consensus among their outputs. Requires threshold percentage of agents to agree.",
    SwarmConsensusSchema.shape,
    async (params) => {
      log.info(`[swarm_consensus] "${params.name}" with ${params.agents.length} agents (threshold: ${params.threshold})`);

      try {
        const result = await swarmExecutor.execute({
          name: params.name,
          pattern: "consensus",
          agents: params.agents,
          input: params.input,
          timeout_ms: params.timeout_ms,
          options: {
            consensusThreshold: params.threshold,
            consensusField: params.consensus_field
          }
        });

        const content = formatSwarmResult(result, params.response_format);

        return successResponse(content, {
          success: result.consensus?.reached || false,
          swarmId: result.swarmId,
          consensusReached: result.consensus?.reached,
          agreement: result.consensus?.actualAgreement
        });

      } catch (error) {
        return successResponse(
          `❌ Consensus swarm failed: ${error instanceof Error ? error.message : String(error)}`,
          { success: false }
        );
      }
    }
  );

  // =========================================================================
  // SWARM PIPELINE
  // =========================================================================

  server.tool(
    "swarm_pipeline",
    "Execute agents as a pipeline. Output from each agent flows as input to the next agent.",
    SwarmPipelineSchema.shape,
    async (params) => {
      log.info(`[swarm_pipeline] "${params.name}" with ${params.agents.length} agents`);

      try {
        const result = await swarmExecutor.execute({
          name: params.name,
          pattern: "pipeline",
          agents: params.agents,
          input: params.input,
          timeout_ms: params.timeout_ms
        });

        const content = formatSwarmResult(result, params.response_format);

        return successResponse(content, {
          success: result.status === "completed",
          swarmId: result.swarmId,
          stagesCompleted: result.successCount
        });

      } catch (error) {
        return successResponse(
          `❌ Pipeline swarm failed: ${error instanceof Error ? error.message : String(error)}`,
          { success: false }
        );
      }
    }
  );

  // =========================================================================
  // SWARM STATUS
  // =========================================================================

  server.tool(
    "swarm_status",
    "Get the status and results of a swarm execution.",
    SwarmStatusSchema.shape,
    async (params) => {
      log.info(`[swarm_status] ${params.swarm_id}`);

      const result = swarmExecutor.getSwarm(params.swarm_id);
      if (!result) {
        return successResponse(`❌ Swarm not found: ${params.swarm_id}`, { success: false });
      }

      const content = formatSwarmResult(result, params.response_format);
      return successResponse(content, { success: true, status: result.status });
    }
  );

  // =========================================================================
  // SWARM PATTERNS
  // =========================================================================

  server.tool(
    "swarm_patterns",
    "List all available swarm patterns with descriptions.",
    SwarmPatternsSchema.shape,
    async (params) => {
      log.info(`[swarm_patterns]`);

      const patterns = swarmExecutor.getPatterns();

      let content: string;
      if (params.response_format === "markdown") {
        content = `## Available Swarm Patterns\n\n`;
        content += `| Pattern | Description | Best For |\n`;
        content += `|---------|-------------|----------|\n`;
        content += `| **parallel** | All agents run simultaneously | Maximum throughput, independent tasks |\n`;
        content += `| **pipeline** | Sequential with output chaining | Staged processing, transformations |\n`;
        content += `| **map_reduce** | Distribute work, combine results | Large dataset processing |\n`;
        content += `| **consensus** | Agents vote on output | Critical decisions, validation |\n`;
        content += `| **hierarchical** | Layered agent execution | Complex workflows, refinement |\n`;
        content += `| **ensemble** | Weighted combination | Improved accuracy, robust output |\n`;
        content += `| **competition** | Best result wins | Quality optimization |\n`;
        content += `| **collaboration** | Iterative improvement | Creative tasks, optimization |\n`;
        content += `\n`;

        content += `### Pattern Details\n\n`;
        
        content += `#### Parallel\n`;
        content += `All agents receive the same input and execute simultaneously. Results are collected.\n\n`;
        
        content += `#### Pipeline\n`;
        content += `Agents execute in sequence. Each agent's output becomes the next agent's input.\n\n`;
        
        content += `#### Map-Reduce\n`;
        content += `Agents process input in parallel (map), then results are combined (reduce).\n`;
        content += `Reduce functions: concat, merge, sum, average, max, min, first, last, vote\n\n`;
        
        content += `#### Consensus\n`;
        content += `Agents vote on output. Consensus is reached when agreement meets threshold.\n\n`;
        
        content += `#### Hierarchical\n`;
        content += `Agents organized in layers. Each layer processes output from previous layer.\n\n`;
        
        content += `#### Ensemble\n`;
        content += `Agent outputs combined using weights. Methods: weighted_avg, weighted_vote, max, min\n\n`;
        
        content += `#### Competition\n`;
        content += `Agents compete, best score wins. Scoring by confidence or custom field.\n\n`;
        
        content += `#### Collaboration\n`;
        content += `Agents iteratively improve shared output until convergence or max iterations.\n`;

      } else {
        content = formatAsJson({ patterns, count: patterns.length });
      }

      return successResponse(content, { success: true, patternCount: patterns.length });
    }
  );

  log.info("[swarm_tools_v2] Registered 6 swarm execution tools");
}
