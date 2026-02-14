/**
 * PRISM MCP Server - Zod Schemas
 * Input validation schemas for all MCP tools
 */

import { z } from "zod";
import {
  ISO_MATERIAL_GROUPS, MATERIAL_CATEGORIES, MATERIAL_LAYERS,
  MACHINE_TYPES, MACHINE_LAYERS, CONTROLLER_FAMILIES,
  ALARM_SEVERITIES, ALARM_CATEGORIES, TOOL_TYPES, TOOL_MATERIALS,
  AGENT_TIERS, HOOK_PATTERNS, HOOK_LEVELS, RESPONSE_FORMATS,
  OPTIMIZATION_TARGETS, OPERATION_TYPES, FORMULA_DOMAINS,
  SWARM_PATTERNS, WORKFLOW_TYPES, SCRIPT_CATEGORIES, EXPORT_FORMATS
} from "./constants.js";

// ============================================================================
// COMMON SCHEMAS
// ============================================================================

export const ResponseFormatSchema = z.enum(RESPONSE_FORMATS).default("json");

export const PaginationSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20)
    .describe("Maximum results to return (1-100, default: 20)"),
  offset: z.number().int().min(0).default(0)
    .describe("Number of results to skip for pagination")
}).strict();

// ============================================================================
// MATERIAL SCHEMAS
// ============================================================================

export const MaterialGetInputSchema = z.object({
  identifier: z.string().min(1)
    .describe("Material ID (e.g., 'CS-1045-001') or common name (e.g., '4140 steel')"),
  fields: z.array(z.string()).optional()
    .describe("Specific fields to return (default: all)"),
  layer: z.enum(MATERIAL_LAYERS).optional()
    .describe("Data layer to query: CORE, ENHANCED, USER, or LEARNED"),
  response_format: ResponseFormatSchema
}).strict();

export const MaterialSearchInputSchema = z.object({
  query: z.string().optional()
    .describe("Free text search across name, designation, and applications"),
  iso_group: z.enum(ISO_MATERIAL_GROUPS).optional()
    .describe("ISO 513 material group: P, M, K, N, S, H, or X"),
  category: z.enum(MATERIAL_CATEGORIES).optional()
    .describe("Material category (e.g., 'carbon_steel', 'titanium_alloy')"),
  hardness_min: z.number().min(0).optional()
    .describe("Minimum hardness (HB)"),
  hardness_max: z.number().max(800).optional()
    .describe("Maximum hardness (HB)"),
  machinability_min: z.number().min(0).max(200).optional()
    .describe("Minimum machinability rating (% relative to AISI 1212)"),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  response_format: ResponseFormatSchema
}).strict();

export const MaterialCompareInputSchema = z.object({
  material_ids: z.array(z.string()).min(2).max(5)
    .describe("Material IDs to compare (2-5 materials)"),
  properties: z.array(z.string()).optional()
    .describe("Specific properties to compare (default: key machining properties)")
}).strict();

export const MaterialAddInputSchema = z.object({
  material: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    iso_group: z.enum(ISO_MATERIAL_GROUPS),
    category: z.enum(MATERIAL_CATEGORIES)
  }).passthrough(),
  layer: z.enum(["USER", "LEARNED"]).default("USER"),
  validate: z.boolean().default(true)
}).strict();

export const MaterialEnhanceInputSchema = z.object({
  material_id: z.string().min(1)
    .describe("ID of material to enhance"),
  enhancements: z.record(z.unknown())
    .describe("Fields to add or update"),
  source: z.string().optional()
    .describe("Data source reference for traceability")
}).strict();

// ============================================================================
// MACHINE SCHEMAS
// ============================================================================

export const MachineGetInputSchema = z.object({
  identifier: z.string().min(1)
    .describe("Machine ID or model name (e.g., 'DMG-DMU50', 'Haas VF-2')"),
  layer: z.enum(MACHINE_LAYERS).optional()
    .describe("Data layer: BASIC, CORE, ENHANCED, or LEVEL5"),
  response_format: ResponseFormatSchema
}).strict();

export const MachineSearchInputSchema = z.object({
  manufacturer: z.string().optional()
    .describe("Machine manufacturer (e.g., 'DMG MORI', 'Haas')"),
  type: z.enum(MACHINE_TYPES).optional()
    .describe("Machine type (e.g., 'vertical_mill', '5_axis', 'lathe')"),
  controller: z.enum(CONTROLLER_FAMILIES).optional()
    .describe("Controller family"),
  min_x_travel: z.number().min(0).optional()
    .describe("Minimum X-axis travel (mm)"),
  min_y_travel: z.number().min(0).optional()
    .describe("Minimum Y-axis travel (mm)"),
  min_z_travel: z.number().min(0).optional()
    .describe("Minimum Z-axis travel (mm)"),
  min_spindle_rpm: z.number().min(0).optional()
    .describe("Minimum spindle speed (RPM)"),
  min_spindle_power: z.number().min(0).optional()
    .describe("Minimum spindle power (kW)"),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  response_format: ResponseFormatSchema
}).strict();

// ============================================================================
// TOOL SCHEMAS
// ============================================================================

export const ToolGetInputSchema = z.object({
  tool_id: z.string().min(1)
    .describe("Tool ID or part number"),
  response_format: ResponseFormatSchema
}).strict();

export const ToolSearchInputSchema = z.object({
  type: z.enum(TOOL_TYPES).optional()
    .describe("Tool type (e.g., 'end_mill', 'drill', 'insert')"),
  diameter_min: z.number().min(0).optional()
    .describe("Minimum diameter (mm)"),
  diameter_max: z.number().max(500).optional()
    .describe("Maximum diameter (mm)"),
  material: z.enum(TOOL_MATERIALS).optional()
    .describe("Tool material (e.g., 'carbide', 'hss', 'ceramic')"),
  material_groups: z.array(z.enum(ISO_MATERIAL_GROUPS)).optional()
    .describe("ISO material groups this tool can cut"),
  flutes_min: z.number().int().min(1).optional(),
  flutes_max: z.number().int().max(20).optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  response_format: ResponseFormatSchema
}).strict();

// ============================================================================
// ALARM SCHEMAS
// ============================================================================

export const AlarmDecodeInputSchema = z.object({
  code: z.string().min(1)
    .describe("Alarm code (e.g., 'PS0001', '100', 'EX1001')"),
  controller: z.enum(CONTROLLER_FAMILIES).optional()
    .describe("Controller family (auto-detected if omitted)"),
  response_format: ResponseFormatSchema
}).strict();

export const AlarmSearchInputSchema = z.object({
  query: z.string().optional()
    .describe("Free text search in alarm name and description"),
  controller: z.enum(CONTROLLER_FAMILIES).optional(),
  category: z.enum(ALARM_CATEGORIES).optional()
    .describe("Alarm category (e.g., 'SERVO', 'SPINDLE', 'ATC')"),
  severity: z.enum(ALARM_SEVERITIES).optional()
    .describe("Alarm severity: CRITICAL, HIGH, MEDIUM, LOW, INFO"),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  response_format: ResponseFormatSchema
}).strict();

// ============================================================================
// CALCULATION SCHEMAS
// ============================================================================

export const SpeedFeedInputSchema = z.object({
  material_id: z.string().min(1)
    .describe("Material ID to machine"),
  tool_id: z.string().min(1)
    .describe("Cutting tool ID"),
  machine_id: z.string().optional()
    .describe("Machine ID for constraint validation"),
  operation: z.enum(OPERATION_TYPES)
    .describe("Machining operation type"),
  doc: z.number().min(0).optional()
    .describe("Depth of cut (mm)"),
  woc: z.number().min(0).optional()
    .describe("Width of cut (mm)"),
  optimize_for: z.enum(OPTIMIZATION_TARGETS).default("balanced")
    .describe("Optimization target: mrr, surface_finish, tool_life, or balanced"),
  response_format: ResponseFormatSchema
}).strict();

export const CuttingForceInputSchema = z.object({
  material_id: z.string().min(1)
    .describe("Material ID (must have Kienzle coefficients)"),
  doc: z.number().min(0.01).max(50)
    .describe("Depth of cut (mm)"),
  feed: z.number().min(0.01).max(2)
    .describe("Feed per revolution (mm/rev)"),
  rake_angle: z.number().min(-30).max(30).optional()
    .describe("Tool rake angle (degrees, default: 6°)"),
  wear_factor: z.number().min(1).max(2).default(1.0)
    .describe("Tool wear correction factor (1.0-2.0)")
}).strict();

export const ToolLifeInputSchema = z.object({
  material_id: z.string().min(1)
    .describe("Material ID (must have Taylor coefficients)"),
  tool_id: z.string().min(1),
  cutting_speed: z.number().min(1)
    .describe("Cutting speed (m/min)"),
  feed: z.number().min(0.01).optional()
    .describe("Feed rate (mm/rev)"),
  doc: z.number().min(0.1).optional()
    .describe("Depth of cut (mm)")
}).strict();

export const FormulaCalcInputSchema = z.object({
  formula_id: z.string().regex(/^F-[A-Z]+-[0-9]{3}$/)
    .describe("Formula ID (e.g., 'F-KIENZLE-001')"),
  inputs: z.record(z.number())
    .describe("Input values keyed by symbol"),
  units: z.record(z.string()).optional()
    .describe("Unit overrides for inputs")
}).strict();

// ============================================================================
// AGENT SCHEMAS
// ============================================================================

export const AgentListInputSchema = z.object({
  tier: z.enum(AGENT_TIERS).optional()
    .describe("Filter by agent tier: OPUS, SONNET, or HAIKU"),
  capability: z.string().optional()
    .describe("Filter by capability keyword"),
  response_format: ResponseFormatSchema
}).strict();

export const AgentInvokeInputSchema = z.object({
  agent_id: z.string().min(1)
    .describe("Agent ID to invoke"),
  task: z.string().min(1)
    .describe("Task description for the agent"),
  context: z.record(z.unknown()).optional()
    .describe("Additional context for the agent"),
  timeout_ms: z.number().int().min(1000).max(300000).default(30000)
    .describe("Timeout in milliseconds (default: 30s)")
}).strict();

export const AgentSwarmInputSchema = z.object({
  agents: z.array(z.string()).min(2).max(10)
    .describe("Agent IDs to include in swarm (2-10)"),
  tasks: z.array(z.object({
    id: z.string(),
    description: z.string(),
    inputs: z.record(z.unknown()).optional()
  })),
  pattern: z.enum(SWARM_PATTERNS)
    .describe("Swarm execution pattern"),
  max_parallel: z.number().int().min(1).max(10).default(4)
    .describe("Maximum parallel executions")
}).strict();

export const RalphLoopInputSchema = z.object({
  target: z.string().min(1)
    .describe("File path or content to validate"),
  validators: z.array(z.string()).min(1).max(5)
    .describe("Validator agent IDs"),
  iterations: z.number().int().min(1).max(10).default(3)
    .describe("Number of validation iterations"),
  convergence_threshold: z.number().min(0).max(1).default(0.95)
    .describe("Quality score threshold for convergence")
}).strict();

// ============================================================================
// SCRIPT SCHEMAS
// ============================================================================

export const ScriptRunInputSchema = z.object({
  script_id: z.string().min(1)
    .describe("Script ID or filename"),
  args: z.array(z.string()).optional()
    .describe("Command line arguments"),
  timeout_ms: z.number().int().min(1000).max(600000).default(60000)
    .describe("Timeout in milliseconds"),
  async: z.boolean().default(false)
    .describe("Run asynchronously and return execution ID")
}).strict();

// ============================================================================
// HOOK SCHEMAS
// ============================================================================

export const HookTriggerInputSchema = z.object({
  hook_id: z.string().min(1)
    .describe("Hook ID to trigger"),
  inputs: z.record(z.unknown()).optional()
    .describe("Input values for the hook")
}).strict();

export const SafetyCheckInputSchema = z.object({
  content: z.record(z.unknown())
    .describe("Content to validate for safety"),
  context: z.string().optional()
    .describe("Additional context for validation")
}).strict();

export const QualityCheckInputSchema = z.object({
  content: z.record(z.unknown())
    .describe("Content to evaluate for quality")
}).strict();

export const RegressionCheckInputSchema = z.object({
  old_file: z.string().min(1)
    .describe("Path to original file"),
  new_file: z.string().min(1)
    .describe("Path to new/replacement file")
}).strict();

// ============================================================================
// KNOWLEDGE SCHEMAS
// ============================================================================

export const SkillLoadInputSchema = z.object({
  skill_name: z.string().min(1)
    .describe("Skill name (e.g., 'prism-fanuc-programming')"),
  section: z.string().optional()
    .describe("Specific section to load")
}).strict();

export const ModuleLoadInputSchema = z.object({
  module_name: z.string().min(1)
    .describe("Module name from extracted modules")
}).strict();

export const KnowledgeQueryInputSchema = z.object({
  query: z.string().min(1)
    .describe("Natural language query"),
  kb: z.enum(["algorithms", "data_structures", "manufacturing", "ai_structures"]).optional()
    .describe("Specific knowledge base to query")
}).strict();

// ============================================================================
// STATE SCHEMAS
// ============================================================================

export const StateSaveInputSchema = z.object({
  state: z.record(z.unknown())
    .describe("State object to save"),
  path: z.string().optional()
    .describe("Custom path (default: CURRENT_STATE.json)")
}).strict();

export const CheckpointInputSchema = z.object({
  completed: z.number().int().min(0)
    .describe("Number of items completed"),
  next: z.string().min(1)
    .describe("Description of next item to process")
}).strict();

export const HandoffInputSchema = z.object({
  status: z.enum(["COMPLETE", "IN_PROGRESS", "BLOCKED"]),
  next_actions: z.array(z.string()).optional()
}).strict();

// ============================================================================
// EXTERNAL INTEGRATION SCHEMAS
// ============================================================================

export const ObsidianNoteInputSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  folder: z.string().optional(),
  tags: z.array(z.string()).optional()
}).strict();

export const GitCommitInputSchema = z.object({
  message: z.string().min(1)
    .describe("Commit message"),
  files: z.array(z.string()).optional()
    .describe("Specific files to commit (default: all staged)")
}).strict();

export const ExportReportInputSchema = z.object({
  data: z.record(z.unknown())
    .describe("Data to export"),
  format: z.enum(EXPORT_FORMATS)
    .describe("Export format"),
  template: z.string().optional()
    .describe("Template name for formatted output")
}).strict();

// Type exports
export type MaterialGetInput = z.infer<typeof MaterialGetInputSchema>;
export type MaterialSearchInput = z.infer<typeof MaterialSearchInputSchema>;
export type MaterialCompareInput = z.infer<typeof MaterialCompareInputSchema>;
export type MachineGetInput = z.infer<typeof MachineGetInputSchema>;
export type MachineSearchInput = z.infer<typeof MachineSearchInputSchema>;
export type ToolGetInput = z.infer<typeof ToolGetInputSchema>;
export type ToolSearchInput = z.infer<typeof ToolSearchInputSchema>;
export type AlarmDecodeInput = z.infer<typeof AlarmDecodeInputSchema>;
export type AlarmSearchInput = z.infer<typeof AlarmSearchInputSchema>;
export type SpeedFeedInput = z.infer<typeof SpeedFeedInputSchema>;
export type CuttingForceInput = z.infer<typeof CuttingForceInputSchema>;
export type ToolLifeInput = z.infer<typeof ToolLifeInputSchema>;
export type FormulaCalcInput = z.infer<typeof FormulaCalcInputSchema>;
export type AgentInvokeInput = z.infer<typeof AgentInvokeInputSchema>;
export type AgentSwarmInput = z.infer<typeof AgentSwarmInputSchema>;
export type RalphLoopInput = z.infer<typeof RalphLoopInputSchema>;
export type ScriptRunInput = z.infer<typeof ScriptRunInputSchema>;
