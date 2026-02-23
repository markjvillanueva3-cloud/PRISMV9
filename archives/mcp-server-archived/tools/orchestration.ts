/**
 * PRISM MCP Server - Orchestration Tools
 * Tools for managing agents and hooks
 * 
 * Agent Tools (6):
 * - agent_list: List all agents
 * - agent_get: Get specific agent
 * - agent_search: Search agents
 * - agent_invoke: Invoke an agent
 * - agent_find_for_task: Find best agent for a task
 * - agent_stats: Get agent statistics
 * 
 * Hook Tools (6):
 * - hook_list: List all hooks
 * - hook_get: Get specific hook
 * - hook_search: Search hooks
 * - hook_fire: Fire hooks for an event
 * - hook_cognitive: Get cognitive hooks
 * - hook_stats: Get hook statistics
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { registryManager } from "../registries/index.js";
import { log } from "../utils/Logger.js";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function successResponse(content: string, metadata?: Record<string, unknown>) {
  return {
    content: [{ type: "text" as const, text: content }],
    metadata
  };
}

function formatAsMarkdown(title: string, data: Record<string, unknown>): string {
  let md = `## ${title}\n\n`;
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null) continue;
    if (typeof value === "object") {
      md += `### ${key}\n\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\`\n\n`;
    } else {
      md += `- **${key}**: ${value}\n`;
    }
  }
  return md;
}

function formatAsJson(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

// ============================================================================
// SCHEMA DEFINITIONS
// ============================================================================

const AGENT_CATEGORIES = ["domain_expert", "task_agent", "coordination", "cognitive", "specialized", "validation", "extraction", "analysis"] as const;
const HOOK_CATEGORIES = ["system", "cognitive", "law", "process", "data", "agent", "external", "validation", "optimization"] as const;
const HOOK_PRIORITIES = ["critical", "high", "normal", "low"] as const;
const HOOK_TIMINGS = ["before", "after", "around", "on"] as const;

const AgentListSchema = z.object({
  category: z.enum(AGENT_CATEGORIES).optional().describe("Filter by agent category"),
  active_only: z.boolean().default(true).describe("Only show active agents"),
  limit: z.number().default(20),
  offset: z.number().default(0),
  response_format: z.enum(["json", "markdown"]).default("json")
});

const AgentGetSchema = z.object({
  agent_id: z.string().describe("Agent ID (e.g., 'AGT-EXPERT-MATERIALS')"),
  response_format: z.enum(["json", "markdown"]).default("markdown")
});

const AgentSearchSchema = z.object({
  query: z.string().optional().describe("Search in name, ID, description"),
  category: z.enum(AGENT_CATEGORIES).optional().describe("Agent category"),
  domain: z.string().optional().describe("Agent domain (e.g., 'materials', 'machining')"),
  capability: z.string().optional().describe("Required capability"),
  enabled: z.boolean().optional().describe("Filter by enabled status"),
  limit: z.number().default(20),
  offset: z.number().default(0),
  response_format: z.enum(["json", "markdown"]).default("json")
});

const AgentFindForTaskSchema = z.object({
  task_type: z.string().describe("Task type to find agent for (e.g., 'material_selection', 'calculate_speed_feed')"),
  response_format: z.enum(["json", "markdown"]).default("markdown")
});

const AgentInvokeSchema = z.object({
  agent_id: z.string().describe("Agent ID to invoke"),
  input: z.record(z.unknown()).describe("Input data for the agent"),
  options: z.object({
    timeout_ms: z.number().optional(),
    validate_output: z.boolean().default(true)
  }).optional()
});

const HookListSchema = z.object({
  category: z.enum(HOOK_CATEGORIES).optional().describe("Filter by hook category"),
  priority: z.enum(HOOK_PRIORITIES).optional().describe("Filter by priority"),
  enabled_only: z.boolean().default(true).describe("Only show enabled hooks"),
  limit: z.number().default(20),
  offset: z.number().default(0),
  response_format: z.enum(["json", "markdown"]).default("json")
});

const HookGetSchema = z.object({
  hook_id: z.string().describe("Hook ID (e.g., 'SYS-LAW1', 'BAYES-001')"),
  response_format: z.enum(["json", "markdown"]).default("markdown")
});

const HookSearchSchema = z.object({
  query: z.string().optional().describe("Search in name, ID, description"),
  category: z.enum(HOOK_CATEGORIES).optional().describe("Hook category"),
  event: z.string().optional().describe("Event name (e.g., 'data.save', 'agent.complete')"),
  priority: z.enum(HOOK_PRIORITIES).optional().describe("Priority level"),
  timing: z.enum(HOOK_TIMINGS).optional().describe("Hook timing"),
  enabled: z.boolean().optional().describe("Filter by enabled status"),
  limit: z.number().default(20),
  offset: z.number().default(0),
  response_format: z.enum(["json", "markdown"]).default("json")
});

const HookFireSchema = z.object({
  event: z.string().describe("Event name to fire"),
  timing: z.enum(HOOK_TIMINGS).describe("Timing: before, after, around, on"),
  context: z.record(z.unknown()).default({}).describe("Context data for hook handlers")
});

// ============================================================================
// TOOL REGISTRATION
// ============================================================================

export function registerOrchestrationTools(server: McpServer): void {
  
  // =========================================================================
  // AGENT TOOLS (6)
  // =========================================================================

  server.tool(
    "agent_list",
    "List all available AI agents by category with their capabilities and status.",
    AgentListSchema.shape,
    async (params) => {
      log.info(`[agent_list] Category: ${params.category || 'all'}`);
      
      await registryManager.initialize();
      
      let agents = params.category
        ? registryManager.agents.getByCategory(params.category)
        : registryManager.agents.all();
      
      if (params.active_only) {
        agents = agents.filter(a => a.status === "active" && a.enabled);
      }
      
      const total = agents.length;
      const paged = agents.slice(params.offset, params.offset + params.limit);
      
      const content = params.response_format === "markdown"
        ? `## AI Agents\n\nShowing ${paged.length} of ${total} agents\n\n` +
          paged.map(a => `### ${a.name}\n- **ID:** ${a.agent_id}\n- **Category:** ${a.category}\n- **Capabilities:** ${a.capabilities.map(c => c.name).join(', ')}\n- **Status:** ${a.status}`).join('\n\n')
        : formatAsJson({ agents: paged, total, hasMore: params.offset + paged.length < total });
      
      return successResponse(content, { success: true, total, returned: paged.length });
    }
  );

  server.tool(
    "agent_get",
    "Get detailed information about a specific AI agent including capabilities, dependencies, and configuration.",
    AgentGetSchema.shape,
    async (params) => {
      log.info(`[agent_get] ID: ${params.agent_id}`);
      
      await registryManager.initialize();
      const agent = registryManager.agents.getAgent(params.agent_id);
      
      if (!agent) {
        return successResponse(`Agent not found: ${params.agent_id}`, { success: false });
      }
      
      let content: string;
      if (params.response_format === "markdown") {
        content = `## ${agent.name}\n\n`;
        content += `**ID:** ${agent.agent_id}\n`;
        content += `**Category:** ${agent.category}\n`;
        content += `**Status:** ${agent.status} ${agent.enabled ? '✅' : '❌'}\n`;
        content += `**Version:** ${agent.version}\n\n`;
        content += `### Description\n${agent.description}\n\n`;
        content += `### Capabilities\n`;
        agent.capabilities.forEach(c => {
          content += `- **${c.name}** (${Math.round(c.confidence * 100)}% confidence)\n  ${c.description}\n`;
        });
        content += `\n### Domains\n${agent.domains.join(', ')}\n`;
        if (agent.dependencies.length > 0) {
          content += `\n### Dependencies\n${agent.dependencies.map(d => `- ${d.agent_id} (${d.relationship})`).join('\n')}\n`;
        }
        if (agent.consumers.length > 0) {
          content += `\n### Used By\n${agent.consumers.join(', ')}\n`;
        }
      } else {
        content = formatAsJson(agent);
      }
      
      return successResponse(content, { success: true, agent_id: agent.agent_id });
    }
  );

  server.tool(
    "agent_search",
    "Search agents by query, category, domain, or required capability.",
    AgentSearchSchema.shape,
    async (params) => {
      log.info(`[agent_search] Query: ${params.query || 'all'}`, params);
      
      await registryManager.initialize();
      const results = registryManager.agents.search({
        query: params.query,
        category: params.category,
        domain: params.domain,
        capability: params.capability,
        enabled: params.enabled,
        limit: params.limit,
        offset: params.offset
      });
      
      const content = params.response_format === "markdown"
        ? `## Agent Search Results\n\nFound **${results.total}** agents (showing ${results.agents.length})\n\n` +
          results.agents.map(a => `- **${a.name}** (${a.agent_id}) - ${a.category}, ${a.capabilities.length} capabilities`).join('\n')
        : formatAsJson(results);
      
      return successResponse(content, {
        success: true,
        total: results.total,
        returned: results.agents.length,
        hasMore: results.hasMore
      });
    }
  );

  server.tool(
    "agent_find_for_task",
    "Find the best agent for a specific task type based on capabilities and confidence scores.",
    AgentFindForTaskSchema.shape,
    async (params) => {
      log.info(`[agent_find_for_task] Task: ${params.task_type}`);
      
      await registryManager.initialize();
      const agent = registryManager.agents.findAgentForTask(params.task_type);
      
      if (!agent) {
        return successResponse(`No agent found for task: ${params.task_type}`, { success: false });
      }
      
      const capability = agent.capabilities.find(c => c.name === params.task_type);
      
      let content: string;
      if (params.response_format === "markdown") {
        content = `## Best Agent for "${params.task_type}"\n\n`;
        content += `### ${agent.name}\n`;
        content += `**ID:** ${agent.agent_id}\n`;
        content += `**Category:** ${agent.category}\n\n`;
        if (capability) {
          content += `### Capability Match\n`;
          content += `- **Name:** ${capability.name}\n`;
          content += `- **Confidence:** ${Math.round(capability.confidence * 100)}%\n`;
          content += `- **Description:** ${capability.description}\n`;
        }
      } else {
        content = formatAsJson({ agent, capability, task_type: params.task_type });
      }
      
      return successResponse(content, {
        success: true,
        agent_id: agent.agent_id,
        confidence: capability?.confidence
      });
    }
  );

  server.tool(
    "agent_invoke",
    "Invoke an AI agent with input data and receive its output. Uses REAL Claude API when ANTHROPIC_API_KEY is configured.",
    AgentInvokeSchema.shape,
    async (params) => {
      log.info(`[agent_invoke] Invoking: ${params.agent_id}`);
      
      await registryManager.initialize();
      const agent = registryManager.agents.getAgent(params.agent_id);
      
      if (!agent) {
        return successResponse(`Agent not found: ${params.agent_id}`, { success: false });
      }
      
      if (!agent.enabled || agent.status !== "active") {
        return successResponse(`Agent is not available: ${params.agent_id} (status: ${agent.status}, enabled: ${agent.enabled})`, { success: false });
      }
      
      // Fire pre-invocation hooks
      await registryManager.fireEvent("agent.invoke", "before", {
        agent_id: params.agent_id,
        input: params.input
      });
      
      // REAL agent execution via AgentExecutor (uses Claude API)
      try {
        const { agentExecutor } = await import("../engines/AgentExecutor.js");
        const task = agentExecutor.createTask(params.agent_id, params.input || {}, {
          timeout_ms: params.options?.timeout_ms || 30000
        });
        const taskResult = await agentExecutor.executeTask(task);
        
        // Fire post-invocation hooks
        await registryManager.fireEvent("agent.complete", "after", {
          agent_id: params.agent_id,
          output: taskResult.output,
          status: taskResult.status,
          duration_ms: taskResult.duration_ms
        });
        
        const response = {
          status: taskResult.status,
          agent_id: params.agent_id,
          agent_name: agent.name,
          output: taskResult.output,
          duration_ms: taskResult.duration_ms,
          retryCount: taskResult.retryCount,
          mode: "live"
        };
        
        return successResponse(formatAsJson(response), {
          success: true,
          agent_id: params.agent_id,
          mode: "live"
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        log.error(`[agent_invoke] Execution failed: ${errorMsg}`);
        return successResponse(`Agent execution failed: ${errorMsg}`, {
          success: false,
          agent_id: params.agent_id,
          error: errorMsg
        });
      }
    }
  );

  server.tool(
    "agent_stats",
    "Get statistics about all registered agents including counts by category and capability coverage.",
    z.object({ response_format: z.enum(["json", "markdown"]).default("markdown") }).shape,
    async (params) => {
      log.info(`[agent_stats]`);
      
      await registryManager.initialize();
      const stats = registryManager.agents.getStats();
      
      let content: string;
      if (params.response_format === "markdown") {
        content = `## Agent Statistics\n\n`;
        content += `**Total Agents:** ${stats.total}\n`;
        content += `**Active & Enabled:** ${stats.activeEnabled}\n`;
        content += `**Total Capabilities:** ${stats.totalCapabilities}\n\n`;
        content += `### By Category\n`;
        for (const [cat, count] of Object.entries(stats.byCategory)) {
          content += `- ${cat}: ${count}\n`;
        }
        content += `\n### By Status\n`;
        for (const [status, count] of Object.entries(stats.byStatus)) {
          content += `- ${status}: ${count}\n`;
        }
      } else {
        content = formatAsJson(stats);
      }
      
      return successResponse(content, { success: true, ...stats });
    }
  );

  // =========================================================================
  // HOOK TOOLS (6)
  // =========================================================================

  server.tool(
    "hook_list",
    "List all registered hooks by category, priority, or enabled status.",
    HookListSchema.shape,
    async (params) => {
      log.info(`[hook_list] Category: ${params.category || 'all'}`);
      
      await registryManager.initialize();
      
      let hooks = params.category
        ? registryManager.hooks.getByCategory(params.category)
        : registryManager.hooks.all();
      
      if (params.priority) {
        hooks = hooks.filter(h => h.priority === params.priority);
      }
      
      if (params.enabled_only) {
        hooks = hooks.filter(h => h.enabled && h.status === "active");
      }
      
      const total = hooks.length;
      const paged = hooks.slice(params.offset, params.offset + params.limit);
      
      const content = params.response_format === "markdown"
        ? `## Hooks\n\nShowing ${paged.length} of ${total} hooks\n\n` +
          paged.map(h => `- **${h.name}** (${h.hook_id}) - ${h.category}/${h.priority}, Event: ${h.event}`).join('\n')
        : formatAsJson({ hooks: paged, total, hasMore: params.offset + paged.length < total });
      
      return successResponse(content, { success: true, total, returned: paged.length });
    }
  );

  server.tool(
    "hook_get",
    "Get detailed information about a specific hook including handlers and conditions.",
    HookGetSchema.shape,
    async (params) => {
      log.info(`[hook_get] ID: ${params.hook_id}`);
      
      await registryManager.initialize();
      const hook = registryManager.hooks.getHook(params.hook_id);
      
      if (!hook) {
        return successResponse(`Hook not found: ${params.hook_id}`, { success: false });
      }
      
      let content: string;
      if (params.response_format === "markdown") {
        content = `## ${hook.name}\n\n`;
        content += `**ID:** ${hook.hook_id}\n`;
        content += `**Category:** ${hook.category}\n`;
        content += `**Event:** ${hook.event}\n`;
        content += `**Timing:** ${hook.timing}\n`;
        content += `**Priority:** ${hook.priority} (order: ${hook.order})\n`;
        content += `**Status:** ${hook.status} ${hook.enabled ? '✅' : '❌'}\n\n`;
        content += `### Description\n${hook.description}\n\n`;
        content += `### Handlers (${hook.handlers.length})\n`;
        hook.handlers.forEach(h => {
          content += `- **${h.handler_id}** (${h.type}): ${h.target} ${h.enabled ? '✅' : '❌'}\n`;
        });
        if (hook.conditions?.length) {
          content += `\n### Conditions\n`;
          hook.conditions.forEach(c => {
            content += `- ${c.field} ${c.operator} ${c.value}\n`;
          });
        }
      } else {
        content = formatAsJson(hook);
      }
      
      return successResponse(content, { success: true, hook_id: hook.hook_id });
    }
  );

  server.tool(
    "hook_search",
    "Search hooks by query, category, event, priority, or timing.",
    HookSearchSchema.shape,
    async (params) => {
      log.info(`[hook_search] Query: ${params.query || 'all'}`, params);
      
      await registryManager.initialize();
      const results = registryManager.hooks.search({
        query: params.query,
        category: params.category,
        event: params.event,
        priority: params.priority,
        timing: params.timing,
        enabled: params.enabled,
        limit: params.limit,
        offset: params.offset
      });
      
      const content = params.response_format === "markdown"
        ? `## Hook Search Results\n\nFound **${results.total}** hooks (showing ${results.hooks.length})\n\n` +
          results.hooks.map(h => `- **${h.name}** (${h.hook_id}) - ${h.event} [${h.priority}]`).join('\n')
        : formatAsJson(results);
      
      return successResponse(content, {
        success: true,
        total: results.total,
        returned: results.hooks.length,
        hasMore: results.hasMore
      });
    }
  );

  server.tool(
    "hook_fire",
    "Fire all hooks registered for a specific event with the given timing and context.",
    HookFireSchema.shape,
    async (params) => {
      log.info(`[hook_fire] Event: ${params.event}, Timing: ${params.timing}`);
      
      await registryManager.initialize();
      const result = await registryManager.hooks.fireEvent(params.event, params.timing, params.context);
      
      const content = formatAsJson({
        event: params.event,
        timing: params.timing,
        hooks_fired: result.results.length,
        errors: result.errors.length,
        results: result.results
      });
      
      return successResponse(content, {
        success: result.errors.length === 0,
        hooks_fired: result.results.length,
        errors: result.errors.length
      });
    }
  );

  server.tool(
    "hook_cognitive",
    "Get all cognitive hooks (AI/ML patterns: Bayesian, Optimization, Gradient, RL).",
    z.object({ response_format: z.enum(["json", "markdown"]).default("markdown") }).shape,
    async (params) => {
      log.info(`[hook_cognitive]`);
      
      await registryManager.initialize();
      const hooks = registryManager.hooks.getCognitiveHooks();
      
      let content: string;
      if (params.response_format === "markdown") {
        content = `## Cognitive Hooks (AI/ML Patterns)\n\n`;
        content += `**Total:** ${hooks.length} hooks\n\n`;
        
        // Group by pattern type
        const bayesian = hooks.filter(h => h.hook_id.startsWith("BAYES"));
        const opt = hooks.filter(h => h.hook_id.startsWith("OPT"));
        const multi = hooks.filter(h => h.hook_id.startsWith("MULTI"));
        const grad = hooks.filter(h => h.hook_id.startsWith("GRAD"));
        const rl = hooks.filter(h => h.hook_id.startsWith("RL"));
        
        if (bayesian.length) {
          content += `### Bayesian Pattern\n${bayesian.map(h => `- **${h.hook_id}**: ${h.name}`).join('\n')}\n\n`;
        }
        if (opt.length) {
          content += `### Optimization Pattern\n${opt.map(h => `- **${h.hook_id}**: ${h.name}`).join('\n')}\n\n`;
        }
        if (multi.length) {
          content += `### Multi-Objective Pattern\n${multi.map(h => `- **${h.hook_id}**: ${h.name}`).join('\n')}\n\n`;
        }
        if (grad.length) {
          content += `### Gradient Pattern\n${grad.map(h => `- **${h.hook_id}**: ${h.name}`).join('\n')}\n\n`;
        }
        if (rl.length) {
          content += `### Reinforcement Learning Pattern\n${rl.map(h => `- **${h.hook_id}**: ${h.name}`).join('\n')}\n\n`;
        }
      } else {
        content = formatAsJson(hooks);
      }
      
      return successResponse(content, { success: true, total: hooks.length });
    }
  );

  server.tool(
    "hook_stats",
    "Get statistics about all registered hooks including counts by category, priority, and timing.",
    z.object({ response_format: z.enum(["json", "markdown"]).default("markdown") }).shape,
    async (params) => {
      log.info(`[hook_stats]`);
      
      await registryManager.initialize();
      const stats = registryManager.hooks.getStats();
      
      let content: string;
      if (params.response_format === "markdown") {
        content = `## Hook Statistics\n\n`;
        content += `**Total Hooks:** ${stats.total}\n`;
        content += `**Active & Enabled:** ${stats.activeEnabled}\n`;
        content += `**Total Handlers:** ${stats.totalHandlers}\n\n`;
        content += `### By Category\n`;
        for (const [cat, count] of Object.entries(stats.byCategory)) {
          content += `- ${cat}: ${count}\n`;
        }
        content += `\n### By Priority\n`;
        for (const [pri, count] of Object.entries(stats.byPriority)) {
          content += `- ${pri}: ${count}\n`;
        }
        content += `\n### By Timing\n`;
        for (const [timing, count] of Object.entries(stats.byTiming)) {
          content += `- ${timing}: ${count}\n`;
        }
      } else {
        content = formatAsJson(stats);
      }
      
      return successResponse(content, { success: true, ...stats });
    }
  );

  log.info("[orchestration] Registered 12 orchestration tools (6 agent + 6 hook)");
}
