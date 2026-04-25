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

// Dev-loop AI engines (lazy)
let _aiRouter: typeof import("../../engines/AISystemRouterEngine.js").aiSystemRouterEngine | null = null;
let _aiAuto: typeof import("../../engines/AIAutoUtilizationEngine.js").aiAutoUtilizationEngine | null = null;
let _aiExtract: typeof import("../../engines/AIExtractionReasonerEngine.js").aiExtractionReasoner | null = null;

async function getAiRouter() {
  if (!_aiRouter) { _aiRouter = (await import("../../engines/AISystemRouterEngine.js")).aiSystemRouterEngine; }
  return _aiRouter;
}
async function getAiAuto() {
  if (!_aiAuto) { _aiAuto = (await import("../../engines/AIAutoUtilizationEngine.js")).aiAutoUtilizationEngine; }
  return _aiAuto;
}
async function getAiExtract() {
  if (!_aiExtract) { _aiExtract = (await import("../../engines/AIExtractionReasonerEngine.js")).aiExtractionReasoner; }
  return _aiExtract;
}

// WIRE-MS0/U-WIRE07 — dev-process reasoning + learning singletons
let _causal: typeof import("../../engines/CausalReasoningEngine.js").causalReasoningEngine | null = null;
let _exception: typeof import("../../engines/ExceptionLearningEngine.js").exceptionLearningEngine | null = null;
let _metalearn: typeof import("../../engines/MetaLearningOptimizerEngine.js").metaLearningOptimizerEngine | null = null;

async function getCausal() {
  if (!_causal) { _causal = (await import("../../engines/CausalReasoningEngine.js")).causalReasoningEngine; }
  return _causal;
}
async function getException() {
  if (!_exception) { _exception = (await import("../../engines/ExceptionLearningEngine.js")).exceptionLearningEngine; }
  return _exception;
}
async function getMetalearn() {
  if (!_metalearn) { _metalearn = (await import("../../engines/MetaLearningOptimizerEngine.js")).metaLearningOptimizerEngine; }
  return _metalearn;
}

// WIRE-MS0/U-WIRE08 — PAC/VC bounds + belief-state tracking singletons
let _statBounds: typeof import("../../engines/StatisticalLearningBoundsEngine.js").statisticalLearningBoundsEngine | null = null;
let _beliefState: typeof import("../../engines/BeliefStateReasoningEngine.js").beliefStateReasoningEngine | null = null;

async function getStatBounds() {
  if (!_statBounds) { _statBounds = (await import("../../engines/StatisticalLearningBoundsEngine.js")).statisticalLearningBoundsEngine; }
  return _statBounds;
}
async function getBeliefState() {
  if (!_beliefState) { _beliefState = (await import("../../engines/BeliefStateReasoningEngine.js")).beliefStateReasoningEngine; }
  return _beliefState;
}

// WIRE-MS0/U-WIRE09 — temporal + cognitive budget singletons
let _temporal: typeof import("../../engines/TemporalReasoningEngine.js").temporalReasoningEngine | null = null;
let _cognitive: typeof import("../../engines/CognitiveBudgetAllocatorEngine.js").cognitiveBudgetAllocatorEngine | null = null;

async function getTemporal() {
  if (!_temporal) { _temporal = (await import("../../engines/TemporalReasoningEngine.js")).temporalReasoningEngine; }
  return _temporal;
}
async function getCognitive() {
  if (!_cognitive) { _cognitive = (await import("../../engines/CognitiveBudgetAllocatorEngine.js")).cognitiveBudgetAllocatorEngine; }
  return _cognitive;
}

// WIRE-MS0/U-WIRE10 — XAI explainer singleton
let _explainer: typeof import("../../engines/ReasoningExplainerEngine.js").reasoningExplainerEngine | null = null;

async function getExplainer() {
  if (!_explainer) { _explainer = (await import("../../engines/ReasoningExplainerEngine.js")).reasoningExplainerEngine; }
  return _explainer;
}


// WIRE-MS0/U-WIRE11 — AI/ML deep-learning + capability orchestration singletons
let _capMaximizer: typeof import("../../engines/AICapabilityMaximizerEngine.js").aiCapabilityMaximizerEngine | null = null;
let _intelMaximizer: typeof import("../../engines/AIIntelligenceMaximizerEngine.js").aiIntelligenceMaximizer | null = null;
let _sysSync: typeof import("../../engines/AISystemSynchronizerEngine.js").aiSystemSynchronizerEngine | null = null;
let _deepKnow: typeof import("../../engines/AIDeepKnowledgeIntegrationEngine.js").aiDeepKnowledgeIntegration | null = null;
let _resLearn: typeof import("../../engines/AIResourceLearningEngine.js").aiResourceLearningEngine | null = null;
let _neuralInteg: typeof import("../../engines/NeuralIntegrationEngine.js").neuralIntegrationEngine | null = null;
let _activeLearn: typeof import("../../engines/ActiveLearningStrategyEngine.js").activeLearningStrategyEngine | null = null;
let _peerLearn: typeof import("../../engines/PeerLearningCoordinatorEngine.js").peerLearningCoordinatorEngine | null = null;

async function getCapMaximizer() {
  if (!_capMaximizer) { _capMaximizer = (await import("../../engines/AICapabilityMaximizerEngine.js")).aiCapabilityMaximizerEngine; }
  return _capMaximizer;
}
async function getIntelMaximizer() {
  if (!_intelMaximizer) { _intelMaximizer = (await import("../../engines/AIIntelligenceMaximizerEngine.js")).aiIntelligenceMaximizer; }
  return _intelMaximizer;
}
async function getSysSync() {
  if (!_sysSync) { _sysSync = (await import("../../engines/AISystemSynchronizerEngine.js")).aiSystemSynchronizerEngine; }
  return _sysSync;
}
async function getDeepKnow() {
  if (!_deepKnow) { _deepKnow = (await import("../../engines/AIDeepKnowledgeIntegrationEngine.js")).aiDeepKnowledgeIntegration; }
  return _deepKnow;
}
async function getResLearn() {
  if (!_resLearn) { _resLearn = (await import("../../engines/AIResourceLearningEngine.js")).aiResourceLearningEngine; }
  return _resLearn;
}
async function getNeuralInteg() {
  if (!_neuralInteg) { _neuralInteg = (await import("../../engines/NeuralIntegrationEngine.js")).neuralIntegrationEngine; }
  return _neuralInteg;
}
async function getActiveLearn() {
  if (!_activeLearn) { _activeLearn = (await import("../../engines/ActiveLearningStrategyEngine.js")).activeLearningStrategyEngine; }
  return _activeLearn;
}
async function getPeerLearn() {
  if (!_peerLearn) { _peerLearn = (await import("../../engines/PeerLearningCoordinatorEngine.js")).peerLearningCoordinatorEngine; }
  return _peerLearn;
}

/** Dispatcher definition for MCP registration */
export const aiReasoningDispatcherDef = {
  name: "prism_ai",
  description: "AI reasoning dispatcher — routes AGI, scientific, wisdom, and adaptive strategy requests through MillMasterOrchestratorFacadeEngine.",
  inputSchema: z.object({
    action: z.enum(AI_REASONING_ACTIONS).describe("AI reasoning action to execute"),
    params: z.record(z.unknown()).optional().describe("Action-specific parameters"),
  }),
};

/** Execute AI reasoning action */
export async function executeAIReasoningAction(
  action: AIReasoningAction,
  params: Record<string, unknown>
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const startTime = Date.now();
  log.info(`[prism_ai] Executing action: ${action}`);

  // Validate params against per-action schema map.
  // Note: validateActionParams takes the FULL map, not a single schema —
  // pre-existing dispatcher had this miswired (single schema → passthrough).
  const validation = validateActionParams(action, params, ACTION_AI_REASONING_SCHEMAS);
  if (!validation.valid) {
    return dispatcherError(
      validation.errorMessage ?? "Validation failed",
      action,
      "prism_ai",
    );
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
      // Dev-loop AI utilities (added 2026-04-25 per AI engine audit)
      // ─────────────────────────────────────────────────────────────────────
      case "ai_route_task": {
        const router = await getAiRouter();
        result = router.route(String(params.task ?? ""));
        break;
      }
      case "ai_health_report": {
        const router = await getAiRouter();
        if (params.backend) {
          result = router.probe(params.backend as never);
        } else {
          result = { backends: router.healthReport() };
        }
        break;
      }
      case "ai_recommend_capability": {
        const auto = await getAiAuto();
        const ctx = params.experience ? { experienceLevel: String(params.experience) as never } : undefined;
        result = auto.analyze(String(params.input ?? ""), ctx as never);
        break;
      }
      case "ai_classify_content": {
        const reasoner = await getAiExtract();
        result = await reasoner.classifyContent(params.content);
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // WIRE-MS0/U-WIRE07 — dev-process reasoning + learning
      // ─────────────────────────────────────────────────────────────────────
      case "ai_causal_add_edge": {
        const causal = await getCausal();
        result = causal.addEdge({
          from: String(params.from),
          to: String(params.to),
          confidence: Number(params.confidence),
          polarity: params.polarity as "positive" | "negative" | "unknown",
          reason: params.reason as string | undefined,
        });
        break;
      }
      case "ai_causal_trace_impact": {
        const causal = await getCausal();
        result = causal.traceImpact(
          String(params.source),
          (params.maxHops as number | undefined) ?? 3,
        );
        break;
      }
      case "ai_causal_root_causes": {
        const causal = await getCausal();
        result = {
          target: String(params.target),
          maxHops: (params.maxHops as number | undefined) ?? 3,
          rootCauses: causal.rootCauses(
            String(params.target),
            (params.maxHops as number | undefined) ?? 3,
          ),
        };
        break;
      }
      case "ai_exception_handle": {
        const exception = await getException();
        result = exception.handleUnexpected({
          type: params.type as "parameter_outlier" | "outcome_anomaly" | "process_deviation" | "measurement_spike",
          description: String(params.description),
          context: (params.context ?? {}) as Record<string, unknown>,
          data: (params.data ?? {}) as Record<string, number | string>,
          severity: params.severity as "info" | "warning" | "critical",
        });
        break;
      }
      case "ai_exception_record_outcome": {
        const exception = await getException();
        const learned = exception.recordOutcome(
          String(params.eventId),
          params.outcome as "success" | "failure" | "neutral",
        );
        result = learned ?? { error: `eventId not found: ${params.eventId}` };
        break;
      }
      case "ai_exception_stats": {
        const exception = await getException();
        result = exception.getStatistics();
        break;
      }
      case "ai_metalearn_record": {
        const metalearn = await getMetalearn();
        result = metalearn.record({
          scenario: String(params.scenario),
          strategy: String(params.strategy),
          success: Boolean(params.success),
          durationMs: params.durationMs as number | undefined,
        });
        break;
      }
      case "ai_metalearn_recommend": {
        const metalearn = await getMetalearn();
        const rec = metalearn.recommend(
          String(params.scenario),
          (params.minAttempts as number | undefined) ?? 1,
        );
        result = rec ?? { scenario: String(params.scenario), recommendation: null };
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // WIRE-MS0/U-WIRE08 — PAC/VC bounds + Bayesian belief
      // ─────────────────────────────────────────────────────────────────────
      case "ai_pac_sample_complexity": {
        const bounds = await getStatBounds();
        result = bounds.pacSampleComplexity({
          hypothesisClassSize: Number(params.hypothesisClassSize),
          epsilon: Number(params.epsilon),
          delta: Number(params.delta),
        });
        break;
      }
      case "ai_vc_bound": {
        const bounds = await getStatBounds();
        result = bounds.vcBound({
          vcDim: Number(params.vcDim),
          n: Number(params.n),
          delta: Number(params.delta),
        });
        break;
      }
      case "ai_rademacher_bound": {
        const bounds = await getStatBounds();
        result = bounds.rademacherBound({
          empiricalRademacher: Number(params.empiricalRademacher),
          n: Number(params.n),
          delta: Number(params.delta),
        });
        break;
      }
      case "ai_pac_bayes_bound": {
        const bounds = await getStatBounds();
        result = bounds.pacBayesBound({
          kl: Number(params.kl),
          n: Number(params.n),
          delta: Number(params.delta),
        });
        break;
      }
      case "ai_belief_set": {
        const belief = await getBeliefState();
        result = belief.set(
          String(params.id),
          params.distribution as Record<string, number>,
          params.description as string | undefined,
        );
        break;
      }
      case "ai_belief_update": {
        const belief = await getBeliefState();
        result = belief.update(
          String(params.id),
          params.likelihood as Record<string, number>,
        );
        break;
      }
      case "ai_belief_topk": {
        const belief = await getBeliefState();
        result = {
          id: String(params.id),
          topK: belief.topK(String(params.id), (params.k as number | undefined) ?? 3),
        };
        break;
      }
      case "ai_belief_entropy": {
        const belief = await getBeliefState();
        result = {
          id: String(params.id),
          entropy_bits: belief.entropy(String(params.id)),
        };
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // WIRE-MS0/U-WIRE09 — temporal projection + cognitive budget
      // ─────────────────────────────────────────────────────────────────────
      case "ai_temporal_record": {
        const temporal = await getTemporal();
        result = temporal.record(
          String(params.series),
          Number(params.value),
          params.at as string | undefined,
          params.note as string | undefined,
        );
        break;
      }
      case "ai_temporal_project": {
        const temporal = await getTemporal();
        const proj = temporal.project(
          String(params.series),
          (params.windowSize as number | undefined) ?? 10,
        );
        result = proj ?? { series: String(params.series), projection: null };
        break;
      }
      case "ai_temporal_forecast": {
        const temporal = await getTemporal();
        result = temporal.forecast(
          String(params.series),
          Number(params.target),
          (params.windowSize as number | undefined) ?? 10,
          params.nowIso as string | undefined,
        );
        break;
      }
      case "ai_cognitive_allocate": {
        const cognitive = await getCognitive();
        result = cognitive.allocate({
          kind: params.kind as "read" | "edit" | "create" | "refactor" | "review" | "analysis" | "chat",
          riskLevel: params.riskLevel as "low" | "medium" | "high" | "critical" | undefined,
          touchesCriticalFile: params.touchesCriticalFile as boolean | undefined,
          expectedDependents: params.expectedDependents as number | undefined,
          userUrgent: params.userUrgent as boolean | undefined,
          hasPreviousFailure: params.hasPreviousFailure as boolean | undefined,
          tokenEstimate: params.tokenEstimate as number | undefined,
        });
        break;
      }
      case "ai_cognitive_classify": {
        const cognitive = await getCognitive();
        result = {
          score: Number(params.score),
          depth: cognitive.classify(Number(params.score)),
        };
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // WIRE-MS0/U-WIRE10 — XAI explanations
      // ─────────────────────────────────────────────────────────────────────
      case "ai_explain": {
        const explainer = await getExplainer();
        result = explainer.explain({
          question: String(params.question),
          audience: params.audience as "machinist" | "engineer" | "manager" | "auditor" | undefined,
          maxWords: params.maxWords as number | undefined,
          context: (params.context ?? {}) as Parameters<typeof explainer.explain>[0]["context"],
        });
        break;
      }
      case "ai_explain_formula": {
        const explainer = await getExplainer();
        result = {
          formula: String(params.formula),
          audience: (params.audience as string | undefined) ?? "machinist",
          explanation: explainer.explainFormula(
            String(params.formula),
            params.audience as "machinist" | "engineer" | "manager" | "auditor" | undefined,
          ),
        };
        break;
      }
      case "ai_reading_level_label": {
        const explainer = await getExplainer();
        const grade = Number(params.grade);
        result = {
          grade,
          label: explainer.getReadingLevelLabel(grade),
        };
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // WIRE-MS0/U-WIRE11 — AI/ML deep-learning + capability orchestration
      // ─────────────────────────────────────────────────────────────────────
      case "ai_capability_metrics": {
        const eng = await getCapMaximizer();
        const metrics = eng.computeMetrics();
        const recs = eng.getEnhancementRecommendations();
        const out: Record<string, unknown> = { metrics, recommendations: recs };
        if (params.include_patterns) out.patterns = eng.getReasoningPatterns();
        if (params.include_sources) out.knowledgeSources = eng.getKnowledgeSources();
        if (params.area) {
          out.strategy = eng.getEnhancementStrategy(params.area as Parameters<typeof eng.getEnhancementStrategy>[0]);
        }
        result = out;
        break;
      }
      case "ai_intelligence_maximize": {
        const eng = await getIntelMaximizer();
        result = await eng.maximize({
          operation: params.operation as Parameters<typeof eng.maximize>[0]["operation"],
          material: params.material as string,
          tool: params.tool as Parameters<typeof eng.maximize>[0]["tool"],
          machine: params.machine as Parameters<typeof eng.maximize>[0]["machine"],
          feature: params.feature as Parameters<typeof eng.maximize>[0]["feature"],
          priority: params.priority as Parameters<typeof eng.maximize>[0]["priority"],
        });
        break;
      }
      case "ai_system_sync": {
        const eng = await getSysSync();
        const mode = params.mode as "status"|"sync_all"|"summary"|"synergize"|"recommend";
        switch (mode) {
          case "status":     result = eng.getStatus(); break;
          case "sync_all":   result = await eng.syncAll(); break;
          case "summary":    result = { summary: eng.getSummary() }; break;
          case "synergize":  result = eng.getSynergizedCapabilities(String(params.problem ?? "")); break;
          case "recommend":  result = eng.recommend(params.task as Parameters<typeof eng.recommend>[0]); break;
          default: { const _x: never = mode; throw new Error(`unknown mode ${_x}`); }
        }
        break;
      }
      case "ai_deep_knowledge_query": {
        const eng = await getDeepKnow();
        result = await eng.query({
          intent: params.intent as Parameters<typeof eng.query>[0]["intent"],
          domain: params.domain as string,
          context: (params.context as Record<string, unknown>) ?? {},
          history: params.history as string[] | undefined,
          preferences: params.preferences as Parameters<typeof eng.query>[0]["preferences"] | undefined,
        });
        break;
      }
      case "ai_resource_recommend": {
        const eng = await getResLearn();
        const mode = params.mode as "code_quality"|"material_params"|"speed_feed"|"okuma_pattern"|"hypermill_template"|"stats"|"training_data"|"coverage";
        switch (mode) {
          case "code_quality":
            result = eng.getCodeQualityRecommendations(
              String(params.task ?? ""),
              (params.language as "typescript"|"python"|"gcode"|"macro" | undefined) ?? "typescript",
            );
            break;
          case "material_params":
            result = { material: params.material, params: eng.getMaterialParameters(String(params.material ?? "")) };
            break;
          case "speed_feed":
            result = eng.getRecommendedSpeedFeed(
              String(params.material ?? ""),
              (params.operation as "roughing"|"finishing" | undefined) ?? "finishing",
            );
            break;
          case "okuma_pattern":
            result = { cycle: params.cycle, pattern: eng.getOkumaGCodePattern(String(params.cycle ?? "")) };
            break;
          case "hypermill_template":
            result = { template: params.template, code: eng.generateHyperMillTemplate(params.template as Parameters<typeof eng.generateHyperMillTemplate>[0]) };
            break;
          case "stats":
            result = eng.getStats() ?? { stats: null };
            break;
          case "training_data":
            result = eng.getAITrainingData();
            break;
          case "coverage":
            result = eng.getKnowledgeCoverage();
            break;
          default: { const _x: never = mode; throw new Error(`unknown mode ${_x}`); }
        }
        break;
      }
      case "ai_neural_route": {
        const eng = await getNeuralInteg();
        const mode = params.mode as "route"|"synthesize"|"commands"|"stats"|"summary";
        const q = String(params.query ?? "");
        switch (mode) {
          case "route":
            result = eng.route({
              input: q,
              context: params.context as Record<string, unknown> | undefined,
              intent: params.intent as string | undefined,
            });
            break;
          case "synthesize": result = eng.synthesize(q); break;
          case "commands":   result = { recommendations: eng.recommendCommands(q) }; break;
          case "stats":      result = eng.getLearningStats(); break;
          case "summary":    result = { summary: eng.getSummary() }; break;
          default: { const _x: never = mode; throw new Error(`unknown mode ${_x}`); }
        }
        break;
      }
      case "ai_active_learning_rank": {
        const eng = await getActiveLearn();
        const ranked = eng.rank(params.candidates as Parameters<typeof eng.rank>[0]);
        result = params.include_summary
          ? { ranked, summary: eng.summary(ranked) }
          : { ranked };
        break;
      }
      case "ai_peer_learning": {
        const eng = await getPeerLearn();
        const mode = params.mode as "broadcast"|"query"|"get"|"size"|"clear";
        switch (mode) {
          case "broadcast":
            result = eng.broadcast(params.insight as Parameters<typeof eng.broadcast>[0]);
            break;
          case "query":
            result = { insights: eng.query((params.query as Parameters<typeof eng.query>[0]) ?? {}) };
            break;
          case "get":
            result = { insight: eng.get(String(params.id ?? "")) };
            break;
          case "size":
            result = { size: eng.size() };
            break;
          case "clear":
            eng.clear();
            result = { cleared: true, size: eng.size() };
            break;
          default: { const _x: never = mode; throw new Error(`unknown mode ${_x}`); }
        }
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
    const slimmed = slimResponse(result, "L3");

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

// Backward-compat (esbuild fix 2026-04-25) — registers the prism_ai
// tool on a server that exposes a .tool(name, desc, schema, handler) API.
export function registerAIReasoningDispatcher(server: {
  tool: (name: string, description: string, schema: unknown, handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>) => void;
}): void {
  const def = aiReasoningDispatcherDef;
  server.tool(
    def.name,
    def.description,
    def.inputSchema,
    async (args) => aiReasoningDispatcher(args as { action: AIReasoningAction; params?: Record<string, unknown> }),
  );
}

