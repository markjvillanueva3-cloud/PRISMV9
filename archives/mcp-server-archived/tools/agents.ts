/**
 * PRISM MCP Server - Agent Tools
 * AI agent orchestration, swarm patterns, and Ralph validation loops
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  AgentListInputSchema,
  AgentInvokeInputSchema,
  AgentSwarmInputSchema,
  RalphLoopInputSchema,
  type AgentInvokeInput,
  type AgentSwarmInput,
  type RalphLoopInput
} from "../schemas.js";
import { loadAgents, getAgent } from "../services/dataLoader.js";
import { successResponse, paginatedResponse, formatTable } from "../utils/formatters.js";
import { withErrorHandling, AgentError, TimeoutError } from "../utils/errors.js";
import { log } from "../utils/Logger.js";
import { SWARM_PATTERNS, DEFAULT_PAGE_SIZE } from "../constants.js";
import type { Agent } from "../types.js";

// ============================================================================
// SWARM PATTERN DESCRIPTIONS
// ============================================================================

const SWARM_DESCRIPTIONS: Record<string, string> = {
  PARALLEL_EXTRACTION: "Run multiple agents simultaneously on independent tasks",
  SEQUENTIAL_VALIDATION: "Chain agents where each validates the previous output",
  HIERARCHICAL_REVIEW: "OPUS reviews SONNET work, SONNET reviews HAIKU",
  CONSENSUS_BUILDING: "Multiple agents vote on best solution",
  DIVIDE_CONQUER: "Split large task among specialists, merge results",
  EXPERT_ENSEMBLE: "Domain experts collaborate on multi-faceted problem",
  COMPETITIVE_OPTIMIZATION: "Agents compete to find best solution",
  COOPERATIVE_LEARNING: "Agents share discoveries and improve collectively"
};

// ============================================================================
// AGENT EXECUTION (Placeholder - would integrate with Claude API)
// ============================================================================

async function executeAgent(
  agent: Agent,
  task: string,
  context?: Record<string, unknown>,
  timeoutMs: number = 30000
): Promise<{ success: boolean; output: string; tokens_used?: number }> {
  log.info(`Executing agent ${agent.id}: ${task.slice(0, 50)}...`);
  
  // This is a placeholder - actual implementation would:
  // 1. Call Claude API with agent's system prompt
  // 2. Include task and context
  // 3. Handle streaming response
  // 4. Track token usage
  
  // For now, return structured placeholder
  return {
    success: true,
    output: `[Agent ${agent.id} would process: "${task.slice(0, 100)}..."]\n\nThis requires API integration. Agent configured with:\n- Tier: ${agent.tier}\n- Role: ${agent.role}\n- Skills: ${agent.skills_used?.join(", ") || "none specified"}`,
    tokens_used: 0
  };
}

async function executeSwarm(
  agents: Agent[],
  tasks: Array<{ id: string; description: string; inputs?: Record<string, unknown> }>,
  pattern: string,
  maxParallel: number
): Promise<{ success: boolean; results: Array<{ task_id: string; agent_id: string; output: string }> }> {
  log.info(`Executing swarm pattern ${pattern} with ${agents.length} agents`);
  
  // Placeholder for swarm execution
  const results = tasks.map((task, i) => ({
    task_id: task.id,
    agent_id: agents[i % agents.length].id,
    output: `[${pattern}] Task "${task.description.slice(0, 50)}" would be processed by ${agents[i % agents.length].id}`
  }));
  
  return { success: true, results };
}

/**
 * Register all agent tools with the MCP server
 */
export function registerAgentTools(server: McpServer): void {

  server.registerTool(
    "prism_agent_list",
    {
      title: "List Agents",
      description: `List available AI agents in the PRISM system.

Access 64+ specialized agents across 3 tiers:
- OPUS: Complex reasoning, architecture, safety-critical tasks
- SONNET: General development, documentation, analysis
- HAIKU: Quick validations, formatting, simple tasks

Agent specializations include:
- Materials experts (metallurgy, machining parameters)
- Machine specialists (kinematics, controllers)
- Code architects (patterns, optimization)
- Safety validators (physics constraints, limits)
- Documentation writers
- And more...

Args:
  - tier (string, optional): Filter by tier (OPUS, SONNET, HAIKU)
  - capability (string, optional): Filter by capability keyword
  - response_format: json or markdown

Returns:
  List of agents with roles, capabilities, and tier assignments.`,
      inputSchema: AgentListInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    withErrorHandling("prism_agent_list", async (params) => {
      log.tool("prism_agent_list", "Listing agents", params);
      
      const allAgents = await loadAgents();
      let agents = Array.from(allAgents.values());
      
      // Apply filters
      if (params.tier) {
        agents = agents.filter(a => a.tier === params.tier);
      }
      
      if (params.capability) {
        const cap = params.capability.toLowerCase();
        agents = agents.filter(a => 
          a.role?.toLowerCase().includes(cap) ||
          a.expertise?.some(e => e.toLowerCase().includes(cap)) ||
          a.description?.toLowerCase().includes(cap)
        );
      }
      
      // Format response
      const format = params.response_format || "json";
      
      if (format === "markdown") {
        const rows = agents.map(a => [
          a.id,
          a.tier,
          a.role || "General",
          (a.expertise || []).slice(0, 2).join(", ")
        ]);
        
        const text = [
          `# Available Agents (${agents.length})`,
          "",
          formatTable(["ID", "Tier", "Role", "Expertise"], rows)
        ].join("\n");
        
        return successResponse(text, { success: true, count: agents.length });
      }
      
      return successResponse(
        JSON.stringify({ agents, count: agents.length }, null, 2),
        { success: true, agents, count: agents.length }
      );
    })
  );

  server.registerTool(
    "prism_agent_invoke",
    {
      title: "Invoke Agent",
      description: `Invoke a single AI agent to perform a task.

Execute a specialized agent with a task description and optional context.
The agent will use its configured system prompt, skills, and expertise.

Args:
  - agent_id (string): Agent ID to invoke
  - task (string): Task description for the agent
  - context (object, optional): Additional context data
  - timeout_ms (number): Timeout 1000-300000ms (default: 30s)

Returns:
  Agent's response with execution metadata.

Note: Requires Claude API integration for actual execution.
Currently returns placeholder showing agent configuration.`,
      inputSchema: AgentInvokeInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true
      }
    },
    withErrorHandling("prism_agent_invoke", async (params: AgentInvokeInput) => {
      log.tool("prism_agent_invoke", `Invoking ${params.agent_id}`);
      
      const agent = await getAgent(params.agent_id);
      
      const result = await executeAgent(
        agent,
        params.task,
        params.context,
        params.timeout_ms
      );
      
      if (!result.success) {
        throw new AgentError(params.agent_id, "Execution failed");
      }
      
      const text = [
        `# Agent Response: ${agent.id}`,
        "",
        `**Tier:** ${agent.tier} | **Role:** ${agent.role}`,
        "",
        "## Output",
        result.output,
        "",
        result.tokens_used ? `_Tokens used: ${result.tokens_used}_` : ""
      ].filter(Boolean).join("\n");
      
      return successResponse(text, {
        success: true,
        agent_id: agent.id,
        tier: agent.tier,
        output: result.output,
        tokens_used: result.tokens_used
      });
    })
  );

  server.registerTool(
    "prism_agent_swarm",
    {
      title: "Execute Agent Swarm",
      description: `Execute multiple agents in a coordinated swarm pattern.

Swarm patterns for parallel agent coordination:

**PARALLEL_EXTRACTION**: Run agents simultaneously on independent tasks
  - Best for: Bulk data extraction, independent validations
  - Example: Extract materials from 5 different sources concurrently

**SEQUENTIAL_VALIDATION**: Chain agents where each validates previous output
  - Best for: Multi-stage review, progressive refinement
  - Example: Generate → Review → Polish workflow

**HIERARCHICAL_REVIEW**: Higher-tier agents review lower-tier work
  - Best for: Quality assurance, critical outputs
  - Example: OPUS reviews SONNET-generated architecture

**CONSENSUS_BUILDING**: Multiple agents vote on best solution
  - Best for: Ambiguous decisions, design choices
  - Example: Select best algorithm from 3 proposals

**DIVIDE_CONQUER**: Split large task among specialists, merge results
  - Best for: Large scope tasks, domain decomposition
  - Example: Analyze codebase by module with specialists

**EXPERT_ENSEMBLE**: Domain experts collaborate
  - Best for: Multi-faceted problems requiring diverse expertise
  - Example: Machining optimization needs materials + tools + dynamics experts

**COMPETITIVE_OPTIMIZATION**: Agents compete for best solution
  - Best for: Optimization problems with multiple approaches
  - Example: Find optimal cutting parameters via different strategies

**COOPERATIVE_LEARNING**: Agents share discoveries
  - Best for: Exploration, knowledge building
  - Example: Research best practices across sources

Args:
  - agents (string[]): 2-10 agent IDs
  - tasks (array): Tasks with id, description, inputs
  - pattern (string): Swarm pattern
  - max_parallel (number): Max concurrent executions (default: 4)

Returns:
  Aggregated results from all agents.`,
      inputSchema: AgentSwarmInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true
      }
    },
    withErrorHandling("prism_agent_swarm", async (params: AgentSwarmInput) => {
      log.tool("prism_agent_swarm", `Swarm ${params.pattern} with ${params.agents.length} agents`);
      
      // Load all agents
      const agents: Agent[] = [];
      for (const agentId of params.agents) {
        agents.push(await getAgent(agentId));
      }
      
      const result = await executeSwarm(
        agents,
        params.tasks,
        params.pattern,
        params.max_parallel || 4
      );
      
      const text = [
        `# Swarm Execution: ${params.pattern}`,
        "",
        `**Pattern:** ${SWARM_DESCRIPTIONS[params.pattern] || params.pattern}`,
        `**Agents:** ${agents.map(a => a.id).join(", ")}`,
        `**Tasks:** ${params.tasks.length}`,
        "",
        "## Results",
        ...result.results.map(r => [
          `### Task: ${r.task_id}`,
          `Agent: ${r.agent_id}`,
          r.output,
          ""
        ].join("\n"))
      ].join("\n");
      
      return successResponse(text, {
        success: true,
        pattern: params.pattern,
        agents: params.agents,
        results: result.results
      });
    })
  );

  // NOTE: prism_ralph_loop has been moved to autoPilotTools.ts - do not re-add here

  log.debug("Agent tools registered");
}
