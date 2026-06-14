/**
 * multiDispatcher.ts — prism_multi MCP dispatcher
 * =================================================
 *
 * Wires 9 previously-dormant Multi-domain engines as a single coherent
 * MCP tool surface (PSN-SYNERGY batch 4 / slot oscar).
 *
 * Action map (49 actions, 9 engines):
 *
 *   MultiAgentCoordinatorEngine (7 actions):
 *     coordinator_coordinate           → engine.coordinate()
 *     coordinator_get_agents           → engine.getAgents()
 *     coordinator_get_agent_by_type    → engine.getAgentByType()
 *     coordinator_get_agents_with_cap  → engine.getAgentsWithCapability()
 *     coordinator_generate_reasoning   → engine.generateMultiAgentReasoning()
 *     coordinator_get_history          → engine.getHistory()
 *     coordinator_clear_history        → engine.clearHistory()
 *
 *   MultiCamKnowledgeEngine (8 actions):
 *     cam_knowledge_get_archive        → engine.getArchive()
 *     cam_knowledge_list_archives      → engine.listArchives()
 *     cam_knowledge_query              → engine.query()
 *     cam_knowledge_total_files        → engine.getTotalFiles()
 *     cam_knowledge_offline_systems    → engine.getOfflineCapableSystems()
 *     cam_knowledge_extraction_routing → engine.getExtractionRouting()
 *     cam_knowledge_stats              → engine.getStats()
 *     cam_knowledge_self_awareness     → engine.getSelfAwareness()
 *
 *   MultiObjectiveParetoEngine (1 action):
 *     pareto_compute                   → engine.compute()
 *
 *   MultiPathReasoningEngine (4 actions):
 *     path_explore                     → engine.explorePaths()
 *     path_compare_approaches          → engine.compareApproaches()
 *     path_get_available_approaches    → engine.getAvailableApproaches()
 *     path_sensitivity_analysis        → engine.sensitivityAnalysis()
 *
 *   MultiSetupFeasibilityChainEngine (4 actions):
 *     setup_analyze_feasibility        → engine.analyzeFeasibility()
 *     setup_check_datum_chain          → engine.checkDatumChain()
 *     setup_find_optimal_sequence      → engine.findOptimalSequence()
 *     setup_detect_dead_ends           → engine.detectDeadEnds()
 *
 *   MultiSignalAutoRollbackEngine (13 actions):
 *     rollback_set_config              → engine.setConfig()
 *     rollback_get_config              → engine.getConfig()
 *     rollback_set_fallback            → engine.setFallback()
 *     rollback_get_fallback            → engine.getFallback()
 *     rollback_record_feedback         → engine.recordFeedback()
 *     rollback_evaluate                → engine.evaluate()
 *     rollback_execute                 → engine.executeRollback()
 *     rollback_rearm                   → engine.rearm()
 *     rollback_is_latched              → engine.isLatched()
 *     rollback_list_feedback           → engine.listFeedback()
 *     rollback_list_executions         → engine.listExecutions()
 *     rollback_get_stats               → engine.getStats()
 *     rollback_clear_all               → engine.clearAll()
 *
 *   MultiSpindleAutomaticEngine (6 actions):
 *     spindle_assign_stations          → engine.assignStations()
 *     spindle_analyze_cycle_balance    → engine.analyzeCycleBalance()
 *     spindle_decide_tooling           → engine.decideTooling()
 *     spindle_optimize_index           → engine.optimizeIndex()
 *     spindle_analyze_production       → engine.analyzeProduction()
 *     spindle_plan_backworking         → engine.planBackworking()
 *
 *   MultiTurretSyncEngine (5 actions):
 *     turret_plan_simultaneous_cuts    → engine.planSimultaneousCuts()
 *     turret_analyze_collisions        → engine.analyzeCollisions()
 *     turret_generate_sync_codes       → engine.generateSyncCodes()
 *     turret_analyze_balanced_cuts     → engine.analyzeBalancedCuts()
 *     turret_optimize_cycle_time       → engine.optimizeCycleTime()
 *
 *   MultiCamStrategyEngine (1 action):
 *     cam_strategy_execute_action      → engine.executeAction()
 *
 * Note: NO cross-wire to aiReasoningDispatcher (PSN-SYNERGY scope).
 *
 * @module tools/dispatchers/multiDispatcher
 * @milestone PSN-SYNERGY / MULTI-WIRING (batch 4, slot oscar)
 */

import { z } from "zod";
import {
  EmptyInputSchema,
  CoordinatorCoordinateSchema,
  CoordinatorGetAgentByTypeSchema,
  CoordinatorGetAgentsWithCapabilitySchema,
  CoordinatorGenerateReasoningSchema,
  CamKnowledgeGetArchiveSchema,
  CamKnowledgeQuerySchema,
  CamKnowledgeExtractionRoutingSchema,
  ParetoComputeSchema,
  PathExploreSchema,
  PathCompareApproachesSchema,
  PathGetAvailableApproachesSchema,
  PathSensitivityAnalysisSchema,
  SetupAnalyzeFeasibilitySchema,
  SetupCheckDatumChainSchema,
  SetupFindOptimalSequenceSchema,
  SetupDetectDeadEndsSchema,
  RollbackSetConfigSchema,
  RollbackSetFallbackSchema,
  RollbackGetFallbackSchema,
  RollbackRecordFeedbackSchema,
  RollbackEvaluateSchema,
  RollbackExecuteSchema,
  RollbackRearmSchema,
  RollbackIsLatchedSchema,
  RollbackListFeedbackSchema,
  RollbackListExecutionsSchema,
  SpindleAssignStationsSchema,
  SpindleAnalyzeCycleBalanceSchema,
  SpindleDecideToolingSchema,
  SpindleOptimizeIndexSchema,
  SpindleAnalyzeProductionSchema,
  SpindlePlanBackworkingSchema,
  TurretPlanSimultaneousCutsSchema,
  TurretAnalyzeCollisionsSchema,
  TurretGenerateSyncCodesSchema,
  TurretAnalyzeBalancedCutsSchema,
  TurretOptimizeCycleTimeSchema,
  CamStrategyExecuteActionSchema,
} from "../../schemas/multiActionSchemas.js";

// ─── Action enum (alphabetically sorted within logical groups) ────────────────

const COORDINATOR_ACTIONS = [
  "coordinator_clear_history",
  "coordinator_coordinate",
  "coordinator_generate_reasoning",
  "coordinator_get_agent_by_type",
  "coordinator_get_agents",
  "coordinator_get_agents_with_cap",
  "coordinator_get_history",
] as const;

const CAM_KNOWLEDGE_ACTIONS = [
  "cam_knowledge_extraction_routing",
  "cam_knowledge_get_archive",
  "cam_knowledge_list_archives",
  "cam_knowledge_offline_systems",
  "cam_knowledge_query",
  "cam_knowledge_self_awareness",
  "cam_knowledge_stats",
  "cam_knowledge_total_files",
] as const;

const PARETO_ACTIONS = [
  "pareto_compute",
] as const;

const PATH_ACTIONS = [
  "path_compare_approaches",
  "path_explore",
  "path_get_available_approaches",
  "path_sensitivity_analysis",
] as const;

const SETUP_ACTIONS = [
  "setup_analyze_feasibility",
  "setup_check_datum_chain",
  "setup_detect_dead_ends",
  "setup_find_optimal_sequence",
] as const;

const ROLLBACK_ACTIONS = [
  "rollback_clear_all",
  "rollback_evaluate",
  "rollback_execute",
  "rollback_get_config",
  "rollback_get_fallback",
  "rollback_get_stats",
  "rollback_is_latched",
  "rollback_list_executions",
  "rollback_list_feedback",
  "rollback_rearm",
  "rollback_record_feedback",
  "rollback_set_config",
  "rollback_set_fallback",
] as const;

const SPINDLE_ACTIONS = [
  "spindle_analyze_cycle_balance",
  "spindle_analyze_production",
  "spindle_assign_stations",
  "spindle_decide_tooling",
  "spindle_optimize_index",
  "spindle_plan_backworking",
] as const;

const TURRET_ACTIONS = [
  "turret_analyze_balanced_cuts",
  "turret_analyze_collisions",
  "turret_generate_sync_codes",
  "turret_optimize_cycle_time",
  "turret_plan_simultaneous_cuts",
] as const;

const CAM_STRATEGY_ACTIONS = [
  "cam_strategy_execute_action",
] as const;

const ALL_ACTIONS = [
  ...COORDINATOR_ACTIONS,
  ...CAM_KNOWLEDGE_ACTIONS,
  ...PARETO_ACTIONS,
  ...PATH_ACTIONS,
  ...SETUP_ACTIONS,
  ...ROLLBACK_ACTIONS,
  ...SPINDLE_ACTIONS,
  ...TURRET_ACTIONS,
  ...CAM_STRATEGY_ACTIONS,
] as const;

type MultiAction = (typeof ALL_ACTIONS)[number];

// ─── Input schema lookup ──────────────────────────────────────────────────────

const ACTION_SCHEMAS: Record<MultiAction, z.ZodTypeAny> = {
  // Coordinator
  coordinator_clear_history: EmptyInputSchema,
  coordinator_coordinate: CoordinatorCoordinateSchema,
  coordinator_generate_reasoning: CoordinatorGenerateReasoningSchema,
  coordinator_get_agent_by_type: CoordinatorGetAgentByTypeSchema,
  coordinator_get_agents: EmptyInputSchema,
  coordinator_get_agents_with_cap: CoordinatorGetAgentsWithCapabilitySchema,
  coordinator_get_history: EmptyInputSchema,
  // CAM Knowledge
  cam_knowledge_extraction_routing: CamKnowledgeExtractionRoutingSchema,
  cam_knowledge_get_archive: CamKnowledgeGetArchiveSchema,
  cam_knowledge_list_archives: EmptyInputSchema,
  cam_knowledge_offline_systems: EmptyInputSchema,
  cam_knowledge_query: CamKnowledgeQuerySchema,
  cam_knowledge_self_awareness: EmptyInputSchema,
  cam_knowledge_stats: EmptyInputSchema,
  cam_knowledge_total_files: EmptyInputSchema,
  // Pareto
  pareto_compute: ParetoComputeSchema,
  // Path reasoning
  path_compare_approaches: PathCompareApproachesSchema,
  path_explore: PathExploreSchema,
  path_get_available_approaches: PathGetAvailableApproachesSchema,
  path_sensitivity_analysis: PathSensitivityAnalysisSchema,
  // Setup feasibility
  setup_analyze_feasibility: SetupAnalyzeFeasibilitySchema,
  setup_check_datum_chain: SetupCheckDatumChainSchema,
  setup_detect_dead_ends: SetupDetectDeadEndsSchema,
  setup_find_optimal_sequence: SetupFindOptimalSequenceSchema,
  // Rollback
  rollback_clear_all: EmptyInputSchema,
  rollback_evaluate: RollbackEvaluateSchema,
  rollback_execute: RollbackExecuteSchema,
  rollback_get_config: EmptyInputSchema,
  rollback_get_fallback: RollbackGetFallbackSchema,
  rollback_get_stats: EmptyInputSchema,
  rollback_is_latched: RollbackIsLatchedSchema,
  rollback_list_executions: RollbackListExecutionsSchema,
  rollback_list_feedback: RollbackListFeedbackSchema,
  rollback_rearm: RollbackRearmSchema,
  rollback_record_feedback: RollbackRecordFeedbackSchema,
  rollback_set_config: RollbackSetConfigSchema,
  rollback_set_fallback: RollbackSetFallbackSchema,
  // Spindle
  spindle_analyze_cycle_balance: SpindleAnalyzeCycleBalanceSchema,
  spindle_analyze_production: SpindleAnalyzeProductionSchema,
  spindle_assign_stations: SpindleAssignStationsSchema,
  spindle_decide_tooling: SpindleDecideToolingSchema,
  spindle_optimize_index: SpindleOptimizeIndexSchema,
  spindle_plan_backworking: SpindlePlanBackworkingSchema,
  // Turret
  turret_analyze_balanced_cuts: TurretAnalyzeBalancedCutsSchema,
  turret_analyze_collisions: TurretAnalyzeCollisionsSchema,
  turret_generate_sync_codes: TurretGenerateSyncCodesSchema,
  turret_optimize_cycle_time: TurretOptimizeCycleTimeSchema,
  turret_plan_simultaneous_cuts: TurretPlanSimultaneousCutsSchema,
  // CAM Strategy
  cam_strategy_execute_action: CamStrategyExecuteActionSchema,
};

// ─── Registration ─────────────────────────────────────────────────────────────

/**
 * Register the prism_multi MCP tool on the server.
 * @param server — MCP server instance
 */
export function registerMultiDispatcher(server: any): void {
  server.tool(
    "prism_multi",
    [
      "Multi-domain intelligence dispatcher — 49 actions across 9 engines.",
      "Covers: multi-agent coordination (parallel/sequential/consensus/hierarchical patterns,",
      "conflict detection and resolution, agent-type routing across physics/optimization/quality/safety/tribal),",
      "CAM knowledge registry (8 CAM systems, 9000+ files, offline extraction routing),",
      "Pareto-optimal multi-objective machining optimizer (Kienzle+Taylor grid→dominance filtering,",
      "utopia/nadir points, sensitivity analysis),",
      "tree-of-thought multi-path reasoning (beam search, best-first, Monte Carlo pruning),",
      "multi-setup feasibility chain (datum RSS error, topological sort, branch-and-bound sequencing),",
      "multi-signal auto-rollback (5-channel: EVT/GPD tail, thumbs-down rate, error rate, latency p95, S(x)),",
      "multi-spindle automatic lathe coordination (station assignment, cycle balance, tooling decisions),",
      "multi-turret sync (simultaneous cut planning, collision avoidance, sync code generation),",
      "and multi-CAM strategy execution.",
    ].join(" "),
    {
      action: z.enum(ALL_ACTIONS as unknown as [string, ...string[]]).describe(
        "Multi-domain engine action to invoke",
      ),
      params: z.record(z.string(), z.unknown()).optional().describe("Action-specific parameters"),
    },
    async ({
      action,
      params = {},
    }: {
      action: string;
      params?: Record<string, unknown>;
    }) => {
      // Validate params against the per-action schema before touching any engine.
      const schema = ACTION_SCHEMAS[action as MultiAction];
      if (schema) {
        const parsed = schema.safeParse(params);
        if (!parsed.success) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  ok: false,
                  error: "invalid_params",
                  action,
                  details: parsed.error.issues.map((i) => ({
                    path: i.path.join(".") || "(root)",
                    message: i.message,
                  })),
                }),
              },
            ],
          };
        }
      }

      let result: unknown;

      switch (action as MultiAction) {

        // ── MultiAgentCoordinatorEngine ────────────────────────────────────

        case "coordinator_coordinate": {
          const { multiAgentCoordinatorEngine } = await import(
            "../../engines/MultiAgentCoordinatorEngine.js"
          );
          result = await multiAgentCoordinatorEngine.coordinate(params as any);
          break;
        }
        case "coordinator_get_agents": {
          const { multiAgentCoordinatorEngine } = await import(
            "../../engines/MultiAgentCoordinatorEngine.js"
          );
          result = { ok: true, agents: multiAgentCoordinatorEngine.getAgents() };
          break;
        }
        case "coordinator_get_agent_by_type": {
          const { multiAgentCoordinatorEngine } = await import(
            "../../engines/MultiAgentCoordinatorEngine.js"
          );
          result = {
            ok: true,
            agent: multiAgentCoordinatorEngine.getAgentByType((params as any).type),
          };
          break;
        }
        case "coordinator_get_agents_with_cap": {
          const { multiAgentCoordinatorEngine } = await import(
            "../../engines/MultiAgentCoordinatorEngine.js"
          );
          result = {
            ok: true,
            agents: multiAgentCoordinatorEngine.getAgentsWithCapability(
              (params as any).capability,
            ),
          };
          break;
        }
        case "coordinator_generate_reasoning": {
          const { multiAgentCoordinatorEngine } = await import(
            "../../engines/MultiAgentCoordinatorEngine.js"
          );
          result = {
            ok: true,
            reasoning: multiAgentCoordinatorEngine.generateMultiAgentReasoning(
              (params as any).result,
            ),
          };
          break;
        }
        case "coordinator_get_history": {
          const { multiAgentCoordinatorEngine } = await import(
            "../../engines/MultiAgentCoordinatorEngine.js"
          );
          result = { ok: true, history: multiAgentCoordinatorEngine.getHistory() };
          break;
        }
        case "coordinator_clear_history": {
          const { multiAgentCoordinatorEngine } = await import(
            "../../engines/MultiAgentCoordinatorEngine.js"
          );
          multiAgentCoordinatorEngine.clearHistory();
          result = { ok: true, cleared: true };
          break;
        }

        // ── MultiCamKnowledgeEngine ────────────────────────────────────────

        case "cam_knowledge_get_archive": {
          const { multiCamKnowledgeEngine } = await import(
            "../../engines/MultiCamKnowledgeEngine.js"
          );
          result = {
            ok: true,
            archive: multiCamKnowledgeEngine.getArchive((params as any).system),
          };
          break;
        }
        case "cam_knowledge_list_archives": {
          const { multiCamKnowledgeEngine } = await import(
            "../../engines/MultiCamKnowledgeEngine.js"
          );
          result = { ok: true, archives: multiCamKnowledgeEngine.listArchives() };
          break;
        }
        case "cam_knowledge_query": {
          const { multiCamKnowledgeEngine } = await import(
            "../../engines/MultiCamKnowledgeEngine.js"
          );
          result = { ok: true, archives: multiCamKnowledgeEngine.query(params as any) };
          break;
        }
        case "cam_knowledge_total_files": {
          const { multiCamKnowledgeEngine } = await import(
            "../../engines/MultiCamKnowledgeEngine.js"
          );
          result = { ok: true, total_files: multiCamKnowledgeEngine.getTotalFiles() };
          break;
        }
        case "cam_knowledge_offline_systems": {
          const { multiCamKnowledgeEngine } = await import(
            "../../engines/MultiCamKnowledgeEngine.js"
          );
          result = {
            ok: true,
            systems: multiCamKnowledgeEngine.getOfflineCapableSystems(),
          };
          break;
        }
        case "cam_knowledge_extraction_routing": {
          const { multiCamKnowledgeEngine } = await import(
            "../../engines/MultiCamKnowledgeEngine.js"
          );
          result = {
            ok: true,
            routing: multiCamKnowledgeEngine.getExtractionRouting((params as any).system),
          };
          break;
        }
        case "cam_knowledge_stats": {
          const { multiCamKnowledgeEngine } = await import(
            "../../engines/MultiCamKnowledgeEngine.js"
          );
          result = { ok: true, ...multiCamKnowledgeEngine.getStats() };
          break;
        }
        case "cam_knowledge_self_awareness": {
          const { multiCamKnowledgeEngine } = await import(
            "../../engines/MultiCamKnowledgeEngine.js"
          );
          result = { ok: true, ...multiCamKnowledgeEngine.getSelfAwareness() };
          break;
        }

        // ── MultiObjectiveParetoEngine ─────────────────────────────────────

        case "pareto_compute": {
          const { multiObjectiveParetoEngine } = await import(
            "../../engines/MultiObjectiveParetoEngine.js"
          );
          result = multiObjectiveParetoEngine.compute(params as any);
          break;
        }

        // ── MultiPathReasoningEngine ───────────────────────────────────────

        case "path_explore": {
          const { multiPathReasoningEngine } = await import(
            "../../engines/MultiPathReasoningEngine.js"
          );
          result = await multiPathReasoningEngine.explorePaths(params as any);
          break;
        }
        case "path_compare_approaches": {
          const { multiPathReasoningEngine } = await import(
            "../../engines/MultiPathReasoningEngine.js"
          );
          const { approach1, approach2, ...problem } = params as any;
          result = await multiPathReasoningEngine.compareApproaches(problem, approach1, approach2);
          break;
        }
        case "path_get_available_approaches": {
          const { multiPathReasoningEngine } = await import(
            "../../engines/MultiPathReasoningEngine.js"
          );
          result = {
            ok: true,
            approaches: multiPathReasoningEngine.getAvailableApproaches(
              (params as any).domain,
            ),
          };
          break;
        }
        case "path_sensitivity_analysis": {
          const { multiPathReasoningEngine } = await import(
            "../../engines/MultiPathReasoningEngine.js"
          );
          const { dimension, ...problem } = params as any;
          result = await multiPathReasoningEngine.sensitivityAnalysis(problem, dimension);
          break;
        }

        // ── MultiSetupFeasibilityChainEngine ───────────────────────────────

        case "setup_analyze_feasibility": {
          const { multiSetupFeasibilityChainEngine } = await import(
            "../../engines/MultiSetupFeasibilityChainEngine.js"
          );
          result = multiSetupFeasibilityChainEngine.analyzeFeasibility(params as any);
          break;
        }
        case "setup_check_datum_chain": {
          const { multiSetupFeasibilityChainEngine } = await import(
            "../../engines/MultiSetupFeasibilityChainEngine.js"
          );
          result = multiSetupFeasibilityChainEngine.checkDatumChain(params as any);
          break;
        }
        case "setup_find_optimal_sequence": {
          const { multiSetupFeasibilityChainEngine } = await import(
            "../../engines/MultiSetupFeasibilityChainEngine.js"
          );
          result = multiSetupFeasibilityChainEngine.findOptimalSequence(params as any);
          break;
        }
        case "setup_detect_dead_ends": {
          const { multiSetupFeasibilityChainEngine } = await import(
            "../../engines/MultiSetupFeasibilityChainEngine.js"
          );
          result = multiSetupFeasibilityChainEngine.detectDeadEnds(params as any);
          break;
        }

        // ── MultiSignalAutoRollbackEngine ──────────────────────────────────

        case "rollback_set_config": {
          const { multiSignalAutoRollbackEngine } = await import(
            "../../engines/MultiSignalAutoRollbackEngine.js"
          );
          result = { ok: true, config: multiSignalAutoRollbackEngine.setConfig(params as any) };
          break;
        }
        case "rollback_get_config": {
          const { multiSignalAutoRollbackEngine } = await import(
            "../../engines/MultiSignalAutoRollbackEngine.js"
          );
          result = { ok: true, config: multiSignalAutoRollbackEngine.getConfig() };
          break;
        }
        case "rollback_set_fallback": {
          const { multiSignalAutoRollbackEngine } = await import(
            "../../engines/MultiSignalAutoRollbackEngine.js"
          );
          multiSignalAutoRollbackEngine.setFallback(
            (params as any).artifact_id,
            (params as any).fallback_id,
          );
          result = { ok: true, registered: true };
          break;
        }
        case "rollback_get_fallback": {
          const { multiSignalAutoRollbackEngine } = await import(
            "../../engines/MultiSignalAutoRollbackEngine.js"
          );
          result = {
            ok: true,
            fallback: multiSignalAutoRollbackEngine.getFallback((params as any).artifact_id),
          };
          break;
        }
        case "rollback_record_feedback": {
          const { multiSignalAutoRollbackEngine } = await import(
            "../../engines/MultiSignalAutoRollbackEngine.js"
          );
          const { feedback, now } = params as any;
          result = {
            ok: true,
            trigger: multiSignalAutoRollbackEngine.recordFeedback(feedback, now),
          };
          break;
        }
        case "rollback_evaluate": {
          const { multiSignalAutoRollbackEngine } = await import(
            "../../engines/MultiSignalAutoRollbackEngine.js"
          );
          result = {
            ok: true,
            trigger: multiSignalAutoRollbackEngine.evaluate(
              (params as any).artifact_id,
              (params as any).now,
            ),
          };
          break;
        }
        case "rollback_execute": {
          const { multiSignalAutoRollbackEngine } = await import(
            "../../engines/MultiSignalAutoRollbackEngine.js"
          );
          result = multiSignalAutoRollbackEngine.executeRollback(params as any);
          break;
        }
        case "rollback_rearm": {
          const { multiSignalAutoRollbackEngine } = await import(
            "../../engines/MultiSignalAutoRollbackEngine.js"
          );
          multiSignalAutoRollbackEngine.rearm((params as any).artifact_id);
          result = { ok: true, rearmed: true };
          break;
        }
        case "rollback_is_latched": {
          const { multiSignalAutoRollbackEngine } = await import(
            "../../engines/MultiSignalAutoRollbackEngine.js"
          );
          result = {
            ok: true,
            latched: multiSignalAutoRollbackEngine.isLatched((params as any).artifact_id),
          };
          break;
        }
        case "rollback_list_feedback": {
          const { multiSignalAutoRollbackEngine } = await import(
            "../../engines/MultiSignalAutoRollbackEngine.js"
          );
          result = {
            ok: true,
            feedback: multiSignalAutoRollbackEngine.listFeedback((params as any).artifact_id),
          };
          break;
        }
        case "rollback_list_executions": {
          const { multiSignalAutoRollbackEngine } = await import(
            "../../engines/MultiSignalAutoRollbackEngine.js"
          );
          result = {
            ok: true,
            executions: multiSignalAutoRollbackEngine.listExecutions(
              (params as any).artifact_id,
            ),
          };
          break;
        }
        case "rollback_get_stats": {
          const { multiSignalAutoRollbackEngine } = await import(
            "../../engines/MultiSignalAutoRollbackEngine.js"
          );
          result = { ok: true, ...multiSignalAutoRollbackEngine.getStats() };
          break;
        }
        case "rollback_clear_all": {
          const { multiSignalAutoRollbackEngine } = await import(
            "../../engines/MultiSignalAutoRollbackEngine.js"
          );
          multiSignalAutoRollbackEngine.clearAll();
          result = { ok: true, cleared: true };
          break;
        }

        // ── MultiSpindleAutomaticEngine ────────────────────────────────────

        case "spindle_assign_stations": {
          const { multiSpindleAutomaticEngine } = await import(
            "../../engines/MultiSpindleAutomaticEngine.js"
          );
          result = multiSpindleAutomaticEngine.assignStations(
            (params as any).part,
            (params as any).machine,
          );
          break;
        }
        case "spindle_analyze_cycle_balance": {
          const { multiSpindleAutomaticEngine } = await import(
            "../../engines/MultiSpindleAutomaticEngine.js"
          );
          result = multiSpindleAutomaticEngine.analyzeCycleBalance(
            (params as any).assignment,
            (params as any).part,
          );
          break;
        }
        case "spindle_decide_tooling": {
          const { multiSpindleAutomaticEngine } = await import(
            "../../engines/MultiSpindleAutomaticEngine.js"
          );
          result = multiSpindleAutomaticEngine.decideTooling(
            (params as any).assignment,
            (params as any).part,
            (params as any).machine,
          );
          break;
        }
        case "spindle_optimize_index": {
          const { multiSpindleAutomaticEngine } = await import(
            "../../engines/MultiSpindleAutomaticEngine.js"
          );
          result = multiSpindleAutomaticEngine.optimizeIndex(
            (params as any).machine,
            (params as any).assignment,
          );
          break;
        }
        case "spindle_analyze_production": {
          const { multiSpindleAutomaticEngine } = await import(
            "../../engines/MultiSpindleAutomaticEngine.js"
          );
          result = multiSpindleAutomaticEngine.analyzeProduction(
            (params as any).assignment,
            (params as any).part,
            (params as any).machine,
            (params as any).laborRate_perHour,
            (params as any).machineRate_perHour,
          );
          break;
        }
        case "spindle_plan_backworking": {
          const { multiSpindleAutomaticEngine } = await import(
            "../../engines/MultiSpindleAutomaticEngine.js"
          );
          result = multiSpindleAutomaticEngine.planBackworking(
            (params as any).part,
            (params as any).machine,
          );
          break;
        }

        // ── MultiTurretSyncEngine ──────────────────────────────────────────

        case "turret_plan_simultaneous_cuts": {
          const { multiTurretSyncEngine } = await import(
            "../../engines/MultiTurretSyncEngine.js"
          );
          result = multiTurretSyncEngine.planSimultaneousCuts(
            (params as any).part,
            (params as any).machine,
          );
          break;
        }
        case "turret_analyze_collisions": {
          const { multiTurretSyncEngine } = await import(
            "../../engines/MultiTurretSyncEngine.js"
          );
          result = multiTurretSyncEngine.analyzeCollisions(
            (params as any).part,
            (params as any).machine,
          );
          break;
        }
        case "turret_generate_sync_codes": {
          const { multiTurretSyncEngine } = await import(
            "../../engines/MultiTurretSyncEngine.js"
          );
          result = multiTurretSyncEngine.generateSyncCodes(
            (params as any).cutPlan,
            (params as any).machine,
          );
          break;
        }
        case "turret_analyze_balanced_cuts": {
          const { multiTurretSyncEngine } = await import(
            "../../engines/MultiTurretSyncEngine.js"
          );
          result = multiTurretSyncEngine.analyzeBalancedCuts(
            (params as any).part,
            (params as any).machine,
          );
          break;
        }
        case "turret_optimize_cycle_time": {
          const { multiTurretSyncEngine } = await import(
            "../../engines/MultiTurretSyncEngine.js"
          );
          result = multiTurretSyncEngine.optimizeCycleTime(
            (params as any).part,
            (params as any).machine,
          );
          break;
        }

        // ── MultiCamStrategyEngine ─────────────────────────────────────────

        case "cam_strategy_execute_action": {
          // MultiCamStrategyEngine exposes typed methods (recommend / listStrategies /
          // getFlagship / compareAcrossSystems / getPortabilityIntents / stats), NOT a
          // generic executeAction router. Fail loud (R12) instead of calling a method
          // that does not exist (it threw at runtime); callers should use a specific
          // cam_strategy_* action.
          result = {
            ok: false,
            error:
              "cam_strategy_execute_action is unsupported; call a specific cam_strategy_* action (recommend / list_strategies / flagship / compare / portability / stats)",
          };
          break;
        }

        default: {
          // TypeScript exhaustiveness: unreachable at runtime because the
          // z.enum guard above already rejects unknown actions.
          result = { ok: false, error: "unknown_action", action };
        }
      }

      return {
        content: [{ type: "text", text: JSON.stringify(result) }],
      };
    },
  );
}
