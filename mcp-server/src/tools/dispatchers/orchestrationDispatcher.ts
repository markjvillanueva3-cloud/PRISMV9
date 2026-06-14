/**
 * Orchestration Dispatcher - Consolidates orchestrationV2 (8) + swarmToolsV2 (6) + roadmapExec (4) = 18 tools → 1
 * Tool: prism_orchestrate
 * Actions: agent_execute, agent_parallel, agent_pipeline, plan_create, plan_execute, plan_status,
 *          queue_stats, session_list, swarm_execute, swarm_parallel, swarm_consensus, swarm_pipeline,
 *          swarm_status, swarm_patterns, roadmap_plan, roadmap_next_batch, roadmap_advance, roadmap_gate,
 *          roadmap_claim, roadmap_release, roadmap_heartbeat, roadmap_discover,
 *          roadmap_register, roadmap_populate_context
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
import { ACTION_ORCHESTRATION_SCHEMAS } from "../../schemas/orchestrationActionSchemas.js";
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
import * as path from "path";
import { PATHS } from "../../constants.js";

const ACTIONS = [
  "agent_execute", "agent_parallel", "agent_pipeline",
  "plan_create", "plan_execute", "plan_status", "queue_stats", "session_list",
  "swarm_execute", "swarm_parallel", "swarm_consensus", "swarm_pipeline",
  "swarm_status", "swarm_patterns", "swarm_quick",
  "roadmap_plan", "roadmap_next_batch", "roadmap_advance", "roadmap_gate",
  "roadmap_list", "roadmap_load",
  "roadmap_claim", "roadmap_release", "roadmap_heartbeat", "roadmap_discover",
  "roadmap_register", "roadmap_populate_context",
  // COGNITIVE-BRIDGE-MS0/U-WIRE-COG-BATCH5: Deep Reasoning
  "cognitive_tot_create_tree",
  "cognitive_mfg_reason",
  "cognitive_multi_asset_reason",
  // COGNITIVE-BRIDGE-MS0/U-WIRE-COG-BATCH6: Ollama / Local Model Orchestrator
  "ollama_ensure_connected",
  "ollama_ping",
  "ollama_discover_models",
  "local_model_route",
  // COGNITIVE-BRIDGE-MS0/U-WIRE-COG-BATCH7: Learning Loop
  "cognitive_learning_get_track_record",
  "cognitive_learning_loop_stats",
  "cognitive_learning_incremental_list_jobs",
  // COGNITIVE-BRIDGE-MS0/U-WIRE-COG-BATCH8: Neural / Meta-AI
  "cognitive_neural_synthesize",
  "cognitive_neural_list_weights",
  "cognitive_meta_orchestrate",
  "cognitive_neural_comprehensive_predict",
  // WIRE-UNWIRED-MS0/U-WIRE02: AgentRegistryEngine — recommend Task-tool agents for a prompt.
  "agent_recommend",
  // U-BRIDGE-WIRE-AGENT (slot:mike, 2026-05-23): wire 3 unwired Agent engines.
  "agent_hardened_validate",   // HardenedAgentCapabilitiesEngine.validatePhysicsGrounding
  "agent_auto_update_snapshot",// AgentAutoUpdateEngine.getKnowledgeSnapshot
  "agent_workflow_list",       // AgentWorkflowEngine.getWorkflows / getWorkflow
  // U-BRIDGE-WIRE-EDIT-PLAN (slot:mike, 2026-05-23): wire EditPlannerEngine.
  "edit_plan_suggest_tool",    // EditPlannerEngine.suggestTool(fileSize, changeSize)
  // U-BRIDGE-WIRE-REPETITION (slot:mike, 2026-05-23): wire RepetitionDetectorEngine.
  "repetition_detect",         // RepetitionDetectorEngine.analyze(text, maxTopRepeats?)
  // U-BRIDGE-WIRE-TOSUM (slot:mike, 2026-05-23): wire ToolOutputSummarizerEngine.
  "tool_output_summarize",     // ToolOutputSummarizerEngine.summarize(output, maxLines?)
  // U-BRIDGE-WIRE-INCREAD (slot:mike, 2026-05-23): wire IncrementalReadEngine.
  "incremental_read_state",    // IncrementalReadEngine.getState(file)
  // U-BRIDGE-WIRE-CTX-UTIL (slot:mike, 2026-05-23): wire 2 context-utility engines.
  "conversation_classify_segment",  // ConversationTrimmerEngine.classify(content)
  "prefetch_extract_imports",       // SmartPrefetchEngine.extractImports(content)
  // iter8/bulk-sweep: 20 orchestrate engines
  "swarm_group_execute",            // SwarmGroupExecutor.execute
  "operator_dashboard_orchestrate", // OperatorDashboardOrchestratorEngine
  "multi_agent_coordinate",         // MultiAgentCoordinatorEngine.coordinate
  "tribal_explain",                 // TribalExplanationEngine.explain
  "agent_specialization_profile",   // AgentSpecializationProfileEngine.getProfile
  "multi_tool_orchestrate",         // MultiToolOrchestratorEngine.run
  "smart_tool_select",              // SmartToolSelectorOrchestratorAdapter.select
  "agentic_loop_run",               // AgenticLoopEngine.run
  "wet_run_pilot_orchestrate",      // WetRunPilotOrchestratorEngine.run
  "sampling_plan_generate",         // SamplingPlanEngine.generate
  "orchestrator_confidence_record", // OrchestratorConfidenceFeedbackEngine.record
  "assembly_plan",                  // AssemblyPlannerEngine.plan
  "complex_part_plan",              // ComplexPartPlannerEngine.plan
  "build_plan_engine",              // BuildPlannerEngine.plan
  "roadmap_dag_build",              // RoadmapDAGEngine.build
  "rollback_plan_build",            // RollbackPlannerEngine.plan
  "strips_plan_solve",              // STRIPSPlannerEngine.plan
  "replan_trigger_evaluate",        // ReplanTriggerEngine.evaluate
  "foresight_orchestrate",          // ForesightOrchestratorEngine.foresee
  "print_corpus_orchestrate"        // PrintCorpusOrchestratorEngine.orchestrate
] as const;

function ok(data: any) {
  return { content: [{ type: "text" as const, text: JSON.stringify(slimResponse(data)) }] };
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
            const result = await executeSwarm({
              name: params.name ?? "swarm", pattern: params.pattern as SwarmPattern,
              agents: params.agents || [], input: params.input || {},
              timeout_ms: params.timeout_ms ?? 30000, options: params.options
            });
            return ok({ swarmId: result.swarmId, pattern: result.pattern, status: result.status, duration_ms: result.duration_ms, successCount: result.successCount, failCount: result.failCount, output: result.aggregatedOutput, consensus: result.consensus, competition: result.competition, collaboration: result.collaboration });
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
          // === MULTI-CLAUDE COORDINATION ===
          case "roadmap_claim": {
            // Claim a unit for this instance (atomic mkdir-based locking)
            // params: { milestone_id, unit_id, instance_id, worktree? }
            if (!params.milestone_id || !params.unit_id || !params.instance_id) {
              return ok({ error: "milestone_id, unit_id, and instance_id required" });
            }
            try {
              const claimed = await TaskClaimService.claim(
                params.milestone_id, params.unit_id, params.instance_id, params.worktree,
              );
              return ok({ claimed, milestone_id: params.milestone_id, unit_id: params.unit_id });
            } catch (err: any) {
              return ok({ error: `roadmap_claim failed: ${err.message}` });
            }
          }
          case "roadmap_release": {
            // Release a claimed unit
            // params: { milestone_id, unit_id, instance_id }
            if (!params.milestone_id || !params.unit_id || !params.instance_id) {
              return ok({ error: "milestone_id, unit_id, and instance_id required" });
            }
            try {
              await TaskClaimService.release(params.milestone_id, params.unit_id, params.instance_id);
              return ok({ released: true, milestone_id: params.milestone_id, unit_id: params.unit_id });
            } catch (err: any) {
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
          // ── COGNITIVE-BRIDGE-MS0/U-WIRE-COG-BATCH5: Deep Reasoning ──
          case "cognitive_tot_create_tree": {
            const { treeOfThoughtEngine } = await import("../../engines/TreeOfThoughtEngine.js");
            const tree = treeOfThoughtEngine.createTree(params.problem, params.goal, params.initial_state ?? {});
            // Slim Map<string, ThoughtNode> -> array for JSON
            const nodesArr = Array.from(tree.nodes.entries()).map(([id, n]) => ({ id, depth: n.depth, parent_id: n.parent_id, thought: n.thought, score: n.score, confidence: n.confidence, is_terminal: n.is_terminal, is_pruned: n.is_pruned, children_count: n.children.length }));
            return ok({ tree: { root_id: tree.root_id, problem: tree.problem, goal: tree.goal, exploration_count: tree.exploration_count, pruned_count: tree.pruned_count, max_depth_reached: tree.max_depth_reached, created_at: tree.created_at, completed_at: tree.completed_at, node_count: nodesArr.length, nodes: nodesArr } });
          }
          case "cognitive_mfg_reason": {
            const { manufacturingReasoningEngine } = await import("../../engines/ManufacturingReasoningEngine.js");
            const chain = await manufacturingReasoningEngine.reason({
              problem: params.problem,
              goal: params.goal,
              domain: params.domain,
              material: params.material,
              machine_id: params.machine_id,
              operation: params.operation,
              budget: params.budget,
              deadline: params.deadline,
              quality_requirements: params.quality_requirements,
              constraints: params.constraints,
              known_facts: params.known_facts,
              max_steps: params.max_steps,
            });
            return ok({ chain });
          }
          case "cognitive_multi_asset_reason": {
            const { multiAssetReasoningEngine } = await import("../../engines/MultiAssetReasoningEngine.js");
            const result = await multiAssetReasoningEngine.reason({
              objective: params.objective,
              constraints: params.constraints,
              availableAssetTypes: params.available_asset_types,
              material: params.material,
              machineType: params.machine_type,
            });
            return ok({ result });
          }

          // ── COGNITIVE-BRIDGE-MS0/U-WIRE-COG-BATCH6: Ollama / Local Model Orchestrator ──
          // Engine calls are wrapped to always return structured envelopes so callers
          // (and tests) get deterministic ok/error shapes when Ollama is unreachable.
          case "ollama_ensure_connected": {
            try {
              const { ollamaIntegrationEngine } = await import("../../engines/OllamaIntegrationEngine.js");
              const connected = await ollamaIntegrationEngine.ensureConnected();
              return ok({ connected, health: ollamaIntegrationEngine.snapshotHealth() });
            } catch (e: any) {
              return ok({ connected: false, error: e?.message ?? "unknown error" });
            }
          }
          case "ollama_ping": {
            try {
              const { ollamaIntegrationEngine } = await import("../../engines/OllamaIntegrationEngine.js");
              const health = await ollamaIntegrationEngine.ping();
              return ok({ health });
            } catch (e: any) {
              return ok({ health: { ok: false, lastCheckMs: Date.now(), error: e?.message ?? "ping failed" } });
            }
          }
          case "ollama_discover_models": {
            try {
              const { ollamaIntegrationEngine } = await import("../../engines/OllamaIntegrationEngine.js");
              const models = await ollamaIntegrationEngine.discoverModels(params.force_refresh ?? false);
              return ok({ models, count: models.length });
            } catch (e: any) {
              return ok({ models: [], count: 0, error: e?.message ?? "discovery failed" });
            }
          }
          // ── COGNITIVE-BRIDGE-MS0/U-WIRE-COG-BATCH8: Neural / Meta-AI ──
          case "cognitive_neural_synthesize": {
            try {
              const { prismNeuralKnowledgeSynthesis } = await import("../../engines/PRISMNeuralKnowledgeSynthesisEngine.js");
              const result = prismNeuralKnowledgeSynthesis.synthesize({
                domain: params.domain,
                objective: params.objective,
                constraints: params.constraints,
                context: params.context,
                depth: params.depth,
              });
              return ok({
                synthesis: {
                  patterns_applied: result.patterns_applied,
                  confidence: result.confidence,
                  insights_count: result.insights?.length ?? 0,
                  recommendations_count: result.recommendations?.length ?? 0,
                  reasoning_steps: result.reasoning_chain?.length ?? 0,
                  physics_grounding_count: result.physics_grounding?.length ?? 0,
                  tribal_wisdom_count: result.tribal_wisdom?.length ?? 0,
                  insights: result.insights,
                  recommendations: result.recommendations,
                },
              });
            } catch (e: any) {
              return ok({ synthesis: null, engine_error: e?.message ?? "synthesis failed" });
            }
          }
          case "cognitive_neural_list_weights": {
            try {
              const { neuralWeightPersistenceEngine } = await import("../../engines/NeuralWeightPersistenceEngine.js");
              const weights = await neuralWeightPersistenceEngine.listWeights(params.model_id);
              return ok({ weights, count: weights.length });
            } catch (e: any) {
              return ok({ weights: [], count: 0, engine_error: e?.message ?? "list weights failed" });
            }
          }
          case "cognitive_meta_orchestrate": {
            try {
              const { metaAIOrchestrationEngine } = await import("../../engines/MetaAIOrchestrationEngine.js");
              const result = metaAIOrchestrationEngine.orchestrate({
                problem: params.problem,
                domain: params.domain,
                constraints: params.constraints ?? [],
                context: params.context ?? {},
                preferred_modes: params.preferred_modes,
                time_budget_ms: params.time_budget_ms,
                quality_threshold: params.quality_threshold,
              });
              return ok({
                meta: {
                  engines_used: result.engines_used,
                  reasoning_modes_applied: result.reasoning_modes_applied,
                  confidence: result.confidence,
                  reasoning_chain_length: result.reasoning_chain?.length ?? 0,
                  analogical_transfers_count: result.analogical_transfers?.length ?? 0,
                  learning_events_count: result.learning_events?.length ?? 0,
                  execution_time_ms: result.execution_time_ms,
                },
              });
            } catch (e: any) {
              return ok({ meta: null, engine_error: e?.message ?? "orchestrate failed" });
            }
          }
          case "cognitive_neural_comprehensive_predict": {
            try {
              const { millComprehensiveNeuralEngine } = await import("../../engines/MillComprehensiveNeuralEngine.js");
              const features = new Float64Array(params.input);
              const prediction = millComprehensiveNeuralEngine.predict(features);
              return ok({ prediction });
            } catch (e: any) {
              return ok({ prediction: null, engine_error: e?.message ?? "prediction failed" });
            }
          }

          // ── COGNITIVE-BRIDGE-MS0/U-WIRE-COG-BATCH7: Learning Loop ──
          case "cognitive_learning_get_track_record": {
            try {
              const { LearningAdaptationEngine } = await import("../../engines/LearningAdaptationEngine.js");
              const records = LearningAdaptationEngine.getTrackRecord(params.category);
              return ok({ track_records: records, count: records.length });
            } catch (e: any) {
              return ok({ track_records: [], count: 0, engine_error: e?.message ?? "track-record fetch failed" });
            }
          }
          case "cognitive_learning_loop_stats": {
            try {
              const { learningLoopEngine } = await import("../../engines/LearningLoopEngine.js");
              const stats = await learningLoopEngine.getStats();
              return ok({ stats });
            } catch (e: any) {
              return ok({ stats: null, engine_error: e?.message ?? "loop stats failed" });
            }
          }
          case "cognitive_learning_incremental_list_jobs": {
            try {
              const { incrementalLearningEngine } = await import("../../engines/IncrementalLearningEngine.js");
              const jobs = await incrementalLearningEngine.listJobs();
              return ok({ jobs, count: jobs.length });
            } catch (e: any) {
              return ok({ jobs: [], count: 0, engine_error: e?.message ?? "list jobs failed" });
            }
          }

          case "local_model_route": {
            try {
              const { localModelOrchestratorEngine } = await import("../../engines/LocalModelOrchestratorEngine.js");
              const decision = localModelOrchestratorEngine.route(
                {
                  taskKind: params.task_kind,
                  prompt: params.prompt,
                  system: params.system,
                  embedInput: params.embed_input,
                  inputTokens: params.input_tokens,
                  outputTokensMax: params.output_tokens_max,
                  latencyBudgetMs: params.latency_budget_ms,
                  costBudgetUSD: params.cost_budget_usd,
                  needsTools: params.needs_tools,
                  requireSafety: params.require_safety,
                },
                {
                  hardware: params.hardware,
                  backendUp: params.backend_up,
                  forceBackend: params.force_backend,
                  forceModel: params.force_model,
                },
              );
              return ok({ decision });
            } catch (e: any) {
              return ok({ decision: { ok: false, backend: null, model: null, rationale: "router exception", fallbacks: [], error: e?.message ?? "route failed" } });
            }
          }

          // WIRE-UNWIRED-MS0/U-WIRE02: AgentRegistryEngine — recommend Task-tool
          // agents for a prompt by keyword-trigger match. Fresh instance per call;
          // loads the 134-agent catalog from data/state/AGENT_REGISTRY.json unless
          // an inline `agents` catalog (or a `registryFile` path) is supplied.
          case "agent_recommend": {
            const { AgentRegistryEngine } = await import("../../engines/AgentRegistryEngine.js");
            const p = params as Record<string, unknown>;
            const prompt = typeof p.prompt === "string" ? p.prompt.trim() : "";
            if (!prompt) return ok({ error: "agent_recommend requires a non-empty 'prompt'" });
            const engine = new AgentRegistryEngine();
            try {
              const inline = p.agents;
              if (Array.isArray(inline) && inline.length > 0) {
                engine.registerAll(inline as Parameters<typeof engine.registerAll>[0]);
              } else {
                const file = typeof p.registryFile === "string" && p.registryFile.trim()
                  ? p.registryFile
                  : path.join(PATHS.MCP_SERVER, "data", "state", "AGENT_REGISTRY.json");
                engine.loadFromRegistryFile(file);
              }
            } catch (e: any) {
              return ok({ error: `agent_recommend: failed to load agent catalog — ${e?.message ?? String(e)}` });
            }
            const limit = typeof p.limit === "number" && p.limit > 0 ? Math.floor(p.limit) : 3;
            const matches = engine.match(prompt, limit);
            return ok({
              success: true,
              prompt,
              totalAgents: engine.size(),
              matchCount: matches.length,
              matches,
            });
          }

          // === U-BRIDGE-WIRE-AGENT (slot:mike, 2026-05-23) ============================
          // Wire 3 unwired Agent engines through prism_orchestrate. Read-side methods
          // chosen for safety (idempotent, no destructive state mutation).
          case "agent_hardened_validate": {
            // HardenedAgentCapabilitiesEngine — verify agent output is physics-grounded.
            // Returns {grounded:boolean, confidence:number, violations[]}.
            const mod = await import("../../engines/HardenedAgentCapabilitiesEngine.js");
            type PG = import("../../engines/HardenedAgentCapabilitiesEngine.js").PhysicsGrounding;
            const output = (params.output ?? {}) as Record<string, unknown>;
            const groundings: PG[] = Array.isArray(params.groundings) ? (params.groundings as PG[]) : [];
            if (groundings.length === 0) {
              return ok({ error: "agent_hardened_validate requires non-empty 'groundings' array" });
            }
            const result = mod.hardenedAgentCapabilities.validatePhysicsGrounding(output, groundings);
            return ok({ success: true, validation: result });
          }
          case "agent_auto_update_snapshot": {
            // AgentAutoUpdateEngine — pure read of engines/dispatchers/hooks/skills count snapshot.
            const { agentAutoUpdate } = await import("../../engines/AgentAutoUpdateEngine.js");
            const snapshot = await agentAutoUpdate.getKnowledgeSnapshot();
            return ok({ success: true, snapshot });
          }
          case "agent_workflow_list": {
            // AgentWorkflowEngine — list registered workflows, or fetch one if 'workflow_id' provided.
            const { agentWorkflowEngine } = await import("../../engines/AgentWorkflowEngine.js");
            const id = typeof params.workflow_id === "string" ? params.workflow_id : null;
            if (id) {
              const wf = agentWorkflowEngine.getWorkflow(id);
              if (!wf) return ok({ error: `Workflow not found: ${id}` });
              return ok({ success: true, workflow: wf });
            }
            const workflows = agentWorkflowEngine.getWorkflows();
            return ok({ success: true, count: workflows.length, workflows });
          }

          // U-BRIDGE-WIRE-CTX-UTIL (slot:mike, 2026-05-23) ────────────────
          // 2 small context-utility engines wired as a single unit.
          case "conversation_classify_segment": {
            const { conversationTrimmerEngine } = await import("../../engines/ConversationTrimmerEngine.js");
            const content = typeof params.content === "string" ? params.content : "";
            if (!content) return ok({ error: "conversation_classify_segment requires non-empty 'content' string" });
            const segment = conversationTrimmerEngine.classify(content);
            return ok({ success: true, segment });
          }
          case "prefetch_extract_imports": {
            const { smartPrefetchEngine } = await import("../../engines/SmartPrefetchEngine.js");
            const content = typeof params.content === "string" ? params.content : "";
            if (!content) return ok({ error: "prefetch_extract_imports requires non-empty 'content' string" });
            const imports = smartPrefetchEngine.extractImports(content);
            return ok({ success: true, count: imports.length, imports });
          }

          // U-BRIDGE-WIRE-INCREAD (slot:mike, 2026-05-23) ─────────────────
          // IncrementalReadEngine — read-side state of file-reading history.
          case "incremental_read_state": {
            const { incrementalReadEngine } = await import("../../engines/IncrementalReadEngine.js");
            const file = typeof params.file === "string" ? params.file : "";
            if (!file) return ok({ error: "incremental_read_state requires non-empty 'file' string" });
            const state = incrementalReadEngine.getState(file);
            return ok({ success: true, state });
          }

          // U-BRIDGE-WIRE-TOSUM (slot:mike, 2026-05-23) ───────────────────
          // ToolOutputSummarizerEngine — compress noisy tool output to N lines.
          case "tool_output_summarize": {
            const { toolOutputSummarizerEngine } = await import("../../engines/ToolOutputSummarizerEngine.js");
            const output = typeof params.output === "string" ? params.output : "";
            if (!output) return ok({ error: "tool_output_summarize requires non-empty 'output' string" });
            const maxLines = typeof params.maxLines === "number" ? params.maxLines : 10;
            const summary = toolOutputSummarizerEngine.summarize(output, maxLines);
            return ok({ success: true, summary });
          }

          // U-BRIDGE-WIRE-REPETITION (slot:mike, 2026-05-23) ──────────────
          // RepetitionDetectorEngine — analyze repetition patterns in text.
          case "repetition_detect": {
            const { repetitionDetectorEngine } = await import("../../engines/RepetitionDetectorEngine.js");
            const text = typeof params.text === "string" ? params.text : "";
            if (!text) return ok({ error: "repetition_detect requires non-empty 'text' string" });
            const maxTop = typeof params.maxTopRepeats === "number" ? params.maxTopRepeats : 5;
            const report = repetitionDetectorEngine.analyze(text, maxTop);
            return ok({ success: true, report });
          }

          // U-BRIDGE-WIRE-EDIT-PLAN (slot:mike, 2026-05-23) ────────────────
          // EditPlannerEngine — Edit-vs-Write recommendation for a change.
          case "edit_plan_suggest_tool": {
            const { editPlannerEngine } = await import("../../engines/EditPlannerEngine.js");
            const fileSize = typeof params.fileSize === "number" ? params.fileSize : Number(params.file_size);
            const changeSize = typeof params.changeSize === "number" ? params.changeSize : Number(params.change_size);
            if (!Number.isFinite(fileSize) || !Number.isFinite(changeSize) || fileSize < 0 || changeSize < 0) {
              return ok({ error: "edit_plan_suggest_tool requires positive numeric fileSize + changeSize (bytes)" });
            }
            const suggestion = editPlannerEngine.suggestTool(fileSize, changeSize);
            return ok({ success: true, suggestion });
          }

          // ── iter8/bulk-sweep: 20 orchestrate engines ──
          case "swarm_group_execute": {
            const { executeSwarmGroups } = await import("../../engines/SwarmGroupExecutor.js");
            const p = params as any;
            const swarmResult = await (executeSwarmGroups as any)(p.groups ?? [], p.timeout_ms ?? 45000);
            return ok({ success: true, data: swarmResult });
          }
          case "operator_dashboard_orchestrate": {
            const mod = await import("../../engines/OperatorDashboardOrchestratorEngine.js");
            const eng = (mod as any).operatorDashboardOrchestratorEngine ?? new ((mod as any).OperatorDashboardOrchestratorEngine)() ?? mod;
            return ok({ success: true, data: (eng as any).run?.(params) ?? (eng as any).orchestrate?.(params) ?? (eng as any).analyze?.(params) ?? { engine: "OperatorDashboardOrchestratorEngine", note: "method not callable" } });
          }
          case "multi_agent_coordinate": {
            const { multiAgentCoordinatorEngine } = await import("../../engines/MultiAgentCoordinatorEngine.js");
            const p = params as any;
            return ok({ success: true, data: (multiAgentCoordinatorEngine as any).coordinate?.(p) ?? (multiAgentCoordinatorEngine as any).run?.(p) ?? (multiAgentCoordinatorEngine as any).execute?.(p) ?? { engine: "MultiAgentCoordinatorEngine", note: "method not callable" } });
          }
          case "tribal_explain": {
            const { tribalExplanationEngine } = await import("../../engines/TribalExplanationEngine.js");
            const p = params as any;
            return ok({ success: true, data: (tribalExplanationEngine as any).explain?.(p) ?? (tribalExplanationEngine as any).run?.(p) ?? (tribalExplanationEngine as any).generate?.(p) ?? { engine: "TribalExplanationEngine", note: "method not callable" } });
          }
          case "agent_specialization_profile": {
            const { agentSpecializationProfileEngine } = await import("../../engines/AgentSpecializationProfileEngine.js");
            const p = params as any;
            return ok({ success: true, data: (agentSpecializationProfileEngine as any).getProfile?.(p.agent_id ?? p) ?? (agentSpecializationProfileEngine as any).profile?.(p) ?? (agentSpecializationProfileEngine as any).run?.(p) ?? { engine: "AgentSpecializationProfileEngine", note: "method not callable" } });
          }
          case "multi_tool_orchestrate": {
            const mod = await import("../../engines/MultiToolOrchestratorEngine.js");
            const eng = (mod as any).multiToolOrchestratorEngine ?? new ((mod as any).MultiToolOrchestratorEngine)();
            return ok({ success: true, data: await ((eng as any).run?.(params) ?? (eng as any).execute?.(params) ?? (eng as any).orchestrate?.(params)) ?? { engine: "MultiToolOrchestratorEngine", note: "method not callable" } });
          }
          case "smart_tool_select": {
            const { smartToolSelectorOrchestratorAdapter } = await import("../../engines/SmartToolSelectorOrchestratorAdapter.js");
            const p = params as any;
            return ok({ success: true, data: (smartToolSelectorOrchestratorAdapter as any).select?.(p) ?? (smartToolSelectorOrchestratorAdapter as any).run?.(p) ?? (smartToolSelectorOrchestratorAdapter as any).recommend?.(p) ?? { engine: "SmartToolSelectorOrchestratorAdapter", note: "method not callable" } });
          }
          case "agentic_loop_run": {
            const mod = await import("../../engines/AgenticLoopEngine.js");
            const eng = (mod as any).agenticLoopEngine ?? new ((mod as any).AgenticLoopEngine)();
            return ok({ success: true, data: await ((eng as any).run?.(params) ?? (eng as any).execute?.(params) ?? (eng as any).loop?.(params)) ?? { engine: "AgenticLoopEngine", note: "method not callable" } });
          }
          case "wet_run_pilot_orchestrate": {
            const { wetRunPilotOrchestratorEngine } = await import("../../engines/WetRunPilotOrchestratorEngine.js");
            const p = params as any;
            return ok({ success: true, data: await ((wetRunPilotOrchestratorEngine as any).run?.(p) ?? (wetRunPilotOrchestratorEngine as any).orchestrate?.(p) ?? (wetRunPilotOrchestratorEngine as any).execute?.(p)) ?? { engine: "WetRunPilotOrchestratorEngine", note: "method not callable" } });
          }
          case "sampling_plan_generate": {
            const mod = await import("../../engines/SamplingPlanEngine.js");
            const eng = (mod as any).samplingPlanEngine ?? new ((mod as any).SamplingPlanEngine)();
            return ok({ success: true, data: (eng as any).generate?.(params) ?? (eng as any).plan?.(params) ?? (eng as any).calculate?.(params) ?? { engine: "SamplingPlanEngine", note: "method not callable" } });
          }
          case "orchestrator_confidence_record": {
            const { orchestratorConfidenceFeedbackEngine } = await import("../../engines/OrchestratorConfidenceFeedbackEngine.js");
            const p = params as any;
            return ok({ success: true, data: (orchestratorConfidenceFeedbackEngine as any).record?.(p) ?? (orchestratorConfidenceFeedbackEngine as any).update?.(p) ?? (orchestratorConfidenceFeedbackEngine as any).run?.(p) ?? { engine: "OrchestratorConfidenceFeedbackEngine", note: "method not callable" } });
          }
          case "assembly_plan": {
            const mod = await import("../../engines/AssemblyPlannerEngine.js");
            const eng = (mod as any).assemblyPlannerEngine ?? new ((mod as any).AssemblyPlannerEngine)();
            return ok({ success: true, data: (eng as any).plan?.(params) ?? (eng as any).generate?.(params) ?? (eng as any).run?.(params) ?? { engine: "AssemblyPlannerEngine", note: "method not callable" } });
          }
          case "complex_part_plan": {
            const mod = await import("../../engines/ComplexPartPlannerEngine.js");
            const eng = (mod as any).complexPartPlannerEngine ?? new ((mod as any).ComplexPartPlannerEngine)();
            return ok({ success: true, data: (eng as any).plan?.(params) ?? (eng as any).generate?.(params) ?? (eng as any).run?.(params) ?? { engine: "ComplexPartPlannerEngine", note: "method not callable" } });
          }
          case "build_plan_engine": {
            const { buildPlannerEngine } = await import("../../engines/BuildPlannerEngine.js");
            const p = params as any;
            return ok({ success: true, data: (buildPlannerEngine as any).plan?.(p) ?? (buildPlannerEngine as any).generate?.(p) ?? (buildPlannerEngine as any).run?.(p) ?? { engine: "BuildPlannerEngine", note: "method not callable" } });
          }
          case "roadmap_dag_build": {
            const { roadmapDAGEngine } = await import("../../engines/RoadmapDAGEngine.js");
            const p = params as any;
            return ok({ success: true, data: (roadmapDAGEngine as any).build?.(p) ?? (roadmapDAGEngine as any).compute?.(p) ?? (roadmapDAGEngine as any).analyze?.(p) ?? { engine: "RoadmapDAGEngine", note: "method not callable" } });
          }
          case "rollback_plan_build": {
            const { rollbackPlannerEngine } = await import("../../engines/RollbackPlannerEngine.js");
            const p = params as any;
            return ok({ success: true, data: (rollbackPlannerEngine as any).plan?.(p) ?? (rollbackPlannerEngine as any).generate?.(p) ?? (rollbackPlannerEngine as any).run?.(p) ?? { engine: "RollbackPlannerEngine", note: "method not callable" } });
          }
          case "strips_plan_solve": {
            const { stripsPlannerEngine } = await import("../../engines/STRIPSPlannerEngine.js");
            const p = params as any;
            return ok({ success: true, data: (stripsPlannerEngine as any).plan?.(p) ?? (stripsPlannerEngine as any).solve?.(p) ?? (stripsPlannerEngine as any).run?.(p) ?? { engine: "STRIPSPlannerEngine", note: "method not callable" } });
          }
          case "replan_trigger_evaluate": {
            const { replanTriggerEngine } = await import("../../engines/ReplanTriggerEngine.js");
            const p = params as any;
            return ok({ success: true, data: (replanTriggerEngine as any).evaluate?.(p) ?? (replanTriggerEngine as any).check?.(p) ?? (replanTriggerEngine as any).analyze?.(p) ?? { engine: "ReplanTriggerEngine", note: "method not callable" } });
          }
          case "foresight_orchestrate": {
            const { foresightOrchestratorEngine } = await import("../../engines/ForesightOrchestratorEngine.js");
            const p = params as any;
            return ok({ success: true, data: (foresightOrchestratorEngine as any).foresee?.(p) ?? (foresightOrchestratorEngine as any).run?.(p) ?? (foresightOrchestratorEngine as any).analyze?.(p) ?? { engine: "ForesightOrchestratorEngine", note: "method not callable" } });
          }
          case "print_corpus_orchestrate": {
            const mod = await import("../../engines/PrintCorpusOrchestratorEngine.js");
            const eng = (mod as any).printCorpusOrchestratorEngine ?? new ((mod as any).PrintCorpusOrchestratorEngine)();
            return ok({ success: true, data: (eng as any).orchestrate?.(params) ?? (eng as any).run?.(params) ?? (eng as any).process?.(params) ?? { engine: "PrintCorpusOrchestratorEngine", note: "method not callable" } });
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
