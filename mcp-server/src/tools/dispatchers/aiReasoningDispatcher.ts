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
      // ─────────────────────────────────────────────────────────────────────
      // ENGINE-WIRE-MS0/U-WIRE21: ChainOfThoughtEngine — step-by-step reasoning
      // ─────────────────────────────────────────────────────────────────────
      case "cot_reason": {
        const { ChainOfThoughtEngine } = await import("../../engines/ChainOfThoughtEngine.js");
        type ReasoningProblemArg = Parameters<typeof ChainOfThoughtEngine.reason>[0];
        const p = params as unknown as ReasoningProblemArg;
        const chain = ChainOfThoughtEngine.reason(p);
        result = {
          chain_id: chain.chain_id,
          step_count: chain.steps.length,
          current_confidence: chain.current_confidence,
          dead_end_count: chain.dead_ends.length,
          final_answer: chain.final_answer ?? null,
          meta: chain.meta,
          steps: chain.steps.map(s => ({
            step_id: s.step_id,
            type: s.type,
            content: s.content,
            confidence: s.confidence,
            premises: s.premises,
          })),
        };
        break;
      }
      case "cot_reason_tree": {
        const { ChainOfThoughtEngine } = await import("../../engines/ChainOfThoughtEngine.js");
        type ReasoningProblemArg = Parameters<typeof ChainOfThoughtEngine.reasonTree>[0];
        const p = params as unknown as ReasoningProblemArg & { beam_width?: number };
        const beamWidth = typeof p.beam_width === "number" ? p.beam_width : 3;
        const tree = ChainOfThoughtEngine.reasonTree(p, beamWidth);
        result = {
          tree_id: tree.tree_id,
          best_path: tree.best_path,
          beam_width: tree.beam_width,
          explored_nodes: tree.explored_nodes,
          final_answer: tree.final_answer ?? null,
        };
        break;
      }
      case "cot_explain": {
        const { ChainOfThoughtEngine } = await import("../../engines/ChainOfThoughtEngine.js");
        type ChainArg = Parameters<typeof ChainOfThoughtEngine.explainChain>[0];
        const p = params as { chain: ChainArg };
        if (!p.chain || typeof p.chain !== "object") {
          return dispatcherError("Missing required 'chain' parameter (ReasoningChain object)", action, "prism_ai");
        }
        const explanation = ChainOfThoughtEngine.explainChain(p.chain);
        result = { explanation };
        break;
      }
      case "cot_apply_heuristics": {
        const { ChainOfThoughtEngine } = await import("../../engines/ChainOfThoughtEngine.js");
        const p = params as { problem?: string; context?: Record<string, unknown> };
        const problem = typeof p.problem === "string" ? p.problem : "";
        const ctx = (p.context && typeof p.context === "object") ? p.context : {};
        const heuristics = ChainOfThoughtEngine.applyManufacturingHeuristics(problem, ctx);
        result = {
          problem,
          context: ctx,
          heuristics,
          count: heuristics.length,
        };
        break;
      }
      // ─────────────────────────────────────────────────────────────────────
      // ENGINE-WIRE-MS0/U-WIRE24: ActiveLearningStrategyEngine — info-gain ranking
      // ─────────────────────────────────────────────────────────────────────
      case "learning_rank": {
        const { activeLearningStrategyEngine } = await import("../../engines/ActiveLearningStrategyEngine.js");
        type RankArg = Parameters<typeof activeLearningStrategyEngine.rank>[0];
        const p = params as { candidates: RankArg };
        const ranked = activeLearningStrategyEngine.rank(p.candidates);
        result = {
          count: ranked.length,
          totalInfoGain: ranked.reduce((a, r) => a + r.infoGain, 0),
          topRank: ranked[0] ?? null,
          ranked,
        };
        break;
      }
      case "learning_summary": {
        const { activeLearningStrategyEngine } = await import("../../engines/ActiveLearningStrategyEngine.js");
        type SummaryArg = Parameters<typeof activeLearningStrategyEngine.summary>[0];
        const p = params as { ranked: SummaryArg };
        const summary = activeLearningStrategyEngine.summary(p.ranked);
        result = summary;
        break;
      }
      // ─────────────────────────────────────────────────────────────────────
      // ENGINE-WIRE-MS0/U-WIRE25: MetaLearningOptimizerEngine — learn-to-learn
      // The singleton holds the (scenario, strategy) → stats ledger across
      // calls; that's the whole point of this engine, so we MUST use the
      // singleton (a fresh class instance per call would have empty state).
      // ─────────────────────────────────────────────────────────────────────
      case "meta_learning_record": {
        const { metaLearningOptimizerEngine } = await import("../../engines/MetaLearningOptimizerEngine.js");
        type OutcomeArg = Parameters<typeof metaLearningOptimizerEngine.record>[0];
        const p = params as unknown as OutcomeArg;
        const stats = metaLearningOptimizerEngine.record(p);
        result = { recorded: true, stats };
        break;
      }
      case "meta_learning_recommend": {
        const { metaLearningOptimizerEngine } = await import("../../engines/MetaLearningOptimizerEngine.js");
        const p = params as { scenario: string; minAttempts?: number };
        const recommendation = metaLearningOptimizerEngine.recommend(
          p.scenario,
          typeof p.minAttempts === "number" ? p.minAttempts : 1,
        );
        result = { recommendation };
        break;
      }
      case "meta_learning_stats": {
        const { metaLearningOptimizerEngine } = await import("../../engines/MetaLearningOptimizerEngine.js");
        const p = params as { scenario: string; strategy: string };
        const stats = metaLearningOptimizerEngine.statsFor(p.scenario, p.strategy);
        result = { stats };
        break;
      }
      case "meta_learning_list": {
        const { metaLearningOptimizerEngine } = await import("../../engines/MetaLearningOptimizerEngine.js");
        const p = params as { mode?: "scenarios" | "all" };
        const mode = p.mode ?? "all";
        if (mode === "scenarios") {
          const scenarios = metaLearningOptimizerEngine.listScenarios();
          result = { mode, scenarios, count: scenarios.length };
        } else {
          const all = metaLearningOptimizerEngine.listAll();
          result = { mode, stats: all, count: all.length, size: metaLearningOptimizerEngine.size() };
        }
        break;
      }
      // ─────────────────────────────────────────────────────────────────────
      // ENGINE-WIRE-MS0/U-WIRE26: PeerLearningCoordinatorEngine — broker for
      // cross-session insight sharing. Singleton-only (state lives across calls).
      // ─────────────────────────────────────────────────────────────────────
      case "peer_broadcast": {
        const { peerLearningCoordinatorEngine } = await import("../../engines/PeerLearningCoordinatorEngine.js");
        type BroadcastArg = Parameters<typeof peerLearningCoordinatorEngine.broadcast>[0];
        const p = params as unknown as BroadcastArg;
        const ingestion = peerLearningCoordinatorEngine.broadcast(p);
        result = ingestion;
        break;
      }
      case "peer_query": {
        const { peerLearningCoordinatorEngine } = await import("../../engines/PeerLearningCoordinatorEngine.js");
        type QueryArg = Parameters<typeof peerLearningCoordinatorEngine.query>[0];
        const p = params as QueryArg;
        const insights = peerLearningCoordinatorEngine.query(p);
        result = { insights, count: insights.length };
        break;
      }
      case "peer_get": {
        const { peerLearningCoordinatorEngine } = await import("../../engines/PeerLearningCoordinatorEngine.js");
        const p = params as { id: string };
        const insight = peerLearningCoordinatorEngine.get(p.id);
        result = { insight };
        break;
      }
      case "peer_size": {
        const { peerLearningCoordinatorEngine } = await import("../../engines/PeerLearningCoordinatorEngine.js");
        result = { size: peerLearningCoordinatorEngine.size() };
        break;
      }
      // ─────────────────────────────────────────────────────────────────────
      // ENGINE-WIRE-MS0/U-WIRE27: NeuralIntegrationEngine — neural cortex routing
      // Singleton holds learningHistory across calls (capped at 100).
      // ─────────────────────────────────────────────────────────────────────
      case "neural_route": {
        const { neuralIntegrationEngine } = await import("../../engines/NeuralIntegrationEngine.js");
        type QueryArg = Parameters<typeof neuralIntegrationEngine.route>[0];
        const p = params as unknown as QueryArg;
        const route = neuralIntegrationEngine.route(p);
        result = route;
        break;
      }
      case "neural_recommend": {
        const { neuralIntegrationEngine } = await import("../../engines/NeuralIntegrationEngine.js");
        const p = params as { query: string };
        const recommendations = neuralIntegrationEngine.recommendCommands(p.query);
        result = { recommendations, count: recommendations.length };
        break;
      }
      case "neural_synthesize": {
        const { neuralIntegrationEngine } = await import("../../engines/NeuralIntegrationEngine.js");
        const p = params as { query: string };
        const synthesis = neuralIntegrationEngine.synthesize(p.query);
        result = synthesis;
        break;
      }
      case "neural_stats": {
        const { neuralIntegrationEngine } = await import("../../engines/NeuralIntegrationEngine.js");
        const stats = neuralIntegrationEngine.getLearningStats();
        result = stats;
        break;
      }
      // ─────────────────────────────────────────────────────────────────────
      // ENGINE-WIRE-MS0/U-WIRE28: CNCControllerDeepLearningEngine — controller
      // knowledge: selection, dialect translation, comparison, macro gen,
      // post-debug. Pure (no I/O) — singleton OK but per-call is also fine.
      // ─────────────────────────────────────────────────────────────────────
      case "controller_select": {
        const { cncControllerDeepLearning } = await import("../../engines/CNCControllerDeepLearningEngine.js");
        type ReqArg = Parameters<typeof cncControllerDeepLearning.selectControllerForJob>[0];
        const p = params as unknown as ReqArg;
        const recommendation = cncControllerDeepLearning.selectControllerForJob(p);
        result = recommendation;
        break;
      }
      case "controller_translate": {
        const { cncControllerDeepLearning } = await import("../../engines/CNCControllerDeepLearningEngine.js");
        type SrcArg = Parameters<typeof cncControllerDeepLearning.translateGCode>[0];
        type TgtArg = Parameters<typeof cncControllerDeepLearning.translateGCode>[1];
        const p = params as { sourceController: SrcArg; targetController: TgtArg; code: string };
        const translation = cncControllerDeepLearning.translateGCode(
          p.sourceController,
          p.targetController,
          p.code,
        );
        result = translation;
        break;
      }
      case "controller_compare": {
        const { cncControllerDeepLearning } = await import("../../engines/CNCControllerDeepLearningEngine.js");
        type CtrlArg = Parameters<typeof cncControllerDeepLearning.compareControllers>[0];
        const p = params as { a: CtrlArg; b: CtrlArg };
        const comparison = cncControllerDeepLearning.compareControllers(p.a, p.b);
        result = comparison;
        break;
      }
      case "controller_macro": {
        const { cncControllerDeepLearning } = await import("../../engines/CNCControllerDeepLearningEngine.js");
        type CtrlArg = Parameters<typeof cncControllerDeepLearning.generateMacro>[1];
        const p = params as { taskDescription: string; controller: CtrlArg };
        const macro = cncControllerDeepLearning.generateMacro(p.taskDescription, p.controller);
        result = macro;
        break;
      }
      case "controller_debug": {
        const { cncControllerDeepLearning } = await import("../../engines/CNCControllerDeepLearningEngine.js");
        type CtrlArg = Parameters<typeof cncControllerDeepLearning.debugPostIssue>[1];
        const p = params as { errorMessage: string; controller: CtrlArg };
        const debug = cncControllerDeepLearning.debugPostIssue(p.errorMessage, p.controller);
        result = debug;
        break;
      }
      // ─────────────────────────────────────────────────────────────────────
      // ENGINE-WIRE-MS0/U-WIRE29: StatisticalLearningBoundsEngine — PAC/VC/Rademacher
      // Pure math; no state. Per-call `new` is fine (the singleton export
      // exists for callers that want a stable identity, not for state).
      // ─────────────────────────────────────────────────────────────────────
      case "bounds_pac_complexity": {
        const { statisticalLearningBoundsEngine } = await import("../../engines/StatisticalLearningBoundsEngine.js");
        type Arg = Parameters<typeof statisticalLearningBoundsEngine.pacSampleComplexity>[0];
        const p = params as unknown as Arg;
        result = statisticalLearningBoundsEngine.pacSampleComplexity(p);
        break;
      }
      case "bounds_vc": {
        const { statisticalLearningBoundsEngine } = await import("../../engines/StatisticalLearningBoundsEngine.js");
        type Arg = Parameters<typeof statisticalLearningBoundsEngine.vcBound>[0];
        const p = params as unknown as Arg;
        result = statisticalLearningBoundsEngine.vcBound(p);
        break;
      }
      case "bounds_rademacher": {
        const { statisticalLearningBoundsEngine } = await import("../../engines/StatisticalLearningBoundsEngine.js");
        type Arg = Parameters<typeof statisticalLearningBoundsEngine.rademacherBound>[0];
        const p = params as unknown as Arg;
        result = statisticalLearningBoundsEngine.rademacherBound(p);
        break;
      }
      case "bounds_pac_bayes": {
        const { statisticalLearningBoundsEngine } = await import("../../engines/StatisticalLearningBoundsEngine.js");
        type Arg = Parameters<typeof statisticalLearningBoundsEngine.pacBayesBound>[0];
        const p = params as unknown as Arg;
        result = statisticalLearningBoundsEngine.pacBayesBound(p);
        break;
      }
      // ─────────────────────────────────────────────────────────────────────
      // ENGINE-WIRE-MS0/U-WIRE30: ProactiveLearningEngine — auto-trigger
      // detection + knowledge-quality monitoring. Singleton (uses event bus).
      // ─────────────────────────────────────────────────────────────────────
      case "proactive_detect": {
        const { proactiveLearningEngine } = await import("../../engines/ProactiveLearningEngine.js");
        type Arg = Parameters<typeof proactiveLearningEngine.detectLearningTriggers>[0];
        const p = params as { context: Arg };
        const triggers = proactiveLearningEngine.detectLearningTriggers(p.context);
        result = { triggers, count: triggers.length };
        break;
      }
      case "proactive_classify": {
        const { proactiveLearningEngine } = await import("../../engines/ProactiveLearningEngine.js");
        type Arg = Parameters<typeof proactiveLearningEngine.classifyTrigger>[0];
        const p = params as { trigger: Arg };
        const classification = proactiveLearningEngine.classifyTrigger(p.trigger);
        result = classification;
        break;
      }
      case "proactive_quality_report": {
        const { proactiveLearningEngine } = await import("../../engines/ProactiveLearningEngine.js");
        const report = proactiveLearningEngine.monitorKnowledgeQuality();
        result = report;
        break;
      }
      case "proactive_stats": {
        const { proactiveLearningEngine } = await import("../../engines/ProactiveLearningEngine.js");
        const stats = proactiveLearningEngine.getCategorizationStats();
        result = stats;
        break;
      }
      // ─────────────────────────────────────────────────────────────────────
      // ENGINE-WIRE-MS0/U-WIRE31: ExceptionLearningEngine — capture, analyze,
      // and learn from unexpected events instead of failing. Singleton-only
      // (the class is not exported as a value — only the instance + types).
      // The lifecycle is: handle → record_outcome (writes), pending/stats
      // (reads). recordOutcome on a 'success' outcome additionally synthesizes
      // a tribal tip, and for parameter_outlier with data.value an envelope
      // proposal at value × 1.10.
      // ─────────────────────────────────────────────────────────────────────
      case "exception_handle": {
        const { exceptionLearningEngine } = await import("../../engines/ExceptionLearningEngine.js");
        type Arg = Parameters<typeof exceptionLearningEngine.handleUnexpected>[0];
        // Schema-validated upstream; cast to the engine's omit shape.
        const response = exceptionLearningEngine.handleUnexpected(params as Arg);
        result = response;
        break;
      }
      case "exception_record_outcome": {
        const { exceptionLearningEngine } = await import("../../engines/ExceptionLearningEngine.js");
        const p = params as { eventId: string; outcome: "success" | "failure" | "neutral" };
        const learned = exceptionLearningEngine.recordOutcome(p.eventId, p.outcome);
        // Engine returns null when eventId is unknown; surface explicitly so
        // the dispatcher result discriminates 'unknown event' from 'recorded'.
        result = learned === null
          ? { learned: null, recorded: false, reason: `Unknown eventId: ${p.eventId}` }
          : { learned, recorded: true };
        break;
      }
      case "exception_pending": {
        const { exceptionLearningEngine } = await import("../../engines/ExceptionLearningEngine.js");
        const pending = exceptionLearningEngine.getPendingExceptions();
        result = { events: pending, count: pending.length };
        break;
      }
      case "exception_stats": {
        const { exceptionLearningEngine } = await import("../../engines/ExceptionLearningEngine.js");
        result = exceptionLearningEngine.getStatistics();
        break;
      }
      // ─────────────────────────────────────────────────────────────────────
      // ENGINE-WIRE-MS0/U-WIRE32: TransferLearningBridgeEngine — cross-domain
      // analogy finder via cosine(0.7) + jaccard(0.3) + 10% cross-domain bonus.
      // Singleton-only; the dispatcher uses the shared instance so
      // registrations persist across calls. Engine throws on invalid
      // SolvedProblem fields — wrap each write to surface the error message
      // in the dispatcher result without crashing.
      // ─────────────────────────────────────────────────────────────────────
      case "analogy_register": {
        const { transferLearningBridgeEngine } = await import("../../engines/TransferLearningBridgeEngine.js");
        type Arg = Parameters<typeof transferLearningBridgeEngine.register>[0];
        const p = params as { problem: Arg };
        try {
          transferLearningBridgeEngine.register(p.problem);
          result = { registered: true, id: p.problem.id, size: transferLearningBridgeEngine.size() };
        } catch (e) {
          // Engine throws on missing/blank required fields. Surface message,
          // do NOT swallow — dispatcher contract returns success:true with a
          // structured failure payload so the caller can branch on registered.
          result = {
            registered: false,
            id: p.problem.id,
            error: e instanceof Error ? e.message : String(e),
          };
        }
        break;
      }
      case "analogy_register_many": {
        const { transferLearningBridgeEngine } = await import("../../engines/TransferLearningBridgeEngine.js");
        type Arg = Parameters<typeof transferLearningBridgeEngine.register>[0];
        const p = params as { problems: ReadonlyArray<Arg> };
        const sizeBefore = transferLearningBridgeEngine.size();
        try {
          transferLearningBridgeEngine.registerMany(p.problems);
          result = {
            registered: true,
            inserted: transferLearningBridgeEngine.size() - sizeBefore,
            size: transferLearningBridgeEngine.size(),
          };
        } catch (e) {
          // Engine throws on first invalid entry; prior inserts are kept (engine
          // contract). Report partial-insert count so the caller can resume.
          result = {
            registered: false,
            inserted: transferLearningBridgeEngine.size() - sizeBefore,
            size: transferLearningBridgeEngine.size(),
            error: e instanceof Error ? e.message : String(e),
          };
        }
        break;
      }
      case "analogy_find": {
        const { transferLearningBridgeEngine } = await import("../../engines/TransferLearningBridgeEngine.js");
        type QueryArg = Parameters<typeof transferLearningBridgeEngine.findAnalogies>[0];
        type OptsArg = Parameters<typeof transferLearningBridgeEngine.findAnalogies>[1];
        const p = params as { query: QueryArg; options?: OptsArg };
        const matches = transferLearningBridgeEngine.findAnalogies(p.query, p.options);
        result = { matches, count: matches.length };
        break;
      }
      case "analogy_inventory": {
        const { transferLearningBridgeEngine } = await import("../../engines/TransferLearningBridgeEngine.js");
        const problems = transferLearningBridgeEngine.list();
        result = { problems, size: transferLearningBridgeEngine.size() };
        break;
      }
      // ─────────────────────────────────────────────────────────────────────
      // ENGINE-WIRE-MS0/U-WIRE33: MultiAssetReasoningEngine — cross-asset
      // reasoning that combines engines + formulas + materials + machines to
      // synthesize a recommendation with confidence and alternatives.
      // Engine.reason() is async (lazy initialize); await it.
      // ─────────────────────────────────────────────────────────────────────
      case "multi_asset_reason": {
        const { multiAssetReasoningEngine } = await import("../../engines/MultiAssetReasoningEngine.js");
        type Arg = Parameters<typeof multiAssetReasoningEngine.reason>[0];
        const p = params as { context: Arg };
        result = await multiAssetReasoningEngine.reason(p.context);
        break;
      }
      case "multi_asset_types": {
        const { multiAssetReasoningEngine } = await import("../../engines/MultiAssetReasoningEngine.js");
        const types = multiAssetReasoningEngine.getAssetTypes();
        result = { types, count: types.length };
        break;
      }
      case "multi_asset_reset": {
        const { multiAssetReasoningEngine } = await import("../../engines/MultiAssetReasoningEngine.js");
        multiAssetReasoningEngine.reset();
        result = { reset: true };
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // ENGINE-WIRE-MS0/U-WIRE34: JMDieProgramLearningEngine — patterns mined
      // from 36,929 JM Die programs across lathe/mill/wedm × 5 categories.
      // All read methods are async (await initialize() internally).
      // Singleton seeds 15 patterns lazily on first call.
      // ─────────────────────────────────────────────────────────────────────
      case "jmdie_query": {
        const { jmDieProgramLearningEngine } = await import("../../engines/JMDieProgramLearningEngine.js");
        type Arg = Parameters<typeof jmDieProgramLearningEngine.query>[0];
        const patterns = await jmDieProgramLearningEngine.query(params as Arg);
        result = { patterns, count: patterns.length };
        break;
      }
      case "jmdie_get_pattern": {
        const { jmDieProgramLearningEngine } = await import("../../engines/JMDieProgramLearningEngine.js");
        const p = params as { id: string };
        const pattern = await jmDieProgramLearningEngine.getPattern(p.id);
        result = pattern === null
          ? { pattern: null, found: false }
          : { pattern, found: true };
        break;
      }
      case "jmdie_get_tips": {
        const { jmDieProgramLearningEngine } = await import("../../engines/JMDieProgramLearningEngine.js");
        const p = params as { machineType?: string };
        const tips = await jmDieProgramLearningEngine.getTips(p.machineType);
        result = { tips, count: tips.length };
        break;
      }
      case "jmdie_stats": {
        const { jmDieProgramLearningEngine } = await import("../../engines/JMDieProgramLearningEngine.js");
        const stats = await jmDieProgramLearningEngine.getStats();
        result = stats;
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // ENGINE-WIRE-MS0/U-WIRE35: AlgorithmOrchestratorEngine — routes 8
      // seeded algorithms (kienzle, taylor, sld, johnson_cook, monte_carlo,
      // bayesian_opt, kalman, lqr) by category/domain/inputType. recommend()
      // picks best by problemType+domain match with confidence + alternatives.
      // All async methods await initialize() internally; getCount is sync.
      // ─────────────────────────────────────────────────────────────────────
      case "algo_orch_query": {
        const { algorithmOrchestratorEngine } = await import("../../engines/AlgorithmOrchestratorEngine.js");
        type Arg = Parameters<typeof algorithmOrchestratorEngine.query>[0];
        const algorithms = await algorithmOrchestratorEngine.query(params as Arg);
        result = { algorithms, count: algorithms.length };
        break;
      }
      case "algo_orch_recommend": {
        const { algorithmOrchestratorEngine } = await import("../../engines/AlgorithmOrchestratorEngine.js");
        const p = params as { problemType: string; domain: string };
        result = await algorithmOrchestratorEngine.recommend(p.problemType, p.domain);
        break;
      }
      case "algo_orch_get": {
        const { algorithmOrchestratorEngine } = await import("../../engines/AlgorithmOrchestratorEngine.js");
        const p = params as { id: string };
        const algorithm = await algorithmOrchestratorEngine.getAlgorithm(p.id);
        result = algorithm === null
          ? { algorithm: null, found: false }
          : { algorithm, found: true };
        break;
      }
      case "algo_orch_count": {
        const { algorithmOrchestratorEngine } = await import("../../engines/AlgorithmOrchestratorEngine.js");
        // Engine.getCount() is sync but reflects post-init state. Force initialize
        // so callers always see the seeded count rather than 0 on a cold instance.
        await algorithmOrchestratorEngine.initialize();
        result = { count: algorithmOrchestratorEngine.getCount() };
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // ENGINE-WIRE-MS0/U-WIRE36: FusionDeepLearningEngine — Fusion 360 CAM
      // strategy knowledge base (23 seeded strategies × 21 features × 6 ISO
      // material groups). selectOptimalStrategy returns a chain-of-thought
      // recommendation; explain/list/stats expose the rest of the surface.
      // All methods are synchronous (no initialize() needed). Engine is
      // wrapped by FusionAIOrchestrationEngine for ONE method only — the
      // remaining surface area is unwired at the dispatcher layer.
      // ─────────────────────────────────────────────────────────────────────
      case "fusion_dl_select_strategy": {
        const { fusionDeepLearningEngine } = await import("../../engines/FusionDeepLearningEngine.js");
        type Arg = Parameters<typeof fusionDeepLearningEngine.selectOptimalStrategy>[0];
        result = fusionDeepLearningEngine.selectOptimalStrategy(params as Arg);
        break;
      }
      case "fusion_dl_explain": {
        const { fusionDeepLearningEngine } = await import("../../engines/FusionDeepLearningEngine.js");
        const p = params as { strategy_id: string };
        const explanation = fusionDeepLearningEngine.explainStrategy(p.strategy_id);
        result = explanation === null
          ? { explanation: null, found: false }
          : { explanation, found: true };
        break;
      }
      case "fusion_dl_list": {
        const { fusionDeepLearningEngine } = await import("../../engines/FusionDeepLearningEngine.js");
        type Cat = Parameters<typeof fusionDeepLearningEngine.findByCategory>[0];
        const p = params as { category?: Cat };
        const strategies = p.category
          ? fusionDeepLearningEngine.findByCategory(p.category)
          : fusionDeepLearningEngine.listStrategies();
        result = { strategies, count: strategies.length };
        break;
      }
      case "fusion_dl_stats": {
        const { fusionDeepLearningEngine } = await import("../../engines/FusionDeepLearningEngine.js");
        result = fusionDeepLearningEngine.getStats();
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // ENGINE-WIRE-MS0/U-WIRE37: InventorCAMStrategyEngine — Inventor HSM /
      // HSMWorks strategy database. recommend() filters by feature/machine/
      // tool suitability then scores by priority + HSM bonus + engagement-
      // control bonus + 5-axis bonus + material-specific guidance bonus,
      // sorts descending, returns top 5 ranked. All methods synchronous.
      // ─────────────────────────────────────────────────────────────────────
      case "inventorcam_recommend": {
        const { inventorCAMStrategyEngine } = await import("../../engines/InventorCAMStrategyEngine.js");
        type FeatureArg = Parameters<typeof inventorCAMStrategyEngine.recommend>[0];
        type MaterialArg = Parameters<typeof inventorCAMStrategyEngine.recommend>[1];
        type MachineArg = Parameters<typeof inventorCAMStrategyEngine.recommend>[2];
        type ToolArg = Parameters<typeof inventorCAMStrategyEngine.recommend>[3];
        type PriorityArg = Parameters<typeof inventorCAMStrategyEngine.recommend>[4];
        const p = params as {
          feature: FeatureArg;
          material: MaterialArg;
          machine: MachineArg;
          tool: ToolArg;
          priority?: PriorityArg;
        };
        const recommendations = inventorCAMStrategyEngine.recommend(p.feature, p.material, p.machine, p.tool, p.priority);
        result = { recommendations, count: recommendations.length };
        break;
      }
      case "inventorcam_get_strategy": {
        const { inventorCAMStrategyEngine } = await import("../../engines/InventorCAMStrategyEngine.js");
        const p = params as { name: string };
        // Engine returns HSMStrategy | undefined; normalize to {strategy, found} shape.
        const strategy = inventorCAMStrategyEngine.getParameters(p.name);
        result = strategy === undefined
          ? { strategy: null, found: false }
          : { strategy, found: true };
        break;
      }
      case "inventorcam_list": {
        const { inventorCAMStrategyEngine } = await import("../../engines/InventorCAMStrategyEngine.js");
        type Cat = Parameters<typeof inventorCAMStrategyEngine.listStrategies>[0];
        const p = params as { category?: Cat };
        const strategies = inventorCAMStrategyEngine.listStrategies(p.category);
        result = { strategies, count: strategies.length };
        break;
      }
      case "inventorcam_categories": {
        const { inventorCAMStrategyEngine } = await import("../../engines/InventorCAMStrategyEngine.js");
        const categories = inventorCAMStrategyEngine.getCategories();
        result = { categories, count: categories.length };
        break;
      }
      // ─────────────────────────────────────────────────────────────────────
      // ENGINE-WIRE-MS0/U-WIRE39: ActualVsPredictedCollectorEngine — neural
      // training feedback collector. Records (predicted, actual) pairs as
      // training examples with computed residuals and JM-DIE 2× weight.
      // Singleton with default config (10K buffer, 32 min batch, 2.0 weight).
      // Engine throws on missing context/targets — wrap record to return a
      // structured failure payload instead of crashing the dispatcher.
      // ─────────────────────────────────────────────────────────────────────
      case "avp_record": {
        const { actualVsPredictedCollectorEngine } = await import("../../engines/ActualVsPredictedCollectorEngine.js");
        type Arg = Parameters<typeof actualVsPredictedCollectorEngine.record>[0];
        try {
          const example = actualVsPredictedCollectorEngine.record(params as Arg);
          result = {
            recorded: true,
            example,
            buffer_size: actualVsPredictedCollectorEngine.size,
          };
        } catch (e) {
          result = {
            recorded: false,
            error: e instanceof Error ? e.message : String(e),
            buffer_size: actualVsPredictedCollectorEngine.size,
          };
        }
        break;
      }
      case "avp_stats": {
        const { actualVsPredictedCollectorEngine } = await import("../../engines/ActualVsPredictedCollectorEngine.js");
        const stats = actualVsPredictedCollectorEngine.getAllResidualStats();
        result = {
          stats,
          targets_covered: stats.length,
          buffer_size: actualVsPredictedCollectorEngine.size,
        };
        break;
      }
      case "avp_emit_batch": {
        const { actualVsPredictedCollectorEngine } = await import("../../engines/ActualVsPredictedCollectorEngine.js");
        const batch = actualVsPredictedCollectorEngine.emitTrainingBatch();
        // Engine returns null when buffer < min_batch_size; surface the gating
        // condition so the caller knows whether to wait or proceed.
        const cfg = actualVsPredictedCollectorEngine.getConfig();
        result = batch === null
          ? {
              ready: false,
              reason: `Buffer has ${actualVsPredictedCollectorEngine.size} examples; min_batch_size=${cfg.min_batch_size}`,
              buffer_size: actualVsPredictedCollectorEngine.size,
              min_batch_size: cfg.min_batch_size,
            }
          : { ready: true, batch };
        break;
      }
      case "avp_trend": {
        const { actualVsPredictedCollectorEngine } = await import("../../engines/ActualVsPredictedCollectorEngine.js");
        type Arg = Parameters<typeof actualVsPredictedCollectorEngine.accuracyTrend>[0];
        const p = params as { target: Arg };
        result = actualVsPredictedCollectorEngine.accuracyTrend(p.target);
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // ENGINE-WIRE-MS0/U-WIRE40: FusionStrategyKnowledgeEngine - Fusion 360
      // CAM strategy knowledge base with chain-of-thought reasoning. selectStrategy
      // returns top-1 ranked recommendation; compareStrategies returns top-N with
      // trade-off analysis. selectStrategy and compareStrategies bump the engine
      // query counter; the other three actions are read-only.
      // All methods are synchronous.
      // ─────────────────────────────────────────────────────────────────────
      case "fusion_kb_select_strategy": {
        const { fusionStrategyKnowledgeEngine } = await import("../../engines/FusionStrategyKnowledgeEngine.js");
        type Arg = Parameters<typeof fusionStrategyKnowledgeEngine.selectStrategy>[0];
        result = fusionStrategyKnowledgeEngine.selectStrategy(params as Arg);
        break;
      }
      case "fusion_kb_compare_strategies": {
        const { fusionStrategyKnowledgeEngine } = await import("../../engines/FusionStrategyKnowledgeEngine.js");
        type QueryArg = Parameters<typeof fusionStrategyKnowledgeEngine.compareStrategies>[0];
        const p = params as QueryArg & { max_strategies?: number };
        result = fusionStrategyKnowledgeEngine.compareStrategies(p, p.max_strategies);
        break;
      }
      case "fusion_kb_list_strategies": {
        const { fusionStrategyKnowledgeEngine } = await import("../../engines/FusionStrategyKnowledgeEngine.js");
        type FeatureArg = Parameters<typeof fusionStrategyKnowledgeEngine.getStrategiesForFeature>[0];
        const p = params as { feature?: FeatureArg };
        const strategies = p.feature
          ? fusionStrategyKnowledgeEngine.getStrategiesForFeature(p.feature)
          : fusionStrategyKnowledgeEngine.getAllStrategies();
        result = { strategies, count: strategies.length };
        break;
      }
      case "fusion_kb_get_strategy": {
        const { fusionStrategyKnowledgeEngine } = await import("../../engines/FusionStrategyKnowledgeEngine.js");
        const p = params as { id: string };
        const strategy = fusionStrategyKnowledgeEngine.getStrategyById(p.id);
        // Engine returns undefined for missing; normalize to null + found flag.
        result = strategy === undefined
          ? { strategy: null, found: false }
          : { strategy, found: true };
        break;
      }
      case "fusion_kb_stats": {
        const { fusionStrategyKnowledgeEngine } = await import("../../engines/FusionStrategyKnowledgeEngine.js");
        const p = params as { reset?: boolean };
        const stats = fusionStrategyKnowledgeEngine.stats();
        if (p.reset === true) {
          fusionStrategyKnowledgeEngine.clear();
        }
        result = { ...stats, reset_after_read: p.reset === true };
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // ENGINE-WIRE-MS0/U-WIRE41: MachineTypeClassifierEngine - infers
      // required machine type (lathe / mill_3axis / mill_5axis / mill_turn /
      // wire_edm / sinker_edm / swiss / grinder / multi_machine) from print
      // intelligence (titleBlock, dimensions, GDT, CAD signature, free-form
      // description). All methods synchronous, no engine state.
      // ─────────────────────────────────────────────────────────────────────
      case "machine_type_classify": {
        const { machineTypeClassifierEngine } = await import("../../engines/MachineTypeClassifierEngine.js");
        type Arg = Parameters<typeof machineTypeClassifierEngine.classify>[0];
        result = machineTypeClassifierEngine.classify(params as Arg);
        break;
      }
      case "machine_type_quick": {
        const { machineTypeClassifierEngine } = await import("../../engines/MachineTypeClassifierEngine.js");
        const p = params as { description: string };
        const machineType = machineTypeClassifierEngine.quickClassify(p.description);
        result = { primaryMachineType: machineType };
        break;
      }
      case "machine_type_multi_required": {
        const { machineTypeClassifierEngine } = await import("../../engines/MachineTypeClassifierEngine.js");
        type Arg = Parameters<typeof machineTypeClassifierEngine.requiresMultiMachine>[0];
        const required = machineTypeClassifierEngine.requiresMultiMachine(params as Arg);
        result = { multiMachineRequired: required };
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // ENGINE-WIRE-MS0/U-WIRE42: MaterialHardnessStateClassifierEngine -
      // material name + hardness -> ISO group / kc1.1 / mc / recommended
      // insert / max cutting speed. Static class (methods called directly,
      // no instance). Engine validates input via its own Zod schema.
      // ─────────────────────────────────────────────────────────────────────
      case "hardness_classify": {
        const { MaterialHardnessStateClassifierEngine } = await import("../../engines/MaterialHardnessStateClassifierEngine.js");
        type Arg = Parameters<typeof MaterialHardnessStateClassifierEngine.classify>[0];
        result = MaterialHardnessStateClassifierEngine.classify(params as Arg);
        break;
      }
      case "hardness_list_materials": {
        const { MaterialHardnessStateClassifierEngine } = await import("../../engines/MaterialHardnessStateClassifierEngine.js");
        const materials = MaterialHardnessStateClassifierEngine.getJMDieMaterials();
        result = { materials, count: materials.length };
        break;
      }
      case "hardness_list_with_aliases": {
        const { MaterialHardnessStateClassifierEngine } = await import("../../engines/MaterialHardnessStateClassifierEngine.js");
        const materials = MaterialHardnessStateClassifierEngine.getAllMaterialsWithAliases();
        result = { materials, count: materials.length };
        break;
      }
      case "hardness_convert": {
        const { MaterialHardnessStateClassifierEngine } = await import("../../engines/MaterialHardnessStateClassifierEngine.js");
        const p = params as { from: "hrc" | "hb"; value: number };
        // Bidirectional conversion - engine has hbToHrc / hrcToHb statics.
        if (p.from === "hrc") {
          const hb = MaterialHardnessStateClassifierEngine.hrcToHb(p.value);
          result = { input: { hrc: p.value }, output: { hb: Math.round(hb * 10) / 10 } };
        } else {
          const hrc = MaterialHardnessStateClassifierEngine.hbToHrc(p.value);
          result = { input: { hb: p.value }, output: { hrc: Math.round(hrc * 10) / 10 } };
        }
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // ENGINE-WIRE-MS0/U-WIRE43: PrintMatchStallDetectorEngine - tracks
      // print-matching jobs through 5 stages (ingest, feature_extraction,
      // similarity_search, candidate_review, disposition) with per-stage
      // stall budgets. Caller supplies now_ms (engine never reads Date.now).
      // All methods synchronous. Mutating actions return {ok:true} or boolean.
      // ─────────────────────────────────────────────────────────────────────
      case "stall_start_tracking": {
        const { printMatchStallDetectorEngine } = await import("../../engines/PrintMatchStallDetectorEngine.js");
        type StageArg = Parameters<typeof printMatchStallDetectorEngine.startTracking>[1];
        const p = params as { job_id: string; stage: StageArg; now_ms: number; context?: Record<string, unknown> };
        printMatchStallDetectorEngine.startTracking(p.job_id, p.stage, p.now_ms, p.context ?? {});
        result = { ok: true, job_id: p.job_id, stage: p.stage };
        break;
      }
      case "stall_mark_progress": {
        const { printMatchStallDetectorEngine } = await import("../../engines/PrintMatchStallDetectorEngine.js");
        const p = params as { job_id: string; now_ms: number };
        printMatchStallDetectorEngine.markProgress(p.job_id, p.now_ms);
        result = { ok: true, job_id: p.job_id };
        break;
      }
      case "stall_advance_stage": {
        const { printMatchStallDetectorEngine } = await import("../../engines/PrintMatchStallDetectorEngine.js");
        type StageArg = Parameters<typeof printMatchStallDetectorEngine.advanceStage>[1];
        const p = params as { job_id: string; from_stage: StageArg; to_stage: StageArg; now_ms: number };
        printMatchStallDetectorEngine.advanceStage(p.job_id, p.from_stage, p.to_stage, p.now_ms);
        result = { ok: true, job_id: p.job_id, from: p.from_stage, to: p.to_stage };
        break;
      }
      case "stall_complete_job": {
        const { printMatchStallDetectorEngine } = await import("../../engines/PrintMatchStallDetectorEngine.js");
        const p = params as { job_id: string };
        const removed = printMatchStallDetectorEngine.completeJob(p.job_id);
        result = { removed, job_id: p.job_id };
        break;
      }
      case "stall_scan": {
        const { printMatchStallDetectorEngine } = await import("../../engines/PrintMatchStallDetectorEngine.js");
        const p = params as { now_ms: number };
        const events = printMatchStallDetectorEngine.scan(p.now_ms);
        result = { events, count: events.length };
        break;
      }
      case "stall_scan_one": {
        const { printMatchStallDetectorEngine } = await import("../../engines/PrintMatchStallDetectorEngine.js");
        const p = params as { job_id: string; now_ms: number };
        const event = printMatchStallDetectorEngine.scanOne(p.job_id, p.now_ms);
        // Engine returns undefined for not-tracked OR not-stalled - normalize.
        result = event === undefined
          ? { event: null, stalled: false, job_id: p.job_id }
          : { event, stalled: true };
        break;
      }
      case "stall_stats": {
        const { printMatchStallDetectorEngine } = await import("../../engines/PrintMatchStallDetectorEngine.js");
        const p = params as { now_ms?: number };
        // statsAt(now_ms) populates currently_stalled; stats() leaves it 0.
        const stats = p.now_ms !== undefined
          ? printMatchStallDetectorEngine.statsAt(p.now_ms)
          : printMatchStallDetectorEngine.stats();
        const trackedIds = printMatchStallDetectorEngine.trackedIds();
        result = { ...stats, tracked_ids: trackedIds };
        break;
      }
      case "stall_clear": {
        const { printMatchStallDetectorEngine } = await import("../../engines/PrintMatchStallDetectorEngine.js");
        printMatchStallDetectorEngine.clear();
        result = { ok: true, cleared: true };
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // ENGINE-WIRE-MS0/U-WIRE44: SimulationStallDetectorEngine - tracks
      // simulation-pipeline jobs through 5 stages (gcode_parse, kinematics,
      // collision_check, physics_validate, finalize) with per-stage stall
      // budgets. Same lifecycle as U-WIRE43 but for sim domain.
      // ─────────────────────────────────────────────────────────────────────
      case "sim_stall_start_tracking": {
        const { simulationStallDetectorEngine } = await import("../../engines/SimulationStallDetectorEngine.js");
        type StageArg = Parameters<typeof simulationStallDetectorEngine.startTracking>[1];
        const p = params as { job_id: string; stage: StageArg; now_ms: number; context?: Record<string, unknown> };
        simulationStallDetectorEngine.startTracking(p.job_id, p.stage, p.now_ms, p.context ?? {});
        result = { ok: true, job_id: p.job_id, stage: p.stage };
        break;
      }
      case "sim_stall_mark_progress": {
        const { simulationStallDetectorEngine } = await import("../../engines/SimulationStallDetectorEngine.js");
        const p = params as { job_id: string; now_ms: number };
        simulationStallDetectorEngine.markProgress(p.job_id, p.now_ms);
        result = { ok: true, job_id: p.job_id };
        break;
      }
      case "sim_stall_advance_stage": {
        const { simulationStallDetectorEngine } = await import("../../engines/SimulationStallDetectorEngine.js");
        type StageArg = Parameters<typeof simulationStallDetectorEngine.advanceStage>[1];
        const p = params as { job_id: string; from_stage: StageArg; to_stage: StageArg; now_ms: number };
        simulationStallDetectorEngine.advanceStage(p.job_id, p.from_stage, p.to_stage, p.now_ms);
        result = { ok: true, job_id: p.job_id, from: p.from_stage, to: p.to_stage };
        break;
      }
      case "sim_stall_complete_job": {
        const { simulationStallDetectorEngine } = await import("../../engines/SimulationStallDetectorEngine.js");
        const p = params as { job_id: string };
        const removed = simulationStallDetectorEngine.completeJob(p.job_id);
        result = { removed, job_id: p.job_id };
        break;
      }
      case "sim_stall_scan": {
        const { simulationStallDetectorEngine } = await import("../../engines/SimulationStallDetectorEngine.js");
        const p = params as { now_ms: number };
        const events = simulationStallDetectorEngine.scan(p.now_ms);
        result = { events, count: events.length };
        break;
      }
      case "sim_stall_scan_one": {
        const { simulationStallDetectorEngine } = await import("../../engines/SimulationStallDetectorEngine.js");
        const p = params as { job_id: string; now_ms: number };
        const event = simulationStallDetectorEngine.scanOne(p.job_id, p.now_ms);
        result = event === undefined
          ? { event: null, stalled: false, job_id: p.job_id }
          : { event, stalled: true };
        break;
      }
      case "sim_stall_stats": {
        const { simulationStallDetectorEngine } = await import("../../engines/SimulationStallDetectorEngine.js");
        const p = params as { now_ms?: number };
        const stats = p.now_ms !== undefined
          ? simulationStallDetectorEngine.statsAt(p.now_ms)
          : simulationStallDetectorEngine.stats();
        const trackedIds = simulationStallDetectorEngine.trackedIds();
        result = { ...stats, tracked_ids: trackedIds };
        break;
      }
      case "sim_stall_clear": {
        const { simulationStallDetectorEngine } = await import("../../engines/SimulationStallDetectorEngine.js");
        simulationStallDetectorEngine.clear();
        result = { ok: true, cleared: true };
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // ENGINE-WIRE-MS0/U-WIRE45: LatheLoRADatasetValidatorEngine - quality
      // gate for LoRA fine-tune training data. Validates schema compliance,
      // content quality, physics sanity (RPM/feed/depth bounds), diversity,
      // and duplicate detection. Stateless - all methods synchronous.
      // ─────────────────────────────────────────────────────────────────────
      case "lathe_lora_validate": {
        const { latheLoRADatasetValidatorEngine } = await import("../../engines/LatheLoRADatasetValidatorEngine.js");
        type ExamplesArg = Parameters<typeof latheLoRADatasetValidatorEngine.validate>[0];
        type ConfigArg = Parameters<typeof latheLoRADatasetValidatorEngine.validate>[1];
        const p = params as { examples: ExamplesArg; config?: ConfigArg };
        result = latheLoRADatasetValidatorEngine.validate(p.examples, p.config ?? {});
        break;
      }
      case "lathe_lora_validate_single": {
        const { latheLoRADatasetValidatorEngine } = await import("../../engines/LatheLoRADatasetValidatorEngine.js");
        type ExampleArg = Parameters<typeof latheLoRADatasetValidatorEngine.validateSingle>[0];
        const p = params as { example: ExampleArg };
        const issues = latheLoRADatasetValidatorEngine.validateSingle(p.example);
        result = { issues, count: issues.length };
        break;
      }
      case "lathe_lora_summary": {
        const { latheLoRADatasetValidatorEngine } = await import("../../engines/LatheLoRADatasetValidatorEngine.js");
        type ResultArg = Parameters<typeof latheLoRADatasetValidatorEngine.getSummary>[0];
        const p = params as { result: ResultArg };
        const summary = latheLoRADatasetValidatorEngine.getSummary(p.result);
        result = { summary };
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // ENGINE-WIRE-MS0/U-WIRE46: MillingLoRADatasetBuilderEngine — Alpaca-format
      // dataset builder for milling fine-tune. Wraps BaseLoRADatasetBuilder with
      // a milling-specific render (instruction = "Recommend milling feed/speed/
      // strategy for <op_type> on <material>...") and a 4-axis fingerprint
      // (material, tool_class, op_type, machine_class). Stateless.
      // ─────────────────────────────────────────────────────────────────────
      case "milling_lora_build_dataset": {
        const { millingLoRADatasetBuilderEngine } = await import("../../engines/MillingLoRADatasetBuilderEngine.js");
        type JobsArg = Parameters<typeof millingLoRADatasetBuilderEngine.buildDataset>[0];
        type SplitArg = Parameters<typeof millingLoRADatasetBuilderEngine.buildDataset>[1];
        const p = params as { jobs: JobsArg; split?: SplitArg };
        result = p.split !== undefined
          ? millingLoRADatasetBuilderEngine.buildDataset(p.jobs, p.split)
          : millingLoRADatasetBuilderEngine.buildDataset(p.jobs);
        break;
      }
      case "milling_lora_required_schema": {
        const { millingLoRADatasetBuilderEngine } = await import("../../engines/MillingLoRADatasetBuilderEngine.js");
        const schema = millingLoRADatasetBuilderEngine.requiredSchema();
        // Materialize readonly tuples so Zod-validated callers see plain arrays.
        result = { features: [...schema.features], actuals: [...schema.actuals] };
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // ENGINE-WIRE-MS0/U-WIRE47: WaterjetLoRADatasetBuilderEngine — Q1-Q5
      // quality-stratified Alpaca dataset builder. Wraps BaseLoRADatasetBuilder
      // with a waterjet render (instruction = "Recommend waterjet feed for
      // <material> <thickness>mm at Q<level>.") and adds quality_level (1-5)
      // to the fingerprint via enrichFingerprint() so the train/val/test
      // split stratifies across all 5 quality regimes (preserves rare Q5
      // finishing data). Stateless.
      // ─────────────────────────────────────────────────────────────────────
      case "waterjet_lora_build_dataset": {
        const { waterjetLoRADatasetBuilderEngine } = await import("../../engines/WaterjetLoRADatasetBuilderEngine.js");
        type JobsArg = Parameters<typeof waterjetLoRADatasetBuilderEngine.buildDataset>[0];
        type SplitArg = Parameters<typeof waterjetLoRADatasetBuilderEngine.buildDataset>[1];
        const p = params as { jobs: JobsArg; split?: SplitArg };
        result = p.split !== undefined
          ? waterjetLoRADatasetBuilderEngine.buildDataset(p.jobs, p.split)
          : waterjetLoRADatasetBuilderEngine.buildDataset(p.jobs);
        break;
      }
      case "waterjet_lora_required_schema": {
        const { waterjetLoRADatasetBuilderEngine } = await import("../../engines/WaterjetLoRADatasetBuilderEngine.js");
        const schema = waterjetLoRADatasetBuilderEngine.requiredSchema();
        result = { features: [...schema.features], actuals: [...schema.actuals] };
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // ENGINE-WIRE-MS0/U-WIRE48: LaserLoRADatasetBuilderEngine — thickness-
      // bucket-stratified Alpaca dataset builder. enrichFingerprint() bins
      // thickness into thin (<3mm) / medium (3-10mm) / thick (10-25mm) /
      // heavy (>=25mm) so the geometry hash stratifies across cutting
      // regimes. Validate() side-effects: when pierce_success is false the
      // job gets a "pierce-fail" label and weight is boosted to ≥3.0
      // (pierce failures are the highest-cost laser failure mode).
      // ─────────────────────────────────────────────────────────────────────
      case "laser_lora_build_dataset": {
        const { laserLoRADatasetBuilderEngine } = await import("../../engines/LaserLoRADatasetBuilderEngine.js");
        type JobsArg = Parameters<typeof laserLoRADatasetBuilderEngine.buildDataset>[0];
        type SplitArg = Parameters<typeof laserLoRADatasetBuilderEngine.buildDataset>[1];
        const p = params as { jobs: JobsArg; split?: SplitArg };
        result = p.split !== undefined
          ? laserLoRADatasetBuilderEngine.buildDataset(p.jobs, p.split)
          : laserLoRADatasetBuilderEngine.buildDataset(p.jobs);
        break;
      }
      case "laser_lora_required_schema": {
        const { laserLoRADatasetBuilderEngine } = await import("../../engines/LaserLoRADatasetBuilderEngine.js");
        const schema = laserLoRADatasetBuilderEngine.requiredSchema();
        result = { features: [...schema.features], actuals: [...schema.actuals] };
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // ENGINE-WIRE-MS0/U-WIRE49: SinkerEDMLoRADatasetBuilderEngine — aspect-
      // ratio-stratified Alpaca dataset builder. enrichFingerprint() bins the
      // depth/width aspect ratio into simple (≤2) / moderate (2-5) / deep
      // (>5) and stamps the bucket as fingerprint.complexity. Validate()
      // side-effect: deep cavities (aspect > 5) auto-label "deep-cavity"
      // and boost weight to max(weight, 2.0) — preserves rare deep-pocket
      // training examples that would otherwise be drowned by simple cavities.
      // ─────────────────────────────────────────────────────────────────────
      case "sinker_edm_lora_build_dataset": {
        const { sinkerEDMLoRADatasetBuilderEngine } = await import("../../engines/SinkerEDMLoRADatasetBuilderEngine.js");
        type JobsArg = Parameters<typeof sinkerEDMLoRADatasetBuilderEngine.buildDataset>[0];
        type SplitArg = Parameters<typeof sinkerEDMLoRADatasetBuilderEngine.buildDataset>[1];
        const p = params as { jobs: JobsArg; split?: SplitArg };
        result = p.split !== undefined
          ? sinkerEDMLoRADatasetBuilderEngine.buildDataset(p.jobs, p.split)
          : sinkerEDMLoRADatasetBuilderEngine.buildDataset(p.jobs);
        break;
      }
      case "sinker_edm_lora_required_schema": {
        const { sinkerEDMLoRADatasetBuilderEngine } = await import("../../engines/SinkerEDMLoRADatasetBuilderEngine.js");
        const schema = sinkerEDMLoRADatasetBuilderEngine.requiredSchema();
        result = { features: [...schema.features], actuals: [...schema.actuals] };
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
