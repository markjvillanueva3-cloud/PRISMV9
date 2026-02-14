/**
 * Orchestration Dispatcher - Consolidates orchestrationV2 (8) + swarmToolsV2 (6) = 14 tools → 1
 * Tool: prism_orchestrate
 * Actions: agent_execute, agent_parallel, agent_pipeline, plan_create, plan_execute, plan_status,
 *          queue_stats, session_list, swarm_execute, swarm_parallel, swarm_consensus, swarm_pipeline,
 *          swarm_status, swarm_patterns
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import {
  agentExecutor, executeAgent, executeAgentsParallel, executeAgentPipeline,
  type TaskPriority, type ExecutionMode
} from "../../engines/AgentExecutor.js";
import {
  swarmExecutor, executeSwarm, type SwarmPattern
} from "../../engines/SwarmExecutor.js";
import { agentRegistry } from "../../registries/AgentRegistry.js";
import { hookExecutor } from "../../engines/HookExecutor.js";

const ACTIONS = [
  "agent_execute", "agent_parallel", "agent_pipeline",
  "plan_create", "plan_execute", "plan_status", "queue_stats", "session_list",
  "swarm_execute", "swarm_parallel", "swarm_consensus", "swarm_pipeline",
  "swarm_status", "swarm_patterns"
] as const;

function ok(data: any) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data) }] };
}

export function registerOrchestrationDispatcher(server: any): void {
  server.tool(
    "prism_orchestrate",
    `Agent orchestration & swarm coordination (14 actions). Actions: ${ACTIONS.join(", ")}`,
    { action: z.enum(ACTIONS), params: z.record(z.any()).optional() },
    async ({ action, params = {} }: { action: typeof ACTIONS[number]; params: Record<string, any> }) => {
      log.info(`[prism_orchestrate] ${action}`);
      try {
        switch (action) {
          // === AGENT TOOLS ===
          case "agent_execute": {
            const agentId = params.agent_id || params.task;
            if (!agentId) return ok({ error: "agent_id or task required", available: agentRegistry.all().slice(0, 10).map(a => a.agent_id) });
            const agent = agentRegistry.get(agentId);
            if (!agent) return ok({ error: `Agent not found: ${agentId}`, available: agentRegistry.all().slice(0, 10).map(a => a.agent_id) });
            try {
              const result = await executeAgent(agentId, params.input || { task: params.task }, {
                priority: (params.priority || "normal") as TaskPriority,
                timeout_ms: params.timeout_ms || 30000,
                retries: params.retries ?? 2
              });
              return ok({ agent: { id: agent.agent_id, name: agent.name, category: agent.category }, result });
            } catch (agentErr: any) {
              const isTimeout = /timeout|timed?\s*out|ETIMEDOUT/i.test(agentErr.message || "");
              if (isTimeout) {
                try {
                  await hookExecutor.execute("on-agent-timeout", {
                    operation: "agent_execute",
                    target: { type: "calculation" as const, id: agentId, data: { agent_id: agentId, timeout_ms: params.timeout_ms || 30000 } },
                    metadata: { dispatcher: "orchestrationDispatcher", action: "agent_execute", agent_id: agentId, error: agentErr.message }
                  });
                } catch (e) { log.warn(`[prism_orchestrate] on-agent-timeout hook error: ${e}`); }
              }
              throw agentErr; // re-throw to hit outer catch
            }
          }
          case "agent_parallel": {
            const results = await executeAgentsParallel(params.agents || []);
            const successful = results.filter(r => r.status === "completed").length;
            return ok({ total: results.length, successful, failed: results.length - successful, results });
          }
          case "agent_pipeline": {
            const plan = await executeAgentPipeline(params.agents || []);
            const results = Array.from(plan.results.values());
            return ok({ planId: plan.id, status: plan.status, stages: results.length, results, output: plan.aggregatedOutput });
          }
          case "plan_create": {
            const missing = (params.tasks || []).filter((t: any) => !agentRegistry.get(t.agent_id)).map((t: any) => t.agent_id);
            if (missing.length > 0) return ok({ error: `Unknown agents: ${missing.join(", ")}` });
            const tasks = (params.tasks || []).map((t: any) => agentExecutor.createTask(t.agent_id, t.input || {}, {
              name: t.name, priority: t.priority as TaskPriority, dependencies: t.dependencies
            }));
            const plan = agentExecutor.createPlan(params.name || "plan", (params.mode || "sequential") as ExecutionMode, tasks);
            return ok({ planId: plan.id, name: plan.name, mode: plan.mode, taskCount: plan.tasks.length, status: plan.status });
          }
          case "plan_execute": {
            const plan = agentExecutor.getPlan(params.plan_id);
            if (!plan) return ok({ error: `Plan not found: ${params.plan_id}` });
            const executed = await agentExecutor.executePlan(params.plan_id);
            const results = Array.from(executed.results.values());
            return ok({ planId: executed.id, status: executed.status, results, output: executed.aggregatedOutput });
          }
          case "plan_status": {
            const plan = agentExecutor.getPlan(params.plan_id);
            if (!plan) return ok({ error: `Plan not found: ${params.plan_id}` });
            return ok({ planId: plan.id, name: plan.name, status: plan.status, mode: plan.mode, taskCount: plan.tasks.length });
          }
          case "queue_stats": {
            return ok(agentExecutor.getQueueStats());
          }
          case "session_list": {
            const agents = agentRegistry.all().map(a => ({ id: a.agent_id, name: a.name, category: a.category, status: a.status, enabled: a.enabled }));
            return ok({ sessions: agentExecutor.getSessions(), available_agents: agents });
          }
          // === SWARM TOOLS ===
          case "swarm_execute": {
            const result = await executeSwarm({
              name: params.name || "swarm", pattern: params.pattern as SwarmPattern,
              agents: params.agents || [], input: params.input || {},
              timeout_ms: params.timeout_ms || 30000, options: params.options
            });
            return ok({ swarmId: result.swarmId, pattern: result.pattern, status: result.status, duration_ms: result.duration_ms, successCount: result.successCount, failCount: result.failCount, output: result.aggregatedOutput, consensus: result.consensus, competition: result.competition, collaboration: result.collaboration });
          }
          case "swarm_parallel": {
            const result = await swarmExecutor.execute({ name: params.name || "parallel", pattern: "parallel", agents: params.agents || [], input: params.input || {}, timeout_ms: params.timeout_ms || 30000 });
            return ok({ swarmId: result.swarmId, status: result.status, successCount: result.successCount, output: result.aggregatedOutput });
          }
          case "swarm_consensus": {
            const result = await swarmExecutor.execute({ name: params.name || "consensus", pattern: "consensus", agents: params.agents || [], input: params.input || {}, timeout_ms: params.timeout_ms || 30000, options: { consensusThreshold: params.threshold || 0.5, consensusField: params.consensus_field } });
            // Fire mid-operation hook for consensus validation
            try {
              await hookExecutor.execute("on-swarm-consensus", {
                operation: "swarm_consensus",
                target: { type: "calculation" as const, id: result.swarmId || "consensus", data: { consensus: result.consensus, agents: params.agents, pattern: "consensus" } },
                metadata: { dispatcher: "orchestrationDispatcher", action: "swarm_consensus", swarmId: result.swarmId, consensusReached: result.consensus?.reached, agreement: result.consensus?.actualAgreement }
              });
            } catch (e) { log.warn(`[prism_orchestrate] on-swarm-consensus hook error: ${e}`); }
            return ok({ swarmId: result.swarmId, status: result.status, consensusReached: result.consensus?.reached, agreement: result.consensus?.actualAgreement });
          }
          case "swarm_pipeline": {
            const result = await swarmExecutor.execute({ name: params.name || "pipeline", pattern: "pipeline", agents: params.agents || [], input: params.input || {}, timeout_ms: params.timeout_ms || 30000 });
            return ok({ swarmId: result.swarmId, status: result.status, stagesCompleted: result.successCount, output: result.aggregatedOutput });
          }
          case "swarm_status": {
            const result = swarmExecutor.getSwarm(params.swarm_id);
            if (!result) return ok({ error: `Swarm not found: ${params.swarm_id}` });
            return ok({ swarmId: result.swarmId, name: result.name, pattern: result.pattern, status: result.status, duration_ms: result.duration_ms });
          }
          case "swarm_patterns": {
            return ok({ patterns: swarmExecutor.getPatterns(), descriptions: {
              parallel: "All agents run simultaneously", pipeline: "Sequential with output chaining",
              map_reduce: "Distribute work, combine results", consensus: "Agents vote on output",
              hierarchical: "Layered agent execution", ensemble: "Weighted combination",
              competition: "Best result wins", collaboration: "Iterative improvement"
            }});
          }
          default: return ok({ error: `Unknown action: ${action}`, available: ACTIONS });
        }
      } catch (err: any) {
        return ok({ error: err.message, action });
      }
    }
  );
}
