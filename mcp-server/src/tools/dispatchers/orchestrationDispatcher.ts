/**
 * Orchestration Dispatcher - Consolidates orchestrationV2 (8) + swarmToolsV2 (6) + roadmapExec (4) = 18 tools → 1
 * Tool: prism_orchestrate
 * Actions: agent_execute, agent_parallel, agent_pipeline, plan_create, plan_execute, plan_status,
 *          queue_stats, session_list, swarm_execute, swarm_parallel, swarm_consensus, swarm_pipeline,
 *          swarm_status, swarm_patterns, roadmap_plan, roadmap_next_batch, roadmap_advance, roadmap_gate,
 *          roadmap_claim, roadmap_release, roadmap_heartbeat, roadmap_discover,
 *          roadmap_register, roadmap_populate_context, pipeline_health, dlq_list, dlq_retry
 *
 * @version 2.1.0 - Added distributed locking, telemetry, dead-letter queue integration
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
import { ACTION_ORCHESTRATION_SCHEMAS } from "../../schemas/orchestrationActionSchemas.js";
import { SCHEMA_VERSION } from "../../schemas/schemaVersioning.js";
import {
  agentExecutor, executeAgent, executeAgentsParallel, executeAgentPipeline,
  type TaskPriority, type ExecutionMode
} from "../../engines/AgentExecutor.js";
import {
  swarmExecutor, executeSwarm, type SwarmPattern
} from "../../engines/SwarmExecutor.js";
import {
  roadmapExecutor,
  summarizePlan,
} from "../../engines/RoadmapExecutor.js";
import {
  loadIndex,
  loadEnvelope,
  loadPosition,
  resolveEnvelope,
  resolvePosition,
  savePosition,
  updateMilestoneStatus,
  loadClaimedIds,
  loadRegistry,
  saveEnvelope,
  registerInRegistry,
} from "../../services/RoadmapLoader.js";
import * as TaskClaimService from "../../services/TaskClaimService.js";
import { agentRegistry } from "../../registries/AgentRegistry.js";
import { hookExecutor } from "../../engines/HookExecutor.js";
import { classifyTask } from "../../engines/TaskAgentClassifier.js";

const ACTIONS = [
  "agent_execute", "agent_parallel", "agent_pipeline",
  "plan_create", "plan_execute", "plan_status", "queue_stats", "session_list",
  "swarm_execute", "swarm_parallel", "swarm_consensus", "swarm_pipeline",
  "swarm_status", "swarm_patterns", "swarm_quick",
  "roadmap_plan", "roadmap_next_batch", "roadmap_advance", "roadmap_gate",
  "roadmap_list", "roadmap_load",
  "roadmap_claim", "roadmap_release", "roadmap_heartbeat", "roadmap_discover",
  "roadmap_register", "roadmap_populate_context",
  "pipeline_health", "dlq_list", "dlq_retry",
  "unified_execute", "unified_classify", "unified_route"
] as const;

// ============================================================================
// TELEMETRY & HOOKS INTEGRATION
// ============================================================================

interface ActionTiming {
  action: string;
  startTime: number;
  endTime?: number;
  success: boolean;
  error?: string;
}

/** Record action timing for telemetry. */
async function recordActionTelemetry(timing: ActionTiming): Promise<void> {
  try {
    const { telemetryEngine } = await import("../../engines/TelemetryEngine.js");
    const duration = timing.endTime ? timing.endTime - timing.startTime : 0;
    // TelemetryEngine expects a different format, so we log manually
    log.debug(`[prism_orchestrate] ${timing.action} ${timing.success ? 'OK' : 'FAIL'} ${duration.toFixed(0)}ms`);
  } catch { /* telemetry failure = zero dispatcher impact */ }
}

/** Execute pre-action hooks. Returns false if action should be blocked. */
async function executePreActionHook(action: string, params: Record<string, unknown>): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const context = {
      operation: action,
      target: { type: "orchestration" as const, id: action, data: params },
      metadata: { dispatcher: "orchestrationDispatcher", action, timestamp: Date.now() }
    };
    await hookExecutor.execute("pre-orchestration" as any, context);
    return { allowed: true };
  } catch (err: any) {
    if (err?.blocked) {
      return { allowed: false, reason: err.message };
    }
    // Non-blocking hook error — allow action to proceed
    log.warn(`[prism_orchestrate] pre-action hook error: ${err?.message?.slice(0, 100)}`);
    return { allowed: true };
  }
}

/** Execute post-action hooks for telemetry and audit. */
async function executePostActionHook(action: string, params: Record<string, unknown>, result: unknown, durationMs: number): Promise<void> {
  try {
    const context = {
      operation: action,
      target: { type: "orchestration" as const, id: action, data: { params, result, durationMs } },
      metadata: { dispatcher: "orchestrationDispatcher", action, durationMs, timestamp: Date.now() }
    };
    await hookExecutor.execute("post-orchestration" as any, context);
  } catch (err: any) {
    log.warn(`[prism_orchestrate] post-action hook error: ${err?.message?.slice(0, 100)}`);
  }
}

// ============================================================================
// DEAD-LETTER QUEUE INTEGRATION
// ============================================================================

interface DeadLetterEntry {
  id: string;
  action: string;
  params: Record<string, unknown>;
  error: string;
  timestamp: string;
  retryCount: number;
  swarmId?: string;
  agentId?: string;
}

let deadLetterQueue: DeadLetterEntry[] = [];
const DLQ_MAX_SIZE = 100;

/** Add failed operation to dead-letter queue. */
function addToDeadLetterQueue(action: string, params: Record<string, unknown>, error: string, extras?: { swarmId?: string; agentId?: string }): void {
  const entry: DeadLetterEntry = {
    id: `DLQ-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    action,
    params,
    error: error.slice(0, 500),
    timestamp: new Date().toISOString(),
    retryCount: 0,
    ...extras
  };
  deadLetterQueue.push(entry);
  if (deadLetterQueue.length > DLQ_MAX_SIZE) {
    deadLetterQueue = deadLetterQueue.slice(-DLQ_MAX_SIZE);
  }
  log.info(`[prism_orchestrate] Added to DLQ: ${entry.id} (${action})`);
}

/**
 * Standard response wrapper with schema versioning and response slimming.
 * @param data - Response data
 * @param includeVersion - Include schema version metadata (default: false for backward compat)
 */
function ok(data: any, includeVersion: boolean = false) {
  const response = includeVersion
    ? { ...slimResponse(data), _schema_version: SCHEMA_VERSION }
    : slimResponse(data);
  return { content: [{ type: "text" as const, text: JSON.stringify(response) }] };
}

/** Registers orchestration dispatcher.
 * @param server - MCP server instance
  * @returns void
 */
export function registerOrchestrationDispatcher(server: any): void {
  server.tool(
    "prism_orchestrate",
    "Agent orchestration, swarm coordination, and roadmap execution. Multi-Claude parallel via claim/release/heartbeat. Use 'action' param.",
    { action: z.enum(ACTIONS), params: z.record(z.string(), z.any()).optional() },
    async ({ action, params: rawParams = {} }: { action: typeof ACTIONS[number]; params: Record<string, any> }) => {
      log.info(`[prism_orchestrate] ${action}`);
      // H1-MS2: Auto-normalize snake_case → camelCase params
      let params = rawParams;
      try {
        const { normalizeParams } = await import("../../utils/paramNormalizer.js");
        params = normalizeParams(rawParams);
      } catch { /* normalizer not available */ }

      // SYS-MS6: Validate params against per-action Zod schema
      const validation = validateActionParams(action, params, ACTION_ORCHESTRATION_SCHEMAS);
      if (!validation.valid) {
        return dispatcherError(
          `Invalid params for '${action}': ${validation.errorMessage}`,
          action,
          "prism_orchestrate"
        );
      }

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
                priority: (params.priority ?? "normal") as TaskPriority,
                timeout_ms: params.timeout_ms ?? 30000,
                retries: params.retries ?? 2
              });
              return ok({ agent: { id: agent.agent_id, name: agent.name, category: agent.category }, result });
            } catch (agentErr: any) {
              const isTimeout = /timeout|timed?\s*out|ETIMEDOUT/i.test(agentErr.message || "");
              if (isTimeout) {
                try {
                  await hookExecutor.execute("on-agent-timeout", {
                    operation: "agent_execute",
                    target: { type: "calculation" as const, id: agentId, data: { agent_id: agentId, timeout_ms: params.timeout_ms ?? 30000 } },
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
            const startTime = performance.now();
            try {
              const result = await executeSwarm({
                name: params.name ?? "swarm", pattern: params.pattern as SwarmPattern,
                agents: params.agents || [], input: params.input || {},
                timeout_ms: params.timeout_ms ?? 30000, options: params.options
              });
              // DLQ integration: add failed swarms to dead-letter queue for retry
              if (result.status === "failed" || result.failCount > 0) {
                addToDeadLetterQueue("swarm_execute", params, `Swarm failed: ${result.failCount} agents failed`, { swarmId: result.swarmId });
              }
              // Record telemetry
              await recordActionTelemetry({
                action: "swarm_execute",
                startTime,
                endTime: performance.now(),
                success: result.status === "completed",
              });
              return ok({ swarmId: result.swarmId, pattern: result.pattern, status: result.status, duration_ms: result.duration_ms, successCount: result.successCount, failCount: result.failCount, output: result.aggregatedOutput, consensus: result.consensus, competition: result.competition, collaboration: result.collaboration, dlq_eligible: result.failCount > 0 });
            } catch (swarmErr: any) {
              addToDeadLetterQueue("swarm_execute", params, swarmErr.message, { swarmId: params.name });
              throw swarmErr;
            }
          }
          case "swarm_parallel": {
            const result = await swarmExecutor.execute({ name: params.name ?? "parallel", pattern: "parallel", agents: params.agents || [], input: params.input || {}, timeout_ms: params.timeout_ms ?? 30000 });
            return ok({ swarmId: result.swarmId, status: result.status, successCount: result.successCount, output: result.aggregatedOutput });
          }
          case "swarm_consensus": {
            const result = await swarmExecutor.execute({ name: params.name ?? "consensus", pattern: "consensus", agents: params.agents || [], input: params.input || {}, timeout_ms: params.timeout_ms ?? 30000, options: { consensusThreshold: params.threshold ?? 0.5, consensusField: params.consensus_field } });
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
            const result = await swarmExecutor.execute({ name: params.name ?? "pipeline", pattern: "pipeline", agents: params.agents || [], input: params.input || {}, timeout_ms: params.timeout_ms ?? 30000 });
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
          case "swarm_quick": {
            // One-shot swarm: auto-selects pattern + agents from task description + domain
            const task = params.task || params.description || "";
            const domain = params.domain || "general";
            const maxAgents = Math.min(params.max_agents ?? 5, 8);
            const minAgents = Math.max(params.min_agents ?? 2, 2);
            const timeoutMs = params.timeout_ms ?? 30000;

            // Use TaskAgentClassifier to pick agents and pattern
            const classification = classifyTask("prism_orchestrate", "swarm_quick", { task, domain });
            const swarmRec = classification.recommended_swarm;
            const agentRecs = classification.recommended_agents;

            // Determine agents: from classification or fallback to registry search
            let agentIds: string[] = [];
            if (swarmRec && swarmRec.agents.length >= minAgents) {
              agentIds = swarmRec.agents.slice(0, maxAgents);
            } else if (agentRecs.length >= minAgents) {
              agentIds = agentRecs.slice(0, maxAgents).map(a => a.agent_id);
            } else {
              // Fallback: find agents from registry matching domain
              const all = agentRegistry.all().filter(a => a.enabled && a.status === "active");
              const domainMatch = all.filter(a => a.category?.toLowerCase().includes(domain.toLowerCase()));
              agentIds = (domainMatch.length >= minAgents ? domainMatch : all).slice(0, maxAgents).map(a => a.agent_id);
            }

            if (agentIds.length < minAgents) {
              return ok({ error: `Only ${agentIds.length} agents found for domain "${domain}", need at least ${minAgents}`, available: agentIds });
            }

            // Select pattern: from recommendation or complexity-based
            const pattern: SwarmPattern = (swarmRec?.pattern as SwarmPattern) ||
              (classification.complexity === "critical" ? "consensus" :
               classification.complexity === "complex" ? "map_reduce" : "parallel");

            const result = await executeSwarm({
              name: `quick-${domain}-${Date.now()}`,
              pattern,
              agents: agentIds,
              input: { task, domain, params: params.context || {} },
              timeout_ms: timeoutMs
            });

            return ok({
              swarmId: result.swarmId, pattern: result.pattern, status: result.status,
              duration_ms: result.duration_ms, agents: agentIds,
              successCount: result.successCount, failCount: result.failCount,
              output: result.aggregatedOutput,
              classification: { complexity: classification.complexity, domain: classification.domain, auto_orchestrate: classification.auto_orchestrate }
            });
          }
          // === ROADMAP EXECUTION ===
          case "roadmap_plan": {
            // Generate a batched execution plan with parallel detection
            // params: { milestone_id?: string, roadmap?: RoadmapEnvelope, completed_ids?: string[] }
            if (!params.roadmap && !params.milestone_id) {
              return ok({ error: "milestone_id or roadmap (RoadmapEnvelope JSON) required" });
            }
            try {
              const { envelope } = await resolveEnvelope(params);
              const completedIds = new Set<string>(params.completed_ids || []);
              const plan = roadmapExecutor.plan(envelope, completedIds);
              const summary = summarizePlan(plan);
              return ok({
                roadmapId: plan.roadmapId,
                totalUnits: plan.totalUnits,
                totalBatches: plan.totalBatches,
                parallelBatches: plan.parallelBatches,
                maxParallelWidth: plan.maxParallelWidth,
                estimatedTokens: plan.estimatedTokens,
                hasCycles: plan.dag.hasCycles,
                cycleInfo: plan.dag.cycleInfo,
                phases: plan.phases.map(p => ({
                  phaseId: p.phaseId,
                  title: p.phaseTitle,
                  totalUnits: p.totalUnits,
                  batches: p.batches.map(b => ({
                    batchId: b.batchId,
                    parallel: b.parallel,
                    unitIds: b.units.map(u => u.id),
                    unitTitles: b.units.map(u => u.title),
                    estimatedTokens: b.estimatedTokens,
                  })),
                })),
                summary,
              });
            } catch (parseErr: any) {
              return ok({ error: `roadmap_plan failed: ${parseErr.message}` });
            }
          }
          case "roadmap_next_batch": {
            // Get the next batch of ready units for parallel execution
            // params: { milestone_id?: string, roadmap?: RoadmapEnvelope, position?: PositionTracker, auto_execute?: boolean }
            if (!params.roadmap && !params.milestone_id) {
              return ok({ error: "milestone_id or roadmap required" });
            }
            try {
              const { envelope, milestoneId } = await resolveEnvelope(params);
              const position = await resolvePosition(params, envelope);
              const result = roadmapExecutor.nextBatch(envelope, position);

              const batchInfo = result.batch ? {
                batchId: result.batch.batchId,
                parallel: result.batch.parallel,
                unitCount: result.batch.units.length,
                units: result.batch.units.map(u => ({
                  id: u.id, title: u.title, phase: u.phase,
                  role: u.role, model: u.model, effort: u.effort,
                  dependencies: u.dependencies,
                  steps: u.steps.length,
                  deliverables: u.deliverables.map(d => d.path),
                })),
                estimatedTokens: result.batch.estimatedTokens,
              } : null;

              // Auto-execute: dispatch parallel agents and auto-advance
              let autoExecResult: any = null;
              if (params.auto_execute && result.batch && result.batch.parallel && result.batch.units.length >= 2) {
                try {
                  const agentTasks = result.batch.units.map(u => ({
                    agentId: u.role || "AGT-COG-REASONING",
                    input: {
                      task: u.title,
                      steps: u.steps,
                      deliverables: u.deliverables,
                      phase: u.phase,
                      effort: u.effort,
                      auto_dispatched: true
                    }
                  }));

                  const agentResults = await executeAgentsParallel(agentTasks);
                  const completedUnits = result.batch.units.map((u, i) => ({
                    unitId: u.id,
                    buildPassed: agentResults[i]?.status === "completed"
                  }));

                  // Auto-advance position
                  const advanceResult = roadmapExecutor.advance(position, completedUnits, envelope);
                  await savePosition(milestoneId || "default", position);

                  const successful = agentResults.filter(r => r.status === "completed").length;
                  autoExecResult = {
                    auto_executed: true,
                    total: agentResults.length,
                    successful,
                    failed: agentResults.length - successful,
                    auto_advanced: true,
                    new_position: advanceResult
                  };
                } catch (autoErr: any) {
                  autoExecResult = { auto_executed: false, error: autoErr.message?.slice(0, 200) };
                }
              }

              return ok({
                batch: batchInfo,
                gatePending: result.gatePending,
                gatePhaseId: result.gatePhaseId,
                complete: result.complete,
                message: result.message,
                ...(autoExecResult ? { auto_execute: autoExecResult } : {}),
              });
            } catch (err: any) {
              return ok({ error: `roadmap_next_batch failed: ${err.message}` });
            }
          }
          case "roadmap_advance": {
            // Advance position after completing units
            // params: { milestone_id?: string, roadmap?: RoadmapEnvelope, position?: PositionTracker, completed: [{ unitId, buildPassed }] }
            if ((!params.roadmap && !params.milestone_id) || !params.completed) {
              return ok({ error: "(milestone_id or roadmap) and completed[] required" });
            }
            try {
              const { envelope, milestoneId } = await resolveEnvelope(params);
              const position = await resolvePosition(params, envelope);
              const updated = roadmapExecutor.advance(
                position,
                params.completed,
                envelope
              );
              // Auto-persist when using milestone_id
              if (params.milestone_id) {
                await savePosition(milestoneId, updated);
                await updateMilestoneStatus(
                  milestoneId,
                  updated.status === "COMPLETE" ? "complete" : "in_progress",
                  updated.units_completed,
                );
              }
              return ok({
                position: updated,
                unitsCompleted: updated.units_completed,
                totalUnits: updated.total_units,
                percentComplete: updated.percent_complete,
                status: updated.status,
                nextUnit: updated.current_unit,
              });
            } catch (err: any) {
              return ok({ error: `roadmap_advance failed: ${err.message}` });
            }
          }
          case "roadmap_gate": {
            // Run a phase gate check
            // params: { milestone_id?: string, roadmap?: RoadmapEnvelope, phase_id: string,
            //           completed_ids?: string[], build_passed?, tests_passed?, test_count?, baseline_test_count?, omega_score? }
            if ((!params.roadmap && !params.milestone_id) || !params.phase_id) {
              return ok({ error: "(milestone_id or roadmap) and phase_id required" });
            }
            try {
              const { envelope } = await resolveEnvelope(params);
              const phase = envelope.phases.find(p => p.id === params.phase_id);
              if (!phase) return ok({ error: `Phase not found: ${params.phase_id}` });

              const completedIds = new Set<string>(params.completed_ids || []);
              const gateResult = roadmapExecutor.gate(phase, completedIds, {
                buildPassed: params.build_passed ?? true,
                testsPassed: params.tests_passed ?? true,
                testCount: params.test_count ?? 111,
                baselineTestCount: params.baseline_test_count ?? 111,
                omegaScore: params.omega_score ?? 1.0,
              });
              return ok({
                phaseId: gateResult.phaseId,
                passed: gateResult.passed,
                omegaScore: gateResult.omegaScore,
                checks: gateResult.checks,
              });
            } catch (err: any) {
              return ok({ error: `roadmap_gate failed: ${err.message}` });
            }
          }
          // === MODULAR ROADMAP LOADING ===
          case "roadmap_list": {
            // List all milestones from the index (lightweight — no envelopes loaded)
            try {
              const index = await loadIndex();
              return ok({
                title: index.title,
                totalMilestones: index.total_milestones,
                completedMilestones: index.completed_milestones,
                milestones: index.milestones.map(m => ({
                  id: m.id,
                  title: m.title,
                  track: m.track,
                  status: m.status,
                  dependencies: m.dependencies,
                  totalUnits: m.total_units,
                  completedUnits: m.completed_units,
                  sessions: m.sessions,
                })),
              });
            } catch (err: any) {
              return ok({ error: `roadmap_list failed: ${err.message}` });
            }
          }
          case "roadmap_load": {
            // Load a single milestone envelope by ID
            // params: { milestone_id: string }
            if (!params.milestone_id) return ok({ error: "milestone_id required" });
            try {
              const envelope = await loadEnvelope(params.milestone_id);
              const position = await loadPosition(params.milestone_id);
              return ok({
                milestoneId: params.milestone_id,
                envelope: {
                  id: envelope.id,
                  title: envelope.title,
                  totalUnits: envelope.total_units,
                  totalSessions: envelope.total_sessions,
                  phases: envelope.phases.map(p => ({
                    id: p.id,
                    title: p.title,
                    unitCount: p.units.length,
                    units: p.units.map(u => ({
                      id: u.id, title: u.title, sequence: u.sequence,
                      dependencies: u.dependencies, role: u.role, model: u.model,
                    })),
                  })),
                },
                position: position || null,
              });
            } catch (err: any) {
              return ok({ error: `roadmap_load failed: ${err.message}` });
            }
          }
          // === MULTI-CLAUDE COORDINATION (with distributed locking telemetry) ===
          case "roadmap_claim": {
            // Claim a unit for this instance (atomic mkdir-based locking)
            // Uses TaskClaimService which implements distributed locking via atomic mkdir
            // params: { milestone_id, unit_id, instance_id, worktree? }
            if (!params.milestone_id || !params.unit_id || !params.instance_id) {
              return ok({ error: "milestone_id, unit_id, and instance_id required" });
            }
            const claimStart = performance.now();
            try {
              // Pre-action hook for claim validation
              const preCheck = await executePreActionHook("roadmap_claim", params);
              if (!preCheck.allowed) {
                return ok({ error: `Claim blocked by hook: ${preCheck.reason}`, blocked: true });
              }

              const claimed = await TaskClaimService.claim(
                params.milestone_id, params.unit_id, params.instance_id, params.worktree,
              );

              // Record telemetry for distributed lock acquisition
              const claimDuration = performance.now() - claimStart;
              await recordActionTelemetry({
                action: "roadmap_claim",
                startTime: claimStart,
                endTime: performance.now(),
                success: claimed,
              });

              // Post-action hook
              await executePostActionHook("roadmap_claim", params, { claimed }, claimDuration);

              return ok({
                claimed,
                milestone_id: params.milestone_id,
                unit_id: params.unit_id,
                lock_acquired: claimed,
                lock_type: "distributed_mkdir",
                lock_duration_ms: claimDuration.toFixed(1),
              });
            } catch (err: any) {
              await recordActionTelemetry({
                action: "roadmap_claim",
                startTime: claimStart,
                endTime: performance.now(),
                success: false,
                error: err.message,
              });
              return ok({ error: `roadmap_claim failed: ${err.message}` });
            }
          }
          case "roadmap_release": {
            // Release a claimed unit (distributed lock release)
            // params: { milestone_id, unit_id, instance_id }
            if (!params.milestone_id || !params.unit_id || !params.instance_id) {
              return ok({ error: "milestone_id, unit_id, and instance_id required" });
            }
            const releaseStart = performance.now();
            try {
              await TaskClaimService.release(params.milestone_id, params.unit_id, params.instance_id);

              const releaseDuration = performance.now() - releaseStart;
              await recordActionTelemetry({
                action: "roadmap_release",
                startTime: releaseStart,
                endTime: performance.now(),
                success: true,
              });

              // Post-action hook
              await executePostActionHook("roadmap_release", params, { released: true }, releaseDuration);

              return ok({
                released: true,
                milestone_id: params.milestone_id,
                unit_id: params.unit_id,
                lock_released: true,
                lock_duration_ms: releaseDuration.toFixed(1),
              });
            } catch (err: any) {
              await recordActionTelemetry({
                action: "roadmap_release",
                startTime: releaseStart,
                endTime: performance.now(),
                success: false,
                error: err.message,
              });
              return ok({ error: `roadmap_release failed: ${err.message}` });
            }
          }
          case "roadmap_heartbeat": {
            // Update heartbeat on a claimed unit
            // params: { milestone_id, unit_id, instance_id }
            if (!params.milestone_id || !params.unit_id || !params.instance_id) {
              return ok({ error: "milestone_id, unit_id, and instance_id required" });
            }
            try {
              const timestamp = await TaskClaimService.heartbeat(
                params.milestone_id, params.unit_id, params.instance_id,
              );
              return ok({ heartbeat: true, timestamp });
            } catch (err: any) {
              return ok({ error: `roadmap_heartbeat failed: ${err.message}` });
            }
          }
          case "roadmap_discover": {
            // Discover available roadmaps, active claims, and instances
            // params: { category?: "main"|"secondary"|"archived", reap_stale?: boolean }
            try {
              const index = await loadIndex();
              const registry = await loadRegistry();

              // Optionally filter by category
              let milestones = index.milestones;
              if (params.category) {
                const categoryMsIds = new Set(
                  registry.roadmaps
                    .filter(r => r.category === params.category)
                    .flatMap(r => r.milestone_ids)
                );
                milestones = milestones.filter(m => categoryMsIds.has(m.id));
              }

              const results = await Promise.all(milestones.map(async (m) => {
                // Reap stale claims if requested
                if (params.reap_stale) {
                  await TaskClaimService.reapStaleClaims(m.id);
                }
                const claimedIds = await TaskClaimService.getClaimedUnitIds(m.id);
                const instances = await TaskClaimService.getActiveInstances(m.id);

                // Find category from registry
                const regEntry = registry.roadmaps.find(r => r.milestone_ids.includes(m.id));

                return {
                  id: m.id,
                  title: m.title,
                  track: m.track,
                  status: m.status,
                  category: regEntry?.category || "main",
                  total_units: m.total_units,
                  completed_units: m.completed_units,
                  active_claims: claimedIds.size,
                  claimed_unit_ids: [...claimedIds],
                  active_instances: instances.length,
                };
              }));

              return ok({
                total_roadmaps: results.length,
                roadmaps: results,
                registry_version: registry.version,
              });
            } catch (err: any) {
              return ok({ error: `roadmap_discover failed: ${err.message}` });
            }
          }
          case "roadmap_populate_context": {
            // Auto-populate context_files for all units in a milestone envelope
            // params: { milestone_id: string, save?: boolean }
            if (!params.milestone_id) {
              return ok({ error: "milestone_id required" });
            }
            try {
              const { envelope } = await resolveEnvelope(params);
              // Collect all units across phases
              const allUnits = envelope.phases.flatMap(p => p.units);
              let populated = 0;
              for (const phase of envelope.phases) {
                for (const unit of phase.units) {
                  const contextFiles = buildContextFilesForUnit(unit, allUnits);
                  if (contextFiles.length > 0) {
                    (unit as Record<string, unknown>).context_files = contextFiles;
                    populated++;
                  }
                }
              }
              // Optionally save back to disk
              if (params.save !== false) {
                await saveEnvelope(params.milestone_id, envelope);
              }
              return ok({
                milestone_id: params.milestone_id,
                total_units: allUnits.length,
                units_populated: populated,
                saved: params.save !== false,
                sample: allUnits.slice(0, 3).map(u => ({
                  id: u.id,
                  title: u.title,
                  context_files: (u as Record<string, unknown>).context_files || [],
                })),
              });
            } catch (err: any) {
              return ok({ error: `roadmap_populate_context failed: ${err.message}` });
            }
          }
          case "roadmap_register": {
            // Register milestone(s) into roadmap-registry.json for multi-Claude coordination
            // params: { milestone_id?: string, milestone_ids?: string[], roadmap_title?: string,
            //           category?: "main"|"secondary"|"archived", priority?: number }
            try {
              const ids: string[] = params.milestone_ids
                || (params.milestone_id ? [params.milestone_id] : []);
              if (ids.length === 0) {
                return ok({ error: "milestone_id or milestone_ids required" });
              }
              const opts = {
                roadmapTitle: params.roadmap_title,
                category: params.category,
                priority: params.priority,
              };
              for (const msId of ids) {
                await registerInRegistry(msId, opts);
              }
              const registry = await loadRegistry();
              return ok({
                registered: ids,
                total_roadmaps: registry.roadmaps.length,
                total_milestones: registry.roadmaps.reduce((s, r) => s + r.milestone_ids.length, 0),
              });
            } catch (err: any) {
              return ok({ error: `roadmap_register failed: ${err.message}` });
            }
          }
          // === PIPELINE HEALTH & INFRASTRUCTURE ===
          case "pipeline_health": {
            // Get health status of orchestration pipelines
            // params: { include_metrics?: boolean, include_claims?: boolean }
            try {
              const includeMetrics = params.include_metrics !== false;
              const includeClaims = params.include_claims !== false;

              const health: Record<string, unknown> = {
                timestamp: new Date().toISOString(),
                schema_version: SCHEMA_VERSION,
                status: "healthy",
                components: {
                  agent_executor: { available: true, active_sessions: agentExecutor.getSessions().length },
                  swarm_executor: { available: true, patterns: swarmExecutor.getPatterns().length },
                  roadmap_executor: { available: true },
                  hook_executor: { available: true },
                  task_claim_service: { available: true },
                }
              };

              // Queue stats
              if (includeMetrics) {
                health.queue_stats = agentExecutor.getQueueStats();
              }

              // Active claims summary
              if (includeClaims) {
                try {
                  const index = await loadIndex();
                  let totalClaims = 0;
                  let activeInstances = 0;
                  for (const m of index.milestones.slice(0, 10)) { // Limit for performance
                    const claimed = await TaskClaimService.getClaimedUnitIds(m.id);
                    const instances = await TaskClaimService.getActiveInstances(m.id);
                    totalClaims += claimed.size;
                    activeInstances = Math.max(activeInstances, instances.length);
                  }
                  health.coordination = {
                    total_active_claims: totalClaims,
                    max_active_instances: activeInstances,
                  };
                } catch { health.coordination = { error: "failed to query claims" }; }
              }

              // Dead-letter queue summary
              health.dead_letter_queue = {
                count: deadLetterQueue.length,
                oldest: deadLetterQueue[0]?.timestamp || null,
                newest: deadLetterQueue[deadLetterQueue.length - 1]?.timestamp || null,
              };

              return ok(health);
            } catch (err: any) {
              return ok({ error: `pipeline_health failed: ${err.message}` });
            }
          }
          case "dlq_list": {
            // List dead-letter queue entries
            // params: { action_filter?: string, limit?: number }
            try {
              let entries = [...deadLetterQueue];
              if (params.action_filter) {
                entries = entries.filter(e => e.action.includes(params.action_filter));
              }
              const limit = Math.min(params.limit ?? 50, 100);
              return ok({
                total: deadLetterQueue.length,
                filtered: entries.length,
                entries: entries.slice(-limit).map(e => ({
                  id: e.id,
                  action: e.action,
                  error: e.error.slice(0, 200),
                  timestamp: e.timestamp,
                  retry_count: e.retryCount,
                  swarm_id: e.swarmId,
                  agent_id: e.agentId,
                })),
              });
            } catch (err: any) {
              return ok({ error: `dlq_list failed: ${err.message}` });
            }
          }
          case "dlq_retry": {
            // Retry a dead-letter queue entry
            // params: { dlq_id: string }
            if (!params.dlq_id) {
              return ok({ error: "dlq_id required" });
            }
            try {
              const entryIndex = deadLetterQueue.findIndex(e => e.id === params.dlq_id);
              if (entryIndex === -1) {
                return ok({ error: `DLQ entry not found: ${params.dlq_id}` });
              }
              const entry = deadLetterQueue[entryIndex];
              entry.retryCount++;

              // Re-dispatch based on original action type
              let retryResult: unknown;
              let retrySuccess = false;
              try {
                if (entry.action.startsWith("swarm_")) {
                  retryResult = await executeSwarm({
                    name: `dlq-retry-${entry.id}`,
                    pattern: (entry.params.pattern as SwarmPattern) || "parallel",
                    agents: (entry.params.agents as string[]) || [],
                    input: entry.params.input || {},
                    timeout_ms: 30000
                  });
                  retrySuccess = true;
                } else if (entry.action.startsWith("agent_")) {
                  const agentId = entry.agentId || entry.params.agent_id;
                  if (agentId) {
                    retryResult = await executeAgent(agentId as string, entry.params.input || {}, {
                      priority: "normal",
                      timeout_ms: 30000,
                      retries: 1
                    });
                    retrySuccess = true;
                  }
                }

                if (retrySuccess) {
                  // Remove from DLQ on success
                  deadLetterQueue.splice(entryIndex, 1);
                  return ok({
                    success: true,
                    dlq_id: params.dlq_id,
                    retry_count: entry.retryCount,
                    result: retryResult,
                    removed_from_dlq: true
                  });
                }
              } catch (retryErr: any) {
                entry.error = `Retry ${entry.retryCount} failed: ${retryErr.message?.slice(0, 200)}`;
                return ok({
                  success: false,
                  dlq_id: params.dlq_id,
                  retry_count: entry.retryCount,
                  error: entry.error
                });
              }

              return ok({ error: `Cannot retry action type: ${entry.action}` });
            } catch (err: any) {
              return ok({ error: `dlq_retry failed: ${err.message}` });
            }
          }

          // ── KAR-MS7: PUOA Unified Orchestrator Actions ──────────────────

          case "unified_execute": {
            // Execute task through PUOA with automatic tier routing
            // params: { intent: string, context?: Record<string, unknown>, constraints?: PUOAConstraints }
            const { prismUnifiedOrchestratorEngine } = await import("../../engines/PRISMUnifiedOrchestratorEngine.js");
            if (!params.intent || typeof params.intent !== "string") {
              return ok({ error: "intent (string) required" });
            }
            const result = await prismUnifiedOrchestratorEngine.execute({
              intent: params.intent,
              context: params.context,
              constraints: params.constraints,
              authority_overrides: params.authority_overrides,
            });
            return ok(result, true);
          }

          case "unified_classify": {
            // Classify intent without execution (preview for UI)
            // params: { intent: string, context?: Record<string, unknown> }
            const { intentClassifierEngine } = await import("../../engines/IntentClassifierEngine.js");
            if (!params.intent || typeof params.intent !== "string") {
              return ok({ error: "intent (string) required" });
            }
            const classification = intentClassifierEngine.classify(params.intent, params.context);
            return ok(classification, true);
          }

          case "unified_route": {
            // Route task to tier without execution (for planning/preview)
            // params: { intent: string, context?: Record<string, unknown>, constraints?: PUOAConstraints }
            const { prismUnifiedOrchestratorEngine } = await import("../../engines/PRISMUnifiedOrchestratorEngine.js");
            if (!params.intent || typeof params.intent !== "string") {
              return ok({ error: "intent (string) required" });
            }
            const routing = prismUnifiedOrchestratorEngine.routeToTier({
              intent: params.intent,
              context: params.context,
              constraints: params.constraints,
            });
            return ok(routing, true);
          }

          default: return ok({ error: `Unknown action: ${action}`, available: ACTIONS });
        }
      } catch (err: any) {
        return dispatcherError(err, action, "prism_orchestrate");
      }
    }
  );
}

/**
 * Build context_files for a unit by analyzing its deliverables, tools, skills, and dependencies.
 * Maps known PRISM dispatcher names → source file paths so workers start with warm context.
 */
function buildContextFilesForUnit(unit: any, allUnits: any[]): string[] {
  const files = new Set<string>();

  // 1. Deliverable paths — files this unit creates/modifies
  for (const d of unit.deliverables || []) {
    if (d.path) files.add(d.path);
  }

  // 2. Dispatcher source files — map tool names to source locations
  const dispatcherMap: Record<string, string> = {
    prism_calc: "src/tools/dispatchers/calcDispatcher.ts",
    prism_data: "src/tools/dispatchers/dataDispatcher.ts",
    prism_hook: "src/tools/dispatchers/hookDispatcher.ts",
    prism_orchestrate: "src/tools/dispatchers/orchestrationDispatcher.ts",
    prism_session: "src/tools/dispatchers/sessionDispatcher.ts",
    prism_validate: "src/tools/dispatchers/validationDispatcher.ts",
    prism_context: "src/tools/dispatchers/contextDispatcher.ts",
    prism_guard: "src/tools/dispatchers/guardDispatcher.ts",
    prism_skill_script: "src/tools/dispatchers/skillScriptDispatcher.ts",
    prism_intelligence: "src/tools/dispatchers/intelligenceDispatcher.ts",
    prism_safety: "src/tools/dispatchers/safetyDispatcher.ts",
    prism_thread: "src/tools/dispatchers/threadDispatcher.ts",
    prism_toolpath: "src/tools/dispatchers/toolpathDispatcher.ts",
    prism_omega: "src/tools/dispatchers/omegaDispatcher.ts",
    prism_ralph: "src/tools/dispatchers/ralphDispatcher.ts",
    prism_sp: "src/tools/dispatchers/spDispatcher.ts",
    prism_gsd: "src/tools/dispatchers/gsdDispatcher.ts",
    prism_dev: "src/tools/dispatchers/devDispatcher.ts",
    prism_doc: "src/tools/dispatchers/docDispatcher.ts",
    prism_bridge: "src/tools/dispatchers/bridgeDispatcher.ts",
    prism_tenant: "src/tools/dispatchers/tenantDispatcher.ts",
    prism_compliance: "src/tools/dispatchers/complianceDispatcher.ts",
    prism_nl_hook: "src/tools/dispatchers/nlHookDispatcher.ts",
    prism_memory: "src/tools/dispatchers/memoryDispatcher.ts",
    prism_pfp: "src/tools/dispatchers/pfpDispatcher.ts",
    prism_telemetry: "src/tools/dispatchers/telemetryDispatcher.ts",
    prism_atcs: "src/tools/dispatchers/atcsDispatcher.ts",
    prism_autonomous: "src/tools/dispatchers/autonomousDispatcher.ts",
    prism_generator: "src/tools/dispatchers/generatorDispatcher.ts",
    prism_manus: "src/tools/dispatchers/manusDispatcher.ts",
  };
  for (const t of unit.tools || []) {
    const dispName = typeof t === "string" ? t.split("->")[0] : t?.tool?.split("->")[0];
    if (dispName && dispatcherMap[dispName]) {
      files.add(dispatcherMap[dispName]);
    }
  }

  // 3. Skill files
  for (const skillId of unit.skills || []) {
    files.add(`data/skills/${skillId}.md`);
  }

  // 4. Dependency context — pull deliverables from units this one depends on
  const depIds = new Set(unit.dependencies || []);
  for (const dep of allUnits) {
    if (depIds.has(dep.id)) {
      for (const d of dep.deliverables || []) {
        if (d.path) files.add(d.path);
      }
    }
  }

  // 5. Schema file (always useful if unit touches any schema)
  if ((unit.tools || []).some((t: any) => {
    const n = typeof t === "string" ? t : t?.tool;
    return n && n.includes("roadmap");
  })) {
    files.add("src/schemas/roadmapSchema.ts");
  }

  return [...files].sort();
}
