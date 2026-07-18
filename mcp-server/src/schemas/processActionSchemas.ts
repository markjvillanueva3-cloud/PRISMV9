/**
 * processActionSchemas.ts — Zod input schemas for the prism_process dispatcher.
 *
 * Covers 7 Process-domain engines:
 *   ProcessCapabilityPredictionEngine  → capability_predict
 *   ProcessDigitalTwinEngine           → digital_twin_compute
 *   ProcessEnvironmentSensitivityEngine→ env_calculate_corrections
 *                                        env_assess_risks
 *                                        env_optimal_window
 *                                        env_record
 *                                        env_trends
 *                                        env_add_coefficient
 *                                        env_get_coefficients
 *   ProcessIntelligenceRouterEngine    → router_route
 *                                        router_full_pipeline
 *                                        router_list_stages
 *                                        router_orchestrate
 *   ProcessRobustnessEngine            → robustness_compute
 *   ProcessValidationIQOQPQEngine      → validation_validate
 *                                        validation_stats
 *   ProcessVariabilityIntegrationEngine→ variability_analyze
 *
 * @module schemas/processActionSchemas
 * @milestone PSN-SYNERGY / PROCESS-WIRING
 */

import { z } from "zod";

// ─── Shared ───────────────────────────────────────────────────────────────────

export const EmptyInputSchema = z.object({}).describe("No parameters required");

// ─── ProcessCapabilityPredictionEngine ───────────────────────────────────────

export const CapabilityPredictSchema = z.object({
  nominal_mm: z.number().describe("Nominal dimension (mm)"),
  usl_mm: z.number().describe("Upper specification limit (mm)"),
  lsl_mm: z.number().describe("Lower specification limit (mm)"),
  machine_positioning_um: z.number().optional().describe("Machine positioning accuracy (µm)"),
  machine_repeatability_um: z.number().optional().describe("Machine repeatability (µm)"),
  thermal_drift_um: z.number().optional().describe("Thermal growth uncertainty (µm)"),
  tool_diameter_mm: z.number().optional().describe("Tool diameter (mm)"),
  tool_overhang_mm: z.number().optional().describe("Tool overhang (mm)"),
  tool_material_E_GPa: z.number().optional().describe("Tool Young's modulus (GPa); carbide≈600, HSS≈210"),
  cutting_force_N: z.number().optional().describe("Cutting force (N)"),
  tool_wear_rate_um_per_part: z.number().optional().describe("Tool wear rate (µm per part)"),
  tool_life_parts: z.number().optional().describe("Tool life (number of parts)"),
  spindle_runout_um: z.number().optional().describe("Spindle runout TIR (µm)"),
  fixture_repeatability_um: z.number().optional().describe("Fixture locating repeatability (µm)"),
  hardness_variation_pct: z.number().optional().describe("Material hardness variation (% → force scatter)"),
  monte_carlo_samples: z.number().int().min(0).optional().describe("Monte Carlo samples; 0 = analytical only"),
  mean_shift_um: z.number().optional().describe("Known systematic offset (µm)"),
});

// ─── ProcessDigitalTwinEngine ─────────────────────────────────────────────────

export const DigitalTwinComputeSchema = z.object({
  tool: z.object({
    diameter_mm: z.number().describe("Tool diameter (mm)"),
    flute_count: z.number().int().describe("Number of flutes"),
    helix_angle_deg: z.number().optional().describe("Helix angle (degrees)"),
    nose_radius_mm: z.number().optional().describe("Nose radius (mm)"),
    overhang_mm: z.number().describe("Tool overhang (mm)"),
    material: z.enum(["carbide", "hss", "cermet", "cbn", "pcd"]).describe("Tool material"),
    coating: z.enum(["TiAlN", "TiN", "AlCrN", "DLC", "uncoated"]).optional().describe("Tool coating"),
  }).describe("Tool geometry and material"),
  cutting: z.object({
    cutting_speed_m_min: z.number().describe("Cutting speed (m/min)"),
    feed_per_tooth_mm: z.number().describe("Feed per tooth (mm)"),
    axial_depth_mm: z.number().describe("Axial depth of cut (mm)"),
    radial_depth_mm: z.number().describe("Radial depth of cut (mm)"),
    coolant: z.enum(["flood", "mist", "mql", "dry"]).describe("Coolant strategy"),
  }).describe("Cutting conditions"),
  material: z.object({
    iso_group: z.enum(["P", "M", "K", "N", "S", "H"]).describe("ISO material group"),
    hardness_hrc: z.number().optional().describe("Material hardness (HRC)"),
  }).describe("Workpiece material"),
  workpiece: z.object({
    min_wall_mm: z.number().optional().describe("Minimum wall thickness (mm) for springback"),
    tolerance_mm: z.number().describe("Part tolerance (mm)"),
    volume_to_remove_cm3: z.number().optional().describe("Volume to remove (cm³)"),
  }).describe("Workpiece geometry"),
  machine: z.object({
    spindle_power_kw: z.number().describe("Spindle power (kW)"),
    max_rpm: z.number().describe("Maximum spindle RPM"),
    runout_tir_um: z.number().optional().describe("Spindle runout TIR (µm)"),
  }).describe("Machine parameters"),
});

// ─── ProcessEnvironmentSensitivityEngine ─────────────────────────────────────

const TemperatureEnvSchema = z.object({
  ambient: z.number().describe("Ambient temperature (°C)"),
  coolantSupply: z.number().describe("Coolant supply temperature (°C)"),
  coolantReturn: z.number().describe("Coolant return temperature (°C)"),
  spindleHead: z.number().describe("Spindle head temperature (°C)"),
  xAxisMotor: z.number().describe("X-axis motor temperature (°C)"),
  yAxisMotor: z.number().describe("Y-axis motor temperature (°C)"),
  zAxisMotor: z.number().describe("Z-axis motor temperature (°C)"),
  hydraulicOil: z.number().describe("Hydraulic oil temperature (°C)"),
  machineStructure: z.number().describe("Machine structure temperature (°C)"),
  measurementProbe: z.number().describe("Measurement probe temperature (°C)"),
});

const HumidityEnvSchema = z.object({
  relativeHumidity: z.number().describe("Relative humidity (%)"),
  dewPoint: z.number().describe("Dew point (°C)"),
  condensationRisk: z.boolean().describe("Condensation risk flag"),
});

const VibrationEnvSchema = z.object({
  floorVibration: z.number().describe("Floor vibration (mm/s RMS)"),
  nearbyMachineVibration: z.number().describe("Nearby machine vibration (mm/s RMS)"),
  trafficVibration: z.number().describe("Traffic vibration (mm/s RMS)"),
  hvacVibration: z.number().describe("HVAC vibration (mm/s RMS)"),
  dominantFrequency: z.number().describe("Dominant vibration frequency (Hz)"),
  isolationEfficiency: z.number().min(0).max(1).describe("Machine isolation efficiency (0–1)"),
});

const FluidEnvSchema = z.object({
  coolantLevel: z.number().describe("Coolant level (%)"),
  coolantConcentration: z.number().describe("Coolant concentration (%)"),
  coolantPH: z.number().describe("Coolant pH"),
  coolantBacteriaLevel: z.enum(["low", "medium", "high"]).describe("Coolant bacteria level"),
  coolantFoaming: z.boolean().describe("Coolant foaming flag"),
  hydraulicPressure: z.number().describe("Hydraulic pressure (bar)"),
  hydraulicTemperature: z.number().describe("Hydraulic temperature (°C)"),
  hydraulicContamination: z.number().describe("Hydraulic contamination (NAS class)"),
  wayLubeLevel: z.number().describe("Way lube level (%)"),
  airSupplyPressure: z.number().describe("Air supply pressure (bar)"),
  airSupplyDewPoint: z.number().describe("Air supply dew point (°C)"),
});

const ElectricalEnvSchema = z.object({
  lineVoltage: z.number().describe("Line voltage (V)"),
  voltageStability: z.number().describe("Voltage stability (% variation)"),
  powerFactor: z.number().describe("Power factor"),
  harmonicDistortion: z.number().describe("Total harmonic distortion (% THD)"),
  groundingQuality: z.enum(["good", "marginal", "poor"]).describe("Grounding quality"),
});

const TemporalFactorsSchema = z.object({
  timeOfDay: z.number().min(0).max(24).describe("Time of day (0–24 hours)"),
  dayOfWeek: z.number().int().min(0).max(6).describe("Day of week (0=Sun, 6=Sat)"),
  dayOfYear: z.number().int().min(1).max(365).describe("Day of year (1–365)"),
  machineUptimeMinutes: z.number().describe("Machine uptime (minutes)"),
  timeSinceLastMaintenance: z.number().describe("Time since last maintenance (hours)"),
  timeSinceSpindleWarmup: z.number().describe("Time since spindle warmup (minutes)"),
  productionShift: z.enum(["day", "afternoon", "night", "weekend"]).describe("Production shift"),
});

const FullEnvironmentSchema = z.object({
  timestamp: z.string().describe("ISO-8601 timestamp"),
  temperature: TemperatureEnvSchema,
  humidity: HumidityEnvSchema,
  vibration: VibrationEnvSchema,
  fluids: FluidEnvSchema,
  electrical: ElectricalEnvSchema,
  temporal: TemporalFactorsSchema,
});

export const EnvCalculateCorrectionsSchema = z.object({
  environment: FullEnvironmentSchema.describe("Full shop environment snapshot"),
  parameters: z.array(z.object({
    name: z.string().describe("Machining parameter name (e.g. z_axis_position)"),
    nominalValue: z.number().describe("Nominal parameter value"),
    unit: z.string().describe("Unit of the parameter"),
  })).describe("Parameters to calculate environmental corrections for"),
});

export const EnvAssessRisksSchema = z.object({
  environment: FullEnvironmentSchema.describe("Full shop environment snapshot"),
});

export const EnvOptimalWindowSchema = z.object({
  environment: FullEnvironmentSchema.describe("Full shop environment snapshot"),
});

export const EnvRecordSchema = z.object({
  environment: FullEnvironmentSchema.describe("Environment snapshot to record for trend analysis"),
});

export const EnvTrendsSchema = z.object({
  hours: z.number().optional().describe("Trend window in hours (default 4)"),
});

export const EnvAddCoefficientSchema = z.object({
  parameter: z.string().describe("Affected machining parameter name"),
  factor: z.string().describe("Environmental factor name"),
  sensitivity: z.number().describe("Change per unit (sensitivity coefficient)"),
  unit: z.string().describe("Unit of sensitivity (e.g. µm/°C)"),
  direction: z.enum(["positive", "negative", "nonlinear"]).describe("Effect direction"),
  threshold: z.number().optional().describe("Factor value where effect becomes significant"),
  saturation: z.number().optional().describe("Factor value where effect saturates"),
  confidence: z.number().min(0).max(1).describe("Confidence in this coefficient (0–1)"),
  source: z.string().describe("Calibration source (e.g. machine_calibration, literature, empirical)"),
});

// ─── ProcessIntelligenceRouterEngine ─────────────────────────────────────────

export const RouterRouteSchema = z.object({
  intent: z.string().min(1).describe("Process intent string (e.g. 'optimize roughing for P-material')"),
  process: z.enum(["mill", "lathe", "wedm"]).optional().describe("Explicit process override"),
  features: z.array(z.string()).optional().describe("Feature list context (e.g. ['pocket', 'bore'])"),
  material: z.string().optional().describe("Material identifier context"),
});

export const RouterFullPipelineSchema = z.object({
  intent: z.string().min(1).describe("Process intent string"),
  process: z.enum(["mill", "lathe", "wedm"]).optional().describe("Explicit process override"),
  features: z.array(z.string()).optional().describe("Feature list context"),
  material: z.string().optional().describe("Material identifier context"),
  feature_request: z.record(z.string(), z.unknown()).optional().describe("CrossProcessFeatureBridge request body (opt-in)"),
  sf_request: z.record(z.string(), z.unknown()).optional().describe("CrossProcessSpeedFeedBridge request body (opt-in)"),
  post_request: z.record(z.string(), z.unknown()).optional().describe("CrossProcessPostBridge request body (opt-in)"),
  ai_request: z.record(z.string(), z.unknown()).optional().describe("CrossProcessAIBridge orchestrate request body (opt-in)"),
  stages: z.array(z.enum(["classify", "feature", "speedfeed", "post", "ai"])).optional()
    .describe("Restrict to subset of pipeline stages (default: all 5)"),
  force_ai_dry_run: z.boolean().optional().describe("Force AI stage into dry_run mode"),
});

export const RouterOrchestrateSchema = z.object({
  schemaVersion: z.literal("1.0.0").describe("Domain AGI contract schema version — must be '1.0.0'"),
  domain: z.enum(["mill", "lathe", "wedm"]).describe("Target domain for AGI dispatch"),
  action: z.string().min(1).describe("Domain action verb (e.g. roughing, turning, rough_cut)"),
  material: z.string().min(1).describe("Workpiece material designation (e.g. 1018-steel, Ti-6Al-4V)"),
  constraints: z.record(z.string(), z.unknown()).describe("Job-level constraints — pass {} for none"),
  features: z.array(z.record(z.string(), z.unknown())).optional().describe("Geometric feature references"),
  blueprint: z.record(z.string(), z.unknown()).optional().describe("Blueprint reference (path and/or sha256)"),
  machine: z.record(z.string(), z.unknown()).optional().describe("Machine reference"),
  consensusRequired: z.boolean().optional().describe("Require consensus_decide routing (default false)"),
});

// ─── ProcessRobustnessEngine ──────────────────────────────────────────────────

export const RobustnessComputeSchema = z.object({
  nominal: z.object({
    cutting_speed_m_min: z.number().describe("Cutting speed (m/min)"),
    feed_per_tooth_mm: z.number().describe("Feed per tooth (mm)"),
    axial_depth_mm: z.number().describe("Axial depth of cut (mm)"),
    radial_depth_mm: z.number().describe("Radial depth of cut (mm)"),
    tool_diameter_mm: z.number().describe("Tool diameter (mm)"),
    flute_count: z.number().int().describe("Number of flutes"),
  }).describe("Nominal cutting parameters"),
  material: z.object({
    iso_group: z.enum(["P", "M", "K", "N", "S", "H"]).describe("ISO material group"),
  }).describe("Workpiece material"),
  noise_factors: z.object({
    hardness_variation_pct: z.number().optional().describe("Hardness variation (%, default ±10)"),
    wear_range_vb_mm: z.tuple([z.number(), z.number()]).optional()
      .describe("Wear range [min_vb, max_vb] in mm (default [0.05, 0.25])"),
    runout_range_um: z.tuple([z.number(), z.number()]).optional()
      .describe("Runout range [min, max] in µm (default [3, 15])"),
    temp_drift_c: z.number().optional().describe("Temperature drift (°C, default 5)"),
  }).describe("Noise factor ranges for perturbation analysis"),
  weights: z.object({
    force: z.number().min(0).max(1).describe("Force importance weight (0–1)"),
    roughness: z.number().min(0).max(1).describe("Roughness importance weight (0–1)"),
    tool_life: z.number().min(0).max(1).describe("Tool life importance weight (0–1)"),
    dimension: z.number().min(0).max(1).describe("Dimension importance weight (0–1)"),
  }).optional().describe("Relative importance weights (default: force=0.3, roughness=0.3, life=0.25, dim=0.15)"),
  tolerance_mm: z.number().optional().describe("Part tolerance (mm, default 0.02)"),
});

// ─── ProcessValidationIQOQPQEngine ────────────────────────────────────────────

export const ValidationValidateSchema = z.object({
  process_name: z.string().min(1).describe("Process name being validated"),
  iq_items: z.array(z.object({
    id: z.string().describe("IQ item ID"),
    description: z.string().describe("IQ item description"),
    status: z.enum(["pass", "fail", "not_applicable"]).describe("IQ item status"),
    evidence: z.string().optional().describe("Supporting evidence reference"),
  })).describe("Installation Qualification checklist items"),
  oq_runs: z.array(z.object({
    run_id: z.string().describe("OQ run identifier"),
    condition: z.string().describe("Parameter set name (e.g. worst_case_high_speed)"),
    pass: z.boolean().describe("Run completed within spec"),
    measured_ctq: z.record(z.string(), z.number()).optional().describe("Measured CTQ values"),
  })).describe("Operational Qualification runs"),
  pq_runs: z.array(z.object({
    run_id: z.string().describe("PQ run identifier"),
    nominal: z.boolean().describe("Run at nominal conditions"),
    ctq: z.record(z.string(), z.number()).describe("Critical-to-Quality metric values"),
    spec: z.record(z.string(), z.tuple([z.number(), z.number()])).optional()
      .describe("Spec limits per CTQ: { key: [lsl, usl] }"),
  })).describe("Performance Qualification runs"),
  min_oq_replicates: z.number().int().min(1).optional().describe("Minimum OQ replicates per condition (default 3)"),
  min_pq_runs: z.number().int().min(1).optional().describe("Minimum consecutive PQ runs (default 3)"),
  target_cpk: z.number().optional().describe("Target Cpk (default 1.33)"),
});

// ─── ProcessVariabilityIntegrationEngine ─────────────────────────────────────

export const VariabilityAnalyzeSchema = z.object({
  nominal_mm: z.number().describe("Nominal dimension (mm)"),
  usl_mm: z.number().describe("Upper specification limit (mm)"),
  lsl_mm: z.number().describe("Lower specification limit (mm)"),
  cutting_speed_m_min: z.number().describe("Cutting speed (m/min)"),
  feed_mm_rev: z.number().describe("Feed per revolution (mm/rev)"),
  depth_of_cut_mm: z.number().describe("Depth of cut (mm)"),
  tool_diameter_mm: z.number().describe("Tool diameter (mm)"),
  tool_overhang_mm: z.number().describe("Tool overhang (mm)"),
  tool_material_E_GPa: z.number().optional().describe("Tool Young's modulus (GPa, default 600)"),
  num_flutes: z.number().int().optional().describe("Number of flutes (default 4)"),
  material_type: z.string().optional().describe("Material type identifier"),
  hardness_HRC: z.number().optional().describe("Material hardness (HRC)"),
  specific_cutting_force_N_mm2: z.number().optional().describe("Specific cutting force kc1.1 (N/mm²)"),
  machine_repeatability_um: z.number().optional().describe("Machine repeatability (µm, default 3)"),
  spindle_runout_um: z.number().optional().describe("Spindle runout (µm, default 2)"),
  ambient_temp_amplitude_C: z.number().optional().describe("Ambient temperature amplitude (°C, default 2)"),
  thermal_coeff_um_per_C: z.number().optional().describe("Thermal coefficient (µm/°C, default 5)"),
  taylor_n: z.number().optional().describe("Taylor exponent n (default 0.25)"),
  taylor_C: z.number().optional().describe("Taylor constant C (default 300)"),
  tool_change_interval: z.number().int().optional().describe("Tool change interval (parts, default 200)"),
  production_qty: z.number().int().optional().describe("Production quantity (parts, default 100)"),
  force_cv_pct: z.number().optional().describe("Force coefficient of variation (%, default 8)"),
  speed_cv_pct: z.number().optional().describe("Speed CV% (default 3)"),
  feed_cv_pct: z.number().optional().describe("Feed CV% (default 3)"),
  depth_cv_pct: z.number().optional().describe("Depth CV% (default 5)"),
  diameter_cv_pct: z.number().optional().describe("Diameter CV% (default 1)"),
  overhang_cv_pct: z.number().optional().describe("Overhang CV% (default 3)"),
  modulus_cv_pct: z.number().optional().describe("Modulus CV% (default 2)"),
  hardness_cv_pct: z.number().optional().describe("Hardness CV% (default 5)"),
  mc_samples: z.number().int().min(10).max(100000).optional().describe("Monte Carlo samples (default 1000, max 100000)"),
});
