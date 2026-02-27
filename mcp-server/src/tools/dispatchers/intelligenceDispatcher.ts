/**
 * PRISM MCP Server - Intelligence Dispatcher (Dispatcher #32)
 *
 * Routes 11 compound intelligence actions to IntelligenceEngine.
 * These actions compose calibrated physics engines + registry lookups
 * into high-level answers to manufacturing questions.
 *
 * Actions:
 *   job_plan, setup_sheet, process_cost, material_recommend,
 *   tool_recommend, machine_recommend, what_if, failure_diagnose,
 *   parameter_optimize, cycle_time_estimate, quality_predict
 */

import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { hookExecutor } from "../../engines/HookExecutor.js";
import { slimResponse, getCurrentPressurePct, getSlimLevel } from "../../utils/responseSlimmer.js";
import { registryManager } from "../../registries/manager.js";
import { executeIntelligenceAction, INTELLIGENCE_ACTIONS, type IntelligenceAction } from "../../engines/IntelligenceEngine.js";
import { jobLearning } from "../../engines/JobLearningEngine.js";
import { algorithmGateway } from "../../engines/AlgorithmGatewayEngine.js";
import { shopScheduler } from "../../engines/ShopSchedulerEngine.js";
import { intentEngine } from "../../engines/IntentDecompositionEngine.js";
import { responseFormatter } from "../../engines/ResponseFormatterEngine.js";
import { workflowChains } from "../../engines/WorkflowChainsEngine.js";
import { onboardingEngine } from "../../engines/OnboardingEngine.js";
import { setupSheetEngine } from "../../engines/SetupSheetEngine.js";
import { conversationalMemory } from "../../engines/ConversationalMemoryEngine.js";
import { userWorkflowSkills } from "../../engines/UserWorkflowSkillsEngine.js";
import { userAssistanceSkills } from "../../engines/UserAssistanceSkillsEngine.js";
import { machineConnectivity } from "../../engines/MachineConnectivityEngine.js";
import { camIntegration } from "../../engines/CAMIntegrationEngine.js";
import { dncTransfer } from "../../engines/DNCTransferEngine.js";
import { mobileInterface } from "../../engines/MobileInterfaceEngine.js";
import { erpIntegration } from "../../engines/ERPIntegrationEngine.js";
import { measurementIntegration } from "../../engines/MeasurementIntegrationEngine.js";
import { inverseSolver } from "../../engines/InverseSolverEngine.js";
import { failureForensics } from "../../engines/FailureForensicsEngine.js";
import { apprenticeEngine } from "../../engines/ApprenticeEngine.js";
import { manufacturingGenome } from "../../engines/ManufacturingGenomeEngine.js";
import { predictiveMaintenance } from "../../engines/PredictiveMaintenanceEngine.js";
import { sustainabilityEngine } from "../../engines/SustainabilityEngine.js";
import { generativeProcess } from "../../engines/GenerativeProcessEngine.js";
import { knowledgeGraph } from "../../engines/KnowledgeGraphEngine.js";
import { federatedLearning } from "../../engines/FederatedLearningEngine.js";
import { adaptiveControl } from "../../engines/AdaptiveControlEngine.js";
import { productSFC, productPPG, productShop, productACNC } from "../../engines/ProductEngine.js";
import { formatByLevel, type ResponseLevel } from "../../types/ResponseLevel.js";

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
  "shop_schedule",
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
  "machine_register",
  "machine_unregister",
  "machine_list",
  "machine_connect",
  "machine_disconnect",
  "machine_live_status",
  "machine_all_status",
  "machine_ingest",
  "chatter_detect_live",
  "tool_wear_start",
  "tool_wear_update",
  "tool_wear_status",
  "thermal_update",
  "thermal_status",
  "alert_acknowledge",
  "alert_history",
  "cam_recommend",
  "cam_export",
  "cam_analyze_op",
  "cam_tool_library",
  "cam_tool_get",
  "cam_systems",
  "dnc_generate",
  "dnc_send",
  "dnc_compare",
  "dnc_verify",
  "dnc_qr",
  "dnc_systems",
  "dnc_history",
  "dnc_get",
  "mobile_lookup",
  "mobile_voice",
  "mobile_alarm",
  "mobile_timer_start",
  "mobile_timer_check",
  "mobile_timer_reset",
  "mobile_timer_list",
  "mobile_cache",
  "erp_import_wo",
  "erp_get_plan",
  "erp_cost_feedback",
  "erp_cost_history",
  "erp_quality_import",
  "erp_quality_history",
  "erp_tool_inventory",
  "erp_tool_update",
  "erp_systems",
  "erp_wo_list",
  "measure_cmm_import",
  "measure_cmm_history",
  "measure_cmm_get",
  "measure_surface",
  "measure_surface_history",
  "measure_probe_record",
  "measure_probe_drift",
  "measure_probe_history",
  "measure_bias_detect",
  "measure_summary",
  "inverse_solve",
  "inverse_surface",
  "inverse_tool_life",
  "inverse_dimensional",
  "inverse_chatter",
  "inverse_troubleshoot",
  "inverse_history",
  "inverse_get",
  "forensic_tool_autopsy",
  "forensic_chip_analysis",
  "forensic_surface_defect",
  "forensic_crash",
  "forensic_failure_modes",
  "forensic_chip_types",
  "forensic_surface_types",
  "forensic_crash_types",
  "forensic_history",
  "forensic_get",
  "apprentice_explain",
  "apprentice_lesson",
  "apprentice_lessons",
  "apprentice_assess",
  "apprentice_capture",
  "apprentice_knowledge",
  "apprentice_challenge",
  "apprentice_materials",
  "apprentice_history",
  "apprentice_get",
  "genome_lookup",
  "genome_predict",
  "genome_similar",
  "genome_compare",
  "genome_list",
  "genome_fingerprint",
  "genome_behavioral",
  "genome_search",
  "genome_history",
  "genome_get",
  "maint_analyze",
  "maint_trend",
  "maint_predict",
  "maint_schedule",
  "maint_models",
  "maint_thresholds",
  "maint_alerts",
  "maint_status",
  "maint_history",
  "maint_get",
  "sustain_optimize",
  "sustain_compare",
  "sustain_energy",
  "sustain_carbon",
  "sustain_coolant",
  "sustain_nearnet",
  "sustain_report",
  "sustain_materials",
  "sustain_history",
  "sustain_get",
  "genplan_plan",
  "genplan_features",
  "genplan_setups",
  "genplan_operations",
  "genplan_optimize",
  "genplan_tools",
  "genplan_cycle",
  "genplan_cost",
  "genplan_risk",
  "genplan_get",
  "graph_query",
  "graph_infer",
  "graph_discover",
  "graph_predict",
  "graph_traverse",
  "graph_add",
  "graph_search",
  "graph_stats",
  "graph_history",
  "graph_get",
  "learn_contribute",
  "learn_query",
  "learn_aggregate",
  "learn_anonymize",
  "learn_network_stats",
  "learn_opt_control",
  "learn_correction",
  "learn_transparency",
  "learn_history",
  "learn_get",
  "adaptive_chipload",
  "adaptive_chatter",
  "adaptive_wear",
  "adaptive_thermal",
  "adaptive_override",
  "adaptive_status",
  "adaptive_config",
  "adaptive_log",
  "adaptive_history",
  "adaptive_get",
  "sfc_calculate",
  "sfc_compare",
  "sfc_optimize",
  "sfc_quick",
  "sfc_materials",
  "sfc_tools",
  "sfc_formulas",
  "sfc_safety",
  "sfc_history",
  "sfc_get",
  // PPG — R11-MS1 Post Processor Generator
  "ppg_validate",
  "ppg_translate",
  "ppg_templates",
  "ppg_generate",
  "ppg_controllers",
  "ppg_compare",
  "ppg_syntax",
  "ppg_batch",
  "ppg_history",
  "ppg_get",
  // Shop Manager — R11-MS2
  "shop_job",
  "shop_cost",
  "shop_quote",
  "shop_schedule",
  "shop_dashboard",
  "shop_report",
  "shop_compare",
  "shop_materials",
  "shop_history",
  "shop_get",
  // ACNC (R11-MS3)
  "acnc_program",
  "acnc_feature",
  "acnc_simulate",
  "acnc_output",
  "acnc_tools",
  "acnc_strategy",
  "acnc_validate",
  "acnc_batch",
  "acnc_history",
  "acnc_get",
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
    case "shop_schedule":
      return {
        makespan_min: result.metrics?.total_makespan_min,
        avg_utilization: result.metrics?.average_utilization_pct,
        jobs_on_time: result.metrics?.jobs_on_time,
        jobs_late: result.metrics?.jobs_late,
        bottlenecks: result.bottlenecks?.length,
        unscheduled: result.unscheduled?.length,
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
    case "machine_register":
      return { id: result.id, name: result.name, protocol: result.protocol };
    case "machine_list":
      return { total: result.total };
    case "machine_live_status":
      return { id: result.machine?.id, state: result.current?.state, connected: result.connected };
    case "machine_all_status":
      return { count: result.machines?.length };
    case "chatter_detect_live":
      return { detected: result.chatter_detected, severity: result.severity, rpm: result.current_rpm };
    case "tool_wear_status":
    case "tool_wear_update":
      return { tool: result.tool_id, remaining: result.predicted_remaining_life_min, rate: result.wear_rate };
    case "thermal_status":
    case "thermal_update":
      return { drift_mm: result.estimated_z_drift_mm, stable: result.compensation_active };
    case "cam_recommend":
      return { operation: result.operation, rpm: result.recommended?.rpm, feed: result.recommended?.feed_mmmin };
    case "cam_export":
      return { format: result.format, system: result.target_system };
    case "cam_analyze_op":
      return { match: result.match_pct, issues: result.issues?.length };
    case "cam_tool_library":
      return { total: result.total };
    case "cam_tool_get":
      return { id: result.id, type: result.type, diameter: result.diameter_mm };
    case "cam_systems":
      return { count: result.systems?.length };
    case "dnc_generate":
      return { program: result.program_number, rpm: result.parameters?.rpm, feed: result.parameters?.feed_mmmin };
    case "dnc_send":
    case "dnc_compare":
    case "dnc_verify":
      return { id: result.transfer_id, status: result.status, program: result.program_number };
    case "dnc_qr":
      return { bytes: result.byte_size, fits_qr: result.fits_standard_qr };
    case "dnc_systems":
      return { count: result.total };
    case "dnc_history":
      return { total: result.total };
    case "dnc_get":
      return { id: result.transfer_id, status: result.status };
    case "mobile_lookup":
      return { rpm: result.rpm, feed_ipm: result.feed_ipm, status: result.display?.status_color };
    case "mobile_voice":
      return { interpreted: result.interpreted, confidence: result.confidence, rpm: result.parameters?.rpm };
    case "mobile_alarm":
      return { code: result.code, severity: result.severity, downtime_min: result.estimated_downtime_min };
    case "mobile_timer_start":
    case "mobile_timer_check":
    case "mobile_timer_reset":
      return { id: result.timer_id, state: result.state, remaining: result.remaining_min };
    case "mobile_timer_list":
      return { total: result.total };
    case "mobile_cache":
      return { entries: result.entries?.length, bytes: result.total_bytes };
    case "erp_import_wo":
      return { wo: result.wo_number, cycle_min: result.total_cycle_time_min, cost: result.estimated_cost?.total };
    case "erp_get_plan":
      return { wo: result.wo_number, steps: result.routing?.length, cost: result.estimated_cost?.total };
    case "erp_cost_feedback":
      return { wo: result.wo_number, variance_pct: result.variance?.total_pct };
    case "erp_cost_history":
      return { total: result.total, avg_variance: result.avg_variance_pct };
    case "erp_quality_import":
      return { wo: result.wo_number, pass: result.pass, out_of_spec: result.analysis?.out_of_spec };
    case "erp_quality_history":
      return { total: result.total, pass_rate: result.pass_rate };
    case "erp_tool_inventory":
      return { total: result.total, need_reorder: result.need_reorder };
    case "erp_tool_update":
      return { id: result.tool_id, available: result.available };
    case "erp_systems":
      return { count: result.total };
    case "erp_wo_list":
      return { total: result.total };
    case "measure_cmm_import":
      return { id: result.report_id, pass: result.summary?.pass, features: result.summary?.total_features, cpk: result.summary?.cpk_estimate };
    case "measure_cmm_history":
      return { total: result.total, pass_rate: result.pass_rate };
    case "measure_cmm_get":
      return { id: result.report_id, pass: result.summary?.pass };
    case "measure_surface":
      return { id: result.measurement_id, accuracy: result.model_accuracy, ra_error: result.ra_error_pct };
    case "measure_surface_history":
      return { total: result.total, avg_ra_error: result.avg_ra_error_pct };
    case "measure_probe_record":
      return { id: result.probe_id, deviation: result.deviation };
    case "measure_probe_drift":
      return { direction: result.direction, rate: result.rate_um_per_part, action: result.action };
    case "measure_probe_history":
      return { total: result.total, machine: result.machine, feature: result.feature };
    case "measure_bias_detect":
      return { biases: result.biases?.length, machine: result.machine };
    case "measure_summary":
      return { health: result.overall_health, cmm_reports: result.cmm?.reports, probe_features: result.probing?.features_tracked };
    case "inverse_solve":
    case "inverse_surface":
    case "inverse_tool_life":
    case "inverse_dimensional":
    case "inverse_chatter":
    case "inverse_troubleshoot":
      return { id: result.problem_id, type: result.problem_type, primary_cause: result.primary_cause, fix: result.recommended_fix, confidence: result.confidence };
    case "inverse_history":
      return { total: result.total, by_type: result.by_type };
    case "inverse_get":
      return { id: result.problem_id, type: result.problem_type, primary_cause: result.primary_cause };
    case "forensic_tool_autopsy":
    case "forensic_chip_analysis":
    case "forensic_surface_defect":
    case "forensic_crash":
      return { id: result.diagnosis_id, category: result.category, mode: result.failure_mode, severity: result.severity, actions: result.corrective_actions?.length };
    case "forensic_failure_modes":
    case "forensic_chip_types":
    case "forensic_surface_types":
    case "forensic_crash_types":
      return { total: result.total };
    case "forensic_history":
      return { total: result.total, by_category: result.by_category };
    case "forensic_get":
      return { id: result.diagnosis_id, category: result.category, mode: result.failure_mode };
    case "apprentice_explain":
      return { parameter: result.parameter, value: result.value, depth: result.depth, factors: result.factors?.length };
    case "apprentice_lesson":
      return { id: result.id ?? result.total, title: result.title, track: result.track };
    case "apprentice_lessons":
      return { total: result.total };
    case "apprentice_assess":
      return { id: result.assessment_id, level: result.level, score: result.total_score, gaps: result.gaps?.length };
    case "apprentice_capture":
      return { id: result.knowledge_id, confidence: result.confidence, material: result.material };
    case "apprentice_knowledge":
      return { total: result.total, by_confidence: result.by_confidence };
    case "apprentice_challenge":
      return { id: result.challenge_id, total: result.total, difficulty: result.difficulty };
    case "apprentice_materials":
      return { name: result.name, total: result.total };
    case "apprentice_history":
      return { total: result.total, knowledge: result.knowledge_entries };
    case "apprentice_get":
      return { id: result.assessment_id, level: result.level, score: result.total_score };
    case "genome_lookup":
      return { id: result.genome_id, material: result.material_name, iso_group: result.iso_group, family: result.family };
    case "genome_predict":
      return { id: result.prediction_id, material: result.material, vc: result.recommended_vc, fz: result.recommended_fz, confidence: result.confidence_pct };
    case "genome_similar":
      return { query: result.query_material, total: result.total };
    case "genome_compare":
      return { a: result.a?.material, b: result.b?.material, easier: result.easier_to_machine };
    case "genome_list":
      return { total: result.total };
    case "genome_fingerprint":
      return { id: result.genome_id, material: result.material };
    case "genome_behavioral":
      return { id: result.genome_id, material: result.material, jobs: result.jobs_recorded };
    case "genome_search":
      return { total: result.total };
    case "genome_history":
      return { total: result.total };
    case "genome_get":
      return { id: result.prediction_id, material: result.material };
    case "maint_analyze":
      return { machine: result.machine_id, categories: result.analyzed_categories, alerts: result.alerts_generated };
    case "maint_trend":
      return { machine: result.machine_id, category: result.category, direction: result.trend?.direction, severity: result.severity, current: result.current_value };
    case "maint_predict":
      return { id: result.prediction_id, category: result.category, severity: result.severity, remaining_hours: result.remaining_life_hours, confidence: result.confidence_pct };
    case "maint_schedule":
      return { machines: result.total_machines, critical: result.summary?.critical, warning: result.summary?.warning, urgent: result.urgent?.length };
    case "maint_models":
      return { total: result.total };
    case "maint_thresholds":
      return { category: result.category, warning: result.warning, critical: result.critical };
    case "maint_alerts":
      return { total: result.total };
    case "maint_status":
      return { machine: result.machine_id, health: result.overall_health, severity: result.overall_severity, alerts: result.active_alerts?.length };
    case "maint_history":
      return { total: result.total, by_severity: result.by_severity };
    case "maint_get":
      return { id: result.prediction_id, category: result.category, severity: result.severity, remaining: result.remaining_life_hours };
    case "sustain_optimize":
      return { id: result.optimization_id, material: result.material, mode: result.mode, cost_delta: result.savings?.cost_delta_pct, energy_saved: result.savings?.energy_saved_pct, carbon_saved: result.savings?.carbon_saved_pct };
    case "sustain_compare":
      return { total: result.total };
    case "sustain_energy":
      return { material: result.material, savings_kwh: result.savings_kwh, savings_pct: result.savings_pct };
    case "sustain_carbon":
      return { material: result.material, savings_kg: result.savings_kg_co2, savings_pct: result.savings_pct };
    case "sustain_coolant":
      return { current: result.current_type, recommended: result.recommended_type, savings_usd: result.annual_savings_usd };
    case "sustain_nearnet":
      return { id: result.analysis_id, material: result.material, best: result.best_option, options: result.stock_options?.length };
    case "sustain_report":
      return { material: result.material, batch: result.batch_size, energy_saved: result.batch_totals?.energy_saved_kwh, carbon_saved: result.batch_totals?.carbon_saved_kg };
    case "sustain_materials":
      return { name: result.name, total: result.total };
    case "sustain_history":
      return { total: result.total };
    case "sustain_get":
      return { id: result.optimization_id, material: result.material, mode: result.mode };
    case "genplan_plan":
      return { plan_id: result.plan_id, features: result.feature_count, setups: result.setup_count, ops: result.operation_count, tools: result.tool_count, cycle: result.total_cycle_time_min, cost: result.total_cost_usd };
    case "genplan_features":
      return { count: result.feature_count, simple: result.complexity_summary?.simple, moderate: result.complexity_summary?.moderate, complex: result.complexity_summary?.complex };
    case "genplan_setups":
      return { count: result.setup_count };
    case "genplan_operations":
      return { count: result.operation_count };
    case "genplan_optimize":
      return { total: result.optimization_summary?.total_operations, tools: result.optimization_summary?.unique_tools };
    case "genplan_tools":
      return { count: result.tool_count, changes: result.tool_change_count };
    case "genplan_cycle":
      return { cutting: result.cutting_time_min, tool_change: result.tool_change_time_min, total: result.total_cycle_time_min };
    case "genplan_cost":
      return { per_part: result.cost_breakdown?.total_per_part_usd, batch: result.cost_breakdown?.total_batch_usd };
    case "genplan_risk":
      return { overall: result.risk_summary?.overall_risk, high: result.risk_summary?.high_risk_operations, medium: result.risk_summary?.medium_risk_operations };
    case "genplan_get":
      return { plan_id: result.plan_id, material: result.material, features: result.features?.length };
    case "graph_query":
      return { node: result.center_node?.name, connections: result.total_connections };
    case "graph_infer":
      return { entity: result.entity, confidence: result.confidence, strategies: result.recommended_strategies?.length };
    case "graph_discover":
      return { entity: result.entity, discoveries: result.discoveries?.length };
    case "graph_predict":
      return { material: result.combination?.material, success: result.success_rate_pct, confidence: result.confidence };
    case "graph_traverse":
      return { start: result.start, nodes: result.nodes_visited };
    case "graph_add":
      return { added: result.added, id: result.id ?? result.source };
    case "graph_search":
      return { query: result.query, total: result.total };
    case "graph_stats":
      return { nodes: result.total_nodes, edges: result.total_edges, jobs: result.total_job_evidence };
    case "graph_history":
      return { total: result.total };
    case "graph_get":
      return { id: result.query_id };
    case "learn_contribute":
      return { contribution_id: result.contribution_id, status: result.status };
    case "learn_query":
      return { total: result.total, top_correction: result.corrections?.[0]?.vc_correction };
    case "learn_aggregate":
      return { updated: result.correction_factors_updated, created: result.new_factors_created };
    case "learn_anonymize":
      return { privacy_score: result.report?.privacy_score, safe: result.report?.safe_to_share };
    case "learn_network_stats":
      return { nodes: result.total_nodes, factors: result.correction_factors, confidence: result.avg_confidence };
    case "learn_opt_control":
      return { shop_id: result.shop_id, status: result.status ?? (result.opted_in ? "opted_in" : "opted_out") };
    case "learn_correction":
      return { id: result.id, vc: result.vc_correction, confidence: result.confidence };
    case "learn_transparency":
      return { total: result.total };
    case "learn_history":
      return { queries: result.total_queries, contributions: result.total_contributions };
    case "learn_get":
      return { id: result.query_id ?? result.id };
    case "adaptive_chipload":
      return { target: result.target_chipload_mm, actual: result.actual_chipload_mm, override: result.feed_override_pct };
    case "adaptive_chatter":
      return { chatter: result.is_chatter, rpm: result.recommended_rpm, freq: result.dominant_frequency_hz };
    case "adaptive_wear":
      return { wear: result.estimated_wear_pct, life: result.remaining_life_min, replace: result.should_replace };
    case "adaptive_thermal":
      return { drift_z: result.z_drift_um, compensated: result.compensation_applied };
    case "adaptive_override":
      return { channel: result.override?.channel, value: result.override?.value_pct, status: result.status };
    case "adaptive_status":
      return { active: result.active, sessions: result.total_sessions ?? result.sessions };
    case "adaptive_config":
      return { status: result.status, updated: result.updated_keys };
    case "adaptive_log":
      return { total: result.total };
    case "adaptive_history":
      return { sessions: result.total_sessions, overrides: result.total_overrides };
    case "adaptive_get":
      return { id: result.query_id ?? result.id };
    // SFC Product (R11-MS0)
    case "sfc_calculate":
      return { vc: result.cutting_speed_m_min, rpm: result.spindle_rpm, fz: result.feed_per_tooth_mm, power: result.power_kW, tool_life: result.tool_life_min, safety: result.safety_status };
    case "sfc_compare":
      return { approaches: result.approaches?.length, recommended: result.recommended };
    case "sfc_optimize":
      return { objective: result.objective, improvement: result.improvement_pct };
    case "sfc_quick":
      return { vc: result.result?.cutting_speed_m_min, rpm: result.result?.spindle_rpm };
    case "sfc_materials":
      return { count: result.materials?.length };
    case "sfc_tools":
      return { count: result.tools?.length };
    case "sfc_formulas":
      return { count: result.formulas?.length };
    case "sfc_safety":
      return { score: result.score, status: result.status };
    case "sfc_history":
      return { entries: result.history?.length };
    case "sfc_get":
      return { product: result.product, version: result.version };
    // PPG extractors
    case "ppg_validate":
      return { valid: result.valid, score: result.score, errors: result.errors?.length, warnings: result.warnings?.length };
    case "ppg_translate":
      return { source: result.original_controller, target: result.target_controller, changes: result.changes_made?.length };
    case "ppg_templates":
      return { total: result.total };
    case "ppg_generate":
      return { controller: result.controller, operation: result.operation, line_count: result.line_count };
    case "ppg_controllers":
      return { total: result.total };
    case "ppg_compare":
      return { operation: result.operation, controllers_compared: result.controllers_compared };
    case "ppg_syntax":
      return { controller: result.controller, family: result.controller_family };
    case "ppg_batch":
      return { source: result.source_controller, targets: result.total_targets };
    case "ppg_history":
      return { entries: result.history?.length };
    case "ppg_get":
      return { product: result.product, version: result.version };
    // Shop Manager extractors
    case "shop_job":
      return { material: result.material, operations: result.operations?.length, cycle_time_min: result.total_cycle_time_min };
    case "shop_cost":
      return { cost_per_part: result.cost_per_part, price_per_part: result.price_per_part, batch_size: result.batch_size };
    case "shop_quote":
      return { quote_number: result.quote_number, unit_price: result.pricing?.unit_price, quantity: result.pricing?.quantity };
    // shop_schedule handled at L429 (detailed response) — removed duplicate
    case "shop_dashboard":
      return { total_machines: result.summary?.total_machines, utilization: result.summary?.average_utilization_pct };
    case "shop_report":
      return { cost_per_part: result.cost_summary?.cost_per_part, co2_kg: result.sustainability?.co2_kg_per_part };
    case "shop_compare":
      return { results: result.results?.length, recommendation: result.recommendation };
    case "shop_materials":
      return { total: result.total };
    case "shop_history":
      return { entries: result.history?.length };
    case "shop_get":
      return { product: result.product, version: result.version };
    // ACNC extractors
    case "acnc_program":
      return { feature: result.feature?.feature, controller: result.gcode?.controller, safety: result.safety_score, ready: result.ready_to_run };
    case "acnc_feature":
      return { feature: result.feature, operations: result.operations?.length };
    case "acnc_simulate":
      return { safety: result.safety_status, cycle_time: result.estimated_cycle_time_min };
    case "acnc_output":
      return { controller: result.controller, operations: result.operations_count };
    case "acnc_tools":
      return { tool: result.tool_type, coating: result.coating };
    case "acnc_strategy":
      return { strategy: result.strategy, confidence: result.confidence };
    case "acnc_validate":
      return { valid: result.valid, score: result.score };
    case "acnc_batch":
      return { batch_size: result.batch_size, all_ready: result.all_ready };
    case "acnc_history":
      return { entries: result.history?.length };
    case "acnc_get":
      return { product: result.product, version: result.version };
    default:
      return result;
  }
}

export function registerIntelligenceDispatcher(server: any): void {
  server.tool(
    "prism_intelligence",
    "Manufacturing intelligence: job planning, setup sheets, costing, recommendations, what-if, diagnosis, optimization, scheduling. Use 'action' param.",
    {
      action: z.enum(ACTIONS),
      params: z.record(z.any()).optional(),
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
        // === PRE-INTELLIGENCE HOOKS ===
        const hookCtx = {
          operation: action,
          target: { type: "intelligence" as const, id: action, data: params },
          metadata: { dispatcher: "intelligenceDispatcher", action, params },
        };

        const preResult = await hookExecutor.execute("pre-calculation", hookCtx as any);
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

        // === EXECUTE INTELLIGENCE ACTION ===
        // Route to specialized engines or IntelligenceEngine
        const LEARNING_ACTIONS = ["job_record", "job_insights"] as const;
        const ALGORITHM_ACTIONS = ["algorithm_select"] as const;
        const SCHEDULER_ACTIONS = ["shop_schedule", "machine_utilization"] as const;
        const INTENT_ACTIONS = ["decompose_intent"] as const;
        const FORMATTER_ACTIONS = ["format_response"] as const;
        const WORKFLOW_ACTIONS = ["workflow_match", "workflow_get", "workflow_list"] as const;
        const ONBOARDING_ACTIONS = ["onboarding_welcome", "onboarding_state", "onboarding_record", "onboarding_suggestion", "onboarding_reset"] as const;
        const SETUP_SHEET_ACTIONS = ["setup_sheet_format", "setup_sheet_template"] as const;
        const CONVERSATION_ACTIONS = ["conversation_context", "conversation_transition", "job_start", "job_update", "job_find", "job_resume", "job_complete", "job_list_recent"] as const;
        const SKILL_ACTIONS = ["skill_list", "skill_get", "skill_search", "skill_match", "skill_steps", "skill_for_persona"] as const;
        const MACHINE_ACTIONS = ["machine_register", "machine_unregister", "machine_list", "machine_connect", "machine_disconnect", "machine_live_status", "machine_all_status", "machine_ingest", "chatter_detect_live", "tool_wear_start", "tool_wear_update", "tool_wear_status", "thermal_update", "thermal_status", "alert_acknowledge", "alert_history"] as const;
        const ASSIST_ACTIONS = ["assist_list", "assist_get", "assist_search", "assist_match", "assist_explain", "assist_confidence", "assist_mistakes", "assist_safety"] as const;
        const CAM_ACTIONS = ["cam_recommend", "cam_export", "cam_analyze_op", "cam_tool_library", "cam_tool_get", "cam_systems"] as const;
        const DNC_ACTIONS = ["dnc_generate", "dnc_send", "dnc_compare", "dnc_verify", "dnc_qr", "dnc_systems", "dnc_history", "dnc_get"] as const;
        const MOBILE_ACTIONS = ["mobile_lookup", "mobile_voice", "mobile_alarm", "mobile_timer_start", "mobile_timer_check", "mobile_timer_reset", "mobile_timer_list", "mobile_cache"] as const;
        const ERP_ACTIONS = ["erp_import_wo", "erp_get_plan", "erp_cost_feedback", "erp_cost_history", "erp_quality_import", "erp_quality_history", "erp_tool_inventory", "erp_tool_update", "erp_systems", "erp_wo_list"] as const;
        const MEASURE_ACTIONS = ["measure_cmm_import", "measure_cmm_history", "measure_cmm_get", "measure_surface", "measure_surface_history", "measure_probe_record", "measure_probe_drift", "measure_probe_history", "measure_bias_detect", "measure_summary"] as const;
        const INVERSE_ACTIONS = ["inverse_solve", "inverse_surface", "inverse_tool_life", "inverse_dimensional", "inverse_chatter", "inverse_troubleshoot", "inverse_history", "inverse_get"] as const;
        const FORENSIC_ACTIONS = ["forensic_tool_autopsy", "forensic_chip_analysis", "forensic_surface_defect", "forensic_crash", "forensic_failure_modes", "forensic_chip_types", "forensic_surface_types", "forensic_crash_types", "forensic_history", "forensic_get"] as const;
        const APPRENTICE_ACTIONS = ["apprentice_explain", "apprentice_lesson", "apprentice_lessons", "apprentice_assess", "apprentice_capture", "apprentice_knowledge", "apprentice_challenge", "apprentice_materials", "apprentice_history", "apprentice_get"] as const;
        const GENOME_ACTIONS = ["genome_lookup", "genome_predict", "genome_similar", "genome_compare", "genome_list", "genome_fingerprint", "genome_behavioral", "genome_search", "genome_history", "genome_get"] as const;
        const MAINT_ACTIONS = ["maint_analyze", "maint_trend", "maint_predict", "maint_schedule", "maint_models", "maint_thresholds", "maint_alerts", "maint_status", "maint_history", "maint_get"] as const;
        const SUSTAIN_ACTIONS = ["sustain_optimize", "sustain_compare", "sustain_energy", "sustain_carbon", "sustain_coolant", "sustain_nearnet", "sustain_report", "sustain_materials", "sustain_history", "sustain_get"] as const;
        const GENPLAN_ACTIONS = ["genplan_plan", "genplan_features", "genplan_setups", "genplan_operations", "genplan_optimize", "genplan_tools", "genplan_cycle", "genplan_cost", "genplan_risk", "genplan_get"] as const;
        const GRAPH_ACTIONS = ["graph_query", "graph_infer", "graph_discover", "graph_predict", "graph_traverse", "graph_add", "graph_search", "graph_stats", "graph_history", "graph_get"] as const;
        const LEARN_ACTIONS = ["learn_contribute", "learn_query", "learn_aggregate", "learn_anonymize", "learn_network_stats", "learn_opt_control", "learn_correction", "learn_transparency", "learn_history", "learn_get"] as const;
        const ADAPTIVE_ACTIONS = ["adaptive_chipload", "adaptive_chatter", "adaptive_wear", "adaptive_thermal", "adaptive_override", "adaptive_status", "adaptive_config", "adaptive_log", "adaptive_history", "adaptive_get"] as const;
        const SFC_ACTIONS = ["sfc_calculate", "sfc_compare", "sfc_optimize", "sfc_quick", "sfc_materials", "sfc_tools", "sfc_formulas", "sfc_safety", "sfc_history", "sfc_get"] as const;
        const PPG_ACTIONS = ["ppg_validate", "ppg_translate", "ppg_templates", "ppg_generate", "ppg_controllers", "ppg_compare", "ppg_syntax", "ppg_batch", "ppg_history", "ppg_get"] as const;
        const SHOP_ACTIONS = ["shop_job", "shop_cost", "shop_quote", "shop_schedule", "shop_dashboard", "shop_report", "shop_compare", "shop_materials", "shop_history", "shop_get"] as const;
        const ACNC_ACTIONS = ["acnc_program", "acnc_feature", "acnc_simulate", "acnc_output", "acnc_tools", "acnc_strategy", "acnc_validate", "acnc_batch", "acnc_history", "acnc_get"] as const;
        const result = SFC_ACTIONS.includes(action as any)
          ? productSFC(action, params)
          : PPG_ACTIONS.includes(action as any)
          ? productPPG(action, params)
          : SHOP_ACTIONS.includes(action as any)
          ? productShop(action, params)
          : ACNC_ACTIONS.includes(action as any)
          ? productACNC(action, params)
          : ADAPTIVE_ACTIONS.includes(action as any)
          ? adaptiveControl(action, params)
          : LEARN_ACTIONS.includes(action as any)
          ? federatedLearning(action, params)
          : GRAPH_ACTIONS.includes(action as any)
          ? knowledgeGraph(action, params)
          : GENPLAN_ACTIONS.includes(action as any)
          ? generativeProcess(action, params)
          : SUSTAIN_ACTIONS.includes(action as any)
          ? sustainabilityEngine(action, params)
          : MAINT_ACTIONS.includes(action as any)
          ? predictiveMaintenance(action, params)
          : GENOME_ACTIONS.includes(action as any)
          ? manufacturingGenome(action, params)
          : APPRENTICE_ACTIONS.includes(action as any)
          ? apprenticeEngine(action, params)
          : FORENSIC_ACTIONS.includes(action as any)
          ? failureForensics(action, params)
          : INVERSE_ACTIONS.includes(action as any)
          ? inverseSolver(action, params)
          : MEASURE_ACTIONS.includes(action as any)
          ? measurementIntegration(action, params)
          : ERP_ACTIONS.includes(action as any)
          ? erpIntegration(action, params)
          : MOBILE_ACTIONS.includes(action as any)
          ? mobileInterface(action, params)
          : DNC_ACTIONS.includes(action as any)
          ? dncTransfer(action, params)
          : CAM_ACTIONS.includes(action as any)
          ? camIntegration(action, params)
          : MACHINE_ACTIONS.includes(action as any)
          ? machineConnectivity(action, params)
          : ASSIST_ACTIONS.includes(action as any)
          ? userAssistanceSkills(action, params)
          : SKILL_ACTIONS.includes(action as any)
          ? userWorkflowSkills(action, params)
          : CONVERSATION_ACTIONS.includes(action as any)
            ? conversationalMemory(action, params)
            : SETUP_SHEET_ACTIONS.includes(action as any)
            ? setupSheetEngine(action, params)
            : LEARNING_ACTIONS.includes(action as any)
          ? jobLearning(action, params)
          : ALGORITHM_ACTIONS.includes(action as any)
            ? algorithmGateway(action, params)
            : SCHEDULER_ACTIONS.includes(action as any)
              ? shopScheduler(action, params)
              : INTENT_ACTIONS.includes(action as any)
                ? intentEngine(action, params)
                : FORMATTER_ACTIONS.includes(action as any)
                  ? responseFormatter(action, params)
                  : WORKFLOW_ACTIONS.includes(action as any)
                    ? workflowChains(action, params)
                    : ONBOARDING_ACTIONS.includes(action as any)
                      ? onboardingEngine(action, params)
                      : await executeIntelligenceAction(action as IntelligenceAction, params);

        // === POST-INTELLIGENCE HOOKS ===
        const postCtx = {
          ...hookCtx,
          target: { ...hookCtx.target, data: { ...params, result } },
        };
        await hookExecutor.execute("post-calculation", postCtx as any);

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

        // Return structured error (not a throw — keep MCP protocol clean)
        const isStub = err.message?.includes("not yet implemented");
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              error: true,
              action,
              message: err.message,
              stub: isStub,
              hint: isStub
                ? `Action "${action}" is not yet implemented`
                : undefined,
            }),
          }],
        };
      }
    }
  );
}
