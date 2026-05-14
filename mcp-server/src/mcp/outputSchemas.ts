/**
 * MCP Output Schemas for PRISM Dispatchers
 *
 * Auto-generates JSON Schema from Zod definitions for the MCP `outputSchema`
 * field on tool registration. Allows MCP clients to validate and type-check
 * tool results at the protocol level.
 *
 * Coverage: calcDispatcher (15+ actions), camDispatcher (5+ actions),
 * safetyDispatcher (3+ actions), businessDispatcher (5+ actions),
 * qualityDispatcher (5+ actions), simulationDispatcher (3+ actions).
 *
 * @module mcp/outputSchemas
 * @see https://modelcontextprotocol.io/specification/2025-11-25/server/tools#output-schemas
 */

import { z } from "zod";

// ============================================================================
// REUSABLE OUTPUT FIELD SCHEMAS
// ============================================================================

const optNum = z.number().optional();
const optStr = z.string().optional();
const optBool = z.boolean().optional();

/** Common warning entry in output arrays */
const WarningEntry = z.object({
  code: z.string().optional(),
  message: z.string(),
  severity: z.enum(["info", "warning", "critical"]).optional(),
}).passthrough();

/** Common metadata attached to most results */
const ResultMeta = z.object({
  action: z.string(),
  engine: z.string().optional(),
  compute_ms: z.number().optional(),
  _slimmed: z.boolean().optional(),
}).passthrough();

// ============================================================================
// CALC DISPATCHER OUTPUT SCHEMAS
// ============================================================================

/** speed_feed action output */
export const SpeedFeedResultSchema = z.object({
  cutting_speed: z.number().describe("Cutting speed Vc in m/min"),
  spindle_speed: z.number().describe("Spindle RPM"),
  feed_per_tooth: z.number().describe("Feed per tooth fz in mm"),
  feed_rate: z.number().describe("Table feed vf in mm/min"),
  axial_depth: optNum.describe("Axial depth of cut ap in mm"),
  radial_depth: optNum.describe("Radial depth of cut ae in mm"),
  mrr: optNum.describe("Material removal rate in cm3/min"),
  power_kW: optNum.describe("Required spindle power in kW"),
  torque_Nm: optNum.describe("Required spindle torque in Nm"),
  force_N: optNum.describe("Estimated cutting force in N"),
  warnings: z.array(WarningEntry).optional(),
  is_safe: optBool,
}).passthrough();

/** cutting_force action output */
export const ForceResultSchema = z.object({
  Fc: z.number().describe("Main cutting force in N"),
  Ff: optNum.describe("Feed force in N"),
  Fp: optNum.describe("Passive (radial) force in N"),
  Ft: optNum.describe("Resultant total force in N"),
  torque: optNum.describe("Spindle torque in Nm"),
  power: optNum.describe("Cutting power in kW"),
  kc: optNum.describe("Specific cutting force in N/mm2"),
  warnings: z.array(WarningEntry).optional(),
  is_safe: optBool,
}).passthrough();

/** tool_life action output */
export const ToolLifeResultSchema = z.object({
  tool_life_minutes: z.number().describe("Predicted tool life in minutes"),
  parts_count: optNum.describe("Estimated parts per tool"),
  wear_rate: optNum.describe("Wear rate in um/min"),
  confidence: optNum.describe("Confidence level 0-1"),
  wear_model: optStr.describe("Model used: taylor, usui, takeyama-murata"),
  taylor_C: optNum.describe("Taylor constant C"),
  taylor_n: optNum.describe("Taylor exponent n"),
  cost_per_part: optNum.describe("Tool cost per part"),
  warnings: z.array(WarningEntry).optional(),
  is_safe: optBool,
}).passthrough();

/** surface_finish action output */
export const SurfaceFinishResultSchema = z.object({
  Ra: z.number().describe("Arithmetic average roughness Ra in um"),
  Rz: optNum.describe("Mean peak-to-valley Rz in um"),
  Rt: optNum.describe("Maximum peak-to-valley Rt in um"),
  theoretical_Ra: optNum.describe("Theoretical Ra from geometry alone"),
  limiting_factor: optStr.describe("What limits finish: tool_nose, feed, vibration, BUE"),
  warnings: z.array(WarningEntry).optional(),
  is_safe: optBool,
}).passthrough();

/** power action output */
export const PowerResultSchema = z.object({
  power: z.number().describe("Required cutting power in kW"),
  torque: optNum.describe("Required torque in Nm"),
  safe: optBool.describe("Whether power is within machine capability"),
  utilization_pct: optNum.describe("Spindle power utilization %"),
  warnings: z.array(WarningEntry).optional(),
}).passthrough();

/** mrr action output */
export const MRRResultSchema = z.object({
  mrr: z.number().describe("Material removal rate in cm3/min"),
  feed_rate: optNum.describe("Feed rate in mm/min"),
  spindle_speed: optNum.describe("Spindle RPM"),
  warnings: z.array(WarningEntry).optional(),
}).passthrough();

/** deflection action output */
export const DeflectionResultSchema = z.object({
  static_deflection: z.number().describe("Static deflection in mm"),
  safe: optBool.describe("Whether deflection is within tolerance"),
  max_deflection_mm: optNum,
  safety_factor: optNum,
  warnings: z.array(WarningEntry).optional(),
}).passthrough();

/** thermal action output */
export const ThermalResultSchema = z.object({
  tool_temperature: z.number().describe("Tool temperature in C"),
  chip_temperature: optNum.describe("Chip temperature in C"),
  workpiece_temperature: optNum.describe("Workpiece temperature in C"),
  warnings: z.array(WarningEntry).optional(),
}).passthrough();

/** stability action output */
export const StabilityResultSchema = z.object({
  is_stable: z.boolean().describe("Whether cutting is chatter-free"),
  critical_depth: optNum.describe("Critical depth of cut in mm"),
  stability_margin: optNum.describe("Margin to instability boundary"),
  recommended_rpm: optNum.describe("Nearest stable RPM"),
  warnings: z.array(WarningEntry).optional(),
}).passthrough();

/** chip_load action output */
export const ChipLoadResultSchema = z.object({
  hex_mm: z.number().describe("Effective chip thickness hex in mm"),
  chip_load_ok: optBool.describe("Whether chip load is in acceptable range"),
  min_chip_mm: optNum,
  max_chip_mm: optNum,
  warnings: z.array(WarningEntry).optional(),
}).passthrough();

/** drilling_force action output */
export const DrillingForceResultSchema = z.object({
  Fc: z.number().describe("Cutting force in N"),
  Ff: z.number().describe("Feed/thrust force in N"),
  torque: z.number().describe("Drilling torque in Nm"),
  power: z.number().describe("Drilling power in kW"),
  warnings: z.array(WarningEntry).optional(),
  is_safe: optBool,
}).passthrough();

/** turning_force action output */
export const TurningForceResultSchema = z.object({
  tangential_force_Fc_N: z.object({ value: z.number() }).passthrough(),
  feed_force_Ff_N: z.object({ value: z.number() }).passthrough(),
  radial_force_Fp_N: z.object({ value: z.number() }).passthrough(),
  cutting_power_kW: z.object({ value: z.number() }).passthrough(),
  spindle_torque_Nm: z.object({ value: z.number() }).passthrough(),
  is_safe: optBool,
  warnings: z.array(WarningEntry).optional(),
}).passthrough();

/** wear_progression action output */
export const WearProgressionResultSchema = z.object({
  current_vb_mm: z.object({ value: z.number() }).passthrough(),
  wear_rate_um_per_min: z.object({ value: z.number() }).passthrough(),
  remaining_life_min: z.object({ value: z.number() }).passthrough(),
  wear_stage: z.string(),
  is_safe: optBool,
  warnings: z.array(WarningEntry).optional(),
}).passthrough();

/** cost_optimize action output */
export const CostOptimizeResultSchema = z.object({
  optimal_speed: z.number().describe("Optimal cutting speed in m/min"),
  cost_per_part: z.number().describe("Minimum cost per part"),
  tool_life_at_optimum: optNum,
  warnings: z.array(WarningEntry).optional(),
}).passthrough();

/** capability_predict action output */
export const CapabilityPredictResultSchema = z.object({
  cp: z.number().describe("Process capability Cp"),
  cpk: z.number().describe("Process capability Cpk"),
  sigma_total_um: optNum.describe("Total process sigma in um"),
  meets_target: optBool,
  parts_per_million_defect: optNum,
  top_contributor: optStr,
  warnings: z.array(WarningEntry).optional(),
}).passthrough();

/** stochastic_wear action output */
export const StochasticWearResultSchema = z.object({
  taylor_life: z.object({
    mean_min: z.number(),
    std_min: z.number(),
    weibull_beta: optNum,
  }).passthrough(),
  replacement_interval_p90: optNum,
  top_uncertainty_driver: optStr,
  warnings: z.array(WarningEntry).optional(),
}).passthrough();

// ============================================================================
// CAM DISPATCHER OUTPUT SCHEMAS
// ============================================================================

/** toolpath_generate action output */
export const ToolpathGenerateResultSchema = z.object({
  toolpath_id: optStr,
  strategy: z.string().describe("Selected machining strategy"),
  operations: z.array(z.object({
    type: z.string(),
    tool: optStr,
    passes: optNum,
    depth: optNum,
    stepover: optNum,
  }).passthrough()).optional(),
  cycle_time_min: optNum.describe("Estimated cycle time in minutes"),
  tool_changes: optNum,
  warnings: z.array(WarningEntry).optional(),
}).passthrough();

/** cam_strategy_recommend action output */
export const StrategyRecommendResultSchema = z.object({
  recommended: z.string().describe("Top recommended strategy name"),
  alternatives: z.array(z.object({
    strategy: z.string(),
    score: z.number(),
    reason: optStr,
  }).passthrough()).optional(),
  material_group: optStr,
  operation_type: optStr,
  warnings: z.array(WarningEntry).optional(),
}).passthrough();

/** post_process action output */
export const PostProcessResultSchema = z.object({
  gcode: z.string().describe("Generated G-code program"),
  controller: optStr.describe("Target controller dialect"),
  line_count: optNum,
  estimated_time_min: optNum,
  warnings: z.array(WarningEntry).optional(),
}).passthrough();

/** collision_check_full action output */
export const CollisionCheckResultSchema = z.object({
  safe: z.boolean().describe("Whether collision-free"),
  collisions: z.array(z.object({
    type: z.string(),
    location: optStr,
    severity: optStr,
  }).passthrough()).optional(),
  checked_components: optNum,
  warnings: z.array(WarningEntry).optional(),
}).passthrough();

/** cam_cycle_time_estimate action output */
export const CycleTimeResultSchema = z.object({
  total_minutes: z.number().describe("Total estimated cycle time"),
  cutting_minutes: optNum,
  rapid_minutes: optNum,
  tool_change_minutes: optNum,
  breakdown: z.array(z.object({
    operation: z.string(),
    minutes: z.number(),
  }).passthrough()).optional(),
  warnings: z.array(WarningEntry).optional(),
}).passthrough();

// ============================================================================
// SAFETY DISPATCHER OUTPUT SCHEMAS
// ============================================================================

/** safety_check / gcode_safety action output */
export const SafetyResultSchema = z.object({
  safe: z.boolean().describe("Overall safety verdict"),
  violations: z.array(z.object({
    rule_id: optStr,
    severity: z.enum(["info", "warning", "error", "critical"]),
    message: z.string(),
    line: optNum,
    recommendation: optStr,
  }).passthrough()).optional(),
  risk_level: z.enum(["low", "medium", "high", "critical"]).optional(),
  score: optNum.describe("Safety score 0-100"),
  recommendations: z.array(z.string()).optional(),
  warnings: z.array(WarningEntry).optional(),
}).passthrough();

/** spindle_protection action output */
export const SpindleProtectionResultSchema = z.object({
  safe: z.boolean(),
  max_force_N: optNum,
  max_torque_Nm: optNum,
  max_power_kW: optNum,
  utilization_pct: optNum,
  violations: z.array(z.string()).optional(),
  warnings: z.array(WarningEntry).optional(),
}).passthrough();

/** crash_detection action output */
export const CrashDetectionResultSchema = z.object({
  safe: z.boolean(),
  near_misses: z.array(z.object({
    line: optNum,
    clearance_mm: optNum,
    description: optStr,
  }).passthrough()).optional(),
  minimum_clearance_mm: optNum,
  warnings: z.array(WarningEntry).optional(),
}).passthrough();

// ============================================================================
// BUSINESS DISPATCHER OUTPUT SCHEMAS
// ============================================================================

/** quote_estimate action output */
export const QuoteResultSchema = z.object({
  material_cost: z.number().describe("Material cost in currency units"),
  labor_cost: z.number().describe("Labor cost"),
  machine_cost: optNum.describe("Machine time cost"),
  tooling_cost: optNum.describe("Tooling/consumable cost"),
  overhead: optNum.describe("Overhead allocation"),
  setup_cost: optNum.describe("Setup/fixturing cost"),
  secondary_ops_cost: optNum.describe("Secondary operations cost"),
  margin: optNum.describe("Profit margin applied"),
  total: z.number().describe("Total quoted price"),
  cycle_time_min: optNum.describe("Cycle time in minutes"),
  lead_time_days: optNum.describe("Estimated lead time in days"),
  confidence: optNum.describe("Quote confidence 0-1"),
  breakdown: z.record(z.string(), z.number()).optional(),
  warnings: z.array(WarningEntry).optional(),
}).passthrough();

/** costing_job_cost action output */
export const JobCostResultSchema = z.object({
  total_cost: z.number(),
  material_cost: z.number(),
  labor_cost: z.number(),
  machine_cost: optNum,
  overhead_cost: optNum,
  per_part_cost: optNum,
  quantity: optNum,
  warnings: z.array(WarningEntry).optional(),
}).passthrough();

/** financial_npv action output */
export const NPVResultSchema = z.object({
  npv: z.number().describe("Net present value"),
  irr: optNum.describe("Internal rate of return"),
  payback_years: optNum.describe("Payback period in years"),
  profitable: optBool,
  warnings: z.array(WarningEntry).optional(),
}).passthrough();

/** scheduling_single_machine action output */
export const ScheduleResultSchema = z.object({
  schedule: z.array(z.object({
    job_id: z.string(),
    start: z.number(),
    end: z.number(),
    machine: optStr,
  }).passthrough()),
  makespan: optNum.describe("Total makespan"),
  utilization_pct: optNum,
  warnings: z.array(WarningEntry).optional(),
}).passthrough();

/** inventory_eoq action output */
export const EOQResultSchema = z.object({
  eoq: z.number().describe("Economic order quantity"),
  annual_orders: optNum,
  total_annual_cost: optNum,
  reorder_point: optNum,
  warnings: z.array(WarningEntry).optional(),
}).passthrough();

// ============================================================================
// QUALITY DISPATCHER OUTPUT SCHEMAS
// ============================================================================

/** spc_analyze action output */
export const SPCResultSchema = z.object({
  in_control: z.boolean().describe("Whether process is in statistical control"),
  cpk: optNum.describe("Process capability index Cpk"),
  cp: optNum.describe("Process capability Cp"),
  mean: optNum,
  std_dev: optNum,
  ucl: optNum.describe("Upper control limit"),
  lcl: optNum.describe("Lower control limit"),
  out_of_control_points: z.array(z.number()).optional(),
  rules_violated: z.array(z.string()).optional(),
  warnings: z.array(WarningEntry).optional(),
}).passthrough();

/** gage_rr action output */
export const GageRRResultSchema = z.object({
  total_grr_pct: z.number().describe("Total Gage R&R as % of tolerance"),
  repeatability_pct: optNum,
  reproducibility_pct: optNum,
  part_variation_pct: optNum,
  ndc: optNum.describe("Number of distinct categories"),
  acceptable: optBool,
  warnings: z.array(WarningEntry).optional(),
}).passthrough();

/** inspection_plan action output */
export const InspectionPlanResultSchema = z.object({
  features: z.array(z.object({
    feature_id: z.string(),
    type: z.string(),
    tolerance: optNum,
    instrument: optStr,
    sample_size: optNum,
    frequency: optStr,
  }).passthrough()),
  total_inspection_time_min: optNum,
  warnings: z.array(WarningEntry).optional(),
}).passthrough();

/** dimensional_analysis action output */
export const DimensionalAnalysisResultSchema = z.object({
  in_tolerance: z.boolean(),
  deviations: z.array(z.object({
    feature: z.string(),
    nominal: z.number(),
    actual: z.number(),
    deviation: z.number(),
    tolerance: z.number(),
    in_spec: z.boolean(),
  }).passthrough()).optional(),
  cpk: optNum,
  warnings: z.array(WarningEntry).optional(),
}).passthrough();

/** compliance_check action output */
export const ComplianceCheckResultSchema = z.object({
  compliant: z.boolean(),
  standard_checks: z.array(z.object({
    standard: z.string(),
    clause: optStr,
    status: z.enum(["pass", "fail", "warning"]),
    message: optStr,
  }).passthrough()).optional(),
  non_conformances: z.array(z.string()).optional(),
  warnings: z.array(WarningEntry).optional(),
}).passthrough();

// ============================================================================
// SIMULATION DISPATCHER OUTPUT SCHEMAS
// ============================================================================

/** cnc_simulate action output */
export const SimulationResultSchema = z.object({
  blocks_processed: z.number(),
  total_time_sec: optNum,
  forces: z.array(z.object({
    block: optNum,
    Fc_N: z.number(),
    Ff_N: optNum,
    power_kW: optNum,
  }).passthrough()).optional(),
  temperatures: z.array(z.object({
    block: optNum,
    tool_C: z.number(),
    chip_C: optNum,
  }).passthrough()).optional(),
  deflections: z.array(z.object({
    block: optNum,
    deflection_mm: z.number(),
  }).passthrough()).optional(),
  tool_wear_progression: z.array(z.object({
    block: optNum,
    vb_mm: z.number(),
    remaining_life_pct: optNum,
  }).passthrough()).optional(),
  max_force_N: optNum,
  max_temperature_C: optNum,
  max_deflection_mm: optNum,
  safety_violations: z.array(z.string()).optional(),
  warnings: z.array(WarningEntry).optional(),
}).passthrough();

/** cnc_simulate_physics action output */
export const PhysicsSimResultSchema = z.object({
  blocks: z.array(z.object({
    line: optNum,
    force_N: optNum,
    temperature_C: optNum,
    deflection_mm: optNum,
    Ra_um: optNum,
    power_kW: optNum,
  }).passthrough()),
  summary: z.object({
    max_force_N: optNum,
    max_temp_C: optNum,
    max_deflection_mm: optNum,
    avg_Ra_um: optNum,
    total_energy_kJ: optNum,
  }).passthrough().optional(),
  warnings: z.array(WarningEntry).optional(),
}).passthrough();

/** cnc_simulate_predictive action output */
export const PredictiveSimResultSchema = z.object({
  tool_life_remaining_min: z.number(),
  cost_per_part: optNum,
  batch_optimization: z.object({
    optimal_batch_size: optNum,
    cost_per_part_at_optimal: optNum,
  }).passthrough().optional(),
  tool_change_recommendation: optStr,
  warnings: z.array(WarningEntry).optional(),
}).passthrough();

// ============================================================================
// GENERIC / FALLBACK OUTPUT SCHEMAS
// ============================================================================

/** Generic structured output for any action that returns engine result */
export const GenericResultSchema = z.object({
  action: z.string(),
  result: z.unknown(),
  warnings: z.array(WarningEntry).optional(),
}).passthrough();

/** Error result schema */
export const ErrorResultSchema = z.object({
  error: z.string(),
  action: optStr,
  dispatcher: optStr,
  details: z.unknown().optional(),
}).passthrough();

// ============================================================================
// ACTION → OUTPUT SCHEMA REGISTRY
// ============================================================================

/**
 * Maps action names to their Zod output schemas.
 * Organized by dispatcher domain.
 */
const OUTPUT_SCHEMA_REGISTRY: Record<string, z.ZodType> = {
  // ── calcDispatcher ──────────────────────────────────────────────
  speed_feed: SpeedFeedResultSchema,
  cutting_force: ForceResultSchema,
  tool_life: ToolLifeResultSchema,
  surface_finish: SurfaceFinishResultSchema,
  power: PowerResultSchema,
  mrr: MRRResultSchema,
  deflection: DeflectionResultSchema,
  thermal: ThermalResultSchema,
  stability: StabilityResultSchema,
  chip_load: ChipLoadResultSchema,
  drilling_force: DrillingForceResultSchema,
  turning_force: TurningForceResultSchema,
  wear_progression: WearProgressionResultSchema,
  cost_optimize: CostOptimizeResultSchema,
  capability_predict: CapabilityPredictResultSchema,
  stochastic_wear: StochasticWearResultSchema,
  torque: PowerResultSchema, // shares shape with power

  // ── camDispatcher ───────────────────────────────────────────────
  toolpath_generate: ToolpathGenerateResultSchema,
  cam_strategy_recommend: StrategyRecommendResultSchema,
  post_process: PostProcessResultSchema,
  collision_check_full: CollisionCheckResultSchema,
  cam_cycle_time_estimate: CycleTimeResultSchema,

  // ── safetyDispatcher ────────────────────────────────────────────
  safety_check: SafetyResultSchema,
  gcode_safety: SafetyResultSchema,
  spindle_protection: SpindleProtectionResultSchema,
  crash_detection: CrashDetectionResultSchema,

  // ── businessDispatcher ──────────────────────────────────────────
  quote_estimate: QuoteResultSchema,
  costing_job_cost: JobCostResultSchema,
  costing_machining: JobCostResultSchema,
  costing_material: JobCostResultSchema,
  financial_npv: NPVResultSchema,
  financial_irr: NPVResultSchema,
  financial_breakeven: NPVResultSchema,
  scheduling_single_machine: ScheduleResultSchema,
  scheduling_johnsons: ScheduleResultSchema,
  scheduling_job_shop: ScheduleResultSchema,
  inventory_eoq: EOQResultSchema,
  inventory_safety_stock: EOQResultSchema,

  // ── qualityDispatcher ───────────────────────────────────────────
  spc_analyze: SPCResultSchema,
  gage_rr: GageRRResultSchema,
  inspection_plan: InspectionPlanResultSchema,
  dimensional_analysis: DimensionalAnalysisResultSchema,
  compliance_check: ComplianceCheckResultSchema,
  standards_check_compliance: ComplianceCheckResultSchema,

  // ── simulationDispatcher ────────────────────────────────────────
  cnc_simulate: SimulationResultSchema,
  cnc_simulate_physics: PhysicsSimResultSchema,
  cnc_simulate_predictive: PredictiveSimResultSchema,
};

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Returns the JSON Schema for a given action's output.
 * Falls back to GenericResultSchema if no specific schema is registered.
 *
 * @param actionName - The action identifier (e.g., "speed_feed", "cutting_force")
 * @returns JSON Schema object compatible with MCP outputSchema
 */
export function getOutputSchema(actionName: string): Record<string, unknown> {
  const zodSchema = OUTPUT_SCHEMA_REGISTRY[actionName] ?? GenericResultSchema;
  return z.toJSONSchema(zodSchema) as Record<string, unknown>;
}

/**
 * Returns the raw Zod schema for a given action's output.
 * Useful for runtime validation of engine results before returning.
 *
 * @param actionName - The action identifier
 * @returns Zod schema, or GenericResultSchema as fallback
 */
export function getOutputZodSchema(actionName: string): z.ZodType {
  return OUTPUT_SCHEMA_REGISTRY[actionName] ?? GenericResultSchema;
}

/**
 * Returns JSON Schema objects for all registered action output schemas.
 * Useful for bulk registration or documentation generation.
 */
export function getAllOutputSchemas(): Record<string, Record<string, unknown>> {
  const result: Record<string, Record<string, unknown>> = {};
  for (const [action, zodSchema] of Object.entries(OUTPUT_SCHEMA_REGISTRY)) {
    result[action] = z.toJSONSchema(zodSchema) as Record<string, unknown>;
  }
  return result;
}

/**
 * Lists all action names that have a specific (non-generic) output schema.
 */
export function getRegisteredOutputActions(): string[] {
  return Object.keys(OUTPUT_SCHEMA_REGISTRY);
}

/**
 * Checks whether a specific action has a dedicated output schema.
 */
export function hasOutputSchema(actionName: string): boolean {
  return actionName in OUTPUT_SCHEMA_REGISTRY;
}

/**
 * Returns a map of dispatcher name to array of actions that have output schemas.
 * Useful for incremental adoption tracking.
 */
export function getOutputSchemasByDispatcher(): Record<string, string[]> {
  return {
    prism_calc: [
      "speed_feed", "cutting_force", "tool_life", "surface_finish", "power",
      "mrr", "deflection", "thermal", "stability", "chip_load", "drilling_force",
      "turning_force", "wear_progression", "cost_optimize", "capability_predict",
      "stochastic_wear", "torque",
    ],
    prism_cam: [
      "toolpath_generate", "cam_strategy_recommend", "post_process",
      "collision_check_full", "cam_cycle_time_estimate",
    ],
    prism_safety: [
      "safety_check", "gcode_safety", "spindle_protection", "crash_detection",
    ],
    prism_business: [
      "quote_estimate", "costing_job_cost", "costing_machining", "costing_material",
      "financial_npv", "financial_irr", "financial_breakeven",
      "scheduling_single_machine", "scheduling_johnsons", "scheduling_job_shop",
      "inventory_eoq", "inventory_safety_stock",
    ],
    prism_quality: [
      "spc_analyze", "gage_rr", "inspection_plan", "dimensional_analysis",
      "compliance_check", "standards_check_compliance",
    ],
    prism_simulation: [
      "cnc_simulate", "cnc_simulate_physics", "cnc_simulate_predictive",
    ],
  };
}

// Re-export individual schemas for direct import
export {
  WarningEntry as WarningEntrySchema,
  ResultMeta as ResultMetaSchema,
};
