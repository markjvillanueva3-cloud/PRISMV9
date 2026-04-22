/**
 * PRISM MCP Server - Intelligence Dispatcher (Dispatcher #32)
 *
 * Core intelligence: ~50 actions for compound manufacturing intelligence.
 * 200+ actions deprecated — forwarded to focused sub-dispatchers (SYS-MS1):
 *   prism_product (40), prism_machine_live (40), prism_integration (42),
 *   prism_knowledge_ext (40), prism_diagnosis (38)
 *
 * @milestone SYS-MS1-U05
 */

import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { hookExecutor } from "../../engines/HookExecutor.js";
import { slimResponse, getCurrentPressurePct, getSlimLevel } from "../../utils/responseSlimmer.js";
import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
import { ACTION_INTELLIGENCE_SCHEMAS } from "../../schemas/intelligenceActionSchemas.js";
import { registryManager } from "../../registries/manager.js";
import { formatByLevel, type ResponseLevel } from "../../types/ResponseLevel.js";
import type { IntelligenceAction } from "../../engines/IntelligenceEngine.js";

/** Hook context shape varies by dispatcher — named alias avoids bare `as any` */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type HookContext = any;

// Core engine cache (lazy-loaded — only engines for core 49 actions)
let _intelligence: any, _jobLearning: any, _algorithmGateway: any, _shopScheduler: any,
    _intentEngine: any, _responseFormatter: any, _workflowChains: any, _onboardingEngine: any,
    _setupSheetEngine: any, _conversationalMemory: any, _userWorkflowSkills: any,
    _userAssistanceSkills: any;

async function getEngine(name: string): Promise<any> {
  switch (name) {
    case "intelligence":       return _intelligence ??= (await import("../../engines/IntelligenceEngine.js")).executeIntelligenceAction;
    case "jobLearning":        return _jobLearning ??= (await import("../../engines/JobLearningEngine.js")).jobLearning;
    case "algorithmGateway":   return _algorithmGateway ??= (await import("../../engines/AlgorithmGatewayEngine.js")).algorithmGateway;
    case "shopScheduler":      return _shopScheduler ??= (await import("../../engines/ShopSchedulerEngine.js")).shopScheduler;
    case "intentEngine":       return _intentEngine ??= (await import("../../engines/IntentDecompositionEngine.js")).intentEngine;
    case "responseFormatter":  return _responseFormatter ??= (await import("../../engines/ResponseFormatterEngine.js")).responseFormatter;
    case "workflowChains":     return _workflowChains ??= (await import("../../engines/WorkflowChainsEngine.js")).workflowChains;
    case "onboardingEngine":   return _onboardingEngine ??= (await import("../../engines/OnboardingEngine.js")).onboardingEngine;
    case "setupSheetEngine":   return _setupSheetEngine ??= (await import("../../engines/SetupSheetEngine.js")).setupSheetEngine;
    case "conversationalMemory": return _conversationalMemory ??= (await import("../../engines/ConversationalMemoryEngine.js")).conversationalMemory;
    case "userWorkflowSkills": return _userWorkflowSkills ??= (await import("../../engines/UserWorkflowSkillsEngine.js")).userWorkflowSkills;
    case "userAssistanceSkills": return _userAssistanceSkills ??= (await import("../../engines/UserAssistanceSkillsEngine.js")).userAssistanceSkills;
    default: throw new Error(`Unknown intelligence engine: ${name}`);
  }
}

// Deprecation forwarding — resolve moved actions to new dispatcher engines (dynamic import)
async function forwardToNewDispatcher(action: string, params: Record<string, any>): Promise<{ result: any; dispatcher: string } | null> {
  // Product (40 actions)
  if ((PRODUCT_FWD as readonly string[]).includes(action)) {
    const mod = await import("../../engines/ProductEngine.js");
    const engine = action.startsWith("sfc_") ? mod.productSFC
      : action.startsWith("ppg_") ? mod.productPPG
      : action.startsWith("shop_") ? mod.productShop : mod.productACNC;
    return { result: await engine(action, params), dispatcher: "prism_product" };
  }
  // Machine-live (40 actions)
  if ((MACHINE_LIVE_FWD as readonly string[]).includes(action)) {
    const L3_INLINE = ["tool_crib_status","digital_twin_state","predictive_maintenance_alert","energy_report"];
    if (L3_INLINE.includes(action)) {
      const { l3IndustryAction } = await import("./machineLiveDispatcher.js");
      return { result: l3IndustryAction(action, params), dispatcher: "prism_machine_live" };
    }
    const engine = action.startsWith("adaptive_")
      ? (await import("../../engines/AdaptiveControlEngine.js")).adaptiveControl
      : action.startsWith("maint_")
      ? (await import("../../engines/PredictiveMaintenanceEngine.js")).predictiveMaintenance
      : (await import("../../engines/MachineConnectivityEngine.js")).machineConnectivity;
    return { result: await engine(action, params), dispatcher: "prism_machine_live" };
  }
  // Integration (42 actions)
  if ((INTEGRATION_FWD as readonly string[]).includes(action)) {
    const engine = action.startsWith("cam_") ? (await import("../../engines/CAMIntegrationEngine.js")).camIntegration
      : action.startsWith("dnc_") ? (await import("../../engines/DNCTransferEngine.js")).dncTransfer
      : action.startsWith("erp_") ? (await import("../../engines/ERPIntegrationEngine.js")).erpIntegration
      : action.startsWith("mobile_") ? (await import("../../engines/MobileInterfaceEngine.js")).mobileInterface
      : (await import("../../engines/MeasurementIntegrationEngine.js")).measurementIntegration;
    return { result: await engine(action, params), dispatcher: "prism_integration" };
  }
  // Knowledge-ext (40 actions)
  if ((KNOWLEDGE_EXT_FWD as readonly string[]).includes(action)) {
    const engine = action.startsWith("apprentice_") ? (await import("../../engines/ApprenticeEngine.js")).apprenticeEngine
      : action.startsWith("genome_") ? (await import("../../engines/ManufacturingGenomeEngine.js")).manufacturingGenome
      : action.startsWith("graph_") ? (await import("../../engines/KnowledgeGraphEngine.js")).knowledgeGraph
      : (await import("../../engines/FederatedLearningEngine.js")).federatedLearning;
    return { result: await engine(action, params), dispatcher: "prism_knowledge_ext" };
  }
  // Diagnosis (38 actions)
  if ((DIAGNOSIS_FWD as readonly string[]).includes(action)) {
    const engine = action.startsWith("forensic_") ? (await import("../../engines/FailureForensicsEngine.js")).failureForensics
      : action.startsWith("inverse_") ? (await import("../../engines/InverseSolverEngine.js")).inverseSolver
      : action.startsWith("genplan_") ? (await import("../../engines/GenerativeProcessEngine.js")).generativeProcess
      : (await import("../../engines/SustainabilityEngine.js")).sustainabilityEngine;
    return { result: await engine(action, params), dispatcher: "prism_diagnosis" };
  }
  return null;
}

const ACTIONS = [
  "job_plan",
  "setup_sheet",
  "process_cost",
  "material_recommend",
  "tool_recommend",
  "machine_recommend",
  "what_if",
  "failure_diagnose",
  "parameter_optimize",
  "cycle_time_estimate",
  "quality_predict",
  "job_record",
  "job_insights",
  "algorithm_select",
  "machine_utilization",
  "decompose_intent",
  "format_response",
  "workflow_match",
  "workflow_get",
  "workflow_list",
  "onboarding_welcome",
  "onboarding_state",
  "onboarding_record",
  "onboarding_suggestion",
  "onboarding_reset",
  "setup_sheet_format",
  "setup_sheet_template",
  "skill_list",
  "skill_get",
  "skill_search",
  "skill_match",
  "skill_steps",
  "skill_for_persona",
  "conversation_context",
  "conversation_transition",
  "job_start",
  "job_update",
  "job_find",
  "job_resume",
  "job_complete",
  "job_list_recent",
  "assist_list",
  "assist_get",
  "assist_search",
  "assist_match",
  "assist_explain",
  "assist_confidence",
  "assist_mistakes",
  "assist_safety",
] as const;

// SYS-MS1: Forwarded action arrays — still accepted for backward compatibility
const PRODUCT_FWD = [
  "sfc_calculate", "sfc_compare", "sfc_optimize", "sfc_quick", "sfc_materials", "sfc_tools", "sfc_formulas", "sfc_safety", "sfc_history", "sfc_get",
  "ppg_validate", "ppg_translate", "ppg_templates", "ppg_generate", "ppg_controllers", "ppg_compare", "ppg_syntax", "ppg_batch", "ppg_history", "ppg_get",
  "shop_job", "shop_cost", "shop_quote", "shop_schedule", "shop_dashboard", "shop_report", "shop_compare", "shop_materials", "shop_history", "shop_get",
  "acnc_program", "acnc_feature", "acnc_simulate", "acnc_output", "acnc_tools", "acnc_strategy", "acnc_validate", "acnc_batch", "acnc_history", "acnc_get",
] as const;

const MACHINE_LIVE_FWD = [
  "machine_register", "machine_unregister", "machine_list", "machine_connect", "machine_disconnect",
  "machine_live_status", "machine_all_status", "machine_ingest", "chatter_detect_live",
  "tool_wear_start", "tool_wear_update", "tool_wear_status", "thermal_update", "thermal_status",
  "alert_acknowledge", "alert_history",
  "adaptive_chipload", "adaptive_chatter", "adaptive_wear", "adaptive_thermal", "adaptive_override",
  "adaptive_status", "adaptive_config", "adaptive_log", "adaptive_history", "adaptive_get",
  "maint_analyze", "maint_trend", "maint_predict", "maint_schedule", "maint_models",
  "maint_thresholds", "maint_alerts", "maint_status", "maint_history", "maint_get",
  "tool_crib_status", "digital_twin_state", "predictive_maintenance_alert", "energy_report",
] as const;

const INTEGRATION_FWD = [
  "cam_recommend", "cam_export", "cam_analyze_op", "cam_tool_library", "cam_tool_get", "cam_systems",
  "dnc_generate", "dnc_send", "dnc_compare", "dnc_verify", "dnc_qr", "dnc_systems", "dnc_history", "dnc_get",
  "erp_import_wo", "erp_get_plan", "erp_cost_feedback", "erp_cost_history", "erp_quality_import",
  "erp_quality_history", "erp_tool_inventory", "erp_tool_update", "erp_systems", "erp_wo_list",
  "mobile_lookup", "mobile_voice", "mobile_alarm", "mobile_timer_start", "mobile_timer_check",
  "mobile_timer_reset", "mobile_timer_list", "mobile_cache",
  "measure_cmm_import", "measure_cmm_history", "measure_cmm_get", "measure_surface",
  "measure_surface_history", "measure_probe_record", "measure_probe_drift",
  "measure_probe_history", "measure_bias_detect", "measure_summary",
] as const;

const KNOWLEDGE_EXT_FWD = [
  "apprentice_explain", "apprentice_lesson", "apprentice_lessons", "apprentice_assess",
  "apprentice_capture", "apprentice_knowledge", "apprentice_challenge", "apprentice_materials",
  "apprentice_history", "apprentice_get",
  "genome_lookup", "genome_predict", "genome_similar", "genome_compare", "genome_list",
  "genome_fingerprint", "genome_behavioral", "genome_search", "genome_history", "genome_get",
  "graph_query", "graph_infer", "graph_discover", "graph_predict", "graph_traverse",
  "graph_add", "graph_search", "graph_stats", "graph_history", "graph_get",
  "learn_contribute", "learn_query", "learn_aggregate", "learn_anonymize", "learn_network_stats",
  "learn_opt_control", "learn_correction", "learn_transparency", "learn_history", "learn_get",
] as const;

const DIAGNOSIS_FWD = [
  "forensic_tool_autopsy", "forensic_chip_analysis", "forensic_surface_defect", "forensic_crash",
  "forensic_failure_modes", "forensic_chip_types", "forensic_surface_types", "forensic_crash_types",
  "forensic_history", "forensic_get",
  "inverse_solve", "inverse_surface", "inverse_tool_life", "inverse_dimensional",
  "inverse_chatter", "inverse_troubleshoot", "inverse_history", "inverse_get",
  "genplan_plan", "genplan_features", "genplan_setups", "genplan_operations", "genplan_optimize",
  "genplan_tools", "genplan_cycle", "genplan_cost", "genplan_risk", "genplan_get",
  "sustain_optimize", "sustain_compare", "sustain_energy", "sustain_carbon", "sustain_coolant",
  "sustain_nearnet", "sustain_report", "sustain_materials", "sustain_history", "sustain_get",
] as const;

// Combined: core + all forwarded for z.enum (backward compatibility)
const ALL_ACTIONS = [
  ...ACTIONS, ...PRODUCT_FWD, ...MACHINE_LIVE_FWD,
  ...INTEGRATION_FWD, ...KNOWLEDGE_EXT_FWD, ...DIAGNOSIS_FWD,
] as const;

/**
 * Extract key values from intelligence action results for summary/slim responses.
 *
 * IMPORTANT: Field paths here MUST match the actual return shapes from
 * IntelligenceEngine.ts. If you change engine output shapes, update this too.
 * Last verified: 2026-02-22 (all 11 actions).
 */
function intelligenceExtractKeyValues(action: string, result: any): Record<string, any> {
  if (!result || typeof result !== "object") return { value: result };
  switch (action) {
    case "job_plan":
      return {
        material: result.material?.name,
        iso_group: result.material?.iso_group,
        operations: result.operations?.length,
        cycle_time_min: result.cycle_time?.total_min,
        stable: result.stability?.is_stable,
        critical_depth_mm: result.stability?.critical_depth_mm,
        confidence: result.confidence,
        safety_passed: result.safety?.all_checks_passed,
      };
    case "setup_sheet":
      return {
        material: result.header?.material,
        operations: result.operations?.length,
        tools: result.tools?.length,
        format: result.format,
      };
    case "process_cost":
      return {
        total_cost: result.total_cost_per_part,
        machine_cost: result.machine_cost,
        tool_cost: result.tool_cost_per_part,
        cycle_time_min: result.cycle_time_min,
      };
    case "material_recommend":
      return {
        candidates: result.candidates?.length,
        top_pick: result.candidates?.[0]?.name,
        top_score: result.candidates?.[0]?.score,
      };
    case "tool_recommend":
      return {
        candidates: result.candidates?.length,
        top_pick: result.candidates?.[0]?.name ?? result.candidates?.[0]?.id,
        top_score: result.candidates?.[0]?.score,
      };
    case "machine_recommend":
      return {
        candidates: result.candidates?.length,
        top_pick: result.candidates?.[0]?.name ?? result.candidates?.[0]?.model,
        utilization: result.candidates?.[0]?.utilization_pct,
      };
    case "what_if":
      return {
        material: result.material,
        baseline_Vc: result.baseline?.cutting_speed,
        scenario_Vc: result.scenario?.cutting_speed,
        force_delta_pct: result.deltas?.cutting_force_N?.percent,
        life_delta_pct: result.deltas?.tool_life_min?.percent,
        mrr_delta_pct: result.deltas?.mrr_cm3_min?.percent,
        insights: result.insights?.length,
      };
    case "failure_diagnose":
      return {
        symptoms: result.symptoms_analyzed?.length,
        top_diagnosis: result.diagnoses?.[0]?.name,
        top_relevance: result.diagnoses?.[0]?.relevance,
        severity: result.diagnoses?.[0]?.severity,
        diagnoses_count: result.diagnoses?.length,
        has_alarm: !!result.alarm,
        alarm_code: result.alarm?.code,
        alarm_name: result.alarm?.name,
        has_physics_check: !!result.physics_cross_check,
      };
    case "parameter_optimize":
      return {
        material: result.material,
        optimal_Vc: result.optimal_parameters?.cutting_speed,
        optimal_fz: result.optimal_parameters?.feed_per_tooth,
        optimal_ap: result.optimal_parameters?.axial_depth,
        mrr: result.predicted_outcomes?.mrr,
        surface_finish: result.predicted_outcomes?.surface_finish,
        tool_life: result.predicted_outcomes?.tool_life,
        min_cost_speed: result.minimum_cost_speed,
      };
    case "cycle_time_estimate":
      return {
        total_min: result.total_time_min,
        cutting_min: result.cutting_time_min,
        rapid_min: result.rapid_time_min,
        operations: result.operations?.length,
        utilization_pct: result.utilization_percent,
      };
    case "quality_predict":
      return {
        Ra: result.surface_finish?.Ra,
        Rz: result.surface_finish?.Rz,
        deflection_mm: result.deflection?.max_deflection_mm,
        temperature_C: result.thermal?.max_temperature_C,
        tolerance_grade: result.achievable_tolerance?.grade,
        tolerance_um: result.achievable_tolerance?.tolerance_um,
        force_N: result.cutting_force_N,
      };
    case "job_record":
      return {
        id: result.id,
        stored: result.stored,
        total_jobs_for_key: result.total_jobs_for_key,
        learning_available: result.learning_available,
        safety_score: result.safety?.score,
      };
    case "job_insights":
      return {
        sample_size: result.sample_size,
        patterns_count: result.patterns?.length,
        adjustments_count: result.parameter_adjustments?.length,
        top_finding: result.patterns?.[0]?.finding,
        failures: result.failure_analysis?.total_failures,
        safety_score: result.safety?.score,
      };
    case "algorithm_select":
      return {
        algorithm: result.selected_algorithm,
        course: result.source_course,
        alternatives: result.alternatives?.length,
        safety_score: result.safety?.score,
      };
    case "machine_utilization":
      return {
        total_machines: result.fleet_summary?.total_machines,
        avg_utilization: result.fleet_summary?.avg_utilization_pct,
        overloaded: result.fleet_summary?.overloaded_count,
        underutilized: result.fleet_summary?.underutilized_count,
        recommendations: result.recommendations?.length,
        capability_gaps: result.capability_gaps?.length,
        safety_score: result.safety?.score,
      };
    case "decompose_intent":
      return {
        material: result.entities?.material,
        machine: result.entities?.machine,
        operation: result.entities?.operation,
        persona: result.persona,
        confidence: result.confidence,
        plan_steps: result.plan?.length,
        ambiguities: result.ambiguities?.length,
        safety_score: result.safety?.score,
      };
    case "format_response":
      return {
        persona: result.persona,
        units: result.units,
        section_count: result.section_count,
      };
    case "workflow_match":
      return {
        total_matches: result.total_matches,
        best_id: result.best?.workflow_id,
        best_name: result.best?.name,
        best_confidence: result.best?.confidence,
      };
    case "workflow_get":
      return {
        id: result.id,
        name: result.name,
        steps: result.estimated_steps,
        persona: result.persona,
      };
    case "workflow_list":
      return {
        total: result.total,
      };
    case "onboarding_welcome":
      return {
        has_greeting: !!result.greeting,
        suggestions: result.suggestions?.length,
      };
    case "onboarding_state":
    case "onboarding_record":
      return {
        interaction_count: result.interaction_count,
        disclosure_level: result.disclosure_level,
        has_suggestion: !!result.suggestion,
      };
    case "onboarding_suggestion":
      return {
        level: result.level,
        has_message: !!result.message,
      };
    case "onboarding_reset":
      return { reset: result.reset };
    case "setup_sheet_format":
      return {
        job_id: result.header?.job_id,
        format: result.format,
        operations: result.operations?.length,
        tools: result.tools?.length,
        cycle_time_min: result.summary?.total_cycle_time_min,
        part_cost: result.summary?.estimated_part_cost_usd,
      };
    case "setup_sheet_template":
      return { format: result.format, has_template: !!result.template };
    case "conversation_context":
      return {
        state: result.current_state,
        has_active_job: !!result.active_job,
        recent_jobs: result.recent_jobs?.length,
        verbosity: result.response_style?.verbosity,
      };
    case "conversation_transition":
      return {
        state: result.current_state,
        transition_detected: result.transition_detected,
        from: result.from,
        to: result.to,
      };
    case "job_start":
    case "job_update":
    case "job_resume":
    case "job_complete":
      return {
        id: result.id,
        state: result.state,
        material: result.material,
        machine: result.machine,
        tools: result.tools?.length,
        operations: result.operations?.length,
      };
    case "job_find":
      return {
        found: result.id !== undefined,
        id: result.id,
        material: result.material,
      };
    case "job_list_recent":
      return { count: result.recent?.length };
    case "skill_list":
      return { total: result.total };
    case "skill_get":
      return { id: result.id, name: result.name, category: result.category, steps: result.estimated_steps };
    case "skill_search":
      return { query: result.query, total: result.total };
    case "skill_match":
      return { matched: result.matched, skill_id: result.skill_id, confidence: result.confidence };
    case "skill_steps":
      return { skill_id: result.skill_id, step_count: result.steps?.length };
    case "skill_for_persona":
      return { skill_id: result.skill_id, persona: result.persona, detail_level: result.detail_level };
    case "assist_list":
      return { total: result.total };
    case "assist_get":
      return { id: result.id, name: result.name, category: result.category };
    case "assist_search":
      return { query: result.query, total: result.total };
    case "assist_match":
      return { matched: result.matched, skill_id: result.skill_id, confidence: result.confidence };
    case "assist_explain":
      return { parameter: result.parameter, simplified: result.simplified };
    case "assist_confidence":
      return { overall: result.overall_confidence, grade: result.data_quality };
    case "assist_mistakes":
      return { count: result.count };
    case "assist_safety":
      return { grade: result.grade, risk_count: result.risk_factors?.length };
    // SYS-MS1-U05: Moved action extractors removed — now in sub-dispatchers
    // (prism_product, prism_machine_live, prism_integration, prism_knowledge_ext, prism_diagnosis)
    // Deprecated actions fall through to default — extractors live in sub-dispatchers
    default:
      return result;
  }
}

/** Registers intelligence dispatcher.
 * @param server - MCP server instance
  * @returns void
 */
export function registerIntelligenceDispatcher(server: any): void {
  server.tool(
    "prism_intelligence",
    "Manufacturing intelligence: job planning, setup sheets, costing, recommendations, what-if, diagnosis, optimization, scheduling. Use 'action' param.",
    {
      action: z.enum(ALL_ACTIONS),
      params: z.record(z.string(), z.any()).optional(),
    },
    async ({ action, params: rawParams = {} }: { action: string; params?: Record<string, any> }) => {
      log.info(`[prism_intelligence] Action: ${action}`);

      // Ensure registries are initialized
      await registryManager.initialize();

      // Normalize common parameter aliases
      const params: Record<string, any> = { ...rawParams };
      if (params.material_name !== undefined && params.material === undefined) params.material = params.material_name;
      if (params.machine_name !== undefined && params.machine_id === undefined) params.machine_id = params.machine_name;
      if (params.tool_name !== undefined && params.tool_id === undefined) params.tool_id = params.tool_name;
      if (params.depth !== undefined && params.dimensions === undefined) {
        params.dimensions = { depth: params.depth, width: params.width, length: params.length };
      }

      try {
        // H1-MS2: Auto-normalize snake_case → camelCase params
        try {
          const { normalizeParams } = await import("../../utils/paramNormalizer.js");
          Object.assign(params, normalizeParams(params));
        } catch { /* normalizer not available */ }

        // SYS-MS6: Validate params against per-action Zod schema
        const validation = validateActionParams(action, params, ACTION_INTELLIGENCE_SCHEMAS);
        if (!validation.valid) {
          return dispatcherError(
            `Invalid params for '${action}': ${validation.errorMessage}`,
            action,
            "prism_intelligence"
          );
        }

        // === PRE-INTELLIGENCE HOOKS ===
        const hookCtx = {
          operation: action,
          target: { type: "intelligence" as const, id: action, data: params },
          metadata: { dispatcher: "intelligenceDispatcher", action, params },
        };

        const preResult = await hookExecutor.execute("pre-calculation", hookCtx as HookContext);
        if (preResult.blocked) {
          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify({
                blocked: true,
                blocker: preResult.blockedBy,
                reason: preResult.summary,
                action,
              }),
            }],
          };
        }

        // === CHECK DEPRECATION FORWARDING (SYS-MS1) ===
        const forwarded = await forwardToNewDispatcher(action, params);
        if (forwarded) {
          log.warn(`[prism_intelligence] DEPRECATED: '${action}' moved to ${forwarded.dispatcher}. Use ${forwarded.dispatcher} instead.`);
          await hookExecutor.execute("post-calculation", {
            ...hookCtx,
            target: { ...hookCtx.target, data: { ...params, result: forwarded.result } },
          } as HookContext);
          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify({
                action, ...forwarded.result,
                _deprecation: `Action '${action}' has moved to ${forwarded.dispatcher}. Please use ${forwarded.dispatcher} directly.`,
              }),
            }],
          };
        }

        // === EXECUTE CORE ACTION ===
        const CORE_ROUTING: Record<string, string> = {
          job_record: "jobLearning", job_insights: "jobLearning",
          algorithm_select: "algorithmGateway",
          machine_utilization: "shopScheduler",
          decompose_intent: "intentEngine",
          format_response: "responseFormatter",
          workflow_match: "workflowChains", workflow_get: "workflowChains", workflow_list: "workflowChains",
          onboarding_welcome: "onboardingEngine", onboarding_state: "onboardingEngine",
          onboarding_record: "onboardingEngine", onboarding_suggestion: "onboardingEngine", onboarding_reset: "onboardingEngine",
          setup_sheet_format: "setupSheetEngine", setup_sheet_template: "setupSheetEngine",
          conversation_context: "conversationalMemory", conversation_transition: "conversationalMemory",
          job_start: "conversationalMemory", job_update: "conversationalMemory", job_find: "conversationalMemory",
          job_resume: "conversationalMemory", job_complete: "conversationalMemory", job_list_recent: "conversationalMemory",
          skill_list: "userWorkflowSkills", skill_get: "userWorkflowSkills", skill_search: "userWorkflowSkills",
          skill_match: "userWorkflowSkills", skill_steps: "userWorkflowSkills", skill_for_persona: "userWorkflowSkills",
          assist_list: "userAssistanceSkills", assist_get: "userAssistanceSkills", assist_search: "userAssistanceSkills",
          assist_match: "userAssistanceSkills", assist_explain: "userAssistanceSkills", assist_confidence: "userAssistanceSkills",
          assist_mistakes: "userAssistanceSkills", assist_safety: "userAssistanceSkills",
        };

        const engineName = CORE_ROUTING[action];
        const result = engineName
          ? await (await getEngine(engineName))(action, params)
          : await (await getEngine("intelligence"))(action as IntelligenceAction, params);

        // === POST-INTELLIGENCE HOOKS ===
        await hookExecutor.execute("post-calculation", {
          ...hookCtx,
          target: { ...hookCtx.target, data: { ...params, result } },
        } as HookContext);

        // === RESPONSE FORMATTING ===
        // Support response_level parameter
        if (params.response_level) {
          const formatted = formatByLevel(
            result,
            params.response_level as ResponseLevel,
            (r: any) => intelligenceExtractKeyValues(action, r)
          );
          return {
            content: [{ type: "text" as const, text: JSON.stringify(formatted) }],
          };
        }

        // Apply context-pressure-aware slimming
        const pressure = getCurrentPressurePct();
        if (pressure > 50) {
          const slimLevel = getSlimLevel(pressure);
          const keyValues = intelligenceExtractKeyValues(action, result);
          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify(slimResponse(
                { action, ...result, _keyValues: keyValues },
                slimLevel
              )),
            }],
          };
        }

        return {
          content: [{ type: "text" as const, text: JSON.stringify({ action, ...result }) }],
        };
      } catch (err: any) {
        log.error(`[prism_intelligence] ${action} failed: ${err.message}`);
        return dispatcherError(err, action, "prism_intelligence");
      }
    }
  );
}
