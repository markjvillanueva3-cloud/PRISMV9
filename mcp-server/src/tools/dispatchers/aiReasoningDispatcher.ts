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
