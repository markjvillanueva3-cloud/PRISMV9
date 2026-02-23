import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { hookExecutor } from "../../engines/HookExecutor.js";
import { slimResponse, getCurrentPressurePct, getSlimLevel } from "../../utils/responseSlimmer.js";
import { registryManager } from "../../registries/manager.js";
import { SafetyBlockError } from "../../errors/PrismError.js";
import { validateCrossFieldPhysics } from "../../validation/crossFieldPhysics.js";
import type { SafetyCalcResult } from "../../schemas/safetyCalcSchema.js";
import { formatByLevel, type ResponseLevel } from "../../types/ResponseLevel.js";

// Import original handlers
import {
  calculateKienzleCuttingForce,
  calculateTaylorToolLife,
  calculateJohnsonCookStress,
  calculateSurfaceFinish,
  calculateMRR,
  calculateSpeedFeed,
  calculateSpindlePower,
  calculateChipLoad,
  calculateTorque,
  calculateProductivityMetrics,
  getDefaultKienzle,
  getDefaultTaylor,
  type CuttingConditions,
  type KienzleCoefficients,
  type TaylorCoefficients,
  type JohnsonCookParams
} from "../../engines/ManufacturingCalculations.js";

import {
  calculateStabilityLobes,
  calculateToolDeflection,
  calculateCuttingTemperature,
  calculateMinimumCostSpeed,
  optimizeCuttingParameters,
  type ModalParameters,
  type OptimizationConstraints,
  type OptimizationWeights,
  type CostParameters,
  generateSLD,
  evaluateSLD,
  predictThermalDistortion,
  type SLDGenerateInput,
  type SLDEvaluateInput,
  type ThermalDistortionInput
} from "../../engines/AdvancedCalculations.js";

import {
  calculateITGrade,
  analyzeShaftHoleFit,
  toleranceStackUp,
  calculateCpk,
  parseGDT,
  gdtStackUp,
  analyzeDatumRef,
  computeGDTZone,
  gdtReport,
  type GDTParseInput,
  type GDTStackDimension,
  type GDTDatumInput,
  type GDTZoneInput,
  type GDTReportInput,
} from "../../engines/ToleranceEngine.js";

import {
  generateGCode,
  generateProgram,
  listControllers as listGCodeControllers,
  listOperations as listGCodeOperations,
} from "../../engines/GCodeTemplateEngine.js";

import {
  decide,
  listDecisionTrees,
} from "../../engines/DecisionTreeEngine.js";

import {
  renderReport,
  listReportTypes,
} from "../../engines/ReportRenderer.js";

import {
  createCampaign,
  validateCampaign,
  optimizeCampaign,
  estimateCycleTime as estimateCampaignTime,
  listCampaignActions,
} from "../../engines/CampaignEngine.js";

import {
  runInferenceChain,
  analyzeAndRecommend,
  deepDiagnose,
  listChainTypes,
  type InferenceChainConfig,
} from "../../engines/InferenceChainEngine.js";

import {
  calculateEngagementAngle,
  calculateTrochoidalParams,
  calculateHSMParams,
  calculateScallopHeight,
  calculateOptimalStepover,
  estimateCycleTime,
  calculateArcFitting,
  calculateChipThinning,
  calculateMultiPassStrategy,
  recommendCoolantStrategy,
  generateGCodeSnippet
} from "../../engines/ToolpathCalculations.js";

import {
  physicsPrediction,
} from "../../engines/PhysicsPredictionEngine.js";

import {
  optimization,
} from "../../engines/OptimizationEngine.js";

import {
  workholdingIntelligence,
} from "../../engines/WorkholdingIntelligenceEngine.js";

import {
  executeCCEAction,
  type CCEComposeInput,
} from "../../engines/CCELiteEngine.js";

import {
  executeCuttingSimAction,
} from "../../engines/CuttingSimulationEngine.js";

import {
  executeDigitalTwinAction,
} from "../../engines/DigitalTwinEngine.js";

import {
  executeVerificationAction,
} from "../../engines/ProcessVerificationEngine.js";

import {
  executeSensitivityAction,
} from "../../engines/SensitivityEngine.js";

import {
  executeMeasurementFeedbackAction,
} from "../../engines/MeasurementFeedbackEngine.js";

import {
  executeProcessDriftAction,
} from "../../engines/ProcessDriftEngine.js";

import {
  executeModelCalibrationAction,
} from "../../engines/ModelCalibrationEngine.js";

import {
  executeBatchAnalyticsAction,
} from "../../engines/BatchAnalyticsEngine.js";

import {
  executeGDTChainAction,
} from "../../engines/GDTChainEngine.js";

import {
  executeMultiPassAction,
} from "../../engines/MultiPassStrategyEngine.js";

import {
  executeCpkOptimizerAction,
} from "../../engines/CpkOptimizerEngine.js";

import {
  executeToolWearAction,
} from "../../engines/ToolWearCompensatorEngine.js";

import {
  executeDecisionSupportAction,
} from "../../engines/DecisionSupportEngine.js";

import {
  executeProductionReadinessAction,
} from "../../engines/ProductionReadinessEngine.js";

import {
  executeRootCauseAction,
} from "../../engines/RootCauseAnalysisEngine.js";

import {
  executeCostQualityAction,
} from "../../engines/CostQualityTradeoffEngine.js";

import {
  executeWorkflowOrchestratorAction,
} from "../../engines/WorkflowOrchestratorEngine.js";

import {
  executeProcessKnowledgeAction,
} from "../../engines/ProcessKnowledgeEngine.js";
import {
  executeAdaptiveLearningAction,
} from "../../engines/AdaptiveLearningEngine.js";
import {
  executeIntegrationGatewayAction,
} from "../../engines/IntegrationGatewayEngine.js";
import {
  executePredictiveMaintenanceAction,
} from "../../engines/PredictiveMaintenanceEngine.js";
import {
  executeAssetHealthAction,
} from "../../engines/AssetHealthEngine.js";
import {
  executeShopFloorAnalyticsAction,
} from "../../engines/ShopFloorAnalyticsEngine.js";
import {
  executeReportingAction,
} from "../../engines/ReportingEngine.js";
import {
  executeTraceabilityAction,
} from "../../engines/TraceabilityEngine.js";
import {
  executeInventoryIntelligenceAction,
} from "../../engines/InventoryIntelligenceEngine.js";
import {
  executeCostModelingAction,
} from "../../engines/CostModelingEngine.js";
import {
  executeComplianceAuditAction,
} from "../../engines/ComplianceAuditEngine.js";

import {
  executeEnergyMonitoringAction,
} from "../../engines/EnergyMonitoringEngine.js";

import {
  executeCarbonFootprintAction,
} from "../../engines/CarbonFootprintEngine.js";

import {
  executeSustainabilityMetricsAction,
} from "../../engines/SustainabilityMetricsEngine.js";

import {
  executeResourceOptimizationAction,
} from "../../engines/ResourceOptimizationEngine.js";

import {
  executeOperatorSkillAction,
} from "../../engines/OperatorSkillEngine.js";

import {
  executeTrainingManagementAction,
} from "../../engines/TrainingManagementEngine.js";

import {
  executeKnowledgeCaptureAction,
} from "../../engines/KnowledgeCaptureEngine.js";

import {
  executeWorkforceOptimizationAction,
} from "../../engines/WorkforceOptimizationEngine.js";

import {
  executeSupplierManagementAction,
} from "../../engines/SupplierManagementEngine.js";

import {
  executeMaterialSourcingAction,
} from "../../engines/MaterialSourcingEngine.js";

import {
  executeLeadTimeAction,
} from "../../engines/LeadTimeEngine.js";

import {
  executeProcurementAnalyticsAction,
} from "../../engines/ProcurementAnalyticsEngine.js";

import {
  executeJobSchedulingAction,
} from "../../engines/JobSchedulingEngine.js";

import {
  executeMachineAllocationAction,
} from "../../engines/MachineAllocationEngine.js";

import {
  executeProductionSequencingAction,
} from "../../engines/ProductionSequencingEngine.js";

import {
  executeCapacityPlanningAction,
} from "../../engines/CapacityPlanningEngine.js";
import {
  executeECNManagementAction,
} from "../../engines/ECNManagementEngine.js";
import {
  executeBOMAction,
} from "../../engines/BOMEngine.js";
import {
  executeRevisionControlAction,
} from "../../engines/RevisionControlEngine.js";
import {
  executeDocumentWorkflowAction,
} from "../../engines/DocumentWorkflowEngine.js";
import {
  executeWarehouseLocationAction,
} from "../../engines/WarehouseLocationEngine.js";
import {
  executeKittingAction,
} from "../../engines/KittingEngine.js";
import {
  executeShippingReceivingAction,
} from "../../engines/ShippingReceivingEngine.js";
import {
  executeYardManagementAction,
} from "../../engines/YardManagementEngine.js";
import {
  executeValueStreamAction,
} from "../../engines/ValueStreamEngine.js";
import {
  executeKaizenAction,
} from "../../engines/KaizenEngine.js";
import {
  executeSixSigmaAction,
} from "../../engines/SixSigmaEngine.js";
import {
  executeLeanMetricsAction,
} from "../../engines/LeanMetricsEngine.js";

/**
 * Extract domain-specific key values per calc type for summary-level responses.
 * Each calc type returns only the most critical metrics (~50-100 tokens).
 */
function calcExtractKeyValues(action: string, result: any): Record<string, any> {
  if (!result || typeof result !== 'object') return { value: result };
  switch (action) {
    case "cutting_force":
      return { Fc_N: result.Fc, Ff_N: result.Ff, power_kW: result.power, torque_Nm: result.torque };
    case "tool_life":
      return { tool_life_min: result.tool_life_minutes, wear_rate: result.wear_rate };
    case "speed_feed":
      return { Vc: result.cutting_speed, fz: result.feed_per_tooth, n: result.spindle_speed, vf: result.feed_rate };
    case "flow_stress":
      return { sigma_MPa: result.stress };
    case "surface_finish":
      return { Ra_um: result.Ra, Rz_um: result.Rz };
    case "mrr":
      return { mrr_cm3min: result.mrr, feed_rate: result.feed_rate, spindle_speed: result.spindle_speed };
    case "power":
      return { power_kW: result.power, torque_Nm: result.torque, safe: result.safe };
    case "torque":
      return { torque_Nm: result.torque, safe: result.safe };
    case "chip_load":
      return { hex_mm: result.hex_mm, chip_load_ok: result.chip_load_ok };
    case "stability":
      return { stable: result.is_stable, critical_depth_mm: result.critical_depth };
    case "deflection":
      return { deflection_mm: result.static_deflection, safe: result.safe };
    case "thermal":
      return { T_tool_C: result.tool_temperature, T_chip_C: result.chip_temperature };
    case "cost_optimize":
      return { Vc_optimal: result.optimal_speed, cost_per_part: result.cost_per_part };
    case "multi_optimize":
      return { optimal_speed: result.optimal_speed, optimal_feed: result.optimal_feed };
    case "trochoidal":
      return { mrr_cm3min: result.mrr, max_engagement: result.max_engagement_deg };
    case "hsm":
      return { mrr_cm3min: result.MRR_cm3min, spindle_rpm: result.spindle_rpm };
    case "coolant_strategy":
      return { strategy: result.recommendation?.strategy, pressure_bar: result.recommendation?.pressure_bar };
    case "tolerance_analysis":
      return { tolerance_um: result.tolerance_um, grade: result.grade_label, nominal_mm: result.nominal_mm };
    case "fit_analysis":
      return { fit_type: result.fit_type, min_clearance_mm: result.min_clearance_mm, max_clearance_mm: result.max_clearance_mm };
    case "gcode_generate":
      return { controller: result.controller, operation: result.operation, line_count: result.line_count, warnings: result.warnings?.length || 0 };
    case "decision_tree":
      return { tree: result.tree || result.strategy || result.tool_type || result.grade, confidence: result.confidence, warnings: result.warnings?.length || 0 };
    case "render_report":
      return { type: result.type, line_count: result.line_count, sections: result.sections?.length || 0 };
    case "campaign_create":
      return { material_count: result.material_count, pass: result.summary?.total_pass, fail: result.summary?.total_fail, quarantine: result.summary?.total_quarantine, avg_safety: result.summary?.avg_safety_score };
    case "campaign_validate":
      return { valid: result.valid, errors: result.errors?.length || 0, warnings: result.warnings?.length || 0 };
    case "campaign_optimize":
      return { improvement_pct: result.estimated_improvement_pct, adjustments: result.operation_adjustments?.length || 0 };
    case "campaign_cycle_time":
      return { total_min: result.estimated_total_time_min, per_material_min: result.time_per_material_min, materials: result.materials_count };
    case "inference_chain":
      return { chain_id: result.chain_id, status: result.status, steps_completed: result.steps_completed, total_steps: result.total_steps, tokens_in: result.total_tokens?.input, tokens_out: result.total_tokens?.output };
    case "wear_prediction":
      return { flank_wear_VB_mm: result.flank_wear_VB_mm, wear_zone: result.wear_zone, remaining_life_min: result.remaining_life_min, recommendation: result.recommendation };
    case "process_cost_calc":
      return { cost_per_part: result.cost_per_part, cycle_time_min: result.cycle_time_min, parts_per_tool_edge: result.parts_per_tool_edge, tool_life_min: result.tool_life_min };
    case "uncertainty_chain":
      return { Fc_N: result.parameters?.Fc_N, T_min: result.parameters?.T_min, dominant_source: result.dominant_uncertainty_source, has_statistics: result.data_quality?.has_statistics };
    case "controller_optimize":
      return { controller: result.controller, mode: result.mode_selected, optimizations: result.optimizations_applied?.length, speed_pct: result.performance_impact?.speed_improvement_pct };
    case "surface_integrity_predict":
      return { Ra_um: result.surface_roughness?.ra_predicted_um, residual_stress_mpa: result.residual_stress?.surface_mpa, white_layer_risk: result.white_layer?.risk, safety: result.safety?.score };
    case "chatter_predict":
      return { stable: result.stable, critical_depth_mm: result.critical_depth_mm, margin: result.stability_margin, safety: result.safety?.score };
    case "thermal_compensate":
      return { z_um: result.offsets?.z_um, x_um: result.offsets?.x_um, y_um: result.offsets?.y_um, steady_state_min: result.steady_state_minutes };
    case "unified_machining_model":
      return { Fc_N: result.force?.tangential_n, tool_temp_c: result.temperature?.tool_c, life_min: result.wear_rate?.estimated_life_min, Ra_um: result.surface_finish?.ra_um, converged: result.convergence?.converged, safety: result.safety?.score };
    case "coupling_sensitivity":
      return { parameter: result.parameter, most_sensitive: result.most_sensitive_output, variation_pct: result.variation_pct };
    case "optimize_parameters":
      return { vc_mpm: result.optimal?.vc_mpm, fz_mm: result.optimal?.fz_mm, ap_mm: result.optimal?.ap_mm, cost_usd: result.optimal?.estimated_cost_usd, cycle_min: result.optimal?.estimated_cycle_time_min, ra_um: result.optimal?.predicted_ra_um, safety: result.safety?.score };
    case "optimize_sequence":
      return { optimal_order: result.optimal_order, tool_changes: result.tool_changes, total_min: result.estimated_total_min, changes_saved: result.savings_vs_input_order?.tool_changes_saved };
    case "sustainability_report":
      return { total_kwh: result.energy?.total_kwh, co2_kg: result.carbon?.total_co2_kg, eco_score: result.eco_efficiency_score, coolant_l: result.coolant?.consumption_liters };
    case "eco_optimize":
      return { vc_mpm: result.optimal?.vc_mpm, eco_weight: result.eco_weight_applied, improvement_pct: result.sustainability_improvement_pct, eco_score: result.optimal?.sustainability?.eco_efficiency_score };
    case "fixture_recommend":
      return { fixture: result.primary_recommendation?.fixture_type, model: result.primary_recommendation?.model, clamp_n: result.primary_recommendation?.clamp_force_n, deflection_mm: result.analysis?.max_deflection_mm, within_tol: result.analysis?.deflection_within_tolerance, safety: result.safety?.score };
    case "cce_compose":
      return { recipe: result.recipe, steps: result.steps_executed, cache_hits: result.cache_hits, time_ms: result.total_time_ms, safety: result.safety?.score };
    case "cce_list":
      return { recipes: Array.isArray(result) ? result.length : 0 };
    case "cce_cache_stats":
      return { size: result.size, max: result.max, status: result.hit_rate_estimate };
    case "cce_cache_clear":
      return { cleared: result.cleared };
    case "sim_cutting":
      return { peak_Ft_N: result.forces?.peak_Ft_N, avg_power_kW: result.forces?.avg_power_kW, peak_tool_temp_C: result.thermal?.peak_tool_temp_C, chatter: result.vibration?.is_chatter, safety: result.safety?.score };
    case "sim_force_profile":
      return { points: result.time_ms?.length, peak_Ft: Math.max(...(result.Ft_N ?? [0])) };
    case "sim_thermal_profile":
      return { points: result.time_ms?.length, peak_tool_C: Math.max(...(result.tool_temp_C ?? [0])) };
    case "sim_vibration":
      return { chatter: result.is_chatter, max_um: result.max_displacement_um, rms_um: result.rms_displacement_um };
    case "twin_create":
      return { twin_id: result.twin_id, material: result.material, volume_mm3: result.current_volume_mm3 };
    case "twin_remove_material":
      return { twin_id: result.twin_id, removed_pct: result.removal_percentage, ops: result.operations_count, safety: result.safety?.score };
    case "twin_state":
      return { twin_id: result.twin_id, volume_mm3: result.current_volume_mm3, removed_pct: result.removal_percentage, ops: result.operations_count };
    case "twin_compare":
      return { target_met: result.target_met, worst_Ra: result.overall_Ra_worst_um, budget_remaining: result.tolerance_budget_remaining_pct };
    case "verify_process":
      return { pass: result.pass, surface_ok: result.surface?.pass, tolerance_ok: result.tolerance?.pass, stability_ok: result.stability?.pass, thermal_ok: result.thermal?.pass };
    case "verify_tolerance":
      return { pass: result.pass, predicted_um: result.predicted_tolerance_um, target_um: result.target_tolerance_um, it_grade: result.it_grade };
    case "verify_surface":
      return { pass: result.pass, predicted_Ra: result.predicted_Ra_um, target_Ra: result.target_Ra_um };
    case "verify_stability":
      return { pass: result.pass, depth_limit_mm: result.depth_limit_mm, requested_mm: result.requested_depth_mm, safety_factor: result.safety_factor };
    case "sensitivity_1d":
      return { parameter: result.parameter, points: result.values?.length, metric: result.metric, min: result.metric_min, max: result.metric_max };
    case "sensitivity_2d":
      return { param1: result.parameter_1, param2: result.parameter_2, grid: `${result.grid_rows}x${result.grid_cols}`, metric: result.metric };
    case "sensitivity_pareto":
      return { front_size: result.pareto_front?.length, objectives: result.objectives, dominated: result.dominated_count };
    case "sensitivity_montecarlo":
      return { samples: result.n_samples, metric: result.metric, mean: result.mean, std: result.std_dev, p95: result.p95 };
    case "mfb_record":
      return { id: result.id, feature: result.feature, error: result.error, pct_error: result.pct_error, within_tolerance: result.within_tolerance };
    case "mfb_compare":
      return { count: result.count, bias: result.statistics?.bias, rmse: result.statistics?.rmse, correlation: result.statistics?.correlation };
    case "mfb_error_stats":
      return { count: result.overall?.count, bias: result.overall?.bias, rmse: result.overall?.rmse, within_tol_pct: result.overall?.within_tolerance_pct };
    case "mfb_correction":
      return { corrections: result.corrections?.length, sufficient_data: result.sufficient_data, total: result.total_measurements };
    case "spc_xbar_r":
      return { in_control: result.in_control, subgroups: result.subgroup_count, mean: result.overall_mean, violations: result.western_electric_violations?.length };
    case "spc_cusum":
      return { in_control: result.in_control, signals: result.signals?.length, target_mean: result.target_mean };
    case "spc_ewma":
      return { in_control: result.in_control, trend: result.trend, ooc_points: result.out_of_control?.length, lambda: result.lambda };
    case "spc_capability":
      return { cp: result.cp, cpk: result.cpk, pp: result.pp, ppk: result.ppk, rating: result.capability_rating, sigma: result.sigma_level, ppm: result.ppm_total };
    case "cal_update":
      return { parameter: result.parameter, shift: result.shift, shift_pct: result.shift_pct, confidence_gain: result.confidence_improvement, updates: result.n_updates };
    case "cal_status":
      return { calibrated: result.calibrated, total: result.total_parameters, updates: result.total_updates };
    case "cal_reset":
      return { reset: result.reset ?? result.reset_all, count: result.parameters_reset };
    case "cal_validate":
      return { improvement_pct: result.improvement_pct, effective: result.effective, mae_before: result.before_calibration?.mae, mae_after: result.after_calibration?.mae };
    case "batch_kpi":
      return { oee: result.oee, yield_pct: result.yield_pct, scrap_rate: result.scrap_rate, cost_per_part: result.cost_per_part_usd, throughput: result.throughput_parts_per_hr };
    case "batch_trend":
      return { metric: result.metric, trend: result.trend_direction, r_squared: result.regression?.r_squared, forecast: result.forecast_next, change_points: result.change_points?.length };
    case "batch_compare":
      return { winner: result.overall_winner, batch_a: result.batch_a?.id, batch_b: result.batch_b?.id };
    case "batch_summary":
      return { count: result.count, avg_oee: result.averages?.oee, avg_yield: result.averages?.yield_pct, total_parts: result.totals?.parts_produced };
    case "gdt_chain_montecarlo":
      return { mean_mm: result.closing_dimension?.mean_mm, std_mm: result.closing_dimension?.std_mm, pct_in_spec: result.conformance?.pct_in_spec, sigma: result.conformance?.sigma_level, n: result.n_samples };
    case "gdt_chain_allocate":
      return { method: result.method, target: result.target_assembly_tolerance_mm, achieved_rss: result.achieved_rss_mm, feasible: result.feasible };
    case "gdt_chain_sensitivity":
      return { top: result.top_contributor, pareto_80: result.pareto_80, rss: result.closing_rss_mm };
    case "gdt_chain_2d":
      return { resultant: result.resultant?.nominal_mm, rss: result.resultant?.rss_mm, angle: result.resultant?.angle_deg, pct_in_spec: result.combined_conformance?.pct_in_spec };
    case "mps_roughing_plan":
      return { passes: result.total_roughing_passes, time_min: result.total_time_min, max_force: result.max_force_N, strategy: result.strategy };
    case "mps_finish_plan":
      return { passes: result.total_finish_passes, time_min: result.total_time_min, ra_um: result.predicted_ra_um, rz_um: result.predicted_rz_um };
    case "mps_full_strategy":
      return { passes: result.summary?.total_passes, time_min: result.summary?.total_time_min, max_force: result.summary?.max_force_N, efficiency: result.summary?.cycle_efficiency_pct, tool_changes: result.summary?.estimated_tool_changes };
    case "mps_evaluate":
      return { time_min: result.total_time_min, max_force: result.max_force_N, avg_mrr: result.avg_mrr_cm3_per_min, tool_changes: result.tool_changes, bottleneck: result.bottleneck_pass };
    case "cpk_analyze":
      return { cp: result.cp, cpk: result.cpk, sigma: result.sigma_level, ppm: result.ppm_total, rating: result.capability_rating, off_center: result.off_center_pct };
    case "cpk_improve":
      return { current: result.current_cpk, target: result.target_cpk, gap: result.gap, feasible: result.feasible, combined: result.combined_expected_cpk };
    case "cpk_center":
      return { shift: result.shift_needed, direction: result.shift_direction, current_cpk: result.current_cpk, centered_cpk: result.centered_cpk, improvement_pct: result.improvement_pct };
    case "cpk_reduce_spread":
      return { current_std: result.current_std, required_std: result.required_std, reduction_pct: result.reduction_pct, current_cpk: result.current_cpk };
    case "twc_predict":
      return { life_min: result.tool_life_min, wear_ratio: result.wear_ratio, state: result.wear_state, vb_mm: result.flank_wear_mm, error_mm: result.dimensional_error_mm };
    case "twc_compensate":
      return { offset_mm: result.required_offset_mm, total_offset: result.total_offset_mm, in_tolerance: result.within_tolerance, tol_consumed: result.tolerance_consumed_pct };
    case "twc_schedule":
      return { interval_min: result.optimal_change_interval_min, cost_per_part: result.total_cost_per_part_usd, quality: result.quality_factor, productivity: result.productivity_factor };
    case "twc_history":
      return { records: result.records, avg_life: result.avg_tool_life_min, wear_rate: result.wear_rate_mm_per_min, r_squared: result.wear_model?.r_squared, trend: result.trend };
    case "ds_recommend":
      return { material: result.material, priority: result.priority, vc: result.recommended?.cutting_speed_m_min, fz: result.recommended?.feed_per_tooth_mm, ap: result.recommended?.depth_of_cut_mm, confidence: result.confidence };
    case "ds_validate":
      return { valid: result.overall_valid, score: result.overall_score, violations: result.violations_count, warnings: result.warnings_count };
    case "ds_compare":
      return { best: result.best_scenario, scenarios: result.scenario_count, dimensions: result.dimensions_compared, scores: result.weighted_scores };
    case "ds_explain":
      return { decision: result.decision_type, factors: result.factor_count, primary_driver: result.primary_driver, trade_offs: result.trade_off_count };
    case "pr_assess":
      return { score: result.overall_score, status: result.overall_status, passed: result.checklist_summary?.passed, failed: result.checklist_summary?.failed, decision: result.approval?.decision };
    case "pr_checklist":
      return { total: result.total_items, passed: result.passed, warnings: result.warnings, failed: result.failed, filter: result.filter_category };
    case "pr_risk":
      return { total: result.total_risks, critical: result.risk_distribution?.critical, high: result.risk_distribution?.high, max_score: result.max_risk_score };
    case "pr_approve":
      return { decision: result.decision, score: result.overall_score, blockers: result.blockers?.length, sign_offs: result.required_sign_offs?.length, status: result.approval_status };
    case "rca_diagnose":
      return { defects: result.defect_types, causes: result.total_causes_identified, top_cause: result.top_cause?.description, probability: result.top_cause?.probability, confidence: result.confidence };
    case "rca_tree":
      return { defect: result.defect_type, causes: result.total_potential_causes, top_category: result.most_likely_category, categories: result.category_ranking?.length };
    case "rca_correlate":
      return { params_analyzed: result.total_parameters_analyzed, strong: result.strong_correlations, moderate: result.moderate_correlations, suspect: result.primary_suspect };
    case "rca_action_plan":
      return { actions: result.total_actions, immediate: result.action_breakdown?.immediate, corrective: result.action_breakdown?.corrective, preventive: result.action_breakdown?.preventive, effectiveness: result.estimated_overall_effectiveness };
    case "cqt_pareto":
      return { points: result.total_points_evaluated, frontier: result.pareto_frontier_size, cost_min: result.cost_range?.min, cost_max: result.cost_range?.max, quality_min: result.quality_range?.min, quality_max: result.quality_range?.max };
    case "cqt_optimize":
      return { cost: result.optimal_point?.total_cost, quality: result.optimal_point?.quality_score, vc: result.optimal_point?.parameters?.cutting_speed_m_min, fz: result.optimal_point?.parameters?.feed_per_tooth_mm, score: result.weighted_score };
    case "cqt_sensitivity":
      return { cost_sensitive: result.most_cost_sensitive, quality_sensitive: result.most_quality_sensitive, base_cost: result.base_cost, base_quality: result.base_quality_score };
    case "cqt_scenario":
      return { scenarios: result.scenarios_evaluated, best_cost: result.best_cost_scenario, best_quality: result.best_quality_scenario, recommendation: result.recommendation };
    case "wfo_plan":
      return { goal: result.plan?.goal_type, steps: result.summary?.total_steps, parallel_groups: result.summary?.parallel_execution_groups, complexity: result.plan?.estimated_complexity };
    case "wfo_execute":
      return { goal: result.goal_type, phases: result.total_phases, actions: result.total_actions, dry_run: result.dry_run, recipe: result.recommended_cce_recipe };
    case "wfo_status":
      return { engines: result.total_engine_groups, actions: result.total_actions, categories: result.categories?.length, goals: result.available_goals?.length };
    case "wfo_optimize":
      return { goal: result.goal_type, steps: result.current_plan_steps, suggestions: result.optimization_suggestions?.length, recipe: result.recommended_recipe };
    case "pk_capture":
      return { id: result.id, status: result.status, type: result.type, title: result.title, total: result.total_entries };
    case "pk_retrieve":
      return { id: result.entry?.id, title: result.entry?.title, total: result.total_entries, matches: result.total_matches };
    case "pk_search":
      return { matches: result.total_matches, material: result.query?.material, operation: result.query?.operation };
    case "pk_validate":
      return { violations: result.total_violations, errors: result.errors, warnings: result.warnings, verdict: result.verdict };
    case "al_learn":
      return { event_id: result.event_id, status: result.status, action: result.action, material: result.material, outcome: result.outcome };
    case "al_recommend":
      return { material: result.material, total_recommendations: result.total_recommendations, learning_status: result.learning_status };
    case "al_evaluate":
      return { model_status: result.model_status, total_events: result.total_events, total_patterns: result.total_patterns };
    case "al_history":
      return { total_events: result.total_events, recent_events: result.recent_events?.length ?? 0, common_workflows: result.common_workflows?.length ?? 0 };
    case "ig_register":
      return { endpoint_id: result.endpoint_id, status: result.status, name: result.name, type: result.type, total_endpoints: result.total_endpoints };
    case "ig_invoke":
      return { invocation_id: result.invocation_id, endpoint_name: result.endpoint_name, status: result.status, latency_ms: result.latency_ms };
    case "ig_schema":
      return { total_endpoints: result.total_endpoints, schemas: result.schemas?.length ?? 0 };
    case "ig_health":
      return { overall_health: result.overall_health, total: result.endpoint_summary?.total, active: result.endpoint_summary?.active };
    case "pm_predict_wear":
      return { tool_id: result.prediction?.tool_id, wear_pct: result.prediction?.current_wear_pct, remaining_min: result.prediction?.predicted_remaining_min, risk: result.prediction?.risk_level };
    case "pm_schedule":
      return { total_tools: result.total_tools, urgency: result.urgency, immediate: result.summary?.immediate_replacements };
    case "pm_failure_risk":
      return { tool_id: result.failure_risk?.tool_id, probability: result.failure_risk?.failure_probability, severity: result.failure_risk?.severity, mode: result.failure_risk?.failure_mode };
    case "pm_optimize_intervals":
      return { optimal_wear_pct: result.optimal?.replacement_at_wear_pct, cost_per_piece: result.optimal?.cost_per_piece, recommendation: result.recommendation };
    case "ah_score":
      return { machine_id: result.health?.machine_id, overall_score: result.health?.overall_score, status: result.health?.overall_status, critical: result.critical_subsystems };
    case "ah_degradation":
      return { machine_id: result.machine_id, rate: result.degradation_analysis?.degradation_rate_per_period, trend: result.degradation_analysis?.trend };
    case "ah_maintenance_plan":
      return { machine_id: result.machine_id, total_tasks: result.total_tasks, critical: result.summary?.critical_tasks, recommendation: result.scheduling_recommendation };
    case "ah_compare":
      return { total_machines: result.total_machines, fleet_status: result.fleet_status, avg_score: result.fleet_avg_score };
    case "sf_oee":
      return { machine_id: result.machine_id, oee: result.oee_pct, availability: result.availability, performance: result.performance, quality: result.quality, rating: result.rating };
    case "sf_utilization":
      return { total_machines: result.total_machines, fleet_avg: result.fleet_avg_utilization_pct, least_utilized: result.least_utilized, most_utilized: result.most_utilized };
    case "sf_bottleneck":
      return { bottleneck: result.bottleneck_station, throughput_per_hour: result.line_throughput_per_hour, balance_efficiency: result.balance_efficiency, exceeding_takt: result.stations_exceeding_takt };
    case "sf_capacity":
      return { total_machines: result.total_machines, fleet_load: result.fleet_load_ratio, spare_hours: result.fleet_spare_hours, weeks_until_full: result.weeks_until_full_capacity };
    case "rpt_generate":
      return { report_type: result.report_type, overall_status: result.overall_status, total_sections: result.total_sections, machine_count: result.machine_count };
    case "rpt_summary":
      return { status: result.status, total_machines: result.total_machines, avg_oee: result.kpis?.avg_oee_pct, avg_health: result.kpis?.avg_health_score, alerts: result.alerts?.critical_count };
    case "rpt_trend":
      return { metric: result.metric, fleet_direction: result.fleet_summary?.direction, degrading_count: result.fleet_summary?.degrading_count, avg_current: result.fleet_summary?.avg_current_value };
    case "rpt_export":
      return { format: result.format, title: result.title, size_bytes: result.size_bytes };
    case "tr_record":
      return { event_id: result.event_id, part_id: result.part_id, operation: result.operation, status: result.status };
    case "tr_genealogy":
      return { part_id: result.part_id, total_operations: result.bill_of_process?.total_operations, pass_rate: result.quality_summary?.pass_rate };
    case "tr_chain":
      return { part_id: result.part_id, total_steps: result.total_steps, lead_time_minutes: result.metrics?.lead_time_minutes, efficiency: result.metrics?.process_efficiency };
    case "tr_audit_trail":
      return { total_events: result.summary?.total_events, compliance_score: result.summary?.compliance_score, deviations: result.summary?.deviations_found, rating: result.summary?.compliance_rating };
    case "inv_status":
      return { total_items: result.total_items, alerts_count: result.alerts_count, total_value: result.total_inventory_value };
    case "inv_forecast":
      return { item_id: result.item_id, trend: result.forecast_summary?.trend, avg_daily: result.forecast_summary?.avg_daily, total: result.forecast_summary?.total_forecast };
    case "inv_reorder":
      return { total_items: result.total_items, needs_reorder: result.items_needing_reorder };
    case "inv_optimize":
      return { total_items: result.total_items, savings: result.total_savings_potential, abc_a: result.abc_summary?.A?.count, abc_b: result.abc_summary?.B?.count, abc_c: result.abc_summary?.C?.count };
    case "cost_estimate":
      return { part_id: result.part_id, total: result.cost_summary?.total_cost_per_part, material: result.cost_summary?.material_cost, machining: result.cost_summary?.machining_cost };
    case "cost_breakdown":
      return { part_id: result.part_id, total: result.total_cost, direct: result.direct_cost, indirect: result.indirect_cost };
    case "cost_compare":
      return { scenarios: result.total_scenarios, best: result.best_option, savings: result.savings_potential, savings_pct: result.savings_pct };
    case "cost_whatif":
      return { baseline_cost: result.baseline_cost, most_sensitive: result.most_sensitive };
    case "comp_check":
      return { standard: result.standard, compliance_pct: result.compliance_pct, status: result.overall_status, gaps: result.gaps_found };
    case "comp_certify":
      return { entity_id: result.entity_id, total: result.total_certifications, valid: result.valid_count, expired: result.expired_count, status: result.overall_status };
    case "comp_report":
      return { rating: result.overall_rating, avg_compliance: result.avg_compliance_pct, total_gaps: result.total_gaps };
    case "comp_standards":
      return { total_found: result.total_found, standards: result.standards?.map((s: any) => s.id) };
    case "en_consumption":
      return { machines: result.fleet_summary?.machines_monitored, total_kwh: result.fleet_summary?.total_kwh, total_cost: result.fleet_summary?.total_cost_usd };
    case "en_profile":
      return { power_kw: result.power_profile?.steady_state_power_kw, cycle_kwh: result.cycle?.total_energy_kwh, efficiency: result.efficiency?.energy_efficiency };
    case "en_demand":
      return { avg_kw: result.summary?.avg_demand_kw, peak_kw: result.summary?.max_peak_demand_kw, total_kwh: result.summary?.total_energy_kwh, bill_usd: result.summary?.total_bill_usd };
    case "en_benchmark":
      return { machines: result.fleet_summary?.machines_benchmarked, avg_efficiency: result.fleet_summary?.avg_efficiency_ratio, savings: result.fleet_summary?.potential_annual_savings_usd };
    case "co2_calculate":
      return { total_kgco2: result.emissions?.total_kgco2, per_kg: result.emissions?.per_kg_product_kgco2, rating: result.carbon_intensity_rating };
    case "co2_lifecycle":
      return { total_kgco2: result.total_kgco2, per_year: result.per_year_kgco2, hotspot: result.hotspot?.phase, rating: result.comparison?.rating };
    case "co2_reduce":
      return { recommendations: result.plan_summary?.recommendations_count, reduction_pct: result.plan_summary?.reduction_achieved_pct, target_met: result.plan_summary?.target_met };
    case "co2_report":
      return { total_tco2: result.emissions_summary?.total_tco2, dominant: result.emissions_summary?.dominant_scope, kgco2_per_part: result.intensity_metrics?.kgco2_per_part };
    case "sus_waste":
      return { streams: result.summary?.total_streams, waste_kg: result.summary?.total_waste_kg, recycle_pct: result.summary?.overall_recycle_rate_pct };
    case "sus_recycle":
      return { recycled_kg: result.summary?.total_recycled_kg, rate_pct: result.summary?.overall_recycle_rate_pct, revenue: result.summary?.monthly_revenue_usd };
    case "sus_water":
      return { total_m3: result.summary?.total_intake_m3, recycled_m3: result.summary?.recycled_recirculated_m3, cost: result.summary?.total_cost_usd };
    case "sus_kpi":
      return { score: result.overall?.sustainability_score, rating: result.overall?.rating, on_target: result.overall?.kpis_on_target, total: result.overall?.total_kpis };
    case "res_optimize":
      return { energy_saving_pct: result.savings?.energy_pct, co2_saving_pct: result.savings?.co2_pct, cost_saving_pct: result.savings?.cost_pct };
    case "res_allocate":
      return { jobs: result.summary?.jobs_allocated, utilization: result.summary?.utilization_pct, energy_kwh: result.summary?.total_energy_kwh };
    case "res_green":
      return { recommendations: result.summary?.recommendations_count, co2_reduction_pct: result.summary?.total_co2_reduction_pct, quick_wins: result.summary?.quick_wins };
    case "res_comply":
      return { standards: result.summary?.standards_assessed, certified: result.summary?.certified, avg_compliance: result.summary?.avg_compliance_pct, gaps: result.summary?.total_gaps };
    case "op_skills":
      return { operators: result.total_operators || 1, avg_proficiency: result.summary?.avg_proficiency, quality: result.summary?.quality_score || result.fleet_summary?.avg_quality };
    case "op_certify":
      return { total: result.summary?.total_certifications || result.summary?.total_records, valid: result.summary?.valid, expiring: result.summary?.expiring_soon, expired: result.summary?.expired };
    case "op_assess":
      return { score: result.overall_score, rating: result.rating, gaps: result.summary?.has_gap };
    case "op_matrix":
      return { operators: result.summary?.operators_analyzed, skills: result.summary?.skills_tracked, coverage_pct: result.summary?.avg_skill_coverage_pct, risks: result.summary?.critical_skill_risks };
    case "trn_program":
      return { programs: result.total_programs, hours: result.catalog_summary?.total_hours, cost: result.catalog_summary?.total_cost };
    case "trn_progress":
      return { enrollments: result.summary?.total_enrollments, completed: result.summary?.completed, in_progress: result.summary?.in_progress, avg_progress: result.summary?.avg_progress_pct };
    case "trn_gap":
      return { operators: result.summary?.operators_analyzed, gaps: result.summary?.total_skill_gaps, avg_gaps: result.summary?.avg_gaps_per_operator, top_gap: result.summary?.most_common_gap };
    case "trn_recommend":
      return { programs: result.summary?.programs_recommended, cost: result.recommended_path?.total_cost_usd, hours: result.recommended_path?.total_hours, certs: result.summary?.certifications_achievable };
    case "kc_capture":
      return { entries: result.total_entries, verified_pct: result.knowledge_base_stats?.verified_pct, avg_rating: result.knowledge_base_stats?.avg_rating };
    case "kc_search":
      return { total_hits: result.summary?.total_hits, kb_hits: result.summary?.knowledge_base_hits, bp_hits: result.summary?.best_practice_hits, ll_hits: result.summary?.lesson_learned_hits };
    case "kc_best_practice":
      return { total: result.total, avg_adoption: result.summary?.avg_adoption_rate };
    case "kc_lesson":
      return { total: result.total || 1, cost_impact: result.summary?.total_cost_impact_usd, implementation_pct: result.summary?.implementation_rate_pct };
    case "wf_schedule":
      return { shifts: result.total_shifts, operators: result.summary?.total_available, capacity_hrs: result.summary?.total_weekly_capacity_hours, cost: result.summary?.total_weekly_labor_cost_usd };
    case "wf_assign":
      return { machines: result.summary?.machines_evaluated, assigned: result.summary?.fully_assigned, unassignable: result.summary?.unassignable, avg_fit: result.summary?.avg_fit_score };
    case "wf_capacity":
      return { utilization_pct: result.current_state?.utilization_pct, status: result.current_state?.status, bottlenecks: result.summary?.skill_bottleneck_count, weeks_to_over: result.summary?.weeks_until_over_capacity };
    case "wf_balance":
      return { score: result.balance_score, rating: result.rating, suggestions: result.summary?.suggestions_count, cost: result.summary?.total_weekly_labor_cost };
    case "sup_scorecard":
      return { suppliers: result.total_suppliers || 1, score: result.overall_score || result.summary?.avg_score, rating: result.rating || undefined };
    case "sup_risk":
      return { risk: result.overall_risk, risks: result.risk_count || result.summary?.total_risk_items, critical: result.summary?.critical_risk };
    case "sup_audit":
      return { overdue: result.summary?.overdue, due_soon: result.summary?.due_soon, avg_score: result.summary?.avg_audit_score || result.audit_score };
    case "sup_compare":
      return { compared: result.total_compared, avg_score: result.summary?.avg_score, best: result.comparison_highlights?.best_overall?.name };
    case "src_price":
      return { material: result.material_name, quotes: result.total_quotes, best_price: result.best_price || result.summary?.lowest_unit_price };
    case "src_availability":
      return { material: result.material_name, in_stock: result.in_stock, total_available: result.total_available_qty || result.summary?.total_available };
    case "src_alternative":
      return { material: result.material_name, alternatives: result.total_alternatives, best_match: result.best_match?.name || result.summary?.top_alternative };
    case "src_optimize":
      return { materials: result.total_materials, savings_pct: result.potential_savings_pct, strategy: result.strategy || result.summary?.recommendation };
    case "lt_forecast":
      return { forecasts: result.total_forecasts, avg_p50: result.summary?.avg_p50_days, at_risk: result.summary?.at_risk_count };
    case "lt_track":
      return { orders: result.total_orders, delayed: result.summary?.delayed_count, high_risk: result.summary?.high_risk_count };
    case "lt_disrupt":
      return { alerts: result.total_alerts, critical: result.summary?.critical_count, impacted_orders: result.summary?.impacted_orders_count };
    case "lt_expedite":
      return { evaluated: result.total_orders_evaluated, days_saved: result.summary?.total_potential_days_saved, critical: result.summary?.critical_orders };
    case "proc_spend":
      return { total_spend: result.total_spend, orders: result.total_orders, top_category: result.summary?.top_category };
    case "proc_contract":
      return { contracts: result.total_contracts, expiring: result.summary?.expiring_count, underperforming: result.summary?.underperforming_count };
    case "proc_optimize":
      return { opportunities: result.total_opportunities, savings_pct: result.summary?.savings_pct, quick_wins: result.summary?.quick_wins };
    case "proc_report":
      return { health_score: result.summary?.health_score, risks: result.summary?.risk_count, recommendation: result.summary?.recommendation };
    case "job_schedule":
      return { jobs: result.total_jobs, on_track: result.summary?.jobs_on_track, at_risk: result.summary?.jobs_at_risk };
    case "job_priority":
      return { ranked: result.total_ranked, critical: result.summary?.critical_count, avg_score: result.summary?.avg_score };
    case "job_status":
      return { jobs: result.total_jobs, on_time_pct: result.summary?.on_time_pct, remaining_hours: result.summary?.total_remaining_hours };
    case "job_reschedule":
      return { affected: result.total_affected, will_be_late: result.summary?.jobs_will_be_late, critical_affected: result.summary?.critical_jobs_affected };
    case "alloc_assign":
      return { jobs: result.total_jobs, with_candidates: result.summary?.jobs_with_candidates, est_cost: result.summary?.total_estimated_cost };
    case "alloc_balance":
      return { machines: result.total_machines, balance_score: result.balance_metrics?.balance_score, rebalance: result.summary?.rebalance_opportunities };
    case "alloc_setup":
      return { machines: result.total_machines_analyzed, savings_hours: result.summary?.total_savings_hours, savings_pct: result.summary?.overall_savings_pct };
    case "alloc_conflict":
      return { conflicts: result.total_conflicts, critical: result.summary?.critical_count, risk: result.summary?.overall_risk };
    case "seq_optimize":
      return { orders: result.total_orders, savings_hrs: result.summary?.total_savings_hrs, opportunities: result.summary?.orders_with_opportunities };
    case "seq_bottleneck":
      return { centers: result.total_work_centers, bottlenecks: result.summary?.bottleneck_count, primary: result.summary?.primary_bottleneck };
    case "seq_flow":
      return { orders: result.total_orders, efficiency_pct: result.summary?.avg_flow_efficiency_pct, wip_hrs: result.summary?.total_wip_hrs };
    case "seq_reorder":
      return { orders: result.total_orders, changes: result.summary?.changes_count, most_urgent: result.summary?.most_urgent };
    case "cap_forecast":
      return { resources: result.total_resources, overtime_hrs: result.summary?.total_overtime_hrs, shortfall_hrs: result.summary?.total_shortfall_hrs };
    case "cap_demand":
      return { periods: result.total_periods, deficit_periods: result.summary?.periods_with_deficit, avg_util: result.summary?.avg_utilization_pct };
    case "cap_overtime":
      return { resources_needing: result.total_resources_needing_overtime, total_cost: result.summary?.total_overtime_cost, within_budget: result.summary?.within_budget };
    case "cap_report":
      return { health_score: result.summary?.health_score, risks: result.summary?.risk_count, recommendation: result.summary?.recommendation };
    case "ecn_create":
      return { total_ecns: result.total_ecns, critical: result.summary?.critical_count, cost_impact: result.summary?.total_cost_impact };
    case "ecn_impact":
      return { parts_affected: result.impact_summary?.total_parts_affected, risk_level: result.impact_summary?.risk_level, scrap_cost: result.impact_summary?.total_scrap_cost };
    case "ecn_approve":
      return { fully_approved: result.summary?.fully_approved, at_risk: result.summary?.at_risk_count, bottlenecks: result.bottlenecks?.length };
    case "ecn_implement":
      return { implemented: result.summary?.fully_implemented, on_track: result.summary?.on_track, at_risk: result.summary?.at_risk };
    case "bom_structure":
      return { total_items: result.summary?.total_items, rollup_cost: result.summary?.total_rollup_cost, depth: result.summary?.max_bom_depth };
    case "bom_compare":
      return { differences: result.summary?.total_differences, cost_delta: result.cost_comparison?.cost_delta, commonality: result.summary?.commonality_percent };
    case "bom_whereused":
      return { usages: result.summary?.total_usages, assemblies: result.summary?.assemblies_containing?.length, common: result.summary?.is_common_part };
    case "bom_configure":
      return { configs: result.comparison?.config_count || 1, cost_range: result.comparison?.cost_range?.spread, lowest: result.comparison?.lowest_cost };
    case "rev_track":
      return { documents: result.summary?.unique_documents, released: result.summary?.active_released, pending: result.summary?.pending_review };
    case "rev_effectivity":
      return { effective: result.summary?.total_effective, pending_replacement: result.summary?.pending_replacements, upcoming: result.summary?.upcoming_30days };
    case "rev_supersede":
      return { chain_length: result.chain_length, current: result.analysis?.current_revision, avg_interval: result.analysis?.avg_revision_interval_days };
    case "rev_audit":
      return { entries: result.total_entries, compliance: result.compliance?.status, issues: result.compliance?.issues_found };
    case "doc_route":
      return { active: result.summary?.active, overdue: result.summary?.overdue, completion: result.summary?.avg_completion_pct };
    case "doc_sign":
      return { signatures: result.total_signatures, all_valid: result.integrity?.all_valid, signers: result.summary?.unique_signers };
    case "doc_distribute":
      return { distributions: result.total_distributions, ack_rate: result.summary?.acknowledgment_rate, pending_recalls: result.summary?.pending_recalls };
    case "doc_comply":
      return { score: result.summary?.compliance_score, status: result.summary?.overall_status, failures: result.summary?.fail };
    case "wh_locate":
      return { locations: result.locations_found, occupied: result.summary?.occupied, empty: result.summary?.empty };
    case "wh_slot":
      return { a_items: result.summary?.a_items, relocations: result.summary?.relocations_needed, savings_pct: result.summary?.estimated_pick_time_reduction_pct };
    case "wh_pick":
      return { picks: result.summary?.total_picks, ready: result.summary?.ready, shortages: result.summary?.shortages };
    case "wh_putaway":
      return { suggestions: result.summary?.total_suggestions, strategy: result.summary?.strategy, recommended: result.recommended?.location_id };
    case "kit_assemble":
      return { kits: result.total_kits, complete: result.summary?.complete, shortages: result.summary?.with_shortages };
    case "kit_shortage":
      return { shortages: result.total_shortages, critical_at_risk: result.impact?.critical_kits_at_risk, on_order: result.impact?.parts_on_order };
    case "kit_stage":
      return { areas: result.summary?.total_areas, available_slots: result.summary?.available_slots, ready: result.ready_for_staging };
    case "kit_track":
      return { kits: result.total_kits, at_risk: result.summary?.at_risk, avg_completion: result.summary?.avg_completion };
    case "ship_receive":
      return { receipts: result.total_receipts, pending_inspection: result.summary?.pending_inspection, on_time: result.summary?.on_time_rate };
    case "ship_dispatch":
      return { shipments: result.total_shipments, ready: result.summary?.ready_to_ship, late: result.summary?.late };
    case "ship_dock":
      return { doors: result.total_doors, available: result.summary?.available, utilization: result.summary?.utilization_pct };
    case "ship_carrier":
      return { carriers: result.total_carriers, best_value: result.recommendations?.best_value?.name, avg_on_time: result.summary?.avg_on_time };
    case "yard_assign":
      return { spots: result.total_spots, available: result.summary?.available, utilization: result.summary?.utilization_pct };
    case "yard_trailer":
      return { trailers: result.total_trailers, on_site: result.summary?.on_site, avg_dwell: result.summary?.avg_dwell_hours };
    case "yard_appoint":
      return { appointments: result.total_appointments, today: result.summary?.today_count, on_time_pct: result.summary?.on_time_pct };
    case "yard_move":
      return { moves: result.total_moves, pending: result.summary?.pending, avg_time: result.summary?.avg_move_minutes };
    case "vsm_map":
      return { maps: result.total_maps, pce_ratio: result.value_streams?.[0]?.summary?.pce_ratio_pct, takt: result.value_streams?.[0]?.summary?.takt_time_sec };
    case "vsm_takt":
      return { takt_sec: result.takt_time_sec, bottleneck: result.summary?.bottleneck_step, demand_met: result.summary?.demand_met };
    case "vsm_cycle":
      return { total_cycle: result.summary?.total_cycle_time_sec, value_add_pct: result.summary?.value_add_ratio_pct, bottleneck: result.summary?.bottleneck?.step };
    case "vsm_future":
      return { cycle_reduction: result.summary?.cycle_reduction_pct, wip_reduction: result.summary?.wip_reduction_pct, improvements: result.summary?.improvement_count };
    case "kai_event":
      return { events: result.total_events, savings: result.summary?.total_savings_usd, avg_improvement: result.summary?.avg_improvement_pct };
    case "kai_a3":
      return { reports: result.total_reports, completion: result.reports?.[0]?.progress?.completion_pct, root_causes: result.reports?.[0]?.root_causes?.length };
    case "kai_track":
      return { tracked: result.total_tracked, hit_rate: result.summary?.hit_rate_pct, total_savings: result.summary?.total_savings_usd };
    case "kai_sustain":
      return { checks: result.total_checks, sustainment_pct: result.summary?.overall_sustainment_pct, at_risk: result.summary?.at_risk?.length };
    case "six_dmaic":
      return { projects: result.total_projects, savings: result.summary?.total_projected_savings, sigma_gain: result.summary?.avg_sigma_improvement };
    case "six_chart":
      return { charts: result.total_charts, in_control: result.summary?.in_control, alerts: result.summary?.out_of_control };
    case "six_capability":
      return { studies: result.total_studies, avg_cpk: result.summary?.avg_cpk, capable_pct: result.summary?.capability_rate_pct };
    case "six_analyze":
      return { type: result.analysis_type, projects: result.active_projects, avg_sigma: result.avg_sigma_level };
    case "lean_oee":
      return { overall_oee: result.summary?.overall_oee_pct, downtime: result.summary?.total_downtime_min, records: result.total_records };
    case "lean_fty":
      return { rty: result.summary?.rolled_throughput_yield_pct, scrap: result.summary?.total_scrap, worst: result.summary?.worst_step?.step };
    case "lean_waste":
      return { annual_cost: result.summary?.total_annual_waste_usd, top_type: result.summary?.top_waste_type, high_severity: result.summary?.high_severity };
    case "lean_kpi":
      return { total_kpis: result.summary?.total_kpis, on_target: result.summary?.on_target, health: result.summary?.overall_health };
    default:
      // Generic: pick first 5 numeric/string fields
      const kv: Record<string, any> = {};
      let count = 0;
      for (const [k, v] of Object.entries(result)) {
        if (k.startsWith('_') || k === 'warnings') continue;
        if (typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean') {
          kv[k] = v;
          if (++count >= 5) break;
        }
      }
      return kv;
  }
}

/** XA-6: Basic input validation for material name parameters */
function validateMaterialName(name: string | undefined): string | null {
  if (!name) return null;
  // Reject path traversal, injection patterns
  if (/[\.\.\/\\]|<|>|\$|\{|\}/.test(name)) return null;
  // Allow alphanumeric + common material name chars
  if (!/^[a-zA-Z0-9\-_.\/\s]+$/.test(name)) return null;
  return name.trim();
}

const ACTIONS = [
  "cutting_force", "tool_life", "speed_feed", "flow_stress", "surface_finish",
  "mrr", "power", "torque", "chip_load", "stability", "deflection", "thermal",
  "cost_optimize", "multi_optimize", "productivity", "engagement",
  "trochoidal", "hsm", "scallop", "stepover", "cycle_time", "arc_fit",
  "chip_thinning", "multi_pass", "coolant_strategy", "gcode_snippet",
  "tolerance_analysis", "fit_analysis", "gcode_generate", "decision_tree",
  "render_report", "campaign_create", "campaign_validate", "campaign_optimize",
  "campaign_cycle_time", "inference_chain",
  "wear_prediction", "process_cost_calc", "uncertainty_chain",
  "controller_optimize",
  "surface_integrity_predict", "chatter_predict", "thermal_compensate",
  "unified_machining_model", "coupling_sensitivity",
  "rz_kinematic", "rz_milling", "surface_profile", "chip_form",
  "sld_generate", "sld_evaluate", "thermal_distort",
  "gdt_parse", "gdt_stack", "gdt_datum_ref", "gdt_zone", "gdt_report",
  "cce_compose", "cce_list", "cce_cache_stats", "cce_cache_clear",
  "sim_cutting", "sim_force_profile", "sim_thermal_profile", "sim_vibration",
  "twin_create", "twin_remove_material", "twin_state", "twin_compare",
  "verify_process", "verify_tolerance", "verify_surface", "verify_stability",
  "sensitivity_1d", "sensitivity_2d", "sensitivity_pareto", "sensitivity_montecarlo",
  "mfb_record", "mfb_compare", "mfb_error_stats", "mfb_correction",
  "spc_xbar_r", "spc_cusum", "spc_ewma", "spc_capability",
  "cal_update", "cal_status", "cal_reset", "cal_validate",
  "batch_kpi", "batch_trend", "batch_compare", "batch_summary",
  "gdt_chain_montecarlo", "gdt_chain_allocate", "gdt_chain_sensitivity", "gdt_chain_2d",
  "mps_roughing_plan", "mps_finish_plan", "mps_full_strategy", "mps_evaluate",
  "cpk_analyze", "cpk_improve", "cpk_center", "cpk_reduce_spread",
  "twc_predict", "twc_compensate", "twc_schedule", "twc_history",
  "ds_recommend", "ds_validate", "ds_compare", "ds_explain",
  "pr_assess", "pr_checklist", "pr_risk", "pr_approve",
  "rca_diagnose", "rca_tree", "rca_correlate", "rca_action_plan",
  "cqt_pareto", "cqt_optimize", "cqt_sensitivity", "cqt_scenario",
  "wfo_plan", "wfo_execute", "wfo_status", "wfo_optimize",
  "pk_capture", "pk_retrieve", "pk_search", "pk_validate",
  "al_learn", "al_recommend", "al_evaluate", "al_history",
  "ig_register", "ig_invoke", "ig_schema", "ig_health",
  "pm_predict_wear", "pm_schedule", "pm_failure_risk", "pm_optimize_intervals",
  "ah_score", "ah_degradation", "ah_maintenance_plan", "ah_compare",
  "sf_oee", "sf_utilization", "sf_bottleneck", "sf_capacity",
  "rpt_generate", "rpt_summary", "rpt_trend", "rpt_export",
  "tr_record", "tr_genealogy", "tr_chain", "tr_audit_trail",
  "inv_status", "inv_forecast", "inv_reorder", "inv_optimize",
  "cost_estimate", "cost_breakdown", "cost_compare", "cost_whatif",
  "comp_check", "comp_certify", "comp_report", "comp_standards",
  "en_consumption", "en_profile", "en_demand", "en_benchmark",
  "co2_calculate", "co2_lifecycle", "co2_reduce", "co2_report",
  "sus_waste", "sus_recycle", "sus_water", "sus_kpi",
  "res_optimize", "res_allocate", "res_green", "res_comply",
  "op_skills", "op_certify", "op_assess", "op_matrix",
  "trn_program", "trn_progress", "trn_gap", "trn_recommend",
  "kc_capture", "kc_search", "kc_best_practice", "kc_lesson",
  "wf_schedule", "wf_assign", "wf_capacity", "wf_balance",
  "sup_scorecard", "sup_risk", "sup_audit", "sup_compare",
  "src_price", "src_availability", "src_alternative", "src_optimize",
  "lt_forecast", "lt_track", "lt_disrupt", "lt_expedite",
  "proc_spend", "proc_contract", "proc_optimize", "proc_report",
  "job_schedule", "job_priority", "job_status", "job_reschedule",
  "alloc_assign", "alloc_balance", "alloc_setup", "alloc_conflict",
  "seq_optimize", "seq_bottleneck", "seq_flow", "seq_reorder",
  "cap_forecast", "cap_demand", "cap_overtime", "cap_report",
  "ecn_create", "ecn_impact", "ecn_approve", "ecn_implement",
  "bom_structure", "bom_compare", "bom_whereused", "bom_configure",
  "rev_track", "rev_effectivity", "rev_supersede", "rev_audit",
  "doc_route", "doc_sign", "doc_distribute", "doc_comply",
  "wh_locate", "wh_slot", "wh_pick", "wh_putaway",
  "kit_assemble", "kit_shortage", "kit_stage", "kit_track",
  "ship_receive", "ship_dispatch", "ship_dock", "ship_carrier",
  "yard_assign", "yard_trailer", "yard_appoint", "yard_move",
  "vsm_map", "vsm_takt", "vsm_cycle", "vsm_future",
  "kai_event", "kai_a3", "kai_track", "kai_sustain",
  "six_dmaic", "six_chart", "six_capability", "six_analyze",
  "lean_oee", "lean_fty", "lean_waste", "lean_kpi",
  "optimize_parameters", "optimize_sequence", "sustainability_report", "eco_optimize",
  "fixture_recommend"
] as const;

export function registerCalcDispatcher(server: any): void {
  server.tool(
    "prism_calc",
    "Manufacturing physics calculations: cutting force, tool life, speed/feed, flow stress, surface finish, MRR, power, torque, chip load, stability, deflection, thermal, cost/multi-objective optimization, trochoidal/HSM, scallop, cycle time, chip thinning compensation, multi-pass strategy, coolant strategy, G-code generation, tolerance analysis (ISO 286), shaft/hole fit analysis, parametric G-code templates (6 controllers, 13 operations), decision trees (tool/insert/coolant/workholding/strategy/approach selection), report rendering (setup sheet, process plan, cost estimate, tool list, inspection plan, alarm report, speed/feed card), campaign orchestration (create/validate/optimize/cycle_time for batch machining campaigns with cumulative safety tracking), wear prediction (three-zone flank wear model with Taylor-based tool life), process cost calculation (speed/feed to cost chain with batch economics), uncertainty chain (GUM-compliant uncertainty propagation through Kienzle/Taylor/power/cost), controller optimization (controller-specific G-code features for Fanuc/Siemens/Haas/Mazak/Okuma/Heidenhain with roughing/finishing/contouring modes).",
    {
      action: z.enum(ACTIONS),
      params: z.record(z.any()).optional()
    },
    async ({ action, params: rawParams = {} }) => {
      log.info(`[prism_calc] Action: ${action}`);
      
      // Normalize common parameter aliases for usability
      const params: Record<string, any> = { ...rawParams };
      if (params.depth_of_cut !== undefined && params.axial_depth === undefined) params.axial_depth = params.depth_of_cut;
      if (params.width_of_cut !== undefined && params.radial_depth === undefined) params.radial_depth = params.width_of_cut;
      if (params.flutes !== undefined && params.number_of_teeth === undefined) params.number_of_teeth = params.flutes;
      if (params.ap !== undefined && params.axial_depth === undefined) params.axial_depth = params.ap;
      if (params.ae !== undefined && params.radial_depth === undefined) params.radial_depth = params.ae;
      if (params.fz !== undefined && params.feed_per_tooth === undefined) params.feed_per_tooth = params.fz;
      if (params.vc !== undefined && params.cutting_speed === undefined) params.cutting_speed = params.vc;
      if (params.fn !== undefined && params.feed_per_rev === undefined) params.feed_per_rev = params.fn;
      if (params.n !== undefined && params.rpm === undefined) params.rpm = params.n;
      if (params.diameter !== undefined && params.tool_diameter === undefined) params.tool_diameter = params.diameter;
      // H1-MS2: Also accept camelCase → snake_case for calc
      if (params.toolDiameter !== undefined && params.tool_diameter === undefined) params.tool_diameter = params.toolDiameter;
      if (params.feedPerTooth !== undefined && params.feed_per_tooth === undefined) params.feed_per_tooth = params.feedPerTooth;
      if (params.axialDepth !== undefined && params.axial_depth === undefined) params.axial_depth = params.axialDepth;
      if (params.radialDepth !== undefined && params.radial_depth === undefined) params.radial_depth = params.radialDepth;
      if (params.cuttingSpeed !== undefined && params.cutting_speed === undefined) params.cutting_speed = params.cuttingSpeed;
      if (params.spindleSpeed !== undefined && params.rpm === undefined) params.rpm = params.spindleSpeed;
      if (params.numberOfFlutes !== undefined && params.number_of_teeth === undefined) params.number_of_teeth = params.numberOfFlutes;
      if (params.feedPerRev !== undefined && params.feed_per_rev === undefined) params.feed_per_rev = params.feedPerRev;
      if (params.feedRate !== undefined && params.feed_rate === undefined) params.feed_rate = params.feedRate;
      
      let result: any;
      
      // Map actions to specific pre-hook phases
      const SPECIFIC_HOOKS: Record<string, string> = {
        cutting_force: "pre-kienzle",
        tool_life: "pre-taylor",
        flow_stress: "pre-johnson-cook"
      };
      
      try {
        // === PRE-CALCULATION HOOKS (9 hooks: lesson recall, validation, compatibility, force bounds, circuit breaker) ===
        const hookCtx = {
          operation: action,
          target: { type: "calculation" as const, id: action, data: params },
          metadata: { dispatcher: "calcDispatcher", action, params }
        };
        
        const preResult = await hookExecutor.execute("pre-calculation", hookCtx);
        if (preResult.blocked) {
          return {
            content: [{ type: "text", text: JSON.stringify({
              blocked: true,
              blocker: preResult.blockedBy,
              reason: preResult.summary,
              action,
              hook_results: preResult.results.map(r => ({ id: r.hookId, blocked: r.blocked, message: r.message }))
            }) }]
          };
        }
        
        // Fire specific formula hooks (e.g. pre-kienzle for cutting_force)
        const specificPhase = SPECIFIC_HOOKS[action];
        if (specificPhase) {
          const specResult = await hookExecutor.execute(specificPhase as any, hookCtx);
          if (specResult.blocked) {
            return {
              content: [{ type: "text", text: JSON.stringify({
                blocked: true,
                blocker: specResult.blockedBy,
                reason: specResult.summary,
                action,
                hook_phase: specificPhase
              }) }]
            };
          }
        }
        
        switch (action) {
          case "cutting_force": {
            // Auto-derive cutting_speed from material if not provided
            let autoVc = params.cutting_speed;
            if (!autoVc && (params.material_id || params.material)) {
              const matLookup = await registryManager.materials.getByIdOrName(params.material_id || params.material);
              if (matLookup) {
                const cr = (matLookup as any).cutting_recommendations?.milling;
                autoVc = cr?.speed_roughing || cr?.speed_finishing || 150;
              }
            }
            if (!autoVc) autoVc = 150; // Safe default
            
            const conditions: CuttingConditions = {
              cutting_speed: autoVc,
              feed_per_tooth: params.feed_per_tooth,
              axial_depth: params.axial_depth,
              radial_depth: params.radial_depth,
              tool_diameter: params.tool_diameter,
              number_of_teeth: params.number_of_teeth,
              rake_angle: params.rake_angle || 6
            };
            
            let coefficients: KienzleCoefficients;
            if (params.kc1_1 && params.mc) {
              coefficients = { kc1_1: params.kc1_1, mc: params.mc };
            } else if (params.material_id || params.material) {
              const matId = params.material_id || params.material;
              const mat = await registryManager.materials.getByIdOrName(matId);
              if (mat?.kienzle) {
                const k = mat.kienzle;
                coefficients = { 
                  kc1_1: k.kc1_1_milling || k.kc1_1, 
                  mc: k.mc_milling || k.mc,
                  iso_group: mat.iso_group,
                  data_quality: mat.data_quality
                } as any;
              } else {
                coefficients = getDefaultKienzle(params.material_group || "steel_medium_carbon");
              }
            } else {
              coefficients = getDefaultKienzle(params.material_group || "steel_medium_carbon");
            }
            
            result = calculateKienzleCuttingForce(conditions, coefficients);
            break;
          }
          
          case "tool_life": {
            let coefficients: TaylorCoefficients;
            if (params.taylor_C && params.taylor_n) {
              coefficients = { C: params.taylor_C, n: params.taylor_n, tool_material: params.tool_material || "Carbide" };
            } else if (params.material_id || params.material) {
              const matId = params.material_id || params.material;
              const mat = await registryManager.materials.getByIdOrName(matId);
              const toolMat = params.tool_material || "Carbide";
              if (mat?.taylor) {
                const t = mat.taylor;
                const useC = toolMat.toLowerCase().includes("carbide") ? (t.C_carbide || t.C) : t.C;
                const useN = toolMat.toLowerCase().includes("carbide") ? (t.n_carbide || t.n) : t.n;
                coefficients = { C: useC, n: useN, tool_material: toolMat };
              } else {
                coefficients = getDefaultTaylor(params.material_group || "steel", toolMat);
              }
            } else {
              coefficients = getDefaultTaylor(params.material_group || "steel", params.tool_material || "Carbide");
            }
            
            result = calculateTaylorToolLife(
              params.cutting_speed,
              coefficients,
              params.feed,
              params.depth
            );
            break;
          }
          
          case "speed_feed": {
            // R1: Pass SpeedFeedInput object, not positional args
            const sfInput = {
              material_hardness: params.material_hardness || 200,
              tool_material: params.tool_material || "Carbide",
              operation: params.operation || "semi-finishing",
              tool_diameter: params.tool_diameter || 12,
              number_of_teeth: params.number_of_teeth || 4,
              kienzle: undefined as any,
              taylor: undefined as any,
            };
            
            // Auto-lookup material data if material_id provided
            if (params.material_id || params.material) {
              const matId = params.material_id || params.material;
              const mat = await registryManager.materials.getByIdOrName(matId);
              if (mat) {
                sfInput.material_hardness = mat.mechanical?.hardness?.brinell || sfInput.material_hardness;
                if (mat.kienzle) sfInput.kienzle = { kc1_1: mat.kienzle.kc1_1, mc: mat.kienzle.mc };
                if (mat.taylor) sfInput.taylor = { C: mat.taylor.C, n: mat.taylor.n };
              }
            }
            
            result = calculateSpeedFeed(sfInput);
            break;
          }
          
          case "flow_stress": {
            const jcParams: JohnsonCookParams = {
              A: params.A,
              B: params.B,
              n: params.n,
              C: params.C,
              m: params.m,
              T_melt: params.T_melt,
              T_ref: params.T_ref || 20
            };
            
            result = calculateJohnsonCookStress(
              params.strain,
              params.strain_rate,
              params.temperature,
              jcParams
            );
            break;
          }
          
          case "surface_finish": {
            result = calculateSurfaceFinish(
              params.feed,
              params.nose_radius,
              params.is_milling || false,
              params.radial_depth,
              params.tool_diameter
            );
            break;
          }
          
          case "mrr": {
            const mrrConditions: CuttingConditions = {
              cutting_speed: params.cutting_speed,
              feed_per_tooth: params.feed_per_tooth,
              axial_depth: params.axial_depth,
              radial_depth: params.radial_depth,
              tool_diameter: params.tool_diameter,
              number_of_teeth: params.number_of_teeth
            };
            result = calculateMRR(mrrConditions, params.volume_to_remove);
            break;
          }
          
          case "power": {
            result = calculateSpindlePower(
              params.cutting_force,
              params.cutting_speed,
              params.tool_diameter,
              params.efficiency || 0.8
            );
            break;
          }
          
          case "chip_load": {
            result = calculateChipLoad(
              params.feed_rate,
              params.spindle_speed,
              params.number_of_teeth,
              params.radial_depth,
              params.tool_diameter
            );
            break;
          }
          
          case "torque": {
            result = calculateTorque(
              params.cutting_force,
              params.tool_diameter || params.workpiece_diameter,
              params.operation || "milling"
            );
            break;
          }
          
          case "stability": {
            const modal: ModalParameters = {
              natural_frequency: params.natural_frequency,
              damping_ratio: params.damping_ratio,
              stiffness: params.stiffness
            };
            
            result = calculateStabilityLobes(
              modal,
              params.specific_force,
              params.number_of_teeth,
              params.current_depth,
              params.current_speed
            );
            break;
          }
          
          case "deflection": {
            result = calculateToolDeflection(
              params.cutting_force,
              params.tool_diameter,
              params.overhang_length,
              params.youngs_modulus || 600,
              params.runout || 0.005
            );
            break;
          }
          
          case "thermal": {
            result = calculateCuttingTemperature(
              params.cutting_speed,
              params.feed,
              params.depth,
              params.specific_force,
              params.thermal_conductivity || 50,
              params.workpiece_length
            );
            break;
          }
          
          case "cost_optimize": {
            const costParams: CostParameters = {
              taylor_C: params.taylor_C,
              taylor_n: params.taylor_n,
              machine_rate: params.machine_rate,
              tool_cost: params.tool_cost,
              tool_change_time: params.tool_change_time
            };
            
            result = calculateMinimumCostSpeed(
              costParams,
              params.volume_to_remove,
              params.mrr_at_ref
            );
            break;
          }
          
          case "multi_optimize": {
            const constraints: OptimizationConstraints = {
              max_power: params.max_power,
              max_force: params.max_force,
              min_tool_life: params.min_tool_life,
              max_surface_finish: params.max_surface_finish
            };
            
            const weights: OptimizationWeights = {
              productivity: params.weight_productivity || 0.3,
              cost: params.weight_cost || 0.3,
              quality: params.weight_quality || 0.2,
              tool_life: params.weight_tool_life || 0.2
            };
            
            result = optimizeCuttingParameters(
              params.material_kc,
              params.taylor_C,
              params.taylor_n,
              params.tool_diameter,
              params.number_of_teeth,
              constraints,
              weights
            );
            break;
          }
          
          case "productivity": {
            result = calculateProductivityMetrics(
              params.cutting_speed,
              params.feed_per_tooth,
              params.axial_depth,
              params.radial_depth,
              params.tool_diameter,
              params.number_of_teeth,
              params.taylor_C,
              params.taylor_n,
              params.tool_cost,
              params.machine_rate
            );
            break;
          }
          
          case "engagement": {
            result = calculateEngagementAngle(
              params.tool_diameter,
              params.radial_depth,
              params.feed_per_tooth,
              params.is_climb !== false,
              params.cutting_speed
            );
            break;
          }
          
          case "trochoidal": {
            result = calculateTrochoidalParams(
              params.tool_diameter,
              params.slot_width,
              params.axial_depth,
              params.cutting_speed,
              params.feed_per_tooth,
              params.number_of_teeth
            );
            break;
          }
          
          case "hsm": {
            result = calculateHSMParams(
              params.tool_diameter,
              params.programmed_feedrate,
              params.machine_max_accel || 5,
              params.tolerance || 0.01
            );
            break;
          }
          
          case "scallop": {
            result = calculateScallopHeight(
              params.tool_radius,
              params.stepover,
              params.surface_width,
              params.feed_rate,
              params.is_ball_nose !== false
            );
            break;
          }
          
          case "stepover": {
            result = calculateOptimalStepover(
              params.tool_diameter,
              params.tool_corner_radius,
              params.target_scallop || 0.01,
              params.operation || "finishing"
            );
            break;
          }
          
          case "cycle_time": {
            result = estimateCycleTime(
              params.cutting_distance,
              params.cutting_feedrate,
              params.rapid_distance,
              params.number_of_tools || 1,
              params.tool_change_time || 0.5,
              params.rapid_rate || 30000
            );
            break;
          }
          
          case "arc_fit": {
            result = calculateArcFitting(
              params.chord_tolerance,
              params.arc_radius,
              params.feedrate,
              params.block_time || 1
            );
            break;
          }

          case "chip_thinning": {
            result = calculateChipThinning(params.tool_diameter, params.radial_depth, params.feed_per_tooth, params.number_of_teeth || 4, params.cutting_speed || 150);
            break;
          }

          case "multi_pass": {
            const mpMat = (params.material_id || params.material) ? await registryManager.materials.getByIdOrName(params.material_id || params.material) : null;
            const mpKc = params.kc1_1 || mpMat?.kienzle?.kc1_1 || 1800;
            const mpCr = (mpMat as any)?.cutting_recommendations?.milling || {};
            result = calculateMultiPassStrategy(params.total_stock || params.stock || 10, params.tool_diameter || 12, mpKc, params.machine_power_kw || params.max_power || 15, params.cutting_speed_rough || mpCr.speed_roughing || 150, params.cutting_speed_finish || mpCr.speed_finishing || 200, params.fz_rough || mpCr.feed_per_tooth_roughing || 0.12, params.fz_finish || mpCr.feed_per_tooth_finishing || 0.06, params.target_Ra);
            break;
          }

          case "coolant_strategy": {
            const csMat = (params.material_id || params.material) ? await registryManager.materials.getByIdOrName(params.material_id || params.material) : null;
            result = recommendCoolantStrategy(params.iso_group || csMat?.iso_group || "P", params.operation || "milling", params.cutting_speed || 150, params.coolant_through || false, (csMat as any)?.physical?.thermal_conductivity);
            break;
          }

          case "gcode_snippet": {
            const gcRpm = params.rpm || Math.round(((params.cutting_speed || 150) * 1000) / (Math.PI * (params.tool_diameter || 12)));
            result = generateGCodeSnippet(params.controller || "fanuc", params.operation || "milling", { rpm: gcRpm, feed_rate: params.feed_rate || params.vf || 1000, tool_number: params.tool_number || 1, depth_of_cut: params.axial_depth || 3, x_start: params.x_start, y_start: params.y_start, z_safe: params.z_safe || 5, z_depth: params.z_depth, coolant: params.coolant });
            break;
          }

          case "tolerance_analysis": {
            const analysisType = params.analysis_type || "single";
            if (analysisType === "stack" && Array.isArray(params.stack_dimensions)) {
              result = toleranceStackUp(params.stack_dimensions);
            } else if (analysisType === "cpk") {
              result = calculateCpk(params.nominal_mm, params.tolerance_mm, params.process_sigma_mm);
            } else {
              result = calculateITGrade(params.nominal_mm, params.it_grade ?? 7);
            }
            break;
          }

          case "fit_analysis": {
            result = analyzeShaftHoleFit(params.nominal_mm, params.fit_class);
            break;
          }

          case "gcode_generate": {
            if (params.operations && Array.isArray(params.operations)) {
              // Multi-operation program
              result = generateProgram(params.controller || "fanuc", params.operations);
            } else if (params.list_controllers) {
              result = { controllers: listGCodeControllers() };
            } else if (params.list_operations) {
              result = { operations: listGCodeOperations() };
            } else {
              // Single operation
              const gcRpm = params.rpm || Math.round(((params.cutting_speed || 150) * 1000) / (Math.PI * (params.tool_diameter || 12)));
              result = generateGCode(
                params.controller || "fanuc",
                params.operation || "facing",
                {
                  rpm: gcRpm,
                  feed_rate: params.feed_rate || params.vf || 1000,
                  tool_number: params.tool_number || 1,
                  z_safe: params.z_safe || 5,
                  z_depth: params.z_depth,
                  coolant: params.coolant || "flood",
                  x_start: params.x_start,
                  y_start: params.y_start,
                  x_end: params.x_end,
                  y_end: params.y_end,
                  tool_diameter: params.tool_diameter,
                  peck_depth: params.peck_depth,
                  pitch: params.pitch,
                  thread_diameter: params.thread_diameter,
                  thread_pitch: params.thread_pitch,
                  thread_depth: params.thread_depth,
                  thread_direction: params.thread_direction,
                  pocket_diameter: params.pocket_diameter,
                  pocket_depth: params.pocket_depth,
                  stepover_percent: params.stepover_percent,
                  profile_points: params.profile_points,
                  comp_side: params.comp_side,
                  approach_type: params.approach_type,
                  program_number: params.program_number,
                  program_name: params.program_name,
                  sub_program_number: params.sub_program_number,
                  sub_repeats: params.sub_repeats,
                  work_offset: params.work_offset,
                  dwell: params.dwell,
                  orient_angle: params.orient_angle,
                  shift_amount: params.shift_amount,
                }
              );
            }
            break;
          }

          case "decision_tree": {
            if (params.list_trees) {
              result = { trees: listDecisionTrees() };
            } else {
              const treeName = params.tree;
              if (!treeName) throw new Error("decision_tree requires 'tree' parameter (e.g., 'selectToolType')");
              result = decide(treeName, params);
            }
            break;
          }

          case "render_report": {
            if (params.list_types) {
              result = { types: listReportTypes() };
            } else {
              const reportType = params.report_type || params.type;
              if (!reportType) throw new Error("render_report requires 'report_type' parameter (e.g., 'setup_sheet')");
              result = renderReport(reportType, params);
            }
            break;
          }

          case "campaign_create": {
            if (params.list_actions) {
              result = { actions: listCampaignActions() };
            } else {
              if (!params.config) throw new Error("campaign_create requires 'config' parameter");
              if (!params.operation_results) throw new Error("campaign_create requires 'operation_results' (2D array of pre-computed results)");
              result = createCampaign(params.config, params.operation_results);
            }
            break;
          }

          case "campaign_validate": {
            if (!params.config) throw new Error("campaign_validate requires 'config' parameter");
            result = validateCampaign(params.config);
            break;
          }

          case "campaign_optimize": {
            if (!params.config) throw new Error("campaign_optimize requires 'config' parameter");
            const target = params.target || { objective: "balanced" };
            result = optimizeCampaign(params.config, target);
            break;
          }

          case "campaign_cycle_time": {
            if (!params.config) throw new Error("campaign_cycle_time requires 'config' parameter");
            result = estimateCampaignTime(params.config);
            break;
          }

          case "inference_chain": {
            const mode = params.mode || "run_chain";
            if (mode === "list_chains") {
              result = { chain_types: listChainTypes(), actions: ["run_chain", "analyze", "diagnose", "list_chains"] };
            } else if (mode === "analyze") {
              if (!params.scenario) throw new Error("inference_chain analyze requires 'scenario' parameter");
              result = await analyzeAndRecommend({
                scenario: params.scenario,
                material: params.material,
                machine: params.machine,
                constraints: params.constraints,
                response_level: params.response_level,
              });
            } else if (mode === "diagnose") {
              if (!params.symptoms) throw new Error("inference_chain diagnose requires 'symptoms' parameter");
              result = await deepDiagnose({
                alarm_code: params.alarm_code,
                symptoms: params.symptoms,
                machine_state: params.machine_state,
                material: params.material,
                operation: params.operation,
                response_level: params.response_level,
              });
            } else {
              // mode === "run_chain" (default)
              if (!params.chain_config) throw new Error("inference_chain run_chain requires 'chain_config' parameter");
              const chainConfig = params.chain_config as InferenceChainConfig;
              if (params.response_level && !chainConfig.response_level) {
                chainConfig.response_level = params.response_level;
              }
              result = await runInferenceChain(chainConfig);
            }
            break;
          }

          case "wear_prediction": {
            // R3-MS1: Three-zone flank wear model based on Taylor parameters
            // Zone I (break-in): VB = VB0 + k_breakin * sqrt(t)
            // Zone II (steady): VB = VB_breakin + k_steady * t
            // Zone III (accelerated): VB = VB_steady + k_accel * (exp(alpha*(t-t_accel)) - 1)
            const wpCuttingSpeed = params.cutting_speed;
            const wpFeedPerTooth = params.feed_per_tooth || 0.15;
            const wpDepthOfCut = params.depth_of_cut || params.axial_depth || 2.0;
            const wpCuttingTime = params.cutting_time_min;
            if (!wpCuttingSpeed || wpCuttingTime === undefined) {
              throw new Error("wear_prediction requires: cutting_speed (m/min), cutting_time_min");
            }

            let wpTaylorC = params.taylor_C;
            let wpTaylorN = params.taylor_n;
            let wpIsoGroup = params.iso_group || "P";
            if ((!wpTaylorC || !wpTaylorN) && (params.material_id || params.material)) {
              const wpMat = await registryManager.materials.getByIdOrName(params.material_id || params.material);
              if (wpMat?.taylor) {
                wpTaylorC = wpTaylorC || wpMat.taylor.C_carbide || wpMat.taylor.C;
                wpTaylorN = wpTaylorN || wpMat.taylor.n_carbide || wpMat.taylor.n;
                wpIsoGroup = wpMat.iso_group || wpIsoGroup;
              }
            }
            if (!wpTaylorC || !wpTaylorN) {
              const defaults = getDefaultTaylor(params.material_group || "steel", params.tool_material || "Carbide");
              wpTaylorC = wpTaylorC || defaults.C;
              wpTaylorN = wpTaylorN || defaults.n;
            }

            // Taylor tool life: T = (C/Vc)^(1/n)
            const wpToolLife = Math.pow(wpTaylorC / wpCuttingSpeed, 1 / wpTaylorN);
            const wpToolLifeClamped = Math.max(1, Math.min(480, wpToolLife));

            const wpThreshold = params.threshold_mm || 0.3; // ISO 3685
            const wpBreakInEnd = wpToolLifeClamped * 0.05;
            const wpAccelStart = wpToolLifeClamped * 0.80;

            // Zone constants (empirically derived from ISO 3685 wear curves)
            const feedFactor = wpFeedPerTooth / 0.15;
            const depthFactor = Math.pow(wpDepthOfCut / 2.0, 0.3);
            const wpVB0 = 0.02; // initial wear from edge preparation
            const kBreakIn = (0.05 * feedFactor * depthFactor) / Math.sqrt(Math.max(0.01, wpBreakInEnd));
            const wpVBBreakIn = wpVB0 + kBreakIn * Math.sqrt(wpBreakInEnd);

            const kSteady = (wpThreshold * 0.60 - wpVBBreakIn) / Math.max(0.01, wpAccelStart - wpBreakInEnd);
            const wpVBSteady = wpVBBreakIn + kSteady * (wpAccelStart - wpBreakInEnd);

            const kAccel = 0.02;
            const remainingWear = Math.max(0.001, wpThreshold - wpVBSteady);
            const remainingTime = Math.max(0.01, wpToolLifeClamped - wpAccelStart);
            const alpha = Math.log(remainingWear / kAccel + 1) / remainingTime;

            // Calculate current wear
            let wpCurrentVB: number;
            let wpWearZone: string;
            const t = Math.max(0, wpCuttingTime);

            if (t <= wpBreakInEnd) {
              wpCurrentVB = wpVB0 + kBreakIn * Math.sqrt(t);
              wpWearZone = "break-in";
            } else if (t <= wpAccelStart) {
              wpCurrentVB = wpVBBreakIn + kSteady * (t - wpBreakInEnd);
              wpWearZone = "steady";
            } else {
              wpCurrentVB = wpVBSteady + kAccel * (Math.exp(alpha * (t - wpAccelStart)) - 1);
              wpWearZone = "accelerated";
            }

            // Calculate remaining useful life
            let wpRemainingLife: number;
            if (wpCurrentVB >= wpThreshold) {
              wpRemainingLife = 0;
            } else {
              wpRemainingLife = Math.max(0, wpToolLifeClamped - t);
            }

            const wpWarnings: string[] = [];
            if (wpCurrentVB > 0.2) wpWarnings.push("Approaching ISO 3685 wear threshold (0.3mm)");
            if (wpCurrentVB >= wpThreshold) wpWarnings.push("CRITICAL: Tool exceeded wear threshold");
            if (wpRemainingLife < 5 && wpRemainingLife > 0) wpWarnings.push(`Low remaining life: ${wpRemainingLife.toFixed(1)} min`);
            if (wpWearZone === "accelerated") wpWarnings.push("In accelerated wear zone — failure risk increasing");

            result = {
              flank_wear_VB_mm: Math.round(wpCurrentVB * 1000) / 1000,
              wear_zone: wpWearZone,
              remaining_life_min: Math.round(wpRemainingLife * 10) / 10,
              total_tool_life_min: Math.round(wpToolLifeClamped * 10) / 10,
              threshold_mm: wpThreshold,
              wear_rate_mm_per_min: wpWearZone === "steady" ? Math.round(kSteady * 10000) / 10000 : null,
              zone_boundaries: {
                break_in_end_min: Math.round(wpBreakInEnd * 10) / 10,
                accel_start_min: Math.round(wpAccelStart * 10) / 10
              },
              confidence: (params.material_id || params.material) ? "medium" : "low",
              recommendation: wpCurrentVB >= wpThreshold ? "Replace tool immediately"
                : wpCurrentVB > 0.2 ? "Plan tool change — approaching wear limit"
                : wpWearZone === "accelerated" ? "Monitor closely — in accelerated wear zone"
                : "Tool in normal operating range",
              warnings: wpWarnings,
              iso_group: wpIsoGroup
            };
            break;
          }

          case "process_cost_calc": {
            // R3-MS1: Process cost — chains speed_feed → multi_pass → tool_life → cost rollup
            const pcMachineRate = params.machine_rate_per_hr;
            const pcToolCost = params.tool_cost;
            if (!pcMachineRate || !pcToolCost) {
              throw new Error("process_cost_calc requires: machine_rate_per_hr, tool_cost");
            }
            const pcToolDiam = params.tool_diameter || 12;
            const pcTotalStock = params.total_stock || 5;
            const pcSetupTime = params.setup_time_min || 30;
            const pcBatchSize = params.batch_size || 1;
            const pcNumTeeth = params.number_of_teeth || 4;
            const pcMaxPower = params.machine_power_kw || 15;

            let pcKc = params.kc1_1 || 1800, pcMc = params.mc || 0.25;
            let pcTaylorC = params.taylor_C || 250, pcTaylorN = params.taylor_n || 0.25;
            let pcVcRough = params.cutting_speed_rough || 150;
            let pcVcFinish = params.cutting_speed_finish || 200;
            let pcFzRough = params.fz_rough || 0.12;
            let pcFzFinish = params.fz_finish || 0.06;

            const pcMaterial = params.material_id || params.material;
            if (pcMaterial) {
              const pcMat = await registryManager.materials.getByIdOrName(pcMaterial);
              if (pcMat) {
                if (pcMat.kienzle) { pcKc = pcMat.kienzle.kc1_1 || pcKc; pcMc = pcMat.kienzle.mc || pcMc; }
                if (pcMat.taylor) { pcTaylorC = pcMat.taylor.C_carbide || pcMat.taylor.C || pcTaylorC; pcTaylorN = pcMat.taylor.n_carbide || pcMat.taylor.n || pcTaylorN; }
                const cr = (pcMat as any).cutting_recommendations?.milling;
                if (cr) { pcVcRough = cr.speed_roughing || pcVcRough; pcVcFinish = cr.speed_finishing || pcVcFinish; pcFzRough = cr.feed_per_tooth_roughing || pcFzRough; pcFzFinish = cr.feed_per_tooth_finishing || pcFzFinish; }
              }
            }

            const pcMultiPass = calculateMultiPassStrategy(pcTotalStock, pcToolDiam, pcKc, pcMaxPower, pcVcRough, pcVcFinish, pcFzRough, pcFzFinish, params.target_Ra);
            const pcRpmRough = Math.round((pcVcRough * 1000) / (Math.PI * pcToolDiam));
            const pcFeedRateRough = pcFzRough * pcNumTeeth * pcRpmRough;
            const pcCuttingLength = params.cutting_length || 100;
            const pcRoughPasses = (pcMultiPass as any)?.roughing?.passes || Math.ceil((pcTotalStock - 0.3) / 2);
            const pcFinishPasses = params.target_Ra ? 1 : 0;
            const pcRpmFinish = Math.round((pcVcFinish * 1000) / (Math.PI * pcToolDiam));
            const pcFeedRateFinish = pcFzFinish * pcNumTeeth * pcRpmFinish;

            const pcRoughTime = pcRoughPasses * (pcCuttingLength / pcFeedRateRough);
            const pcFinishTime = pcFinishPasses > 0 ? (pcCuttingLength / pcFeedRateFinish) : 0;
            const pcRapidTime = (pcRoughPasses + pcFinishPasses) * 0.05;
            const pcToolChangeTime = params.tool_change_time || 0.5;
            const pcToolChanges = pcFinishPasses > 0 ? 1 : 0;
            const pcCycleTime = pcRoughTime + pcFinishTime + pcRapidTime + pcToolChanges * pcToolChangeTime;

            const pcToolLifeRough = Math.pow(pcTaylorC / pcVcRough, 1 / pcTaylorN);
            const pcToolLifeClamp = Math.max(1, Math.min(480, pcToolLifeRough));
            const pcPartsPerEdge = Math.max(1, Math.floor(pcToolLifeClamp / Math.max(0.01, pcRoughTime)));

            const pcMachiningCost = (pcCycleTime / 60) * pcMachineRate;
            const pcToolingCost = pcToolCost / pcPartsPerEdge;
            const pcSetupCost = (pcSetupTime / 60) * pcMachineRate / pcBatchSize;
            const pcIdleCost = (pcToolChanges * pcToolChangeTime / 60) * pcMachineRate;
            const pcTotal = pcMachiningCost + pcToolingCost + pcSetupCost + pcIdleCost;

            result = {
              cost_per_part: Math.round(pcTotal * 100) / 100,
              breakdown: {
                machining: Math.round(pcMachiningCost * 100) / 100,
                tooling: Math.round(pcToolingCost * 100) / 100,
                setup: Math.round(pcSetupCost * 100) / 100,
                idle: Math.round(pcIdleCost * 100) / 100
              },
              cycle_time_min: Math.round(pcCycleTime * 100) / 100,
              parts_per_tool_edge: pcPartsPerEdge,
              tool_life_min: Math.round(pcToolLifeClamp * 10) / 10,
              batch_cost_total: Math.round(pcTotal * pcBatchSize * 100) / 100,
              pass_strategy: { roughing_passes: pcRoughPasses, finishing_passes: pcFinishPasses, total_stock_mm: pcTotalStock },
              parameters_used: { Vc_rough: pcVcRough, Vc_finish: pcVcFinish, fz_rough: pcFzRough, rpm_rough: pcRpmRough, feed_rate_rough_mm_min: Math.round(pcFeedRateRough) }
            };
            break;
          }

          case "uncertainty_chain": {
            // R3-MS1: Uncertainty propagation through Kienzle → Taylor → Power → Cost
            // RSS (Root Sum of Squares) method per GUM (Guide to Uncertainty in Measurement)
            const ucToolDiam = params.tool_diameter || 12;
            const ucNumTeeth = params.number_of_teeth || 4;

            let ucKc = 1800, ucMc = 0.25, ucTaylorC = 250, ucTaylorN = 0.25;
            let ucSigmaKc = 0.10, ucSigmaMc = 0.05, ucSigmaC = 0.15, ucSigmaN = 0.08;
            let ucHasStats = false;
            const ucAssumed: string[] = [];

            const ucMaterial = params.material_id || params.material;
            if (ucMaterial) {
              const ucMat = await registryManager.materials.getByIdOrName(ucMaterial);
              if (ucMat) {
                if (ucMat.kienzle) { ucKc = ucMat.kienzle.kc1_1 || ucKc; ucMc = ucMat.kienzle.mc || ucMc; }
                if (ucMat.taylor) { ucTaylorC = ucMat.taylor.C_carbide || ucMat.taylor.C || ucTaylorC; ucTaylorN = ucMat.taylor.n_carbide || ucMat.taylor.n || ucTaylorN; }
                const stats = (ucMat as any).statistics;
                if (stats?.standardDeviation) {
                  ucHasStats = true;
                  ucSigmaKc = stats.standardDeviation.kc1_1 ? stats.standardDeviation.kc1_1 / ucKc : ucSigmaKc;
                  ucSigmaN = stats.standardDeviation.taylor_n ? stats.standardDeviation.taylor_n / ucTaylorN : ucSigmaN;
                } else {
                  ucAssumed.push("kc1_1 (±10%)", "mc (±5%)", "Taylor C (±15%)", "Taylor n (±8%)");
                }
              }
            } else {
              ucAssumed.push("kc1_1 (±10% default)", "mc (±5% default)", "Taylor C (±15% default)", "Taylor n (±8% default)");
            }

            const ucVc = params.cutting_speed || 150;
            const ucFz = params.feed_per_tooth || 0.12;
            const ucAp = params.axial_depth || params.depth_of_cut || 2.0;
            const ucSigmaFz = 0.03, ucSigmaVc = 0.02;

            // Cutting force: Fc = kc1_1 × ap × fz^(1-mc)
            const ucFc = ucKc * ucAp * Math.pow(ucFz, 1 - ucMc);
            const ucRelSigmaFc = Math.sqrt(ucSigmaKc ** 2 + ((1 - ucMc) * ucSigmaFz) ** 2 + (ucSigmaMc * Math.log(ucFz)) ** 2);

            // Power: Pc = Fc × Vc / (60000 × η)
            const ucPc = (ucFc * ucVc) / (60000 * 0.80);
            const ucRelSigmaPc = Math.sqrt(ucRelSigmaFc ** 2 + ucSigmaVc ** 2);

            // Tool life: T = (C/Vc)^(1/n)
            const ucT = Math.max(1, Math.min(480, Math.pow(ucTaylorC / ucVc, 1 / ucTaylorN)));
            const ucRelSigmaT = Math.sqrt((ucSigmaC / ucTaylorN) ** 2 + (Math.log(ucVc) * ucSigmaN / (ucTaylorN ** 2)) ** 2);

            // Cost per part
            const ucMachineRate = params.machine_rate_per_hr || 85;
            const ucToolCostVal = params.tool_cost || 15;
            const ucCuttingLength = params.cutting_length || 100;
            const ucRpm = Math.round((ucVc * 1000) / (Math.PI * ucToolDiam));
            const ucFeedRate = ucFz * ucNumTeeth * ucRpm;
            const ucCycleT = ucCuttingLength / ucFeedRate;
            const ucPartsPerEdge = Math.max(1, Math.floor(ucT / ucCycleT));
            const ucCostPerPart = (ucCycleT / 60) * ucMachineRate + ucToolCostVal / ucPartsPerEdge;
            const ucRelSigmaCost = Math.sqrt((ucRelSigmaT * 0.5) ** 2 + (ucSigmaVc * 0.3) ** 2);

            const ci = (val: number, rel: number, z: number) => [
              Math.round(val * (1 - z * rel) * 100) / 100,
              Math.round(val * (1 + z * rel) * 100) / 100
            ];

            const ucSources = [
              { name: "Taylor C (tool life constant)", sigma: ucSigmaC },
              { name: "kc1_1 (specific cutting force)", sigma: ucSigmaKc },
              { name: "Taylor n (tool life exponent)", sigma: ucSigmaN },
              { name: "mc (Kienzle exponent)", sigma: ucSigmaMc },
              { name: "feed accuracy", sigma: ucSigmaFz },
              { name: "speed accuracy", sigma: ucSigmaVc }
            ].sort((a, b) => b.sigma - a.sigma);

            result = {
              parameters: {
                Vc_m_min: ucVc, fz_mm: ucFz, ap_mm: ucAp,
                Fc_N: Math.round(ucFc), Pc_kW: Math.round(ucPc * 100) / 100,
                T_min: Math.round(ucT * 10) / 10, cost_per_part: Math.round(ucCostPerPart * 100) / 100
              },
              relative_uncertainties: {
                Fc: Math.round(ucRelSigmaFc * 10000) / 100 + "%",
                Pc: Math.round(ucRelSigmaPc * 10000) / 100 + "%",
                T: Math.round(ucRelSigmaT * 10000) / 100 + "%",
                cost: Math.round(ucRelSigmaCost * 10000) / 100 + "%"
              },
              confidence_intervals: {
                ci_90: { Fc_N: ci(ucFc, ucRelSigmaFc, 1.645), Pc_kW: ci(ucPc, ucRelSigmaPc, 1.645), T_min: ci(ucT, ucRelSigmaT, 1.645), cost: ci(ucCostPerPart, ucRelSigmaCost, 1.645) },
                ci_95: { Fc_N: ci(ucFc, ucRelSigmaFc, 1.96), Pc_kW: ci(ucPc, ucRelSigmaPc, 1.96), T_min: ci(ucT, ucRelSigmaT, 1.96), cost: ci(ucCostPerPart, ucRelSigmaCost, 1.96) }
              },
              dominant_uncertainty_source: ucSources[0].name,
              uncertainty_ranking: ucSources.map(s => `${s.name}: \u00b1${Math.round(s.sigma * 100)}%`),
              data_quality: { has_statistics: ucHasStats, assumed_uncertainties: ucAssumed }
            };
            break;
          }

          // === CONTROLLER OPTIMIZATION (R3-MS3) ===
          case "controller_optimize": {
            const coController = (params.controller || "").toLowerCase();
            const coOperation = params.operation || "milling";
            const coParams = params.params || {};
            if (!coController) throw new Error("controller_optimize requires 'controller' parameter (fanuc, siemens, haas, mazak, okuma, heidenhain)");

            // Controller-specific optimization features database
            const controllerFeatures: Record<string, { roughing: string[]; finishing: string[]; contouring: string[]; codes: string[]; notes: string[] }> = {
              fanuc: {
                roughing: ["G05.1 Q0 (high-speed smoothing OFF for roughing)", "G64 (continuous path mode for faster rapids)"],
                finishing: ["G05.1 Q1 (nano smoothing ON)", "G05.1 Q2 (AI nano contour control)", "G08 P1 (look-ahead ON)"],
                contouring: ["G05.1 Q1 (AICC — AI contour control)", "G41/G42 (cutter compensation with AICC)"],
                codes: ["G05.1", "G08", "G64", "G61.1"],
                notes: ["AICC requires option; check parameter 19601", "Nano smoothing tolerance set via G05.1 Rx.xxx"]
              },
              siemens: {
                roughing: ["CYCLE832(0.1, 1) ; rough tolerance 0.1mm", "SOFT (acceleration smoothing)"],
                finishing: ["CYCLE832(0.005, 3) ; finish tolerance 5μm", "COMPCAD (spline interpolation)", "FFWON (feed-forward ON)"],
                contouring: ["COMPCAD", "G642 (corner rounding with tolerance)", "FFWON"],
                codes: ["CYCLE832", "COMPCAD", "G642", "FFWON", "SOFT"],
                notes: ["CYCLE832 sets CPRECON, FIFOCTRL, COMPSURF internally", "G642 radius = corner tolerance for contour accuracy"]
              },
              haas: {
                roughing: ["G187 P1 (rough mode — fastest cornering)", "G64 P0.05 (continuous path, 50μm tolerance)"],
                finishing: ["G187 P3 (finish mode — smoothest motion)", "G64 P0.005 (tight path tolerance 5μm)"],
                contouring: ["G187 P2 (medium mode)", "G64 P0.01 (10μm path tolerance)"],
                codes: ["G187", "G64"],
                notes: ["G187 P1/P2/P3 = rough/medium/finish smoothness", "Setting 191 controls look-ahead blocks"]
              },
              mazak: {
                roughing: ["G05.1 Q0 (high-speed mode OFF for heavy cuts)", "Machining Navi L-g (learning vibration suppression)"],
                finishing: ["G05.1 Q1 (high-speed machining ON)", "SFC (Super Feed Control) for constant chip load"],
                contouring: ["G05.1 Q1", "Intelligent Thermal Shield compensation"],
                codes: ["G05.1", "G05", "SFC"],
                notes: ["SFC adjusts feed rate automatically at corners", "Machining Navi requires SmoothX option"]
              },
              okuma: {
                roughing: ["G08 P0 (look-ahead OFF for stability)", "Machining Navi for optimal spindle speed"],
                finishing: ["G08 P1 (look-ahead ON)", "Super-NURBS interpolation", "5-Axis Auto Tuning System"],
                contouring: ["Super-NURBS", "G05.1 Q1 (NURBS interpolation)", "Collision Avoidance System"],
                codes: ["G08", "G05.1", "Super-NURBS"],
                notes: ["Super-NURBS requires OSP-P300 or newer", "Machining Navi M-i for intelligent vibration control"]
              },
              heidenhain: {
                roughing: ["FUNCTION TCPM OFF", "M204 (linear acceleration for heavy cuts)"],
                finishing: ["FUNCTION TCPM (tool center point management)", "CYCLE32 (surface tolerance 0.005)", "M200 (jerk limitation for smooth finish)"],
                contouring: ["FUNCTION TCPM F0.01", "CYCLE32 R0.005 (HSC tolerance)", "Q parameters for adaptive feed"],
                codes: ["CYCLE32", "FUNCTION TCPM", "M200", "M204"],
                notes: ["CYCLE32 tolerance controls HSC quality vs speed tradeoff", "iTNC 530/640: use FUNCTION TCPM for 5-axis work"]
              }
            };

            const family = Object.keys(controllerFeatures).find(k => coController.includes(k)) || "fanuc";
            const features = controllerFeatures[family];
            const isRoughing = /rough|heavy|hogg/i.test(coOperation);
            const isFinishing = /finish|fine|polish/i.test(coOperation);
            const mode = isRoughing ? "roughing" : isFinishing ? "finishing" : "contouring";
            const optimizations = features[mode];

            // Performance impact estimates
            const speedImpact = isFinishing ? 5 : isRoughing ? 15 : 10;
            const finishImpact = isFinishing ? 30 : isRoughing ? 0 : 15;

            result = {
              controller: family,
              controller_input: coController,
              operation: coOperation,
              mode_selected: mode,
              optimizations_applied: optimizations,
              all_available_codes: features.codes,
              performance_impact: {
                speed_improvement_pct: speedImpact,
                finish_improvement_pct: finishImpact,
                note: `Estimated for ${mode} mode on ${family}`
              },
              gcode_additions: optimizations.join("\n"),
              notes: features.notes,
              params_received: coParams
            };
            break;
          }

          // === PHYSICS PREDICTION (R7-MS0) ===
          case "surface_integrity_predict":
          case "chatter_predict":
          case "thermal_compensate":
          case "unified_machining_model":
          case "coupling_sensitivity":
          case "rz_kinematic":
          case "rz_milling":
          case "surface_profile":
          case "chip_form": {
            result = physicsPrediction(action, params);
            break;
          }

          case "optimize_parameters":
          case "optimize_sequence":
          case "sustainability_report":
          case "eco_optimize": {
            result = optimization(action, params);
            break;
          }

          case "fixture_recommend": {
            result = workholdingIntelligence(action, params);
            break;
          }

          // === R15: MODAL SLD + THERMAL DISTORTION ===
          case "sld_generate": {
            result = generateSLD(params as unknown as SLDGenerateInput);
            break;
          }
          case "sld_evaluate": {
            result = evaluateSLD(params as unknown as SLDEvaluateInput);
            break;
          }
          case "thermal_distort": {
            result = predictThermalDistortion(params as unknown as ThermalDistortionInput);
            break;
          }

          // === R15-MS3: GD&T TOLERANCE ANALYSIS ===
          case "gdt_parse": {
            result = parseGDT(params as unknown as GDTParseInput);
            break;
          }
          case "gdt_stack": {
            result = gdtStackUp(params.dimensions as GDTStackDimension[]);
            break;
          }
          case "gdt_datum_ref": {
            result = analyzeDatumRef(params as unknown as GDTDatumInput);
            break;
          }
          case "gdt_zone": {
            result = computeGDTZone(params as unknown as GDTZoneInput);
            break;
          }
          case "gdt_report": {
            result = gdtReport(params as unknown as GDTReportInput);
            break;
          }

          // ── CCE Lite (Computed Composite Endpoints) ─────────────────
          case "cce_compose":
          case "cce_list":
          case "cce_cache_stats":
          case "cce_cache_clear": {
            result = executeCCEAction(action, params);
            break;
          }

          // ── Cutting Simulation (R16) ──────────────────────────────
          case "sim_cutting":
          case "sim_force_profile":
          case "sim_thermal_profile":
          case "sim_vibration": {
            result = executeCuttingSimAction(action, params);
            break;
          }

          // ── Digital Twin (R16) ────────────────────────────────────
          case "twin_create":
          case "twin_remove_material":
          case "twin_state":
          case "twin_compare": {
            result = executeDigitalTwinAction(action, params);
            break;
          }

          case "verify_process":
          case "verify_tolerance":
          case "verify_surface":
          case "verify_stability": {
            result = executeVerificationAction(action, params);
            break;
          }

          case "sensitivity_1d":
          case "sensitivity_2d":
          case "sensitivity_pareto":
          case "sensitivity_montecarlo": {
            result = executeSensitivityAction(action, params);
            break;
          }

          case "mfb_record":
          case "mfb_compare":
          case "mfb_error_stats":
          case "mfb_correction": {
            result = executeMeasurementFeedbackAction(action, params);
            break;
          }

          case "spc_xbar_r":
          case "spc_cusum":
          case "spc_ewma":
          case "spc_capability": {
            result = executeProcessDriftAction(action, params);
            break;
          }

          case "cal_update":
          case "cal_status":
          case "cal_reset":
          case "cal_validate": {
            result = executeModelCalibrationAction(action, params);
            break;
          }

          case "batch_kpi":
          case "batch_trend":
          case "batch_compare":
          case "batch_summary": {
            result = executeBatchAnalyticsAction(action, params);
            break;
          }

          case "gdt_chain_montecarlo":
          case "gdt_chain_allocate":
          case "gdt_chain_sensitivity":
          case "gdt_chain_2d": {
            result = executeGDTChainAction(action, params);
            break;
          }

          case "mps_roughing_plan":
          case "mps_finish_plan":
          case "mps_full_strategy":
          case "mps_evaluate": {
            result = executeMultiPassAction(action, params);
            break;
          }

          case "cpk_analyze":
          case "cpk_improve":
          case "cpk_center":
          case "cpk_reduce_spread": {
            result = executeCpkOptimizerAction(action, params);
            break;
          }

          case "twc_predict":
          case "twc_compensate":
          case "twc_schedule":
          case "twc_history": {
            result = executeToolWearAction(action, params);
            break;
          }

          case "ds_recommend":
          case "ds_validate":
          case "ds_compare":
          case "ds_explain": {
            result = executeDecisionSupportAction(action, params);
            break;
          }

          case "pr_assess":
          case "pr_checklist":
          case "pr_risk":
          case "pr_approve": {
            result = executeProductionReadinessAction(action, params);
            break;
          }

          case "rca_diagnose":
          case "rca_tree":
          case "rca_correlate":
          case "rca_action_plan": {
            result = executeRootCauseAction(action, params);
            break;
          }

          case "cqt_pareto":
          case "cqt_optimize":
          case "cqt_sensitivity":
          case "cqt_scenario": {
            result = executeCostQualityAction(action, params);
            break;
          }

          case "wfo_plan":
          case "wfo_execute":
          case "wfo_status":
          case "wfo_optimize": {
            result = executeWorkflowOrchestratorAction(action, params);
            break;
          }

          case "pk_capture":
          case "pk_retrieve":
          case "pk_search":
          case "pk_validate": {
            result = executeProcessKnowledgeAction(action, params);
            break;
          }

          case "al_learn":
          case "al_recommend":
          case "al_evaluate":
          case "al_history": {
            result = executeAdaptiveLearningAction(action, params);
            break;
          }

          case "ig_register":
          case "ig_invoke":
          case "ig_schema":
          case "ig_health": {
            result = executeIntegrationGatewayAction(action, params);
            break;
          }

          case "pm_predict_wear":
          case "pm_schedule":
          case "pm_failure_risk":
          case "pm_optimize_intervals": {
            result = executePredictiveMaintenanceAction(action, params);
            break;
          }

          case "ah_score":
          case "ah_degradation":
          case "ah_maintenance_plan":
          case "ah_compare": {
            result = executeAssetHealthAction(action, params);
            break;
          }

          case "sf_oee":
          case "sf_utilization":
          case "sf_bottleneck":
          case "sf_capacity": {
            result = executeShopFloorAnalyticsAction(action, params);
            break;
          }

          case "rpt_generate":
          case "rpt_summary":
          case "rpt_trend":
          case "rpt_export": {
            result = executeReportingAction(action, params);
            break;
          }

          case "tr_record":
          case "tr_genealogy":
          case "tr_chain":
          case "tr_audit_trail": {
            result = executeTraceabilityAction(action, params);
            break;
          }

          case "inv_status":
          case "inv_forecast":
          case "inv_reorder":
          case "inv_optimize": {
            result = executeInventoryIntelligenceAction(action, params);
            break;
          }

          case "cost_estimate":
          case "cost_breakdown":
          case "cost_compare":
          case "cost_whatif": {
            result = executeCostModelingAction(action, params);
            break;
          }

          case "comp_check":
          case "comp_certify":
          case "comp_report":
          case "comp_standards": {
            result = executeComplianceAuditAction(action, params);
            break;
          }

          case "en_consumption":
          case "en_profile":
          case "en_demand":
          case "en_benchmark": {
            result = executeEnergyMonitoringAction(action, params);
            break;
          }

          case "co2_calculate":
          case "co2_lifecycle":
          case "co2_reduce":
          case "co2_report": {
            result = executeCarbonFootprintAction(action, params);
            break;
          }

          case "sus_waste":
          case "sus_recycle":
          case "sus_water":
          case "sus_kpi": {
            result = executeSustainabilityMetricsAction(action, params);
            break;
          }

          case "res_optimize":
          case "res_allocate":
          case "res_green":
          case "res_comply": {
            result = executeResourceOptimizationAction(action, params);
            break;
          }

          case "op_skills":
          case "op_certify":
          case "op_assess":
          case "op_matrix": {
            result = executeOperatorSkillAction(action, params);
            break;
          }

          case "trn_program":
          case "trn_progress":
          case "trn_gap":
          case "trn_recommend": {
            result = executeTrainingManagementAction(action, params);
            break;
          }

          case "kc_capture":
          case "kc_search":
          case "kc_best_practice":
          case "kc_lesson": {
            result = executeKnowledgeCaptureAction(action, params);
            break;
          }

          case "wf_schedule":
          case "wf_assign":
          case "wf_capacity":
          case "wf_balance": {
            result = executeWorkforceOptimizationAction(action, params);
            break;
          }

          case "sup_scorecard":
          case "sup_risk":
          case "sup_audit":
          case "sup_compare": {
            result = executeSupplierManagementAction(action, params);
            break;
          }

          case "src_price":
          case "src_availability":
          case "src_alternative":
          case "src_optimize": {
            result = executeMaterialSourcingAction(action, params);
            break;
          }

          case "lt_forecast":
          case "lt_track":
          case "lt_disrupt":
          case "lt_expedite": {
            result = executeLeadTimeAction(action, params);
            break;
          }

          case "proc_spend":
          case "proc_contract":
          case "proc_optimize":
          case "proc_report": {
            result = executeProcurementAnalyticsAction(action, params);
            break;
          }

          case "job_schedule":
          case "job_priority":
          case "job_status":
          case "job_reschedule": {
            result = executeJobSchedulingAction(action, params);
            break;
          }

          case "alloc_assign":
          case "alloc_balance":
          case "alloc_setup":
          case "alloc_conflict": {
            result = executeMachineAllocationAction(action, params);
            break;
          }

          case "seq_optimize":
          case "seq_bottleneck":
          case "seq_flow":
          case "seq_reorder": {
            result = executeProductionSequencingAction(action, params);
            break;
          }

          case "cap_forecast":
          case "cap_demand":
          case "cap_overtime":
          case "cap_report": {
            result = executeCapacityPlanningAction(action, params);
            break;
          }

          case "ecn_create":
          case "ecn_impact":
          case "ecn_approve":
          case "ecn_implement": {
            result = executeECNManagementAction(action, params);
            break;
          }

          case "bom_structure":
          case "bom_compare":
          case "bom_whereused":
          case "bom_configure": {
            result = executeBOMAction(action, params);
            break;
          }

          case "rev_track":
          case "rev_effectivity":
          case "rev_supersede":
          case "rev_audit": {
            result = executeRevisionControlAction(action, params);
            break;
          }

          case "doc_route":
          case "doc_sign":
          case "doc_distribute":
          case "doc_comply": {
            result = executeDocumentWorkflowAction(action, params);
            break;
          }

          case "wh_locate":
          case "wh_slot":
          case "wh_pick":
          case "wh_putaway": {
            result = executeWarehouseLocationAction(action, params);
            break;
          }

          case "kit_assemble":
          case "kit_shortage":
          case "kit_stage":
          case "kit_track": {
            result = executeKittingAction(action, params);
            break;
          }

          case "ship_receive":
          case "ship_dispatch":
          case "ship_dock":
          case "ship_carrier": {
            result = executeShippingReceivingAction(action, params);
            break;
          }

          case "yard_assign":
          case "yard_trailer":
          case "yard_appoint":
          case "yard_move": {
            result = executeYardManagementAction(action, params);
            break;
          }

          case "vsm_map":
          case "vsm_takt":
          case "vsm_cycle":
          case "vsm_future": {
            result = executeValueStreamAction(action, params);
            break;
          }

          case "kai_event":
          case "kai_a3":
          case "kai_track":
          case "kai_sustain": {
            result = executeKaizenAction(action, params);
            break;
          }

          case "six_dmaic":
          case "six_chart":
          case "six_capability":
          case "six_analyze": {
            result = executeSixSigmaAction(action, params);
            break;
          }

          case "lean_oee":
          case "lean_fty":
          case "lean_waste":
          case "lean_kpi": {
            result = executeLeanMetricsAction(action, params);
            break;
          }

          default:
            throw new Error(`Unknown calculation action: ${action}`);
        }
        
        // === POST-CALCULATION HOOKS (9 hooks: chip breaking, stability, power, torque, Bayesian, deflection, surface finish, MRR) ===
        try {
          await hookExecutor.execute("post-calculation", {
            ...hookCtx,
            metadata: { ...hookCtx.metadata, result }
          });
        } catch (postErr) {
          log.warn(`[prism_calc] Post-calculation hook error (non-blocking): ${postErr}`);
        }
        
        // R2-MS1 T5: Apply response_level formatting if requested
        const responseLevel = (params.response_level as ResponseLevel) || undefined;
        if (responseLevel) {
          const leveled = formatByLevel(result, responseLevel, (r: any) => calcExtractKeyValues(action, r));
          return { content: [{ type: "text", text: JSON.stringify(leveled) }] };
        }

        return {
          content: [{ type: "text", text: JSON.stringify(slimResponse(result, getSlimLevel(getCurrentPressurePct()))) }]
        };
        
      } catch (error) {
        log.error(`[prism_calc] Error in ${action}:`, error);
        return {
          content: [{ 
            type: "text", 
            text: JSON.stringify({ 
              error: `Calculation failed: ${error instanceof Error ? error.message : String(error)}`,
              action,
              params 
            }) 
          }]
        };
      }
    }
  );
}