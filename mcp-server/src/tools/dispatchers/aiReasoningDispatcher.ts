/**
 * prism_ai — AI Reasoning Dispatcher
 * ====================================
 * Routes AI reasoning requests through MillMasterOrchestratorFacadeEngine.
 *
 * Actions (6):
 *   ai_route_mill_pipeline     — Full P2P pipeline orchestration
 *   ai_mill_agi_reason         — Multi-mode AGI reasoning
 *   ai_mill_awareness_query    — Query mill engine capabilities
 *   ai_mill_scientific_analyze — Physics-backed calculations
 *   ai_mill_wisdom_query       — Tribal knowledge queries
 *   ai_mill_adaptive_strategy  — Adaptive toolpath strategies
 *
 * @module tools/dispatchers/aiReasoningDispatcher
 * @milestone MILL-MASTER/P1-U05-PRISM-AI-ROUTE
 */

import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
import {
  AI_REASONING_ACTIONS,
  ACTION_AI_REASONING_SCHEMAS,
  type AIReasoningAction,
} from "../../schemas/aiReasoningActionSchemas.js";

// Lazy-loaded engine singletons
let _millFacade: typeof import("../../engines/MillMasterOrchestratorFacadeEngine.js").millMasterOrchestratorFacadeEngine | null = null;
let _millAwareness: typeof import("../../engines/MillAISelfAwarenessIntegrationEngine.js").millAISelfAwarenessIntegrationEngine | null = null;

async function getMillFacade() {
  if (!_millFacade) {
    const mod = await import("../../engines/MillMasterOrchestratorFacadeEngine.js");
    _millFacade = mod.millMasterOrchestratorFacadeEngine;
  }
  return _millFacade;
}

async function getMillAwareness() {
  if (!_millAwareness) {
    const mod = await import("../../engines/MillAISelfAwarenessIntegrationEngine.js");
    _millAwareness = mod.millAISelfAwarenessIntegrationEngine;
  }
  return _millAwareness;
}

/** Dispatcher definition for MCP registration */
export const aiReasoningDispatcherDef = {
  name: "prism_ai",
  description: "AI reasoning dispatcher — routes AGI, scientific, wisdom, and adaptive strategy requests through MillMasterOrchestratorFacadeEngine.",
  inputSchema: z.object({
    action: z.enum(AI_REASONING_ACTIONS).describe("AI reasoning action to execute"),
    params: z.record(z.string(), z.unknown()).optional().describe("Action-specific parameters"),
  }),
};

/** Execute AI reasoning action */
export async function executeAIReasoningAction(
  action: AIReasoningAction,
  params: Record<string, unknown>
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const startTime = Date.now();
  log.info(`[prism_ai] Executing action: ${action}`);

  // Validate params against schema (U-WIRE03: pass the schema MAP, not the per-action schema —
  // validateActionParams indexes the map by action; passing a single Zod object made it always pass).
  const validation = validateActionParams(action, params, ACTION_AI_REASONING_SCHEMAS);
  if (!validation.valid) {
    return dispatcherError(validation.error ?? "Validation failed", action, "prism_ai");
  }

  try {
    let result: unknown;

    switch (action) {
      // ─────────────────────────────────────────────────────────────────────
      // ai_route_mill_pipeline — Full P2P pipeline
      // ─────────────────────────────────────────────────────────────────────
      case "ai_route_mill_pipeline": {
        const facade = await getMillFacade();
        const response = await facade.orchestrate({
          request_type: "print_to_program",
          material: params.material as string | undefined,
          iso_group: params.iso_group as "P" | "M" | "K" | "N" | "S" | "H" | undefined,
          tool: params.tool as Record<string, unknown> | undefined,
          params: params.params as Record<string, unknown> | undefined,
          machine: params.machine as Record<string, unknown> | undefined,
          features: params.features as Record<string, unknown>[] | undefined,
          geometry: params.geometry,
          include_provenance: params.include_provenance as boolean | undefined,
        });
        result = response;
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // ai_mill_agi_reason — AGI reasoning
      // ─────────────────────────────────────────────────────────────────────
      case "ai_mill_agi_reason": {
        const facade = await getMillFacade();
        const response = await facade.orchestrate({
          request_type: "agi",
          intent: params.intent as string,
          reasoning_mode: params.reasoning_mode as string | undefined,
          material: params.material as string | undefined,
          iso_group: params.iso_group as "P" | "M" | "K" | "N" | "S" | "H" | undefined,
          tool: params.tool as Record<string, unknown> | undefined,
          params: params.params as Record<string, unknown> | undefined,
          include_provenance: params.include_provenance as boolean | undefined,
        });
        result = response;
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // ai_mill_awareness_query — Query capabilities
      // ─────────────────────────────────────────────────────────────────────
      case "ai_mill_awareness_query": {
        const awareness = await getMillAwareness();
        const query = params.query as string;
        const category = params.category as string | undefined;
        const topK = (params.top_k as number | undefined) ?? 10;

        // Find matching engines
        const matches = awareness.findEngines(query);

        // Filter by category if specified
        const filtered = category && category !== "all"
          ? matches.filter(m => m.category === category)
          : matches;

        // Limit results
        const limited = filtered.slice(0, topK);

        result = {
          query,
          category: category ?? "all",
          matches: limited,
          total_found: filtered.length,
          registry_stats: awareness.getStats(),
        };
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // ai_mill_scientific_analyze — Physics analysis
      // ─────────────────────────────────────────────────────────────────────
      case "ai_mill_scientific_analyze": {
        const facade = await getMillFacade();
        const response = await facade.orchestrate({
          request_type: "scientific",
          material: params.material as string | undefined,
          iso_group: params.iso_group as "P" | "M" | "K" | "N" | "S" | "H" | undefined,
          tool: params.tool as Record<string, unknown> | undefined,
          params: params.params as Record<string, unknown> | undefined,
          machine: params.machine as Record<string, unknown> | undefined,
          include_provenance: params.include_provenance as boolean | undefined,
        });
        result = {
          analysis_type: params.analysis_type ?? "all",
          ...response,
        };
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // ai_mill_wisdom_query — Tribal knowledge
      // ─────────────────────────────────────────────────────────────────────
      case "ai_mill_wisdom_query": {
        const facade = await getMillFacade();
        const response = await facade.orchestrate({
          request_type: "wisdom",
          query: params.query as string,
          domain: params.domain as string | undefined,
          include_provenance: params.include_provenance as boolean | undefined,
        });
        result = {
          query: params.query,
          domain: params.domain ?? "general",
          material: params.material,
          operation: params.operation,
          ...response,
        };
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // ai_mill_adaptive_strategy — Adaptive toolpath
      // ─────────────────────────────────────────────────────────────────────
      case "ai_mill_adaptive_strategy": {
        const facade = await getMillFacade();
        const response = await facade.orchestrate({
          request_type: "adaptive",
          material: params.material as string | undefined,
          iso_group: params.iso_group as "P" | "M" | "K" | "N" | "S" | "H" | undefined,
          tool: params.tool as Record<string, unknown> | undefined,
          machine: params.machine as Record<string, unknown> | undefined,
          include_provenance: params.include_provenance as boolean | undefined,
        });
        result = {
          operation: params.operation,
          feature_type: params.feature_type,
          stock_to_leave: params.stock_to_leave,
          ...response,
        };
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // pattern_record — Record a success pattern
      // ─────────────────────────────────────────────────────────────────────
      case "pattern_record": {
        const { successPatternBankEngine } = await import("../../engines/SuccessPatternBankEngine.js");
        result = successPatternBankEngine.record({
          task_category: params.task_category as string,
          task_description: params.task_description as string,
          task_keywords: params.task_keywords as string[],
          approach_summary: params.approach_summary as string,
          mcp_actions_used: params.mcp_actions_used as string[] | undefined,
          tools_used: params.tools_used as string[] | undefined,
          engines_invoked: params.engines_invoked as string[] | undefined,
          confidence: params.confidence as "high" | "medium" | "low" | undefined,
          domain: params.domain as string | undefined,
          constraints: params.constraints as string[] | undefined,
          lineage_id: params.lineage_id as string | undefined,
          pattern_id: params.pattern_id as string | undefined,
        });
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // pattern_query — Query patterns
      // ─────────────────────────────────────────────────────────────────────
      case "pattern_query": {
        const { successPatternBankEngine } = await import("../../engines/SuccessPatternBankEngine.js");
        result = successPatternBankEngine.query({
          task_category: params.task_category as string | undefined,
          keywords: params.keywords as string[] | undefined,
          domain: params.domain as string | undefined,
          min_confidence: params.min_confidence as "high" | "medium" | "low" | undefined,
          min_success_count: params.min_success_count as number | undefined,
          limit: params.limit as number | undefined,
        });
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // pattern_reinforce — Reinforce a pattern (success/failure)
      // ─────────────────────────────────────────────────────────────────────
      case "pattern_reinforce": {
        const { successPatternBankEngine } = await import("../../engines/SuccessPatternBankEngine.js");
        result = successPatternBankEngine.reinforce({
          pattern_id: params.pattern_id as string,
          success: params.success as boolean,
          note: params.note as string | undefined,
        });
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // pattern_stats — Get pattern bank statistics
      // ─────────────────────────────────────────────────────────────────────
      case "pattern_stats": {
        const { successPatternBankEngine } = await import("../../engines/SuccessPatternBankEngine.js");
        result = successPatternBankEngine.stats();
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // sfc_drift_canary_check — SFC drift detection
      // ─────────────────────────────────────────────────────────────────────
      case "sfc_drift_canary_check": {
        const { sfcDriftCanaryEngine } = await import("../../engines/SFCDriftCanaryEngine.js");
        result = sfcDriftCanaryEngine.checkDrift(params as any);
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // ppg_drift_canary_check — PPG drift detection
      // ─────────────────────────────────────────────────────────────────────
      case "ppg_drift_canary_check": {
        const { ppgDriftCanaryEngine } = await import("../../engines/PPGDriftCanaryEngine.js");
        result = ppgDriftCanaryEngine.checkDrift(params as any);
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // sfc_fewshot_predict — Few-shot material prediction
      // ─────────────────────────────────────────────────────────────────────
      case "sfc_fewshot_predict": {
        const { sfcFewShotNewMaterialEngine } = await import("../../engines/SFCFewShotNewMaterialEngine.js");
        result = await sfcFewShotNewMaterialEngine.predictForNewMaterial(params as any);
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // ppg_sfc_closed_loop — E2E closed-loop orchestration
      // ─────────────────────────────────────────────────────────────────────
      case "ppg_sfc_closed_loop": {
        const { ppgSFCClosedLoopOrchestratorEngine } = await import("../../engines/PPGSFCClosedLoopOrchestratorEngine.js");
        result = await ppgSFCClosedLoopOrchestratorEngine.executeClosedLoop(params as any);
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // iterate_retrieve — progressive context refinement (DISPATCH→EVALUATE→REFINE→LOOP)
      // ──────────────────────────────────────────────────────────────────────
      case "iterate_retrieve": {
        const { iterativeRetrievalEngine } = await import("../../engines/IterativeRetrievalEngine.js");
        result = iterativeRetrievalEngine.retrieve({
          query: params.query as string,
          dispatch_target: params.dispatch_target as any,
          max_cycles: params.max_cycles as number | undefined,
          target_count: params.target_count as number | undefined,
          min_relevance: params.min_relevance as number | undefined,
          initial_keywords: params.initial_keywords as string[] | undefined,
          exclude_patterns: params.exclude_patterns as string[] | undefined,
          max_files_per_cycle: params.max_files_per_cycle as number | undefined,
        });
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // ENGINE-WIRE-MS0/U-WIRE03: 5 leaf AI/deep-reasoning engines
      // ─────────────────────────────────────────────────────────────────────
      case "ai_explain_decision": {
        const { aiDecisionExplanationEngine } = await import("../../engines/AIDecisionExplanationEngine.js");
        result = aiDecisionExplanationEngine.explainDecision(
          params as unknown as Parameters<typeof aiDecisionExplanationEngine.explainDecision>[0],
        );
        break;
      }
      case "ai_extract_classify": {
        const { aiExtractionReasoner } = await import("../../engines/AIExtractionReasonerEngine.js");
        result = await aiExtractionReasoner.classifyContent(params.content);
        break;
      }
      case "ai_physics_optimize": {
        const { aiPhysicsOptimizationEngine } = await import("../../engines/AIPhysicsOptimizationEngine.js");
        result = await aiPhysicsOptimizationEngine.optimize(
          params as unknown as Parameters<typeof aiPhysicsOptimizationEngine.optimize>[0],
        );
        break;
      }
      case "ai_knowledge_query": {
        const { aiDeepKnowledgeIntegration } = await import("../../engines/AIDeepKnowledgeIntegrationEngine.js");
        result = await aiDeepKnowledgeIntegration.query(
          params as unknown as Parameters<typeof aiDeepKnowledgeIntegration.query>[0],
        );
        break;
      }
      case "ai_material_lookup": {
        const { aiResourceLearningEngine } = await import("../../engines/AIResourceLearningEngine.js");
        result = aiResourceLearningEngine.getMaterialParameters(params.material as string);
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // ENGINE-WIRE-MS0/U-WIRE04: 5 deep-learning/deep-reasoning engines
      // ─────────────────────────────────────────────────────────────────────
      case "ai_milling_deep_reason": {
        const { millingDeepReasoningEngine } = await import("../../engines/MillingDeepReasoningEngine.js");
        const p = params as { query: string; context: Record<string, unknown>; mode?: "analytical"|"comparative"|"diagnostic"|"predictive"|"creative" };
        result = millingDeepReasoningEngine.reason(
          p.query,
          p.context as unknown as Parameters<typeof millingDeepReasoningEngine.reason>[1],
          p.mode,
        );
        break;
      }
      case "ai_wedm_deep_logic": {
        const { wireEDMDeepLogicEngine } = await import("../../engines/WireEDMDeepLogicEngine.js");
        const p = params as { query: string; context?: Record<string, unknown> };
        result = wireEDMDeepLogicEngine.reason(p.query, p.context);
        break;
      }
      case "ai_wedm_deep_neural": {
        const { wireEDMDeepNeuralReasoningEngine } = await import("../../engines/WireEDMDeepNeuralReasoningEngine.js");
        result = await wireEDMDeepNeuralReasoningEngine.reason(
          params as unknown as Parameters<typeof wireEDMDeepNeuralReasoningEngine.reason>[0],
        );
        break;
      }
      case "ai_milling_synthesize": {
        const { millingDeepKnowledgeSynthesisEngine } = await import("../../engines/MillingDeepKnowledgeSynthesisEngine.js");
        result = await millingDeepKnowledgeSynthesisEngine.synthesize(
          params as unknown as Parameters<typeof millingDeepKnowledgeSynthesisEngine.synthesize>[0],
        );
        break;
      }
      case "ai_lathe_reason": {
        const { latheAIReasoningEngine } = await import("../../engines/LatheAIReasoningEngine.js");
        result = await latheAIReasoningEngine.reason(
          params as unknown as Parameters<typeof latheAIReasoningEngine.reason>[0],
        );
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // ENGINE-WIRE-MS0/U-WIRE05: 5 heavy AI orchestrator engines
      // ─────────────────────────────────────────────────────────────────────
      case "ai_milling_agi": {
        const { millingAGIOrchestrationEngine } = await import("../../engines/MillingAGIOrchestrationEngine.js");
        result = millingAGIOrchestrationEngine.analyzeWithAGI(
          params as unknown as Parameters<typeof millingAGIOrchestrationEngine.analyzeWithAGI>[0],
        );
        break;
      }
      case "ai_milling_twin_simulate": {
        const { millingDigitalTwinEngine } = await import("../../engines/MillingDigitalTwinEngine.js");
        const p = params as { duration_s: number; parameter_changes?: Record<string, unknown> };
        result = millingDigitalTwinEngine.simulate(
          p.duration_s,
          p.parameter_changes as unknown as Parameters<typeof millingDigitalTwinEngine.simulate>[1],
        );
        break;
      }
      case "ai_wedm_master": {
        const { wireEDMMasterAIEngine } = await import("../../engines/WireEDMMasterAIEngine.js");
        result = await wireEDMMasterAIEngine.analyze(
          params as unknown as Parameters<typeof wireEDMMasterAIEngine.analyze>[0],
        );
        break;
      }
      case "ai_wedm_neural_orchestrate": {
        const { wireEDMNeuralOrchestrationEngine } = await import("../../engines/WireEDMNeuralOrchestrationEngine.js");
        result = wireEDMNeuralOrchestrationEngine.orchestrate(
          params as unknown as Parameters<typeof wireEDMNeuralOrchestrationEngine.orchestrate>[0],
        );
        break;
      }
      case "ai_lathe_train": {
        const { latheAITrainingEngine } = await import("../../engines/LatheAITrainingEngine.js");
        const p = params as { programs: Array<{ content: string; filepath: string }> };
        result = latheAITrainingEngine.trainFromPrograms(p.programs);
        break;
      }

      // ENGINE-WIRE-MS0/U-WIRE08: 5 Wire EDM AI specialist engines
      case "ai_wedm_advanced_neural": {
        const { wireEDMAdvancedNeuralEngine } = await import("../../engines/WireEDMAdvancedNeuralEngine.js");
        const p = params as {
          material: string;
          thickness_mm: number;
          target_ra_um: number;
          target_accuracy_mm?: number;
          wire_diameter_mm?: number;
          taper_angle_deg?: number;
          machine?: string;
        };
        // Normalize flat params into WEDMFeatureVector
        const KNOWN_MATERIALS = ["D2","M2","A2","S7","H13","carbide","Ti6Al4V","Inconel_718","AL6061"];
        const matIdx = KNOWN_MATERIALS.findIndex(m => p.material.toLowerCase().includes(m.toLowerCase()));
        const matEmbedding = KNOWN_MATERIALS.map((_, i) => i === matIdx ? 1 : 0);
        const KNOWN_MACHINES = ["mitsubishi","makino","sodick","fanuc","agie","charmilles"];
        const machLower = (p.machine ?? "").toLowerCase();
        const machIdx = KNOWN_MACHINES.findIndex(m => machLower.includes(m));
        const machEmbedding = KNOWN_MACHINES.map((_, i) => i === machIdx ? 1 : 0);
        const featureVector = {
          material_embedding: matEmbedding,
          thickness_normalized: Math.min(p.thickness_mm / 150, 1),
          taper_angle_normalized: Math.min((p.taper_angle_deg ?? 0) / 30, 1),
          corner_count_normalized: 0.5,
          path_length_normalized: 0.5,
          machine_embedding: machEmbedding,
          wire_diameter_normalized: Math.min((p.wire_diameter_mm ?? 0.25) / 0.35, 1),
          target_ra_normalized: Math.min(p.target_ra_um / 10, 1),
          target_accuracy_normalized: Math.min((p.target_accuracy_mm ?? 0.005) / 0.1, 1),
        };
        result = wireEDMAdvancedNeuralEngine.predictParameters(featureVector);
        break;
      }
      case "ai_wedm_agi_orchestrate": {
        const { wireEDMAGIOrchestrator } = await import("../../engines/WireEDMAGIOrchestrator.js");
        const p = params as {
          query: string;
          material: string;
          thickness_mm: number;
          wire_diameter_mm: number;
          target_ra_um?: number;
          target_accuracy_mm?: number;
          machine?: string;
          mode?: string;
          include_counterfactuals?: boolean;
          include_causal_analysis?: boolean;
        };
        // Normalize flat params into AGIRequest shape
        const agiRequest = {
          query: p.query,
          context: {
            material: p.material,
            thickness_mm: p.thickness_mm,
            wire_diameter_mm: p.wire_diameter_mm,
            machine: p.machine,
            target_ra_um: p.target_ra_um,
            target_accuracy_mm: p.target_accuracy_mm,
          },
          mode: p.mode as Parameters<typeof wireEDMAGIOrchestrator.process>[0]["mode"],
          include_counterfactuals: p.include_counterfactuals,
          include_causal_analysis: p.include_causal_analysis,
        };
        result = wireEDMAGIOrchestrator.process(agiRequest);
        break;
      }
      case "ai_wedm_print_to_program": {
        const { wireEDMAIPrintToProgramEngine } = await import("../../engines/WireEDMAIPrintToProgramEngine.js");
        const p = params as unknown as Parameters<typeof wireEDMAIPrintToProgramEngine.generate>[0];
        result = await wireEDMAIPrintToProgramEngine.generate(p);
        break;
      }
      case "ai_wedm_cam_knowledge": {
        const { wireEDMCAMKnowledgeEngine } = await import("../../engines/WireEDMCAMKnowledgeEngine.js");
        const p = params as { query: string; category?: "toolpath" | "parameter" | "workflow" | "optimization" | "safety" };
        result = wireEDMCAMKnowledgeEngine.searchKnowledge(p.query, p.category);
        break;
      }
      case "ai_wedm_synthesize_knowledge": {
        const { wireEDMKnowledgeSynthesisEngine } = await import("../../engines/WireEDMKnowledgeSynthesisEngine.js");
        const { question, material, thickness_mm, wire_diameter, target_ra_um, machine, urgency, confidence_threshold, max_hypotheses, ...rest } = params as {
          question: string;
          material?: string;
          thickness_mm?: number;
          wire_diameter?: string;
          target_ra_um?: number;
          machine?: string;
          urgency?: "low" | "normal" | "high" | "critical";
          confidence_threshold?: number;
          max_hypotheses?: number;
          [key: string]: unknown;
        };
        result = await wireEDMKnowledgeSynthesisEngine.synthesize({
          question,
          context: { material, thickness_mm, wire_diameter, target_ra_um, machine, urgency, ...rest },
          confidence_threshold,
          max_hypotheses,
        });
        break;
      }

      // ENGINE-WIRE-MS0/U-WIRE13: 5 Lathe AI engines
      case "ai_lathe_orchestrate": {
        const { latheAIOrchestrationEngine } = await import("../../engines/LatheAIOrchestrationEngine.js");
        const p = params as {
          program: string | Record<string, unknown>;
          context?: { material?: string; machineId?: string; controller?: string; constraints?: Record<string, unknown> };
          strategy?: "full_coverage" | "fast_path" | "quality_optimized" | "cost_optimized" | "safety_first" | "learning_focused" | "adaptive";
        };
        result = await latheAIOrchestrationEngine.orchestrateFullAnalysis(
          p.program as Parameters<typeof latheAIOrchestrationEngine.orchestrateFullAnalysis>[0],
          (p.context ?? {}) as Parameters<typeof latheAIOrchestrationEngine.orchestrateFullAnalysis>[1],
          p.strategy as Parameters<typeof latheAIOrchestrationEngine.orchestrateFullAnalysis>[2],
        );
        break;
      }
      case "ai_lathe_active_learn_select": {
        const { latheActiveLearningEngine } = await import("../../engines/LatheActiveLearningEngine.js");
        const p = params as {
          labeled_data: unknown[];
          pool_data?: unknown[];
          n_samples?: number;
          query_strategy?: string;
          budget?: Record<string, unknown>;
        };
        latheActiveLearningEngine.initialize(
          p.labeled_data as Parameters<typeof latheActiveLearningEngine.initialize>[0],
          p.pool_data as Parameters<typeof latheActiveLearningEngine.initialize>[1],
          p.budget as Parameters<typeof latheActiveLearningEngine.initialize>[2],
        );
        result = latheActiveLearningEngine.selectSamples(
          p.pool_data as Parameters<typeof latheActiveLearningEngine.selectSamples>[0],
          p.n_samples,
          p.query_strategy as Parameters<typeof latheActiveLearningEngine.selectSamples>[2],
        );
        break;
      }
      case "ai_lathe_bayesian_fit_gp": {
        const { latheBayesianOptimizationEngine } = await import("../../engines/LatheBayesianOptimizationEngine.js");
        const p = params as {
          observations: Array<{ x: number[]; y: number; timestamp?: number }>;
          kernel_config: { type: string; length_scales?: number[]; signal_variance?: number; noise_variance?: number; matern_nu?: 1.5 | 2.5; alpha?: number };
        };
        const obs = p.observations.map(o => ({ x: o.x, y: o.y, timestamp: o.timestamp ?? Date.now() }));
        // Engine requires length_scales[]; broadcast a unit length-scale per input dimension if caller omitted it.
        const dim = obs[0]?.x.length ?? 1;
        const kernelConfig = {
          ...p.kernel_config,
          length_scales: p.kernel_config.length_scales ?? Array.from({ length: dim }, () => 1.0),
        };
        result = latheBayesianOptimizationEngine.fitGP(
          obs as Parameters<typeof latheBayesianOptimizationEngine.fitGP>[0],
          kernelConfig as Parameters<typeof latheBayesianOptimizationEngine.fitGP>[1],
        );
        break;
      }
      case "ai_lathe_attention_compute": {
        const { latheAttentionMechanismEngine } = await import("../../engines/LatheAttentionMechanismEngine.js");
        const p = params as {
          tokens: Array<{ id: number; token: string; type: string; position: number; embedding: number[]; value?: number; line_number?: number; semantic_role?: string }>;
        };
        result = latheAttentionMechanismEngine.computeManufacturingAttention(
          p.tokens as Parameters<typeof latheAttentionMechanismEngine.computeManufacturingAttention>[0],
        );
        break;
      }
      case "ai_lathe_adaptive_engagement": {
        const { latheAdaptiveMachiningEngine } = await import("../../engines/LatheAdaptiveMachiningEngine.js");
        const p = params as {
          operation_type: string;
          diameter: number;
          depth_of_cut: number;
          feed_per_rev: number;
          lead_angle: number;
          nose_radius: number;
          cutting_speed: number;
        };
        result = latheAdaptiveMachiningEngine.calculateTurningEngagement({
          operationType: p.operation_type as Parameters<typeof latheAdaptiveMachiningEngine.calculateTurningEngagement>[0]["operationType"],
          diameter: p.diameter,
          depthOfCut: p.depth_of_cut,
          feedPerRev: p.feed_per_rev,
          leadAngle: p.lead_angle,
          noseRadius: p.nose_radius,
          cuttingSpeed: p.cutting_speed,
        });
        break;
      }

      // ENGINE-WIRE-MS0/U-WIRE18: 5 code-gen + approval engines
      case "ai_code_gate_pending": {
        const { aiGeneratedCodeApprovalGateEngine } = await import("../../engines/AIGeneratedCodeApprovalGateEngine.js");
        const p = params as { status?: string; approver?: string; request_type?: string };
        result = aiGeneratedCodeApprovalGateEngine.getPending(p as Parameters<typeof aiGeneratedCodeApprovalGateEngine.getPending>[0]);
        break;
      }
      case "ai_self_mod_propose_batch": {
        const { selfModificationProposalEngine } = await import("../../engines/SelfModificationProposalEngine.js");
        const p = params as { observations: Array<Record<string, unknown>>; at?: string };
        // Zod has already validated each observation matches the PatternObservation shape.
        result = selfModificationProposalEngine.proposeBatch(
          p.observations as unknown as Parameters<typeof selfModificationProposalEngine.proposeBatch>[0],
          p.at,
        );
        break;
      }
      case "ai_self_mod_is_approved": {
        const { selfModificationApprovalEngine } = await import("../../engines/SelfModificationApprovalEngine.js");
        const p = params as { proposal_id: string; proposal_hash: string; now_ms?: number };
        result = { approved: selfModificationApprovalEngine.isApproved(p.proposal_id, p.proposal_hash, p.now_ms) };
        break;
      }
      case "ai_intelligence_maximize": {
        const { aiIntelligenceMaximizer } = await import("../../engines/AIIntelligenceMaximizerEngine.js");
        // Zod-validated MaximizerInput; cast through unknown for structural-overlap satisfaction.
        result = await aiIntelligenceMaximizer.maximize(
          params as unknown as Parameters<typeof aiIntelligenceMaximizer.maximize>[0],
        );
        break;
      }
      case "ai_hook_rule_match": {
        const { hookRuleMatcherEngine } = await import("../../engines/HookRuleMatcherEngine.js");
        const p = params as { tool: string; params: Record<string, unknown> };
        result = hookRuleMatcherEngine.match(p.tool, p.params);
        break;
      }

      // ───────────────────────────────────────────────────────────────────────
      // INTEL-OLLAMA-OBSIDIAN-MS0/P5: 4 orphan reasoning engines
      // ───────────────────────────────────────────────────────────────────────
      case "creative_solve": {
        const { prismCreativeReasoningEngine } = await import("../../engines/PRISMCreativeReasoningEngine.js");
        const p = params as {
          problem: Parameters<typeof prismCreativeReasoningEngine.explore>[0];
          mode?: Parameters<typeof prismCreativeReasoningEngine.explore>[1];
        };
        result = prismCreativeReasoningEngine.explore(p.problem, p.mode);
        break;
      }
      case "causal_analyze": {
        const { CausalReasoningEngine } = await import("../../engines/CausalReasoningEngine.js");
        type CausalEdge = Parameters<InstanceType<typeof CausalReasoningEngine>["addEdges"]>[0][number];
        const p = params as {
          edges: ReadonlyArray<CausalEdge>;
          target?: string;
          source?: string;
          maxHops?: number;
        };
        const engine: InstanceType<typeof CausalReasoningEngine> = new CausalReasoningEngine();
        if (p.edges) engine.addEdges(p.edges);
        const out: Record<string, unknown> = {
          nodeCount: engine.nodeCount(),
          edgeCount: engine.edgeCount(),
        };
        if (p.target) out.rootCauses = engine.rootCauses(p.target, p.maxHops ?? 3);
        if (p.source) out.impact = engine.traceImpact(p.source, p.maxHops ?? 3);
        result = out;
        break;
      }
      case "counterfactual_predict": {
        const { counterfactualReasoningEngine } = await import("../../engines/CounterfactualReasoningEngine.js");
        type GraphVariables = Parameters<typeof counterfactualReasoningEngine.createCausalGraph>[0];
        type GraphDomain = Parameters<typeof counterfactualReasoningEngine.createCausalGraph>[1];
        const p = params as {
          // Schema declares graphSpec as { domain, variables, relations } wrapper — unpack
          // for the engine which takes (variables[], domain) directly.
          graphSpec: { domain?: GraphDomain; variables: GraphVariables; relations?: unknown[] };
          intervention: { variable: string; value: number | string | boolean };
        };
        const graph = counterfactualReasoningEngine.createCausalGraph(
          p.graphSpec.variables,
          p.graphSpec.domain ?? "machining",
        );
        const counterfactual = counterfactualReasoningEngine.generateCounterfactual(
          graph.id,
          p.intervention.variable,
          p.intervention.value,
        );
        result = { graphId: graph.id, counterfactual };
        break;
      }
      case "scientific_reason": {
        const { ScientificReasoningEngine } = await import("../../engines/ScientificReasoningEngine.js");
        type ScientificEngineInstance = InstanceType<typeof ScientificReasoningEngine>;
        type ReasonInputs = Parameters<ScientificEngineInstance["reason"]>[1];
        const p = params as {
          problem: string;
          inputs: ReasonInputs;
          calculationType: string;
        };
        const engine: ScientificEngineInstance = new ScientificReasoningEngine();
        result = engine.reason(p.problem, p.inputs, p.calculationType);
        break;
      }
      // ─────────────────────────────────────────────────────────────────────
      // ENGINE-WIRE-MS0/U-WIRE20: BeliefStateReasoningEngine — Bayesian beliefs
      // ─────────────────────────────────────────────────────────────────────
      case "belief_set": {
        const { beliefStateReasoningEngine } = await import("../../engines/BeliefStateReasoningEngine.js");
        const p = params as {
          id: string;
          distribution: Record<string, number>;
          description?: string;
        };
        const entry = beliefStateReasoningEngine.set(p.id, p.distribution, p.description);
        result = {
          id: entry.id,
          description: entry.description,
          distribution: entry.distribution,
          updatedAt: entry.updatedAt,
        };
        break;
      }
      case "belief_update": {
        const { beliefStateReasoningEngine } = await import("../../engines/BeliefStateReasoningEngine.js");
        const p = params as { id: string; likelihood: Record<string, number> };
        const entry = beliefStateReasoningEngine.update(p.id, p.likelihood);
        result = {
          id: entry.id,
          distribution: entry.distribution,
          updatedAt: entry.updatedAt,
        };
        break;
      }
      case "belief_query": {
        const { beliefStateReasoningEngine } = await import("../../engines/BeliefStateReasoningEngine.js");
        const p = params as {
          id: string;
          topK?: number;
          state?: string;
          includeEntropy?: boolean;
        };
        const entry = beliefStateReasoningEngine.get(p.id);
        if (!entry) {
          return dispatcherError(`Unknown belief id: ${p.id}`, action, "prism_ai");
        }
        const out: Record<string, unknown> = {
          id: entry.id,
          distribution: entry.distribution,
          updatedAt: entry.updatedAt,
          topK: beliefStateReasoningEngine.topK(p.id, p.topK ?? 3),
        };
        if (p.includeEntropy !== false) {
          out.entropy_bits = beliefStateReasoningEngine.entropy(p.id);
        }
        if (typeof p.state === "string" && p.state.length > 0) {
          out.probability_of_state = beliefStateReasoningEngine.probabilityOf(p.id, p.state);
        }
        result = out;
        break;
      }
      case "belief_list": {
        const { beliefStateReasoningEngine } = await import("../../engines/BeliefStateReasoningEngine.js");
        const all = beliefStateReasoningEngine.list();
        result = {
          count: beliefStateReasoningEngine.size(),
          beliefs: all.map(e => ({
            id: e.id,
            description: e.description,
            stateCount: Object.keys(e.distribution).length,
            updatedAt: e.updatedAt,
          })),
        };
        break;
      }
      case "belief_delete": {
        const { beliefStateReasoningEngine } = await import("../../engines/BeliefStateReasoningEngine.js");
        const p = params as { id: string };
        const removed = beliefStateReasoningEngine.delete(p.id);
        result = { ok: removed, id: p.id };
        break;
      }

      default: {
        const _exhaustive: never = action;
        return dispatcherError(`Unknown action: ${_exhaustive}`, action, "prism_ai");
      }
    }

    const duration = Date.now() - startTime;
    log.info(`[prism_ai] ${action} completed in ${duration}ms`);

    // Slim response
    const slimmed = slimResponse(result);

    return { success: true, data: slimmed };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    log.error(`[prism_ai] ${action} failed: ${message}`);
    return dispatcherError(message, action, "prism_ai");
  }
}

/** MCP tool handler entry point */
export async function aiReasoningDispatcher(
  args: { action: AIReasoningAction; params?: Record<string, unknown> }
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  return executeAIReasoningAction(args.action, args.params ?? {});
}

/** Export action list for registration */
export { AI_REASONING_ACTIONS };

/** Register dispatcher with MCP server */
export function registerAIReasoningDispatcher(server: { tool: Function }): void {
  server.tool(
    aiReasoningDispatcherDef.name,
    aiReasoningDispatcherDef.description,
    aiReasoningDispatcherDef.inputSchema.shape,
    async ({ action, params = {} }: { action: AIReasoningAction; params?: Record<string, unknown> }) => {
      const result = await executeAIReasoningAction(action, params);
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    }
  );
}
