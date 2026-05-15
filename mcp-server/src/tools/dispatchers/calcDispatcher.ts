import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { hookExecutor, type HookPhase } from "../../engines/HookExecutor.js";
// HM-REV-MS1: Lazy-cached HyperMILL MaterialBridge (class-only export, cached after first use)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _hmMatBridge: any = null;
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
import { logActionTelemetry } from "../../utils/actionTelemetry.js";
import { safeFunctionEval } from "../../utils/safeMathEval.js";

/** Zod-validated params — dispatcher validates via ACTION_CALC_SCHEMAS before engine calls.
 *  Type is `any` because Zod runtime validation guarantees shape correctness; static types
 *  for 1100+ action variants would be impractical and duplicate the schema definitions. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ValidatedParams = any;

/**
 * Extract domain-specific key values per calc type for summary-level responses.
 * Each calc type returns only the most critical metrics (~50-100 tokens).
 *
 * @param action - The calc action name (e.g. "cutting_force", "tool_life", "speed_feed")
 * @param result - Raw engine result object with domain-specific fields
 * @returns Compact key-value map of the most important metrics for the given action
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
    case "power": case "power_torque":
      return { power_kW: result.power_spindle_kw ?? result.power, torque_Nm: result.torque_nm ?? result.torque, safe: result.safe };
    case "torque":
      return { torque_Nm: result.torque_nm ?? result.torque, safe: result.safe };
    case "chip_load":
      return { hex_mm: result.hex_mm, chip_load_ok: result.chip_load_ok };
    case "stability":
      return { stable: result.is_stable, critical_depth_mm: result.critical_depth };
    case "deflection":
      return { deflection_mm: result.static_deflection, safe: (result.safety_factor ?? 0) >= 2.0 };
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
    case "spindle_torque_available":
      return { torque_Nm: result.available_torque_Nm, power_kW: result.available_power_kW, region: result.region, base_speed: result.base_speed_rpm };
    case "spindle_check_cut":
      return { torque_ok: result.torque_ok, power_ok: result.power_ok, torque_margin: result.torque_margin_pct, power_margin: result.power_margin_pct, limiting: result.limiting_factor };
    case "spindle_max_mrr":
      return { mrr: result.max_mrr_cm3_per_min, max_ap: result.max_ap_mm, max_ae: result.max_ae_mm, limiting: result.limiting_factor, util_pct: result.spindle_utilization_pct };
    case "spindle_plot_curve":
      return { points: result.curve?.length, base_speed: result.base_speed_rpm, peak_torque: result.peak_torque_Nm, peak_power: result.peak_power_kW };
    case "spindle_recommend_rpm":
      return { feasible: result.feasible, rpm_range: result.rpm_range, optimal: result.optimal_rpm };
    case "thin_wall_params":
      return { ap_mm: result.recommended_ap_mm?.value, ae_mm: result.recommended_ae_mm?.value, fz_mm: result.recommended_fz_mm?.value, deflection_mm: result.wall_deflection_mm?.value, safe: result.deflection_safe, strategy: result.strategy };
    case "thin_wall_deflection":
      return { deflection_mm: result.static_deflection_mm?.value, force_N: result.cutting_force_N?.value, safety_factor: result.safety_factor?.value, safe: result.is_safe };
    case "thin_wall_strategy":
      return { risk: result.overall_risk, summary: result.summary };
    case "thin_wall_frequency":
      return { fn_Hz: result.natural_freq_Hz?.value, ft_Hz: result.tooth_passing_freq_Hz?.value, chatter_risk: result.chatter_risk };
    case "tool_deflection_predict":
      return { deflection_um: result.static_deflection_um?.value, error_um: result.dimensional_error_um?.value, stress_MPa: result.max_bending_stress_MPa?.value, safety_factor: result.safety_factor?.value, max_overhang_mm: result.max_recommended_overhang_mm?.value, within_tol: result.within_tolerance, safe: result.is_safe };
    case "chip_formation":
      return { shear_angle_deg: result.shear_angle_deg?.value, compression_ratio: result.chip_compression_ratio?.value, chip_type: result.chip_type, bue_risk: result.bue_risk, breakability: result.chip_breakability, safe: result.is_safe };
    case "chip_diagnose":
      return { type: result.prediction?.predicted_type, shape: result.prediction?.predicted_shape, shear_deg: result.merchant_shear_deg, health: result.diagnosis?.health, issues: result.diagnosis?.issues?.length || 0, warnings: result.warnings?.length || 0 };
    case "piispanen_shear_strain":
      return { shear_strain: result.shear_strain?.value, chip_thickness_ratio: result.chip_thickness_ratio?.value, velocity_ratio: result.velocity_ratio?.value };
    case "zorev_stress_distribution":
      return { sigma_max_MPa: result.max_normal_stress_MPa?.value, sticking_mm: result.sticking_length_mm?.value, sliding_mm: result.sliding_length_mm?.value, crater_risk: result.crater_wear_risk, profile_points: result.stress_profile?.length || 0 };
    case "thick_shear_zone":
      return { V_s_mps: result.shear_velocity_mps?.value, strain_rate_per_s: result.strain_rate_per_s?.value, shear_strain: result.shear_strain?.value, delta_mm: result.zone_thickness_mm?.value };
    case "uts_based_force":
      return { Ft_N: result.tangential_force_N?.value, torque_Nm: result.spindle_torque_Nm?.value, power_kW: result.spindle_power_kW?.value, teeth_engaged: result.teeth_engaged?.value, wear_factor: result.wear_factor_used?.value };
    case "helix_angle_force_decomposition":
      return { Fa_N: result.axial_force_N?.value, Fr_N: result.radial_force_N?.value, axial_ratio: result.axial_ratio?.value, radial_ratio: result.radial_ratio?.value, deflection_tendency: result.deflection_tendency };
    case "coolant_lifecycle":
      return { interval_days: result.optimal_change_interval_days, cost_per_day: result.total_cost_per_day, health: result.health_at_horizon, makeup_L_day: result.makeup_volume_L_per_day, warnings: result.warnings?.length || 0 };
    case "standards_check_compliance":
      return { compliant: result.compliant, checks: result.standard_checks?.length || 0, non_conformances: result.non_conformances?.length || 0, docs: result.required_documentation?.length || 0 };
    case "standards_get_requirements":
      return { industry: result.industry, process: result.process_type, requirements: result.requirements?.length || 0 };
    case "standards_suggest":
      return { standards: result.standards?.length || 0, top: result.standards?.[0]?.standard };
    case "test_protocol_tool_life":
      return { speeds: result.protocol?.speeds_mpm?.length || 0, tools_needed: result.total_tools_needed, hours: result.estimated_time_hours };
    case "test_protocol_surface":
      return { cutoff_mm: result.measurement_params?.cutoff_mm, samples: result.sample_size, max_Ra: result.acceptance_criteria?.max_Ra_um };
    case "test_protocol_dimensional":
      return { conformance: result.conformance_zone_mm, gauge_rr: result.gauge_R_R_required };
    case "cert_track_material":
      return { compliant: result.compliant, cert_valid: result.cert_valid, deviations: result.deviations?.length || 0 };
    case "cert_track_tool":
      return { status: result.cert_status, days: result.days_remaining, recert: result.recertification_needed };
    case "cert_track_machine":
      return { status: result.cal_status, days_due: result.days_until_due, in_spec: result.in_spec, worst: result.worst_axis };
    case "cert_audit_report":
      return { tracked: result.items_tracked, compliant: result.items_compliant, nc: result.items_non_conformant, actions: result.action_items?.length || 0 };
    case "error_budget":
      return { rss_um: result.rss_total_um, worst_um: result.worst_case_total_um, meets_tol: result.meets_tolerance, utilization_pct: result.budget_utilization_pct, thermal_um: result.thermal_contribution_um };
    case "capability_predict":
      return { cp: result.cp, cpk: result.cpk, sigma_um: result.sigma_total_um, meets: result.meets_target, ppm: result.parts_per_million_defect, top: result.top_contributor };
    case "stochastic_wear":
      return { mean_min: result.taylor_life?.mean_min, std_min: result.taylor_life?.std_min, p90_replace: result.replacement_interval_p90, weibull_b: result.taylor_life?.weibull_beta, driver: result.top_uncertainty_driver };
    case "stochastic_dimension":
      return { cpk: result.overall_cpk, sigma_um: result.overall_sigma_um, pct_spec: result.pct_in_spec, first_oos: result.first_oos_part, corr_interval: result.recommended_correction_interval };
    case "stochastic_deflection":
      return { mean_um: result.deflection?.mean_um, std_um: result.deflection?.std_um, p_exceed: result.probability_exceed_limit, stiffness: result.effective_stiffness_N_per_um };
    case "variability_pipeline":
      return { cpk: result.cpk, risk: result.risk_level, sigma_um: result.sigma_total_um, ppm: result.ppm_defect, dominant: result.dominant_source };
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
    case "chip_thinning_compensation":
      return { fz: result?.compensated_feed_per_tooth_mm, factor: result?.compensation_factor, hex: result?.effective_chip_thickness_mm, applied: result?.compensation_applied, multiplier: result?.feedrate_multiplier };
    case "tolerance_analysis":
      return { tolerance_um: result.tolerance_um, grade: result.grade_label, nominal_mm: result.nominal_mm };
    case "fit_analysis":
      return { fit_type: result.fit_type, min_clearance_mm: result.min_clearance_mm, max_clearance_mm: result.max_clearance_mm };
    case "hypermill_material_lookup":
      return { found: result.found, iso_group: result.iso_group, match_field: result.match_field, confidence: result.confidence };
    case "hypermill_machinability":
      return { operation: result.operation, factor_vc: result.factor_vc, factor_fz: result.factor_fz, chipping_class_name: result.chipping_class_name };
    case "hypermill_diameter_sf":
      return { vc_m_min: result.vc_m_min, fz_mm: result.fz_mm, material: result.material, interpolated: result.interpolated };
    case "hypermill_material_search":
      return { total: result.total, materials: result.materials?.length };
    case "hypermill_material_stats":
      return { total: result.total_materials, with_factors: result.with_correction_factors, chipping_classes: result.chipping_classes };
    case "iso286_extended_it":
      return { tolerance_um: result.tolerance_um, grade_label: result.grade_label, extended: result.extended };
    case "iso286_extended_fit":
      return { fit_type: result.fit_type, min_clearance_um: result.min_clearance_um, max_clearance_um: result.max_clearance_um, overlap_um: result.overlap_um };
    case "iso286_stochastic_fit":
      return { fit_type: result.fit_type, p_clearance: result.p_clearance, p_interference: result.p_interference, clearance_mean_um: result.clearance_mean_um };
    case "iso286_recommend_fit":
      return { recommended_fit: result.recommended_fit, fit_type: result.fit_type, application: result.application };
    case "iso286_variability_stack":
      return { mean_mm: result.mean_mm, wc_tolerance_mm: result.wc_tolerance_mm, mc_tolerance_mm: result.mc_tolerance_mm, cpk_at_wc: result.cpk_at_wc };
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
    case "thread_strength_fatigue":
      return { shear_area_mm2: result.shear_area_mm2, pullout_force_n: result.pullout_force_N ?? result.pullout_force_n, safety_factor: result.safety_factor, fatigue_ratio: result.fatigue_safety_ratio };
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
    case "chatter_multi_frequency":
      return { max_stable_depth_mm: result.max_stable_depth_mm, optimal_rpm: result.optimal_rpm, improvement_vs_zoa_pct: result.improvement_vs_zoa_pct, immersion_ratio: result.immersion_ratio, lobes: result.lobes?.length };
    case "sle_predict":
      return { sle_um: result.sle_um, phase_deg: result.phase_deg, risk: result.risk, ratio_to_natural: result.ratio_to_natural };
    case "sle_optimize_rpm":
      return { best_rpm: result.best_rpm, worst_rpm: result.worst_rpm, optimal_rpms: result.optimal_rpms?.length };
    case "sle_combined_finish":
      return { Ra_total_um: result.Ra_total_um, Ra_kinematic_um: result.Ra_kinematic_um, sle_um: result.sle_um, dominant_source: result.dominant_source };
    case "rcsa_predict_frf":
      return { natural_freq_Hz: result.natural_freq_Hz, stiffness_N_per_m: result.stiffness_N_per_m, damping_ratio: result.damping_ratio, dynamic_stiffness_N_per_um: result.dynamic_stiffness_N_per_um };
    case "rcsa_compare":
      return { better_for_stability: result.better_for_stability, stiffness_ratio: result.stiffness_ratio };
    case "rcsa_suggest_length":
      return { optimal_stickout_mm: result.optimal_stickout_mm, stability_margin: result.stability_margin, avoided_resonances: result.avoided_resonances?.length };
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
    case "kalman_filter":
      return { result: `Kalman ${result.mode}: ${result.filtered_states.length} steps, final=[${result.state_summary.final_state.map((v:number)=>v.toFixed(2)).join(',')}], converged=${result.state_summary.convergence_steps}` };
    case "amsaa_reliability_growth":
      return { result: `AMSAA β=${result.value.beta.value.toFixed(3)} (${result.value.growth_trend}), MTBF inst=${result.value.instantaneous_mtbf.value.toFixed(1)}hr, cum=${result.value.cumulative_mtbf.value.toFixed(1)}hr` };
    case "chance_constrained_optimize":
      return { result: `CC-Opt obj=${result.value.objective_value.toFixed(3)}, constraints=${result.value.constraint_satisfaction.filter((c:any)=>c.satisfied).length}/${result.value.constraint_satisfaction.length} met, margin=${result.value.robust_margin.toFixed(1)}` };
    case "acoustic_emission_monitor":
      return { result: `AE Monitor: ${result.value.features.length} segments, condition=${result.value.tool_condition.state} (${(result.value.tool_condition.confidence*100).toFixed(0)}%), trend=${result.value.trend.trend_direction}` };
    case "sensor_validate":
      return { result: `Sensor: ${result.value.valid ? "VALID" : "INVALID"}, ${result.value.validated_count} samples, ${result.value.errors.length} errors` };
    case "sensor_simulate":
      return { result: `Sim: ${result.value.samples.length} samples, mean=${result.value.statistics.mean.toFixed(2)}, σ=${result.value.statistics.std_dev.toFixed(2)}` };
    case "sensor_fuse":
      return { result: `EKF Fusion: ${result.value.fused_states.length} states, wear=${(result.value.estimated_wear*100).toFixed(1)}%, trend=${result.value.force_trend}` };
    case "sensor_anomaly_detect":
      return { result: `Anomaly: ${result.value.overall_status}, ${result.value.anomalies.length} events, ${result.value.method_summaries.filter((m:any)=>m.triggered).length}/${result.value.method_summaries.length} triggered` };
    case "sensor_status":
      return { result: `Status: ${result.value.sensor_count} sensors, ${result.value.total_samples} total samples` };
    case "stochastic_force":
      return { result: `StochForce: μ=${result.value.mean_force_n.toFixed(1)}N σ=${result.value.std_dev_n.toFixed(1)}N CV=${result.value.cv_percent.toFixed(1)}%` };
    case "stochastic_tool_life":
      return { taylor_min: result?.taylor_life_min, weibull_mean: result?.weibull?.mean_min, weibull_beta: result?.weibull?.beta, p10_min: result?.p10_life_min };
    case "stochastic_thermal":
      return { result: `StochTherm: μ=${result.value.mean_temp_c.toFixed(0)}°C σ=${result.value.std_dev_c.toFixed(0)}°C` };
    case "stochastic_finish":
      return { theory_um: result?.theoretical_ra_um, mean_um: result?.mean_ra_um, std_um: result?.std_dev_um, p95: result?.p95_ra_um, cpk: result?.cpk_ra };
    case "stochastic_chatter":
      return { result: `StochChatter: safe=${result.value.summary.max_safe_depth_mm.toFixed(2)}mm` };
    case "uncertainty_pipeline":
      return { result: `UQ: ${result.value.stages.length} stages, bottleneck=${result.value.bottleneck_stage}` };
    case "am_melt_pool":
      return { result: `MeltPool: w=${result.value.width_mm.toFixed(3)}mm d=${result.value.depth_mm.toFixed(3)}mm` };
    case "am_bead_overlap": case "am_solidification": case "am_thermal_stress": case "am_scan_strategy": case "am_process_window":
      return { result: JSON.stringify(result.value).slice(0, 200) };
    case "rbd_analyze_system":
      return { result: `RBD: R_sys=${result.value.system_reliability.toFixed(4)}` };
    case "rbd_fault_tree": case "rbd_importance": case "rbd_monte_carlo": case "rbd_redundancy": case "rbd_availability":
      return { result: JSON.stringify(result.value).slice(0, 200) };
    case "cryo_heat_transfer":
      return { result: `CryoHT: h=${result.value.heat_transfer_coeff_W_m2K.toFixed(0)} W/m²K` };
    case "cryo_tool_life":
      return { result: `CryoLife: ${result.value.cryo_tool_life_min.toFixed(1)}min (${result.value.improvement_factor.toFixed(1)}×)` };
    case "cryo_forces": case "cryo_surface_integrity": case "cryo_delivery_optimize": case "cryo_mql":
      return { result: JSON.stringify(result.value).slice(0, 200) };
    case "acoustics_cutting_noise":
      return { result: `Noise: ${result.value.Lp_dBA.toFixed(1)} dB(A)` };
    case "acoustics_hearing_protection":
      return { result: `TWA=${result.value.twa_dBA.toFixed(1)}dBA, NRR=${result.value.required_NRR}` };
    case "acoustics_machine_noise": case "acoustics_shop_floor": case "acoustics_noise_control": case "acoustics_chatter_noise":
      return { result: JSON.stringify(result.value).slice(0, 200) };
    case "laser_ablation_depth":
      return { result: `Ablation: ${result.value.depth_per_pulse_um.toFixed(2)}µm/pulse, ${result.value.regime}` };
    case "laser_removal_rate": case "laser_haz": case "laser_drilling": case "laser_pulse_overlap": case "laser_plasma_shielding":
      return { result: JSON.stringify(result.value).slice(0, 200) };
    case "diamond_turning_surface":
      return { result: `SPDT Ra=${result.value.Ra_nm.toFixed(1)}nm, dominant: ${result.value.dominant_contributor}` };
    case "diamond_turning_forces":
      return { result: `Fc=${result.value.Fc_mN.toFixed(3)}mN, Ft=${result.value.Ft_mN.toFixed(3)}mN, ductile=${result.value.ductile_regime}` };
    case "diamond_turning_wear":
      return { result: `Wear: ${result.value.edge_recession_um.toFixed(4)}µm, type=${result.value.wear_type}, life=${result.value.remaining_life_km.toFixed(1)}km` };
    case "diamond_turning_machine_config":
      return { result: `Config: ${result.value.spindle_type}, ${result.value.feedback}, ±${result.value.temperature_control_C}°C` };
    case "laser_interferometer_wavelength":
      return { result: `n=${result.value.refractive_index.toFixed(10)}, correction=${result.value.correction_ppm.toFixed(3)}ppm` };
    case "laser_interferometer_comp_table":
      return { result: `CompTable: ${result.value.compensation_table.length} pts, backlash=${result.value.backlash_um.toFixed(3)}µm, acc=${result.value.accuracy_um.toFixed(3)}µm` };
    case "laser_interferometer_plan":
      return { result: `Plan: ${result.value.num_points} pts @ ${result.value.spacing_mm}mm, ~${result.value.total_time_min}min` };
    case "laser_interferometer_deadpath":
      return { result: `Deadpath: ${result.value.deadpath_error_um.toFixed(4)}µm, correction=${result.value.correction_needed}` };
    case "assembly_sequence":
      return { result: `Assembly: ${(result.value?.optimal_sequence ?? []).join('→')}` };
    case "assembly_tolerance_stack": case "assembly_line_balance": case "assembly_peg_in_hole":
    case "assembly_time_estimate": case "assembly_dfa_score":
      return { result: JSON.stringify(result.value).slice(0, 200) };
    case "harvest_piezo":
      return { result: `Piezo: ${result.value?.power_mW?.toFixed(2) ?? '?'}mW` };
    case "harvest_thermo": case "harvest_em": case "harvest_process_budget":
    case "harvest_hybrid": case "harvest_roi":
      return { result: JSON.stringify(result.value).slice(0, 200) };
    case "transfer_machine_similarity":
      return { result: `Similarity: ${(result.value?.similarity_score * 100)?.toFixed(1)}%` };
    case "transfer_scale_params": case "transfer_gp": case "transfer_material":
    case "transfer_bayesian_update": case "transfer_validate":
      return { result: JSON.stringify(result.value).slice(0, 200) };
    case "cmm_uncertainty_budget":
      return { result: `U=${result.value?.expanded_uncertainty_mm?.toFixed(4)}mm (k=${result.value?.coverage_factor_k})` };
    case "cmm_plan_path": case "cmm_sampling_strategy": case "cmm_datum_alignment":
    case "cmm_acceptance_test": case "cmm_feature_uncertainty":
      return { result: JSON.stringify(result.value).slice(0, 200) };
    case "lam_force_reduction":
      return { result: `LAM: ${result.value?.force_reduction_pct?.toFixed(1)}% force reduction` };
    case "lam_preheat_profile": case "lam_tool_life": case "lam_optimal_spacing":
    case "lam_process_window": case "lam_economics":
      return { result: JSON.stringify(result.value).slice(0, 200) };
    case "sf_orchestrate": case "sf_quick":
      return { result: `S/F: Vc=${result.value?.cutting_speed_mpm?.toFixed(0)}m/min fz=${result.value?.feed_per_tooth_mm?.toFixed(3)}mm` };
    case "tool_library_add": case "tool_library_import_csv": case "tool_library_filter": case "tool_library_stats":
      return { result: JSON.stringify(result.value).slice(0, 200) };
    case "geometry_job_plan":
      return { result: `Job: ${result.value?.operations?.length ?? '?'} ops, ${result.value?.total_time_min?.toFixed(1) ?? '?'}min` };
    case "physics_verify":
      return { verdict: result.verdict, divergence_pct: result.divergence?.overall_pct, worst_path: result.divergence?.worst_path, worst_metric: result.divergence?.worst_metric, paths_ok: result.paths?.filter((p: any) => p.status === "ok").length };
    case "what_if_analyze":
      return { result: result.value?.impact_summary ?? JSON.stringify(result.value).slice(0, 200) };
    case "consistency_check":
      return { verdict: result.verdict, max_divergence_pct: result.max_divergence_pct, warnings_count: result.warnings?.length ?? 0, auto_action: result.auto_action };
    case "consistency_summary":
      return { total: result.total_checks, consistent: result.consistent, minor: result.minor_divergences, major: result.major_divergences, avg_div: result.avg_max_divergence_pct };
    case "part_similarity_compare":
      return { overall: result.overall, breakdown: result.breakdown };
    case "part_similarity_find_nearest":
      return { top_match: result[0]?.id, top_score: result[0]?.score, count: result.length };
    case "part_similarity_batch":
      return { pairs: result.length, top_pair: result[0]?.id_a + "/" + result[0]?.id_b, top_score: result[0]?.score };
    case "part_similarity_set_weights":
      return { weights: result };
    case "adaptive_pipeline_generate":
      return { pipeline_id: result.pipeline_id, total_steps: result.total_steps, confidence: result.overall_confidence, cycle_sec: result.estimated_cycle_time_sec, warnings: result.warnings?.length };
    case "adaptive_pipeline_adapt_step":
      return { operation: result.operation_type, adaptation: result.adaptation_type, confidence: result.confidence, cycle_sec: result.estimated_cycle_time_sec };
    case "adaptive_pipeline_preview":
      return { total_steps: result.total_steps, confidence: result.overall_confidence, warnings: result.warnings?.length };
    case "sampling_feasibility":
      return { constraints: result.context?.constraints?.length, questions: result.context?.openQuestions?.length, setups: result.context?.estimatedSetups };
    case "sampling_cam_strategy":
      return { top_strategy: result.rankedStrategies?.[0]?.name, score: result.rankedStrategies?.[0]?.score, count: result.rankedStrategies?.length };
    case "sampling_post_processor":
      return { dialect: result.bestMatch?.dialect, confidence: result.bestMatch?.confidence, alternatives: result.alternatives?.length };
    case "sampling_print_to_program":
      return { steps: result.chain?.length, dialect: result.metadata?.controllerDialect, material: result.metadata?.isoGroup };
    case "sampling_self_correct_sf":
      return { converged: result.convergence?.converged, iterations: result.convergence?.iterations, rpm: result.finalParams?.rpm, tool_life: result.finalParams?.toolLife_min };
    case "sdk_optimize_sf":
      return { rpm: result.rpm, feed: result.feedRate_mmMin, power_kW: result.power_kW, tool_life: result.toolLife_min, confidence: result.confidence, warnings: result.warnings?.length || 0 };
    case "sdk_check_safety":
      return { safe: result.safe, score: result.score, issues: result.issues?.length || 0 };
    case "pipeline_safety_assess":
      return { risk_level: result.risk_level, vetoed: result.vetoed, Fc_N: result.computed?.Fc_N, power_kW: result.computed?.power_kW, escalation: result.escalation_actions?.length || 0 };
    case "pipeline_safety_veto":
      return { vetoed: result.vetoed, reasons: result.reasons?.length || 0, escalation: result.escalation_actions?.length || 0 };
    case "pipeline_safety_batch":
      return { overall_risk: result.overall_risk, total: result.total, vetoed_count: result.vetoed_operations?.length || 0, counts: result.counts };
    case "safety_veto_check":
      return { vetoed: result.vetoed, rule: result.rule, original_value: result.original_value, limit: result.limit, escalation_action: result.escalation_action };
    case "safety_veto_all":
      return { vetoed: result.vetoed, active_vetos: result.active_vetos?.length || 0, rules_fired: result.active_vetos?.map((v: any) => v.rule) };
    case "safety_veto_escalate":
      return { resolved: result.resolved, iterations: result.iterations, remaining_vetos: result.remaining_vetos, final_ap_mm: result.final_params?.ap_mm, final_fz_mm: result.final_params?.fz_mm };
    case "superalloy_analyze":
      return { Fc_N: result.cutting_force_N, temp_C: result.temperature_C, life_min: result.tool_life_min, learning: result.learning_model_used, taylor_life: result.extended_taylor_life };
    case "ceramics_fracture":
      return { fracture_prob: result.fracture_probability, safety_factor: result.safety_factor, bayesian: result.bayesian_model_used, updated_prob: result.updated_fracture_probability };
    case "magnesium_fire_risk":
      return { fire_risk: result.fire_risk, risk_score: result.risk_score, temp_C: result.chip_temperature_C, bayesian: result.bayesian_model_used, p_ignition: result.probability_exceeds_ignition };
    case "composites_tsai_hill":
      return { delamination_risk: result.delamination_risk, tsai_hill: result.tsai_hill_index, thrust_N: result.critical_thrust_force_N, sigma1: result.stress_components?.sigma1_MPa };
    case "composites_fiber_pullout":
      return { pullout_mm: result.pullout_length_mm, quality_impact: result.surface_quality_impact, damage_zone_mm: result.fiber_damage_zone_mm, matrix_crack_risk: result.matrix_cracking_risk };
    case "composites_optimize_cutting":
      return { speed_mpm: result.optimal_speed_mpm, feed_mm: result.optimal_feed_mm, mrr: result.mrr_cm3_per_min, delamination: result.delamination_risk, Ra_um: result.expected_Ra_um };
    case "honing_design":
      return { Ra: result.expected_Ra, cycle_sec: result.expected_cycle_time_sec, crosshatch: result.crosshatch_angle, rpm: result.rotation_rpm, pressure_bar: result.expansion_pressure_bar };
    case "honing_stone_select":
      return { stone: result.stone_type, grit: result.grit_size, reasoning: result.reasoning?.slice(0, 80) };
    case "honing_plateau":
      return { Rk: result.expected_profile?.Rk, Rpk: result.expected_profile?.Rpk, Rvk: result.expected_profile?.Rvk, Mr1: result.expected_profile?.Mr1, Mr2: result.expected_profile?.Mr2 };
    case "burnishing_predict":
      return { Ra_um: result.final_Ra_um, hardness_HRC: result.hardness_increase_HRC, residual_MPa: result.residual_stress_MPa, depth_mm: result.depth_of_effect_mm };
    case "lapping_predict":
      return { rate_um_min: result.removal_rate_um_per_min, time_min: result.time_to_target_min, flatness_um: result.expected_flatness_um, Ra_um: result.surface_Ra_um };
    case "polishing_predict":
      return { time_min: result.estimated_time_min, cost: result.cost_estimate, Ra_um: result.achievable_Ra_um, steps: result.steps?.length };
    case "sdk_suggest_tool":
      return { topPick: result.topPick?.name, manufacturer: result.topPick?.manufacturer, count: result.tools?.length || 0 };
    case "sdk_get_tip":
      return { count: result.count, top_tip: result.tips?.[0]?.text?.slice(0, 80) };
    case "sdk_batch":
      return { count: result.results?.length || 0, totalTime_ms: result.totalTime_ms };
    case "physics_fusion":
      return { Fc_N: result.Fc_N, power_kW: result.power_kW, tier: result.fusion_detail?.tier_executed, confidence: result.fusion_detail?.overall_confidence, iterations: result.fusion_detail?.total_iterations, time_ms: result.fusion_detail?.compute_time_ms };
    case "force_capability_analyze":
      return { feasible: result.value?.feasible, power_pct: result.value?.power_utilization_pct, torque_pct: result.value?.torque_utilization_pct, deflection_um: result.value?.deflection_um, limiting: result.value?.limiting_factor };
    case "force_capability_check_sequence":
      return { feasible: result.value?.feasible, power_pct: result.value?.total_power_utilization_pct, torque_pct: result.value?.total_torque_utilization_pct, thermal_um: result.value?.thermal_growth_um, wear_increase_pct: result.value?.wear_force_increase_pct, limiting_op: result.value?.limiting_operation };
    // ── SCIMATH-MS0: Linear Algebra & Matrix Methods ──
    case "svd_decompose":
      return { rank: result.rank, conditionNumber: result.conditionNumber, sigma_count: result.sigma?.length };
    case "qr_factorize":
      return { rows: result.Q?.length, cols: result.R?.[0]?.length, rank: result.rank };
    case "cholesky_factor":
      return { size: result.L?.length, variant: result.variant };
    case "eigen_solve":
      return { count: result.eigenvalues?.length, converged: result.converged };
    case "sparse_solve":
      return { bandwidth_before: result.bandwidthBefore, bandwidth_after: result.bandwidthAfter };
    case "iterative_solve":
      return { converged: result.converged, iterations: result.iterations, residual: result.relativeResidual };
    case "matrix_norms":
      return { frobenius: result.frobenius, spectral: result.spectral, conditionNumber: result.conditionNumber };
    case "matrix_factorize":
      return { components: result.W?.length || result.L?.length };
    case "tensor_stress_invariants":
      return { I1: result.I1, I2: result.I2, I3: result.I3, vonMises: result.vonMises };
    case "system_identify":
      return { numParams: result.theta?.length || result.order };
    case "robust_regression":
      return { method: result.method, r2: result.r2, numCoeffs: result.coefficients?.length };
    case "random_matrix_noise_floor":
      return { numSignals: result.numSignals, noiseVariance: result.noiseVariance, threshold: result.threshold };
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
  "mrr", "power", "torque", "power_torque", "chip_load", "stability", "deflection", "thermal",
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
  "chip_thinning_compensation",
  "tool_deflection_predict", "chip_formation", "specific_cutting_energy",
  "roughness_convert", "peck_drill_optimize",
  "drill_cycle_optimize", "coating_select",
  "workpiece_deflection_compensate",
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
  "tool_select_recommend", "tool_select_compare", "tool_select_alternatives", "tool_unified_search", "tool_collision_query", "tool_find_optimal",
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
  "thread_parse", "thread_tap_drill", "thread_mill_params", "thread_stripping", "thread_strength_fatigue",
  "tool_breakage_predict", "tool_stress_analyze", "tool_safe_limits",
  "spindle_torque_check", "spindle_power_check", "spindle_safe_envelope",
  "coolant_validate", "coolant_flow_check", "coolant_chip_evacuation",
  "hobbing_calc", "hobbing_shift",
  "cryo_predict", "cryo_recommend", "cryo_roi",
  "hardness_convert", "hardness_batch", "helix_angle_force_decomposition",
  "standard_dimension_lookup", "standard_dimension_apply",
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
  "fixture_design_recommend", "fixture_design_validate", "fixture_clamp_force", "fixture_clamp_contact_stress", "fixture_deflection_calc",
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
  "calc_energy_analyze", "calc_energy_optimize", "energy_compare",
  // ── ENGINE-WIRE-CALC/U-WIRE-CALC-SCE: SpecificCuttingEnergyEngine ──
  "calc_specific_cutting_energy",
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
  // ── Chatter/Dynamics Enhancements (Altintas/Budak, Schmitz) ──
  "chatter_multi_frequency",
  "sle_predict", "sle_optimize_rpm", "sle_combined_finish",
  "rcsa_predict_frf", "rcsa_compare", "rcsa_suggest_length",
  "monte_carlo_process",
  "doe_taguchi",
  "fixture_clamping",
  "springback_predict",
  "gdt_stackup",
  "runout_effect",
  "process_digital_twin",
  "process_robustness",
  "kalman_filter",
  "amsaa_reliability_growth",
  "chance_constrained_optimize",
  "acoustic_emission_monitor",
  "sensor_validate", "sensor_simulate", "sensor_fuse", "sensor_anomaly_detect", "sensor_status",
  "stochastic_force", "stochastic_tool_life", "stochastic_thermal", "stochastic_finish", "stochastic_chatter", "uncertainty_pipeline",
  // ── Blocked-action fix: 101 actions with switch-case handlers but missing from ACTIONS array ──
  // Optimization (ACO/GA/DE/SA/PSO/RL/Swarm)
  "aco_optimize", "aco_sequence_features", "aco_sequence_holes", "aco_sequence_with_tools",
  "de_optimize", "ga_optimize", "pso_optimize", "sa_optimize", "sa_optimize_sequence",
  "swarm_neural_optimize", "rl_create_agent",
  // Adaptive & Trochoidal Machining
  "adaptive_feedrate", "adaptive_optimize_trochoidal", "adaptive_trochoidal",
  "trochoidal_engagement_profile", "trochoidal_feed_adjust",
  "constant_chip_load", "optimal_stepover",
  // Chip & Cutting Analysis
  "ball_nose_chip", "chip_thickness_analyze", "chip_thinning_lookup", "round_insert_chip",
  "corner_engagement_analyze", "corner_feed", "corner_feed_adjust", "curved_boundary_engagement",
  "engagement_validate", "validate_entry",
  // Bayesian Tool Life
  "bayesian_tool_life_predict", "bayesian_tool_life_replacement",
  // Thermal Cutting
  "cutting_thermal_interface", "cutting_thermal_partition", "cutting_thermal_shear",
  "thermal_expansion", "thermal_machine_error",
  // SPC & DOE
  "spc_cpk", "spc_imr_chart", "spc_xbar_r_chart", "doe_analyze",
  // Time Series
  "time_series_decompose", "time_series_forecast", "time_series_seasonality", "time_series_smooth",
  // Topology & Mesh
  "topology_homology", "topology_persistence", "topology_validate_features",
  "mesh_decimate", "voxel_init", "voxel_remove_path", "voxelize_mesh",
  // B-Spline & Surface
  "bspline_curve_evaluate", "bspline_surface_evaluate", "bspline_surface_normal",
  "surface_reconstruct",
  // Spatial Data Structures
  "kdtree_nearest", "kdtree_radius", "octree_radius",
  // Tessellation
  "tessellation_calculate_segments", "tessellation_subdivide",
  // CAD Construction & Sketch
  "construction_axis_2pt", "construction_offset_plane", "construction_plane_3pt", "construction_point_3planes",
  "sketch_apply_constraint", "sketch_geometry",
  // Solid Operations
  "solid_move", "solid_press_pull", "solid_scale",
  "chamfer_edges", "fillet_edges", "fillet_preview", "fillet_variable",
  // Feature Recognition
  "feature_detect_interactions", "feature_minimize_setups", "feature_precedence_graph",
  // Toolpath & Machining Strategy
  "entry_strategy", "exit_strategy", "island_approach", "moat_calculate",
  "rest_machining_levels", "z_level_optimize",
  "toolpath_link_optimize", "toolpath_link_time",
  // Multi-Axis
  "jacobian_5axis", "multiaxis_gouge_check", "multiaxis_tool_axis",
  "config_singularity_check", "singularity_detect",
  // Bottleneck & OEE
  "bottleneck_identify", "oee_calculate",
  // Nesting & Tolerance
  "tolerance_stack",
  // XAI / Explainability
  "xai_lime", "xai_permutation_importance", "xai_shap",
  // Clustering
  "cluster_kmedoids", "cluster_meanshift", "cluster_silhouette",
  // Waterjet & Shot Peening
  "waterjet_params", "shot_peening",
  // Troubleshoot
  "troubleshoot",
  "troubleshoot_start", "troubleshoot_answer", "troubleshoot_quick", "troubleshoot_common",
  // ── CNC/Machining calculators (30 engines) ──
  "cutting_force_calc", "spindle_power_verify", "trochoidal_milling_calc",
  "tool_wear_rate", "cutting_temperature_calc", "surface_roughness_calc",
  "boring_bar_deflection", "helical_milling_calc", "plunge_milling_calc",
  "high_feed_milling_calc", "gun_drilling_calc", "peck_drilling_calc",
  "reaming_calc", "coolant_flow_calc", "coolant_pressure_calc",
  "chip_load_calc", "chip_breaking_calc", "chip_diagnose", "coolant_lifecycle", "error_budget", "capability_predict", "stochastic_wear", "stochastic_dimension", "stochastic_deflection", "variability_pipeline", "material_variability", "stochastic_grinding", "thermal_wear_coupling", "stochastic_edm", "environmental_variation", "spindle_torque_curve", "stochastic_composite_mc", "stochastic_composite_sensitivity", "stochastic_grinding_mc", "stochastic_grinding_optimize", "thin_wall_params", "thin_wall_deflection", "thin_wall_strategy", "thin_wall_support", "thin_wall_frequency",
  "tool_overhang_calc", "tool_runout_calc", "cycle_time_calc",
  "tool_cost_per_part", "stock_allowance", "workholding_force",
  "stepover_calc", "ultimate_speed_feed", "tool_selection_advice",
  "cutting_fluid_select", "spindle_bearing_load", "micro_machining_calc",
  // ── Batch 98-105: Manufacturing Process Engines ──
  "laser_welding_calc", "friction_stir_welding_calc", "eb_welding_calc",
  "vacuum_casting_calc", "centrifugal_casting_calc", "thin_film_deposition_calc",
  "cvd_calc", "ion_implantation_calc", "sputtering_calc",
  "evaporator_process_calc", "spray_drying_calc", "granulation_calc",
  "rotational_molding_calc", "screw_extrusion_calc", "compression_molding_calc",
  "vibratory_feeder_calc", "pneumatic_conveying_calc", "electrostatic_precipitator_calc",
  "resistance_welding_calc", "soldering_calc", "brazing_calc",
  "electroplating_calc", "thermal_spray_calc", "photochemical_etching_calc",
  // ── Batch 106: CNC Core Engines ──
  "boring_bar_calc", "part_deflection_calc", "setup_reduction_calc",
  "machine_vibration_calc", "runout_compensation_calc", "axis_compensation_calc",
  "tool_presetting_calc", "broaching_calc", "fatigue_life_calc",
  "injection_molding_calc",
  // ── Advanced Mathematical Methods ──
  "pce_compute", "emd_decompose", "garch_fit", "lhs_sample",
  "cmaes_optimize", "svm_train", "alt_analyze",
  // ── Phase 5 Forge: Novel Physics ──
  "am_melt_pool", "am_bead_overlap", "am_solidification", "am_thermal_stress", "am_scan_strategy", "am_process_window",
  "rbd_analyze_system", "rbd_fault_tree", "rbd_importance", "rbd_monte_carlo", "rbd_redundancy", "rbd_availability",
  "cryo_heat_transfer", "cryo_tool_life", "cryo_forces", "cryo_surface_integrity", "cryo_delivery_optimize", "cryo_mql",
  "acoustics_cutting_noise", "acoustics_machine_noise", "acoustics_shop_floor", "acoustics_hearing_protection", "acoustics_noise_control", "acoustics_chatter_noise",
  "laser_ablation_depth", "laser_removal_rate", "laser_haz", "laser_drilling", "laser_pulse_overlap", "laser_plasma_shielding",
  // -- Batch 109: Mechanical Design (15 engines) --
  "ball_screw_calc", "bevel_gear_calc", "bolted_joint_calc",
  "column_buckling_calc", "connecting_rod_calc", "coupling_selection_calc",
  "crankshaft_design_calc", "disk_brake_calc", "flange_bolt_calc",
  "flywheel_calc", "gear_train_calc", "hertz_contact_calc",
  "keyway_design_calc", "leaf_spring_calc", "planetary_gear_calc",
  // -- Batch 109: Fluid/Thermal/Process (15 engines) --
  "centrifugal_pump_calc", "compressor_design_calc", "condenser_design_calc",
  "cooling_tower_calc", "heat_exchanger_calc", "hydraulic_cylinder_calc",
  "pipe_sizing_calc", "pipe_stress_calc", "pump_selection_calc",
  "valve_design_calc", "valve_sizing_calc", "nozzle_calc",
  "seal_selection_calc", "spring_design_calc", "tank_design_calc",
  // ── Science Coverage: 6 new engines (22 actions) ──
  "kienzle_force", "kienzle_coefficients", "kienzle_milling", "kienzle_size_effect",
  "nelson_spc_evaluate", "nelson_spc_chart", "nelson_spc_diagnose",
  "miner_cumulative_damage", "miner_sn_curve", "miner_tool_fatigue", "miner_rainflow",
  "stochastic_wrap_mc", "stochastic_wrap_fosm", "stochastic_wrap_pce", "stochastic_sensitivity", "stochastic_chain",
  "morris_screening", "morris_classify",
  "multiple_regression_fit", "multiple_regression_predict", "multiple_regression_diagnostics", "ridge_regression",
  // -- Batch 110A: Rotating Machinery & Power Transmission (10 engines) --
  "worm_gear_calc", "harmonic_drive_calc", "cycloid_drive_calc",
  "hypoid_gear_calc", "rack_pinion_calc", "gear_pump_calc",
  "fluid_coupling_calc", "clutch_design_calc", "clutch_brake_calc",
  "coupling_calc",
  // -- Batch 110B: Bearings, Joints & Shafts (10 engines) --
  "journal_bearing_calc", "rolling_bearing_calc", "rolling_contact_calc",
  "spline_joint_calc", "spline_stress_calc", "keyway_stress_calc",
  "rivet_joint_calc", "shaft_alignment_calc", "linear_guide_calc",
  "linear_motion_calc",
  // -- Batch 110C: Industrial/Process/Thermal (10 engines) --
  "hydraulic_motor_calc", "hydraulic_press_calc", "pneumatic_cylinder_calc",
  "steam_turbine_calc", "turbine_blade_calc", "furnace_heating_calc",
  "rotary_kiln_calc", "heat_exchanger_plate_calc", "crane_load_calc",
  "wire_rope_calc",
  // -- Batch 111: Math/Stats + Fatigue/Fracture + EDM + Industrial (20 engines) --
  "statistical_ml_calc", "metaheuristic_optimization_calc", "markov_decision_calc",
  "linear_regression_calc",
  "predictive_failure_calc", "reliability_weibull_calc",
  "fracture_toughness_calc", "creep_life_calc", "thermal_fatigue_calc",
  "thermal_expansion_joint_calc",
  "edm_calc", "edm_parameter_calc", "edm_wire_calc",
  "ergonomic_workstation_calc", "noise_level_calc", "propeller_calc",
  "shock_absorber_calc", "damper_design_calc", "torsion_bar_calc", "screw_jack_calc",
  // -- Batch 112A: Milling Operations (4 new engines) --
  "circular_interpolation_calc", "helical_interpolation_calc", "ramping_calc", "slotting_calc",
  // -- Batch 112B: Grinding/Finishing (6 new engines) --
  "grinding_force_calc", "grinding_surface_finish_calc", "centerless_grinding_calc",
  "bore_finishing_calc", "honing_calc", "surface_finish_predictor_calc",
  "surface_integrity_predictor_calc",
  // -- Batch 112C: Welding/Forming (6 new engines) --
  "weld_distortion_calc", "stamping_die_calc", "extrusion_force_calc",
  "rolling_mill_calc", "wire_drawing_calc", "tube_forming_calc",
  // -- Phase 5 Forge C: Gap-Closing Engines --
  "assembly_sequence", "assembly_tolerance_stack", "assembly_line_balance",
  "assembly_peg_in_hole", "assembly_time_estimate", "assembly_dfa_score",
  "harvest_piezo", "harvest_thermo", "harvest_em",
  "harvest_process_budget", "harvest_hybrid", "harvest_roi",
  "transfer_machine_similarity", "transfer_scale_params", "transfer_gp",
  "transfer_material", "transfer_bayesian_update", "transfer_validate",
  "cmm_plan_path", "cmm_uncertainty_budget", "cmm_sampling_strategy",
  "cmm_datum_alignment", "cmm_acceptance_test", "cmm_feature_uncertainty",
  "lam_preheat_profile", "lam_force_reduction", "lam_tool_life",
  "lam_optimal_spacing", "lam_process_window", "lam_economics",
  // -- USF-MS0: Speed/Feed Orchestrator + Tool Library + Geometry Pipeline --
  "sf_orchestrate", "sf_quick", "sf_resolve_machine", "sf_resolve_tool",
  "sf_resolve_material", "sf_stochastic", "sf_compare", "sf_optimize",
  "tool_library_add", "tool_library_import_csv", "tool_library_filter",
  "tool_library_stats", "geometry_job_plan",
  "fs_navigate", "fs_navigate_find", "dsl_resolve", "dsl_search",
  // Resource Optimization: hyperMILL + ISO 286 extended (2026-03-14)
  "hypermill_material_lookup", "hypermill_machinability", "hypermill_diameter_sf",
  "hypermill_material_search", "hypermill_material_stats",
  "iso286_extended_it", "iso286_extended_fit", "iso286_stochastic_fit",
  "iso286_recommend_fit", "iso286_variability_stack",
  // MF-MS1: Feasibility Analysis (accessibility, workholding, rigidity)
  "feasibility_accessibility", "feasibility_workholding", "feasibility_rigidity",
  "coolant_fluid_delivery", "coolant_mql_physics", "coolant_hpc_design",
  "coolant_health_monitor", "coolant_optimize_flow",
  // ── Auto-added: case handlers missing from ACTIONS ──
  "adhesive_bonding_calc", "ahp_calc", "all_dimensionless", "anodizing_calc", "anomaly_classify",
  "anomaly_relearn", "assignment_problem_calc", "auto_model_select", "ball_end_mill_calc", "bar_feeder_calc",
  "batch_import_measurements", "bayesian_inference_calc", "bayesopt_optimize", "bearing_selection_calc", "belt_drive_calc",
  "bolt_torque_calc", "bootstrap_resample", "capability_with_ci", "carburizing_calc", "casting_defect_calc",
  "chain_drive_calc", "chamfer_milling_calc", "chip_conveyor_calc", "circular_pocket_calc", "cluster_analysis_calc",
  "cnc_maintenance_calc", "coating_thickness_calc", "compare_and_learn", "composite_chip_formation", "composite_delamination",
  "composite_delamination_factor", "composite_tool_wear", "composites_tsai_hill", "composites_fiber_pullout", "composites_optimize_cutting",
  "context_tree", "control_chart", "corrosion_rate_calc",
  "countersink_calc", "cut_to_learn", "cutting_number", "cutting_phenomena_brammertz", "cutting_phenomena_bue",
  "cutting_phenomena_coffinmanson", "cutting_phenomena_usui_crater", "cutting_physics_ext_brammertz", "cutting_physics_ext_bue", "cutting_physics_ext_colding",
  "cutting_physics_ext_usui", "surface_integrity_prediction", "cv_learning_curve", "cv_leave_one_out", "cv_nested", "deburring_recommend",
  "digital_twin_sync", "dim_analysis_buckingham_pi", "dim_analysis_consistency", "electric_motor_calc", "empirical_chip_breakability",
  "empirical_feed_from_finish", "empirical_hardness_convert", "empirical_productivity", "empirical_surface_integrity", "empirical_thermal_properties",
  "experiment_sequence", "exponential_smoothing_calc", "export_learning", "fatigue_cyclic_stress_strain", "fatigue_multiaxial",
  "fatigue_strain_life", "fingerprint_capture", "fingerprint_drift", "fingerprint_root_cause", "fleet_learn",
  "fleet_learning", "flywheel_energy_calc", "force_capability_analyze", "force_capability_check_sequence", "gradient_boost_classify", "grinding_wheel_calc",
  "hybrid_coupled_physics", "hybrid_ml_physics", "hybrid_online_learning", "hybrid_optimization", "hybrid_system_level",
  "interaction_analysis", "inventory_eoq_calc", "kde_density_anomaly", "kde_estimate", "keyway_calc",
  "kmeans_cluster", "learned_predict", "logistic_regression", "machinability_index", "mcmc_sample",
  "ml_stats_bayesian_tool_life", "ml_stats_logistic_fit", "ml_stats_metropolis_hastings", "ml_stats_rf_regress", "ml_stats_tool_breakage",
  "multi_physics_simulate", "multivariate_spc", "network_flow_calc", "optimization_simplex_calc", "parse_cmm_export",
  "pca_analyze", "permutation_bootstrap_ci", "permutation_correlation", "permutation_two_sample", "persist_learning",
  "physics_archard_wear", "physics_hertz_contact", "physics_merchant_shear", "physics_single_grit", "physics_transfer",
  "pid_controller_calc", "predictive_failure_mc", "predictive_maintenance", "press_brake_calc", "principal_component_calc",
  "probabilistic_costing", "process_fingerprint", "project_scheduling_calc", "record_measurement", "record_stratified",
  "regression_gmm_optimal", "regression_isotonic", "regression_kernel_ridge", "regression_regularized_boosting", "regression_stacking",
  "reliability_rbdo", "reliability_sparse_pce", "reliability_system", "residual_stress_combined", "residual_stress_hertzian",
  "residual_stress_phase_transform", "residual_stress_process_param", "riveted_joint_calc", "robust_optimization", "sequence_constraint_graph",
  "sequence_detect_deadends", "sequence_resequence", "sequence_simulate", "setup_transition_analyze", "sheet_metal_nesting_calc",
  "signal_digital_filter", "signal_envelope_analysis", "signal_order_analysis", "smart_doe", "stability_number",
  "stat_learning_bayesian_linreg", "stat_learning_logistic_breakage", "stat_learning_logistic_fit", "stat_learning_mcmc", "stat_learning_rf_regress",
  "strategy_ranking", "submit_measurement", "time_series_arima_calc", "topsis_calc", "transportation_problem_calc",
  "ts_change_point", "ts_exponential_smoothing", "ts_holt_winters", "uncertainty_correlation_from_data", "uncertainty_gaussian_copula",
  "uncertainty_kriging_fit", "uncertainty_qmc_uq", "uncertainty_sobol_sequence", "uncertainty_surrogate_optimize", "uq_methods_kriging_fit",
  "uq_methods_kriging_uq", "uq_methods_qmc", "uq_methods_t_copula", "uts_based_force", "variance_reduction_adaptive_mc", "variance_reduction_antithetic",
  "variance_reduction_importance", "vibration_isolator_calc", "waterjet_calc", "wavelet_transform",
  "physics_verify",
  // -- QS-MS6: Cross-Pipeline What-If --
  "what_if_analyze",
  // -- QS-MS6 P2: Physics Auto-Calibration --
  "physics_calibrate_submit", "physics_calibrate_predict", "physics_calibrate_state", "physics_calibrate_reset",
  // -- QS-MS6 P3: Pipeline Consistency Hook --
  "consistency_check", "consistency_history", "consistency_summary", "consistency_clear",
  // -- Non-Traditional Machining (USM, ECM, AJM) --
  "usm_mrr", "usm_abrasive_select", "usm_feasibility",
  "ecm_mrr", "ecm_electrode_design", "ecm_surface_quality",
  "ajm_cutting", "ajm_optimize", "ajm_nozzle_wear",
  // -- Production Optimization (Bottleneck + Predictive Maintenance) --
  "bottleneck_dbr", "bottleneck_sensitivity",
  "maintenance_assess_health", "maintenance_plan", "maintenance_failure_history",
  // -- STEP Import (RX-MS0 P3-U02) --
  "step_import", "step_analyze", "step_features", "step_wall_thickness", "step_brep_summary",
  // -- ENRICH-MS4: Cross-Catalog Validation --
  "cross_catalog_validate", "cross_catalog_completeness",
  // -- Diamond Turning & Laser Interferometer Compensation --
  "diamond_turning_surface", "diamond_turning_forces",
  "diamond_turning_wear", "diamond_turning_machine_config",
  "laser_interferometer_wavelength", "laser_interferometer_comp_table",
  "laser_interferometer_plan", "laser_interferometer_deadpath",
  // -- Grinding Burn + Variable Helix Chatter Suppression (video learning) --
  "grinding_burn_risk", "chatter_variable_helix_design",
  // -- Part Similarity --
  "part_similarity_compare", "part_similarity_find_nearest", "part_similarity_batch", "part_similarity_set_weights",
  // -- Adaptive Pipeline Generator --
  "adaptive_pipeline_generate", "adaptive_pipeline_adapt_step", "adaptive_pipeline_preview",
  // -- Sampling Workflow --
  "sampling_feasibility", "sampling_cam_strategy", "sampling_post_processor",
  "sampling_print_to_program", "sampling_self_correct_sf",
  // -- Chip Mechanics Models (Piispanen / Zorev / Okushima-Hitomi) --
  "piispanen_shear_strain", "zorev_stress_distribution", "thick_shear_zone",
  // -- CAM Plugin SDK --
  "sdk_optimize_sf", "sdk_check_safety", "sdk_suggest_tool", "sdk_get_tip", "sdk_batch",
  // -- CAMX-MS14/U01: Pipeline Safety Orchestrator --
  "pipeline_safety_assess", "pipeline_safety_veto", "pipeline_safety_batch",
  // -- Omega Safety Gate --
  "omega_safety_score", "omega_safety_evaluate",
  // -- Machine Envelope Guard --
  "machine_envelope_check", "machine_envelope_batch",
  // -- CAMX-MS14/U02: Safety Veto Engine (E1098) --
  "safety_veto_check", "safety_veto_all", "safety_veto_escalate",
  // -- Advanced Materials (0-D-6) --
  "superalloy_analyze", "ceramics_fracture", "magnesium_fire_risk",
  // -- Honing + Burnishing/Polishing (0-D-7b: U-PROC1) --
  "honing_design", "honing_stone_select", "honing_plateau",
  "burnishing_predict", "lapping_predict", "polishing_predict",
  // ── Filter Press (process engineering) ──
  "filter_press_calc",
  // ── Inventory-Aware Tool Selection ──
  "inventory_tool_select",
  "tool_roi_analysis",
  // ── SCIMATH-MS0: Core Linear Algebra & Matrix Methods ──
  "svd_decompose", "qr_factorize", "cholesky_factor", "eigen_solve",
  "sparse_solve", "iterative_solve", "matrix_norms", "matrix_factorize",
  "tensor_stress_invariants", "system_identify", "robust_regression",
  "random_matrix_noise_floor",
  // OPT-WIRE-MS0: BanditParameterOptimizerEngine actions
  "bandit_register_arm", "bandit_select_arm", "bandit_update_reward",
  // PHYSICS-WIRE-MS0: wire 11 unwired physics engines
  "clamping_force_calc", "clamping_force_quick",
  "cross_phys_upqi", "cross_phys_tool_life", "cross_phys_surface", "cross_phys_stability",
  "cross_phys_tool_change", "cross_phys_thermal_error", "cross_phys_energy_eff", "cross_phys_dyn_stiffness",
  "face_driver_analyze", "face_driver_penetration",
  "mdof_stability", "mdof_stability_eigen", "mdof_compare_sdof",
  "machine_force_limit_validate", "machine_force_limit_quick",
  "timoshenko_deflect", "timoshenko_multi_section", "timoshenko_compare", "timoshenko_max_ld",
  "goal_stability_observe", "goal_stability_analyze",
  "session_stability_report", "session_stability_lyapunov",
  "tribal_playbook_validate", "tribal_playbook_ranges", "tribal_playbook_guidance",
  // -- SFC: Surface Finish Calculation (CAM-EXHAUST-MS0) --
  "sfc_calculate", "sfc_feed_for_target",
  // -- ENGINE-WIRE-MS0/U-WIRE09: 5 leaf physics engines --
  "engagement_dynamics_calc", "engagement_optimize_adapter",
  "cutting_fluid_lifecycle_calc", "chip_formation_predict", "surface_measure_calc",
  // -- ENGINE-WIRE-MS0/U-WIRE10: 5 neural+adaptive engines --
  "chatter_neural_classify", "thermal_neural_predict",
  "adaptive_param_space_record", "adaptive_param_space_query",
  "adaptive_machining_process", "adaptive_physics_bridge",
  // OBSIDIAN-PRISM-OS-MS0/U-ORPHAN-RESCUE-QUICK-CALC: 10 actions wiring QuickCalcEngine
  "quick_rpm", "quick_feed_rate", "quick_mrr", "quick_surface_speed", "quick_chip_load",
  "quick_tap_drill", "quick_cutting_time", "quick_scallop_height", "quick_thread_pitch", "quick_cutting_power",
  // OBSIDIAN-PRISM-OS-MS0/U-ORPHAN-RESCUE-SMART-DEFAULTS: 7 actions wiring SmartDefaultsEngine
  // (context-aware default RPM/feed/DOC/WOC/coolant — NOT Kienzle/Taylor; SFM baselines).
  "smart_defaults_get", "smart_defaults_sfm", "smart_defaults_chipload",
  "smart_defaults_engagement", "smart_defaults_coolant", "smart_defaults_materials",
  "smart_defaults_oneliner",
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
    async ({ action, params: rawParams = {} }: { action: string; params?: Record<string, any> }) => {
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
            const { calculateProductivityMetrics } = await import("../../engines/ManufacturingCalculations.js");
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
            const { calculateEngagementAngle } = await import("../../engines/ToolpathCalculations.js");
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
            const { calculateScallopHeight } = await import("../../engines/ToolpathCalculations.js");
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
            const { calculateOptimalStepover } = await import("../../engines/ToolpathCalculations.js");
            result = calculateOptimalStepover(
              params.tool_diameter,
              params.tool_corner_radius,
              params.target_scallop || 0.01,
              params.operation || "finishing"
            );
            break;
          }

          case "cycle_time": {
            const { estimateCycleTime } = await import("../../engines/ToolpathCalculations.js");
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
            const { calculateArcFitting } = await import("../../engines/ToolpathCalculations.js");
            result = calculateArcFitting(
              params.chord_tolerance,
              params.arc_radius,
              params.feedrate,
              params.block_time || 1
            );
            break;
          }

          case "chip_thinning": {
            const { calculateChipThinning } = await import("../../engines/ToolpathCalculations.js");
            result = calculateChipThinning(params.tool_diameter, params.radial_depth, params.feed_per_tooth, params.number_of_teeth || 4, params.cutting_speed || 150);
            break;
          }

          case "cutting_force": {
            const mfgCalc = await import("../../engines/ManufacturingCalculations.js");
            const cfMat = (params.material_id || params.material) ? await getMat(params.material_id || params.material) : null;
            const cfIsoMap: Record<string, string> = { p: "steel_medium_carbon", m: "stainless_austenitic", k: "cast_iron_gray", n: "aluminum_wrought", s: "inconel", h: "steel_high_carbon" };
            const cfGroupKey = cfIsoMap[(params.material_group || "P").toLowerCase()] || params.material_group || "P";
            const cfCoeffs = params.kc1_1 ? { kc1_1: params.kc1_1, mc: params.mc ?? 0.25 } : (cfMat?.kienzle ?? mfgCalc.getDefaultKienzle(cfGroupKey));
            const cfDia = params.tool_diameter || 12;
            result = mfgCalc.calculateKienzleCuttingForce({
              cutting_speed: params.cutting_speed || 150,
              feed_per_tooth: params.feed_per_tooth || params.feed || 0.1,
              axial_depth: params.axial_depth || params.ap || 3,
              radial_depth: params.radial_depth || params.ae || cfDia * 0.5,
              tool_diameter: cfDia,
              number_of_teeth: params.number_of_teeth || params.z || 4,
              rake_angle: params.rake_angle,
              actual_chip_thickness_mm: params.actual_chip_thickness_mm,
            }, cfCoeffs as any);
            break;
          }

          case "tool_life": {
            const mfgTL = await import("../../engines/ManufacturingCalculations.js");
            const tlMat = (params.material_id || params.material) ? await getMat(params.material_id || params.material) : null;
            const tlIsoMap: Record<string, string> = { p: "steel", m: "stainless", k: "cast_iron", n: "aluminum", s: "inconel", h: "steel" };
            const tlGroupKey = tlIsoMap[(params.material_group || "P").toLowerCase()] || params.material_group || "P";
            const tlCoeffs = params.C ? { C: params.C, n: params.n ?? 0.25 } : (tlMat?.taylor ?? mfgTL.getDefaultTaylor(tlGroupKey, params.tool_material || "Carbide"));
            result = mfgTL.calculateTaylorToolLife(
              params.cutting_speed || 150,
              tlCoeffs as any,
              params.feed_per_tooth || params.feed,
              params.axial_depth || params.ap || params.depth
            );
            break;
          }

          case "surface_finish": {
            const { calculateSurfaceFinish } = await import("../../engines/ManufacturingCalculations.js");
            result = calculateSurfaceFinish(
              params.feed_per_tooth || params.feed || params.fz || 0.1,
              params.nose_radius || params.corner_radius || 0.8,
              params.is_milling ?? (params.operation === "milling"),
              params.radial_depth || params.ae,
              params.tool_diameter,
              params.operation
            );
            break;
          }

          case "deflection": {
            const { calculateToolDeflection } = await import("../../engines/AdvancedCalculations.js");
            // youngs_modulus expects GPa (carbide=600, HSS=200, steel=210)
            let eGPa = params.youngs_modulus || params.E || 600;
            if (eGPa > 10000) eGPa = eGPa / 1000; // auto-convert MPa → GPa
            result = calculateToolDeflection(
              params.cutting_force || params.force || 500,
              params.tool_diameter || 12,
              params.overhang_length || params.overhang || params.stickout || 50,
              eGPa,
              params.runout || 0.005
            );
            break;
          }

          case "speed_feed": {
            const { calculateSpeedFeed } = await import("../../engines/ManufacturingCalculations.js");
            const sfOp = params.operation || "roughing";
            const sfValidOps = new Set(["roughing", "finishing", "semi-finishing"]);
            result = calculateSpeedFeed({
              material_hardness: params.hardness_HRC || params.hardness || params.material_hardness,
              operation: sfValidOps.has(sfOp) ? sfOp : "roughing",
              tool_diameter: params.tool_diameter || 12,
              tool_material: params.tool_material || "Carbide",
              number_of_teeth: params.number_of_teeth || params.z || 4,
            } as any);
            break;
          }

          case "mrr": {
            const { calculateMRR } = await import("../../engines/ManufacturingCalculations.js");
            const mrrDia = params.tool_diameter || 12;
            result = calculateMRR({
              cutting_speed: params.cutting_speed || 150,
              feed_per_tooth: params.feed_per_tooth || params.feed || 0.1,
              axial_depth: params.axial_depth || params.ap || 3,
              radial_depth: params.radial_depth || params.ae || mrrDia * 0.5,
              tool_diameter: mrrDia,
              number_of_teeth: params.number_of_teeth || params.z || 4,
            });
            break;
          }

          case "power": case "power_torque": {
            const { calculateSpindlePower } = await import("../../engines/ManufacturingCalculations.js");
            result = calculateSpindlePower(
              params.cutting_force || params.force || 500,
              params.cutting_speed || 150,
              params.tool_diameter || 12,
              params.efficiency ?? 0.80
            );
            break;
          }

          case "torque": {
            const { calculateTorque } = await import("../../engines/ManufacturingCalculations.js");
            result = calculateTorque(
              params.cutting_force || params.force || 500,
              params.tool_diameter || 12,
              params.operation || "milling"
            );
            break;
          }

          case "multi_pass": {
            const { calculateMultiPassStrategy } = await import("../../engines/ToolpathCalculations.js");
            const mpMat = (params.material_id || params.material) ? await getMat(params.material_id || params.material) : null;
            const mpKc = params.kc1_1 || mpMat?.kienzle?.kc1_1 || 1800;
            const mpCr = (mpMat as unknown as Record<string, Record<string, Record<string, unknown>>>)?.cutting_recommendations?.milling || {};
            result = calculateMultiPassStrategy(params.total_stock || params.stock || 10, params.tool_diameter || 12, mpKc, params.machine_power_kw || params.max_power || 15, params.cutting_speed_rough || mpCr.speed_roughing || 150, params.cutting_speed_finish || mpCr.speed_finishing || 200, params.fz_rough || mpCr.feed_per_tooth_roughing || 0.12, params.fz_finish || mpCr.feed_per_tooth_finishing || 0.06, params.target_Ra);
            break;
          }

          case "gcode_snippet": {
            const { generateGCodeSnippet } = await import("../../engines/ToolpathCalculations.js");
            const gcRpm = params.rpm || Math.round(((params.cutting_speed || 150) * 1000) / (Math.PI * (params.tool_diameter || 12)));
            result = generateGCodeSnippet(params.controller || "fanuc", params.operation || "milling", { rpm: gcRpm, feed_rate: params.feed_rate || params.vf || 1000, tool_number: params.tool_number || 1, depth_of_cut: params.axial_depth || 3, x_start: params.x_start, y_start: params.y_start, z_safe: params.z_safe || 5, z_depth: params.z_depth, coolant: params.coolant });
            break;
          }

          case "algorithm_calculate": {
            const { algorithmEngine } = await import("../../engines/AlgorithmEngine.js");
            result = algorithmEngine.calculate({
              algorithm_id: params.algorithm_id,
              params: params.algorithm_params ?? params.params ?? params,
            });
            break;
          }
          case "algorithm_validate": {
            const { algorithmEngine } = await import("../../engines/AlgorithmEngine.js");
            result = algorithmEngine.validate({
              algorithm_id: params.algorithm_id,
              params: params.algorithm_params ?? params.params ?? params,
            });
            break;
          }
          case "algorithm_list": {
            const { algorithmEngine } = await import("../../engines/AlgorithmEngine.js");
            result = algorithmEngine.list({
              domain: params.domain,
              safety_class: params.safety_class,
            });
            break;
          }
          case "algorithm_info": {
            const { algorithmEngine } = await import("../../engines/AlgorithmEngine.js");
            result = algorithmEngine.info(params.algorithm_id);
            if (!result) throw new Error(`Unknown algorithm: "${params.algorithm_id}"`);
            break;
          }
          case "algorithm_batch": {
            const { algorithmEngine } = await import("../../engines/AlgorithmEngine.js");
            result = algorithmEngine.batch({
              calculations: params.calculations,
              stop_on_error: params.stop_on_error,
            });
            break;
          }
          case "algorithm_benchmark": {
            const { algorithmEngine: algBench } = await import("../../engines/AlgorithmEngine.js");
            result = algBench.benchmark({
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
              safeFunctionEval(params.fitnessBody, ["genes"]),
              params.bounds, params.config,
            );
            break;
          }

          // ── Simulated Annealing ──
          case "sa_optimize": {
            const { simulatedAnnealingEngine } = await import("../../engines/SimulatedAnnealingEngine.js");
            result = simulatedAnnealingEngine.optimize(
              safeFunctionEval(params.fitnessBody, ["solution"]),
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
          case "tool_unified_search": {
            const { toolCatalogEngine } = await import("../../engines/ToolCatalogEngine.js");
            const catalogResults = toolCatalogEngine.search({
              type: params.type,
              diameter_mm: params.diameter_mm,
              diameter_range: params.diameter_range,
              iso_group: params.iso_group,
              manufacturer: params.manufacturer,
              operation: params.operation,
              coating: params.coating,
              flute_count: params.flute_count,
              max_results: params.max_results ?? 10,
            });
            result = {
              tools: catalogResults,
              total: catalogResults.length,
              query: {
                type: params.type, diameter_mm: params.diameter_mm,
                iso_group: params.iso_group, manufacturer: params.manufacturer,
              },
            };
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

          // ── Cost Estimation (U-CONSOL1: canonical engine is JobCostingEngine) ──
          case "cost_estimate": {
            const { jobCostingEngine } = await import("../../engines/JobCostingEngine.js");
            // Adapt CostInput → JobSpec for backward compatibility
            const cycleTime = params.cycle_time_min ?? 10;
            const batchSize = params.batch_size ?? 1;
            const jobSpec = {
              quantity: batchSize,
              material: { type: params.material_name, density: undefined, pricePerLb: undefined },
              operations: [{ name: "machining", type: "roughing", cycleTime, setupTime: params.setup_time_min ?? 15, volumeToRemove: (params.stock_volume_cm3 ?? 50) - (params.part_volume_cm3 ?? 25) }],
              machineType: "cnc_mill_3axis",
              toolChanges: params.num_tools ?? 3,
              rates: { machineRate: params.machine_rate_per_hour, laborRate: params.labor_rate_per_hour, overheadRate: undefined },
            };
            const breakdown = jobCostingEngine.calculateJobCost(jobSpec);
            // Return CostEstimationEngine-compatible shape for backward compatibility
            result = {
              material_cost: breakdown.material.cost,
              machine_cost: breakdown.machining.cost,
              tooling_cost: breakdown.toolConsumption.cost,
              labor_cost: breakdown.setup.cost,
              overhead_cost: breakdown.overhead.cost,
              total_per_part: breakdown.perPart,
              total_batch: breakdown.total,
              cost_drivers: [
                { category: "Material", amount: breakdown.material.cost, pct_of_total: breakdown.total > 0 ? +(breakdown.material.cost / breakdown.total * 100).toFixed(1) : 0, notes: `${breakdown.material.weightLb.toFixed(2)} lb` },
                { category: "Machine", amount: breakdown.machining.cost, pct_of_total: breakdown.total > 0 ? +(breakdown.machining.cost / breakdown.total * 100).toFixed(1) : 0, notes: `${breakdown.machining.totalMinutes.toFixed(1)} min` },
                { category: "Tooling", amount: breakdown.toolConsumption.cost, pct_of_total: breakdown.total > 0 ? +(breakdown.toolConsumption.cost / breakdown.total * 100).toFixed(1) : 0, notes: `${breakdown.toolConsumption.toolsConsumed} tools, source: ${breakdown.toolConsumption.source}` },
                { category: "Labor", amount: breakdown.setup.cost, pct_of_total: breakdown.total > 0 ? +(breakdown.setup.cost / breakdown.total * 100).toFixed(1) : 0, notes: `${breakdown.setup.totalMinutes.toFixed(1)} min setup` },
                { category: "Overhead", amount: breakdown.overhead.cost, pct_of_total: breakdown.total > 0 ? +(breakdown.overhead.cost / breakdown.total * 100).toFixed(1) : 0, notes: "shop overhead" },
              ],
            };
            break;
          }
          case "cost_compare_materials": {
            const { jobCostingEngine } = await import("../../engines/JobCostingEngine.js");
            const materials: { name: string; iso_group: string }[] = params.materials ?? [];
            const results = materials.map((mat: { name: string; iso_group: string }) => {
              const spec = {
                quantity: params.batch_size ?? 1,
                material: { type: mat.name },
                operations: [{ name: "machining", type: "roughing", cycleTime: params.cycle_time_min ?? 10, setupTime: params.setup_time_min ?? 15 }],
                toolChanges: params.num_tools ?? 3,
                rates: { machineRate: params.machine_rate_per_hour },
              };
              const bd = jobCostingEngine.calculateJobCost(spec);
              return { name: mat.name, iso_group: mat.iso_group, per_part_cost: bd.perPart, material_cost: bd.material.cost, machine_cost: bd.machining.cost };
            });
            results.sort((a: any, b: any) => a.per_part_cost - b.per_part_cost);
            result = {
              materials: results,
              cheapest: results[0]?.name ?? "unknown",
              savings_vs_most_expensive: results.length > 1 ? +((results[results.length - 1].per_part_cost - results[0].per_part_cost).toFixed(2)) : 0,
            };
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
            const fitFn = safeFunctionEval(params.fitness_body ?? "return -(pos[0]**2+pos[1]**2)", ["pos"]);
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
            const objFn = safeFunctionEval(params.objective_body, ["x"]);
            result = swarmNeuralHybridEngine.optimize(objFn, params.bounds, params.config ?? {});
            break;
          }

          case "xai_lime": {
            const { xaiEngine } = await import("../../engines/XAIEngine.js");
            const limePredictFn = safeFunctionEval(params.predict_body, ["x"]);
            result = xaiEngine.limeExplain(limePredictFn, params.instance, params.num_samples, params.num_features);
            break;
          }

          case "xai_shap": {
            const { xaiEngine } = await import("../../engines/XAIEngine.js");
            const shapPredictFn = safeFunctionEval(params.predict_body, ["x"]);
            result = xaiEngine.shapExplain(shapPredictFn, params.instance, params.background, params.num_samples);
            break;
          }

          case "xai_permutation_importance": {
            const { xaiEngine } = await import("../../engines/XAIEngine.js");
            const piFn = safeFunctionEval(params.predict_body, ["x"]);
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

          case "troubleshoot_start": {
            const { troubleshootingAssistantEngine } = await import("../../engines/TroubleshootingAssistantEngine.js");
            result = troubleshootingAssistantEngine.startDiagnosis(params as any);
            break;
          }

          case "troubleshoot_answer": {
            const { troubleshootingAssistantEngine } = await import("../../engines/TroubleshootingAssistantEngine.js");
            result = troubleshootingAssistantEngine.answerQuestion(params as any);
            break;
          }

          case "troubleshoot_quick": {
            const { troubleshootingAssistantEngine } = await import("../../engines/TroubleshootingAssistantEngine.js");
            result = troubleshootingAssistantEngine.quickDiagnose(params as any);
            break;
          }

          case "troubleshoot_common": {
            const { troubleshootingAssistantEngine } = await import("../../engines/TroubleshootingAssistantEngine.js");
            result = troubleshootingAssistantEngine.getCommonProblems(params as any);
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
            const fitFn = safeFunctionEval(params.fitness_body, ["genes"]);
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
          // ── SpindleHarmonicsQualityEngine wiring (was half-wired: action enum +
          //    result-slimmer present at lines 214/216/218, but no main switch case
          //    invoking the engine — landed by OBSIDIAN-PRISM-OS-MS0/U-ORPHAN-RESCUE-
          //    SPINDLE-HARMONICS-QUALITY).
          case "spindle_harmonic_analysis": {
            const { spindleHarmonicsQualityEngine } = await import("../../engines/SpindleHarmonicsQualityEngine.js");
            result = spindleHarmonicsQualityEngine.analyze({
              spindle_rpm: params.spindle_rpm,
              num_flutes: params.num_flutes ?? 4,
              machine_modes: params.machine_modes ?? { natural_frequencies_Hz: [800] },
              max_harmonic_order: params.max_harmonic_order,
              bandwidth_pct: params.bandwidth_pct,
            });
            break;
          }
          case "spindle_optimal_rpm": {
            const { spindleHarmonicsQualityEngine } = await import("../../engines/SpindleHarmonicsQualityEngine.js");
            result = spindleHarmonicsQualityEngine.findOptimalRpm(
              params.num_flutes ?? 4,
              params.machine_modes ?? { natural_frequencies_Hz: [800] },
              params.rpm_min ?? 2000,
              params.rpm_max ?? 12000,
              params.rpm_step,
            );
            break;
          }
          case "spindle_quality_map": {
            const { spindleHarmonicsQualityEngine } = await import("../../engines/SpindleHarmonicsQualityEngine.js");
            result = spindleHarmonicsQualityEngine.qualityMap(
              params.num_flutes ?? 4,
              params.machine_modes ?? { natural_frequencies_Hz: [800] },
              params.rpm_min ?? 2000,
              params.rpm_max ?? 12000,
              params.rpm_step,
            );
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
            const tolMm = params.tolerance_mm ?? 0.05;
            const nom = params.nominal ?? { diameter_mm: 10, x_mm: 50, y_mm: 50 };
            result = probeRoutineEngine.generatePartInspection({
              controller: params.controller ?? "fanuc",
              action_on_fail: params.action_on_fail ?? "alarm",
              features: [{
                type: (params.feature_type as any) ?? "bore",
                nominal: nom.diameter_mm ?? 10,
                tolerance_plus: tolMm,
                tolerance_minus: tolMm,
                position: { x: nom.x_mm ?? 50, y: nom.y_mm ?? 50, z: 0 },
                diameter: nom.diameter_mm,
                label: params.id ?? "F1",
              }],
            });
            break;
          }
          case "probe_gdt_interpret": {
            const { probeRoutineEngine: pre2 } = await import("../../engines/ProbeRoutineEngine.js");
            const gdtTol = params.tolerance_mm ?? 0.05;
            result = pre2.generatePartInspection({
              controller: params.controller ?? "fanuc",
              action_on_fail: "alarm",
              features: [{
                type: "bore",
                nominal: 10,
                tolerance_plus: gdtTol,
                tolerance_minus: gdtTol,
                position: { x: 0, y: 0, z: 0 },
                label: `GDT-${params.callout ?? "position"}`,
              }],
            });
            break;
          }
          case "probe_report": {
            const { probeRoutineEngine: pre3 } = await import("../../engines/ProbeRoutineEngine.js");
            const repTol = params.tolerance_mm ?? 0.05;
            const repNom = params.nominal ?? { diameter_mm: 10 };
            result = pre3.generateFirstArticle({
              controller: params.controller ?? "fanuc",
              report_format: params.report_format ?? "custom",
              datum_features: [],
              features: [{
                type: (params.feature_type as any) ?? "bore",
                nominal: repNom.diameter_mm ?? 10,
                tolerance_plus: repTol,
                tolerance_minus: repTol,
                position: { x: 0, y: 0, z: 0 },
                label: params.id ?? "F1",
              }],
            });
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
          case "calc_energy_analyze": {
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
          case "calc_energy_optimize": {
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

          // ── ENGINE-WIRE-CALC/U-WIRE-CALC-SCE: SpecificCuttingEnergyEngine ──
          case "calc_specific_cutting_energy": {
            const { specificCuttingEnergyEngine } = await import("../../engines/SpecificCuttingEnergyEngine.js");
            result = specificCuttingEnergyEngine.calculate(params as Parameters<typeof specificCuttingEnergyEngine.calculate>[0]);
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
            const objFn = safeFunctionEval(params.objective_body ?? "return x[0]**2", ["x"]);
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
            const boFn = safeFunctionEval(params.objective_body ?? "return x[0]**2", ["x"]);
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
            const trFn = safeFunctionEval(params.objective_body ?? "return x[0]**2", ["x"]);
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
            const sqpObj = safeFunctionEval(params.objective_body ?? "return x[0]**2", ["x"]);
            const sqpConstraints = (params.constraint_bodies ?? []).map(
              (b: string) => safeFunctionEval(b, ["x"])
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
            const statFn = safeFunctionEval(params.statistic_body ?? "return d.reduce((s,v)=>s+v,0)/d.length", ["d"]);
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
            const objFn = safeFunctionEval(params.objective_body ?? "return x[0]**2", ["x"]);
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
            const intFn = safeFunctionEval(params.function_body ?? "return x*x", ["x"]);
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
            const fn2d = safeFunctionEval(params.function_body ?? "return x*y", ["x", "y"]);
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
            const odeFn = safeFunctionEval(params.function_body ?? "return [y[0]]", ["t", "y"]);
            result = differentialEquationEngine.rk45({
              f: odeFn, y0: params.y0, tSpan: params.t_span,
              adaptive: params.adaptive,
            });
            break;
          }
          case "ode_second_order": {
            const { differentialEquationEngine } = await import("../../engines/DifferentialEquationEngine.js");
            const f2 = safeFunctionEval(params.function_body ?? "return -y", ["t", "y", "v"]);
            result = differentialEquationEngine.solveSecondOrder({ f: f2, y0: params.y0 ?? 1, v0: params.v0 ?? 0, tSpan: params.t_span, dt: params.dt, numPoints: params.num_points });
            break;
          }
          case "ode_stability": {
            const { differentialEquationEngine } = await import("../../engines/DifferentialEquationEngine.js");
            const stabFn = safeFunctionEval(params.function_body ?? "return [-y[0]]", ["t", "y"]);
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

          // ── SCI-MS0: Sensor Integration ──

          // ── VAR-MS0: Stochastic Physics Extensions ──
          // ── CNC/Machining calculators (30 engines) ──
          case "cutting_force_calc": {
            const { cuttingForceEngine } = await import("../../engines/CuttingForceEngine.js");
            result = cuttingForceEngine.calculate(params as ValidatedParams);
            break;
          }
          case "spindle_power_verify": {
            const { spindlePowerCheckEngine } = await import("../../engines/SpindlePowerCheckEngine.js");
            result = spindlePowerCheckEngine.powerCheck(params as ValidatedParams);
            break;
          }
          case "trochoidal_milling_calc": {
            const { trochoidalMillingEngine } = await import("../../engines/TrochoidalMillingEngine.js");
            result = trochoidalMillingEngine.calculate(params as ValidatedParams);
            break;
          }
          case "tool_wear_rate": {
            const { toolWearRateEngine } = await import("../../engines/ToolWearRateEngine.js");
            result = toolWearRateEngine.calculate(params as ValidatedParams);
            break;
          }
          case "cutting_temperature_calc": {
            const { cuttingTemperatureEngine } = await import("../../engines/CuttingTemperatureEngine.js");
            result = cuttingTemperatureEngine.calculate(params as ValidatedParams);
            break;
          }
          case "surface_roughness_calc": {
            const { surfaceRoughnessEngine } = await import("../../engines/SurfaceRoughnessEngine.js");
            result = surfaceRoughnessEngine.calculate(params as ValidatedParams);
            break;
          }
          case "boring_bar_deflection": {
            const { boringBarDeflectionEngine } = await import("../../engines/BoringBarDeflectionEngine.js");
            result = boringBarDeflectionEngine.calculate(params as ValidatedParams);
            break;
          }
          case "helical_milling_calc": {
            const { helicalMillingEngine } = await import("../../engines/HelicalMillingEngine.js");
            result = helicalMillingEngine.calculate(params as ValidatedParams);
            break;
          }
          case "plunge_milling_calc": {
            const { plungeMillingEngine } = await import("../../engines/PlungeMillingEngine.js");
            result = plungeMillingEngine.calculate(params as ValidatedParams);
            break;
          }
          case "high_feed_milling_calc": {
            const { highFeedMillingEngine } = await import("../../engines/HighFeedMillingEngine.js");
            result = highFeedMillingEngine.calculate(params as ValidatedParams);
            break;
          }
          case "gun_drilling_calc": {
            const { gunDrillingEngine } = await import("../../engines/GunDrillingEngine.js");
            result = gunDrillingEngine.calculate(params as ValidatedParams);
            break;
          }
          case "peck_drilling_calc": {
            const { peckDrillingEngine } = await import("../../engines/PeckDrillingEngine.js");
            result = peckDrillingEngine.calculate(params as ValidatedParams);
            break;
          }
          case "reaming_calc": {
            const { reamingEngine } = await import("../../engines/ReamingEngine.js");
            result = reamingEngine.calculate(params as ValidatedParams);
            break;
          }
          case "coolant_flow_calc": {
            const { coolantFlowEngine } = await import("../../engines/CoolantFlowEngine.js");
            result = coolantFlowEngine.calculate(params as ValidatedParams);
            break;
          }
          case "coolant_pressure_calc": {
            const { coolantPressureEngine } = await import("../../engines/CoolantPressureEngine.js");
            result = coolantPressureEngine.calculate(params as ValidatedParams);
            break;
          }
          case "chip_load_calc": {
            const { chipLoadEngine } = await import("../../engines/ChipLoadEngine.js");
            result = chipLoadEngine.calculate(params as ValidatedParams);
            break;
          }
          case "chip_breaking_calc": {
            const { chipBreakingEngine } = await import("../../engines/ChipBreakingEngine.js");
            result = chipBreakingEngine.calculate(params as ValidatedParams);
            break;
          }
          case "chip_diagnose": {
            const { chipMorphologyDiagnosticEngine } = await import("../../engines/ChipMorphologyDiagnosticEngine.js");
            result = chipMorphologyDiagnosticEngine.diagnose(params as ValidatedParams);
            break;
          }
          case "piispanen_shear_strain": {
            const { chipMorphologyDiagnosticEngine: cmd1 } = await import("../../engines/ChipMorphologyDiagnosticEngine.js");
            result = cmd1.piispanenShearStrain(params as ValidatedParams);
            break;
          }
          case "zorev_stress_distribution": {
            const { chipMorphologyDiagnosticEngine: cmd2 } = await import("../../engines/ChipMorphologyDiagnosticEngine.js");
            result = cmd2.zorevStressDistribution(params as ValidatedParams);
            break;
          }
          case "thick_shear_zone": {
            const { chipMorphologyDiagnosticEngine: cmd3 } = await import("../../engines/ChipMorphologyDiagnosticEngine.js");
            result = cmd3.thickShearZone(params as ValidatedParams);
            break;
          }
          case "spindle_torque_curve": {
            const { spindleTorqueCurveEngine } = await import("../../engines/SpindleTorqueCurveEngine.js");
            result = spindleTorqueCurveEngine.calculate(params as ValidatedParams);
            break;
          }
          case "spindle_torque_available": {
            const { spindleTorqueCurveEngine: stcA } = await import("../../engines/SpindleTorqueCurveEngine.js");
            result = stcA.getAvailableTorqueAndPower(params as ValidatedParams);
            break;
          }
          case "spindle_check_cut": {
            const { spindleTorqueCurveEngine: stcB } = await import("../../engines/SpindleTorqueCurveEngine.js");
            result = stcB.checkCutFeasibility(params as ValidatedParams);
            break;
          }
          case "spindle_max_mrr": {
            const { spindleTorqueCurveEngine: stcC } = await import("../../engines/SpindleTorqueCurveEngine.js");
            result = stcC.findMaxMRR(params as ValidatedParams);
            break;
          }
          case "spindle_plot_curve": {
            const { spindleTorqueCurveEngine: stcD } = await import("../../engines/SpindleTorqueCurveEngine.js");
            result = stcD.plotTorquePowerCurve(params as ValidatedParams);
            break;
          }
          case "spindle_recommend_rpm": {
            const { spindleTorqueCurveEngine: stcE } = await import("../../engines/SpindleTorqueCurveEngine.js");
            result = stcE.recommendRPMForOperation(params as ValidatedParams);
            break;
          }
          case "thin_wall_params": {
            const { ThinWallMachiningEngine } = await import("../../engines/ThinWallMachiningEngine.js");
            result = new ThinWallMachiningEngine().thinWallParams(params as ValidatedParams);
            break;
          }
          case "thin_wall_deflection": {
            const { ThinWallMachiningEngine: TWD } = await import("../../engines/ThinWallMachiningEngine.js");
            result = new TWD().thinWallDeflection(params as ValidatedParams);
            break;
          }
          case "thin_wall_strategy": {
            const { ThinWallMachiningEngine: TWS } = await import("../../engines/ThinWallMachiningEngine.js");
            result = new TWS().thinWallStrategy(params as ValidatedParams);
            break;
          }
          case "thin_wall_support": {
            const { ThinWallMachiningEngine: TWSU } = await import("../../engines/ThinWallMachiningEngine.js");
            result = new TWSU().thinWallSupport(params as ValidatedParams);
            break;
          }
          case "thin_wall_frequency": {
            const { ThinWallMachiningEngine: TWF } = await import("../../engines/ThinWallMachiningEngine.js");
            result = new TWF().thinWallFrequency(params as ValidatedParams);
            break;
          }
          case "tool_overhang_calc": {
            const { toolOverhangEngine } = await import("../../engines/ToolOverhangEngine.js");
            result = toolOverhangEngine.calculate(params as ValidatedParams);
            break;
          }
          case "tool_runout_calc": {
            const { toolRunoutEngine } = await import("../../engines/ToolRunoutEngine.js");
            result = toolRunoutEngine.calculate(params as ValidatedParams);
            break;
          }
          case "cycle_time_calc": {
            const { cycleTimeEngine } = await import("../../engines/CycleTimeEngine.js");
            result = cycleTimeEngine.calculate(params as ValidatedParams);
            break;
          }
          case "tool_cost_per_part": {
            const { toolCostPerPartEngine } = await import("../../engines/ToolCostPerPartEngine.js");
            result = toolCostPerPartEngine.calculate(params as ValidatedParams);
            break;
          }
          case "stock_allowance": {
            const { stockAllowanceEngine } = await import("../../engines/StockAllowanceEngine.js");
            result = stockAllowanceEngine.calculate(params as ValidatedParams);
            break;
          }
          case "workholding_force": {
            const { workholdingForceEngine } = await import("../../engines/WorkholdingForceEngine.js");
            result = workholdingForceEngine.clampForce(params as ValidatedParams);
            break;
          }
          case "stepover_calc": {
            const { toolPathStepoverEngine } = await import("../../engines/ToolPathStepoverEngine.js");
            result = toolPathStepoverEngine.calculate(params as ValidatedParams);
            break;
          }
          case "ultimate_speed_feed": {
            const { ultimateSpeedFeedEngine } = await import("../../engines/UltimateSpeedFeedEngine.js");
            result = ultimateSpeedFeedEngine.calculate(params as ValidatedParams);
            break;
          }
          case "tool_selection_advice": {
            const { toolSelectionAdvisorEngine } = await import("../../engines/ToolSelectionAdvisorEngine.js");
            result = toolSelectionAdvisorEngine.advise(params as ValidatedParams);
            break;
          }
          case "cutting_fluid_select": {
            const { cuttingFluidSelectionEngine } = await import("../../engines/CuttingFluidSelectionEngine.js");
            result = cuttingFluidSelectionEngine.calculate(params as ValidatedParams);
            break;
          }
          case "spindle_bearing_load": {
            const { spindleBearingLoadEngine } = await import("../../engines/SpindleBearingLoadEngine.js");
            result = spindleBearingLoadEngine.calculate(params as ValidatedParams);
            break;
          }
          case "micro_machining_calc": {
            const { microMachiningEngine } = await import("../../engines/MicroMachiningEngine.js");
            result = microMachiningEngine.microMill(params as ValidatedParams);
            break;
          }

          // ── Batch 98: Welding Processes ──
          case "laser_welding_calc": {
            const { laserWeldingEngine } = await import("../../engines/LaserWeldingEngine.js");
            result = laserWeldingEngine.calculate(params as ValidatedParams);
            break;
          }
          case "friction_stir_welding_calc": {
            const { frictionStirWeldingEngine } = await import("../../engines/FrictionStirWeldingEngine.js");
            result = frictionStirWeldingEngine.calculate(params as ValidatedParams);
            break;
          }
          case "eb_welding_calc": {
            const { ebWeldingEngine } = await import("../../engines/EBWeldingEngine.js");
            result = ebWeldingEngine.calculate(params as ValidatedParams);
            break;
          }
          // ── Batch 99: Casting & Deposition ──
          case "vacuum_casting_calc": {
            const { vacuumCastingEngine } = await import("../../engines/VacuumCastingEngine.js");
            result = vacuumCastingEngine.calculate(params as ValidatedParams);
            break;
          }
          case "centrifugal_casting_calc": {
            const { centrifugalCastingEngine } = await import("../../engines/CentrifugalCastingEngine.js");
            result = centrifugalCastingEngine.calculate(params as ValidatedParams);
            break;
          }
          case "thin_film_deposition_calc": {
            const { thinFilmDepositionEngine } = await import("../../engines/ThinFilmDepositionEngine.js");
            result = thinFilmDepositionEngine.calculate(params as ValidatedParams);
            break;
          }
          // ── Batch 100: Vapor Deposition & Ion Processes ──
          case "cvd_calc": {
            const { chemicalVaporDepositionEngine } = await import("../../engines/ChemicalVaporDepositionEngine.js");
            result = chemicalVaporDepositionEngine.calculate(params as ValidatedParams);
            break;
          }
          case "ion_implantation_calc": {
            const { ionImplantationEngine } = await import("../../engines/IonImplantationEngine.js");
            result = ionImplantationEngine.calculate(params as ValidatedParams);
            break;
          }
          case "sputtering_calc": {
            const { sputteringProcessEngine } = await import("../../engines/SputteringProcessEngine.js");
            result = sputteringProcessEngine.calculate(params as ValidatedParams);
            break;
          }
          // ── Batch 101: Evaporation & Granulation ──
          case "evaporator_process_calc": {
            const { evaporatorProcessEngine } = await import("../../engines/EvaporatorProcessEngine.js");
            result = evaporatorProcessEngine.calculate(params as ValidatedParams);
            break;
          }
          case "spray_drying_calc": {
            const { sprayDryingEngine } = await import("../../engines/SprayDryingEngine.js");
            result = sprayDryingEngine.calculate(params as ValidatedParams);
            break;
          }
          case "granulation_calc": {
            const { granulationProcessEngine } = await import("../../engines/GranulationProcessEngine.js");
            result = granulationProcessEngine.calculate(params as ValidatedParams);
            break;
          }
          // ── Batch 102: Polymer Processing ──
          case "rotational_molding_calc": {
            const { rotationalMoldingEngine } = await import("../../engines/RotationalMoldingEngine.js");
            result = rotationalMoldingEngine.calculate(params as ValidatedParams);
            break;
          }
          case "screw_extrusion_calc": {
            const { screwExtrusionEngine } = await import("../../engines/ScrewExtrusionEngine.js");
            result = screwExtrusionEngine.calculate(params as ValidatedParams);
            break;
          }
          case "compression_molding_calc": {
            const { compressionMoldingEngine } = await import("../../engines/CompressionMoldingEngine.js");
            result = compressionMoldingEngine.calculate(params as ValidatedParams);
            break;
          }
          // ── Batch 103: Material Handling ──
          case "vibratory_feeder_calc": {
            const { vibratoryFeederEngine } = await import("../../engines/VibratoryFeederEngine.js");
            result = vibratoryFeederEngine.calculate(params as ValidatedParams);
            break;
          }
          case "pneumatic_conveying_calc": {
            const { pneumaticConveyingEngine } = await import("../../engines/PneumaticConveyingEngine.js");
            result = pneumaticConveyingEngine.calculate(params as ValidatedParams);
            break;
          }
          case "electrostatic_precipitator_calc": {
            const { electrostaticPrecipitatorEngine } = await import("../../engines/ElectrostaticPrecipitatorEngine.js");
            result = electrostaticPrecipitatorEngine.calculate(params as ValidatedParams);
            break;
          }
          // ── Batch 104: Joining Processes ──
          case "resistance_welding_calc": {
            const { resistanceWeldingEngine } = await import("../../engines/ResistanceWeldingEngine.js");
            result = resistanceWeldingEngine.calculate(params as ValidatedParams);
            break;
          }
          case "soldering_calc": {
            const { solderingProcessEngine } = await import("../../engines/SolderingProcessEngine.js");
            result = solderingProcessEngine.calculate(params as ValidatedParams);
            break;
          }
          case "brazing_calc": {
            const { brazingProcessEngine } = await import("../../engines/BrazingProcessEngine.js");
            result = brazingProcessEngine.calculate(params as ValidatedParams);
            break;
          }
          // ── Batch 105: Surface Treatment ──
          case "electroplating_calc": {
            const { electroplatingEngine } = await import("../../engines/ElectroPlatingEngine.js");
            result = electroplatingEngine.calculate(params as ValidatedParams);
            break;
          }
          case "thermal_spray_calc": {
            const { thermalSprayEngine } = await import("../../engines/ThermalSprayEngine.js");
            result = thermalSprayEngine.calculate(params as ValidatedParams);
            break;
          }
          case "photochemical_etching_calc": {
            const { photochemicalEtchingEngine } = await import("../../engines/PhotochemicalEtchingEngine.js");
            result = photochemicalEtchingEngine.calculate(params as ValidatedParams);
            break;
          }

          // ── Batch 106: CNC Core Engines ──
          case "boring_bar_calc": {
            const { boringBarEngine } = await import("../../engines/BoringBarEngine.js");
            result = boringBarEngine.calculate(params as ValidatedParams);
            break;
          }
          case "part_deflection_calc": {
            const { partDeflectionEngine } = await import("../../engines/PartDeflectionEngine.js");
            result = partDeflectionEngine.calculate(params as ValidatedParams);
            break;
          }
          case "setup_reduction_calc": {
            const { setupReductionEngine } = await import("../../engines/SetupReductionEngine.js");
            result = setupReductionEngine.calculate(params as ValidatedParams);
            break;
          }
          case "machine_vibration_calc": {
            const { machineVibrationEngine } = await import("../../engines/MachineVibrationEngine.js");
            result = machineVibrationEngine.calculate(params as ValidatedParams);
            break;
          }
          case "runout_compensation_calc": {
            const { runoutCompensationEngine } = await import("../../engines/RunoutCompensationEngine.js");
            result = runoutCompensationEngine.calculate(params as ValidatedParams);
            break;
          }
          case "axis_compensation_calc": {
            const { axisCompensationEngine } = await import("../../engines/AxisCompensationEngine.js");
            result = axisCompensationEngine.calculate(params as ValidatedParams);
            break;
          }
          case "tool_presetting_calc": {
            const { toolPresettingEngine } = await import("../../engines/ToolPresettingEngine.js");
            result = toolPresettingEngine.calculate(params as ValidatedParams);
            break;
          }
          case "broaching_calc": {
            const { broachingEngine } = await import("../../engines/BroachingEngine.js");
            result = broachingEngine.calculate(params as ValidatedParams);
            break;
          }
          case "fatigue_life_calc": {
            const { fatigueLifeEngine } = await import("../../engines/FatigueLifeEngine.js");
            result = fatigueLifeEngine.calculate(params as ValidatedParams);
            break;
          }
          case "injection_molding_calc": {
            const { injectionMoldingEngine } = await import("../../engines/InjectionMoldingEngine.js");
            result = injectionMoldingEngine.calculate(params as ValidatedParams);
            break;
          }

          // ── Advanced Mathematical Methods (PCE, EMD, GARCH, LHS, CMA-ES, SVM, ALT) ──
          case "pce_compute": {
            const { AdvancedMathematicalMethodsEngine: AMM } = await import("../../engines/AdvancedMathematicalMethodsEngine.js");
            const amm = new AMM();
            result = amm.polynomialChaosExpansion(params as ValidatedParams);
            break;
          }
          case "emd_decompose": {
            const { AdvancedMathematicalMethodsEngine: AMM } = await import("../../engines/AdvancedMathematicalMethodsEngine.js");
            const amm = new AMM();
            result = amm.empiricalModeDecomposition(params as ValidatedParams);
            break;
          }
          case "garch_fit": {
            const { AdvancedMathematicalMethodsEngine: AMM } = await import("../../engines/AdvancedMathematicalMethodsEngine.js");
            const amm = new AMM();
            result = amm.garch(params as ValidatedParams);
            break;
          }
          case "lhs_sample": {
            const { AdvancedMathematicalMethodsEngine: AMM } = await import("../../engines/AdvancedMathematicalMethodsEngine.js");
            const amm = new AMM();
            result = amm.latinHypercubeSampling(params as ValidatedParams);
            break;
          }
          case "cmaes_optimize": {
            const { AdvancedMathematicalMethodsEngine: AMM } = await import("../../engines/AdvancedMathematicalMethodsEngine.js");
            const amm = new AMM();
            result = amm.cmaes(params as ValidatedParams);
            break;
          }
          case "svm_train": {
            const { AdvancedMathematicalMethodsEngine: AMM } = await import("../../engines/AdvancedMathematicalMethodsEngine.js");
            const amm = new AMM();
            result = amm.svm(params as ValidatedParams);
            break;
          }
          case "alt_analyze": {
            const { AdvancedMathematicalMethodsEngine: AMM } = await import("../../engines/AdvancedMathematicalMethodsEngine.js");
            const amm = new AMM();
            result = amm.acceleratedLifeTest(params as ValidatedParams);
            break;
          }

          case "deburring_recommend": {
            const { deburringEngine } = await import("../../engines/DeburringEngine.js");
            result = deburringEngine.recommend(params as ValidatedParams);
            break;
          }
          // ── Batch 107-108: CNC Core + Math/Stats + Mechanical ──
          case "ball_end_mill_calc": {
            const { ballEndMillEngine } = await import("../../engines/BallEndMillEngine.js");
            result = ballEndMillEngine.calculate(params as ValidatedParams);
            break;
          }
          case "chamfer_milling_calc": {
            const { chamferMillingEngine } = await import("../../engines/ChamferMillingEngine.js");
            result = chamferMillingEngine.calculate(params as ValidatedParams);
            break;
          }
          case "waterjet_calc": {
            const { waterjetEngine } = await import("../../engines/WaterjetEngine.js");
            result = waterjetEngine.calculate(params as ValidatedParams);
            break;
          }
          case "press_brake_calc": {
            const { pressBrakeEngine } = await import("../../engines/PressBrakeEngine.js");
            result = pressBrakeEngine.calculate(params as ValidatedParams);
            break;
          }
          case "cnc_maintenance_calc": {
            const { cncMaintenanceEngine } = await import("../../engines/CNCMaintenanceEngine.js");
            result = cncMaintenanceEngine.calculate(params as ValidatedParams);
            break;
          }
          case "grinding_wheel_calc": {
            const { grindingWheelEngine } = await import("../../engines/GrindingWheelEngine.js");
            result = grindingWheelEngine.calculate(params as ValidatedParams);
            break;
          }
          case "sheet_metal_nesting_calc": {
            const { sheetMetalNestingEngine } = await import("../../engines/SheetMetalNestingEngine.js");
            result = sheetMetalNestingEngine.calculate(params as ValidatedParams);
            break;
          }
          case "corrosion_rate_calc": {
            const { corrosionRateEngine } = await import("../../engines/CorrosionRateEngine.js");
            result = corrosionRateEngine.calculate(params as ValidatedParams);
            break;
          }
          case "countersink_calc": {
            const { countersinkEngine } = await import("../../engines/CountersinkEngine.js");
            result = countersinkEngine.calculate(params as ValidatedParams);
            break;
          }
          case "keyway_calc": {
            const { keywayEngine } = await import("../../engines/KeywayEngine.js");
            result = keywayEngine.calculate(params as ValidatedParams);
            break;
          }
          case "bar_feeder_calc": {
            const { barFeederEngine } = await import("../../engines/BarFeederEngine.js");
            result = barFeederEngine.calculate(params as ValidatedParams);
            break;
          }
          case "chip_conveyor_calc": {
            const { chipConveyorEngine } = await import("../../engines/ChipConveyorEngine.js");
            result = chipConveyorEngine.calculate(params as ValidatedParams);
            break;
          }
          case "circular_pocket_calc": {
            const { circularPocketEngine } = await import("../../engines/CircularPocketEngine.js");
            result = circularPocketEngine.calculate(params as ValidatedParams);
            break;
          }
          case "riveted_joint_calc": {
            const { rivetedJointEngine } = await import("../../engines/RivetedJointEngine.js");
            result = rivetedJointEngine.calculate(params as ValidatedParams);
            break;
          }
          case "vibration_isolator_calc": {
            const { vibrationIsolatorEngine } = await import("../../engines/VibrationIsolatorEngine.js");
            result = vibrationIsolatorEngine.calculate(params as ValidatedParams);
            break;
          }
          case "adhesive_bonding_calc": {
            const { adhesiveBondingEngine } = await import("../../engines/AdhesiveBondingEngine.js");
            result = adhesiveBondingEngine.calculate(params as ValidatedParams);
            break;
          }
          case "coating_thickness_calc": {
            const { coatingThicknessEngine } = await import("../../engines/CoatingThicknessEngine.js");
            result = coatingThicknessEngine.calculate(params as ValidatedParams);
            break;
          }
          case "anodizing_calc": {
            const { anodizingProcessEngine } = await import("../../engines/AnodizingProcessEngine.js");
            result = anodizingProcessEngine.calculate(params as ValidatedParams);
            break;
          }
          case "carburizing_calc": {
            const { carburizingEngine } = await import("../../engines/CarburizingEngine.js");
            result = carburizingEngine.calculate(params as ValidatedParams);
            break;
          }
          case "casting_defect_calc": {
            const { castingDefectEngine } = await import("../../engines/CastingDefectEngine.js");
            result = castingDefectEngine.calculate(params as ValidatedParams);
            break;
          }
          case "bayesian_inference_calc": {
            const { bayesianInferenceEngine } = await import("../../engines/BayesianInferenceEngine.js");
            result = bayesianInferenceEngine.calculate(params as ValidatedParams);
            break;
          }
          case "cluster_analysis_calc": {
            const { clusterAnalysisEngine } = await import("../../engines/ClusterAnalysisEngine.js");
            result = clusterAnalysisEngine.calculate(params as ValidatedParams);
            break;
          }
          case "principal_component_calc": {
            const { principalComponentEngine } = await import("../../engines/PrincipalComponentEngine.js");
            result = principalComponentEngine.calculate(params as ValidatedParams);
            break;
          }
          case "exponential_smoothing_calc": {
            const { exponentialSmoothingEngine } = await import("../../engines/ExponentialSmoothingEngine.js");
            result = exponentialSmoothingEngine.calculate(params as ValidatedParams);
            break;
          }
          case "time_series_arima_calc": {
            const { timeSeriesARIMAEngine } = await import("../../engines/TimeSeriesARIMAEngine.js");
            result = timeSeriesARIMAEngine.calculate(params as ValidatedParams);
            break;
          }
          case "optimization_simplex_calc": {
            const { optimizationSimplexEngine } = await import("../../engines/OptimizationSimplexEngine.js");
            result = optimizationSimplexEngine.calculate(params as ValidatedParams);
            break;
          }
          case "assignment_problem_calc": {
            const { assignmentProblemEngine } = await import("../../engines/AssignmentProblemEngine.js");
            result = assignmentProblemEngine.calculate(params as ValidatedParams);
            break;
          }
          case "transportation_problem_calc": {
            const { transportationProblemEngine } = await import("../../engines/TransportationProblemEngine.js");
            result = transportationProblemEngine.calculate(params as ValidatedParams);
            break;
          }
          case "network_flow_calc": {
            const { networkFlowEngine } = await import("../../engines/NetworkFlowEngine.js");
            result = networkFlowEngine.calculate(params as ValidatedParams);
            break;
          }
          case "topsis_calc": {
            const { topsisEngine } = await import("../../engines/TOPSISEngine.js");
            result = topsisEngine.calculate(params as ValidatedParams);
            break;
          }
          case "ahp_calc": {
            const { ahpEngine } = await import("../../engines/AHPEngine.js");
            result = ahpEngine.calculate(params as ValidatedParams);
            break;
          }
          case "inventory_eoq_calc": {
            const { inventoryEOQEngine } = await import("../../engines/InventoryEOQEngine.js");
            result = inventoryEOQEngine.calculate(params as ValidatedParams);
            break;
          }
          case "project_scheduling_calc": {
            const { projectSchedulingEngine } = await import("../../engines/ProjectSchedulingEngine.js");
            result = projectSchedulingEngine.calculate(params as ValidatedParams);
            break;
          }
          case "pid_controller_calc": {
            const { pidControllerEngine } = await import("../../engines/PIDControllerEngine.js");
            result = pidControllerEngine.calculate(params as ValidatedParams);
            break;
          }
          case "bolt_torque_calc": {
            const { boltTorqueEngine } = await import("../../engines/BoltTorqueEngine.js");
            result = boltTorqueEngine.calculate(params as ValidatedParams);
            break;
          }
          case "bearing_selection_calc": {
            const { bearingSelectionEngine } = await import("../../engines/BearingSelectionEngine.js");
            result = bearingSelectionEngine.calculate(params as ValidatedParams);
            break;
          }
          case "belt_drive_calc": {
            const { beltDriveEngine } = await import("../../engines/BeltDriveEngine.js");
            result = beltDriveEngine.calculate(params as ValidatedParams);
            break;
          }
          case "chain_drive_calc": {
            const { chainDriveEngine } = await import("../../engines/ChainDriveEngine.js");
            result = chainDriveEngine.calculate(params as ValidatedParams);
            break;
          }
          case "electric_motor_calc": {
            const { electricMotorEngine } = await import("../../engines/ElectricMotorEngine.js");
            result = electricMotorEngine.calculate(params as ValidatedParams);
            break;
          }
          case "flywheel_energy_calc": {
            const { flywheelEnergyEngine } = await import("../../engines/FlywheelEnergyEngine.js");
            result = flywheelEnergyEngine.calculate(params as ValidatedParams);
            break;
          }


          // ── Metaheuristic Optimization (GA, DE, PSO, SA, BayesOpt) ──
          case "bayesopt_optimize": {
            const { MetaheuristicOptimizationEngine: MHO } = await import("../../engines/MetaheuristicOptimizationEngine.js");
            const mho = new MHO();
            result = mho.bayesianOptimization(params as ValidatedParams);
            break;
          }

          // ── Statistical ML (MCMC, Bootstrap, PCA, K-Means, LogReg, Wavelet, CUSUM/EWMA) ──
          case "mcmc_sample": {
            const { StatisticalMLEngine: SML } = await import("../../engines/StatisticalMLEngine.js");
            const sml = new SML();
            result = sml.mcmc(params as ValidatedParams);
            break;
          }
          case "bootstrap_resample": {
            const { StatisticalMLEngine: SML } = await import("../../engines/StatisticalMLEngine.js");
            const sml = new SML();
            result = sml.bootstrap(params as ValidatedParams);
            break;
          }
          case "pca_analyze": {
            const { StatisticalMLEngine: SML } = await import("../../engines/StatisticalMLEngine.js");
            const sml = new SML();
            result = sml.pca(params as ValidatedParams);
            break;
          }
          case "kmeans_cluster": {
            const { StatisticalMLEngine: SML } = await import("../../engines/StatisticalMLEngine.js");
            const sml = new SML();
            result = sml.kMeans(params as ValidatedParams);
            break;
          }
          case "logistic_regression": {
            const { StatisticalMLEngine: SML } = await import("../../engines/StatisticalMLEngine.js");
            const sml = new SML();
            result = sml.logisticRegression(params as ValidatedParams);
            break;
          }
          case "wavelet_transform": {
            const { StatisticalMLEngine: SML } = await import("../../engines/StatisticalMLEngine.js");
            const sml = new SML();
            result = sml.waveletTransform(params as ValidatedParams);
            break;
          }
          case "control_chart": {
            const { StatisticalMLEngine: SML } = await import("../../engines/StatisticalMLEngine.js");
            const sml = new SML();
            result = sml.controlChart(params as ValidatedParams);
            break;
          }


          // -- Batch 109: Mechanical Design (15 engines) --
          case "ball_screw_calc": {
            const { ballScrewEngine } = await import("../../engines/BallScrewEngine.js");
            result = ballScrewEngine.calculate(params as ValidatedParams);
            break;
          }
          case "bevel_gear_calc": {
            const { bevelGearEngine } = await import("../../engines/BevelGearEngine.js");
            result = bevelGearEngine.calculate(params as ValidatedParams);
            break;
          }
          case "bolted_joint_calc": {
            const { boltedJointEngine } = await import("../../engines/BoltedJointEngine.js");
            result = boltedJointEngine.calculate(params as ValidatedParams);
            break;
          }
          case "column_buckling_calc": {
            const { columnBucklingEngine } = await import("../../engines/ColumnBucklingEngine.js");
            result = columnBucklingEngine.calculate(params as ValidatedParams);
            break;
          }
          case "connecting_rod_calc": {
            const { connectingRodEngine } = await import("../../engines/ConnectingRodEngine.js");
            result = connectingRodEngine.calculate(params as ValidatedParams);
            break;
          }
          case "coupling_selection_calc": {
            const { couplingSelectionEngine } = await import("../../engines/CouplingSelectionEngine.js");
            result = couplingSelectionEngine.calculate(params as ValidatedParams);
            break;
          }
          case "crankshaft_design_calc": {
            const { crankshaftDesignEngine } = await import("../../engines/CrankshaftDesignEngine.js");
            result = crankshaftDesignEngine.calculate(params as ValidatedParams);
            break;
          }
          case "disk_brake_calc": {
            const { diskBrakeEngine } = await import("../../engines/DiskBrakeEngine.js");
            result = diskBrakeEngine.calculate(params as ValidatedParams);
            break;
          }
          case "flange_bolt_calc": {
            const { flangeBoltEngine } = await import("../../engines/FlangeBoltEngine.js");
            result = flangeBoltEngine.calculate(params as ValidatedParams);
            break;
          }
          case "flywheel_calc": {
            const { flywheelEngine } = await import("../../engines/FlywheelEngine.js");
            result = flywheelEngine.calculate(params as ValidatedParams);
            break;
          }
          case "gear_train_calc": {
            const { gearTrainEngine } = await import("../../engines/GearTrainEngine.js");
            result = gearTrainEngine.calculate(params as ValidatedParams);
            break;
          }
          case "hertz_contact_calc": {
            const { hertzContactEngine } = await import("../../engines/HertzContactEngine.js");
            result = hertzContactEngine.calculate(params as ValidatedParams);
            break;
          }
          case "keyway_design_calc": {
            const { keywayDesignEngine } = await import("../../engines/KeywayDesignEngine.js");
            result = keywayDesignEngine.calculate(params as ValidatedParams);
            break;
          }
          case "leaf_spring_calc": {
            const { leafSpringEngine } = await import("../../engines/LeafSpringEngine.js");
            result = leafSpringEngine.calculate(params as ValidatedParams);
            break;
          }
          case "planetary_gear_calc": {
            const { planetaryGearEngine } = await import("../../engines/PlanetaryGearEngine.js");
            result = planetaryGearEngine.calculate(params as ValidatedParams);
            break;
          }

          // -- Batch 109: Fluid/Thermal/Process (15 engines) --
          case "centrifugal_pump_calc": {
            const { centrifugalPumpEngine } = await import("../../engines/CentrifugalPumpEngine.js");
            result = centrifugalPumpEngine.calculate(params as ValidatedParams);
            break;
          }
          case "compressor_design_calc": {
            const { compressorDesignEngine } = await import("../../engines/CompressorDesignEngine.js");
            result = compressorDesignEngine.calculate(params as ValidatedParams);
            break;
          }
          case "condenser_design_calc": {
            const { condenserDesignEngine } = await import("../../engines/CondenserDesignEngine.js");
            result = condenserDesignEngine.calculate(params as ValidatedParams);
            break;
          }
          case "cooling_tower_calc": {
            const { coolingTowerEngine } = await import("../../engines/CoolingTowerEngine.js");
            result = coolingTowerEngine.calculate(params as ValidatedParams);
            break;
          }
          case "heat_exchanger_calc": {
            const { heatExchangerEngine } = await import("../../engines/HeatExchangerEngine.js");
            result = heatExchangerEngine.calculate(params as ValidatedParams);
            break;
          }
          case "hydraulic_cylinder_calc": {
            const { hydraulicCylinderEngine } = await import("../../engines/HydraulicCylinderEngine.js");
            result = hydraulicCylinderEngine.calculate(params as ValidatedParams);
            break;
          }
          case "pipe_sizing_calc": {
            const { pipeSizingEngine } = await import("../../engines/PipeSizingEngine.js");
            result = pipeSizingEngine.calculate(params as ValidatedParams);
            break;
          }
          case "pipe_stress_calc": {
            const { pipeStressEngine } = await import("../../engines/PipeStressEngine.js");
            result = pipeStressEngine.calculate(params as ValidatedParams);
            break;
          }
          case "pump_selection_calc": {
            const { pumpSelectionEngine } = await import("../../engines/PumpSelectionEngine.js");
            result = pumpSelectionEngine.calculate(params as ValidatedParams);
            break;
          }
          case "valve_design_calc": {
            const { valveDesignEngine } = await import("../../engines/ValveDesignEngine.js");
            result = valveDesignEngine.calculate(params as ValidatedParams);
            break;
          }
          case "valve_sizing_calc": {
            const { valveSizingEngine } = await import("../../engines/ValveSizingEngine.js");
            result = valveSizingEngine.calculate(params as ValidatedParams);
            break;
          }
          case "nozzle_calc": {
            const { nozzleEngine } = await import("../../engines/NozzleEngine.js");
            result = nozzleEngine.calculate(params as ValidatedParams);
            break;
          }
          case "seal_selection_calc": {
            const { sealSelectionEngine } = await import("../../engines/SealSelectionEngine.js");
            result = sealSelectionEngine.calculate(params as ValidatedParams);
            break;
          }
          case "spring_design_calc": {
            const { springDesignEngine } = await import("../../engines/SpringDesignEngine.js");
            result = springDesignEngine.calculate(params as ValidatedParams);
            break;
          }
          case "tank_design_calc": {
            const { tankDesignEngine } = await import("../../engines/TankDesignEngine.js");
            result = tankDesignEngine.calculate(params as ValidatedParams);
            break;
          }


          // ── Phase 5 Forge: Additive Manufacturing Physics ──
          case "am_solidification": {
            const { additiveManufacturingPhysicsEngine } = await import("../../engines/AdditiveManufacturingPhysicsEngine.js");
            result = additiveManufacturingPhysicsEngine.solidification(params as ValidatedParams);
            break;
          }
          case "am_thermal_stress": {
            const { additiveManufacturingPhysicsEngine } = await import("../../engines/AdditiveManufacturingPhysicsEngine.js");
            result = additiveManufacturingPhysicsEngine.thermalStress(params as ValidatedParams);
            break;
          }
          case "am_scan_strategy": {
            const { additiveManufacturingPhysicsEngine } = await import("../../engines/AdditiveManufacturingPhysicsEngine.js");
            result = additiveManufacturingPhysicsEngine.scanStrategy(params as ValidatedParams);
            break;
          }
          case "am_process_window": {
            const { additiveManufacturingPhysicsEngine } = await import("../../engines/AdditiveManufacturingPhysicsEngine.js");
            result = additiveManufacturingPhysicsEngine.processWindow(params as ValidatedParams);
            break;
          }

          // ── Phase 5 Forge: Reliability Block Diagrams ──
          case "rbd_importance": {
            const { reliabilityBlockDiagramEngine } = await import("../../engines/ReliabilityBlockDiagramEngine.js");
            result = reliabilityBlockDiagramEngine.importanceMeasures(params as ValidatedParams);
            break;
          }
          case "rbd_monte_carlo": {
            const { reliabilityBlockDiagramEngine } = await import("../../engines/ReliabilityBlockDiagramEngine.js");
            result = reliabilityBlockDiagramEngine.monteCarloReliability(params as ValidatedParams);
            break;
          }
          case "rbd_redundancy": {
            const { reliabilityBlockDiagramEngine } = await import("../../engines/ReliabilityBlockDiagramEngine.js");
            result = reliabilityBlockDiagramEngine.optimizeRedundancy(params as ValidatedParams);
            break;
          }
          case "rbd_availability": {
            const { reliabilityBlockDiagramEngine } = await import("../../engines/ReliabilityBlockDiagramEngine.js");
            result = reliabilityBlockDiagramEngine.availability(params as ValidatedParams);
            break;
          }

          // ── Phase 5 Forge: Cryogenic Cutting ──
          case "cryo_surface_integrity": {
            const { cryogenicCuttingEngine } = await import("../../engines/CryogenicCuttingEngine.js");
            result = cryogenicCuttingEngine.cryoSurfaceIntegrity(params as ValidatedParams);
            break;
          }
          case "cryo_delivery_optimize": {
            const { cryogenicCuttingEngine } = await import("../../engines/CryogenicCuttingEngine.js");
            result = cryogenicCuttingEngine.deliveryOptimization(params as ValidatedParams);
            break;
          }
          case "cryo_mql": {
            const { cryogenicCuttingEngine } = await import("../../engines/CryogenicCuttingEngine.js");
            result = cryogenicCuttingEngine.cryoMQL(params as ValidatedParams);
            break;
          }

          // ── Phase 5 Forge: Machining Acoustics ──
          case "acoustics_shop_floor": {
            const { machiningAcousticsEngine } = await import("../../engines/MachiningAcousticsEngine.js");
            result = machiningAcousticsEngine.shopFloorNoise(params as ValidatedParams);
            break;
          }
          case "acoustics_noise_control": {
            const { machiningAcousticsEngine } = await import("../../engines/MachiningAcousticsEngine.js");
            result = machiningAcousticsEngine.noiseControl(params as ValidatedParams);
            break;
          }
          case "acoustics_chatter_noise": {
            const { machiningAcousticsEngine } = await import("../../engines/MachiningAcousticsEngine.js");
            result = machiningAcousticsEngine.chatterNoise(params as ValidatedParams);
            break;
          }

          // ── Phase 5 Forge: Laser Ablation Physics ──
          case "laser_haz": {
            const { laserAblationPhysicsEngine } = await import("../../engines/LaserAblationPhysicsEngine.js");
            result = laserAblationPhysicsEngine.heatAffectedZone(params as ValidatedParams);
            break;
          }
          case "laser_drilling": {
            const { laserAblationPhysicsEngine } = await import("../../engines/LaserAblationPhysicsEngine.js");
            result = laserAblationPhysicsEngine.laserDrilling(params as ValidatedParams);
            break;
          }
          case "laser_pulse_overlap": {
            const { laserAblationPhysicsEngine } = await import("../../engines/LaserAblationPhysicsEngine.js");
            result = laserAblationPhysicsEngine.pulseOverlap(params as ValidatedParams);
            break;
          }
          case "laser_plasma_shielding": {
            const { laserAblationPhysicsEngine } = await import("../../engines/LaserAblationPhysicsEngine.js");
            result = laserAblationPhysicsEngine.plasmaShielding(params as ValidatedParams);
            break;
          }

          // ── Science Coverage: Kienzle Force Model ──
          case "kienzle_force": {
            const { kienzleForceModelEngine } = await import("../../engines/KienzleForceModelEngine.js");
            result = kienzleForceModelEngine.calculateSpecificCuttingForce(params as ValidatedParams);
            break;
          }
          case "kienzle_coefficients": {
            const { kienzleForceModelEngine } = await import("../../engines/KienzleForceModelEngine.js");
            result = kienzleForceModelEngine.getKienzleCoefficientTable();
            break;
          }
          case "kienzle_milling": {
            const { kienzleForceModelEngine } = await import("../../engines/KienzleForceModelEngine.js");
            result = kienzleForceModelEngine.calculateMillingForces(params as ValidatedParams);
            break;
          }
          case "kienzle_size_effect": {
            const { kienzleForceModelEngine } = await import("../../engines/KienzleForceModelEngine.js");
            result = kienzleForceModelEngine.calculateSizeEffect(params as ValidatedParams);
            break;
          }
          // ── Science Coverage: Nelson SPC Rules ──
          case "nelson_spc_evaluate": {
            const { nelsonSPCRulesEngine } = await import("../../engines/NelsonSPCRulesEngine.js");
            result = nelsonSPCRulesEngine.evaluateAllRules(params.data || [], params.mean, params.sigma);
            break;
          }
          case "nelson_spc_chart": {
            const { nelsonSPCRulesEngine } = await import("../../engines/NelsonSPCRulesEngine.js");
            result = nelsonSPCRulesEngine.generateControlChart(params.data || [], params.mean, params.sigma);
            break;
          }
          case "nelson_spc_diagnose": {
            const { nelsonSPCRulesEngine } = await import("../../engines/NelsonSPCRulesEngine.js");
            const evalResult = nelsonSPCRulesEngine.evaluateAllRules(params.data || [], params.mean, params.sigma);
            result = nelsonSPCRulesEngine.diagnosePattern(evalResult.violations || []);
            break;
          }
          // ── Science Coverage: Miner Cumulative Damage ──
          case "miner_cumulative_damage": {
            const { minerCumulativeDamageEngine } = await import("../../engines/MinerCumulativeDamageEngine.js");
            result = minerCumulativeDamageEngine.calculateCumulativeDamage(params as ValidatedParams);
            break;
          }
          case "miner_sn_curve": {
            const { minerCumulativeDamageEngine } = await import("../../engines/MinerCumulativeDamageEngine.js");
            result = minerCumulativeDamageEngine.buildSNcurve(params as ValidatedParams);
            break;
          }
          case "miner_tool_fatigue": {
            const { minerCumulativeDamageEngine } = await import("../../engines/MinerCumulativeDamageEngine.js");
            result = minerCumulativeDamageEngine.calculateToolFatigueDamage(params as ValidatedParams);
            break;
          }
          case "miner_rainflow": {
            const { minerCumulativeDamageEngine } = await import("../../engines/MinerCumulativeDamageEngine.js");
            result = minerCumulativeDamageEngine.calculateRainflowDamage(params as ValidatedParams);
            break;
          }
          // ── Science Coverage: Stochastic Wrapper ──
          case "stochastic_wrap_mc": {
            const { stochasticWrapperEngine } = await import("../../engines/StochasticWrapperEngine.js");
            result = stochasticWrapperEngine.wrapWithMonteCarlo(params as ValidatedParams);
            break;
          }
          case "stochastic_wrap_fosm": {
            const { stochasticWrapperEngine } = await import("../../engines/StochasticWrapperEngine.js");
            result = stochasticWrapperEngine.wrapWithFOSM(params as ValidatedParams);
            break;
          }
          case "stochastic_wrap_pce": {
            const { stochasticWrapperEngine } = await import("../../engines/StochasticWrapperEngine.js");
            result = stochasticWrapperEngine.wrapWithPCE(params as ValidatedParams);
            break;
          }
          case "stochastic_sensitivity": {
            const { stochasticWrapperEngine } = await import("../../engines/StochasticWrapperEngine.js");
            result = stochasticWrapperEngine.sensitivityAnalysis(params as ValidatedParams);
            break;
          }
          case "stochastic_chain": {
            const { stochasticWrapperEngine } = await import("../../engines/StochasticWrapperEngine.js");
            result = stochasticWrapperEngine.propagateChain(params as ValidatedParams);
            break;
          }
          // ── Science Coverage: Morris Screening ──
          case "morris_screening": {
            const { morrisScreeningEngine } = await import("../../engines/MorrisScreeningEngine.js");
            result = morrisScreeningEngine.calculateElementaryEffects(params as ValidatedParams);
            break;
          }
          case "morris_classify": {
            const { morrisScreeningEngine } = await import("../../engines/MorrisScreeningEngine.js");
            const eeResult = morrisScreeningEngine.calculateElementaryEffects(params as ValidatedParams);
            result = morrisScreeningEngine.classifyParameters(eeResult);
            break;
          }
          // ── Science Coverage: Multiple Regression ──
          case "multiple_regression_fit": {
            const { multipleRegressionEngine } = await import("../../engines/MultipleRegressionEngine.js");
            result = multipleRegressionEngine.fit(params as ValidatedParams);
            break;
          }
          case "multiple_regression_predict": {
            const { multipleRegressionEngine } = await import("../../engines/MultipleRegressionEngine.js");
            result = multipleRegressionEngine.predict(params.X_new || params.X, params.model || params);
            break;
          }
          case "multiple_regression_diagnostics": {
            const { multipleRegressionEngine } = await import("../../engines/MultipleRegressionEngine.js");
            const fitResult = multipleRegressionEngine.fit(params as ValidatedParams);
            result = multipleRegressionEngine.diagnostics(fitResult);
            break;
          }
          case "ridge_regression": {
            const { multipleRegressionEngine } = await import("../../engines/MultipleRegressionEngine.js");
            result = multipleRegressionEngine.ridgeRegression(params as ValidatedParams);
            break;
          }


          // --- Batch 110A: Rotating Machinery & Power Transmission (10 engines) ---
          case "worm_gear_calc": {
            const { wormGearEngine } = await import("../../engines/WormGearEngine.js");
            result = wormGearEngine.calculate(params as ValidatedParams);
            break;
          }
          case "harmonic_drive_calc": {
            const { harmonicDriveEngine } = await import("../../engines/HarmonicDriveEngine.js");
            result = harmonicDriveEngine.calculate(params as ValidatedParams);
            break;
          }
          case "cycloid_drive_calc": {
            const { cycloidDriveEngine } = await import("../../engines/CycloidDriveEngine.js");
            result = cycloidDriveEngine.calculate(params as ValidatedParams);
            break;
          }
          case "hypoid_gear_calc": {
            const { hypoidGearEngine } = await import("../../engines/HypoidGearEngine.js");
            result = hypoidGearEngine.calculate(params as ValidatedParams);
            break;
          }
          case "rack_pinion_calc": {
            const { rackPinionEngine } = await import("../../engines/RackPinionEngine.js");
            result = rackPinionEngine.calculate(params as ValidatedParams);
            break;
          }
          case "gear_pump_calc": {
            const { gearPumpEngine } = await import("../../engines/GearPumpEngine.js");
            result = gearPumpEngine.calculate(params as ValidatedParams);
            break;
          }
          case "fluid_coupling_calc": {
            const { fluidCouplingEngine } = await import("../../engines/FluidCouplingEngine.js");
            result = fluidCouplingEngine.calculate(params as ValidatedParams);
            break;
          }
          case "clutch_design_calc": {
            const { clutchDesignEngine } = await import("../../engines/ClutchDesignEngine.js");
            result = clutchDesignEngine.calculate(params as ValidatedParams);
            break;
          }
          case "clutch_brake_calc": {
            const { clutchBrakeEngine } = await import("../../engines/ClutchBrakeEngine.js");
            result = clutchBrakeEngine.calculate(params as ValidatedParams);
            break;
          }
          case "coupling_calc": {
            const { couplingEngine } = await import("../../engines/CouplingEngine.js");
            result = couplingEngine.calculate(params as ValidatedParams);
            break;
          }

          // --- Batch 110B: Bearings, Joints & Shafts (10 engines) ---
          case "journal_bearing_calc": {
            const { journalBearingEngine } = await import("../../engines/JournalBearingEngine.js");
            result = journalBearingEngine.calculate(params as ValidatedParams);
            break;
          }
          case "rolling_bearing_calc": {
            const { rollingBearingEngine } = await import("../../engines/RollingBearingEngine.js");
            result = rollingBearingEngine.calculate(params as ValidatedParams);
            break;
          }
          case "rolling_contact_calc": {
            const { rollingContactEngine } = await import("../../engines/RollingContactEngine.js");
            result = rollingContactEngine.calculate(params as ValidatedParams);
            break;
          }
          case "spline_joint_calc": {
            const { splineJointEngine } = await import("../../engines/SplineJointEngine.js");
            result = splineJointEngine.calculate(params as ValidatedParams);
            break;
          }
          case "spline_stress_calc": {
            const { splineStressEngine } = await import("../../engines/SplineStressEngine.js");
            result = splineStressEngine.calculate(params as ValidatedParams);
            break;
          }
          case "keyway_stress_calc": {
            const { keywayStressEngine } = await import("../../engines/KeywayStressEngine.js");
            result = keywayStressEngine.calculate(params as ValidatedParams);
            break;
          }
          case "rivet_joint_calc": {
            const { rivetJointEngine } = await import("../../engines/RivetJointEngine.js");
            result = rivetJointEngine.calculate(params as ValidatedParams);
            break;
          }
          case "shaft_alignment_calc": {
            const { shaftAlignmentEngine } = await import("../../engines/ShaftAlignmentEngine.js");
            result = shaftAlignmentEngine.calculate(params as ValidatedParams);
            break;
          }
          case "linear_guide_calc": {
            const { linearGuideEngine } = await import("../../engines/LinearGuideEngine.js");
            result = linearGuideEngine.calculate(params as ValidatedParams);
            break;
          }
          case "linear_motion_calc": {
            const { linearMotionEngine } = await import("../../engines/LinearMotionEngine.js");
            result = linearMotionEngine.calculate(params as ValidatedParams);
            break;
          }

          // --- Batch 110C: Industrial/Process/Thermal (10 engines) ---
          case "hydraulic_motor_calc": {
            const { hydraulicMotorEngine } = await import("../../engines/HydraulicMotorEngine.js");
            result = hydraulicMotorEngine.calculate(params as ValidatedParams);
            break;
          }
          case "hydraulic_press_calc": {
            const { hydraulicPressEngine } = await import("../../engines/HydraulicPressEngine.js");
            result = hydraulicPressEngine.calculate(params as ValidatedParams);
            break;
          }
          case "pneumatic_cylinder_calc": {
            const { pneumaticCylinderEngine } = await import("../../engines/PneumaticCylinderEngine.js");
            result = pneumaticCylinderEngine.calculate(params as ValidatedParams);
            break;
          }
          case "steam_turbine_calc": {
            const { steamTurbineEngine } = await import("../../engines/SteamTurbineEngine.js");
            result = steamTurbineEngine.calculate(params as ValidatedParams);
            break;
          }
          case "turbine_blade_calc": {
            const { turbineBladeEngine } = await import("../../engines/TurbineBladeEngine.js");
            result = turbineBladeEngine.calculate(params as ValidatedParams);
            break;
          }
          case "furnace_heating_calc": {
            const { furnaceHeatingEngine } = await import("../../engines/FurnaceHeatingEngine.js");
            result = furnaceHeatingEngine.calculate(params as ValidatedParams);
            break;
          }
          case "rotary_kiln_calc": {
            const { rotaryKilnEngine } = await import("../../engines/RotaryKilnEngine.js");
            result = rotaryKilnEngine.calculate(params as ValidatedParams);
            break;
          }
          case "heat_exchanger_plate_calc": {
            const { heatExchangerPlateEngine } = await import("../../engines/HeatExchangerPlateEngine.js");
            result = heatExchangerPlateEngine.calculate(params as ValidatedParams);
            break;
          }
          case "crane_load_calc": {
            const { craneLoadEngine } = await import("../../engines/CraneLoadEngine.js");
            result = craneLoadEngine.calculate(params as ValidatedParams);
            break;
          }
          case "wire_rope_calc": {
            const { wireRopeEngine } = await import("../../engines/WireRopeEngine.js");
            result = wireRopeEngine.calculate(params as ValidatedParams);
            break;
          }

          // ── Batch 111: Math/Stats (10 engines) ──
          case "statistical_ml_calc": {
            const { StatisticalMLEngine } = await import("../../engines/StatisticalMLEngine.js");
            const eng = new StatisticalMLEngine();
            const method = params.method ?? "mcmc";
            const fn = (eng as any)[method];
            result = typeof fn === "function" ? fn.call(eng, params) : { error: `Unknown method: ${method}. Available: mcmc, bootstrap, pca, kMeans, logisticRegression, waveletTransform, controlChart` };
            break;
          }
          case "metaheuristic_optimization_calc": {
            const { MetaheuristicOptimizationEngine } = await import("../../engines/MetaheuristicOptimizationEngine.js");
            const eng = new MetaheuristicOptimizationEngine();
            const method = params.method ?? "geneticAlgorithm";
            const fn = (eng as any)[method];
            result = typeof fn === "function" ? fn.call(eng, params) : { error: `Unknown method: ${method}. Available: geneticAlgorithm, differentialEvolution, particleSwarmOptimization, simulatedAnnealing, bayesianOptimization` };
            break;
          }
          case "markov_decision_calc": {
            const { markovDecisionEngine } = await import("../../engines/MarkovDecisionEngine.js");
            result = markovDecisionEngine.calculate(params as ValidatedParams);
            break;
          }
          case "linear_regression_calc": {
            const { linearRegressionEngine } = await import("../../engines/LinearRegressionEngine.js");
            result = linearRegressionEngine.calculate(params as ValidatedParams);
            break;
          }
          case "predictive_failure_calc": {
            const { pfpEngine } = await import("../../engines/PredictiveFailureEngine.js");
            result = pfpEngine.assessRisk(params.dispatcher ?? "calcDispatcher", params.action ?? "unknown", params);
            break;
          }
          case "reliability_weibull_calc": {
            const { reliabilityWeibullEngine } = await import("../../engines/ReliabilityWeibullEngine.js");
            result = reliabilityWeibullEngine.calculate(params as ValidatedParams);
            break;
          }

          // ── Batch 111: Fatigue/Fracture (4 engines) ──
          case "fracture_toughness_calc": {
            const { fractureToughnessEngine } = await import("../../engines/FractureToughnessEngine.js");
            result = fractureToughnessEngine.calculate(params as ValidatedParams);
            break;
          }
          case "creep_life_calc": {
            const { creepLifeEngine } = await import("../../engines/CreepLifeEngine.js");
            result = creepLifeEngine.calculate(params as ValidatedParams);
            break;
          }
          case "thermal_fatigue_calc": {
            const { thermalFatigueEngine } = await import("../../engines/ThermalFatigueEngine.js");
            result = thermalFatigueEngine.calculate(params as ValidatedParams);
            break;
          }
          case "thermal_expansion_joint_calc": {
            const { thermalExpansionJointEngine } = await import("../../engines/ThermalExpansionJointEngine.js");
            result = thermalExpansionJointEngine.calculate(params as ValidatedParams);
            break;
          }

          // ── Batch 111: EDM (3 engines) ──
          case "edm_calc": {
            const { edmEngine } = await import("../../engines/EDMEngine.js");
            const edmMethod = params.edm_type === "sinker" ? "sinkerEDM" : "wireEDM";
            result = edmEngine[edmMethod](params as ValidatedParams);
            break;
          }
          case "edm_parameter_calc": {
            const { edmParameterEngine } = await import("../../engines/EDMParameterEngine.js");
            result = edmParameterEngine.calculate(params as ValidatedParams);
            break;
          }
          case "edm_wire_calc": {
            const { edmWireEngine } = await import("../../engines/EDMWireEngine.js");
            result = edmWireEngine.calculate(params as ValidatedParams);
            break;
          }

          // ── Batch 111: Industrial (3 engines) ──
          case "ergonomic_workstation_calc": {
            const { ergonomicWorkstationEngine } = await import("../../engines/ErgonomicWorkstationEngine.js");
            result = ergonomicWorkstationEngine.calculate(params as ValidatedParams);
            break;
          }
          case "noise_level_calc": {
            const { noiseLevelEngine } = await import("../../engines/NoiseLevelEngine.js");
            result = noiseLevelEngine.calculate(params as ValidatedParams);
            break;
          }
          case "propeller_calc": {
            const { propellerEngine } = await import("../../engines/PropellerEngine.js");
            result = propellerEngine.calculate(params as ValidatedParams);
            break;
          }
          case "shock_absorber_calc": {
            const { shockAbsorberEngine } = await import("../../engines/ShockAbsorberEngine.js");
            result = shockAbsorberEngine.calculate(params as ValidatedParams);
            break;
          }
          case "damper_design_calc": {
            const { damperDesignEngine } = await import("../../engines/DamperDesignEngine.js");
            result = damperDesignEngine.calculate(params as ValidatedParams);
            break;
          }
          case "torsion_bar_calc": {
            const { torsionBarEngine } = await import("../../engines/TorsionBarEngine.js");
            result = torsionBarEngine.calculate(params as ValidatedParams);
            break;
          }
          case "screw_jack_calc": {
            const { screwJackEngine } = await import("../../engines/ScrewJackEngine.js");
            result = screwJackEngine.calculate(params as ValidatedParams);
            break;
          }

          // ── Math Integration Pipelines ──
          case "robust_optimization": {
            const { MathIntegrationPipelineEngine: MIP } = await import("../../engines/MathIntegrationPipelineEngine.js");
            const mip = new MIP();
            result = mip.robustOptimization(params as ValidatedParams);
            break;
          }
          case "multivariate_spc": {
            const { MathIntegrationPipelineEngine: MIP } = await import("../../engines/MathIntegrationPipelineEngine.js");
            const mip = new MIP();
            result = mip.multivariateSPC(params as ValidatedParams);
            break;
          }
          case "smart_doe": {
            const { MathIntegrationPipelineEngine: MIP } = await import("../../engines/MathIntegrationPipelineEngine.js");
            const mip = new MIP();
            result = mip.smartDOE(params as ValidatedParams);
            break;
          }
          case "predictive_maintenance": {
            const { MathIntegrationPipelineEngine: MIP } = await import("../../engines/MathIntegrationPipelineEngine.js");
            const mip = new MIP();
            result = mip.predictiveMaintenance(params as ValidatedParams);
            break;
          }
          case "probabilistic_costing": {
            const { MathIntegrationPipelineEngine: MIP } = await import("../../engines/MathIntegrationPipelineEngine.js");
            const mip = new MIP();
            result = mip.probabilisticCosting(params as ValidatedParams);
            break;
          }
          case "capability_with_ci": {
            const { MathIntegrationPipelineEngine: MIP } = await import("../../engines/MathIntegrationPipelineEngine.js");
            const mip = new MIP();
            result = mip.capabilityWithCI(params as ValidatedParams);
            break;
          }
          case "process_fingerprint": {
            const { MathIntegrationPipelineEngine: MIP } = await import("../../engines/MathIntegrationPipelineEngine.js");
            const mip = new MIP();
            result = mip.processFingerprint(params as ValidatedParams);
            break;
          }

          case "material_variability": {
            const { materialBatchVariabilityEngine } = await import("../../engines/MaterialBatchVariabilityEngine.js");
            result = materialBatchVariabilityEngine.analyze(params as ValidatedParams);
            break;
          }
          // ── Batch 112A: Milling Operations (4 engines) ──
          case "circular_interpolation_calc": {
            const { circularInterpolationEngine } = await import("../../engines/CircularInterpolationEngine.js");
            const method = params.method ?? "bore";
            const fn = (circularInterpolationEngine as any)[method];
            result = typeof fn === "function" ? fn.call(circularInterpolationEngine, params) : { error: `Unknown method: ${method}. Available: bore, boss, arcFeedComp` };
            break;
          }
          case "helical_interpolation_calc": {
            const { helicalInterpolationEngine } = await import("../../engines/HelicalInterpolationEngine.js");
            const method = params.method ?? "threadMill";
            const fn = (helicalInterpolationEngine as any)[method];
            result = typeof fn === "function" ? fn.call(helicalInterpolationEngine, params) : { error: `Unknown method: ${method}. Available: threadMill, boreMill, ramp` };
            break;
          }
          case "ramping_calc": {
            const { rampingEngine } = await import("../../engines/RampingEngine.js");
            const method = params.method ?? "linearRamp";
            const fn = (rampingEngine as any)[method];
            result = typeof fn === "function" ? fn.call(rampingEngine, params) : { error: `Unknown method: ${method}. Available: linearRamp, helicalRamp` };
            break;
          }
          case "slotting_calc": {
            const { slottingEngine } = await import("../../engines/SlottingEngine.js");
            result = slottingEngine.calculate(params as ValidatedParams);
            break;
          }

          // ── Batch 112B: Grinding/Finishing (7 engines) ──
          case "grinding_force_calc": {
            const { grindingForceEngine } = await import("../../engines/GrindingForceEngine.js");
            result = grindingForceEngine.calculate(params as ValidatedParams);
            break;
          }
          case "grinding_surface_finish_calc": {
            const { grindingSurfaceFinishEngine } = await import("../../engines/GrindingSurfaceFinishEngine.js");
            result = grindingSurfaceFinishEngine.calculate(params as ValidatedParams);
            break;
          }
          case "centerless_grinding_calc": {
            const { centerlessGrindingEngine } = await import("../../engines/CenterlessGrindingEngine.js");
            result = centerlessGrindingEngine.calculate(params as ValidatedParams);
            break;
          }
          case "bore_finishing_calc": {
            const { boreFinishingEngine: boreFinEng } = await import("../../engines/BoreFinishingEngine.js");
            result = boreFinEng.calculate(params as ValidatedParams);
            break;
          }
          case "honing_calc": {
            const { honingEngine } = await import("../../engines/HoningEngine.js");
            result = honingEngine.calculate(params as ValidatedParams);
            break;
          }
          case "surface_finish_predictor_calc": {
            const { surfaceFinishPredictorEngine } = await import("../../engines/SurfaceFinishPredictorEngine.js");
            result = surfaceFinishPredictorEngine.predict(params as ValidatedParams);
            break;
          }
          case "surface_integrity_predictor_calc": {
            const { surfaceIntegrityPredictorEngine } = await import("../../engines/SurfaceIntegrityPredictorEngine.js");
            result = surfaceIntegrityPredictorEngine.compute(params as ValidatedParams);
            break;
          }

          // ── Batch 112C: Welding/Forming (6 engines) ──
          case "weld_distortion_calc": {
            const { weldDistortionEngine } = await import("../../engines/WeldDistortionEngine.js");
            result = weldDistortionEngine.calculate(params as ValidatedParams);
            break;
          }
          case "stamping_die_calc": {
            const { stampingDieEngine } = await import("../../engines/StampingDieEngine.js");
            result = stampingDieEngine.calculate(params as ValidatedParams);
            break;
          }
          case "extrusion_force_calc": {
            const { extrusionForceEngine } = await import("../../engines/ExtrusionForceEngine.js");
            result = extrusionForceEngine.calculate(params as ValidatedParams);
            break;
          }
          case "rolling_mill_calc": {
            const { rollingMillEngine } = await import("../../engines/RollingMillEngine.js");
            result = rollingMillEngine.calculate(params as ValidatedParams);
            break;
          }
          case "wire_drawing_calc": {
            const { wireDrawingEngine } = await import("../../engines/WireDrawingEngine.js");
            result = wireDrawingEngine.calculate(params as ValidatedParams);
            break;
          }
          case "tube_forming_calc": {
            const { tubeFormingEngine } = await import("../../engines/TubeFormingEngine.js");
            result = tubeFormingEngine.calculate(params as ValidatedParams);
            break;
          }

          case "stochastic_grinding": {
            const { stochasticGrindingEngine } = await import("../../engines/StochasticGrindingEngine.js");
            result = stochasticGrindingEngine.analyze(params as ValidatedParams);
            break;
          }
          case "thermal_wear_coupling": {
            const { thermalWearCouplingEngine } = await import("../../engines/ThermalWearCouplingEngine.js");
            result = thermalWearCouplingEngine.analyze(params as ValidatedParams);
            break;
          }
          case "stochastic_edm": {
            const { stochasticEDMEngine } = await import("../../engines/StochasticEDMEngine.js");
            result = stochasticEDMEngine.analyze(params as ValidatedParams);
            break;
          }
          case "environmental_variation": {
            const { environmentalVariationEngine } = await import("../../engines/EnvironmentalVariationEngine.js");
            result = environmentalVariationEngine.analyze(params as ValidatedParams);
            break;
          }

          // ── PHYS-MS4: Stochastic Extensions ──
          case "stochastic_composite_mc": {
            const { stochasticCompositesEngine } = await import("../../engines/StochasticCompositesEngine.js");
            result = stochasticCompositesEngine.monteCarloDelamination(params as ValidatedParams);
            break;
          }
          case "stochastic_composite_sensitivity": {
            const { stochasticCompositesEngine: scEngine } = await import("../../engines/StochasticCompositesEngine.js");
            result = scEngine.sensitivityAnalysis(params as ValidatedParams);
            break;
          }
          case "stochastic_grinding_mc": {
            const { stochasticGrindingDressingEngine } = await import("../../engines/StochasticGrindingDressingEngine.js");
            result = stochasticGrindingDressingEngine.monteCarloWheelLife(params as ValidatedParams);
            break;
          }
          case "stochastic_grinding_optimize": {
            const { stochasticGrindingDressingEngine: sgdEngine } = await import("../../engines/StochasticGrindingDressingEngine.js");
            result = sgdEngine.optimizeDressingUnderUncertainty(params as ValidatedParams);
            break;
          }

          // ── Phase 5 Forge C: Assembly Optimization ──
          case "assembly_line_balance": {
            const { assemblyOptimizationEngine } = await import("../../engines/AssemblyOptimizationEngine.js");
            result = assemblyOptimizationEngine.lineBalance(params as ValidatedParams);
            break;
          }
          case "assembly_peg_in_hole": {
            const { assemblyOptimizationEngine } = await import("../../engines/AssemblyOptimizationEngine.js");
            result = assemblyOptimizationEngine.pegInHole(params as ValidatedParams);
            break;
          }
          case "assembly_dfa_score": {
            const { assemblyOptimizationEngine } = await import("../../engines/AssemblyOptimizationEngine.js");
            result = assemblyOptimizationEngine.dfaScore(params as ValidatedParams);
            break;
          }

          // ── Phase 5 Forge C: Energy Harvesting ──
          case "harvest_em": {
            const { energyHarvestingEngine } = await import("../../engines/EnergyHarvestingEngine.js");
            result = energyHarvestingEngine.emHarvest(params as ValidatedParams);
            break;
          }
          case "harvest_process_budget": {
            const { energyHarvestingEngine } = await import("../../engines/EnergyHarvestingEngine.js");
            result = energyHarvestingEngine.processBudget(params as ValidatedParams);
            break;
          }
          case "harvest_roi": {
            const { energyHarvestingEngine } = await import("../../engines/EnergyHarvestingEngine.js");
            result = energyHarvestingEngine.harvestROI(params as ValidatedParams);
            break;
          }

          // ── Phase 5 Forge C: Transfer Learning ──
          case "transfer_gp": {
            const { transferLearningEngine } = await import("../../engines/TransferLearningEngine.js");
            result = transferLearningEngine.gpTransfer(params as ValidatedParams);
            break;
          }
          case "transfer_material": {
            const { transferLearningEngine } = await import("../../engines/TransferLearningEngine.js");
            result = transferLearningEngine.materialTransfer(params as ValidatedParams);
            break;
          }
          case "transfer_validate": {
            const { transferLearningEngine } = await import("../../engines/TransferLearningEngine.js");
            result = transferLearningEngine.validateTransfer(params as ValidatedParams);
            break;
          }

          // ── Phase 5 Forge C: CMM Path Planning ──
          case "cmm_sampling_strategy": {
            const { cmmPathPlanningEngine } = await import("../../engines/CMMPathPlanningEngine.js");
            result = cmmPathPlanningEngine.samplingStrategy(params as ValidatedParams);
            break;
          }
          case "cmm_datum_alignment": {
            const { cmmPathPlanningEngine } = await import("../../engines/CMMPathPlanningEngine.js");
            result = cmmPathPlanningEngine.datumAlignment(params as ValidatedParams);
            break;
          }
          case "cmm_feature_uncertainty": {
            const { cmmPathPlanningEngine } = await import("../../engines/CMMPathPlanningEngine.js");
            result = cmmPathPlanningEngine.featureUncertainty(params as ValidatedParams);
            break;
          }

          // ── Phase 5 Forge C: LAM Thermal Softening ──
          case "lam_tool_life": {
            const { lamThermalSofteningEngine } = await import("../../engines/LAMThermalSofteningEngine.js");
            result = lamThermalSofteningEngine.lamToolLife(params as ValidatedParams);
            break;
          }
          case "lam_optimal_spacing": {
            const { lamThermalSofteningEngine } = await import("../../engines/LAMThermalSofteningEngine.js");
            result = lamThermalSofteningEngine.optimalSpacing(params as ValidatedParams);
            break;
          }
          case "lam_economics": {
            const { lamThermalSofteningEngine } = await import("../../engines/LAMThermalSofteningEngine.js");
            result = lamThermalSofteningEngine.lamEconomics(params as ValidatedParams);
            break;
          }

          // ── USF-MS0: Speed/Feed Orchestrator ──
          case "sf_orchestrate": {
            const { speedFeedOrchestratorEngine } = await import("../../engines/SpeedFeedOrchestratorEngine.js");
            result = speedFeedOrchestratorEngine.compute(params as ValidatedParams);
            break;
          }
          case "sf_quick": {
            const { speedFeedOrchestratorEngine } = await import("../../engines/SpeedFeedOrchestratorEngine.js");
            result = speedFeedOrchestratorEngine.compute({ ...params, uncertainty_mode: "quick" } as ValidatedParams);
            break;
          }
          case "sf_resolve_machine": {
            const sfo1 = await import("../../engines/SpeedFeedOrchestratorEngine.js");
            result = sfo1.resolveMachineContextFn(sfo1.speedFeedOrchestratorEngine, params as ValidatedParams);
            break;
          }
          case "sf_resolve_tool": {
            const sfo2 = await import("../../engines/SpeedFeedOrchestratorEngine.js");
            result = sfo2.resolveToolContextFn(sfo2.speedFeedOrchestratorEngine, params as ValidatedParams);
            break;
          }
          case "sf_resolve_material": {
            const sfo3 = await import("../../engines/SpeedFeedOrchestratorEngine.js");
            result = sfo3.resolveMaterialContextFn(sfo3.speedFeedOrchestratorEngine, params as ValidatedParams);
            break;
          }
          case "sf_stochastic": {
            const { speedFeedOrchestratorEngine: sfoStoch } = await import("../../engines/SpeedFeedOrchestratorEngine.js");
            result = sfoStoch.compute({ ...params, output_detail: "full" } as ValidatedParams);
            break;
          }
          case "sf_compare": {
            const sfo4 = await import("../../engines/SpeedFeedOrchestratorEngine.js");
            result = sfo4.compareFn(sfo4.speedFeedOrchestratorEngine, params.scenarios as any);
            break;
          }
          case "sf_optimize": {
            const sfo5 = await import("../../engines/SpeedFeedOrchestratorEngine.js");
            result = sfo5.optimizeFn(sfo5.speedFeedOrchestratorEngine, params as ValidatedParams, params.objectives as string[]);
            break;
          }

          // ── QS-MS6: Cross-Pipeline What-If ──
          case "what_if_analyze": {
            const { crossPipelineWhatIfEngine } = await import("../../engines/CrossPipelineWhatIfEngine.js");
            result = crossPipelineWhatIfEngine.analyze(params as any);
            break;
          }

          // ── USF-MS0: User Tool Library ──
          case "tool_library_import_csv": {
            const { userToolLibraryEngine } = await import("../../engines/UserToolLibraryEngine.js");
            result = userToolLibraryEngine.importCSV(params as ValidatedParams);
            break;
          }
          case "tool_library_filter": {
            const { userToolLibraryEngine } = await import("../../engines/UserToolLibraryEngine.js");
            result = userToolLibraryEngine.filterForFeature(params as ValidatedParams);
            break;
          }
          case "tool_library_stats": {
            const { userToolLibraryEngine } = await import("../../engines/UserToolLibraryEngine.js");
            result = userToolLibraryEngine.getLibraryStats(params as ValidatedParams);
            break;
          }

          // ── USF-MS0: Part Geometry Pipeline ──

          case "fs_navigate": {
            const { fileSystemNavigatorEngine } = await import("../../engines/FileSystemNavigatorEngine.js");
            result = fileSystemNavigatorEngine.navigate({ topic: params.topic as string ?? "", type: params.type as any });
            break;
          }
          case "fs_navigate_find": {
            const { fileSystemNavigatorEngine } = await import("../../engines/FileSystemNavigatorEngine.js");
            result = fileSystemNavigatorEngine.find(params.topic as string ?? "");
            break;
          }
          case "dsl_resolve": {
            const { codeSystemIndexEngine } = await import("../../engines/CodeSystemIndexEngine.js");
            result = codeSystemIndexEngine.resolve(params.code as string ?? "");
            break;
          }
          case "dsl_search": {
            const { codeSystemIndexEngine } = await import("../../engines/CodeSystemIndexEngine.js");
            result = codeSystemIndexEngine.search(params.pattern as string ?? "", params.limit as number ?? 20);
            break;
          }



          // ── Dimensionless Numbers ──
          case "cutting_number": case "thermal_peclet": case "chip_formation_number":
          case "stability_number": case "wear_intensity": case "capability_number":
          case "machinability_index": case "thermal_damage_number":
          case "all_dimensionless": case "interpret_numbers": {
            const { DimensionlessNumbersEngine: DNE } = await import("../../engines/DimensionlessNumbersEngine.js");
            const dne = new DNE();
            const methodMap: Record<string,string> = {
              cutting_number: "cuttingNumber", thermal_peclet: "thermalPeclet",
              chip_formation_number: "chipFormationNumber", stability_number: "stabilityNumber",
              wear_intensity: "wearIntensity", capability_number: "processCapabilityNumber",
              machinability_index: "machinabilityIndex", thermal_damage_number: "thermalDamageNumber",
              all_dimensionless: "allNumbers", interpret_numbers: "interpret",
            };
            result = (dne as any)[methodMap[action]](params as ValidatedParams);
            break;
          }

          // ── Process Synthesis ──
          case "multi_physics_simulate": {
            const { ProcessSynthesisEngine: PSE } = await import("../../engines/ProcessSynthesisEngine.js");
            result = new PSE().multiPhysicsProcessSimulator(params as ValidatedParams);
            break;
          }
          case "auto_model_select": {
            const { ProcessSynthesisEngine: PSE } = await import("../../engines/ProcessSynthesisEngine.js");
            result = new PSE().automaticModelSelector(params as ValidatedParams);
            break;
          }
          case "physics_transfer": {
            const { ProcessSynthesisEngine: PSE } = await import("../../engines/ProcessSynthesisEngine.js");
            result = new PSE().physicsTransferLearning(params as ValidatedParams);
            break;
          }
          case "anomaly_classify": {
            const { ProcessSynthesisEngine: PSE } = await import("../../engines/ProcessSynthesisEngine.js");
            result = new PSE().processAnomalyClassifier(params as ValidatedParams);
            break;
          }
          case "experiment_sequence": {
            const { ProcessSynthesisEngine: PSE } = await import("../../engines/ProcessSynthesisEngine.js");
            result = new PSE().intelligentExperimentSequencer(params as ValidatedParams);
            break;
          }


          // ── Machine Learning Feedback ──
          case "record_measurement": case "machine_profile": case "auto_calibrate":
          case "learned_predict": case "accuracy_report": case "compare_machines":
          case "export_learning": case "import_learning": {
            const { MachineLearningFeedbackEngine: MLF } = await import("../../engines/MachineLearningFeedbackEngine.js");
            const mlf = new MLF();
            const mlfMap: Record<string,string> = {
              record_measurement: "recordMeasurement",
              machine_profile: "getMachineProfile",
              auto_calibrate: "autoCalibrate",
              learned_predict: "predict",
              accuracy_report: "getAccuracyReport",
              compare_machines: "compareMachines",
              export_learning: "exportLearningData",
              import_learning: "importLearningData",
            };
            result = (mlf as any)[mlfMap[action]](params as ValidatedParams);
            break;
          }



          // ── Feedback Persistence ──
          case "persist_learning": case "restore_learning": case "auto_match_prediction":
          case "fleet_learning": case "anomaly_guard": case "time_weighted_calibrate":
          case "parse_cmm_export": {
            const { FeedbackPersistenceEngine: FPE } = await import("../../engines/FeedbackPersistenceEngine.js");
            const fpe = new FPE();
            const fpeMap: Record<string,string> = {
              persist_learning: "persistToFile",
              restore_learning: "restoreFromFile",
              auto_match_prediction: "autoMatchPrediction",
              fleet_learning: "fleetLearning",
              anomaly_guard: "anomalyGuard",
              time_weighted_calibrate: "timeWeightedCalibrate",
              parse_cmm_export: "parseCMMExport",
            };
            result = (fpe as any)[fpeMap[action]](params as ValidatedParams);
            break;
          }



          // ── Stratified Calibration ──
          case "record_stratified": case "stratified_bias": case "calibrate_stratified":
          case "context_tree": case "environmental_adjust": case "tool_wear_bias_model":
          case "interaction_analysis": case "predict_full_context": {
            const { StratifiedCalibrationEngine: SCE } = await import("../../engines/StratifiedCalibrationEngine.js");
            const sce = new SCE();
            const sceMap: Record<string,string> = {
              record_stratified: "recordStratified",
              stratified_bias: "getStratifiedBias",
              calibrate_stratified: "calibrateStratified",
              context_tree: "getContextTree",
              environmental_adjust: "environmentalAdjust",
              tool_wear_bias_model: "toolWearBiasModel",
              interaction_analysis: "interactionAnalysis",
              predict_full_context: "predictionWithFullContext",
            };
            result = (sce as any)[sceMap[action]](params as ValidatedParams);
            break;
          }



          // ── Prediction Feedback Orchestrator ──
          case "submit_measurement": case "learned_prediction":
          case "batch_import_measurements": case "machine_intelligence":
          case "compare_and_learn": case "system_learning_status": {
            const { PredictionFeedbackOrchestratorEngine: PFO } = await import("../../engines/PredictionFeedbackOrchestratorEngine.js");
            const pfo = new PFO();
            const pfoMap: Record<string,string> = {
              submit_measurement: "submitMeasurement",
              learned_prediction: "getLearnedPrediction",
              batch_import_measurements: "batchImportMeasurements",
              machine_intelligence: "getMachineIntelligence",
              compare_and_learn: "compareAndLearn",
              system_learning_status: "systemLearningStatus",
            };
            result = (pfo as any)[pfoMap[action]](params as ValidatedParams);
            break;
          }


          // ── Advanced Cutting Phenomena (BUE, Usui, Brammertz, Colding, Coffin-Manson) ──
          case "cutting_phenomena_bue": case "cutting_phenomena_bue_effect":
          case "cutting_phenomena_usui_crater": case "cutting_phenomena_combined_wear":
          case "cutting_phenomena_brammertz": case "cutting_phenomena_colding":
          case "cutting_phenomena_coffinmanson": {
            const { advancedCuttingPhenomenaEngine } = await import("../../engines/AdvancedCuttingPhenomenaEngine.js");
            const acpMap: Record<string, string> = {
              cutting_phenomena_bue: "predictBUEFormation",
              cutting_phenomena_bue_effect: "predictBUEEffect",
              cutting_phenomena_usui_crater: "calculateUsuiCraterWear",
              cutting_phenomena_combined_wear: "predictCombinedWear",
              cutting_phenomena_brammertz: "calculateBrammertzRoughness",
              cutting_phenomena_colding: "calculateColdingToolLife",
              cutting_phenomena_coffinmanson: "calculateCoffinManson",
            };
            result = (advancedCuttingPhenomenaEngine as any)[acpMap[action]](params as ValidatedParams);
            break;
          }

          // ── Advanced Cutting Physics Ext (BUE, Usui, Brammertz, Colding extended) ──
          case "cutting_physics_ext_bue": case "cutting_physics_ext_bue_speed_map":
          case "cutting_physics_ext_usui": case "cutting_physics_ext_combined_wear":
          case "cutting_physics_ext_brammertz": case "cutting_physics_ext_roughness_decomp":
          case "cutting_physics_ext_colding": case "cutting_physics_ext_taylor_colding":
          case "surface_integrity_prediction": {
            const { advancedCuttingPhysicsExtEngine } = await import("../../engines/AdvancedCuttingPhysicsExtEngine.js");
            const cpxMap: Record<string, string> = {
              cutting_physics_ext_bue: "predictBUE",
              cutting_physics_ext_bue_speed_map: "bueSpeedMap",
              cutting_physics_ext_usui: "usaiCraterWear",
              cutting_physics_ext_combined_wear: "combinedWear",
              cutting_physics_ext_brammertz: "brammertzRoughness",
              cutting_physics_ext_roughness_decomp: "surfaceRoughnessDecomposition",
              cutting_physics_ext_colding: "coldingToolLife",
              cutting_physics_ext_taylor_colding: "compareTaylorColding",
              surface_integrity_prediction: "surfaceIntegrityPrediction",
            };
            result = (advancedCuttingPhysicsExtEngine as any)[cpxMap[action]](params as ValidatedParams);
            break;
          }

          // ── Advanced ML Statistics (MCMC, RF, Logistic, Tool Breakage) ──
          case "ml_stats_metropolis_hastings": case "ml_stats_gibbs":
          case "ml_stats_bayesian_tool_life": case "ml_stats_rf_classify":
          case "ml_stats_rf_regress": case "ml_stats_feature_importance":
          case "ml_stats_logistic_fit": case "ml_stats_logistic_predict":
          case "ml_stats_tool_breakage": {
            const { advancedMLStatisticsEngine } = await import("../../engines/AdvancedMLStatisticsEngine.js");
            const mlsMap: Record<string, string> = {
              ml_stats_metropolis_hastings: "metropolisHastings",
              ml_stats_gibbs: "gibbsSampler",
              ml_stats_bayesian_tool_life: "bayesianToolLife",
              ml_stats_rf_classify: "randomForestClassify",
              ml_stats_rf_regress: "randomForestRegress",
              ml_stats_feature_importance: "featureImportanceAnalysis",
              ml_stats_logistic_fit: "logisticRegressionFit",
              ml_stats_logistic_predict: "logisticPredict",
              ml_stats_tool_breakage: "toolBreakagePrediction",
            };
            result = (advancedMLStatisticsEngine as any)[mlsMap[action]](params as ValidatedParams);
            break;
          }

          // ── Advanced Regression (Kernel Ridge, GMM, Quantile, Isotonic, Huber, Stacking, AdaBoost, Boosting) ──
          case "regression_kernel_ridge": case "regression_gmm_em":
          case "regression_gmm_optimal": case "regression_quantile":
          case "regression_isotonic": case "regression_huber":
          case "regression_stacking": case "regression_adaboost":
          case "regression_regularized_boosting": {
            const { advancedRegressionEngine } = await import("../../engines/AdvancedRegressionEngine.js");
            const arMap: Record<string, string> = {
              regression_kernel_ridge: "kernelRidgeRegression",
              regression_gmm_em: "gaussianMixtureEM",
              regression_gmm_optimal: "gmmOptimalComponents",
              regression_quantile: "quantileRegression",
              regression_isotonic: "isotonicRegression",
              regression_huber: "huberRegression",
              regression_stacking: "stackingEnsemble",
              regression_adaboost: "adaBoostRegress",
              regression_regularized_boosting: "regularizedBoosting",
            };
            result = (advancedRegressionEngine as any)[arMap[action]](params as ValidatedParams);
            break;
          }

          // ── Advanced Statistical Learning (MCMC, Bayesian LinReg, RF, Logistic, Permutation) ──
          case "stat_learning_mcmc": case "stat_learning_gibbs":
          case "stat_learning_bayesian_linreg": case "stat_learning_rf_classify":
          case "stat_learning_rf_regress": case "stat_learning_rf_tool_condition":
          case "stat_learning_logistic_fit": case "stat_learning_logistic_predict":
          case "stat_learning_logistic_breakage": case "stat_learning_permutation": {
            const { advancedStatisticalLearningEngine } = await import("../../engines/AdvancedStatisticalLearningEngine.js");
            const aslMap: Record<string, string> = {
              stat_learning_mcmc: "mcmcSample",
              stat_learning_gibbs: "gibbsSampler",
              stat_learning_bayesian_linreg: "bayesianLinearRegression",
              stat_learning_rf_classify: "randomForestClassify",
              stat_learning_rf_regress: "randomForestRegress",
              stat_learning_rf_tool_condition: "randomForestToolCondition",
              stat_learning_logistic_fit: "logisticRegressionFit",
              stat_learning_logistic_predict: "logisticRegressionPredict",
              stat_learning_logistic_breakage: "logisticToolBreakage",
              stat_learning_permutation: "permutationTest",
            };
            result = (advancedStatisticalLearningEngine as any)[aslMap[action]](params as ValidatedParams);
            break;
          }

          // ── Advanced Uncertainty (Kriging, Sobol, QMC, Halton, Copula) ──
          case "uncertainty_kriging_fit": case "uncertainty_kriging_predict":
          case "uncertainty_surrogate_optimize": case "uncertainty_kriging_manufacturing":
          case "uncertainty_sobol_sequence": case "uncertainty_qmc_integrate":
          case "uncertainty_qmc_uq": case "uncertainty_halton_sequence":
          case "uncertainty_gaussian_copula": case "uncertainty_correlated_uq":
          case "uncertainty_correlation_from_data": {
            const { advancedUncertaintyEngine } = await import("../../engines/AdvancedUncertaintyEngine.js");
            const aueMap: Record<string, string> = {
              uncertainty_kriging_fit: "krigingFit",
              uncertainty_kriging_predict: "krigingPredict",
              uncertainty_surrogate_optimize: "surrogateOptimize",
              uncertainty_kriging_manufacturing: "krigingManufacturing",
              uncertainty_sobol_sequence: "sobolSequence",
              uncertainty_qmc_integrate: "quasiMonteCarloIntegrate",
              uncertainty_qmc_uq: "quasiMonteCarloUQ",
              uncertainty_halton_sequence: "haltonSequence",
              uncertainty_gaussian_copula: "gaussianCopula",
              uncertainty_correlated_uq: "correlatedUQ",
              uncertainty_correlation_from_data: "correlationFromData",
            };
            result = (advancedUncertaintyEngine as any)[aueMap[action]](params as ValidatedParams);
            break;
          }

          // ── Advanced Uncertainty Methods (QMC, Copula, Kriging, Adaptive Design) ──
          case "uq_methods_qmc": case "uq_methods_gaussian_copula":
          case "uq_methods_t_copula": case "uq_methods_fit_copula":
          case "uq_methods_kriging_fit": case "uq_methods_kriging_predict":
          case "uq_methods_kriging_uq": case "uq_methods_adaptive_design": {
            const { advancedUncertaintyMethodsEngine } = await import("../../engines/AdvancedUncertaintyMethodsEngine.js");
            const aumMap: Record<string, string> = {
              uq_methods_qmc: "quasiMonteCarlo",
              uq_methods_gaussian_copula: "gaussianCopula",
              uq_methods_t_copula: "tCopula",
              uq_methods_fit_copula: "fitCopula",
              uq_methods_kriging_fit: "krigingFit",
              uq_methods_kriging_predict: "krigingPredict",
              uq_methods_kriging_uq: "krigingBasedUQ",
              uq_methods_adaptive_design: "adaptiveDesign",
            };
            result = (advancedUncertaintyMethodsEngine as any)[aumMap[action]](params as ValidatedParams);
            break;
          }

          // ── UTS-Based Cutting Force (CTE/Mitsubishi empirical model) ──
          case "uts_based_force": {
            const { advancedCuttingMathEngine } = await import("../../engines/AdvancedCuttingMathEngine.js");
            result = advancedCuttingMathEngine.utsBasedForce(params as ValidatedParams);
            break;
          }

          case "helix_angle_force_decomposition": {
            const { advancedCuttingMathEngine } = await import("../../engines/AdvancedCuttingMathEngine.js");
            result = advancedCuttingMathEngine.helixAngleForceDecomposition(params as ValidatedParams);
            break;
          }

          // ── Coffin-Manson Fatigue (strain life, S-N curve, cyclic, thermal, multiaxial) ──
          case "fatigue_strain_life": case "fatigue_sn_curve":
          case "fatigue_cyclic_stress_strain": case "fatigue_thermal":
          case "fatigue_multiaxial": {
            const { coffinMansonFatigueEngine } = await import("../../engines/CoffinMansonFatigueEngine.js");
            const cmfMap: Record<string, string> = {
              fatigue_strain_life: "strainLifeAnalysis",
              fatigue_sn_curve: "snCurveGenerate",
              fatigue_cyclic_stress_strain: "cyclicStressStrain",
              fatigue_thermal: "thermalFatigue",
              fatigue_multiaxial: "multiaxialFatigue",
            };
            result = (coffinMansonFatigueEngine as any)[cmfMap[action]](params as ValidatedParams);
            break;
          }

          // ── Composite Machining Physics (delamination, fiber forces, thermal, wear, roughness, chip, energy) ──
          case "composite_delamination": case "composite_fiber_force":
          case "composite_delamination_factor": case "composite_thermal_damage":
          case "composite_tool_wear": case "composite_surface_roughness":
          case "composite_chip_formation": case "composite_cutting_energy": {
            const { CompositeMachiningPhysicsEngine } = await import("../../engines/CompositeMachiningPhysicsEngine.js");
            const cmpe = new CompositeMachiningPhysicsEngine();
            const cmpMap: Record<string, string> = {
              composite_delamination: "hochengDharanDelamination",
              composite_fiber_force: "fiberOrientationForce",
              composite_delamination_factor: "delaminationFactor",
              composite_thermal_damage: "thermalDamage",
              composite_tool_wear: "compositeToolWear",
              composite_surface_roughness: "compositeSurfaceRoughness",
              composite_chip_formation: "chipFormation",
              composite_cutting_energy: "specificCuttingEnergy",
            };
            result = (cmpe as any)[cmpMap[action]](params as ValidatedParams);
            break;
          }

          // ── Dimensional Analysis & Cross Validation (Buckingham Pi, k-fold, LOO, nested CV, model compare) ──
          case "dim_analysis_buckingham_pi": case "dim_analysis_machining":
          case "dim_analysis_consistency": case "cv_kfold":
          case "cv_leave_one_out": case "cv_repeated_kfold":
          case "cv_nested": case "cv_compare_models":
          case "cv_learning_curve": {
            const { dimensionalAnalysisCrossValidationEngine } = await import("../../engines/DimensionalAnalysisCrossValidationEngine.js");
            const dacvMap: Record<string, string> = {
              dim_analysis_buckingham_pi: "buckinghamPi",
              dim_analysis_machining: "machiningDimensionalAnalysis",
              dim_analysis_consistency: "dimensionalConsistencyCheck",
              cv_kfold: "kFoldCrossValidation",
              cv_leave_one_out: "leaveOneOutCV",
              cv_repeated_kfold: "repeatedKFoldCV",
              cv_nested: "nestedCrossValidation",
              cv_compare_models: "compareModels",
              cv_learning_curve: "learningCurve",
            };
            result = (dimensionalAnalysisCrossValidationEngine as any)[dacvMap[action]](params as ValidatedParams);
            break;
          }

          // ── Empirical Correlation (hardness, mechanical, thermal, cutting, surface, tool life, cost) ──
          case "empirical_hardness_convert": case "empirical_mechanical_from_hardness":
          case "empirical_thermal_properties": case "empirical_cutting_speed":
          case "empirical_feed_from_finish": case "empirical_depth_of_cut":
          case "empirical_surface_integrity": case "empirical_tool_life_multipliers":
          case "empirical_chip_breakability": case "empirical_cost_per_part":
          case "empirical_productivity": {
            const { empiricalCorrelationEngine } = await import("../../engines/EmpiricalCorrelationEngine.js");
            const ecMap: Record<string, string> = {
              empirical_hardness_convert: "hardnessConversions",
              empirical_mechanical_from_hardness: "mechanicalFromHardness",
              empirical_thermal_properties: "thermalPropertiesEstimate",
              empirical_cutting_speed: "cuttingSpeedFromHardness",
              empirical_feed_from_finish: "feedFromSurfaceFinish",
              empirical_depth_of_cut: "depthOfCutLimits",
              empirical_surface_integrity: "surfaceIntegrityCorrelations",
              empirical_tool_life_multipliers: "toolLifeMultipliers",
              empirical_chip_breakability: "chipBreakabilityIndex",
              empirical_cost_per_part: "costPerPartCorrelation",
              empirical_productivity: "productivityCorrelations",
            };
            result = (empiricalCorrelationEngine as any)[ecMap[action]](params as ValidatedParams);
            break;
          }

          // ── Fundamental Physics Completion (Archard, Merchant, Grinding, Hertz) ──
          case "physics_archard_wear": case "physics_archard_tool_wear":
          case "physics_merchant_shear": case "physics_merchant_force":
          case "physics_single_grit": case "physics_grinding_thermal":
          case "physics_hertz_contact": {
            const { fundamentalPhysicsCompletionEngine } = await import("../../engines/FundamentalPhysicsCompletionEngine.js");
            const fpcMap: Record<string, string> = {
              physics_archard_wear: "archardWear",
              physics_archard_tool_wear: "archardToolWear",
              physics_merchant_shear: "merchantShearAngle",
              physics_merchant_force: "merchantForceCircle",
              physics_single_grit: "singleGritMechanics",
              physics_grinding_thermal: "grindingThermalModel",
              physics_hertz_contact: "hertzContact",
            };
            result = (fundamentalPhysicsCompletionEngine as any)[fpcMap[action]](params as ValidatedParams);
            break;
          }

          // ── KDE & Gradient Boost (density estimation, anomaly, regression, classification, defect) ──
          case "kde_estimate": case "kde_2d":
          case "kde_density_anomaly": case "gradient_boost_regress":
          case "gradient_boost_classify": case "kde_manufacturing_defect": {
            const { kdeGradientBoostEngine } = await import("../../engines/KDEGradientBoostEngine.js");
            const kgbMap: Record<string, string> = {
              kde_estimate: "kernelDensityEstimate",
              kde_2d: "kde2d",
              kde_density_anomaly: "densityBasedAnomaly",
              gradient_boost_regress: "gradientBoostRegress",
              gradient_boost_classify: "gradientBoostClassify",
              kde_manufacturing_defect: "manufacturingDefectPrediction",
            };
            result = (kdeGradientBoostEngine as any)[kgbMap[action]](params as ValidatedParams);
            break;
          }

          // ── Permutation Test (two-sample, paired, correlation, ANOVA, bootstrap CI) ──
          case "permutation_two_sample": case "permutation_paired":
          case "permutation_correlation": case "permutation_anova":
          case "permutation_bootstrap_ci": {
            const { permutationTestEngine } = await import("../../engines/PermutationTestEngine.js");
            const ptMap: Record<string, string> = {
              permutation_two_sample: "twoSampleTest",
              permutation_paired: "pairedTest",
              permutation_correlation: "correlationTest",
              permutation_anova: "anovaPermutation",
              permutation_bootstrap_ci: "bootstrapConfidenceInterval",
            };
            result = (permutationTestEngine as any)[ptMap[action]](params as ValidatedParams);
            break;
          }

          // ── Process Fingerprint (capture, compare, drift, cluster, root cause, model) ──
          case "fingerprint_capture": case "fingerprint_compare":
          case "fingerprint_drift": case "fingerprint_cluster":
          case "fingerprint_root_cause": case "fingerprint_build_model": {
            const { processFingerprintEngine } = await import("../../engines/ProcessFingerprintEngine.js");
            const pfMap: Record<string, string> = {
              fingerprint_capture: "captureFingerprint",
              fingerprint_compare: "compareFingerprints",
              fingerprint_drift: "monitorDrift",
              fingerprint_cluster: "clusterProcessStates",
              fingerprint_root_cause: "rootCauseFromFingerprint",
              fingerprint_build_model: "buildProcessModel",
            };
            result = (processFingerprintEngine as any)[pfMap[action]](params as ValidatedParams);
            break;
          }

          // ── Reliability Optimization (RBDO, interval, PCE, robust design, system reliability, tolerance) ──
          case "reliability_rbdo": case "reliability_interval_arithmetic":
          case "reliability_sparse_pce": case "reliability_robust_design":
          case "reliability_system": case "reliability_tolerance_opt": {
            const { reliabilityOptimizationEngine } = await import("../../engines/ReliabilityOptimizationEngine.js");
            const roMap: Record<string, string> = {
              reliability_rbdo: "rbdoFirstOrder",
              reliability_interval_arithmetic: "intervalArithmetic",
              reliability_sparse_pce: "sparsePCE",
              reliability_robust_design: "robustDesignOptimization",
              reliability_system: "systemReliability",
              reliability_tolerance_opt: "manufacturingToleranceOptimization",
            };
            result = (reliabilityOptimizationEngine as any)[roMap[action]](params as ValidatedParams);
            break;
          }

          // ── Residual Stress Prediction (Hertzian, thermal, combined, burnishing, phase, fatigue, process) ──
          case "residual_stress_hertzian": case "residual_stress_thermal":
          case "residual_stress_combined": case "residual_stress_burnishing":
          case "residual_stress_phase_transform": case "residual_stress_fatigue":
          case "residual_stress_process_param": {
            const { residualStressPredictionEngine } = await import("../../engines/ResidualStressPredictionEngine.js");
            const rspMap: Record<string, string> = {
              residual_stress_hertzian: "calcHertzianStress",
              residual_stress_thermal: "calcThermalStress",
              residual_stress_combined: "calcCombinedProfile",
              residual_stress_burnishing: "calcBurnishingStress",
              residual_stress_phase_transform: "calcPhaseTransformStress",
              residual_stress_fatigue: "calcFatigueImpact",
              residual_stress_process_param: "calcProcessParamEffect",
            };
            result = (residualStressPredictionEngine as any)[rspMap[action]](params as ValidatedParams);
            break;
          }

          // ── Signal Processing Toolkit (filter, spectral, envelope, cepstral, order, quality) ──
          case "signal_digital_filter": case "signal_spectral_analysis":
          case "signal_envelope_analysis": case "signal_cepstral_analysis":
          case "signal_order_analysis": case "signal_quality_metrics": {
            const { signalProcessingToolkitEngine } = await import("../../engines/SignalProcessingToolkitEngine.js");
            const sptMap: Record<string, string> = {
              signal_digital_filter: "digitalFilter",
              signal_spectral_analysis: "spectralAnalysis",
              signal_envelope_analysis: "envelopeAnalysis",
              signal_cepstral_analysis: "cepstralAnalysis",
              signal_order_analysis: "orderAnalysis",
              signal_quality_metrics: "signalQualityMetrics",
            };
            result = (signalProcessingToolkitEngine as any)[sptMap[action]](params as ValidatedParams);
            break;
          }

          // ── Time Series Completion (Holt-Winters, ARIMAX, change point, regime, ES, STL) ──
          case "ts_holt_winters": case "ts_arimax":
          case "ts_change_point": case "ts_regime_switching":
          case "ts_exponential_smoothing": case "ts_seasonal_decomposition": {
            const { timeSeriesCompletionEngine } = await import("../../engines/TimeSeriesCompletionEngine.js");
            const tscMap: Record<string, string> = {
              ts_holt_winters: "holtWinters",
              ts_arimax: "arimaxForecast",
              ts_change_point: "changePointDetection",
              ts_regime_switching: "regimeSwitching",
              ts_exponential_smoothing: "exponentialSmoothing",
              ts_seasonal_decomposition: "seasonalDecomposition",
            };
            result = (timeSeriesCompletionEngine as any)[tscMap[action]](params as ValidatedParams);
            break;
          }

          // ── Variance Reduction (antithetic, control, importance, stratified, adaptive MC) ──
          case "variance_reduction_antithetic": case "variance_reduction_control":
          case "variance_reduction_importance": case "variance_reduction_stratified":
          case "variance_reduction_adaptive_mc": {
            const { varianceReductionEngine } = await import("../../engines/VarianceReductionEngine.js");
            const vrMap: Record<string, string> = {
              variance_reduction_antithetic: "antitheticVariates",
              variance_reduction_control: "controlVariates",
              variance_reduction_importance: "importanceSampling",
              variance_reduction_stratified: "stratifiedSampling",
              variance_reduction_adaptive_mc: "adaptiveMonteCarloUQ",
            };
            result = (varianceReductionEngine as any)[vrMap[action]](params as ValidatedParams);
            break;
          }


          // ── Self-Learning CAM (CK-MS8: Bayesian+Kalman+Fleet) ──
          case "cut_to_learn": {
            const { selfLearningCAMEngine } = await import("../../engines/SelfLearningCAMEngine.js");
            result = selfLearningCAMEngine.calculate("cut_to_learn", params as any);
            break;
          }
          case "digital_twin_sync": {
            const { selfLearningCAMEngine } = await import("../../engines/SelfLearningCAMEngine.js");
            result = selfLearningCAMEngine.calculate("digital_twin_sync", params as any);
            break;
          }
          case "strategy_ranking": {
            const { selfLearningCAMEngine } = await import("../../engines/SelfLearningCAMEngine.js");
            result = selfLearningCAMEngine.calculate("strategy_ranking", params as any);
            break;
          }
          case "anomaly_relearn": {
            const { selfLearningCAMEngine } = await import("../../engines/SelfLearningCAMEngine.js");
            result = selfLearningCAMEngine.calculate("anomaly_relearn", params as any);
            break;
          }
          case "fleet_learn": {
            const { selfLearningCAMEngine } = await import("../../engines/SelfLearningCAMEngine.js");
            result = selfLearningCAMEngine.calculate("fleet_learn", params as any);
            break;
          }

          // ── Resource Optimization: hyperMILL database extraction (2026-03-14) ──


          // ── MF-MS1: Feasibility Analysis ──────────────────────────
          case "feasibility_accessibility": {
            const { feasibilityAnalysisEngine } = await import(
              "../../engines/FeasibilityAnalysisEngine.js"
            );
            result = feasibilityAnalysisEngine.analyzeAccessibility(
              params.feature, params.tool,
              params.approach_direction || "top",
              params.cutting_force_N
            );
            break;
          }
          case "feasibility_workholding": {
            const { feasibilityAnalysisEngine } = await import(
              "../../engines/FeasibilityAnalysisEngine.js"
            );
            result = feasibilityAnalysisEngine.analyzeWorkholding(
              params.workpiece_state, params.clamping,
              params.operation_forces
            );
            break;
          }
          case "feasibility_rigidity": {
            const { feasibilityAnalysisEngine } = await import(
              "../../engines/FeasibilityAnalysisEngine.js"
            );
            result = feasibilityAnalysisEngine.analyzeRigidity(
              params.workpiece_state,
              params.wall_thickness_mm, params.wall_height_mm,
              params.material, params.wall_length_mm,
              params.floor_thickness_mm,
              params.floor_length_mm, params.floor_width_mm,
              params.spindle_speed_rpm, params.number_of_flutes
            );
            break;
          }

          // ── MF-MS2: Sequence Feasibility Engine ──────────────────
          case "sequence_simulate": {
            const { sequenceFeasibilityEngine } = await import(
              "../../engines/SequenceFeasibilityEngine.js"
            );
            result = sequenceFeasibilityEngine.calculate("sequence_simulate", params as any);
            break;
          }
          case "sequence_detect_deadends": {
            const { sequenceFeasibilityEngine } = await import(
              "../../engines/SequenceFeasibilityEngine.js"
            );
            result = sequenceFeasibilityEngine.calculate("sequence_detect_deadends", params as any);
            break;
          }
          case "sequence_resequence": {
            const { sequenceFeasibilityEngine } = await import(
              "../../engines/SequenceFeasibilityEngine.js"
            );
            result = sequenceFeasibilityEngine.calculate("sequence_resequence", params as any);
            break;
          }
          case "sequence_constraint_graph": {
            const { sequenceFeasibilityEngine } = await import(
              "../../engines/SequenceFeasibilityEngine.js"
            );
            result = sequenceFeasibilityEngine.calculate("sequence_constraint_graph", params as any);
            break;
          }

          // ── MF-MS3: Setup Transition Engine ──────────────────
          case "setup_transition_analyze": {
            const { setupTransitionEngine: ste } =
              await import("../../engines/SetupTransitionEngine.js");
            result = ste.analyzeSetupTransition(params as any);
            break;
          }
          case "predictive_failure_mc": {
            const { setupTransitionEngine: ste } =
              await import("../../engines/SetupTransitionEngine.js");
            result = ste.predictFailureProbability(params as any);
            break;
          }
          case "force_capability_analyze": {
            const { forceCapabilityEngine: fca } =
              await import("../../engines/ForceCapabilityEngine.js");
            result = fca.checkSingleOperation(
              params.machine,
              params.operation ?? params
            );
            break;
          }

          case "hybrid_coupled_physics": {
            const { physicsMLHybridEngine } = await import("../../engines/PhysicsMLHybridEngine.js");
            result = physicsMLHybridEngine.calculate("hybrid_coupled_physics", params.sub_action, params);
            break;
          }
          case "hybrid_ml_physics": {
            const { physicsMLHybridEngine } = await import("../../engines/PhysicsMLHybridEngine.js");
            result = physicsMLHybridEngine.calculate("hybrid_ml_physics", params.sub_action, params);
            break;
          }
          case "hybrid_optimization": {
            const { physicsMLHybridEngine } = await import("../../engines/PhysicsMLHybridEngine.js");
            result = physicsMLHybridEngine.calculate("hybrid_optimization", params.sub_action, params);
            break;
          }
          case "hybrid_online_learning": {
            const { physicsMLHybridEngine } = await import("../../engines/PhysicsMLHybridEngine.js");
            result = physicsMLHybridEngine.calculate("hybrid_online_learning", params.sub_action, params);
            break;
          }
          case "hybrid_system_level": {
            const { physicsMLHybridEngine } = await import("../../engines/PhysicsMLHybridEngine.js");
            result = physicsMLHybridEngine.calculate("hybrid_system_level", params.sub_action, params);
            break;
          }

          case "coolant_fluid_delivery": {
            const { coolantOptimizationPhysicsEngine: e1 } = await import(
              "../../engines/CoolantOptimizationPhysicsEngine.js"
            );
            result = e1.calculate({ action: "fluid_delivery", params });
            break;
          }
          case "coolant_mql_physics": {
            const { coolantOptimizationPhysicsEngine: e2 } = await import(
              "../../engines/CoolantOptimizationPhysicsEngine.js"
            );
            result = e2.calculate({ action: "mql_physics", params });
            break;
          }
          case "coolant_hpc_design": {
            const { coolantOptimizationPhysicsEngine: e3 } = await import(
              "../../engines/CoolantOptimizationPhysicsEngine.js"
            );
            result = e3.calculate({ action: "hpc_design", params });
            break;
          }
          case "coolant_health_monitor": {
            const { coolantOptimizationPhysicsEngine: e4 } = await import(
              "../../engines/CoolantOptimizationPhysicsEngine.js"
            );
            result = e4.calculate({ action: "coolant_health", params });
            break;
          }
          case "coolant_optimize_flow": {
            const { coolantOptimizationPhysicsEngine: e5 } = await import(
              "../../engines/CoolantOptimizationPhysicsEngine.js"
            );
            result = e5.calculate({ action: "optimize_flow", params });
            break;
          }
          // ── Scheduling Physics (5 actions) ──────────────────────
          case "calc_queue_theory":
          case "calc_batch_economics":
          case "calc_capacity_analysis":
          case "calc_schedule_metrics":
          case "calc_dynamic_priority": {
            const { schedulingPhysicsEngine: spe } = await import(
              "../../engines/SchedulingPhysicsEngine.js"
            );
            result = spe.calculate({ action, params });
            break;
          }

          // ── Optimization Formulas (5 actions) ─────────────────────
          case "calc_constrained_optimize":
          case "calc_pareto_front":
          case "calc_convergence_metrics":
          case "calc_sensitivity_analysis":
          case "calc_robust_design": {
            const { optimizationFormulasEngine: ofe } = await import(
              "../../engines/OptimizationFormulasEngine.js"
            );
            result = ofe.calculate({ action, params });
            break;
          }

          // ── Quality Formulas (5 actions) ──────────────────────────
          case "calc_gage_rr":
          case "calc_sampling_plan":
          case "calc_process_capability_advanced":
          case "calc_measurement_uncertainty":
          case "calc_conformance_decision": {
            const { qualityFormulasEngine: qfe } = await import(
              "../../engines/QualityFormulasEngine.js"
            );
            result = qfe.calculate({ action, params });
            break;
          }

          // ── AI/ML Formulas (5 actions) ────────────────────────────
          case "calc_feature_importance":
          case "calc_model_selection":
          case "calc_anomaly_detection":
          case "calc_time_series_ml":
          case "calc_reinforcement_learning": {
            const { aimlFormulasEngine: afe } = await import(
              "../../engines/AIMLFormulasEngine.js"
            );
            result = afe.calculate({ action, params });
            break;
          }

          // ── Fixture Dynamics (5 actions) ──
          case "fixture_vacuum_hold":
          case "fixture_chuck_speed":
          case "fixture_adaptive_clamp":
          case "fixture_layout_321":
          case "fixture_clamp_contact_stress": {
            const { fixtureDynamicsEngine: fde } = await import("../../engines/FixtureDynamicsEngine.js");
            result = fde.calculate({ action, params });
            break;
          }

          // ── Digital Twin Formulas (4 actions) ──
          case "digital_twin_ekf_predict":
          case "digital_twin_ekf_update":
          case "digital_twin_drift_detect":
          case "digital_twin_divergence": {
            const { digitalTwinFormulasEngine: dtfe } = await import("../../engines/DigitalTwinFormulasEngine.js");
            result = dtfe.calculate({ action, params });
            break;
          }

          // ── Metrology Budget (4 actions) ──
          case "metrology_expanded_uncertainty":
          case "metrology_thermal_compensation":
          case "metrology_conformance_probability":
          case "metrology_guard_band": {
            const { metrologyBudgetEngine: mbe } = await import("../../engines/MetrologyBudgetEngine.js");
            result = mbe.calculate({ action, params });
            break;
          }

          // ── Sustainability Formulas (4 actions) ──
          case "sustainability_carbon_footprint":
          case "sustainability_specific_energy":
          case "sustainability_coolant_lifecycle":
          case "sustainability_material_utilization": {
            const { sustainabilityFormulasEngine: sfe } = await import("../../engines/SustainabilityFormulasEngine.js");
            result = sfe.calculate({ action, params });
            break;
          }

          case "physics_verify": {
            const { unifiedPhysicsVerifierEngine } = await import("../../engines/UnifiedPhysicsVerifierEngine.js");
            result = unifiedPhysicsVerifierEngine.verify(params as any);
            break;
          }

          case "calibrate_physics": {
            const { physicsAutoCalibrationEngine: pace } = await import("../../engines/PhysicsAutoCalibrationEngine.js");
            result = pace.submit(params as any);
            break;
          }

          case "get_calibrated_constants": {
            const { physicsAutoCalibrationEngine: pace } = await import("../../engines/PhysicsAutoCalibrationEngine.js");
            result = pace.predict(params as any);
            break;
          }

          case "calibration_status": {
            const { physicsAutoCalibrationEngine: pace } = await import("../../engines/PhysicsAutoCalibrationEngine.js");
            const state = pace.getState();
            result = {
              total_measurements: state.total_measurements,
              materials_calibrated: Object.keys(state.materials).length,
              materials: Object.fromEntries(
                Object.entries(state.materials).map(([k, v]) => [k, {
                  kc1_1: v.kc1_1.mean,
                  mc: v.mc.mean,
                  taylor_C: v.taylor_C.mean,
                  taylor_n: v.taylor_n.mean,
                  n_observations: Math.max(v.kc1_1.n_observations, v.taylor_C.n_observations),
                }])
              ),
              last_updated: state.last_updated,
            };
            break;
          }

          case "calibration_reset": {
            const { physicsAutoCalibrationEngine: pace } = await import("../../engines/PhysicsAutoCalibrationEngine.js");
            result = pace.reset(params as any);
            break;
          }

          case "calibration_export": {
            const { physicsAutoCalibrationEngine: pace } = await import("../../engines/PhysicsAutoCalibrationEngine.js");
            result = pace.exportCalibration();
            break;
          }

          case "calibration_import": {
            const { physicsAutoCalibrationEngine: pace } = await import("../../engines/PhysicsAutoCalibrationEngine.js");
            result = pace.importCalibration(params as any);
            break;
          }

          // ── QS-MS6 P3: Pipeline Consistency Hook ──
          case "consistency_check":
          case "consistency_history":
          case "consistency_summary":
          case "consistency_clear": {
            const { pipelineConsistencyHookEngine: pche } = await import("../../engines/PipelineConsistencyHookEngine.js");
            result = pche.calculate(action, params as any);
            break;
          }
          // ── Non-Traditional Machining: USM, ECM, AJM ──
          case "usm_mrr": {
            const { ultrasonicMachiningPhysicsEngine } = await import("../../engines/UltrasonicMachiningPhysicsEngine.js");
            result = ultrasonicMachiningPhysicsEngine.predictMRR(params as any);
            break;
          }
          case "usm_abrasive_select": {
            const { ultrasonicMachiningPhysicsEngine } = await import("../../engines/UltrasonicMachiningPhysicsEngine.js");
            result = ultrasonicMachiningPhysicsEngine.selectAbrasive(params as any);
            break;
          }
          case "usm_feasibility": {
            const { ultrasonicMachiningPhysicsEngine } = await import("../../engines/UltrasonicMachiningPhysicsEngine.js");
            result = ultrasonicMachiningPhysicsEngine.assessFeasibility(params as any);
            break;
          }
          case "ecm_mrr": {
            const { electrochemicalMachiningEngine } = await import("../../engines/ElectrochemicalMachiningEngine.js");
            result = electrochemicalMachiningEngine.predictMRR(params as any);
            break;
          }
          case "ecm_electrode_design": {
            const { electrochemicalMachiningEngine } = await import("../../engines/ElectrochemicalMachiningEngine.js");
            result = electrochemicalMachiningEngine.designToolElectrode(params as any);
            break;
          }
          case "ecm_surface_quality": {
            const { electrochemicalMachiningEngine } = await import("../../engines/ElectrochemicalMachiningEngine.js");
            result = electrochemicalMachiningEngine.predictSurfaceQuality(params as any);
            break;
          }
          case "ajm_cutting": {
            const { abrasiveJetMachiningEngine } = await import("../../engines/AbrasiveJetMachiningEngine.js");
            result = abrasiveJetMachiningEngine.predictCutting(params as any);
            break;
          }
          case "ajm_optimize": {
            const { abrasiveJetMachiningEngine } = await import("../../engines/AbrasiveJetMachiningEngine.js");
            result = abrasiveJetMachiningEngine.optimizeParameters(params as any);
            break;
          }
          case "ajm_nozzle_wear": {
            const { abrasiveJetMachiningEngine } = await import("../../engines/AbrasiveJetMachiningEngine.js");
            result = abrasiveJetMachiningEngine.predictNozzleWear(params as any);
            break;
          }

          case "dimension_impute_build": {
            const { dimensionImputationEngine: dimImpEngine } = await import("../../engines/DimensionImputationEngine.js");
            const buildResult = dimImpEngine.buildModels(params.tools ?? []);
            result = buildResult;
            break;
          }

          case "dimension_impute_apply": {
            const { dimensionImputationEngine: dimImpApply } = await import("../../engines/DimensionImputationEngine.js");
            if (params.tools_train) {
              dimImpApply.buildModels(params.tools_train);
            }
            const imputed = dimImpApply.imputeDimensions(params.tools ?? []);
            result = { toolsImputed: imputed.length, results: imputed };
            break;
          }

          case "dimension_impute_stats": {
            const { dimensionImputationEngine: dimImpStats } = await import("../../engines/DimensionImputationEngine.js");
            result = dimImpStats.getStats(params.tools ?? []);
            break;
          }

          case "dimension_impute_outliers": {
            const { dimensionImputationEngine: dimImpOut } = await import("../../engines/DimensionImputationEngine.js");
            const outliers = dimImpOut.detectOutliers(
              params.tools ?? [],
              params.z_threshold ?? 3,
            );
            result = { count: outliers.length, outliers };
            break;
          }

          // --- Industry Standards Compliance ---
          case "standards_check_compliance": {
            const { industryStandardsComplianceEngine: isce } = await import("../../engines/IndustryStandardsComplianceEngine.js");
            result = isce.checkCompliance(params as any);
            break;
          }
          case "standards_get_requirements": {
            const { industryStandardsComplianceEngine: isge } = await import("../../engines/IndustryStandardsComplianceEngine.js");
            result = isge.getRequirements(params as any);
            break;
          }
          case "standards_suggest": {
            const { industryStandardsComplianceEngine: isse } = await import("../../engines/IndustryStandardsComplianceEngine.js");
            result = isse.suggestStandards(params as any);
            break;
          }

          // --- Testing Protocols ---
          case "test_protocol_tool_life": {
            const { testingProtocolEngine: tpTL } = await import("../../engines/TestingProtocolEngine.js");
            result = tpTL.generateToolLifeTest(params as any);
            break;
          }
          case "test_protocol_surface": {
            const { testingProtocolEngine: tpSF } = await import("../../engines/TestingProtocolEngine.js");
            result = tpSF.generateSurfaceFinishTest(params as any);
            break;
          }
          case "test_protocol_dimensional": {
            const { testingProtocolEngine: tpDim } = await import("../../engines/TestingProtocolEngine.js");
            result = tpDim.generateDimensionalTest(params as any);
            break;
          }

          // --- Certification Tracking ---
          case "cert_track_material": {
            const { certificationTrackingEngine: ctMat } = await import("../../engines/CertificationTrackingEngine.js");
            result = ctMat.trackMaterialCert(params as any);
            break;
          }
          case "cert_track_tool": {
            const { certificationTrackingEngine: ctTool } = await import("../../engines/CertificationTrackingEngine.js");
            result = ctTool.trackToolCert(params as any);
            break;
          }
          case "cert_track_machine": {
            const { certificationTrackingEngine: ctMach } = await import("../../engines/CertificationTrackingEngine.js");
            result = ctMach.trackMachineCal(params as any);
            break;
          }
          case "cert_audit_report": {
            const { certificationTrackingEngine: ctAudit } = await import("../../engines/CertificationTrackingEngine.js");
            result = ctAudit.generateAuditReport(params as any);
            break;
          }

          // ── Production Optimization: Bottleneck Analysis ──
          // bottleneck_identify handled above (line ~2975, BottleneckIdentificationEngine)
          case "bottleneck_dbr": {
            const { bottleneckAnalysisEngine: bnkDbr } = await import("../../engines/BottleneckAnalysisEngine.js");
            result = bnkDbr.drumBufferRope(params as any);
            break;
          }
          case "bottleneck_sensitivity": {
            const { bottleneckAnalysisEngine: bnkSens } = await import("../../engines/BottleneckAnalysisEngine.js");
            result = bnkSens.sensitivityAnalysis(params as any);
            break;
          }

          // ── Production Optimization: Predictive Maintenance ──
          case "maintenance_assess_health": {
            const { predictiveMaintenanceOrchestratorEngine: pmHealth } = await import("../../engines/PredictiveMaintenanceOrchestratorEngine.js");
            result = pmHealth.assessMachineHealth(params as any);
            break;
          }
          case "maintenance_plan": {
            const { predictiveMaintenanceOrchestratorEngine: pmPlan } = await import("../../engines/PredictiveMaintenanceOrchestratorEngine.js");
            result = pmPlan.planMaintenance(params as any);
            break;
          }
          case "maintenance_failure_history": {
            const { predictiveMaintenanceOrchestratorEngine: pmHist } = await import("../../engines/PredictiveMaintenanceOrchestratorEngine.js");
            result = pmHist.analyzeFailureHistory(params as any);
            break;
          }

          // ── STEP Import (RX-MS0 P3-U02) ──────────────────────────────
          case "step_import": {
            const { stepImportEngine } = await import("../../engines/StepImportEngine.js");
            result = await stepImportEngine.importStep(params as any);
            break;
          }
          case "step_analyze": {
            const { stepImportEngine: sia } = await import("../../engines/StepImportEngine.js");
            result = await sia.analyzeStep(params as any);
            break;
          }
          case "step_features": {
            const { stepImportEngine: sif } = await import("../../engines/StepImportEngine.js");
            result = await sif.extractFeatures(params as any);
            break;
          }
          case "step_wall_thickness": {
            const { stepImportEngine: siw } = await import("../../engines/StepImportEngine.js");
            result = await siw.getWallThickness(params as any);
            break;
          }
          case "step_brep_summary": {
            const { stepImportEngine: sib } = await import("../../engines/StepImportEngine.js");
            result = await sib.toBRepSummary(params as any);
            break;
          }

          // ── ENRICH-MS4: Cross-Catalog Validation ──────────────────────
          case "cross_catalog_validate": {
            const { crossCatalogValidationEngine: ccv } = await import("../../engines/CrossCatalogValidationEngine.js");
            if (params.tools) ccv.loadTools(params.tools as any);
            result = ccv.runAll(params.tools as any);
            break;
          }
          case "cross_catalog_completeness": {
            const { crossCatalogValidationEngine: ccvC } = await import("../../engines/CrossCatalogValidationEngine.js");
            if (params.tools) ccvC.loadTools(params.tools as any);
            result = ccvC.scoreCompleteness(params.tools as any);
            break;
          }

          // ── Diamond Turning & Laser Interferometer ──
          case "diamond_turning_surface": {
            const { diamondTurningEngine } = await import("../../engines/DiamondTurningEngine.js");
            result = diamondTurningEngine.predictSurfaceFinish(params as any);
            break;
          }
          case "diamond_turning_forces": {
            const { diamondTurningEngine: dtf } = await import("../../engines/DiamondTurningEngine.js");
            result = dtf.calculateCuttingForces(params as any);
            break;
          }
          case "diamond_turning_wear": {
            const { diamondTurningEngine: dtw } = await import("../../engines/DiamondTurningEngine.js");
            result = dtw.assessToolWear(params as any);
            break;
          }
          case "diamond_turning_machine_config": {
            const { diamondTurningEngine: dtm } = await import("../../engines/DiamondTurningEngine.js");
            result = dtm.selectMachineConfig(params as any);
            break;
          }
          case "laser_interferometer_wavelength": {
            const { laserInterferometerCompensationEngine: lic } = await import("../../engines/LaserInterferometerCompensationEngine.js");
            result = lic.compensateWavelength(params as any);
            break;
          }
          case "laser_interferometer_comp_table": {
            const { laserInterferometerCompensationEngine: lict } = await import("../../engines/LaserInterferometerCompensationEngine.js");
            result = lict.generateCompensationTable(params as any);
            break;
          }
          case "laser_interferometer_plan": {
            const { laserInterferometerCompensationEngine: licp } = await import("../../engines/LaserInterferometerCompensationEngine.js");
            result = licp.planMeasurementCycle(params as any);
            break;
          }
          case "laser_interferometer_deadpath": {
            const { laserInterferometerCompensationEngine: licd } = await import("../../engines/LaserInterferometerCompensationEngine.js");
            result = licd.calculateDeadpathError(params as any);
            break;
          }

          // ── Standard Dimension Lookup (ISO 1832 / DIN 371/376 / ISO 13399) ──
          case "standard_dimension_lookup": {
            const { standardDimensionLookupEngine: sdl } = await import(
              "../../engines/StandardDimensionLookupEngine.js"
            );
            result = sdl.lookup(params as any);
            break;
          }
          case "standard_dimension_apply": {
            const { standardDimensionLookupEngine: sda } = await import(
              "../../engines/StandardDimensionLookupEngine.js"
            );
            result = sda.applyStandardDimensions(params.tools ?? []);
            break;
          }

          // ── Chatter/Dynamics Enhancements (Altintas/Budak, Schmitz) ──
          case "chatter_multi_frequency": {
            const { chatterStabilityLobeEngine: cslMF } = await import(
              "../../engines/ChatterStabilityLobeEngine.js"
            );
            result = cslMF.multiFrequencyStability(params as ValidatedParams);
            break;
          }
          case "sle_predict": {
            const { surfaceLocationErrorEngine: sleP } = await import(
              "../../engines/SurfaceLocationErrorEngine.js"
            );
            result = sleP.predictSLE(params as ValidatedParams);
            break;
          }
          case "sle_optimize_rpm": {
            const { surfaceLocationErrorEngine: sleO } = await import(
              "../../engines/SurfaceLocationErrorEngine.js"
            );
            result = sleO.optimizeRPMForSLE(params as ValidatedParams);
            break;
          }
          case "sle_combined_finish": {
            const { surfaceLocationErrorEngine: sleC } = await import(
              "../../engines/SurfaceLocationErrorEngine.js"
            );
            result = sleC.combinedFinishPrediction(params as ValidatedParams);
            break;
          }
          case "rcsa_predict_frf": {
            const { receptanceCouplingEngine: rcsaP } = await import(
              "../../engines/ReceptanceCouplingEngine.js"
            );
            result = rcsaP.predictToolPointFRF(params as ValidatedParams);
            break;
          }
          case "rcsa_compare": {
            const { receptanceCouplingEngine: rcsaC } = await import(
              "../../engines/ReceptanceCouplingEngine.js"
            );
            result = rcsaC.compareFRF(params as ValidatedParams);
            break;
          }
          case "rcsa_suggest_length": {
            const { receptanceCouplingEngine: rcsaL } = await import(
              "../../engines/ReceptanceCouplingEngine.js"
            );
            result = rcsaL.suggestToolLength(params as ValidatedParams);
            break;
          }

          // ── Grinding Burn Risk + Variable Helix Design (video learning) ──
          case "grinding_burn_risk": {
            const { grindingSurfaceFinishEngine } = await import("../../engines/GrindingSurfaceFinishEngine.js");
            result = grindingSurfaceFinishEngine.assessBurnRisk(params as ValidatedParams);
            break;
          }
          case "chatter_variable_helix_design": {
            const { dampingOptimizationEngine } = await import("../../engines/DampingOptimizationEngine.js");
            result = dampingOptimizationEngine.designVariableHelixTool(params as ValidatedParams);
            break;
          }

          // ── Part Similarity ──
          case "part_similarity_compare": {
            const { partSimilarityEngine } = await import("../../engines/PartSimilarityEngine.js");
            result = partSimilarityEngine.compare(params.part_a as ValidatedParams, params.part_b as ValidatedParams, params.custom_weights as ValidatedParams);
            break;
          }
          case "part_similarity_find_nearest": {
            const { partSimilarityEngine: psNearest } = await import("../../engines/PartSimilarityEngine.js");
            result = psNearest.findNearest(params.target as ValidatedParams, params.candidates as ValidatedParams, params.top_n as ValidatedParams, params.custom_weights as ValidatedParams);
            break;
          }
          case "part_similarity_batch": {
            const { partSimilarityEngine: psBatch } = await import("../../engines/PartSimilarityEngine.js");
            result = psBatch.batch(params.specs as ValidatedParams, params.custom_weights as ValidatedParams);
            break;
          }
          case "part_similarity_set_weights": {
            const { partSimilarityEngine: psWeights } = await import("../../engines/PartSimilarityEngine.js");
            result = psWeights.setWeights(params.weights as ValidatedParams);
            break;
          }

          // ── Adaptive Pipeline Generator ──
          case "adaptive_pipeline_generate": {
            const { adaptivePipelineGeneratorEngine } = await import("../../engines/AdaptivePipelineGeneratorEngine.js");
            result = adaptivePipelineGeneratorEngine.calculate("pipeline_adapt", params as ValidatedParams);
            break;
          }
          case "adaptive_pipeline_adapt_step": {
            const { adaptivePipelineGeneratorEngine: apStep } = await import("../../engines/AdaptivePipelineGeneratorEngine.js");
            result = apStep.calculate("pipeline_adapt_step", params as ValidatedParams);
            break;
          }
          case "adaptive_pipeline_preview": {
            const { adaptivePipelineGeneratorEngine: apPreview } = await import("../../engines/AdaptivePipelineGeneratorEngine.js");
            result = apPreview.calculate("pipeline_preview", params as ValidatedParams);
            break;
          }
          // ── Sampling Workflow ──
          case "sampling_feasibility":
          case "sampling_cam_strategy":
          case "sampling_post_processor":
          case "sampling_print_to_program":
          case "sampling_self_correct_sf": {
            const { samplingWorkflowEngine } = await import("../../engines/SamplingWorkflowEngine.js");
            result = samplingWorkflowEngine.calculate(action, params as ValidatedParams);
            break;
          }
          // ── CAM Plugin SDK ──
          case "sdk_optimize_sf":
          case "sdk_check_safety":
          case "sdk_suggest_tool":
          case "sdk_get_tip":
          case "sdk_batch": {
            const { camPluginSDKEngine } = await import("../../engines/CAMPluginSDKEngine.js");
            result = camPluginSDKEngine.calculate(action, params as ValidatedParams);
            break;
          }

          // ── Machine Envelope Guard ──
          case "machine_envelope_check": {
            const { machineEnvelopeGuardEngine } = await import("../../engines/MachineEnvelopeGuardEngine.js");
            const envelope = (params as any).machine
              ? machineEnvelopeGuardEngine.fromMachineData((params as any).machine)
              : (params as any).envelope;
            result = machineEnvelopeGuardEngine.check((params as any).params ?? params as any, envelope);
            break;
          }
          case "machine_envelope_batch": {
            const { machineEnvelopeGuardEngine } = await import("../../engines/MachineEnvelopeGuardEngine.js");
            const envelope = (params as any).machine
              ? machineEnvelopeGuardEngine.fromMachineData((params as any).machine)
              : (params as any).envelope;
            result = machineEnvelopeGuardEngine.checkBatch((params as any).blocks ?? [], envelope);
            break;
          }

          // ── Omega Safety Gate ──
          case "omega_safety_score": {
            const { omegaSafetyScoreEngine } = await import("../../engines/OmegaSafetyScoreEngine.js");
            // U-CN03: optional nn_confidence + nn_weight pull from params and
            // pass through as score() opts. When the assessment is the whole
            // params object (legacy), we also accept a wrapper shape:
            //   { assessment, nn_confidence, nn_weight }
            const p = params as Record<string, unknown>;
            const assessment = (p.assessment as Parameters<typeof omegaSafetyScoreEngine.score>[0]) ?? (p as Parameters<typeof omegaSafetyScoreEngine.score>[0]);
            const nnConfidence = typeof p.nn_confidence === "number" ? p.nn_confidence : undefined;
            const nnWeight = typeof p.nn_weight === "number" ? p.nn_weight : undefined;
            const opts = (nnConfidence !== undefined || nnWeight !== undefined)
              ? { nnConfidence, nnWeight }
              : undefined;
            result = omegaSafetyScoreEngine.score(assessment, opts);
            break;
          }
          case "omega_safety_evaluate": {
            const { omegaSafetyScoreEngine } = await import("../../engines/OmegaSafetyScoreEngine.js");
            const p = params as Record<string, unknown>;
            const nnConfidence = typeof p.nn_confidence === "number" ? p.nn_confidence : undefined;
            const nnWeight = typeof p.nn_weight === "number" ? p.nn_weight : undefined;
            const opts = (nnConfidence !== undefined || nnWeight !== undefined)
              ? { nnConfidence, nnWeight }
              : undefined;
            result = omegaSafetyScoreEngine.evaluate(
              p.operation as Parameters<typeof omegaSafetyScoreEngine.evaluate>[0],
              p.material as Parameters<typeof omegaSafetyScoreEngine.evaluate>[1],
              p.machine as Parameters<typeof omegaSafetyScoreEngine.evaluate>[2],
              p.tool as Parameters<typeof omegaSafetyScoreEngine.evaluate>[3],
              p.workholding as Parameters<typeof omegaSafetyScoreEngine.evaluate>[4],
              opts,
            );
            break;
          }

          // ── CAMX-MS14/U01: Pipeline Safety Orchestrator ──
          case "pipeline_safety_assess":
          case "pipeline_safety_veto":
          case "pipeline_safety_batch": {
            const { pipelineSafetyOrchestratorEngine } = await import("../../engines/PipelineSafetyOrchestratorEngine.js");
            result = pipelineSafetyOrchestratorEngine.calculate(action, params as ValidatedParams);
            break;
          }

          // ── CAMX-MS14/U02: Safety Veto Engine (E1098) ──
          case "safety_veto_check":
          case "safety_veto_all":
          case "safety_veto_escalate": {
            const { safetyVetoEngine } = await import("../../engines/SafetyVetoEngine.js");
            result = safetyVetoEngine.calculate(action, params as ValidatedParams);
            break;
          }

          // ── Advanced Materials (0-D-6) ──
          case "superalloy_analyze": {
            const { superalloyMachiningEngine } = await import("../../engines/SuperalloyMachiningEngine.js");
            result = superalloyMachiningEngine.analyzeWithLearning(params as ValidatedParams);
            break;
          }
          case "ceramics_fracture": {
            const { ceramicsMachiningEngine } = await import("../../engines/CeramicsMachiningEngine.js");
            result = ceramicsMachiningEngine.assessWithBayesian(params as ValidatedParams);
            break;
          }
          case "magnesium_fire_risk": {
            const { magnesiumMachiningEngine } = await import("../../engines/MagnesiumMachiningEngine.js");
            result = magnesiumMachiningEngine.assessFireRiskWithUncertainty(params as ValidatedParams);
            break;
          }

          // ── Composites Machining Physics (0-D-7a: Tsai-Hill delamination, fiber pullout, multi-objective optimization) ──
          case "composites_tsai_hill": {
            const { compositesMachiningPhysicsEngine } = await import("../../engines/CompositesMachiningPhysicsEngine.js");
            result = compositesMachiningPhysicsEngine.assessDelaminationRisk(params as ValidatedParams);
            break;
          }
          case "composites_fiber_pullout": {
            const { compositesMachiningPhysicsEngine: cmpeFP } = await import("../../engines/CompositesMachiningPhysicsEngine.js");
            result = cmpeFP.predictFiberPullout(params as ValidatedParams);
            break;
          }
          case "composites_optimize_cutting": {
            const { compositesMachiningPhysicsEngine: cmpeOC } = await import("../../engines/CompositesMachiningPhysicsEngine.js");
            result = cmpeOC.optimizeCuttingParams(params as ValidatedParams);
            break;
          }

          // ── Honing + Burnishing/Polishing (0-D-7b: U-PROC1) ──
          case "honing_design": {
            const { honingProcessEngine } = await import("../../engines/HoningProcessEngine.js");
            result = honingProcessEngine.designHoningProcess(params as ValidatedParams);
            break;
          }
          case "honing_stone_select": {
            const { honingProcessEngine: hpeSS } = await import("../../engines/HoningProcessEngine.js");
            result = hpeSS.selectStone(params as ValidatedParams);
            break;
          }
          case "honing_plateau": {
            const { honingProcessEngine: hpePH } = await import("../../engines/HoningProcessEngine.js");
            result = hpePH.plateauHoning(params as ValidatedParams);
            break;
          }
          case "burnishing_predict": {
            const { burnishingPolishingEngine } = await import("../../engines/BurnishingPolishingEngine.js");
            result = burnishingPolishingEngine.predictBurnishing(params as ValidatedParams);
            break;
          }
          case "lapping_predict": {
            const { burnishingPolishingEngine: bpeLap } = await import("../../engines/BurnishingPolishingEngine.js");
            result = bpeLap.predictLapping(params as ValidatedParams);
            break;
          }
          case "polishing_predict": {
            const { burnishingPolishingEngine: bpePol } = await import("../../engines/BurnishingPolishingEngine.js");
            result = bpePol.predictPolishing(params as ValidatedParams);
            break;
          }

          // ── Physics Fusion (0-D-FUSION-3) ──
          case "physics_fusion": {
            const { physicsFusionOrchestratorEngine } = await import("../../engines/PhysicsFusionOrchestratorEngine.js");
            result = physicsFusionOrchestratorEngine.compute(params as ValidatedParams);
            break;
          }

          // ── Drill Breakthrough Force (wired to DrillBreakthroughForceEngine) ──
          case "drill_breakthrough": {
            const { drillBreakthroughForceEngine: dbfe } = await import("../../engines/DrillBreakthroughForceEngine.js");
            result = dbfe.calculate({
              drill_diameter_mm: params.drill_diameter_mm,
              point_angle_deg: params.point_angle_deg ?? 118,
              web_thickness_mm: params.web_thickness_mm,
              helix_angle_deg: params.helix_angle_deg,
              feed_mm_rev: params.feed_mm_rev,
              spindle_rpm: params.spindle_rpm,
              workpiece_thickness_mm: params.workpiece_thickness_mm,
              material_kc1_1: params.material_kc1_1,
              material_mc: params.material_mc,
              workpiece_hardness_hrc: params.workpiece_hardness_hrc,
              is_through_hole: params.is_through_hole ?? true,
              exit_support: params.exit_support,
              remaining_thickness_mm: params.remaining_thickness_mm,
            });
            break;
          }

          // ── Stochastic Chatter (wired to StochasticChatterEngine) ──
          case "stochastic_chatter": {
            const { stochasticChatterEngine: sce } = await import("../../engines/StochasticChatterEngine.js");
            result = sce.compute({
              material: params.material ?? "AISI 4140",
              speed_range_rpm: params.speed_range_rpm ?? [2000, 20000],
              speed_points: params.speed_points,
              depth_range_mm: params.depth_range_mm ?? [0.1, 10],
              depth_points: params.depth_points,
              flute_count: params.flute_count ?? params.flutes ?? 4,
              tool_diameter_mm: params.tool_diameter_mm ?? params.tool_diameter ?? 12,
              natural_freq_hz: params.natural_freq_hz,
              damping_ratio: params.damping_ratio,
              stiffness_nm: params.stiffness_nm,
              modal_mass_kg: params.modal_mass_kg,
              process_damping_coeff: params.process_damping_coeff,
              n_trials: params.n_trials,
              tap_test: params.tap_test,
              contour_levels: params.contour_levels,
            });
            break;
          }

          // ── Force Capability Check Sequence (wired to ForceCapabilityEngine) ──
          case "force_capability_check_sequence": {
            const { forceCapabilityEngine: fce } = await import("../../engines/ForceCapabilityEngine.js");
            result = fce.checkSequence(params.machine, params.operations);
            break;
          }

          // ── Stochastic Cutting Force (StochasticCuttingForceEngine) ──
          case "stochastic_force": {
            const { stochasticCuttingForceEngine: scfe } = await import("../../engines/StochasticCuttingForceEngine.js");
            result = scfe.compute({
              material: params.material ?? params.material_id ?? "AISI 4140",
              depth_mm: params.depth_mm ?? params.axial_depth ?? 2,
              feed_mm: params.feed_mm ?? params.feed_per_tooth ?? 0.1,
              width_mm: params.width_mm ?? params.radial_depth,
              tool_diameter_mm: params.tool_diameter_mm ?? params.tool_diameter ?? 12,
              flute_count: params.flute_count ?? params.number_of_teeth ?? 4,
              rake_angle_deg: params.rake_angle_deg ?? params.rake_angle,
              edge_radius_um: params.edge_radius_um,
              runout_um: params.runout_um,
              n_trials: params.n_trials ?? params.mc_samples,
              method: params.method,
              overrides: params.overrides,
            });
            break;
          }

          // ── Stochastic Deflection (StochasticDeflectionEngine) ──
          case "stochastic_deflection": {
            const { stochasticDeflectionEngine: sde } = await import("../../engines/StochasticDeflectionEngine.js");
            const mkUncertain = (v: any) => (typeof v === "number" ? { mean: v, cv_pct: 5 } : v);
            result = sde.analyze({
              cutting_force_N: mkUncertain(params.cutting_force_N),
              tool_diameter_mm: mkUncertain(params.tool_diameter_mm ?? params.tool_diameter),
              overhang_mm: mkUncertain(params.overhang_mm ?? params.tool_stickout_mm),
              youngs_modulus_GPa: mkUncertain(params.youngs_modulus_GPa ?? params.youngs_modulus ?? 600),
              num_flutes: params.num_flutes ?? params.flute_count,
              radial_engagement_mm: params.radial_engagement_mm ? mkUncertain(params.radial_engagement_mm) : undefined,
              runout_um: params.runout_um,
              deflection_limit_um: params.deflection_limit_um,
              mc_samples: params.mc_samples ?? params.n_trials,
              confidence_pct: params.confidence_pct,
              coverage_pct: params.coverage_pct,
            });
            break;
          }

          // ── Stochastic Thermal (StochasticThermalEngine) ──
          case "stochastic_thermal": {
            const { stochasticThermalEngine: ste } = await import("../../engines/StochasticThermalEngine.js");
            result = ste.compute({
              material: params.material ?? params.material_id ?? "AISI 4140",
              cutting_speed_mpm: params.cutting_speed_mpm ?? params.cutting_speed ?? 200,
              feed_mm: params.feed_mm ?? params.feed_per_tooth ?? 0.1,
              depth_mm: params.depth_mm ?? params.axial_depth ?? 2,
              width_mm: params.width_mm ?? params.radial_depth,
              tool_diameter_mm: params.tool_diameter_mm ?? params.tool_diameter ?? 12,
              coolant_type: params.coolant_type ?? "flood",
              coating: params.coating,
              coating_max_temp_c: params.coating_max_temp_c,
              n_trials: params.n_trials ?? params.mc_samples,
              method: params.method,
            });
            break;
          }

          // ── Stochastic Tool Wear (StochasticToolWearEngine) ──
          case "stochastic_wear": {
            const { stochasticToolWearEngine: stwe } = await import("../../engines/StochasticToolWearEngine.js");
            const mkUP = (v: any, fallback: number) =>
              typeof v === "number" ? { mean: v, cv_pct: 5 } : (v ?? { mean: fallback, cv_pct: 5 });
            result = stwe.analyze({
              cutting_speed: mkUP(params.cutting_speed, 200),
              feed_rate: mkUP(params.feed_rate, 0.1),
              depth_of_cut: mkUP(params.depth_of_cut, 2),
              taylor_n: mkUP(params.taylor_n, 0.25),
              taylor_C: mkUP(params.taylor_C, 300),
              taylor_a: params.taylor_a ? mkUP(params.taylor_a, 0.15) : undefined,
              taylor_b: params.taylor_b ? mkUP(params.taylor_b, 0.15) : undefined,
              coating_thickness_um: params.coating_thickness_um ? mkUP(params.coating_thickness_um, 3) : undefined,
              hardness_HRC: params.hardness_HRC ? mkUP(params.hardness_HRC, 30) : undefined,
              contact_temp_C: params.contact_temp_C ? mkUP(params.contact_temp_C, 600) : undefined,
              usui_A: params.usui_A ? mkUP(params.usui_A, 1e-6) : undefined,
              usui_B: params.usui_B ? mkUP(params.usui_B, 5000) : undefined,
              wear_limit_mm: params.wear_limit_mm,
              mc_samples: params.mc_samples ?? params.n_trials,
              compute_sobol: params.compute_sobol,
              observed_wear_data: params.observed_wear_data,
            });
            break;
          }

          // ── Thermal Compensation Model (ThermalCompensationModelEngine) ──
          case "thermal_compensation_model": {
            const { thermalCompensationModelEngine: tcme } = await import("../../engines/ThermalCompensationModelEngine.js");
            result = tcme.compute({
              machine: {
                type: params.machine_type ?? params.machine?.type ?? "vmc",
                spindle_bore_mm: params.spindle_bore_mm ?? params.machine?.spindle_bore_mm ?? 70,
                column_height_mm: params.column_height_mm ?? params.machine?.column_height_mm ?? 800,
                bed_length_mm: params.bed_length_mm ?? params.machine?.bed_length_mm ?? 1200,
                spindle_material: params.spindle_material ?? params.machine?.spindle_material,
                has_thermal_compensation: params.has_thermal_compensation ?? params.machine?.has_thermal_compensation,
              },
              cutting: {
                spindle_rpm: params.spindle_rpm ?? params.cutting?.spindle_rpm ?? 8000,
                spindle_power_kw: params.spindle_power_kw ?? params.cutting?.spindle_power_kw ?? 11,
                cycle_time_min: params.cycle_time_min ?? params.cutting?.cycle_time_min ?? 60,
                coolant_temp_c: params.coolant_temp_c ?? params.cutting?.coolant_temp_c,
                ambient_temp_c: params.ambient_temp_c ?? params.cutting?.ambient_temp_c,
              },
              part: {
                tolerance_mm: params.tolerance_mm ?? params.part?.tolerance_mm ?? 0.02,
                critical_axis: params.critical_axis ?? params.part?.critical_axis ?? "Z",
                feature_position_mm: params.feature_position_mm ?? params.part?.feature_position_mm ?? 100,
              },
            });
            break;
          }

          // ── ThermalGrowthCompensationEngine — spindle/tool/workpiece thermal expansion ──
          case "thermal_growth": {
            const { thermalGrowthCompensationEngine: tgce } = await import("../../engines/ThermalGrowthCompensationEngine.js");
            result = tgce.calculate({
              spindle_speed_rpm: params.spindle_speed_rpm,
              cutting_time_min: params.cutting_time_min,
              ambient_temp_C: params.ambient_temp_C,
              spindle_bearing_type: params.spindle_bearing_type?.toLowerCase(),
              tool_material: params.tool_material?.toLowerCase(),
              tool_overhang_mm: params.tool_overhang_mm ?? 50,
              tool_holder_length_mm: params.tool_holder_length_mm,
              workpiece_material: params.workpiece_material?.toLowerCase(),
              workpiece_length_mm: params.workpiece_length_mm,
              cutting_power_kW: params.cutting_power_kW ?? params.cutting_power_kw,
              coolant_active: params.coolant_active,
            });
            break;
          }

          // ── ThreadStrengthFatigueEngine — thread shear, pullout, fatigue, preload, loosening ──
          case "thread_strength_fatigue": {
            const { threadStrengthFatigueEngine: tsfe } = await import("../../engines/ThreadStrengthFatigueEngine.js");
            result = tsfe.calculate({
              action: params.sub_action ?? params.action ?? "thread_strength",
              thread_type: params.thread_type,
              major_diameter_mm: params.major_diameter_mm,
              minor_diameter_mm: params.minor_diameter_mm,
              pitch_mm: params.pitch_mm,
              engagement_length_mm: params.engagement_length_mm,
              material_ult_shear_mpa: params.material_ult_shear_mpa,
              stress_amplitude_mpa: params.stress_amplitude_mpa,
              mean_stress_mpa: params.mean_stress_mpa,
              endurance_limit_mpa: params.endurance_limit_mpa,
              ultimate_strength_mpa: params.ultimate_strength_mpa,
              kt_thread: params.kt_thread,
              torque_nm: params.torque_nm,
              bolt_diameter_mm: params.bolt_diameter_mm,
              nut_factor_k: params.nut_factor_k,
              bolt_stiffness_n_mm: params.bolt_stiffness_n_mm,
              member_stiffness_n_mm: params.member_stiffness_n_mm,
              external_force_n: params.external_force_n,
              preload_force_n: params.preload_force_n,
              transverse_force_n: params.transverse_force_n,
              friction_coefficient: params.friction_coefficient,
              pitch_diameter_mm: params.pitch_diameter_mm,
              nut_shear_area_mm2: params.nut_shear_area_mm2,
            });
            break;
          }

          // ── ToolAssemblyDeflectionEngine — multi-section assembly deflection ──
          case "tool_assembly_deflection": {
            const { toolAssemblyDeflectionEngine: tade } = await import("../../engines/ToolAssemblyDeflectionEngine.js");
            const sections = (params.sections ?? []).map((s: Record<string, unknown>) => ({
              name: String(s.name ?? "section"),
              length_mm: Number(s.length_mm),
              diameter_mm: Number(s.diameter_mm),
              material: String(s.material ?? "carbide"),
              is_cutting: Boolean(s.is_cutting ?? false),
            }));
            result = tade.compute({
              sections,
              cutting_force_n: params.cutting_force_n ?? params.cutting_force_N,
              force_position: params.force_position,
              spindle_rigidity_n_um: params.spindle_rigidity_n_um,
              radial_force_n: params.radial_force_n ?? params.radial_force_N,
              taper: params.taper ?? "CAT40",
            });
            break;
          }

          // ── ToolDeflectionPredictionEngine — Euler-Bernoulli cantilever beam deflection ──
          case "tool_deflection_predict": {
            const { toolDeflectionPredictionEngine: tdpe } = await import("../../engines/ToolDeflectionPredictionEngine.js");
            result = tdpe.calculate({
              tool_diameter_mm: params.tool_diameter_mm,
              tool_overhang_mm: params.tool_overhang_mm,
              cutting_force_N: params.cutting_force_N ?? params.cutting_force_n,
              force_direction: params.force_direction?.toLowerCase(),
              tool_material: params.tool_material?.toLowerCase(),
              holder_diameter_mm: params.holder_diameter_mm,
              holder_length_mm: params.holder_length_mm,
              flute_count: params.flute_count ?? params.number_of_teeth,
              helix_angle_deg: params.helix_angle_deg,
              tolerance_target_mm: params.tolerance_target_mm,
            });
            break;
          }

          // ── ToolWearProgressionEngine — step-by-step flank wear (VB) simulation ──
          case "wear_progression": {
            const { toolWearProgressionEngine: twpe } = await import("../../engines/ToolWearProgressionEngine.js");
            result = twpe.calculate({
              cutting_speed_m_min: params.cutting_speed_m_min ?? params.cutting_speed,
              feed_mm_rev: params.feed_mm_rev ?? params.feed_per_rev,
              depth_of_cut_mm: params.depth_of_cut_mm ?? params.axial_depth,
              tool_grade: params.tool_grade?.toUpperCase(),
              workpiece_hardness_hrc: params.workpiece_hardness_hrc ?? params.workpiece_hardness_HRC,
              cutting_time_min: params.cutting_time_min,
              current_vb_mm: params.current_vb_mm,
              vb_limit_mm: params.vb_limit_mm,
              cutting_temperature_C: params.cutting_temperature_C,
              taylor_C: params.taylor_C,
              taylor_n: params.taylor_n,
            });
            break;
          }

          // ── TurningForceEngine — Kienzle-based turning force, power & torque ──
          case "turning_force": {
            const { turningForceEngine: tfEng } = await import("../../engines/TurningForceEngine.js");
            result = tfEng.calculate({
              cutting_speed_m_min: params.cutting_speed_m_min ?? params.cutting_speed,
              feed_mm_rev: params.feed_mm_rev ?? params.feed_per_rev ?? params.feed,
              depth_of_cut_mm: params.depth_of_cut_mm ?? params.axial_depth ?? params.depth,
              lead_angle_deg: params.lead_angle_deg,
              nose_radius_mm: params.nose_radius_mm,
              rake_angle_deg: params.rake_angle_deg ?? params.rake_angle,
              iso_group: params.iso_group ?? params.material_group,
              material_kc1_1: params.material_kc1_1,
              material_mc: params.material_mc,
              workpiece_diameter_mm: params.workpiece_diameter_mm ?? params.workpiece_diameter,
              spindle_power_kW: params.spindle_power_kW ?? params.spindle_power,
              operation: params.operation,
            });
            break;
          }

          // ── WearForceCompensationEngine — Archard abrasive wear model ──
          case "archard_wear": {
            const { wearForceCompensationEngine: wfcArch } = await import("../../engines/WearForceCompensationEngine.js");
            result = wfcArch.archardWear({
              cutting_speed_m_min: params.cutting_speed_m_min ?? params.cutting_speed,
              feed_mm_rev: params.feed_mm_rev ?? params.feed_per_rev ?? params.feed,
              depth_of_cut_mm: params.depth_of_cut_mm ?? params.axial_depth ?? params.depth,
              workpiece_hardness_HV: params.workpiece_hardness_HV ?? params.workpiece_hardness,
              tool_hardness_HV: params.tool_hardness_HV ?? params.tool_hardness,
              normal_stress_MPa: params.normal_stress_MPa,
              workpiece_type: params.workpiece_type,
              cutting_time_min: params.cutting_time_min,
            });
            break;
          }

          // ── WearForceCompensationEngine — Flank wear → force correction ──
          case "wear_force_correction": {
            const { wearForceCompensationEngine: wfcCorr } = await import("../../engines/WearForceCompensationEngine.js");
            result = wfcCorr.wearForceCorrection({
              fresh_force_N: params.fresh_force_N ?? params.cutting_force_N,
              flank_wear_vb_mm: params.flank_wear_vb_mm ?? params.vb_mm,
              tool_material: params.tool_material,
              rake_angle_deg: params.rake_angle_deg ?? params.rake_angle,
            });
            break;
          }

          // ── WearForceCompensationEngine — Thermal-compensated deflection ──
          case "thermal_deflection": {
            const { wearForceCompensationEngine: wfcTherm } = await import("../../engines/WearForceCompensationEngine.js");
            result = wfcTherm.thermalDeflection({
              cutting_force_N: params.cutting_force_N ?? params.force,
              tool_diameter_mm: params.tool_diameter_mm ?? params.tool_diameter,
              tool_overhang_mm: params.tool_overhang_mm ?? params.overhang,
              tool_material: params.tool_material ?? "carbide",
              cutting_temperature_C: params.cutting_temperature_C ?? params.temperature,
              ambient_temperature_C: params.ambient_temperature_C,
              num_flutes: params.num_flutes,
            });
            break;
          }

          // ── Filter Press (process engineering) ──
          case "filter_press_calc": {
            const { filterPressEngine: fpCalc } = await import("../../engines/FilterPressEngine.js");
            result = fpCalc.calculate(params as ValidatedParams);
            break;
          }

          // ── Inventory-Aware Tool Selection ──
          case "inventory_tool_select": {
            const { inventoryAwareToolSelectorEngine: iatsCalc } = await import("../../engines/InventoryAwareToolSelectorEngine.js");
            result = iatsCalc.select(params.features ?? [], params.inventory ?? []);
            break;
          }

          // ── SCIMATH-MS0: Core Linear Algebra & Matrix Methods ──
          case "tool_roi_analysis": {
            const { toolROIEngine } = await import("../../engines/ToolROIEngine.js");
            result = toolROIEngine.calculate(params as ValidatedParams);
            break;
          }

          case "svd_decompose": {
            const { SVDEngine } = await import("../../engines/SVDEngine.js");
            const matrix = params.matrix as number[][];
            result = SVDEngine.decompose(matrix, { truncateK: params.rank as number | undefined });
            break;
          }
          case "qr_factorize": {
            const { QRDecompositionEngine } = await import("../../engines/QRDecompositionEngine.js");
            result = QRDecompositionEngine.decompose(params.matrix as number[][], {
              pivoting: params.method === "pivoted" || params.pivoting === true,
              thin: params.thin as boolean | undefined,
            });
            break;
          }
          case "cholesky_factor": {
            const { CholeskyEngine } = await import("../../engines/CholeskyEngine.js");
            const matrix = params.matrix as number[][];
            const variant = (params.variant as string) || "ll";
            if (variant === "ldlt") result = CholeskyEngine.ldlt(matrix);
            else if (variant === "incomplete") result = CholeskyEngine.incompleteCholesky(matrix);
            else result = CholeskyEngine.factorize(matrix);
            break;
          }
          case "eigen_solve": {
            const { EigensolverEngine } = await import("../../engines/EigensolverEngine.js");
            const matrix = params.matrix as number[][];
            const method = (params.method as string) || "qr";
            if (method === "power") result = EigensolverEngine.powerIteration(matrix, params);
            else if (method === "lanczos") result = EigensolverEngine.lanczos(matrix, matrix.length, params);
            else if (method === "generalized") result = EigensolverEngine.generalizedEigen(matrix, params.B as number[][], params);
            else result = EigensolverEngine.symmetricQR(matrix, params);
            break;
          }
          case "sparse_solve": {
            const { SparseMatrixEngine } = await import("../../engines/SparseMatrixEngine.js");
            result = SparseMatrixEngine.rcmOrdering(params.csr ?? params.matrix);
            break;
          }
          case "iterative_solve": {
            const { IterativeSolverEngine } = await import("../../engines/IterativeSolverEngine.js");
            const A = (params.A ?? params.matrix) as number[][];
            const b = params.b as number[];
            const opts = { tolerance: params.tolerance as number | undefined, maxIterations: params.maxIterations as number | undefined };
            const method = (params.method as string) || "cg";
            if (method === "bicgstab") result = IterativeSolverEngine.bicgstab(A, b, opts);
            else if (method === "gmres") result = IterativeSolverEngine.gmres(A, b, opts);
            else result = IterativeSolverEngine.cg(A, b, opts);
            break;
          }
          case "matrix_norms": {
            const { MatrixNormEngine } = await import("../../engines/MatrixNormEngine.js");
            result = MatrixNormEngine.allNorms(params.matrix as number[][]);
            break;
          }
          case "matrix_factorize": {
            const { MatrixFactorizationEngine } = await import("../../engines/MatrixFactorizationEngine.js");
            const matrix = params.matrix as number[][];
            const method = (params.method as string) || "lu";
            if (method === "nmf") result = MatrixFactorizationEngine.nmf(matrix, params);
            else if (method === "exp") result = { matrix: MatrixFactorizationEngine.matrixExp(matrix) };
            else if (method === "kronecker") result = { matrix: MatrixFactorizationEngine.kronecker(matrix, params.B as number[][]) };
            else result = MatrixFactorizationEngine.lu(matrix);
            break;
          }
          case "tensor_stress_invariants": {
            const { TensorAlgebraEngine } = await import("../../engines/TensorAlgebraEngine.js");
            result = TensorAlgebraEngine.invariants(params.sigma as number[][]);
            break;
          }
          case "system_identify": {
            const { SystemIdentificationEngine } = await import("../../engines/SystemIdentificationEngine.js");
            const method = (params.method as string) || "rls";
            if (method === "tls") result = SystemIdentificationEngine.totalLeastSquares(params.A as number[][], params.b as number[]);
            else if (method === "n4sid") result = SystemIdentificationEngine.n4sid(params.y as number[], params.u as number[], params);
            else result = SystemIdentificationEngine.rlsBatch(params.Phi as number[][], params.y as number[], params);
            break;
          }
          case "robust_regression": {
            const { RobustRegressionEngine } = await import("../../engines/RobustRegressionEngine.js");
            const X = params.X as number[][];
            const y = params.y as number[];
            const method = (params.method as string) || "ols";
            if (method === "ridge") result = RobustRegressionEngine.ridge(X, y, params);
            else if (method === "lasso") result = RobustRegressionEngine.lasso(X, y, params);
            else if (method === "elastic_net") result = RobustRegressionEngine.elasticNet(X, y, params);
            else if (method === "huber") result = RobustRegressionEngine.huber(X, y, params);
            else if (method === "ransac") result = RobustRegressionEngine.ransac(X, y, params);
            else result = RobustRegressionEngine.ols(X, y);
            break;
          }
          case "random_matrix_noise_floor": {
            const { RandomMatrixEngine } = await import("../../engines/RandomMatrixEngine.js");
            result = RandomMatrixEngine.detectSignals(
              params.eigenvalues as number[], params.p as number, params.n as number,
              params.alpha as number | undefined,
            );
            break;
          }

          // ── HM-REV-MS1 U1: HyperMILL Material Bridge (5 actions) ────────────
          case "hypermill_material_lookup": {
            const { HyperMillMaterialBridgeEngine: HMMBE } = await import("../../engines/HyperMillMaterialBridgeEngine.js");
            _hmMatBridge ??= new HMMBE();
            result = _hmMatBridge.lookupMaterial((params.query ?? params.material ?? "") as string);
            break;
          }
          case "hypermill_machinability": {
            const { HyperMillMaterialBridgeEngine: HMMBE } = await import("../../engines/HyperMillMaterialBridgeEngine.js");
            _hmMatBridge ??= new HMMBE();
            const machinabilityOp = (params.operation as "milling" | "drilling" | "insert" | undefined) ?? "milling";
            const machinabilityResult = _hmMatBridge.getMachinabilityFactors(
              (params.query ?? params.material ?? "") as string,
              machinabilityOp,
            );
            result = machinabilityResult ?? { error: "Material not found", query: params.query ?? params.material };
            break;
          }
          case "hypermill_diameter_sf": {
            const { HyperMillMaterialBridgeEngine: HMMBE } = await import("../../engines/HyperMillMaterialBridgeEngine.js");
            _hmMatBridge ??= new HMMBE();
            const sfMat = (params.material as string) ?? "steel";
            const validMats = ["steel", "aluminum", "stainless"] as const;
            const sfMatNorm = validMats.includes(sfMat as typeof validMats[number])
              ? (sfMat as "steel" | "aluminum" | "stainless")
              : "steel";
            const sfResult = _hmMatBridge.lookupDiameterSpeedFeed(
              sfMatNorm,
              (params.cutting_material as string) ?? "carbide",
              (params.diameter_mm as number) ?? 10,
            );
            result = sfResult ?? { error: "No speed/feed data found for given material and cutting material", material: sfMat };
            break;
          }
          case "hypermill_material_search": {
            const { HyperMillMaterialBridgeEngine: HMMBE } = await import("../../engines/HyperMillMaterialBridgeEngine.js");
            _hmMatBridge ??= new HMMBE();
            result = _hmMatBridge.searchMaterials({
              group: params.group as string | undefined,
              subgroup: params.subgroup as string | undefined,
              iso_group: params.iso_group as string | undefined,
              hb_min: params.hb_min as number | undefined,
              hb_max: params.hb_max as number | undefined,
              rm_min: params.rm_min as number | undefined,
              rm_max: params.rm_max as number | undefined,
              limit: (params.limit as number | undefined) ?? 20,
            });
            break;
          }
          case "hypermill_material_stats": {
            const { HyperMillMaterialBridgeEngine: HMMBE } = await import("../../engines/HyperMillMaterialBridgeEngine.js");
            _hmMatBridge ??= new HMMBE();
            const stats = _hmMatBridge.getStats();
            result = {
              totalMaterials: stats.total_materials,
              total_materials: stats.total_materials,
              with_aisi: stats.with_aisi,
              with_hardness: stats.with_hardness,
              with_correction_factors: stats.with_correction_factors,
              chipping_classes: stats.chipping_classes,
              speed_feed_entries: stats.speed_feed_entries,
              standards: ["DIN", "AISI", "JIS", "UNS", "AFNOR", "BS"],
              groups: stats.groups,
            };
            break;
          }

          // ── PHYSICS-WIRE-MS0: 11 previously unwired physics engines (27 actions) ──
          case "clamping_force_calc": {
            const { clampingForceEngine: cfe } = await import("../../engines/ClampingForceEngine.js");
            result = cfe.calculate(params as ValidatedParams);
            break;
          }
          case "clamping_force_quick": {
            const { clampingForceEngine: cfe } = await import("../../engines/ClampingForceEngine.js");
            result = cfe.quickEstimate(params as ValidatedParams);
            break;
          }
          case "cross_phys_upqi": {
            const { CrossPhysicsCouplingEngine: CPCE } = await import("../../engines/CrossPhysicsCouplingEngine.js");
            result = new CPCE().unifiedProcessQualityIndex(params as ValidatedParams);
            break;
          }
          case "cross_phys_tool_life": {
            const { CrossPhysicsCouplingEngine: CPCE } = await import("../../engines/CrossPhysicsCouplingEngine.js");
            result = new CPCE().coupledToolLife(params as ValidatedParams);
            break;
          }
          case "cross_phys_surface": {
            const { CrossPhysicsCouplingEngine: CPCE } = await import("../../engines/CrossPhysicsCouplingEngine.js");
            result = new CPCE().multiSourceSurfaceFinish(params as ValidatedParams);
            break;
          }
          case "cross_phys_stability": {
            const { CrossPhysicsCouplingEngine: CPCE } = await import("../../engines/CrossPhysicsCouplingEngine.js");
            result = new CPCE().processStabilityMargin(params as ValidatedParams);
            break;
          }
          case "cross_phys_tool_change": {
            const { CrossPhysicsCouplingEngine: CPCE } = await import("../../engines/CrossPhysicsCouplingEngine.js");
            result = new CPCE().optimalToolChangePoint(params as ValidatedParams);
            break;
          }
          case "cross_phys_thermal_error": {
            const { CrossPhysicsCouplingEngine: CPCE } = await import("../../engines/CrossPhysicsCouplingEngine.js");
            result = new CPCE().thermalGeometricErrorBudget(params as ValidatedParams);
            break;
          }
          case "cross_phys_energy_eff": {
            const { CrossPhysicsCouplingEngine: CPCE } = await import("../../engines/CrossPhysicsCouplingEngine.js");
            result = new CPCE().cuttingEnergyEfficiency(params as ValidatedParams);
            break;
          }
          case "cross_phys_dyn_stiffness": {
            const { CrossPhysicsCouplingEngine: CPCE } = await import("../../engines/CrossPhysicsCouplingEngine.js");
            result = new CPCE().dynamicProcessStiffness(params as ValidatedParams);
            break;
          }
          case "face_driver_analyze": {
            const { faceDriverTorqueEngine: fdt } = await import("../../engines/FaceDriverTorqueEngine.js");
            { const p = params as ValidatedParams; result = fdt.analyze(p.driver, p.part, p.requiredTorqueNm); }
            break;
          }
          case "face_driver_penetration": {
            const { faceDriverTorqueEngine: fdt } = await import("../../engines/FaceDriverTorqueEngine.js");
            { const p = params as ValidatedParams; result = fdt.recommendPenetration(p.targetTorqueNm, p.driver, p.part); }
            break;
          }
          case "mdof_stability": {
            const { mdofStabilityEngine: mdof } = await import("../../engines/MDOFStabilityEngine.js");
            result = mdof.compute(params as ValidatedParams);
            break;
          }
          case "mdof_stability_eigen": {
            const { mdofStabilityEngine: mdof } = await import("../../engines/MDOFStabilityEngine.js");
            result = mdof.computeWithEigenvalue(params as ValidatedParams);
            break;
          }
          case "mdof_compare_sdof": {
            const { mdofStabilityEngine: mdof } = await import("../../engines/MDOFStabilityEngine.js");
            result = mdof.compareSDOFvsMDOF(params as ValidatedParams);
            break;
          }
          case "machine_force_limit_validate": {
            const { machineForceLimitValidationEngine: mfl } = await import("../../engines/MachineForceLimitValidationEngine.js");
            result = mfl.validate(params as ValidatedParams);
            break;
          }
          case "machine_force_limit_quick": {
            const { machineForceLimitValidationEngine: mfl } = await import("../../engines/MachineForceLimitValidationEngine.js");
            { const p = params as ValidatedParams; result = mfl.quickValidate(p.powerKw, p.torqueNm, p.rpm, p.machineSpecs); }
            break;
          }
          case "timoshenko_deflect": {
            const { timoshenkoDeflectionEngine: td } = await import("../../engines/TimoshenkoDeflectionEngine.js");
            result = td.calculate(params as ValidatedParams);
            break;
          }
          case "timoshenko_multi_section": {
            const { timoshenkoDeflectionEngine: td } = await import("../../engines/TimoshenkoDeflectionEngine.js");
            result = td.calculateMultiSection(params as ValidatedParams);
            break;
          }
          case "timoshenko_compare": {
            const { timoshenkoDeflectionEngine: td } = await import("../../engines/TimoshenkoDeflectionEngine.js");
            result = td.compareModels(params as ValidatedParams);
            break;
          }
          case "timoshenko_max_ld": {
            const { timoshenkoDeflectionEngine: td } = await import("../../engines/TimoshenkoDeflectionEngine.js");
            const p = params as ValidatedParams;
            result = td.calculateMaxLD(p.params ?? p, p.max_deflection_um ?? p.maxDeflection_um);
            break;
          }
          case "goal_stability_observe": {
            const { goalStabilityVerifierEngine: gsv } = await import("../../engines/GoalStabilityVerifierEngine.js");
            gsv.observe(params as ValidatedParams);
            result = { observed: true };
            break;
          }
          case "goal_stability_analyze": {
            const { goalStabilityVerifierEngine: gsv } = await import("../../engines/GoalStabilityVerifierEngine.js");
            result = gsv.analyze();
            break;
          }
          case "session_stability_report": {
            const { sessionStabilityEngine: sse } = await import("../../engines/SessionStabilityEngine.js");
            const p = params as ValidatedParams;
            if (p.state) sse.recordState(p.state);
            result = sse.generateReport(p.state ?? p);
            break;
          }
          case "session_stability_lyapunov": {
            const { sessionStabilityEngine: sse } = await import("../../engines/SessionStabilityEngine.js");
            result = sse.analyzeLyapunov((params as ValidatedParams).state ?? params);
            break;
          }
          case "tribal_playbook_validate": {
            const { tribalPlaybookEnforcementEngine: tpe } = await import("../../engines/TribalPlaybookEnforcementEngine.js");
            const p = params as ValidatedParams;
            result = tpe.validate(p.parameters ?? p, p.context ?? {});
            break;
          }
          case "tribal_playbook_ranges": {
            const { tribalPlaybookEnforcementEngine: tpe } = await import("../../engines/TribalPlaybookEnforcementEngine.js");
            result = { ranges: tpe.getRecommendedRanges((params as ValidatedParams).material) };
            break;
          }
          case "tribal_playbook_guidance": {
            const { tribalPlaybookEnforcementEngine: tpe } = await import("../../engines/TribalPlaybookEnforcementEngine.js");
            const p = params as ValidatedParams;
            result = { tips: tpe.searchGuidance(p.query, p.material, p.operation) };
            break;
          }

          // ── PHYSICS-WIRE-MS0: wire 6 pre-existing orphan actions ──
          case "tool_collision_query": {
            const { toolCatalogEngine } = await import("../../engines/ToolCatalogEngine.js");
            const p = params as ValidatedParams;
            if (p.tool_id && p.holder_id) {
              result = toolCatalogEngine.collisionEnvelope({ tool_id: p.tool_id, holder_type: p.holder_type, holder_taper: p.holder_taper, stickout_mm: p.stickout_mm });
            } else {
              result = { tools: toolCatalogEngine.collisionDataBatch(p) };
            }
            break;
          }
          case "tool_find_optimal": {
            const { toolCatalogEngine } = await import("../../engines/ToolCatalogEngine.js");
            result = toolCatalogEngine.recommend(params as ValidatedParams);
            break;
          }
          case "physics_calibrate_submit": {
            const { physicsAutoCalibrationEngine } = await import("../../engines/PhysicsAutoCalibrationEngine.js");
            result = physicsAutoCalibrationEngine.submit(params as ValidatedParams);
            break;
          }
          case "physics_calibrate_predict": {
            const { physicsAutoCalibrationEngine } = await import("../../engines/PhysicsAutoCalibrationEngine.js");
            result = physicsAutoCalibrationEngine.predict(params as ValidatedParams);
            break;
          }
          case "physics_calibrate_state": {
            const { physicsAutoCalibrationEngine } = await import("../../engines/PhysicsAutoCalibrationEngine.js");
            result = physicsAutoCalibrationEngine.getState();
            break;
          }
          case "physics_calibrate_reset": {
            const { physicsAutoCalibrationEngine } = await import("../../engines/PhysicsAutoCalibrationEngine.js");
            result = physicsAutoCalibrationEngine.reset(params as ValidatedParams);
            break;
          }

          // ── OPT-WIRE-MS0: 5 unwired optimization engines (8 actions) ──
          case "drill_cycle_optimize": {
            const { drillCycleOptimizationEngine } = await import("../../engines/DrillCycleOptimizationEngine.js");
            result = drillCycleOptimizationEngine.calculate(params as ValidatedParams);
            break;
          }
          // ── COG-BRIDGE-FOLLOWUP/U-WIRE-CALC-PECK: complete the half-wired peck_drill_optimize action.
          // The action was in the enum + result-slimmer (line 244) but had no case handler — calls
          // were silently returning the unrelated result of whatever case fell through to.
          case "peck_drill_optimize": {
            const { peckDrillingOptimizationEngine } = await import("../../engines/PeckDrillingOptimizationEngine.js");
            result = peckDrillingOptimizationEngine.calculate(params as ValidatedParams);
            break;
          }
          // ── COG-BRIDGE-FOLLOWUP/U-WIRE-CALC-DEFL: wire WorkpieceDeflectionCompensationEngine.
          // Cantilevered bar deflection physics for live-tooling lathes (Euler-Bernoulli + hex/round
          // section properties). Engine signature is calculate(action, input) — pass action through.
          case "workpiece_deflection_compensate": {
            const { workpieceDeflectionCompensationEngine } = await import("../../engines/WorkpieceDeflectionCompensationEngine.js");
            result = workpieceDeflectionCompensationEngine.calculate(action, params as ValidatedParams);
            break;
          }
          case "finishing_pass": {
            const { finishingPassOptimizationEngine } = await import("../../engines/FinishingPassOptimizationEngine.js");
            result = finishingPassOptimizationEngine.calculate(params as ValidatedParams);
            break;
          }
          case "adaptive_engagement_calc": {
            const { adaptiveEngagementEngine } = await import("../../engines/AdaptiveEngagementEngine.js");
            result = adaptiveEngagementEngine.compute(params as ValidatedParams);
            break;
          }
          case "chance_constrained_optimize": {
            const { chanceConstrainedOptimizationEngine } = await import("../../engines/ChanceConstrainedOptimizationEngine.js");
            result = chanceConstrainedOptimizationEngine.optimize(params as ValidatedParams);
            break;
          }
          case "bandit_register_arm": {
            const { banditParameterOptimizerEngine } = await import("../../engines/BanditParameterOptimizerEngine.js");
            banditParameterOptimizerEngine.registerArm(params as ValidatedParams);
            result = { registered: true };
            break;
          }
          case "bandit_select_arm": {
            const { banditParameterOptimizerEngine } = await import("../../engines/BanditParameterOptimizerEngine.js");
            result = banditParameterOptimizerEngine.selectArm((params as ValidatedParams).context);
            break;
          }
          case "bandit_update_reward": {
            const { banditParameterOptimizerEngine } = await import("../../engines/BanditParameterOptimizerEngine.js");
            const p = params as ValidatedParams;
            banditParameterOptimizerEngine.updateReward(p.armId, p.reward, p.context);
            result = { updated: true };
            break;
          }

          // -- SFC: Surface Finish Calculation (CAM-EXHAUST-MS0) --
          case "sfc_calculate": {
            const { SFCCalculateEngine } = await import("../../engines/SFCCalculateEngine.js");
            result = SFCCalculateEngine.calculate(params as ValidatedParams);
            break;
          }
          case "sfc_feed_for_target": {
            const { SFCCalculateEngine } = await import("../../engines/SFCCalculateEngine.js");
            const p = params as ValidatedParams;
            result = { feed: SFCCalculateEngine.calculateFeedForTarget(p.targetRa, p.operation, p.toolNoseRadius, p.toolDiameter) };
            break;
          }

          // ENGINE-WIRE-MS0/U-WIRE02: 5 leaf-physics engines wired (4 orphan enum slots + 1 new action)
          case "power_budget": {
            const { cuttingPowerBudgetEngine } = await import("../../engines/CuttingPowerBudgetEngine.js");
            result = cuttingPowerBudgetEngine.calculate(params as Parameters<typeof cuttingPowerBudgetEngine.calculate>[0]);
            break;
          }
          case "stochastic_dimension": {
            const { stochasticDimensionalEngine } = await import("../../engines/StochasticDimensionalEngine.js");
            result = stochasticDimensionalEngine.simulate(params as Parameters<typeof stochasticDimensionalEngine.simulate>[0]);
            break;
          }
          case "stochastic_finish": {
            const { stochasticSurfaceFinishEngine } = await import("../../engines/StochasticSurfaceFinishEngine.js");
            const av = stochasticSurfaceFinishEngine.compute(params as Parameters<typeof stochasticSurfaceFinishEngine.compute>[0]);
            result = (av && typeof av === "object" && "value" in av) ? (av as { value: unknown }).value : av;
            break;
          }
          case "stochastic_tool_life": {
            const { stochasticToolLifeEngine } = await import("../../engines/StochasticToolLifeEngine.js");
            const av = stochasticToolLifeEngine.compute(params as Parameters<typeof stochasticToolLifeEngine.compute>[0]);
            result = (av && typeof av === "object" && "value" in av) ? (av as { value: unknown }).value : av;
            break;
          }
          case "chip_thinning_compensation": {
            const { chipThinningCompensationEngine } = await import("../../engines/ChipThinningCompensationEngine.js");
            result = chipThinningCompensationEngine.calculate(params as Parameters<typeof chipThinningCompensationEngine.calculate>[0]);
            break;
          }
          case "engagement_dynamics_calc": {
            const { engagementDynamicsEngine } = await import("../../engines/EngagementDynamicsEngine.js");
            result = engagementDynamicsEngine.calculateSegmentProfile(
              (params as any).segment,
              (params as any).feed_per_tooth ?? 0.1,
              (params as any).flutes ?? 4,
            );
            break;
          }
          case "engagement_optimize_adapter": {
            const { engagementOptimizerAdapter } = await import("../../engines/EngagementOptimizerAdapter.js");
            result = engagementOptimizerAdapter.selectEngagementOrchestrated(
              params as unknown as Parameters<typeof engagementOptimizerAdapter.selectEngagementOrchestrated>[0],
            );
            break;
          }
          case "cutting_fluid_lifecycle_calc": {
            const { cuttingFluidLifecycleEngine } = await import("../../engines/CuttingFluidLifecycleEngine.js");
            result = cuttingFluidLifecycleEngine.simulate(
              params as unknown as Parameters<typeof cuttingFluidLifecycleEngine.simulate>[0],
            );
            break;
          }
          case "chip_formation_predict": {
            const { chipFormationPredictionEngine } = await import("../../engines/ChipFormationPredictionEngine.js");
            result = chipFormationPredictionEngine.calculate(
              params as unknown as Parameters<typeof chipFormationPredictionEngine.calculate>[0],
            );
            break;
          }
          case "surface_measure_calc": {
            const { SurfaceMeasureEngine } = await import("../../engines/SurfaceMeasureEngine.js");
            const p = params as Record<string, unknown>;
            const subAction = typeof p.action_type === "string" ? p.action_type : "get_standard_specs";
            if (subAction === "record") {
              result = SurfaceMeasureEngine.recordMeasurement(p as Parameters<typeof SurfaceMeasureEngine.recordMeasurement>[0]);
            } else if (subAction === "list") {
              result = SurfaceMeasureEngine.listByPart(
                typeof p.partNumber === "string" ? p.partNumber : "",
                typeof p.featureName === "string" ? p.featureName : undefined,
              );
            } else if (subAction === "statistics") {
              result = SurfaceMeasureEngine.getStatistics(
                typeof p.partNumber === "string" ? p.partNumber : "",
                typeof p.featureName === "string" ? p.featureName : "",
                (typeof p.parameter === "string" ? p.parameter : "Ra") as Parameters<typeof SurfaceMeasureEngine.getStatistics>[2],
              );
            } else {
              result = { specifications: SurfaceMeasureEngine.getStandardSpecifications() };
            }
            break;
          }
                    case "chatter_neural_classify": {
            const { chatterNeuralClassifierEngine } = await import("../../engines/ChatterNeuralClassifierEngine.js");
            const p = params as Record<string, unknown>;
            const frf = {
              frequencyBins: Array.isArray(p.frequencyBins) ? p.frequencyBins as number[] : [100, 200, 300, 400, 500],
              magnitudes: Array.isArray(p.magnitudes) ? p.magnitudes as number[] : [0.1, 0.2, 0.3, 0.2, 0.1],
            };
            const features = {
              spindleRpm: typeof p.spindleRpm === "number" ? p.spindleRpm : 5000,
              axialDepthMm: typeof p.axialDepthMm === "number" ? p.axialDepthMm : 5,
              radialDepthMm: typeof p.radialDepthMm === "number" ? p.radialDepthMm : 5,
              feedPerToothMm: typeof p.feedPerToothMm === "number" ? p.feedPerToothMm : 0.1,
              toolDiameterMm: typeof p.toolDiameterMm === "number" ? p.toolDiameterMm : 10,
              fluteCount: typeof p.fluteCount === "number" ? p.fluteCount : 4,
              overhangMm: typeof p.overhangMm === "number" ? p.overhangMm : 50,
              materialIsoGroup: (typeof p.materialIsoGroup === "string" ? p.materialIsoGroup : "P") as "P"|"M"|"K"|"N"|"S"|"H",
              helixAngleDeg: typeof p.helixAngleDeg === "number" ? p.helixAngleDeg : undefined,
              kc11Mpa: typeof p.kc11Mpa === "number" ? p.kc11Mpa : undefined,
              machineStiffnessNPerUm: typeof p.machineStiffnessNPerUm === "number" ? p.machineStiffnessNPerUm : undefined,
              naturalFrequencyHz: typeof p.naturalFrequencyHz === "number" ? p.naturalFrequencyHz : undefined,
            };
            result = chatterNeuralClassifierEngine.classify(frf, features);
            break;
          }
          case "thermal_neural_predict": {
            const { thermalNeuralPredictorEngine } = await import("../../engines/ThermalNeuralPredictorEngine.js");
            const p = params as Record<string, unknown>;
            const input = {
              material: {
                iso_group: (typeof p.material_iso_group === "string" ? p.material_iso_group : "P") as "P"|"M"|"K"|"N"|"S"|"H",
                thermal_conductivity_w_mk: typeof p.thermal_conductivity_w_mk === "number" ? p.thermal_conductivity_w_mk : undefined,
                specific_heat_j_kgk: typeof p.specific_heat_j_kgk === "number" ? p.specific_heat_j_kgk : undefined,
                density_kg_m3: typeof p.density_kg_m3 === "number" ? p.density_kg_m3 : undefined,
              },
              tool: {
                material: (typeof p.tool_material === "string" ? p.tool_material : "carbide") as "carbide"|"ceramic"|"cbn"|"pcd"|"hss",
                coating: typeof p.tool_coating === "string" ? p.tool_coating as "uncoated"|"TiN"|"TiAlN"|"AlTiN"|"DLC" : undefined,
                thermal_conductivity_w_mk: typeof p.tool_conductivity_w_mk === "number" ? p.tool_conductivity_w_mk : undefined,
              },
              conditions: {
                cutting_speed_mpm: typeof p.cutting_speed_mpm === "number" ? p.cutting_speed_mpm : 200,
                feed_per_tooth_mm: typeof p.feed_per_tooth_mm === "number" ? p.feed_per_tooth_mm : 0.1,
                axial_depth_mm: typeof p.axial_depth_mm === "number" ? p.axial_depth_mm : 5,
                radial_depth_mm: typeof p.radial_depth_mm === "number" ? p.radial_depth_mm : 5,
                cutting_force_n: typeof p.cutting_force_n === "number" ? p.cutting_force_n : 500,
              },
              coolant: {
                type: (typeof p.coolant_type === "string" ? p.coolant_type : "flood") as "dry"|"flood"|"mql"|"cryogenic",
                flow_rate_lpm: typeof p.coolant_flow_lpm === "number" ? p.coolant_flow_lpm : undefined,
                temperature_c: typeof p.coolant_temp_c === "number" ? p.coolant_temp_c : undefined,
              },
              history: typeof p.cutting_time_s === "number" ? { cutting_time_s: p.cutting_time_s } : undefined,
            };
            result = thermalNeuralPredictorEngine.predict(input);
            break;
          }
          case "adaptive_param_space_record": {
            const { adaptiveParameterSpaceEngine } = await import("../../engines/AdaptiveParameterSpaceEngine.js");
            const p = params as Record<string, unknown>;
            adaptiveParameterSpaceEngine.recordOperation({
              parameters: typeof p.parameters === "object" && p.parameters !== null ? p.parameters as Record<string, number> : {},
              timestamp: new Date().toISOString(),
              outcome: (typeof p.outcome === "string" ? p.outcome : "success") as "success"|"marginal"|"failure",
              context: typeof p.context === "object" && p.context !== null ? p.context as Record<string, unknown> : {},
            });
            result = adaptiveParameterSpaceEngine.getStatistics();
            break;
          }
          case "adaptive_param_space_query": {
            const { adaptiveParameterSpaceEngine } = await import("../../engines/AdaptiveParameterSpaceEngine.js");
            const p = params as Record<string, unknown>;
            const count = typeof p.count === "number" ? p.count : 5;
            result = {
              statistics: adaptiveParameterSpaceEngine.getStatistics(),
              explorationTargets: adaptiveParameterSpaceEngine.suggestExplorationTargets(count),
              unexploredGaps: adaptiveParameterSpaceEngine.identifyUnexploredGaps().slice(0, count),
              exploredRegions: adaptiveParameterSpaceEngine.getExploredRegions().slice(0, count),
            };
            break;
          }
          case "adaptive_machining_process": {
            const { adaptiveMachiningIntegrationEngine } = await import("../../engines/AdaptiveMachiningIntegrationEngine.js");
            result = adaptiveMachiningIntegrationEngine.process(
              params as unknown as Parameters<typeof adaptiveMachiningIntegrationEngine.process>[0]
            );
            break;
          }
          case "adaptive_physics_bridge": {
            const { adaptivePhysicsBridgeEngine } = await import("../../engines/AdaptivePhysicsBridgeEngine.js");
            const p = params as Record<string, unknown>;
            const conditions = {
              feed_mm_rev: typeof p.feed_mm_rev === "number" ? p.feed_mm_rev : 0.2,
              depth_of_cut_mm: typeof p.depth_of_cut_mm === "number" ? p.depth_of_cut_mm : 2,
              cutting_speed_mpm: typeof p.cutting_speed_mpm === "number" ? p.cutting_speed_mpm : 150,
              material: (typeof p.material === "string" ? p.material : "steel") as "steel"|"stainless"|"aluminum"|"cast_iron"|"titanium"|"superalloy",
              tool_diameter_mm: typeof p.tool_diameter_mm === "number" ? p.tool_diameter_mm : undefined,
              rake_angle_deg: typeof p.rake_angle_deg === "number" ? p.rake_angle_deg : undefined,
              insert_nose_radius_mm: typeof p.insert_nose_radius_mm === "number" ? p.insert_nose_radius_mm : undefined,
              chipbreaker_type: typeof p.chipbreaker_type === "string" ? p.chipbreaker_type as "none"|"light"|"medium"|"heavy" : undefined,
              coolant: typeof p.coolant === "boolean" ? p.coolant : true,
            };
            const cuttingPower = typeof p.cutting_power_kw === "number" ? p.cutting_power_kw : 5;
            const ratedPower = typeof p.rated_power_kw === "number" ? p.rated_power_kw : 15;
            const cuttingTime = typeof p.cutting_time_min === "number" ? p.cutting_time_min : 30;
            result = adaptivePhysicsBridgeEngine.performIntegratedAnalysis(conditions, cuttingPower, ratedPower, cuttingTime);
            break;
          }

          // OBSIDIAN-PRISM-OS-MS0/U-ORPHAN-RESCUE-QUICK-CALC: 10 actions wiring QuickCalcEngine (2026-05-15)
          case "quick_rpm": {
            const { quickCalcEngine } = await import("../../engines/QuickCalcEngine.js");
            result = quickCalcEngine.rpm(params.surface_speed, params.diameter, params.metric === true);
            break;
          }
          case "quick_feed_rate": {
            const { quickCalcEngine } = await import("../../engines/QuickCalcEngine.js");
            result = quickCalcEngine.feedRate(params.rpm, params.chip_load, params.flutes, params.metric === true);
            break;
          }
          case "quick_mrr": {
            const { quickCalcEngine } = await import("../../engines/QuickCalcEngine.js");
            result = quickCalcEngine.mrr(params.woc, params.doc, params.feed_rate, params.metric === true);
            break;
          }
          case "quick_surface_speed": {
            const { quickCalcEngine } = await import("../../engines/QuickCalcEngine.js");
            result = quickCalcEngine.surfaceSpeed(params.rpm, params.diameter, params.metric === true);
            break;
          }
          case "quick_chip_load": {
            const { quickCalcEngine } = await import("../../engines/QuickCalcEngine.js");
            result = quickCalcEngine.chipLoad(params.feed_rate, params.rpm, params.flutes, params.metric === true);
            break;
          }
          case "quick_tap_drill": {
            const { quickCalcEngine } = await import("../../engines/QuickCalcEngine.js");
            result = quickCalcEngine.tapDrill(params.major_dia, params.pitch);
            break;
          }
          case "quick_cutting_time": {
            const { quickCalcEngine } = await import("../../engines/QuickCalcEngine.js");
            result = quickCalcEngine.cuttingTime(params.distance, params.feed_rate);
            break;
          }
          case "quick_scallop_height": {
            const { quickCalcEngine } = await import("../../engines/QuickCalcEngine.js");
            result = quickCalcEngine.scallopHeight(params.tool_radius, params.stepover);
            break;
          }
          case "quick_thread_pitch": {
            const { quickCalcEngine } = await import("../../engines/QuickCalcEngine.js");
            result = quickCalcEngine.threadPitch(params.tpi);
            break;
          }
          case "quick_cutting_power": {
            const { quickCalcEngine } = await import("../../engines/QuickCalcEngine.js");
            result = quickCalcEngine.cuttingPower(params.mrr_in3min, params.material, params.custom_factor);
            break;
          }

          // OBSIDIAN-PRISM-OS-MS0/U-ORPHAN-RESCUE-SMART-DEFAULTS: SmartDefaultsEngine wire (2026-05-15)
          case "smart_defaults_get": {
            const { smartDefaultsEngine } = await import("../../engines/SmartDefaultsEngine.js");
            result = { success: true, defaults: smartDefaultsEngine.getDefaults(
              String(params.material),
              Number(params.tool_diameter),
              typeof params.flutes === "number" ? params.flutes : 3,
              typeof params.tool_material === "string" ? params.tool_material : "carbide",
              typeof params.operation === "string" ? params.operation : "milling",
            ) };
            break;
          }
          case "smart_defaults_sfm": {
            const { smartDefaultsEngine } = await import("../../engines/SmartDefaultsEngine.js");
            result = { success: true, sfm: smartDefaultsEngine.getSFM(
              String(params.material),
              typeof params.tool_material === "string" ? params.tool_material : "carbide",
            ) };
            break;
          }
          case "smart_defaults_chipload": {
            const { smartDefaultsEngine } = await import("../../engines/SmartDefaultsEngine.js");
            result = { success: true, chipload_in: smartDefaultsEngine.getChipload(Number(params.diameter)) };
            break;
          }
          case "smart_defaults_engagement": {
            const { smartDefaultsEngine } = await import("../../engines/SmartDefaultsEngine.js");
            result = { success: true, engagement: smartDefaultsEngine.getEngagement(
              Number(params.diameter),
              String(params.material),
              typeof params.operation === "string" ? params.operation : "milling",
            ) };
            break;
          }
          case "smart_defaults_coolant": {
            const { smartDefaultsEngine } = await import("../../engines/SmartDefaultsEngine.js");
            result = { success: true, coolant: smartDefaultsEngine.getCoolant(String(params.material)) };
            break;
          }
          case "smart_defaults_materials": {
            const { smartDefaultsEngine } = await import("../../engines/SmartDefaultsEngine.js");
            result = { success: true, materials: smartDefaultsEngine.listMaterials() };
            break;
          }
          case "smart_defaults_oneliner": {
            const { smartDefaultsEngine } = await import("../../engines/SmartDefaultsEngine.js");
            result = { success: true, line: smartDefaultsEngine.oneLiner(
              String(params.material),
              Number(params.diameter),
              typeof params.flutes === "number" ? params.flutes : 3,
            ) };
            break;
          }

          // OBSIDIAN-PRISM-OS-MS0/U-ORPHAN-RESCUE-ROUGHNESS: RoughnessConversionEngine wire (2026-05-15)
          // Half-wired: roughness_convert was in ACTIONS + slimmer mapper but missing the switch case.
          // Completes the contract; the slimmer at line 242 returns {from, to, value, n_grade, process, unc_pct}.
          case "roughness_convert": {
            const { roughnessConversionEngine } = await import("../../engines/RoughnessConversionEngine.js");
            result = roughnessConversionEngine.convert({
              value: Number(params.value),
              from_scale: String(params.from_scale) as "Ra_um"|"Rz_um"|"Rq_um"|"Rt_um"|"Ra_uin"|"N_grade",
              to_scale: String(params.to_scale) as "Ra_um"|"Rz_um"|"Rq_um"|"Rt_um"|"Ra_uin"|"N_grade",
            });
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

        logActionTelemetry(action, Date.now() - calcStart, true, "prism_calc");
        return {
          content: [{ type: "text", text: JSON.stringify(slimResponse(result, getSlimLevel(pressurePct))) }]
        };

      } catch (error) {
        logActionTelemetry(action, Date.now() - calcStart, false, "prism_calc");
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
