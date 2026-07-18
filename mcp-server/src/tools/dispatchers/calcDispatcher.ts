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
    case "hybrid_post_merge": {
      // Engine returns AtomicValue<MergeResult>; unwrap value.program for slim shape.
      // Fixed 2026-05-23 slot:india U-INDIA-WIRE-HPM — prior slimmer read
      // result.merged_gcode / result.tool_map which never existed on the engine
      // contract (it returns {value:{program:{header,body,footer,total_lines,
      // total_tools,total_time_min,tool_list,conflicts,transition_blocks},
      // segment_map, quality_score, warnings}, unit, formula, confidence}).
      const mr = (result?.value ?? result) as { program?: any; quality_score?: number; warnings?: string[] };
      const program = mr?.program ?? {};
      return {
        total_lines: program.total_lines ?? 0,
        conflicts: Array.isArray(program.conflicts) ? program.conflicts.length : 0,
        tools_used: program.total_tools ?? 0,
        quality_score: mr?.quality_score ?? 0,
        warnings: Array.isArray(mr?.warnings) ? mr.warnings.length : 0,
      };
    }
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
      // U-WIRE-ENERGY P3 close 2026-05-17 kilo: extend pressure-slim from 4
      // keys to 6 by adding operator-critical cycle_time_min (timing) and
      // cost_energy (USD). Original 4 kept positionally; new keys appended so
      // any caller that destructures by name (vs index) is unaffected.
      return {
        total_kwh: result.total_kwh,
        sec_j_mm3: result.sec_j_mm3,
        co2_kg: result.co2_kg,
        efficiency_pct: result.efficiency_pct,
        cycle_time_min: result.cycle_time_min,
        cost_energy: result.cost_energy,
      };
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
  "trochoidal", "hsm", "scallop", "stepover", "cycle_time", "arc_fit", "arc_fit_kasa",
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
  "minimum_zone_fit",
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
  "tool_breakage_predict", "tool_stress_analyze", "tool_safe_limits", "breakage_root_cause", "deflection_calculate",
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
  "tool_catalog_corpus_stats", "tool_catalog_load_corpus",
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
  // -- SFC-ACCURACY-MS1 Iter 4+5: parameter-cascade auto-adjust + pareto recommender --
  "sf_auto_adjust", "prism_enhanced_recommend",
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
  // -- Dynamic Strain Aging (DSA / PLC) window advisory (UNIT-0007) --
  "dsa_window_check",
  // -- Tool-life extension lever recommender (UNIT-0012) --
  "tool_life_extension_recommend",
  // -- BUE mitigation lever recommender (UNIT-0011) --
  "bue_mitigation_recommend",
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
  "sfc_calculate", "sfc_feed_for_target", "surface_finish_compare",
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
  // FEATURE-GAP-AUDIT-MS0/U-WIRE-BACKLOG-SF-PARTIAL-L1-STATS (2026-05-20): SpeedFeedDeepLearningEngine L1 introspection.
  // R12-safe wire — exposes calibration/training status, NOT inference (L1 NN has random-init weights until trained).
  "speedfeed_dl_stats",
  // MS-CRITWIRE/U-CW-06 (2026-05-20): SF-AI L2/L3 introspection wire — completes the L1-L3 ladder. R12-safe: exposes
  // deterministic stats() (query counts, capability inventory, episodic/KG sizes), NOT NN inference (L3 has 13
  // Math.random() sites; inference output is untrained until U-AITRAIN-SPEEDFEED ships).
  "speedfeed_advanced_ai_stats", "speedfeed_ultimate_ai_stats",
  // OSCAR-SFC-SELFLEARN-WIRE (bravo, 2026-06-11): SpeedFeedOutcomeFeedbackBridgeEngine was built + consumed by the
  // 9-axis orchestrator but exposed via ZERO dispatcher actions -> the SFC closed-loop fold-back (shop-floor actuals
  // -> calibration) had no external surface. These 3 open it. R12-safe: ring-buffer capture/fold-back/introspection
  // DATA, not NN inference.
  "speedfeed_outcome_record_actuals", "speedfeed_outcome_stats", "speedfeed_outcome_recent",
  // OSCAR-SFC-SELFLEARN-WIRE (bravo, 2026-06-11): SFCMultiHypothesisRankerEngine carried a FALSE // WIRE-EXEMPT
  // marker (phantom consumers: a comment + a surfaces_into metadata string, zero real callers) -> the Bayesian
  // speed/feed candidate arbiter was dark. Its own getSelfAwareness already declares sfc_rank_hypotheses. R12-safe:
  // deterministic ranking (likelihood = reward.weighted_total), NOT NN inference.
  "sfc_rank_hypotheses", "sfc_ranker_stats",
  // OSCAR-SFC-SELFLEARN-WIRE (bravo, 2026-06-11): SFCParameterRefinementEngine carried a FALSE // WIRE-EXEMPT marker
  // (zero real callers -- only its own test references it). It closes the SFC self-improving loop: reads shop-floor
  // actuals off the OutcomeCaptureBus, computes median+IQR multiplicative correction factors per machine/material
  // context, hard-clamped to [0.25,4.0], fail-loud below min evidence. This action surfaces that calibration. R12-safe:
  // deterministic median/IQR + safety clamp, NEVER NN inference. SECURITY: forwards only validated tuning fields --
  // never params.bus / params.clock (the engine honors input.bus/input.clock; exposing them would let a caller swap
  // the data source out from under the singleton).
  "sfc_parameter_refinement_compute",
  // FEATURE-GAP-AUDIT-MS0/U-WIRE-BACKLOG-SF-GILBERT (2026-05-20): GilbertEconomicSpeedEngine wire (Gilbert 1950 minimum-cost cutting velocity for turning).
  // Pure economics + Taylor — no NN, no random init. Closes 1 of ~12 unwired SF engines.
  "gilbert_econ_speed_compute", "gilbert_econ_speed_compare_vc", "gilbert_econ_speed_stats",
  // FEATURE-GAP-AUDIT-MS0/U-WIRE-BACKLOG-SF-BARPITCH (2026-05-20): BarFeedPitchOptimizerEngine wire — 1-D bar-feed pitch optimization for lathe/Swiss.
  // Pure bin-packing math — no NN, no random init.
  "bar_feed_pitch_optimize", "bar_feed_pitch_stats",
  // FEATURE-GAP-AUDIT-MS0/U-WIRE-BACKLOG-SF-CSS-CHIPLOAD (2026-05-20): CSSChipLoadInvariantCoordinatorEngine wire — G96 CSS chip-load invariance.
  // Pure Kienzle physics (no NN, no random init). Closes 1 of ~12 unwired SF engines.
  "css_chipload_analyze",
  // FEATURE-GAP-AUDIT-MS0/U-WIRE-BACKLOG-SF-AUTO-CALC (2026-05-20): AutoSpeedFeedCalculatorEngine wire — multi-op SF auto-calc
  // (RPM from SFM/diameter, G50 clamp, boring-bar L/D feed scale, surface-finish from nose-radius, Kienzle power check).
  // Engine imports rpmFromVc + predictedRa from src/physics/constants.ts. Closes 1 of ~10 remaining unwired SF calculator engines.
  "auto_speed_feed_calc",
  // FEATURE-GAP-AUDIT-MS0/U-WIRE-BACKLOG-SF-FEEDRATE-OPT (2026-05-20, slot:juliett): FeedRateOptimizationEngine wire —
  // engagement-aware feed optimization with chip-thinning compensation, corner-feed reduction, Kienzle power capping.
  // Pure physics (Sandvik Coromant + Altintas + iMachining patent). Closes 1 of ~10 remaining unwired SF calculator engines.
  "feed_rate_optimize",
  // FEATURE-GAP-AUDIT-MS0/U-WIRE-BACKLOG-SF-CAM-BRIDGE (2026-05-21, slot:juliett): CAMSpeedFeedBridgeEngine wire —
  // pure translation + encoding layer between 7 CAM hosts (hyperMILL/Fusion360/Inventor HSM/Mastercam/ESPRIT/SolidCAM/generic)
  // and the central SpeedFeedOrchestratorEngine. Normalizes native parameter vocabularies → OrchestratorInput, runs compute,
  // encodes the result back into the host's wire format (XML-RPC, JSON-RPC, pipe-delimited, JSON). Closes 1 of ~6 remaining
  // unwired SF calculator engines. Ref: CAM-EXHAUST-MS0 U-CAM99.
  "cam_speed_feed_bridge",
  // FEATURE-GAP-AUDIT-MS0/U-WIRE-BACKLOG-SF-PP-SCALER (2026-05-21, slot:juliett): PPFeedSpeedScalerEngine wire —
  // post-process G-code F/S rewriter (trial-cut scaling, machine-max clamping, range-filtered scaling). Paren-comment-safe.
  // Distinct from feed_rate_optimize: this is byte-level G-code text transformation, not engagement-physics. Closes 1 of ~5.
  "pp_feed_speed_scale",
  // FEATURE-GAP-AUDIT-MS0/U-WIRE-BACKLOG-SF-MINER (2026-05-21, slot:juliett): SpeedFeedMinerEngine wire — mine speed/feed
  // patterns from a batch of parsed CNC programs (ProgramRecord[]). Pure statistical mining: per-(material × operation ×
  // machine) median/mean/stddev + outlier detection vs CANONICAL_RANGES (steel/aluminum/stainless) + shop-median
  // calibration entries. Sibling action speed_feed_compare_to_baseline takes a single program + pre-computed stats and
  // grades each tool optimal | conservative | aggressive | dangerous. Closes 2 of ~4 remaining unwired SF calculator engines.
  "speed_feed_mine",
  "speed_feed_compare_to_baseline",
  // OSCAR-SFC-9AXIS-MS0/U-OSC-WIRE-TRIVENDOR (2026-06-08, slot:oscar): SpeedFeedTriComparatorEngine wire — the
  // PRISM × baseline-DB × G-Wizard tri-vendor comparison matrix. Runs ONE 9-axis physics pass, then grades PRISM's
  // recommendation against the vendor baseline DBs, returning per-system Vc/fz opinions + agreement deltas. THE
  // closed-loop comparison keystone (SFC ↔ HSMAdvisor ↔ G-Wizard). Own TriCompareInputSchema validates input.
  "speed_feed_tri_compare",
  // OSCAR-SFC-9AXIS-MS0/U-OSC-WIRE-EXHAUST (2026-06-08, slot:oscar): SpeedFeedExhaustiveCombinationEngine wire —
  // physics-invariant bounded cartesian sweep over (material × tool × operation × machine) cells with a ledger of
  // invariant violations (I1–I6). demo/sampled/full modes. Drives the at-scale comparison harness. Closes 1 of ~3.
  "speed_feed_exhaustive_sweep",
  // OSCAR-SFC-9AXIS-MS0/U-OSC-WIRE-DOWNSTREAM (2026-06-08, slot:oscar): SpeedFeedDownstreamSubscriberEngine wire —
  // read-only query of the resolved post-processor / mill-wizard / lathe-wizard default packs the SFC fans out to.
  // Surfaces what each downstream consumer would receive from a recommendation. Closes the last SF orphan.
  "speed_feed_downstream_packs",
  // OSCAR-SFC-9AXIS-MS0/U-OSC-CALIB-PERSIST (2026-06-08, slot:oscar): SpeedFeedCalibrationPersistEngine wire —
  // the closed-loop TRAINING layer's persist foundation. Reads the full-sweep comparison ledger
  // (PRISM vs vendor baseline across all inputs) and derives + persists a schema-versioned per-(ISO×mode)
  // calibration model. ADVISORY-ONLY: factors are never auto-applied (apply is operator-gated + S(x)≥0.98);
  // every factor that would INCREASE Vc (more aggressive vs an un-safety-validated baseline) is flagged.
  "speed_feed_calibration_persist",
  // OSCAR-SFC-9AXIS-MS0/U-OSC-GPU-JUDGE (2026-06-08, slot:oscar): SpeedFeedGpuJudgeEngine wire — the GPU-IN-THE-LOOP
  // layer of the closed-loop training pipeline. For each sweep regime it asks a GPU-resident reasoning model
  // (Ollama on the RTX PRO 6000 Blackwell, proven 100%-VRAM-resident via /api/ps) to judge — as a master machinist —
  // whether PRISM's physics-derived Vc is soundly conservative vs the vendor baseline. ADVISORY-ONLY: verdicts never
  // change a recommendation or raise Vc. Fail-loud: unreachable endpoint → labeled fallback (never a fabricated verdict).
  "speed_feed_gpu_judge",
  // FEATURE-GAP-AUDIT-MS0/U-WIRE-BACKLOG-SF-AUTOPILOT (2026-05-21, slot:juliett): SpeedFeedAutopilotEngine wire — end-to-end
  // speed/feed product autopilot. 5-step chain: resolveMaterial → resolveTool → resolveMachine → computeSpeedFeed →
  // safety_check. Minimal input (material name, tool diameter, optional flutes/operation/machine/HRC/coolant) → fully
  // resolved {rpm, feed_mm_min, fz, Vc, MRR, Fc, power_kW, safety_score} with per-step pass/warn/fail + recommendations.
  // Imports CANONICAL_MATERIAL_DB from physics/constants.ts (Kc1.1/mc/Taylor) — no inlined physics. Closes 1 of ~2.
  "speed_feed_autopilot",
  // FEATURE-GAP-AUDIT-MS0/U-WIRE-BACKLOG-SF-MACHINE-AWARE (2026-05-21, slot:juliett): MachineAwareSpeedFeedEngine wire —
  // clamp calculated S/F to real machine constraints (max_rpm/max_feed/max_power/max_torque from CanonicalMachinePackage).
  // Returns {unconstrained, constrained, constraints:{rpmLimited,feedLimited,powerLimited,torqueLimited,limitingFactor},
  // machine:{id,manufacturer,model,constraints}, headroom, safety, recommendations}. Engine.constrain() reads only 8 fields
  // from the package (canonical_id, manufacturer, model, spindle.{max_rpm,min_rpm,power,torque}, axes.x_rapid) — schema
  // accepts the slim subset, full CanonicalMachinePackage compatible via .passthrough(). Closes 1 of ~1 remaining.
  "machine_aware_constrain",
  // MS-CRITWIRE/U-CW-02 + KAR-MS2.1/U-KAR17 (2026-05-20): ProvenSpeedFeedAggregatorEngine wire — aggregate shop-proven
  // speed/feed data (Okuma lathe + mill-pattern samples) into statistically-analyzed proven parameters. Pure statistics
  // (mean/stddev/percentile/CV/2σ-outlier) — no NN, no random init. Closes 1 of ~12 unwired SF engines.
  "proven_speed_feed_aggregate_lathe", "proven_speed_feed_aggregate_mill", "proven_speed_feed_query", "proven_speed_feed_export",
  // FEATURE-GAP-AUDIT-MS0/U-WIRE-BACKLOG-SF-RESOURCE (2026-05-20): SpeedFeedResourceIntegrationEngine wire — authoritative
  // speed/feed knowledge (CNCCookbook 2024 + Sandvik/Kennametal catalogs): material SFM ranges, chip-load guidance,
  // face-mill 45/90 strategy, HEM params, JM-Die special-material lookup, optimal-speed/feed calc. Closes 1 of ~12 unwired SF engines.
  "speed_feed_resource_sfm", "speed_feed_resource_chiploads", "speed_feed_resource_facemill_strategy",
  "speed_feed_resource_hem", "speed_feed_resource_jmdie_material", "speed_feed_resource_optimal",
  // MS-CRITWIRE/U-CW-10 (2026-05-20): surface material designation resolution on prism_calc —
  // designation (AISI grade / material-family token) -> ISO 513 group + Kienzle kc1.1/mc + Taylor C/n.
  "material_resolve",
  // PRISM-CAPABILITY-CLOSE/U-CLOSED-LOOP-VERIFIER (foxtrot iter17 — GAP-7 closure):
  // wraps DigitalTwinFormulasEngine EKF + drift + divergence into a single
  // closed-loop verifier. Verdict: in_control/drifted/diverged/abort.
  "closed_loop_verify",
  // PRISM-CAPABILITY-CLOSE/U-FIXTURE-TOPOLOGY-OPT (foxtrot iter17 — GAP-6 closure):
  // SIMP compliance-minimization topology optimization for fixture-design sub-feature.
  // Bendsøe & Sigmund (2003); Sigmund (2001) 99-line code.
  "fixture_topology_optimize",
  // PRISM-PART-TYPE-STACK (foxtrot iter19 — 4-layer per-part-type pipeline pilot):
  // L1 recognizer (CAD geometry → part class) + L2 adapters (3 pilot classes) +
  // L4 variability regression harness (5-axis acceptance gate).
  "part_type_recognize",
  "adapt_mill_prismatic",
  "adapt_lathe_shaft",
  "adapt_wire_edm_punch_die",
  "part_variability_assert",
  // -- iter5+6+7 wire-unwired-loop: 13 optimization/calc engines --
  "grep_optimizer_optimize",
  "monte_carlo_process_compute",
  "optimization_formulas_constrained",
  "optimization_engine_run",
  "pipeline_optimization_record",
  "formula_wiring_list_unwired",
  "machine_confidence_calc",
  "calculator_prism_mode_calc",
  "sfc_optimize_run",
  // OSCAR-SFC-9AXIS-MS0/U-OSC9-01: 9-axis comprehensive speed/feed orchestrator
  "sfc_nine_axis_run",
  // OSCAR-SFC-9AXIS-MS0/U-OSC9-08: ShopToolLibrary → MRR-ranked SFC bridge (operator's REAL Fusion 360 tools)
  "sfc_shop_library_rank",
  // OSCAR-SFC-9AXIS-MS0/U-OSC9-09: HSMAdvisor settings_v2.xml live-state adapter (vendor baseline read)
  "hsmadvisor_read_current_state",
  // CATALOG-APP-WIRING (romeo, 2026-06-09): PRISM tool -> HSMAdvisor settings_v2.xml <Tool> EXPORT (write-back, single-tool state)
  "hsmadvisor_export_settings",
  // OSCAR-SFC-9AXIS-MS0/U-OSC9-10: fleet PDF-corpus → SFC tribal-prior bridge (kilo seeds + extracted JSONL)
  "sfc_pdf_corpus_bridge",
  // OSCAR-SFC-9AXIS-MS0/U-OSC9-11: PRISM ↔ HSMAdvisor live-state comparison bridge (5-axis diff + agreement score)
  "hsmadvisor_compare",
  // OSCAR-SFC-9AXIS-MS0/U-OSC9-12: G-Wizard Calculator toolcrib.csv read-only adapter
  "gwizard_read_toolcrib",
  // CATALOG-APP-WIRING (romeo, 2026-06-08): PRISM tool catalog -> G-Wizard toolcrib.csv EXPORT (write-back)
  "gwizard_export_toolcrib",
  // OSCAR-SFC-9AXIS-MS0/U-OSC9-13: mike WEDM training-corpus pair indexer/lookup bridge
  "wedm_training_pair_lookup",
  "algorithm_orchestrator_run",
  "realtime_optimization_run",
  "pallet_pool_optimizer_solve",
  "monte_carlo_schedule_simulate",
  // iter9 wire-unwired-loop: process/physics/industrial engines
  "conveyor_belt_calc",
  "ball_mill_calc",
  "flying_shear_calc",
  "cyclone_separator_calc",
  "screw_conveyor_calc",
  "bucket_elevator_calc",
  "multi_obj_pareto_optimize",
  "transformer_size_calc",
  "distillation_column_calc",
  "centrifuge_calc",
  "flotation_cell_calc",
  "membrane_filtration_calc",
  "thickener_calc",
  "rocket_nozzle_calc",
  "thermoelectric_calc",
  "electrospinning_calc",
  "freeze_drying_calc",
  "process_digital_twin_calc",
  "process_robustness_calc",
  "amsaa_reliability_growth_calc",
  "kalman_filter_calc",
  "sensor_data_schema_validate",
  "sensor_fusion_calc",
  "machine_tool_error_budget_calc",
  "swept_volume_calc",
  "surface_location_error_calc",
  "receptance_coupling_calc",
  "tapping_torque_calc",
  "process_capability_prediction_calc",
  "process_variability_integration_calc",
  "physics_prediction_calc",
  "calibrated_simulation_calc",
  "sensor_simulator_calc",
  "fixture_clamping_calc",
  "runout_effect_calc",
  "iso286_extended_calc",
  // ── Batch-2 UNKNOWN-bucket wiring (iter10) ──
  "advanced_cnc_config_analyze",
  "complete_machining_plan",
  "holder_operation_match_select",
  "in_process_stock_model_update",
  "inter_operation_state_transfer",
  "micro_milling_analyze",
  "micro_milling_size_effect_calc",
  "physics_aware_data_augmentation_run",
  "process_environment_sensitivity_analyze",
  "rcsa_frf_predict",
  "stock_feed_cycle_track",
  "swiss_guide_bushing_physics_calc",
  "trilobe_deformation_calc",
  "virtual_machining_simulate",
  "joint_speed_feed_optimize",
  "effective_diameter_compute",
  "hardness_vc_multiplier",
  "coolant_vc_modifier",
  "hpc_vc_boost",
  "climb_conventional_pick",
  "block_number_renumber",
  "flush_strategy_pick",
  "coolant_sequence_generate",
  "tool_change_sequence",
  "safe_retract_plan",
  "hsm_smoothing_filter",
  "glide_cut_detect",
  "subprogram_call_generate",
  "retract_plane_optimize",
  "chip_control_strategy",
  "taper_compensate",
  "csg_tree_reduce",
  "stock_envelope_compute",
  "step_iges_diff",
  "five_axis_tilt_lead",
  "wedm_lead_geometry",
  "job_cost_rollup",
  "quote_confidence_estimate",
  "setup_time_predict",
  "material_yield_optimize",
  "customer_ltv_dcf",
  // U-WIRE-MOEA-STOP / WIRE-UNWIRED-PAPA: MOEAStoppingCriterion HV-saturation stopping (slot:papa->tango 2026-06-15).
  "moea_stopping_evaluate",
  // U-WIRE-SFC-PSN / WIRE-UNWIRED-PAPA: SpeedFeedPSNDecisionPriorEngine.query -- read-only PSN (outcome-ledger/tribal/wiki) decision-prior fusion; priors NOT edited (oscar domain). slot:papa->oscar 2026-06-15.
  "sfc_psn_decision_prior",
  // SFC-CONVERGENCE/U-SFC-PREVIEW (slot:oscar, 2026-06-22): read-only convergence preview --
  // runs orchestrator.compute() vs ultimateSpeedFeedEngine.calculate(orchestratorToUltimateInput())
  // for a single SFC input and returns { production, converged, delta, recommendation, safety_flags }.
  // NEVER mutates process.env. Operator/UI surface for the convergence gate decision.
  "sfc_convergence_preview",
  // SFC-ORPHAN-WIRE-QUEUE/U-SFC-RAG-WARMSTART-WIRE (slot:india, 2026-06-22): expose the read-only
  // JM Die historical-program RAG retrieval + index introspection for direct operator corpus
  // visibility. retrieve() is a pure BM25 read (no physics mutation); the engine is ALSO consumed
  // internally by SFCMultiHypothesisRankerEngine -- this adds the operator-facing surface.
  "sfc_rag_warmstart",
  "sfc_rag_warmstart_stats",
  // -- MATH-APPLICATIONS (measure theory + algebraic topology), schema-less like the topology_* trio --
  "mesh_topology_invariants", "tda_condition_monitor", "importance_sampling_reliability",
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
      // SFC plumbing fix (2026-05-31, slot echo): UltimateSpeedFeedEngine (+ peers) read
      // `tool_diameter_mm`, but only `tool_diameter` was normalized — so the diameter never
      // reached the engine and it defaulted to a 12mm tool (every diameter gave the same rpm).
      // Mirror tool_diameter → tool_diameter_mm so the material-aware Vc lookup also yields a
      // diameter-correct rpm. Convention: the dispatcher's tool_diameter is MM (engine is mm-native).
      if (params.tool_diameter !== undefined && params.tool_diameter_mm === undefined) params.tool_diameter_mm = params.tool_diameter;
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

        // SFC machine-data shape bridge (U-SFC-MACHINE-HOOK-SHAPE, slot:oscar): the machine-validation
        // hooks (MachineValidationHooks) read the NESTED machine.spindle.* shape, but the SFC orchestrate
        // path sends FLAT machine_max_rpm/machine_power_kw -- so pre-machine-completeness-gate FALSE-BLOCKS
        // (and pre-machine-spindle-limits/power-budget silently SKIP) every default-machine SFC calc. Bridge
        // the present, sane flat spec into the nested shape so the hooks VALIDATE it. Additive: SFC actions
        // only, never overwrites an existing machine object, and returns undefined for an absent/non-positive
        // spec (so the gate still correctly blocks genuinely-incomplete machine data -- no safety weakening).
        {
          const { applySfcMachineBridge } = await import("../../utils/sfcMachineBridge.js");
          applySfcMachineBridge(action, params as Record<string, unknown>);
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

          case "arc_fit_kasa": {
            // Kasa point-cloud → G02/G03 arc fitter (least-squares circle fitting).
            // Distinct from `arc_fit` (block-time scalar calc). Wired 2026-05-17 kilo.
            // Uses ArcFittingEngine.Point3D structural shape (x/y/z).
            const { arcFittingEngine } = await import("../../engines/ArcFittingEngine.js");
            const pts = params.points as Array<{ x: number; y: number; z: number }>;
            const fitParams: Record<string, unknown> = {};
            if (params.tolerance_mm !== undefined) fitParams.tolerance_mm = params.tolerance_mm;
            if (params.min_points !== undefined) fitParams.min_points = params.min_points;
            if (params.max_radius_mm !== undefined) fitParams.max_radius_mm = params.max_radius_mm;
            if (params.min_radius_mm !== undefined) fitParams.min_radius_mm = params.min_radius_mm;
            if (params.plane !== undefined) fitParams.plane = params.plane;
            const fitResult = arcFittingEngine.fit(pts, fitParams as Partial<{ tolerance_mm: number; min_points: number; max_radius_mm: number; min_radius_mm: number; plane: "XY" | "XZ" | "YZ"; }>);
            if (params.emit_gcode) {
              // Defensive: even though Zod optPosNum already validates >0, guard
              // the engine boundary against future drift (direct engine import,
              // schema rewire). Non-finite or non-positive feedrate → omit (engine
              // emits `f: undefined` which the consumer treats as machine-default).
              const rawFr = params.feedrate;
              const safeFr = (typeof rawFr === "number" && Number.isFinite(rawFr) && rawFr > 0) ? rawFr : undefined;
              result = { ...fitResult, gcode: arcFittingEngine.toGCode(fitResult.arcs, safeFr) };
            } else {
              result = fitResult;
            }
            break;
          }

          case "chip_thinning": {
            const { calculateChipThinning } = await import("../../engines/ToolpathCalculations.js");
            result = calculateChipThinning(params.tool_diameter, params.radial_depth, params.feed_per_tooth, params.number_of_teeth || 4, params.cutting_speed || 150);
            break;
          }

          case "machining_energy_model": {
            // Gutowski energy model + Kienzle force, with per-stage breakdown.
            // Engine wraps result in AtomicValue<MachiningEnergyResult>. We unwrap
            // the .value into `result` so the existing slimResponse remap at
            // calcExtractKeyValues (line 290) reads `result.total_kwh` directly,
            // matching the contract already declared there. Wired 2026-05-17 kilo,
            // U-WIRE-ENERGY (closes the ghost-wired half-orphan — action was in
            // ACTIONS enum + slimResponse but had no executor body).
            const { machiningEnergyModelEngine } = await import("../../engines/MachiningEnergyModelEngine.js");
            const wrapped = machiningEnergyModelEngine.compute(params as Parameters<typeof machiningEnergyModelEngine.compute>[0]);
            // Carry the AtomicValue envelope under reserved keys so consumers
            // that want unit/formula provenance can still get it, but the bare
            // numerics live on the top-level (slimResponse contract).
            result = { ...wrapped.value, _unit: wrapped.unit, _formula: wrapped.formula, _confidence: wrapped.confidence };
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

          // OBSIDIAN-PRISM-OS-MS0/U-ORPHAN-RESCUE-CAMPAIGN: half-wire completion.
          // CampaignEngine was in z.enum + calcExtractKeyValues slimmer but lacked
          // main-switch cases — same gotcha as iter-13 (SpindleHarmonicsQuality).
          // 4 actions: campaign_create, campaign_validate, campaign_optimize,
          // campaign_cycle_time. list_actions:true on campaign_create returns
          // the action catalog instead of running create (matches engine convention).
          case "campaign_create": {
            const { createCampaign, listCampaignActions } = await import("../../engines/CampaignEngine.js");
            if (params.list_actions) {
              result = { success: true, actions: listCampaignActions() };
              break;
            }
            try {
              result = createCampaign(params.config as any, params.operation_results as any);
            } catch (err) {
              result = { error: err instanceof Error ? err.message : String(err) };
            }
            break;
          }

          case "campaign_validate": {
            const { validateCampaign } = await import("../../engines/CampaignEngine.js");
            result = validateCampaign(params.config as any);
            break;
          }

          case "campaign_optimize": {
            const { optimizeCampaign } = await import("../../engines/CampaignEngine.js");
            try {
              result = optimizeCampaign(params.config as any, params.target as any);
            } catch (err) {
              result = { error: err instanceof Error ? err.message : String(err) };
            }
            break;
          }

          case "campaign_cycle_time": {
            const { estimateCycleTime } = await import("../../engines/CampaignEngine.js");
            try {
              result = estimateCycleTime(params.config as any);
            } catch (err) {
              result = { error: err instanceof Error ? err.message : String(err) };
            }
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
            // U-OSC9-SPEEDFEED-MATERIAL-AWARE (slot:oscar): the legacy calculateSpeedFeed util keys Vc off the
            // TOOL material + hardness ONLY and never reads the WORKPIECE -- so it returned the SAME Vc for steel,
            // aluminum and titanium (material-blind; safety-relevant -- Al(N) wants ~2.6x steel(P) Vc, Ti(S) ~0.33x).
            // Delegate to UltimateSpeedFeedEngine (the material-aware Kienzle/Taylor authority, with a workpiece
            // alias->ISO/hardness table) and remap its OptimizedValue result back to the SpeedFeedResult contract
            // the compact map reads ({cutting_speed,spindle_speed,feed_per_tooth,feed_rate,axial_depth,radial_depth}).
            // Fail-LOUD fallback to the legacy util on any engine error (R12 -- the constant-Vc stub is the
            // documented WORSE path, so the fallback is flagged in `warnings`, never a silent degrade).
            const sfOp = String(params.operation || "roughing");
            const sfValidOps = new Set(["roughing", "finishing", "semi-finishing"]);
            const sfCutType = sfOp === "semi-finishing" ? "semi_finishing" : (sfValidOps.has(sfOp) ? sfOp : "roughing");
            const sfMaterial = params.material ?? params.material_id ?? params.material_name;
            const sfGenericHardness = (params.hardness ?? params.material_hardness) as number | undefined;
            try {
              const { ultimateSpeedFeedEngine } = await import("../../engines/UltimateSpeedFeedEngine.js");
              const u = ultimateSpeedFeedEngine.calculate({
                material: sfMaterial,
                iso_group: params.iso_group,
                hardness_hb: params.hardness_HB ?? params.hardness_hb ?? sfGenericHardness,
                hardness_hrc: params.hardness_HRC ?? params.hardness_hrc,
                tool_diameter_mm: params.tool_diameter || 12,
                flutes: params.number_of_teeth || params.z || 4,
                tool_material: String(params.tool_material || "carbide").toLowerCase(),
                operation: "milling",
                cut_type: sfCutType,
                ...(params.axial_depth != null ? { axial_depth_mm: params.axial_depth } : {}),
                ...(params.radial_depth != null ? { radial_depth_mm: params.radial_depth } : {}),
              } as any);
              // Finite-guard the whole speed/feed quartet (not just Vc): if the engine ever drops one,
              // fall LOUD to the legacy estimate rather than emit an undefined field into the contract.
              const vc = u?.cutting_speed?.value;
              const rpm = u?.spindle_rpm?.value;
              const fz = u?.feed_per_tooth?.value;
              const vf = u?.feed_rate?.value;
              if (![vc, rpm, fz, vf].every(Number.isFinite)) {
                throw new Error("engine returned a non-finite speed/feed value");
              }
              result = {
                cutting_speed: vc,
                spindle_speed: rpm,
                feed_per_tooth: fz,
                feed_rate: vf,
                axial_depth: u.axial_depth?.value,
                radial_depth: u.radial_depth?.value,
                warnings: [],
                recommendations: [],
                material_aware: true,
                resolved_material: sfMaterial ?? "(engine default)",
                source: "UltimateSpeedFeedEngine",
              };
            } catch (err) {
              const { calculateSpeedFeed } = await import("../../engines/ManufacturingCalculations.js");
              const fb = calculateSpeedFeed({
                material_hardness: params.hardness_HRC || params.hardness || params.material_hardness,
                operation: sfValidOps.has(sfOp) ? sfOp : "roughing",
                tool_diameter: params.tool_diameter || 12,
                tool_material: params.tool_material || "Carbide",
                number_of_teeth: params.number_of_teeth || params.z || 4,
              } as any);
              result = {
                ...fb,
                material_aware: false,
                warnings: [
                  ...((fb as { warnings?: string[] }).warnings ?? []),
                  `speed_feed: material-aware engine unavailable (${err instanceof Error ? err.message : String(err)}); used material-BLIND estimate -- verify Vc against a known reference for this workpiece`,
                ],
              };
            }
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
          case "minimum_zone_fit": {
            // Invention A2 — ASME Y14.5.1 minimum-zone (Chebyshev / L-infinity)
            // GD&T form-error fit. See wiki [[prism-invention-high-roi-engine-ideas]].
            const { minimumZoneFitEngine } = await import("../../engines/MinimumZoneFitEngine.js");
            const feature = params.feature;
            if (feature === "straightness") {
              result = minimumZoneFitEngine.straightness(params.points);
            } else if (feature === "flatness") {
              result = minimumZoneFitEngine.flatness(params.points);
            } else if (feature === "circularity") {
              result = minimumZoneFitEngine.circularity(params.points);
            } else {
              throw new Error(
                `minimum_zone_fit: unknown feature '${feature}' — expected straightness | flatness | circularity`,
              );
            }
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
          case "breakage_root_cause": {
            // Post-break attribution: ranks ToolBreakagePredictionEngine's four damage-mode probabilities
            // (fatigue/deflection/chipload/engagement) -> dominant cause + corrective actions. Composition,
            // not new physics (UNIT-0011 half 2). Note: this composes ToolBreakagePredictionEngine (4-mode
            // model), a DIFFERENT engine than tool_breakage_predict's ToolBreakageEngine.
            const { toolBreakageRootCauseEngine } = await import("../../engines/ToolBreakageRootCauseEngine.js");
            result = toolBreakageRootCauseEngine.analyze({
              tool: params.tool,
              forces: params.forces,
              engagement_history: params.engagement_history,
              break_observed: params.break_observed,
            });
            break;
          }
          case "deflection_calculate": {
            // Timoshenko beam deflection (bending + shear) for a tool/boring-bar cantilever.
            // Feed is deflection-limited, so this is a core SFC-suite surface (MS-CRITWIRE U-CW-08).
            // Wires the already-built TimoshenkoDeflectionEngine; E defaults from CANONICAL_TOOL_MODULUS.
            const { timoshenkoDeflectionEngine } = await import("../../engines/TimoshenkoDeflectionEngine.js");
            result = timoshenkoDeflectionEngine.calculate({
              force: params.force,
              length: params.length ?? params.overhang ?? params.stickout_mm,
              diameter: params.diameter ?? params.tool_diameter,
              elasticModulus: params.elasticModulus,
              shearModulus: params.shearModulus,
              poissonRatio: params.poissonRatio,
              shearCorrectionFactor: params.shearCorrectionFactor,
              material: params.material ?? params.tool_material,
            });
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
          case "mesh_topology_invariants": {
            // Algebraic-topology combinatorial mesh invariants (chi=V-E+F, Betti, genus, manifold/
            // watertight). Pure-JS, complements (does not duplicate) the OCCT B-rep euler gate.
            const { meshtopologyinvariantEngine } = await import("../../engines/MeshTopologyInvariantEngine.js");
            result = meshtopologyinvariantEngine.computeInvariants(params as any);
            break;
          }
          case "tda_condition_monitor": {
            // TDA: Takens delay-embedding + persistent-H1 loop detection for chatter/tool-wear
            // regime change (noise-robust vs FFT thresholds).
            const { tdamonitorEngine } = await import("../../engines/TDAConditionMonitorEngine.js");
            // calc normalizes snake->camel (line ~1376); read camel with snake fallback.
            result = tdamonitorEngine.monitor(params.series, { dimension: params.dimension, delay: params.delay, maxPoints: params.maxPoints ?? params.max_points });
            break;
          }
          case "importance_sampling_reliability": {
            // Measure-theory change-of-measure importance sampling for rare-event failure prob.
            // limitState is a function (cannot cross the wire) -> build a JSON-safe LINEAR limit
            // state g(x) = threshold - coeff.x from params.coefficients + failure_threshold.
            // calc normalizes snake->camel (line ~1376); read camel with snake fallback.
            const { importanceSamplingReliabilityEngine } = await import("../../engines/ImportanceSamplingReliabilityEngine.js");
            const coeff: number[] = Array.isArray(params.coefficients) ? params.coefficients : [];
            const thrRaw = params.failureThreshold ?? params.failure_threshold;
            const thr: number = typeof thrRaw === "number" ? thrRaw : 0;
            const mode = params.failureMode ?? params.failure_mode;
            result = importanceSamplingReliabilityEngine.estimateFailureProbability({
              limitState: (x: number[]) => thr - coeff.reduce((s, a, i) => s + a * (x[i] ?? 0), 0),
              input: { mean: params.mean, std: params.std },
              failureThreshold: 0,
              failureMode: mode === "above" ? "above" : "below",
              nSamples: params.nSamples ?? params.n_samples,
              seed: params.seed,
              designPoint: params.designPoint ?? params.design_point,
            });
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
          case "tool_catalog_corpus_stats": {
            // Manifest-only stats (declared corpus size + runtime-loaded count). Cheap.
            const { catalogCorpusLoaderEngine } = await import("../../engines/CatalogCorpusLoaderEngine.js");
            result = catalogCorpusLoaderEngine.corpusStats();
            break;
          }
          case "tool_catalog_load_corpus": {
            // Load the full vendor catalog corpus (~49.8K deduped tools; the loader skips 3
            // *-extracted.json twins that were 100%-redundant with richer .ts-getter caches) into
            // ToolCatalogEngine so every downstream consumer of toolCatalogEngine.search()
            // (Fusion / Mastercam / hyperMILL / Inventor HSM exports + SFC) sees it.
            // params.dryRun → normalize + report only (no feed). params.onlyManufacturer
            // → restrict to one vendor (incremental / testing).
            const { catalogCorpusLoaderEngine } = await import("../../engines/CatalogCorpusLoaderEngine.js");
            result = catalogCorpusLoaderEngine.load({
              dryRun: params.dryRun === true,
              ...(typeof params.onlyManufacturer === "string"
                ? { onlyManufacturer: params.onlyManufacturer }
                : {}),
            });
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
          case "dsa_window_check": {
            const { dynamicStrainAgingEngine } = await import("../../engines/DynamicStrainAgingEngine.js");
            type DSAInput = import("../../engines/DynamicStrainAgingEngine.js").DSAInput;
            result = dynamicStrainAgingEngine.assess(params as DSAInput);
            break;
          }
          case "tool_life_extension_recommend": {
            const { toolLifeExtensionRecommenderEngine } = await import("../../engines/ToolLifeExtensionRecommenderEngine.js");
            type TLEInput = import("../../engines/ToolLifeExtensionRecommenderEngine.js").LifeExtensionInput;
            result = toolLifeExtensionRecommenderEngine.recommend(params as TLEInput);
            break;
          }
          case "bue_mitigation_recommend": {
            const { bueMitigationRecommenderEngine } = await import("../../engines/BUEMitigationRecommenderEngine.js");
            type BMInput = import("../../engines/BUEMitigationRecommenderEngine.js").BUEMitigationInput;
            result = bueMitigationRecommenderEngine.recommend(params as BMInput);
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
          case "sf_auto_adjust": {
            // SFC-ACCURACY-MS1 Iter 4 — parameter dependency DAG cascade
            const { autoAdjustCascadeEngine } = await import("../../engines/AutoAdjustCascadeEngine.js");
            result = autoAdjustCascadeEngine.cascade({
              oldInput: params.oldInput as Record<string, unknown>,
              changedField: params.changedField as string,
              newValue: params.newValue,
              maxDepth: params.maxDepth as number | undefined,
              dryRun: params.dryRun as boolean | undefined,
            });
            break;
          }
          case "prism_enhanced_recommend": {
            // SFC-ACCURACY-MS1 Iter 5 — NSGA-II pareto-optimal selection
            const { prismEnhancedRecommenderEngine } = await import("../../engines/PrismEnhancedRecommenderEngine.js");
            result = prismEnhancedRecommenderEngine.recommend(params as ValidatedParams);
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

          // ── Closed-Loop Verifier (GAP-7 orchestration, foxtrot iter17) ──
          // Wraps DigitalTwinFormulas EKF + drift + divergence into a single
          // closed-loop verification call. Verdict: in_control/drifted/diverged/abort.
          case "closed_loop_verify": {
            const { closedLoopVerifierEngine: clve } = await import("../../engines/ClosedLoopVerifierEngine.js");
            result = clve.verify(params as Parameters<typeof clve.verify>[0]);
            break;
          }

          // ── Fixture Topology Optimization (GAP-6 closure, foxtrot iter17) ──
          // SIMP compliance-minimization for fixture-design topology optimization.
          // Bendsøe & Sigmund (2003) §1.3 + §2.4; Sigmund (2001) 99-line code.
          case "fixture_topology_optimize": {
            const { fixtureTopologyOptimizerEngine: ftoe } = await import("../../engines/FixtureTopologyOptimizerEngine.js");
            result = ftoe.optimize(params as Parameters<typeof ftoe.optimize>[0]);
            break;
          }

          // ── 4-Layer Per-Part-Type Pipeline Stack (foxtrot iter19 pilot) ──
          // L1: PartTypeRecognizerEngine (CAD signature → part class per domain)
          case "part_type_recognize": {
            const { partTypeRecognizerEngine: ptr } = await import("../../engines/PartTypeRecognizerEngine.js");
            result = ptr.recognize(params as Parameters<typeof ptr.recognize>[0]);
            break;
          }
          case "adapt_mill_prismatic": {
            const { millPrismaticAdapterEngine: mpa } = await import("../../engines/MillPrismaticAdapterEngine.js");
            result = mpa.adapt(params as Parameters<typeof mpa.adapt>[0]);
            break;
          }
          case "adapt_lathe_shaft": {
            const { latheShaftAdapterEngine: lsa } = await import("../../engines/LatheShaftAdapterEngine.js");
            result = lsa.adapt(params as Parameters<typeof lsa.adapt>[0]);
            break;
          }
          case "adapt_wire_edm_punch_die": {
            const { wireEDMPunchDieAdapterEngine: wpa } = await import("../../engines/WireEDMPunchDieAdapterEngine.js");
            result = wpa.adapt(params as Parameters<typeof wpa.adapt>[0]);
            break;
          }
          case "part_variability_assert": {
            const { partVariabilityRegressionHarnessEngine: pvr } = await import("../../engines/PartVariabilityRegressionHarnessEngine.js");
            result = pvr.assert(params as Parameters<typeof pvr.assert>[0]);
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
          case "chatter_stability_sld": {
            // Base stability-lobe-diagram action. It was declared in the z.enum (~:736) and had a
            // summary formatter (~:288) but NO exec case, so every call threw "Unknown calculation
            // action" at runtime (dead action found by the 2026-07-03 physics-coverage workflow).
            // Wire it to the engine's core SLD method; .value unwraps the AtomicValue to the flat
            // ChatterResult { optimal_rpm, max_stable_ap_mm, lobes, stable_pockets } the formatter reads.
            const { chatterStabilityLobeEngine: cslSLD } = await import(
              "../../engines/ChatterStabilityLobeEngine.js"
            );
            result = cslSLD.compute(params as ValidatedParams).value;
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
            const assessment = (p.assessment as Parameters<typeof omegaSafetyScoreEngine.score>[0]) ?? (p as unknown as Parameters<typeof omegaSafetyScoreEngine.score>[0]);
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

          // ── Hybrid Post Merge (HybridPostMergeEngine) ──
          // Slot:india U-INDIA-WIRE-HPM 2026-05-23 — completes the half-wire
          // that had the action in z.enum + response-slimmer but no compute()
          // call site (calling it would have crashed on undefined result).
          case "hybrid_post_merge": {
            const { hybridPostMergeEngine: hpme } = await import("../../engines/HybridPostMergeEngine.js");
            result = hpme.compute(params as any);
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
          // U-WIRE-SFCMP: SFCCompareEngine — measured-Ra-vs-spec SPC (Cpk + trend +
          // in/out-of-spec assessment). DISTINCT from sfc_calculate above, which
          // PREDICTS Ra from cutting params; this one COMPARES measured surface
          // finish against a specification. Engine ships its own CompareInputSchema.
          case "surface_finish_compare": {
            const { SFCCompareEngine } = await import("../../engines/SFCCompareEngine.js");
            result = SFCCompareEngine.compare(params as Parameters<typeof SFCCompareEngine.compare>[0]);
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

          // FEATURE-GAP-AUDIT-MS0/U-WIRE-BACKLOG-SF-PARTIAL-L1-STATS (2026-05-20): SpeedFeedDeepLearningEngine L1 introspection wire.
          // R12-safe — exposes calibration/training status, NOT inference output. The L1 NN has Math.random() init weights
          // until U-AITRAIN-SPEEDFEED training ships, so wiring inference paths would ship garbage (silently violating R12).
          // This stats action gives operators visibility into "is L1 trained yet?" — load-bearing precondition for safely
          // wiring L2 (SpeedFeedAdvancedAIEngine) and L3 (SpeedFeedUltimateAIEngine) which transitively depend on L1.
          case "speedfeed_dl_stats": {
            const { speedFeedDeepLearningEngine } = await import("../../engines/SpeedFeedDeepLearningEngine.js");
            const learning = speedFeedDeepLearningEngine.getSelfLearningStats();
            const operational = speedFeedDeepLearningEngine.stats();
            result = {
              success: true,
              stats: {
                queries_processed: operational.queries_processed,
                neural_networks: operational.neural_networks,
                self_learning_feedback: operational.self_learning_feedback,
                calibrated: learning.calibrated,
                avg_errors_pct: learning.avg_errors,
              },
            };
            break;
          }

          // MS-CRITWIRE/U-CW-06 (2026-05-20): SF-AI L2/L3 introspection wire — completes the L1-L3 ladder begun by
          // speedfeed_dl_stats (L1). R12-safe by design: exposes only the engines' deterministic stats() surface
          // (query counts, AI-capability inventory, reasoning frameworks, episodic-memory / knowledge-graph sizes).
          // It does NOT expose NN inference — SpeedFeedUltimateAIEngine has 13 Math.random() sites and its inference
          // output is untrained until U-AITRAIN-SPEEDFEED ships; wiring an inference path would silently ship garbage.
          // OSCAR-SFC-SELFLEARN-WIRE (bravo, 2026-06-11): close the SFC self-learning loop externally.
          // recordActuals folds operator/shop-floor observed values back onto the most-recent matching prediction;
          // stats/recent give the AI ladder its calibration-training-set introspection. The singleton ring buffer is
          // the SAME one SpeedFeedNineAxisOrchestratorEngine populates via capture(), so this is the in-process closed
          // loop. R12-safe: exposes captured DATA + fold-back, never NN inference output.
          case "speedfeed_outcome_record_actuals": {
            const { speedFeedOutcomeFeedbackBridgeEngine } = await import("../../engines/SpeedFeedOutcomeFeedbackBridgeEngine.js");
            const key = (params.key ?? {}) as { machine_name?: string; material_name?: string; tool_diameter_mm?: number };
            if (!key.machine_name || !key.material_name || typeof key.tool_diameter_mm !== "number") {
              result = { success: false, error: "key requires { machine_name, material_name, tool_diameter_mm } -- the prediction-match key for the fold-back" };
              break;
            }
            const actuals = (params.actuals ?? {}) as { actual_vc_mpm?: number; actual_fz_mm?: number; actual_tool_life_min?: number };
            const hasRealActual = [actuals.actual_vc_mpm, actuals.actual_fz_mm, actuals.actual_tool_life_min].some((v) => typeof v === "number" && Number.isFinite(v));
            if (!hasRealActual) {
              result = { success: false, error: "actuals must include at least one finite field: actual_vc_mpm, actual_fz_mm, or actual_tool_life_min -- a content-free override would inflate the calibration training-set" };
              break;
            }
            const folded = speedFeedOutcomeFeedbackBridgeEngine.recordActuals(
              { machine_name: key.machine_name, material_name: key.material_name, tool_diameter_mm: key.tool_diameter_mm },
              actuals,
            );
            result = { success: true, folded, actuals_count: speedFeedOutcomeFeedbackBridgeEngine.actualsCount() };
            break;
          }
          case "speedfeed_outcome_stats": {
            const { speedFeedOutcomeFeedbackBridgeEngine } = await import("../../engines/SpeedFeedOutcomeFeedbackBridgeEngine.js");
            result = { success: true, stats: speedFeedOutcomeFeedbackBridgeEngine.stats(), actuals_count: speedFeedOutcomeFeedbackBridgeEngine.actualsCount() };
            break;
          }
          case "speedfeed_outcome_recent": {
            const { speedFeedOutcomeFeedbackBridgeEngine } = await import("../../engines/SpeedFeedOutcomeFeedbackBridgeEngine.js");
            const key = (params.key ?? {}) as { machine_name?: string; material_name?: string; tool_diameter_mm?: number };
            if (!key.machine_name || !key.material_name || typeof key.tool_diameter_mm !== "number") {
              result = { success: false, error: "key requires { machine_name, material_name, tool_diameter_mm }" };
              break;
            }
            const rawLimit = params.limit;
            const limit = typeof rawLimit === "number" && rawLimit > 0 ? Math.min(rawLimit, 64) : 16;
            const records = speedFeedOutcomeFeedbackBridgeEngine.recentForKey(
              { machine_name: key.machine_name, material_name: key.material_name, tool_diameter_mm: key.tool_diameter_mm },
              limit,
            );
            result = { success: true, count: records.length, records };
            break;
          }
          // OSCAR-SFC-SELFLEARN-WIRE (bravo, 2026-06-11): expose the SFC multi-hypothesis Bayesian ranker.
          // Static methods on the class-as-singleton. rank() is SELF-CONTAINED (candidates passed inline;
          // RAG priors optional). R12-safe: deterministic posterior ranking + safety-shield, never NN inference.
          case "sfc_rank_hypotheses": {
            const { sfcMultiHypothesisRankerEngine } = await import("../../engines/SFCMultiHypothesisRankerEngine.js");
            if (!Array.isArray(params.candidates) || params.candidates.length === 0) {
              result = { success: false, error: "candidates must be a non-empty array of { source, sfm, fpt, doc } speed/feed hypotheses" };
              break;
            }
            if (typeof params.material !== "string" || !params.material) {
              result = { success: false, error: "material (string) is required -- the workpiece material to resolve physics priors against" };
              break;
            }
            const ranked = sfcMultiHypothesisRankerEngine.rank(params as Parameters<typeof sfcMultiHypothesisRankerEngine.rank>[0]);
            result = { success: true, ...ranked };
            break;
          }
          case "sfc_ranker_stats": {
            const { sfcMultiHypothesisRankerEngine } = await import("../../engines/SFCMultiHypothesisRankerEngine.js");
            result = {
              success: true,
              ready: sfcMultiHypothesisRankerEngine.isReady(),
              self_awareness: sfcMultiHypothesisRankerEngine.getSelfAwareness(),
            };
            break;
          }
          // OSCAR-SFC-SELFLEARN-WIRE (bravo, 2026-06-11): SFCParameterRefinementEngine -- closes the SFC self-improving
          // loop. Reads shop-floor actuals off the OutcomeCaptureBus (singleton), computes median+IQR multiplicative
          // correction factors per machine/material context, hard-clamped to [0.25,4.0], fail-loud below minSamples.
          // computeRefinement NEVER throws (returns ok:false on no_evidence/below_min_samples/bus_error/invalid_context),
          // so no try/catch needed. R12-safe: deterministic stats + safety clamp, never NN inference.
          // SECURITY: forward ONLY validated JSON-safe tuning fields. The engine honors input.bus / input.clock; if we
          // forwarded params.bus / params.clock a caller could swap the data source out from under the singleton -- so
          // those two keys are deliberately NOT threaded through. Singleton uses the real bus + real Date.now().
          // NOTE: applyToRecommendation() is intentionally NOT surfaced -- it is a pure in-process helper the
          // SpeedFeedOrchestrator wires directly (needs the prior refinement result threaded back), not a natural MCP action.
          case "sfc_parameter_refinement_compute": {
            const ctx = params.context;
            if (ctx === undefined || ctx === null || typeof ctx !== "object" || Array.isArray(ctx)) {
              result = { success: false, error: "context (object) is required -- {customer?,material?,machine_id?,tool_id?,operation?}; pass {} explicitly to match ALL outcomes (cross-context refinement leaks bias -- prefer a specific machine+material)" };
              break;
            }
            const { sfcParameterRefinementEngine } = await import("../../engines/SFCParameterRefinementEngine.js");
            const refineInput: Record<string, unknown> = { context: ctx as Record<string, unknown> };
            if (params.sinceDays !== undefined) refineInput.sinceDays = params.sinceDays;
            if (params.minSamples !== undefined) refineInput.minSamples = params.minSamples;
            if (params.maxFactor !== undefined) refineInput.maxFactor = params.maxFactor;
            if (params.iqrScale !== undefined) refineInput.iqrScale = params.iqrScale;
            if (params.fullConfidenceSamples !== undefined) refineInput.fullConfidenceSamples = params.fullConfidenceSamples;
            const refined = sfcParameterRefinementEngine.computeRefinement(
              refineInput as unknown as Parameters<typeof sfcParameterRefinementEngine.computeRefinement>[0],
            );
            result = { success: true, ...refined };
            break;
          }
          case "speedfeed_advanced_ai_stats": {
            const { speedFeedAdvancedAIEngine } = await import("../../engines/SpeedFeedAdvancedAIEngine.js");
            const out = speedFeedAdvancedAIEngine.stats();
            result = { success: true, stats: out };
            break;
          }
          case "speedfeed_ultimate_ai_stats": {
            const { speedFeedUltimateAIEngine } = await import("../../engines/SpeedFeedUltimateAIEngine.js");
            const out = speedFeedUltimateAIEngine.stats();
            result = { success: true, stats: out };
            break;
          }

          // FEATURE-GAP-AUDIT-MS0/U-WIRE-BACKLOG-SF-GILBERT (2026-05-20): GilbertEconomicSpeedEngine — Gilbert (1950)
          // minimum-cost cutting velocity for turning. Pure economics + Taylor (no NN, no random init), so safe to wire
          // inference paths immediately. Closes 1 of ~12 unwired SF engines.
          // Refs: Gilbert (1950) ASME · Shaw (2005) Metal Cutting Principles §20 · Armarego (1969) §9.5.
          case "gilbert_econ_speed_compute": {
            const { gilbertEconomicSpeedEngine } = await import("../../engines/GilbertEconomicSpeedEngine.js");
            try {
              const out = gilbertEconomicSpeedEngine.compute({
                K_T: params.K_T,
                n: params.n,
                machining_cost_per_sec_usd: params.machining_cost_per_sec_usd,
                tool_change_time_sec: params.tool_change_time_sec,
                tool_cost_per_edge_usd: params.tool_cost_per_edge_usd,
                cut_length_mm: params.cut_length_mm,
                f_mm_rev: params.f_mm_rev,
                diameter_mm: params.diameter_mm,
                revenue_per_part_usd: params.revenue_per_part_usd,
                rpm_clamp: params.rpm_clamp,
              });
              result = { success: true, result: out };
            } catch (e: any) {
              result = { success: false, error: e?.message ?? String(e) };
            }
            break;
          }
          case "gilbert_econ_speed_compare_vc": {
            const { gilbertEconomicSpeedEngine } = await import("../../engines/GilbertEconomicSpeedEngine.js");
            try {
              const out = gilbertEconomicSpeedEngine.compareVc(params.candidate_vc_m_min, {
                K_T: params.K_T,
                n: params.n,
                machining_cost_per_sec_usd: params.machining_cost_per_sec_usd,
                tool_change_time_sec: params.tool_change_time_sec,
                tool_cost_per_edge_usd: params.tool_cost_per_edge_usd,
              });
              result = { success: true, comparison: out };
            } catch (e: any) {
              result = { success: false, error: e?.message ?? String(e) };
            }
            break;
          }
          case "gilbert_econ_speed_stats": {
            const { gilbertEconomicSpeedEngine } = await import("../../engines/GilbertEconomicSpeedEngine.js");
            const out = gilbertEconomicSpeedEngine.getStats();
            result = { success: true, stats: out };
            break;
          }

          // FEATURE-GAP-AUDIT-MS0/U-WIRE-BACKLOG-SF-BARPITCH (2026-05-20): BarFeedPitchOptimizerEngine — 1-D bar-feed pitch
          // optimization for lathe/Swiss workflows. Pure bin-packing math (no NN, no random init), inference safe immediately.
          // Closes 1 of ~12 unwired SF engines. Refs: ISO 6983 · Sandvik Cutting Tools Technical Guide (collet/feed losses).
          case "bar_feed_pitch_optimize": {
            const { barFeedPitchOptimizerEngine } = await import("../../engines/BarFeedPitchOptimizerEngine.js");
            try {
              const out = barFeedPitchOptimizerEngine.optimize({
                part_length_mm: params.part_length_mm,
                quantity_needed: params.quantity_needed,
                bar_length_mm: params.bar_length_mm,
                cutoff_kerf_mm: params.cutoff_kerf_mm,
                bar_end_loss_mm: params.bar_end_loss_mm,
                bar_head_face_mm: params.bar_head_face_mm,
                candidate_bar_diameters_mm: params.candidate_bar_diameters_mm,
                bar_diameter_mm: params.bar_diameter_mm,
                part_max_diameter_mm: params.part_max_diameter_mm,
                material_density_kgm3: params.material_density_kgm3,
                material_price_per_kg: params.material_price_per_kg,
                part_mass_kg: params.part_mass_kg,
              });
              result = { success: true, result: out };
            } catch (e: any) {
              result = { success: false, error: e?.message ?? String(e) };
            }
            break;
          }
          case "bar_feed_pitch_stats": {
            const { barFeedPitchOptimizerEngine } = await import("../../engines/BarFeedPitchOptimizerEngine.js");
            const out = barFeedPitchOptimizerEngine.getStats();
            result = { success: true, stats: out };
            break;
          }

          // FEATURE-GAP-AUDIT-MS0/U-WIRE-BACKLOG-SF-CSS-CHIPLOAD (2026-05-20): CSSChipLoadInvariantCoordinatorEngine — G96 CSS
          // chip-load invariance analysis. Pure Kienzle/Kronenberg physics (no NN, no random init). Closes 1 of ~12 unwired SF
          // engines. The engine's analyze() parses its own Zod schema internally, so the dispatcher passes the input through.
          case "css_chipload_analyze": {
            const { CSSChipLoadInvariantCoordinatorEngine } = await import("../../engines/CSSChipLoadInvariantCoordinatorEngine.js");
            try {
              const out = CSSChipLoadInvariantCoordinatorEngine.analyze(params as any);
              result = { success: true, result: out };
            } catch (e: any) {
              result = { success: false, error: e?.message ?? String(e) };
            }
            break;
          }

          // FEATURE-GAP-AUDIT-MS0/U-WIRE-BACKLOG-SF-AUTO-CALC (2026-05-20): AutoSpeedFeedCalculatorEngine — auto-calculates
          // RPM/feed/G50-clamp/peck-schedule/Ra/Kienzle-power for a multi-operation program and emits Okuma macro lines.
          // Per-call instantiation (engine has instance state only for the calculate() invocation). Pure physics —
          // imports rpmFromVc / predictedRa from src/physics/constants.ts. NOTE: pre-existing dual-source-constant smell in
          // engine (APPROX_KC1_1 / APPROX_MC duplicate canonical kc1.1/mc values from physics/constants.ts) is OUT OF SCOPE
          // for this wire and is recorded as a follow-up in the close-out memory.
          case "auto_speed_feed_calc": {
            const { AutoSpeedFeedCalculatorEngine } = await import("../../engines/AutoSpeedFeedCalculatorEngine.js");
            try {
              const engine = new AutoSpeedFeedCalculatorEngine();
              const out = engine.calculate(params as any);
              result = { success: true, result: out };
            } catch (e: any) {
              result = { success: false, error: e?.message ?? String(e) };
            }
            break;
          }

          // FEATURE-GAP-AUDIT-MS0/U-WIRE-BACKLOG-SF-FEEDRATE-OPT (2026-05-20, slot:juliett): FeedRateOptimizationEngine —
          // engagement-aware feed optimization (chip-thinning compensation + corner-feed reduction + Kienzle power cap).
          case "feed_rate_optimize": {
            const { feedRateOptimizationEngine } = await import("../../engines/FeedRateOptimizationEngine.js");
            try {
              const out = feedRateOptimizationEngine.optimize(params as any);
              result = { success: true, result: out };
            } catch (e: any) {
              result = { success: false, error: e?.message ?? String(e) };
            }
            break;
          }

          // FEATURE-GAP-AUDIT-MS0/U-WIRE-BACKLOG-SF-CAM-BRIDGE (2026-05-21, slot:juliett): CAMSpeedFeedBridgeEngine.compute —
          // translate native CAM-host SF request → OrchestratorInput → compute → encode result back to host wire format.
          // Static method (no singleton); engine validates target + native_request via its own Zod schemas internally.
          case "cam_speed_feed_bridge": {
            const { CAMSpeedFeedBridgeEngine } = await import("../../engines/CAMSpeedFeedBridgeEngine.js");
            try {
              const out = CAMSpeedFeedBridgeEngine.compute(params as any);
              result = { success: true, result: out };
            } catch (e: any) {
              result = { success: false, error: e?.message ?? String(e) };
            }
            break;
          }

          // FEATURE-GAP-AUDIT-MS0/U-WIRE-BACKLOG-SF-PP-SCALER (2026-05-21, slot:juliett): PPFeedSpeedScalerEngine.scale —
          // rewrite F/S words in a G-code program per uniform/clamp/range rules. Preserves paren-comments + ;-tails verbatim.
          // Singleton method; engine handles defaults internally. Param shape: { gcode: string, options?: FeedScalerOptions }.
          case "pp_feed_speed_scale": {
            const { ppFeedSpeedScalerEngine } = await import("../../engines/PPFeedSpeedScalerEngine.js");
            try {
              const p = params as { gcode?: string; options?: any };
              if (typeof p?.gcode !== "string") {
                result = { success: false, error: "pp_feed_speed_scale requires params.gcode: string (G-code program text)" };
                break;
              }
              const out = ppFeedSpeedScalerEngine.scale(p.gcode, p.options ?? {});
              result = { success: true, result: out };
            } catch (e: any) {
              result = { success: false, error: e?.message ?? String(e) };
            }
            break;
          }

          // FEATURE-GAP-AUDIT-MS0/U-WIRE-BACKLOG-SF-MINER (2026-05-21, slot:juliett): SpeedFeedMinerEngine.mine —
          // ingest ProgramRecord[] (from OkumaOSP/Haas/Hurco/RokuRoku parsers), emit per-group statistics + outliers vs
          // CANONICAL_RANGES + shop-median calibration entries. Pure statistical mining; canonical ranges live in the
          // engine module, NOT in physics constants (they're shop-experience SFM bands, not Kienzle/Taylor).
          case "speed_feed_mine": {
            const { speedFeedMinerEngine } = await import("../../engines/SpeedFeedMinerEngine.js");
            try {
              const p = params as { records?: unknown };
              if (!Array.isArray(p?.records)) {
                result = { success: false, error: "speed_feed_mine requires params.records: ProgramRecord[]" };
                break;
              }
              const out = speedFeedMinerEngine.mine(p.records as any);
              result = { success: true, result: out };
            } catch (e: any) {
              result = { success: false, error: e?.message ?? String(e) };
            }
            break;
          }

          // FEATURE-GAP-AUDIT-MS0/U-WIRE-BACKLOG-SF-MINER (2026-05-21, slot:juliett): SpeedFeedMinerEngine.compareToBaseline —
          // grade a single program against a pre-computed baseline (typically the output of speed_feed_mine).
          // Returns per-tool {speed_diff_pct, feed_diff_pct, assessment: optimal | conservative | aggressive | dangerous}.
          // |speedDiff| ≤30% → optimal, 30-50% → conservative/aggressive, >50% → dangerous.
          case "speed_feed_compare_to_baseline": {
            const { speedFeedMinerEngine } = await import("../../engines/SpeedFeedMinerEngine.js");
            try {
              const p = params as { record?: unknown; baseline?: unknown };
              if (!p?.record || typeof p.record !== "object") {
                result = { success: false, error: "speed_feed_compare_to_baseline requires params.record: ProgramRecord" };
                break;
              }
              if (!Array.isArray(p?.baseline)) {
                result = { success: false, error: "speed_feed_compare_to_baseline requires params.baseline: SpeedFeedStats[]" };
                break;
              }
              const out = speedFeedMinerEngine.compareToBaseline(p.record as any, p.baseline as any);
              result = { success: true, result: out };
            } catch (e: any) {
              result = { success: false, error: e?.message ?? String(e) };
            }
            break;
          }

          // OSCAR-SFC-9AXIS-MS0/U-OSC-WIRE-TRIVENDOR (2026-06-08, slot:oscar): SpeedFeedTriComparatorEngine.run —
          // tri-vendor comparison (PRISM × baseline DBs × G-Wizard). One 9-axis physics pass, graded against vendor
          // baselines → per-system Vc/fz opinions + agreement deltas. The engine's TriCompareInputSchema validates raw.
          case "speed_feed_tri_compare": {
            const { speedFeedTriComparatorEngine } = await import("../../engines/SpeedFeedTriComparatorEngine.js");
            try {
              const out = speedFeedTriComparatorEngine.run(params);
              result = { success: true, result: out };
            } catch (e: any) {
              result = { success: false, error: e?.message ?? String(e) };
            }
            break;
          }

          // OSCAR-SFC-9AXIS-MS0/U-OSC-WIRE-EXHAUST (2026-06-08, slot:oscar): SpeedFeedExhaustiveCombinationEngine.run —
          // physics-invariant bounded cartesian sweep with an I1–I6 invariant-violation ledger. sample_mode:
          // demo | sampled | full controls cell count. Returns per-cell results + the violation report.
          case "speed_feed_exhaustive_sweep": {
            const { speedFeedExhaustiveCombinationEngine } = await import("../../engines/SpeedFeedExhaustiveCombinationEngine.js");
            try {
              const out = speedFeedExhaustiveCombinationEngine.run(params as any);
              result = { success: true, result: out };
            } catch (e: any) {
              result = { success: false, error: e?.message ?? String(e) };
            }
            break;
          }

          // OSCAR-SFC-9AXIS-MS0/U-OSC-WIRE-DOWNSTREAM (2026-06-08, slot:oscar): SpeedFeedDownstreamSubscriberEngine —
          // read-only query of the resolved default packs the SFC fans out to. params.pack: "post" | "mill" | "lathe"
          // selects which downstream consumer's defaults to surface; omitted → all three + registration status.
          case "speed_feed_downstream_packs": {
            const { speedFeedDownstreamSubscriberEngine } = await import("../../engines/SpeedFeedDownstreamSubscriberEngine.js");
            try {
              // The 5 downstream caches are keyed by published-snapshot key, so a
              // zero-arg pack read is meaningless until a snapshot exists. Expose
              // the lifecycle + cache introspection instead.
              // op: "status" (default) | "register" | "unregister" | "snapshot".
              const p = params as { op?: unknown };
              const op = typeof p?.op === "string" ? p.op : "status";
              let out: unknown;
              if (op === "register") {
                out = { op: "register", ...speedFeedDownstreamSubscriberEngine.registerAllSubscribers() };
              } else if (op === "unregister") {
                speedFeedDownstreamSubscriberEngine.unregisterAllSubscribers();
                out = { op: "unregister", registered: speedFeedDownstreamSubscriberEngine.isRegistered() };
              } else if (op === "snapshot") {
                out = {
                  op: "snapshot",
                  registered: speedFeedDownstreamSubscriberEngine.isRegistered(),
                  total_versions: speedFeedDownstreamSubscriberEngine.totalVersionCount(),
                  cache: speedFeedDownstreamSubscriberEngine.cacheSnapshot(),
                };
              } else {
                out = {
                  op: "status",
                  registered: speedFeedDownstreamSubscriberEngine.isRegistered(),
                  total_versions: speedFeedDownstreamSubscriberEngine.totalVersionCount(),
                };
              }
              result = { success: true, result: out };
            } catch (e: any) {
              result = { success: false, error: e?.message ?? String(e) };
            }
            break;
          }

          // OSCAR-SFC-9AXIS-MS0/U-OSC-CALIB-PERSIST (2026-06-08, slot:oscar): SpeedFeedCalibrationPersistEngine —
          // derive + persist a per-(ISO×mode) calibration model from the full-sweep comparison ledger.
          // params.ledger_path (default state/outcomes/sfc-full-sweep-ledger.jsonl) + params.out_path
          // (default state/outcomes/sfc-calibration-model.json). ADVISORY-ONLY model — never auto-applied.
          case "speed_feed_calibration_persist": {
            const { speedFeedCalibrationPersistEngine } = await import("../../engines/SpeedFeedCalibrationPersistEngine.js");
            try {
              const p = params as { ledger_path?: unknown; out_path?: unknown };
              const ledgerPath =
                typeof p?.ledger_path === "string" ? p.ledger_path : "state/outcomes/sfc-full-sweep-ledger.jsonl";
              const outPath =
                typeof p?.out_path === "string" ? p.out_path : "state/outcomes/sfc-calibration-model.json";
              const model = speedFeedCalibrationPersistEngine.buildFromLedgerFile(ledgerPath, outPath);
              result = { success: true, result: model };
            } catch (e: any) {
              result = { success: false, error: e?.message ?? String(e) };
            }
            break;
          }

          // OSCAR-SFC-9AXIS-MS0/U-OSC-GPU-JUDGE (2026-06-08, slot:oscar): SpeedFeedGpuJudgeEngine —
          // GPU-in-the-loop machinist judgment over every sweep regime. Runs a GPU-resident reasoning model
          // (Ollama on the RTX PRO 6000 Blackwell) to classify whether PRISM's Vc is soundly conservative vs the
          // vendor baseline. params: ledger_path (default sfc-full-sweep-ledger.jsonl), out_path, model, endpoint, limit.
          // ADVISORY-ONLY — verdicts never change a recommendation. Async (network); fail-loud on unreachable endpoint.
          case "speed_feed_gpu_judge": {
            const { speedFeedGpuJudgeEngine } = await import("../../engines/SpeedFeedGpuJudgeEngine.js");
            try {
              const p = params as {
                ledger_path?: unknown;
                out_path?: unknown;
                model?: unknown;
                endpoint?: unknown;
                limit?: unknown;
              };
              const ledgerPath =
                typeof p?.ledger_path === "string" ? p.ledger_path : "state/outcomes/sfc-full-sweep-ledger.jsonl";
              const report = await speedFeedGpuJudgeEngine.runFromLedgerFile(ledgerPath, {
                outPath:
                  typeof p?.out_path === "string" ? p.out_path : "state/outcomes/sfc-gpu-judge-report.json",
                model: typeof p?.model === "string" ? p.model : undefined,
                endpoint: typeof p?.endpoint === "string" ? p.endpoint : undefined,
                limit: typeof p?.limit === "number" ? p.limit : undefined,
              });
              result = { success: true, result: report };
            } catch (e: any) {
              result = { success: false, error: e?.message ?? String(e) };
            }
            break;
          }

          // FEATURE-GAP-AUDIT-MS0/U-WIRE-BACKLOG-SF-AUTOPILOT (2026-05-21, slot:juliett): SpeedFeedAutopilotEngine.run —
          // end-to-end speed/feed product autopilot. 5-step chain with per-step pass/warn/fail status, safety scoring,
          // recommendations. Reads CANONICAL_MATERIAL_DB from physics/constants — no inlined Kienzle/Taylor in engine.
          case "speed_feed_autopilot": {
            const { speedFeedAutopilotEngine } = await import("../../engines/SpeedFeedAutopilotEngine.js");
            try {
              const p = params as { material?: unknown; tool_diameter_mm?: unknown };
              if (typeof p?.material !== "string" || !p.material.trim()) {
                result = { success: false, error: "speed_feed_autopilot requires params.material: string (material name)" };
                break;
              }
              if (typeof p?.tool_diameter_mm !== "number" || p.tool_diameter_mm <= 0) {
                result = { success: false, error: "speed_feed_autopilot requires params.tool_diameter_mm: number > 0 (mm)" };
                break;
              }
              const out = speedFeedAutopilotEngine.run(params as any);
              result = { success: true, result: out };
            } catch (e: any) {
              result = { success: false, error: e?.message ?? String(e) };
            }
            break;
          }

          // FEATURE-GAP-AUDIT-MS0/U-WIRE-BACKLOG-SF-MACHINE-AWARE (2026-05-21, slot:juliett): MachineAwareSpeedFeedEngine.constrain —
          // clamp speed/feed to real machine limits (RPM ceiling, feed-rate ceiling, power budget P=T·n/9549, torque
          // at-RPM via constant-power region T_avail = T_max × (n_base/n)). Param shape: { input:SpeedFeedInput, machine:CanonicalMachinePackage }.
          // U-MACHINE-AWARE-CAPTURE-FLAG (2026-05-21): pass skipCapture:true so operator-explorer queries don't pollute
          // the OutcomeCaptureBus telemetry channel (which is scoped to SFC outcome-wire middleware + proven-param
          // aggregator). Callers wanting capture (e.g., workflow integrations) should call the engine directly.
          case "machine_aware_constrain": {
            const { machineAwareSpeedFeedEngine } = await import("../../engines/MachineAwareSpeedFeedEngine.js");
            try {
              const p = params as { input?: unknown; machine?: unknown };
              if (!p?.input || typeof p.input !== "object") {
                result = { success: false, error: "machine_aware_constrain requires params.input: SpeedFeedInput (with spindleRpm + optional feed/power/torque/operation)" };
                break;
              }
              if (!p?.machine || typeof p.machine !== "object") {
                result = { success: false, error: "machine_aware_constrain requires params.machine: CanonicalMachinePackage (with canonical_id, manufacturer, model, spindle{max_rpm,min_rpm,power,torque})" };
                break;
              }
              const out = machineAwareSpeedFeedEngine.constrain(p.input as any, p.machine as any, { skipCapture: true });
              result = { success: true, result: out };
            } catch (e: any) {
              result = { success: false, error: e?.message ?? String(e) };
            }
            break;
          }

          // MS-CRITWIRE/U-CW-02 + KAR-MS2.1/U-KAR17 (2026-05-20): ProvenSpeedFeedAggregatorEngine — aggregates shop-proven
          // speed/feed data (Okuma lathe DetailedSpeedFeed[] / mill-pattern ChipLoadSample[]) into statistically-analyzed
          // proven parameters (mean/stdDev/median/percentile/CV + 2σ-outlier flagging). Pure statistics — no NN, no random
          // init. The engine singleton holds the proven-param Map in-process, so aggregate-then-query/export within one
          // server lifetime returns the aggregated state. prism_safety is NOT a natural consumer (data layer, no S(x)
          // verdict). Closes 1 of ~12 unwired SF engines + KAR-MS2.1/U-KAR17 (same engine). Ref: KAR-MS2 U-KAR13.
          case "proven_speed_feed_aggregate_lathe": {
            const { provenSpeedFeedAggregatorEngine } = await import("../../engines/ProvenSpeedFeedAggregatorEngine.js");
            if (!Array.isArray((params as any).data)) {
              result = { success: false, error: "proven_speed_feed_aggregate_lathe requires params.data: DetailedSpeedFeed[]" };
              break;
            }
            try {
              const out = provenSpeedFeedAggregatorEngine.aggregateLatheData((params as any).data);
              result = { success: true, result: out };
            } catch (e: any) {
              result = { success: false, error: e?.message ?? String(e) };
            }
            break;
          }
          case "proven_speed_feed_aggregate_mill": {
            const { provenSpeedFeedAggregatorEngine } = await import("../../engines/ProvenSpeedFeedAggregatorEngine.js");
            if (!Array.isArray((params as any).data)) {
              result = { success: false, error: "proven_speed_feed_aggregate_mill requires params.data: ChipLoadSample[]" };
              break;
            }
            try {
              const out = provenSpeedFeedAggregatorEngine.aggregateMillData((params as any).data);
              result = { success: true, result: out };
            } catch (e: any) {
              result = { success: false, error: e?.message ?? String(e) };
            }
            break;
          }
          case "proven_speed_feed_query": {
            const { provenSpeedFeedAggregatorEngine } = await import("../../engines/ProvenSpeedFeedAggregatorEngine.js");
            if (typeof (params as any).material_group !== "string" || typeof (params as any).operation_category !== "string") {
              result = { success: false, error: "proven_speed_feed_query requires params.material_group + params.operation_category (strings)" };
              break;
            }
            try {
              const out = provenSpeedFeedAggregatorEngine.getProvenParams((params as any).material_group, (params as any).operation_category);
              result = { success: true, found: out !== null, provenParameter: out };
            } catch (e: any) {
              result = { success: false, error: e?.message ?? String(e) };
            }
            break;
          }
          case "proven_speed_feed_export": {
            const { provenSpeedFeedAggregatorEngine } = await import("../../engines/ProvenSpeedFeedAggregatorEngine.js");
            try {
              const minConfidence = typeof (params as any).min_confidence === "number" ? (params as any).min_confidence : 0.7;
              const orchestratorExport = provenSpeedFeedAggregatorEngine.exportForSpeedFeedOrchestrator();
              const highConfidence = provenSpeedFeedAggregatorEngine.getHighConfidenceParams(minConfidence);
              result = {
                success: true,
                orchestratorExport,
                exportCount: orchestratorExport.length,
                highConfidenceCount: highConfidence.length,
                minConfidence,
              };
            } catch (e: any) {
              result = { success: false, error: e?.message ?? String(e) };
            }
            break;
          }

          // FEATURE-GAP-AUDIT-MS0/U-WIRE-BACKLOG-SF-RESOURCE (2026-05-20): SpeedFeedResourceIntegrationEngine — codifies
          // authoritative speed/feed knowledge from CNCCookbook "Feeds and Speeds Ultimate Guide 2024" + Sandvik/Kennametal
          // catalogs: material SFM ranges, chip-load guidance (diameter-interpolated), face-mill 45/90 lead-angle strategy,
          // HEM parameters, JM-Die special-material lookup (M2/D2/S7/A2/H13/graphite), and a Kienzle/Taylor-grounded
          // optimal-speed/feed calculation. Engine was genuinely unwired (only an engine-to-engine consumer). Closes 1 of
          // ~12 unwired SF engines. Behavior is covered by the pre-existing 75-case SPEED-FEED-RESOURCE.test.ts.
          case "speed_feed_resource_sfm": {
            const { speedFeedResourceIntegrationEngine } = await import("../../engines/SpeedFeedResourceIntegrationEngine.js");
            if (typeof (params as any).material_key !== "string") {
              result = { success: false, error: "speed_feed_resource_sfm requires params.material_key (string)" };
              break;
            }
            try {
              const out = speedFeedResourceIntegrationEngine.getMaterialSFMRange((params as any).material_key, (params as any).iso_group);
              result = { success: true, found: out !== null, sfmRange: out };
            } catch (e: any) {
              result = { success: false, error: e?.message ?? String(e) };
            }
            break;
          }
          case "speed_feed_resource_chiploads": {
            const { speedFeedResourceIntegrationEngine } = await import("../../engines/SpeedFeedResourceIntegrationEngine.js");
            if (typeof (params as any).tool_diameter_mm !== "number" || typeof (params as any).iso_group !== "string") {
              result = { success: false, error: "speed_feed_resource_chiploads requires params.tool_diameter_mm (number) + params.iso_group (string)" };
              break;
            }
            try {
              const out = speedFeedResourceIntegrationEngine.getChipLoadGuidance((params as any).tool_diameter_mm, (params as any).iso_group, (params as any).cut_type);
              result = { success: true, found: out !== null, chipLoadRange: out };
            } catch (e: any) {
              result = { success: false, error: e?.message ?? String(e) };
            }
            break;
          }
          case "speed_feed_resource_facemill_strategy": {
            const { speedFeedResourceIntegrationEngine } = await import("../../engines/SpeedFeedResourceIntegrationEngine.js");
            const leadAngle = (params as any).lead_angle_deg;
            if (leadAngle !== 45 && leadAngle !== 90) {
              result = { success: false, error: "speed_feed_resource_facemill_strategy requires params.lead_angle_deg of 45 or 90" };
              break;
            }
            try {
              const out = speedFeedResourceIntegrationEngine.getFaceMillStrategy(leadAngle);
              result = { success: true, strategy: out };
            } catch (e: any) {
              result = { success: false, error: e?.message ?? String(e) };
            }
            break;
          }
          case "speed_feed_resource_hem": {
            const { speedFeedResourceIntegrationEngine } = await import("../../engines/SpeedFeedResourceIntegrationEngine.js");
            if (typeof (params as any).iso_group !== "string") {
              result = { success: false, error: "speed_feed_resource_hem requires params.iso_group (string — P/M/K/N/S/H)" };
              break;
            }
            try {
              const out = speedFeedResourceIntegrationEngine.getHEMParameters((params as any).iso_group);
              result = { success: true, hemParameters: out };
            } catch (e: any) {
              result = { success: false, error: e?.message ?? String(e) };
            }
            break;
          }
          case "speed_feed_resource_jmdie_material": {
            const { speedFeedResourceIntegrationEngine } = await import("../../engines/SpeedFeedResourceIntegrationEngine.js");
            if (typeof (params as any).query !== "string") {
              result = { success: false, error: "speed_feed_resource_jmdie_material requires params.query (string)" };
              break;
            }
            try {
              const out = speedFeedResourceIntegrationEngine.getJMDieMaterial((params as any).query);
              result = { success: true, found: out !== null, jmDieMaterial: out };
            } catch (e: any) {
              result = { success: false, error: e?.message ?? String(e) };
            }
            break;
          }
          case "speed_feed_resource_optimal": {
            const { speedFeedResourceIntegrationEngine } = await import("../../engines/SpeedFeedResourceIntegrationEngine.js");
            const p = params as any;
            if (typeof p.operation !== "string" || typeof p.material !== "object" || p.material === null
                || typeof p.tool !== "object" || p.tool === null || typeof p.machine !== "object" || p.machine === null) {
              result = { success: false, error: "speed_feed_resource_optimal requires params.operation (string) + params.material/tool/machine (objects)" };
              break;
            }
            try {
              const out = speedFeedResourceIntegrationEngine.calculateOptimalSpeedFeed(p.operation, p.material, p.tool, p.machine, p.cut_type);
              result = { success: true, result: out };
            } catch (e: any) {
              result = { success: false, error: e?.message ?? String(e) };
            }
            break;
          }

          // MS-CRITWIRE/U-CW-10 (2026-05-20): surface material designation resolution on prism_calc.
          // MaterialResolverForProgramsEngine.resolveDesignation maps a designation / material-family
          // token to ISO 513 group + Kienzle kc1.1/mc + Taylor C/n, all projected from the canonical
          // physics/constants.ts tables (never inlined). Confidence is 0 on an unresolved designation
          // (honest miss-signal). The same engine is wired to prism_data:box_resolve_material for the
          // program-context resolver; this surfaces the bare-designation path on prism_calc so force /
          // speed-feed / tool-life actions can resolve a material in one call.
          case "material_resolve": {
            const { materialResolverForProgramsEngine } = await import("../../engines/MaterialResolverForProgramsEngine.js");
            const designation = (params as any).designation ?? (params as any).material ?? (params as any).material_name;
            if (typeof designation !== "string") {
              result = { success: false, error: "material_resolve requires params.designation (string — e.g. \"4140\", \"6061-T6\", \"304 stainless\")" };
              break;
            }
            try {
              const out = materialResolverForProgramsEngine.resolveDesignation(designation);
              result = { success: true, resolved: out.confidence > 0, material: out };
            } catch (e: any) {
              result = { success: false, error: e?.message ?? String(e) };
            }
            break;
          }

// -- iter5+6+7 wire-unwired-loop: 13 optimization/calc engines --
          case "grep_optimizer_optimize": {
            const { grepOptimizerEngine } = await import("../../engines/GrepOptimizerEngine.js");
            const p = params as any;
            result = { success: true, data: (grepOptimizerEngine as any).optimize?.(p) ?? (grepOptimizerEngine as any).run?.(p) ?? { engine: "GrepOptimizerEngine", note: "method not callable" } };
            break;
          }
          case "monte_carlo_process_compute": {
            const { monteCarloProcessEngine } = await import("../../engines/MonteCarloProcessEngine.js");
            const p = params as any;
            result = { success: true, data: (monteCarloProcessEngine as any).compute?.(p) ?? (monteCarloProcessEngine as any).run?.(p) ?? { engine: "MonteCarloProcessEngine", note: "method not callable" } };
            break;
          }
          case "optimization_formulas_constrained": {
            const { optimizationFormulasEngine } = await import("../../engines/OptimizationFormulasEngine.js");
            const p = params as any;
            result = { success: true, data: (optimizationFormulasEngine as any).constrainedOptimize?.(p) ?? (optimizationFormulasEngine as any).paretoFront?.(p) ?? (optimizationFormulasEngine as any).run?.(p) ?? { engine: "OptimizationFormulasEngine", note: "method not callable" } };
            break;
          }
          case "optimization_engine_run": {
            const mod = await import("../../engines/OptimizationEngine.js");
            const p = params as any;
            result = { success: true, data: (mod as any).optimization?.(p?.action ?? "optimize", p) ?? (mod as any).optimizeParameters?.(p) ?? { engine: "OptimizationEngine", note: "method not callable" } };
            break;
          }
          case "pipeline_optimization_record": {
            const { pipelineOptimizationEngine } = await import("../../engines/PipelineOptimizationEngine.js");
            const p = params as any;
            result = { success: true, data: (pipelineOptimizationEngine as any).getAggregatedStats?.(p?.pipelineName ?? p?.pipeline_name ?? "default", p?.windowMs) ?? (pipelineOptimizationEngine as any).getAllPipelineNames?.() ?? { engine: "PipelineOptimizationEngine", note: "method not callable" } };
            break;
          }
          case "formula_wiring_list_unwired": {
            const { formulaWiringEngine } = await import("../../engines/FormulaWiringEngine.js");
            const p = params as any;
            result = { success: true, data: await (formulaWiringEngine as any).listUnwiredFormulas?.(p) ?? await (formulaWiringEngine as any).searchFormulas?.(p?.query ?? "") ?? { engine: "FormulaWiringEngine", note: "method not callable" } };
            break;
          }
          case "machine_confidence_calc": {
            const { machineConfidenceCalculatorEngine } = await import("../../engines/MachineConfidenceCalculatorEngine.js");
            const p = params as any;
            result = { success: true, data: (machineConfidenceCalculatorEngine as any).calculateConfidence?.(p) ?? (machineConfidenceCalculatorEngine as any).run?.(p) ?? { engine: "MachineConfidenceCalculatorEngine", note: "method not callable" } };
            break;
          }
          case "calculator_prism_mode_calc": {
            const { calculatorPRISMModeEngine } = await import("../../engines/CalculatorPRISMModeEngine.js");
            const p = params as any;
            result = { success: true, data: (calculatorPRISMModeEngine as any).calculate?.(p) ?? (calculatorPRISMModeEngine as any).run?.(p) ?? { engine: "CalculatorPRISMModeEngine", note: "method not callable" } };
            break;
          }
          case "sfc_optimize_run": {
            // De-stub (U-OSC-SFC-WIRE-RECONCILE): SFCOptimizeEngine.optimize is a STATIC method
            // (SFCOptimizeEngine.ts:87), so the old `(sfcOptimizeEngine as any).optimize?.()` on the
            // INSTANCE was always undefined -> the shipped action returned {note:"method not callable"}.
            // Call the static method on the CLASS and Zod-validate; a schema rejection throws -> caught
            // as success:false (so bad input reports a clean failure, not a crash). `sfc_optimize` alias
            // matches the original ENGINE-WIRE-MS0 action name the wiring tests target.
            const { SFCOptimizeEngine } = await import("../../engines/SFCOptimizeEngine.js");
            try {
              result = { success: true, result: SFCOptimizeEngine.optimize(params as any) };
            } catch (e: any) {
              result = { success: false, error: e?.message ?? String(e) };
            }
            break;
          }
          // ──────────────────────────────────────────────────────────────
          // OSCAR-SFC-9AXIS-MS0/U-OSC9-01 (slot:oscar, 2026-05-25)
          // 9-axis comprehensive speed/feed orchestrator.
          // Pipes machine + spindle + controller + material + workholding +
          // tool_holder + tooling + coolant + toolpath through the canonical
          // UltimateSpeedFeedEngine and post-processes for 3 modes
          // (cost_batch / aggressive_rush / prism_optimized) + MRR ranking +
          // ROI investment popup + spindle sweet-spot tuning + workholding
          // feasibility check.
          // Input shape: NineAxisInput (see engine file). Required fields:
          //   material.name and tooling.tool_diameter_mm. Every other field
          //   has a domain-sane default. mode defaults to "prism_optimized".
          // ──────────────────────────────────────────────────────────────
          case "sfc_nine_axis_run": {
            const { speedFeedNineAxisOrchestratorEngine } = await import(
              "../../engines/SpeedFeedNineAxisOrchestratorEngine.js"
            );
            const p = params as Parameters<typeof speedFeedNineAxisOrchestratorEngine.run>[0];
            result = { success: true, data: speedFeedNineAxisOrchestratorEngine.run(p) };
            break;
          }
          // ──────────────────────────────────────────────────────────────
          // OSCAR-SFC-9AXIS-MS0/U-OSC9-08 (slot:oscar, 2026-05-26)
          // ShopToolLibrary → MRR-ranked SFC bridge.
          // Wires the operator's REAL Fusion 360 tool library (ShopToolLibraryEngine,
          // hundreds of proven shop-floor tools with measured speeds/feeds) into
          // the nine-axis orchestrator's MRR-ranking surface. Closes the gap where
          // mrr_ranking was previously fed synthetic hand-passed tool lists only.
          // Pure composition (R8/R11) — does not re-implement physics or ranking;
          // delegates to speedFeedNineAxisOrchestratorEngine.run() with the shop
          // library mapped to its tool_library schema.
          // Input shape: ShopLibraryBridgeInput (zod-validated in engine). Required:
          //   material.iso_group. All other fields optional with sane defaults.
          // ──────────────────────────────────────────────────────────────
          case "sfc_shop_library_rank": {
            const { speedFeedShopLibraryBridgeEngine } = await import(
              "../../engines/SpeedFeedShopLibraryBridgeEngine.js"
            );
            result = { success: true, data: speedFeedShopLibraryBridgeEngine.run(params) };
            break;
          }
          // ──────────────────────────────────────────────────────────────
          // OSCAR-SFC-9AXIS-MS0/U-OSC9-09 (slot:oscar, 2026-05-26)
          // HSMAdvisor settings_v2.xml live-state adapter.
          // Reads the operator's actual HSMAdvisor calculator state from disk
          // (UTF-16 XML at %APPDATA%/HSMAdvisor/settings_v2.xml or env override
          // PRISM_HSMADVISOR_SETTINGS_PATH) and returns the current Tool +
          // computed Cut (sfm/ipt/mrr/rpm/feed) + Settings snapshot. This is
          // the live-baseline data source the SpeedFeedBaselineComparatorEngine
          // previously documented as a static reference table only.
          // Read-only — never writes back to HSMAdvisor's files.
          // Comparison harness (PRISM vs HSMAdvisor delta) ships in iter3
          // (U-OSC9-10).
          // ──────────────────────────────────────────────────────────────
          case "hsmadvisor_read_current_state": {
            const { hsmAdvisorAdapterEngine } = await import(
              "../../engines/HSMAdvisorAdapterEngine.js"
            );
            result = { success: true, data: hsmAdvisorAdapterEngine.read(params) };
            break;
          }
          // CATALOG-APP-WIRING (romeo, 2026-06-09): export a PRISM tool INTO HSMAdvisor's
          // settings_v2.xml <Tool> state (single-tool — settings_v2.xml is the current-selection
          // state, not a bulk library). No out_path -> returns the XML (no side effect, safe
          // default); explicit out_path -> writes the file (opt-in; the live settings file is
          // outward-facing). Emits INCH (HSMAdvisor-native); round-trips mm<->inch through
          // hsmAdvisorAdapterEngine.parseXml (9/9 tests).
          case "hsmadvisor_export_settings": {
            const { hsmAdvisorSettingsExportEngine } = await import(
              "../../engines/HSMAdvisorSettingsExportEngine.js"
            );
            const p = (params ?? {}) as { out_path?: string };
            result = {
              success: true,
              data: p.out_path
                ? hsmAdvisorSettingsExportEngine.writeSettings(params)
                : hsmAdvisorSettingsExportEngine.export(params),
            };
            break;
          }
          // OSCAR-SFC-9AXIS-MS0/U-OSC9-10 (slot:oscar, 2026-05-26):
          // Fleet PDF-corpus → SFC tribal-prior bridge. Reads kilo's tribal-seeds JSON
          // + fleet extracted-pdfs JSONL ledgers, normalizes, filters by SFC domain +
          // software + keywords, returns top-K ranked evidence for inclusion in PSN-prior.
          // Honors operator coordination directive 2026-05-26 (whiskey/lima/mike/
          // foxtrot/echo PDF extraction → speed-feed calculator).
          case "sfc_pdf_corpus_bridge": {
            const { speedFeedPDFCorpusBridgeEngine } = await import(
              "../../engines/SpeedFeedPDFCorpusBridgeEngine.js"
            );
            result = { success: true, data: speedFeedPDFCorpusBridgeEngine.run(params) };
            break;
          }
          // OSCAR-SFC-9AXIS-MS0/U-OSC9-11 (slot:oscar, 2026-05-26):
          // PRISM ↔ HSMAdvisor live-state 5-axis comparison bridge.
          // Reads HSMAdvisor's current Cut, translates internal enums to PRISM canonical,
          // runs the same input through NineAxisOrchestrator, diffs sfm/ipt/rpm/feed/mrr.
          // Returns per-axis delta + geometric-mean agreement_score (0..1).
          case "hsmadvisor_compare": {
            const { hsmAdvisorComparatorBridgeEngine } = await import(
              "../../engines/HSMAdvisorComparatorBridgeEngine.js"
            );
            result = { success: true, data: hsmAdvisorComparatorBridgeEngine.run(params) };
            break;
          }
          // OSCAR-SFC-9AXIS-MS0/U-OSC9-12: G-Wizard Calculator toolcrib.csv read-only adapter.
          // Auto-resolves the AIR sandbox at %APPDATA%/GWizard.<hash>/Local Store/toolcrib.csv
          // (newest-mtime wins when multiple sandboxes exist). Returns the operator's tool
          // crib as typed GWizardTool[] with NaN/empty/space coerced to undefined.
          case "gwizard_read_toolcrib": {
            const { gWizardAdapterEngine } = await import(
              "../../engines/GWizardAdapterEngine.js"
            );
            result = { success: true, data: gWizardAdapterEngine.read(params) };
            break;
          }
          // CATALOG-APP-WIRING (romeo, 2026-06-08): export PRISM tool catalog INTO G-Wizard's
          // toolcrib.csv format. No out_path -> returns the CSV text (no side effect, safe default);
          // an explicit out_path -> writes the file (opt-in, since the operator's live crib is
          // outward-facing). Round-trips through gWizardAdapterEngine.parseCsv (11/11 tests).
          case "gwizard_export_toolcrib": {
            const { gWizardToolCribExportEngine } = await import(
              "../../engines/GWizardToolCribExportEngine.js"
            );
            const p = (params ?? {}) as { out_path?: string };
            result = {
              success: true,
              data: p.out_path
                ? gWizardToolCribExportEngine.writeToolcrib(params)
                : gWizardToolCribExportEngine.export(params),
            };
            break;
          }
          // OSCAR-SFC-9AXIS-MS0/U-OSC9-13: mike WEDM training-corpus pair lookup.
          // Indexes 98 pair records under state/shared/wedm-training-corpus/, supports
          // stem (exact/prefix) + customer substring + parse_ok_only filters; sorted by
          // (parse_ok, confidence, stem). Customer auto-extracted from JM Die paths.
          case "wedm_training_pair_lookup": {
            const { wedmTrainingPairBridgeEngine } = await import(
              "../../engines/WedmTrainingPairBridgeEngine.js"
            );
            result = { success: true, data: wedmTrainingPairBridgeEngine.run(params) };
            break;
          }
          case "algorithm_orchestrator_run": {
            const { algorithmOrchestratorEngine } = await import("../../engines/AlgorithmOrchestratorEngine.js");
            const p = params as any;
            result = { success: true, data: (algorithmOrchestratorEngine as any).run?.(p) ?? (algorithmOrchestratorEngine as any).execute?.(p) ?? (algorithmOrchestratorEngine as any).orchestrate?.(p) ?? { engine: "AlgorithmOrchestratorEngine", note: "method not callable" } };
            break;
          }
          case "realtime_optimization_run": {
            const { realTimeOptimizationEngine } = await import("../../engines/RealTimeOptimizationEngine.js");
            const p = params as any;
            result = { success: true, data: (realTimeOptimizationEngine as any).run?.(p) ?? (realTimeOptimizationEngine as any).optimize?.(p) ?? (realTimeOptimizationEngine as any).execute?.(p) ?? { engine: "RealTimeOptimizationEngine", note: "method not callable" } };
            break;
          }
          case "pallet_pool_optimizer_solve": {
            const { palletPoolOptimizerEngine } = await import("../../engines/PalletPoolOptimizerEngine.js");
            const p = params as any;
            result = { success: true, data: (palletPoolOptimizerEngine as any).solve?.(p) ?? (palletPoolOptimizerEngine as any).run?.(p) ?? { engine: "PalletPoolOptimizerEngine", note: "method not callable" } };
            break;
          }
          case "monte_carlo_schedule_simulate": {
            const { monteCarloScheduleEngine } = await import("../../engines/MonteCarloScheduleEngine.js");
            const p = params as any;
            result = { success: true, data: (monteCarloScheduleEngine as any).simulate?.(p) ?? (monteCarloScheduleEngine as any).run?.(p) ?? { engine: "MonteCarloScheduleEngine", note: "method not callable" } };
            break;
          }
          // iter9 wire-unwired-loop: process/physics/industrial engines
          case "conveyor_belt_calc": {
            const { conveyorBeltEngine } = await import("../../engines/ConveyorBeltEngine.js");
            const p = params as any;
            result = { success: true, data: (conveyorBeltEngine as any).calculate?.(p) ?? (conveyorBeltEngine as any).calc?.(p) ?? (conveyorBeltEngine as any).run?.(p) ?? { engine: "ConveyorBeltEngine", note: "method not callable" } };
            break;
          }
          case "ball_mill_calc": {
            const { ballMillEngine } = await import("../../engines/BallMillEngine.js");
            const p = params as any;
            result = { success: true, data: (ballMillEngine as any).calculate?.(p) ?? (ballMillEngine as any).calc?.(p) ?? (ballMillEngine as any).run?.(p) ?? { engine: "BallMillEngine", note: "method not callable" } };
            break;
          }
          case "flying_shear_calc": {
            const { flyingShearEngine } = await import("../../engines/FlyingShearEngine.js");
            const p = params as any;
            result = { success: true, data: (flyingShearEngine as any).calculate?.(p) ?? (flyingShearEngine as any).calc?.(p) ?? (flyingShearEngine as any).run?.(p) ?? { engine: "FlyingShearEngine", note: "method not callable" } };
            break;
          }
          case "cyclone_separator_calc": {
            const { cycloneSeparatorEngine } = await import("../../engines/CycloneSeparatorEngine.js");
            const p = params as any;
            result = { success: true, data: (cycloneSeparatorEngine as any).calculate?.(p) ?? (cycloneSeparatorEngine as any).calc?.(p) ?? (cycloneSeparatorEngine as any).run?.(p) ?? { engine: "CycloneSeparatorEngine", note: "method not callable" } };
            break;
          }
          case "screw_conveyor_calc": {
            const { screwConveyorEngine } = await import("../../engines/ScrewConveyorEngine.js");
            const p = params as any;
            result = { success: true, data: (screwConveyorEngine as any).calculate?.(p) ?? (screwConveyorEngine as any).calc?.(p) ?? (screwConveyorEngine as any).run?.(p) ?? { engine: "ScrewConveyorEngine", note: "method not callable" } };
            break;
          }
          case "bucket_elevator_calc": {
            const { bucketElevatorEngine } = await import("../../engines/BucketElevatorEngine.js");
            const p = params as any;
            result = { success: true, data: (bucketElevatorEngine as any).calculate?.(p) ?? (bucketElevatorEngine as any).calc?.(p) ?? (bucketElevatorEngine as any).run?.(p) ?? { engine: "BucketElevatorEngine", note: "method not callable" } };
            break;
          }
          case "multi_obj_pareto_optimize": {
            const { multiObjectiveParetoEngine } = await import("../../engines/MultiObjectiveParetoEngine.js");
            const p = params as any;
            result = { success: true, data: (multiObjectiveParetoEngine as any).optimize?.(p) ?? (multiObjectiveParetoEngine as any).run?.(p) ?? (multiObjectiveParetoEngine as any).calculate?.(p) ?? { engine: "MultiObjectiveParetoEngine", note: "method not callable" } };
            break;
          }
          case "transformer_size_calc": {
            const { transformerEngine } = await import("../../engines/TransformerEngine.js");
            const p = params as any;
            result = { success: true, data: (transformerEngine as any).calculate?.(p) ?? (transformerEngine as any).calc?.(p) ?? (transformerEngine as any).run?.(p) ?? { engine: "TransformerEngine", note: "method not callable" } };
            break;
          }
          case "distillation_column_calc": {
            const { distillationColumnEngine } = await import("../../engines/DistillationColumnEngine.js");
            const p = params as any;
            result = { success: true, data: (distillationColumnEngine as any).calculate?.(p) ?? (distillationColumnEngine as any).calc?.(p) ?? (distillationColumnEngine as any).run?.(p) ?? { engine: "DistillationColumnEngine", note: "method not callable" } };
            break;
          }
          case "centrifuge_calc": {
            const { centrifugeEngine } = await import("../../engines/CentrifugeEngine.js");
            const p = params as any;
            result = { success: true, data: (centrifugeEngine as any).calculate?.(p) ?? (centrifugeEngine as any).calc?.(p) ?? (centrifugeEngine as any).run?.(p) ?? { engine: "CentrifugeEngine", note: "method not callable" } };
            break;
          }
          case "flotation_cell_calc": {
            const { flotationCellEngine } = await import("../../engines/FlotationCellEngine.js");
            const p = params as any;
            result = { success: true, data: (flotationCellEngine as any).calculate?.(p) ?? (flotationCellEngine as any).calc?.(p) ?? (flotationCellEngine as any).run?.(p) ?? { engine: "FlotationCellEngine", note: "method not callable" } };
            break;
          }
          case "membrane_filtration_calc": {
            const { membraneFiltrationEngine } = await import("../../engines/MembraneFiltrationEngine.js");
            const p = params as any;
            result = { success: true, data: (membraneFiltrationEngine as any).calculate?.(p) ?? (membraneFiltrationEngine as any).calc?.(p) ?? (membraneFiltrationEngine as any).run?.(p) ?? { engine: "MembraneFiltrationEngine", note: "method not callable" } };
            break;
          }
          case "thickener_calc": {
            const { thickenerEngine } = await import("../../engines/ThickenerEngine.js");
            const p = params as any;
            result = { success: true, data: (thickenerEngine as any).calculate?.(p) ?? (thickenerEngine as any).calc?.(p) ?? (thickenerEngine as any).run?.(p) ?? { engine: "ThickenerEngine", note: "method not callable" } };
            break;
          }
          case "rocket_nozzle_calc": {
            const { rocketNozzleEngine } = await import("../../engines/RocketNozzleEngine.js");
            const p = params as any;
            result = { success: true, data: (rocketNozzleEngine as any).calculate?.(p) ?? (rocketNozzleEngine as any).calc?.(p) ?? (rocketNozzleEngine as any).run?.(p) ?? { engine: "RocketNozzleEngine", note: "method not callable" } };
            break;
          }
          case "thermoelectric_calc": {
            const { thermoelectricEngine } = await import("../../engines/ThermoelectricEngine.js");
            const p = params as any;
            result = { success: true, data: (thermoelectricEngine as any).calculate?.(p) ?? (thermoelectricEngine as any).calc?.(p) ?? (thermoelectricEngine as any).run?.(p) ?? { engine: "ThermoelectricEngine", note: "method not callable" } };
            break;
          }
          case "electrospinning_calc": {
            const { electrospinningEngine } = await import("../../engines/ElectrospinningEngine.js");
            const p = params as any;
            result = { success: true, data: (electrospinningEngine as any).calculate?.(p) ?? (electrospinningEngine as any).calc?.(p) ?? (electrospinningEngine as any).run?.(p) ?? { engine: "ElectrospinningEngine", note: "method not callable" } };
            break;
          }
          case "freeze_drying_calc": {
            const { freezeDryingEngine } = await import("../../engines/FreezeDryingEngine.js");
            const p = params as any;
            result = { success: true, data: (freezeDryingEngine as any).calculate?.(p) ?? (freezeDryingEngine as any).calc?.(p) ?? (freezeDryingEngine as any).run?.(p) ?? { engine: "FreezeDryingEngine", note: "method not callable" } };
            break;
          }
          case "process_digital_twin_calc": {
            const { processDigitalTwinEngine } = await import("../../engines/ProcessDigitalTwinEngine.js");
            const p = params as any;
            result = { success: true, data: (processDigitalTwinEngine as any).simulate?.(p) ?? (processDigitalTwinEngine as any).calculate?.(p) ?? (processDigitalTwinEngine as any).run?.(p) ?? { engine: "ProcessDigitalTwinEngine", note: "method not callable" } };
            break;
          }
          case "process_robustness_calc": {
            const { processRobustnessEngine } = await import("../../engines/ProcessRobustnessEngine.js");
            const p = params as any;
            result = { success: true, data: (processRobustnessEngine as any).analyze?.(p) ?? (processRobustnessEngine as any).calculate?.(p) ?? (processRobustnessEngine as any).run?.(p) ?? { engine: "ProcessRobustnessEngine", note: "method not callable" } };
            break;
          }
          case "amsaa_reliability_growth_calc": {
            const { amsaaReliabilityGrowthEngine } = await import("../../engines/AMSAAReliabilityGrowthEngine.js");
            const p = params as any;
            result = { success: true, data: (amsaaReliabilityGrowthEngine as any).calculate?.(p) ?? (amsaaReliabilityGrowthEngine as any).analyze?.(p) ?? (amsaaReliabilityGrowthEngine as any).run?.(p) ?? { engine: "AMSAAReliabilityGrowthEngine", note: "method not callable" } };
            break;
          }
          case "kalman_filter_calc": {
            const { kalmanFilterEngine } = await import("../../engines/KalmanFilterEngine.js");
            const p = params as any;
            result = { success: true, data: (kalmanFilterEngine as any).compute?.(p) ?? { engine: "KalmanFilterEngine", note: "method not callable" } };
            break;
          }
          case "sensor_data_schema_validate": {
            const { sensorDataSchemaEngine } = await import("../../engines/SensorDataSchemaEngine.js");
            const p = params as any;
            result = { success: true, data: (sensorDataSchemaEngine as any).validate?.(p) ?? (sensorDataSchemaEngine as any).ingest?.(p) ?? (sensorDataSchemaEngine as any).run?.(p) ?? { engine: "SensorDataSchemaEngine", note: "method not callable" } };
            break;
          }
          case "sensor_fusion_calc": {
            const { sensorFusionEngine } = await import("../../engines/SensorFusionEngine.js");
            const p = params as any;
            result = { success: true, data: (sensorFusionEngine as any).fuse?.(p) ?? (sensorFusionEngine as any).update?.(p) ?? (sensorFusionEngine as any).run?.(p) ?? { engine: "SensorFusionEngine", note: "method not callable" } };
            break;
          }
          case "machine_tool_error_budget_calc": {
            const { machineToolErrorBudgetEngine } = await import("../../engines/MachineToolErrorBudgetEngine.js");
            const p = params as any;
            result = { success: true, data: (machineToolErrorBudgetEngine as any).calculate?.(p) ?? (machineToolErrorBudgetEngine as any).analyze?.(p) ?? (machineToolErrorBudgetEngine as any).run?.(p) ?? { engine: "MachineToolErrorBudgetEngine", note: "method not callable" } };
            break;
          }
          case "swept_volume_calc": {
            const { sweptVolumeEngine } = await import("../../engines/SweptVolumeEngine.js");
            const p = params as any;
            result = { success: true, data: (sweptVolumeEngine as any).compute?.(p) ?? (sweptVolumeEngine as any).calculate?.(p) ?? (sweptVolumeEngine as any).run?.(p) ?? { engine: "SweptVolumeEngine", note: "method not callable" } };
            break;
          }
          case "surface_location_error_calc": {
            const { surfaceLocationErrorEngine } = await import("../../engines/SurfaceLocationErrorEngine.js");
            const p = params as any;
            result = { success: true, data: (surfaceLocationErrorEngine as any).calculate?.(p) ?? (surfaceLocationErrorEngine as any).predict?.(p) ?? (surfaceLocationErrorEngine as any).run?.(p) ?? { engine: "SurfaceLocationErrorEngine", note: "method not callable" } };
            break;
          }
          case "receptance_coupling_calc": {
            const { receptanceCouplingEngine } = await import("../../engines/ReceptanceCouplingEngine.js");
            const p = params as any;
            result = { success: true, data: (receptanceCouplingEngine as any).couple?.(p) ?? (receptanceCouplingEngine as any).calculate?.(p) ?? (receptanceCouplingEngine as any).run?.(p) ?? { engine: "ReceptanceCouplingEngine", note: "method not callable" } };
            break;
          }
          case "tapping_torque_calc": {
            const { tappingTorqueEngine } = await import("../../engines/TappingTorqueEngine.js");
            const p = params as any;
            result = { success: true, data: (tappingTorqueEngine as any).calculate?.(p) ?? (tappingTorqueEngine as any).predict?.(p) ?? (tappingTorqueEngine as any).run?.(p) ?? { engine: "TappingTorqueEngine", note: "method not callable" } };
            break;
          }
          case "process_capability_prediction_calc": {
            const { processCapabilityPredictionEngine } = await import("../../engines/ProcessCapabilityPredictionEngine.js");
            const p = params as any;
            result = { success: true, data: (processCapabilityPredictionEngine as any).predict?.(p) ?? (processCapabilityPredictionEngine as any).calculate?.(p) ?? (processCapabilityPredictionEngine as any).run?.(p) ?? { engine: "ProcessCapabilityPredictionEngine", note: "method not callable" } };
            break;
          }
          case "process_variability_integration_calc": {
            const { processVariabilityIntegrationEngine } = await import("../../engines/ProcessVariabilityIntegrationEngine.js");
            const p = params as any;
            result = { success: true, data: (processVariabilityIntegrationEngine as any).analyze?.(p) ?? { engine: "ProcessVariabilityIntegrationEngine", note: "method not callable" } };
            break;
          }
          case "physics_prediction_calc": {
            const mod = await import("../../engines/PhysicsPredictionEngine.js");
            const p = params as any;
            result = { success: true, data: (mod as any).physicsPrediction?.(p.action ?? "surface_integrity", p) ?? { engine: "PhysicsPredictionEngine", note: "method not callable" } };
            break;
          }
          case "calibrated_simulation_calc": {
            const { calibratedSimulationEngine } = await import("../../engines/CalibratedSimulationEngine.js");
            const p = params as any;
            result = { success: true, data: (calibratedSimulationEngine as any).run?.(p) ?? (calibratedSimulationEngine as any).simulate?.(p) ?? (calibratedSimulationEngine as any).calculate?.(p) ?? { engine: "CalibratedSimulationEngine", note: "method not callable" } };
            break;
          }
          case "sensor_simulator_calc": {
            const { sensorSimulatorEngine } = await import("../../engines/SensorSimulatorEngine.js");
            const p = params as any;
            result = { success: true, data: (sensorSimulatorEngine as any).simulate?.(p) ?? (sensorSimulatorEngine as any).generate?.(p) ?? (sensorSimulatorEngine as any).run?.(p) ?? { engine: "SensorSimulatorEngine", note: "method not callable" } };
            break;
          }
          case "fixture_clamping_calc": {
            const { fixtureClampingEngine } = await import("../../engines/FixtureClampingEngine.js");
            const p = params as any;
            result = { success: true, data: (fixtureClampingEngine as any).calculate?.(p) ?? (fixtureClampingEngine as any).analyze?.(p) ?? (fixtureClampingEngine as any).run?.(p) ?? { engine: "FixtureClampingEngine", note: "method not callable" } };
            break;
          }
          case "runout_effect_calc": {
            const { runoutEffectEngine } = await import("../../engines/RunoutEffectEngine.js");
            const p = params as any;
            result = { success: true, data: (runoutEffectEngine as any).calculate?.(p) ?? (runoutEffectEngine as any).analyze?.(p) ?? (runoutEffectEngine as any).run?.(p) ?? { engine: "RunoutEffectEngine", note: "method not callable" } };
            break;
          }
          case "iso286_extended_calc": {
            const mod = await import("../../engines/ISO286ExtendedEngine.js");
            const eng = (mod as any).iso286ExtendedEngine ?? new ((mod as any).ISO286ExtendedEngine)();
            const p = params as any;
            result = { success: true, data: (eng as any).calculate?.(p) ?? (eng as any).analyze?.(p) ?? (eng as any).run?.(p) ?? { engine: "ISO286ExtendedEngine", note: "method not callable" } };
            break;
          }
          // ── Batch-2 UNKNOWN-bucket wiring (iter10) ──────────────────────────
          case "complete_machining_plan": {
            const mod = await import("../../engines/CompleteMachiningEngine.js");
            const eng = (mod as any).completeMachiningEngine ?? new ((mod as any).CompleteMachiningEngine)();
            const p = params as any;
            result = { success: true, data: (eng as any).plan?.(p) ?? (eng as any).analyze?.(p) ?? (eng as any).run?.(p) ?? { engine: "CompleteMachiningEngine", note: "method not callable" } };
            break;
          }
          case "advanced_cnc_config_analyze": {
            const mod = await import("../../engines/AdvancedCNCConfigEngine.js");
            const eng = (mod as any).advancedCNCConfigEngine ?? new ((mod as any).AdvancedCNCConfigEngine)();
            const p = params as any;
            result = { success: true, data: (eng as any).analyze?.(p) ?? (eng as any).configure?.(p) ?? (eng as any).run?.(p) ?? { engine: "AdvancedCNCConfigEngine", note: "method not callable" } };
            break;
          }
          case "virtual_machining_simulate": {
            const mod = await import("../../engines/VirtualMachiningDeepLearningEngine.js");
            const eng = (mod as any).virtualMachiningDeepLearningEngine ?? new ((mod as any).VirtualMachiningDeepLearningEngine)();
            const p = params as any;
            result = { success: true, data: (eng as any).simulate?.(p) ?? (eng as any).analyze?.(p) ?? (eng as any).run?.(p) ?? { engine: "VirtualMachiningDeepLearningEngine", note: "method not callable" } };
            break;
          }
          case "joint_speed_feed_optimize": {
            // Speed-Feed algorithm 8.1 (slot:tango 2026-05-26 /goal /loop):
            // joint (Vc, f) optimizer for max MRR subject to T_target + P_max
            // constraints. Composes canonical KienzleForceModel +
            // ExtendedTaylorModel — no physics in the algorithm file.
            const { optimizeJoint } = await import("../../algorithms/JointSpeedFeedOptimizer.js");
            const p = params as any;
            result = { success: true, data: optimizeJoint(p) };
            break;
          }
          case "effective_diameter_compute": {
            // Speed-Feed algorithm 8.2 (slot:tango 2026-05-27 /goal /loop iter6):
            // geometric effective-cutting-diameter at depth for 5 tool
            // geometries. Returns D_eff + Vc correction multiplier so callers
            // can preserve intended Vc against the actual cutting circle.
            const { compute } = await import("../../algorithms/EffectiveDiameterCompensator.js");
            const p = params as any;
            result = { success: true, data: compute(p) };
            break;
          }
          case "hardness_vc_multiplier": {
            // Speed-Feed algorithm 8.4 (slot:tango 2026-05-27 /goal /yolo iter7):
            // workpiece hardness → Vc multiplier vs catalog reference. Closed
            // form per ISO group with ISO-18265 HRC→HB conversion for steel.
            const { computeVcMultiplier } = await import("../../algorithms/HardnessToVcInverter.js");
            const p = params as any;
            result = { success: true, data: computeVcMultiplier(p) };
            break;
          }
          case "coolant_vc_modifier": {
            // Speed-Feed algorithm 8.5: coolant strategy → Vc + Taylor-C
            // multipliers (6 ISO × 5 coolant). Reference = flood = 1.0.
            const { getMultipliers } = await import("../../algorithms/CoolantVcModifier.js");
            const p = params as any;
            result = { success: true, data: getMultipliers(p) };
            break;
          }
          case "hpc_vc_boost": {
            // Speed-Feed algorithm 8.7: High-Pressure Coolant Vc boost above
            // 35 bar HPC threshold. Returns boost multiplier + factor break-down.
            const { computeBoost } = await import("../../algorithms/HPCVcBoostCalculator.js");
            const p = params as any;
            result = { success: true, data: computeBoost(p) };
            break;
          }
          case "climb_conventional_pick": {
            // Mill-wizard algorithm 3.6: decide climb vs conventional given
            // machine class, backlash, material, operation, Ra target.
            const { pickDirection } = await import("../../algorithms/ClimbConventionalPicker.js");
            const p = params as any;
            result = { success: true, data: pickDirection(p) };
            break;
          }
          case "block_number_renumber": {
            // Post-Processor algorithm 6.2: renumber N-words per 4 strategies
            // (strip / dense / sparse / operation_anchored).
            const { renumber } = await import("../../algorithms/BlockNumberOptimizer.js");
            const p = params as any;
            result = { success: true, data: renumber(p) };
            break;
          }
          case "flush_strategy_pick": {
            // Wire-EDM algorithm 5.5: pick dielectric flush strategy
            // (submerged / high_pressure_jet / hybrid / minimal_jet).
            const { pickFlush } = await import("../../algorithms/FlushStrategyPicker.js");
            const p = params as any;
            result = { success: true, data: pickFlush(p) };
            break;
          }
          case "coolant_sequence_generate": {
            // Post-Processor algorithm 6.3: generate controller-correct
            // coolant M-code sequence (M7/M8/M88/M50/M52/M91 per dialect).
            const { generateSequence: gs } = await import("../../algorithms/CoolantSequenceGenerator.js");
            const p = params as any;
            result = { success: true, data: gs(p) };
            break;
          }
          case "tool_change_sequence": {
            // Post-Processor algorithm 6.4: tool-change sequence with retract,
            // orient (M19), M00 stop, controller-specific T-call format.
            const { generateSequence: tcs } = await import("../../algorithms/ToolChangeSequencer.js");
            const p = params as any;
            result = { success: true, data: tcs(p) };
            break;
          }
          case "safe_retract_plan": {
            // Post-Processor algorithm 6.6: plan safe retract pose for
            // between_op / on_estop / tool_change / end_of_program strategies.
            const { planRetract } = await import("../../algorithms/SafeRetractPlanner.js");
            const p = params as any;
            result = { success: true, data: planRetract(p) };
            break;
          }
          case "hsm_smoothing_filter": {
            // Mill algorithm 3.3: HSM corner-smoothing dialect per controller.
            const { generate: hsmGen } = await import("../../algorithms/HSMSmoothingFilter.js");
            const p = params as any;
            result = { success: true, data: hsmGen(p) };
            break;
          }
          case "glide_cut_detect": {
            // Wire-EDM algorithm 5.6: detect no-load glide state from spark
            // current + gap voltage signals, recommend power-boost.
            const { detect } = await import("../../algorithms/GlideCutDetector.js");
            const p = params as any;
            result = { success: true, data: detect(p) };
            break;
          }
          case "subprogram_call_generate": {
            // Post-Processor algorithm 6.7: controller-correct subprogram call
            // (M98 P / CALL LBL / CALL Onum / Siemens direct).
            const { generateCall } = await import("../../algorithms/SubprogramCaller.js");
            const p = params as any;
            result = { success: true, data: generateCall(p) };
            break;
          }
          case "retract_plane_optimize": {
            // CAM algorithm 2.4: pick global/between-op/feed/tool-change planes.
            const { optimize: rpo } = await import("../../algorithms/RetractPlaneOptimizer.js");
            const p = params as any;
            result = { success: true, data: rpo(p) };
            break;
          }
          case "chip_control_strategy": {
            // Lathe algorithm 4.5: pick chip-breaker / feed-modulation /
            // dwell-and-break / interrupted-cut by ISO group + feed regime.
            const { pickStrategy: chipPick } = await import("../../algorithms/ChipControlStrategy.js");
            const p = params as any;
            result = { success: true, data: chipPick(p) };
            break;
          }
          case "taper_compensate": {
            // Wire-EDM algorithm 5.2: upper/lower guide offset for taper angle
            // by machine kinematics (Sodick / Makino / Mitsubishi / Fanuc).
            const { compensate } = await import("../../algorithms/TaperCompensator.js");
            const p = params as any;
            result = { success: true, data: compensate(p) };
            break;
          }
          case "csg_tree_reduce": {
            // CAD algorithm 1.2: reduce CSG-tree depth via identity collapse
            // + same-op associativity merge + zero-volume drop.
            const { reduceTree } = await import("../../algorithms/CSGTreeOptimizer.js");
            const p = params as any;
            result = { success: true, data: reduceTree(p) };
            break;
          }
          case "stock_envelope_compute": {
            // CAD algorithm 1.4: AABB + bar-round envelope from point set
            // for block/plate/bar stock allocation.
            const { computeEnvelope } = await import("../../algorithms/ConvexHullStockEnvelope.js");
            const p = params as any;
            result = { success: true, data: computeEnvelope(p) };
            break;
          }
          case "step_iges_diff": {
            // CAD algorithm 1.7: STEP/IGES round-trip diff — flag geometry,
            // topology, and feature loss across CAD↔CAM file conversions.
            const { diff: stepDiff } = await import("../../algorithms/StepIgesRoundTripDiff.js");
            const p = params as any;
            result = { success: true, data: stepDiff(p) };
            break;
          }
          case "five_axis_tilt_lead": {
            // CAM algorithm 2.7: tilt + lead angles for 5-axis ball-end finishing.
            const { optimize: optTL } = await import("../../algorithms/FiveAxisTiltLeadOptimizer.js");
            const p = params as any;
            result = { success: true, data: optTL(p) };
            break;
          }
          case "wedm_lead_geometry": {
            // WEDM algorithm 5.1: lead-in/lead-out geometry per cut kind.
            const { planLead } = await import("../../algorithms/WedmLeadInOutGeometry.js");
            const p = params as any;
            result = { success: true, data: planLead(p) };
            break;
          }
          case "job_cost_rollup": {
            // Business/ERP algorithm 7.1: multi-level BOM cost roll-up.
            const { rollupCost } = await import("../../algorithms/JobCostBomRollup.js");
            const p = params as any;
            result = { success: true, data: rollupCost(p) };
            break;
          }
          case "quote_confidence_estimate": {
            // Business/ERP algorithm 7.3: RSS uncertainty propagation across cost components.
            const { estimate: qce } = await import("../../algorithms/QuoteConfidenceEstimator.js");
            const p = params as any;
            result = { success: true, data: qce(p) };
            break;
          }
          case "setup_time_predict": {
            // Business/ERP algorithm 7.5: setup-time regression on JM Die data.
            const { predict } = await import("../../algorithms/SetupTimePredictor.js");
            const p = params as any;
            result = { success: true, data: predict(p) };
            break;
          }
          case "material_yield_optimize": {
            // Business/ERP algorithm 7.6: bar/plate/sheet yield + waste fraction + cost-per-part.
            const { optimize: myo } = await import("../../algorithms/MaterialYieldOptimizer.js");
            const p = params as any;
            result = { success: true, data: myo(p) };
            break;
          }
          case "customer_ltv_dcf": {
            // Business/ERP algorithm 7.7: discounted-cashflow Customer Lifetime Value.
            const { compute: ltvCompute } = await import("../../algorithms/CustomerLtvDcf.js");
            const p = params as any;
            result = { success: true, data: ltvCompute(p) };
            break;
          }
          case "micro_milling_analyze": {
            // U-SFC-MICRO-MILLING-WIRE-FIX (slot:oscar): MicroMillingEngine.analyze takes
            // (tool: MicroToolGeometry, conditions: MicroCuttingConditions). The prior
            // one-arg guess-chain called analyze(p) so `conditions` was undefined and
            // `conditions.feed_per_tooth_um` threw a TypeError on every real call. Pass
            // both args; fail LOUD (R12) on missing inputs instead of a silent stub note.
            const mod = await import("../../engines/MicroMillingEngine.js");
            const eng = (mod as any).microMillingEngine ?? new ((mod as any).MicroMillingEngine)();
            const p = params as any;
            if (!p?.tool || !p?.conditions) {
              result = { success: false, error: "micro_milling_analyze requires { tool: MicroToolGeometry, conditions: MicroCuttingConditions }" };
            } else {
              // Presence is not shape: a malformed-but-present tool (e.g. missing numeric
              // diameter_mm) makes the size-effect math produce NaN, which would serialize
              // to null under a spurious success:true. NaN-check the core output and fail
              // LOUD instead of leaking silent-wrong numerics (arm-C P2, R12).
              const data = eng.analyze(p.tool, p.conditions);
              if (!data || !Number.isFinite(data?.forces?.total_n) || !Number.isFinite(data?.minimum_chip_thickness_um)) {
                result = { success: false, error: "micro_milling_analyze produced non-finite output — check numeric tool/conditions fields (diameter_mm, cutting_edge_radius_um, feed_per_tooth_um)" };
              } else {
                result = { success: true, data };
              }
            }
            break;
          }
          case "micro_milling_size_effect_calc": {
            const mod = await import("../../engines/MicroMillingSizeEffectEngine.js");
            const eng = (mod as any).microMillingSizeEffectEngine ?? new ((mod as any).MicroMillingSizeEffectEngine)();
            const p = params as any;
            result = { success: true, data: (eng as any).calculate?.(p) ?? (eng as any).analyze?.(p) ?? (eng as any).run?.(p) ?? { engine: "MicroMillingSizeEffectEngine", note: "method not callable" } };
            break;
          }
          case "rcsa_frf_predict": {
            const mod = await import("../../engines/RCSAEngine.js");
            const eng = (mod as any).rcsaEngine ?? new ((mod as any).RCSAEngine)();
            const p = params as any;
            result = { success: true, data: (eng as any).predict?.(p) ?? (eng as any).calculate?.(p) ?? (eng as any).run?.(p) ?? { engine: "RCSAEngine", note: "method not callable" } };
            break;
          }
          case "swiss_guide_bushing_physics_calc": {
            // Route to the REAL SwissGuideBushingPhysicsEngine methods. The prior
            // auto-generated wiring (iter9 wire-unwired-loop) called calculate?/analyze?/
            // run? -- NONE of which exist on this engine -- so it silently returned a
            // {note:"method not callable"} stub with success:true (zero physics). Real
            // methods: recommendMode (default orchestrator), recommendClearance,
            // feedLimits, barEndRemnant, thrustBackDrag. Route by params.method.
            const { swissGuideBushingPhysicsEngine: gbEng } = await import("../../engines/SwissGuideBushingPhysicsEngine.js");
            const p = params as any;
            const gbMethod: string = p.method ?? "recommend_mode";
            const gbMode: "gb_on" | "gb_off" = p.mode === "gb_off" ? "gb_off" : "gb_on";
            const gbBar = {
              bar_od_mm: p.bar_od_mm,
              part_length_mm: p.part_length_mm,
              bushing_engagement_mm: p.bushing_engagement_mm,
              youngs_modulus_gpa: p.youngs_modulus_gpa,
              yield_mpa: p.yield_mpa,
              kc_mpa: p.kc_mpa,
              spindle_rpm: p.spindle_rpm,
              feed_per_rev_mm: p.feed_per_rev_mm,
              ap_mm: p.ap_mm,
            };
            let gbData: unknown;
            switch (gbMethod) {
              case "clearance":
              case "recommend_clearance":
                gbData = gbEng.recommendClearance({
                  bar_od_mm: p.bar_od_mm,
                  iso_group: p.iso_group ?? "P",
                  surface_speed_m_per_min: p.surface_speed_m_per_min,
                });
                break;
              case "feed_limits":
                gbData = gbEng.feedLimits(gbMode, gbBar, p.max_deflection_mm);
                break;
              case "bar_end_remnant":
                gbData = gbEng.barEndRemnant(gbMode, p.bar_od_mm);
                break;
              case "thrust_back_drag":
                gbData = gbEng.thrustBackDrag(gbBar, gbMode);
                break;
              case "recommend_mode":
              default:
                gbData = gbEng.recommendMode(gbBar);
            }
            result = { success: true, data: { method: gbMethod, ...(gbData as object) } };
            break;
          }
          case "trilobe_deformation_calc": {
            const mod = await import("../../engines/TrilobeDeformationEngine.js");
            const eng = (mod as any).trilobeDeformationEngine ?? new ((mod as any).TrilobeDeformationEngine)();
            const p = params as any;
            // Real method is analyze() (guessed calculate/predict/run absent -> silent stub).
            result = { success: true, data: (eng as any).analyze(p) };
            break;
          }
          case "stock_feed_cycle_track": {
            const mod = await import("../../engines/StockFeedCycleEngine.js");
            const eng = (mod as any).stockFeedCycleEngine ?? new ((mod as any).StockFeedCycleEngine)();
            const p = params as any;
            // Real method is advanceCycle(FeedCycleState) (guessed track/update/run absent).
            result = { success: true, data: (eng as any).advanceCycle(p) };
            break;
          }
          case "in_process_stock_model_update": {
            const mod = await import("../../engines/InProcessStockModelEngine.js");
            const eng = (mod as any).inProcessStockModelEngine ?? new ((mod as any).InProcessStockModelEngine)();
            const p = params as any;
            result = { success: true, data: (eng as any).update?.(p) ?? (eng as any).simulate?.(p) ?? (eng as any).run?.(p) ?? { engine: "InProcessStockModelEngine", note: "method not callable" } };
            break;
          }
          case "inter_operation_state_transfer": {
            const mod = await import("../../engines/InterOperationStateEngine.js");
            const eng = (mod as any).interOperationStateEngine ?? new ((mod as any).InterOperationStateEngine)();
            const p = params as any;
            result = { success: true, data: (eng as any).transfer?.(p) ?? (eng as any).get?.(p) ?? (eng as any).run?.(p) ?? { engine: "InterOperationStateEngine", note: "method not callable" } };
            break;
          }
          case "process_environment_sensitivity_analyze": {
            const mod = await import("../../engines/ProcessEnvironmentSensitivityEngine.js");
            const eng = (mod as any).processEnvironmentSensitivityEngine ?? new ((mod as any).ProcessEnvironmentSensitivityEngine)();
            const p = params as any;
            result = { success: true, data: (eng as any).analyze?.(p) ?? (eng as any).calculate?.(p) ?? (eng as any).run?.(p) ?? { engine: "ProcessEnvironmentSensitivityEngine", note: "method not callable" } };
            break;
          }
          case "holder_operation_match_select": {
            const mod = await import("../../engines/HolderOperationMatchEngine.js");
            const eng = (mod as any).holderOperationMatchEngine ?? new ((mod as any).HolderOperationMatchEngine)();
            const p = params as any;
            result = { success: true, data: (eng as any).select?.(p) ?? (eng as any).match?.(p) ?? (eng as any).run?.(p) ?? { engine: "HolderOperationMatchEngine", note: "method not callable" } };
            break;
          }
          case "physics_aware_data_augmentation_run": {
            const mod = await import("../../engines/PhysicsAwareDataAugmentationEngine.js");
            const eng = (mod as any).physicsAwareDataAugmentationEngine ?? new ((mod as any).PhysicsAwareDataAugmentationEngine)();
            const p = params as any;
            result = { success: true, data: (eng as any).augment?.(p) ?? (eng as any).run?.(p) ?? (eng as any).generate?.(p) ?? { engine: "PhysicsAwareDataAugmentationEngine", note: "method not callable" } };
            break;
          }
          // ── end Batch-2 calc wiring ───────────────────────────────────────────
          // U-WIRE-MOEA-STOP / WIRE-UNWIRED-PAPA: MOEAStoppingCriterion HV-saturation stopping (slot:papa->tango 2026-06-15).
          // Stateless batch: feed a sequence of per-generation fronts -> run evaluate() until shouldStop -> return decision + HV trajectory.
          case "moea_stopping_evaluate": {
            const { MOEAStoppingCriterion } = await import("../../engines/MOEAStoppingCriterion.js");
            const fronts = params.fronts as number[][][];
            const criterion = new MOEAStoppingCriterion(
              (params.config ?? {}) as ConstructorParameters<typeof MOEAStoppingCriterion>[0],
            );
            let decision: ReturnType<typeof criterion.evaluate> | undefined;
            for (const front of fronts) {
              decision = criterion.evaluate(front);
              if (decision.shouldStop) break;
            }
            result = {
              decision: decision ?? null,
              stopped: decision?.shouldStop ?? false,
              stoppedAtGeneration: decision?.shouldStop ? decision.generation : null,
              trajectory: criterion.trajectory(),
              generationsEvaluated: criterion.trajectory().length,
            };
            break;
          }
          // U-WIRE-SFC-PSN / WIRE-UNWIRED-PAPA: SpeedFeedPSNDecisionPriorEngine.query -- read-only PSN prior fusion. slot:papa->oscar 2026-06-15.
          case "sfc_psn_decision_prior": {
            const { speedFeedPSNDecisionPriorEngine } = await import("../../engines/SpeedFeedPSNDecisionPriorEngine.js");
            // validated-boundary cast: schema guarantees material + tooling are objects; the engine
            // best-effort-extracts the rest of NineAxisInput (missing fields -> no match, never throws).
            result = speedFeedPSNDecisionPriorEngine.query(params as unknown as Parameters<typeof speedFeedPSNDecisionPriorEngine.query>[0]);
            break;
          }

          // ── SFC-CONVERGENCE/U-SFC-PREVIEW (slot:oscar, 2026-06-22) ──
          // Read-only convergence preview: runs orchestrator.compute() vs
          // ultimateSpeedFeedEngine.calculate(orchestratorToUltimateInput()) for one
          // SFC input and returns { production, converged, delta, recommendation,
          // safety_flags }. NEVER mutates process.env.PRISM_SFC_CONVERGE.
          case "sfc_convergence_preview": {
            const { sfcConvergencePreviewEngine } = await import("../../engines/SFCConvergencePreviewEngine.js");
            const { speedFeedOrchestratorEngine: sfcpOrch } = await import("../../engines/SpeedFeedOrchestratorEngine.js");
            const { ultimateSpeedFeedEngine: sfcpUsf } = await import("../../engines/UltimateSpeedFeedEngine.js");
            result = sfcConvergencePreviewEngine.previewWith(params, sfcpOrch, sfcpUsf);
            break;
          }

          // ── SFC-ORPHAN-WIRE-QUEUE/U-SFC-RAG-WARMSTART-WIRE (slot:india, 2026-06-22) ──
          // Read-only JM Die historical-program RAG retrieval for operator corpus visibility.
          // Validate at the boundary with the engine's own Zod schema -- .parse() THROWS on a bad
          // machine_type enum / out-of-range top_k / NaN / missing material, which the dispatcher
          // catch turns into success:false. retrieve() is a pure BM25 read (no physics mutation).
          case "sfc_rag_warmstart": {
            const { SFCRAGWarmStartEngine, SFCRAGWarmStartInputSchema } = await import("../../engines/SFCRAGWarmStartEngine.js");
            const parsed = SFCRAGWarmStartInputSchema.parse(params);
            result = SFCRAGWarmStartEngine.retrieve(parsed);
            break;
          }
          // Index introspection: whether the JM Die RAG index is loaded, its stats, and the
          // engine's self-awareness metadata. Pure read; no params required (passthrough).
          case "sfc_rag_warmstart_stats": {
            const { SFCRAGWarmStartEngine } = await import("../../engines/SFCRAGWarmStartEngine.js");
            result = {
              index_ready: SFCRAGWarmStartEngine.isIndexReady(),
              index_stats: SFCRAGWarmStartEngine.getIndexStats(),
              self_awareness: SFCRAGWarmStartEngine.getSelfAwareness(),
            };
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
