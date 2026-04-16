/**
 * Advanced Science & Engineering Action Schemas
 * ==============================================
 * Per-action Zod schemas for 8 advanced science/engineering engines.
 *
 * Engines: AdvancedCuttingPhysicsEngine, ReliabilityEngineeringEngine,
 *   MachineGeometricAccuracyEngine, StatisticalProcessMonitoringEngine,
 *   ConstitutiveModelEngine, AdvancedWearPhysicsEngine,
 *   SustainabilityLCAEngine, CoolantDynamicsEngine
 *
 * @module schemas/advancedScienceActionSchemas
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

const optStr = z.string().optional();
const optNum = z.number().optional();
const optBool = z.boolean().optional();

// ============================================================================
// ADVANCED CUTTING PHYSICS (6 actions)
// ============================================================================

const jcMaterial = z.object({
  A: z.number(), B: z.number(), C: z.number(), n: z.number(), m: z.number(),
  Tm: z.number(), Tr: z.number().optional(),
}).passthrough();

const sciOxley = z.object({
  rake_angle_deg: z.number(),
  cutting_speed_m_min: z.number(),
  feed_mm_rev: z.number(),
  width_mm: z.number(),
  material: jcMaterial,
}).passthrough();

const sciOblique = z.object({
  Fc_orthogonal: z.number(),
  Ft_orthogonal: z.number(),
  inclination_angle_deg: z.number(),
  normal_rake_deg: z.number(),
}).passthrough();

const sciSizeEffect = z.object({
  chip_thickness_mm: z.number(),
  reference_kc_N_mm2: z.number(),
  reference_chip_thickness_mm: optNum,
  size_exponent: optNum,
  edge_radius_mm: optNum,
}).passthrough();

const sciRecht = z.object({
  material: jcMaterial,
  cutting_speed_m_min: z.number(),
  feed_mm_rev: z.number(),
  rake_angle_deg: z.number(),
}).passthrough();

const sciChipBreak = z.object({
  chip_thickness_mm: z.number(),
  shear_angle_deg: z.number(),
  material_fracture_strain: optNum,
  chipbreaker_groove_width_mm: optNum,
}).passthrough();

const sciProcessDamping = z.object({
  undamped_stability_limit_mm: z.number(),
  tool_clearance_angle_deg: z.number(),
  flank_wear_VB_mm: optNum,
  cutting_speed_m_min: z.number(),
  natural_freq_Hz: z.number(),
  damping_ratio: z.number(),
  flank_contact_length_mm: optNum,
}).passthrough();

// ============================================================================
// RELIABILITY ENGINEERING (8 actions)
// ============================================================================

const relCoxObs = z.object({
  time: z.number(), event: z.boolean(), covariates: z.array(z.number()),
}).passthrough();

const relCox = z.object({
  observations: z.array(relCoxObs),
}).passthrough();

const relCompeting = z.object({
  failures: z.array(z.object({ time: z.number(), mode: z.string() }).passthrough()),
  modes: z.array(z.string()),
}).passthrough();

const relWiener = z.object({
  observations: z.array(z.number()),
  threshold: z.number(),
  time_interval: z.number(),
}).passthrough();

const relGamma = z.object({
  observations: z.array(z.number()),
  threshold_mm: z.number(),
  time_interval: z.number(),
}).passthrough();

const relBayesRUL = z.object({
  prior_drift: z.number(),
  prior_drift_var: z.number(),
  diffusion: z.number(),
  threshold: z.number(),
  new_observations: z.array(z.number()),
}).passthrough();

const relOptReplace = z.object({
  preventive_cost: z.number(),
  failure_cost: z.number(),
  weibull_shape: z.number(),
  weibull_scale: z.number(),
}).passthrough();

const relDelay = z.object({
  defect_rate_per_hour: z.number(),
  mean_delay_hours: z.number(),
  inspection_cost: z.number(),
  downtime_cost_per_hour: z.number(),
  repair_time_hours: z.number(),
}).passthrough();

const relRenewal = z.object({
  weibull_shape: z.number(),
  weibull_scale: z.number(),
  preventive_cost: z.number(),
  failure_cost: z.number(),
  planned_interval: z.number(),
}).passthrough();

// ============================================================================
// MACHINE GEOMETRIC ACCURACY (5 actions)
// ============================================================================

const axisErrors = z.object({
  positioning: z.number(), straightness_y: z.number(), straightness_z: z.number(),
  roll: z.number(), pitch: z.number(), yaw: z.number(),
}).passthrough();

const acc21Error = z.object({
  position: z.object({ x: z.number(), y: z.number(), z: z.number() }).passthrough(),
  axis_errors: z.object({ x_axis: axisErrors, y_axis: axisErrors, z_axis: axisErrors }).passthrough(),
  squareness: z.object({ xy: z.number(), xz: z.number(), yz: z.number() }).passthrough(),
}).passthrough();

const accAbbe = z.object({
  angular_error_urad: z.number(),
  offset_distance_mm: z.number(),
  axis: optStr,
}).passthrough();

const accVolumetric = z.object({
  workspace: z.object({
    x_range: z.array(z.number()), y_range: z.array(z.number()), z_range: z.array(z.number()),
  }).passthrough(),
  grid_points: optNum,
  axis_errors: z.object({ x_axis: axisErrors, y_axis: axisErrors, z_axis: axisErrors }).passthrough(),
  squareness: z.object({ xy: z.number(), xz: z.number(), yz: z.number() }).passthrough(),
}).passthrough();

const accBallBar = z.object({
  nominal_radius_mm: z.number(),
  measured_points: z.array(z.object({ angle_deg: z.number(), radius_deviation_um: z.number() }).passthrough()),
  feed_rate_mm_min: z.number(),
  plane: z.enum(["XY", "XZ", "YZ"]).optional(),
}).passthrough();

const accThermal = z.object({
  calibration_data: z.array(z.object({
    temps: z.array(z.number()),
    position_errors: z.object({ dx: z.number(), dy: z.number(), dz: z.number() }).passthrough(),
  }).passthrough()),
  current_temps: z.array(z.number()),
  sensor_names: z.array(z.string()).optional(),
}).passthrough();

// ============================================================================
// STATISTICAL PROCESS MONITORING (9 actions)
// ============================================================================

const spmHotelling = z.object({
  data: z.array(z.array(z.number())),
  target: z.array(z.number()).optional(),
  alpha: optNum,
}).passthrough();

const spmPCA = z.object({
  training_data: z.array(z.array(z.number())),
  new_observations: z.array(z.array(z.number())),
  variance_threshold: optNum,
}).passthrough();

const spmHMM = z.object({
  observations: z.array(z.number()),
  n_states: z.number(),
  n_emissions: z.number(),
  initial_A: z.array(z.array(z.number())).optional(),
  initial_B: z.array(z.array(z.number())).optional(),
}).passthrough();

const spmBootstrap = z.object({
  data: z.array(z.number()),
  statistic: z.enum(["mean", "median", "std", "cpk"]),
  n_bootstrap: optNum,
  confidence: optNum,
}).passthrough();

const spmSPRT = z.object({
  observations: z.array(z.number()),
  h0_mean: z.number(),
  h1_mean: z.number(),
  sigma: z.number(),
  alpha: optNum,
  beta: optNum,
}).passthrough();

const spmCombined = z.object({
  data: z.array(z.number()),
  target: z.number(),
  sigma: z.number(),
  cusum_k: optNum,
  cusum_h: optNum,
  ewma_lambda: optNum,
}).passthrough();

const spmDOE = z.object({
  factors: z.array(z.object({ name: z.string(), levels: z.array(z.number()) }).passthrough()),
  design_type: z.enum(["full_factorial", "taguchi", "box_behnken", "ccd", "fractional"]),
}).passthrough();

const spmRSM = z.object({
  factors: z.array(z.string()),
  data: z.array(z.object({ factors: z.array(z.number()), response: z.number() }).passthrough()),
}).passthrough();

const spmNBI = z.object({
  objectives: z.array(z.object({
    name: z.string(), values: z.array(z.number()), direction: z.enum(["minimize", "maximize"]),
  }).passthrough()),
  n_points: optNum,
}).passthrough();

// ============================================================================
// CONSTITUTIVE MODELS (9 actions)
// ============================================================================

const constZA = z.object({
  strain: z.number(), strain_rate: z.number(), temperature_C: z.number(),
  crystal_structure: z.enum(["BCC", "FCC"]),
  constants: z.object({ C0: z.number(), C1: z.number(), C2: z.number(), C3: z.number(), C4: z.number(), C5: z.number(), n: z.number() }).passthrough(),
}).passthrough();

const constMTS = z.object({
  strain: z.number(), strain_rate: z.number(), temperature_C: z.number(),
  params: z.object({ sigma_a: z.number(), sigma_hat: z.number(), g0: z.number(), p: z.number(), q: z.number(), b: z.number(), mu_0: z.number(), D_mu: z.number(), eps_dot_0: z.number() }).passthrough(),
}).passthrough();

const constVoce = z.object({
  strain: z.number(), sigma_0_MPa: z.number(), sigma_s_MPa: z.number(), epsilon_c: z.number(),
}).passthrough();

const constPTW = z.object({
  strain: z.number(), strain_rate: z.number(), temperature_C: z.number(),
  params: z.record(z.string(), z.number()),
}).passthrough();

const constParis = z.object({
  initial_crack_mm: z.number(), critical_crack_mm: z.number(),
  stress_range_MPa: z.number(), geometry_factor_Y: z.number(),
  C: z.number(), m: z.number(),
}).passthrough();

const constNorton = z.object({
  stress_MPa: z.number(), temperature_C: z.number(),
  A: z.number(), n: z.number(), Q_kJ_mol: z.number(),
}).passthrough();

const constLM = z.object({
  test_data: z.array(z.object({ temperature_C: z.number(), rupture_hours: z.number() }).passthrough()),
  target_temperature_C: z.number(),
  target_hours: optNum,
}).passthrough();

const constHollomon = z.object({
  strain_data: z.array(z.number()),
  stress_data: z.array(z.number()),
}).passthrough();

const constMachinability = z.object({
  material_v60_m_min: z.number(),
  reference_v60_m_min: optNum,
  specific_energy_ratio: optNum,
  chip_factor: optNum,
  surface_factor: optNum,
}).passthrough();

// ============================================================================
// ADVANCED WEAR PHYSICS (7 actions)
// ============================================================================

const wearStochastic = z.object({
  cutting_speed_m_min: z.number(),
  taylor_C: z.number(), taylor_n: z.number(),
  life_scatter_cv: optNum, n_simulations: optNum,
}).passthrough();

const wearFick = z.object({
  temperature_C: z.number(), time_min: z.number(),
  tool_material: z.enum(["carbide", "cermet", "ceramic"]),
  workpiece_material: z.enum(["steel", "stainless", "titanium"]),
  D0_m2_s: optNum, activation_energy_kJ: optNum,
}).passthrough();

const wearNotch = z.object({
  cutting_speed_m_min: z.number(), temperature_C: z.number(), time_min: z.number(),
  depth_of_cut_mm: z.number(), work_hardening_ratio: optNum,
  atmosphere: z.enum(["air", "inert"]).optional(),
}).passthrough();

const wearLogNormal = z.object({
  life_data: z.array(z.object({ time: z.number(), censored: z.boolean() }).passthrough()),
  confidence: optNum,
}).passthrough();

const wearRabinowicz = z.object({
  normal_force_N: z.number(), sliding_distance_mm: z.number(),
  surface_hardness_HV: z.number(), abrasive_hardness_HV: z.number(),
  wear_coefficient_K: optNum,
}).passthrough();

const wearFlankODE = z.object({
  cutting_speed_m_min: z.number(), feed_mm_rev: z.number(),
  time_steps_min: z.array(z.number()),
  initial_VB_mm: optNum, VB_threshold_mm: optNum,
  breakin_constant: z.number(), steady_rate: z.number(),
  accel_constants: z.array(z.number()),
}).passthrough();

const wearCombined = z.object({
  cutting_speed_m_min: z.number(), temperature_C: z.number(),
  mechanical_constant: z.number(), diffusion_constant: z.number(),
  activation_energy_kJ: z.number(), time_max_min: z.number(), dt_min: z.number(),
}).passthrough();

// ============================================================================
// SUSTAINABILITY & LCA (7 actions)
// ============================================================================

const susLCA = z.object({
  material_kg: z.number(), material_type: z.string(),
  energy_kwh: z.number(), coolant_liters: optNum,
  tool_changes: optNum, transport_km: optNum, recycling_fraction: optNum,
}).passthrough();

const susEcoEff = z.object({
  alternatives: z.array(z.object({
    name: z.string(), value_metric: z.number(), impacts: z.record(z.string(), z.number()),
  }).passthrough()),
}).passthrough();

const susExergy = z.object({
  spindle_power_kW: z.number(), feed_power_kW: z.number(), coolant_power_kW: z.number(),
  MRR_cm3_min: z.number(), specific_cutting_energy_J_mm3: z.number(),
  coolant_temp_in_C: optNum, coolant_temp_out_C: optNum,
}).passthrough();

const susGutowski = z.object({
  idle_power_kW: z.number(), specific_energy_J_mm3: z.number(),
  part_volume_cm3: z.number(), available_MRR_range: z.array(z.number()),
}).passthrough();

const susCoolantLife = z.object({
  coolant_type: z.enum(["emulsion", "synthetic", "neat_oil", "MQL"]),
  sump_volume_liters: z.number(), pump_power_kW: z.number(),
  sump_life_weeks: z.number(), maintenance_interval_days: z.number(),
  disposal_method: z.enum(["recycle", "incinerate", "waste_treatment"]).optional(),
}).passthrough();

const susStochasticEcon = z.object({
  machine_rate_per_min: z.number(), tool_cost: z.number(), tool_change_time_min: z.number(),
  cycle_time_min: z.number(), weibull_shape: z.number(), weibull_scale_min: z.number(),
  failure_penalty_cost: z.number(),
}).passthrough();

const susTCO = z.object({
  purchase_price: z.number(), n_edges: z.number(), regrind_cost: z.number(),
  max_regrinds: z.number(), coating_cost: z.number(), n_coatings: z.number(),
  annual_usage: z.number(), inventory_carrying_pct: z.number(),
  failure_cost: z.number(), failure_probability: z.number(), disposal_cost: z.number(),
}).passthrough();

// ============================================================================
// COOLANT DYNAMICS (7 actions)
// ============================================================================

const coolReynolds = z.object({
  channel_diameter_mm: z.number(), flow_rate_lpm: z.number(),
  coolant_density_kg_m3: optNum, viscosity_Pa_s: optNum,
  channel_length_mm: z.number(), roughness_um: optNum,
}).passthrough();

const coolTSC = z.object({
  supply_pressure_bar: z.number(), spindle_bore_mm: z.number(), spindle_length_mm: z.number(),
  holder_channel_mm: z.number(), holder_length_mm: z.number(),
  tool_channels: z.array(z.object({ diameter_mm: z.number(), length_mm: z.number() }).passthrough()),
  nozzle_diameter_mm: z.number(), flow_rate_lpm: z.number(), spindle_rpm: optNum,
}).passthrough();

const coolMQL = z.object({
  oil_flow_ml_hr: z.number(), air_pressure_bar: z.number(), nozzle_distance_mm: z.number(),
  oil_viscosity_cSt: optNum, oil_density_kg_m3: optNum, oil_surface_tension_N_m: optNum,
  target_area_mm2: z.number(),
}).passthrough();

const coolJet = z.object({
  nozzle_diameter_mm: z.number(), pressure_bar: z.number(), standoff_mm: z.number(),
  nozzle_type: z.enum(["round", "flat_fan", "needle"]).optional(),
  coolant_surface_tension: optNum,
}).passthrough();

const coolChipTransport = z.object({
  chip_thickness_mm: z.number(), chip_width_mm: z.number(), chip_length_mm: z.number(),
  chip_material_density: optNum, coolant_density: optNum, coolant_viscosity: optNum,
  channel_diameter_mm: z.number(),
}).passthrough();

const coolKomanduri = z.object({
  cutting_speed_m_min: z.number(), feed_mm_rev: z.number(), depth_mm: z.number(),
  shear_angle_deg: z.number(), rake_angle_deg: z.number(), friction_coefficient: z.number(),
  shear_strength_MPa: z.number(),
  workpiece_thermal_diff_mm2_s: z.number(), workpiece_conductivity_W_mK: z.number(),
}).passthrough();

const coolCryo = z.object({
  cryogen: z.enum(["LN2", "CO2"]),
  flow_rate_kg_min: z.number(), supply_temp_C: optNum,
  cutting_heat_W: z.number(), contact_area_mm2: z.number(), surface_temp_C: z.number(),
}).passthrough();

// ============================================================================
// EXPORT — MERGED SCHEMA MAP
// ============================================================================

export const ACTION_ADVANCED_SCIENCE_SCHEMAS: ActionSchemaMap = {
  // Cutting physics
  sci_oxley: sciOxley,
  sci_oblique: sciOblique,
  sci_size_effect: sciSizeEffect,
  sci_recht_shear: sciRecht,
  sci_chip_breaking: sciChipBreak,
  sci_process_damping: sciProcessDamping,

  // Reliability
  rel_cox_hazards: relCox,
  rel_competing_risks: relCompeting,
  rel_wiener_rul: relWiener,
  rel_gamma_degradation: relGamma,
  rel_bayesian_rul: relBayesRUL,
  rel_optimal_replacement: relOptReplace,
  rel_delay_time: relDelay,
  rel_renewal_theory: relRenewal,

  // Machine accuracy
  acc_21_error_model: acc21Error,
  acc_abbe_offset: accAbbe,
  acc_volumetric: accVolumetric,
  acc_ball_bar: accBallBar,
  acc_thermal_error: accThermal,

  // Statistical process monitoring
  spm_hotelling_t2: spmHotelling,
  spm_pca_monitoring: spmPCA,
  spm_hmm_condition: spmHMM,
  spm_bootstrap_ci: spmBootstrap,
  spm_sprt: spmSPRT,
  spm_combined_spc: spmCombined,
  spm_doe_generate: spmDOE,
  spm_rsm: spmRSM,
  spm_nbi_optimization: spmNBI,

  // Constitutive models
  const_zerilli_armstrong: constZA,
  const_mts: constMTS,
  const_voce: constVoce,
  const_ptw: constPTW,
  const_paris_law: constParis,
  const_norton_creep: constNorton,
  const_larson_miller: constLM,
  const_hollomon: constHollomon,
  const_machinability: constMachinability,

  // Wear physics
  wear_stochastic: wearStochastic,
  wear_fick_crater: wearFick,
  wear_notch: wearNotch,
  wear_lognormal_life: wearLogNormal,
  wear_rabinowicz: wearRabinowicz,
  wear_flank_ode: wearFlankODE,
  wear_combined_mechanisms: wearCombined,

  // Sustainability
  sus_lifecycle_assessment: susLCA,
  sus_eco_efficiency: susEcoEff,
  sus_exergy: susExergy,
  sus_gutowski_energy: susGutowski,
  sus_coolant_lifecycle: susCoolantLife,
  sus_stochastic_economics: susStochasticEcon,
  sus_total_cost_ownership: susTCO,

  // Coolant dynamics
  cool_reynolds_flow: coolReynolds,
  cool_tsc_pressure: coolTSC,
  cool_mql_spray: coolMQL,
  cool_jet_coherence: coolJet,
  cool_chip_transport: coolChipTransport,
  cool_komanduri_thermal: coolKomanduri,
  cool_cryogenic: coolCryo,
};
