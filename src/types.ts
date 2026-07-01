/**
 * PRISM MCP Server Type Definitions
 * TypeScript interfaces for all data structures
 */

import type {
  IsoMaterialGroup, MaterialCategory, MaterialLayer,
  MachineType, MachineLayer, ControllerFamily,
  AlarmSeverity, AlarmCategory, ToolType, ToolMaterial,
  AgentTier, HookPattern, HookLevel, ResponseFormat,
  OptimizationTarget, OperationType, FormulaDomain,
  QualityComponent, SwarmPattern, WorkflowType, ScriptCategory
} from "./constants.js";

// ============================================================================
// MATERIAL TYPES
// ============================================================================

export interface MaterialDesignation {
  uns?: string;
  aisi_sae?: string;
  din?: string;
  en?: string;
  jis?: string;
  trade_names?: string[];
}

export interface MaterialCondition {
  heat_treatment?: "annealed" | "normalized" | "quenched" | "tempered" | "solution_treated" | "aged" | "as_rolled" | "cold_worked";
  temper?: string;
  hardness_state?: string;
}

export interface MaterialPhysical {
  density: number;
  melting_point?: number;
  melting_range_min?: number;
  melting_range_max?: number;
  boiling_point?: number;
  liquidus_temperature?: number;
  solidus_temperature?: number;
  latent_heat_fusion?: number;
  specific_heat?: number;
  thermal_conductivity?: number;
  thermal_expansion?: number;
  electrical_resistivity?: number;
  magnetic_permeability?: number;
  poisson_ratio?: number;
  poissons_ratio?: number;  // legacy alias
  elastic_modulus?: number;
  shear_modulus?: number;
  bulk_modulus?: number;
}

export interface MaterialHardness {
  brinell?: number;
  rockwell_b?: number;
  rockwell_c?: number;
  vickers?: number;
}

export interface MaterialStrengthRange {
  typical?: number;
  min?: number;
  max?: number;
}

export interface MaterialMechanical {
  hardness: MaterialHardness;
  tensile_strength?: number | MaterialStrengthRange;
  yield_strength?: number | MaterialStrengthRange;
  elongation?: number;
  reduction_of_area?: number;
  elastic_modulus?: number;
  shear_modulus?: number;
  fatigue_strength?: number;
  impact_strength?: number;
  fracture_toughness?: number;
  compressive_strength?: number;
  true_fracture_stress?: number;
  true_fracture_strain?: number;
  strain_rate_sensitivity?: number;
  shear_strength?: number;
}

export interface MaterialThermal {
  thermal_conductivity: number;
  thermal_diffusivity?: number;
  thermal_expansion?: number;
  max_service_temp?: number;
  min_service_temp?: number;
  cutting_temperature_factor?: number;
  heat_partition_ratio?: number;
  thermal_softening_onset?: number;
  hot_hardness_retention?: "poor" | "low" | "moderate" | "good" | "excellent";
  cryogenic_machinability?: "poor" | "fair" | "good" | "excellent" | "not_applicable";
}

export interface MaterialSpeedRange {
  carbide_min?: number;
  carbide_max?: number;
  hss_min?: number;
  hss_max?: number;
  ceramic_min?: number;
  ceramic_max?: number;
}

export interface MaterialMachining {
  machinability_rating: number;
  recommended_speed_range?: MaterialSpeedRange;
  chip_formation?: "continuous" | "segmented" | "discontinuous" | "built_up_edge" | "serrated";
  surface_finish_achievable?: number;
  work_hardening_tendency?: "none" | "low" | "moderate" | "high" | "severe";
  abrasiveness?: "none" | "low" | "moderate" | "high" | "extreme";
  recommended_coolant?: "flood" | "mist" | "dry" | "mql" | "cryogenic" | "high_pressure";
  tool_material_preference?: ToolMaterial[];
}

export interface KienzleCoefficients {
  kc1_1: number;
  mc: number;
  kc1_1_milling?: number;
  mc_milling?: number;
  kc1_1_drilling?: number;
  mc_drilling?: number;
  kc1_1_boring?: number;
  mc_boring?: number;
  kc1_1_reaming?: number;
  mc_reaming?: number;
  kc1_1_axial?: number;
  mc_axial?: number;
  gamma_correction?: number;
  wear_correction?: number;
  speed_correction?: number;
}

export interface JohnsonCookParams {
  A: number;
  B: number;
  n: number;
  C: number;
  m: number;
  T_melt: number;
  T_ref: number;
  epsilon_dot_ref: number;
}

export interface TaylorParams {
  C: number;
  n: number;
  C_carbide?: number;
  n_carbide?: number;
  C_ceramic?: number;
  n_ceramic?: number;
  C_cbn?: number;
  n_cbn?: number;
  C_hss?: number;
  n_hss?: number;
  reference_tool_life?: number;
  reference_speed?: number;
}

export interface TribologyParams {
  friction_coefficient?: number;
  friction_coefficient_dry?: number;
  friction_coefficient_flood?: number;
  friction_coefficient_mql?: number;
  friction_coefficient_lubricated?: number;
  wear_coefficient?: number;
  adhesion_tendency?: "none" | "low" | "moderate" | "high" | "severe";
  abrasiveness?: "none" | "low" | "moderate" | "high" | "extreme";
  galling_tendency?: "none" | "low" | "moderate" | "high" | "severe";
  crater_wear_coefficient?: number;
  flank_wear_coefficient?: number;
}

export interface ChipFormationParams {
  chip_type?: "continuous" | "continuous_with_bue" | "segmented" | "discontinuous" | "serrated" | "shear_localized";
  chip_breaking?: "excellent" | "good" | "fair" | "poor" | "very_poor";
  shear_angle?: number;
  chip_compression_ratio?: number;
  built_up_edge_tendency?: "none" | "low" | "moderate" | "high" | "severe";
  segmentation_frequency?: "none" | "low" | "moderate" | "high";
  min_chip_thickness?: number;
  edge_radius_sensitivity?: "low" | "moderate" | "high" | "very_high";
}

export interface ThermalMachiningParams {
  thermal_diffusivity?: number;
  heat_partition_coefficient?: number;
  critical_temperature?: number;
  recrystallization_temperature?: number;
  phase_transformation_temperature?: number;
  maximum_cutting_temperature?: number;
  emissivity?: number;
  heat_transfer_coefficient?: number;
}

export interface SurfaceIntegrityParams {
  residual_stress_tendency?: "compressive" | "neutral" | "tensile" | "variable";
  work_hardening_depth?: number;
  white_layer_risk?: "none" | "low" | "moderate" | "high";
  surface_roughness_achievable?: number;
  burr_formation_tendency?: "none" | "low" | "moderate" | "high" | "severe";
  microstructure_sensitivity?: "none" | "low" | "moderate" | "high";
  minimum_uncut_chip_thickness?: number;
  ploughing_force_coefficient?: number;
}

export interface MachinabilityParams {
  aisi_rating?: number;
  relative_to_1212?: number;
  machinability_index?: number;
  power_constant?: number;
  unit_power?: number;
}

export interface CuttingRecommendationBlock {
  speed_roughing?: number;
  speed_finishing?: number;
  feed_roughing?: number;
  feed_finishing?: number;
  feed_per_tooth_roughing?: number;
  feed_per_tooth_finishing?: number;
  doc_roughing?: number;
  doc_finishing?: number;
  woc_roughing?: number;
  woc_finishing?: number;
  speed?: number;
  feed_per_rev?: number;
  peck_depth_ratio?: number;
  coolant_through?: boolean;
}

export interface CuttingRecommendations {
  turning?: CuttingRecommendationBlock;
  milling?: CuttingRecommendationBlock;
  drilling?: CuttingRecommendationBlock;
  tool_material?: {
    recommended_grade?: string;
    coating_recommendation?: string;
    geometry_recommendation?: string;
  };
  coolant?: {
    type?: string;
    pressure?: number;
    flow_rate?: number;
  };
}

export interface SurfaceParams {
  achievable_ra_turning?: number;
  achievable_ra_milling?: number;
  achievable_ra_grinding?: number;
  surface_integrity_sensitivity?: "low" | "moderate" | "high" | "very_high";
  white_layer_risk?: "none" | "low" | "moderate" | "high";
}

export interface ProcessSpecificParams {
  grinding_ratio?: number;
  edm_machinability?: number;
  laser_absorptivity?: number;
  weldability_rating?: "excellent" | "good" | "fair" | "poor" | "not_recommended";
}

export interface WeldabilityParams {
  rating?: "excellent" | "good" | "fair" | "poor" | "not_recommended";
  preheat_temperature?: number;
  postweld_treatment?: string;
}

export interface MaterialStatistics {
  dataPoints?: number;
  confidenceLevel?: number;
  standardDeviation?: Record<string, number>;
  sources?: string[];
  lastValidated?: string;
  reliability?: string;
}

export interface ConfidenceEntry {
  confidence?: "VERIFIED" | "HIGH" | "SUBCATEGORY_SPECIFIC" | "MEDIUM_HIGH" | "MEDIUM" | "PARAMETRIC_MODEL" | "LOW";
  source?: string;
}

export interface AccuracyMetadata {
  pass?: string;
  date?: string;
  alloy_match?: string;
  match_method?: string;
  match_quality?: number;
  subcategory_resolved?: string;
  overall_confidence?: string;
  has_composition?: boolean;
  v2_corrections?: number;
  johnson_cook?: ConfidenceEntry;
  kienzle?: ConfidenceEntry;
  taylor?: ConfidenceEntry;
  chip_formation?: ConfidenceEntry;
  cutting_recommendations?: ConfidenceEntry;
  tribology?: ConfidenceEntry;
  surface_integrity?: ConfidenceEntry;
  thermal_machining?: ConfidenceEntry;
  thermal_conductivity?: ConfidenceEntry;
  physical_properties?: ConfidenceEntry;
}

export interface VerificationMetadata {
  session?: number;
  date?: string;
  method?: string;
  params?: number;
  prior_method?: string | null;
  prior_params?: number | null;
}

export interface MaterialMetadata {
  created?: string;
  updated?: string;
  version?: string;
  layer: MaterialLayer;
  confidence?: number;
  validation_status?: "unvalidated" | "partial" | "validated" | "verified";
}

export interface Material {
  // Primary identifiers
  id: string;
  material_id?: string;  // Alias for id
  name: string;

  // Classification
  iso_group: IsoMaterialGroup;
  category: MaterialCategory;
  subcategory?: string;
  material_type?: string;
  iso_p_equivalent?: string;

  // Classification object (alternative structure)
  classification?: {
    iso_group?: string;
    category?: string;
    subcategory?: string;
  };

  // Designations
  designation?: MaterialDesignation;
  common_names?: string[];
  condition?: MaterialCondition | string;

  // Core properties
  physical: MaterialPhysical;
  mechanical: MaterialMechanical;
  thermal: MaterialThermal;
  machining: MaterialMachining;

  // Advanced coefficients
  kienzle?: KienzleCoefficients;
  johnson_cook?: JohnsonCookParams;
  taylor?: TaylorParams;
  tribology?: TribologyParams;

  // Extended machining characteristics (v10 deep accuracy)
  chip_formation?: ChipFormationParams;
  thermal_machining?: ThermalMachiningParams;
  surface_integrity?: SurfaceIntegrityParams;
  machinability?: MachinabilityParams;
  cutting_recommendations?: CuttingRecommendations;
  surface?: SurfaceParams;
  process_specific?: ProcessSpecificParams;
  weldability?: WeldabilityParams;

  // Chemistry / Composition
  chemistry?: Record<string, number>;
  composition?: Record<string, number>;

  // Data quality
  data_quality?: string;
  data_sources?: string[];
  statistics?: MaterialStatistics;
  standards?: Record<string, string>;
  param_count?: number;

  // Usage
  applications?: string[];
  notes?: string;
  sources?: string[];

  // Metadata
  metadata: MaterialMetadata;
  _verified?: VerificationMetadata;
  _accuracy?: AccuracyMetadata;
}

// ============================================================================
// MACHINE TYPES
// ============================================================================

export interface MachineController {
  manufacturer: ControllerFamily;
  model: string;
  version?: string;
  options?: string[];
}

export interface MachineEnvelope {
  x: number;
  y: number;
  z: number;
  a?: number;
  b?: number;
  c?: number;
  table_size_x?: number;
  table_size_y?: number;
  max_workpiece_weight?: number;
  max_workpiece_diameter?: number;
  max_workpiece_length?: number;
}

export interface MachineSpindle {
  max_rpm: number;
  min_rpm?: number;
  power: number;
  power_peak?: number;
  torque?: number;
  torque_peak?: number;
  taper?: "BT30" | "BT40" | "BT50" | "CAT40" | "CAT50" | "HSK-A63" | "HSK-A100" | "HSK-E40" | "HSK-F63";
  bearing_type?: string;
  cooling?: "air" | "oil" | "oil_air" | "water";
  through_spindle_coolant?: boolean;
  through_spindle_coolant_pressure?: number;
}

export interface MachineAxes {
  linear_axes: number;
  rotary_axes: number;
  simultaneous_axes?: number;
  x_rapid?: number;
  y_rapid?: number;
  z_rapid?: number;
  a_rapid?: number;
  b_rapid?: number;
  c_rapid?: number;
  positioning_accuracy?: number;
  repeatability?: number;
}

export interface MachineToolChanger {
  type?: "arm" | "turret" | "chain" | "drum" | "rack" | "rotary";
  capacity: number;
  max_tool_diameter?: number;
  max_tool_length?: number;
  max_tool_weight?: number;
  change_time?: number;
  chip_to_chip_time?: number;
}

export interface MachineCoolant {
  tank_capacity?: number;
  pump_pressure?: number;
  high_pressure_option?: boolean;
  high_pressure_value?: number;
  mist_coolant?: boolean;
  chip_conveyor?: "none" | "screw" | "hinge_belt" | "scraper" | "auger";
}

export interface MachinePhysical {
  footprint_length?: number;
  footprint_width?: number;
  height?: number;
  weight?: number;
  power_requirement?: number;
  air_requirement?: number;
}

export interface MachineKinematics {
  type?: "serial" | "parallel" | "hybrid";
  configuration?: string;
  pivot_point?: { x: number; y: number; z: number };
  home_position?: { x: number; y: number; z: number };
}

export interface MachinePostProcessor {
  default_post?: string;
  compatible_posts?: string[];
  special_codes?: Record<string, string>;
}

export interface MachineMetadata {
  layer: MachineLayer;
  cad_file?: string;
  created?: string;
  updated?: string;
  source?: string;
}

export interface Machine {
  id: string;
  manufacturer: string;
  model: string;
  series?: string;
  type: MachineType;
  subtype?: string;
  controller: MachineController;
  envelope: MachineEnvelope;
  spindle: MachineSpindle;
  axes?: MachineAxes;
  tool_changer?: MachineToolChanger;
  coolant?: MachineCoolant;
  physical?: MachinePhysical;
  kinematics?: MachineKinematics;
  options?: string[];
  post_processor?: MachinePostProcessor;
  metadata: MachineMetadata;
}

// ============================================================================
// TOOL TYPES
// ============================================================================

export interface ToolCoating {
  type?: "none" | "TiN" | "TiCN" | "TiAlN" | "AlTiN" | "AlCrN" | "diamond" | "DLC" | "multi_layer";
  layers?: number;
  thickness?: number;
}

export interface ToolGeometry {
  diameter: number;
  shank_diameter?: number;
  overall_length?: number;
  flute_length?: number;
  cutting_length?: number;
  flutes?: number;
  helix_angle?: number;
  rake_angle?: number;
  clearance_angle?: number;
  corner_radius?: number;
  point_angle?: number;
  nose_radius?: number;
}

export interface ToolCuttingData {
  max_rpm?: number;
  recommended_sfm_min?: number;
  recommended_sfm_max?: number;
  feed_per_tooth_min?: number;
  feed_per_tooth_max?: number;
  max_doc?: number;
  max_woc?: number;
  max_chipload?: number;
}

export interface ToolApplication {
  material_groups?: IsoMaterialGroup[];
  operations?: string[];
  coolant_required?: boolean;
  through_tool_coolant?: boolean;
}

export interface ToolMetadata {
  created?: string;
  updated?: string;
  source?: string;
}

export interface Tool {
  id: string;
  manufacturer?: string;
  part_number?: string;
  type: ToolType;
  subtype?: string;
  material: ToolMaterial;
  coating?: ToolCoating;
  geometry: ToolGeometry;
  cutting_data?: ToolCuttingData;
  application?: ToolApplication;
  holder_compatibility?: string[];
  metadata?: ToolMetadata;
}

// ============================================================================
// ALARM TYPES
// ============================================================================

export interface AlarmFixStep {
  step: number;
  action: string;
  notes?: string;
}

export interface AlarmMetadata {
  source?: string;
  verified?: boolean;
  last_updated?: string;
}

export interface Alarm {
  alarm_id: string;
  code: string;
  name: string;
  controller_family: ControllerFamily;
  controller_models?: string[];
  category: AlarmCategory;
  severity: AlarmSeverity;
  description: string;
  causes?: string[];
  symptoms?: string[];
  quick_fix?: string;
  detailed_fix?: AlarmFixStep[];
  requires_power_cycle?: boolean;
  requires_service?: boolean;
  safety_critical?: boolean;
  related_alarms?: string[];
  parameters_to_check?: string[];
  diagnostic_codes?: string[];
  metadata?: AlarmMetadata;
}

// ============================================================================
// FIXTURE TYPES
// ============================================================================

export interface FixtureDimensions {
  length?: number;
  width?: number;
  height?: number;
  jaw_width?: number;
  max_opening?: number;
  min_opening?: number;
}

export interface FixtureCapacity {
  max_workpiece_weight?: number;
  max_workpiece_diameter?: number;
  max_workpiece_length?: number;
}

export interface FixtureAccuracy {
  repeatability?: number;
  parallelism?: number;
  perpendicularity?: number;
}

export interface FixtureCompatibility {
  machine_types?: string[];
  table_slot_pattern?: string;
  mounting_holes?: string;
}

export interface Fixture {
  id: string;
  name?: string;
  manufacturer?: string;
  type: "vise" | "chuck" | "collet" | "faceplate" | "angle_plate" | "v_block" | "magnetic" | "vacuum" | "tombstone" | "pallet" | "custom";
  subtype?: string;
  clamping_method?: "manual" | "hydraulic" | "pneumatic" | "vacuum" | "magnetic" | "mechanical";
  clamping_force: number;
  dimensions?: FixtureDimensions;
  capacity?: FixtureCapacity;
  accuracy?: FixtureAccuracy;
  compatibility?: FixtureCompatibility;
  metadata?: { created?: string; source?: string };
}

// ============================================================================
// FORMULA TYPES
// ============================================================================

export interface FormulaInput {
  name: string;
  symbol: string;
  unit: string;
  description?: string;
  range_min?: number;
  range_max?: number;
  default?: number;
}

export interface FormulaOutput {
  name: string;
  symbol: string;
  unit: string;
  description?: string;
}

export interface FormulaConstant {
  name: string;
  symbol: string;
  value: number;
  unit?: string;
}

export interface FormulaExample {
  inputs: Record<string, number>;
  outputs: Record<string, number>;
  description?: string;
}

export interface Formula {
  id: string;
  name: string;
  domain: FormulaDomain;
  category?: string;
  equation: string;
  equation_code?: string;
  inputs: FormulaInput[];
  outputs: FormulaOutput[];
  constants?: FormulaConstant[];
  assumptions?: string[];
  limitations?: string[];
  accuracy?: string;
  references?: string[];
  related_formulas?: string[];
  example?: FormulaExample;
  metadata?: { source?: string; verified?: boolean; skill?: string };
}

// ============================================================================
// AGENT TYPES
// ============================================================================

export interface AgentCapabilities {
  [key: string]: number;
}

export interface AgentInputFormat {
  required?: string[];
  optional?: string[];
}

export interface AgentOutputFormat {
  type: "json" | "markdown" | "code" | "text";
  schema?: string;
}

export interface AgentSynergy {
  agent: string;
  synergy_score: number;
}

export interface Agent {
  id: string;
  name: string;
  tier: AgentTier;
  role: string;
  description?: string;
  expertise?: string[];
  system_prompt: string;
  skills_used?: string[];
  formulas_used?: string[];
  hooks_triggered?: string[];
  capabilities?: AgentCapabilities;
  input_format?: AgentInputFormat;
  output_format?: AgentOutputFormat;
  cost?: number;
  max_tokens?: number;
  temperature?: number;
  status?: "ACTIVE" | "DEPRECATED" | "NEW" | "TESTING";
  dependencies?: string[];
  conflicts_with?: string[];
  synergies?: AgentSynergy[];
  metadata?: { created?: string; updated?: string; version?: string };
}

// ============================================================================
// HOOK TYPES
// ============================================================================

export interface HookTrigger {
  condition?: string;
  event?: string;
  automatic?: boolean;
}

export interface HookAction {
  type: "compute" | "validate" | "transform" | "block" | "alert";
  function?: string;
  description?: string;
}

export interface HookIO {
  name: string;
  type: string;
  source?: string;
  destination?: string;
}

export interface Hook {
  id: string;
  name: string;
  pattern: HookPattern;
  level: HookLevel;
  trigger: HookTrigger;
  action: HookAction;
  inputs?: HookIO[];
  outputs?: HookIO[];
  quality_component?: QualityComponent;
  threshold?: number;
  blocking?: boolean;
  skill_source?: string;
  related_hooks?: string[];
  metadata?: { created?: string; version?: string };
}

// ============================================================================
// WORKFLOW TYPES
// ============================================================================

export interface WorkflowStep {
  id: string;
  name?: string;
  type: "agent" | "script" | "hook" | "decision" | "parallel" | "wait";
  action: string;
  inputs?: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  condition?: string;
  on_success?: string;
  on_failure?: string;
  timeout_ms?: number;
  retry_count?: number;
}

export interface WorkflowHooks {
  on_start?: string[];
  on_step_complete?: string[];
  on_error?: string[];
  on_complete?: string[];
}

export interface WorkflowQualityGate {
  after_step: string;
  check: string;
  threshold: number;
}

export interface RalphConfig {
  iterations: number;
  validators: string[];
  convergence_threshold?: number;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  type: WorkflowType;
  steps: WorkflowStep[];
  entry_point: string;
  exit_points?: string[];
  variables?: Record<string, unknown>;
  hooks?: WorkflowHooks;
  quality_gates?: WorkflowQualityGate[];
  ralph_config?: RalphConfig;
  estimated_duration_ms?: number;
  max_parallel_agents?: number;
  status?: "active" | "draft" | "deprecated";
  metadata?: { created?: string; author?: string; version?: string };
}

// ============================================================================
// SCRIPT TYPES
// ============================================================================

export interface ScriptIO {
  name: string;
  type: string;
  required?: boolean;
  description?: string;
  path?: string;
}

export interface ScriptDependencies {
  python_packages?: string[];
  other_scripts?: string[];
  data_files?: string[];
}

export interface ScriptExecution {
  command?: string;
  timeout_ms?: number;
  requires_api?: boolean;
  parallel_safe?: boolean;
}

export interface Script {
  id: string;
  name: string;
  path: string;
  category: ScriptCategory;
  description?: string;
  purpose?: string;
  inputs?: ScriptIO[];
  outputs?: ScriptIO[];
  dependencies?: ScriptDependencies;
  execution?: ScriptExecution;
  status?: "active" | "deprecated" | "experimental";
  metadata?: { created?: string; author?: string; lines?: number };
}

// ============================================================================
// RESPONSE TYPES
// ============================================================================

export interface PaginatedResponse<T> {
  success: boolean;
  total: number;
  count: number;
  offset: number;
  items: T[];
  has_more: boolean;
  next_offset?: number;
}

export interface ToolResult {
  success: boolean;
  error?: string;
  data?: unknown;
}

export interface QualityScore {
  R: number;
  C: number;
  P: number;
  S: number;
  L: number;
  omega: number;
  passed: boolean;
}

export interface SpeedFeedResult {
  success: boolean;
  rpm: number;
  feed_rate: number;
  feed_per_tooth: number;
  surface_speed: number;
  mrr: number;
  power_required: number;
  tool_life_estimate: number;
  warnings: string[];
}

export interface CuttingForceResult {
  success: boolean;
  Fc: number;
  Ff: number;
  Fp: number;
  power: number;
}

// ============================================================================
// STATE TYPES
// ============================================================================

export interface SessionState {
  version: string;
  lastUpdated: string;
  currentSession: {
    id: string;
    status: "IN_PROGRESS" | "COMPLETE" | "BLOCKED";
    phase: string;
    sessionNumber: string;
    progress: Record<string, unknown>;
  };
  quickResume: string;
}
