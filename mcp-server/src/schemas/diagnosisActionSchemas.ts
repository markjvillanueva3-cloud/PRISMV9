/**
 * Zod Action Schemas — diagnosisDispatcher
 * ==========================================
 * 42 actions across 4 sub-engines:
 *   failureForensics     (10 actions)
 *   inverseSolver        (8 actions)
 *   generativeProcess    (10 actions)
 *   sustainabilityEngine (10 actions)
 *
 * @version 1.0.0
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ============================================================================
// SHARED FIELD HELPERS
// ============================================================================

const material = z.string().min(1).optional().describe("Material name or grade");
const response_level = z.string().optional().describe("Response detail level: minimal | summary | full");

// ============================================================================
// FORENSIC ACTIONS (10)
// ============================================================================

/** forensic_tool_autopsy — Detailed tool failure analysis */
const forensic_tool_autopsy = z.object({
  tool_id: z.string().optional(),
  tool_type: z.string().optional(),
  material: material,
  operation: z.string().optional(),
  failure_description: z.string().optional(),
  cutting_speed_mpm: z.number().positive().optional(),
  feed_mm_rev: z.number().positive().optional(),
  depth_of_cut_mm: z.number().positive().optional(),
  coolant: z.string().optional(),
  tool_life_min: z.number().nonnegative().optional(),
  images: z.array(z.string()).optional(),
  response_level,
}).passthrough();

/** forensic_chip_analysis — Chip morphology analysis */
const forensic_chip_analysis = z.object({
  chip_type: z.string().optional(),
  chip_color: z.string().optional(),
  chip_shape: z.string().optional(),
  material: material,
  operation: z.string().optional(),
  cutting_speed_mpm: z.number().positive().optional(),
  feed_mm_rev: z.number().positive().optional(),
  depth_of_cut_mm: z.number().positive().optional(),
  coolant: z.string().optional(),
  images: z.array(z.string()).optional(),
  response_level,
}).passthrough();

/** forensic_surface_defect — Surface defect diagnosis */
const forensic_surface_defect = z.object({
  defect_type: z.string().optional(),
  surface_finish_ra: z.number().nonnegative().optional(),
  material: material,
  operation: z.string().optional(),
  cutting_speed_mpm: z.number().positive().optional(),
  feed_mm_rev: z.number().positive().optional(),
  tool_type: z.string().optional(),
  images: z.array(z.string()).optional(),
  response_level,
}).passthrough();

/** forensic_crash — Machine crash forensics */
const forensic_crash = z.object({
  machine_id: z.string().optional(),
  crash_type: z.string().optional(),
  axis: z.string().optional(),
  severity: z.string().optional(),
  description: z.string().optional(),
  gcode_line: z.string().optional(),
  alarm_code: z.string().optional(),
  response_level,
}).passthrough();

/** forensic_failure_modes — List known failure modes */
const forensic_failure_modes = z.object({
  category: z.string().optional(),
  material: material,
  tool_type: z.string().optional(),
  response_level,
}).passthrough();

/** forensic_chip_types — List chip classification types */
const forensic_chip_types = z.object({
  material: material,
  operation: z.string().optional(),
  response_level,
}).passthrough();

/** forensic_surface_types — List surface defect types */
const forensic_surface_types = z.object({
  material: material,
  operation: z.string().optional(),
  response_level,
}).passthrough();

/** forensic_crash_types — List machine crash types */
const forensic_crash_types = z.object({
  machine_type: z.string().optional(),
  response_level,
}).passthrough();

/** forensic_history — Forensic analysis history */
const forensic_history = z.object({
  category: z.string().optional(),
  limit: z.number().int().positive().optional(),
  response_level,
}).passthrough();

/** forensic_get — Retrieve specific forensic record */
const forensic_get = z.object({
  diagnosis_id: z.string().min(1),
  response_level,
}).passthrough();

// ============================================================================
// INVERSE ACTIONS (8)
// ============================================================================

/** inverse_solve — General inverse problem solving */
const inverse_solve = z.object({
  problem_type: z.string().optional(),
  target: z.string().optional(),
  target_value: z.number().optional(),
  constraints: z.record(z.string(), z.unknown()).optional(),
  material: material,
  operation: z.string().optional(),
  response_level,
}).passthrough();

/** inverse_surface — Inverse solve for surface finish */
const inverse_surface = z.object({
  target_ra: z.number().positive().optional(),
  material: material,
  tool_type: z.string().optional(),
  tool_nose_radius_mm: z.number().positive().optional(),
  operation: z.string().optional(),
  response_level,
}).passthrough();

/** inverse_tool_life — Inverse solve for tool life */
const inverse_tool_life = z.object({
  target_life_min: z.number().positive().optional(),
  material: material,
  tool_type: z.string().optional(),
  operation: z.string().optional(),
  constraints: z.record(z.string(), z.unknown()).optional(),
  response_level,
}).passthrough();

/** inverse_dimensional — Inverse solve for dimensional accuracy */
const inverse_dimensional = z.object({
  target_tolerance_mm: z.number().positive().optional(),
  material: material,
  feature_type: z.string().optional(),
  operation: z.string().optional(),
  response_level,
}).passthrough();

/** inverse_chatter — Inverse solve for chatter avoidance */
const inverse_chatter = z.object({
  spindle_rpm: z.number().positive().optional(),
  material: material,
  tool_type: z.string().optional(),
  overhang_mm: z.number().positive().optional(),
  depth_of_cut_mm: z.number().positive().optional(),
  response_level,
}).passthrough();

/** inverse_troubleshoot — General troubleshooting inverse solver */
const inverse_troubleshoot = z.object({
  symptom: z.string().optional(),
  symptoms: z.array(z.string()).optional(),
  material: material,
  operation: z.string().optional(),
  machine_type: z.string().optional(),
  response_level,
}).passthrough();

/** inverse_history — Inverse solver history */
const inverse_history = z.object({
  problem_type: z.string().optional(),
  limit: z.number().int().positive().optional(),
  response_level,
}).passthrough();

/** inverse_get — Retrieve specific inverse problem record */
const inverse_get = z.object({
  problem_id: z.string().min(1),
  response_level,
}).passthrough();

// ============================================================================
// GENERATIVE PROCESS PLANNING ACTIONS (10)
// ============================================================================

/** genplan_plan — Full generative process plan */
const genplan_plan = z.object({
  part_description: z.string().optional(),
  material: material,
  features: z.array(z.record(z.string(), z.unknown())).optional(),
  machine_type: z.string().optional(),
  batch_size: z.number().int().positive().optional(),
  tolerance_class: z.string().optional(),
  optimize_for: z.string().optional(),
  response_level,
}).passthrough();

/** genplan_features — Feature recognition / extraction */
const genplan_features = z.object({
  part_description: z.string().optional(),
  material: material,
  geometry: z.record(z.string(), z.unknown()).optional(),
  response_level,
}).passthrough();

/** genplan_setups — Setup planning */
const genplan_setups = z.object({
  features: z.array(z.record(z.string(), z.unknown())).optional(),
  machine_type: z.string().optional(),
  material: material,
  response_level,
}).passthrough();

/** genplan_operations — Operation sequencing */
const genplan_operations = z.object({
  features: z.array(z.record(z.string(), z.unknown())).optional(),
  setups: z.array(z.record(z.string(), z.unknown())).optional(),
  material: material,
  response_level,
}).passthrough();

/** genplan_optimize — Operation optimization */
const genplan_optimize = z.object({
  operations: z.array(z.record(z.string(), z.unknown())).optional(),
  optimize_for: z.string().optional(),
  constraints: z.record(z.string(), z.unknown()).optional(),
  response_level,
}).passthrough();

/** genplan_tools — Tool selection for process plan */
const genplan_tools = z.object({
  operations: z.array(z.record(z.string(), z.unknown())).optional(),
  material: material,
  machine_type: z.string().optional(),
  response_level,
}).passthrough();

/** genplan_cycle — Cycle time estimation */
const genplan_cycle = z.object({
  operations: z.array(z.record(z.string(), z.unknown())).optional(),
  machine_type: z.string().optional(),
  response_level,
}).passthrough();

/** genplan_cost — Cost estimation */
const genplan_cost = z.object({
  operations: z.array(z.record(z.string(), z.unknown())).optional(),
  batch_size: z.number().int().positive().optional(),
  material: material,
  machine_rate_usd_hr: z.number().positive().optional(),
  response_level,
}).passthrough();

/** genplan_risk — Risk assessment */
const genplan_risk = z.object({
  operations: z.array(z.record(z.string(), z.unknown())).optional(),
  material: material,
  response_level,
}).passthrough();

/** genplan_get — Retrieve specific process plan */
const genplan_get = z.object({
  plan_id: z.string().min(1),
  response_level,
}).passthrough();

// ============================================================================
// SUSTAINABILITY ACTIONS (10)
// ============================================================================

/** sustain_optimize — Sustainability optimization */
const sustain_optimize = z.object({
  material: material,
  operation: z.string().optional(),
  mode: z.string().optional(),
  cutting_speed_mpm: z.number().positive().optional(),
  feed_mm_rev: z.number().positive().optional(),
  depth_of_cut_mm: z.number().positive().optional(),
  coolant_type: z.string().optional(),
  batch_size: z.number().int().positive().optional(),
  response_level,
}).passthrough();

/** sustain_compare — Compare sustainability across options */
const sustain_compare = z.object({
  options: z.array(z.record(z.string(), z.unknown())).optional(),
  material: material,
  response_level,
}).passthrough();

/** sustain_energy — Energy consumption analysis */
const sustain_energy = z.object({
  material: material,
  operation: z.string().optional(),
  cutting_speed_mpm: z.number().positive().optional(),
  spindle_power_kw: z.number().positive().optional(),
  cycle_time_min: z.number().positive().optional(),
  response_level,
}).passthrough();

/** sustain_carbon — Carbon footprint analysis */
const sustain_carbon = z.object({
  material: material,
  operation: z.string().optional(),
  energy_kwh: z.number().nonnegative().optional(),
  coolant_liters: z.number().nonnegative().optional(),
  transport_km: z.number().nonnegative().optional(),
  response_level,
}).passthrough();

/** sustain_coolant — Coolant optimization */
const sustain_coolant = z.object({
  current_type: z.string().optional(),
  material: material,
  operation: z.string().optional(),
  volume_liters: z.number().positive().optional(),
  response_level,
}).passthrough();

/** sustain_nearnet — Near-net shape analysis */
const sustain_nearnet = z.object({
  material: material,
  finished_weight_kg: z.number().positive().optional(),
  current_stock_weight_kg: z.number().positive().optional(),
  geometry: z.record(z.string(), z.unknown()).optional(),
  batch_size: z.number().int().positive().optional(),
  response_level,
}).passthrough();

/** sustain_report — Sustainability report generation */
const sustain_report = z.object({
  material: material,
  batch_size: z.number().int().positive().optional(),
  operations: z.array(z.record(z.string(), z.unknown())).optional(),
  response_level,
}).passthrough();

/** sustain_materials — List sustainable material alternatives */
const sustain_materials = z.object({
  material: material,
  criteria: z.string().optional(),
  response_level,
}).passthrough();

/** sustain_history — Sustainability analysis history */
const sustain_history = z.object({
  material: material,
  limit: z.number().int().positive().optional(),
  response_level,
}).passthrough();

/** sustain_get — Retrieve specific sustainability record */
const sustain_get = z.object({
  optimization_id: z.string().min(1),
  response_level,
}).passthrough();

// ============================================================================
// ERROR REMEDIATION ACTIONS (3)
// ============================================================================

/** error_remediation_suggest — Get fix suggestions for a failed action */
const error_remediation_suggest = z.object({
  action_path: z.string().optional().describe("Full action path (e.g., prism_calc:cutting_force)"),
  actionPath: z.string().optional().describe("Alias for action_path"),
  error_code: z.string().optional().describe("Machine-readable error code from the engine"),
  errorCode: z.string().optional().describe("Alias for error_code"),
  original_params: z.record(z.string(), z.any()).optional().describe("Original input params"),
  originalParams: z.record(z.string(), z.any()).optional().describe("Alias for original_params"),
  response_level,
}).passthrough();

/** error_remediation_apply — Apply suggested adjustments to params */
const error_remediation_apply = z.object({
  original_params: z.record(z.string(), z.any()).optional().describe("Original input params to adjust"),
  originalParams: z.record(z.string(), z.any()).optional().describe("Alias for original_params"),
  adjustments: z.record(z.string(), z.any()).optional().describe("Adjustments map from a suggestion"),
  response_level,
}).passthrough();

/** error_remediation_known_errors — List known error patterns for an action */
const error_remediation_known_errors = z.object({
  action_path: z.string().optional().describe("Action path to list errors for"),
  actionPath: z.string().optional().describe("Alias for action_path"),
  response_level,
}).passthrough();

// ============================================================================
// OBSIDIAN-PRISM-OS-MS0/U-ORPHAN-RESCUE-ALARM-ESCALATION (7 actions)
// Wires AlarmEscalationEngine (RT-MS2 Real-Time Notifications, 264 LOC,
// was orphan in BUILD_STATE.NEEDS_WIRING). Live-state alarm trigger →
// acknowledge → resolve pipeline with timed escalation. Distinct from
// AlarmIntelligenceEngine (alarm_intel_*) which is the HBK-MS3 handbook
// lookup surface — this is the live-state escalation pipeline.
// ============================================================================

const alarm_esc_trigger = z.object({
  rule_id: z.string().min(1).describe("Alarm rule id (e.g., SPINDLE_OVERLOAD, TOOL_LIFE_LOW, MACHINE_CRASH)"),
  source: z.string().min(1).describe("Alarm source (e.g., 'machine:haas-vf2')"),
  message: z.string().min(1).describe("Human-readable alarm message"),
  details: z.record(z.string(), z.unknown()).optional().describe("Optional structured details (sensor readings, context)"),
}).passthrough();
const alarm_esc_acknowledge = z.object({
  alarm_id: z.string().min(1).describe("Alarm id (format: ALM-NNNNNN)"),
  user_id: z.string().min(1).describe("Operator/user id taking ownership"),
}).passthrough();
const alarm_esc_resolve = z.object({
  alarm_id: z.string().min(1).describe("Alarm id to resolve"),
}).passthrough();
const alarm_esc_active = z.object({
  severity: z.enum(["info", "warn", "critical", "emergency"]).optional()
    .describe("Filter by severity"),
  source: z.string().optional().describe("Filter by source (substring match)"),
}).passthrough();
const alarm_esc_history = z.object({
  limit: z.number().int().positive().max(1000).optional()
    .describe("Cap returned alarms (default 50, max 1000)"),
}).passthrough();
const alarm_esc_rules = z.object({}).passthrough();
const alarm_esc_stats = z.object({}).passthrough();

// ============================================================================
// WIRE-SUSTAIN-DIRECT-MS0/U-VICTOR-SUSTAIN-DIRECT (slot:victor, 2026-05-26)
// 3 schemas for the 3 specialized sub-engines wired in diagnosisDispatcher.ts.
// Passthrough at the dispatcher edge — each engine's static method calls its
// own SchemaName.parse(input) internally (SustainInputSchema / CarbonInputSchema
// / EnergyAnalysisInputSchema), so the strict validation lives engine-side per
// the L2-P4-MS1/P0-U05 Batch 9 contract. The dispatcher-level passthrough
// satisfies the H:/.claude/rules/schemas.md "schemas must match z.enum exactly"
// requirement (every action gets a schema entry) without duplicating the
// 30-field engine schema at the boundary.
// ============================================================================
const sustain_params_optimize = z.object({}).passthrough()
  .describe("SustainOptimizeEngine.optimize — parameter-level sustainability optimizer (L2-P4-MS1 Batch 9). Inputs: cuttingPower/time/spindleSpeed/feedRate/coolant/material/tool. Outputs: optimized params + energy/carbon/coolant savings + sustainabilityScore 0-100. Strict validation via SustainInputSchema inside the engine.");
const sustain_carbon_calculate = z.object({}).passthrough()
  .describe("SustainCarbonEngine.calculate — operation-level carbon footprint calculator (kg CO2 across electricity + material + tooling + coolant + chip waste). Grid intensity varies by region (renewable/mixed/coal/gas/nuclear). Strict validation via CarbonInputSchema inside the engine.");
const sustain_energy_analyze = z.object({}).passthrough()
  .describe("SustainEnergyEngine.analyze — fleet-energy aggregator across recorded operations. Filterable by machine/operation. Returns total energy + per-machine + per-operation breakdowns + trend analysis. Strict validation via EnergyAnalysisInputSchema inside the engine.");

// ============================================================================
// EXPORT MAP
// ============================================================================

export const DIAGNOSIS_ACTION_SCHEMAS: ActionSchemaMap = {
  // Forensic (10)
  forensic_tool_autopsy,
  forensic_chip_analysis,
  forensic_surface_defect,
  forensic_crash,
  forensic_failure_modes,
  forensic_chip_types,
  forensic_surface_types,
  forensic_crash_types,
  forensic_history,
  forensic_get,
  // Inverse (8)
  inverse_solve,
  inverse_surface,
  inverse_tool_life,
  inverse_dimensional,
  inverse_chatter,
  inverse_troubleshoot,
  inverse_history,
  inverse_get,
  // Generative Process (10)
  genplan_plan,
  genplan_features,
  genplan_setups,
  genplan_operations,
  genplan_optimize,
  genplan_tools,
  genplan_cycle,
  genplan_cost,
  genplan_risk,
  genplan_get,
  // Sustainability (10)
  sustain_optimize,
  sustain_compare,
  sustain_energy,
  sustain_carbon,
  sustain_coolant,
  sustain_nearnet,
  sustain_report,
  sustain_materials,
  sustain_history,
  sustain_get,
  // Error Remediation (3)
  error_remediation_suggest,
  error_remediation_apply,
  error_remediation_known_errors,
  // OBSIDIAN-PRISM-OS-MS0/U-ORPHAN-RESCUE-ALARM-ESCALATION (7)
  alarm_esc_trigger,
  alarm_esc_acknowledge,
  alarm_esc_resolve,
  alarm_esc_active,
  alarm_esc_history,
  alarm_esc_rules,
  alarm_esc_stats,
  // WIRE-SUSTAIN-DIRECT-MS0/U-VICTOR-SUSTAIN-DIRECT (3) — specialized sub-engines
  sustain_params_optimize,
  sustain_carbon_calculate,
  sustain_energy_analyze,
};
