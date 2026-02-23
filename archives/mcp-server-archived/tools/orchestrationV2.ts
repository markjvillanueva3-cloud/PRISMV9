/**
 * PRISM MCP Server - Agent Orchestration Tools V2
 * MCP tools for multi-agent execution and coordination
 * 
 * Tools (8):
 * - agent_execute: Execute a single agent task
 * - agent_execute_parallel: Execute multiple agents in parallel
 * - agent_execute_pipeline: Execute agents as a pipeline
 * - plan_create: Create an execution plan
 * - plan_execute: Execute a plan
 * - plan_status: Get plan status
 * - queue_stats: Get queue statistics
 * - session_list: List active agent sessions
 * 
 * For AI agent orchestration and multi-agent workflows
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { log } from "../utils/Logger.js";
import {
  agentExecutor,
  executeAgent,
  executeAgentsParallel,
  executeAgentPipeline,
  type TaskPriority,
  type ExecutionMode
} from "../engines/AgentExecutor.js";
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

// ============================================================================
// SCHEMAS
// ============================================================================

const AgentExecuteSchema = z.object({
  agent_id: z.string().describe("ID of the agent to execute"),
  input: z.record(z.unknown()).describe("Input parameters for the agent"),
  priority: z.enum(["critical", "high", "normal", "low", "background"]).default("normal").describe("Task priority"),
  timeout_ms: z.number().min(1000).max(300000).default(30000).describe("Execution timeout in milliseconds"),
  retries: z.number().min(0).max(5).default(2).describe("Number of retry attempts on failure"),
  response_format: z.enum(["json", "markdown"]).default("markdown")
});

const AgentExecuteParallelSchema = z.object({
  agents: z.array(z.object({
    agent_id: z.string(),
    input: z.record(z.unknown())
  })).min(1).max(10).describe("Array of agents to execute in parallel"),
  response_format: z.enum(["json", "markdown"]).default("markdown")
});

const AgentExecutePipelineSchema = z.object({
  agents: z.array(z.object({
    agent_id: z.string(),
    input: z.record(z.unknown())
  })).min(2).max(10).describe("Array of agents to execute as a pipeline (output flows to next)"),
  response_format: z.enum(["json", "markdown"]).default("markdown")
});

const PlanCreateSchema = z.object({
  name: z.string().describe("Name for the execution plan"),
  mode: z.enum(["sequential", "parallel", "pipeline", "swarm"]).describe("Execution mode"),
  tasks: z.array(z.object({
    agent_id: z.string(),
    input: z.record(z.unknown()),
    name: z.string().optional(),
    priority: z.enum(["critical", "high", "normal", "low", "background"]).optional(),
    dependencies: z.array(z.string()).optional()
  })).min(1).max(20).describe("Tasks in the plan"),
  response_format: z.enum(["json", "markdown"]).default("markdown")
});

const PlanExecuteSchema = z.object({
  plan_id: z.string().describe("ID of the plan to execute"),
  response_format: z.enum(["json", "markdown"]).default("markdown")
});

const PlanStatusSchema = z.object({
  plan_id: z.string().describe("ID of the plan to check"),
  response_format: z.enum(["json", "markdown"]).default("markdown")
});

const QueueStatsSchema = z.object({
  response_format: z.enum(["json", "markdown"]).default("markdown")
});

const SessionListSchema = z.object({
  response_format: z.enum(["json", "markdown"]).default("markdown")
});

// ============================================================================
// TOOL REGISTRATION
// ============================================================================

export function registerOrchestrationToolsV2(server: McpServer): void {

  // =========================================================================
  // AGENT EXECUTE
  // =========================================================================

  server.tool(
    "agent_execute",
    "Execute a single agent task with specified input. Returns the execution result including output and timing.",
    AgentExecuteSchema.shape,
    async (params) => {
      log.info(`[agent_execute] Agent: ${params.agent_id}`);

      // Validate agent exists
      const agent = agentRegistry.get(params.agent_id);
      if (!agent) {
        const available = agentRegistry.list().slice(0, 10).map(a => a.id);
        return successResponse(
          `❌ Agent not found: ${params.agent_id}\n\nAvailable agents (first 10): ${available.join(", ")}`,
          { success: false }
        );
      }

      try {
        const result = await executeAgent(params.agent_id, params.input, {
          priority: params.priority as TaskPriority,
          timeout_ms: params.timeout_ms,
          retries: params.retries
        });

        let content: string;
        if (params.response_format === "markdown") {
          const statusIcon = result.status === "completed" ? "✅" : "❌";
          content = `## ${statusIcon} Agent Execution Result\n\n`;
          content += `### Agent\n`;
          content += `- **ID**: ${agent.id}\n`;
          content += `- **Name**: ${agent.name}\n`;
          content += `- **Category**: ${agent.category}\n\n`;

          content += `### Execution\n`;
          content += `| Metric | Value |\n`;
          content += `|--------|-------|\n`;
          content += `| Status | **${result.status}** |\n`;
          content += `| Duration | ${formatDuration(result.duration_ms || 0)} |\n`;
          content += `| Retries | ${result.retryCount} |\n`;
          content += `| Task ID | \`${result.taskId}\` |\n\n`;

          if (result.status === "completed" && result.output) {
            content += `### Output\n`;
            content += `\`\`\`json\n${JSON.stringify(result.output, null, 2)}\n\`\`\`\n`;
          }

          if (result.error) {
            content += `### ❌ Error\n`;
            content += `\`\`\`\n${result.error}\n\`\`\`\n`;
          }
        } else {
          content = formatAsJson({ agent, result });
        }

        return successResponse(content, { 
          success: result.status === "completed",
          taskId: result.taskId,
          duration_ms: result.duration_ms
        });

      } catch (error) {
        return successResponse(
          `❌ Execution failed: ${error instanceof Error ? error.message : String(error)}`,
          { success: false }
        );
      }
    }
  );

  // =========================================================================
  // AGENT EXECUTE PARALLEL
  // =========================================================================

  server.tool(
    "agent_execute_parallel",
    "Execute multiple agents in parallel. All agents run simultaneously and results are collected.",
    AgentExecuteParallelSchema.shape,
    async (params) => {
      log.info(`[agent_execute_parallel] ${params.agents.length} agents`);

      try {
        const results = await executeAgentsParallel(params.agents);
        
        const successful = results.filter(r => r.status === "completed").length;
        const failed = results.length - successful;
        const totalDuration = results.reduce((sum, r) => sum + (r.duration_ms || 0), 0);

        let content: string;
        if (params.response_format === "markdown") {
          const statusIcon = failed === 0 ? "✅" : "⚠️";
          content = `## ${statusIcon} Parallel Execution Results\n\n`;
          
          content += `### Summary\n`;
          content += `| Metric | Value |\n`;
          content += `|--------|-------|\n`;
          content += `| Total Agents | ${params.agents.length} |\n`;
          content += `| Successful | ${successful} |\n`;
          content += `| Failed | ${failed} |\n`;
          content += `| Total Duration | ${formatDuration(totalDuration)} |\n\n`;

          content += `### Results by Agent\n`;
          content += `| Agent | Status | Duration |\n`;
          content += `|-------|--------|----------|\n`;
          results.forEach((result, i) => {
            const status = result.status === "completed" ? "✅" : "❌";
            content += `| ${params.agents[i].agent_id} | ${status} ${result.status} | ${formatDuration(result.duration_ms || 0)} |\n`;
          });
          content += `\n`;

          // Show successful outputs
          const successfulResults = results.filter(r => r.status === "completed" && r.output);
          if (successfulResults.length > 0) {
            content += `### Outputs\n`;
            successfulResults.forEach(r => {
              content += `<details><summary>${r.agentId}</summary>\n\n`;
              content += `\`\`\`json\n${JSON.stringify(r.output, null, 2)}\n\`\`\`\n`;
              content += `</details>\n\n`;
            });
          }

        } else {
          content = formatAsJson({ summary: { total: params.agents.length, successful, failed }, results });
        }

        return successResponse(content, { 
          success: failed === 0,
          successful,
          failed,
          duration_ms: totalDuration
        });

      } catch (error) {
        return successResponse(
          `❌ Parallel execution failed: ${error instanceof Error ? error.message : String(error)}`,
          { success: false }
        );
      }
    }
  );

  // =========================================================================
  // AGENT EXECUTE PIPELINE
  // =========================================================================

  server.tool(
    "agent_execute_pipeline",
    "Execute agents as a pipeline. Output from each agent flows as input to the next agent.",
    AgentExecutePipelineSchema.shape,
    async (params) => {
      log.info(`[agent_execute_pipeline] ${params.agents.length} agents`);

      try {
        const plan = await executeAgentPipeline(params.agents);
        const results = Array.from(plan.results.values());
        
        const successful = results.filter(r => r.status === "completed").length;
        const pipelineCompleted = successful === params.agents.length;
        const lastResult = results[results.length - 1];

        let content: string;
        if (params.response_format === "markdown") {
          const statusIcon = pipelineCompleted ? "✅" : "❌";
          content = `## ${statusIcon} Pipeline Execution Results\n\n`;
          
          content += `### Summary\n`;
          content += `| Metric | Value |\n`;
          content += `|--------|-------|\n`;
          content += `| Pipeline Stages | ${params.agents.length} |\n`;
          content += `| Completed Stages | ${successful} |\n`;
          content += `| Status | ${plan.status} |\n`;
          content += `| Plan ID | \`${plan.id}\` |\n\n`;

          content += `### Pipeline Flow\n`;
          content += `\`\`\`\n`;
          params.agents.forEach((agent, i) => {
            const result = results[i];
            const status = result?.status === "completed" ? "✓" : "✗";
            const arrow = i < params.agents.length - 1 ? " → " : "";
            content += `[${status}] ${agent.agent_id}${arrow}`;
          });
          content += `\n\`\`\`\n\n`;

          content += `### Stage Results\n`;
          content += `| Stage | Agent | Status | Duration |\n`;
          content += `|-------|-------|--------|----------|\n`;
          results.forEach((result, i) => {
            const status = result.status === "completed" ? "✅" : "❌";
            content += `| ${i + 1} | ${result.agentId} | ${status} | ${formatDuration(result.duration_ms || 0)} |\n`;
          });
          content += `\n`;

          if (pipelineCompleted && lastResult?.output) {
            content += `### Final Output\n`;
            content += `\`\`\`json\n${JSON.stringify(lastResult.output, null, 2)}\n\`\`\`\n`;
          }

        } else {
          content = formatAsJson({ plan: { id: plan.id, status: plan.status }, results, aggregatedOutput: plan.aggregatedOutput });
        }

        return successResponse(content, { 
          success: pipelineCompleted,
          planId: plan.id,
          completedStages: successful
        });

      } catch (error) {
        return successResponse(
          `❌ Pipeline execution failed: ${error instanceof Error ? error.message : String(error)}`,
          { success: false }
        );
      }
    }
  );

  // =========================================================================
  // PLAN CREATE
  // =========================================================================

  server.tool(
    "plan_create",
    "Create an execution plan for multiple tasks. Plan can be executed later with plan_execute.",
    PlanCreateSchema.shape,
    async (params) => {
      log.info(`[plan_create] ${params.name} with ${params.tasks.length} tasks`);

      try {
        // Validate all agents exist
        const missingAgents: string[] = [];
        params.tasks.forEach(task => {
          if (!agentRegistry.get(task.agent_id)) {
            missingAgents.push(task.agent_id);
          }
        });

        if (missingAgents.length > 0) {
          return successResponse(
            `❌ Unknown agents: ${missingAgents.join(", ")}`,
            { success: false }
          );
        }

        // Create tasks
        const tasks = params.tasks.map(task => 
          agentExecutor.createTask(task.agent_id, task.input, {
            name: task.name,
            priority: task.priority as TaskPriority,
            dependencies: task.dependencies
          })
        );

        // Create plan
        const plan = agentExecutor.createPlan(params.name, params.mode as ExecutionMode, tasks);

        let content: string;
        if (params.response_format === "markdown") {
          content = `## ✅ Execution Plan Created\n\n`;
          content += `### Plan Details\n`;
          content += `| Property | Value |\n`;
          content += `|----------|-------|\n`;
          content += `| **Plan ID** | \`${plan.id}\` |\n`;
          content += `| Name | ${plan.name} |\n`;
          content += `| Mode | ${plan.mode} |\n`;
          content += `| Tasks | ${plan.tasks.length} |\n`;
          content += `| Status | ${plan.status} |\n\n`;

          content += `### Tasks\n`;
          content += `| # | Agent | Priority | Dependencies |\n`;
          content += `|---|-------|----------|-------------|\n`;
          plan.tasks.forEach((task, i) => {
            const deps = task.dependencies?.join(", ") || "-";
            content += `| ${i + 1} | ${task.agentId} | ${task.priority} | ${deps} |\n`;
          });
          content += `\n`;

          content += `### Next Step\n`;
          content += `Execute the plan with: \`plan_execute(plan_id: "${plan.id}")\`\n`;

        } else {
          content = formatAsJson({ success: true, plan: { id: plan.id, name: plan.name, mode: plan.mode, status: plan.status, taskCount: plan.tasks.length } });
        }

        return successResponse(content, { success: true, planId: plan.id });

      } catch (error) {
        return successResponse(
          `❌ Failed to create plan: ${error instanceof Error ? error.message : String(error)}`,
          { success: false }
        );
      }
    }
  );

  // =========================================================================
  // PLAN EXECUTE
  // =========================================================================

  server.tool(
    "plan_execute",
    "Execute a previously created plan. Returns results when complete.",
    PlanExecuteSchema.shape,
    async (params) => {
      log.info(`[plan_execute] Plan: ${params.plan_id}`);

      const plan = agentExecutor.getPlan(params.plan_id);
      if (!plan) {
        return successResponse(`❌ Plan not found: ${params.plan_id}`, { success: false });
      }

      try {
        const executedPlan = await agentExecutor.executePlan(params.plan_id);
        const results = Array.from(executedPlan.results.values());
        const successful = results.filter(r => r.status === "completed").length;

        let content: string;
        if (params.response_format === "markdown") {
          const statusIcon = executedPlan.status === "completed" ? "✅" : "❌";
          content = `## ${statusIcon} Plan Execution Results\n\n`;
          
          content += `### Plan: ${executedPlan.name}\n`;
          content += `| Metric | Value |\n`;
          content += `|--------|-------|\n`;
          content += `| Status | **${executedPlan.status}** |\n`;
          content += `| Mode | ${executedPlan.mode} |\n`;
          content += `| Tasks | ${results.length} |\n`;
          content += `| Successful | ${successful} |\n`;
          content += `| Failed | ${results.length - successful} |\n\n`;

          content += `### Task Results\n`;
          content += `| Task | Agent | Status | Duration |\n`;
          content += `|------|-------|--------|----------|\n`;
          results.forEach((result, i) => {
            const status = result.status === "completed" ? "✅" : "❌";
            content += `| ${i + 1} | ${result.agentId} | ${status} | ${formatDuration(result.duration_ms || 0)} |\n`;
          });
          content += `\n`;

          if (executedPlan.aggregatedOutput) {
            content += `### Aggregated Output\n`;
            content += `\`\`\`json\n${JSON.stringify(executedPlan.aggregatedOutput, null, 2)}\n\`\`\`\n`;
          }

        } else {
          content = formatAsJson({ plan: { id: executedPlan.id, status: executedPlan.status }, results: results.map(r => ({ taskId: r.taskId, agentId: r.agentId, status: r.status })), aggregatedOutput: executedPlan.aggregatedOutput });
        }

        return successResponse(content, { 
          success: executedPlan.status === "completed",
          planId: executedPlan.id
        });

      } catch (error) {
        return successResponse(
          `❌ Plan execution failed: ${error instanceof Error ? error.message : String(error)}`,
          { success: false }
        );
      }
    }
  );

  // =========================================================================
  // PLAN STATUS
  // =========================================================================

  server.tool(
    "plan_status",
    "Get the status of a plan including task completion states.",
    PlanStatusSchema.shape,
    async (params) => {
      log.info(`[plan_status] Plan: ${params.plan_id}`);

      const plan = agentExecutor.getPlan(params.plan_id);
      if (!plan) {
        return successResponse(`❌ Plan not found: ${params.plan_id}`, { success: false });
      }

      const results = Array.from(plan.results.values());

      let content: string;
      if (params.response_format === "markdown") {
        content = `## Plan Status: ${plan.name}\n\n`;
        content += `| Property | Value |\n`;
        content += `|----------|-------|\n`;
        content += `| Plan ID | \`${plan.id}\` |\n`;
        content += `| Status | **${plan.status}** |\n`;
        content += `| Mode | ${plan.mode} |\n`;
        content += `| Created | ${plan.createdAt.toISOString()} |\n`;
        if (plan.startedAt) content += `| Started | ${plan.startedAt.toISOString()} |\n`;
        if (plan.completedAt) content += `| Completed | ${plan.completedAt.toISOString()} |\n`;
        content += `\n`;

        if (results.length > 0) {
          content += `### Task Progress\n`;
          content += `| Task | Status | Duration |\n`;
          content += `|------|--------|----------|\n`;
          results.forEach(r => {
            const status = r.status === "completed" ? "✅" : r.status === "failed" ? "❌" : "⏳";
            content += `| ${r.agentId} | ${status} ${r.status} | ${formatDuration(r.duration_ms || 0)} |\n`;
          });
        } else {
          content += `*No results yet - plan may not have been executed*\n`;
        }

      } else {
        content = formatAsJson({ plan: { id: plan.id, name: plan.name, status: plan.status, mode: plan.mode }, taskCount: plan.tasks.length, completedTasks: results.length });
      }

      return successResponse(content, { success: true, planId: plan.id, status: plan.status });
    }
  );

  // =========================================================================
  // QUEUE STATS
  // =========================================================================

  server.tool(
    "queue_stats",
    "Get execution queue statistics including pending, running, and completed tasks.",
    QueueStatsSchema.shape,
    async (params) => {
      log.info(`[queue_stats]`);

      const stats = agentExecutor.getQueueStats();

      let content: string;
      if (params.response_format === "markdown") {
        content = `## Execution Queue Statistics\n\n`;
        content += `| Metric | Value |\n`;
        content += `|--------|-------|\n`;
        content += `| **Pending Tasks** | ${stats.pending} |\n`;
        content += `| **Running Tasks** | ${stats.running} |\n`;
        content += `| Completed | ${stats.completed} |\n`;
        content += `| Failed | ${stats.failed} |\n`;
        content += `| Total Tasks | ${stats.totalTasks} |\n`;
        content += `| Avg Duration | ${formatDuration(stats.avgDuration_ms)} |\n`;
        content += `| Throughput | ${stats.throughput_per_min}/min |\n`;

      } else {
        content = formatAsJson(stats);
      }

      return successResponse(content, { success: true, ...stats });
    }
  );

  // =========================================================================
  // SESSION LIST
  // =========================================================================

  server.tool(
    "session_list",
    "List all active agent sessions with their status and statistics.",
    SessionListSchema.shape,
    async (params) => {
      log.info(`[session_list]`);

      const sessions = agentExecutor.getSessions();

      let content: string;
      if (params.response_format === "markdown") {
        content = `## Active Agent Sessions\n\n`;
        
        if (sessions.length === 0) {
          content += `*No active sessions*\n`;
        } else {
          content += `| Agent | Status | Tasks | Total Time | Errors |\n`;
          content += `|-------|--------|-------|------------|--------|\n`;
          sessions.forEach(s => {
            const statusIcon = s.status === "idle" ? "🟢" : s.status === "busy" ? "🟡" : "🔴";
            content += `| ${s.agentName} | ${statusIcon} ${s.status} | ${s.tasksCompleted} | ${formatDuration(s.totalDuration_ms)} | ${s.errors} |\n`;
          });
        }

      } else {
        content = formatAsJson({ sessionCount: sessions.length, sessions: sessions.map(s => ({ agentId: s.agentId, status: s.status, tasksCompleted: s.tasksCompleted })) });
      }

      return successResponse(content, { success: true, sessionCount: sessions.length });
    }
  );

  log.info("[orchestration_v2] Registered 8 agent orchestration tools V2");
}
