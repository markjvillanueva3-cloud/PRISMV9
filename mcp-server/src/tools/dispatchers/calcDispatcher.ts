import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { hookExecutor } from "../../engines/HookExecutor.js";
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
  "balance_grade", "aggressiveness_levels"
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
          case "cutting_force": {
            // Auto-derive cutting_speed from material if not provided
            let autoVc = params.cutting_speed;
            if (!autoVc && (params.material_id || params.material)) {
              const matLookup = await getMat(params.material_id || params.material);
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
              rake_angle: params.rake_angle ?? 6
            };
            
            let coefficients: KienzleCoefficients;
            if (params.kc1_1 && params.mc) {
              coefficients = { kc1_1: params.kc1_1, mc: params.mc };
            } else if (params.material_id || params.material) {
              const matId = params.material_id || params.material;
              const mat = await getMat(matId);
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
              const mat = await getMat(matId);
              const toolMat = params.tool_material || "Carbide";
              if (mat?.taylor) {
                const t = mat.taylor;
                const useC = toolMat.toLowerCase().includes("carbide") ? ((t as any).C_carbide || t.C) : t.C;
                const useN = toolMat.toLowerCase().includes("carbide") ? ((t as any).n_carbide || t.n) : t.n;
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
              material_hardness: params.material_hardness ?? 200,
              tool_material: params.tool_material ?? "Carbide",
              operation: params.operation ?? "semi-finishing",
              tool_diameter: params.tool_diameter ?? 12,
              number_of_teeth: params.number_of_teeth ?? 4,
              kienzle: undefined as any,
              taylor: undefined as any,
            };
            
            // Auto-lookup material data if material_id provided
            if (params.material_id || params.material) {
              const matId = params.material_id || params.material;
              const mat = await getMat(matId);
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
              T_ref: params.T_ref || 25
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
            // M-010 fix: pass operation parameter to engine
            result = calculateSurfaceFinish(
              params.feed,
              params.nose_radius,
              params.is_milling || false,
              params.radial_depth,
              params.tool_diameter,
              params.operation
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

          case "drilling_force": {
            if (!params.feed_per_rev || !params.cutting_speed || !(params.drill_diameter || params.tool_diameter)) {
              throw new Error("drilling_force requires: drill_diameter (or tool_diameter), feed_per_rev, cutting_speed");
            }
            const drillCond: DrillingConditions = {
              drill_diameter: params.drill_diameter || params.tool_diameter,
              feed_per_rev: params.feed_per_rev,
              cutting_speed: params.cutting_speed,
              point_angle_deg: params.point_angle_deg,
              chisel_edge_factor: params.chisel_edge_factor
            };
            let drillCoeffs: KienzleCoefficients | undefined;
            if (params.kc1_1 && params.mc) {
              drillCoeffs = { kc1_1: params.kc1_1, mc: params.mc };
            } else if (params.material_id || params.material) {
              const mat = await getMat(params.material_id || params.material);
              if (mat?.kienzle) {
                drillCoeffs = { kc1_1: mat.kienzle.kc1_1, mc: mat.kienzle.mc };
              }
            }
            result = calculateDrillingForce(drillCond, drillCoeffs);
            break;
          }

          case "cost_optimize": {
            const costParams: CostParameters = {
              machine_rate: params.machine_rate,
              tool_cost: params.tool_cost,
              tool_change_time: params.tool_change_time
            };

            result = calculateMinimumCostSpeed(
              params.taylor_C,
              params.taylor_n,
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
              constraints,
              weights,
              params.material_kc,
              params.taylor_C,
              params.taylor_n,
              params.tool_diameter,
              params.number_of_teeth
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
            const mpMat = (params.material_id || params.material) ? await getMat(params.material_id || params.material) : null;
            const mpKc = params.kc1_1 || mpMat?.kienzle?.kc1_1 || 1800;
            const mpCr = (mpMat as any)?.cutting_recommendations?.milling || {};
            result = calculateMultiPassStrategy(params.total_stock || params.stock || 10, params.tool_diameter || 12, mpKc, params.machine_power_kw || params.max_power || 15, params.cutting_speed_rough || mpCr.speed_roughing || 150, params.cutting_speed_finish || mpCr.speed_finishing || 200, params.fz_rough || mpCr.feed_per_tooth_roughing || 0.12, params.fz_finish || mpCr.feed_per_tooth_finishing || 0.06, params.target_Ra);
            break;
          }

          case "coolant_strategy": {
            const csMat = (params.material_id || params.material) ? await getMat(params.material_id || params.material) : null;
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
              const wpMat = await getMat(params.material_id || params.material);
              if (wpMat?.taylor) {
                wpTaylorC = wpTaylorC || (wpMat.taylor as any).C_carbide || wpMat.taylor.C;
                wpTaylorN = wpTaylorN || (wpMat.taylor as any).n_carbide || wpMat.taylor.n;
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
              const pcMat = await getMat(pcMaterial);
              if (pcMat) {
                if (pcMat.kienzle) { pcKc = pcMat.kienzle.kc1_1 || pcKc; pcMc = pcMat.kienzle.mc || pcMc; }
                if (pcMat.taylor) { pcTaylorC = (pcMat.taylor as any).C_carbide || pcMat.taylor.C || pcTaylorC; pcTaylorN = (pcMat.taylor as any).n_carbide || pcMat.taylor.n || pcTaylorN; }
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
              const ucMat = await getMat(ucMaterial);
              if (ucMat) {
                if (ucMat.kienzle) { ucKc = ucMat.kienzle.kc1_1 || ucKc; ucMc = ucMat.kienzle.mc || ucMc; }
                if (ucMat.taylor) { ucTaylorC = (ucMat.taylor as any).C_carbide || ucMat.taylor.C || ucTaylorC; ucTaylorN = (ucMat.taylor as any).n_carbide || ucMat.taylor.n || ucTaylorN; }
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
          case "coupling_sensitivity": {
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

          // === ALGORITHM ENGINE (L1-P2-MS1) — 6 typed algorithm actions ===
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

          case "wear_progression": {
            result = toolWearProgressionEngine.calculate({
              cutting_speed_m_min: params.cutting_speed || params.vc || 150,
              feed_mm_rev: params.feed_per_rev || params.feed || params.f || 0.2,
              depth_of_cut_mm: params.depth_of_cut || params.axial_depth || params.ap || 2,
              tool_grade: (params.tool_grade || params.tool_material || "CARBIDE") as ToolGrade,
              workpiece_hardness_hrc: params.hardness_hrc || params.hrc || 30,
              cutting_time_min: params.cutting_time_min || params.elapsed_min,
              current_vb_mm: params.current_vb_mm || params.vb,
              vb_limit_mm: params.vb_limit_mm || params.wear_limit || 0.3,
              cutting_temperature_C: params.temperature_C,
              taylor_C: params.taylor_C,
              taylor_n: params.taylor_n,
            });
            break;
          }

          case "drill_breakthrough": {
            result = drillBreakthroughForceEngine.calculate({
              drill_diameter_mm: params.drill_diameter || params.tool_diameter || params.diameter || 10,
              point_angle_deg: params.point_angle_deg || params.point_angle || 118,
              web_thickness_mm: params.web_thickness_mm,
              helix_angle_deg: params.helix_angle_deg || params.helix_angle,
              feed_mm_rev: params.feed_per_rev || params.feed || params.f || 0.15,
              spindle_rpm: params.spindle_rpm || params.rpm || 1000,
              workpiece_thickness_mm: params.workpiece_thickness || params.thickness || 20,
              material_kc1_1: params.kc1_1,
              material_mc: params.mc,
              workpiece_hardness_hrc: params.hardness_hrc || params.hrc || 30,
              is_through_hole: params.is_through_hole ?? params.through_hole ?? true,
              exit_support: (params.exit_support || "none") as ExitSupport,
              remaining_thickness_mm: params.remaining_thickness_mm,
            });
            break;
          }

          case "thermal_growth": {
            result = thermalGrowthCompensationEngine.calculate({
              spindle_speed_rpm: params.spindle_rpm || params.rpm || 10000,
              cutting_time_min: params.cutting_time_min || params.time_min || 30,
              ambient_temp_C: params.ambient_temp_C || params.ambient_temp,
              spindle_bearing_type: (params.bearing_type || "angular_contact") as SpindleBearingType,
              tool_material: params.tool_material,
              tool_overhang_mm: params.tool_overhang || params.overhang || 50,
              tool_holder_length_mm: params.holder_length,
              workpiece_material: params.workpiece_material || params.material,
              workpiece_length_mm: params.workpiece_length || params.part_length,
              cutting_power_kW: params.power_kW || params.power,
              coolant_active: params.coolant_active ?? params.coolant ?? true,
            });
            break;
          }

          case "bore_finishing": {
            result = boreFinishingEngine.calculate({
              bore_diameter_mm: params.bore_diameter || params.diameter || 50,
              bore_length_mm: params.bore_length || params.length || 100,
              target_Ra_um: params.target_Ra || params.Ra_target || 0.4,
              current_Ra_um: params.current_Ra,
              stone_grit: params.stone_grit as HoningStoneGrit | undefined,
              honing_pressure_bar: params.pressure_bar || params.pressure,
              spindle_rpm: params.spindle_rpm || params.rpm,
              stroke_rate_spm: params.stroke_rate || params.spm,
              stock_removal_target_um: params.stock_removal_um,
              workpiece_hardness_hrc: params.hardness_hrc || params.hrc,
              coolant_type: params.coolant_type,
            });
            break;
          }

          case "finishing_pass": {
            result = finishingPassOptimizationEngine.calculate({
              tool_diameter_mm: params.tool_diameter || params.diameter || 12,
              tool_overhang_mm: params.tool_overhang || params.overhang || 50,
              tool_type: params.tool_type,
              tool_material: params.tool_material,
              tool_nose_radius_mm: params.nose_radius || params.corner_radius || 0.8,
              flutes: params.flutes || params.num_flutes,
              feed_mm_rev: params.feed_per_rev || params.feed || params.f || 0.2,
              depth_of_cut_mm: params.depth_of_cut || params.ap || 2,
              target_Ra_um: params.target_Ra || params.Ra_target || 0.8,
              workpiece_hardness_hrc: params.hardness_hrc || params.hrc,
              material_kc1_1: params.kc1_1,
              material_mc: params.mc,
              shank_modulus_GPa: params.modulus_GPa,
            });
            break;
          }

          case "turning_force": {
            result = turningForceEngine.calculate({
              cutting_speed_m_min: params.cutting_speed || params.Vc || params.vc || 200,
              feed_mm_rev: params.feed_per_rev || params.feed || params.f || 0.2,
              depth_of_cut_mm: params.depth_of_cut || params.ap || 2,
              lead_angle_deg: params.lead_angle || params.kr || 95,
              nose_radius_mm: params.nose_radius || params.corner_radius || 0.8,
              rake_angle_deg: params.rake_angle || params.gamma,
              iso_group: params.iso_group || params.material_group,
              material_kc1_1: params.kc1_1,
              material_mc: params.mc,
              workpiece_diameter_mm: params.workpiece_diameter || params.diameter,
              spindle_power_kW: params.machine_power || params.spindle_power,
              operation: (params.operation || "longitudinal") as TurningOperation,
            });
            break;
          }

          case "tapping_torque": {
            result = tappingTorqueEngine.calculate({
              thread_major_diameter_mm: params.thread_diameter || params.diameter || 10,
              pitch_mm: params.pitch || params.thread_pitch || 1.5,
              tap_type: (params.tap_type || "cut_spiral_point") as TapType,
              hole_type: (params.hole_type || "through") as HoleType,
              thread_depth_mm: params.thread_depth || params.depth,
              thread_engagement_pct: params.engagement_pct || params.thread_engagement,
              workpiece_iso_group: params.iso_group || params.material_group,
              workpiece_hardness_hrc: params.hardness_hrc || params.hrc,
              material_kc1_1: params.kc1_1,
              spindle_rpm: params.rpm || params.spindle_rpm || 500,
              spindle_max_torque_Nm: params.max_torque || params.spindle_torque,
              coolant_active: params.coolant !== false,
            });
            break;
          }

          case "power_budget": {
            result = cuttingPowerBudgetEngine.calculate({
              machine_power_kW: params.machine_power || params.spindle_power || 15,
              machine_max_torque_Nm: params.max_torque || params.machine_torque,
              machine_base_rpm: params.base_rpm,
              machine_max_rpm: params.max_rpm || params.machine_max_rpm,
              cutting_speed_m_min: params.cutting_speed || params.Vc || params.vc || 200,
              tool_diameter_mm: params.tool_diameter || params.diameter,
              workpiece_diameter_mm: params.workpiece_diameter,
              feed_mm_rev: params.feed_per_rev || params.feed,
              feed_mm_tooth: params.feed_per_tooth || params.fz,
              flutes: params.flutes || params.num_flutes,
              depth_of_cut_mm: params.depth_of_cut || params.ap || 2,
              width_of_cut_mm: params.width_of_cut || params.ae,
              material_kc1_1: params.kc1_1,
              material_mc: params.mc,
              iso_group: params.iso_group || params.material_group,
            });
            break;
          }

          case "tool_deflection_predict": {
            result = toolDeflectionPredictionEngine.calculate({
              tool_diameter_mm: params.tool_diameter || params.diameter || 12,
              tool_overhang_mm: params.tool_overhang || params.overhang || params.stickout || 50,
              cutting_force_N: params.cutting_force || params.force || params.Fc || 500,
              force_direction: params.force_direction || "radial",
              tool_material: (params.tool_material || "carbide") as ToolMaterialType,
              holder_diameter_mm: params.holder_diameter,
              holder_length_mm: params.holder_length,
              flute_count: params.flutes || params.num_flutes,
              helix_angle_deg: params.helix_angle_deg || params.helix_angle,
              tolerance_target_mm: params.tolerance_mm || params.tolerance,
            });
            break;
          }

          case "chip_formation": {
            result = chipFormationPredictionEngine.calculate({
              cutting_speed_m_min: params.cutting_speed || params.Vc || params.vc || 200,
              feed_mm_rev: params.feed_per_rev || params.feed || params.f || 0.2,
              depth_of_cut_mm: params.depth_of_cut || params.ap || 2,
              rake_angle_deg: params.rake_angle ?? params.gamma ?? 6,
              workpiece_hardness_hrc: params.hardness_hrc || params.hrc,
              workpiece_ductility: params.ductility as MaterialDuctility | undefined,
              workpiece_elongation_pct: params.elongation_pct,
              friction_coefficient: params.friction || params.mu,
              tool_has_chipbreaker: params.chipbreaker ?? params.has_chipbreaker,
              tool_nose_radius_mm: params.nose_radius || params.corner_radius,
              coolant_active: params.coolant_active ?? params.coolant ?? true,
            });
            break;
          }

          case "specific_cutting_energy": {
            result = specificCuttingEnergyEngine.calculate({
              cutting_force_N: params.cutting_force || params.force || params.Fc,
              chip_width_mm: params.chip_width || params.axial_depth || params.ap,
              chip_thickness_mm: params.chip_thickness || params.feed_per_tooth || params.fz,
              kc1_1: params.kc1_1,
              mc: params.mc,
              feed_mm: params.feed_per_rev || params.feed || params.f,
              mrr_cm3_min: params.mrr,
              cutting_speed_m_min: params.cutting_speed || params.Vc || params.vc,
              depth_of_cut_mm: params.depth_of_cut || params.ap,
              width_of_cut_mm: params.width_of_cut || params.ae,
              volume_to_remove_cm3: params.volume_cm3 || params.volume,
              machining_time_min: params.machining_time || params.time_min,
              machine_standby_power_kW: params.standby_power_kW || params.standby_kW,
              spindle_efficiency: params.spindle_efficiency || params.efficiency,
              electricity_cost_per_kWh: params.electricity_cost || params.cost_per_kWh,
              energy_source: (params.energy_source || "grid_average") as EnergySource,
            });
            break;
          }

          case "roughness_convert": {
            result = roughnessConversionEngine.convert({
              value: params.value ?? params.roughness,
              from_scale: (params.from_scale || params.from || "Ra_um") as RoughnessScale,
              to_scale: (params.to_scale || params.to || "Rz_um") as RoughnessScale,
            });
            break;
          }

          case "peck_drill_optimize": {
            result = peckDrillingOptimizationEngine.calculate({
              drill_diameter_mm: params.drill_diameter || params.diameter || params.D,
              hole_depth_mm: params.hole_depth || params.depth || params.L,
              material: params.material || "steel",
              drill_type: (params.drill_type || params.type || "carbide_twist") as DrillType,
              cutting_speed_m_min: params.cutting_speed || params.Vc || params.vc || 80,
              feed_per_rev_mm: params.feed_per_rev || params.feed || params.fn || 0.15,
              coolant_through_spindle: params.coolant_through_spindle ?? params.tsc ?? false,
            });
            break;
          }

          case "drill_cycle_optimize": {
            result = drillCycleOptimizationEngine.calculate({
              drill_diameter_mm: params.drill_diameter || params.diameter || params.D || 10,
              hole_depth_mm: params.hole_depth || params.depth || params.L || 30,
              material_chip_behavior: (params.chip_behavior || params.material_chip_behavior || "moderate") as MaterialChipBehavior,
              workpiece_hardness_hrc: params.hardness_hrc || params.hardness,
              feed_mm_rev: params.feed_per_rev || params.feed || params.fn || 0.15,
              spindle_rpm: params.spindle_rpm || params.rpm || params.N || 3000,
              is_through_hole: params.is_through_hole ?? params.through ?? true,
              coolant_delivery: (params.coolant_delivery || params.coolant || "flood_external") as CoolantDelivery,
              has_pilot_hole: params.has_pilot_hole ?? params.pilot ?? false,
              is_interrupted_cut: params.is_interrupted_cut ?? params.interrupted ?? false,
              minimum_wall_thickness_mm: params.min_wall_mm || params.wall_thickness,
              machine_rapid_mm_min: params.rapid_rate || params.rapid,
              spot_drill_used: params.spot_drill ?? true,
            });
            break;
          }

          case "coating_select": {
            result = toolCoatingSelectionEngine.calculate({
              material_class: (params.material_class || params.material || "carbon_steel") as MaterialClass,
              operation_type: (params.operation_type || params.operation || "roughing") as OperationType,
              cutting_speed_m_min: params.cutting_speed || params.Vc || params.vc,
              coolant_strategy: params.coolant_strategy as CoolantStrategy | undefined,
              workpiece_hardness_hrc: params.hardness_hrc || params.hardness,
              tool_substrate: params.tool_substrate || params.substrate,
              is_interrupted_cut: params.is_interrupted_cut ?? params.interrupted,
              requires_re_grind: params.requires_re_grind ?? params.regrind,
            });
            break;
          }

          case "geometry_select": {
            result = toolGeometrySelectionEngine.calculate({
              workpiece_material: (params.material || params.workpiece_material || "carbon_steel") as EndMillMaterial,
              operation: (params.operation || params.op || "side_milling") as MillingOperation,
              tool_diameter_mm: params.tool_diameter || params.diameter || params.D || 10,
              axial_depth_mm: params.axial_depth || params.ap,
              radial_depth_mm: params.radial_depth || params.ae,
              machine_rigidity: params.machine_rigidity || params.rigidity,
              is_long_reach: params.is_long_reach ?? params.long_reach,
              requires_chip_breaking: params.requires_chip_breaking ?? params.chip_breaker,
            });
            break;
          }

          case "insert_grade_select": {
            result = insertGradeSelectionEngine.calculate({
              workpiece_material: (params.material || params.workpiece_material || "medium_carbon_steel") as WorkpieceMaterial,
              operation: (params.operation || params.op || "medium") as TurningOp,
              depth_of_cut_mm: params.depth_of_cut || params.ap || params.doc,
              feed_mm_rev: params.feed || params.fn || params.f,
              cutting_speed_m_min: params.cutting_speed || params.Vc || params.vc,
              workpiece_hardness_hrc: params.hardness_hrc || params.hardness,
              interrupted_cut: params.interrupted_cut ?? params.interrupted,
              requires_chip_control: params.requires_chip_control ?? params.chip_control,
              coolant_available: params.coolant_available ?? params.coolant,
            });
            break;
          }

          case "coolant_recommend": {
            result = coolantStrategyEngine.calculate({
              workpiece_material: (params.material || params.workpiece_material || "carbon_steel") as CoolantMaterial,
              operation: (params.operation || params.op || "milling_rough") as CoolantStrategyOp,
              cutting_speed_m_min: params.cutting_speed || params.Vc || params.vc,
              depth_of_cut_mm: params.depth_of_cut || params.ap || params.doc,
              hole_depth_mm: params.hole_depth || params.depth,
              hole_diameter_mm: params.hole_diameter || params.diameter,
              tool_has_through_coolant: params.through_coolant ?? params.tsc,
              machine_max_pressure_bar: params.max_pressure || params.pressure,
              environmental_priority: params.environmental_priority ?? params.eco,
              workpiece_hardness_hrc: params.hardness_hrc || params.hardness,
            });
            break;
          }

          // ── Monte Carlo Simulation ──
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
            result = cuttingMechanicsEngine.merchantAnalysis(params as any);
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
            result = cuttingMechanicsEngine.craterWear(params as any);
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
            result = multiObjectiveEngine.nsgaII(params as any);
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

          // ── Gear Hobbing ──
          case "hobbing_calc": {
            const { gearHobbingEngine } = await import("../../engines/GearHobbingEngine.js");
            result = gearHobbingEngine.calculate(params as any);
            break;
          }
          case "hobbing_shift": {
            const { gearHobbingEngine } = await import("../../engines/GearHobbingEngine.js");
            result = gearHobbingEngine.shiftPlan(params as any, params.parts_per_shift ?? 100);
            break;
          }

          // ── Cryogenic Treatment ──
          case "cryo_predict": {
            const { cryogenicTreatmentEngine } = await import("../../engines/CryogenicTreatmentEngine.js");
            result = cryogenicTreatmentEngine.predict(params as any);
            break;
          }
          case "cryo_recommend": {
            const { cryogenicTreatmentEngine } = await import("../../engines/CryogenicTreatmentEngine.js");
            result = cryogenicTreatmentEngine.recommend(params.material_type, params.retained_austenite_pct ?? 10);
            break;
          }
          case "cryo_roi": {
            const { cryogenicTreatmentEngine } = await import("../../engines/CryogenicTreatmentEngine.js");
            result = cryogenicTreatmentEngine.calculateROI(params as any, params.tool_cost_usd ?? 50, params.tools_per_year ?? 100);
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
            result = bendAllowanceEngine.calculate(params as any);
            break;
          }

          // ── Anodize Allowance ──
          case "anodize_allowance": {
            const { anodizeAllowanceEngine } = await import("../../engines/AnodizeAllowanceEngine.js");
            result = anodizeAllowanceEngine.calculate(params as any);
            break;
          }

          // ── Clamping Simulation (SAFETY CRITICAL) ──
          case "clamp_simulate": {
            const { clampingSimEngine } = await import("../../engines/ClampingSimEngine.js");
            result = clampingSimEngine.simulate(params as any);
            break;
          }
          case "clamp_validate": {
            const { clampingSimEngine } = await import("../../engines/ClampingSimEngine.js");
            result = clampingSimEngine.validate(params as any);
            break;
          }
          case "clamp_optimize": {
            const { clampingSimEngine } = await import("../../engines/ClampingSimEngine.js");
            result = clampingSimEngine.optimize(params as any);
            break;
          }

          // ── Damping Optimization ──
          case "damping_optimize": {
            const { dampingOptimizationEngine } = await import("../../engines/DampingOptimizationEngine.js");
            result = dampingOptimizationEngine.optimize(params as any);
            break;
          }

          // ── Cost Estimation ──
          case "cost_estimate": {
            const { costEstimationEngine } = await import("../../engines/CostEstimationEngine.js");
            result = costEstimationEngine.estimate(params as any);
            break;
          }
          case "cost_compare_materials": {
            const { costEstimationEngine } = await import("../../engines/CostEstimationEngine.js");
            result = costEstimationEngine.compareMaterials(params.materials, params as any);
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
          case "spindle_harmonic_analysis": {
            result = spindleHarmonicsQualityEngine.analyze({
              spindle_rpm: params.spindle_rpm,
              num_flutes: params.num_flutes ?? params.number_of_teeth ?? 4,
              machine_modes: {
                natural_frequencies_Hz: params.natural_frequencies_Hz ?? [800, 1200, 2500],
                damping_ratios: params.damping_ratios,
                mode_descriptions: params.mode_descriptions,
              },
              max_harmonic_order: params.max_harmonic_order,
              bandwidth_pct: params.bandwidth_pct,
            });
            break;
          }
          case "spindle_optimal_rpm": {
            result = spindleHarmonicsQualityEngine.findOptimalRpm(
              params.num_flutes ?? params.number_of_teeth ?? 4,
              {
                natural_frequencies_Hz: params.natural_frequencies_Hz ?? [800, 1200, 2500],
                damping_ratios: params.damping_ratios,
              },
              params.rpm_min ?? 500,
              params.rpm_max ?? 15000,
              params.rpm_step,
            );
            break;
          }
          case "spindle_quality_map": {
            result = spindleHarmonicsQualityEngine.qualityMap(
              params.num_flutes ?? params.number_of_teeth ?? 4,
              {
                natural_frequencies_Hz: params.natural_frequencies_Hz ?? [800, 1200, 2500],
                damping_ratios: params.damping_ratios,
              },
              params.rpm_min ?? 500,
              params.rpm_max ?? 15000,
              params.rpm_step,
            );
            break;
          }

          // ── Wear Force Compensation ──
          case "archard_wear": {
            result = wearForceCompensationEngine.archardWear({
              cutting_speed_m_min: params.cutting_speed_m_min ?? params.cutting_speed ?? 150,
              feed_mm_rev: params.feed_mm_rev ?? params.feed ?? 0.2,
              depth_of_cut_mm: params.depth_of_cut_mm ?? params.depth ?? 2,
              workpiece_hardness_HV: params.workpiece_hardness_HV ?? 250,
              tool_hardness_HV: params.tool_hardness_HV ?? 1600,
              normal_stress_MPa: params.normal_stress_MPa,
              workpiece_type: params.workpiece_type,
              cutting_time_min: params.cutting_time_min,
            });
            break;
          }
          case "wear_force_correction": {
            result = wearForceCompensationEngine.wearForceCorrection({
              fresh_force_N: params.fresh_force_N ?? params.cutting_force_N ?? 1000,
              flank_wear_vb_mm: params.flank_wear_vb_mm ?? params.vb_mm ?? 0.2,
              tool_material: params.tool_material,
              rake_angle_deg: params.rake_angle_deg ?? params.rake_angle,
            });
            break;
          }
          case "thermal_deflection": {
            result = wearForceCompensationEngine.thermalDeflection({
              cutting_force_N: params.cutting_force_N ?? params.force ?? 500,
              tool_diameter_mm: params.tool_diameter_mm ?? params.tool_diameter ?? 10,
              tool_overhang_mm: params.tool_overhang_mm ?? params.overhang ?? 50,
              tool_material: params.tool_material ?? "carbide",
              cutting_temperature_C: params.cutting_temperature_C ?? params.temperature ?? 400,
              ambient_temperature_C: params.ambient_temperature_C,
              num_flutes: params.num_flutes ?? params.number_of_flutes,
            });
            break;
          }

          // ── Advanced Chip Thickness ──
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
          case "feed_optimize": {
            const { feedOptimizationEngine } = await import("../../engines/FeedOptimizationEngine.js");
            result = feedOptimizationEngine.optimizeFeed({
              baseFeed: params.base_feed ?? params.baseFeed ?? 1000,
              aggressiveness: params.aggressiveness ?? params.level,
              toolDiameter: params.tool_diameter ?? params.toolDiameter,
              radialEngagement: params.radial_engagement ?? params.ae,
              currentDepth: params.current_depth ?? params.currentDepth,
              fullDepth: params.full_depth ?? params.fullDepth,
              cornerRadius: params.corner_radius ?? params.cornerRadius,
              maxGForce: params.max_g_force ?? params.maxG,
              arcRadius: params.arc_radius ?? params.arcRadius,
              isInsideArc: params.is_inside_arc ?? params.isInsideArc,
            });
            break;
          }
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
            action, error: (error as any)?.message?.slice(0, 200),
          }, { category: "calculation", priority: "high", source: "calcDispatcher" });
        } catch { /* best-effort */ }
        return dispatcherError(error, action, "prism_calc");
      }
    }
  );
}