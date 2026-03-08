import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { hookExecutor, type HookPhase } from "../../engines/HookExecutor.js";
import type { GearHobbingInput } from "../../engines/GearHobbingEngine.js";
import type { CryoTreatmentInput } from "../../engines/CryogenicTreatmentEngine.js";
import { slimResponse, getCurrentPressurePct, getSlimLevel } from "../../utils/responseSlimmer.js";
import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
import { ACTION_CALC_SCHEMAS } from "../../schemas/calcActionSchemas.js";
import { registryManager } from "../../registries/manager.js";
import { formatByLevel, type ResponseLevel } from "../../types/ResponseLevel.js";
import { computationCache } from "../../engines/ComputationCache.js";
import { validateCrossFieldPhysics } from "../../validation/crossFieldPhysics.js";
import { eventBus, EventTypes } from "../../engines/EventBus.js";

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
  type JohnsonCookParams,
  calculateDrillingForce,
  type DrillingConditions
} from "../../engines/ManufacturingCalculations.js";

import { toolWearProgressionEngine } from "../../engines/ToolWearProgressionEngine.js";
import type { ToolGrade } from "../../engines/ToolWearProgressionEngine.js";
import { spindleHarmonicsQualityEngine } from "../../engines/SpindleHarmonicsQualityEngine.js";
import { wearForceCompensationEngine } from "../../engines/WearForceCompensationEngine.js";
import { drillBreakthroughForceEngine } from "../../engines/DrillBreakthroughForceEngine.js";
import type { ExitSupport } from "../../engines/DrillBreakthroughForceEngine.js";
import { thermalGrowthCompensationEngine } from "../../engines/ThermalGrowthCompensationEngine.js";
import type { SpindleBearingType } from "../../engines/ThermalGrowthCompensationEngine.js";
import { boreFinishingEngine } from "../../engines/BoreFinishingEngine.js";
import type { HoningStoneGrit } from "../../engines/BoreFinishingEngine.js";
import { finishingPassOptimizationEngine } from "../../engines/FinishingPassOptimizationEngine.js";
import { turningForceEngine } from "../../engines/TurningForceEngine.js";
import type { TurningOperation } from "../../engines/TurningForceEngine.js";
import { tappingTorqueEngine } from "../../engines/TappingTorqueEngine.js";
import type { TapType, HoleType } from "../../engines/TappingTorqueEngine.js";
import { cuttingPowerBudgetEngine } from "../../engines/CuttingPowerBudgetEngine.js";
import { toolDeflectionPredictionEngine } from "../../engines/ToolDeflectionPredictionEngine.js";
import type { ToolMaterialType } from "../../engines/ToolDeflectionPredictionEngine.js";
import { chipFormationPredictionEngine } from "../../engines/ChipFormationPredictionEngine.js";
import type { MaterialDuctility } from "../../engines/ChipFormationPredictionEngine.js";
import { specificCuttingEnergyEngine } from "../../engines/SpecificCuttingEnergyEngine.js";
import { roughnessConversionEngine } from "../../engines/RoughnessConversionEngine.js";
import type { RoughnessScale } from "../../engines/RoughnessConversionEngine.js";
import { peckDrillingOptimizationEngine } from "../../engines/PeckDrillingOptimizationEngine.js";
import type { DrillType } from "../../engines/PeckDrillingOptimizationEngine.js";
import type { EnergySource } from "../../engines/SpecificCuttingEnergyEngine.js";

/** Zod-validated params cast — dispatcher validates via ACTION_CALC_SCHEMAS before engine calls */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ValidatedParams = any;
import { drillCycleOptimizationEngine } from "../../engines/DrillCycleOptimizationEngine.js";
import type { MaterialChipBehavior, CoolantDelivery } from "../../engines/DrillCycleOptimizationEngine.js";
import { toolCoatingSelectionEngine } from "../../engines/ToolCoatingSelectionEngine.js";
import type { MaterialClass, OperationType, CoolantStrategy } from "../../engines/ToolCoatingSelectionEngine.js";
import { toolGeometrySelectionEngine } from "../../engines/ToolGeometrySelectionEngine.js";
import type { EndMillMaterial, MillingOperation } from "../../engines/ToolGeometrySelectionEngine.js";
import { insertGradeSelectionEngine } from "../../engines/InsertGradeSelectionEngine.js";
import type { WorkpieceMaterial, TurningOp } from "../../engines/InsertGradeSelectionEngine.js";
import { coolantStrategyEngine } from "../../engines/CoolantStrategyEngine.js";
import type { CoolantMaterial, CoolantOperation as CoolantStrategyOp } from "../../engines/CoolantStrategyEngine.js";

import {
  calculateStabilityLobes,
  calculateToolDeflection,
  calculateCuttingTemperature,
  calculateMinimumCostSpeed,
  optimizeCuttingParameters,
  type ModalParameters,
  type OptimizationConstraints,
  type OptimizationWeights,
  type CostParameters
} from "../../engines/AdvancedCalculations.js";

import {
  calculateITGrade,
  analyzeShaftHoleFit,
  toleranceStackUp,
  calculateCpk,
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
  algorithmEngine,
} from "../../engines/AlgorithmEngine.js";

/**
 * Extract domain-specific key values per calc type for summary-level responses.
 * Each calc type returns only the most critical metrics (~50-100 tokens).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- diverse engine results with nested .value fields
function calcExtractKeyValues(action: string, result: any): Record<string, unknown> {
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
    case "drilling_force":
      return { Fc_N: result.Fc, Ff_N: result.Ff, torque_Nm: result.torque, power_kW: result.power };
    case "wear_progression":
      return { vb_mm: result.current_vb_mm?.value, wear_rate_um_min: result.wear_rate_um_per_min?.value, remaining_min: result.remaining_life_min?.value, stage: result.wear_stage, safe: result.is_safe };
    case "drill_breakthrough":
      return { thrust_N: result.steady_state_thrust_N?.value, peak_thrust_N: result.peak_breakthrough_thrust_N?.value, exit_feed: result.recommended_exit_feed_mm_rev?.value, burr_risk: result.exit_burr_risk, safe: result.is_safe };
    case "thermal_growth":
      return { total_z_error_um: result.total_z_error_um?.value, compensation_mm: result.compensation_needed_mm?.value, spindle_rise_C: result.spindle_temp_rise_C?.value, stability_min: result.time_to_stability_min?.value, safe: result.is_safe };
    case "bore_finishing":
      return { passes: result.estimated_passes?.value, predicted_Ra_um: result.predicted_Ra_um?.value, cycle_min: result.cycle_time_min?.value, diameter_growth_um: result.bore_diameter_growth_um?.value, safe: result.is_safe };
    case "finishing_pass":
      return { deflection_um: result.roughing_deflection_um?.value, spring_depth_mm: result.spring_pass_depth_mm?.value, finish_feed: result.finishing_feed_mm_rev?.value, predicted_Ra_um: result.predicted_Ra_um?.value, passes: result.number_of_passes?.value, safe: result.is_safe };
    case "turning_force":
      return { Fc_N: result.tangential_force_Fc_N?.value, Ff_N: result.feed_force_Ff_N?.value, Fp_N: result.radial_force_Fp_N?.value, power_kW: result.cutting_power_kW?.value, torque_Nm: result.spindle_torque_Nm?.value, safe: result.is_safe };
    case "tapping_torque":
      return { torque_Nm: result.cutting_torque_Nm?.value, thrust_N: result.axial_thrust_N?.value, power_kW: result.tapping_power_kW?.value, breakage_risk: result.breakage_risk, margin_pct: result.torque_margin_pct?.value, safe: result.is_safe };
    case "power_budget":
      return { required_kW: result.required_power_kW?.value, available_kW: result.available_power_kW?.value, utilization_pct: result.power_utilization_pct?.value, max_feed: result.max_feed_at_limit?.value, max_mrr: result.max_mrr_cm3_min?.value, limiting: result.limiting_factor, safe: result.is_safe };
    case "tool_deflection_predict":
      return { deflection_um: result.static_deflection_um?.value, error_um: result.dimensional_error_um?.value, stress_MPa: result.max_bending_stress_MPa?.value, safety_factor: result.safety_factor?.value, max_overhang_mm: result.max_recommended_overhang_mm?.value, within_tol: result.within_tolerance, safe: result.is_safe };
    case "chip_formation":
      return { shear_angle_deg: result.shear_angle_deg?.value, compression_ratio: result.chip_compression_ratio?.value, chip_type: result.chip_type, bue_risk: result.bue_risk, breakability: result.chip_breakability, safe: result.is_safe };
    case "specific_cutting_energy":
      return { u_J_mm3: result.specific_energy_J_mm3?.value, power_kW: result.cutting_power_kW?.value, energy_Wh: result.energy_per_part_Wh?.value, co2_g: result.co2_per_part_g?.value, efficiency: result.energy_efficiency_ratio?.value, class: result.specific_energy_class, safe: result.is_safe };
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
    case "spindle_harmonic_analysis":
      return { quality_score: result.quality_score, surface_penalty: result.surface_penalty_factor, worst: result.worst_excitation, recommendations: result.recommendations };
    case "spindle_optimal_rpm":
      return { optimal_rpm: result.optimal_rpm, quality_score: result.quality_score, top_5: result.top_5_rpms, avoid: result.avoid_rpms?.slice(0, 3) };
    case "spindle_quality_map":
      return { sweet_spots: result.sweet_spots, points_count: result.points?.length };
    case "archard_wear":
      return { rate_um_min: result.abrasive_wear_rate_um_min, vb_mm: result.abrasive_vb_mm, dominant: result.dominant_mechanism, recommendations: result.recommendations };
    case "wear_force_correction":
      return { corrected_N: result.corrected_force_N, increase_pct: result.force_increase_pct, ploughing_N: result.ploughing_force_N, excessive: result.is_excessive };
    case "thermal_deflection":
      return { cold_mm: result.cold_deflection_mm, hot_mm: result.hot_deflection_mm, increase_pct: result.deflection_increase_pct, E_eff_GPa: result.effective_youngs_GPa };
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
    case "roughness_convert":
      return { from: result.input_scale, to: result.output_scale, value: result.output_value, n_grade: result.n_grade_label, process: result.typical_process, unc_pct: result.uncertainty_pct };
    case "peck_drill_optimize":
      return { ld_ratio: result.ld_ratio, strategy: result.peck_strategy, peck_mm: result.peck_depth_mm, pecks: result.num_pecks, feed_adj: result.adjusted_feed_mm_rev, time_s: result.estimated_cycle_time_s };
    case "drill_cycle_optimize":
      return { cycle: result.recommended_cycle, ld: result.depth_to_diameter_ratio, peck_mm: result.peck_depth_mm?.value, pecks: result.number_of_pecks, dwell_s: result.dwell_time_s?.value, time_s: result.estimated_cycle_time_s?.value, chip_risk: result.chip_evacuation_risk, safe: result.is_safe };
    case "coating_select":
      return { coating: result.primary_recommendation, score: result.suitability_score?.value, max_temp_C: result.max_service_temperature_C?.value, friction: result.friction_coefficient?.value, speed_mult: result.speed_multiplier?.value, coolant: result.coolant_recommendation, safe: result.is_safe };
    case "geometry_select":
      return { flutes: result.recommended_flutes?.value, helix: result.helix_angle_deg?.value, corner: result.corner_treatment, radius_mm: result.corner_radius_mm?.value, var_helix: result.variable_helix, rake: result.rake_angle_deg?.value };
    case "insert_grade_select":
      return { group: result.iso_application_group, grade: result.iso_range?.unit, substrate: result.substrate_class, chipbreaker: result.chipbreaker, shape: result.insert_shape, nose_r: result.nose_radius_mm?.value };
    case "coolant_recommend":
      return { method: result.primary_method, fluid: result.fluid_type, conc_pct: result.concentration_pct?.value, pressure_bar: result.pressure_bar?.value, flow_lpm: result.flow_rate_l_min?.value, alt: result.alternative_method };
    case "toolpath_segment_optimize":
      return { bottleneck: result.bottleneck_segment, avg_force_N: result.avg_force_n, cycle_time_s: result.total_time_s };
    case "tool_assembly_deflection":
      return { tip_deflection_mm: result.tip_deflection_mm, natural_freq_hz: result.natural_frequency_hz, stiffness: result.total_stiffness_n_mm };
    case "adaptive_engagement_calc":
      return { peak_ae_mm: result.peak_engagement_mm, spike_ratio: result.engagement_spike_ratio, adjusted_feed: result.adjusted_feed_mmmin };
    case "hybrid_post_merge":
      return { total_lines: result.merged_gcode.length, conflicts: result.conflicts.length, tools_used: result.tool_map.size };
    case "thermal_compensation_model":
      return { peak_drift_um: result.peak_drift_um, peak_axis: result.peak_drift_axis, z_offset_um: result.compensation_offsets.z_um, warmup_min: result.warmup_time_min, risk: result.risk_level };
    case "spc_capability_analyze":
      return { cp: result.capability.cp, cpk: result.capability.cpk, sigma: result.capability.sigma_level, yield_pct: result.predicted_defects.yield_pct, assessment: result.process_assessment };
    case "pareto_optimize":
      return { frontier_size: result.frontier.length, total_evaluated: result.total_evaluated, best_compromise: result.best_compromise?.objectives };
    case "chatter_stability_sld":
      return { optimal_rpm: result.optimal_rpm, max_stable_ap_mm: result.max_stable_ap_mm, lobes: result.lobes.length, stable_pockets: result.stable_pockets.length };
    case "surface_integrity_full":
      return { ra_um: result.roughness.ra_um, rz_um: result.roughness.rz_um, stress_type: result.residual_stress.type, stress_mpa: result.residual_stress.surface_mpa, white_layer: result.subsurface.white_layer_risk, grade: result.quality_grade };
    case "machining_energy_model":
      return { total_kwh: result.total_kwh, sec_j_mm3: result.sec_j_mm3, co2_kg: result.co2_kg, efficiency_pct: result.efficiency_pct };
    case "monte_carlo_process":
      return { trials: result.value.trials, force_mean: result.value.force_distribution.mean, ra_mean: result.value.roughness_distribution.mean, scrap_pct: result.value.risk_summary.scrap_rate_pct, converged: result.value.convergence.converged };
    case "doe_taguchi":
      return { design: result.value.design_name, runs: result.value.total_runs, optimum: result.value.predicted_optimum, top_factor: result.value.factor_rankings[0]?.factor };
    case "fixture_clamping":
      return { total_force_n: result.value.required_clamping_force_n, per_clamp_n: result.value.per_clamp_force_n, deformation_risk: result.value.deformation_risk.risk_level };
    case "springback_predict":
      return { deflection_mm: result.value.max_deflection_mm, springback_mm: result.value.springback_mm, within_tol: result.value.within_tolerance, overcut_mm: result.value.compensation.overcut_mm };
    case "gdt_stackup":
      return { nominal_mm: result.value.nominal_gap_mm, wc_feasible: result.value.worst_case.feasible, rss_feasible: result.value.rss.feasible, mc_reject_pct: result.value.monte_carlo.reject_pct };
    case "runout_effect":
      return { imbalance_pct: result.value.chipload_imbalance_pct, life_reduction_pct: result.value.tool_life_reduction_pct, waviness_um: result.value.surface_waviness_um, critical_tir_um: result.value.critical_tir_um };
    case "process_digital_twin":
      return { force_n: result.value.force.tangential_n, deflection_mm: result.value.deflection.total_mm, tool_life_min: result.value.tool_life.minutes, ra_um: result.value.surface.ra_um, cost_per_part: result.value.cost.total_cost_per_part, bottleneck: result.value.bottleneck };
    case "process_robustness":
      return { robustness: result.value.robustness_index, grade: result.value.robustness_grade, sensitivities: result.value.sensitivities.length, worst_force_inc_pct: result.value.worst_case_scenario.force_increase_pct };
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
  "optimize_parameters", "optimize_sequence", "sustainability_report", "eco_optimize",
  "fixture_recommend",
  "drilling_force",
  "algorithm_calculate", "algorithm_validate", "algorithm_list",
  "algorithm_info", "algorithm_batch", "algorithm_benchmark",
  "wear_progression", "drill_breakthrough", "thermal_growth",
  "bore_finishing", "finishing_pass", "turning_force",
  "tapping_torque", "power_budget",
  "tool_deflection_predict", "chip_formation", "specific_cutting_energy",
  "roughness_convert", "peck_drill_optimize",
  "drill_cycle_optimize", "coating_select",
  "geometry_select", "insert_grade_select", "coolant_recommend",
  "monte_carlo_simulate", "monte_carlo_tool_life", "monte_carlo_tolerance", "monte_carlo_histogram",
  "gcode_validate", "gcode_envelope", "gcode_optimize", "gcode_compress", "gcode_analyze",
  "backplot_parse", "backplot_statistics",
  "jc_flow_stress", "jc_params", "jc_search", "jc_list",
  "rl_post_create", "rl_post_generate", "rl_post_learn",
  "merchant_analysis", "milling_forces", "cutting_temperature",
  "crater_wear", "material_cutting_data",
  "kinematics_fk", "kinematics_5axis_ik", "kinematics_singularity",
  "kinematics_transform",
  "vibration_sdof", "vibration_free_response", "vibration_forced_response",
  "vibration_frf", "vibration_modal",
  "thermal_loewen_shaw", "thermal_trigger", "thermal_fourier_1d", "thermal_expansion_calc",
  "chatter_stability_lobes", "chatter_check_stability", "chatter_detect", "chatter_critical_speeds",
  "heat_conduction_1d", "heat_lumped_capacitance", "heat_convection_coeff", "heat_coolant_effectiveness",
  "geometry_delaunay", "geometry_convex_hull", "geometry_polygon_info", "geometry_point_in_polygon", "geometry_polygon_offset",
  "nurbs_curve_evaluate", "nurbs_curve_tangent", "nurbs_curve_curvature", "nurbs_surface_evaluate", "nurbs_surface_closest_point",
  "mesh_curvature_all", "mesh_curvature_classify",
  "silhouette_extract", "silhouette_crease", "silhouette_all_edges",
  "isosurface_marching_cubes",
  "moo_nsga2", "moo_pareto_dominates", "moo_non_dominated_sort",
  "graph_mst_kruskal", "graph_bellman_ford", "graph_topo_sort", "graph_scc", "graph_cpm",
  "surface_intersect", "mesh_offset", "mesh_shell",
  "spindle_harmonic_analysis", "spindle_optimal_rpm", "spindle_quality_map",
  "archard_wear", "wear_force_correction", "thermal_deflection",
  "cutting_data_recommend", "cutting_data_list_groups", "cutting_data_list",
  "machine_recommend", "machine_compare", "machine_validate",
  "tool_select_recommend", "tool_select_compare", "tool_select_alternatives",
  "tool_crib_checkout", "tool_crib_checkin", "tool_crib_inventory", "tool_crib_reorder",
  "toolholder_frf", "toolholder_compare",
  "machinability_rate", "machinability_compare",
  "material_equivalent", "material_equiv_compare",
  "material_select_recommend", "material_select_compare", "material_machinability",
  "tensile_to_machinability",
  "heat_treat_predict", "heat_treat_temper_curve", "heat_treat_recommend",
  "passivation_calc",
  "plating_allowance", "plating_tolerance", "plating_recommend",
  "shot_peen_calc",
  "recast_layer_predict", "recast_layer_validate",
  "white_layer_predict", "white_layer_validate",
  "masking_calc",
  "process_plan_generate", "process_plan_optimize", "process_plan_estimate_time", "process_plan_validate",
  "thread_parse", "thread_tap_drill", "thread_mill_params", "thread_stripping",
  "tool_breakage_predict", "tool_stress_analyze", "tool_safe_limits",
  "spindle_torque_check", "spindle_power_check", "spindle_safe_envelope",
  "coolant_validate", "coolant_flow_check", "coolant_chip_evacuation",
  "hobbing_calc", "hobbing_shift",
  "cryo_predict", "cryo_recommend", "cryo_roi",
  "hardness_convert", "hardness_batch",
  "bend_allowance_calc",
  "anodize_allowance",
  "clamp_simulate", "clamp_validate", "clamp_optimize",
  "damping_optimize",
  "cost_estimate", "cost_compare_materials",
  "feed_optimize", "corner_dynamics", "arc_feed_correction",
  "balance_grade", "aggressiveness_levels",
  "ode_solve", "ode_solve_system", "linear_solve", "least_squares",
  "pid_simulate", "pid_step", "discretize_tf",
  "lp_solve", "lp_resource_allocation",
  "material_interpolate", "material_similarity", "material_compare",
  "ziegler_nichols", "step_response",
  "fft_analyze", "dominant_frequency", "design_fir_filter", "spectrogram",
  "gradient_optimize", "bfgs_optimize", "golden_section",
  "simulated_annealing", "two_opt_tsp", "spectral_partition", "mesh_analyze",
  // Batch 13: Workholding & Fixture
  "fixture_design_recommend", "fixture_design_validate", "fixture_clamp_force", "fixture_deflection_calc",
  "soft_jaw_design", "magnetic_chuck_calc", "tombstone_layout",
  "workholding_clamp_force", "workholding_pullout", "workholding_liftoff",
  "fixture_3dp_evaluate", "weld_prep_calc",
  "twin_create", "twin_predict", "twin_simulate",
  // Batch 14: Machining Physics & Probing
  "spline_mill_calc", "spline_mill_validate",
  "thin_floor_analyze", "thin_floor_min_thickness",
  "regen_chatter_predict", "regen_chatter_lobes",
  "harmonic_analyze",
  "thread_mill_calc", "thread_mill_gcode",
  "gcode_opt_analyze", "gcode_opt_optimize", "gcode_opt_compare",
  "probe_routine_generate", "probe_gdt_interpret", "probe_report",
  "thermal_sim_predict", "thermal_sim_validate", "thermal_sim_optimize",
  // Batch 15: Specialty Processes
  "hybrid_laser_calc", "laser_cut_calc", "laser_mark_calc",
  "waterjet_taper_calc",
  "microstructure_analyze", "microstructure_recommend",
  "energy_analyze", "energy_optimize", "energy_compare",
  // ── Tool Catalog ──
  "tool_catalog_search", "tool_catalog_lookup", "tool_catalog_assembly",
  "tool_catalog_collision_envelope", "tool_catalog_recommend", "tool_catalog_stats",
  // ── Unit Conversion ──
  "unit_convert", "unit_convert_batch", "unit_system_toggle", "unit_list_conversions", "unit_rpm_calc",
  // ── Machine Profile ──
  "machine_profile_get", "machine_profile_list", "machine_profile_validate", "machine_profile_spindle_curve", "machine_profile_add",
  // ── Optimization (PSO/ACO/BO/TR) ──
  "pso_minimize", "pso_maximize",
  "aco_solve_tsp", "aco_solve_assignment",
  "bayesian_optimize", "bayesian_suggest",
  "trust_region_minimize",
  // ── Geometry (BVH) ──
  "bvh_build_stats", "bvh_raycast",
  // ── Interior Point ──
  "interior_point_solve", "interior_point_qp",
  // ── Rigid Body Dynamics ──
  "rigid_body_inertia", "rigid_body_force_analysis", "rigid_body_impact",
  // ── Voronoi ──
  "voronoi_delaunay", "voronoi_diagram", "voronoi_nearest", "voronoi_relax",
  // ── SQP ──
  "sqp_minimize",
  // ── Parametric Surface ──
  "parametric_surface_evaluate", "parametric_surface_tessellate",
  "parametric_surface_curvature", "parametric_surface_area",
  // ── Convex Optimization ──
  "convex_qp_solve", "convex_minimize",
  // ── Numerical Integration ──
  "numerical_integrate", "numerical_integrate_2d", "numerical_integrate_sampled",
  // ── Differential Equations ──
  "ode_rk45_solve", "ode_second_order", "ode_stability",
  // ── Finite Element ──
  "fem_bar_solve", "fem_truss_solve", "fem_thermal_solve",
  // ── Wavelet ──
  "wavelet_dwt", "wavelet_denoise", "wavelet_energy",
  // ── Markov Chain ──
  "markov_steady_state", "markov_absorbing", "markov_reliability",
  // ── Fuzzy Logic ──
  "fuzzy_evaluate", "fuzzy_process_controller",
  // ── Dynamic Programming ──
  "dp_knapsack", "dp_cutting_stock", "dp_edit_distance",
  // ── Robust Statistics ──
  "robust_location", "robust_outliers", "robust_bootstrap", "robust_theil_sen",
  // ── Game Theory ──
  "game_zero_sum", "game_nash", "game_decision",
  // ── Survival Analysis ──
  "survival_kaplan_meier", "survival_weibull_fit", "survival_mtbf",
  // ── Queueing Theory ──
  "queue_mm1", "queue_mmc", "queue_littles_law", "queue_production_line",
  "constraint_satisfaction",
  "toolpath_segment_optimize", "tool_assembly_deflection", "adaptive_engagement_calc",
  "hybrid_post_merge", "thermal_compensation_model", "spc_capability_analyze",
  "pareto_optimize", "chatter_stability_sld", "surface_integrity_full",
  "machining_energy_model",
  "monte_carlo_process",
  "doe_taguchi",
  "fixture_clamping",
  "springback_predict",
  "gdt_stackup",
  "runout_effect",
  "process_digital_twin",
  "process_robustness",
] as const;

/** Registers calc dispatcher.
 * @param server - MCP server instance
 */
export function registerCalcDispatcher(server: any): void {
  server.tool(
    "prism_calc",
    "Manufacturing calculations: cutting force, tool life, speed/feed, power, G-code, tolerance, optimization, reports, campaigns. Use 'action' param.",
    {
      action: z.enum(ACTIONS),
      params: z.record(z.string(), z.any()).optional()
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
      const calcStart = Date.now();

      // Emit CALC_STARTED event
      try { eventBus.publish(EventTypes.CALC_STARTED, { action }, { category: "calculation", priority: "normal", source: "calcDispatcher" }); } catch { /* best-effort */ }

      // Map actions to specific pre-hook phases
      const SPECIFIC_HOOKS: Record<string, string> = {
        cutting_force: "pre-kienzle",
        tool_life: "pre-taylor",
        flow_stress: "pre-johnson-cook"
      };
      
      try {
        // H1-MS2: Auto-normalize snake_case → camelCase params
        try {
          const { normalizeParams } = await import("../../utils/paramNormalizer.js");
          Object.assign(params, normalizeParams(rawParams));
        } catch { /* normalizer not available */ }

        // SYS-MS6: Validate params against per-action Zod schema
        const validation = validateActionParams(action, params, ACTION_CALC_SCHEMAS);
        if (!validation.valid) {
          return dispatcherError(
            `Invalid params for '${action}': ${validation.errorMessage}`,
            action,
            "prism_calc"
          );
        }

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
          const specResult = await hookExecutor.execute(specificPhase as HookPhase, hookCtx);
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
        
        // ComputationCache: check for cached results on hot-path actions
        const _cacheableActions = new Set(["cutting_force", "tool_life", "speed_feed", "surface_finish", "power", "mrr"]);
        if (_cacheableActions.has(action)) {
          // C2 fix: include material/tool context in cache key to avoid cross-material cache hits
          const cacheParams = { ...params, _cache_material: params.material_id || params.material || "", _cache_tool: params.tool_id || params.tool_material || "" };
          const cacheHit = computationCache.get(action, cacheParams);
          if (cacheHit.hit) {
            result = { ...cacheHit.value, _cached: true };
            // Skip to post-calculation hooks
            try {
              await hookExecutor.execute("post-calculation", {
                ...hookCtx,
                metadata: { ...hookCtx.metadata, result }
              });
            } catch (e: any) { log.debug(`[prism] ${e?.message?.slice(0, 80)}`); }
            const pressurePct = getCurrentPressurePct();
            if (pressurePct > 50) {
              try {
                const extracted = calcExtractKeyValues(action, result);
                if (extracted && Object.keys(extracted).length > 0) {
                  return { content: [{ type: "text", text: JSON.stringify(slimResponse({ action, ...extracted, _slimmed: true, _cached: true }, getSlimLevel(pressurePct))) }] };
                }
              } catch (e: any) { log.debug(`[prism] ${e?.message?.slice(0, 80)}`); }
            }
            return { content: [{ type: "text", text: JSON.stringify(slimResponse(result, getSlimLevel(pressurePct))) }] };
          }
        }

        // A1: Per-call material lookup memoization (avoids redundant registry reads)
        const _matCache = new Map<string, any>();
        const getMat = async (id: string) => {
          if (!_matCache.has(id)) _matCache.set(id, await registryManager.materials.getByIdOrName(id));
          return _matCache.get(id);
        };

        switch (action) {
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
            const mpMat = (params.material_id || params.material) ? await getMat(params.material_id || params.material) : null;
            const mpKc = params.kc1_1 || mpMat?.kienzle?.kc1_1 || 1800;
            const mpCr = (mpMat as unknown as Record<string, Record<string, Record<string, unknown>>>)?.cutting_recommendations?.milling || {};
            result = calculateMultiPassStrategy(params.total_stock || params.stock || 10, params.tool_diameter || 12, mpKc, params.machine_power_kw || params.max_power || 15, params.cutting_speed_rough || mpCr.speed_roughing || 150, params.cutting_speed_finish || mpCr.speed_finishing || 200, params.fz_rough || mpCr.feed_per_tooth_roughing || 0.12, params.fz_finish || mpCr.feed_per_tooth_finishing || 0.06, params.target_Ra);
            break;
          }

          case "gcode_snippet": {
            const gcRpm = params.rpm || Math.round(((params.cutting_speed || 150) * 1000) / (Math.PI * (params.tool_diameter || 12)));
            result = generateGCodeSnippet(params.controller || "fanuc", params.operation || "milling", { rpm: gcRpm, feed_rate: params.feed_rate || params.vf || 1000, tool_number: params.tool_number || 1, depth_of_cut: params.axial_depth || 3, x_start: params.x_start, y_start: params.y_start, z_safe: params.z_safe || 5, z_depth: params.z_depth, coolant: params.coolant });
            break;
          }

          case "algorithm_calculate": {
            result = algorithmEngine.calculate({
              algorithm_id: params.algorithm_id,
              params: params.algorithm_params ?? params.params ?? params,
            });
            break;
          }
          case "algorithm_validate": {
            result = algorithmEngine.validate({
              algorithm_id: params.algorithm_id,
              params: params.algorithm_params ?? params.params ?? params,
            });
            break;
          }
          case "algorithm_list": {
            result = algorithmEngine.list({
              domain: params.domain,
              safety_class: params.safety_class,
            });
            break;
          }
          case "algorithm_info": {
            result = algorithmEngine.info(params.algorithm_id);
            if (!result) throw new Error(`Unknown algorithm: "${params.algorithm_id}"`);
            break;
          }
          case "algorithm_batch": {
            result = algorithmEngine.batch({
              calculations: params.calculations,
              stop_on_error: params.stop_on_error,
            });
            break;
          }
          case "algorithm_benchmark": {
            result = algorithmEngine.benchmark({
              algorithm_id: params.algorithm_id,
              params: params.algorithm_params ?? params.params ?? params,
            });
            break;
          }

          case "monte_carlo_simulate": {
            const { monteCarloEngine } = await import("../../engines/MonteCarloEngine.js");
            const model = () => monteCarloEngine.random.normal(
              params.mean ?? 0, params.std_dev ?? 1,
            );
            result = monteCarloEngine.simulate(model, params.samples ?? 10000);
            break;
          }
          case "monte_carlo_tool_life": {
            const { monteCarloEngine } = await import("../../engines/MonteCarloEngine.js");
            result = monteCarloEngine.predictToolLife({
              cutting_speed: params.cutting_speed ?? params.vc,
              feedrate: params.feedrate ?? params.fz,
              depth_of_cut: params.depth_of_cut ?? params.ap,
              taylor_C: params.taylor_C ?? params.C,
              taylor_n: params.taylor_n ?? params.n,
              samples: params.samples,
            });
            break;
          }
          case "monte_carlo_tolerance": {
            const { monteCarloEngine } = await import("../../engines/MonteCarloEngine.js");
            result = monteCarloEngine.toleranceStackUp({
              dimensions: params.dimensions ?? [],
              target_tolerance: params.target_tolerance,
              samples: params.samples,
            });
            break;
          }
          case "monte_carlo_histogram": {
            const { monteCarloEngine } = await import("../../engines/MonteCarloEngine.js");
            const samples = params.samples_array ?? params.data ?? [];
            result = monteCarloEngine.histogram(samples, params.bins ?? 20);
            break;
          }

          // ── G-Code Validation & Optimization ──
          case "gcode_validate": {
            const { gcodeValidationEngine } = await import("../../engines/GCodeValidationEngine.js");
            result = gcodeValidationEngine.validate(
              params.gcode ?? "", params.controller ?? "FANUC",
            );
            break;
          }
          case "gcode_envelope": {
            const { gcodeValidationEngine } = await import("../../engines/GCodeValidationEngine.js");
            result = gcodeValidationEngine.validateEnvelope(
              params.gcode ?? "", params.envelope,
            );
            break;
          }
          case "gcode_optimize": {
            const { gcodeValidationEngine } = await import("../../engines/GCodeValidationEngine.js");
            result = gcodeValidationEngine.optimizeMotion(params.gcode ?? "");
            break;
          }
          case "gcode_compress": {
            const { gcodeValidationEngine } = await import("../../engines/GCodeValidationEngine.js");
            result = gcodeValidationEngine.compress(params.gcode ?? "", {
              removeComments: params.remove_comments,
              removeBlockNumbers: params.remove_block_numbers,
              precision: params.precision,
            });
            break;
          }
          case "gcode_analyze": {
            const { gcodeValidationEngine } = await import("../../engines/GCodeValidationEngine.js");
            result = gcodeValidationEngine.analyzeProgram(params.gcode ?? "");
            break;
          }

          // ── Backplot ──
          case "backplot_parse": {
            const { backplotEngine } = await import("../../engines/BackplotEngine.js");
            result = backplotEngine.parse(params.gcode ?? "");
            break;
          }
          case "backplot_statistics": {
            const { backplotEngine } = await import("../../engines/BackplotEngine.js");
            result = backplotEngine.statistics(params.gcode ?? "");
            break;
          }

          // ── Johnson-Cook ──
          case "jc_flow_stress": {
            const { johnsonCookEngine } = await import("../../engines/JohnsonCookEngine.js");
            result = johnsonCookEngine.calculateFlowStress(
              params.material_id ?? params.materialId ?? "",
              params.strain ?? 0.1,
              params.strain_rate ?? params.strainRate ?? 1,
              params.temperature ?? 293,
            );
            break;
          }
          case "jc_params": {
            const { johnsonCookEngine } = await import("../../engines/JohnsonCookEngine.js");
            result = johnsonCookEngine.getParams(
              params.material_id ?? params.materialId ?? "",
            );
            break;
          }
          case "jc_search": {
            const { johnsonCookEngine } = await import("../../engines/JohnsonCookEngine.js");
            result = johnsonCookEngine.search(params.query ?? "");
            break;
          }
          case "jc_list": {
            const { johnsonCookEngine } = await import("../../engines/JohnsonCookEngine.js");
            result = {
              materials: params.category
                ? johnsonCookEngine.listCategory(params.category)
                : johnsonCookEngine.listAll(),
              count: johnsonCookEngine.count(),
            };
            break;
          }

          // ── RL Post Processor ──
          case "rl_post_create": {
            const { rlPostProcessorEngine } = await import("../../engines/RLPostProcessorEngine.js");
            result = rlPostProcessorEngine.createProcessor(
              params.controller_type ?? params.controllerType ?? "FANUC",
              {
                epsilon: params.epsilon,
                learningRate: params.learning_rate ?? params.learningRate,
                gamma: params.gamma,
              },
            );
            break;
          }
          case "rl_post_generate": {
            const { rlPostProcessorEngine } = await import("../../engines/RLPostProcessorEngine.js");
            const proc = params.processor ?? rlPostProcessorEngine.createProcessor(
              params.controller_type ?? params.controllerType ?? "FANUC",
            );
            result = rlPostProcessorEngine.generateCode(
              proc,
              params.toolpath ?? [],
              { programNumber: params.program_number ?? params.programNumber, deterministic: params.deterministic },
            );
            break;
          }
          case "rl_post_learn": {
            const { rlPostProcessorEngine } = await import("../../engines/RLPostProcessorEngine.js");
            const proc = params.processor;
            if (!proc) { result = { error: "processor required" }; break; }
            result = rlPostProcessorEngine.learn(proc, params.feedback ?? params);
            break;
          }

          // ── Cutting Mechanics ──
          case "merchant_analysis": {
            const { cuttingMechanicsEngine } = await import("../../engines/CuttingMechanicsEngine.js");
            result = cuttingMechanicsEngine.merchantAnalysis(params as ValidatedParams);
            break;
          }
          case "milling_forces": {
            const { cuttingMechanicsEngine } = await import("../../engines/CuttingMechanicsEngine.js");
            result = cuttingMechanicsEngine.millingForces(
              params.tool ?? params,
              params.conditions ?? params,
            );
            break;
          }
          case "cutting_temperature": {
            const { cuttingMechanicsEngine } = await import("../../engines/CuttingMechanicsEngine.js");
            result = cuttingMechanicsEngine.cuttingTemperature(params);
            break;
          }
          case "crater_wear": {
            const { cuttingMechanicsEngine } = await import("../../engines/CuttingMechanicsEngine.js");
            result = cuttingMechanicsEngine.craterWear(params as ValidatedParams);
            break;
          }
          case "material_cutting_data": {
            const { cuttingMechanicsEngine } = await import("../../engines/CuttingMechanicsEngine.js");
            result = params.material
              ? cuttingMechanicsEngine.getMaterialCuttingData(params.material)
              : cuttingMechanicsEngine.listMaterials();
            break;
          }

          // ── Cutting Data Lookup (ISO-based) ──
          case "cutting_data_recommend": {
            const { cuttingDataLookupEngine } = await import("../../engines/CuttingDataLookupEngine.js");
            result = cuttingDataLookupEngine.recommend({
              material: params.material,
              iso_group: params.iso_group,
              operation: params.operation,
              tool_type: params.tool_type,
              tool_diameter_mm: params.tool_diameter_mm ?? params.tool_diameter,
              cut_type: params.cut_type,
              hardness_hb: params.hardness_hb ?? params.hardness,
            });
            break;
          }

          case "cutting_data_list_groups": {
            const { cuttingDataLookupEngine } = await import("../../engines/CuttingDataLookupEngine.js");
            result = cuttingDataLookupEngine.listGroups();
            break;
          }

          case "cutting_data_list": {
            const { cuttingDataLookupEngine } = await import("../../engines/CuttingDataLookupEngine.js");
            result = cuttingDataLookupEngine.listAvailableData();
            break;
          }

          // ── Kinematics ──
          case "kinematics_fk": {
            const { kinematicsEngine } = await import("../../engines/KinematicsEngine.js");
            result = kinematicsEngine.forwardKinematicsDH(
              params.dh_table ?? params.dhTable ?? [],
              params.joint_values ?? params.jointValues ?? [],
            );
            break;
          }
          case "kinematics_5axis_ik": {
            const { kinematicsEngine } = await import("../../engines/KinematicsEngine.js");
            result = kinematicsEngine.fiveAxisIK(
              { position: params.position, axis: params.axis },
              {
                type: params.machine_type ?? params.machineType,
                pivotOffset: params.pivot_offset ?? params.pivotOffset,
                limits: params.limits,
              },
            );
            break;
          }
          case "kinematics_singularity": {
            const { kinematicsEngine } = await import("../../engines/KinematicsEngine.js");
            result = kinematicsEngine.detectSingularity(
              params.joints ?? params,
              params.threshold,
            );
            break;
          }
          case "kinematics_transform": {
            const { kinematicsEngine } = await import("../../engines/KinematicsEngine.js");
            const point = params.point ?? { x: 0, y: 0, z: 0 };
            const T = kinematicsEngine.chainTransforms(
              kinematicsEngine.translate(
                params.dx ?? 0, params.dy ?? 0, params.dz ?? 0,
              ),
              kinematicsEngine.rotX(params.rx ?? 0),
              kinematicsEngine.rotY(params.ry ?? 0),
              kinematicsEngine.rotZ(params.rz ?? 0),
            );
            result = kinematicsEngine.transformPoint(T, point);
            break;
          }

          // ── Vibration Analysis ──
          case "vibration_sdof": {
            const { vibrationAnalysisEngine } = await import("../../engines/VibrationAnalysisEngine.js");
            result = vibrationAnalysisEngine.sdofNaturalFrequency({
              mass: params.mass, stiffness: params.stiffness, damping: params.damping,
            });
            break;
          }
          case "vibration_free_response": {
            const { vibrationAnalysisEngine } = await import("../../engines/VibrationAnalysisEngine.js");
            result = vibrationAnalysisEngine.sdofFreeResponse(
              { mass: params.mass, stiffness: params.stiffness, damping: params.damping },
              { x0: params.x0 ?? 0, v0: params.v0 ?? 0 },
              params.time ?? params.t ?? 0,
            );
            break;
          }
          case "vibration_forced_response": {
            const { vibrationAnalysisEngine } = await import("../../engines/VibrationAnalysisEngine.js");
            result = vibrationAnalysisEngine.sdofForcedResponse(
              { mass: params.mass, stiffness: params.stiffness, damping: params.damping },
              { amplitude: params.force_amplitude ?? params.amplitude, frequency: params.frequency },
            );
            break;
          }
          case "vibration_frf": {
            const { vibrationAnalysisEngine } = await import("../../engines/VibrationAnalysisEngine.js");
            result = vibrationAnalysisEngine.generateFRF(
              { mass: params.mass, stiffness: params.stiffness, damping: params.damping },
              { start: params.freq_start ?? 1, end: params.freq_end ?? 100, points: params.points ?? 200 },
            );
            break;
          }
          case "vibration_modal": {
            const { vibrationAnalysisEngine } = await import("../../engines/VibrationAnalysisEngine.js");
            result = vibrationAnalysisEngine.modalAnalysis(params.M, params.K);
            break;
          }

          // ── Thermal Modeling ──
          case "thermal_loewen_shaw": {
            const { thermalModelingEngine } = await import("../../engines/ThermalModelingEngine.js");
            result = thermalModelingEngine.loewenShawTemperature({
              cuttingSpeed: params.cutting_speed ?? params.cuttingSpeed,
              feed: params.feed, depthOfCut: params.depth_of_cut ?? params.depthOfCut,
              specificCuttingForce: params.specific_cutting_force ?? params.specificCuttingForce,
              materialDensity: params.material_density ?? params.materialDensity ?? 7850,
              specificHeat: params.specific_heat ?? params.specificHeat ?? 500,
              thermalConductivity: params.thermal_conductivity ?? params.thermalConductivity ?? 50,
              ambientTemp: params.ambient_temp ?? params.ambientTemp,
            });
            break;
          }
          case "thermal_trigger": {
            const { thermalModelingEngine } = await import("../../engines/ThermalModelingEngine.js");
            result = thermalModelingEngine.triggerTemperature({
              specificEnergy: params.specific_energy ?? params.specificEnergy,
              cuttingSpeed: params.cutting_speed ?? params.cuttingSpeed,
              thermalNumber: params.thermal_number ?? params.thermalNumber ?? 0.5,
            });
            break;
          }
          case "thermal_fourier_1d": {
            const { thermalModelingEngine } = await import("../../engines/ThermalModelingEngine.js");
            result = thermalModelingEngine.fourierConduction1D({
              length: params.length, nodes: params.nodes, timeSteps: params.time_steps ?? params.timeSteps,
              dt: params.dt, thermalDiffusivity: params.thermal_diffusivity ?? params.thermalDiffusivity,
              initialTemp: params.initial_temp ?? params.initialTemp,
              leftBC: params.left_bc ?? params.leftBC,
              rightBC: params.right_bc ?? params.rightBC,
              heatSource: params.heat_source ?? params.heatSource,
            });
            break;
          }
          case "thermal_expansion_calc": {
            const { thermalModelingEngine } = await import("../../engines/ThermalModelingEngine.js");
            result = thermalModelingEngine.thermalExpansion({
              length: params.length,
              temperatureChange: params.temperature_change ?? params.temperatureChange,
              expansionCoefficient: params.expansion_coefficient ?? params.expansionCoefficient,
            });
            break;
          }

          // ── Chatter Prediction ──
          case "chatter_stability_lobes": {
            const { chatterPredictionEngine } = await import("../../engines/ChatterPredictionEngine.js");
            result = chatterPredictionEngine.generateStabilityLobes(
              { mass: params.mass, stiffness: params.stiffness, damping: params.damping,
                naturalFreq: params.natural_freq, dampingRatio: params.damping_ratio },
              { Kt: params.Kt, radialImmersion: params.radial_immersion, numTeeth: params.num_teeth ?? params.teeth },
              { min: params.rpm_min ?? 1000, max: params.rpm_max ?? 20000, points: params.points },
            );
            break;
          }
          case "chatter_check_stability": {
            const { chatterPredictionEngine } = await import("../../engines/ChatterPredictionEngine.js");
            const lobes = chatterPredictionEngine.generateStabilityLobes(
              { mass: params.mass, stiffness: params.stiffness, damping: params.damping },
              { Kt: params.Kt, numTeeth: params.num_teeth ?? params.teeth ?? 4 },
              { min: params.rpm_min ?? 1000, max: params.rpm_max ?? 20000 },
            );
            result = chatterPredictionEngine.checkStability(
              params.rpm, params.axial_depth ?? params.depth, lobes,
            );
            break;
          }
          case "chatter_detect": {
            const { chatterPredictionEngine } = await import("../../engines/ChatterPredictionEngine.js");
            result = chatterPredictionEngine.detectChatter(
              params.signal,
              { sampleRate: params.sample_rate, teeth: params.teeth ?? 4, rpm: params.rpm },
            );
            break;
          }
          case "chatter_critical_speeds": {
            const { chatterPredictionEngine } = await import("../../engines/ChatterPredictionEngine.js");
            result = chatterPredictionEngine.criticalSpeeds(
              { length: params.length, diameter: params.diameter, E: params.E ?? params.youngs_modulus ?? 200e9, density: params.density ?? 7850 },
              params.support_type,
            );
            break;
          }

          // ── Heat Transfer ──
          case "heat_conduction_1d": {
            const { heatTransferEngine } = await import("../../engines/HeatTransferEngine.js");
            result = heatTransferEngine.steadyStateConduction1D({
              thermalConductivity: params.thermal_conductivity ?? params.k,
              length: params.length, crossSectionArea: params.cross_section_area ?? params.area,
              T_hot: params.T_hot, T_cold: params.T_cold,
            });
            break;
          }
          case "heat_lumped_capacitance": {
            const { heatTransferEngine } = await import("../../engines/HeatTransferEngine.js");
            result = heatTransferEngine.transientLumpedCapacitance({
              mass: params.mass, specificHeat: params.specific_heat ?? 500,
              surfaceArea: params.surface_area, heatTransferCoeff: params.heat_transfer_coeff ?? params.h,
              T_initial: params.T_initial, T_ambient: params.T_ambient, time: params.time,
            });
            break;
          }
          case "heat_convection_coeff": {
            const { heatTransferEngine } = await import("../../engines/HeatTransferEngine.js");
            result = heatTransferEngine.forcedConvectionCoefficient({
              velocity: params.velocity, characteristicLength: params.characteristic_length ?? params.length,
              fluidType: params.fluid_type ?? params.fluid,
            });
            break;
          }
          case "heat_coolant_effectiveness": {
            const { heatTransferEngine } = await import("../../engines/HeatTransferEngine.js");
            result = heatTransferEngine.coolantEffectiveness({
              cuttingSpeed: params.cutting_speed ?? params.speed, flowRate: params.flow_rate,
              coolantType: params.coolant_type, nozzleDiameter: params.nozzle_diameter,
              nozzleDistance: params.nozzle_distance,
            });
            break;
          }

          // ── Geometry Algorithms ──
          case "geometry_delaunay": {
            const { geometryAlgorithmsEngine } = await import("../../engines/GeometryAlgorithmsEngine.js");
            result = geometryAlgorithmsEngine.delaunayTriangulate(params.points);
            break;
          }
          case "geometry_convex_hull": {
            const { geometryAlgorithmsEngine } = await import("../../engines/GeometryAlgorithmsEngine.js");
            const method = params.method ?? "graham";
            result = method === "jarvis"
              ? geometryAlgorithmsEngine.jarvisMarch(params.points)
              : geometryAlgorithmsEngine.grahamScan(params.points);
            break;
          }
          case "geometry_polygon_info": {
            const { geometryAlgorithmsEngine } = await import("../../engines/GeometryAlgorithmsEngine.js");
            result = geometryAlgorithmsEngine.polygonInfo(params.vertices);
            break;
          }
          case "geometry_point_in_polygon": {
            const { geometryAlgorithmsEngine } = await import("../../engines/GeometryAlgorithmsEngine.js");
            result = { inside: geometryAlgorithmsEngine.pointInPolygon(params.vertices, params.point) };
            break;
          }
          case "geometry_polygon_offset": {
            const { geometryAlgorithmsEngine } = await import("../../engines/GeometryAlgorithmsEngine.js");
            result = geometryAlgorithmsEngine.polygonOffset(params.vertices, params.distance);
            break;
          }

          // ── NURBS ──
          case "nurbs_curve_evaluate": {
            const { nurbsEngine } = await import("../../engines/NURBSEngine.js");
            result = nurbsEngine.curveEvaluate(params.curve, params.u);
            break;
          }
          case "nurbs_curve_tangent": {
            const { nurbsEngine } = await import("../../engines/NURBSEngine.js");
            result = nurbsEngine.curveTangent(params.curve, params.u);
            break;
          }
          case "nurbs_curve_curvature": {
            const { nurbsEngine } = await import("../../engines/NURBSEngine.js");
            result = { curvature: nurbsEngine.curveCurvature(params.curve, params.u) };
            break;
          }
          case "nurbs_surface_evaluate": {
            const { nurbsEngine } = await import("../../engines/NURBSEngine.js");
            result = nurbsEngine.surfaceEvaluate(params.surface, params.u, params.v);
            break;
          }
          case "nurbs_surface_closest_point": {
            const { nurbsEngine } = await import("../../engines/NURBSEngine.js");
            result = nurbsEngine.surfaceClosestPoint(params.surface, params.point);
            break;
          }

          // ── Mesh Curvature Analysis ──
          case "mesh_curvature_all": {
            const { curvatureAnalysisEngine } = await import("../../engines/CurvatureAnalysisEngine.js");
            result = curvatureAnalysisEngine.computeAll(params.mesh);
            break;
          }
          case "mesh_curvature_classify": {
            const { curvatureAnalysisEngine } = await import("../../engines/CurvatureAnalysisEngine.js");
            const curv = curvatureAnalysisEngine.computeAll(params.mesh);
            result = curvatureAnalysisEngine.classifySurface(curv);
            break;
          }

          // ── Silhouette ──
          case "silhouette_extract": {
            const { silhouetteEngine } = await import("../../engines/SilhouetteEngine.js");
            result = { edges: silhouetteEngine.extractSilhouette(params.vertices, params.faces, params.viewDir) };
            break;
          }
          case "silhouette_crease": {
            const { silhouetteEngine } = await import("../../engines/SilhouetteEngine.js");
            result = { edges: silhouetteEngine.extractCreaseEdges(params.vertices, params.faces, params.angleThreshold) };
            break;
          }
          case "silhouette_all_edges": {
            const { silhouetteEngine } = await import("../../engines/SilhouetteEngine.js");
            result = silhouetteEngine.extractAllEdges(params.vertices, params.faces, params.viewDir, params.creaseAngle);
            break;
          }

          // ── Isosurface ──
          case "isosurface_marching_cubes": {
            const { isosurfaceEngine } = await import("../../engines/IsosurfaceEngine.js");
            result = isosurfaceEngine.marchingCubes(params.grid, params.isovalue);
            break;
          }

          // ── Multi-Objective Optimization ──
          case "moo_nsga2": {
            const { multiObjectiveEngine } = await import("../../engines/MultiObjectiveEngine.js");
            result = multiObjectiveEngine.nsgaII(params as ValidatedParams);
            break;
          }
          case "moo_pareto_dominates": {
            const { multiObjectiveEngine } = await import("../../engines/MultiObjectiveEngine.js");
            result = { dominates: multiObjectiveEngine.dominates(params.a, params.b) };
            break;
          }
          case "moo_non_dominated_sort": {
            const { multiObjectiveEngine } = await import("../../engines/MultiObjectiveEngine.js");
            result = { fronts: multiObjectiveEngine.nonDominatedSort(params.population) };
            break;
          }

          // ── Graph Algorithms ──
          case "graph_mst_kruskal": {
            const { graphAlgorithmsEngine } = await import("../../engines/GraphAlgorithmsEngine.js");
            result = graphAlgorithmsEngine.kruskalMST(params.nodes, params.edges);
            break;
          }
          case "graph_bellman_ford": {
            const { graphAlgorithmsEngine } = await import("../../engines/GraphAlgorithmsEngine.js");
            result = graphAlgorithmsEngine.bellmanFord(params.nodes, params.edges, params.source);
            break;
          }
          case "graph_topo_sort": {
            const { graphAlgorithmsEngine } = await import("../../engines/GraphAlgorithmsEngine.js");
            result = graphAlgorithmsEngine.topologicalSort(params.nodes, params.edges);
            break;
          }
          case "graph_scc": {
            const { graphAlgorithmsEngine } = await import("../../engines/GraphAlgorithmsEngine.js");
            result = graphAlgorithmsEngine.stronglyConnectedComponents(params.nodes, params.edges);
            break;
          }
          case "graph_cpm": {
            const { graphAlgorithmsEngine } = await import("../../engines/GraphAlgorithmsEngine.js");
            result = graphAlgorithmsEngine.criticalPathMethod(params.activities);
            break;
          }

          // ── Surface Intersection & Offset ──
          case "surface_intersect": {
            const { surfaceIntersectionEngine } = await import("../../engines/SurfaceIntersectionEngine.js");
            result = { curves: surfaceIntersectionEngine.intersect(params.surface1, params.surface2, params.options) };
            break;
          }
          case "mesh_offset": {
            const { offsetSurfaceEngine } = await import("../../engines/OffsetSurfaceEngine.js");
            result = offsetSurfaceEngine.offsetMesh(params.mesh, params.distance, params.options);
            break;
          }
          case "mesh_shell": {
            const { offsetSurfaceEngine } = await import("../../engines/OffsetSurfaceEngine.js");
            result = offsetSurfaceEngine.createShell(params.mesh, params.thickness, params.options);
            break;
          }

          // ── B-Spline ──
          case "bspline_curve_evaluate": {
            const { bSplineEngine } = await import("../../engines/BSplineEngine.js");
            result = bSplineEngine.evaluateCurve(params.curve, params.t);
            break;
          }
          case "bspline_surface_evaluate": {
            const { bSplineEngine } = await import("../../engines/BSplineEngine.js");
            result = bSplineEngine.evaluateSurface(params.surface, params.u, params.v);
            break;
          }
          case "bspline_surface_normal": {
            const { bSplineEngine } = await import("../../engines/BSplineEngine.js");
            result = bSplineEngine.evaluateSurfaceNormal(params.surface, params.u, params.v);
            break;
          }

          // ── Construction Geometry ──
          case "construction_offset_plane": {
            const { constructionGeometryEngine } = await import("../../engines/ConstructionGeometryEngine.js");
            result = constructionGeometryEngine.createOffsetPlane(params.basePlane, params.distance);
            break;
          }
          case "construction_plane_3pt": {
            const { constructionGeometryEngine } = await import("../../engines/ConstructionGeometryEngine.js");
            result = constructionGeometryEngine.createPlaneThroughThreePoints(params.p1, params.p2, params.p3);
            break;
          }
          case "construction_axis_2pt": {
            const { constructionGeometryEngine } = await import("../../engines/ConstructionGeometryEngine.js");
            result = constructionGeometryEngine.createAxisThroughTwoPoints(params.p1, params.p2);
            break;
          }
          case "construction_point_3planes": {
            const { constructionGeometryEngine } = await import("../../engines/ConstructionGeometryEngine.js");
            result = constructionGeometryEngine.createPointThroughThreePlanes(params.plane1, params.plane2, params.plane3);
            break;
          }

          // ── Genetic Algorithm ──
          case "ga_optimize": {
            const { geneticAlgorithmEngine } = await import("../../engines/GeneticAlgorithmEngine.js");
            result = geneticAlgorithmEngine.optimize(
              new Function("genes", params.fitnessBody) as (g: number[]) => number,
              params.bounds, params.config,
            );
            break;
          }

          // ── Simulated Annealing ──
          case "sa_optimize": {
            const { simulatedAnnealingEngine } = await import("../../engines/SimulatedAnnealingEngine.js");
            result = simulatedAnnealingEngine.optimize(
              new Function("solution", params.fitnessBody) as (s: number[]) => number,
              params.bounds, params.config,
            );
            break;
          }
          case "sa_optimize_sequence": {
            const { simulatedAnnealingEngine } = await import("../../engines/SimulatedAnnealingEngine.js");
            result = simulatedAnnealingEngine.optimizeSequence(params.positions, params.config);
            break;
          }

          // ── Machine Selection ──
          case "machine_recommend": {
            const { machineSelectionEngine } = await import("../../engines/MachineSelectionEngine.js");
            result = machineSelectionEngine.recommend(params as ValidatedParams);
            break;
          }
          case "machine_compare": {
            const { machineSelectionEngine } = await import("../../engines/MachineSelectionEngine.js");
            result = machineSelectionEngine.compare(params.machine_ids ?? []);
            break;
          }
          case "machine_validate": {
            const { machineSelectionEngine } = await import("../../engines/MachineSelectionEngine.js");
            result = machineSelectionEngine.validate(params.machine_id ?? "", params as ValidatedParams);
            break;
          }

          // ── Tool Selection ──
          case "tool_select_recommend": {
            const { toolSelectionEngine } = await import("../../engines/ToolSelectionEngine.js");
            result = toolSelectionEngine.recommend(params as ValidatedParams);
            break;
          }
          case "tool_select_compare": {
            const { toolSelectionEngine } = await import("../../engines/ToolSelectionEngine.js");
            result = toolSelectionEngine.compare(params.tool_ids ?? [], params as ValidatedParams);
            break;
          }
          case "tool_select_alternatives": {
            const { toolSelectionEngine } = await import("../../engines/ToolSelectionEngine.js");
            result = toolSelectionEngine.alternatives(params.tool_id ?? "", params as ValidatedParams);
            break;
          }

          // ── Tool Crib ──
          case "tool_crib_checkout": {
            const { toolCribEngine } = await import("../../engines/ToolCribEngine.js");
            result = toolCribEngine.checkout(params.tool_id ?? "", params.operator_id ?? "", params.machine_id ?? "", params.job_id ?? "");
            break;
          }
          case "tool_crib_checkin": {
            const { toolCribEngine } = await import("../../engines/ToolCribEngine.js");
            result = toolCribEngine.checkin(params.tool_id ?? "", params.operator_id ?? "", params.usage_min ?? 0, params.condition ?? "good");
            break;
          }
          case "tool_crib_inventory": {
            const { toolCribEngine } = await import("../../engines/ToolCribEngine.js");
            result = toolCribEngine.inventoryReport();
            break;
          }
          case "tool_crib_reorder": {
            const { toolCribEngine } = await import("../../engines/ToolCribEngine.js");
            result = toolCribEngine.reorderRecommendations();
            break;
          }

          // ── Toolholder Dynamics ──
          case "toolholder_frf": {
            const { toolholderDynamicsEngine } = await import("../../engines/ToolholderDynamicsEngine.js");
            result = toolholderDynamicsEngine.analyzeFRF(params as ValidatedParams);
            break;
          }
          case "toolholder_compare": {
            const { toolholderDynamicsEngine } = await import("../../engines/ToolholderDynamicsEngine.js");
            result = toolholderDynamicsEngine.compare(params.holder_a, params.holder_b);
            break;
          }

          // ── Machinability Rating ──
          case "machinability_rate": {
            const { machinabilityRatingEngine } = await import("../../engines/MachinabilityRatingEngine.js");
            result = machinabilityRatingEngine.rate(params as ValidatedParams);
            break;
          }
          case "machinability_compare": {
            const { machinabilityRatingEngine } = await import("../../engines/MachinabilityRatingEngine.js");
            result = machinabilityRatingEngine.compare(params.materials ?? []);
            break;
          }

          // ── Material Equivalence ──
          case "material_equivalent": {
            const { materialEquivalenceEngine } = await import("../../engines/MaterialEquivalenceEngine.js");
            result = materialEquivalenceEngine.findEquivalent(params as ValidatedParams);
            break;
          }
          case "material_equiv_compare": {
            const { materialEquivalenceEngine } = await import("../../engines/MaterialEquivalenceEngine.js");
            result = materialEquivalenceEngine.compare(params.material_a ?? "", params.material_b ?? "");
            break;
          }

          // ── Material Selection ──
          case "material_select_recommend": {
            const { materialSelectionEngine } = await import("../../engines/MaterialSelectionEngine.js");
            result = materialSelectionEngine.recommend(params as ValidatedParams);
            break;
          }
          case "material_select_compare": {
            const { materialSelectionEngine } = await import("../../engines/MaterialSelectionEngine.js");
            result = materialSelectionEngine.compare(params.material_ids ?? []);
            break;
          }
          case "material_machinability": {
            const { materialSelectionEngine } = await import("../../engines/MaterialSelectionEngine.js");
            result = materialSelectionEngine.machinability(params.material_id ?? "");
            break;
          }

          // ── Tensile to Machinability ──
          case "tensile_to_machinability": {
            const { tensileToMachinabilityEngine } = await import("../../engines/TensileToMachinabilityEngine.js");
            result = tensileToMachinabilityEngine.convert(params as ValidatedParams);
            break;
          }

          // ── Heat Treatment Response ──
          case "heat_treat_predict": {
            const { heatTreatmentResponseEngine } = await import("../../engines/HeatTreatmentResponseEngine.js");
            result = heatTreatmentResponseEngine.predict(params as ValidatedParams);
            break;
          }
          case "heat_treat_temper_curve": {
            const { heatTreatmentResponseEngine } = await import("../../engines/HeatTreatmentResponseEngine.js");
            result = heatTreatmentResponseEngine.temperCurve(params.carbon_pct ?? 0.4, params.start_HRC ?? 60);
            break;
          }
          case "heat_treat_recommend": {
            const { heatTreatmentResponseEngine } = await import("../../engines/HeatTreatmentResponseEngine.js");
            result = heatTreatmentResponseEngine.recommend(params.material ?? "", params.target_hardness_HRC ?? 50, params.section_mm ?? 25);
            break;
          }

          // ── Passivation ──
          case "passivation_calc": {
            const { passivationEngine } = await import("../../engines/PassivationEngine.js");
            result = passivationEngine.calculate(params as ValidatedParams);
            break;
          }

          // ── Plating Allowance ──
          case "plating_allowance": {
            const { platingAllowanceEngine } = await import("../../engines/PlatingAllowanceEngine.js");
            result = platingAllowanceEngine.calculateAllowance(params as ValidatedParams);
            break;
          }
          case "plating_tolerance": {
            const { platingAllowanceEngine } = await import("../../engines/PlatingAllowanceEngine.js");
            result = platingAllowanceEngine.calculateTolerance(params as ValidatedParams);
            break;
          }
          case "plating_recommend": {
            const { platingAllowanceEngine } = await import("../../engines/PlatingAllowanceEngine.js");
            result = platingAllowanceEngine.recommend(params.substrate ?? "", params.application ?? "wear");
            break;
          }

          // ── Shot Peening ──
          case "shot_peen_calc": {
            const { shotPeeningEngine } = await import("../../engines/ShotPeeningEngine.js");
            result = shotPeeningEngine.calculate(params as ValidatedParams);
            break;
          }

          // ── Recast Layer ──
          case "recast_layer_predict": {
            const { recastLayerEngine } = await import("../../engines/RecastLayerEngine.js");
            result = recastLayerEngine.predict(params as ValidatedParams);
            break;
          }
          case "recast_layer_validate": {
            const { recastLayerEngine } = await import("../../engines/RecastLayerEngine.js");
            result = recastLayerEngine.validate(params as ValidatedParams);
            break;
          }

          // ── White Layer Detection ──
          case "white_layer_predict": {
            const { whiteLayerDetectionEngine } = await import("../../engines/WhiteLayerDetectionEngine.js");
            result = whiteLayerDetectionEngine.predict(params as ValidatedParams);
            break;
          }
          case "white_layer_validate": {
            const { whiteLayerDetectionEngine } = await import("../../engines/WhiteLayerDetectionEngine.js");
            result = whiteLayerDetectionEngine.validate(params as ValidatedParams);
            break;
          }

          // ── Masking Calculator ──
          case "masking_calc": {
            const { maskingCalculatorEngine } = await import("../../engines/MaskingCalculatorEngine.js");
            result = maskingCalculatorEngine.calculate(params as ValidatedParams);
            break;
          }

          // ── Process Plan ──
          case "process_plan_generate": {
            const { processPlanEngine } = await import("../../engines/ProcessPlanEngine.js");
            result = processPlanEngine.generate(params as ValidatedParams);
            break;
          }
          case "process_plan_optimize": {
            const { processPlanEngine } = await import("../../engines/ProcessPlanEngine.js");
            result = processPlanEngine.optimize(params.plan);
            break;
          }
          case "process_plan_estimate_time": {
            const { processPlanEngine } = await import("../../engines/ProcessPlanEngine.js");
            result = processPlanEngine.estimateTime(params.plan, params.setup_time_min ?? 20);
            break;
          }
          case "process_plan_validate": {
            const { processPlanEngine } = await import("../../engines/ProcessPlanEngine.js");
            result = processPlanEngine.validate(params.plan);
            break;
          }

          // ── Gear Hobbing ──
          case "hobbing_calc": {
            const { gearHobbingEngine } = await import("../../engines/GearHobbingEngine.js");
            result = gearHobbingEngine.calculate(params as ValidatedParams);
            break;
          }
          case "hobbing_shift": {
            const { gearHobbingEngine } = await import("../../engines/GearHobbingEngine.js");
            result = gearHobbingEngine.shiftPlan(params as GearHobbingInput, params.parts_per_shift ?? 100);
            break;
          }

          // ── Cryogenic Treatment ──
          case "cryo_predict": {
            const { cryogenicTreatmentEngine } = await import("../../engines/CryogenicTreatmentEngine.js");
            result = cryogenicTreatmentEngine.predict(params as ValidatedParams);
            break;
          }
          case "cryo_recommend": {
            const { cryogenicTreatmentEngine } = await import("../../engines/CryogenicTreatmentEngine.js");
            result = cryogenicTreatmentEngine.recommend(params.material_type, params.retained_austenite_pct ?? 10);
            break;
          }
          case "cryo_roi": {
            const { cryogenicTreatmentEngine } = await import("../../engines/CryogenicTreatmentEngine.js");
            result = cryogenicTreatmentEngine.calculateROI(params as CryoTreatmentInput, params.tool_cost_usd ?? 50, params.tools_per_year ?? 100);
            break;
          }

          // ── Hardness Conversion (ASTM E140) ──
          case "hardness_convert": {
            const { hardnessConversionEngine } = await import("../../engines/HardnessConversionEngine.js");
            result = hardnessConversionEngine.convert({ value: params.value, from_scale: params.from_scale, to_scale: params.to_scale });
            break;
          }
          case "hardness_batch": {
            const { hardnessConversionEngine } = await import("../../engines/HardnessConversionEngine.js");
            result = hardnessConversionEngine.batchConvert(params.values, params.from_scale, params.to_scale);
            break;
          }

          // ── Bend Allowance (Sheet Metal) ──
          case "bend_allowance_calc": {
            const { bendAllowanceEngine } = await import("../../engines/BendAllowanceEngine.js");
            result = bendAllowanceEngine.calculate(params as ValidatedParams);
            break;
          }

          // ── Anodize Allowance ──
          case "anodize_allowance": {
            const { anodizeAllowanceEngine } = await import("../../engines/AnodizeAllowanceEngine.js");
            result = anodizeAllowanceEngine.calculate(params as ValidatedParams);
            break;
          }

          // ── Clamping Simulation (SAFETY CRITICAL) ──
          case "clamp_simulate": {
            const { clampingSimEngine } = await import("../../engines/ClampingSimEngine.js");
            result = clampingSimEngine.simulate(params as ValidatedParams);
            break;
          }
          case "clamp_validate": {
            const { clampingSimEngine } = await import("../../engines/ClampingSimEngine.js");
            result = clampingSimEngine.validate(params as ValidatedParams);
            break;
          }
          case "clamp_optimize": {
            const { clampingSimEngine } = await import("../../engines/ClampingSimEngine.js");
            result = clampingSimEngine.optimize(params as ValidatedParams);
            break;
          }

          // ── Damping Optimization ──
          case "damping_optimize": {
            const { dampingOptimizationEngine } = await import("../../engines/DampingOptimizationEngine.js");
            result = dampingOptimizationEngine.optimize(params as ValidatedParams);
            break;
          }

          // ── Cost Estimation ──
          case "cost_estimate": {
            const { costEstimationEngine } = await import("../../engines/CostEstimationEngine.js");
            result = costEstimationEngine.estimate(params as ValidatedParams);
            break;
          }
          case "cost_compare_materials": {
            const { costEstimationEngine } = await import("../../engines/CostEstimationEngine.js");
            result = costEstimationEngine.compareMaterials(params.materials, params as ValidatedParams);
            break;
          }

          // ── Thread Calculation ──
          case "thread_parse": {
            const { threadEngine } = await import("../../engines/ThreadCalculationEngine.js");
            result = threadEngine.parseThreadDesignation(params.designation ?? "");
            break;
          }
          case "thread_tap_drill": {
            const { threadEngine } = await import("../../engines/ThreadCalculationEngine.js");
            result = threadEngine.calculateTapDrill(params.designation ?? "", params.engagement_pct ?? 75);
            break;
          }
          case "thread_mill_params": {
            const { threadEngine } = await import("../../engines/ThreadCalculationEngine.js");
            result = threadEngine.calculateThreadMillParams(
              params.designation ?? "", params.tool_diameter ?? 6, params.material ?? "steel", params.single_point ?? true
            );
            break;
          }
          case "thread_stripping": {
            const { threadEngine } = await import("../../engines/ThreadCalculationEngine.js");
            result = threadEngine.calculateStrippingStrength(
              params.designation ?? "", params.engagement_length ?? 10, params.tensile_strength_MPa ?? 400
            );
            break;
          }

          // ── Tool Breakage Prediction ──
          case "tool_breakage_predict": {
            const { toolBreakageEngine } = await import("../../engines/ToolBreakageEngine.js");
            result = toolBreakageEngine.predictBreakage(
              params.tool, params.forces, params.conditions, params.material ?? "CARBIDE", params.options
            );
            break;
          }
          case "tool_stress_analyze": {
            const { toolBreakageEngine } = await import("../../engines/ToolBreakageEngine.js");
            result = toolBreakageEngine.calculateToolStress(
              params.tool, params.forces, params.material ?? "CARBIDE", params.is_interrupted ?? false
            );
            break;
          }
          case "tool_safe_limits": {
            const { toolBreakageEngine } = await import("../../engines/ToolBreakageEngine.js");
            result = toolBreakageEngine.getSafeCuttingLimits(
              params.tool, params.material ?? "CARBIDE", params.workpiece_material ?? "STEEL"
            );
            break;
          }

          // ── Spindle Protection ──
          case "spindle_torque_check": {
            const { spindleProtectionEngine } = await import("../../engines/SpindleProtectionEngine.js");
            result = spindleProtectionEngine.checkSpindleTorque(params.spindle, params.requirements, params.state);
            break;
          }
          case "spindle_power_check": {
            const { spindleProtectionEngine } = await import("../../engines/SpindleProtectionEngine.js");
            result = spindleProtectionEngine.checkSpindlePower(params.spindle, params.requirements, params.state);
            break;
          }
          case "spindle_safe_envelope": {
            const { spindleProtectionEngine } = await import("../../engines/SpindleProtectionEngine.js");
            result = spindleProtectionEngine.getSpindleSafeEnvelope(params.spindle, params.requirements, params.state);
            break;
          }

          // ── Coolant Validation ──
          case "coolant_validate": {
            const { coolantValidationEngine } = await import("../../engines/CoolantValidationEngine.js");
            result = coolantValidationEngine.validateCoolant(params.system, params.operation_params, params.tool_spec);
            break;
          }
          case "coolant_flow_check": {
            const { coolantValidationEngine } = await import("../../engines/CoolantValidationEngine.js");
            result = coolantValidationEngine.validateCoolantFlow(params.system, params.operation_params);
            break;
          }
          case "coolant_chip_evacuation": {
            const { coolantValidationEngine } = await import("../../engines/CoolantValidationEngine.js");
            result = coolantValidationEngine.calculateChipEvacuation(params.operation_params, params.system);
            break;
          }

          // ── Adaptive Tessellation ──
          case "tessellation_calculate_segments": {
            const { adaptiveTessellationEngine } = await import("../../engines/AdaptiveTessellationEngine.js");
            result = { segments: adaptiveTessellationEngine.calculateSegments(params.radius, params.arcLength, params.options) };
            break;
          }
          case "tessellation_subdivide": {
            const { adaptiveTessellationEngine } = await import("../../engines/AdaptiveTessellationEngine.js");
            result = adaptiveTessellationEngine.subdivide(params.mesh);
            break;
          }

          // ── Adaptive Clearing ──
          case "adaptive_trochoidal": {
            const { adaptiveClearingEngine } = await import("../../engines/AdaptiveClearingEngine.js");
            result = adaptiveClearingEngine.generateTrochoidal(params.centerline, params.params);
            break;
          }
          case "adaptive_optimize_trochoidal": {
            const { adaptiveClearingEngine } = await import("../../engines/AdaptiveClearingEngine.js");
            result = adaptiveClearingEngine.optimizeTrochoidal(params.slotWidth, params.toolDiameter, params.targetEngagement);
            break;
          }
          case "adaptive_feedrate": {
            const { adaptiveClearingEngine } = await import("../../engines/AdaptiveClearingEngine.js");
            result = { feedrate: adaptiveClearingEngine.calculateFeedrate(params.baseFeedrate, params.actualEngagement, params.targetEngagement) };
            break;
          }

          // ── Filleting & Chamfer ──
          case "fillet_edges": {
            const { filletingEngine } = await import("../../engines/FilletingEngine.js");
            result = filletingEngine.filletEdges(params.solid, params.edgeIndices, params.radius);
            break;
          }
          case "fillet_variable": {
            const { filletingEngine } = await import("../../engines/FilletingEngine.js");
            result = filletingEngine.variableRadiusFillet(params.solid, params.edgeIdx, params.radiusStart, params.radiusEnd);
            break;
          }
          case "chamfer_edges": {
            const { filletingEngine } = await import("../../engines/FilletingEngine.js");
            result = filletingEngine.chamferEdges(params.solid, params.edgeIndices, params.distance1, params.distance2);
            break;
          }
          case "fillet_preview": {
            const { filletingEngine } = await import("../../engines/FilletingEngine.js");
            result = filletingEngine.previewFillet(params.solid, params.edgeIndices, params.radius);
            break;
          }

          // ── Mesh Decimation ──
          case "mesh_decimate": {
            const { meshDecimationEngine } = await import("../../engines/MeshDecimationEngine.js");
            result = meshDecimationEngine.decimate(params.mesh, params.targetTriangles);
            break;
          }

          // ── Spindle Harmonics Quality ──
          case "chip_thickness_analyze": {
            const { advancedChipThicknessEngine } = await import("../../engines/AdvancedChipThicknessEngine.js");
            result = advancedChipThicknessEngine.analyze({
              feed_per_tooth: params.feed_per_tooth ?? params.fz,
              radial_depth: params.radial_depth ?? params.ae,
              axial_depth: params.axial_depth ?? params.ap,
              tool_diameter: params.tool_diameter ?? params.Dc,
              number_of_flutes: params.number_of_flutes ?? params.number_of_teeth,
              entering_angle_deg: params.entering_angle_deg ?? params.lead_angle,
              helix_angle_deg: params.helix_angle_deg,
              edge_radius_mm: params.edge_radius_mm,
              max_allowed_chip: params.max_allowed_chip,
            });
            break;
          }
          case "ball_nose_chip": {
            const { advancedChipThicknessEngine } = await import("../../engines/AdvancedChipThicknessEngine.js");
            result = advancedChipThicknessEngine.ballNoseChipThickness(
              params.feed_per_tooth ?? params.fz,
              params.radial_depth ?? params.ae,
              params.axial_depth ?? params.ap,
              params.ball_radius ?? (params.tool_diameter ?? 0) / 2,
            );
            break;
          }
          case "round_insert_chip": {
            const { advancedChipThicknessEngine } = await import("../../engines/AdvancedChipThicknessEngine.js");
            result = advancedChipThicknessEngine.roundInsertChipThickness(
              params.feed_per_tooth ?? params.fz,
              params.axial_depth ?? params.ap,
              params.insert_diameter,
            );
            break;
          }
          case "trochoidal_feed_adjust": {
            const { advancedChipThicknessEngine } = await import("../../engines/AdvancedChipThicknessEngine.js");
            result = advancedChipThicknessEngine.trochoidalVariableFeed(
              params.base_feed,
              params.instantaneous_width,
              params.max_width,
            );
            break;
          }
          case "chip_thinning_lookup": {
            const { advancedChipThicknessEngine } = await import("../../engines/AdvancedChipThicknessEngine.js");
            const ae = params.radial_depth ?? params.ae;
            const Dc = params.tool_diameter ?? params.Dc;
            result = {
              empirical_factor: advancedChipThicknessEngine.chipThinningFactorLookup(ae, Dc),
              theoretical_factor: advancedChipThicknessEngine.chipThinningFactorTheoretical(ae, Dc),
              woc_ratio: ae / Dc,
            };
            break;
          }

          // ── Engagement Geometry ──
          case "corner_engagement_analyze": {
            const { engagementGeometryEngine } = await import("../../engines/EngagementGeometryEngine.js");
            const turnRad = (params.corner_angle_deg ?? 90) * Math.PI / 180;
            result = engagementGeometryEngine.internalCornerSpike(
              params.radial_depth ?? params.ae,
              params.tool_diameter ?? params.Dc,
              turnRad,
              params.corner_radius ?? 0,
            );
            break;
          }
          case "corner_feed_adjust": {
            const { engagementGeometryEngine } = await import("../../engines/EngagementGeometryEngine.js");
            const cTurnRad = (params.corner_angle_deg ?? 90) * Math.PI / 180;
            result = engagementGeometryEngine.cornerFeedAdjustment(
              params.nominal_feed,
              params.radial_depth ?? params.ae,
              params.tool_diameter ?? params.Dc,
              cTurnRad,
              params.corner_radius ?? 0,
            );
            break;
          }
          case "curved_boundary_engagement": {
            const { engagementGeometryEngine } = await import("../../engines/EngagementGeometryEngine.js");
            result = engagementGeometryEngine.curvedBoundaryEngagement(
              params.radial_depth ?? params.ae,
              params.tool_diameter ?? params.Dc,
              params.workpiece_radius ?? params.boundary_curvature,
            );
            break;
          }
          case "trochoidal_engagement_profile": {
            const { engagementGeometryEngine } = await import("../../engines/EngagementGeometryEngine.js");
            result = engagementGeometryEngine.trochoidalEngagementProfile(
              params.trochoidal_radius,
              params.stepover ?? params.radial_depth ?? params.ae,
              (params.tool_diameter ?? params.Dc) / 2,
              params.steps ?? 36,
            );
            break;
          }
          case "island_approach": {
            const { engagementGeometryEngine } = await import("../../engines/EngagementGeometryEngine.js");
            result = engagementGeometryEngine.islandApproach(
              params.radial_depth ?? params.ae,
              params.tool_diameter ?? params.Dc,
              params.distance_to_island,
              params.island_radius,
            );
            break;
          }
          case "moat_calculate": {
            const { engagementGeometryEngine } = await import("../../engines/EngagementGeometryEngine.js");
            const targetEngRad = ((params.target_engagement_deg ?? 40) * Math.PI) / 180;
            result = engagementGeometryEngine.calculateMoat(
              params.tool_diameter ?? params.Dc,
              targetEngRad,
              params.island_radius,
            );
            break;
          }
          case "engagement_validate": {
            const { engagementGeometryEngine } = await import("../../engines/EngagementGeometryEngine.js");
            result = engagementGeometryEngine.validateEngagement(
              params.engagement_angle_deg,
            );
            break;
          }
          case "optimal_stepover": {
            const { engagementGeometryEngine } = await import("../../engines/EngagementGeometryEngine.js");
            result = engagementGeometryEngine.findOptimalStepover(
              params.tool_diameter ?? params.Dc,
              {
                target_engagement_deg: params.target_engagement_deg,
                prioritize_mrr: params.prioritize_mrr,
                prioritize_tool_life: params.prioritize_tool_life,
              },
            );
            break;
          }

          // ── Feed Rate Optimization ──
          case "feed_optimize": {
            const { feedRateOptimizationEngine } = await import("../../engines/FeedRateOptimizationEngine.js");
            result = feedRateOptimizationEngine.optimize({
              base_feed_per_tooth: params.feed_per_tooth ?? params.fz,
              tool_diameter: params.tool_diameter ?? params.Dc,
              number_of_flutes: params.number_of_flutes ?? params.number_of_teeth ?? 4,
              spindle_rpm: params.spindle_rpm ?? params.rpm,
              radial_depth: params.radial_depth ?? params.ae,
              axial_depth: params.axial_depth ?? params.ap,
              material: params.material,
              operation: params.operation,
              spindle_power_kw: params.spindle_power_kw,
              specific_cutting_force: params.specific_cutting_force ?? params.kc1_1,
              max_acceleration_mm_s2: params.max_acceleration,
              target_chip_thickness: params.target_chip_thickness,
            });
            break;
          }
          case "corner_feed": {
            const { feedRateOptimizationEngine } = await import("../../engines/FeedRateOptimizationEngine.js");
            result = feedRateOptimizationEngine.cornerFeed({
              straight_feed: params.straight_feed ?? params.feed_rate,
              arc_radius: params.arc_radius,
              tool_diameter: params.tool_diameter ?? params.Dc,
              is_internal: params.is_internal ?? true,
            });
            break;
          }
          case "constant_chip_load": {
            const { feedRateOptimizationEngine } = await import("../../engines/FeedRateOptimizationEngine.js");
            result = feedRateOptimizationEngine.constantChipLoad({
              target_chip_mm: params.target_chip_mm ?? params.target_chip,
              tool_diameter: params.tool_diameter ?? params.Dc,
              number_of_flutes: params.number_of_flutes ?? params.number_of_teeth ?? 4,
              spindle_rpm: params.spindle_rpm ?? params.rpm,
              engagement_profile: params.engagement_profile ?? [],
            });
            break;
          }

          // ── Entry/Exit Strategy ──
          case "entry_strategy": {
            const { entryExitStrategyEngine } = await import("../../engines/EntryExitStrategyEngine.js");
            result = entryExitStrategyEngine.selectEntry({
              tool_diameter: params.tool_diameter ?? params.Dc,
              pocket_width: params.pocket_width,
              pocket_depth: params.pocket_depth ?? params.depth,
              material: params.material,
              center_cutting: params.center_cutting,
              has_pre_drill: params.has_pre_drill,
              pre_drill_diameter: params.pre_drill_diameter,
              max_helix_angle_deg: params.max_helix_angle_deg,
              max_ramp_angle_deg: params.max_ramp_angle_deg,
              feed_per_tooth: params.feed_per_tooth ?? params.fz,
            });
            break;
          }
          case "exit_strategy": {
            const { entryExitStrategyEngine } = await import("../../engines/EntryExitStrategyEngine.js");
            result = entryExitStrategyEngine.selectExit(
              params.tool_diameter ?? params.Dc,
              params.operation,
            );
            break;
          }
          case "validate_entry": {
            const { entryExitStrategyEngine } = await import("../../engines/EntryExitStrategyEngine.js");
            result = entryExitStrategyEngine.validateEntry(
              params.method,
              params.tool_diameter ?? params.Dc,
              params.pocket_width,
              params.material,
            );
            break;
          }

          // ── Z-Level Optimization ──
          case "z_level_optimize": {
            const { zLevelOptimizationEngine } = await import("../../engines/ZLevelOptimizationEngine.js");
            result = zLevelOptimizationEngine.calculateZLevels({
              total_depth: params.total_depth ?? params.depth,
              tool_diameter: params.tool_diameter ?? params.Dc,
              tool_flute_length: params.tool_flute_length ?? params.flute_length,
              material: params.material,
              operation: params.operation,
              stock_to_leave: params.stock_to_leave,
              stability_limited_ap: params.stability_limited_ap,
              even_levels: params.even_levels,
            });
            break;
          }
          case "rest_machining_levels": {
            const { zLevelOptimizationEngine } = await import("../../engines/ZLevelOptimizationEngine.js");
            result = zLevelOptimizationEngine.restMachiningLevels({
              previous_tool_diameter: params.previous_tool_diameter ?? params.prev_Dc,
              current_tool_diameter: params.current_tool_diameter ?? params.tool_diameter ?? params.Dc,
              total_depth: params.total_depth ?? params.depth,
              corner_radius_prev: params.corner_radius_prev,
              material: params.material,
            });
            break;
          }

          // ── Toolpath Linking ──
          case "toolpath_link_optimize": {
            const { toolpathLinkingEngine } = await import("../../engines/ToolpathLinkingEngine.js");
            result = toolpathLinkingEngine.optimizeLinking(
              params.segments ?? [],
              {
                clearance_height: params.clearance_height ?? 50,
                retract_height: params.retract_height ?? 5,
                stay_down_max_distance: params.stay_down_max_distance,
                rapid_feed: params.rapid_feed,
                cutting_feed: params.cutting_feed,
                allow_stay_down: params.allow_stay_down,
                link_method: params.link_method,
              },
            );
            break;
          }
          case "toolpath_link_time": {
            const { toolpathLinkingEngine } = await import("../../engines/ToolpathLinkingEngine.js");
            result = toolpathLinkingEngine.estimateTimeSavings(
              params.segments ?? [],
              {
                clearance_height: params.clearance_height ?? 50,
                retract_height: params.retract_height ?? 5,
                rapid_feed: params.rapid_feed,
                cutting_feed: params.cutting_feed,
              },
            );
            break;
          }

          // ── Topology (Homology / Betti Numbers) ──
          case "topology_homology": {
            const { topologyEngine } = await import("../../engines/TopologyEngine.js");
            result = topologyEngine.computeHomology(topologyEngine.createSimplicialComplex(params.mesh));
            break;
          }
          case "topology_persistence": {
            const { topologyEngine } = await import("../../engines/TopologyEngine.js");
            result = topologyEngine.computePersistence(params.points, { maxEpsilon: params.max_epsilon, steps: params.steps });
            break;
          }
          case "topology_validate_features": {
            const { topologyEngine } = await import("../../engines/TopologyEngine.js");
            result = topologyEngine.validateFeatures(params.mesh, { components: params.components, holes: params.holes, voids: params.voids });
            break;
          }

          // ── ACO Sequencer ──
          case "aco_sequence_features": {
            const { acoSequencerEngine } = await import("../../engines/AcoSequencerEngine.js");
            result = acoSequencerEngine.optimizeSequence(params.features, { numAnts: params.num_ants, iterations: params.iterations, alpha: params.alpha, beta: params.beta });
            break;
          }
          case "aco_sequence_holes": {
            const { acoSequencerEngine } = await import("../../engines/AcoSequencerEngine.js");
            result = acoSequencerEngine.optimizeHoleSequence(params.holes, { numAnts: params.num_ants, iterations: params.iterations });
            break;
          }
          case "aco_sequence_with_tools": {
            const { acoSequencerEngine } = await import("../../engines/AcoSequencerEngine.js");
            result = acoSequencerEngine.optimizeWithToolChanges(params.features, { numAnts: params.num_ants, iterations: params.iterations, toolChangePenalty: params.tool_change_penalty });
            break;
          }

          // ── Solid Editing ──
          case "solid_press_pull": {
            const { solidEditingEngine } = await import("../../engines/SolidEditingEngine.js");
            result = solidEditingEngine.pressPull(params.face, params.distance);
            break;
          }
          case "solid_scale": {
            const { solidEditingEngine } = await import("../../engines/SolidEditingEngine.js");
            result = solidEditingEngine.scaleBody(params.body, params.point, params.factors);
            break;
          }
          case "solid_move": {
            const { solidEditingEngine } = await import("../../engines/SolidEditingEngine.js");
            result = solidEditingEngine.moveBody(params.body, params.transform, params.copy ?? false);
            break;
          }

          // ── Surface Reconstruction ──
          case "surface_reconstruct": {
            const { surfaceReconstructionEngine } = await import("../../engines/SurfaceReconstructionEngine.js");
            result = surfaceReconstructionEngine.ballPivoting(params.points, { radius: params.radius, maxIterations: params.max_iterations });
            break;
          }

          // ── Swarm Algorithms (PSO + ACO) ──
          case "pso_optimize": {
            const { swarmAlgorithmsEngine } = await import("../../engines/SwarmAlgorithmsEngine.js");
            const fitFn = new Function("pos", params.fitness_body ?? "return -(pos[0]**2+pos[1]**2)") as (pos: number[]) => number;
            result = swarmAlgorithmsEngine.psoOptimize(fitFn, params.bounds, {
              swarmSize: params.swarm_size, maxIterations: params.max_iterations,
              w: params.w, c1: params.c1, c2: params.c2, wDecay: params.w_decay,
            });
            break;
          }
          case "aco_optimize": {
            const { swarmAlgorithmsEngine } = await import("../../engines/SwarmAlgorithmsEngine.js");
            result = swarmAlgorithmsEngine.acoOptimize(params.cost_matrix, {
              numAnts: params.num_ants, maxIterations: params.max_iterations,
              alpha: params.alpha, beta: params.beta, evaporation: params.evaporation,
            });
            break;
          }

          // ── Voxel Stock Simulation ──
          case "voxel_init": {
            const { voxelStockEngine } = await import("../../engines/VoxelStockEngine.js");
            const { minX, minY, minZ, maxX, maxY, maxZ } = params;
            result = voxelStockEngine.initializeFromBox(minX, minY, minZ, maxX, maxY, maxZ, params.resolution).result;
            break;
          }
          case "voxel_remove_path": {
            const { voxelStockEngine } = await import("../../engines/VoxelStockEngine.js");
            const { grid } = voxelStockEngine.initializeFromBox(
              params.stock_min_x, params.stock_min_y, params.stock_min_z,
              params.stock_max_x, params.stock_max_y, params.stock_max_z,
              params.resolution,
            );
            result = voxelStockEngine.removeAlongPath(grid, params.path, params.tool, params.step_size);
            break;
          }

          case "sketch_apply_constraint": {
            const { sketchConstraintEngine } = await import("../../engines/SketchConstraintEngine.js");
            const ct = params.constraint_type;
            if (ct === "horizontal_vertical") result = sketchConstraintEngine.applyHorizontalVertical(params.line);
            else if (ct === "coincident") result = sketchConstraintEngine.applyCoincident(params.point, params.target);
            else if (ct === "equal") result = sketchConstraintEngine.applyEqual(params.line1, params.line2);
            else if (ct === "parallel") result = sketchConstraintEngine.applyParallel(params.line1, params.line2);
            else if (ct === "perpendicular") result = sketchConstraintEngine.applyPerpendicular(params.line1, params.line2);
            else if (ct === "midpoint") result = sketchConstraintEngine.applyMidpoint(params.point, params.line);
            else if (ct === "concentric") result = sketchConstraintEngine.applyConcentric(params.circle1, params.circle2);
            else if (ct === "tangent") result = sketchConstraintEngine.makeCirclesTangent(params.circle1, params.circle2);
            else if (ct === "fix") result = sketchConstraintEngine.applyFix(params.entity);
            else result = { error: `Unknown constraint type: ${ct}` };
            break;
          }

          case "sketch_geometry": {
            const { sketchConstraintEngine } = await import("../../engines/SketchConstraintEngine.js");
            const op = params.operation;
            if (op === "project_to_line") result = sketchConstraintEngine.projectPointToLine(params.point, params.line);
            else if (op === "project_to_infinite_line") result = sketchConstraintEngine.projectPointToInfiniteLine(params.point, params.line);
            else if (op === "line_intersection") result = sketchConstraintEngine.lineLineIntersection(params.line1, params.line2);
            else if (op === "mirror") result = sketchConstraintEngine.mirrorPoint(params.point, params.mirror_line);
            else if (op === "line_length") result = { length: sketchConstraintEngine.lineLength(params.line) };
            else result = { error: `Unknown geometry operation: ${op}` };
            break;
          }

          case "swarm_neural_optimize": {
            const { swarmNeuralHybridEngine } = await import("../../engines/SwarmNeuralHybridEngine.js");
            const objFn = new Function("x", params.objective_body) as (x: number[]) => number;
            result = swarmNeuralHybridEngine.optimize(objFn, params.bounds, params.config ?? {});
            break;
          }

          case "xai_lime": {
            const { xaiEngine } = await import("../../engines/XAIEngine.js");
            const limePredictFn = new Function("x", params.predict_body) as (x: number[]) => number;
            result = xaiEngine.limeExplain(limePredictFn, params.instance, params.num_samples, params.num_features);
            break;
          }

          case "xai_shap": {
            const { xaiEngine } = await import("../../engines/XAIEngine.js");
            const shapPredictFn = new Function("x", params.predict_body) as (x: number[]) => number;
            result = xaiEngine.shapExplain(shapPredictFn, params.instance, params.background, params.num_samples);
            break;
          }

          case "xai_permutation_importance": {
            const { xaiEngine } = await import("../../engines/XAIEngine.js");
            const piFn = new Function("x", params.predict_body) as (x: number[]) => number;
            result = xaiEngine.permutationImportance(piFn, params.X, params.y, params.num_repeats);
            break;
          }

          case "oee_calculate": {
            const { oeeCalculatorEngine } = await import("../../engines/OEECalculatorEngine.js");
            result = oeeCalculatorEngine.calculate(params as ValidatedParams);
            break;
          }

          case "tolerance_stack": {
            const { toleranceStackEngine } = await import("../../engines/ToleranceStackEngine.js");
            if (params.mode === "optimize") {
              result = toleranceStackEngine.optimize(params.dimensions, params.target_min_gap);
            } else if (params.mode === "rss") {
              result = toleranceStackEngine.rss(params.dimensions, params.min_gap);
            } else {
              result = toleranceStackEngine.worstCase(params.dimensions, params.min_gap);
            }
            break;
          }

          case "bottleneck_identify": {
            const { bottleneckIdentificationEngine } = await import("../../engines/BottleneckIdentificationEngine.js");
            result = bottleneckIdentificationEngine.identify(params as ValidatedParams);
            break;
          }

          case "nesting_optimize": {
            const { nestingEngine } = await import("../../engines/NestingEngine.js");
            if (params.compare_stocks) {
              result = nestingEngine.compareStock(params.parts, params.stocks);
            } else {
              result = nestingEngine.nest(params.parts, params.stock, params.kerf_mm);
            }
            break;
          }

          case "doe_analyze": {
            const { analyzeFactorial } = await import("../../engines/DOEAnalysisEngine.js");
            result = analyzeFactorial(params as ValidatedParams);
            break;
          }

          case "waterjet_params": {
            const { waterjetCuttingEngine } = await import("../../engines/WaterjetCuttingEngine.js");
            if (params.list === "materials") {
              result = waterjetCuttingEngine.listMaterials();
            } else if (params.list === "abrasives") {
              result = waterjetCuttingEngine.listAbrasives();
            } else if (params.list === "quality") {
              result = waterjetCuttingEngine.listQualityLevels();
            } else {
              result = waterjetCuttingEngine.calculateParams(params as ValidatedParams);
            }
            break;
          }

          case "shot_peening": {
            const { shotPeeningEngine } = await import("../../engines/ShotPeeningEngine.js");
            result = shotPeeningEngine.calculate(params as ValidatedParams);
            break;
          }

          case "troubleshoot": {
            const { troubleshootingEngine } = await import("../../engines/TroubleshootingEngine.js");
            if (params.mode === "root_cause") {
              result = troubleshootingEngine.rootCause(params as ValidatedParams);
            } else if (params.mode === "corrective") {
              result = troubleshootingEngine.correctiveActions(params as ValidatedParams);
            } else {
              result = troubleshootingEngine.diagnose(params as ValidatedParams);
            }
            break;
          }

          case "time_series_smooth": {
            const { timeSeriesEngine } = await import("../../engines/TimeSeriesEngine.js");
            const method = params.method ?? "ses";
            if (method === "holt") {
              result = timeSeriesEngine.holtSmoothing(params.data, params.alpha, params.beta);
            } else if (method === "holt_winters") {
              result = timeSeriesEngine.holtWinters(params.data, params.config ?? {});
            } else {
              result = { smoothed: timeSeriesEngine.simpleExponentialSmoothing(params.data, params.alpha) };
            }
            break;
          }

          case "time_series_seasonality": {
            const { timeSeriesEngine } = await import("../../engines/TimeSeriesEngine.js");
            result = timeSeriesEngine.detectSeasonality(params.data, params.max_period);
            break;
          }

          case "time_series_decompose": {
            const { timeSeriesEngine } = await import("../../engines/TimeSeriesEngine.js");
            result = timeSeriesEngine.decompose(params.data, params.period, params.multiplicative ?? false);
            break;
          }

          case "time_series_forecast": {
            const { timeSeriesEngine } = await import("../../engines/TimeSeriesEngine.js");
            const fMethod = params.method ?? "holt";
            if (fMethod === "ses") {
              result = { forecasts: timeSeriesEngine.forecastSES(params.data, params.horizon, params.alpha) };
            } else {
              result = { forecasts: timeSeriesEngine.forecastHolt(params.data, params.horizon, params.alpha, params.beta) };
            }
            break;
          }

          case "cluster_kmedoids": {
            const { clusteringEngine } = await import("../../engines/ClusteringEngine.js");
            result = clusteringEngine.kMedoids(params.data, params.k, undefined, params.max_iter);
            break;
          }

          case "cluster_meanshift": {
            const { clusteringEngine } = await import("../../engines/ClusteringEngine.js");
            result = clusteringEngine.meanShift(params.data, params.bandwidth, params.max_iter);
            break;
          }

          case "cluster_silhouette": {
            const { clusteringEngine } = await import("../../engines/ClusteringEngine.js");
            result = clusteringEngine.silhouetteScore(params.data, params.labels);
            break;
          }

          case "spc_cpk": {
            const { leanSixSigmaEngine } = await import("../../engines/LeanSixSigmaEngine.js");
            result = leanSixSigmaEngine.calculateCpk(params.USL, params.LSL, params.mean, params.sigma);
            break;
          }

          case "spc_xbar_r_chart": {
            const { leanSixSigmaEngine } = await import("../../engines/LeanSixSigmaEngine.js");
            result = leanSixSigmaEngine.xBarRChart(params.subgroups);
            break;
          }

          case "spc_imr_chart": {
            const { leanSixSigmaEngine } = await import("../../engines/LeanSixSigmaEngine.js");
            result = leanSixSigmaEngine.iMRChart(params.individuals);
            break;
          }

          case "thermal_expansion": {
            const { thermalExpansionEngine } = await import("../../engines/ThermalExpansionEngine.js");
            result = thermalExpansionEngine.linearExpansion(params.length, params.temperature_change, params.material, params.cte);
            break;
          }

          case "thermal_machine_error": {
            const { thermalExpansionEngine } = await import("../../engines/ThermalExpansionEngine.js");
            result = thermalExpansionEngine.machineToolThermalError(params.geometry ?? {}, params.temperatures ?? {});
            break;
          }

          case "multiaxis_tool_axis": {
            const { multiaxisToolpathEngine } = await import("../../engines/MultiaxisToolpathEngine.js");
            result = multiaxisToolpathEngine.toolAxisFromNormal(params.normal, params.feed_direction, params.angles ?? {});
            break;
          }

          case "multiaxis_gouge_check": {
            const { multiaxisToolpathEngine } = await import("../../engines/MultiaxisToolpathEngine.js");
            result = multiaxisToolpathEngine.detectGouge(params.toolpath, params.tool_radius, params.max_angle);
            break;
          }

          case "bayesian_tool_life_predict": {
            const { bayesianToolLifeEngine } = await import("../../engines/BayesianToolLifeEngine.js");
            const predictor = bayesianToolLifeEngine.createPredictor(params.gp_config);
            if (params.observations) {
              for (const obs of params.observations) {
                bayesianToolLifeEngine.addObservation(predictor, obs.speed, obs.feed, obs.doc, obs.tool_life);
              }
            }
            result = bayesianToolLifeEngine.predict(predictor, params.speed, params.feed, params.doc);
            break;
          }

          case "bayesian_tool_life_replacement": {
            const { bayesianToolLifeEngine } = await import("../../engines/BayesianToolLifeEngine.js");
            const pred = bayesianToolLifeEngine.createPredictor(params.gp_config);
            if (params.observations) {
              for (const obs of params.observations) {
                bayesianToolLifeEngine.addObservation(pred, obs.speed, obs.feed, obs.doc, obs.tool_life);
              }
            }
            result = bayesianToolLifeEngine.getReplacementTime(pred, params.speed, params.feed, params.doc, params.risk_tolerance);
            break;
          }

          case "rl_create_agent": {
            const { qLearningEngine } = await import("../../engines/QLearningEngine.js");
            result = { agent: qLearningEngine.createAgent(params.config), created: true };
            break;
          }

          case "cutting_thermal_shear": {
            const { cuttingThermalEngine } = await import("../../engines/CuttingThermalEngine.js");
            result = cuttingThermalEngine.shearPlaneTemperature(params as ValidatedParams);
            break;
          }

          case "cutting_thermal_interface": {
            const { cuttingThermalEngine } = await import("../../engines/CuttingThermalEngine.js");
            result = cuttingThermalEngine.toolChipInterfaceTemp(params as ValidatedParams);
            break;
          }

          case "cutting_thermal_partition": {
            const { cuttingThermalEngine } = await import("../../engines/CuttingThermalEngine.js");
            result = cuttingThermalEngine.heatPartition(params as ValidatedParams);
            break;
          }

          case "de_optimize": {
            const { differentialEvolutionEngine } = await import("../../engines/DifferentialEvolutionEngine.js");
            const fitFn = new Function("genes", params.fitness_body) as (g: number[]) => number;
            result = differentialEvolutionEngine.optimize(fitFn, params.bounds, params.config ?? {});
            break;
          }

          case "feature_precedence_graph": {
            const { featureInteractionEngine } = await import("../../engines/FeatureInteractionEngine.js");
            const graph = featureInteractionEngine.buildPrecedenceGraph(params.features);
            const seqResult = featureInteractionEngine.generateOperationSequence(graph);
            result = { edges: graph.edges, sequence: seqResult };
            break;
          }

          case "feature_detect_interactions": {
            const { featureInteractionEngine } = await import("../../engines/FeatureInteractionEngine.js");
            result = { interactions: featureInteractionEngine.detectInteractions(params.features) };
            break;
          }

          case "feature_minimize_setups": {
            const { featureInteractionEngine } = await import("../../engines/FeatureInteractionEngine.js");
            result = featureInteractionEngine.minimizeSetups(params.features);
            break;
          }

          // --- Feed Optimization Engine (reverse-engineered from monolith) ---
          case "corner_dynamics": {
            const { feedOptimizationEngine: foe } = await import("../../engines/FeedOptimizationEngine.js");
            result = foe.calculateCornerDynamics({
              feedRate: params.feed_rate ?? params.feedRate ?? 5000,
              cornerAngle: params.corner_angle ?? params.cornerAngle ?? 90,
              maxAcceleration: params.max_acceleration ?? params.maxAcceleration,
              maxGForce: params.max_g_force ?? params.maxG,
              toolDiameter: params.tool_diameter ?? params.toolDiameter,
            });
            break;
          }
          case "arc_feed_correction": {
            const { feedOptimizationEngine: foe2 } = await import("../../engines/FeedOptimizationEngine.js");
            result = foe2.calculateArcFeedCorrection(
              params.arc_radius ?? params.arcRadius ?? 50,
              params.tool_radius ?? params.toolRadius ?? 5,
              params.is_inside ?? params.isInside ?? false,
            );
            break;
          }
          case "balance_grade": {
            const { feedOptimizationEngine: foe3 } = await import("../../engines/FeedOptimizationEngine.js");
            result = foe3.calculateBalanceGrade({
              rpm: params.rpm ?? 15000,
              holderMass: params.holder_mass ?? params.holderMass ?? 1.5,
              toolDiameter: params.tool_diameter ?? params.toolDiameter,
              insertMass: params.insert_mass ?? params.insertMass,
              holderType: params.holder_type ?? params.holderType,
            });
            break;
          }
          case "aggressiveness_levels": {
            const { feedOptimizationEngine: foe4 } = await import("../../engines/FeedOptimizationEngine.js");
            result = foe4.listAggressivenessLevels();
            break;
          }

          // ── Numerical Methods (reverse-engineered from monolith MIT batch) ──
          case "ode_solve": {
            const { numericalMethodsEngine: nme } = await import("../../engines/NumericalMethodsEngine.js");
            const method = params.method ?? "rk4";
            // f(t, y) provided as coefficients for linear ODE: dy/dt = a*y + b*t + c
            const a = params.coeff_y ?? -1;
            const b = params.coeff_t ?? 0;
            const c = params.coeff_const ?? 0;
            const f = (t: number, y: number) => a * y + b * t + c;
            if (method === "euler") {
              result = nme.eulerForward(f, params.y0 ?? 1, params.t0 ?? 0, params.tf ?? 1, params.steps ?? 100);
            } else {
              result = nme.rk4(f, params.y0 ?? 1, params.t0 ?? 0, params.tf ?? 1, params.steps ?? 100);
            }
            break;
          }
          case "ode_solve_system": {
            const { numericalMethodsEngine: nme2 } = await import("../../engines/NumericalMethodsEngine.js");
            // System coefficients: dY/dt = A*Y (matrix A provided as flat array)
            const dim = params.dimensions ?? 2;
            const coeffs: number[] = params.coefficients ?? [-1, 0, 0, -2];
            const F = (_t: number, Y: number[]) => {
              const dY = Array(dim).fill(0);
              for (let i = 0; i < dim; i++) {
                for (let j = 0; j < dim; j++) {
                  dY[i] += (coeffs[i * dim + j] ?? 0) * Y[j];
                }
              }
              return dY;
            };
            const Y0: number[] = params.y0 ?? Array(dim).fill(1);
            result = nme2.rk4System(F, Y0, params.t0 ?? 0, params.tf ?? 1, params.steps ?? 100);
            break;
          }
          case "linear_solve": {
            const { numericalMethodsEngine: nme3 } = await import("../../engines/NumericalMethodsEngine.js");
            result = { solution: nme3.solveLU(params.matrix, params.rhs) };
            break;
          }
          case "least_squares": {
            const { numericalMethodsEngine: nme4 } = await import("../../engines/NumericalMethodsEngine.js");
            result = nme4.leastSquaresQR(params.matrix, params.rhs);
            break;
          }
          case "pid_simulate": {
            const { numericalMethodsEngine: nme5 } = await import("../../engines/NumericalMethodsEngine.js");
            result = nme5.simulatePID({
              setpoint: params.setpoint ?? 1,
              Kp: params.kp ?? 1, Ki: params.ki ?? 0, Kd: params.kd ?? 0,
              T: params.sample_period ?? 0.01,
              plantGain: params.plant_gain, plantTimeConstant: params.plant_time_constant,
              duration: params.duration ?? 5,
              disturbance: params.disturbance, disturbanceTime: params.disturbance_time,
            });
            break;
          }
          case "pid_step": {
            const { numericalMethodsEngine: nme6 } = await import("../../engines/NumericalMethodsEngine.js");
            const pidState = params.state ?? nme6.createPIDState();
            result = nme6.computePID(
              params.setpoint ?? 1, params.measured ?? 0,
              params.kp ?? 1, params.ki ?? 0, params.kd ?? 0,
              params.sample_period ?? 0.01, pidState,
            );
            break;
          }
          case "discretize_tf": {
            const { numericalMethodsEngine: nme7 } = await import("../../engines/NumericalMethodsEngine.js");
            result = nme7.tustinDiscretize(
              params.gain ?? 1, params.time_constant ?? 1, params.sample_period ?? 0.01,
            );
            break;
          }

          // ── Linear Programming (reverse-engineered from monolith MIT 15.083j) ──
          case "lp_solve": {
            const { linearProgrammingEngine: lpe } = await import("../../engines/LinearProgrammingEngine.js");
            result = lpe.solve({
              c: params.objective, A: params.constraints, b: params.rhs,
              maximize: params.maximize ?? false, maxIter: params.max_iter,
            });
            break;
          }
          case "lp_resource_allocation": {
            const { linearProgrammingEngine: lpe2 } = await import("../../engines/LinearProgrammingEngine.js");
            result = lpe2.solveResourceAllocation({
              productProfits: params.profits,
              resourceUsage: params.usage,
              resourceLimits: params.limits,
              maxProduction: params.max_production,
            });
            break;
          }

          // ── Material Interpolation (reverse-engineered from monolith) ──
          case "material_interpolate": {
            const { materialInterpolationEngine: mie } = await import("../../engines/MaterialInterpolationEngine.js");
            result = mie.interpolateParams(
              params.material ?? "unknown",
              params.properties, params.safety_factor,
            );
            break;
          }
          case "material_similarity": {
            const { materialInterpolationEngine: mie2 } = await import("../../engines/MaterialInterpolationEngine.js");
            result = mie2.findSimilar(
              params.material ?? "unknown", params.properties, params.top_n,
            );
            break;
          }
          case "material_compare": {
            const { materialInterpolationEngine: mie3 } = await import("../../engines/MaterialInterpolationEngine.js");
            result = mie3.compareMaterials(
              params.material1 ?? "steel_4140",
              params.material2 ?? "steel_4340",
            );
            break;
          }

          // ── Control Systems (Ziegler-Nichols + Step Response) ──
          case "ziegler_nichols": {
            const { numericalMethodsEngine: nme8 } = await import("../../engines/NumericalMethodsEngine.js");
            result = nme8.zieglerNicholsTuning(
              params.ultimate_gain ?? 10,
              params.ultimate_period ?? 0.5,
              params.type ?? "PID",
            );
            break;
          }
          case "step_response": {
            const { numericalMethodsEngine: nme9 } = await import("../../engines/NumericalMethodsEngine.js");
            const order = params.order ?? 2;
            const points: Array<{ t: number; y: number }> = [];
            const duration = params.duration ?? 5;
            const steps = params.steps ?? 100;
            for (let i = 0; i <= steps; i++) {
              const t = (i / steps) * duration;
              const y = order === 1
                ? nme9.firstOrderStep(params.gain ?? 1, params.time_constant ?? 1, t)
                : nme9.secondOrderStep(params.gain ?? 1, params.natural_freq ?? 10, params.damping_ratio ?? 0.5, t);
              points.push({ t: Math.round(t * 1000) / 1000, y: Math.round(y * 10000) / 10000 });
            }
            result = { order, points, params: { gain: params.gain ?? 1, duration } };
            break;
          }

          // --- Round 6: Signal Processing & Gradient Optimization ---

          case "fft_analyze": {
            const { signalProcessingEngine: spe } = await import("../../engines/SignalProcessingEngine.js");
            const signal: number[] = params.signal ?? [];
            const fs = params.sample_rate ?? 1;
            const spectrum = spe.fft(signal);
            const psd = spe.psd(signal, fs);
            result = {
              spectrum_length: spectrum.length,
              psd: psd.slice(0, params.max_bins ?? 64),
              peak: psd.reduce((best: any, p: any) => (!best || p.power > best.power) ? p : best, null),
            };
            break;
          }

          case "dominant_frequency": {
            const { signalProcessingEngine: spe2 } = await import("../../engines/SignalProcessingEngine.js");
            const sig: number[] = params.signal ?? [];
            const sampleRate = params.sample_rate ?? 1;
            result = spe2.dominantFrequency(sig, sampleRate);
            break;
          }

          case "design_fir_filter": {
            const { signalProcessingEngine: spe3 } = await import("../../engines/SignalProcessingEngine.js");
            result = spe3.designFIR(
              params.type ?? "lowpass",
              params.cutoff ?? 0.25,
              params.order ?? 20,
              { window: params.window ?? "hamming", fs: params.sample_rate ?? 1 },
            );
            break;
          }

          case "spectrogram": {
            const { signalProcessingEngine: spe4 } = await import("../../engines/SignalProcessingEngine.js");
            const specSig: number[] = params.signal ?? [];
            result = spe4.spectrogram(
              specSig,
              params.window_size ?? 64,
              params.hop_size ?? 32,
              { window: params.window ?? "hamming", fs: params.sample_rate ?? 1 },
            );
            break;
          }

          case "gradient_optimize": {
            const { gradientOptimizationEngine: goe } = await import("../../engines/GradientOptimizationEngine.js");
            // For dispatcher use: optimize a built-in test function or accept coefficients
            // Quadratic: f(x) = sum(c_i * (x_i - target_i)^2)
            const coeffs: number[] = params.coefficients ?? [1];
            const targets: number[] = params.targets ?? coeffs.map(() => 0);
            const x0: number[] = params.x0 ?? coeffs.map(() => 1);
            const objFn = (x: number[]) => coeffs.reduce((s, c, i) => s + c * (x[i] - targets[i]) ** 2, 0);
            const gradFn = (x: number[]) => coeffs.map((c, i) => 2 * c * (x[i] - targets[i]));
            result = goe.gradientDescent(objFn, gradFn, x0, {
              variant: params.variant ?? "adam",
              learningRate: params.learning_rate ?? 0.01,
              maxIter: params.max_iter ?? 1000,
            });
            break;
          }

          case "bfgs_optimize": {
            const { gradientOptimizationEngine: goe2 } = await import("../../engines/GradientOptimizationEngine.js");
            const bCoeffs: number[] = params.coefficients ?? [1];
            const bTargets: number[] = params.targets ?? bCoeffs.map(() => 0);
            const bx0: number[] = params.x0 ?? bCoeffs.map(() => 1);
            const bObj = (x: number[]) => bCoeffs.reduce((s, c, i) => s + c * (x[i] - bTargets[i]) ** 2, 0);
            const bGrad = (x: number[]) => bCoeffs.map((c, i) => 2 * c * (x[i] - bTargets[i]));
            result = goe2.bfgs(bObj, bGrad, bx0, { maxIter: params.max_iter ?? 200 });
            break;
          }

          case "golden_section": {
            const { gradientOptimizationEngine: goe3 } = await import("../../engines/GradientOptimizationEngine.js");
            // 1D optimization: f(x) = a*(x-b)^2 + c
            const gsA = params.a ?? 1;
            const gsB = params.b ?? 0;
            const gsC = params.c ?? 0;
            result = goe3.goldenSection(
              (x) => gsA * (x - gsB) ** 2 + gsC,
              params.lower ?? -10,
              params.upper ?? 10,
            );
            break;
          }

          // --- Round 8-9: Local Search & Spectral Graph ---

          case "simulated_annealing": {
            const { localSearchEngine: lse } = await import("../../engines/LocalSearchEngine.js");
            // Minimize quadratic: sum(c_i * (x_i - t_i)^2) via SA with integer neighbors
            const saCoeffs: number[] = params.coefficients ?? [1];
            const saTargets: number[] = params.targets ?? saCoeffs.map(() => 0);
            const saX0: number[] = params.x0 ?? saCoeffs.map(() => 10);
            const saResult = lse.simulatedAnnealing({
              problem: {
                initial: saX0,
                evaluate: (x: number[]) => saCoeffs.reduce((s, c, i) => s + c * ((x[i] ?? 0) - saTargets[i]) ** 2, 0),
                getNeighbors: (x: number[]) => {
                  const neighbors: number[][] = [];
                  for (let i = 0; i < x.length; i++) {
                    const up = [...x]; up[i] += 1; neighbors.push(up);
                    const dn = [...x]; dn[i] -= 1; neighbors.push(dn);
                  }
                  return neighbors;
                },
              },
              initialTemp: params.initial_temp ?? 1000,
              coolingRate: params.cooling_rate ?? 0.995,
              maxIterations: params.max_iter ?? 50000,
            });
            result = { solution: saResult.solution, energy: saResult.energy, iterations: saResult.iterations, finalTemp: saResult.finalTemp };
            break;
          }

          case "two_opt_tsp": {
            const { localSearchEngine: lse2 } = await import("../../engines/LocalSearchEngine.js");
            const tspTour: number[] = params.tour ?? [];
            const tspDist: number[][] = params.distance_matrix ?? [];
            result = lse2.twoOpt(tspTour, tspDist);
            break;
          }

          case "spectral_partition": {
            const { spectralGraphEngine: sge } = await import("../../engines/SpectralGraphEngine.js");
            const spFaces: number[][] = params.faces ?? [];
            const partResult = sge.spectralPartition(spFaces);
            result = { partition: partResult.partition, clusters: partResult.clusters, algebraicConnectivity: partResult.algebraicConnectivity };
            break;
          }

          case "mesh_analyze": {
            const { spectralGraphEngine: sge2 } = await import("../../engines/SpectralGraphEngine.js");
            const maIndices: number[] = params.indices ?? [];
            result = sge2.analyzeMesh(maIndices);
            break;
          }

          // ── Batch 12c: Spatial Index (KD-Tree, Octree) ────────────
          case "kdtree_nearest": {
            const { kdTree: kd } = await import("../../engines/SpatialIndexEngine.js");
            const kdPoints = (params.points ?? []).map((p: any) => ({ x: p.x ?? 0, y: p.y ?? 0, z: p.z ?? 0 }));
            const tree = kd.build(kdPoints);
            const query = { x: params.query_x ?? 0, y: params.query_y ?? 0, z: params.query_z ?? 0 };
            const k = params.k ?? 1;
            result = k === 1
              ? { nearest: kd.nearestNeighbor(tree, query) }
              : { nearest: kd.kNearestNeighbors(tree, query, k) };
            break;
          }
          case "kdtree_radius": {
            const { kdTree: kd2 } = await import("../../engines/SpatialIndexEngine.js");
            const krPoints = (params.points ?? []).map((p: any) => ({ x: p.x ?? 0, y: p.y ?? 0, z: p.z ?? 0 }));
            const krTree = kd2.build(krPoints);
            const krCenter = { x: params.center_x ?? 0, y: params.center_y ?? 0, z: params.center_z ?? 0 };
            result = { results: kd2.radiusSearch(krTree, krCenter, params.radius ?? 1) };
            break;
          }
          case "octree_radius": {
            const { octree: oct } = await import("../../engines/SpatialIndexEngine.js");
            const orPoints = (params.points ?? []).map((p: any) => ({ x: p.x ?? 0, y: p.y ?? 0, z: p.z ?? 0 }));
            const orTree = oct.build(orPoints, params.max_depth ?? 10, params.max_points ?? 8);
            const orCenter = { x: params.center_x ?? 0, y: params.center_y ?? 0, z: params.center_z ?? 0 };
            result = { results: oct.radiusSearch(orTree, orCenter, params.radius ?? 1) };
            break;
          }
          case "voxelize_mesh": {
            const { octree: oct2 } = await import("../../engines/SpatialIndexEngine.js");
            const vmVerts = (params.vertices ?? []).map((v: any) => ({ x: v.x ?? 0, y: v.y ?? 0, z: v.z ?? 0 }));
            const vmFaces = params.faces ?? [];
            result = oct2.voxelize(vmVerts, vmFaces, params.resolution ?? 10);
            break;
          }

          // ── Batch 12b: 5-Axis Jacobian & Singularity ──────────────
          case "jacobian_5axis": {
            const { jacobianEngine: je } = await import("../../engines/KinematicsEngine.js");
            const jConfig = params.config === "AC" ? "AC" as const : "BC" as const;
            const jJoints = { x: params.x ?? 0, y: params.y ?? 0, z: params.z ?? 0, a: params.a ?? 0, b: params.b ?? 0, c: params.c ?? 0 };
            const jacobian = je.compute5AxisJacobian(jConfig, jJoints, params.tool_length ?? 0);
            const singResult = je.detectSingularity(jacobian, params.threshold ?? 0.01);
            result = { jacobian, ...singResult };
            break;
          }
          case "singularity_detect": {
            const { jacobianEngine: je2 } = await import("../../engines/KinematicsEngine.js");
            const sdConfig = params.config === "AC" ? "AC" as const : "BC" as const;
            const sdJoints = { x: params.x ?? 0, y: params.y ?? 0, z: params.z ?? 0, a: params.a ?? 0, b: params.b ?? 0, c: params.c ?? 0 };
            const sdJ = je2.compute5AxisJacobian(sdConfig, sdJoints, params.tool_length ?? 0);
            result = je2.detectSingularity(sdJ, params.threshold ?? 0.01);
            break;
          }
          case "config_singularity_check": {
            const { jacobianEngine: je3 } = await import("../../engines/KinematicsEngine.js");
            const csConfig = params.config === "AC" ? "AC" as const : "BC" as const;
            result = je3.checkConfigSingularities(csConfig, { a: params.a ?? 0, b: params.b ?? 0, c: params.c ?? 0 });
            break;
          }

          // ── Batch 13: Workholding & Fixture ────────────────────────
          case "fixture_design_recommend": {
            const { fixtureDesignEngine } = await import("../../engines/FixtureDesignEngine.js");
            result = fixtureDesignEngine.recommend(
              { shape: params.shape ?? "prismatic", length_mm: params.length_mm ?? 100, width_mm: params.width_mm ?? 100, height_mm: params.height_mm ?? 50, weight_kg: params.weight_kg ?? 5, material_iso_group: params.material_iso_group ?? "P" },
              { max_force_N: params.max_force_N ?? 1000, force_direction: params.force_direction ?? "tangential", max_torque_Nm: params.max_torque_Nm, spindle_rpm: params.spindle_rpm }
            );
            break;
          }
          case "fixture_design_validate": {
            const { fixtureDesignEngine: fde2 } = await import("../../engines/FixtureDesignEngine.js");
            result = fde2.validate(
              { shape: params.shape ?? "prismatic", length_mm: params.length_mm ?? 100, width_mm: params.width_mm ?? 100, height_mm: params.height_mm ?? 50, weight_kg: params.weight_kg ?? 5, material_iso_group: params.material_iso_group ?? "P" },
              { max_force_N: params.max_force_N ?? 1000, force_direction: params.force_direction ?? "tangential" },
              params.fixture_type ?? "vise", params.tolerance_mm ?? 0.05
            );
            break;
          }
          case "fixture_clamp_force": {
            const { fixtureDesignEngine: fde3 } = await import("../../engines/FixtureDesignEngine.js");
            result = fde3.clampForce(params.cutting_force_N ?? 1000, params.material_iso_group ?? "P", params.fixture_type ?? "vise", params.serrated ?? true, params.num_clamps ?? 2);
            break;
          }
          case "fixture_deflection_calc": {
            const { fixtureDesignEngine: fde4 } = await import("../../engines/FixtureDesignEngine.js");
            result = fde4.deflection(
              { shape: params.shape ?? "prismatic", length_mm: params.length_mm ?? 100, width_mm: params.width_mm ?? 100, height_mm: params.height_mm ?? 50, weight_kg: params.weight_kg ?? 5, material_iso_group: params.material_iso_group ?? "P" },
              { max_force_N: params.max_force_N ?? 1000, force_direction: params.force_direction ?? "tangential" },
              params.fixture_type ?? "vise", params.tolerance_mm ?? 0.05
            );
            break;
          }
          case "soft_jaw_design": {
            const { softJawProfileEngine } = await import("../../engines/SoftJawProfileEngine.js");
            result = softJawProfileEngine.design({
              workpiece_shape: params.workpiece_shape ?? "round",
              workpiece_dimension_mm: params.workpiece_dimension_mm ?? 50,
              workpiece_height_mm: params.workpiece_height_mm ?? 30,
              workpiece_material: params.workpiece_material ?? "steel",
              jaw_material: params.jaw_material ?? "6061_aluminum",
              num_jaws: params.num_jaws ?? 3,
              chuck_or_vise: params.chuck_or_vise ?? "chuck",
              clamping_force_N: params.clamping_force_N ?? 5000,
              grip_depth_mm: params.grip_depth_mm ?? 10,
              surface_finish_critical: params.surface_finish_critical ?? false,
            });
            break;
          }
          case "magnetic_chuck_calc": {
            const { magneticChuckEngine } = await import("../../engines/MagneticChuckEngine.js");
            result = magneticChuckEngine.calculate({
              chuck_type: params.chuck_type ?? "permanent",
              chuck_pull_force_N_per_cm2: params.chuck_pull_force_N_per_cm2 ?? 120,
              workpiece_length_mm: params.workpiece_length_mm ?? 200,
              workpiece_width_mm: params.workpiece_width_mm ?? 100,
              workpiece_thickness_mm: params.workpiece_thickness_mm ?? 20,
              workpiece_material: params.workpiece_material ?? "steel",
              workpiece_weight_N: params.workpiece_weight_N ?? 30,
              contact_area_pct: params.contact_area_pct ?? 100,
              cutting_force_tangential_N: params.cutting_force_tangential_N ?? 200,
              cutting_force_normal_N: params.cutting_force_normal_N ?? 100,
              operation: params.operation ?? "surface_grinding",
              surface_roughness_Ra_um: params.surface_roughness_Ra_um ?? 0.8,
            });
            break;
          }
          case "tombstone_layout": {
            const { tombstoneLayoutEngine } = await import("../../engines/TombstoneLayoutEngine.js");
            result = tombstoneLayoutEngine.layout({
              tombstone_faces: params.tombstone_faces ?? 4,
              face_width_mm: params.face_width_mm ?? 400,
              face_height_mm: params.face_height_mm ?? 400,
              part_width_mm: params.part_width_mm ?? 100,
              part_height_mm: params.part_height_mm ?? 80,
              part_depth_mm: params.part_depth_mm ?? 50,
              part_weight_kg: params.part_weight_kg ?? 2,
              machining_time_per_part_min: params.machining_time_per_part_min ?? 5,
              tool_change_time_sec: params.tool_change_time_sec ?? 8,
              index_time_sec: params.index_time_sec ?? 5,
              load_unload_time_per_part_sec: params.load_unload_time_per_part_sec ?? 30,
              pallet_change_time_sec: params.pallet_change_time_sec ?? 15,
              clearance_mm: params.clearance_mm ?? 20,
              max_table_load_kg: params.max_table_load_kg ?? 500,
              spindle_reach_mm: params.spindle_reach_mm ?? 500,
            });
            break;
          }
          case "workholding_clamp_force": {
            const { workholdingEngine } = await import("../../engines/WorkholdingEngine.js");
            result = workholdingEngine.calculateClampForceRequired(
              { Fc: params.Fc ?? 500, Ff: params.Ff ?? 200, Fp: params.Fp ?? 150 },
              { type: params.device_type ?? "VICE_SERRATED", surfaceCondition: params.surface_condition, frictionCoefficient: params.friction_coefficient, maxClampForce: params.max_clamp_force_N },
              { operationType: params.operation_type ?? "MILLING", cuttingForces: { Fc: params.Fc ?? 500, Ff: params.Ff ?? 200, Fp: params.Fp ?? 150 }, forceApplicationPoint: params.force_point ?? { x: 0, y: 0, z: 0 } },
              params.safety_factor
            );
            break;
          }
          case "workholding_pullout": {
            const { workholdingEngine: whe2 } = await import("../../engines/WorkholdingEngine.js");
            result = whe2.calculatePulloutResistance(
              params.axial_force_N ?? 500,
              { device: { type: params.device_type ?? "VICE_SERRATED" }, clampLocations: params.clamp_locations ?? [{ id: "c1", x: 0, y: 0, z: 0, forceDirection: "DOWN", clampForce: params.clamp_force_N ?? 5000 }], partOrientation: params.part_orientation ?? "HORIZONTAL" },
              { type: params.device_type ?? "VICE_SERRATED" },
              params.safety_factor ?? 2.5
            );
            break;
          }
          case "workholding_liftoff": {
            const { workholdingEngine: whe3 } = await import("../../engines/WorkholdingEngine.js");
            result = whe3.analyzeLiftoffMoment(
              { Fc: params.Fc ?? 500, Ff: params.Ff ?? 200, Fp: params.Fp ?? 150 },
              { operationType: params.operation_type ?? "MILLING", cuttingForces: { Fc: params.Fc ?? 500, Ff: params.Ff ?? 200, Fp: params.Fp ?? 150 }, forceApplicationPoint: params.force_point ?? { x: 50, y: 25, z: 0 } },
              { device: { type: params.device_type ?? "VICE_SERRATED" }, clampLocations: params.clamp_locations ?? [{ id: "c1", x: 0, y: 0, z: 0, forceDirection: "DOWN", clampForce: params.clamp_force_N ?? 5000 }], partOrientation: "HORIZONTAL" },
              { material: params.material ?? "steel", elasticModulus: params.elastic_modulus_GPa ?? 200, length: params.length_mm ?? 100, width: params.width_mm ?? 50, height: params.height_mm ?? 30 }
            );
            break;
          }
          case "fixture_3dp_evaluate": {
            const { threeDPrintedFixtureEngine } = await import("../../engines/ThreeDPrintedFixtureEngine.js");
            result = threeDPrintedFixtureEngine.evaluate({
              process: params.process ?? "FDM",
              material: params.material ?? "PETG",
              fixture_volume_cm3: params.fixture_volume_cm3 ?? 200,
              max_cutting_force_N: params.max_cutting_force_N ?? 500,
              max_temperature_C: params.max_temperature_C ?? 40,
              coolant_exposure: params.coolant_exposure ?? true,
              required_accuracy_mm: params.required_accuracy_mm ?? 0.1,
              batch_size: params.batch_size ?? 10,
              conventional_cost_USD: params.conventional_cost_USD ?? 500,
              conventional_lead_days: params.conventional_lead_days ?? 10,
            });
            break;
          }
          case "weld_prep_calc": {
            const { weldPrepEngine } = await import("../../engines/WeldPrepEngine.js");
            result = weldPrepEngine.calculate({
              joint_type: params.joint_type ?? "butt",
              groove_type: params.groove_type ?? "V",
              plate_thickness_mm: params.plate_thickness_mm ?? 12,
              material: params.material ?? "mild_steel",
              weld_process: params.weld_process ?? "GMAW",
              bevel_angle_deg: params.bevel_angle_deg,
              root_gap_mm: params.root_gap_mm,
              root_face_mm: params.root_face_mm,
              groove_radius_mm: params.groove_radius_mm,
            });
            break;
          }
          case "twin_create": {
            const { digitalTwinEngine } = await import("../../engines/DigitalTwinEngine.js");
            result = digitalTwinEngine.create(params.machine_id ?? "MC-001", params.machine_name ?? "CNC Mill", params.model ?? "VMC-500");
            break;
          }
          case "twin_predict": {
            const { digitalTwinEngine: dte2 } = await import("../../engines/DigitalTwinEngine.js");
            result = dte2.predict(params.machine_id ?? "MC-001");
            break;
          }
          case "twin_simulate": {
            const { digitalTwinEngine: dte3 } = await import("../../engines/DigitalTwinEngine.js");
            result = dte3.simulate(params.machine_id ?? "MC-001", params.scenario ?? "spindle_speed", params.parameter_change ?? 10);
            break;
          }

          // ── Batch 14: Machining Physics & Probing ─────────────────
          case "spline_mill_calc": {
            const { splineMillingEngine } = await import("../../engines/SplineMillingEngine.js");
            result = splineMillingEngine.calculate({
              spline_type: params.spline_type ?? "involute",
              num_teeth: params.num_teeth ?? 20,
              module_mm: params.module_mm,
              pressure_angle_deg: params.pressure_angle_deg ?? 30,
              major_diameter_mm: params.major_diameter_mm ?? 50,
              minor_diameter_mm: params.minor_diameter_mm ?? 42,
              face_width_mm: params.face_width_mm ?? 20,
              internal: params.internal ?? false,
              index_method: params.index_method ?? "c_axis",
              tool_diameter_mm: params.tool_diameter_mm ?? 6,
              tool_num_flutes: params.tool_num_flutes ?? 4,
              spindle_rpm: params.spindle_rpm ?? 3000,
              feed_per_tooth_mm: params.feed_per_tooth_mm ?? 0.04,
              num_depth_passes: params.num_depth_passes ?? 3,
            });
            break;
          }
          case "spline_mill_validate": {
            const { splineMillingEngine: sme2 } = await import("../../engines/SplineMillingEngine.js");
            const calcInput = {
              spline_type: params.spline_type ?? "involute",
              num_teeth: params.num_teeth ?? 20,
              module_mm: params.module_mm,
              pressure_angle_deg: params.pressure_angle_deg ?? 30,
              major_diameter_mm: params.major_diameter_mm ?? 50,
              minor_diameter_mm: params.minor_diameter_mm ?? 42,
              face_width_mm: params.face_width_mm ?? 20,
              internal: params.internal ?? false,
              index_method: params.index_method ?? "c_axis",
              tool_diameter_mm: params.tool_diameter_mm ?? 6,
              tool_num_flutes: params.tool_num_flutes ?? 4,
              spindle_rpm: params.spindle_rpm ?? 3000,
              feed_per_tooth_mm: params.feed_per_tooth_mm ?? 0.04,
              num_depth_passes: params.num_depth_passes ?? 3,
            };
            result = sme2.validate(calcInput, params.fit_class ?? "B");
            break;
          }
          case "thin_floor_analyze": {
            const { thinFloorVibrationEngine } = await import("../../engines/ThinFloorVibrationEngine.js");
            result = thinFloorVibrationEngine.analyze({
              geometry: params.geometry ?? "floor",
              thickness_mm: params.thickness_mm ?? 1.5,
              unsupported_length_mm: params.unsupported_length_mm ?? 80,
              unsupported_width_mm: params.unsupported_width_mm,
              material_E_GPa: params.material_E_GPa ?? 70,
              material_density_kgm3: params.material_density_kgm3 ?? 2700,
              material_poisson: params.material_poisson ?? 0.33,
              cutting_force_N: params.cutting_force_N ?? 50,
              spindle_rpm: params.spindle_rpm ?? 8000,
              num_flutes: params.num_flutes ?? 2,
              tool_diameter_mm: params.tool_diameter_mm ?? 6,
            });
            break;
          }
          case "thin_floor_min_thickness": {
            const { thinFloorVibrationEngine: tfv2 } = await import("../../engines/ThinFloorVibrationEngine.js");
            const tfInput = {
              geometry: params.geometry ?? "floor",
              thickness_mm: 1, // placeholder
              unsupported_length_mm: params.unsupported_length_mm ?? 80,
              unsupported_width_mm: params.unsupported_width_mm,
              material_E_GPa: params.material_E_GPa ?? 70,
              material_density_kgm3: params.material_density_kgm3 ?? 2700,
              material_poisson: params.material_poisson ?? 0.33,
              cutting_force_N: params.cutting_force_N ?? 50,
              spindle_rpm: params.spindle_rpm ?? 8000,
              num_flutes: params.num_flutes ?? 2,
              tool_diameter_mm: params.tool_diameter_mm ?? 6,
            };
            result = { min_thickness_mm: tfv2.minThickness(tfInput, params.target_deflection_um ?? 10) };
            break;
          }
          case "regen_chatter_predict": {
            const { regenerativeChatterPredictor } = await import("../../engines/RegenerativeChatterPredictor.js");
            result = regenerativeChatterPredictor.predict({
              cut_type: params.cut_type ?? "half_immersion_down",
              spindle_rpm: params.spindle_rpm ?? 6000,
              depth_of_cut_mm: params.depth_of_cut_mm ?? 3,
              num_flutes: params.num_flutes ?? 4,
              tool_diameter_mm: params.tool_diameter_mm ?? 12,
              natural_freq_Hz: params.natural_freq_Hz ?? 800,
              stiffness_N_per_m: params.stiffness_N_per_m ?? 1e7,
              damping_ratio: params.damping_ratio ?? 0.03,
              specific_cutting_force_N_mm2: params.specific_cutting_force_N_mm2 ?? 2000,
              radial_depth_mm: params.radial_depth_mm,
            });
            break;
          }
          case "regen_chatter_lobes": {
            const { regenerativeChatterPredictor: rcp2 } = await import("../../engines/RegenerativeChatterPredictor.js");
            const rcInput = {
              cut_type: params.cut_type ?? "half_immersion_down",
              spindle_rpm: 0, depth_of_cut_mm: 0,
              num_flutes: params.num_flutes ?? 4,
              tool_diameter_mm: params.tool_diameter_mm ?? 12,
              natural_freq_Hz: params.natural_freq_Hz ?? 800,
              stiffness_N_per_m: params.stiffness_N_per_m ?? 1e7,
              damping_ratio: params.damping_ratio ?? 0.03,
              specific_cutting_force_N_mm2: params.specific_cutting_force_N_mm2 ?? 2000,
              radial_depth_mm: params.radial_depth_mm,
            };
            result = rcp2.stabilityLobes(rcInput, [params.rpm_min ?? 2000, params.rpm_max ?? 12000]);
            break;
          }
          case "harmonic_analyze": {
            const { harmonicAnalysisEngine } = await import("../../engines/HarmonicAnalysisEngine.js");
            result = harmonicAnalysisEngine.analyze({
              spindle_rpm: params.spindle_rpm ?? 6000,
              num_flutes: params.num_flutes ?? 4,
              vibration_spectrum: params.vibration_spectrum ?? [{ freq_Hz: 400, amplitude_um: 8 }],
              bearing_params: params.bearing_params,
              machine_natural_freqs_Hz: params.machine_natural_freqs_Hz,
              threshold_um: params.threshold_um,
            });
            break;
          }
          case "thread_mill_calc": {
            const { threadMillingEngine } = await import("../../engines/ThreadMillingEngine.js");
            result = threadMillingEngine.calculate({
              thread_form: params.thread_form ?? "metric",
              nominal_diameter_mm: params.nominal_diameter_mm ?? 20,
              pitch_mm: params.pitch_mm ?? 2.5,
              internal: params.internal ?? true,
              direction: params.direction ?? "right_hand",
              thread_depth_mm: params.thread_depth_mm ?? 1.35,
              thread_length_mm: params.thread_length_mm ?? 20,
              mill_approach: params.mill_approach ?? "single_form",
              tool_diameter_mm: params.tool_diameter_mm ?? 14,
              num_flutes: params.num_flutes ?? 3,
              num_radial_passes: params.num_radial_passes ?? 1,
              spindle_rpm: params.spindle_rpm ?? 2000,
              material_specific_force_N_mm2: params.material_specific_force_N_mm2 ?? 2000,
            });
            break;
          }
          case "thread_mill_gcode": {
            const { threadMillingEngine: tme2 } = await import("../../engines/ThreadMillingEngine.js");
            result = tme2.generateGCode({
              thread_form: params.thread_form ?? "metric",
              nominal_diameter_mm: params.nominal_diameter_mm ?? 20,
              pitch_mm: params.pitch_mm ?? 2.5,
              internal: params.internal ?? true,
              direction: params.direction ?? "right_hand",
              thread_depth_mm: params.thread_depth_mm ?? 1.35,
              thread_length_mm: params.thread_length_mm ?? 20,
              mill_approach: params.mill_approach ?? "single_form",
              tool_diameter_mm: params.tool_diameter_mm ?? 14,
              num_flutes: params.num_flutes ?? 3,
              num_radial_passes: params.num_radial_passes ?? 1,
              spindle_rpm: params.spindle_rpm ?? 2000,
              material_specific_force_N_mm2: params.material_specific_force_N_mm2 ?? 2000,
            }, params.controller ?? "fanuc");
            break;
          }
          case "gcode_opt_analyze": {
            const { gcodeOptimizationEngine } = await import("../../engines/GCodeOptimizationEngine.js");
            result = gcodeOptimizationEngine.analyze(params.gcode ?? "");
            break;
          }
          case "gcode_opt_optimize": {
            const { gcodeOptimizationEngine: goe4 } = await import("../../engines/GCodeOptimizationEngine.js");
            result = goe4.optimize(params.gcode ?? "");
            break;
          }
          case "gcode_opt_compare": {
            const { gcodeOptimizationEngine: goe5 } = await import("../../engines/GCodeOptimizationEngine.js");
            result = goe5.compare(params.gcode_a ?? "", params.gcode_b ?? "");
            break;
          }
          case "probe_routine_generate": {
            const { probeRoutineEngine } = await import("../../engines/ProbeRoutineEngine.js");
            result = probeRoutineEngine.generate({
              id: params.id ?? "F1",
              callout: params.callout ?? "position",
              tolerance_mm: params.tolerance_mm ?? 0.05,
              datum_refs: params.datum_refs,
              mmc: params.mmc,
              feature_type: params.feature_type ?? "hole",
              nominal: params.nominal ?? { diameter_mm: 10, x_mm: 50, y_mm: 50 },
            });
            break;
          }
          case "probe_gdt_interpret": {
            const { probeRoutineEngine: pre2 } = await import("../../engines/ProbeRoutineEngine.js");
            result = pre2.interpretGDT(params.callout ?? "position", params.tolerance_mm ?? 0.05, params.datum_refs);
            break;
          }
          case "probe_report": {
            const { probeRoutineEngine: pre3 } = await import("../../engines/ProbeRoutineEngine.js");
            result = pre3.report(
              { id: params.id ?? "F1", callout: params.callout ?? "position", tolerance_mm: params.tolerance_mm ?? 0.05, feature_type: params.feature_type ?? "hole", nominal: params.nominal ?? { diameter_mm: 10 } },
              params.measured ?? {}
            );
            break;
          }
          case "thermal_sim_predict": {
            const { thermalSimEngine } = await import("../../engines/ThermalSimEngine.js");
            result = thermalSimEngine.predict({
              cutting_speed_mmin: params.cutting_speed_mmin ?? 150,
              feed_mm: params.feed_mm ?? 0.1,
              depth_of_cut_mm: params.depth_of_cut_mm ?? 2,
              iso_material_group: params.iso_material_group ?? "P",
              tool_material: params.tool_material ?? "carbide",
              coolant: params.coolant ?? "flood",
              operation: params.operation ?? "milling",
              part_thickness_mm: params.part_thickness_mm,
              ambient_temp_C: params.ambient_temp_C,
            });
            break;
          }
          case "thermal_sim_validate": {
            const { thermalSimEngine: tse2 } = await import("../../engines/ThermalSimEngine.js");
            result = tse2.validate({
              cutting_speed_mmin: params.cutting_speed_mmin ?? 150,
              feed_mm: params.feed_mm ?? 0.1,
              depth_of_cut_mm: params.depth_of_cut_mm ?? 2,
              iso_material_group: params.iso_material_group ?? "P",
              tool_material: params.tool_material ?? "carbide",
              coolant: params.coolant ?? "flood",
              operation: params.operation ?? "milling",
            });
            break;
          }
          case "thermal_sim_optimize": {
            const { thermalSimEngine: tse3 } = await import("../../engines/ThermalSimEngine.js");
            result = tse3.optimize({
              cutting_speed_mmin: params.cutting_speed_mmin ?? 150,
              feed_mm: params.feed_mm ?? 0.1,
              depth_of_cut_mm: params.depth_of_cut_mm ?? 2,
              iso_material_group: params.iso_material_group ?? "P",
              tool_material: params.tool_material ?? "carbide",
              coolant: params.coolant ?? "flood",
              operation: params.operation ?? "milling",
            });
            break;
          }

          // ── Batch 15: Specialty Processes ──────────────────────────
          case "hybrid_laser_calc": {
            const { hybridLaserMachineEngine } = await import("../../engines/HybridLaserMachineEngine.js");
            result = hybridLaserMachineEngine.calculate({
              process: params.process ?? "laser_assisted_milling",
              laser_power_W: params.laser_power_W ?? 500,
              spot_diameter_mm: params.spot_diameter_mm ?? 3,
              workpiece_material: params.workpiece_material ?? "titanium",
              preheat_target_C: params.preheat_target_C,
              cutting_speed_m_per_min: params.cutting_speed_m_per_min,
              feed_mm_per_rev: params.feed_mm_per_rev,
              depth_of_cut_mm: params.depth_of_cut_mm,
              clad_material: params.clad_material,
              powder_feed_g_per_min: params.powder_feed_g_per_min,
              layer_height_mm: params.layer_height_mm,
              track_width_mm: params.track_width_mm,
            });
            break;
          }
          case "laser_cut_calc": {
            const { laserCutInterfaceEngine } = await import("../../engines/LaserCutInterfaceEngine.js");
            result = laserCutInterfaceEngine.calculate({
              laser_type: params.laser_type ?? "fiber",
              power_W: params.power_W ?? 4000,
              material: params.material ?? "mild_steel",
              thickness_mm: params.thickness_mm ?? 6,
              assist_gas: params.assist_gas ?? "N2",
              gas_pressure_bar: params.gas_pressure_bar ?? 12,
              focus_position_mm: params.focus_position_mm ?? -1,
              nozzle_diameter_mm: params.nozzle_diameter_mm ?? 2.0,
              beam_quality_mm_mrad: params.beam_quality_mm_mrad,
            });
            break;
          }
          case "laser_mark_calc": {
            const { laserMarkingEngine } = await import("../../engines/LaserMarkingEngine.js");
            result = laserMarkingEngine.calculate({
              laser_source: params.laser_source ?? "fiber_1064",
              power_W: params.power_W ?? 30,
              mark_type: params.mark_type ?? "engrave",
              content_type: params.content_type ?? "data_matrix",
              material: params.material ?? "stainless",
              mark_area_mm2: params.mark_area_mm2 ?? 100,
              character_height_mm: params.character_height_mm ?? 3,
              line_count: params.line_count,
              scan_speed_mm_per_sec: params.scan_speed_mm_per_sec,
              frequency_kHz: params.frequency_kHz,
              compliance_standard: params.compliance_standard,
            });
            break;
          }
          case "waterjet_taper_calc": {
            const { waterjetTaperEngine } = await import("../../engines/WaterjetTaperEngine.js");
            result = waterjetTaperEngine.calculate({
              material: params.material ?? "mild_steel",
              thickness_mm: params.thickness_mm ?? 25,
              cutting_speed_mm_per_min: params.cutting_speed_mm_per_min ?? 200,
              pump_pressure_MPa: params.pump_pressure_MPa ?? 400,
              orifice_diameter_mm: params.orifice_diameter_mm ?? 0.35,
              mixing_tube_diameter_mm: params.mixing_tube_diameter_mm ?? 1.0,
              abrasive_flow_g_per_min: params.abrasive_flow_g_per_min ?? 350,
              standoff_mm: params.standoff_mm ?? 2,
              target_quality: params.target_quality ?? "Q3_medium",
              has_tilt_head: params.has_tilt_head ?? false,
            });
            break;
          }
          case "microstructure_analyze": {
            const { microstructureEffectEngine } = await import("../../engines/MicrostructureEffectEngine.js");
            result = microstructureEffectEngine.analyze({
              material_class: params.material_class ?? "steel",
              grain_size_ASTM: params.grain_size_ASTM ?? 7,
              hardness_HRC: params.hardness_HRC ?? 30,
              phases: params.phases ?? [{ phase: "pearlite", fraction_pct: 60 }, { phase: "ferrite", fraction_pct: 40 }],
              prior_processing: params.prior_processing,
              inclusion_rating: params.inclusion_rating,
            });
            break;
          }
          case "microstructure_recommend": {
            const { microstructureEffectEngine: mee2 } = await import("../../engines/MicrostructureEffectEngine.js");
            result = mee2.recommend({
              material_class: params.material_class ?? "steel",
              grain_size_ASTM: params.grain_size_ASTM ?? 7,
              hardness_HRC: params.hardness_HRC ?? 30,
              phases: params.phases ?? [{ phase: "pearlite", fraction_pct: 60 }, { phase: "ferrite", fraction_pct: 40 }],
              prior_processing: params.prior_processing,
              inclusion_rating: params.inclusion_rating,
            });
            break;
          }
          case "energy_analyze": {
            const { energyOptimizationEngine } = await import("../../engines/EnergyOptimizationEngine.js");
            result = energyOptimizationEngine.analyze({
              operations: params.operations ?? [{ operation_name: "roughing", cutting_time_min: 10, spindle_rpm: 3000, feed_rate_mmmin: 500, depth_of_cut_mm: 3, radial_depth_mm: 10, tool_diameter_mm: 20, material_iso_group: "P", coolant_active: true }],
              machine_power_kW: params.machine_power_kW ?? 22,
              idle_power_kW: params.idle_power_kW,
              coolant_pump_kW: params.coolant_pump_kW,
              electricity_cost_per_kWh: params.electricity_cost_per_kWh,
            });
            break;
          }
          case "energy_optimize": {
            const { energyOptimizationEngine: eoe2 } = await import("../../engines/EnergyOptimizationEngine.js");
            result = eoe2.optimize({
              operations: params.operations ?? [{ operation_name: "roughing", cutting_time_min: 10, spindle_rpm: 3000, feed_rate_mmmin: 500, depth_of_cut_mm: 3, radial_depth_mm: 10, tool_diameter_mm: 20, material_iso_group: "P", coolant_active: true }],
              machine_power_kW: params.machine_power_kW ?? 22,
              idle_power_kW: params.idle_power_kW,
              electricity_cost_per_kWh: params.electricity_cost_per_kWh,
            });
            break;
          }
          case "energy_compare": {
            const { energyOptimizationEngine: eoe3 } = await import("../../engines/EnergyOptimizationEngine.js");
            result = eoe3.compare(params.scenarios ?? []);
            break;
          }

          // ── Tool Catalog ──
          case "tool_catalog_search": {
            const { toolCatalogEngine } = await import("../../engines/ToolCatalogEngine.js");
            result = toolCatalogEngine.search({ type: params.type, diameter_mm: params.diameter_mm, diameter_range: params.diameter_range, iso_group: params.iso_group, manufacturer: params.manufacturer, operation: params.operation, coating: params.coating, flute_count: params.flute_count, max_results: params.max_results });
            break;
          }
          case "tool_catalog_lookup": {
            const { toolCatalogEngine } = await import("../../engines/ToolCatalogEngine.js");
            result = toolCatalogEngine.lookup(params.tool_id);
            break;
          }
          case "tool_catalog_assembly": {
            const { toolCatalogEngine } = await import("../../engines/ToolCatalogEngine.js");
            result = toolCatalogEngine.assembly({ tool_id: params.tool_id, holder_type: params.holder_type, holder_taper: params.holder_taper ?? "BT40", stickout_mm: params.stickout_mm });
            break;
          }
          case "tool_catalog_collision_envelope": {
            const { toolCatalogEngine } = await import("../../engines/ToolCatalogEngine.js");
            result = toolCatalogEngine.collisionEnvelope({ tool_id: params.tool_id, holder_type: params.holder_type, holder_taper: params.holder_taper ?? "BT40", stickout_mm: params.stickout_mm });
            break;
          }
          case "tool_catalog_recommend": {
            const { toolCatalogEngine } = await import("../../engines/ToolCatalogEngine.js");
            result = toolCatalogEngine.recommend({ operation: params.operation ?? "pocket", iso_group: params.iso_group ?? "P", diameter_mm: params.diameter_mm, depth_mm: params.depth_mm, finish_required: params.finish_required, max_results: params.max_results });
            break;
          }
          case "tool_catalog_stats": {
            const { toolCatalogEngine } = await import("../../engines/ToolCatalogEngine.js");
            result = toolCatalogEngine.stats();
            break;
          }

          // ── Unit Conversion ──
          case "unit_convert": {
            const { unitConversionEngine } = await import("../../engines/UnitConversionEngine.js");
            result = unitConversionEngine.convert({ value: params.value, conversion: params.conversion, direction: params.direction ?? "to_metric" });
            break;
          }
          case "unit_convert_batch": {
            const { unitConversionEngine } = await import("../../engines/UnitConversionEngine.js");
            result = unitConversionEngine.convertBatch(params.conversions ?? []);
            break;
          }
          case "unit_system_toggle": {
            const { unitConversionEngine } = await import("../../engines/UnitConversionEngine.js");
            result = unitConversionEngine.toggleSystem({ params: params.machining_params ?? {}, from_system: params.from_system ?? "imperial" });
            break;
          }
          case "unit_list_conversions": {
            const { unitConversionEngine } = await import("../../engines/UnitConversionEngine.js");
            result = unitConversionEngine.listConversions();
            break;
          }
          case "unit_rpm_calc": {
            const { unitConversionEngine } = await import("../../engines/UnitConversionEngine.js");
            result = unitConversionEngine.rpmCalc({ cutting_speed: params.cutting_speed, diameter: params.diameter, system: params.system ?? "metric" });
            break;
          }

          // ── Machine Profile ──
          case "machine_profile_get": {
            const { machineProfileEngine } = await import("../../engines/MachineProfileEngine.js");
            result = machineProfileEngine.get(params.machine_id);
            break;
          }
          case "machine_profile_list": {
            const { machineProfileEngine } = await import("../../engines/MachineProfileEngine.js");
            result = machineProfileEngine.list(params.type);
            break;
          }
          case "machine_profile_validate": {
            const { machineProfileEngine } = await import("../../engines/MachineProfileEngine.js");
            result = machineProfileEngine.validate({ machine_id: params.machine_id, rpm: params.rpm, feed_rate_mmmin: params.feed_rate_mmmin, power_kw: params.power_kw, torque_nm: params.torque_nm, tool_diameter_mm: params.tool_diameter_mm });
            break;
          }
          case "machine_profile_spindle_curve": {
            const { machineProfileEngine } = await import("../../engines/MachineProfileEngine.js");
            result = machineProfileEngine.spindleCurve(params.machine_id, params.points ?? 20);
            break;
          }
          case "machine_profile_add": {
            const { machineProfileEngine } = await import("../../engines/MachineProfileEngine.js");
            result = machineProfileEngine.add(params.profile);
            break;
          }

          // ── Optimization: PSO ──
          case "pso_minimize":
          case "pso_maximize": {
            const { particleSwarmOptimizationEngine: pso } = await import("../../engines/ParticleSwarmOptimizationEngine.js");
            const objFn = new Function("x", params.objective_body ?? "return x[0]**2") as (x: number[]) => number;
            const psoConfig = { dimensions: params.dimensions ?? 2, bounds: params.bounds, swarmSize: params.swarm_size, maxIterations: params.max_iterations, seed: params.seed };
            result = action === "pso_maximize" ? pso.maximize(objFn, psoConfig) : pso.minimize(objFn, psoConfig);
            break;
          }

          // ── Optimization: ACO ──
          case "aco_solve_tsp": {
            const { antColonyOptimizationEngine: aco } = await import("../../engines/AntColonyOptimizationEngine.js");
            result = aco.solve({ nodeCount: params.node_count, distanceMatrix: params.distance_matrix, maxIterations: params.max_iterations, variant: params.variant, seed: params.seed });
            break;
          }
          case "aco_solve_assignment": {
            const { antColonyOptimizationEngine: aco } = await import("../../engines/AntColonyOptimizationEngine.js");
            result = aco.solveAssignment(params.cost_matrix, { maxIterations: params.max_iterations, seed: params.seed });
            break;
          }

          // ── Optimization: Bayesian ──
          case "bayesian_optimize": {
            const { bayesianOptimizationEngine: bo } = await import("../../engines/BayesianOptimizationEngine.js");
            const boFn = new Function("x", params.objective_body ?? "return x[0]**2") as (x: number[]) => number;
            result = bo.minimize(boFn, { dimensions: params.dimensions ?? 1, bounds: params.bounds, acquisitionFunction: params.acquisition_function, maxIterations: params.max_iterations, seed: params.seed });
            break;
          }
          case "bayesian_suggest": {
            const { bayesianOptimizationEngine: bo } = await import("../../engines/BayesianOptimizationEngine.js");
            result = bo.suggestNext(params.observations, { dimensions: params.dimensions ?? 1, bounds: params.bounds, acquisitionFunction: params.acquisition_function, seed: params.seed });
            break;
          }

          // ── Optimization: Trust Region ──
          case "trust_region_minimize": {
            const { trustRegionEngine: tr } = await import("../../engines/TrustRegionEngine.js");
            const trFn = new Function("x", params.objective_body ?? "return x[0]**2") as (x: number[]) => number;
            result = tr.minimize(trFn, { dimensions: params.dimensions ?? 1, x0: params.x0, bounds: params.bounds, maxIterations: params.max_iterations });
            break;
          }

          // ── Interior Point ──
          case "interior_point_solve": {
            const { interiorPointEngine: ip } = await import("../../engines/InteriorPointEngine.js");
            result = ip.solve({ c: params.c, A: params.A, b: params.b, bounds: params.bounds, maxIterations: params.max_iterations });
            break;
          }
          case "interior_point_qp": {
            const { interiorPointEngine: ip } = await import("../../engines/InteriorPointEngine.js");
            result = ip.solveQP(params.Q, params.c, params.A, params.b, params.bounds);
            break;
          }

          // ── Rigid Body Dynamics ──
          case "rigid_body_inertia": {
            const { rigidBodyDynamicsEngine: rb } = await import("../../engines/RigidBodyDynamicsEngine.js");
            const shape = params.shape ?? "box";
            result = shape === "cylinder"
              ? rb.cylinderInertia(params.radius, params.height, params.density, params.offset)
              : rb.boxInertia(params.width, params.height, params.depth, params.density, params.offset);
            break;
          }
          case "rigid_body_force_analysis": {
            const { rigidBodyDynamicsEngine: rb } = await import("../../engines/RigidBodyDynamicsEngine.js");
            const inertia = rb.boxInertia(params.width ?? 1, params.height ?? 1, params.depth ?? 1, params.density ?? 7850);
            result = rb.forceAnalysis(params.forces, inertia, params.pivot);
            break;
          }
          case "rigid_body_impact": {
            const { rigidBodyDynamicsEngine: rb } = await import("../../engines/RigidBodyDynamicsEngine.js");
            result = rb.impact(params.mass_a, params.velocity_a, params.mass_b, params.velocity_b, params.cor ?? 0.5, params.normal ?? { x: 1, y: 0, z: 0 });
            break;
          }

          // ── Voronoi ──
          case "voronoi_delaunay": {
            const { voronoiEngine: vor } = await import("../../engines/VoronoiEngine.js");
            result = vor.delaunay(params.points);
            break;
          }
          case "voronoi_diagram": {
            const { voronoiEngine: vor } = await import("../../engines/VoronoiEngine.js");
            result = vor.voronoi(params.points, params.clip_bounds);
            break;
          }
          case "voronoi_nearest": {
            const { voronoiEngine: vor } = await import("../../engines/VoronoiEngine.js");
            result = vor.nearestSite(params.points, params.query);
            break;
          }
          case "voronoi_relax": {
            const { voronoiEngine: vor } = await import("../../engines/VoronoiEngine.js");
            result = vor.lloydRelax(params.points, params.iterations ?? 3, params.clip_bounds);
            break;
          }

          // ── Geometry: BVH ──
          case "bvh_build_stats": {
            const { bvhEngine } = await import("../../engines/BVHEngine.js");
            const root = bvhEngine.build(params.triangles, params.max_leaf_size);
            result = { aabb: root.aabb, stats: bvhEngine.stats(root) };
            break;
          }
          case "bvh_raycast": {
            const { bvhEngine } = await import("../../engines/BVHEngine.js");
            const root = bvhEngine.build(params.triangles, params.max_leaf_size);
            result = bvhEngine.raycast(root, params.triangles, params.origin, params.direction);
            break;
          }

          // ── SQP ──
          case "sqp_minimize": {
            const { sqpEngine } = await import("../../engines/SQPEngine.js");
            const sqpObj = new Function("x", params.objective_body ?? "return x[0]**2") as (x: number[]) => number;
            const sqpConstraints = (params.constraint_bodies ?? []).map(
              (b: string) => new Function("x", b) as (x: number[]) => number
            );
            result = sqpEngine.minimize(sqpObj, {
              dimensions: params.dimensions ?? 1, x0: params.x0,
              constraints: sqpConstraints, bounds: params.bounds,
              maxIterations: params.max_iterations,
            });
            break;
          }

          // ── Parametric Surface ──
          case "parametric_surface_evaluate": {
            const { parametricSurfaceEngine: ps } = await import("../../engines/ParametricSurfaceEngine.js");
            result = ps.evaluate(params.surface, params.u ?? 0.5, params.v ?? 0.5);
            break;
          }
          case "parametric_surface_tessellate": {
            const { parametricSurfaceEngine: ps } = await import("../../engines/ParametricSurfaceEngine.js");
            result = ps.tessellate(params.surface, params.u_steps, params.v_steps);
            break;
          }
          case "parametric_surface_curvature": {
            const { parametricSurfaceEngine: ps } = await import("../../engines/ParametricSurfaceEngine.js");
            result = ps.curvature(params.surface, params.u ?? 0.5, params.v ?? 0.5);
            break;
          }
          case "parametric_surface_area": {
            const { parametricSurfaceEngine: ps } = await import("../../engines/ParametricSurfaceEngine.js");
            result = ps.area(params.surface, params.u_steps, params.v_steps);
            break;
          }

          // ── Game Theory ──
          case "game_zero_sum": {
            const { gameTheoryEngine } = await import("../../engines/GameTheoryEngine.js");
            result = gameTheoryEngine.solveZeroSum(params.payoff_matrix);
            break;
          }
          case "game_nash": {
            const { gameTheoryEngine } = await import("../../engines/GameTheoryEngine.js");
            result = gameTheoryEngine.nashEquilibrium(params.A, params.B);
            break;
          }
          case "game_decision": {
            const { gameTheoryEngine } = await import("../../engines/GameTheoryEngine.js");
            result = gameTheoryEngine.decisionUnderUncertainty(params.payoffs, params.alpha);
            break;
          }

          // ── Survival Analysis ──
          case "survival_kaplan_meier": {
            const { survivalAnalysisEngine } = await import("../../engines/SurvivalAnalysisEngine.js");
            result = survivalAnalysisEngine.kaplanMeier(params.data, params.confidence);
            break;
          }
          case "survival_weibull_fit": {
            const { survivalAnalysisEngine } = await import("../../engines/SurvivalAnalysisEngine.js");
            const fit = survivalAnalysisEngine.weibullFit(params.failure_times);
            result = { shape: fit.shape, scale: fit.scale, mttf: fit.mttf, b10Life: fit.b10Life, rSquared: fit.rSquared };
            break;
          }
          case "survival_mtbf": {
            const { survivalAnalysisEngine } = await import("../../engines/SurvivalAnalysisEngine.js");
            result = survivalAnalysisEngine.mtbf(params.failure_times);
            break;
          }

          // ── Queueing Theory ──
          case "queue_mm1": {
            const { queueingTheoryEngine } = await import("../../engines/QueueingTheoryEngine.js");
            result = queueingTheoryEngine.mm1(params.arrival_rate, params.service_rate);
            break;
          }
          case "queue_mmc": {
            const { queueingTheoryEngine } = await import("../../engines/QueueingTheoryEngine.js");
            result = queueingTheoryEngine.mmc(params.arrival_rate, params.service_rate, params.servers);
            break;
          }
          case "queue_littles_law": {
            const { queueingTheoryEngine } = await import("../../engines/QueueingTheoryEngine.js");
            result = queueingTheoryEngine.littlesLaw(params);
            break;
          }
          case "queue_production_line": {
            const { queueingTheoryEngine } = await import("../../engines/QueueingTheoryEngine.js");
            result = queueingTheoryEngine.productionLine(params.stations, params.arrival_rate);
            break;
          }

          // ── Fuzzy Logic ──
          case "fuzzy_evaluate": {
            const { fuzzyLogicEngine } = await import("../../engines/FuzzyLogicEngine.js");
            result = fuzzyLogicEngine.evaluate(params.system, params.inputs, params.method);
            break;
          }
          case "fuzzy_process_controller": {
            const { fuzzyLogicEngine } = await import("../../engines/FuzzyLogicEngine.js");
            const sys = fuzzyLogicEngine.createProcessController(
              params.error_range ?? [-10, 10], params.output_range ?? [-5, 5]
            );
            result = fuzzyLogicEngine.evaluate(sys, params.inputs, params.method);
            break;
          }

          // ── Dynamic Programming ──
          case "dp_knapsack": {
            const { dynamicProgrammingEngine } = await import("../../engines/DynamicProgrammingEngine.js");
            result = params.unbounded
              ? dynamicProgrammingEngine.knapsackUnbounded(params.items, params.capacity)
              : dynamicProgrammingEngine.knapsack01(params.items, params.capacity);
            break;
          }
          case "dp_cutting_stock": {
            const { dynamicProgrammingEngine } = await import("../../engines/DynamicProgrammingEngine.js");
            result = dynamicProgrammingEngine.cuttingStock(params as Parameters<typeof dynamicProgrammingEngine.cuttingStock>[0]);
            break;
          }
          case "dp_edit_distance": {
            const { dynamicProgrammingEngine } = await import("../../engines/DynamicProgrammingEngine.js");
            result = dynamicProgrammingEngine.editDistance(params.a, params.b);
            break;
          }

          // ── Robust Statistics ──
          case "robust_location": {
            const { robustStatisticsEngine } = await import("../../engines/RobustStatisticsEngine.js");
            result = robustStatisticsEngine.robustLocation(params.data, params.trim_percent);
            break;
          }
          case "robust_outliers": {
            const { robustStatisticsEngine } = await import("../../engines/RobustStatisticsEngine.js");
            result = robustStatisticsEngine.detectOutliers(params.data, params.method, params.threshold);
            break;
          }
          case "robust_bootstrap": {
            const { robustStatisticsEngine } = await import("../../engines/RobustStatisticsEngine.js");
            const statFn = new Function("d", params.statistic_body ?? "return d.reduce((s,v)=>s+v,0)/d.length") as (d: number[]) => number;
            result = robustStatisticsEngine.bootstrap(params.data, statFn, params);
            break;
          }
          case "robust_theil_sen": {
            const { robustStatisticsEngine } = await import("../../engines/RobustStatisticsEngine.js");
            result = robustStatisticsEngine.theilSen(params.x, params.y);
            break;
          }

          // ── Finite Element ──
          case "fem_bar_solve": {
            const { finiteElementEngine } = await import("../../engines/FiniteElementEngine.js");
            result = finiteElementEngine.solveBar(params as Parameters<typeof finiteElementEngine.solveBar>[0]);
            break;
          }
          case "fem_truss_solve": {
            const { finiteElementEngine } = await import("../../engines/FiniteElementEngine.js");
            result = finiteElementEngine.solveTruss(params as Parameters<typeof finiteElementEngine.solveTruss>[0]);
            break;
          }
          case "fem_thermal_solve": {
            const { finiteElementEngine } = await import("../../engines/FiniteElementEngine.js");
            result = finiteElementEngine.solveThermal(params as Parameters<typeof finiteElementEngine.solveThermal>[0]);
            break;
          }

          // ── Wavelet ──
          case "wavelet_dwt": {
            const { waveletEngine } = await import("../../engines/WaveletEngine.js");
            const wType = params.wavelet ?? "haar";
            result = wType === "db4"
              ? waveletEngine.db4DWT(params.signal, params.levels)
              : waveletEngine.haarDWT(params.signal, params.levels);
            break;
          }
          case "wavelet_denoise": {
            const { waveletEngine } = await import("../../engines/WaveletEngine.js");
            result = waveletEngine.denoise(params.signal, params.wavelet, params.threshold);
            break;
          }
          case "wavelet_energy": {
            const { waveletEngine } = await import("../../engines/WaveletEngine.js");
            result = waveletEngine.energyAnalysis(params.signal, params.wavelet);
            break;
          }

          // ── Markov Chain ──
          case "markov_steady_state": {
            const { markovChainEngine } = await import("../../engines/MarkovChainEngine.js");
            result = markovChainEngine.steadyState(params.transition_matrix);
            break;
          }
          case "markov_absorbing": {
            const { markovChainEngine } = await import("../../engines/MarkovChainEngine.js");
            result = markovChainEngine.absorbingAnalysis(params.transition_matrix);
            break;
          }
          case "markov_reliability": {
            const { markovChainEngine } = await import("../../engines/MarkovChainEngine.js");
            result = markovChainEngine.reliabilityModel(
              params.fail_rate, params.degrade_rate,
              params.degraded_fail_rate, params.repair_rate
            );
            break;
          }

          // ── Convex Optimization ──
          case "convex_qp_solve": {
            const { convexOptimizationEngine } = await import("../../engines/ConvexOptimizationEngine.js");
            result = convexOptimizationEngine.solveQP({
              Q: params.Q, c: params.c,
              A: params.A, b: params.b,
              Aeq: params.Aeq, beq: params.beq,
              bounds: params.bounds, x0: params.x0,
              maxIterations: params.max_iterations, tolerance: params.tolerance,
            });
            break;
          }
          case "convex_minimize": {
            const { convexOptimizationEngine } = await import("../../engines/ConvexOptimizationEngine.js");
            const objFn = new Function("x", params.objective_body ?? "return x[0]**2") as (x: number[]) => number;
            result = convexOptimizationEngine.minimizeConvex(objFn, {
              dimensions: params.dimensions ?? 2,
              x0: params.x0, bounds: params.bounds,
              maxIterations: params.max_iterations, tolerance: params.tolerance,
              stepSize: params.step_size,
            });
            break;
          }
          // ── Numerical Integration ──
          case "numerical_integrate": {
            const { numericalIntegrationEngine } = await import("../../engines/NumericalIntegrationEngine.js");
            const intFn = new Function("x", params.function_body ?? "return x*x") as (x: number) => number;
            const method = params.method ?? "simpson";
            if (method === "adaptive") {
              result = numericalIntegrationEngine.adaptiveSimpson(intFn, params.a ?? 0, params.b ?? 1, params.tolerance);
            } else if (method === "romberg") {
              result = numericalIntegrationEngine.romberg(intFn, params.a ?? 0, params.b ?? 1, params.max_order);
            } else if (method === "gauss") {
              result = numericalIntegrationEngine.compositeGaussLegendre(intFn, params.a ?? 0, params.b ?? 1, params.panels ?? 10, params.points ?? 5);
            } else {
              result = numericalIntegrationEngine.simpson(intFn, params.a ?? 0, params.b ?? 1, params.n ?? 100);
            }
            break;
          }
          case "numerical_integrate_2d": {
            const { numericalIntegrationEngine } = await import("../../engines/NumericalIntegrationEngine.js");
            const fn2d = new Function("x", "y", params.function_body ?? "return x*y") as (x: number, y: number) => number;
            result = numericalIntegrationEngine.integrate2D(fn2d, params.xa ?? 0, params.xb ?? 1, params.ya ?? 0, params.yb ?? 1, params.nx, params.ny);
            break;
          }
          case "numerical_integrate_sampled": {
            const { numericalIntegrationEngine } = await import("../../engines/NumericalIntegrationEngine.js");
            result = numericalIntegrationEngine.integrateSampled(params.x, params.y);
            break;
          }

          // ── Differential Equations ──
          case "ode_rk45_solve": {
            const { differentialEquationEngine } = await import("../../engines/DifferentialEquationEngine.js");
            const odeFn = new Function("t", "y", params.function_body ?? "return [y[0]]") as (t: number, y: number[]) => number[];
            result = differentialEquationEngine.rk45({
              f: odeFn, y0: params.y0, tSpan: params.t_span,
              adaptive: params.adaptive,
            });
            break;
          }
          case "ode_second_order": {
            const { differentialEquationEngine } = await import("../../engines/DifferentialEquationEngine.js");
            const f2 = new Function("t", "y", "v", params.function_body ?? "return -y") as (t: number, y: number, v: number) => number;
            result = differentialEquationEngine.solveSecondOrder({ f: f2, y0: params.y0 ?? 1, v0: params.v0 ?? 0, tSpan: params.t_span, dt: params.dt, numPoints: params.num_points });
            break;
          }
          case "ode_stability": {
            const { differentialEquationEngine } = await import("../../engines/DifferentialEquationEngine.js");
            const stabFn = new Function("t", "y", params.function_body ?? "return [-y[0]]") as (t: number, y: number[]) => number[];
            result = differentialEquationEngine.stabilityAnalysis(stabFn, params.y0 ?? [1]);
            break;
          }

          
          case "constraint_satisfaction": {
            const { constraintSatisfactionEngine } = await import("../../engines/ConstraintSatisfactionEngine.js");
            result = constraintSatisfactionEngine.compute(
              {
                tool_diameter_mm: params.tool_diameter_mm || 10,
                flute_count: params.flute_count || 4,
                overhang_mm: params.overhang_mm || 40,
                stepover_mm: params.stepover_mm || params.ae_mm || 2.5,
                stepdown_mm: params.stepdown_mm || params.ap_mm || 5,
                spindle_rpm: params.spindle_rpm || params.rpm || 8000,
                feed_per_tooth_mm: params.feed_per_tooth_mm || params.fz_mm || 0.08,
                cutting_speed_m_min: params.cutting_speed_m_min || params.vc_m_min || 200,
                material_iso_group: params.material_iso_group || params.iso_group || "P",
                geometry_volume_cm3: params.geometry_volume_cm3 || params.volume_cm3 || 50,
              },
              {
                max_cycle_time_min: params.max_cycle_time_min,
                max_surface_roughness_um: params.max_surface_roughness_um,
                min_tool_life_parts: params.min_tool_life_parts,
                max_spindle_power_kw: params.max_spindle_power_kw,
                max_cutting_force_n: params.max_cutting_force_n,
                max_tool_deflection_mm: params.max_tool_deflection_mm,
                max_spindle_utilization_pct: params.max_spindle_utilization_pct,
                tolerance_mm: params.tolerance_mm,
                min_mrr_cm3_min: params.min_mrr_cm3_min,
              },
              {
                max_spindle_power_kw: params.machine_power_kw || 15,
                max_rpm: params.machine_max_rpm || 12000,
                max_feed_mmmin: params.machine_max_feed || 15000,
              }
            );
            break;
          }
          case "toolpath_segment_optimize": {
            const { toolpathSegmentOptimizerEngine } = await import("../../engines/ToolpathSegmentOptimizerEngine.js");
            result = toolpathSegmentOptimizerEngine.compute({ segments: params.segments, tool: params.tool, material: params.material, machine: params.machine, constraints: params.constraints });
            break;
          }
          case "tool_assembly_deflection": {
            const { toolAssemblyDeflectionEngine } = await import("../../engines/ToolAssemblyDeflectionEngine.js");
            result = toolAssemblyDeflectionEngine.compute({ sections: params.sections, cutting_force_n: params.cutting_force_n, taper: params.taper ?? params.spindle_taper ?? "CAT40" });
            break;
          }
          case "adaptive_engagement_calc": {
            const { adaptiveEngagementEngine } = await import("../../engines/AdaptiveEngagementEngine.js");
            result = adaptiveEngagementEngine.compute({ corners: params.corners ?? (params.corner ? [params.corner] : []), tool: params.tool, cutting: params.cutting, material: params.material, machine: params.machine, strategy: params.strategy });
            break;
          }
          case "hybrid_post_merge": {
            const { hybridPostMergeEngine } = await import("../../engines/HybridPostMergeEngine.js");
            result = hybridPostMergeEngine.compute({ segments: params.segments, machine: params.machine ?? { controller: params.controller ?? "fanuc", has_atc: true, max_tools: params.atc_capacity ?? 20, has_probing: false }, options: params.options });
            break;
          }
          case "thermal_compensation_model": {
            const { thermalCompensationModelEngine } = await import("../../engines/ThermalCompensationModelEngine.js");
            result = thermalCompensationModelEngine.compute({ machine: params.machine, cutting: params.cutting, part: params.part });
            break;
          }
          case "spc_capability_analyze": {
            const { spcProcessCapabilityEngine } = await import("../../engines/SPCProcessCapabilityEngine.js");
            result = spcProcessCapabilityEngine.compute({ measurements: params.measurements, nominal: params.nominal, upper_tolerance: params.upper_tolerance, lower_tolerance: params.lower_tolerance });
            break;
          }
          case "pareto_optimize": {
            const { multiObjectiveParetoEngine } = await import("../../engines/MultiObjectiveParetoEngine.js");
            result = multiObjectiveParetoEngine.compute({ objectives: params.objectives, parameter_bounds: params.parameter_bounds, fixed: params.fixed, machine: params.machine, grid_resolution: params.grid_resolution });
            break;
          }
          case "chatter_stability_sld": {
            const { chatterStabilityLobeEngine } = await import("../../engines/ChatterStabilityLobeEngine.js");
            result = chatterStabilityLobeEngine.compute({ tool: params.tool, workpiece: params.workpiece, machine: params.machine, cutting: params.cutting });
            break;
          }
          case "surface_integrity_full": {
            const { surfaceIntegrityPredictorEngine } = await import("../../engines/SurfaceIntegrityPredictorEngine.js");
            result = surfaceIntegrityPredictorEngine.compute({ tool: params.tool, cutting: params.cutting, material: params.material, process: params.process, coolant: params.coolant });
            break;
          }
          case "machining_energy_model": {
            const { machiningEnergyModelEngine } = await import("../../engines/MachiningEnergyModelEngine.js");
            result = machiningEnergyModelEngine.compute({ cutting: params.cutting, tool: params.tool, material: params.material, machine: params.machine, coolant_type: params.coolant_type });
            break;
          }
          case "monte_carlo_process": {
            const { monteCarloProcessEngine } = await import("../../engines/MonteCarloProcessEngine.js");
            result = monteCarloProcessEngine.compute({ nominal: params.nominal, material: params.material, variations: params.variations, tolerances: params.tolerances, trials: params.trials, seed: params.seed });
            break;
          }
          case "doe_taguchi": {
            const { doeTaguchEngine } = await import("../../engines/DOETaguchEngine.js");
            result = doeTaguchEngine.compute({ factors: params.factors, response: params.response, objective: params.objective, design: params.design ?? "taguchi", material: params.material, tool: params.tool, replications: params.replications });
            break;
          }
          case "fixture_clamping": {
            const { fixtureClampingEngine } = await import("../../engines/FixtureClampingEngine.js");
            result = fixtureClampingEngine.compute({ cutting_forces: params.cutting_forces, workpiece: params.workpiece, fixture: params.fixture, safety_factor: params.safety_factor, operation: params.operation });
            break;
          }
          case "springback_predict": {
            const { springbackPredictionEngine } = await import("../../engines/SpringbackPredictionEngine.js");
            result = springbackPredictionEngine.compute({ feature: params.feature, material: params.material, cutting: params.cutting, tolerance_mm: params.tolerance_mm });
            break;
          }
          case "gdt_stackup": {
            const { gdtStackupEngine } = await import("../../engines/GDTStackupEngine.js");
            result = gdtStackupEngine.compute({ dimensions: params.dimensions, gap_name: params.gap_name, gap_requirement: params.gap_requirement, temperature_delta_c: params.temperature_delta_c, monte_carlo_trials: params.monte_carlo_trials });
            break;
          }
          case "runout_effect": {
            const { runoutEffectEngine } = await import("../../engines/RunoutEffectEngine.js");
            result = runoutEffectEngine.compute({ tool: params.tool, runout: params.runout, cutting: params.cutting, material: params.material });
            break;
          }
          case "process_digital_twin": {
            const { processDigitalTwinEngine } = await import("../../engines/ProcessDigitalTwinEngine.js");
            result = processDigitalTwinEngine.compute({ tool: params.tool, cutting: params.cutting, material: params.material, workpiece: params.workpiece, machine: params.machine });
            break;
          }
          case "process_robustness": {
            const { processRobustnessEngine } = await import("../../engines/ProcessRobustnessEngine.js");
            result = processRobustnessEngine.compute({ nominal: params.nominal, material: params.material, noise_factors: params.noise_factors, weights: params.weights, tolerance_mm: params.tolerance_mm });
            break;
          }
          default:
            throw new Error(`Unknown calculation action: ${action}`);
        }

        // ComputationCache: store result for hot-path actions (C2: include material/tool context)
        if (_cacheableActions.has(action) && result && !result.error) {
          try {
            const storeParams = { ...params, _cache_material: params.material_id || params.material || "", _cache_tool: params.tool_id || params.tool_material || "" };
            computationCache.set(action, storeParams, result);
          } catch (e: any) { log.debug(`[prism] ${e?.message?.slice(0, 80)}`); }
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

        // Cross-field physics validation — catches physically impossible results
        // Only applies to actions that produce SafetyCalcResult-shaped output
        const physicsActions = new Set(["cutting_force", "tool_life", "speed_feed", "optimize"]);
        if (physicsActions.has(action) && result && !result.error && result.Vc !== undefined) {
          try {
            const material = params.material_id || params.material || params.material_group || "unknown";
            validateCrossFieldPhysics({ ...result, material, operation: action });
          } catch (physicsErr: any) {
            if (physicsErr?.name === "SafetyBlockError") throw physicsErr;
            log.warn(`[prism_calc] Cross-field physics check error: ${physicsErr}`);
          }
        }

        // R2-MS1 T5: Apply response_level formatting if requested
        const responseLevel = (params.response_level as ResponseLevel) || undefined;
        if (responseLevel) {
          const leveled = formatByLevel(result, responseLevel, (r: any) => calcExtractKeyValues(action, r));
          return { content: [{ type: "text", text: JSON.stringify(leveled) }] };
        }

        // Pressure-aware response slimming with key-value extraction
        const pressurePct = getCurrentPressurePct();
        if (pressurePct > 50) {
          try {
            const extracted = calcExtractKeyValues(action, result);
            if (extracted && Object.keys(extracted).length > 0) {
              const slimLevel = getSlimLevel(pressurePct);
              return {
                content: [{ type: "text", text: JSON.stringify(slimResponse({ action, ...extracted, _slimmed: true }, slimLevel)) }]
              };
            }
          } catch (e: any) { log.debug(`[prism] ${e?.message?.slice(0, 80)}`); }
        }

        // MS4: Emit calc completed event
        try {
          eventBus.publish(EventTypes.CALC_COMPLETED, {
            action, duration_ms: Date.now() - calcStart,
          }, { category: "calculation", priority: "normal", source: "calcDispatcher" });
        } catch { /* best-effort */ }

        return {
          content: [{ type: "text", text: JSON.stringify(slimResponse(result, getSlimLevel(pressurePct))) }]
        };

      } catch (error) {
        log.error(`[prism_calc] Error in ${action}:`, error);
        // MS4: Emit calc error event
        try {
          eventBus.publish(EventTypes.CALC_ERROR, {
            action, error: (error as Error)?.message?.slice(0, 200),
          }, { category: "calculation", priority: "high", source: "calcDispatcher" });
        } catch { /* best-effort */ }
        return dispatcherError(error, action, "prism_calc");
      }
    }
  );
}